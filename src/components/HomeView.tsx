import React, { useState, useMemo } from 'react';
import {
  Search,
  Eye,
  Clock,
  MessageSquare,
  Sparkles,
  Calendar,
  Share2,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Github,
  MessageCircle,
  Send,
  Zap,
  TrendingUp,
  Tag,
  ArrowRight,
  CheckCircle,
  Bookmark,
  Bot,
  ShieldCheck,
  Radio,
  Newspaper,
  Check
} from 'lucide-react';
import { Article, SiteSettings, ActiveTab, BroadcastHistoryItem } from '../types/blog';
import { AuthorBadge } from './AuthorBadge';
import { SocialBroadcastModal } from './SocialBroadcastModal';
import { SmartAdBanner } from './SmartAdBanner';
import { HadaryCoinFollowWidget } from './HadaryCoinFollowWidget';
import { NewsTickerBar } from './NewsTickerBar';


interface HomeViewProps {
  articles: Article[];
  settings: SiteSettings;
  setActiveTab: (tab: ActiveTab) => void;
  onSelectArticle: (article: Article) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onBroadcastComplete?: (item: BroadcastHistoryItem) => void;
  onOpenChatBot?: (mode?: 'general' | 'negotiate') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  articles,
  settings,
  setActiveTab,
  onSelectArticle,
  selectedCategory,
  setSelectedCategory,
  onBroadcastComplete,
  onOpenChatBot,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'magazine'>('grid');
  const [broadcastArticle, setBroadcastArticle] = useState<Article | null>(null);
  const [copiedArticleId, setCopiedArticleId] = useState<string | null>(null);

  const handleQuickShare = (art: Article, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#article-${art.slug}`;
    if (navigator.share) {
      navigator.share({
        title: art.title,
        text: art.excerpt,
        url,
      }).catch(() => {});
      return;
    }
    navigator.clipboard.writeText(url).then(() => {
      setCopiedArticleId(art.id);
      setTimeout(() => setCopiedArticleId(null), 2500);
    }).catch(() => {});
  };

  const isAr = settings.language === 'ar';
  const social = settings.socialLinks;
  const broadcastConfig = settings.socialBroadcast;

  // Enforce the requirement: Articles per page is strictly clamped between 3 and 10
  const articlesPerPage = Math.max(3, Math.min(10, settings.articlesPerPage || 6));

  // Filter articles based on category and search query (sorted by publish date)
  const safeArticles = useMemo(() => Array.isArray(articles) ? articles : [], [articles]);

  const filteredArticles = useMemo(() => {
    return safeArticles
      .filter((art) => {
        if (!art) return false;
        const matchCat =
          selectedCategory === 'الكل' ||
          selectedCategory === 'All' ||
          art.category === selectedCategory;

        const title = (art.title || '').toLowerCase();
        const excerpt = (art.excerpt || '').toLowerCase();
        const tags = Array.isArray(art.tags) ? art.tags : [];
        const query = searchQuery.trim().toLowerCase();

        const matchSearch =
          !query ||
          title.includes(query) ||
          excerpt.includes(query) ||
          tags.some((t) => (t || '').toLowerCase().includes(query));

        return matchCat && matchSearch && (art.status === 'published' || !art.status);
      })
      .sort((a, b) => new Date(b?.publishedAt || 0).getTime() - new Date(a?.publishedAt || 0).getTime());
  }, [safeArticles, selectedCategory, searchQuery]);

  // Featured Hero Article (newest published article or top article)
  const heroArticle = filteredArticles[0] || safeArticles[0] || null;

  // Pagination calculation
  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedArticles = useMemo(() => {
    const start = (validCurrentPage - 1) * articlesPerPage;
    return filteredArticles.slice(start, start + articlesPerPage);
  }, [filteredArticles, validCurrentPage, articlesPerPage]);

