import { db } from '../db';
import { newsArticlesTable } from '../db/schema';
import { type NewsArticle, type SearchQuery } from '../schema';
import { and, eq, ilike, or, desc, sql, type SQL } from 'drizzle-orm';

export const searchArticles = async (input: SearchQuery): Promise<NewsArticle[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Full-text search across title, description, content, and tags
    // Using ILIKE for case-insensitive search that works with both Chinese and English
    const searchPattern = `%${input.query}%`;
    
    // Create search conditions for each field
    const searchConditions: SQL<unknown>[] = [];
    
    // Search in title (always present)
    searchConditions.push(ilike(newsArticlesTable.title, searchPattern));
    
    // Search in description (nullable)
    searchConditions.push(ilike(newsArticlesTable.description, searchPattern));
    
    // Search in content (nullable)  
    searchConditions.push(ilike(newsArticlesTable.content, searchPattern));
    
    // Search in tags (JSON field)
    searchConditions.push(
      sql`${newsArticlesTable.tags}::text ILIKE ${searchPattern}`
    );
    
    const searchCondition = or(...searchConditions);
    if (searchCondition) {
      conditions.push(searchCondition);
    }

    // Filter by category if provided
    if (input.category_id !== undefined) {
      conditions.push(eq(newsArticlesTable.category_id, input.category_id));
    }

    // Filter by language if provided
    if (input.language !== undefined) {
      conditions.push(eq(newsArticlesTable.language, input.language));
    }

    // Execute query with conditions
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    
    const results = await db.select()
      .from(newsArticlesTable)
      .where(whereClause)
      .orderBy(desc(newsArticlesTable.published_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Convert tags from JSON to array and ensure proper typing
    return results.map(article => ({
      ...article,
      tags: Array.isArray(article.tags) ? article.tags : []
    }));
  } catch (error) {
    console.error('Article search failed:', error);
    throw error;
  }
};