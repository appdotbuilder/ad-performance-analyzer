
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, adAccountConnectionsTable } from '../db/schema';
import { getUserConnections } from '../handlers/get_user_connections';

describe('getUserConnections', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no connections', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getUserConnections(userId);

    expect(result).toEqual([]);
  });

  it('should return user connections when they exist', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create connections for the user
    await db.insert(adAccountConnectionsTable)
      .values([
        {
          user_id: userId,
          platform: 'meta_ads',
          account_id: 'meta_123',
          account_name: 'Meta Ad Account',
          access_token: 'token_123',
          refresh_token: 'refresh_123',
          status: 'connected'
        },
        {
          user_id: userId,
          platform: 'google_ads',
          account_id: 'google_456',
          account_name: 'Google Ad Account',
          access_token: 'token_456',
          refresh_token: null,
          status: 'pending'
        }
      ])
      .execute();

    const result = await getUserConnections(userId);

    expect(result).toHaveLength(2);
    
    // Check first connection
    const metaConnection = result.find(c => c.platform === 'meta_ads');
    expect(metaConnection).toBeDefined();
    expect(metaConnection!.user_id).toEqual(userId);
    expect(metaConnection!.account_id).toEqual('meta_123');
    expect(metaConnection!.account_name).toEqual('Meta Ad Account');
    expect(metaConnection!.access_token).toEqual('token_123');
    expect(metaConnection!.refresh_token).toEqual('refresh_123');
    expect(metaConnection!.status).toEqual('connected');
    expect(metaConnection!.id).toBeDefined();
    expect(metaConnection!.created_at).toBeInstanceOf(Date);
    expect(metaConnection!.updated_at).toBeInstanceOf(Date);

    // Check second connection
    const googleConnection = result.find(c => c.platform === 'google_ads');
    expect(googleConnection).toBeDefined();
    expect(googleConnection!.user_id).toEqual(userId);
    expect(googleConnection!.account_id).toEqual('google_456');
    expect(googleConnection!.account_name).toEqual('Google Ad Account');
    expect(googleConnection!.status).toEqual('pending');
    expect(googleConnection!.refresh_token).toBeNull();
  });

  it('should only return connections for the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        name: 'User One',
        company_name: 'Company One'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        name: 'User Two',
        company_name: 'Company Two'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create connections for both users
    await db.insert(adAccountConnectionsTable)
      .values([
        {
          user_id: user1Id,
          platform: 'meta_ads',
          account_id: 'user1_meta',
          account_name: 'User 1 Meta Account',
          access_token: 'token_user1',
          refresh_token: null,
          status: 'connected'
        },
        {
          user_id: user2Id,
          platform: 'google_ads',
          account_id: 'user2_google',
          account_name: 'User 2 Google Account',
          access_token: 'token_user2',
          refresh_token: null,
          status: 'connected'
        }
      ])
      .execute();

    // Get connections for user 1
    const user1Connections = await getUserConnections(user1Id);

    expect(user1Connections).toHaveLength(1);
    expect(user1Connections[0].user_id).toEqual(user1Id);
    expect(user1Connections[0].platform).toEqual('meta_ads');
    expect(user1Connections[0].account_id).toEqual('user1_meta');

    // Get connections for user 2
    const user2Connections = await getUserConnections(user2Id);

    expect(user2Connections).toHaveLength(1);
    expect(user2Connections[0].user_id).toEqual(user2Id);
    expect(user2Connections[0].platform).toEqual('google_ads');
    expect(user2Connections[0].account_id).toEqual('user2_google');
  });

  it('should handle non-existent user gracefully', async () => {
    const result = await getUserConnections(999);

    expect(result).toEqual([]);
  });
});
