
import { db } from '../db';
import { adAccountConnectionsTable, usersTable } from '../db/schema';
import { type CreateAdAccountConnectionInput, type AdAccountConnection } from '../schema';
import { eq } from 'drizzle-orm';

export const connectAdAccount = async (input: CreateAdAccountConnectionInput): Promise<AdAccountConnection> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    // Insert ad account connection
    const result = await db.insert(adAccountConnectionsTable)
      .values({
        user_id: input.user_id,
        platform: input.platform,
        account_id: input.account_id,
        account_name: input.account_name,
        access_token: input.access_token,
        refresh_token: input.refresh_token
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Ad account connection failed:', error);
    throw error;
  }
};
