
import { db } from '../db';
import { 
  adAccountConnectionsTable, 
  campaignsTable, 
  campaignMetricsTable 
} from '../db/schema';
import { type SyncCampaignDataInput } from '../schema';
import { eq, and, gte } from 'drizzle-orm';

export async function syncCampaignData(input: SyncCampaignDataInput): Promise<{ success: boolean; campaigns_synced: number; metrics_synced: number }> {
  try {
    // Get the connection to sync
    const connections = await db.select()
      .from(adAccountConnectionsTable)
      .where(eq(adAccountConnectionsTable.id, input.connection_id))
      .execute();

    if (connections.length === 0) {
      throw new Error(`Connection not found: ${input.connection_id}`);
    }

    const connection = connections[0];

    if (connection.status !== 'connected') {
      throw new Error(`Cannot sync: connection status is ${connection.status}`);
    }

    // Determine sync period
    let syncFromDate = new Date();
    syncFromDate.setDate(syncFromDate.getDate() - 30); // Default: last 30 days

    if (!input.force_sync && connection.last_sync_at) {
      // Incremental sync: only sync data since last sync
      syncFromDate = connection.last_sync_at;
    }

    // Mock API data simulation - in real implementation, this would call platform APIs
    const mockCampaigns = generateMockCampaigns(connection, syncFromDate);
    const mockMetrics = generateMockMetrics(mockCampaigns, syncFromDate);

    let campaignsSynced = 0;
    let metricsSynced = 0;

    // Sync campaigns
    for (const campaignData of mockCampaigns) {
      // Check if campaign already exists
      const existingCampaigns = await db.select()
        .from(campaignsTable)
        .where(and(
          eq(campaignsTable.connection_id, input.connection_id),
          eq(campaignsTable.platform_campaign_id, campaignData.platform_campaign_id)
        ))
        .execute();

      if (existingCampaigns.length === 0) {
        // Insert new campaign
        await db.insert(campaignsTable)
          .values({
            connection_id: input.connection_id,
            platform_campaign_id: campaignData.platform_campaign_id,
            name: campaignData.name,
            objective: campaignData.objective,
            status: campaignData.status,
            daily_budget: campaignData.daily_budget ? campaignData.daily_budget.toString() : null,
            lifetime_budget: campaignData.lifetime_budget ? campaignData.lifetime_budget.toString() : null,
            start_date: campaignData.start_date,
            end_date: campaignData.end_date
          })
          .execute();
        
        campaignsSynced++;
      } else {
        // Update existing campaign
        await db.update(campaignsTable)
          .set({
            name: campaignData.name,
            status: campaignData.status,
            daily_budget: campaignData.daily_budget ? campaignData.daily_budget.toString() : null,
            lifetime_budget: campaignData.lifetime_budget ? campaignData.lifetime_budget.toString() : null,
            end_date: campaignData.end_date,
            updated_at: new Date()
          })
          .where(eq(campaignsTable.id, existingCampaigns[0].id))
          .execute();
      }
    }

    // Get campaign IDs for metrics sync
    const campaignIds = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.connection_id, input.connection_id))
      .execute();

    const campaignIdMap = new Map(
      campaignIds.map(c => [c.platform_campaign_id, c.id])
    );

    // Sync metrics
    for (const metricsData of mockMetrics) {
      const campaignId = campaignIdMap.get(metricsData.platform_campaign_id);
      if (!campaignId) continue;

      // Check if metrics already exist for this date
      const existingMetrics = await db.select()
        .from(campaignMetricsTable)
        .where(and(
          eq(campaignMetricsTable.campaign_id, campaignId),
          eq(campaignMetricsTable.date, metricsData.date)
        ))
        .execute();

      if (existingMetrics.length === 0) {
        // Insert new metrics
        await db.insert(campaignMetricsTable)
          .values({
            campaign_id: campaignId,
            date: metricsData.date,
            impressions: metricsData.impressions,
            clicks: metricsData.clicks,
            spend: metricsData.spend.toString(),
            conversions: metricsData.conversions,
            conversion_value: metricsData.conversion_value.toString(),
            ctr: metricsData.ctr,
            cpc: metricsData.cpc.toString(),
            cpm: metricsData.cpm.toString(),
            roas: metricsData.roas,
            frequency: metricsData.frequency,
            reach: metricsData.reach,
            video_views: metricsData.video_views,
            engagement_rate: metricsData.engagement_rate
          })
          .execute();
        
        metricsSynced++;
      } else {
        // Update existing metrics
        await db.update(campaignMetricsTable)
          .set({
            impressions: metricsData.impressions,
            clicks: metricsData.clicks,
            spend: metricsData.spend.toString(),
            conversions: metricsData.conversions,
            conversion_value: metricsData.conversion_value.toString(),
            ctr: metricsData.ctr,
            cpc: metricsData.cpc.toString(),
            cpm: metricsData.cpm.toString(),
            roas: metricsData.roas,
            frequency: metricsData.frequency,
            reach: metricsData.reach,
            video_views: metricsData.video_views,
            engagement_rate: metricsData.engagement_rate
          })
          .where(eq(campaignMetricsTable.id, existingMetrics[0].id))
          .execute();
      }
    }

    // Update connection's last sync timestamp
    await db.update(adAccountConnectionsTable)
      .set({
        last_sync_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(adAccountConnectionsTable.id, input.connection_id))
      .execute();

    return {
      success: true,
      campaigns_synced: campaignsSynced,
      metrics_synced: metricsSynced
    };

  } catch (error) {
    console.error('Campaign data sync failed:', error);
    throw error;
  }
}

