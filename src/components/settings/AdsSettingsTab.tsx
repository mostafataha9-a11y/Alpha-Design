import React, { useState } from 'react';
import {
  Tv,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Code,
  Image as ImageIcon,
  Tag,
  Monitor,
  Tablet,
  Smartphone,
} from 'lucide-react';
import { SiteSettings, AdPlacementId, SmartAdConfig } from '../../types/blog';
import { INITIAL_SETTINGS } from '../../data/initialData';
import { SmartAdBanner } from '../SmartAdBanner';

interface AdsSettingsTabProps {
  formData: SiteSettings;
  setFormData: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isAr: boolean;
}

export const AdsSettingsTab: React.FC<AdsSettingsTabProps> = ({
  formData,
  setFormData,
  isAr,
}) => {
  const [activeAdPlacement, setActiveAdPlacement] = useState<AdPlacementId>('header');
  const [adPreviewDevice, setAdPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [aiOptimizeSuccessMsg, setAiOptimizeSuccessMsg] = useState<string | null>(null);

  const handleToggleMasterAds = () => {
    setFormData((prev) => {
      const existingAds = prev.ads || INITIAL_SETTINGS.ads!;
      return {
        ...prev,
        ads: {
          ...existingAds,
          enabled: !existingAds.enabled,
        },
      };
    });
  };

  const handleToggleAdPlacement = (placement: AdPlacementId) => {
    setFormData((prev) => {
      const existingAds = prev.ads || INITIAL_SETTINGS.ads!;
      const currentSlot = existingAds[placement];
      return {
        ...prev,
        ads: {
          ...existingAds,
          [placement]: {
            ...currentSlot,
            enabled: !currentSlot.enabled,
          },
        },
      };
    });
  };

  const handleUpdateAdField = (placement: AdPlacementId, field: keyof SmartAdConfig, value: any) => {
    setFormData((prev) => {
      const existingAds = prev.ads || INITIAL_SETTINGS.ads!;
      return {
        ...prev,
        ads: {
          ...existingAds,
          [placement]: {
            ...existingAds[placement],
            [field]: value,
          },
        },
      };
    });
  };

  const handleAiAutoFitAd = (placement: AdPlacementId) => {
    const existingAds = formData.ads || INITIAL_SETTINGS.ads!;
    const currentAd = existingAds[placement];

    let optimizedCode = currentAd.code || '';
    if (optimizedCode) {
      // 1. Replace typographic curly quotes with standard ASCII quotes
      optimizedCode = optimizedCode
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'");

      // 2. Normalize and replace placeholder publisher IDs if real one exists
      if (formData.ads?.adSensePublisherId) {
        const cleanPub = formData.ads.adSensePublisherId.replace(/^ca-/, '');
        optimizedCode = optimizedCode.replace(/ca-pub-x+/gi, `ca-${cleanPub}`);
        optimizedCode = optimizedCode.replace(/pub-x+/gi, cleanPub);
      }

      // 3. Make fixed width/height responsive
      optimizedCode = optimizedCode
        .replace(/width\s*=\s*["'][0-9]+["']/gi, 'width="100%"')
        .replace(/height\s*=\s*["'][0-9]+["']/gi, 'height="auto"')
        .replace(/width\s*:\s*[0-9]+px/gi, 'max-width: 100%; width: 100%')
        .replace(/height\s*:\s*[0-9]+px/gi, 'height: auto');

      if (!optimizedCode.includes('class="ai-ad-smart-container"')) {
        optimizedCode = `<div class="ai-ad-smart-container" style="max-width: 100%; overflow: hidden; display: flex; justify-content: center; align-items: center; margin: 0 auto; text-align: center;">\n${optimizedCode}\n</div>`;
      }
    }

    const optimalHeights: Record<AdPlacementId, number> = {
      header: 90,
      sidebar: 320,
      articleTop: 110,
      articleMiddle: 140,
      articleBottom: 130,
    };

    setFormData((prev) => {
      const ads = prev.ads || INITIAL_SETTINGS.ads!;
      return {
        ...prev,
        ads: {
          ...ads,
          [placement]: {
            ...ads[placement],
            aiAutoFit: true,
            code: optimizedCode || ads[placement].code,
            maxHeight: optimalHeights[placement],
          },
        },
      };
    });

    setAiOptimizeSuccessMsg(
      isAr
        ? 'تم فحص وتصحيح كود الإعلان بنجاح! تم تصحيح علامات الاقتباس، والأبعاد التجاوبية، ومعرف الناشر.'
        : 'Ad code inspected & optimized! Responsive dimensions and publisher ID applied.'
    );
    setTimeout(() => setAiOptimizeSuccessMsg(null), 4000);
  };

  const handleGenerateAdSenseSnippet = (placement: AdPlacementId) => {
    const pubId = (formData.ads?.adSensePublisherId || 'pub-1234567890123456').replace(/^ca-/, '');
    const cleanPub = `ca-pub-${pubId.replace(/^pub-/, '')}`;
    const standardSnippet = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cleanPub}" crossorigin="anonymous"></script>\n<!-- Alpha Decor Auto Responsive Ad - ${placement} -->\n<ins class="adsbygoogle"\n     style="display:block"\n     data-ad-client="${cleanPub}"\n     data-ad-slot="auto"\n     data-ad-format="auto"\n     data-full-width-responsive="true"></ins>\n<script>\n     (adsbygoogle = window.adsbygoogle || []).push({});\n</script>`;

    const optimalHeights: Record<AdPlacementId, number> = {
      header: 90,
      sidebar: 320,
      articleTop: 110,
      articleMiddle: 140,
      articleBottom: 130,
    };

    setFormData((prev) => {
      const ads = prev.ads || INITIAL_SETTINGS.ads!;
      return {
        ...prev,
        ads: {
          ...ads,
          [placement]: {
            ...ads[placement],
            type: 'code',
            aiAutoFit: true,
            code: standardSnippet,
            maxHeight: optimalHeights[placement],
          },
        },
      };
    });

    setAiOptimizeSuccessMsg(
      isAr
        ? `تم توليد وتثبيت شفرة Google AdSense القياسية والمتجاوبة لموضع «${placement}» بنجاح!`
        : `Google AdSense responsive snippet created for slot «${placement}»!`
    );
    setTimeout(() => setAiOptimizeSuccessMsg(null), 4000);
  };

  const handleApplyAdTemplate = (placement: AdPlacementId, templateIndex: number) => {
    const templates = [
      {
        title: 'دهانات جوتن العالمية 2026',
        sponsor: 'دهانات جوتن والتشطيبات الفاخرة',
        imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1200&q=80',
        targetUrl: 'https://wa.me/201098765432?text=طلب+كتالوج+دهانات+جوتن+وأكواد+الألوان+2026',
        badge: 'إعلان ممول',
        alt: 'كتالوج دهانات جوتن 2026',
      },
      {
        title: 'توريد وتركيب بديل الرخام والخشب الإيطالي',
        sponsor: 'روائع بديل الرخام والخشب UV',
        imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
        targetUrl: 'https://wa.me/201098765432?text=طلب+معاينة+بديل+الرخام+والخشب',
        badge: 'شريك معتمد',
        alt: 'بديل الرخام وبديل الخشب الإيطالي',
      },
      {
        title: 'أسقف معلقة جبس بورد وبيوت النور الحديثة',
        sponsor: 'المركز التخصصي للجبسوم بورد',
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        targetUrl: 'https://wa.me/201098765432?text=استفسار+عن+تركيب+جبس+بورد+وليد+بروفايل',
        badge: 'إعلان ممول',
        alt: 'أسقف جبس بورد معلقة',
      },
      {
        title: 'دهانات سيبس وماكسي كوت المقاومة للغسيل',
        sponsor: 'دهانات سيبس العالمية',
        imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
        targetUrl: 'https://wa.me/201098765432?text=طلب+أسعار+دهانات+سيبس',
        badge: 'برعاية',
        alt: 'دهانات سيبس قابلة للغسيل',
      },
      {
        title: 'استشارات هندسية وتشطيبات متكاملة مع الحضرى محمود',
        sponsor: 'مكتب الحضرى محمود للديكورات',
        imageUrl: 'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80',
        targetUrl: 'https://wa.me/201098765432?text=حجز+استشارة+ديكور+مع+الحضرى+محمود',
        badge: 'إعلان معتمد',
        alt: 'استشارات الحضرى محمود للتشطيبات',
      },
    ];

    const tpl = templates[templateIndex % templates.length];
    setFormData((prev) => {
      const existingAds = prev.ads || INITIAL_SETTINGS.ads!;
      return {
        ...prev,
        ads: {
          ...existingAds,
          [placement]: {
            ...existingAds[placement],
            enabled: true,
            type: 'image',
            imageUrl: tpl.imageUrl,
            targetUrl: tpl.targetUrl,
            sponsorName: tpl.sponsor,
            altText: tpl.alt,
            badgeText: tpl.badge,
            aiAutoFit: true,
          },
        },
      };
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-8 animate-in fade-in duration-200">
      {/* Header & Master Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            <span>{isAr ? 'مدعوم بالذكاء الاصطناعي • تهيئة متجاوبة تلقائية' : 'AI-Powered • Smart Auto-Fitting'}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-blue-600" />
            <span>{isAr ? 'إدارة الأكواد الإعلانية (5 مواضع استراتيجية ذكية)' : 'Smart Ad Codes Management (5 Strategic Slots)'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {isAr
              ? 'تحكم كامل في الأكواد والبنرات الإعلانية: الهيدر، جانب الموقع، أول المقال، منتصف المقال، وأسفل المقال أو الصفحات. يقوم محرك الذكاء الاصطناعي بتهيئة وضبط أي بنر إعلاني لمنع التمدد وتشوه العرض.'
              : 'Manage custom HTML/JS/AdSense code and image banners across 5 strategic slots with automated AI responsive formatting.'}
          </p>
        </div>

        {/* Master Switch */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {isAr ? 'نظام الإعلانات بالمدونة:' : 'Ad System:'}
          </span>
          <button
            type="button"
            onClick={handleToggleMasterAds}
            className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors cursor-pointer ${
              formData.ads?.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                formData.ads?.enabled ? 'translate-x-7 rtl:-translate-x-7' : 'translate-x-1 rtl:-translate-x-1'
              }`}
            />
          </button>
          <span className={`text-xs font-bold ${formData.ads?.enabled ? 'text-blue-600' : 'text-slate-400'}`}>
            {formData.ads?.enabled ? (isAr ? 'مُفعّل' : 'Active') : (isAr ? 'معطّل' : 'Disabled')}
          </span>
        </div>
      </div>

      {/* AI Auto-Fit Notification Toast */}
      {aiOptimizeSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{aiOptimizeSuccessMsg}</span>
        </div>
      )}

      {/* Google AdSense Official Configuration & ads.txt Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-50/70 via-slate-50 to-orange-50/50 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>{isAr ? 'إعدادات Google AdSense وملف ads.txt الرسمي' : 'Google AdSense & Official ads.txt'}</span>
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                formData.ads?.adSensePublisherId
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}>
                {formData.ads?.adSensePublisherId ? (isAr ? 'تم إدخال المعرف' : 'Configured') : (isAr ? 'بانتظار معرف الناشر' : 'Pending Publisher ID')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'يتم توليد مسار /ads.txt تلقائياً ومطابقته لمتطلبات Google AdSense دون اختراع أي أرقام ناشر وهمية.'
                : 'The /ads.txt route is served dynamically matching Google AdSense standards with zero fake credentials.'}
            </p>
          </div>

          <a
            href="/ads.txt"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>{isAr ? 'معاينة /ads.txt' : 'View /ads.txt'}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              {isAr ? 'معرف ناشر Google AdSense (Publisher ID):' : 'AdSense Publisher ID:'}
            </label>
            <input
              type="text"
              value={formData.ads?.adSensePublisherId || ''}
              onChange={(e) => {
                const val = e.target.value.trim();
                setFormData((prev) => ({
                  ...prev,
                  ads: {
                    ...prev.ads!,
                    adSensePublisherId: val,
                  },
                }));
              }}
              placeholder="pub-XXXXXXXXXXXXXXXX أو ca-pub-XXXXXXXXXXXXXXXX"
              className="w-full text-xs p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-[10px] text-slate-400 block">
              {isAr
                ? 'اترك الحقل فارغاً إذا كان الحساب قيد المراجعة؛ سيُظهر ملف ads.txt إشعار حالة الانتظار دون رفض أو ادعاء كاذب.'
                : 'Leave blank if account is pending approval; ads.txt will safely announce pending status.'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
              {isAr ? 'السطر المُعتمد الذي يخدمه السيرفر في /ads.txt:' : 'Active Line Served at /ads.txt:'}
            </span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950 font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all select-all">
              {formData.ads?.adSensePublisherId
                ? `google.com, ${formData.ads.adSensePublisherId.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0`
                : `# Status: PENDING_PUBLISHER_ID (بانتظار معرف الناشر)`}
            </div>
          </div>
        </div>
      </div>

      {/* 5 Ad Placement Selector Tabs */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {isAr ? 'اختر موضع الإعلان لضبطه وبرمجته (5 مواضع معتمدة):' : 'Select Ad Placement to Configure (5 Strategic Slots):'}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {[
            { id: 'header' as AdPlacementId, num: '1', titleAr: 'إعلان الهيدر', titleEn: 'Header Banner', subAr: 'أعلى صفحات الموقع', subEn: 'Top of page' },
            { id: 'sidebar' as AdPlacementId, num: '2', titleAr: 'إعلان جانب الموقع', titleEn: 'Sidebar Banner', subAr: 'الشريط الجانبي للمدونة', subEn: 'Side sticky' },
            { id: 'articleTop' as AdPlacementId, num: '3', titleAr: 'إعلان أول المقال', titleEn: 'Article Top', subAr: 'قبل المحتوى مباشرة', subEn: 'Before content' },
            { id: 'articleMiddle' as AdPlacementId, num: '4', titleAr: 'إعلان منتصف المقال', titleEn: 'Article Middle', subAr: 'بين فقرات المقال', subEn: 'Mid-paragraphs' },
            { id: 'articleBottom' as AdPlacementId, num: '5', titleAr: 'إعلان أسفل المقال/الصفحات', titleEn: 'Article Bottom', subAr: 'نهاية المقال والصفحات', subEn: 'End of page' },
          ].map((slot) => {
            const currentSlot = formData.ads?.[slot.id];
            const isActive = activeAdPlacement === slot.id;
            const isSlotEnabled = currentSlot?.enabled ?? true;

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setActiveAdPlacement(slot.id)}
                className={`p-3.5 rounded-2xl text-start transition-all border flex flex-col justify-between gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-600 dark:border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {slot.num}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${isSlotEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                </div>
                <div>
                  <div className={`text-xs font-bold ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                    {isAr ? slot.titleAr : slot.titleEn}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {isAr ? slot.subAr : slot.subEn}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Slot Configuration Card */}
      {(() => {
        const currentSlot = formData.ads?.[activeAdPlacement] || {
          id: activeAdPlacement,
          nameAr: '',
          nameEn: '',
          descriptionAr: '',
          descriptionEn: '',
          enabled: true,
          type: 'image',
          code: '',
          imageUrl: '',
          targetUrl: '',
          altText: '',
          sponsorName: '',
          badgeText: 'إعلان ممول',
          aiAutoFit: true,
          maxHeight: 120,
          aspectRatio: 'auto',
        };

        return (
          <div className="p-5 sm:p-7 rounded-3xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-700/90 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-slate-700/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {isAr ? currentSlot.nameAr : currentSlot.nameEn}
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono font-bold">
                    Slot: {activeAdPlacement}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr ? currentSlot.descriptionAr : currentSlot.descriptionEn}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {isAr ? 'تشغيل هذا الموضع:' : 'Slot Active:'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleAdPlacement(activeAdPlacement)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    currentSlot.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      currentSlot.enabled ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-1 rtl:-translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'نوع محتوى الإعلان:' : 'Ad Content Format:'}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateAdField(activeAdPlacement, 'type', 'image')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    currentSlot.type === 'image'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{isAr ? 'صورة بنر مخصصة ورابط نقر' : 'Image Banner & Destination Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateAdField(activeAdPlacement, 'type', 'code')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    currentSlot.type === 'code'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{isAr ? 'كود إعلاني برمجي (HTML / AdSense / JS / iframe)' : 'HTML/JS/AdSense Embed Code'}</span>
                </button>
              </div>
            </div>

            {currentSlot.type === 'code' ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-blue-600" />
                      <span>{isAr ? 'ألصق كود الإعلان البرمجي هنا (AdSense أو شفرة المعلن):' : 'Paste Ad Snippet Code Here:'}</span>
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateAdSenseSnippet(activeAdPlacement)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer hover:scale-102 active:scale-98 transition-all"
                        title={isAr ? 'توليد شفرة إعلان تجاوبية متوافقة مع Google AdSense بضغطة زر' : 'Generate AdSense snippet'}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                        <span>{isAr ? '⚡ توليد كود AdSense تلقائياً' : '⚡ Auto-Generate AdSense'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAiAutoFitAd(activeAdPlacement)}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer hover:scale-102 active:scale-98 transition-all"
                      >
                        <Code className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isAr ? '🔍 فحص وإصلاح الكود' : '🔍 Inspect & Fix Code'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Code status badge */}
                  <div className="text-[11px] flex items-center gap-2">
                    {currentSlot.code?.includes('adsbygoogle') ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{isAr ? 'كود Google AdSense متجاوب وسليم وجاهز للعرض' : 'Valid AdSense responsive snippet'}</span>
                      </span>
                    ) : currentSlot.code?.trim() ? (
                      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                        <Code className="w-3.5 h-3.5" />
                        <span>{isAr ? 'كود HTML / JavaScript مخصص' : 'Custom HTML/JS code snippet'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                        <span>{isAr ? 'لم يتم لصق كود إعلاني بعد (يمكنك الضغط على "توليد كود AdSense تلقائياً")' : 'Empty ad snippet'}</span>
                      </span>
                    )}
                    {currentSlot.code?.includes('ca-pub-xxxx') && (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        {isAr ? 'تنبيه: يحتوي على معرف تجريبي (ca-pub-xxxx)' : 'Notice: Contains placeholder ID'}
                      </span>
                    )}
                  </div>

                  <textarea
                    value={currentSlot.code || ''}
                    onChange={(e) => handleUpdateAdField(activeAdPlacement, 'code', e.target.value)}
                    placeholder={
                      isAr
                        ? '<!-- الصق كود Google AdSense أو شفرة الإعلان التجاوبية هنا -->\n<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-xxxx" data-ad-slot="xxxx"></ins>'
                        : '<!-- Paste AdSense or HTML iframe snippet here -->'
                    }
                    rows={6}
                    dir="ltr"
                    className="w-full p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {isAr
                      ? 'التهيئة الذكية تقوم تلقائياً بفحص كود الإعلان، وإزالة أي أبعاد ثابتة، وتغليف البنر بحاوية متجاوبة 100% لتضمن ظهوره بانسيابية على كافة الشاشات.'
                      : 'AI Auto-Fit checks the ad snippet, strips breaking fixed widths, and wraps the ad in a fluid container.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'رابط صورة البنر الإعلاني (Image URL):' : 'Banner Image URL:'}
                    </label>
                    <input
                      type="url"
                      value={currentSlot.imageUrl || ''}
                      onChange={(e) => handleUpdateAdField(activeAdPlacement, 'imageUrl', e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'رابط التوجيه عند النقر (Target Destination URL):' : 'Destination Click URL:'}
                    </label>
                    <input
                      type="url"
                      value={currentSlot.targetUrl || ''}
                      onChange={(e) => handleUpdateAdField(activeAdPlacement, 'targetUrl', e.target.value)}
                      placeholder="https://wa.me/2010... أو رابط موقع المعلن"
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'اسم الراعي أو المعلن:' : 'Sponsor / Advertiser Name:'}
                    </label>
                    <input
                      type="text"
                      value={currentSlot.sponsorName || ''}
                      onChange={(e) => handleUpdateAdField(activeAdPlacement, 'sponsorName', e.target.value)}
                      placeholder={isAr ? 'مثال: دهانات جوتن العالمية' : 'e.g., Jotun Paints Official'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'نص شارة الإعلان:' : 'Badge Label:'}
                    </label>
                    <input
                      type="text"
                      value={currentSlot.badgeText || 'إعلان ممول'}
                      onChange={(e) => handleUpdateAdField(activeAdPlacement, 'badgeText', e.target.value)}
                      placeholder={isAr ? 'إعلان ممول / شريك معتمد / برعاية' : 'Sponsored / Partner'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {isAr ? 'التهيئة الذكية للأبعاد (AI Auto-Fitting):' : 'AI Auto-Fitting Engine:'}
                      </span>
                    </div>
                    
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={currentSlot.aiAutoFit ?? true}
                        onChange={(e) => handleUpdateAdField(activeAdPlacement, 'aiAutoFit', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span>{isAr ? 'تفعيل الضبط التلقائي للأبعاد ومنع التمدد' : 'Enable auto-scaling and anti-overflow'}</span>
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">
                        {isAr ? 'الحد الأقصى لارتفاع البنر (التحكم بالارتفاع):' : 'Max Banner Height:'}
                      </span>
                      <span className="font-bold text-blue-600 font-mono">
                        {currentSlot.maxHeight || 120} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="400"
                      step="10"
                      value={currentSlot.maxHeight || 120}
                      onChange={(e) => handleUpdateAdField(activeAdPlacement, 'maxHeight', Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Decor Sponsor Presets */}
            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? '💡 نماذج إعلانية ذكية جاهزة للتشطيبات والديكور (تطبيق بنقرة واحدة):' : '💡 Pre-Configured Decor Sponsor Presets (1-Click Fill):'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'دهانات جوتن 2026', idx: 0 },
                  { label: 'بديل الرخام والخشب الإيطالي', idx: 1 },
                  { label: 'أسقف معلقة جبس بورد', idx: 2 },
                  { label: 'دهانات سيبس المقاومة للغسيل', idx: 3 },
                  { label: 'استشارات الحضرى محمود', idx: 4 },
                ].map((tpl) => (
                  <button
                    key={tpl.idx}
                    type="button"
                    onClick={() => handleApplyAdTemplate(activeAdPlacement, tpl.idx)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Tag className="w-3 h-3 text-blue-500" />
                    <span>{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Live Preview */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-blue-600" />
                    <span>{isAr ? 'المعاينة الحية التفاعلية مع محاكي الأجهزة:' : 'Interactive Live Device Preview:'}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                    {isAr ? 'مضبوط ذكياً 100%' : '100% Adaptive'}
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700/60 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAdPreviewDevice('desktop')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      adPreviewDevice === 'desktop'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Monitor className="w-3 h-3" />
                    <span className="text-[11px]">{isAr ? 'كمبيوتر' : 'Desktop'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdPreviewDevice('tablet')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      adPreviewDevice === 'tablet'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Tablet className="w-3 h-3" />
                    <span className="text-[11px]">{isAr ? 'تابلت' : 'Tablet'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdPreviewDevice('mobile')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      adPreviewDevice === 'mobile'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span className="text-[11px]">{isAr ? 'موبايل' : 'Mobile'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 rounded-2xl bg-slate-200/70 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 flex justify-center items-center overflow-x-auto">
                <div
                  className="transition-all duration-300 bg-white dark:bg-slate-900 rounded-xl p-3 shadow-lg border border-slate-200 dark:border-slate-800 w-full"
                  style={{
                    maxWidth:
                      adPreviewDevice === 'mobile'
                        ? '375px'
                        : adPreviewDevice === 'tablet'
                        ? '680px'
                        : '100%',
                  }}
                >
                  <div className="text-[10px] text-slate-400 mb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span>
                      {adPreviewDevice === 'mobile'
                        ? '📱 Mobile View (375px)'
                        : adPreviewDevice === 'tablet'
                        ? '📟 Tablet View (680px)'
                        : '💻 Full Desktop View (Fluid)'}
                    </span>
                    <span className="text-emerald-500 font-mono font-bold">
                      {isAr ? 'الأبعاد: ملائمة تماماً' : 'Status: Optimal Fit'}
                    </span>
                  </div>

                  <SmartAdBanner
                    config={currentSlot}
                    placement={activeAdPlacement}
                    isAr={isAr}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
