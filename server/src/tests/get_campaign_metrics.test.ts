
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, adAccountConnectionsTable, campaignsTable, campaignMetricsTable } from '../db/schema';
import { type GetCampaignMetricsInput } from '../schema';
import { getCampaignMetrics } from '../handlers/get_campaign_metrics';

describe('getCampaignMetrics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get campaign metrics for a user', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        company_name: 'Test Company'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const connectionResult = await db.insert(adAccountConnectionsTable)
      .values({
        user_id: userId,
        platform: 'meta_ads',
        account_id: 'test_account_123',
        account_name: 'Test Account',
        access_token: 'token123',
        refresh_token: 'refresh123',
        status: 'connected'
      })
      .returning()
      .execute();
    const connectionId = connectionResult[0].id;

    const campaignResult = await db.insert(campaignsTable)
      .values({
        connection_id: connectionId,
        platform_campaign_id: 'campaign_123',
        name: 'Test Campaign',
        objective: 'conversion',
        status: 'active',
        daily_budget: '100.00',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })
      .returning()
      .execute();
    const campaignId = campaignResult[0].id;

    // Create campaign metrics
    await db.insert(campaignMetricsTable)
      .values({
        campaign_id: campaignId,
        date: '2024-01-15', // Use string format for date column
        impressions: 1000,
        clicks: 50,
        spend: '25.50',
        conversions: 5,
        conversion_value: '125.75',
        ctr: 0.05,
        cpc: '0.51',
        cpm: '25.50',
        roas: 4.93
      })
      .execute();

    const input: GetCampaignMetricsInput = {
      user_id: userId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getCampaignMetrics(input);

    expect(result).toHaveLength(1);
    expect(result[0].campaign_id).toEqual(campaignId);
    expect(result[0].date).toEqual(new Date('2024-01-15'));
    expect(result[0].impressions).toEqual(1000);
    expect(result[0].clicks).toEqual(50);
    expect(result[0].spend).toEqual(25.50);
    expect(typeof result[0].spend).toBe('number');
    expect(result[0].conversions).toEqual(5);
    expect(result[0].conversion_value).toEqual(125.75);
    expect(typeof result[0].conversion_value).toBe('number');
    expect(result[0].ctr).toEqual(0.05);
    expect(result[0].cpc).toEqual(0.51);
    expect(typeof result[0].cpc).toBe('number');
    expect(result[0].cpm).toEqual(25.50);
    expect(typeof result[0].cpm).toBe('number');
    expect(result[0].roas).toEqual(4.93);
  });

  it('should filter by campaign IDs', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        company_name: 'Test Company'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const connectionResult = await db.insert(adAccountConnectionsTable)
      .values({
        user_id: userId,
        platform: 'google_ads',
        account_id: 'google_account_456',
        account_name: 'Google Account',
        access_token: 'google_token',
        refresh_token: null,
        status: 'connected'
      })
      .returning()
      .execute();
    const connectionId = connectionResult[0].id;

    // Create two campaigns
    const campaign1Result = await db.insert(campaignsTable)
      .values({
        connection_id: connectionId,
        platform_campaign_id: 'campaign_1',
        name: 'Campaign 1',
        objective: 'traffic',
        status: 'active'
      })
      .returning()
      .execute();
    const campaign1Id = campaign1Result[0].id;

    const campaign2Result = await db.insert(campaignsTable)
      .values({
        connection_id: connectionId,
        platform_campaign_id: 'campaign_2',
        name: 'Campaign 2',
        objective: 'awareness',
        status: 'active'
      })
      .returning()
      .execute();
    const campaign2Id = campaign2Result[0].id;

    // Create metrics for both campaigns
    await db.insert(campaignMetricsTable)
      .values([
        {
          campaign_id: campaign1Id,
          date: '2024-02-01',
          impressions: 500,
          clicks: 25,
          spend: '12.25',
          conversions: 2,
          conversion_value: '50.00',
          ctr: 0.05,
          cpc: '0.49',
          cpm: '24.50',
          roas: 4.08
        },
        {
          campaign_id: campaign2Id,
          date: '2024-02-01',
          impressions: 800,
          clicks: 40,
          spend: '20.00',
          conversions: 3,
          conversion_value: '75.00',
          ctr: 0.05,
          cpc: '0.50',
          cpm: '25.00',
          roas: 3.75
        }
      ])
      .execute();

    const input: GetCampaignMetricsInput = {
      user_id: userId,
      campaign_ids: [campaign1Id],
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-02-28')
    };

    const result = await getCampaignMetrics(input);

    expect(result).toHaveLength(1);
    expect(result[0].campaign_id).toEqual(campaign1Id);
    expect(result[0].impressions).toEqual(500);
  });

  it('should filter by platform and objective', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        company_name: null
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create connections for different platforms
    const metaConnectionResult = await db.insert(adAccountConnectionsTable)
      .values({
        user_id: userId,
        platform: 'meta_ads',
        account_id: 'meta_123',
        account_name: 'Meta Account',
        access_token: 'meta_token',
        refresh_token: null,
        status: 'connected'
      })
      .returning()
      .execute();
    const metaConnectionId = metaConnectionResult[0].id;

    const tiktokConnectionResult = await db.insert(adAccountConnectionsTable)
      .values({
        user_id: userId,
        platform: 'tiktok_ads',
        account_id: 'tiktok_456',
        account_name: 'TikTok Account',
        access_token: 'tiktok_token',
        refresh_token: null,
        status: 'connected'
      })
      .returning()
      .execute();
    const tiktokConnectionId = tiktokConnectionResult[0].id;

    // Create campaigns with different objectives
    const metaCampaignResult = await db.insert(campaignsTable)
      .values({
        connection_id: metaConnectionId,
        platform_campaign_id: 'meta_campaign',
        name: 'Meta Campaign',
        objective: 'conversion',
        status: 'active'
      })
      .returning()
      .execute();
    const metaCampaignId = metaCampaignResult[0].id;

    const tiktokCampaignResult = await db.insert(campaignsTable)
      .values({
        connection_id: tiktokConnectionId,
        platform_campaign_id: 'tiktok_campaign',
        name: 'TikTok Campaign',
        objective: 'engagement',
        status: 'active'
      })
      .returning()
      .execute();
    const tiktokCampaignId = tiktokCampaignResult[0].id;

    // Create metrics for both campaigns
    await db.insert(campaignMetricsTable)
      .values([
        {
          campaign_id: metaCampaignId,
          date: '2024-03-01',
          impressions: 1000,
          clicks: 100,
          spend: '50.00',
          conversions: 10,
          conversion_value: '200.00',
          ctr: 0.10,
          cpc: '0.50',
          cpm: '50.00',
          roas: 4.00
        },
        {
          campaign_id: tiktokCampaignId,
          date: '2024-03-01',
          impressions: 2000,
          clicks: 150,
          spend: '75.00',
          conversions: 8,
          conversion_value: '160.00',
          ctr: 0.075,
          cpc: '0.50',
          cpm: '37.50',
          roas: 2.13
        }
      ])
      .execute();

    // Test platform filter
    const platformInput: GetCampaignMetricsInput = {
      user_id: userId,
      platform: 'meta_ads',
      start_date: new Date('2024-03-01'),
      end_date: new Date('2024-03-31')
    };

    const platformResult = await getCampaignMetrics(platformInput);
    expect(platformResult).toHaveLength(1);
    expect(platformResult[0].campaign_id).toEqual(metaCampaignId);

    // Test objective filter
    const objectiveInput: GetCampaignMetricsInput = {
      user_id: userId,
      objective: 'engagement',
      start_date: new Date('2024-03-01'),
      end_date: new Date('2024-03-31')
    };

    const objectiveResult = await getCampaignMetrics(objectiveInput);
    expect(objectiveResult).toHaveLength(1);
    expect(objectiveResult[0].campaign_id).toEqual(tiktokCampaignId);
  });

  it('should filter by date range', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        company_name: 'Test Company'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const connectionResult = await db.insert(adAccountConnectionsTable)
      .values({
        user_id: userId,
        platform: 'shopee_ads',
        account_id: 'shopee_789',
        account_name: 'Shopee Account',
        access_token: 'shopee_token',
        refresh_token: 'shopee_refresh',
        status: 'connected'
      })
      .returning()
      .execute();
    const connectionId = connectionResult[0].id;

    const campaignResult = await db.insert(campaignsTable)
      .values({
        connection_id: connectionId,
        platform_campaign_id: 'shopee_campaign',
        name: 'Shopee Campaign',
        objective: 'awareness',
        status: 'active'
      })
      .returning()
      .execute();
    const campaignId = campaignResult[0].id;

    // Create metrics for different dates
    await db.insert(campaignMetricsTable)
      .values([
        {
          campaign_id: campaignId,
          date: '2024-01-10', // Before range
          impressions: 500,
          clicks: 25,
          spend: '10.00',
          conversions: 1,
          conversion_value: '20.00',
          ctr: 0.05,
          cpc: '0.40',
          cpm: '20.00',
          roas: 2.00
        },
        {
          campaign_id: campaignId,
          date: '2024-01-20', // In range
          impressions: 1000,
          clicks: 50,
          spend: '25.00',
          conversions: 3,
          conversion_value: '60.00',
          ctr: 0.05,
          cpc: '0.50',
          cpm: '25.00',
          roas: 2.40
        },
        {
          campaign_id: campaignId,
          date: '2024-02-10', // After range
          impressions: 750,
          clicks: 30,
          spend: '15.00',
          conversions: 2,
          conversion_value: '40.00',
          ctr: 0.04,
          cpc: '0.50',
          cpm: '20.00',
          roas: 2.67
        }
      ])
      .execute();

    const input: GetCampaignMetricsInput = {
      user_id: userId,
      start_date: new Date('2024-01-15'),
      end_date: new Date('2024-01-31')
    };

    const result = await getCampaignMetrics(input);

    expect(result).toHaveLength(1);
    expect(result[0].impressions).toEqual(1000); // Only the metrics from 2024-01-20
    expect(result[0].spend).toEqual(25.00);
    expect(result[0].date).toEqual(new Date('2024-01-20'));
  });

  it('should return empty array when no metrics found', async () => {
    // Create user but no campaigns or metrics
    const userResult = await db.insert(usersTable)
      .values({
        email: 'empty@example.com',
        name: 'Empty User',
        company_name: null
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: GetCampaignMetricsInput = {
      user_id: userId,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getCampaignMetrics(input);

    expect(result).toHaveLength(0);
  });
});
