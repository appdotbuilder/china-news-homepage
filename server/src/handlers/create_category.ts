import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput, type Category } from '../schema';

export const createCategory = async (input: CreateCategoryInput): Promise<Category> => {
  try {
    // Insert category record
    const result = await db.insert(categoriesTable)
      .values({
        name: input.name,
        name_zh: input.name_zh,
        slug: input.slug,
        description: input.description,
        icon_name: input.icon_name,
        sort_order: input.sort_order,
        is_active: input.is_active
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Category creation failed:', error);
    throw error;
  }
};