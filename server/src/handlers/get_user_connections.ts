
import { db } from '../db';
import { adAccountConnectionsTable } from '../db/schema';
import { type AdAccountConnection } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUserConnections(userId: number): Promise<AdAccountConnection[]> {
  try {
    const results = await db.select()
      .from(adAccountConnectionsTable)
      .where(eq(adAccountConnectionsTable.user_id, userId))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(connection => ({
      ...connection,
      // No numeric conversions needed - all fields are already in correct types
    }));
  } catch (error) {
    console.error('Failed to fetch user connections:', error);
    throw error;
  }
}
