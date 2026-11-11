import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Zap,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  Server,
  Cloud,
  Copy,
  Check,
  Power,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Article, SiteSettings } from '../types/blog';
import { fetchWithAuth } from '../utils/apiAuth';

interface AutoPublishDashboardProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => void;
  articles: Article[];
  onPublishArticle: (article: Article) => void;
  onViewArticle: (article: Article) => void;
}

export interface AutoPublishRunItem {
  id: string;
  cycleKey?: string;
  status: 'running' | 'success' | 'failed' | 'skipped';
  triggerSource: 'cloud_scheduler' | 'admin_manual' | 'server_daemon';
  articleId?: string;
  articleTitle?: string;
  wordCount?: number;
  imagesCount?: number;
  errorCode?: string;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string;
}

interface ServerAutoStatus {
  enabled: boolean;
  frequencyHours: number;
  lastPublishedAt: string;
  nextRunAt: string;
  remainingMs: number;
  targetWordCount: number;
  wordsPerImageRatio: number;
  selectedTopics: string[];
  autoPublishedCount: number;
  autoArticles: any[];
  recentRuns?: AutoPublishRunItem[];
  isCurrentlyRunning: boolean;
  scheduler: {
    serverInternalTimerActive: boolean;
    cloudSchedulerWebhookUrl: string;
    cloudSchedulerCronFormat: string;
    authSecretHeader: string;
  };
}

