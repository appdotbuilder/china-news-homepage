import React, { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { NewsArticle, HomepageData } from '../../server/src/schema';

function App() {
  // State management
  const [homepageData, setHomepageData] = useState<HomepageData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NewsArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [isLoading, setIsLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  // Auto-detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      if (theme === 'system') {
        document.documentElement.classList.toggle('dark', mediaQuery.matches);
      }
    };
    
    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);
    
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme]);

  // Apply theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Scroll detection for dynamic navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load homepage data
  const loadHomepageData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.getHomepageData.query();
      setHomepageData(data);
    } catch (error) {
      console.error('Failed to load homepage data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomepageData();
  }, [loadHomepageData]);

  // Search functionality
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const results = await trpc.searchArticles.query({
        query: query.trim(),
        language,
        category_id: selectedCategory ?? undefined,
        limit: 20,
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [language, selectedCategory]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  // Format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return language === 'zh' ? '刚刚' : 'just now';
    if (diffInSeconds < 3600) return language === 'zh' ? `${Math.floor(diffInSeconds / 60)}分钟前` : `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return language === 'zh' ? `${Math.floor(diffInSeconds / 3600)}小时前` : `${Math.floor(diffInSeconds / 3600)}h ago`;
    return language === 'zh' ? `${Math.floor(diffInSeconds / 86400)}天前` : `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Navigation icons (SVG components)
  const MenuIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );

  const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );

  const HomeIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );

  const BookmarkIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );

  const UserIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  // News card component with animations
  const NewsCard = ({ article, featured = false }: { article: NewsArticle; featured?: boolean }) => (
    <Card 
      className={`
        group cursor-pointer transition-all duration-300 ease-in-out
        hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]
        ${featured ? 'border-2 border-blue-200 dark:border-blue-800' : ''}
        animate-in slide-in-from-bottom-4 duration-500
      `}
      onClick={() => window.open(article.source_url, '_blank')}
    >
      {article.thumbnail_url && (
        <div className="relative overflow-hidden rounded-t-xl">
          <img
            src={article.thumbnail_url}
            alt={article.title}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {featured && (
            <Badge className="absolute top-2 right-2 bg-blue-600 text-white">
              {language === 'zh' ? '精选' : 'Featured'}
            </Badge>
          )}
        </div>
      )}
      
      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-2 text-base font-medium leading-tight group-hover:text-blue-600 transition-colors">
          {article.title}
        </CardTitle>
        {article.description && (
          <CardDescription className="line-clamp-2 text-sm">
            {article.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center">
              <span className="text-orange-500 mr-1">▲</span>
              {article.score}
            </span>
            <span>{article.comments_count} {language === 'zh' ? '评论' : 'comments'}</span>
          </div>
          <div className="text-right">
            {article.author && <div className="font-medium">{article.author}</div>}
            <div>{formatTimeAgo(article.published_at)}</div>
          </div>
        </div>

        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {article.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const articlesToDisplay = searchQuery ? searchResults : homepageData?.latest_articles || [];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Top Navigation */}
      <header className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled 
          ? 'bg-white/90 dark:bg-black/90 backdrop-blur-md shadow-lg' 
          : 'bg-white dark:bg-black'
        }
      `}>
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" className="md:hidden">
            <MenuIcon />
          </Button>
          
          <h1 className="text-xl font-bold tracking-tight">
            {language === 'zh' ? '科技新闻' : 'Tech News'}
          </h1>

          <div className="flex items-center space-x-2">
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              className="data-[state=checked]:bg-blue-600"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="text-sm font-medium"
            >
              {language === 'zh' ? 'EN' : '中'}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <SearchIcon />
            <Input
              placeholder={language === 'zh' ? '搜索新闻...' : 'Search news...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 dark:bg-gray-900 border-0 focus-visible:ring-1 focus-visible:ring-blue-500"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-20 px-4">
        {/* Featured Articles Carousel */}
        {!searchQuery && homepageData?.featured_articles && homepageData.featured_articles.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <span className="text-blue-600 mr-2">✨</span>
              {language === 'zh' ? '精选文章' : 'Featured Articles'}
            </h2>
            
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent>
                {homepageData.featured_articles.map((article) => (
                  <CarouselItem key={article.id} className="basis-[85%] md:basis-1/2 lg:basis-1/3">
                    <NewsCard article={article} featured={true} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-2 bg-white dark:bg-black border shadow-lg" />
              <CarouselNext className="-right-2 bg-white dark:bg-black border shadow-lg" />
            </Carousel>
          </section>
        )}

        {/* Category Filter */}
        {homepageData?.categories && (
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="whitespace-nowrap"
              >
                {language === 'zh' ? '全部' : 'All'}
              </Button>
              {homepageData.categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="whitespace-nowrap"
                >
                  {language === 'zh' ? category.name_zh || category.name : category.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results or Latest Articles */}
        <section>
          <h2 className="text-lg font-semibold mb-4">
            {searchQuery 
              ? `${language === 'zh' ? '搜索结果' : 'Search Results'} (${searchResults.length})`
              : language === 'zh' ? '最新新闻' : 'Latest News'
            }
          </h2>

          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">{language === 'zh' ? '搜索中...' : 'Searching...'}</span>
            </div>
          ) : articlesToDisplay.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery 
                ? language === 'zh' ? '未找到相关新闻' : 'No news found'
                : language === 'zh' ? '暂无新闻' : 'No news available'
              }
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {articlesToDisplay.map((article, index) => (
                <div 
                  key={article.id} 
                  className="animate-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <NewsCard article={article} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Load More Button */}
        {!searchQuery && articlesToDisplay.length > 0 && (
          <div className="flex justify-center mt-8">
            <Button
              variant="outline"
              className="px-8 py-2 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {language === 'zh' ? '加载更多' : 'Load More'}
            </Button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 z-50">
        <div className="flex items-center justify-around py-2">
          {[
            { icon: HomeIcon, label: language === 'zh' ? '首页' : 'Home', active: true },
            { icon: SearchIcon, label: language === 'zh' ? '搜索' : 'Search' },
            { icon: BookmarkIcon, label: language === 'zh' ? '收藏' : 'Saved' },
            { icon: UserIcon, label: language === 'zh' ? '我的' : 'Profile' }
          ].map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              className={`
                flex flex-col items-center space-y-1 px-3 py-2 transition-all duration-200
                ${item.active 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                }
                hover:scale-110 active:scale-95
              `}
            >
              <item.icon />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default App;