import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  integer, 
  boolean, 
  varchar,
  jsonb,
  index,
  pgEnum
} from 'drizzle-orm/pg-core';
import { relations as drizzleRelations } from 'drizzle-orm';

// Enums
export const languageEnum = pgEnum('language', ['zh', 'en']);
export const themeEnum = pgEnum('theme', ['light', 'dark', 'system']);

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  name_zh: varchar('name_zh', { length: 100 }), // Chinese name, nullable
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'), // Nullable
  icon_name: varchar('icon_name', { length: 50 }), // SVG icon name, nullable
  sort_order: integer('sort_order').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sortOrderIdx: index('categories_sort_order_idx').on(table.sort_order),
  activeIdx: index('categories_active_idx').on(table.is_active),
}));

// News articles table
export const newsArticlesTable = pgTable('news_articles', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable
  content: text('content'), // Nullable
  thumbnail_url: text('thumbnail_url'), // Nullable
  source_url: text('source_url').notNull(),
  author: varchar('author', { length: 200 }), // Nullable
  source: varchar('source', { length: 100 }).notNull(), // e.g., "Hacker News"
  score: integer('score').notNull().default(0),
  comments_count: integer('comments_count').notNull().default(0),
  published_at: timestamp('published_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  is_featured: boolean('is_featured').notNull().default(false),
  category_id: integer('category_id'), // Foreign key to categories, nullable
  language: languageEnum('language').notNull(),
  tags: jsonb('tags').notNull().default('[]'), // Array of strings stored as JSON
}, (table) => ({
  publishedAtIdx: index('news_articles_published_at_idx').on(table.published_at),
  scoreIdx: index('news_articles_score_idx').on(table.score),
  featuredIdx: index('news_articles_featured_idx').on(table.is_featured),
  categoryIdx: index('news_articles_category_idx').on(table.category_id),
  languageIdx: index('news_articles_language_idx').on(table.language),
}));

// User preferences table
export const userPreferencesTable = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  user_id: varchar('user_id', { length: 255 }).notNull().unique(), // Session ID or user identifier
  theme: themeEnum('theme').notNull().default('system'),
  language: languageEnum('language').notNull().default('zh'),
  categories_order: jsonb('categories_order').notNull().default('[]'), // Array of category IDs
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_preferences_user_id_idx').on(table.user_id),
}));

// Relations
export const categoriesRelations = drizzleRelations(categoriesTable, ({ many }) => ({
  articles: many(newsArticlesTable),
}));

export const newsArticlesRelations = drizzleRelations(newsArticlesTable, ({ one }) => ({
  category: one(categoriesTable, {
    fields: [newsArticlesTable.category_id],
    references: [categoriesTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;
export type NewsArticle = typeof newsArticlesTable.$inferSelect;
export type NewNewsArticle = typeof newsArticlesTable.$inferInsert;
export type UserPreferences = typeof userPreferencesTable.$inferSelect;
export type NewUserPreferences = typeof userPreferencesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  categories: categoriesTable,
  newsArticles: newsArticlesTable,
  userPreferences: userPreferencesTable,
};

export const schemaRelations = {
  categoriesRelations,
  newsArticlesRelations,
};