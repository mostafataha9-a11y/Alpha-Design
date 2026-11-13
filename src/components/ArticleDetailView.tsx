import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Eye,
  Calendar,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  Copy,
  Check,
  Heart,
  Volume2,
  VolumeX,
  Sparkles,
  MessageSquare,
  Send,
  User,
  Zap,
  Bookmark,
  Bot,
  ShieldCheck,
  MapPin,
  ExternalLink,
  Home,
  CheckCircle2
} from 'lucide-react';
import { Article, Comment, SiteSettings, BroadcastHistoryItem } from '../types/blog';
import { AuthorBadge } from './AuthorBadge';
import { SocialBroadcastModal } from './SocialBroadcastModal';
import { SmartAdBanner } from './SmartAdBanner';
import { HadaryCoinFollowWidget } from './HadaryCoinFollowWidget';
import { parseInlineDecorText } from './InteractiveArticleRenderer';
import { SubpageBreadcrumb } from './SubpageBreadcrumb';


interface ArticleDetailViewProps {
  article: Article;
  settings: SiteSettings;
  onBack: () => void;
  onSelectArticle: (article: Article) => void;
  allArticles: Article[];
  onAddComment: (articleId: string, comment: Comment) => void;
  onLikeArticle: (articleId: string) => void;
  onBroadcastComplete?: (item: BroadcastHistoryItem) => void;
}

