import { z } from 'zod';

// News article schema
export const newsArticleSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  source_url: z.string(),
  author: z.string().nullable(),
  source: z.string(),
  score: z.number().int(),
  comments_count: z.number().int(),
  published_at: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  is_featured: z.boolean(),
  category_id: z.number().nullable(),
  language: z.enum(['zh', 'en']),
  tags: z.array(z.string()),
});

export type NewsArticle = z.infer<typeof newsArticleSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  name_zh: z.string().nullable(),
  slug: z.string(),
  description: z.string().nullable(),
  icon_name: z.string().nullable(),
  sort_order: z.number().int(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
});

export type Category = z.infer<typeof categorySchema>;

// User preferences schema for dark mode, language, etc.
export const userPreferencesSchema = z.object({
  id: z.number(),
  user_id: z.string(), // Could be session ID or user identifier
  theme: z.enum(['light', 'dark', 'system']),
  language: z.enum(['zh', 'en']),
  categories_order: z.array(z.number()),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// Search query schema
export const searchQuerySchema = z.object({
  query: z.string().min(1),
  category_id: z.number().optional(),
  language: z.enum(['zh', 'en']).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

// Input schemas for creating/updating
export const createNewsArticleInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  content: z.string().nullable(),
  thumbnail_url: z.string().url().nullable(),
  source_url: z.string().url(),
  author: z.string().nullable(),
  source: z.string(),
  score: z.number().int().nonnegative().default(0),
  comments_count: z.number().int().nonnegative().default(0),
  published_at: z.coerce.date(),
  is_featured: z.boolean().default(false),
  category_id: z.number().nullable(),
  language: z.enum(['zh', 'en']),
  tags: z.array(z.string()).default([]),
});

export type CreateNewsArticleInput = z.infer<typeof createNewsArticleInputSchema>;

export const updateNewsArticleInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  author: z.string().nullable().optional(),
  score: z.number().int().nonnegative().optional(),
  comments_count: z.number().int().nonnegative().optional(),
  is_featured: z.boolean().optional(),
  category_id: z.number().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export type UpdateNewsArticleInput = z.infer<typeof updateNewsArticleInputSchema>;

export const createCategoryInputSchema = z.object({
  name: z.string().min(1),
  name_zh: z.string().nullable(),
  slug: z.string().min(1),
  description: z.string().nullable(),
  icon_name: z.string().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const updateUserPreferencesInputSchema = z.object({
  user_id: z.string(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.enum(['zh', 'en']).optional(),
  categories_order: z.array(z.number()).optional(),
});

export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesInputSchema>;

// Homepage data schema
export const homepageDataSchema = z.object({
  featured_articles: z.array(newsArticleSchema),
  latest_articles: z.array(newsArticleSchema),
  categories: z.array(categorySchema),
  total_articles: z.number().int(),
});

export type HomepageData = z.infer<typeof homepageDataSchema>;

// Pagination schema
export const paginationInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
  category_id: z.number().optional(),
  language: z.enum(['zh', 'en']).optional(),
  featured_only: z.boolean().default(false),
});

export type PaginationInput = z.infer<typeof paginationInputSchema>;