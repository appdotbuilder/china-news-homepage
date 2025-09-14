import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { newsArticlesTable, categoriesTable } from '../db/schema';
import { type UpdateNewsArticleInput } from '../schema';
import { updateNewsArticle } from '../handlers/update_news_article';
import { eq } from 'drizzle-orm';

describe('updateNewsArticle', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testArticleId: number;
  let testCategoryId: number;

  beforeEach(async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category',
        sort_order: 1,
        is_active: true
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    // Create a test news article
    const articleResult = await db.insert(newsArticlesTable)
      .values({
        title: 'Original Title',
        description: 'Original description',
        content: 'Original content',
        thumbnail_url: 'https://example.com/original-image.jpg',
        source_url: 'https://example.com/original',
        author: 'Original Author',
        source: 'Test Source',
        score: 10,
        comments_count: 5,
        published_at: new Date('2024-01-01'),
        is_featured: false,
        category_id: testCategoryId,
        language: 'en',
        tags: JSON.stringify(['original', 'test'])
      })
      .returning()
      .execute();
    testArticleId = articleResult[0].id;
  });

  it('should update basic article fields', async () => {
    const updateInput: UpdateNewsArticleInput = {
      id: testArticleId,
      title: 'Updated Title',
      description: 'Updated description',
      content: 'Updated content'
    };

    const result = await updateNewsArticle(updateInput);

    expect(result.id).toEqual(testArticleId);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Updated description');
    expect(result.content).toEqual('Updated content');
    expect(result.author).toEqual('Original Author'); // Should remain unchanged
    expect(result.source).toEqual('Test Source'); // Should remain unchanged
  });

  it('should update numeric fields correctly', async () => {
    const updateInput: UpdateNewsArticleInput = {
      id: testArticleId,
      score: 25,
      comments_count: 15
    };

    const result = await updateNewsArticle(updateInput);

    expect(result.score).toEqual(25);
    expect(result.comments_count).toEqual(15);
    expect(typeof result.score).toBe('number');
    expect(typeof result.comments_count).toBe('number');
  });

  it('should update boolean and category fields', async () => {
    const updateInput: UpdateNewsArticleInput = {
      id: testArticleId,
      is_featured: true,
      category_id: null
    };

    const result = await updateNewsArticle(updateInput);

    expect(result.is_featured).toBe(true);
    expect(result.category_id).toBeNull();
  });

  it('should update tags array correctly', async () => {
    const updateInput: UpdateNewsArticleInput = {
      id: testArticleId,
      tags: ['updated', 'new', 'tags']
    };

    const result = await updateNewsArticle(updateInput);

    expect(result.tags).toEqual(['updated', 'new', 'tags']);
    expect(Array.isArray(result.tags)).toBe(true);
  });

  it('should update nullable fields to null', async () => {
    const updateInput: UpdateNewsArticleInput = {
      id: testArticleId,
      description: null,
      thumbnail_url: null,
      author: null
    };

    const result = await updateNewsArticle(updateInput);

    expect(result.description).toBeNull();
    expect(result.thumbnail_url).toBeNull();
    expect(result.author).toBeNull();
  });

  it('should update updated_at timestamp automatically', async () => {
    const beforeUpdate = new Date();
    
    const updateInput: UpdateNewsArticleInput = {
      id: testArticleId,
      title: 'Updated Title'
    };

    const result = await updateNewsArticle(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });

  it('should persist changes to database', async () => {
    const updateInput: UpdateNewsArticleInput = {
      id: testArticleId,
      title: 'Database Test Title',
      score: 99,
      is_featured: true
    };

    await updateNewsArticle(updateInput);

    // Query directly from database to verify persistence
    const articles = await db.select()
      .from(newsArticlesTable)
      .where(eq(newsArticlesTable.id, testArticleId))
      .execute();

    expect(articles).toHaveLength(1);
    expect(articles[0].title).toEqual('Database Test Title');
    expect(articles[0].score).toEqual(99);
    expect(articles[0].is_featured).toBe(true);
  });

  it('should only update provided fields', async () => {
    const updateInput: UpdateNewsArticleInput = {
      id: testArticleId,
      title: 'Only Title Updated'
    };

    const result = await updateNewsArticle(updateInput);

    // These should remain unchanged
    expect(result.description).toEqual('Original description');
    expect(result.content).toEqual('Original content');
    expect(result.author).toEqual('Original Author');
    expect(result.score).toEqual(10);
    expect(result.comments_count).toEqual(5);
    expect(result.is_featured).toBe(false);
    
    // Only title and updated_at should change
    expect(result.title).toEqual('Only Title Updated');
  });

  it('should throw error when article not found', async () => {
    const updateInput: UpdateNewsArticleInput = {
      id: 99999, // Non-existent ID
      title: 'This Should Fail'
    };

    expect(updateNewsArticle(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle empty tags array', async () => {
    const updateInput: UpdateNewsArticleInput = {
      id: testArticleId,
      tags: []
    };

    const result = await updateNewsArticle(updateInput);

    expect(result.tags).toEqual([]);
    expect(Array.isArray(result.tags)).toBe(true);
  });

  it('should work with valid foreign key category_id', async () => {
    // Create another category
    const newCategoryResult = await db.insert(categoriesTable)
      .values({
        name: 'New Category',
        slug: 'new-category',
        sort_order: 2,
        is_active: true
      })
      .returning()
      .execute();

    const updateInput: UpdateNewsArticleInput = {
      id: testArticleId,
      category_id: newCategoryResult[0].id
    };

    const result = await updateNewsArticle(updateInput);

    expect(result.category_id).toEqual(newCategoryResult[0].id);
  });
});