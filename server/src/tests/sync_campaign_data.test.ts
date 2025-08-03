
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  adAccountConnectionsTable, 
  campaignsTable, 
  campaignMetricsTable 
} from '../db/schema';
import { type SyncCampaignDataInput } from '../schema';
import { syncCampaignData } from '../handlers/sync_campaign_data';
import { eq, and } from 'drizzle-orm';

describe('syncCampaignData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testConnectionId: number;

  beforeEach(async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        company_name: 'Test Company'
      })
      .returning()
      .execute();
    
    testUserId = users[0].id;

    // Create test connection
    const connections = await db.insert(adAccountConnectionsTable)
      .values({
        user_id: testUserId,
        platform: 'meta_ads',
        account_id: 'test_account_123',
        account_name: 'Test Ad Account',
        access_token: 'test_token',
        refresh_token: 'test_refresh',
        status: 'connected'
      })
      .returning()
      .execute();
    
    testConnectionId = connections[0].id;
  });

  it('should sync campaign data successfully', async () => {
    const input: SyncCampaignDataInput = {
      connection_id: testConnectionId,
      force_sync: true
    };

    const result = await syncCampaignData(input);

    expect(result.success).toBe(true);
    expect(result.campaigns_synced).toBeGreaterThan(0);
    expect(result.metrics_synced).toBeGreaterThan(0);
  });

  it('should create campaigns in database', async () => {
    const input: SyncCampaignDataInput = {
      connection_id: testConnectionId,
      force_sync: true
    };

    await syncCampaignData(input);

    const campaigns = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.connection_id, testConnectionId))
      .execute();

    expect(campaigns.length).toBeGreaterThan(0);

    const campaign = campaigns[0];
    expect(campaign.connection_id).toBe(testConnectionId);
    expect(campaign.platform_campaign_id).toBeDefined();
    expect(campaign.name).toBeDefined();
    expect(campaign.objective).toBeDefined();
    expect(campaign.status).toBeDefined();
    expect(campaign.created_at).toBeInstanceOf(Date);
  });

  it('should create campaign metrics in database', async () => {
    const input: SyncCampaignDataInput = {
      connection_id: testConnectionId,
      force_sync: true
    };

    await syncCampaignData(input);

    // Get campaigns first
    const campaigns = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.connection_id, testConnectionId))
      .execute();

    expect(campaigns.length).toBeGreaterThan(0);

    // Check metrics for first campaign
    const metrics = await db.select()
      .from(campaignMetricsTable)
      .where(eq(campaignMetricsTable.campaign_id, campaigns[0].id))
      .execute();

    expect(metrics.length).toBeGreaterThan(0);

    const metric = metrics[0];
    expect(metric.campaign_id).toBe(campaigns[0].id);
    expect(metric.date).toBeDefined();
    expect(metric.impressions).toBeGreaterThan(0);
    expect(metric.clicks).toBeGreaterThan(0);
    expect(typeof parseFloat(metric.spend)).toBe('number');
    expect(metric.conversions).toBeGreaterThan(0);
    expect(typeof parseFloat(metric.conversion_value)).toBe('number');
    expect(metric.ctr).toBeGreaterThan(0);
    expect(typeof parseFloat(metric.cpc)).toBe('number');
    expect(typeof parseFloat(metric.cpm)).toBe('number');
    expect(metric.roas).toBeGreaterThan(0);
  });

  it('should update connection last_sync_at timestamp', async () => {
    const input: SyncCampaignDataInput = {
      connection_id: testConnectionId,
      force_sync: true
    };

    const beforeSync = new Date();
    await syncCampaignData(input);

    const connections = await db.select()
      .from(adAccountConnectionsTable)
      .where(eq(adAccountConnectionsTable.id, testConnectionId))
      .execute();

    expect(connections.length).toBe(1);
    expect(connections[0].last_sync_at).toBeInstanceOf(Date);
    expect(connections[0].last_sync_at!.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
  });

  it('should handle incremental sync based on last_sync_at', async () => {
    // First sync
    const input: SyncCampaignDataInput = {
      connection_id: testConnectionId,
      force_sync: true
    };

    await syncCampaignData(input);

    // Update last_sync_at to 2 days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    await db.update(adAccountConnectionsTable)
      .set({ last_sync_at: twoDaysAgo })
      .where(eq(adAccountConnectionsTable.id, testConnectionId))
      .execute();

    // Second sync without force_sync (incremental)
    const incrementalInput: SyncCampaignDataInput = {
      connection_id: testConnectionId,
      force_sync: false
    };

    const result = await syncCampaignData(incrementalInput);

    expect(result.success).toBe(true);
    // Should still process some data for incremental sync
    expect(result.campaigns_synced).toBeGreaterThanOrEqual(0);
    expect(result.metrics_synced).toBeGreaterThanOrEqual(0);
  });

  it('should throw error for non-existent connection', async () => {
    const input: SyncCampaignDataInput = {
      connection_id: 99999,
      force_sync: true
    };

    await expect(syncCampaignData(input)).rejects.toThrow(/Connection not found/);
  });

  it('should throw error for disconnected connection', async () => {
    // Update connection status to disconnected
    await db.update(adAccountConnectionsTable)
      .set({ status: 'disconnected' })
      .where(eq(adAccountConnectionsTable.id, testConnectionId))
      .execute();

    const input: SyncCampaignDataInput = {
      connection_id: testConnectionId,
      force_sync: true
    };

    await expect(syncCampaignData(input)).rejects.toThrow(/Cannot sync: connection status is disconnected/);
  });

  it('should handle updates to existing campaigns', async () => {
    // First sync
    const input: SyncCampaignDataInput = {
      connection_id: testConnectionId,
      force_sync: true
    };

    await syncCampaignData(input);

    // Get initial campaign count
    const initialCampaigns = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.connection_id, testConnectionId))
      .execute();

    const initialCount = initialCampaigns.length;

    // Second sync (should update existing campaigns, not create new ones)
    await syncCampaignData(input);

    const finalCampaigns = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.connection_id, testConnectionId))
      .execute();

    // Campaign count should remain the same (updates, not inserts)
    expect(finalCampaigns.length).toBe(initialCount);
  });

  it('should handle updates to existing metrics', async () => {
    // First sync
    const input: SyncCampaignDataInput = {
      connection_id: testConnectionId,
      force_sync: true
    };

    await syncCampaignData(input);

    // Get campaigns and initial metrics count
    const campaigns = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.connection_id, testConnectionId))
      .execute();

    const initialMetrics = await db.select()
      .from(campaignMetricsTable)
      .where(eq(campaignMetricsTable.campaign_id, campaigns[0].id))
      .execute();

    const initialCount = initialMetrics.length;

    // Second sync (should update existing metrics for same dates)
    await syncCampaignData(input);

    const finalMetrics = await db.select()
      .from(campaignMetricsTable)
      .where(eq(campaignMetricsTable.campaign_id, campaigns[0].id))
      .execute();

    // Metrics count should remain the same for same date range
    expect(finalMetrics.length).toBe(initialCount);
  });
});
