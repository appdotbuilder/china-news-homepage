import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { newsArticlesTable, categoriesTable } from '../db/schema';
import { type PaginationInput } from '../schema';
import { getHomepageData } from '../handlers/get_homepage_data';

// Test categories
const testCategories = [
  {
    name: 'Technology',
    name_zh: '技术',
    slug: 'technology',
    description: 'Tech news and updates',
    icon_name: 'tech-icon',
    sort_order: 1,
    is_active: true,
  },
  {
    name: 'Business',
    name_zh: '商业',
    slug: 'business',
    description: 'Business and finance',
    icon_name: 'business-icon',
    sort_order: 2,
    is_active: true,
  },
  {
    name: 'Inactive Category',
    name_zh: '不活跃',
    slug: 'inactive',
    description: 'Should not appear',
    icon_name: 'inactive-icon',
    sort_order: 3,
    is_active: false,
  },
];

// Test articles
const testArticles = [
  {
    title: 'Featured English Article',
    description: 'A featured article in English',
    content: 'Content here...',
    thumbnail_url: 'https://example.com/thumb1.jpg',
    source_url: 'https://example.com/article1',
    author: 'John Doe',
    source: 'Tech News',
    score: 100,
    comments_count: 50,
    published_at: new Date('2024-01-15'),
    is_featured: true,
    language: 'en' as const,
    tags: ['tech', 'ai'],
  },
  {
    title: 'Featured Chinese Article',
    description: '中文特色文章',
    content: '内容在这里...',
    thumbnail_url: 'https://example.com/thumb2.jpg',
    source_url: 'https://example.com/article2',
    author: '张三',
    source: '科技新闻',
    score: 80,
    comments_count: 30,
    published_at: new Date('2024-01-14'),
    is_featured: true,
    language: 'zh' as const,
    tags: ['科技', '人工智能'],
  },
  {
    title: 'Latest English Article',
    description: 'A regular English article',
    content: 'Regular content...',
    thumbnail_url: null,
    source_url: 'https://example.com/article3',
    author: 'Jane Smith',
    source: 'News Site',
    score: 60,
    comments_count: 20,
    published_at: new Date('2024-01-13'),
    is_featured: false,
    language: 'en' as const,
    tags: ['news'],
  },
  {
    title: 'Latest Chinese Article',
    description: '常规中文文章',
    content: '常规内容...',
    thumbnail_url: null,
    source_url: 'https://example.com/article4',
    author: '李四',
    source: '新闻网站',
    score: 40,
    comments_count: 10,
    published_at: new Date('2024-01-12'),
    is_featured: false,
    language: 'zh' as const,
    tags: ['新闻'],
  },
  {
    title: 'Old Featured Article',
    description: 'An older featured article',
    content: 'Old content...',
    thumbnail_url: 'https://example.com/thumb5.jpg',
    source_url: 'https://example.com/article5',
    author: 'Old Author',
    source: 'Old Source',
    score: 120,
    comments_count: 60,
    published_at: new Date('2024-01-10'),
    is_featured: true,
    language: 'en' as const,
    tags: ['old', 'featured'],
  },
];

