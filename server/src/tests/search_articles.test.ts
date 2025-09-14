import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { newsArticlesTable, categoriesTable } from '../db/schema';
import { type SearchQuery, type CreateNewsArticleInput, type CreateCategoryInput } from '../schema';
import { searchArticles } from '../handlers/search_articles';

// Test data setup
const testCategory: CreateCategoryInput = {
  name: 'Technology',
  name_zh: '科技',
  slug: 'technology',
  description: 'Technology news',
  icon_name: 'tech-icon',
  sort_order: 1,
  is_active: true
};

const testArticles: CreateNewsArticleInput[] = [
  {
    title: 'React 19 Released with New Features',
    description: 'React 19 introduces new hooks and performance improvements',
    content: 'The latest version of React brings exciting new features for developers...',
    thumbnail_url: 'https://example.com/react.jpg',
    source_url: 'https://react.dev/blog/react-19',
    author: 'React Team',
    source: 'React Blog',
    score: 100,
    comments_count: 25,
    published_at: new Date('2024-01-15T10:00:00Z'),
    is_featured: true,
    category_id: 1,
    language: 'en',
    tags: ['react', 'javascript', 'frontend']
  },
  {
    title: 'Vue.js 4.0 发布',
    description: 'Vue.js 4.0 带来了许多新功能和改进',
    content: 'Vue.js 的最新版本为开发者带来了令人兴奋的新功能...',
    thumbnail_url: 'https://example.com/vue.jpg',
    source_url: 'https://vuejs.org/blog/vue-4',
    author: 'Vue Team',
    source: 'Vue Blog',
    score: 85,
    comments_count: 15,
    published_at: new Date('2024-01-14T09:00:00Z'),
    is_featured: false,
    category_id: 1,
    language: 'zh',
    tags: ['vue', 'javascript', 'frontend']
  },
  {
    title: 'Angular Updates Coming Soon',
    description: 'Angular team announces upcoming changes',
    content: 'Angular framework will receive major updates in the coming months...',
    thumbnail_url: 'https://example.com/angular.jpg',
    source_url: 'https://angular.io/blog/updates',
    author: 'Angular Team',
    source: 'Angular Blog',
    score: 70,
    comments_count: 10,
    published_at: new Date('2024-01-13T08:00:00Z'),
    is_featured: false,
    category_id: 1,
    language: 'en',
    tags: ['angular', 'typescript', 'frontend']
  }
];

