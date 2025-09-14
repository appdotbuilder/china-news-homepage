import { db } from '../db';
import { newsArticlesTable } from '../db/schema';
import { type NewsArticle } from '../schema';
import { eq, and, desc, type SQL } from 'drizzle-orm';

export const getFeaturedArticles = async (limit: number = 5, language?: 'zh' | 'en'): Promise<NewsArticle[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter for featured articles
    conditions.push(eq(newsArticlesTable.is_featured, true));
    
    // Add language filter if provided
    if (language) {
      conditions.push(eq(newsArticlesTable.language, language));
    }

    // Build the complete query
    const results = await db.select()
      .from(newsArticlesTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(newsArticlesTable.score), desc(newsArticlesTable.published_at))
      .limit(limit)
      .execute();

    // Return results with proper type structure
    return results.map(article => ({
      ...article,
      tags: Array.isArray(article.tags) ? article.tags : []
    }));
  } catch (error) {
    console.error('Featured articles retrieval failed:', error);
    throw error;
  }
};