
import { db } from '../db';
import { aiInsightsTable } from '../db/schema';
import { type AiInsight } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserInsights(userId: number, limit: number = 10): Promise<AiInsight[]> {
  try {
    const results = await db.select()
      .from(aiInsightsTable)
      .where(eq(aiInsightsTable.user_id, userId))
      .orderBy(desc(aiInsightsTable.created_at), desc(aiInsightsTable.confidence_score))
      .limit(limit)
      .execute();

    // Convert fields to match schema types
    return results.map(insight => ({
      ...insight,
      confidence_score: typeof insight.confidence_score === 'number' 
        ? insight.confidence_score 
        : parseFloat(insight.confidence_score as string),
      metadata: insight.metadata as Record<string, any> | null
    }));
  } catch (error) {
    console.error('Failed to fetch user insights:', error);
    throw error;
  }
}
