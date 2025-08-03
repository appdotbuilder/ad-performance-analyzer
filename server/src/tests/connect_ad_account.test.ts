
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, adAccountConnectionsTable } from '../db/schema';
import { type CreateAdAccountConnectionInput } from '../schema';
import { connectAdAccount } from '../handlers/connect_ad_account';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  company_name: 'Test Company'
};

// Test ad account connection input
const testInput: CreateAdAccountConnectionInput = {
  user_id: 1, // Will be set after user creation
  platform: 'meta_ads' as const,
  account_id: 'act_123456789',
  account_name: 'Test Ad Account',
  access_token: 'test_access_token_12345',
  refresh_token: 'test_refresh_token_67890'
};

describe('connectAdAccount', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should connect an ad account', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input = { ...testInput, user_id: userId };

    const result = await connectAdAccount(input);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.platform).toEqual('meta_ads');
    expect(result.account_id).toEqual('act_123456789');
    expect(result.account_name).toEqual('Test Ad Account');
    expect(result.access_token).toEqual('test_access_token_12345');
    expect(result.refresh_token).toEqual('test_refresh_token_67890');
    expect(result.status).toEqual('pending');
    expect(result.last_sync_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save connection to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input = { ...testInput, user_id: userId };

    const result = await connectAdAccount(input);

    // Query database to verify connection was saved
    const connections = await db.select()
      .from(adAccountConnectionsTable)
      .where(eq(adAccountConnectionsTable.id, result.id))
      .execute();

    expect(connections).toHaveLength(1);
    expect(connections[0].user_id).toEqual(userId);
    expect(connections[0].platform).toEqual('meta_ads');
    expect(connections[0].account_id).toEqual('act_123456789');
    expect(connections[0].status).toEqual('pending');
    expect(connections[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle null refresh token', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input = { ...testInput, user_id: userId, refresh_token: null };

    const result = await connectAdAccount(input);

    expect(result.refresh_token).toBeNull();
    expect(result.access_token).toEqual('test_access_token_12345');
    expect(result.platform).toEqual('meta_ads');
  });

  it('should throw error for non-existent user', async () => {
    const input = { ...testInput, user_id: 999 };

    await expect(connectAdAccount(input)).rejects.toThrow(/user with id 999 not found/i);
  });

  it('should connect multiple platforms for same user', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Connect Meta Ads account
    const metaInput = { ...testInput, user_id: userId };
    const metaResult = await connectAdAccount(metaInput);

    // Connect TikTok Ads account
    const tiktokInput = {
      ...testInput,
      user_id: userId,
      platform: 'tiktok_ads' as const,
      account_id: 'tiktok_123',
      account_name: 'TikTok Test Account'
    };
    const tiktokResult = await connectAdAccount(tiktokInput);

    expect(metaResult.platform).toEqual('meta_ads');
    expect(tiktokResult.platform).toEqual('tiktok_ads');
    expect(metaResult.user_id).toEqual(userId);
    expect(tiktokResult.user_id).toEqual(userId);

    // Verify both connections exist in database
    const connections = await db.select()
      .from(adAccountConnectionsTable)
      .where(eq(adAccountConnectionsTable.user_id, userId))
      .execute();

    expect(connections).toHaveLength(2);
  });
});
