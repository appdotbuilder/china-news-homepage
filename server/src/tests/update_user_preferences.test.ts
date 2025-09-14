import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { userPreferencesTable } from '../db/schema';
import { type UpdateUserPreferencesInput } from '../schema';
import { updateUserPreferences } from '../handlers/update_user_preferences';
import { eq } from 'drizzle-orm';

// Test input for creating new preferences
const newUserInput: UpdateUserPreferencesInput = {
  user_id: 'new-user-123',
  theme: 'dark',
  language: 'en',
  categories_order: [1, 3, 2],
};

// Test input for updating existing preferences
const updateUserInput: UpdateUserPreferencesInput = {
  user_id: 'existing-user-456',
  theme: 'light',
};

// Test input for partial updates
const partialUpdateInput: UpdateUserPreferencesInput = {
  user_id: 'existing-user-456',
  categories_order: [5, 4, 3, 2, 1],
};

describe('updateUserPreferences', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create new user preferences when user does not exist', async () => {
    const result = await updateUserPreferences(newUserInput);

    // Verify returned data
    expect(result.user_id).toEqual('new-user-123');
    expect(result.theme).toEqual('dark');
    expect(result.language).toEqual('en');
    expect(result.categories_order).toEqual([1, 3, 2]);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save new preferences to database', async () => {
    const result = await updateUserPreferences(newUserInput);

    // Query database to verify data was saved
    const preferences = await db.select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.user_id, 'new-user-123'))
      .execute();

    expect(preferences).toHaveLength(1);
    expect(preferences[0].user_id).toEqual('new-user-123');
    expect(preferences[0].theme).toEqual('dark');
    expect(preferences[0].language).toEqual('en');
    expect(preferences[0].created_at).toBeInstanceOf(Date);
    expect(preferences[0].updated_at).toBeInstanceOf(Date);

    // Verify JSONB array is stored correctly
    const parsedCategoriesOrder = Array.isArray(preferences[0].categories_order)
      ? preferences[0].categories_order
      : JSON.parse(preferences[0].categories_order as string);
    expect(parsedCategoriesOrder).toEqual([1, 3, 2]);
  });

  it('should update existing user preferences', async () => {
    // First, create an existing user preference
    await db.insert(userPreferencesTable)
      .values({
        user_id: 'existing-user-456',
        theme: 'system',
        language: 'zh',
        categories_order: JSON.stringify([1, 2, 3]),
      })
      .execute();

    // Now update only the theme
    const result = await updateUserPreferences(updateUserInput);

    expect(result.user_id).toEqual('existing-user-456');
    expect(result.theme).toEqual('light'); // Updated
    expect(result.language).toEqual('zh'); // Unchanged
    expect(result.categories_order).toEqual([1, 2, 3]); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should perform partial updates without affecting other fields', async () => {
    // Create initial preferences
    await db.insert(userPreferencesTable)
      .values({
        user_id: 'existing-user-456',
        theme: 'dark',
        language: 'en',
        categories_order: JSON.stringify([1, 2]),
      })
      .execute();

    // Update only categories_order
    const result = await updateUserPreferences(partialUpdateInput);

    expect(result.user_id).toEqual('existing-user-456');
    expect(result.theme).toEqual('dark'); // Unchanged
    expect(result.language).toEqual('en'); // Unchanged
    expect(result.categories_order).toEqual([5, 4, 3, 2, 1]); // Updated
  });

  it('should update the updated_at timestamp on updates', async () => {
    // Create initial preferences
    const initialTime = new Date('2024-01-01T00:00:00Z');
    await db.insert(userPreferencesTable)
      .values({
        user_id: 'timestamp-user',
        theme: 'system',
        language: 'zh',
        categories_order: JSON.stringify([]),
        created_at: initialTime,
        updated_at: initialTime,
      })
      .execute();

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update preferences
    const result = await updateUserPreferences({
      user_id: 'timestamp-user',
      theme: 'light',
    });

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(initialTime.getTime());
    expect(result.created_at).toEqual(initialTime); // Created timestamp should remain unchanged
  });

  it('should handle empty categories_order array', async () => {
    const result = await updateUserPreferences({
      user_id: 'empty-categories-user',
      categories_order: [],
    });

    expect(result.categories_order).toEqual([]);

    // Verify in database
    const preferences = await db.select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.user_id, 'empty-categories-user'))
      .execute();

    const parsedCategoriesOrder = Array.isArray(preferences[0].categories_order)
      ? preferences[0].categories_order
      : JSON.parse(preferences[0].categories_order as string);
    expect(parsedCategoriesOrder).toEqual([]);
  });

  it('should apply default values when creating new preferences with minimal input', async () => {
    const result = await updateUserPreferences({
      user_id: 'minimal-user',
    });

    // Should use default values
    expect(result.theme).toEqual('system');
    expect(result.language).toEqual('zh');
    expect(result.categories_order).toEqual([]);
  });

  it('should handle large categories_order arrays', async () => {
    const largeCategoriesOrder = Array.from({ length: 50 }, (_, i) => i + 1);
    
    const result = await updateUserPreferences({
      user_id: 'large-array-user',
      categories_order: largeCategoriesOrder,
    });

    expect(result.categories_order).toEqual(largeCategoriesOrder);
    expect(result.categories_order).toHaveLength(50);
  });
});