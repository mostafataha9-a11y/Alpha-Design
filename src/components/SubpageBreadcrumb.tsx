import React, { useState } from 'react';
import { Home, ChevronLeft, ChevronRight, Share2, Check, Newspaper, Send, ArrowRight, ArrowLeft } from 'lucide-react';

interface SubpageBreadcrumbProps {
  isAr: boolean;
  currentPageTitle: string;
  categoryTitle?: string;
  onNavigateHome: () => void;
  onNavigateArticles?: () => void;
  shareTitle?: string;
}

export const SubpageBreadcrumb: React.FC<SubpageBreadcrumbProps> = ({
  isAr,
  currentPageTitle,
  categoryTitle,
  onNavigateHome,
  onNavigateArticles,
  shareTitle,
}) => {
  const [copied, setCopied] = useState(false);
  const Chevron = isAr ? ChevronLeft : ChevronRight;

  const handleShare = async () => {
    const url = window.location.href;
    const title = shareTitle || currentPageTitle;
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: isAr ? `${title} - مدونة ألفا للديكور والدهانات` : title,
          url,
        });
        return;
      } catch (_) {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (_) {
      // In case clipboard fails
    }
  };

  return (
    <nav
      aria-label="مسار التصفح والتنقل"
      className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-3 text-xs"
    >
      {/* Breadcrumb Trail */}
      <ol className="flex items-center flex-wrap gap-1.5 text-slate-500 dark:text-slate-400">
        <li className="inline-flex items-center">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors cursor-pointer bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200/60 dark:border-blue-900/40"
            title={isAr ? 'الانتقال المباشر إلى الصفحة الرئيسية' : 'Go directly to Home'}
          >
            <Home className="w-3.5 h-3.5" />
            <span>{isAr ? 'الصفحة الرئيسية' : 'Home'}</span>
          </button>
        </li>

        <li>
          <Chevron className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
        </li>

        {categoryTitle && onNavigateArticles && (
          <>
            <li className="inline-flex items-center">
              <button
                type="button"
                onClick={onNavigateArticles}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium cursor-pointer"
              >
                {categoryTitle}
              </button>
            </li>
            <li>
              <Chevron className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
            </li>
          </>
        )}

        <li className="font-bold text-slate-900 dark:text-white line-clamp-1 max-w-[200px] sm:max-w-md">
          {currentPageTitle}
        </li>
      </ol>

      {/* Quick Action Buttons: Share/Send + News + Return to Home */}
      <div className="flex items-center flex-wrap gap-2">
        {/* Quick Send/Share Button */}
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
          title={isAr ? 'إرسال ومشاركة رابط هذه الصفحة' : 'Share & send this page'}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {isAr ? 'تم نسخ الرابط!' : 'Link Copied!'}
              </span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-blue-500" />
              <span>{isAr ? 'إرسال ومشاركة' : 'Share'}</span>
            </>
          )}
        </button>

        {onNavigateArticles && (
          <button
            type="button"
            onClick={onNavigateArticles}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
          >
            <Newspaper className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isAr ? 'الأخبار والمقالات' : 'News & Articles'}</span>
          </button>
        )}

        {/* Back to Home Button */}
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          <span>{isAr ? 'العودة للصفحة الرئيسية' : 'Back to Home'}</span>
        </button>
      </div>
    </nav>
  );
};

