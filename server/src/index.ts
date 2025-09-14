import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  paginationInputSchema,
  searchQuerySchema,
  createNewsArticleInputSchema,
  updateNewsArticleInputSchema,
  updateUserPreferencesInputSchema,
  createCategoryInputSchema,
} from './schema';

// Import handlers
import { getHomepageData } from './handlers/get_homepage_data';
import { getNewsArticles } from './handlers/get_news_articles';
import { getFeaturedArticles } from './handlers/get_featured_articles';
import { searchArticles } from './handlers/search_articles';
import { getCategories } from './handlers/get_categories';
import { createNewsArticle } from './handlers/create_news_article';
import { updateNewsArticle } from './handlers/update_news_article';
import { getUserPreferences } from './handlers/get_user_preferences';
import { updateUserPreferences } from './handlers/update_user_preferences';
import { createCategory } from './handlers/create_category';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Homepage data (featured articles + latest articles + categories)
  getHomepageData: publicProcedure
    .input(paginationInputSchema.optional())
    .query(({ input }) => getHomepageData(input)),

  // Get news articles with pagination and filtering
  getNewsArticles: publicProcedure
    .input(paginationInputSchema)
    .query(({ input }) => getNewsArticles(input)),

  // Get featured articles for carousel
  getFeaturedArticles: publicProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(20).default(5),
      language: z.enum(['zh', 'en']).optional(),
    }))
    .query(({ input }) => getFeaturedArticles(input.limit, input.language)),

  // Search articles
  searchArticles: publicProcedure
    .input(searchQuerySchema)
    .query(({ input }) => searchArticles(input)),

  // Get categories
  getCategories: publicProcedure
    .input(z.object({
      activeOnly: z.boolean().default(true),
    }))
    .query(({ input }) => getCategories(input.activeOnly)),

  // Create news article
  createNewsArticle: publicProcedure
    .input(createNewsArticleInputSchema)
    .mutation(({ input }) => createNewsArticle(input)),

  // Update news article
  updateNewsArticle: publicProcedure
    .input(updateNewsArticleInputSchema)
    .mutation(({ input }) => updateNewsArticle(input)),

  // Get user preferences
  getUserPreferences: publicProcedure
    .input(z.object({
      userId: z.string().min(1),
    }))
    .query(({ input }) => getUserPreferences(input.userId)),

  // Update user preferences (theme, language, categories order)
  updateUserPreferences: publicProcedure
    .input(updateUserPreferencesInputSchema)
    .mutation(({ input }) => updateUserPreferences(input)),

  // Create category (admin function)
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();