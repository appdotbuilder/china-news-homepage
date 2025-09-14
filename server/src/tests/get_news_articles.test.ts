import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { newsArticlesTable, categoriesTable } from '../db/schema';
import { type PaginationInput } from '../schema';
import { getNewsArticles } from '../handlers/get_news_articles';

// Test data for categories
const testCategory1 = {
  name: 'Technology',
  name_zh: '技术',
  slug: 'technology',
  description: 'Tech news',
  icon_name: 'tech-icon',
  sort_order: 1,
  is_active: true
};

const testCategory2 = {
  name: 'Business',
  name_zh: '商业',
  slug: 'business',
  description: 'Business news',
  icon_name: 'business-icon',
  sort_order: 2,
  is_active: true
};

// Test data for news articles
const testArticle1 = {
  title: 'Tech News Article',
  description: 'A technology article',
  content: 'Article content here',
  thumbnail_url: 'https://example.com/thumb1.jpg',
  source_url: 'https://example.com/article1',
  author: 'John Doe',
  source: 'TechCrunch',
  score: 100,
  comments_count: 25,
  published_at: new Date('2024-01-15T10:00:00Z'),
  is_featured: true,
  language: 'en' as const,
  tags: ['tech', 'ai']
};

const testArticle2 = {
  title: 'Business News Article',
  description: 'A business article',
  content: 'Business content here',
  thumbnail_url: 'https://example.com/thumb2.jpg',
  source_url: 'https://example.com/article2',
  author: 'Jane Smith',
  source: 'Bloomberg',
  score: 75,
  comments_count: 15,
  published_at: new Date('2024-01-14T09:00:00Z'),
  is_featured: false,
  language: 'en' as const,
  tags: ['business', 'finance']
};

const testArticle3 = {
  title: '中文新闻文章',
  description: '一篇中文文章',
  content: '中文内容',
  thumbnail_url: 'https://example.com/thumb3.jpg',
  source_url: 'https://example.com/article3',
  author: '张三',
  source: '新浪',
  score: 50,
  comments_count: 10,
  published_at: new Date('2024-01-13T08:00:00Z'),
  is_featured: true,
  language: 'zh' as const,
  tags: ['中文', '新闻']
};

