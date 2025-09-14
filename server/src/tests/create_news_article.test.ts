import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { newsArticlesTable, categoriesTable } from '../db/schema';
import { type CreateNewsArticleInput } from '../schema';
import { createNewsArticle } from '../handlers/create_news_article';
import { eq } from 'drizzle-orm';

// Test inputs
const basicTestInput: CreateNewsArticleInput = {
  title: 'Breaking Tech News',
  description: 'A comprehensive look at the latest technology trends',
  content: 'This is the full article content with detailed information about recent tech developments.',
  thumbnail_url: 'https://example.com/thumbnail.jpg',
  source_url: 'https://example.com/article',
  author: 'John Doe',
  source: 'Tech Daily',
  score: 150,
  comments_count: 25,
  published_at: new Date('2024-01-15T10:00:00Z'),
  is_featured: true,
  category_id: null,
  language: 'en',
  tags: ['technology', 'breaking', 'innovation']
};

const minimalTestInput: CreateNewsArticleInput = {
  title: 'Minimal News Article',
  description: null,
  content: null,
  thumbnail_url: null,
  source_url: 'https://minimal.com/article',
  author: null,
  source: 'Minimal News',
  score: 0,
  comments_count: 0,
  published_at: new Date('2024-01-16T12:00:00Z'),
  is_featured: false,
  category_id: null,
  language: 'zh',
  tags: []
};

describe('createNewsArticle', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a news article with all fields', async () => {
    const result = await createNewsArticle(basicTestInput);

    // Basic field validation
    expect(result.title).toEqual('Breaking Tech News');
    expect(result.description).toEqual('A comprehensive look at the latest technology trends');
    expect(result.content).toEqual('This is the full article content with detailed information about recent tech developments.');
    expect(result.thumbnail_url).toEqual('https://example.com/thumbnail.jpg');
    expect(result.source_url).toEqual('https://example.com/article');
    expect(result.author).toEqual('John Doe');
    expect(result.source).toEqual('Tech Daily');
    expect(result.score).toEqual(150);
    expect(result.comments_count).toEqual(25);
    expect(result.published_at).toEqual(new Date('2024-01-15T10:00:00Z'));
    expect(result.is_featured).toEqual(true);
    expect(result.category_id).toBeNull();
    expect(result.language).toEqual('en');
    expect(result.tags).toEqual(['technology', 'breaking', 'innovation']);
    
    // Auto-generated fields
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a news article with minimal fields (nulls and defaults)', async () => {
    const result = await createNewsArticle(minimalTestInput);

    // Field validation for minimal input
    expect(result.title).toEqual('Minimal News Article');
    expect(result.description).toBeNull();
    expect(result.content).toBeNull();
    expect(result.thumbnail_url).toBeNull();
    expect(result.source_url).toEqual('https://minimal.com/article');
    expect(result.author).toBeNull();
    expect(result.source).toEqual('Minimal News');
    expect(result.score).toEqual(0);
    expect(result.comments_count).toEqual(0);
    expect(result.published_at).toEqual(new Date('2024-01-16T12:00:00Z'));
    expect(result.is_featured).toEqual(false);
    expect(result.category_id).toBeNull();
    expect(result.language).toEqual('zh');
    expect(result.tags).toEqual([]);
    
    // Auto-generated fields
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save news article to database', async () => {
    const result = await createNewsArticle(basicTestInput);

    // Query the database to verify the article was saved
    const articles = await db.select()
      .from(newsArticlesTable)
      .where(eq(newsArticlesTable.id, result.id))
      .execute();

    expect(articles).toHaveLength(1);
    const savedArticle = articles[0];
    
    expect(savedArticle.title).toEqual('Breaking Tech News');
    expect(savedArticle.description).toEqual('A comprehensive look at the latest technology trends');
    expect(savedArticle.source).toEqual('Tech Daily');
    expect(savedArticle.score).toEqual(150);
    expect(savedArticle.is_featured).toEqual(true);
    expect(savedArticle.language).toEqual('en');
    expect(savedArticle.tags).toEqual(['technology', 'breaking', 'innovation']);
    expect(savedArticle.created_at).toBeInstanceOf(Date);
    expect(savedArticle.updated_at).toBeInstanceOf(Date);
  });

  it('should create news article with valid category_id', async () => {
    // First create a category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Technology',
        name_zh: '科技',
        slug: 'technology',
        description: 'Tech news and updates',
        sort_order: 1,
        is_active: true
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create article with the category
    const articleInput: CreateNewsArticleInput = {
      ...basicTestInput,
      category_id: category.id
    };

    const result = await createNewsArticle(articleInput);

    expect(result.category_id).toEqual(category.id);

    // Verify in database
    const articles = await db.select()
      .from(newsArticlesTable)
      .where(eq(newsArticlesTable.id, result.id))
      .execute();

    expect(articles[0].category_id).toEqual(category.id);
  });

  it('should handle empty tags array correctly', async () => {
    const inputWithEmptyTags: CreateNewsArticleInput = {
      ...basicTestInput,
      tags: []
    };

    const result = await createNewsArticle(inputWithEmptyTags);
    
    expect(result.tags).toEqual([]);
    expect(Array.isArray(result.tags)).toBe(true);
  });

  it('should handle complex tags with special characters', async () => {
    const inputWithComplexTags: CreateNewsArticleInput = {
      ...basicTestInput,
      tags: ['AI/ML', 'Web 3.0', 'blockchain', 'IoT', 'big-data']
    };

    const result = await createNewsArticle(inputWithComplexTags);
    
    expect(result.tags).toEqual(['AI/ML', 'Web 3.0', 'blockchain', 'IoT', 'big-data']);

    // Verify in database
    const articles = await db.select()
      .from(newsArticlesTable)
      .where(eq(newsArticlesTable.id, result.id))
      .execute();

    expect(articles[0].tags).toEqual(['AI/ML', 'Web 3.0', 'blockchain', 'IoT', 'big-data']);
  });

  it('should create articles with different languages', async () => {
    const chineseInput: CreateNewsArticleInput = {
      ...basicTestInput,
      title: '突破性科技新闻',
      description: '最新科技趋势的全面展示',
      language: 'zh'
    };

    const result = await createNewsArticle(chineseInput);
    
    expect(result.language).toEqual('zh');
    expect(result.title).toEqual('突破性科技新闻');
  });
});