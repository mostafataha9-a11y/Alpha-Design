import React, { useState, useEffect } from 'react';
import {
  Bot,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Radio,
  Zap,
  Play,
  Pause,
  RefreshCw,
  Send,
  MessageCircle,
  Share2,
  Sparkles,
  Lock,
  Globe,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Sliders,
  Filter,
  Eye
} from 'lucide-react';
import {
  Article,
  SiteSettings,
  DecorSocialTargetChannel,
  SocialDispatchLogItem,
  DecorPlatform
} from '../types/blog';
import { fetchWithAuth } from '../utils/apiAuth';

interface SocialPublishingBotDashboardProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => void;
  articles: Article[];
  onViewArticle?: (article: Article) => void;
}

export const SocialPublishingBotDashboard: React.FC<SocialPublishingBotDashboardProps> = ({
  settings,
  onUpdateSettings,
  articles,
  onViewArticle,
}) => {
  const isAr = settings.language === 'ar';
  const ownerName = settings.authorName || 'الحضرى محمود';

  // Bot configuration from settings with fallbacks
  const botConfig = settings.socialPublishingBot || {
    enabled: true,
    intervalMinutes: 30,
    maxArticleAgeHours: 24,
    lastDispatchAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    nextDispatchAt: new Date(Date.now() + 1000 * 60 * 12).toISOString(),
    privacyComplianceRules: {
      antiSpamEnforced: true,
      checkTermsBeforePost: true,
      customDecorIntro: true,
      includeDecorHashtags: true,
    },
    targetChannels: [],
    dispatchHistory: [],
  };

  const [channels, setChannels] = useState<DecorSocialTargetChannel[]>(botConfig.targetChannels || []);
  const [logs, setLogs] = useState<SocialDispatchLogItem[]>(botConfig.dispatchHistory || []);
  const [isBotEnabled, setIsBotEnabled] = useState<boolean>(botConfig.enabled);
  const [nextDispatchAt, setNextDispatchAt] = useState<string>(botConfig.nextDispatchAt);
  const [lastDispatchAt, setLastDispatchAt] = useState<string>(botConfig.lastDispatchAt);

  // Countdown timer state
  const [countdownMinutes, setCountdownMinutes] = useState(11);
  const [countdownSeconds, setCountdownSeconds] = useState(45);

  // Channel form state
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [newChannelPlatform, setNewChannelPlatform] = useState<DecorPlatform>('facebook');
  const [newChannelType, setNewChannelType] = useState<'group' | 'page' | 'channel' | 'account' | 'community'>('group');
  const [newChannelSpecialization, setNewChannelSpecialization] = useState('دهانات الحوائط والديكورات العصرية');
  const [hasPermissionChecked, setHasPermissionChecked] = useState(true);
  const [formError, setFormError] = useState('');

  // Selected article for manual instant test dispatch
  const [selectedArticleId, setSelectedArticleId] = useState<string>(articles[0]?.id || '');
  const [isDispatchingNow, setIsDispatchingNow] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{ type: 'success' | 'error'; message: string; log?: any } | null>(null);

  // Platform filter
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Fetch live bot status from backend on mount
  useEffect(() => {
    fetch('/api/social-bot/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.botState) {
          setIsBotEnabled(data.botState.enabled);
          if (data.botState.channels && data.botState.channels.length > 0) {
            setChannels(data.botState.channels);
          }
          if (data.botState.nextDispatchAt) {
            setNextDispatchAt(data.botState.nextDispatchAt);
          }
          if (data.botState.lastDispatchAt) {
            setLastDispatchAt(data.botState.lastDispatchAt);
          }
          if (data.botState.history && data.botState.history.length > 0) {
            setLogs(data.botState.history);
          }
        }
      })
      .catch((err) => console.warn('Could not fetch bot state:', err));
  }, []);

  // Countdown calculation to next 30-min distribution
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isBotEnabled) {
        setCountdownMinutes(30);
        setCountdownSeconds(0);
        return;
      }

      const target = new Date(nextDispatchAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, target - now);

      const mins = Math.floor(diff / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdownMinutes(mins);
      setCountdownSeconds(secs);

      // If timer hits zero, trigger auto-sync
      if (diff === 0 && isBotEnabled) {
        setNextDispatchAt(new Date(Date.now() + 30 * 60 * 1000).toISOString());
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextDispatchAt, isBotEnabled]);

  // Toggle master bot
  const handleToggleBot = async () => {
    const newState = !isBotEnabled;
    setIsBotEnabled(newState);
    try {
      const res = await fetchWithAuth('/api/social-bot/toggle', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setNextDispatchAt(data.nextDispatchAt);
      }
    } catch (err) {
      console.warn('Bot toggle error:', err);
    }

    // Sync to site settings
    onUpdateSettings({
      ...settings,
      socialPublishingBot: {
        ...botConfig,
        enabled: newState,
        targetChannels: channels,
        dispatchHistory: logs,
      },
    });
  };

  // Add new channel uploaded by owner
  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) {
      setFormError(isAr ? 'يرجى إدخال اسم الصفحة أو الجروب المتخصص.' : 'Please enter channel/group name.');
      return;
    }
    if (!newChannelUrl.trim()) {
      setFormError(isAr ? 'يرجى إدخال رابط الصفحة أو الجروب.' : 'Please enter channel/group URL.');
      return;
    }
    if (!hasPermissionChecked) {
      setFormError(isAr ? 'يجب تأكيد امتلاك إذن النشر والتسجيل في هذه الصفحة/الجروب.' : 'Please confirm posting permissions.');
      return;
    }

    setFormError('');

    try {
      const res = await fetchWithAuth('/api/social-bot/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChannelName.trim(),
          url: newChannelUrl.trim(),
          platform: newChannelPlatform,
          channelType: newChannelType,
          specialization: newChannelSpecialization.trim(),
          hasPostingPermission: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.channel) {
        const updated = [data.channel, ...channels];
        setChannels(updated);
        setIsAddingChannel(false);
        setNewChannelName('');
        setNewChannelUrl('');
        setFormError('');

        onUpdateSettings({
          ...settings,
          socialPublishingBot: {
            ...botConfig,
            targetChannels: updated,
            dispatchHistory: logs,
          },
        });
      } else {
        setFormError(data.error || 'حدث خطأ أثناء الإضافة');
      }
    } catch (err) {
      setFormError('تعذر الاتصال بالخادم.');
    }
  };

  // Delete channel
  const handleDeleteChannel = async (id: string) => {
    try {
      await fetchWithAuth(`/api/social-bot/channels/${id}`, { method: 'DELETE' });
      const updated = channels.filter((c) => c.id !== id);
      setChannels(updated);
      onUpdateSettings({
        ...settings,
        socialPublishingBot: {
          ...botConfig,
          targetChannels: updated,
          dispatchHistory: logs,
        },
      });
    } catch (err) {
      console.warn('Delete channel error:', err);
    }
  };

  // Toggle single channel
  const handleToggleChannel = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/social-bot/channels/${id}/toggle`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        const updated = channels.map((c) => (c.id === id ? { ...c, status: data.status } : c));
        setChannels(updated);
        onUpdateSettings({
          ...settings,
          socialPublishingBot: {
            ...botConfig,
            targetChannels: updated,
            dispatchHistory: logs,
          },
        });
      }
    } catch (err) {
      console.warn('Toggle channel error:', err);
    }
  };

  // Trigger manual 30-min dispatch now
  const handleTriggerDispatchNow = async () => {
    const articleToDispatch = articles.find((a) => a.id === selectedArticleId) || articles[0];
    if (!articleToDispatch) return;

    setIsDispatchingNow(true);
    setDispatchResult(null);

    try {
      const res = await fetchWithAuth('/api/social-bot/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article: articleToDispatch,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setDispatchResult({
          type: 'success',
          message: data.message,
          log: data.dispatchLog,
        });
        if (data.dispatchLog) {
          const updatedLogs = [data.dispatchLog, ...logs];
          setLogs(updatedLogs);
          if (data.nextDispatchAt) {
            setNextDispatchAt(data.nextDispatchAt);
          }
          setLastDispatchAt(new Date().toISOString());

          // Update posts count on channel
          if (data.channel) {
            setChannels((prev) => prev.map((c) => (c.id === data.channel.id ? data.channel : c)));
          }

          onUpdateSettings({
            ...settings,
            socialPublishingBot: {
              ...botConfig,
              targetChannels: channels,
              dispatchHistory: updatedLogs,
              lastDispatchAt: new Date().toISOString(),
              nextDispatchAt: data.nextDispatchAt || botConfig.nextDispatchAt,
            },
          });
        }
      } else {
        setDispatchResult({
          type: 'error',
          message: data.message || data.error || 'تعذر النشر.',
          log: data.log,
        });
        if (data.log) {
          setLogs((prev) => [data.log, ...prev]);
        }
      }
    } catch (err) {
      setDispatchResult({
        type: 'error',
        message: 'فشل الاتصال بخادم البوت.',
      });
    } finally {
      setIsDispatchingNow(false);
    }
  };

  const handleCopyLogSnippet = (logId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLogId(logId);
    setTimeout(() => setCopiedLogId(null), 2500);
  };

  // Filter channels
  const filteredChannels = channels.filter((c) => {
    if (platformFilter === 'all') return true;
    return c.platform === platformFilter;
  });

  // Calculate article freshness for UI
  const getArticleFreshness = (art: Article) => {
    const now = Date.now();
    const pub = new Date(art.publishedAt).getTime();
    const ageHours = (now - pub) / (1000 * 60 * 60);
    const isEligible = ageHours <= 24;
    const remainingHours = Math.max(0, 24 - ageHours);
    return {
      ageHours: Number(ageHours.toFixed(1)),
      isEligible,
      remainingHours: Number(remainingHours.toFixed(1)),
    };
  };

  const getPlatformBadge = (platform: DecorPlatform) => {
    switch (platform) {
      case 'facebook':
        return { label: 'فيسبوك (Facebook)', bg: 'bg-blue-600 text-white', icon: Share2 };
      case 'telegram':
        return { label: 'تليجرام (Telegram)', bg: 'bg-sky-500 text-white', icon: Send };
      case 'whatsapp':
        return { label: 'واتساب (WhatsApp)', bg: 'bg-emerald-600 text-white', icon: MessageCircle };
      case 'pinterest':
        return { label: 'بنترست (Pinterest)', bg: 'bg-red-600 text-white', icon: Globe };
      case 'twitter':
        return { label: 'إكس (X / Twitter)', bg: 'bg-slate-900 dark:bg-slate-700 text-white', icon: Radio };
      case 'linkedin':
        return { label: 'لينكدإن (LinkedIn)', bg: 'bg-blue-700 text-white', icon: Share2 };
      default:
        return { label: 'منصة تواصل', bg: 'bg-slate-600 text-white', icon: Globe };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Master Status */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <Bot className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>{isAr ? 'نظام بوت النشر الذكي لوسائل التواصل' : 'Social Auto-Publishing Bot'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              <span>{isAr ? 'دورة كل 30 دقيقة على مدار 24 ساعة' : '30-Min Interval (24h Window)'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isAr ? 'متابعة وبث روابط المقالات في صفحات الديكور والدهانات' : 'Decor & Paint Social Link Distribution Engine'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isAr
                ? `يقوم هذا البوت بمتابعة ونشر روابط المقالات تلقائياً في الصفحات والجروبات المتخصصة في أعمال الدهانات والديكور التي يرفعها صاحب المدونة «${ownerName}» عبر الحسابات المصرح بها، مع فحص الخصوصية والالتزام بقاعدة الـ 24 ساعة.`
                : `Automated bot distributing article links across specialized painting and decor communities uploaded by the blog owner with strict 24-hour freshness checks.`}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                {isAr ? 'مراجعة شروط الخصوصية ومكافحة الحظر مفعلة' : 'Privacy & Anti-Ban Active'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                {isAr ? 'قاعدة الـ 24 ساعة الصارمة لكل مقال' : 'Strict 24h Window Per Article'}
              </span>
            </div>
          </div>

          {/* Right Controller: Master Switch + 30-min Countdown */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col items-center gap-4 bg-slate-950/70 backdrop-blur-md p-5 rounded-2xl border border-indigo-500/30">
            {/* Master Toggle */}
            <div className="flex items-center justify-between w-full gap-4">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-300 block">
                  {isAr ? 'حالة البوت العام:' : 'Bot Status:'}
                </span>
                <span className={`text-xs font-black ${isBotEnabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {isBotEnabled ? (isAr ? '● يعمل وينشر دورياً' : '● Active & Publishing') : (isAr ? '○ متوقف مؤقتاً' : '○ Paused')}
                </span>
              </div>

              <button
                onClick={handleToggleBot}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isBotEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isBotEnabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Countdown Box */}
            <div className="w-full bg-indigo-950/60 rounded-xl p-3 border border-indigo-500/20 text-center">
              <div className="text-[11px] text-indigo-300 font-bold mb-1 flex items-center justify-center gap-1">
                <RefreshCw className={`w-3 h-3 ${isBotEnabled ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'الوقت حتى دورة البث التالية (30 دقيقة):' : 'Next 30-Min Broadcast in:'}</span>
              </div>
              <div className="text-2xl font-black font-mono tracking-wider text-amber-300">
                {String(countdownMinutes).padStart(2, '0')}:{String(countdownSeconds).padStart(2, '0')}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {isAr ? 'دورة نصف ساعة مستمرة على مدار 24 ساعة' : 'Every 30 minutes over 24 hours'}
              </div>
            </div>

            {/* Manual Test Dispatch Button */}
            <button
              onClick={handleTriggerDispatchNow}
              disabled={isDispatchingNow}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>{isDispatchingNow ? (isAr ? 'جارِ فحص الشروط والنشر...' : 'Checking & Dispatching...') : (isAr ? 'تنفيذ دورة الـ 30 دقيقة الآن' : 'Trigger 30-Min Cycle Now')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Manual Dispatch Feedback Banner if triggered */}
      {dispatchResult && (
        <div
          className={`p-4 rounded-2xl border transition-all ${
            dispatchResult.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {dispatchResult.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1 text-xs">
              <p className="font-bold">{dispatchResult.message}</p>
              {dispatchResult.log?.postSnippet && (
                <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-800 font-sans text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap mt-2">
                  <div className="font-bold text-[11px] text-slate-500 mb-1 flex items-center justify-between">
                    <span>مقتطف المنشور المرسل:</span>
                    <button
                      onClick={() => handleCopyLogSnippet(dispatchResult.log.id, dispatchResult.log.postSnippet)}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedLogId === dispatchResult.log.id ? 'تم النسخ!' : 'نسخ النص'}</span>
                    </button>
                  </div>
                  {dispatchResult.log.postSnippet}
                </div>
              )}
            </div>
            <button
              onClick={() => setDispatchResult(null)}
              className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Strict Rules & Freshness Policy Cards (The 24h & Privacy Framework) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: The 24-Hour Strict Rule */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-black text-sm text-slate-900 dark:text-white">
            {isAr ? 'قاعدة الـ 24 ساعة الصارمة للمقال' : 'Strict 24-Hour Freshness Gate'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'لا يتم نشر أي مقال مر على تاريخ نشره أكثر من 24 ساعة. بمجرد انتهاء الـ 24 ساعة، يتم استبعاد المقال تلقائياً من دورة البث الدوري لمنع التكرار وحماية حسابات المالك من خوارزميات الحظر.'
              : 'Articles older than 24 hours are strictly excluded from subsequent broadcast cycles.'}
          </p>
        </div>

        {/* Card 2: 30-Minute Periodic Interval */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-black text-sm text-slate-900 dark:text-white">
            {isAr ? 'دورة كل 30 دقيقة على مدار اليوم' : '30-Minute Steady Interval'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'ينشر البوت منشوراً واحداً كل نصف ساعة بالتناوب بين الصفحات والجروبات المسجلة، لضمان تغطية متوازنة وتدفق زيارات مستمر على مدار الـ 24 ساعة بدون أي إزعاج.'
              : 'Distributes one link every 30 minutes in rotation between registered channels for steady traffic.'}
          </p>
        </div>

        {/* Card 3: Privacy & Anti-Spam Compliance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-black text-sm text-slate-900 dark:text-white">
            {isAr ? 'فحص شروط الخصوصية وصلاحية النشر' : 'Privacy & Community Standards'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'النشر مقيد حصرياً في وسائل التواصل التي يمتلك فيها صاحب المدونة إذن النشر وحساباً مسجلاً، مع مراجعة شروط خصوصية كل منصة وصياغة نص راقٍ خالٍ من العبارات التضليلية.'
              : 'Posts only to authorized groups and pages where the owner holds valid accounts and permissions.'}
          </p>
        </div>
      </div>

      {/* 3. Section: Upload & Register Specialized Decor Pages / Groups */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {isAr ? 'الصفحات والجروبات المتخصصة في الدهانات والديكور' : 'Registered Specialized Decor & Paint Channels'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isAr
                ? 'الروابط التي يرفعها صاحب المدونة للجروبات والقنوات التي يمتلك إذن النشر فيها ومسجل فيها بحساباته.'
                : 'Specialized decor pages, groups, and channels uploaded by the owner where posting permission exists.'}
            </p>
          </div>

          <button
            onClick={() => setIsAddingChannel(!isAddingChannel)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingChannel ? (isAr ? 'إغلاق النموذج' : 'Close Form') : (isAr ? 'رفع وإضافة رابط جديد' : 'Add New Link')}</span>
          </button>
        </div>

        {/* Add Channel Form */}
        {isAddingChannel && (
          <form
            onSubmit={handleAddChannel}
            className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200"
          >
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>{isAr ? 'بيانات الصفحة / الجروب المتخصص للدهانات والديكور' : 'New Specialized Channel Details'}</span>
            </h4>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'اسم الصفحة أو الجروب المتخصص:' : 'Channel / Group Name:'}
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder={isAr ? 'مثال: جروب مهندسي ومصممي الديكور والدهانات' : 'e.g., Interior Paints & Decor Experts'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'رابط الصفحة / الجروب على السوشيال ميديا:' : 'Channel / Group URL:'}
                </label>
                <input
                  type="url"
                  value={newChannelUrl}
                  onChange={(e) => setNewChannelUrl(e.target.value)}
                  placeholder="https://facebook.com/groups/... أو https://t.me/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'منصة التواصل الاجتماعي:' : 'Social Platform:'}
                </label>
                <select
                  value={newChannelPlatform}
                  onChange={(e) => setNewChannelPlatform(e.target.value as DecorPlatform)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="facebook">فيسبوك (Facebook Groups & Pages)</option>
                  <option value="telegram">تليجرام (Telegram Channels & Groups)</option>
                  <option value="whatsapp">واتساب (WhatsApp Communities & Groups)</option>
                  <option value="pinterest">بنترست (Pinterest Boards)</option>
                  <option value="linkedin">لينكدإن (LinkedIn Professional Groups)</option>
                  <option value="twitter">إكس (X / Twitter Lists & Accounts)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'نوع القناة:' : 'Channel Type:'}
                </label>
                <select
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="group">جروب متخصص (Group)</option>
                  <option value="page">صفحة عامة معتمدة (Page)</option>
                  <option value="channel">قناة بث رسمية (Channel)</option>
                  <option value="community">مجتمع تواصل (Community)</option>
                  <option value="account">حساب / لوحة أفكار (Account/Board)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'تخصص الديكور والدهانات في هذه القناة:' : 'Decor & Paint Specialization:'}
                </label>
                <input
                  type="text"
                  value={newChannelSpecialization}
                  onChange={(e) => setNewChannelSpecialization(e.target.value)}
                  placeholder={isAr ? 'مثال: أحدث ألوان دهانات الحوائط، تشطيبات بديل الرخام، ديكورات الجبس بورد' : 'e.g., Wall paints, Wood & marble alternatives'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Mandatory permission declaration */}
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasPermissionChecked}
                  onChange={(e) => setHasPermissionChecked(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-blue-950 dark:text-blue-200 leading-relaxed">
                  {isAr
                    ? `أقر بأنني («${ownerName}») أمتلك حساباً مسجلاً في هذه الصفحة/الجروب ولدي إذن النشر المعتمد بعد مراجعة شروط الخصوصية وقواعد المجتمع الخاصة بها.`
                    : 'I declare that I hold an authorized registered account with valid posting permissions adhering to platform privacy policies.'}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingChannel(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isAr ? 'مراجعة الشروط واعتماد القناة' : 'Audit & Save Channel'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          <span className="text-slate-400 font-bold shrink-0">{isAr ? 'تصفية المنصات:' : 'Filter:'}</span>
          {[
            { id: 'all', label: isAr ? 'جميع القنوات' : 'All' },
            { id: 'facebook', label: 'فيسبوك (Facebook)' },
            { id: 'telegram', label: 'تليجرام (Telegram)' },
            { id: 'whatsapp', label: 'واتساب (WhatsApp)' },
            { id: 'pinterest', label: 'بنترست (Pinterest)' },
            { id: 'linkedin', label: 'لينكدإن (LinkedIn)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPlatformFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                platformFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Channels List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredChannels.length === 0 ? (
            <div className="md:col-span-2 p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <Share2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold">{isAr ? 'لا توجد قنوات مسجلة في هذا التصنيف حالياً.' : 'No channels found.'}</p>
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const badge = getPlatformBadge(channel.platform);
              const Icon = badge.icon;
              return (
                <div
                  key={channel.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    channel.status === 'active'
                      ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-xl ${badge.bg} flex items-center justify-center shrink-0 shadow-sm`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">
                          {channel.name}
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {channel.specialization}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleChannel(channel.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                          channel.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                        title={isAr ? 'تفعيل / إيقاف النشر لهذه القناة' : 'Toggle Channel'}
                      >
                        {channel.status === 'active' ? (isAr ? 'نشطة' : 'Active') : (isAr ? 'موقوفة' : 'Paused')}
                      </button>

                      <button
                        onClick={() => handleDeleteChannel(channel.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title={isAr ? 'حذف القناة' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                    <a
                      href={channel.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 line-clamp-1 max-w-[200px]"
                      title={channel.url}
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{channel.url}</span>
                    </a>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                        <ShieldCheck className="w-3 h-3" />
                        {isAr ? 'الخصوصية معتمدة' : 'Verified'}
                      </span>
                      <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {channel.postsCount} {isAr ? 'منشور' : 'posts'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Active Article Freshness Monitor (24-Hour Rule Checker) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {isAr ? 'فاحص نافذة الـ 24 ساعة للمقالات الجاهزة للنشر' : '24-Hour Article Eligibility Checker'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isAr
                ? 'متابعة المقالات المنشورة حديثاً وتحديد المتبقي من مهلة الـ 24 ساعة المسموح للبوت بالنشر فيها.'
                : 'Tracks article publication age to guarantee zero posting past the 24-hour window.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-300 font-bold">{isAr ? 'أقل من 24 ساعة (صالح للبث)' : '< 24h (Eligible)'}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2"></span>
            <span className="text-slate-600 dark:text-slate-300 font-bold">{isAr ? 'تجاوز 24 ساعة (مستبعد ومحمي)' : '> 24h (Excluded)'}</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {articles.slice(0, 6).map((art) => {
            const freshness = getArticleFreshness(art);
            return (
              <div
                key={art.id}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        freshness.isEligible
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                      }`}
                    >
                      {freshness.isEligible ? (isAr ? 'مؤهل للنشر الدوري' : 'Eligible') : (isAr ? 'تجاوز 24 ساعة - مستبعد' : 'Expired past 24h')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isAr ? `نُشر منذ ${freshness.ageHours} ساعة` : `Published ${freshness.ageHours}h ago`}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">
                    {art.title}
                  </h4>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-left sm:text-right text-[11px]">
                    {freshness.isEligible ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        {isAr ? `متبقي في نافذة النشر: ${freshness.remainingHours} ساعة` : `${freshness.remainingHours}h remaining`}
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold">
                        {isAr ? 'تجاوز نافذة النشر - محمي تلقائياً' : 'Protected from re-post'}
                      </span>
                    )}
                  </div>

                  {onViewArticle && (
                    <button
                      onClick={() => onViewArticle(art)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
                      title={isAr ? 'عرض المقال' : 'View Article'}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Live 24-Hour Dispatch Log Timeline */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {isAr ? 'سجل عمليات البث المباشرة للبوت (كل 30 دقيقة)' : 'Live 30-Minute Broadcast Log'}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-bold">
            {logs.length} {isAr ? 'عملية مسجلة' : 'records'}
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold">{isAr ? 'لا توجد عمليات بث سابقة حتى الآن. سيبدأ البوت بالبث دورياً كل 30 دقيقة.' : 'No broadcast history yet.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 8).map((log) => {
              const isExpired = log.status === 'skipped_expired_24h';
              return (
                <div
                  key={log.id}
                  className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                    isExpired
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          isExpired
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200'
                        }`}
                      >
                        {isExpired ? (isAr ? 'محظور (تجاوز 24 ساعة)' : 'Excluded > 24h') : (isAr ? 'تم النشر بنجاح' : 'Dispatched')}
                      </span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                        {log.targetChannelName}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>{new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {isAr ? `عمر المقال: ${log.ageHoursAtPublish} ساعة` : `Age: ${log.ageHoursAtPublish}h`}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {isAr ? 'المقال المنشور:' : 'Article:'} <span className="font-bold underline">{log.articleTitle}</span>
                  </p>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-sans whitespace-pre-wrap">
                    {log.postSnippet}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {log.notes}
                    </span>

                    <button
                      onClick={() => handleCopyLogSnippet(log.id, log.postSnippet)}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedLogId === log.id ? 'تم النسخ!' : 'نسخ النص'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
