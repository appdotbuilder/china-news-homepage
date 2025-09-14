import { db } from '../db';
import { newsArticlesTable, categoriesTable } from '../db/schema';
import { type HomepageData, type PaginationInput } from '../schema';
import { eq, desc, count, and, SQL } from 'drizzle-orm';

export const getHomepageData = async (input?: PaginationInput): Promise<HomepageData> => {
  try {
    // Use defaults if input is not provided
    const { limit = 20, offset = 0, category_id, language, featured_only = false } = input || {};

    // Build featured articles conditions
    const featuredConditions: SQL<unknown>[] = [
      eq(newsArticlesTable.is_featured, true)
    ];

    if (language !== undefined) {
      featuredConditions.push(eq(newsArticlesTable.language, language));
    }

    // Fetch featured articles (for carousel)
    const featuredResults = await db.select()
      .from(newsArticlesTable)
      .where(featuredConditions.length === 1 ? featuredConditions[0] : and(...featuredConditions))
      .orderBy(desc(newsArticlesTable.published_at))
      .limit(10)
      .execute();

    // Build conditions for latest articles query
    const conditions: SQL<unknown>[] = [];
    
    if (category_id !== undefined) {
      conditions.push(eq(newsArticlesTable.category_id, category_id));
    }
    
    if (language !== undefined) {
      conditions.push(eq(newsArticlesTable.language, language));
    }
    
    if (featured_only) {
      conditions.push(eq(newsArticlesTable.is_featured, true));
    }

    // Fetch latest articles
    const latestResults = conditions.length > 0
      ? await db.select()
          .from(newsArticlesTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(newsArticlesTable.published_at))
          .limit(limit)
          .offset(offset)
          .execute()
      : await db.select()
          .from(newsArticlesTable)
          .orderBy(desc(newsArticlesTable.published_at))
          .limit(limit)
          .offset(offset)
          .execute();

    // Fetch all active categories
    const categoriesResults = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.is_active, true))
      .orderBy(categoriesTable.sort_order)
      .execute();

    // Get total count of articles (with same filters as latest articles, but excluding featured_only)
    const countConditions: SQL<unknown>[] = [];
    
    if (category_id !== undefined) {
      countConditions.push(eq(newsArticlesTable.category_id, category_id));
    }
    
    if (language !== undefined) {
      countConditions.push(eq(newsArticlesTable.language, language));
    }

    const totalCountResult = countConditions.length > 0
      ? await db.select({ count: count() })
          .from(newsArticlesTable)
          .where(countConditions.length === 1 ? countConditions[0] : and(...countConditions))
          .execute()
      : await db.select({ count: count() })
          .from(newsArticlesTable)
          .execute();

    const totalArticles = totalCountResult[0]?.count || 0;

    // Convert results to match schema types
    const featured_articles = featuredResults.map(article => ({
      ...article,
      tags: Array.isArray(article.tags) ? article.tags : [],
    }));

    const latest_articles = latestResults.map(article => ({
      ...article,
      tags: Array.isArray(article.tags) ? article.tags : [],
    }));

    return {
      featured_articles,
      latest_articles,
      categories: categoriesResults,
      total_articles: totalArticles,
    };
  } catch (error) {
    console.error('Get homepage data failed:', error);
    throw error;
  }
};