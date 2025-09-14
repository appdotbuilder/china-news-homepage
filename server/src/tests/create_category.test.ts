import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Test inputs with all required and optional fields
const fullInput: CreateCategoryInput = {
  name: 'Technology',
  name_zh: '技术',
  slug: 'technology',
  description: 'Latest technology news and trends',
  icon_name: 'tech-icon',
  sort_order: 10,
  is_active: true
};

const minimalInput: CreateCategoryInput = {
  name: 'Sports',
  name_zh: null,
  slug: 'sports',
  description: null,
  icon_name: null,
  sort_order: 0, // Zod default
  is_active: true // Zod default
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category with all fields', async () => {
    const result = await createCategory(fullInput);

    // Basic field validation
    expect(result.name).toEqual('Technology');
    expect(result.name_zh).toEqual('技术');
    expect(result.slug).toEqual('technology');
    expect(result.description).toEqual('Latest technology news and trends');
    expect(result.icon_name).toEqual('tech-icon');
    expect(result.sort_order).toEqual(10);
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a category with minimal fields', async () => {
    const result = await createCategory(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('Sports');
    expect(result.name_zh).toBeNull();
    expect(result.slug).toEqual('sports');
    expect(result.description).toBeNull();
    expect(result.icon_name).toBeNull();
    expect(result.sort_order).toEqual(0);
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const result = await createCategory(fullInput);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    const category = categories[0];
    expect(category.name).toEqual('Technology');
    expect(category.name_zh).toEqual('技术');
    expect(category.slug).toEqual('technology');
    expect(category.description).toEqual('Latest technology news and trends');
    expect(category.icon_name).toEqual('tech-icon');
    expect(category.sort_order).toEqual(10);
    expect(category.is_active).toEqual(true);
    expect(category.created_at).toBeInstanceOf(Date);
  });

  it('should handle unique slug constraint violation', async () => {
    // Create first category
    await createCategory(fullInput);

    // Try to create another category with same slug
    const duplicateInput: CreateCategoryInput = {
      name: 'Tech News',
      name_zh: null,
      slug: 'technology', // Same slug as first category
      description: null,
      icon_name: null,
      sort_order: 0,
      is_active: true
    };

    // Should throw error due to unique constraint
    await expect(createCategory(duplicateInput)).rejects.toThrow(/duplicate|unique/i);
  });

  it('should create multiple categories with different slugs', async () => {
    const input1: CreateCategoryInput = {
      name: 'Technology',
      name_zh: '技术',
      slug: 'technology',
      description: 'Tech news',
      icon_name: 'tech',
      sort_order: 1,
      is_active: true
    };

    const input2: CreateCategoryInput = {
      name: 'Business',
      name_zh: '商业',
      slug: 'business',
      description: 'Business news',
      icon_name: 'business',
      sort_order: 2,
      is_active: false
    };

    const result1 = await createCategory(input1);
    const result2 = await createCategory(input2);

    // Verify both categories were created
    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toEqual(result2.id);

    // Query all categories
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
    
    // Verify different values
    const techCategory = allCategories.find(c => c.slug === 'technology');
    const businessCategory = allCategories.find(c => c.slug === 'business');
    
    expect(techCategory).toBeDefined();
    expect(businessCategory).toBeDefined();
    expect(techCategory!.is_active).toEqual(true);
    expect(businessCategory!.is_active).toEqual(false);
    expect(techCategory!.sort_order).toEqual(1);
    expect(businessCategory!.sort_order).toEqual(2);
  });

  it('should handle Chinese characters in name_zh', async () => {
    const chineseInput: CreateCategoryInput = {
      name: 'Entertainment',
      name_zh: '娱乐新闻与八卦',
      slug: 'entertainment',
      description: 'Entertainment and celebrity news',
      icon_name: 'entertainment',
      sort_order: 5,
      is_active: true
    };

    const result = await createCategory(chineseInput);

    expect(result.name_zh).toEqual('娱乐新闻与八卦');

    // Verify in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories[0].name_zh).toEqual('娱乐新闻与八卦');
  });
});