import { db } from '../db';
import { userPreferencesTable } from '../db/schema';
import { type UpdateUserPreferencesInput, type UserPreferences } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const updateUserPreferences = async (input: UpdateUserPreferencesInput): Promise<UserPreferences> => {
  try {
    // Perform upsert operation using PostgreSQL's ON CONFLICT clause
    const updateFields: any = {
      user_id: input.user_id,
      updated_at: new Date(),
    };

    // Only include fields that were provided in the input
    if (input.theme !== undefined) {
      updateFields.theme = input.theme;
    }
    if (input.language !== undefined) {
      updateFields.language = input.language;
    }
    if (input.categories_order !== undefined) {
      updateFields.categories_order = JSON.stringify(input.categories_order);
    }

    // Create insert fields with defaults for new records
    const insertFields = {
      ...updateFields,
      theme: input.theme || 'system',
      language: input.language || 'zh',
      categories_order: JSON.stringify(input.categories_order || []),
    };

    const result = await db.insert(userPreferencesTable)
      .values(insertFields)
      .onConflictDoUpdate({
        target: userPreferencesTable.user_id,
        set: updateFields,
      })
      .returning()
      .execute();

    const preferences = result[0];
    
    // Convert JSONB fields back to arrays
    return {
      ...preferences,
      categories_order: Array.isArray(preferences.categories_order) 
        ? preferences.categories_order 
        : JSON.parse(preferences.categories_order as string),
    };
  } catch (error) {
    console.error('User preferences update failed:', error);
    throw error;
  }
};