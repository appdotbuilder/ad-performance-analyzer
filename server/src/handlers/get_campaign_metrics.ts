
import { db } from '../db';
import { campaignMetricsTable, campaignsTable, adAccountConnectionsTable } from '../db/schema';
import { type GetCampaignMetricsInput, type CampaignMetrics } from '../schema';
import { eq, and, gte, lte, inArray, SQL } from 'drizzle-orm';

export async function getCampaignMetrics(input: GetCampaignMetricsInput): Promise<CampaignMetrics[]> {
  try {
    // Start with base query - join metrics with campaigns and connections
    const baseQuery = db.select({
      // Campaign metrics fields
      id: campaignMetricsTable.id,
      campaign_id: campaignMetricsTable.campaign_id,
      date: campaignMetricsTable.date,
      impressions: campaignMetricsTable.impressions,
      clicks: campaignMetricsTable.clicks,
      spend: campaignMetricsTable.spend,
      conversions: campaignMetricsTable.conversions,
      conversion_value: campaignMetricsTable.conversion_value,
      ctr: campaignMetricsTable.ctr,
      cpc: campaignMetricsTable.cpc,
      cpm: campaignMetricsTable.cpm,
      roas: campaignMetricsTable.roas,
      frequency: campaignMetricsTable.frequency,
      reach: campaignMetricsTable.reach,
      video_views: campaignMetricsTable.video_views,
      engagement_rate: campaignMetricsTable.engagement_rate,
      created_at: campaignMetricsTable.created_at
    })
    .from(campaignMetricsTable)
    .innerJoin(campaignsTable, eq(campaignMetricsTable.campaign_id, campaignsTable.id))
    .innerJoin(adAccountConnectionsTable, eq(campaignsTable.connection_id, adAccountConnectionsTable.id));

    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Filter by user_id (required)
    conditions.push(eq(adAccountConnectionsTable.user_id, input.user_id));

    // Filter by date range (required) - convert dates to strings for date column comparison
    const startDateStr = input.start_date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const endDateStr = input.end_date.toISOString().split('T')[0]; // YYYY-MM-DD format
    conditions.push(gte(campaignMetricsTable.date, startDateStr));
    conditions.push(lte(campaignMetricsTable.date, endDateStr));

    // Optional filters
    if (input.campaign_ids && input.campaign_ids.length > 0) {
      conditions.push(inArray(campaignMetricsTable.campaign_id, input.campaign_ids));
    }

    if (input.platform) {
      conditions.push(eq(adAccountConnectionsTable.platform, input.platform));
    }

    if (input.objective) {
      conditions.push(eq(campaignsTable.objective, input.objective));
    }

    // Apply all conditions and execute query
    const results = await baseQuery.where(and(...conditions)).execute();

    // Convert numeric fields and date strings back to proper types
    return results.map(result => ({
      ...result,
      date: new Date(result.date), // Convert string date back to Date object
      spend: parseFloat(result.spend),
      conversion_value: parseFloat(result.conversion_value),
      cpc: parseFloat(result.cpc),
      cpm: parseFloat(result.cpm)
    }));
  } catch (error) {
    console.error('Failed to get campaign metrics:', error);
    throw error;
  }
}
