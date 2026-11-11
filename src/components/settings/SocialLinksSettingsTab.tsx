import React from 'react';
import {
  Share2,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Github,
  MessageCircle,
  Send,
  Bot,
  ShieldCheck,
} from 'lucide-react';
import { SiteSettings } from '../../types/blog';

interface SocialLinksSettingsTabProps {
  formData: SiteSettings;
  setFormData: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isAr: boolean;
}

export const SocialLinksSettingsTab: React.FC<SocialLinksSettingsTabProps> = ({
  formData,
  setFormData,
  isAr,
}) => {
  const handleSocialChange = (key: keyof SiteSettings['socialLinks'], val: string) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [key]: val,
      },
    }));
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-8 animate-in fade-in duration-200">
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Share2 className="w-5 h-5 text-blue-600" />
          <span>{isAr ? 'روابط شبكات التواصل الاجتماعي الرسمية' : 'Social Media Channel Links'}</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isAr
            ? 'الروابط التي تكتبها هنا ستظهر مباشرة في الصفحة الرئيسية (في شريط الهيدر العلوي، وبنر الترحيب، وبطاقة الكاتب الجانبية، والفوتر).'
            : 'Links configured here appear directly on the homepage, hero section, sidebar author card, and footer.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Facebook className="w-4 h-4 text-blue-600" />
            <span>Facebook (فيسبوك)</span>
          </label>
          <input
            type="url"
            value={formData.socialLinks.facebook}
            onChange={(e) => handleSocialChange('facebook', e.target.value)}
            placeholder="https://facebook.com/your-page"
            className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Twitter className="w-4 h-4 text-sky-500" />
            <span>X / Twitter (تويتر)</span>
          </label>
          <input
            type="url"
            value={formData.socialLinks.twitter}
            onChange={(e) => handleSocialChange('twitter', e.target.value)}
            placeholder="https://x.com/your-handle"
            className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Instagram className="w-4 h-4 text-pink-500" />
            <span>Instagram (إنستغرام)</span>
          </label>
          <input
            type="url"
            value={formData.socialLinks.instagram}
            onChange={(e) => handleSocialChange('instagram', e.target.value)}
            placeholder="https://instagram.com/your-account"
            className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-blue-700" />
            <span>LinkedIn (لينكد إن)</span>
          </label>
          <input
            type="url"
            value={formData.socialLinks.linkedin}
            onChange={(e) => handleSocialChange('linkedin', e.target.value)}
            placeholder="https://linkedin.com/in/your-profile"
            className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Youtube className="w-4 h-4 text-red-600" />
            <span>YouTube (يوتيوب)</span>
          </label>
          <input
            type="url"
            value={formData.socialLinks.youtube}
            onChange={(e) => handleSocialChange('youtube', e.target.value)}
            placeholder="https://youtube.com/@your-channel"
            className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Github className="w-4 h-4 text-slate-800 dark:text-slate-200" />
            <span>GitHub (جيت هب)</span>
          </label>
          <input
            type="url"
            value={formData.socialLinks.github}
            onChange={(e) => handleSocialChange('github', e.target.value)}
            placeholder="https://github.com/your-username"
            className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp (واتساب)</span>
          </label>
          <input
            type="url"
            value={formData.socialLinks.whatsapp}
            onChange={(e) => handleSocialChange('whatsapp', e.target.value)}
            placeholder="https://wa.me/201..."
            className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Send className="w-4 h-4 text-sky-500" />
            <span>Telegram (تيليجرام)</span>
          </label>
          <input
            type="url"
            value={formData.socialLinks.telegram}
            onChange={(e) => handleSocialChange('telegram', e.target.value)}
            placeholder="https://t.me/your-channel"
            className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Live Preview of Social Badges */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
          {isAr ? 'معاينة حية لشكل روابط التواصل بالصفحة الرئيسية:' : 'Live Preview of Social Badges on Homepage:'}
        </span>
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex flex-wrap gap-2 items-center">
          {Object.entries(formData.socialLinks).map(([k, val]) => {
            if (!val) return null;
            return (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium shadow-xs"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="capitalize">{k}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Bot Social Media Delegation Panel */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              <span>{isAr ? 'ميزة تفويض البوت بنشر روابط المقالات في وسائل التواصل' : 'Bot Social Broadcast Delegation'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr
                ? `يتيح هذا الخيار للبوت نشر روابط المقالات ومشاركتها في حسابات التواصل بتفويض رسمي منك كصاحب للمدونة (${formData.authorName}).`
                : `Empower the bot to share article links on your social media channels under your delegation.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {formData.socialBroadcast?.isDelegated ? (isAr ? 'التفويض مفعّل' : 'Authorized') : (isAr ? 'التفويض معطل' : 'Disabled')}
            </span>
          </div>
        </div>

        {/* Delegation Switch */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-slate-800 dark:to-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.socialBroadcast?.isDelegated}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  socialBroadcast: {
                    ...formData.socialBroadcast,
                    isDelegated: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-bold text-sm text-slate-900 dark:text-white block">
                {isAr
                  ? `أفوض "بوت ألفا" رسمياً بنشر ومشاركة روابط المقالات على قنواتي الاجتماعية`
                  : `Authorize Alpha Bot to publish article links on my behalf`}
              </span>
              <span className="text-xs text-slate-500">
                {isAr
                  ? `صاحب التفويض: ${formData.authorName} - يتم توثيق اسم المفوض في كل عملية نشر.`
                  : `Delegated by: ${formData.authorName}`}
              </span>
            </div>
          </label>

          {formData.socialBroadcast?.isDelegated && (
            <div className="pt-3 border-t border-blue-100 dark:border-blue-900/60 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {isAr ? 'المنصات المعتمدة للنشر التلقائي للروابط:' : 'Authorized Broadcast Channels:'}
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { id: 'twitter', label: 'X / Twitter' },
                  { id: 'facebook', label: 'Facebook' },
                  { id: 'linkedin', label: 'LinkedIn' },
                  { id: 'telegram', label: 'Telegram' },
                  { id: 'whatsapp', label: 'WhatsApp' },
                ].map((ch) => {
                  const isChecked = formData.socialBroadcast?.activeNetworks?.includes(
                    ch.id as any
                  );
                  return (
                    <label
                      key={ch.id}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const list = formData.socialBroadcast?.activeNetworks || [];
                          const updated = e.target.checked
                            ? [...list, ch.id as any]
                            : list.filter((n) => n !== ch.id);
                          setFormData({
                            ...formData,
                            socialBroadcast: {
                              ...formData.socialBroadcast,
                              activeNetworks: updated,
                            },
                          });
                        }}
                        className="hidden"
                      />
                      <span>{ch.label}</span>
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'الوسوم الافتراضية التي يرفقها البوت مع الرابط:' : 'Default Hashtags:'}
                </label>
                <input
                  type="text"
                  value={formData.socialBroadcast?.customHashtags || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialBroadcast: {
                        ...formData.socialBroadcast,
                        customHashtags: e.target.value,
                      },
                    })
                  }
                  placeholder="#الفا_ديزاين #دهانات #ديكور"
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
