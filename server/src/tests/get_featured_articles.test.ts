import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { newsArticlesTable, categoriesTable } from '../db/schema';
import { getFeaturedArticles } from '../handlers/get_featured_articles';

describe('getFeaturedArticles', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create test category
  const createTestCategory = async () => {
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category'
      })
      .returning()
      .execute();
    return categoryResult[0];
  };

  // Helper to create test articles
  const createTestArticles = async (categoryId: number) => {
    const articles = [
      {
        title: 'Featured English Article 1',
        source_url: 'https://example.com/en1',
        source: 'Test Source',
        published_at: new Date('2024-01-01'),
        is_featured: true,
        language: 'en' as const,
        score: 100,
        category_id: categoryId,
        tags: ['tech', 'news']
      },
      {
        title: 'Featured Chinese Article 1',
        source_url: 'https://example.com/zh1',
        source: 'Test Source',
        published_at: new Date('2024-01-02'),
        is_featured: true,
        language: 'zh' as const,
        score: 90,
        category_id: categoryId,
        tags: ['科技', '新闻']
      },
      {
        title: 'Non-Featured Article',
        source_url: 'https://example.com/non-featured',
        source: 'Test Source',
        published_at: new Date('2024-01-03'),
        is_featured: false,
        language: 'en' as const,
        score: 200, // High score but not featured
        category_id: categoryId,
        tags: ['other']
      },
      {
        title: 'Featured English Article 2',
        source_url: 'https://example.com/en2',
        source: 'Test Source',
        published_at: new Date('2024-01-04'),
        is_featured: true,
        language: 'en' as const,
        score: 80,
        category_id: categoryId,
        tags: ['business']
      },
      {
        title: 'Featured Chinese Article 2',
        source_url: 'https://example.com/zh2',
        source: 'Test Source',
        published_at: new Date('2024-01-05'),
        is_featured: true,
        language: 'zh' as const,
        score: 95,
        category_id: categoryId,
        tags: ['商业']
      }
    ];

    return await db.insert(newsArticlesTable)
      .values(articles)
      .returning()
      .execute();
  };

  it('should return only featured articles', async () => {
    const category = await createTestCategory();
    await createTestArticles(category.id);

    const result = await getFeaturedArticles();

    expect(result).toHaveLength(4); // Only featured articles
    result.forEach(article => {
      expect(article.is_featured).toBe(true);
    });
  });

  it('should order articles by score DESC, then published_at DESC', async () => {
    const category = await createTestCategory();
    await createTestArticles(category.id);

    const result = await getFeaturedArticles();

    // Should be ordered: 100 (en1), 95 (zh2), 90 (zh1), 80 (en2)
    expect(result[0].score).toBe(100);
    expect(result[0].title).toBe('Featured English Article 1');
    expect(result[1].score).toBe(95);
    expect(result[1].title).toBe('Featured Chinese Article 2');
    expect(result[2].score).toBe(90);
    expect(result[2].title).toBe('Featured Chinese Article 1');
    expect(result[3].score).toBe(80);
    expect(result[3].title).toBe('Featured English Article 2');
  });

  it('should filter by language when specified', async () => {
    const category = await createTestCategory();
    await createTestArticles(category.id);

    const englishResult = await getFeaturedArticles(5, 'en');
    const chineseResult = await getFeaturedArticles(5, 'zh');

    expect(englishResult).toHaveLength(2);
    englishResult.forEach(article => {
      expect(article.language).toBe('en');
      expect(article.is_featured).toBe(true);
    });

    expect(chineseResult).toHaveLength(2);
    chineseResult.forEach(article => {
      expect(article.language).toBe('zh');
      expect(article.is_featured).toBe(true);
    });
  });

  it('should respect the limit parameter', async () => {
    const category = await createTestCategory();
    await createTestArticles(category.id);

    const limitedResult = await getFeaturedArticles(2);

    expect(limitedResult).toHaveLength(2);
    expect(limitedResult[0].score).toBe(100); // Highest score first
    expect(limitedResult[1].score).toBe(95); // Second highest
  });

  it('should use default limit of 5 when not specified', async () => {
    const category = await createTestCategory();
    
    // Create 7 featured articles
    const manyArticles = Array.from({ length: 7 }, (_, i) => ({
      title: `Featured Article ${i + 1}`,
      source_url: `https://example.com/${i + 1}`,
      source: 'Test Source',
      published_at: new Date(),
      is_featured: true,
      language: 'en' as const,
      score: 10 + i,
      category_id: category.id,
      tags: ['test']
    }));

    await db.insert(newsArticlesTable).values(manyArticles).execute();

    const result = await getFeaturedArticles(); // No limit specified

    expect(result).toHaveLength(5); // Should default to 5
  });

  it('should handle articles with same score by ordering by published_at DESC', async () => {
    const category = await createTestCategory();
    
    const articlesWithSameScore = [
      {
        title: 'Earlier Article',
        source_url: 'https://example.com/earlier',
        source: 'Test Source',
        published_at: new Date('2024-01-01'),
        is_featured: true,
        language: 'en' as const,
        score: 50,
        category_id: category.id,
        tags: ['test']
      },
      {
        title: 'Later Article',
        source_url: 'https://example.com/later',
        source: 'Test Source',
        published_at: new Date('2024-01-02'),
        is_featured: true,
        language: 'en' as const,
        score: 50, // Same score
        category_id: category.id,
        tags: ['test']
      }
    ];

    await db.insert(newsArticlesTable).values(articlesWithSameScore).execute();

    const result = await getFeaturedArticles();

    // Later article should come first due to published_at DESC tie-breaking
    expect(result[0].title).toBe('Later Article');
    expect(result[1].title).toBe('Earlier Article');
  });

  it('should return empty array when no featured articles exist', async () => {
    const category = await createTestCategory();
    
    // Create only non-featured articles
    await db.insert(newsArticlesTable)
      .values([{
        title: 'Non-Featured Article',
        source_url: 'https://example.com/non-featured',
        source: 'Test Source',
        published_at: new Date(),
        is_featured: false,
        language: 'en' as const,
        score: 100,
        category_id: category.id,
        tags: ['test']
      }])
      .execute();

    const result = await getFeaturedArticles();

    expect(result).toHaveLength(0);
  });

  it('should handle articles without tags correctly', async () => {
    const category = await createTestCategory();
    
    await db.insert(newsArticlesTable)
      .values([{
        title: 'Article Without Tags',
        source_url: 'https://example.com/no-tags',
        source: 'Test Source',
        published_at: new Date(),
        is_featured: true,
        language: 'en' as const,
        score: 100,
        category_id: category.id,
        tags: [] // Empty tags
      }])
      .execute();

    const result = await getFeaturedArticles();

    expect(result).toHaveLength(1);
    expect(result[0].tags).toEqual([]);
    expect(Array.isArray(result[0].tags)).toBe(true);
  });

  it('should validate all returned fields have correct types', async () => {
    const category = await createTestCategory();
    await createTestArticles(category.id);

    const result = await getFeaturedArticles();

    expect(result).toHaveLength(4);
    
    result.forEach(article => {
      expect(typeof article.id).toBe('number');
      expect(typeof article.title).toBe('string');
      expect(typeof article.source_url).toBe('string');
      expect(typeof article.source).toBe('string');
      expect(typeof article.score).toBe('number');
      expect(typeof article.comments_count).toBe('number');
      expect(article.published_at).toBeInstanceOf(Date);
      expect(article.created_at).toBeInstanceOf(Date);
      expect(article.updated_at).toBeInstanceOf(Date);
      expect(typeof article.is_featured).toBe('boolean');
      expect(typeof article.category_id).toBe('number');
      expect(['zh', 'en']).toContain(article.language);
      expect(Array.isArray(article.tags)).toBe(true);
    });
  });
});