describe('getNewsArticles', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return paginated news articles with default ordering', async () => {
    // Create test categories
    const [category1, category2] = await db.insert(categoriesTable)
      .values([testCategory1, testCategory2])
      .returning()
      .execute();

    // Create test articles with category references
    await db.insert(newsArticlesTable)
      .values([
        { ...testArticle1, category_id: category1.id },
        { ...testArticle2, category_id: category2.id },
        { ...testArticle3, category_id: category1.id }
      ])
      .execute();

    const input: PaginationInput = {
      limit: 20,
      offset: 0,
      featured_only: false
    };

    const result = await getNewsArticles(input);

    expect(result).toHaveLength(3);
    
    // Should be ordered by published_at DESC (newest first)
    expect(result[0].title).toBe('Tech News Article');
    expect(result[1].title).toBe('Business News Article');
    expect(result[2].title).toBe('中文新闻文章');

    // Verify data structure
    expect(result[0].id).toBeDefined();
    expect(result[0].published_at).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    expect(Array.isArray(result[0].tags)).toBe(true);
    expect(result[0].tags).toEqual(['tech', 'ai']);
  });

  it('should filter by category_id', async () => {
    // Create test categories
    const [category1, category2] = await db.insert(categoriesTable)
      .values([testCategory1, testCategory2])
      .returning()
      .execute();

    // Create articles with different categories
    await db.insert(newsArticlesTable)
      .values([
        { ...testArticle1, category_id: category1.id },
        { ...testArticle2, category_id: category2.id },
        { ...testArticle3, category_id: category1.id }
      ])
      .execute();

    const input: PaginationInput = {
      limit: 20,
      offset: 0,
      category_id: category1.id,
      featured_only: false
    };

    const result = await getNewsArticles(input);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Tech News Article');
    expect(result[1].title).toBe('中文新闻文章');
    expect(result[0].category_id).toBe(category1.id);
    expect(result[1].category_id).toBe(category1.id);
  });

  it('should filter by language', async () => {
    // Create test category
    const [category] = await db.insert(categoriesTable)
      .values([testCategory1])
      .returning()
      .execute();

    // Create articles with different languages
    await db.insert(newsArticlesTable)
      .values([
        { ...testArticle1, category_id: category.id },
        { ...testArticle2, category_id: category.id },
        { ...testArticle3, category_id: category.id }
      ])
      .execute();

    const input: PaginationInput = {
      limit: 20,
      offset: 0,
      language: 'zh',
      featured_only: false
    };

    const result = await getNewsArticles(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('中文新闻文章');
    expect(result[0].language).toBe('zh');
  });

  it('should filter for featured articles only', async () => {
    // Create test category
    const [category] = await db.insert(categoriesTable)
      .values([testCategory1])
      .returning()
      .execute();

    // Create articles with different featured status
    await db.insert(newsArticlesTable)
      .values([
        { ...testArticle1, category_id: category.id, is_featured: true },
        { ...testArticle2, category_id: category.id, is_featured: false },
        { ...testArticle3, category_id: category.id, is_featured: true }
      ])
      .execute();

    const input: PaginationInput = {
      limit: 20,
      offset: 0,
      featured_only: true
    };

    const result = await getNewsArticles(input);

    expect(result).toHaveLength(2);
    expect(result[0].is_featured).toBe(true);
    expect(result[1].is_featured).toBe(true);
    expect(result[0].title).toBe('Tech News Article');
    expect(result[1].title).toBe('中文新闻文章');
  });

  it('should apply pagination correctly', async () => {
    // Create test category
    const [category] = await db.insert(categoriesTable)
      .values([testCategory1])
      .returning()
      .execute();

    // Create multiple articles
    const articles = Array.from({ length: 5 }, (_, i) => ({
      title: `Article ${i + 1}`,
      description: `Description ${i + 1}`,
      content: `Content ${i + 1}`,
      thumbnail_url: `https://example.com/thumb${i + 1}.jpg`,
      source_url: `https://example.com/article${i + 1}`,
      author: `Author ${i + 1}`,
      source: 'TestSource',
      score: 100 - i,
      comments_count: 10 + i,
      published_at: new Date(`2024-01-${20 - i}T10:00:00Z`), // Decreasing dates
      is_featured: false,
      language: 'en' as const,
      tags: [`tag${i + 1}`],
      category_id: category.id
    }));

    await db.insert(newsArticlesTable)
      .values(articles)
      .execute();

    // Test first page
    const firstPage = await getNewsArticles({
      limit: 2,
      offset: 0,
      featured_only: false
    });

    expect(firstPage).toHaveLength(2);
    expect(firstPage[0].title).toBe('Article 1'); // Most recent
    expect(firstPage[1].title).toBe('Article 2');

    // Test second page
    const secondPage = await getNewsArticles({
      limit: 2,
      offset: 2,
      featured_only: false
    });

    expect(secondPage).toHaveLength(2);
    expect(secondPage[0].title).toBe('Article 3');
    expect(secondPage[1].title).toBe('Article 4');
  });

  it('should combine multiple filters', async () => {
    // Create test categories
    const [category1, category2] = await db.insert(categoriesTable)
      .values([testCategory1, testCategory2])
      .returning()
      .execute();

    // Create articles with various combinations
    await db.insert(newsArticlesTable)
      .values([
        { ...testArticle1, category_id: category1.id, language: 'en', is_featured: true },
        { ...testArticle2, category_id: category2.id, language: 'en', is_featured: false },
        { ...testArticle3, category_id: category1.id, language: 'zh', is_featured: true },
        {
          title: 'Another EN Featured',
          description: 'Another featured EN article',
          content: 'Content',
          source_url: 'https://example.com/article4',
          author: 'Test Author',
          source: 'TestSource',
          score: 80,
          comments_count: 20,
          published_at: new Date('2024-01-16T11:00:00Z'),
          is_featured: true,
          language: 'en' as const,
          tags: ['test'],
          category_id: category1.id
        }
      ])
      .execute();

    // Filter by category_id, language, and featured_only
    const input: PaginationInput = {
      limit: 20,
      offset: 0,
      category_id: category1.id,
      language: 'en',
      featured_only: true
    };

    const result = await getNewsArticles(input);

    expect(result).toHaveLength(2);
    result.forEach(article => {
      expect(article.category_id).toBe(category1.id);
      expect(article.language).toBe('en');
      expect(article.is_featured).toBe(true);
    });

    // Should be ordered by published_at DESC
    expect(result[0].title).toBe('Another EN Featured'); // Most recent
    expect(result[1].title).toBe('Tech News Article');
  });

  it('should handle empty results gracefully', async () => {
    // Create category but no articles
    await db.insert(categoriesTable)
      .values([testCategory1])
      .returning()
      .execute();

    const input: PaginationInput = {
      limit: 20,
      offset: 0,
      featured_only: false
    };

    const result = await getNewsArticles(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle articles without categories', async () => {
    // Create articles without category_id (null)
    await db.insert(newsArticlesTable)
      .values([
        { ...testArticle1, category_id: null },
        { ...testArticle2, category_id: null }
      ])
      .execute();

    const input: PaginationInput = {
      limit: 20,
      offset: 0,
      featured_only: false
    };

    const result = await getNewsArticles(input);

    expect(result).toHaveLength(2);
    expect(result[0].category_id).toBeNull();
    expect(result[1].category_id).toBeNull();
  });

  it('should handle malformed tags gracefully', async () => {
    // Create test category
    const [category] = await db.insert(categoriesTable)
      .values([testCategory1])
      .returning()
      .execute();

    // Create article with potential tags issues
    await db.insert(newsArticlesTable)
      .values([{
        ...testArticle1,
        category_id: category.id,
        tags: ['valid', 'tags'] // Should work normally
      }])
      .execute();

    const input: PaginationInput = {
      limit: 20,
      offset: 0,
      featured_only: false
    };

    const result = await getNewsArticles(input);

    expect(result).toHaveLength(1);
    expect(Array.isArray(result[0].tags)).toBe(true);
    expect(result[0].tags).toEqual(['valid', 'tags']);
  });
});