import React, { useState } from 'react';
import {
  Settings,
  Sliders,
  Share2,
  Globe,
  Palette,
  Database,
  CheckCircle,
  Save,
  AlertCircle,
  Sparkles,
  Info,
  Bot,
  DollarSign,
  Calculator,
  Lock,
  Tv,
  Zap,
} from 'lucide-react';
import { SiteSettings, Article, AdminUser } from '../types/blog';
import { INITIAL_SETTINGS } from '../data/initialData';
import { AuthorBadge } from './AuthorBadge';
import { ContractorNotebook } from './ContractorNotebook';
import { SocialPublishingBotDashboard } from './SocialPublishingBotDashboard';
import { AdsSettingsTab } from './settings/AdsSettingsTab';
import { NegotiationSettingsTab } from './settings/NegotiationSettingsTab';
import { SocialLinksSettingsTab } from './settings/SocialLinksSettingsTab';
import { AutoPublishSettingsTab } from './settings/AutoPublishSettingsTab';
import { DataBackupSettingsTab } from './settings/DataBackupSettingsTab';

interface SettingsViewProps {
  settings: SiteSettings;
  onSaveSettings: (newSettings: SiteSettings) => void;
  articles: Article[];
  onResetData: () => void;
  onImportArticles: (articles: Article[]) => void;
  currentUser?: AdminUser | null;
  initialTab?: 'reading' | 'ads' | 'social' | 'negotiation' | 'general' | 'auto-publish' | 'social-bot' | 'theme' | 'data' | 'contractor-notebook';
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  articles,
  onResetData,
  onImportArticles,
  currentUser,
  initialTab,
}) => {
  const isAr = settings.language === 'ar';
  const isOwner = currentUser?.role === 'owner';

  const [activeTab, setActiveTab] = useState<
    'reading' | 'ads' | 'social' | 'negotiation' | 'general' | 'auto-publish' | 'social-bot' | 'theme' | 'data' | 'contractor-notebook'
  >(initialTab || 'ads');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Form state clone
  const [formData, setFormData] = useState<SiteSettings>({
    ...settings,
    assistantNegotiation: settings.assistantNegotiation || INITIAL_SETTINGS.assistantNegotiation,
    ads: settings.ads || INITIAL_SETTINGS.ads,
  });

  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [importNotification, setImportNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Handle article count change with strict enforcement: 3 <= N <= 10
  const handleArticlesPerPageChange = (val: number) => {
    const clamped = Math.max(3, Math.min(10, val));
    setFormData((prev) => ({
      ...prev,
      articlesPerPage: clamped,
    }));
  };

  const handleSave = () => {
    if (formData.articlesPerPage < 3 || formData.articlesPerPage > 10) {
      setErrorMessage(isAr ? 'عدد المقالات في الصفحة يجب أن يكون بين 3 و 10 مقالات حصراً.' : 'Articles per page must be between 3 and 10.');
      return;
    }

    setErrorMessage('');
    onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const baseTabs = [
    { id: 'reading', label: isAr ? 'تصفح المقالات (3 - 10)' : 'Reading (3-10 Posts)', icon: Sliders, highlight: true },
    { id: 'ads', label: isAr ? 'الأكواد الإعلانية (5 مواضع ذكية)' : 'Ad Codes (5 Smart Slots)', icon: Tv, highlight: true },
    { id: 'negotiation', label: isAr ? 'مساعد التفاوض والأسعار' : 'Bot Negotiation & Pricing', icon: DollarSign, highlight: true },
    { id: 'social', label: isAr ? 'وسائل التواصل الاجتماعي' : 'Social Media Links', icon: Share2, highlight: true },
    { id: 'general', label: isAr ? 'معلومات المدونة والكاتب' : 'General & Author', icon: Globe },
    { id: 'social-bot', label: isAr ? 'بوت نشر الروابط (كل 30 دقيقة)' : 'Social Publishing Bot (30m)', icon: Bot, highlight: true },
    { id: 'auto-publish', label: isAr ? 'محرك النشر 24 ساعة' : '24h Auto-Publishing', icon: Zap },
    { id: 'theme', label: isAr ? 'المظهر والألوان' : 'Theme & Appearance', icon: Palette },
    { id: 'data', label: isAr ? 'النسخ الاحتياطي والبيانات' : 'Data & Backup', icon: Database },
  ];

  // EXCLUSIVE OWNER-ONLY TAB:
  // Visible ONLY to the site owner (الحضرى محمود).
  const tabs = isOwner
    ? [
        ...baseTabs,
        {
          id: 'contractor-notebook' as const,
          label: isAr ? 'المفكرة والحسابات' : 'Notebook & Accounts',
          icon: Calculator,
          highlight: true,
          ownerOnly: true,
        },
      ]
    : baseTabs;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            <span>{isAr ? 'لوحة تحكم إعدادات المدونة' : 'Blog Control Panel'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'تخصيص كامل للأكواد الإعلانية، التفاوض، شبكات التواصل، وعدد المقالات بالصفحة.'
              : 'Configure ad slots, negotiation bot, social links, pagination, and theme.'}
          </p>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-3">
          {isSaved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>{isAr ? 'تم حفظ التعديلات بنجاح' : 'Saved successfully!'}</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:scale-102 active:scale-98 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isAr ? 'حفظ كافة الإعدادات' : 'Save All Settings'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {importNotification && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-2 animate-in fade-in ${
            importNotification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          {importNotification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          )}
          <span>{importNotification.message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Prominent Shortcut for Ads Management */}
      {activeTab !== 'ads' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white border-2 border-blue-500/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center shrink-0 shadow-lg">
              <Tv className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  {isAr ? 'نظام البنرات الذكية والربح' : 'Smart Ad Placements'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  {isAr ? '5 مواضع جاهزة ومُهيأة' : '5 Ready Slots'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {isAr ? 'الأكواد الإعلانية الذكية (الهيدر، الجانب، أول ومنتصف وأسفل المقالات)' : 'Smart Ad Codes (Header, Sidebar & Articles)'}
              </h3>
              <p className="text-xs text-blue-200/80 max-w-xl">
                {isAr
                  ? 'برمجة وضبط شفرات Google AdSense أو البنرات المصورة مع محرك الذكاء الاصطناعي لضبط القيود والأبعاد المتجاوبة تلقائياً.'
                  : 'Manage AdSense scripts and image banners with AI auto-fitting and responsive layout.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('ads')}
            className="w-full md:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 hover:scale-102 active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isAr ? 'فتح قسم الأكواد الإعلانية الآن' : 'Open Ad Codes Now'}</span>
          </button>
        </div>
      )}

      {/* Prominent Shortcut for Owner: المفكرة والحسابات */}
      {isOwner && activeTab !== 'contractor-notebook' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white border-2 border-amber-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg">
              <Calculator className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  {isAr ? 'اختصار مباشر لصاحب الموقع' : 'Owner Shortcut'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                  {isAr ? 'تصحيح الأخطاء الحسابية بالذكاء الاصطناعي' : 'AI Calculation Correction'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {isAr ? 'المفكرة والحسابات — نظام حسابات مقاولات الدهانات (حضرى)' : 'Contractor Accounts & Notebook'}
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl">
                {isAr
                  ? 'دفتر حسابات المشاريع، الدفعات، أجور الصنايعية، اليوميات، والمصروفات مع التدقيق الآلي وتصحيح الأخطاء الحسابية بالذكاء الاصطناعي وتصدير PDF.'
                  : 'Client accounts, payments, craftsman wages, daily costs, and expenses with AI arithmetic auditing.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('contractor-notebook')}
            className="w-full md:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{isAr ? 'فتح المفكرة والحسابات الآن 📒' : 'Open Notebook Now 📒'}</span>
          </button>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {(tab as any).ownerOnly ? (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-400 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  {isAr ? 'سري' : 'Private'}
                </span>
              ) : tab.highlight ? (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Reading & Pagination (min 3, max 10 articles) */}
      {activeTab === 'reading' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-8 animate-in fade-in duration-200">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              {isAr ? 'إعدادات عرض المقالات والترقيم (Pagination Settings)' : 'Article Feed Pagination'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'وفقاً لطلبك: يتم تحديد عدد المقالات المعروضة في الصفحة الواحدة بحيث لا يقل عن 3 مقالات ولا يزيد عن 10 مقالات.'
                : 'As configured: Articles per page is strictly constrained between a minimum of 3 and a maximum of 10 articles.'}
            </p>
          </div>

          {/* Primary Rule Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-slate-800 dark:to-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold block mb-1">
                  {isAr ? 'الخاصية المطلوبة' : 'Constraint Rule'}
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isAr ? 'عدد المقالات المعروضة في الصفحة الواحدة:' : 'Articles Displayed Per Page:'}
                </h3>
                <span className="text-xs text-slate-500">
                  {isAr ? '(الحد الأدنى: 3 مقالات | الحد الأقصى: 10 مقالات)' : '(Min: 3 posts | Max: 10 posts)'}
                </span>
              </div>

              {/* Big Number Badge */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/25">
                  <span>{formData.articlesPerPage}</span>
                  <span className="text-[9px] font-normal uppercase tracking-wider">{isAr ? 'مقالات' : 'posts'}</span>
                </div>
              </div>
            </div>

            {/* Interactive Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>3 {isAr ? 'مقالات (الحد الأدنى)' : 'Posts (Min)'}</span>
                <span className="text-blue-600 dark:text-blue-400 font-black text-sm">
                  {formData.articlesPerPage} {isAr ? 'مقالات حالياً' : 'posts selected'}
                </span>
                <span>10 {isAr ? 'مقالات (الحد الأقصى)' : 'Posts (Max)'}</span>
              </div>

              <input
                type="range"
                min="3"
                max="10"
                step="1"
                value={formData.articlesPerPage}
                onChange={(e) => handleArticlesPerPageChange(Number(e.target.value))}
                className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              {/* Preset buttons */}
              <div className="flex items-center justify-center gap-2 pt-2">
                {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleArticlesPerPageChange(num)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                      formData.articlesPerPage === num
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/60 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <span>
                {isAr
                  ? `بناءً على اختيارك الحالي (${formData.articlesPerPage} مقالات)، مع وجود إجمالي ${articles.length} مقالات، سيتم تقسيم المقالات على ${Math.ceil(articles.length / formData.articlesPerPage)} صفحات بالصفحة الرئيسية.`
                  : `With ${formData.articlesPerPage} posts per page, your ${articles.length} articles will form ${Math.ceil(articles.length / formData.articlesPerPage)} pages on the home feed.`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Smart Ads Management (5 Strategic Placements with AI Auto-Fit) */}
      {activeTab === 'ads' && (
        <AdsSettingsTab formData={formData} setFormData={setFormData} isAr={isAr} />
      )}

      {/* Tab: Negotiation Bot & Service Pricing */}
      {activeTab === 'negotiation' && (
        <NegotiationSettingsTab formData={formData} setFormData={setFormData} isAr={isAr} />
      )}

      {/* Tab: Social Media Links & Automation */}
      {activeTab === 'social' && (
        <SocialLinksSettingsTab formData={formData} setFormData={setFormData} isAr={isAr} />
      )}

      {/* Tab: General & Author Settings */}
      {activeTab === 'general' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 animate-in fade-in duration-200">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            {isAr ? 'المعلومات العامة للمدونة وصاحب الموقع' : 'General & Author Profile'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'اسم المدونة (عربي):' : 'Blog Name (Arabic):'}
              </label>
              <input
                type="text"
                value={formData.blogName}
                onChange={(e) => setFormData({ ...formData, blogName: e.target.value })}
                className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'اسم المدونة (إنجليزي):' : 'Blog Name (English):'}
              </label>
              <input
                type="text"
                value={formData.blogNameEn}
                onChange={(e) => setFormData({ ...formData, blogNameEn: e.target.value })}
                className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'شعار / وصف المدونة (Tagline):' : 'Blog Tagline:'}
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'اسم صاحب المدونة (Author Name):' : 'Author Name:'}
              </label>
              <input
                type="text"
                value={formData.authorName}
                onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'رمز وهوية صاحب المدونة (بدون صورة):' : 'Owner Identity Monogram:'}
              </label>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AuthorBadge
                    name={formData.authorName}
                    avatar={formData.authorAvatar}
                    size="md"
                    showRole={false}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {isAr ? 'رمز الهوية المعتمد (ح م)' : 'Monogram (HM)'}
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {isAr ? '✓ تم حذف الصورة الشخصية بنجاح' : '✓ Photo deleted per request'}
                    </span>
                  </div>
                </div>

                {formData.authorAvatar && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, authorAvatar: '' })}
                    className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-red-200 transition-colors"
                  >
                    {isAr ? 'تأكيد حذف الصورة' : 'Remove Photo'}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'نبذة تعريفية عن الكاتب (Author Bio):' : 'Author Bio:'}
              </label>
              <textarea
                rows={3}
                value={formData.authorBio}
                onChange={(e) => setFormData({ ...formData, authorBio: e.target.value })}
                className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: 24h Auto-Publishing Daemon Status (Decommissioned cleanly per user request) */}
      {activeTab === 'auto-publish' && (
        <AutoPublishSettingsTab formData={formData} setFormData={setFormData} isAr={isAr} />
      )}

      {/* Tab: 30-Minute Decor Social Publishing Bot Dashboard */}
      {activeTab === 'social-bot' && (
        <SocialPublishingBotDashboard
          settings={formData}
          onUpdateSettings={(newSettings) => {
            setFormData(newSettings);
            onSaveSettings(newSettings);
          }}
          articles={articles}
        />
      )}

      {/* Tab: Theme & Appearance */}
      {activeTab === 'theme' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 animate-in fade-in duration-200">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-500" />
            {isAr ? 'تخصيص المظهر وستايل الووردبريس' : 'Theme & Accent Palette'}
          </h2>

          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              {isAr ? 'لون التمييز الأساسي (Accent Color):' : 'Primary Accent Color:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'blue', label: 'WordPress Blue', color: 'bg-blue-600' },
                { id: 'emerald', label: 'Emerald Creative', color: 'bg-emerald-600' },
                { id: 'purple', label: 'Royal Violet', color: 'bg-indigo-600' },
                { id: 'amber', label: 'Amber Gold', color: 'bg-amber-600' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, themeColor: item.id as SiteSettings['themeColor'] })
                  }
                  className={`p-3.5 rounded-2xl border text-center transition-all flex items-center gap-2.5 ${
                    formData.themeColor === item.id
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full ${item.color}`}></span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Data & Backup */}
      {activeTab === 'data' && (
        <DataBackupSettingsTab
          formData={formData}
          setFormData={setFormData}
          articles={articles}
          onSaveSettings={onSaveSettings}
          onImportArticles={onImportArticles}
          onResetData={onResetData}
          setImportNotification={setImportNotification}
          isAr={isAr}
        />
      )}

      {/* Tab: Contractor Accounts Notebook (Strictly for Owner الحضرى محمود) */}
      {activeTab === 'contractor-notebook' && isOwner && (
        <ContractorNotebook currentUser={currentUser} settings={settings} />
      )}
    </div>
  );
};
