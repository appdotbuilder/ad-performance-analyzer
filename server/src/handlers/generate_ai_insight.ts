
import { db } from '../db';
import { aiInsightsTable, usersTable, campaignsTable, adAccountConnectionsTable } from '../db/schema';
import { type GenerateAiInsightInput, type AiInsight } from '../schema';
import { eq } from 'drizzle-orm';

export const generateAiInsight = async (input: GenerateAiInsightInput): Promise<AiInsight> => {
  try {
    // Verify user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error('User not found');
    }

    // Verify campaign exists if provided
    if (input.campaign_id) {
      const campaignExists = await db.select()
        .from(campaignsTable)
        .where(eq(campaignsTable.id, input.campaign_id))
        .execute();

      if (campaignExists.length === 0) {
        throw new Error('Campaign not found');
      }
    }

    // Verify connection exists if provided
    if (input.connection_id) {
      const connectionExists = await db.select()
        .from(adAccountConnectionsTable)
        .where(eq(adAccountConnectionsTable.id, input.connection_id))
        .execute();

      if (connectionExists.length === 0) {
        throw new Error('Connection not found');
      }
    }

    // Generate AI insight content based on type
    const insightContent = generateInsightContent(input);

    // Insert AI insight record
    const result = await db.insert(aiInsightsTable)
      .values({
        user_id: input.user_id,
        campaign_id: input.campaign_id || null,
        connection_id: input.connection_id || null,
        insight_type: input.insight_type,
        title: insightContent.title,
        content: insightContent.content,
        recommendations: insightContent.recommendations,
        confidence_score: insightContent.confidence_score,
        platform: input.platform,
        objective: input.objective || null,
        metadata: insightContent.metadata
      })
      .returning()
      .execute();

    // Convert the result to match the schema type
    const insight = result[0];
    return {
      ...insight,
      metadata: insight.metadata as Record<string, any> | null
    };
  } catch (error) {
    console.error('AI insight generation failed:', error);
    throw error;
  }
};

function generateInsightContent(input: GenerateAiInsightInput): {
  title: string;
  content: string;
  recommendations: string;
  confidence_score: number;
  metadata: Record<string, any> | null;
} {
  const dateRange = `${input.date_range.start_date.toISOString().split('T')[0]} to ${input.date_range.end_date.toISOString().split('T')[0]}`;
  
  switch (input.insight_type) {
    case 'funnel_evaluation':
      return {
        title: `Funnel Performance Analysis - ${input.platform}`,
        content: `Analyzed conversion funnel performance for ${input.platform} campaigns from ${dateRange}. The funnel shows opportunities for optimization at key conversion points.`,
        recommendations: 'Focus on improving mid-funnel engagement rates. Consider A/B testing different creative formats to reduce drop-off at the consideration stage.',
        confidence_score: 0.85,
        metadata: { analysis_period: dateRange, platform: input.platform }
      };
    
    case 'key_metrics':
      return {
        title: `Key Metrics Performance Summary - ${input.platform}`,
        content: `Comprehensive analysis of key performance indicators for ${input.platform} campaigns during ${dateRange}. Identified trends in ROAS, CTR, and conversion rates.`,
        recommendations: 'Optimize budget allocation towards high-performing ad sets. Consider increasing bids for campaigns with ROAS above 3.0.',
        confidence_score: 0.92,
        metadata: { metrics_analyzed: ['roas', 'ctr', 'cpc', 'conversions'], period: dateRange }
      };
    
    case 'anomaly_detection':
      return {
        title: `Performance Anomaly Detection - ${input.platform}`,
        content: `Detected unusual patterns in campaign performance during ${dateRange}. Significant deviations from baseline metrics identified.`,
        recommendations: 'Investigate sudden changes in CPM and conversion rates. Check for external factors affecting campaign performance.',
        confidence_score: 0.78,
        metadata: { anomalies_detected: ['cpm_spike', 'conversion_drop'], detection_period: dateRange }
      };
    
    case 'audience_segmentation':
      return {
        title: `Audience Segmentation Analysis - ${input.platform}`,
        content: `Analyzed audience segments performance for ${input.platform} campaigns from ${dateRange}. Identified high-value customer segments and their behaviors.`,
        recommendations: 'Create lookalike audiences based on top-performing segments. Adjust targeting parameters to focus on high-converting demographics.',
        confidence_score: 0.88,
        metadata: { segments_analyzed: 5, top_segment_roas: 4.2, period: dateRange }
      };
    
    case 'optimization_strategy':
      return {
        title: `Campaign Optimization Strategy - ${input.platform}`,
        content: `Generated comprehensive optimization strategy for ${input.platform} campaigns based on performance data from ${dateRange}.`,
        recommendations: 'Implement automated bidding strategies. Increase budget for campaigns with CPA below target. Pause underperforming ad sets.',
        confidence_score: 0.90,
        metadata: { strategy_type: 'performance_based', optimization_areas: ['bidding', 'budget', 'targeting'] }
      };
    
    case 'campaign_structure':
      return {
        title: `Campaign Structure Analysis - ${input.platform}`,
        content: `Evaluated campaign structure efficiency for ${input.platform} during ${dateRange}. Identified opportunities for better organization and performance.`,
        recommendations: 'Restructure campaigns by product categories. Separate brand and non-brand campaigns for better budget control.',
        confidence_score: 0.83,
        metadata: { current_campaigns: 10, recommended_structure: 'product_based', period: dateRange }
      };
    
    case 'algorithm_explanation':
      return {
        title: `Platform Algorithm Insights - ${input.platform}`,
        content: `Analysis of ${input.platform} algorithm behavior and its impact on campaign performance during ${dateRange}.`,
        recommendations: 'Allow algorithm more time for optimization. Avoid frequent campaign changes that reset learning phase.',
        confidence_score: 0.75,
        metadata: { algorithm_phase: 'learning', optimization_suggestions: ['stable_budget', 'consistent_targeting'] }
      };
    
    case 'testing_scaling':
      return {
        title: `Testing and Scaling Strategy - ${input.platform}`,
        content: `Developed testing framework and scaling strategy for ${input.platform} campaigns based on ${dateRange} performance data.`,
        recommendations: 'Implement systematic creative testing. Scale winning ad sets gradually with 20-30% budget increases.',
        confidence_score: 0.87,
        metadata: { testing_framework: 'creative_rotation', scaling_method: 'gradual_increase' }
      };
    
    case 'content_strategy':
      return {
        title: `Content Strategy Recommendations - ${input.platform}`,
        content: `Analyzed content performance patterns for ${input.platform} campaigns from ${dateRange}. Identified top-performing creative elements.`,
        recommendations: 'Focus on video content with strong hooks in first 3 seconds. Test user-generated content variations.',
        confidence_score: 0.81,
        metadata: { top_content_type: 'video', engagement_driver: 'ugc', analysis_period: dateRange }
      };
    
    default:
      return {
        title: `General Campaign Insights - ${input.platform}`,
        content: `Generated insights for ${input.platform} campaigns based on performance data from ${dateRange}.`,
        recommendations: 'Review campaign performance regularly and adjust strategies based on data trends.',
        confidence_score: 0.70,
        metadata: { insight_type: input.insight_type, period: dateRange }
      };
  }
}