// Mock data generators for testing/demo purposes
function generateMockCampaigns(connection: any, fromDate: Date) {
  return [
    {
      platform_campaign_id: `${connection.platform}_campaign_1`,
      name: `Test Campaign 1 - ${connection.platform}`,
      objective: 'conversion' as const,
      status: 'active',
      daily_budget: 100,
      lifetime_budget: null,
      start_date: '2024-01-01',
      end_date: null
    },
    {
      platform_campaign_id: `${connection.platform}_campaign_2`,
      name: `Test Campaign 2 - ${connection.platform}`,
      objective: 'traffic' as const,
      status: 'paused',
      daily_budget: null,
      lifetime_budget: 5000,
      start_date: '2024-01-15',
      end_date: '2024-02-15'
    }
  ];
}

function generateMockMetrics(campaigns: any[], fromDate: Date) {
  const metrics = [];
  const today = new Date();
  
  for (const campaign of campaigns) {
    // Generate metrics for last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      if (date >= fromDate) {
        metrics.push({
          platform_campaign_id: campaign.platform_campaign_id,
          date: date.toISOString().split('T')[0], // YYYY-MM-DD format
          impressions: Math.floor(Math.random() * 10000) + 1000,
          clicks: Math.floor(Math.random() * 500) + 50,
          spend: Math.round((Math.random() * 200 + 50) * 100) / 100,
          conversions: Math.floor(Math.random() * 20) + 1,
          conversion_value: Math.round((Math.random() * 1000 + 100) * 100) / 100,
          ctr: Math.round((Math.random() * 5 + 1) * 100) / 100, // 1-6%
          cpc: Math.round((Math.random() * 2 + 0.5) * 100) / 100, // $0.50-$2.50
          cpm: Math.round((Math.random() * 20 + 5) * 100) / 100, // $5-$25
          roas: Math.round((Math.random() * 8 + 2) * 100) / 100, // 2-10x
          frequency: Math.round((Math.random() * 3 + 1) * 100) / 100, // 1-4
          reach: Math.floor(Math.random() * 5000) + 500,
          video_views: Math.floor(Math.random() * 2000) + 100,
          engagement_rate: Math.round((Math.random() * 10 + 1) * 100) / 100 // 1-11%
        });
      }
    }
  }
  
  return metrics;
}
