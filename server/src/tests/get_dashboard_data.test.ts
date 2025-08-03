
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  adAccountConnectionsTable, 
  campaignsTable, 
  campaignMetricsTable,
  aiInsightsTable
} from '../db/schema';
import { type GetDashboardDataInput } from '../schema';
import { getDashboardData } from '../handlers/get_dashboard_data';

const testInput: GetDashboardDataInput = {
  user_id: 1,
  date_range: {
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-01-31')
  }
};

describe('getDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty dashboard data when no data exists', async () => {
    // Create user
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      company_name: 'Test Company'
    });

    const result = await getDashboardData(testInput);

    expect(result.summary_metrics.total_spend).toBe(0);
    expect(result.summary_metrics.total_impressions).toBe(0);
    expect(result.summary_metrics.total_clicks).toBe(0);
    expect(result.summary_metrics.total_conversions).toBe(0);
    expect(result.summary_metrics.avg_ctr).toBe(0);
    expect(result.summary_metrics.avg_cpc).toBe(0);
    expect(result.summary_metrics.avg_roas).toBe(0);
    expect(result.platform_breakdown).toHaveLength(0);
    expect(result.objective_breakdown).toHaveLength(0);
    expect(result.recent_insights).toHaveLength(0);
  });

  it('should calculate summary metrics correctly', async () => {
    // Create test data
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      company_name: 'Test Company'
    });

    const connectionResult = await db.insert(adAccountConnectionsTable).values({
      user_id: 1,
      platform: 'meta_ads',
      account_id: 'acc123',
      account_name: 'Test Account',
      access_token: 'token123',
      refresh_token: null,
      status: 'connected'
    }).returning();

    const campaignResult = await db.insert(campaignsTable).values({
      connection_id: connectionResult[0].id,
      platform_campaign_id: 'camp123',
      name: 'Test Campaign',
      objective: 'conversion',
      status: 'ACTIVE',
      daily_budget: null,
      lifetime_budget: null
    }).returning();

    // Insert two metrics records
    await db.insert(campaignMetricsTable).values([
      {
        campaign_id: campaignResult[0].id,
        date: '2024-01-15',
        impressions: 1000,
        clicks: 50,
        spend: '100.00',
        conversions: 5,
        conversion_value: '500.00',
        ctr: 0.05,
        cpc: '2.00',
        cpm: '100.00',
        roas: 5.0
      },
      {
        campaign_id: campaignResult[0].id,
        date: '2024-01-16',
        impressions: 2000,
        clicks: 100,
        spend: '200.00',
        conversions: 10,
        conversion_value: '1000.00',
        ctr: 0.05,
        cpc: '2.00',
        cpm: '100.00',
        roas: 5.0
      }
    ]);

    const result = await getDashboardData(testInput);

    expect(result.summary_metrics.total_spend).toBe(300);
    expect(result.summary_metrics.total_impressions).toBe(3000);
    expect(result.summary_metrics.total_clicks).toBe(150);
    expect(result.summary_metrics.total_conversions).toBe(15);
    expect(result.summary_metrics.avg_ctr).toBe(0.05);
    expect(result.summary_metrics.avg_cpc).toBe(2);
    expect(result.summary_metrics.avg_roas).toBe(5);
  });

  it('should group platform breakdown correctly', async () => {
    // Create test data with multiple platforms
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      company_name: 'Test Company'
    });

    const connections = await db.insert(adAccountConnectionsTable).values([
      {
        user_id: 1,
        platform: 'meta_ads',
        account_id: 'acc123',
        account_name: 'Meta Account',
        access_token: 'token123',
        refresh_token: null,
        status: 'connected'
      },
      {
        user_id: 1,
        platform: 'google_ads',
        account_id: 'acc456',
        account_name: 'Google Account',
        access_token: 'token456',
        refresh_token: null,
        status: 'connected'
      }
    ]).returning();

    const campaigns = await db.insert(campaignsTable).values([
      {
        connection_id: connections[0].id,
        platform_campaign_id: 'camp123',
        name: 'Meta Campaign',
        objective: 'conversion',
        status: 'ACTIVE'
      },
      {
        connection_id: connections[1].id,
        platform_campaign_id: 'camp456',
        name: 'Google Campaign',
        objective: 'traffic',
        status: 'ACTIVE'
      }
    ]).returning();

    await db.insert(campaignMetricsTable).values([
      {
        campaign_id: campaigns[0].id,
        date: '2024-01-15',
        impressions: 1000,
        clicks: 50,
        spend: '100.00',
        conversions: 5,
        conversion_value: '500.00',
        ctr: 0.05,
        cpc: '2.00',
        cpm: '100.00',
        roas: 5.0
      },
      {
        campaign_id: campaigns[1].id,
        date: '2024-01-15',
        impressions: 2000,
        clicks: 80,
        spend: '160.00',
        conversions: 8,
        conversion_value: '800.00',
        ctr: 0.04,
        cpc: '2.00',
        cpm: '80.00',
        roas: 5.0
      }
    ]);

    const result = await getDashboardData(testInput);

    expect(result.platform_breakdown).toHaveLength(2);
    
    const metaBreakdown = result.platform_breakdown.find(p => p.platform === 'meta_ads');
    expect(metaBreakdown).toBeDefined();
    expect(metaBreakdown?.spend).toBe(100);
    expect(metaBreakdown?.impressions).toBe(1000);
    expect(metaBreakdown?.clicks).toBe(50);
    expect(metaBreakdown?.conversions).toBe(5);

    const googleBreakdown = result.platform_breakdown.find(p => p.platform === 'google_ads');
    expect(googleBreakdown).toBeDefined();
    expect(googleBreakdown?.spend).toBe(160);
    expect(googleBreakdown?.impressions).toBe(2000);
    expect(googleBreakdown?.clicks).toBe(80);
    expect(googleBreakdown?.conversions).toBe(8);
  });

  it('should group objective breakdown correctly', async () => {
    // Create test data with multiple objectives
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      company_name: 'Test Company'
    });

    const connectionResult = await db.insert(adAccountConnectionsTable).values({
      user_id: 1,
      platform: 'meta_ads',
      account_id: 'acc123',
      account_name: 'Test Account',
      access_token: 'token123',
      refresh_token: null,
      status: 'connected'
    }).returning();

    const campaigns = await db.insert(campaignsTable).values([
      {
        connection_id: connectionResult[0].id,
        platform_campaign_id: 'camp123',
        name: 'Conversion Campaign',
        objective: 'conversion',
        status: 'ACTIVE'
      },
      {
        connection_id: connectionResult[0].id,
        platform_campaign_id: 'camp456',
        name: 'Traffic Campaign',
        objective: 'traffic',
        status: 'ACTIVE'
      }
    ]).returning();

    await db.insert(campaignMetricsTable).values([
      {
        campaign_id: campaigns[0].id,
        date: '2024-01-15',
        impressions: 1000,
        clicks: 50,
        spend: '100.00',
        conversions: 5,
        conversion_value: '500.00',
        ctr: 0.05,
        cpc: '2.00',
        cpm: '100.00',
        roas: 5.0
      },
      {
        campaign_id: campaigns[1].id,
        date: '2024-01-15',
        impressions: 2000,
        clicks: 100,
        spend: '200.00',
        conversions: 5,
        conversion_value: '250.00',
        ctr: 0.05,
        cpc: '2.00',
        cpm: '100.00',
        roas: 1.25
      }
    ]);

    const result = await getDashboardData(testInput);

    expect(result.objective_breakdown).toHaveLength(2);
    
    const conversionBreakdown = result.objective_breakdown.find(o => o.objective === 'conversion');
    expect(conversionBreakdown).toBeDefined();
    expect(conversionBreakdown?.spend).toBe(100);
    expect(conversionBreakdown?.performance_score).toBe(5.0);

    const trafficBreakdown = result.objective_breakdown.find(o => o.objective === 'traffic');
    expect(trafficBreakdown).toBeDefined();
    expect(trafficBreakdown?.spend).toBe(200);
    expect(trafficBreakdown?.performance_score).toBe(1.25);
  });

  it('should return recent insights', async () => {
    // Create test data
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      company_name: 'Test Company'
    });

    // Insert insights with different timestamps to control ordering
    const now = new Date();
    const earlier = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour earlier

    await db.insert(aiInsightsTable).values([
      {
        user_id: 1,
        campaign_id: null,
        connection_id: null,
        insight_type: 'key_metrics',
        title: 'Performance Insight',
        content: 'Your campaigns are performing well',
        recommendations: 'Continue current strategy',
        confidence_score: 0.85,
        platform: 'meta_ads',
        objective: 'conversion',
        metadata: null,
        created_at: earlier
      },
      {
        user_id: 1,
        campaign_id: null,
        connection_id: null,
        insight_type: 'optimization_strategy',
        title: 'Budget Optimization',
        content: 'Consider increasing budget',
        recommendations: 'Increase by 20%',
        confidence_score: 0.75,
        platform: 'google_ads',
        objective: 'traffic',
        metadata: null,
        created_at: now
      }
    ]);

    const result = await getDashboardData(testInput);

    expect(result.recent_insights).toHaveLength(2);
    // Should be ordered by created_at DESC, so most recent first
    expect(result.recent_insights[0].title).toBe('Budget Optimization');
    expect(result.recent_insights[0].insight_type).toBe('optimization_strategy');
    expect(result.recent_insights[0].confidence_score).toBe(0.75);
    expect(result.recent_insights[0].created_at).toBeInstanceOf(Date);
    
    expect(result.recent_insights[1].title).toBe('Performance Insight');
    expect(result.recent_insights[1].insight_type).toBe('key_metrics');
    expect(result.recent_insights[1].confidence_score).toBe(0.85);
  });

  it('should filter by platform when specified', async () => {
    // Create test data with multiple platforms
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      company_name: 'Test Company'
    });

    const connections = await db.insert(adAccountConnectionsTable).values([
      {
        user_id: 1,
        platform: 'meta_ads',
        account_id: 'acc123',
        account_name: 'Meta Account',
        access_token: 'token123',
        refresh_token: null,
        status: 'connected'
      },
      {
        user_id: 1,
        platform: 'google_ads',
        account_id: 'acc456',
        account_name: 'Google Account',
        access_token: 'token456',
        refresh_token: null,
        status: 'connected'
      }
    ]).returning();

    const campaigns = await db.insert(campaignsTable).values([
      {
        connection_id: connections[0].id,
        platform_campaign_id: 'camp123',
        name: 'Meta Campaign',
        objective: 'conversion',
        status: 'ACTIVE'
      },
      {
        connection_id: connections[1].id,
        platform_campaign_id: 'camp456',
        name: 'Google Campaign',
        objective: 'traffic',
        status: 'ACTIVE'
      }
    ]).returning();

    await db.insert(campaignMetricsTable).values([
      {
        campaign_id: campaigns[0].id,
        date: '2024-01-15',
        impressions: 1000,
        clicks: 50,
        spend: '100.00',
        conversions: 5,
        conversion_value: '500.00',
        ctr: 0.05,
        cpc: '2.00',
        cpm: '100.00',
        roas: 5.0
      },
      {
        campaign_id: campaigns[1].id,
        date: '2024-01-15',
        impressions: 2000,
        clicks: 80,
        spend: '160.00',
        conversions: 8,
        conversion_value: '800.00',
        ctr: 0.04,
        cpc: '2.00',
        cpm: '80.00',
        roas: 5.0
      }
    ]);

    // Filter by Meta Ads only
    const filteredInput: GetDashboardDataInput = {
      ...testInput,
      platform: 'meta_ads'
    };

    const result = await getDashboardData(filteredInput);

    expect(result.summary_metrics.total_spend).toBe(100);
    expect(result.summary_metrics.total_impressions).toBe(1000);
    expect(result.platform_breakdown).toHaveLength(1);
    expect(result.platform_breakdown[0].platform).toBe('meta_ads');
  });

  it('should filter by date range correctly', async () => {
    // Create test data
    await db.insert(usersTable).values({
      email: 'test@example.com',
      name: 'Test User',
      company_name: 'Test Company'
    });

    const connectionResult = await db.insert(adAccountConnectionsTable).values({
      user_id: 1,
      platform: 'meta_ads',
      account_id: 'acc123',
      account_name: 'Test Account',
      access_token: 'token123',
      refresh_token: null,
      status: 'connected'
    }).returning();

    const campaignResult = await db.insert(campaignsTable).values({
      connection_id: connectionResult[0].id,
      platform_campaign_id: 'camp123',
      name: 'Test Campaign',
      objective: 'conversion',
      status: 'ACTIVE'
    }).returning();

    // Insert metrics - one inside date range, one outside
    await db.insert(campaignMetricsTable).values([
      {
        campaign_id: campaignResult[0].id,
        date: '2024-01-15', // Inside range
        impressions: 1000,
        clicks: 50,
        spend: '100.00',
        conversions: 5,
        conversion_value: '500.00',
        ctr: 0.05,
        cpc: '2.00',
        cpm: '100.00',
        roas: 5.0
      },
      {
        campaign_id: campaignResult[0].id,
        date: '2024-02-15', // Outside range
        impressions: 2000,
        clicks: 100,
        spend: '200.00',
        conversions: 10,
        conversion_value: '1000.00',
        ctr: 0.05,
        cpc: '2.00',
        cpm: '100.00',
        roas: 5.0
      }
    ]);

    const result = await getDashboardData(testInput);

    // Should only include data from inside the date range
    expect(result.summary_metrics.total_spend).toBe(100);
    expect(result.summary_metrics.total_impressions).toBe(1000);
    expect(result.summary_metrics.total_clicks).toBe(50);
    expect(result.summary_metrics.total_conversions).toBe(5);
  });
});
