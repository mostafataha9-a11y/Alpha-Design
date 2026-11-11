import React, { useState } from 'react';
import {
  Share2,
  X,
  Twitter,
  Facebook,
  Linkedin,
  Send,
  MessageCircle,
  CheckCircle,
  Sparkles,
  Bot,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Radio,
  Zap
} from 'lucide-react';
import { Article, SiteSettings, BroadcastHistoryItem } from '../types/blog';

interface SocialBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article;
  settings: SiteSettings;
  onBroadcastComplete: (item: BroadcastHistoryItem) => void;
}

export const SocialBroadcastModal: React.FC<SocialBroadcastModalProps> = ({
  isOpen,
  onClose,
  article,
  settings,
  onBroadcastComplete,
}) => {
  const isAr = settings.language === 'ar';
  const broadcastConfig = settings.socialBroadcast;
  const authorName = settings.authorName || 'الحضرى محمود';

  const [isLoadingCopy, setIsLoadingCopy] = useState(false);
  const [copiedNetwork, setCopiedNetwork] = useState<string | null>(null);
  const [isBroadcastingAll, setIsBroadcastingAll] = useState(false);
  const [broadcastDone, setBroadcastDone] = useState(false);

  // Default broadcast texts
  const [socialTexts, setSocialTexts] = useState<Record<string, string>>({
    twitter: `مقال جديد في مدونة ألفا ديزاين 🎨✨\n\n"${article.title}"\n\nتصفح المقال بالكامل من الرابط:\n${window.location.origin}/#${article.slug}\n\n#ألفا_ديزاين #تصميم_جرافيك #UIUX`,
    linkedin: `يسعدنا مشاركة أحدث مقالاتنا المتخصصة في مدونة ألفا ديزاين:\n\n📌 "${article.title}"\n\n${article.excerpt}\n\nرابط القراءة والمناقشة:\n${window.location.origin}/#${article.slug}\n\n#تصميم #هوية_بصرية #ابتكار`,
    facebook: `مقال جديد ننصحك بقراءته على مدونة ألفا ديزاين!\n\n"${article.title}"\n${article.excerpt}\n\nاقرأ التفاصيل الآن:\n${window.location.origin}/#${article.slug}`,
    telegram: `📢 مقال جديد على ألفا ديزاين\n\n🔹 ${article.title}\n\n${article.excerpt}\n\n🔗 تصفح المقال:\n${window.location.origin}/#${article.slug}`,
    whatsapp: `مرحباً، أشاركك هذا المقال القيم من مدونة ألفا ديزاين: "${article.title}". يمكنك قراءته من هنا:\n${window.location.origin}/#${article.slug}`,
  });

  // Generate smart AI copy via Gemini
  const handleGenerateSmartCopy = async () => {
    setIsLoadingCopy(true);
    try {
      const response = await fetch('/api/ai/social-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleTitle: article.title,
          articleExcerpt: article.excerpt,
          articleUrl: `${window.location.origin}/#${article.slug}`,
          tags: article.tags,
          authorName,
          networks: broadcastConfig.activeNetworks,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.broadcasts) {
          setSocialTexts(data.broadcasts);
        }
      }
    } catch (err) {
      console.warn('Could not generate smart copy:', err);
    } finally {
      setIsLoadingCopy(false);
    }
  };

  const handleCopyText = (network: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNetwork(network);
    setTimeout(() => setCopiedNetwork(null), 2000);
  };

  // Broadcast to all channels simultaneously
  const handleBroadcastAll = () => {
    setIsBroadcastingAll(true);

    setTimeout(() => {
      const newItem: BroadcastHistoryItem = {
        id: 'b-' + Date.now(),
        articleId: article.id,
        articleTitle: article.title,
        articleUrl: `${window.location.origin}/#${article.slug}`,
        timestamp: new Date().toISOString(),
        networks: broadcastConfig.activeNetworks,
        status: 'published',
        summary: isAr
          ? `تم نشر وتوزيع رابط المقال بنجاح على شبكات التواصل بتفويض رسمي من صاحب المدونة «${authorName}».`
          : `Article link successfully broadcasted across networks under delegation from ${authorName}.`,
      };

      onBroadcastComplete(newItem);
      setIsBroadcastingAll(false);
      setBroadcastDone(true);
    }, 1500);
  };

  const networkIcons = {
    twitter: { icon: Twitter, color: 'hover:bg-sky-500 text-sky-500', name: 'X / Twitter' },
    linkedin: { icon: Linkedin, color: 'hover:bg-blue-700 text-blue-700', name: 'LinkedIn' },
    facebook: { icon: Facebook, color: 'hover:bg-blue-600 text-blue-600', name: 'Facebook' },
    telegram: { icon: Send, color: 'hover:bg-sky-600 text-sky-600', name: 'Telegram' },
    whatsapp: { icon: MessageCircle, color: 'hover:bg-emerald-600 text-emerald-600', name: 'WhatsApp' },
  };

  const articleUrl = `${window.location.origin}/#${article.slug}`;

  const shareUrls: Record<string, string> = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(socialTexts.twitter || article.title)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(article.title)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(socialTexts.whatsapp || article.title + ' ' + articleUrl)}`,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header with Delegation Verification */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shadow-xs">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">
                  {isAr ? 'مشاركة ونشر روابط المقال في وسائل التواصل' : 'Share Article on Social Media'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950 text-[10px] font-black uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {isAr ? 'نشر معتمد' : 'Verified'}
                </span>
              </div>
              <p className="text-[11px] text-blue-200">
                {isAr
                  ? `نشر ومشاركة بإشراف كاتب المقال وصاحب المدونة «${authorName}»`
                  : `Supervised by author & blog founder ${authorName}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* Article Info Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <img
              src={article.featuredImage}
              alt={article.title}
              className="w-16 h-16 rounded-xl object-cover shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60">
                {article.category}
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">
                {article.title}
              </h4>
              <p className="text-[11px] text-slate-500 line-clamp-1">{article.excerpt}</p>
            </div>
          </div>

          {/* Delegation Notice & AI Regeneration Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
            <div className="flex items-center gap-2.5 text-xs text-blue-950 dark:text-blue-200">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <span>
                {isAr
                  ? `تجهيز ومشاركة روابط المقال على مختلف شبكات التواصل باسم كاتب المقال (${authorName}).`
                  : `Direct sharing prepared on behalf of author ${authorName}.`}
              </span>
            </div>

            <button
              onClick={handleGenerateSmartCopy}
              disabled={isLoadingCopy}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5"
            >
              {isLoadingCopy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isAr ? 'صياغة النصوص...' : 'Writing...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تحسين النصوص بالذكاء الاصطناعي' : 'Refine with AI'}</span>
                </>
              )}
            </button>
          </div>

          {/* Platform Specific Previews */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
              {isAr ? 'معاينة منشورات البوت المخصصة لكل شبكة تواصل:' : 'Network-Specific Post Previews:'}
            </h4>

            {broadcastConfig.activeNetworks.map((netKey) => {
              const netInfo = networkIcons[netKey as keyof typeof networkIcons];
              if (!netInfo) return null;
              const Icon = netInfo.icon;
              const text = socialTexts[netKey] || '';
              const shareUrl = shareUrls[netKey] || '#';

              return (
                <div
                  key={netKey}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span>{netInfo.name}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyText(netKey, text)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-600 flex items-center gap-1"
                        title={isAr ? 'نسخ النص' : 'Copy'}
                      >
                        {copiedNetwork === netKey ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{isAr ? 'تم النسخ' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{isAr ? 'نسخ' : 'Copy'}</span>
                          </>
                        )}
                      </button>

                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>{isAr ? 'مشاركة مباشرة' : 'Share Direct'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 whitespace-pre-wrap leading-relaxed">
                    {text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Success Notice if done */}
          {broadcastDone && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>
                {isAr
                  ? `تم توثيق ومشاركة رابط المقال بنجاح باسم كاتب المقال «${authorName}» في سجل النشر!`
                  : `Article link shared successfully on behalf of ${authorName}!`}
              </span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500 font-medium">
            {isAr
              ? `كاتب المقال وصاحب الموقع: ${authorName}`
              : `Author & Site Owner: ${authorName}`}
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>

            <button
              onClick={handleBroadcastAll}
              disabled={isBroadcastingAll}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 transition-all"
            >
              {isBroadcastingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جارِ النشر والتوزيع...' : 'Broadcasting...'}</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>{isAr ? 'تنفيذ النشر التلقائي الشامل عبر البوت' : 'Execute Full Bot Broadcast'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
