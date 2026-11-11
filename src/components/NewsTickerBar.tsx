import React, { useState, useEffect } from 'react';
import { Newspaper, Sparkles, ChevronRight, ChevronLeft, Flame, ArrowRight, ArrowLeft } from 'lucide-react';
import { Article } from '../types/blog';

interface NewsTickerBarProps {
  articles: Article[];
  isAr: boolean;
  onSelectArticle: (article: Article) => void;
  onNavigateHome?: () => void;
}

export const NewsTickerBar: React.FC<NewsTickerBarProps> = ({
  articles,
  isAr,
  onSelectArticle,
  onNavigateHome,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter published articles to show in news ticker
  const newsItems = articles.slice(0, 6);

  useEffect(() => {
    if (newsItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % newsItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [newsItems.length]);

  if (newsItems.length === 0) return null;

  const currentArticle = newsItems[currentIndex] || newsItems[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % newsItems.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + newsItems.length) % newsItems.length);
  };

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-2.5 sm:p-3 border border-blue-800/60 shadow-md flex items-center justify-between gap-3 overflow-hidden">
      {/* News Badge */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-600 text-white text-[11px] font-black uppercase tracking-wider shadow-xs shadow-rose-600/30 animate-pulse">
          <Flame className="w-3.5 h-3.5 fill-white text-white" />
          <span>{isAr ? 'أحدث الأخبار' : 'Latest News'}</span>
        </span>
        <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-blue-200/80 font-medium">
          <Newspaper className="w-3.5 h-3.5 text-blue-400" />
          <span>{isAr ? 'مستجدات الديكور والدهانات:' : 'Decor Updates:'}</span>
        </span>
      </div>

      {/* Rotating News Headline */}
      <div
        onClick={() => onSelectArticle(currentArticle)}
        className="flex-1 min-w-0 cursor-pointer group flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-100 hover:text-amber-300 transition-colors"
      >
        <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] shrink-0 border border-blue-400/30 hidden sm:inline-block">
          {currentArticle.category}
        </span>
        <span className="line-clamp-1 truncate">
          {currentArticle.title}
        </span>
        <span className="text-[10px] text-slate-400 shrink-0 hidden lg:inline">
          ({new Date(currentArticle.publishedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')})
        </span>
      </div>

      {/* Navigation arrows & Home link */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handlePrev}
          aria-label={isAr ? 'الخبر السابق' : 'Previous news'}
          className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          {isAr ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        <span className="text-[10px] text-slate-400 px-1 hidden sm:inline font-mono">
          {currentIndex + 1}/{newsItems.length}
        </span>

        <button
          type="button"
          onClick={handleNext}
          aria-label={isAr ? 'الخبر التالي' : 'Next news'}
          className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          {isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {onNavigateHome && (
          <button
            type="button"
            onClick={onNavigateHome}
            className="ms-1.5 hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-bold transition-colors cursor-pointer"
          >
            <span>{isAr ? 'الرئيسية' : 'Home'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