describe('searchArticles', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test category
    await db.insert(categoriesTable).values(testCategory).execute();
    
    // Create test articles
    await db.insert(newsArticlesTable).values(
      testArticles.map(article => ({
        ...article,
        tags: JSON.stringify(article.tags)
      }))
    ).execute();
  });

  afterEach(resetDB);

  it('should search articles by title', async () => {
    const searchQuery: SearchQuery = {
      query: 'React',
      limit: 20,
      offset: 0
    };

    const results = await searchArticles(searchQuery);

    expect(results).toHaveLength(1);
    expect(results[0].title).toContain('React');
    expect(results[0].tags).toEqual(['react', 'javascript', 'frontend']);
  });

  it('should search articles by description', async () => {
    const searchQuery: SearchQuery = {
      query: 'hooks',
      limit: 20,
      offset: 0
    };

    const results = await searchArticles(searchQuery);

    expect(results).toHaveLength(1);
    expect(results[0].description).toContain('hooks');
  });

  it('should search articles by content', async () => {
    const searchQuery: SearchQuery = {
      query: 'developers',
      limit: 20,
      offset: 0
    };

    const results = await searchArticles(searchQuery);

    expect(results).toHaveLength(1);
    expect(results[0].content).toContain('developers');
  });

  it('should search Chinese text', async () => {
    const searchQuery: SearchQuery = {
      query: '发布',
      limit: 20,
      offset: 0
    };

    const results = await searchArticles(searchQuery);

    expect(results).toHaveLength(1);
    expect(results[0].title).toContain('发布');
    expect(results[0].language).toBe('zh');
  });

  it('should filter by category_id', async () => {
    const searchQuery: SearchQuery = {
      query: 'javascript',
      category_id: 1,
      limit: 20,
      offset: 0
    };

    const results = await searchArticles(searchQuery);

    expect(results.length).toBeGreaterThan(0);
    results.forEach(article => {
      expect(article.category_id).toBe(1);
    });
  });

  it('should filter by language', async () => {
    const searchQuery: SearchQuery = {
      query: 'frontend',
      language: 'en',
      limit: 20,
      offset: 0
    };

    const results = await searchArticles(searchQuery);

    expect(results.length).toBeGreaterThan(0);
    results.forEach(article => {
      expect(article.language).toBe('en');
    });
  });

  it('should support pagination with limit and offset', async () => {
    const searchQuery: SearchQuery = {
      query: 'frontend',
      limit: 1,
      offset: 0
    };

    const firstPage = await searchArticles(searchQuery);
    expect(firstPage).toHaveLength(1);

    const secondPageQuery: SearchQuery = {
      query: 'frontend',
      limit: 1,
      offset: 1
    };

    const secondPage = await searchArticles(secondPageQuery);
    expect(secondPage).toHaveLength(1);
    expect(secondPage[0].id).not.toBe(firstPage[0].id);
  });

  it('should return results ordered by published_at DESC', async () => {
    const searchQuery: SearchQuery = {
      query: 'frontend',
      limit: 20,
      offset: 0
    };

    const results = await searchArticles(searchQuery);

    expect(results.length).toBeGreaterThan(1);
    
    // Check that results are ordered by published_at DESC
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].published_at >= results[i].published_at).toBe(true);
    }
  });

  it('should return empty array when no matches found', async () => {
    const searchQuery: SearchQuery = {
      query: 'nonexistent',
      limit: 20,
      offset: 0
    };

    const results = await searchArticles(searchQuery);

    expect(results).toHaveLength(0);
  });

  it('should handle case-insensitive search', async () => {
    const searchQuery: SearchQuery = {
      query: 'REACT',
      limit: 20,
      offset: 0
    };

    const results = await searchArticles(searchQuery);

    expect(results).toHaveLength(1);
    expect(results[0].title.toLowerCase()).toContain('react');
  });

  it('should combine multiple filters', async () => {
    const searchQuery: SearchQuery = {
      query: 'frontend',
      category_id: 1,
      language: 'zh',
      limit: 20,
      offset: 0
    };

    const results = await searchArticles(searchQuery);

    expect(results).toHaveLength(1);
    expect(results[0].category_id).toBe(1);
    expect(results[0].language).toBe('zh');
    expect(results[0].tags).toContain('frontend');
  });

  it('should handle partial word matching', async () => {
    const searchQuery: SearchQuery = {
      query: 'java',
      limit: 20,
      offset: 0
    };

    const results = await searchArticles(searchQuery);

    // Should match articles containing "javascript"
    expect(results.length).toBeGreaterThan(0);
    results.forEach(article => {
      const searchableText = `${article.title} ${article.description} ${article.content} ${JSON.stringify(article.tags)}`.toLowerCase();
      expect(searchableText).toContain('java');
    });
  });

  it('should properly convert tags from JSON to array', async () => {
    const searchQuery: SearchQuery = {
      query: 'React',
      limit: 20,
      offset: 0
    };

    const results = await searchArticles(searchQuery);

    expect(results).toHaveLength(1);
    expect(Array.isArray(results[0].tags)).toBe(true);
    expect(results[0].tags).toEqual(['react', 'javascript', 'frontend']);
  });

  it('should search across all text fields simultaneously', async () => {
    // Create an article where search term appears in different fields
    const specialArticle: CreateNewsArticleInput = {
      title: 'Special Article',
      description: 'Contains unique term in description',
      content: 'And another unique term in content',
      thumbnail_url: 'https://example.com/special.jpg',
      source_url: 'https://example.com/special',
      author: 'Special Author',
      source: 'Special Source',
      score: 50,
      comments_count: 5,
      published_at: new Date('2024-01-16T11:00:00Z'),
      is_featured: false,
      category_id: 1,
      language: 'en',
      tags: ['special']
    };

    await db.insert(newsArticlesTable).values({
      ...specialArticle,
      tags: JSON.stringify(specialArticle.tags)
    }).execute();

    // Search for term that appears in title
    const titleSearch = await searchArticles({ query: 'Special', limit: 20, offset: 0 });
    expect(titleSearch.length).toBeGreaterThan(0);

    // Search for term that appears in description
    const descSearch = await searchArticles({ query: 'unique', limit: 20, offset: 0 });
    expect(descSearch.length).toBeGreaterThan(0);

    // Search for term that appears in content
    const contentSearch = await searchArticles({ query: 'another', limit: 20, offset: 0 });
    expect(contentSearch.length).toBeGreaterThan(0);
  });
});