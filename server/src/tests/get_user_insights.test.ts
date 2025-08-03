
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, aiInsightsTable } from '../db/schema';
import { getUserInsights } from '../handlers/get_user_insights';

describe('getUserInsights', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch insights for a user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test insights
    await db.insert(aiInsightsTable)
      .values([
        {
          user_id: userId,
          insight_type: 'key_metrics',
          title: 'Campaign Performance Analysis',
          content: 'Your campaigns are performing well',
          recommendations: 'Continue current strategy',
          confidence_score: 0.85,
          platform: 'meta_ads',
          objective: 'conversion'
        },
        {
          user_id: userId,
          insight_type: 'optimization_strategy',
          title: 'Budget Optimization',
          content: 'Consider reallocating budget',
          recommendations: 'Move budget to high-performing campaigns',
          confidence_score: 0.92,
          platform: 'google_ads',
          objective: 'traffic'
        }
      ])
      .execute();

    const results = await getUserInsights(userId);

    expect(results).toHaveLength(2);
    expect(results[0].user_id).toEqual(userId);
    expect(results[0].title).toEqual('Budget Optimization'); // Higher confidence score, so first
    expect(results[0].confidence_score).toEqual(0.92);
    expect(typeof results[0].confidence_score).toBe('number');
    expect(results[1].title).toEqual('Campaign Performance Analysis');
    expect(results[1].confidence_score).toEqual(0.85);
  });

  it('should return empty array for user with no insights', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const results = await getUserInsights(userId);

    expect(results).toHaveLength(0);
  });

  it('should respect limit parameter', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create 5 test insights
    const insights = Array.from({ length: 5 }, (_, i) => ({
      user_id: userId,
      insight_type: 'key_metrics' as const,
      title: `Insight ${i + 1}`,
      content: `Content ${i + 1}`,
      recommendations: `Recommendations ${i + 1}`,
      confidence_score: 0.5 + (i * 0.1),
      platform: 'meta_ads' as const,
      objective: 'conversion' as const
    }));

    await db.insert(aiInsightsTable)
      .values(insights)
      .execute();

    const results = await getUserInsights(userId, 3);

    expect(results).toHaveLength(3);
    // Should be ordered by confidence score descending
    expect(results[0].confidence_score).toEqual(0.9);
    expect(results[1].confidence_score).toEqual(0.8);
    expect(results[2].confidence_score).toEqual(0.7);
  });

  it('should order by creation date and confidence score', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create insights with different timestamps and confidence scores
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier

    // Insert older insight first
    await db.insert(aiInsightsTable)
      .values({
        user_id: userId,
        insight_type: 'key_metrics',
        title: 'Older Insight',
        content: 'Older content',
        recommendations: 'Older recommendations',
        confidence_score: 0.7,
        platform: 'meta_ads',
        objective: 'conversion',
        created_at: earlier
      })
      .execute();

    // Insert newer insight
    await db.insert(aiInsightsTable)
      .values({
        user_id: userId,
        insight_type: 'optimization_strategy',
        title: 'Newer Insight',
        content: 'Newer content',
        recommendations: 'Newer recommendations',
        confidence_score: 0.6,
        platform: 'google_ads',
        objective: 'traffic',
        created_at: now
      })
      .execute();

    const results = await getUserInsights(userId);

    expect(results).toHaveLength(2);
    // Newer insight should come first (created_at DESC takes precedence)
    expect(results[0].title).toEqual('Newer Insight');
    expect(results[1].title).toEqual('Older Insight');
  });

  it('should only return insights for specified user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        name: 'User 1',
        company_name: 'Company 1'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        name: 'User 2',
        company_name: 'Company 2'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create insights for both users
    await db.insert(aiInsightsTable)
      .values([
        {
          user_id: user1Id,
          insight_type: 'key_metrics',
          title: 'User 1 Insight',
          content: 'Content for user 1',
          recommendations: 'Recommendations for user 1',
          confidence_score: 0.8,
          platform: 'meta_ads',
          objective: 'conversion'
        },
        {
          user_id: user2Id,
          insight_type: 'optimization_strategy',
          title: 'User 2 Insight',
          content: 'Content for user 2',
          recommendations: 'Recommendations for user 2',
          confidence_score: 0.9,
          platform: 'google_ads',
          objective: 'traffic'
        }
      ])
      .execute();

    const user1Results = await getUserInsights(user1Id);
    const user2Results = await getUserInsights(user2Id);

    expect(user1Results).toHaveLength(1);
    expect(user1Results[0].title).toEqual('User 1 Insight');
    expect(user1Results[0].user_id).toEqual(user1Id);

    expect(user2Results).toHaveLength(1);
    expect(user2Results[0].title).toEqual('User 2 Insight');
    expect(user2Results[0].user_id).toEqual(user2Id);
  });
});
