import React, { useState } from 'react';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Github,
  MessageCircle,
  Send,
  Sparkles,
  ArrowUp,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Scale,
  Info,
  BookOpen,
  Home
} from 'lucide-react';
import { ActiveTab, SiteSettings } from '../types/blog';

interface FooterProps {
  settings: SiteSettings;
  setActiveTab: (tab: ActiveTab) => void;
  categories: string[];
  onSelectCategory: (cat: string) => void;
  onOpenAdminLogin: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  setActiveTab,
  categories,
  onSelectCategory,
  onOpenAdminLogin,
}) => {
  const isAr = settings.language === 'ar';
  const social = settings.socialLinks;
  const authorName = settings.authorName || 'الحضرى محمود';

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [newsletterError, setNewsletterError] = useState('');

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || newsletterLoading) return;

    setNewsletterLoading(true);
    setNewsletterError('');
    setNewsletterSuccess(false);

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (isAr ? 'تعذر تسجيل الاشتراك.' : 'Failed to subscribe.'));
      }

      setNewsletterSuccess(true);
      setNewsletterMessage(data.message || (isAr ? 'تم حفظ اشتراكك بنجاح في نشرة ألفا ديزاين!' : 'Subscribed successfully!'));
      setNewsletterEmail('');
      setTimeout(() => setNewsletterSuccess(false), 6000);
    } catch (err: any) {
      setNewsletterError(err.message || (isAr ? 'حدث خطأ أثناء الاشتراك.' : 'An error occurred.'));
      setTimeout(() => setNewsletterError(''), 5000);
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Top Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
                α
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white tracking-tight">
                  {settings.blogName}
                </span>
                <span className="text-xs text-blue-400 font-medium">
                  {settings.blogNameEn}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {isAr ? settings.tagline : settings.taglineEn}
            </p>

            <div className="pt-2">
              <span className="text-xs font-semibold text-slate-400 block mb-2.5">
                {isAr ? 'روابط التواصل الاجتماعي الرسمية:' : 'Official Social Channels:'}
              </span>
              <div className="flex flex-wrap gap-2">
                {social.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title="Facebook"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {social.twitter && (
                  <a
                    href={social.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-sky-500 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title="X (Twitter)"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {social.instagram && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-pink-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title="Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {social.linkedin && (
                  <a
                    href={social.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-blue-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title="LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {social.youtube && (
                  <a
                    href={social.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-red-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title="YouTube"
                  >
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
                {social.github && (
                  <a
                    href={social.github}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title="GitHub"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                )}
                {social.whatsapp && (
                  <a
                    href={social.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-emerald-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
                {social.telegram && (
                  <a
                    href={social.telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-sky-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    title="Telegram"
                  >
                    <Send className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Public Pages Directory */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              {isAr ? 'صفحات المدونة للزوار' : 'Visitor Pages'}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <button
                  onClick={() => setActiveTab('home')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>{isAr ? 'الرئيسية' : 'Home'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('articles')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تصفح المقالات' : 'All Articles'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('about')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>{isAr ? 'معلومات عنا (من نحن)' : 'About Us'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('contact')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{isAr ? 'اتصل بنا' : 'Contact Us'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('privacy')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('terms')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>{isAr ? 'شروط الاستخدام' : 'Terms of Use'}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 border-b border-slate-800 pb-2">
              {isAr ? 'تصنيفات المقالات' : 'Categories'}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {categories.slice(1).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    onSelectCategory(cat);
                    setActiveTab('articles');
                  }}
                  className="px-2.5 py-1 text-xs rounded-md bg-slate-900 hover:bg-blue-900/40 text-slate-300 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Newsletter Box */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              {isAr ? 'النشرة البريدية' : 'Newsletter'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isAr
                ? 'اشترك ليصلك ملخص مقالات التصميم والذكاء الاصطناعي أسبوعياً.'
                : 'Get weekly design insights and AI trends delivered to your inbox.'}
            </p>

            {newsletterSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{newsletterMessage || (isAr ? 'تم الاشتراك بنجاح في نشرة ألفا ديزاين!' : 'Subscribed successfully!')}</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="email"
                    required
                    disabled={newsletterLoading}
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder={isAr ? 'بريدك الإلكتروني...' : 'Your email...'}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={newsletterLoading}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{newsletterLoading ? (isAr ? 'جاري...' : '...') : (isAr ? 'اشتراك' : 'Join')}</span>
                  </button>
                </div>
                {newsletterError && (
                  <p className="text-[11px] text-red-400 mt-1">{newsletterError}</p>
                )}
              </form>
            )}

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isAr ? 'نحترم خصوصيتك بدون أي إعلانات مزعجة' : 'No spam, unsubscribe anytime'}</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} {settings.blogName} ({settings.blogNameEn}) | {isAr ? `إدارة وصاحب المدونة «${authorName}»` : `Founded by ${authorName}`}
          </p>

          <div className="flex items-center gap-5">
            {/* Discrete Admin Portal Link */}
            <button
              onClick={onOpenAdminLogin}
              className="text-slate-400 hover:text-blue-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              title={isAr ? 'بوابة دخول صاحب الموقع والمشرفين' : 'Admin Portal'}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isAr ? 'بوابة الإدارة والمشرفين (الباك إند)' : 'Admin Portal'}</span>
            </button>

            <button
              onClick={scrollToTop}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isAr ? 'الصعود للأعلى' : 'Back to top'}
            >
              <span>{isAr ? 'للأعلى' : 'Top'}</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
