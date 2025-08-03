
import { db } from '../db';
import { adAccountConnectionsTable } from '../db/schema';
import { type UpdateConnectionStatusInput, type AdAccountConnection } from '../schema';
import { eq } from 'drizzle-orm';

export const updateConnectionStatus = async (input: UpdateConnectionStatusInput): Promise<AdAccountConnection> => {
  try {
    // Build update values
    const updateValues: any = {
      status: input.status,
      updated_at: new Date()
    };

    // Add last_sync_at if provided
    if (input.last_sync_at !== undefined) {
      updateValues.last_sync_at = input.last_sync_at;
    }

    // Update connection status
    const result = await db.update(adAccountConnectionsTable)
      .set(updateValues)
      .where(eq(adAccountConnectionsTable.id, input.connection_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Ad account connection with id ${input.connection_id} not found`);
    }

    // Convert numeric fields back to numbers
    const connection = result[0];
    return {
      ...connection,
      // No numeric fields to convert in this table
    };
  } catch (error) {
    console.error('Connection status update failed:', error);
    throw error;
  }
};
