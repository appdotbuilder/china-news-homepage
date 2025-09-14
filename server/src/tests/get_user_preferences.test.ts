import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { userPreferencesTable } from '../db/schema';
import { getUserPreferences } from '../handlers/get_user_preferences';
import { eq } from 'drizzle-orm';

describe('getUserPreferences', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return existing user preferences from database', async () => {
    // Create a user preferences record
    const testUserId = 'test-user-123';
    await db.insert(userPreferencesTable)
      .values({
        user_id: testUserId,
        theme: 'dark',
        language: 'en',
        categories_order: [3, 1, 2],
      })
      .execute();

    const result = await getUserPreferences(testUserId);

    expect(result.user_id).toEqual(testUserId);
    expect(result.theme).toEqual('dark');
    expect(result.language).toEqual('en');
    expect(result.categories_order).toEqual([3, 1, 2]);
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should return default preferences for new user', async () => {
    const newUserId = 'new-user-456';

    const result = await getUserPreferences(newUserId);

    expect(result.user_id).toEqual(newUserId);
    expect(result.theme).toEqual('system');
    expect(result.language).toEqual('zh');
    expect(result.categories_order).toEqual([]);
    expect(result.id).toEqual(0); // No database record
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle empty categories_order correctly', async () => {
    const testUserId = 'test-user-empty-categories';
    await db.insert(userPreferencesTable)
      .values({
        user_id: testUserId,
        theme: 'light',
        language: 'zh',
        categories_order: [],
      })
      .execute();

    const result = await getUserPreferences(testUserId);

    expect(result.user_id).toEqual(testUserId);
    expect(result.theme).toEqual('light');
    expect(result.language).toEqual('zh');
    expect(result.categories_order).toEqual([]);
    expect(Array.isArray(result.categories_order)).toBe(true);
  });

  it('should handle complex categories_order array', async () => {
    const testUserId = 'test-user-complex-order';
    const complexOrder = [5, 2, 8, 1, 3, 10];
    
    await db.insert(userPreferencesTable)
      .values({
        user_id: testUserId,
        theme: 'system',
        language: 'en',
        categories_order: complexOrder,
      })
      .execute();

    const result = await getUserPreferences(testUserId);

    expect(result.categories_order).toEqual(complexOrder);
    expect(result.categories_order).toHaveLength(6);
    expect(typeof result.categories_order[0]).toBe('number');
  });

  it('should verify database record exists after insertion', async () => {
    const testUserId = 'verification-user';
    
    // Insert preferences
    await db.insert(userPreferencesTable)
      .values({
        user_id: testUserId,
        theme: 'dark',
        language: 'zh',
        categories_order: [1, 2, 3],
      })
      .execute();

    // Verify via handler
    const result = await getUserPreferences(testUserId);
    
    // Verify in database directly
    const dbRecord = await db.select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.user_id, testUserId))
      .execute();

    expect(dbRecord).toHaveLength(1);
    expect(dbRecord[0].user_id).toEqual(testUserId);
    expect(dbRecord[0].theme).toEqual('dark');
    expect(dbRecord[0].language).toEqual('zh');
    expect(dbRecord[0].categories_order).toEqual([1, 2, 3]);

    // Handler result should match database
    expect(result.id).toEqual(dbRecord[0].id);
    expect(result.theme).toEqual(dbRecord[0].theme);
    expect(result.language).toEqual(dbRecord[0].language);
  });

  it('should handle different user IDs independently', async () => {
    const user1 = 'user-1';
    const user2 = 'user-2';

    // Create preferences for user 1
    await db.insert(userPreferencesTable)
      .values({
        user_id: user1,
        theme: 'dark',
        language: 'en',
        categories_order: [1, 2],
      })
      .execute();

    // Create preferences for user 2
    await db.insert(userPreferencesTable)
      .values({
        user_id: user2,
        theme: 'light',
        language: 'zh',
        categories_order: [3, 4],
      })
      .execute();

    // Verify user 1 preferences
    const result1 = await getUserPreferences(user1);
    expect(result1.user_id).toEqual(user1);
    expect(result1.theme).toEqual('dark');
    expect(result1.language).toEqual('en');
    expect(result1.categories_order).toEqual([1, 2]);

    // Verify user 2 preferences
    const result2 = await getUserPreferences(user2);
    expect(result2.user_id).toEqual(user2);
    expect(result2.theme).toEqual('light');
    expect(result2.language).toEqual('zh');
    expect(result2.categories_order).toEqual([3, 4]);

    // Verify user 3 gets defaults
    const result3 = await getUserPreferences('user-3');
    expect(result3.user_id).toEqual('user-3');
    expect(result3.theme).toEqual('system');
    expect(result3.language).toEqual('zh');
    expect(result3.categories_order).toEqual([]);
    expect(result3.id).toEqual(0);
  });
});