import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { getCategories } from '../handlers/get_categories';

// Test categories data
const testCategories: CreateCategoryInput[] = [
  {
    name: 'Technology',
    name_zh: '科技',
    slug: 'technology',
    description: 'Tech news and updates',
    icon_name: 'tech-icon',
    sort_order: 1,
    is_active: true
  },
  {
    name: 'Sports',
    name_zh: '体育',
    slug: 'sports',
    description: 'Sports news',
    icon_name: 'sports-icon',
    sort_order: 2,
    is_active: true
  },
  {
    name: 'Inactive Category',
    name_zh: '非活跃类别',
    slug: 'inactive',
    description: 'This category is not active',
    icon_name: 'inactive-icon',
    sort_order: 3,
    is_active: false
  },
  {
    name: 'Business',
    name_zh: '商业',
    slug: 'business',
    description: 'Business and finance news',
    icon_name: 'business-icon',
    sort_order: 0, // Should appear first due to lower sort order
    is_active: true
  }
];

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return active categories only by default', async () => {
    // Insert test categories
    await db.insert(categoriesTable).values(testCategories).execute();

    const result = await getCategories();

    // Should return only active categories (3 out of 4)
    expect(result).toHaveLength(3);
    
    // All returned categories should be active
    result.forEach(category => {
      expect(category.is_active).toBe(true);
    });

    // Should not include inactive category
    const slugs = result.map(cat => cat.slug);
    expect(slugs).not.toContain('inactive');
  });

  it('should return all categories when activeOnly is false', async () => {
    // Insert test categories
    await db.insert(categoriesTable).values(testCategories).execute();

    const result = await getCategories(false);

    // Should return all categories
    expect(result).toHaveLength(4);
    
    // Should include both active and inactive categories
    const activeCategories = result.filter(cat => cat.is_active);
    const inactiveCategories = result.filter(cat => !cat.is_active);
    expect(activeCategories).toHaveLength(3);
    expect(inactiveCategories).toHaveLength(1);
  });

  it('should return categories ordered by sort_order ASC', async () => {
    // Insert test categories
    await db.insert(categoriesTable).values(testCategories).execute();

    const result = await getCategories(false);

    // Verify sort order (Business=0, Technology=1, Sports=2, Inactive=3)
    expect(result[0].slug).toBe('business');
    expect(result[0].sort_order).toBe(0);
    expect(result[1].slug).toBe('technology');
    expect(result[1].sort_order).toBe(1);
    expect(result[2].slug).toBe('sports');
    expect(result[2].sort_order).toBe(2);
    expect(result[3].slug).toBe('inactive');
    expect(result[3].sort_order).toBe(3);
  });

  it('should include all required fields including i18n names', async () => {
    // Insert one test category
    await db.insert(categoriesTable).values([testCategories[0]]).execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    const category = result[0];

    // Verify all expected fields are present
    expect(category.id).toBeDefined();
    expect(category.name).toBe('Technology');
    expect(category.name_zh).toBe('科技');
    expect(category.slug).toBe('technology');
    expect(category.description).toBe('Tech news and updates');
    expect(category.icon_name).toBe('tech-icon');
    expect(category.sort_order).toBe(1);
    expect(category.is_active).toBe(true);
    expect(category.created_at).toBeInstanceOf(Date);
  });

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle categories with null optional fields', async () => {
    // Insert category with minimal required fields
    const minimalCategory: CreateCategoryInput = {
      name: 'Minimal Category',
      name_zh: null,
      slug: 'minimal',
      description: null,
      icon_name: null,
      sort_order: 1,
      is_active: true
    };

    await db.insert(categoriesTable).values([minimalCategory]).execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    const category = result[0];
    
    expect(category.name).toBe('Minimal Category');
    expect(category.name_zh).toBeNull();
    expect(category.description).toBeNull();
    expect(category.icon_name).toBeNull();
    expect(category.slug).toBe('minimal');
  });

  it('should maintain correct sort order with active filter', async () => {
    // Insert test categories
    await db.insert(categoriesTable).values(testCategories).execute();

    const result = await getCategories(true);

    // Should return active categories in sort order: Business(0), Technology(1), Sports(2)
    expect(result).toHaveLength(3);
    expect(result[0].slug).toBe('business');
    expect(result[1].slug).toBe('technology');
    expect(result[2].slug).toBe('sports');
    
    // Verify sort order values
    expect(result[0].sort_order).toBe(0);
    expect(result[1].sort_order).toBe(1);
    expect(result[2].sort_order).toBe(2);
  });
});