import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type Category } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getCategories = async (activeOnly: boolean = true): Promise<Category[]> => {
  try {
    // Build query with conditional filtering
    const baseQuery = db.select().from(categoriesTable).orderBy(asc(categoriesTable.sort_order));
    
    const results = activeOnly 
      ? await baseQuery.where(eq(categoriesTable.is_active, true)).execute()
      : await baseQuery.execute();
    
    return results;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
};