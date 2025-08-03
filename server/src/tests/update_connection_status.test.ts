
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, adAccountConnectionsTable } from '../db/schema';
import { type UpdateConnectionStatusInput } from '../schema';
import { updateConnectionStatus } from '../handlers/update_connection_status';
import { eq } from 'drizzle-orm';

describe('updateConnectionStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testConnectionId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        company_name: 'Test Company'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test connection
    const connectionResult = await db.insert(adAccountConnectionsTable)
      .values({
        user_id: testUserId,
        platform: 'meta_ads',
        account_id: 'test_account_123',
        account_name: 'Test Account',
        access_token: 'test_token',
        refresh_token: 'test_refresh_token',
        status: 'pending'
      })
      .returning()
      .execute();
    testConnectionId = connectionResult[0].id;
  });

  it('should update connection status', async () => {
    const input: UpdateConnectionStatusInput = {
      connection_id: testConnectionId,
      status: 'connected'
    };

    const result = await updateConnectionStatus(input);

    expect(result.id).toEqual(testConnectionId);
    expect(result.status).toEqual('connected');
    expect(result.user_id).toEqual(testUserId);
    expect(result.platform).toEqual('meta_ads');
    expect(result.account_id).toEqual('test_account_123');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update connection status with last_sync_at', async () => {
    const syncTime = new Date('2024-01-15T10:30:00Z');
    const input: UpdateConnectionStatusInput = {
      connection_id: testConnectionId,
      status: 'connected',
      last_sync_at: syncTime
    };

    const result = await updateConnectionStatus(input);

    expect(result.status).toEqual('connected');
    expect(result.last_sync_at).toEqual(syncTime);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated status to database', async () => {
    const input: UpdateConnectionStatusInput = {
      connection_id: testConnectionId,
      status: 'error'
    };

    await updateConnectionStatus(input);

    // Verify database was updated
    const connections = await db.select()
      .from(adAccountConnectionsTable)
      .where(eq(adAccountConnectionsTable.id, testConnectionId))
      .execute();

    expect(connections).toHaveLength(1);
    expect(connections[0].status).toEqual('error');
    expect(connections[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle disconnected status', async () => {
    const input: UpdateConnectionStatusInput = {
      connection_id: testConnectionId,
      status: 'disconnected'
    };

    const result = await updateConnectionStatus(input);

    expect(result.status).toEqual('disconnected');
    expect(result.id).toEqual(testConnectionId);
  });

  it('should throw error for non-existent connection', async () => {
    const input: UpdateConnectionStatusInput = {
      connection_id: 99999,
      status: 'connected'
    };

    await expect(updateConnectionStatus(input)).rejects.toThrow(/not found/i);
  });

  it('should preserve existing data when updating status', async () => {
    const input: UpdateConnectionStatusInput = {
      connection_id: testConnectionId,
      status: 'connected'
    };

    const result = await updateConnectionStatus(input);

    // Verify all original data is preserved
    expect(result.user_id).toEqual(testUserId);
    expect(result.platform).toEqual('meta_ads');
    expect(result.account_id).toEqual('test_account_123');
    expect(result.account_name).toEqual('Test Account');
    expect(result.access_token).toEqual('test_token');
    expect(result.refresh_token).toEqual('test_refresh_token');
    expect(result.created_at).toBeInstanceOf(Date);
  });
});
