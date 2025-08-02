
import { z } from 'zod';

// Enums for various ad platforms and objectives
export const adPlatformSchema = z.enum([
  'meta_ads',
  'shopee_ads', 
  'tiktok_ads',
  'tokopedia_ads',
  'google_ads',
  'lazada_ads',
  'snack_video_ads'
]);

export const adObjectiveSchema = z.enum([
  'awareness',
  'engagement', 
  'traffic',
  'conversion'
]);

export const connectionStatusSchema = z.enum([
  'connected',
  'disconnected',
  'error',
  'pending'
]);

export const insightTypeSchema = z.enum([
  'funnel_evaluation',
  'key_metrics',
  'anomaly_detection',
  'audience_segmentation',
  'optimization_strategy',
  'campaign_structure',
  'algorithm_explanation',
  'testing_scaling',
  'content_strategy'
]);

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  company_name: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Ad Account Connection schema
export const adAccountConnectionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  platform: adPlatformSchema,
  account_id: z.string(),
  account_name: z.string(),
  access_token: z.string(),
  refresh_token: z.string().nullable(),
  status: connectionStatusSchema,
  last_sync_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type AdAccountConnection = z.infer<typeof adAccountConnectionSchema>;

// Campaign schema
export const campaignSchema = z.object({
  id: z.number(),
  connection_id: z.number(),
  platform_campaign_id: z.string(),
  name: z.string(),
  objective: adObjectiveSchema,
  status: z.string(),
  daily_budget: z.number().nullable(),
  lifetime_budget: z.number().nullable(),
  start_date: z.coerce.date().nullable(),
  end_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Campaign = z.infer<typeof campaignSchema>;

// Campaign Metrics schema
export const campaignMetricsSchema = z.object({
  id: z.number(),
  campaign_id: z.number(),
  date: z.coerce.date(),
  impressions: z.number().int(),
  clicks: z.number().int(),
  spend: z.number(),
  conversions: z.number().int(),
  conversion_value: z.number(),
  ctr: z.number(),
  cpc: z.number(),
  cpm: z.number(),
  roas: z.number(),
  frequency: z.number().nullable(),
  reach: z.number().int().nullable(),
  video_views: z.number().int().nullable(),
  engagement_rate: z.number().nullable(),
  created_at: z.coerce.date()
});

export type CampaignMetrics = z.infer<typeof campaignMetricsSchema>;

// AI Insights schema
export const aiInsightSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  campaign_id: z.number().nullable(),
  connection_id: z.number().nullable(),
  insight_type: insightTypeSchema,
  title: z.string(),
  content: z.string(),
  recommendations: z.string(),
  confidence_score: z.number().min(0).max(1),
  platform: adPlatformSchema,
  objective: adObjectiveSchema.nullable(),
  metadata: z.record(z.any()).nullable(),
  created_at: z.coerce.date()
});

export type AiInsight = z.infer<typeof aiInsightSchema>;

// Input schemas for creating/updating
export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  company_name: z.string().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createAdAccountConnectionInputSchema = z.object({
  user_id: z.number(),
  platform: adPlatformSchema,
  account_id: z.string(),
  account_name: z.string(),
  access_token: z.string(),
  refresh_token: z.string().nullable()
});

export type CreateAdAccountConnectionInput = z.infer<typeof createAdAccountConnectionInputSchema>;

export const updateConnectionStatusInputSchema = z.object({
  connection_id: z.number(),
  status: connectionStatusSchema,
  last_sync_at: z.coerce.date().optional()
});

export type UpdateConnectionStatusInput = z.infer<typeof updateConnectionStatusInputSchema>;

export const syncCampaignDataInputSchema = z.object({
  connection_id: z.number(),
  force_sync: z.boolean().optional()
});

export type SyncCampaignDataInput = z.infer<typeof syncCampaignDataInputSchema>;

export const getCampaignMetricsInputSchema = z.object({
  user_id: z.number(),
  campaign_ids: z.array(z.number()).optional(),
  platform: adPlatformSchema.optional(),
  objective: adObjectiveSchema.optional(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  group_by: z.enum(['day', 'week', 'month']).optional()
});

export type GetCampaignMetricsInput = z.infer<typeof getCampaignMetricsInputSchema>;

export const generateAiInsightInputSchema = z.object({
  user_id: z.number(),
  campaign_id: z.number().optional(),
  connection_id: z.number().optional(),
  insight_type: insightTypeSchema,
  platform: adPlatformSchema,
  objective: adObjectiveSchema.optional(),
  date_range: z.object({
    start_date: z.coerce.date(),
    end_date: z.coerce.date()
  })
});

export type GenerateAiInsightInput = z.infer<typeof generateAiInsightInputSchema>;

export const getDashboardDataInputSchema = z.object({
  user_id: z.number(),
  platform: adPlatformSchema.optional(),
  objective: adObjectiveSchema.optional(),
  date_range: z.object({
    start_date: z.coerce.date(),
    end_date: z.coerce.date()
  })
});

export type GetDashboardDataInput = z.infer<typeof getDashboardDataInputSchema>;