export const ArticleDetailView: React.FC<ArticleDetailViewProps> = ({
  article,
  settings,
  onBack,
  onSelectArticle,
  allArticles,
  onAddComment,
  onLikeArticle,
  onBroadcastComplete,
}) => {
  const isAr = settings.language === 'ar';
  const social = settings.socialLinks;

  if (!article) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-slate-500">{isAr ? 'المقال غير متوفر أو جاري تحميله...' : 'Article not found or loading...'}</p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm"
        >
          {isAr ? 'العودة للرئيسية' : 'Back to Home'}
        </button>
      </div>
    );
  }

  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [realViews, setRealViews] = useState<number>(article.views || 0);

  // Track real article view in database upon visit
  useEffect(() => {
    if (!article?.id) return;
    fetch(`/api/db/articles/${article.id}/view`, { method: 'POST' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.views === 'number') {
          setRealViews(data.views);
        }
      })
      .catch(() => {});
  }, [article?.id]);

  // New comment form
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [hasLiked, setHasLiked] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Text-To-Speech reader
  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this environment');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      window.speechSynthesis.cancel();
      const plainText = article.title + '. ' + article.excerpt + '. ' + article.content.replace(/[#*`!\[\]\(\)]/g, ' ');
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.lang = isAr ? 'ar-SA' : 'en-US';
      utterance.rate = 1.0;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  const handleLike = () => {
    if (!hasLiked) {
      onLikeArticle(article.id);
      setHasLiked(true);
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentAuthor.trim() || !commentContent.trim()) return;

    const newComment: Comment = {
      id: 'c-' + Date.now(),
      author: commentAuthor.trim(),
      avatar: `https://images.unsplash.com/photo-${1534528741775 + (Math.floor(Math.random() * 100))}?auto=format&fit=crop&w=150&q=80`,
      content: commentContent.trim(),
      createdAt: isAr ? 'الآن' : 'Just now',
      likes: 0,
    };

    onAddComment(article.id, newComment);
    setCommentAuthor('');
    setCommentContent('');
    setCommentSuccess(true);
    setTimeout(() => setCommentSuccess(false), 4000);
  };


  // Related articles (same category, different id)
  const relatedArticles = allArticles
    .filter((a) => a.id !== article.id && a.category === article.category)
    .slice(0, 3);

  // Render markdown content safely with headings, styled blockquotes, and embedded image figures
  const renderFormattedContent = (rawText: string) => {
    const lines = rawText.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Image detection: ![caption](url)
      const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        const caption = imgMatch[1];
        const url = imgMatch[2];
        elements.push(
          <figure key={idx} className="my-8 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
            <img
              src={url}
              alt={caption || article.title}
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('photo-1618221195710')) {
                  target.src = 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80';
                }
              }}
              className="w-full max-h-[500px] object-cover"
            />
            {caption && (
              <figcaption className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 italic">
                {caption}
              </figcaption>
            )}
          </figure>
        );
        return;
      }

      // Italic caption standalone: *text*
      if (trimmed.startsWith('*') && trimmed.endsWith('*') && trimmed.length > 2) {
        elements.push(
          <p key={idx} className="text-center text-xs text-slate-500 dark:text-slate-400 italic mb-4">
            {trimmed.slice(1, -1)}
          </p>
        );
        return;
      }

      // H1 / Title inside content (Royal Indigo / Blue Gradient)
      if (trimmed.startsWith('# ')) {
        elements.push(
          <h2 key={idx} className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 dark:from-blue-400 dark:via-indigo-300 dark:to-sky-400 mt-9 mb-4 leading-snug">
            {trimmed.slice(2)}
          </h2>
        );
        return;
      }

      // H2 Heading (Emerald Forest with Accent Border and Soft Pill Background)
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h3 key={idx} className="text-xl sm:text-2xl font-bold text-emerald-900 dark:text-emerald-300 mt-8 mb-3.5 border-s-4 border-emerald-600 dark:border-emerald-500 ps-3.5 bg-emerald-50/70 dark:bg-emerald-950/25 py-2 rounded-e-2xl shadow-xs">
            {trimmed.slice(3)}
          </h3>
        );
        return;
      }

      // H3 Heading (Warm Amber / Terracotta Accent)
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={idx} className="text-lg sm:text-xl font-bold text-amber-800 dark:text-amber-300 mt-6 mb-2.5 border-s-2 border-amber-500 ps-2.5">
            {trimmed.slice(4)}
          </h4>
        );
        return;
      }

      // Blockquote
      if (trimmed.startsWith('> ')) {
        elements.push(
          <blockquote key={idx} className="my-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/50 dark:from-blue-950/40 dark:to-slate-900 border-s-4 border-blue-600 text-sm sm:text-base italic text-slate-800 dark:text-slate-200">
            {parseInlineDecorText(trimmed.slice(2), isAr)}
          </blockquote>
        );
        return;
      }

      // Bullet List
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(
          <li key={idx} className="ms-6 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed list-disc my-1.5">
            {parseInlineDecorText(trimmed.slice(2), isAr)}
          </li>
        );
        return;
      }

      // Numbered List
      const numMatch = trimmed.match(/^\d+\.\s+(.*)$/);
      if (numMatch) {
        elements.push(
          <li key={idx} className="ms-6 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed list-decimal my-1.5">
            {parseInlineDecorText(numMatch[1], isAr)}
          </li>
        );
        return;
      }

      // Regular Paragraph with Inline Decor Parsing & Interactive Hover Tooltips
      if (trimmed.length > 0) {
        elements.push(
          <p key={idx} className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed my-3 font-normal">
            {parseInlineDecorText(trimmed, isAr)}
          </p>
        );
      }
    });

    // Ad Slot 4: Mid-Article Smart Ad Banner (الرابع في منتصف المقالات)
    if (elements.length > 3 && settings.ads?.enabled && settings.ads.articleMiddle?.enabled) {
      const midIndex = Math.floor(elements.length / 2);
      elements.splice(
        midIndex,
        0,
        <div key="ad-slot-middle" className="my-6">
          <SmartAdBanner
            config={settings.ads.articleMiddle}
            placement="articleMiddle"
            isAr={isAr}
          />
        </div>
      );
    }

    return elements;
  };

  return (
    <article className="max-w-4xl mx-auto space-y-8 pb-20 min-w-0 w-full">
      {/* 1. Interactive Breadcrumb: Homepage > Category > Article Title */}
      <SubpageBreadcrumb
        isAr={isAr}
        currentPageTitle={article.title}
        categoryTitle={article.category}
        onNavigateHome={onBack}
        onNavigateArticles={onBack}
      />

      {/* 2. Top Navigation Bar with Return to Homepage & Quick Tools */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>{isAr ? 'العودة للصفحة الرئيسية' : 'Back to Home'}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* TTS Screen Reader for the Blind Button */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-blind-screen-reader'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/50 hover:bg-amber-500/25 transition-all cursor-pointer shadow-xs"
            title={isAr ? 'قارئ الشاشة للمكفوفين مع وصف الصور والألوان' : 'Blind Screen Reader & Visuals'}
          >
            <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span>{isAr ? 'قارئ المكفوفين ووصف الصور' : 'Blind Reader & Visuals'}</span>
          </button>


          {/* Like Button */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              hasLiked
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-rose-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{article.likes + (hasLiked ? 1 : 0)}</span>
          </button>
        </div>
      </div>

      {/* Article Header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-xs">
            {article.category}
          </span>
          {article.isAutoPublished && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs">
              <Zap className="w-3.5 h-3.5" />
              {isAr ? 'نشر آلي 24h' : '24h Auto-Published'}
            </span>
          )}
          {(article.rewrittenByAi || article.seoScore) && (
            <span className="px-2.5 py-1 rounded-lg bg-indigo-600/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isAr ? `معايير السيو (SEO ${article.seoScore || 97}%)` : `SEO (${article.seoScore || 97}%)`}</span>
            </span>
          )}
          {article.adSenseCompliant && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
              <span>{isAr ? 'متوافق مع معايير AdSense' : 'AdSense Compliant'}</span>
            </span>
          )}
          {article.focusKeyword && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
              {isAr ? `الكلمة المفتاحية: ${article.focusKeyword}` : `Focus: ${article.focusKeyword}`}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-tight">
          {article.title}
        </h1>

        <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal border-s-4 border-blue-500 ps-4 italic">
          {article.excerpt}
        </p>

        {/* Author Byline & Meta */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <AuthorBadge
            name={article?.author?.name || (article as any)?.authorName || settings?.authorName || 'الحضرى محمود'}
            avatar={article?.author?.avatar || ''}
            size="md"
            showRole={true}
            showAuthorLabel={true}
            prefix={isAr ? 'كاتب المقال هو:' : 'Article Author:'}
            role={article?.author?.role || (article as any)?.authorRole || 'استشاري الديكور والتشطيبات'}
          />

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(article.publishedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {article.readingTime} {isAr ? 'دقائق قراءة' : 'min read'}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {realViews} {isAr ? 'مشاهدة' : 'views'}
            </span>
          </div>
        </div>
      </header>

      {/* Featured Hero Image */}
      <div className="relative aspect-16/9 rounded-3xl overflow-hidden bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
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
          className="w-full h-full object-cover"
        />
      </div>

      {/* Article Body Content */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Ad Slot 3: Article Top Smart Ad Banner (الثالث في أول المقالات) */}
        {settings.ads?.enabled && settings.ads.articleTop?.enabled && (
          <div className="pb-6">
            <SmartAdBanner
              config={settings.ads.articleTop}
              placement="articleTop"
              isAr={isAr}
            />
          </div>
        )}

        <div className="space-y-4 break-words">
          {renderFormattedContent(article.content)}
        </div>

        {/* Tags */}
        <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400">{isAr ? 'الوسوم:' : 'Tags:'}</span>
          {(Array.isArray(article.tags) ? article.tags : []).map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Share Bar */}
        <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-blue-600" />
            {isAr ? 'شارك المقال مع أصدقائك:' : 'Share this article:'}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-500 hover:text-white transition-colors"
              title="Share on X"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white transition-colors"
              title="Share on Facebook"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-700 hover:text-white transition-colors"
              title="Share on LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(article.title + ' ' + window.location.href)}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white transition-colors"
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 text-xs"
              title="Copy Link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Dedicated Share Button */}
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all sm:ms-2"
              title={isAr ? 'مشاركة رابط المقال' : 'Share Article Link'}
            >
              <Share2 className="w-3.5 h-3.5 text-white" />
              <span>{isAr ? 'مشاركة المقال' : 'Share Article'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ad Slot 5: Article Bottom Smart Ad Banner (الخامس أسفل المقال أو الصفحات) */}
      {settings.ads?.enabled && settings.ads.articleBottom?.enabled && (
        <div className="py-2">
          <SmartAdBanner
            config={settings.ads.articleBottom}
            placement="articleBottom"
            isAr={isAr}
          />
        </div>
      )}

      {/* Google Maps Location Context (E-E-A-T & Geographic Consultation Card) */}
      {article.googleMapsLocation && (
        <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-slate-900 dark:to-blue-950/40 rounded-3xl p-6 sm:p-7 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  {isAr ? 'نطاق المعاينة والموقع الجغرافي المعتمد' : 'Field Inspection & Map Location'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
                  Google Maps
                </span>
              </div>
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {article.googleMapsLocation.fullAddress || article.googleMapsLocation.area || article.googleMapsLocation.city}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                {isAr
                  ? 'موقع تنفيذ وتطبيق تشطيبات الديكور والدهانات المذكورة في هذا المقال، ومتاح طلب معاينة هندسية ميدانية مع الحضرى محمود.'
                  : 'Site location for decor consultations and engineering inspections.'}
              </p>
            </div>
          </div>

          {article.googleMapsLocation.mapUrl && (
            <a
              href={article.googleMapsLocation.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isAr ? 'عرض الموقع على خرائط Google' : 'View on Google Maps'}</span>
            </a>
          )}
        </div>
      )}

      {/* Author Bio Box */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <AuthorBadge
          name={settings.authorName}
          avatar=""
          size="xl"
          showRole={false}
        />
        <div className="space-y-2 text-center sm:text-start flex-1">
          <span className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
            {isAr ? 'عن كاتب المقال وصاحب المدونة' : 'About the Article Author & Blog Founder'}
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {settings.authorName}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
            {settings.authorBio}
          </p>
        </div>
      </div>

      {/* Official Animated Hadary Coin & Follow Blog Widget */}
      <HadaryCoinFollowWidget variant="hero" ownerName={settings.authorName} isAr={isAr} />

      {/* Interactive Comments Section */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-xs space-y-8">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <span>{isAr ? 'التعليقات والمناقشات' : 'Comments & Discussion'}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {Array.isArray(article.comments) ? article.comments.length : 0}
            </span>
          </h3>
        </div>

        {/* Existing Comments List */}
        {!Array.isArray(article.comments) || article.comments.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            {isAr ? 'كن أول من يعلق على هذا المقال ويشارك برأيه!' : 'Be the first to share your feedback!'}
          </div>
        ) : (
          <div className="space-y-4">
            {article.comments.map((comment) => (
              <div
                key={comment.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-start gap-3"
              >
                <img
                  src={comment.avatar}
                  alt={comment.author}
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {comment.author}
                    </span>
                    <span className="text-[11px] text-slate-400">{comment.createdAt}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Comment Form */}
        <form onSubmit={handleSubmitComment} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            {isAr ? 'أضف تعليقك الآن' : 'Leave a Comment'}
          </h4>

          {commentSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{isAr ? 'تم حفظ وإضافة تعليقك بنجاح! شكراً لمشاركتك القيّمة في النقاش.' : 'Comment saved and published successfully!'}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              required
              value={commentAuthor}
              onChange={(e) => setCommentAuthor(e.target.value)}
              placeholder={isAr ? 'اسمك الكريم...' : 'Your name...'}
              className="text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <textarea
            required
            rows={3}
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder={isAr ? 'اكتب رأيك أو استفسارك حول المقال...' : 'Write your comment or thoughts...'}
            className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isAr ? 'إرسال وحفظ التعليق' : 'Post & Save Comment'}</span>
          </button>
        </form>
      </section>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="space-y-4 pt-6">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            {isAr ? 'مقالات ذات صلة قد تهمك' : 'Related Articles'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {relatedArticles.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectArticle(rel)}
                className="group bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 shadow-xs cursor-pointer space-y-3 transition-all"
              >
                <div className="aspect-16/10 rounded-xl overflow-hidden bg-slate-900">
                  <img
                    src={rel.featuredImage}
                    alt={rel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 line-clamp-2 leading-snug">
                  {rel.title}
                </h4>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {rel.readingTime} {isAr ? 'دقائق' : 'mins'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom Return To Home Navigation Card */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white text-center space-y-4 border border-indigo-900/50 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/30 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
          <Home className="w-6 h-6" />
        </div>
        <h3 className="text-xl sm:text-2xl font-black">
          {isAr ? 'استكشف المزيد من أحدث مقالات وأخبار الديكور' : 'Explore More Decor & Paints Articles'}
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
          {isAr
            ? `تفضل بالرجوع إلى الصفحة الرئيسية لاستعراض كافة أقسام الدهانات وبديل الرخام وبديل الخشب بإشراف خبير التشطيبات «${settings.authorName || 'الحضرى محمود'}».`
            : 'Return to the home page to discover all articles, tips, and modern finishings guides.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>{isAr ? 'العودة إلى الصفحة الرئيسية للمدونة' : 'Back to Home Page'}</span>
          </button>
        </div>
      </section>


      {/* Social Broadcast Modal under delegation */}
      {isBroadcastModalOpen && (
        <SocialBroadcastModal
          isOpen={isBroadcastModalOpen}
          onClose={() => setIsBroadcastModalOpen(false)}
          article={article}
          settings={settings}
          onBroadcastComplete={(item) => {
            if (onBroadcastComplete) {
              onBroadcastComplete(item);
            }
          }}
        />
      )}
    </article>
  );
};