describe('getHomepageData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return homepage data with defaults when no input provided', async () => {
    // Create test categories
    const categoryResults = await db.insert(categoriesTable)
      .values(testCategories)
      .returning()
      .execute();

    // Create test articles
    const articleResults = await db.insert(newsArticlesTable)
      .values(testArticles.map((article, index) => ({
        ...article,
        category_id: index < 2 ? categoryResults[0].id : null, // First 2 articles have category
      })))
      .returning()
      .execute();

    const result = await getHomepageData();

    // Should have featured articles ordered by published_at desc
    expect(result.featured_articles).toHaveLength(3);
    expect(result.featured_articles[0].title).toBe('Featured English Article');
    expect(result.featured_articles[1].title).toBe('Featured Chinese Article');
    expect(result.featured_articles[2].title).toBe('Old Featured Article');

    // Should have latest articles (all articles) ordered by published_at desc, limited to 20
    expect(result.latest_articles).toHaveLength(5);
    expect(result.latest_articles[0].title).toBe('Featured English Article');
    expect(result.latest_articles[1].title).toBe('Featured Chinese Article');

    // Should have active categories only, ordered by sort_order
    expect(result.categories).toHaveLength(2);
    expect(result.categories[0].name).toBe('Technology');
    expect(result.categories[1].name).toBe('Business');

    // Should have correct total count
    expect(result.total_articles).toBe(5);

    // Verify tags are arrays
    expect(Array.isArray(result.featured_articles[0].tags)).toBe(true);
    expect(result.featured_articles[0].tags).toEqual(['tech', 'ai']);
  });

  it('should filter by language', async () => {
    // Create test categories and articles
    await db.insert(categoriesTable).values(testCategories).execute();
    await db.insert(newsArticlesTable).values(testArticles).execute();

    const input: PaginationInput = {
      language: 'zh',
      limit: 20,
      offset: 0,
      featured_only: false,
    };

    const result = await getHomepageData(input);

    // Featured articles should be filtered by language
    expect(result.featured_articles).toHaveLength(1);
    expect(result.featured_articles[0].title).toBe('Featured Chinese Article');
    expect(result.featured_articles[0].language).toBe('zh');

    // Latest articles should be filtered by language
    const chineseArticles = result.latest_articles.filter(article => article.language === 'zh');
    expect(chineseArticles).toHaveLength(result.latest_articles.length);
    expect(result.latest_articles).toHaveLength(2);

    // Categories should not be filtered
    expect(result.categories).toHaveLength(2);

    // Total count should reflect language filter
    expect(result.total_articles).toBe(2);
  });

  it('should filter by category', async () => {
    // Create test categories
    const categoryResults = await db.insert(categoriesTable)
      .values(testCategories)
      .returning()
      .execute();

    // Create test articles with specific category
    await db.insert(newsArticlesTable)
      .values(testArticles.map((article, index) => ({
        ...article,
        category_id: index < 3 ? categoryResults[0].id : null, // First 3 articles have category
      })))
      .execute();

    const input: PaginationInput = {
      category_id: categoryResults[0].id,
      limit: 20,
      offset: 0,
      featured_only: false,
    };

    const result = await getHomepageData(input);

    // Featured articles should not be filtered by category (carousel shows all featured)
    expect(result.featured_articles).toHaveLength(3);

    // Latest articles should be filtered by category
    expect(result.latest_articles).toHaveLength(3);
    result.latest_articles.forEach(article => {
      expect(article.category_id).toBe(categoryResults[0].id);
    });

    // Total count should reflect category filter
    expect(result.total_articles).toBe(3);
  });

  it('should handle pagination', async () => {
    // Create test categories and articles
    await db.insert(categoriesTable).values(testCategories).execute();
    await db.insert(newsArticlesTable).values(testArticles).execute();

    const input: PaginationInput = {
      limit: 2,
      offset: 1,
      featured_only: false,
    };

    const result = await getHomepageData(input);

    // Featured articles should not be affected by pagination
    expect(result.featured_articles).toHaveLength(3);

    // Latest articles should be paginated
    expect(result.latest_articles).toHaveLength(2);
    expect(result.latest_articles[0].title).toBe('Featured Chinese Article'); // Second article

    // Total count should not be affected by pagination
    expect(result.total_articles).toBe(5);
  });

  it('should handle featured_only filter', async () => {
    // Create test categories and articles
    await db.insert(categoriesTable).values(testCategories).execute();
    await db.insert(newsArticlesTable).values(testArticles).execute();

    const input: PaginationInput = {
      featured_only: true,
      limit: 20,
      offset: 0,
    };

    const result = await getHomepageData(input);

    // Featured articles should remain the same
    expect(result.featured_articles).toHaveLength(3);

    // Latest articles should only show featured articles
    expect(result.latest_articles).toHaveLength(3);
    result.latest_articles.forEach(article => {
      expect(article.is_featured).toBe(true);
    });

    // Total count should not be affected by featured_only (it doesn't apply to count)
    expect(result.total_articles).toBe(5);
  });

  it('should handle combined filters', async () => {
    // Create test categories
    const categoryResults = await db.insert(categoriesTable)
      .values(testCategories)
      .returning()
      .execute();

    // Create test articles with specific category
    await db.insert(newsArticlesTable)
      .values(testArticles.map((article, index) => ({
        ...article,
        category_id: index < 2 ? categoryResults[0].id : null, // First 2 articles have category
      })))
      .execute();

    const input: PaginationInput = {
      language: 'en',
      category_id: categoryResults[0].id,
      limit: 10,
      offset: 0,
      featured_only: false,
    };

    const result = await getHomepageData(input);

    // Featured articles should be filtered by language only
    expect(result.featured_articles).toHaveLength(2);
    expect(result.featured_articles[0].language).toBe('en');

    // Latest articles should be filtered by both language and category
    expect(result.latest_articles).toHaveLength(1);
    expect(result.latest_articles[0].title).toBe('Featured English Article');
    expect(result.latest_articles[0].language).toBe('en');
    expect(result.latest_articles[0].category_id).toBe(categoryResults[0].id);

    // Total count should reflect both filters
    expect(result.total_articles).toBe(1);
  });

  it('should handle empty results gracefully', async () => {
    const result = await getHomepageData();

    expect(result.featured_articles).toHaveLength(0);
    expect(result.latest_articles).toHaveLength(0);
    expect(result.categories).toHaveLength(0);
    expect(result.total_articles).toBe(0);
  });

  it('should handle articles with empty tags correctly', async () => {
    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values([testCategories[0]])
      .returning()
      .execute();

    // Create articles with different tag scenarios
    await db.insert(newsArticlesTable)
      .values([
        {
          ...testArticles[0],
          category_id: categoryResult[0].id,
          tags: [], // Empty array - tags column has default '[]'
        },
        {
          ...testArticles[1],
          category_id: categoryResult[0].id,
          tags: ['test'], // Array with content
        },
      ])
      .execute();

    const result = await getHomepageData();

    expect(result.featured_articles).toHaveLength(2);
    expect(Array.isArray(result.featured_articles[0].tags)).toBe(true);
    expect(result.featured_articles[0].tags).toEqual([]);
    expect(Array.isArray(result.featured_articles[1].tags)).toBe(true);
    expect(result.featured_articles[1].tags).toEqual(['test']);
  });
});