  const categories = useMemo(() => {
    const set = new Set(safeArticles.map((a) => a?.category).filter(Boolean));
    return ['الكل', ...Array.from(set)];
  }, [safeArticles]);

  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    safeArticles.forEach((a) => {
      if (Array.isArray(a?.tags)) {
        a.tags.forEach((t) => {
          if (t) map.set(t, (map.get(t) || 0) + 1);
        });
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [safeArticles]);

  const trendingArticles = useMemo(() => {
    return [...safeArticles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 4);
  }, [safeArticles]);

  const newsArticles = useMemo(() => {
    return safeArticles
      .filter((a) => {
        if (!a) return false;
        const catMatch = a.category === 'أخبار الديكور والدهانات';
        const idMatch = typeof a.id === 'string' && a.id.startsWith('post-news-');
        const tagsMatch =
          Array.isArray(a.tags) &&
          a.tags.some((t) => typeof t === 'string' && (t.includes('أخبار') || t.includes('2026')));
        return catMatch || idMatch || tagsMatch;
      })
      .sort((a, b) => new Date(b?.publishedAt || 0).getTime() - new Date(a?.publishedAt || 0).getTime());
  }, [safeArticles]);

  return (
    <div className="space-y-8 pb-16">
      {/* Breaking News Ticker (الأخبار ومستجدات الديكور والدهانات) */}
      <NewsTickerBar
        articles={articles}
        isAr={isAr}
        onSelectArticle={onSelectArticle}
      />

      {/* Hero Section with Blog Description and Social Links */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-10 shadow-xl border border-slate-800">

        <div className="absolute top-0 end-0 -mt-16 -me-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 start-0 -mb-16 -ms-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* Hero Content */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30 max-w-full">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate sm:whitespace-normal">{isAr ? 'المنصة الرسمية لإبداعات الديكور والدهانات الحديثة' : 'Official Decor & Modern Paints Platform'}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              {isAr ? (
                <>
                  مدونة <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300">الفا للديكور والدهانات</span> | إشراف الحضرى محمود
                </>
              ) : (
                <>
                  Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300">Alpha Decor & Paints</span> Hub
                </>
              )}
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              {isAr ? settings.tagline : settings.taglineEn}
            </p>

            {/* Social Media Links Widget on the Homepage */}
            <div className="pt-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-2.5">
                {isAr ? 'تواصل معنا وتابع شبكاتنا الاجتماعية:' : 'Connect on Social Media:'}
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                {social.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-blue-600 text-white text-xs font-medium backdrop-blur-xs transition-colors"
                  >
                    <Facebook className="w-3.5 h-3.5" />
                    <span>Facebook</span>
                  </a>
                )}
                {social.twitter && (
                  <a
                    href={social.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-sky-500 text-white text-xs font-medium backdrop-blur-xs transition-colors"
                  >
                    <Twitter className="w-3.5 h-3.5" />
                    <span>X</span>
                  </a>
                )}
                {social.instagram && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-pink-600 text-white text-xs font-medium backdrop-blur-xs transition-colors"
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    <span>Instagram</span>
                  </a>
                )}
                {social.linkedin && (
                  <a
                    href={social.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-blue-700 text-white text-xs font-medium backdrop-blur-xs transition-colors"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {social.youtube && (
                  <a
                    href={social.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-red-600 text-white text-xs font-medium backdrop-blur-xs transition-colors"
                  >
                    <Youtube className="w-3.5 h-3.5" />
                    <span>YouTube</span>
                  </a>
                )}
                {social.github && (
                  <a
                    href={social.github}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-slate-700 text-white text-xs font-medium backdrop-blur-xs transition-colors"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>GitHub</span>
                  </a>
                )}
              </div>
            </div>

            {/* Quick action badges for visitors */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => (onOpenChatBot ? onOpenChatBot('negotiate') : setActiveTab('contact'))}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-emerald-400/30 text-center max-w-full"
              >
                <Bot className="w-4 h-4 animate-bounce shrink-0" />
                <span>{isAr ? '💼 طلب عمل والتفاوض على الأسعار مع المساعد الذكي' : 'Request Work & Price Negotiation'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('articles')}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm backdrop-blur-md transition-all cursor-pointer"
              >
                <span>{isAr ? 'تصفح كافة المقالات' : 'Browse Articles'}</span>
              </button>
            </div>

            {/* Official Animated Hadary Coin & Follow Blog Banner */}
            <div className="pt-2">
              <HadaryCoinFollowWidget variant="hero" ownerName={settings.authorName} isAr={isAr} />
            </div>
          </div>

          {/* Featured Article Card in Hero */}
          {heroArticle && (
            <div
              onClick={() => onSelectArticle(heroArticle)}
              className="lg:col-span-5 min-w-0 bg-white/10 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/15 hover:border-white/30 transition-all cursor-pointer group shadow-2xl"
            >
              <div className="relative aspect-16/10 rounded-xl overflow-hidden mb-4">
                <img
                  src={heroArticle.featuredImage}
                  alt={heroArticle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 start-3 px-2.5 py-1 rounded-md bg-blue-600/90 text-white text-xs font-bold backdrop-blur-xs">
                  {heroArticle.category}
                </span>
                <span className="absolute bottom-3 end-3 px-2.5 py-1 rounded-md bg-slate-950/80 text-slate-200 text-xs flex items-center gap-1 backdrop-blur-xs">
                  <Clock className="w-3 h-3" />
                  {heroArticle.readingTime} {isAr ? 'دقائق' : 'mins'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-blue-300">
                  <span className="font-bold text-white bg-blue-600/60 px-2.5 py-0.5 rounded-md border border-blue-400/30">
                    {isAr ? 'كاتب المقال هو الحضرى محمود (صاحب الموقع)' : 'Article Author: Al-Hadari Mahmoud (Site Owner)'}
                  </span>
                  <span>•</span>
                  <span>{new Date(heroArticle.publishedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                  {heroArticle.title}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2">
                  {heroArticle.excerpt}
                </p>
                <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    {heroArticle.views} {isAr ? 'مشاهدة' : 'views'}
                  </span>
                  <span className="text-blue-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 flex items-center gap-1 font-semibold transition-transform">
                    {isAr ? 'اقرأ المقال كاملاً' : 'Read Full Post'}
                    <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2026 Exclusive Decor & Paints News Section (قسم أحدث الأخبار والمستجدات الديكورية لعام 2026) */}
      {newsArticles.length > 0 && (
        <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/80 rounded-3xl p-4 sm:p-8 border border-indigo-500/20 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Light */}
          <div className="absolute top-0 end-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span className="text-xs uppercase tracking-widest font-black text-rose-400">
                  {isAr ? 'تغطية إخبارية حصرية ومباشرة 2026' : 'Live Breaking News 2026'}
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2.5">
                <Newspaper className="w-6 h-6 text-amber-400 shrink-0" />
                <span>{isAr ? 'أحدث أخبار وتقارير الديكور والدهانات' : 'Latest Decor & Paint Market News'}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                {isAr
                  ? 'أسعار خامات جوتن وسيبس، تحليلات التكلفة الحقيقية لتشطيب الشقق، وابتكارات الجير الصخري وبديل الرخام المضيء'
                  : 'Exclusive market pricing, real renovation costs, Limewash, and translucent backlit stone innovations.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('أخبار الديكور والدهانات');
                  setActiveTab('articles');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all hover:scale-105 cursor-pointer backdrop-blur-xs"
              >
                <span>{isAr ? 'عرض كل الأخبار' : 'All News'}</span>
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>

          {/* News Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            {newsArticles.slice(0, 4).map((news) => (
              <div
                key={news.id}
                onClick={() => onSelectArticle(news)}
                className="group bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 hover:border-amber-400/50 transition-all flex flex-col justify-between cursor-pointer space-y-3 shadow-lg"
              >
                <div className="space-y-3">
                  {/* Thumbnail with overlay tags */}
                  <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-slate-800">
                    <img
                      src={news.featuredImage}
                      alt={news.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-2 start-2 px-2 py-0.5 rounded-md bg-rose-600/90 text-white text-[10px] font-black tracking-wide shadow-xs">
                      {isAr ? 'تقرير 2026' : 'Report 2026'}
                    </span>
                    <span className="absolute bottom-2 end-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-slate-200 text-[10px] flex items-center gap-1 backdrop-blur-xs">
                      <Clock className="w-2.5 h-2.5" />
                      {news.readingTime} {isAr ? 'د' : 'min'}
                    </span>
                  </div>

                  {/* Date & Author */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {new Date(news.publishedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                    </span>
                    <span className="text-amber-300 font-semibold text-[10px]">
                      {settings.authorName || 'الحضرى محمود'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                    {news.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {news.excerpt}
                  </p>
                </div>

                {/* Actions: Read & Quick Share */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
                  <span className="text-blue-400 group-hover:text-blue-300 font-bold flex items-center gap-1">
                    <span>{isAr ? 'قراءة الخبر' : 'Read'}</span>
                    <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleQuickShare(news, e)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-blue-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
                    title={isAr ? 'إرسال ومشاركة الخبر عبر الرابط أو واتساب' : 'Share & send news'}
                  >
                    {copiedArticleId === news.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Content Layout (Articles Grid + WordPress Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Feed Column */}
        <main className="lg:col-span-8 space-y-6 min-w-0">
          {/* Filter Bar: Categories, Search, Layout & Articles per page indicator */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={isAr ? 'ابحث في مقالات الفا للديكور والدهانات (دهانات الحوائط، بديل الرخام، بديل الخشب)...' : 'Search Alpha Decor & Paints articles...'}
                className="w-full text-sm ps-10 pe-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {isAr ? 'مسح' : 'Clear'}
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Header Feed Info with Article per Page Rule */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span>
                  {isAr
                    ? `عرض صفحة ${validCurrentPage} من ${totalPages} (${filteredArticles.length} مقال إجمالي)`
                    : `Page ${validCurrentPage} of ${totalPages} (${filteredArticles.length} total articles)`}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {isAr
                    ? `${articlesPerPage} مقالات بالصفحة (محددة بين 3 و 10)`
                    : `${articlesPerPage} posts/page (set to 3-10)`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('settings')}
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title={isAr ? 'تغيير عدد مقالات الصفحة من الإعدادات' : 'Configure articles per page'}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تعديل الإعدادات' : 'Settings'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Articles Feed */}
          {paginatedArticles.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isAr ? 'لا توجد مقالات مطابقة لبحثك' : 'No articles match your search'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {isAr
                  ? 'جرب البحث بكلمات أخرى أو اختر تصنيفاً آخر، أو استخدم صانع المقالات الذكي لكتابة مقال جديد.'
                  : 'Try adjusting your search query or create a new article using the AI Smart Creator.'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('الكل');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors"
              >
                {isAr ? 'عرض جميع المقالات' : 'View all articles'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paginatedArticles.map((article) => (
                <article
                  key={article.id}
                  onClick={() => onSelectArticle(article)}
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-16/10 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={article.featuredImage}
                      alt={article.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 start-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-md bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white text-xs font-semibold backdrop-blur-xs shadow-xs">
                        {article.category}
                      </span>
                      {article.isAutoPublished && (
                        <span className="px-2 py-0.8 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                          <Zap className="w-3 h-3" />
                          24h
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 end-3 px-2 py-1 rounded bg-slate-950/75 text-white text-[11px] font-medium backdrop-blur-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{article.readingTime} {isAr ? 'دقيقة' : 'min'}</span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(article.publishedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                      </div>

                      <h2 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                        {article.title}
                      </h2>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {article.excerpt}
                      </p>
                    </div>

                    {/* Footer / Author & Meta & Share */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <AuthorBadge
                        name={article.author?.name || settings.authorName || 'الحضرى محمود'}
                        avatar={article.author?.avatar}
                        size="sm"
                        showAuthorLabel={true}
                        prefix={isAr ? 'كاتب المقال هو:' : 'Article Author:'}
                      />

                      <div className="flex items-center gap-2">
                        {/* Social Share Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBroadcastArticle(article);
                          }}
                          className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/60 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title={isAr ? 'مشاركة رابط المقال' : 'Share Article Link'}
                        >
                          <Share2 className="w-3 h-3 text-blue-600" />
                          <span className="hidden sm:inline">{isAr ? 'مشاركة' : 'Share'}</span>
                        </button>

                        <div className="flex items-center gap-2 ms-1">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-slate-400" />
                            {article.views || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-slate-400" />
                            {Array.isArray(article.comments) ? article.comments.length : 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* WordPress Pagination (Strictly bounded by settings 3 to 10 articles) */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                {isAr
                  ? `عرض المقالات ${((validCurrentPage - 1) * articlesPerPage) + 1} - ${Math.min(validCurrentPage * articlesPerPage, filteredArticles.length)} من أصل ${filteredArticles.length}`
                  : `Showing ${((validCurrentPage - 1) * articlesPerPage) + 1} - ${Math.min(validCurrentPage * articlesPerPage, filteredArticles.length)} of ${filteredArticles.length} posts`}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                  <span>{isAr ? 'السابق' : 'Prev'}</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => {
                  const isCurrent = num === validCurrentPage;
                  return (
                    <button
                      key={num}
                      onClick={() => setCurrentPage(num)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>{isAr ? 'التالي' : 'Next'}</span>
                  <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </button>
              </div>
            </div>
          )}
        </main>

        {/* WordPress Sidebar */}
        <aside className="lg:col-span-4 space-y-6 min-w-0">
          {/* Animated 3D Coin Badge & Follow Blog Widget (إشراف الحضرى محمود) */}
          <HadaryCoinFollowWidget variant="card" ownerName={settings.authorName} isAr={isAr} />

          {/* 1. Blog Owner / Author Card with Social Links */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-4">
            <div className="flex justify-center">
              <AuthorBadge
                name={settings.authorName}
                avatar=""
                size="xl"
                showRole={false}
              />
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {settings.authorName}
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {isAr ? 'مؤسس وصاحب مدونة الفا للديكور والدهانات' : 'Founder & Owner of Alpha Decor & Paints'}
              </p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {settings.authorBio}
            </p>

            {/* Owner Author Verification Badge */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-slate-800 dark:to-blue-950/40 border border-blue-200 dark:border-blue-900 text-start space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'كاتب المقالات وصاحب الموقع:' : 'Article Author & Site Owner:'}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {isAr ? 'موثق ومعتمد' : 'Verified'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {isAr
                  ? `جميع مقالات المدونة تُكتب وتُنشر بإشراف كامل من «${settings.authorName || 'الحضرى محمود'}» لتقديم خبرات واقعية في الدهانات والتشطيبات الحديثة.`
                  : `All blog articles are authored and published under the direct leadership of ${settings.authorName || 'Al-Hadari Mahmoud'}.`}
              </p>
            </div>

            {/* Social Media Links Widget on the Homepage Sidebar */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                {isAr ? 'تابع حساباتي الشخصية والرسمية:' : 'Follow My Channels:'}
              </span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {social.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-800 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-colors"
                    title="Facebook"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {social.twitter && (
                  <a
                    href={social.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-slate-800 hover:bg-sky-500 text-sky-500 hover:text-white flex items-center justify-center transition-colors"
                    title="X (Twitter)"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {social.instagram && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-slate-800 hover:bg-pink-600 text-pink-600 hover:text-white flex items-center justify-center transition-colors"
                    title="Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {social.linkedin && (
                  <a
                    href={social.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-800 hover:bg-blue-700 text-blue-700 hover:text-white flex items-center justify-center transition-colors"
                    title="LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {social.youtube && (
                  <a
                    href={social.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-red-50 dark:bg-slate-800 hover:bg-red-600 text-red-600 hover:text-white flex items-center justify-center transition-colors"
                    title="YouTube"
                  >
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
                {social.github && (
                  <a
                    href={social.github}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-900 text-slate-800 dark:text-slate-200 hover:text-white flex items-center justify-center transition-colors"
                    title="GitHub"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                )}
                {social.whatsapp && (
                  <a
                    href={social.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-slate-800 hover:bg-emerald-600 text-emerald-600 hover:text-white flex items-center justify-center transition-colors"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
                {social.telegram && (
                  <a
                    href={social.telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-slate-800 hover:bg-sky-600 text-sky-600 hover:text-white flex items-center justify-center transition-colors"
                    title="Telegram"
                  >
                    <Send className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 2. Blog Owner Services & Consultations Card */}
          <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-blue-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-blue-200">
                <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                {isAr ? 'استشارات الديكور والتشطيبات' : 'Decor & Finishing Consultations'}
              </span>
              <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30">
                {isAr ? 'صاحب الموقع' : 'Owner'}
              </span>
            </div>

            <p className="text-xs text-blue-100/90 leading-relaxed">
              {isAr
                ? `يقدم استشاري التشطيبات «${settings.authorName || 'الحضرى محمود'}» استشارات فنية متخصصة في تنسيق ألوان دهانات الحوائط، بديل الخشب والرخام، والأسقف المعلقة.`
                : `Decor and finishings consultations curated by ${settings.authorName || 'Al-Hadari Mahmoud'}.`}
            </p>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => setActiveTab('contact')}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>{isAr ? `تواصل مع كاتب المقالات (${settings.authorName || 'الحضرى محمود'})` : 'Contact Author'}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>
          </div>

          {/* Ad Slot 2: Sidebar Smart Ad Banner (الثاني على جانب الموقع) */}
          {settings.ads?.enabled && settings.ads.sidebar?.enabled && (
            <SmartAdBanner
              config={settings.ads.sidebar}
              placement="sidebar"
              isAr={isAr}
            />
          )}

          {/* 3. Trending Articles List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              {isAr ? 'المقالات الأكثر قراءة وتفاعلاً' : 'Trending Articles'}
            </h3>

            <div className="space-y-3">
              {trendingArticles.map((art, index) => (
                <div
                  key={art.id}
                  onClick={() => onSelectArticle(art)}
                  className="flex items-center gap-3 group cursor-pointer"
                >
                  <span className="font-black text-xl text-slate-300 dark:text-slate-700 group-hover:text-blue-600 w-5 text-center">
                    0{index + 1}
                  </span>
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                    <img
                      src={art.featuredImage}
                      alt={art.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 leading-snug">
                      {art.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                      <Eye className="w-3 h-3" />
                      {art.views} {isAr ? 'مشاهدة' : 'views'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Tag Cloud */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Tag className="w-4 h-4 text-indigo-500" />
              {isAr ? 'سحابة الكلمات المفتاحية والوسوم' : 'Popular Tags'}
            </h3>

            <div className="flex flex-wrap gap-1.5">
              {allTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSearchQuery(tag);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-xs transition-colors flex items-center gap-1"
                >
                  <span>#{tag}</span>
                  <span className="text-[10px] text-slate-400">({count})</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Ad Slot 5: Page Bottom Smart Ad Banner (الخامس أسفل المقال أو الصفحات) */}
      {settings.ads?.enabled && settings.ads.articleBottom?.enabled && (
        <div className="pt-4">
          <SmartAdBanner
            config={settings.ads.articleBottom}
            placement="articleBottom"
            isAr={isAr}
          />
        </div>
      )}

      {/* Social Broadcast Modal (Triggered by Bot or User on any article) */}
      {broadcastArticle && (
        <SocialBroadcastModal
          isOpen={Boolean(broadcastArticle)}
          onClose={() => setBroadcastArticle(null)}
          article={broadcastArticle}
          settings={settings}
          onBroadcastComplete={(item) => {
            if (onBroadcastComplete) {
              onBroadcastComplete(item);
            }
          }}
        />
      )}
    </div>
  );
};
