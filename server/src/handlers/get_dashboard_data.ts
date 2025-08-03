
import { db } from '../db';
import { 
  campaignMetricsTable, 
  campaignsTable, 
  adAccountConnectionsTable,
  aiInsightsTable
} from '../db/schema';
import { type GetDashboardDataInput } from '../schema';
import { eq, and, gte, lte, desc, SQL } from 'drizzle-orm';

export async function getDashboardData(input: GetDashboardDataInput): Promise<{
    summary_metrics: {
        total_spend: number;
        total_impressions: number;
        total_clicks: number;
        total_conversions: number;
        avg_ctr: number;
        avg_cpc: number;
        avg_roas: number;
    };
    platform_breakdown: Array<{
        platform: string;
        spend: number;
        impressions: number;
        clicks: number;
        conversions: number;
    }>;
    objective_breakdown: Array<{
        objective: string;
        spend: number;
        performance_score: number;
    }>;
    recent_insights: Array<{
        id: number;
        title: string;
        insight_type: string;
        confidence_score: number;
        created_at: Date;
    }>;
}> {
    try {
        // Build conditions for filtering metrics
        const conditions: SQL<unknown>[] = [
            gte(campaignMetricsTable.date, input.date_range.start_date.toISOString().split('T')[0]),
            lte(campaignMetricsTable.date, input.date_range.end_date.toISOString().split('T')[0])
        ];

        // Base query for metrics with joins to get platform and objective info
        let metricsQuery = db.select({
            spend: campaignMetricsTable.spend,
            impressions: campaignMetricsTable.impressions,
            clicks: campaignMetricsTable.clicks,
            conversions: campaignMetricsTable.conversions,
            ctr: campaignMetricsTable.ctr,
            cpc: campaignMetricsTable.cpc,
            roas: campaignMetricsTable.roas,
            platform: adAccountConnectionsTable.platform,
            objective: campaignsTable.objective
        })
        .from(campaignMetricsTable)
        .innerJoin(campaignsTable, eq(campaignMetricsTable.campaign_id, campaignsTable.id))
        .innerJoin(adAccountConnectionsTable, eq(campaignsTable.connection_id, adAccountConnectionsTable.id));

        // Add user filter
        conditions.push(eq(adAccountConnectionsTable.user_id, input.user_id));

        // Add platform filter if specified
        if (input.platform) {
            conditions.push(eq(adAccountConnectionsTable.platform, input.platform));
        }

        // Add objective filter if specified
        if (input.objective) {
            conditions.push(eq(campaignsTable.objective, input.objective));
        }

        // Apply all conditions
        const finalMetricsQuery = metricsQuery.where(and(...conditions));

        const metricsResults = await finalMetricsQuery.execute();

        // Calculate summary metrics
        const totalSpend = metricsResults.reduce((sum, row) => sum + parseFloat(row.spend), 0);
        const totalImpressions = metricsResults.reduce((sum, row) => sum + row.impressions, 0);
        const totalClicks = metricsResults.reduce((sum, row) => sum + row.clicks, 0);
        const totalConversions = metricsResults.reduce((sum, row) => sum + row.conversions, 0);

        // Calculate averages
        const avgCtr = metricsResults.length > 0 
            ? metricsResults.reduce((sum, row) => sum + row.ctr, 0) / metricsResults.length
            : 0;
        const avgCpc = metricsResults.length > 0
            ? metricsResults.reduce((sum, row) => sum + parseFloat(row.cpc), 0) / metricsResults.length
            : 0;
        const avgRoas = metricsResults.length > 0
            ? metricsResults.reduce((sum, row) => sum + row.roas, 0) / metricsResults.length
            : 0;

        // Calculate platform breakdown
        const platformBreakdown = new Map<string, {
            spend: number;
            impressions: number;
            clicks: number;
            conversions: number;
        }>();

        metricsResults.forEach(row => {
            const platform = row.platform;
            const existing = platformBreakdown.get(platform) || {
                spend: 0,
                impressions: 0,
                clicks: 0,
                conversions: 0
            };

            platformBreakdown.set(platform, {
                spend: existing.spend + parseFloat(row.spend),
                impressions: existing.impressions + row.impressions,
                clicks: existing.clicks + row.clicks,
                conversions: existing.conversions + row.conversions
            });
        });

        // Calculate objective breakdown with performance score (using ROAS as performance metric)
        const objectiveBreakdown = new Map<string, {
            spend: number;
            roasSum: number;
            count: number;
        }>();

        metricsResults.forEach(row => {
            const objective = row.objective;
            const existing = objectiveBreakdown.get(objective) || {
                spend: 0,
                roasSum: 0,
                count: 0
            };

            objectiveBreakdown.set(objective, {
                spend: existing.spend + parseFloat(row.spend),
                roasSum: existing.roasSum + row.roas,
                count: existing.count + 1
            });
        });

        // Build insights query
        const insightConditions: SQL<unknown>[] = [
            eq(aiInsightsTable.user_id, input.user_id)
        ];

        if (input.platform) {
            insightConditions.push(eq(aiInsightsTable.platform, input.platform));
        }

        if (input.objective) {
            insightConditions.push(eq(aiInsightsTable.objective, input.objective));
        }

        let insightsQuery = db.select({
            id: aiInsightsTable.id,
            title: aiInsightsTable.title,
            insight_type: aiInsightsTable.insight_type,
            confidence_score: aiInsightsTable.confidence_score,
            created_at: aiInsightsTable.created_at
        })
        .from(aiInsightsTable);

        const finalInsightsQuery = insightsQuery
            .where(and(...insightConditions))
            .orderBy(desc(aiInsightsTable.created_at))
            .limit(5);

        const insightsResults = await finalInsightsQuery.execute();

        return {
            summary_metrics: {
                total_spend: totalSpend,
                total_impressions: totalImpressions,
                total_clicks: totalClicks,
                total_conversions: totalConversions,
                avg_ctr: avgCtr,
                avg_cpc: avgCpc,
                avg_roas: avgRoas
            },
            platform_breakdown: Array.from(platformBreakdown.entries()).map(([platform, data]) => ({
                platform,
                ...data
            })),
            objective_breakdown: Array.from(objectiveBreakdown.entries()).map(([objective, data]) => ({
                objective,
                spend: data.spend,
                performance_score: data.count > 0 ? data.roasSum / data.count : 0
            })),
            recent_insights: insightsResults
        };
    } catch (error) {
        console.error('Dashboard data retrieval failed:', error);
        throw error;
    }
}
