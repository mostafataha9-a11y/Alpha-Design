import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Clock,
  Eye,
  Heart,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Grid,
  List,
  Calendar,
  Share2,
  Home
} from 'lucide-react';
import { Article, SiteSettings } from '../types/blog';
import { AuthorBadge } from './AuthorBadge';
import { SmartAdBanner } from './SmartAdBanner';
import { SubpageBreadcrumb } from './SubpageBreadcrumb';

interface ArticlesViewProps {
  articles: Article[];
  settings: SiteSettings;
  categories: string[];
  onSelectArticle: (article: Article) => void;
  onOpenShareModal: (article: Article) => void;
  onNavigateHome?: () => void;
}

export const ArticlesView: React.FC<ArticlesViewProps> = ({
  articles,
  settings,
  categories,
  onSelectArticle,
  onOpenShareModal,
  onNavigateHome,
}) => {
  const isAr = settings.language === 'ar';
  const authorName = settings.authorName || 'الحضرى محمود';


  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [sortBy, setSortBy] = useState<'latest' | 'views' | 'likes'>('latest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter & Sort
  const filteredArticles = useMemo(() => {
    const safeArticlesList = Array.isArray(articles) ? articles : [];
    let result = safeArticlesList.filter((a) => a && (a.status === 'published' || !a.status));

    // Category filter
    if (selectedCategory !== 'الكل' && selectedCategory !== 'All') {
      if (selectedCategory === 'أحدث الأخبار والمستجدات' || selectedCategory === 'أخبار الديكور والدهانات') {
        result = result.filter(
          (a) =>
            a.category === 'أحدث الأخبار والمستجدات' ||
            a.category === 'أخبار الديكور والدهانات' ||
            (typeof a.id === 'string' && a.id.startsWith('post-news-')) ||
            (Array.isArray(a.tags) && a.tags.some((t) => typeof t === 'string' && (t.includes('أخبار') || t.includes('2026'))))
        );
      } else {
        result = result.filter((a) => a.category === selectedCategory);
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          (a.title || '').toLowerCase().includes(q) ||
          (a.excerpt || '').toLowerCase().includes(q) ||
          (a.category || '').toLowerCase().includes(q) ||
          (Array.isArray(a.tags) && a.tags.some((t) => typeof t === 'string' && t.toLowerCase().includes(q)))
      );
    }

    // Sort
    if (sortBy === 'latest') {
      result.sort((a, b) => new Date(b?.publishedAt || 0).getTime() - new Date(a?.publishedAt || 0).getTime());
    } else if (sortBy === 'views') {
      result.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sortBy === 'likes') {
      result.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }

    return result;
  }, [articles, selectedCategory, searchQuery, sortBy]);

  // Strict pagination from settings (between 3 and 10)
  const pageSize = Math.max(3, Math.min(10, settings.articlesPerPage || 6));
  const totalPages = Math.ceil(filteredArticles.length / pageSize) || 1;

  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredArticles.slice(start, start + pageSize);
  }, [filteredArticles, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Interactive Breadcrumb Navigation: Homepage > Articles & News */}
      <SubpageBreadcrumb
        isAr={isAr}
        currentPageTitle={isAr ? 'أرشيف المقالات والأخبار' : 'Articles & News Archive'}
        onNavigateHome={onNavigateHome || (() => window.location.hash = '')}
      />

      {/* Page Title & Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-12 border border-indigo-900/40 relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold backdrop-blur-sm border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{isAr ? 'أرشيف المقالات والمستجدات الإخبارية' : 'Articles & News Archive'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black">
            {isAr ? 'مقالات وأخبار الفا للديكور والدهانات' : 'Alpha Decor & Paints Articles'}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {isAr
              ? `مكتبة متكاملة من الدروس العملية وأخبار الأسواق في دهانات الحوائط، بديل الخشب والرخام، وتنسيق الألوان بإشراف خبير التشطيبات «${authorName}».`
              : `A curated collection of modern paint guides, marble/wood alternatives, and decor news led by ${authorName}.`}
          </p>

          {onNavigateHome && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>{isAr ? 'الرجوع للصفحة الرئيسية' : 'Back to Home'}</span>
              </button>
            </div>
          )}
        </div>
      </div>


      {/* Controls Bar: Search, Category, Sorting, View Toggle */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={isAr ? 'ابحث في العناوين، الكلمات المفتاحية، أو المحتوى...' : 'Search articles, tags, or content...'}
              className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Sort & View Mode */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'latest' | 'views' | 'likes')}
                className="bg-transparent border-none focus:outline-none font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="latest">{isAr ? 'الأحدث نشراً' : 'Latest'}</option>
                <option value="views">{isAr ? 'الأكثر مشاهدة' : 'Most Viewed'}</option>
                <option value="likes">{isAr ? 'الأعلى إعجاباً' : 'Most Liked'}</option>
              </select>
            </div>

            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title={isAr ? 'عرض شبكي' : 'Grid View'}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title={isAr ? 'عرض قائمة' : 'List View'}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-2 border-t border-slate-100 dark:border-slate-800">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count & Per Page Notice */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          {isAr
            ? `عرض ${paginatedArticles.length} من إجمالي ${filteredArticles.length} مقال`
            : `Showing ${paginatedArticles.length} of ${filteredArticles.length} articles`}
        </span>
        <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg font-medium">
          {isAr ? `${pageSize} مقالات في الصفحة (محددة في الإعدادات)` : `${pageSize} posts per page`}
        </span>
      </div>

      {/* Articles Feed */}
      {paginatedArticles.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">
            {isAr ? 'لم يتم العثور على مقالات مطابقة' : 'No articles match your query'}
          </h3>
          <p className="text-xs text-slate-500">
            {isAr ? 'جرب البحث بكلمات أخرى أو اختر تصنيفاً مختلفاً' : 'Try searching for other terms or select another category'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedArticles.map((article) => (
            <article
              key={article.id}
              className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
            >
              <div
                onClick={() => onSelectArticle(article)}
                className="relative h-48 overflow-hidden cursor-pointer"
              >
                <img
                  src={article.featuredImage}
                  alt={article.title}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('photo-1618221195710')) {
                      target.src = 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80';
                    }
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 start-3 px-2.5 py-1 rounded-full bg-slate-900/75 backdrop-blur-md text-white text-[11px] font-bold">
                  {article.category}
                </span>
                {article.isAutoPublished && (
                  <span className="absolute top-3 end-3 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-2.5 h-2.5" />
                    24h AI
                  </span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(article.publishedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{article.readingTime} {isAr ? 'دقائق' : 'min'}</span>
                  </div>

                  <h3
                    onClick={() => onSelectArticle(article)}
                    className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2 cursor-pointer leading-snug"
                  >
                    {article.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <AuthorBadge
                    name={article.author?.name || authorName}
                    size="sm"
                    showAuthorLabel={true}
                    prefix={isAr ? 'كاتب المقال هو:' : 'Author:'}
                    role={article.author?.role}
                  />

                  <div className="flex items-center gap-2 text-slate-400">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenShareModal(article);
                      }}
                      className="p-1.5 rounded-lg hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                      title={isAr ? 'مشاركة رابط المقال' : 'Share link'}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="flex items-center gap-1 text-[11px]">
                      <Eye className="w-3 h-3" />
                      {article.views}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* List Mode */
        <div className="space-y-4">
          {paginatedArticles.map((article) => (
            <article
              key={article.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all flex flex-col sm:flex-row gap-5 items-center group"
            >
              <div
                onClick={() => onSelectArticle(article)}
                className="w-full sm:w-52 h-40 rounded-2xl overflow-hidden shrink-0 cursor-pointer relative"
              >
                <img
                  src={article.featuredImage}
                  alt={article.title}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('photo-1618221195710')) {
                      target.src = 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80';
                    }
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-2 start-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-[10px] font-bold">
                  {article.category}
                </span>
              </div>

              <div className="flex-1 space-y-2.5 w-full">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(article.publishedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                  <span>•</span>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{article.readingTime} {isAr ? 'دقائق' : 'min'}</span>
                </div>

                <h3
                  onClick={() => onSelectArticle(article)}
                  className="font-bold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors cursor-pointer leading-snug"
                >
                  {article.title}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {article.excerpt}
                </p>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <AuthorBadge
                    name={article.author?.name || authorName}
                    size="sm"
                    showAuthorLabel={true}
                    prefix={isAr ? 'كاتب المقال هو:' : 'Author:'}
                    role={article.author?.role}
                  />

                  <div className="flex items-center gap-3 text-slate-400">
                    <button
                      onClick={() => onOpenShareModal(article)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1.5 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'مشاركة المقال' : 'Share Article'}</span>
                    </button>
                    <span className="flex items-center gap-1 text-xs">
                      <Eye className="w-3.5 h-3.5" />
                      {article.views}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentPage === pageNum
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Bottom Return To Homepage Card */}
      {onNavigateHome && (
        <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            {isAr ? 'العودة إلى الصفحة الرئيسية وتصفح أحدث الأخبار والديكورات' : 'Return to Home Page'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isAr
              ? `يمكنك الرجوع في أي وقت للصفحة الرئيسية للوصول لكافة الخدمات واستشارات «${authorName}».`
              : 'Return anytime to explore all featured guides and services.'}
          </p>
          <button
            type="button"
            onClick={onNavigateHome}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{isAr ? 'العودة للصفحة الرئيسية' : 'Back to Home'}</span>
          </button>
        </div>
      )}

      {/* Ad Slot 5: Page Bottom Smart Ad Banner (الخامس أسفل المقال أو الصفحات) */}
      {settings.ads?.enabled && settings.ads.articleBottom?.enabled && (
        <div className="pt-4">
          <SmartAdBanner
            config={settings.ads.articleBottom}
            placement="articleBottom"
            isAr={settings.language === 'ar'}
          />
        </div>
      )}

    </div>
  );
};
