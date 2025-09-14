import { db } from '../db';
import { userPreferencesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UserPreferences } from '../schema';

export const getUserPreferences = async (userId: string): Promise<UserPreferences> => {
  try {
    // Find existing preferences by user_id
    const result = await db.select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.user_id, userId))
      .execute();

    if (result.length > 0) {
      // Return existing preferences
      const preferences = result[0];
      return {
        ...preferences,
        categories_order: preferences.categories_order as number[], // Parse JSONB to number array
      };
    }

    // Return default preferences for first-time visitors
    return {
      id: 0, // No database record yet
      user_id: userId,
      theme: 'system',
      language: 'zh',
      categories_order: [],
      created_at: new Date(),
      updated_at: new Date(),
    };
  } catch (error) {
    console.error('Failed to get user preferences:', error);
    throw error;
  }
};