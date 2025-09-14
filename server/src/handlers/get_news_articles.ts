import { db } from '../db';
import { newsArticlesTable } from '../db/schema';
import { type NewsArticle, type PaginationInput } from '../schema';
import { eq, desc, and, type SQL } from 'drizzle-orm';

export const getNewsArticles = async (input: PaginationInput): Promise<NewsArticle[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Filter by category if provided
    if (input.category_id !== undefined) {
      conditions.push(eq(newsArticlesTable.category_id, input.category_id));
    }

    // Filter by language if provided
    if (input.language !== undefined) {
      conditions.push(eq(newsArticlesTable.language, input.language));
    }

    // Filter for featured articles only if requested
    if (input.featured_only) {
      conditions.push(eq(newsArticlesTable.is_featured, true));
    }

    // Build the query based on whether we have conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(newsArticlesTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(newsArticlesTable.published_at))
          .limit(input.limit)
          .offset(input.offset)
          .execute()
      : await db.select()
          .from(newsArticlesTable)
          .orderBy(desc(newsArticlesTable.published_at))
          .limit(input.limit)
          .offset(input.offset)
          .execute();

    // Convert the results to match the NewsArticle schema
    // Handle JSONB tags field and ensure proper types
    return results.map(article => ({
      ...article,
      tags: Array.isArray(article.tags) ? article.tags as string[] : [],
      published_at: article.published_at,
      created_at: article.created_at,
      updated_at: article.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch news articles:', error);
    throw error;
  }
};