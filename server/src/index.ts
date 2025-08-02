
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
    createUserInputSchema,
    createAdAccountConnectionInputSchema,
    updateConnectionStatusInputSchema,
    syncCampaignDataInputSchema,
    getCampaignMetricsInputSchema,
    generateAiInsightInputSchema,
    getDashboardDataInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { connectAdAccount } from './handlers/connect_ad_account';
import { getUserConnections } from './handlers/get_user_connections';
import { updateConnectionStatus } from './handlers/update_connection_status';
import { syncCampaignData } from './handlers/sync_campaign_data';
import { getCampaignMetrics } from './handlers/get_campaign_metrics';
import { generateAiInsight } from './handlers/generate_ai_insight';
import { getDashboardData } from './handlers/get_dashboard_data';
import { getUserInsights } from './handlers/get_user_insights';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Additional input schemas for simple queries
const getUserConnectionsInputSchema = z.object({
  user_id: z.number()
});

const getUserInsightsInputSchema = z.object({
  user_id: z.number(),
  limit: z.number().optional()
});

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  // Ad account connections
  connectAdAccount: publicProcedure  
    .input(createAdAccountConnectionInputSchema)
    .mutation(({ input }) => connectAdAccount(input)),

  getUserConnections: publicProcedure
    .input(getUserConnectionsInputSchema)
    .query(({ input }) => getUserConnections(input.user_id)),

  updateConnectionStatus: publicProcedure
    .input(updateConnectionStatusInputSchema)
    .mutation(({ input }) => updateConnectionStatus(input)),

  // Campaign data synchronization
  syncCampaignData: publicProcedure
    .input(syncCampaignDataInputSchema) 
    .mutation(({ input }) => syncCampaignData(input)),

  // Metrics and analytics
  getCampaignMetrics: publicProcedure
    .input(getCampaignMetricsInputSchema)
    .query(({ input }) => getCampaignMetrics(input)),

  getDashboardData: publicProcedure
    .input(getDashboardDataInputSchema)
    .query(({ input }) => getDashboardData(input)),

  // AI insights
  generateAiInsight: publicProcedure
    .input(generateAiInsightInputSchema)
    .mutation(({ input }) => generateAiInsight(input)),

  getUserInsights: publicProcedure
    .input(getUserInsightsInputSchema)
    .query(({ input }) => getUserInsights(input.user_id, input.limit)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
