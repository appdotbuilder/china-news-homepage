import { db } from '../db';
import { newsArticlesTable } from '../db/schema';
import { type CreateNewsArticleInput, type NewsArticle } from '../schema';

export const createNewsArticle = async (input: CreateNewsArticleInput): Promise<NewsArticle> => {
  try {
    // Insert news article record
    const result = await db.insert(newsArticlesTable)
      .values({
        title: input.title,
        description: input.description,
        content: input.content,
        thumbnail_url: input.thumbnail_url,
        source_url: input.source_url,
        author: input.author,
        source: input.source,
        score: input.score,
        comments_count: input.comments_count,
        published_at: input.published_at,
        is_featured: input.is_featured,
        category_id: input.category_id,
        language: input.language,
        tags: input.tags
      })
      .returning()
      .execute();

    // Return the created article - tags are already in correct format (JSON array)
    const article = result[0];
    return {
      ...article,
      tags: Array.isArray(article.tags) ? article.tags : [] // Ensure tags is always an array
    };
  } catch (error) {
    console.error('News article creation failed:', error);
    throw error;
  }
};