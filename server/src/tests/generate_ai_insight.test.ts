
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, campaignsTable, adAccountConnectionsTable, aiInsightsTable } from '../db/schema';
import { type GenerateAiInsightInput } from '../schema';
import { generateAiInsight } from '../handlers/generate_ai_insight';
import { eq } from 'drizzle-orm';

describe('generateAiInsight', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCampaignId: number;
  let testConnectionId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        company_name: 'Test Company'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test connection
    const connectionResult = await db.insert(adAccountConnectionsTable)
      .values({
        user_id: testUserId,
        platform: 'meta_ads',
        account_id: 'test_account_123',
        account_name: 'Test Account',
        access_token: 'test_token',
        refresh_token: 'test_refresh',
        status: 'connected'
      })
      .returning()
      .execute();
    testConnectionId = connectionResult[0].id;

    // Create test campaign
    const campaignResult = await db.insert(campaignsTable)
      .values({
        connection_id: testConnectionId,
        platform_campaign_id: 'campaign_123',
        name: 'Test Campaign',
        objective: 'conversion',
        status: 'active',
        daily_budget: '100.00'
      })
      .returning()
      .execute();
    testCampaignId = campaignResult[0].id;
  });

  const baseInput: GenerateAiInsightInput = {
    user_id: 0, // Will be set in tests
    insight_type: 'key_metrics',
    platform: 'meta_ads',
    objective: 'conversion',
    date_range: {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    }
  };

  it('should generate AI insight successfully', async () => {
    const input = { ...baseInput, user_id: testUserId };
    const result = await generateAiInsight(input);

    expect(result.user_id).toEqual(testUserId);
    expect(result.insight_type).toEqual('key_metrics');
    expect(result.platform).toEqual('meta_ads');
    expect(result.objective).toEqual('conversion');
    expect(result.title).toContain('Key Metrics Performance Summary');
    expect(result.content).toContain('Comprehensive analysis');
    expect(result.recommendations).toContain('Optimize budget allocation');
    expect(result.confidence_score).toEqual(0.92);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should generate insight with campaign_id', async () => {
    const input = {
      ...baseInput,
      user_id: testUserId,
      campaign_id: testCampaignId
    };
    const result = await generateAiInsight(input);

    expect(result.campaign_id).toEqual(testCampaignId);
    expect(result.user_id).toEqual(testUserId);
  });

  it('should generate insight with connection_id', async () => {
    const input = {
      ...baseInput,
      user_id: testUserId,
      connection_id: testConnectionId
    };
    const result = await generateAiInsight(input);

    expect(result.connection_id).toEqual(testConnectionId);
    expect(result.user_id).toEqual(testUserId);
  });

  it('should generate different content for different insight types', async () => {
    const funnelInput = {
      ...baseInput,
      user_id: testUserId,
      insight_type: 'funnel_evaluation' as const
    };
    const funnelResult = await generateAiInsight(funnelInput);

    const anomalyInput = {
      ...baseInput,
      user_id: testUserId,
      insight_type: 'anomaly_detection' as const
    };
    const anomalyResult = await generateAiInsight(anomalyInput);

    expect(funnelResult.title).toContain('Funnel Performance Analysis');
    expect(funnelResult.confidence_score).toEqual(0.85);
    
    expect(anomalyResult.title).toContain('Performance Anomaly Detection');
    expect(anomalyResult.confidence_score).toEqual(0.78);
    
    expect(funnelResult.content).not.toEqual(anomalyResult.content);
    expect(funnelResult.recommendations).not.toEqual(anomalyResult.recommendations);
  });

  it('should save insight to database', async () => {
    const input = { ...baseInput, user_id: testUserId };
    const result = await generateAiInsight(input);

    const insights = await db.select()
      .from(aiInsightsTable)
      .where(eq(aiInsightsTable.id, result.id))
      .execute();

    expect(insights).toHaveLength(1);
    expect(insights[0].user_id).toEqual(testUserId);
    expect(insights[0].insight_type).toEqual('key_metrics');
    expect(insights[0].platform).toEqual('meta_ads');
    expect(insights[0].title).toContain('Key Metrics');
  });

  it('should throw error for non-existent user', async () => {
    const input = { ...baseInput, user_id: 99999 };
    
    expect(generateAiInsight(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error for non-existent campaign', async () => {
    const input = {
      ...baseInput,
      user_id: testUserId,
      campaign_id: 99999
    };
    
    expect(generateAiInsight(input)).rejects.toThrow(/campaign not found/i);
  });

  it('should throw error for non-existent connection', async () => {
    const input = {
      ...baseInput,
      user_id: testUserId,
      connection_id: 99999
    };
    
    expect(generateAiInsight(input)).rejects.toThrow(/connection not found/i);
  });

  it('should handle nullable objective', async () => {
    const input = {
      ...baseInput,
      user_id: testUserId,
      objective: undefined
    };
    const result = await generateAiInsight(input);

    expect(result.objective).toBeNull();
    expect(result.user_id).toEqual(testUserId);
  });

  it('should generate metadata based on insight type', async () => {
    const input = {
      ...baseInput,
      user_id: testUserId,
      insight_type: 'audience_segmentation' as const
    };
    const result = await generateAiInsight(input);

    expect(result.metadata).toBeDefined();
    expect(result.metadata).toHaveProperty('segments_analyzed');
    expect(result.metadata).toHaveProperty('top_segment_roas');
    expect(result.title).toContain('Audience Segmentation Analysis');
  });
});
