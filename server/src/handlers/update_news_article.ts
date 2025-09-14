import { db } from '../db';
import { newsArticlesTable } from '../db/schema';
import { type UpdateNewsArticleInput, type NewsArticle } from '../schema';
import { eq } from 'drizzle-orm';

export const updateNewsArticle = async (input: UpdateNewsArticleInput): Promise<NewsArticle> => {
  try {
    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date() // Always update the timestamp
    };

    // Only include fields that are actually provided
    if (input.title !== undefined) updateData['title'] = input.title;
    if (input.description !== undefined) updateData['description'] = input.description;
    if (input.content !== undefined) updateData['content'] = input.content;
    if (input.thumbnail_url !== undefined) updateData['thumbnail_url'] = input.thumbnail_url;
    if (input.author !== undefined) updateData['author'] = input.author;
    if (input.score !== undefined) updateData['score'] = input.score;
    if (input.comments_count !== undefined) updateData['comments_count'] = input.comments_count;
    if (input.is_featured !== undefined) updateData['is_featured'] = input.is_featured;
    if (input.category_id !== undefined) updateData['category_id'] = input.category_id;
    if (input.tags !== undefined) updateData['tags'] = JSON.stringify(input.tags);

    // Update the article
    const result = await db.update(newsArticlesTable)
      .set(updateData)
      .where(eq(newsArticlesTable.id, input.id))
      .returning()
      .execute();

    // Check if article was found and updated
    if (result.length === 0) {
      throw new Error(`News article with id ${input.id} not found`);
    }

    // Convert the result to match the expected NewsArticle type
    const article = result[0];
    return {
      ...article,
      tags: Array.isArray(article.tags) ? article.tags : JSON.parse(article.tags as string || '[]')
    };
  } catch (error) {
    console.error('News article update failed:', error);
    throw error;
  }
};