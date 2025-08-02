
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum, jsonb, real, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const adPlatformEnum = pgEnum('ad_platform', [
  'meta_ads',
  'shopee_ads', 
  'tiktok_ads',
  'tokopedia_ads',
  'google_ads',
  'lazada_ads',
  'snack_video_ads'
]);

export const adObjectiveEnum = pgEnum('ad_objective', [
  'awareness',
  'engagement', 
  'traffic',
  'conversion'
]);

export const connectionStatusEnum = pgEnum('connection_status', [
  'connected',
  'disconnected',
  'error',
  'pending'
]);

export const insightTypeEnum = pgEnum('insight_type', [
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

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  company_name: text('company_name'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Ad Account Connections table
export const adAccountConnectionsTable = pgTable('ad_account_connections', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  platform: adPlatformEnum('platform').notNull(),
  account_id: text('account_id').notNull(),
  account_name: text('account_name').notNull(),
  access_token: text('access_token').notNull(),
  refresh_token: text('refresh_token'),
  status: connectionStatusEnum('status').default('pending').notNull(),
  last_sync_at: timestamp('last_sync_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Campaigns table
export const campaignsTable = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  connection_id: integer('connection_id').references(() => adAccountConnectionsTable.id).notNull(),
  platform_campaign_id: text('platform_campaign_id').notNull(),
  name: text('name').notNull(),
  objective: adObjectiveEnum('objective').notNull(),
  status: text('status').notNull(),
  daily_budget: numeric('daily_budget', { precision: 10, scale: 2 }),
  lifetime_budget: numeric('lifetime_budget', { precision: 10, scale: 2 }),
  start_date: date('start_date'),
  end_date: date('end_date'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Campaign Metrics table
export const campaignMetricsTable = pgTable('campaign_metrics', {
  id: serial('id').primaryKey(),
  campaign_id: integer('campaign_id').references(() => campaignsTable.id).notNull(),
  date: date('date').notNull(),
  impressions: integer('impressions').notNull(),
  clicks: integer('clicks').notNull(),
  spend: numeric('spend', { precision: 10, scale: 2 }).notNull(),
  conversions: integer('conversions').notNull(),
  conversion_value: numeric('conversion_value', { precision: 10, scale: 2 }).notNull(),
  ctr: real('ctr').notNull(),
  cpc: numeric('cpc', { precision: 10, scale: 4 }).notNull(),
  cpm: numeric('cpm', { precision: 10, scale: 4 }).notNull(),
  roas: real('roas').notNull(),
  frequency: real('frequency'),
  reach: integer('reach'),
  video_views: integer('video_views'),
  engagement_rate: real('engagement_rate'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// AI Insights table
export const aiInsightsTable = pgTable('ai_insights', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  campaign_id: integer('campaign_id').references(() => campaignsTable.id),
  connection_id: integer('connection_id').references(() => adAccountConnectionsTable.id),
  insight_type: insightTypeEnum('insight_type').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  recommendations: text('recommendations').notNull(),
  confidence_score: real('confidence_score').notNull(),
  platform: adPlatformEnum('platform').notNull(),
  objective: adObjectiveEnum('objective'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  connections: many(adAccountConnectionsTable),
  insights: many(aiInsightsTable)
}));

export const adAccountConnectionsRelations = relations(adAccountConnectionsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [adAccountConnectionsTable.user_id],
    references: [usersTable.id]
  }),
  campaigns: many(campaignsTable),
  insights: many(aiInsightsTable)
}));

export const campaignsRelations = relations(campaignsTable, ({ one, many }) => ({
  connection: one(adAccountConnectionsTable, {
    fields: [campaignsTable.connection_id],
    references: [adAccountConnectionsTable.id]
  }),
  metrics: many(campaignMetricsTable),
  insights: many(aiInsightsTable)
}));

export const campaignMetricsRelations = relations(campaignMetricsTable, ({ one }) => ({
  campaign: one(campaignsTable, {
    fields: [campaignMetricsTable.campaign_id],
    references: [campaignsTable.id]
  })
}));

export const aiInsightsRelations = relations(aiInsightsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [aiInsightsTable.user_id],
    references: [usersTable.id]
  }),
  campaign: one(campaignsTable, {
    fields: [aiInsightsTable.campaign_id],
    references: [campaignsTable.id]
  }),
  connection: one(adAccountConnectionsTable, {
    fields: [aiInsightsTable.connection_id],
    references: [adAccountConnectionsTable.id]
  })
}));

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  adAccountConnections: adAccountConnectionsTable,
  campaigns: campaignsTable,
  campaignMetrics: campaignMetricsTable,
  aiInsights: aiInsightsTable
};
