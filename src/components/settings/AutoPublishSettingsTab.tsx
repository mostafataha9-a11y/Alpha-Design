import React, { useState, useEffect } from 'react';
import {
  Zap,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { SiteSettings } from '../../types/blog';

interface AutoPublishSettingsTabProps {
  formData: SiteSettings;
  setFormData: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isAr: boolean;
}

export const AutoPublishSettingsTab: React.FC<AutoPublishSettingsTabProps> = ({
  formData,
  setFormData,
  isAr,
}) => {
  const [statusData, setStatusData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auto-publish/status')
      .then((r) => r.json())
      .then((d) => setStatusData(d))
      .catch((err) => console.warn('Could not fetch auto publish status:', err));
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>{isAr ? 'حالة النشر الآلي الدوري' : 'Auto-Publish Daemon Status'}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>{isAr ? 'إلغاء النشر الآلي الدوري والاعتماد على التوليد والنشر الذكي اليدوي' : 'Decommission of 24h Auto-Publishing'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {isAr
              ? 'بناءً على التوجيه التنفيذي لصاحب الموقع (الحضرى محمود): تم إيقاف وإلغاء حلقة النشر الآلي التلقائي التي كانت تنشر مقالاً كل 24 ساعة، مع الحفاظ الكامل على كافة المقالات السابقة المنشورة في قاعدة البيانات.'
              : 'Per site owner directive: The 24-hour auto-publishing daemon is decommissioned. Existing articles are preserved.'}
          </p>
        </div>

        <span className="px-3.5 py-1.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-900 self-start sm:self-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>{isAr ? 'النشر الآلي الدوري: معطل نهائياً' : '24h Daemon: Inactive'}</span>
        </span>
      </div>

      {/* Confirmation & Preservation Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
        <div className="flex items-center gap-2.5">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <h3 className="font-black text-sm text-emerald-900 dark:text-emerald-200">
            {isAr ? 'المقالات السابقة محفوظة بالكامل بأمان في PostgreSQL' : 'All Published Articles Preserved'}
          </h3>
        </div>
        <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
          {isAr
            ? `لم يُحذف أي مقال من المقالات التي تم إنشاؤها سابقاً. قاعدة بيانات Cloud SQL تحتفظ بكافة المقالات (${statusData?.preservedArticlesCount || 'المحفوظة'}) مع كامل وسومها، صورها، وعدد كلماتها المتوافق مع معايير أدسنس.`
            : `All previously created articles in PostgreSQL remain safe and published.`}
        </p>
      </div>

      {/* Manual Smart Publishing Directive Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50/50 to-slate-50 dark:from-slate-800/80 dark:via-blue-950/30 dark:to-slate-800/60 border border-blue-200 dark:border-blue-900 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
              {isAr ? 'المسار المعتمد الفعّال: النشر اليدوي الذكي المدعوم بالذكاء الاصطناعي' : 'Active Standard: Smart Manual Publishing'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'يرفع صاحب الموقع صوره الخاصة مع شرح لها، ويتولى الذكاء الاصطناعي إكمال المقال بأسلوب بشري جذاب.'
                : 'Upload real photos with captions; Gemini completes the article in an authentic human voice.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">📸 الصور وشروحاتها</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-relaxed">
              رفع صور دهانات حقيقية وكتابة شرح واقعي لكل صورة لربطها بسياق المقال.
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">✍️ أسلوب بشري + سيو وأدسنس</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-relaxed">
              إكمال المقال في أكثر من 1000 كلمة دون محتوى نحيف، مع عنوان جذاب وكلمات مفتاحية.
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>موقع الخريطة (Google Maps)</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-relaxed">
              تضمين موقع المعاينة الميدانية ورابط خرائط Google للمشروع لرفع مصداقية E-E-A-T.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