export const AutoPublishDashboard: React.FC<AutoPublishDashboardProps> = ({
  settings,
  onUpdateSettings,
  articles,
  onPublishArticle,
  onViewArticle,
}) => {
  const isAr = settings.language === 'ar';
  const autoConfig = settings.autoPublish;

  const [serverStatus, setServerStatus] = useState<ServerAutoStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 23,
    minutes: 59,
    seconds: 59,
  });

  const [isTriggeringNow, setIsTriggeringNow] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastAutoArticle, setLastAutoArticle] = useState<Article | null>(null);

  // Fetch status from server to stay authoritative with Cloud SQL state
  const fetchStatus = useCallback(async () => {
    try {
      setIsLoadingStatus(true);
      const res = await fetch('/api/auto-publish/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch (e) {
      console.warn('Failed to fetch server auto-publish status:', e);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Poll status every 30s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Countdown timer derived from server or settings
  useEffect(() => {
    const updateCountdown = () => {
      const last = new Date(
        serverStatus?.lastPublishedAt || autoConfig.lastPublishedAt || Date.now()
      ).getTime();
      const intervalMs = (serverStatus?.frequencyHours || autoConfig.frequencyHours || 24) * 60 * 60 * 1000;
      const nextRun = last + intervalMs;
      const now = Date.now();
      const diff = Math.max(0, nextRun - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [serverStatus?.lastPublishedAt, serverStatus?.frequencyHours, autoConfig.lastPublishedAt, autoConfig.frequencyHours]);

  // Target word count strictly clamped between 1,000 and 10,000 words
  const effectiveWordCount = Math.max(1000, Math.min(10000, Number(autoConfig.targetWordCount) || 1500));
  const effectiveRatio = Math.max(150, Math.min(400, Number(autoConfig.wordsPerImageRatio) || 250));
  const calculatedImagesCount = Math.max(4, Math.round(effectiveWordCount / effectiveRatio));

  // Toggle scheduler enabled/disabled state
  const handleToggleEnabled = async () => {
    const newEnabled = !autoConfig.enabled;
    const updatedSettings = {
      ...settings,
      autoPublish: {
        ...settings.autoPublish,
        enabled: newEnabled,
      },
    };
    onUpdateSettings(updatedSettings);

    try {
      await fetchWithAuth('/api/db/settings', {
        method: 'POST',
        body: JSON.stringify(updatedSettings),
      });
      fetchStatus();
    } catch (err) {
      console.error('Failed to persist toggle to backend:', err);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Trigger auto publish now (immediate run with admin credentials saved directly in PostgreSQL)
  const handleTriggerNow = async () => {
    setIsTriggeringNow(true);
    setErrorMessage('');
    setTriggerStatus(
      isAr
        ? 'جارِ التحقق من الصلاحيات وتوليد المقال في تخصص الديكور والدهانات (1000-10000 كلمة)...'
        : 'Verifying admin auth & generating Decor & Paints article...'
    );

    try {
      const response = await fetchWithAuth('/api/ai/auto-publish-article', {
        method: 'POST',
        body: JSON.stringify({
          topic: autoConfig.selectedTopics?.[Math.floor(Math.random() * (autoConfig.selectedTopics.length || 1))],
          language: autoConfig.language || 'ar',
          targetWordCount: effectiveWordCount,
          wordsPerImageRatio: effectiveRatio,
        }),
      });

      if (response.status === 401) {
        throw new Error(
          isAr
            ? 'جلسة المسؤول غير صالحة أو منتهية. يرجى تسجيل الدخول مجدداً كمسؤول.'
            : 'Admin session expired or invalid. Please re-login.'
        );
      }

      if (response.status === 409) {
        const errJson = await response.json();
        throw new Error(errJson.error || (isAr ? 'هناك عملية نشر أخرى قيد التنفيذ حالياً.' : 'Concurrent publishing in progress.'));
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.article) {
        onPublishArticle(data.article);
        setLastAutoArticle(data.article);
      }

      if (data.settings) {
        onUpdateSettings(data.settings);
      }

      setTriggerStatus(isAr ? 'تم النشر والحفظ بنجاح في قاعدة البيانات!' : 'Published and saved to PostgreSQL successfully!');
      fetchStatus();
    } catch (err: any) {
      console.error('Auto publish failed:', err);
      setErrorMessage(err.message || (isAr ? 'تعذر إتمام دورة النشر التلقائي.' : 'Failed to execute auto-publish cycle.'));
    } finally {
      setIsTriggeringNow(false);
    }
  };

  const autoPublishedArticles = articles.filter((a) => a.isAutoPublished);
  const webhookUrl = serverStatus?.scheduler?.cloudSchedulerWebhookUrl || `${window.location.origin}/api/cron/auto-publish`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute top-0 end-0 -mt-10 -me-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold border shadow-xs ${
                  autoConfig.enabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    autoConfig.enabled ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'
                  }`}
                ></span>
                <span>
                  {autoConfig.enabled
                    ? isAr
                      ? 'محرك النشر الآلي التلقائي نشط (كل 24 ساعة)'
                      : '24h Autonomous Engine Active'
                    : isAr
                    ? 'النشر الآلي معطل حالياً بقرار الإدارة'
                    : '24h Auto-Publish Disabled'}
                </span>
              </span>

              {/* Prominent High-Visibility Enable/Disable Toggle Button */}
              <button
                type="button"
                onClick={handleToggleEnabled}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer shadow-md border ${
                  autoConfig.enabled
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white border-rose-400/40 shadow-rose-900/40'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/40 shadow-emerald-900/40'
                }`}
                title={autoConfig.enabled ? (isAr ? 'انقر لتعطيل النشر الآلي' : 'Click to disable') : (isAr ? 'انقر لتفعيل النشر الآلي' : 'Click to enable')}
              >
                <Power className="w-4 h-4" />
                <span>
                  {autoConfig.enabled
                    ? isAr
                      ? 'زر تعطيل النشر التلقائي الآلي (انقر للإيقاف)'
                      : 'Disable 24h Auto-Publish'
                    : isAr
                    ? 'زر تفعيل النشر التلقائي كل 24 ساعة (انقر للتشغيل)'
                    : 'Enable 24h Auto-Publish'}
                </span>
              </button>
            </div>

            <div className="text-xs text-indigo-300 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {isAr ? 'آخر مقال تم نشره:' : 'Last published:'}{' '}
                {new Date(serverStatus?.lastPublishedAt || autoConfig.lastPublishedAt).toLocaleTimeString(
                  isAr ? 'ar-EG' : 'en-US',
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: 'numeric',
                    month: 'short',
                  }
                )}
              </span>
              <button
                type="button"
                onClick={fetchStatus}
                className="p-1 text-indigo-300 hover:text-white transition-colors"
                title={isAr ? 'تحديث الحالة' : 'Refresh'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-3">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                {isAr
                  ? 'محرك النشر التلقائي الذكي كل 24 ساعة لمدونة ألفا للديكور والدهانات'
                  : 'Automated 24-Hour Decor & Paints Publishing Engine'}
              </h1>
              <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed">
                {isAr
                  ? 'يعمل محرك الخادم تلقائياً في الخلفية كل 24 ساعة دون الحاجة لإبقاء المتصفح مفتوحاً، حيث يولد مقالاً حصرياً في الديكور والدهانات (1,000 - 10,000 كلمة) مع توزيع متوازن للصور وشروحاتها، ويحفظه مباشرة في PostgreSQL مع منع التكرار.'
                  : 'Runs autonomously in the server background every 24 hours, generating comprehensive decor articles and saving directly to PostgreSQL.'}
              </p>
            </div>

            {/* Countdown Clock Display */}
            <div className="lg:col-span-5 bg-black/40 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-center space-y-3">
              <span className="text-xs uppercase tracking-wider text-indigo-300 font-semibold block">
                {isAr ? 'الوقت المتبقي حتى المقال الآلي القادم:' : 'Time Until Next Auto-Post:'}
              </span>

              <div className="flex items-center justify-center gap-3 font-mono font-black text-3xl sm:text-4xl text-white">
                <div className="flex flex-col items-center">
                  <span>{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="text-[10px] text-indigo-300 font-sans font-normal">{isAr ? 'ساعة' : 'Hrs'}</span>
                </div>
                <span className="text-indigo-400">:</span>
                <div className="flex flex-col items-center">
                  <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="text-[10px] text-indigo-300 font-sans font-normal">{isAr ? 'دقيقة' : 'Min'}</span>
                </div>
                <span className="text-indigo-400">:</span>
                <div className="flex flex-col items-center">
                  <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
                  <span className="text-[10px] text-indigo-300 font-sans font-normal">{isAr ? 'ثانية' : 'Sec'}</span>
                </div>
              </div>

              {/* Instant Trigger Test Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTriggerNow}
                  disabled={isTriggeringNow}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isTriggeringNow ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{triggerStatus || (isAr ? 'جارِ النشر والتخزين في PostgreSQL...' : 'Publishing now...')}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>{isAr ? 'نشر فوري الآن وحفظ مباشر في قاعدة البيانات' : 'Trigger Immediate 24h Publish & Save'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trigger Notification */}
      {lastAutoArticle && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                {isAr ? 'تم توليد وحفظ المقال الآلي في PostgreSQL بنجاح!' : 'Auto Article Persisted in PostgreSQL Successfully!'}
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 line-clamp-1">
                "{lastAutoArticle.title}"
              </p>
            </div>
          </div>
          <button
            onClick={() => onViewArticle(lastAutoArticle)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shrink-0"
          >
            {isAr ? 'عرض المقال' : 'View'}
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Cloud Scheduler & Server Daemon Info Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Cloud className="w-5 h-5 text-indigo-600" />
              <span>{isAr ? 'تكامل Google Cloud Scheduler والمجدول الداخلي' : 'Google Cloud Scheduler & Internal Daemon'}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {isAr
                ? 'يعمل السيرفر بنظامين متكاملين لضمان عدم تفويت أي موعد نشر كل 24 ساعة'
                : 'Dual-layer execution: Server background daemon + External Cloud Scheduler webhook'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isAr ? 'المجدول الداخلي يعمل بالخلفية' : 'Server Daemon Active'}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Cloud Webhook URL */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'رابط الويب هوك (Target URL):' : 'Cloud Scheduler Webhook:'}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'webhook' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'webhook' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
              </button>
            </div>
            <code className="block p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all select-all">
              {webhookUrl}
            </code>
            <p className="text-[11px] text-slate-500">
              {isAr ? 'طريقة الطلب: POST مع ترويسة السر أدناه' : 'Method: POST with cron secret header'}
            </p>
          </div>

          {/* Cron Secret Header */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'ترويسة الحماية السرية (Header):' : 'Cron Secret Header:'}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard('x-cron-secret: alpha-decor-cron-sec-2026', 'secret')}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'secret' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'secret' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
              </button>
            </div>
            <code className="block p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all select-all">
              x-cron-secret: alpha-decor-cron-sec-2026
            </code>
            <p className="text-[11px] text-slate-500">
              {isAr ? 'التردد الموصى به: 0 0 * * * (مرة كل 24 ساعة في منتصف الليل)' : 'Cron: 0 0 * * * (Daily at midnight)'}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold block">
              {isAr ? 'أمر الإعداد المباشر عبر Google Cloud CLI (gcloud):' : 'Ready-to-run Google Cloud CLI Command:'}
            </span>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  `gcloud scheduler jobs create http alpha-decor-daily-publish \\\n  --location=europe-west1 \\\n  --schedule="0 0 * * *" \\\n  --uri="${webhookUrl}" \\\n  --http-method=POST \\\n  --headers="x-cron-secret=YOUR_CONFIGURED_CRON_SECRET,Content-Type=application/json" \\\n  --time-zone="Africa/Cairo" \\\n  --description="Alpha Decor 24-Hour Autonomous Article Publisher"`,
                  'gcloud'
                )
              }
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              {copiedField === 'gcloud' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === 'gcloud' ? (isAr ? 'تم نسخ أمر gcloud' : 'Copied CLI') : (isAr ? 'نسخ أمر gcloud' : 'Copy CLI')}</span>
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed select-all">
{`gcloud scheduler jobs create http alpha-decor-daily-publish \\
  --location=europe-west1 \\
  --schedule="0 0 * * *" \\
  --uri="${webhookUrl}" \\
  --http-method=POST \\
  --headers="x-cron-secret=YOUR_CONFIGURED_CRON_SECRET,Content-Type=application/json" \\
  --time-zone="Africa/Cairo" \\
  --description="Alpha Decor 24-Hour Autonomous Article Publisher"`}
          </pre>
          <p className="leading-relaxed text-[11px] text-indigo-800 dark:text-indigo-300">
            {isAr
              ? 'إنشاء مهمة Cloud Scheduler على حساب Google Cloud الخاص بك يضمن إيقاظ الحاوية حتى في حال توقفها المؤقت (Scale to Zero). وفي نفس الوقت، يعمل مجدول الخادم الداخلي (Server Daemon) كل 5 دقائق لضمان النشر التلقائي الدائم.'
              : 'Configuring Cloud Scheduler ensures triggering even if Cloud Run scales to zero, while the internal server daemon continuously guarantees execution.'}
          </p>
        </div>
      </div>

      {/* Persistent Run History (سجل عمليات النشر الدائمة في PostgreSQL) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-600" />
              <span>{isAr ? 'سجل عمليات النشر والجدولة الدائم (PostgreSQL Run Logs)' : 'Persistent Scheduler Run Logs'}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr
                ? 'سجل غير متطاير يسجل كل محاولة نشر مع المعرّف الفريد ومصدر التشغيل وعدد الكلمات الفعلي وحالة الحفظ'
                : 'Atomic, durable log stored in PostgreSQL tracking run IDs, trigger sources, word counts, and status'}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchStatus}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'تحديث السجل' : 'Refresh Logs'}</span>
          </button>
        </div>

        {(!serverStatus?.recentRuns || serverStatus.recentRuns.length === 0) ? (
          <div className="text-center py-8 text-xs text-slate-400">
            {isAr ? 'لا توجد سجلات تشغيل سابقة بعد. يمكنك تشغيل دورة تجريبية باستخدام زر "نشر فوري الآن".' : 'No execution logs recorded yet. Trigger a run above.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3 text-start">{isAr ? 'معرّف العملية' : 'Run ID'}</th>
                  <th className="py-2.5 px-3 text-start">{isAr ? 'المصدر' : 'Source'}</th>
                  <th className="py-2.5 px-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-2.5 px-3 text-start">{isAr ? 'المقال الناتج' : 'Article Title'}</th>
                  <th className="py-2.5 px-3 text-start">{isAr ? 'الكلمات' : 'Words'}</th>
                  <th className="py-2.5 px-3 text-start">{isAr ? 'التوقيت' : 'Time'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {serverStatus.recentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 text-[11px] text-slate-500 font-bold truncate max-w-[130px]" title={run.id}>
                      {run.id}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {run.triggerSource === 'cloud_scheduler'
                          ? 'Cloud Scheduler'
                          : run.triggerSource === 'admin_manual'
                          ? (isAr ? 'إداري فوري' : 'Manual Admin')
                          : (isAr ? 'مجدول السيرفر' : 'Server Daemon')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      {run.status === 'success' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          {isAr ? 'ناجح' : 'Success'}
                        </span>
                      )}
                      {run.status === 'running' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 animate-pulse">
                          {isAr ? 'قيد التنفيذ' : 'Running'}
                        </span>
                      )}
                      {run.status === 'failed' && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                          title={run.errorMessage || run.errorCode}
                        >
                          {isAr ? 'فشل' : 'Failed'}
                        </span>
                      )}
                      {run.status === 'skipped' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                          {isAr ? 'مستبعد' : 'Skipped'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-800 dark:text-slate-200 max-w-[220px] truncate" title={run.articleTitle || run.errorMessage}>
                      {run.articleTitle || run.errorMessage || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {run.wordCount ? `${run.wordCount} ${isAr ? 'كلمة' : 'w'}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {run.startedAt
                        ? new Date(run.startedAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formula & Configuration Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formula Visualizer & Word Count Controller */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              {isAr ? 'معادلة الصور وعدد الكلمات (1000 - 10,000 كلمة)' : 'Words-to-Images Ratio (1000 - 10000 words)'}
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              {isAr ? 'ديكور ودهانات فقط' : 'Decor & Paints Only'}
            </span>
          </div>

          {/* Interactive Word Count Slider */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'طول المقال المستهدف بالنشر الآلي:' : 'Target Word Count:'}
              </span>
              <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                {effectiveWordCount} {isAr ? 'كلمة' : 'words'}
              </span>
            </div>

            <input
              type="range"
              min="1000"
              max="10000"
              step="250"
              value={effectiveWordCount}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateSettings({
                  ...settings,
                  autoPublish: {
                    ...settings.autoPublish,
                    targetWordCount: val,
                  },
                });
              }}
              className="w-full accent-blue-600 cursor-pointer"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>1,000 {isAr ? 'كلمة (أدنى حد)' : 'min'}</span>
              <span>5,000</span>
              <span>10,000 {isAr ? 'كلمة (أقصى حد)' : 'max'}</span>
            </div>
          </div>

          {/* Dynamic Images Need Breakdown */}
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-2 text-xs text-blue-900 dark:text-blue-200">
            <div className="font-bold text-sm flex items-center justify-between">
              <span>{isAr ? 'حاجة المقال للصور المحسوبة آلياً:' : 'Calculated Images Required:'}</span>
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-xs">
                {calculatedImagesCount} {isAr ? 'صور مرافقة' : 'images'}
              </span>
            </div>
            <p className="leading-relaxed">
              {isAr
                ? `بناءً على طول المقال المحدد (${effectiveWordCount} كلمة)، يوزع المحرك (${calculatedImagesCount} صور توضيحية) بمعدل صورة كل ${effectiveRatio} كلمة مع شروحات ديكورية خاصة.`
                : `Target ${effectiveWordCount} words automatically embeds ${calculatedImagesCount} images (~1 image per ${effectiveRatio} words) with individual contextual decor captions.`}
            </p>
          </div>
        </div>

        {/* Engine Topics Pool */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            {isAr ? 'موضوعات النشر الآلي الحصرية للديكور والدهانات' : 'Decor & Paints Topic Queue'}
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr
              ? 'يختار محرك الخادم موضوعاً غير مكرر كل 24 ساعة ويتحقق من عدم وجوده في قاعدة البيانات لضمان التفرد وسيو AdSense:'
              : 'The autonomous server engine selects an unused decor theme every 24 hours to guarantee high SEO value:'}
          </p>

          <div className="space-y-2 max-h-64 overflow-y-auto pe-1">
            {(autoConfig.selectedTopics || []).map((topic, i) => (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2"
              >
                <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] flex items-center justify-center font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="truncate">{topic}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Previously Auto-Published Articles History */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              {isAr ? 'سجل المقالات المنشورة آلياً في قاعدة البيانات' : '24h Auto-Published Articles in PostgreSQL'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr
                ? `إجمالي المقالات المنشورة بنظام الـ 24 ساعة: ${autoPublishedArticles.length} مقال`
                : `Total automated articles: ${autoPublishedArticles.length}`}
            </p>
          </div>
        </div>

        {autoPublishedArticles.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            {isAr ? 'لم يتم نشر مقالات آلية بعد. انقر على زر "نشر فوري الآن" بالأعلى لبدء أول مقال وحفظه في PostgreSQL!' : 'No auto-published posts yet. Trigger one above!'}
          </div>
        ) : (
          <div className="space-y-4">
            {autoPublishedArticles.map((article) => (
              <div
                key={article.id}
                onClick={() => onViewArticle(article)}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-900">
                    <img
                      src={article.featuredImage}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {isAr ? `مدعوم بـ ${article.autoImagesCount || 4} صور` : `${article.autoImagesCount || 4} Images`}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(article.publishedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {article.title}
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold self-start sm:self-auto shrink-0 transition-colors"
                >
                  {isAr ? 'قراءة المقال' : 'Read'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
