import React, { useState } from 'react';
import {
  Home,
  BookOpen,
  Info,
  Mail,
  ShieldCheck,
  Scale,
  Bot,
  Lock,
  Menu,
  X,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Github,
  MessageCircle,
  Send,
  Sparkles,
  LayoutDashboard,
  Volume2,
  Bell
} from 'lucide-react';
import { ActiveTab, SiteSettings, AdminUser } from '../types/blog';

interface HeaderProps {
  settings: SiteSettings;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenBot: () => void;
  onOpenAdminLogin: () => void;
  adminUser: AdminUser | null;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  activeTab,
  setActiveTab,
  onOpenBot,
  onOpenAdminLogin,
  adminUser,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAr = settings.language === 'ar';
  const social = settings.socialLinks;

  // The 6 strict public frontend pages requested by user:
  // الرئيسية، المقالات، معلومات عنا، اتصل بنا، سياسة الخصوصية، شروط الاستخدام
  const publicNavItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: isAr ? 'الرئيسية' : 'Home', icon: Home },
    { id: 'articles', label: isAr ? 'المقالات' : 'Articles', icon: BookOpen },
    { id: 'about', label: isAr ? 'معلومات عنا' : 'About Us', icon: Info },
    { id: 'contact', label: isAr ? 'اتصل بنا' : 'Contact Us', icon: Mail },
    { id: 'privacy', label: isAr ? 'سياسة الخصوصية' : 'Privacy', icon: ShieldCheck },
    { id: 'terms', label: isAr ? 'شروط الاستخدام' : 'Terms', icon: Scale },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      {/* Top Utility Bar with Social Media and Date */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {isAr ? 'مدونة التصميم والتقنية الذكية' : 'Creative Design & AI Technology Hub'}
            </span>
            <span className="text-slate-400 border-s border-slate-700 ps-3 hidden md:inline">
              {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* Social Links from Settings */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 hidden lg:inline">
              {isAr ? 'تابعنا على:' : 'Follow us:'}
            </span>
            <div className="flex items-center gap-2">
              {social.facebook && (
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:text-blue-400 transition-colors"
                  title="Facebook"
                >
                  <Facebook className="w-3.5 h-3.5" />
                </a>
              )}
              {social.twitter && (
                <a
                  href={social.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:text-sky-400 transition-colors"
                  title="X (Twitter)"
                >
                  <Twitter className="w-3.5 h-3.5" />
                </a>
              )}
              {social.instagram && (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:text-pink-400 transition-colors"
                  title="Instagram"
                >
                  <Instagram className="w-3.5 h-3.5" />
                </a>
              )}
              {social.linkedin && (
                <a
                  href={social.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:text-blue-500 transition-colors"
                  title="LinkedIn"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                </a>
              )}
              {social.youtube && (
                <a
                  href={social.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:text-red-500 transition-colors"
                  title="YouTube"
                >
                  <Youtube className="w-3.5 h-3.5" />
                </a>
              )}
              {social.github && (
                <a
                  href={social.github}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:text-white transition-colors"
                  title="GitHub"
                >
                  <Github className="w-3.5 h-3.5" />
                </a>
              )}
              {social.whatsapp && (
                <a
                  href={social.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:text-emerald-400 transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              )}
              {social.telegram && (
                <a
                  href={social.telegram}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:text-sky-300 transition-colors"
                  title="Telegram"
                >
                  <Send className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Logo / Brand Name */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <span className="font-black text-xl tracking-tighter">α</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  {settings.blogName}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold uppercase tracking-wider">
                  {settings.blogNameEn}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 max-w-[260px] hidden sm:block">
                {isAr ? settings.tagline : settings.taglineEn}
              </p>
            </div>
          </div>

          {/* Desktop Nav Items (Strictly Public Pages) */}
          <nav className="hidden lg:flex items-center gap-1">
            {publicNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Right Actions: Blind Screen Reader, ChatBot & Admin Portal */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Follow Blog Quick Button («تابعنا ليصلك كل جديد») */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-hadary-follow-modal'))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs sm:text-sm font-black shadow-sm shadow-amber-500/20 active:scale-95 transition-all cursor-pointer border border-amber-300 ring-2 ring-amber-400/20"
              title={isAr ? 'تابعنا ليصلك كل جديد - إشراف الحضرى محمود' : 'Follow Blog For Updates'}
            >
              <Bell className="w-4 h-4 text-slate-950 animate-bounce" />
              <span className="hidden sm:inline">{isAr ? 'تابعنا' : 'Follow'}</span>
            </button>

            {/* Screen Reader & Audio Host for the Blind */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-blind-screen-reader'))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 text-xs sm:text-sm font-black shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer border border-amber-300 ring-2 ring-amber-400/20"
              title={isAr ? 'قارئ الشاشة للمكفوفين والمضيف الصوتي (Alt + S)' : 'Screen Reader for the Blind (Alt + S)'}
              aria-label="قارئ الشاشة للمكفوفين والمضيف الصوتي"
            >
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span className="hidden md:inline">{isAr ? 'قارئ المكفوفين' : 'Voice Reader'}</span>
            </button>

            {/* AI Chatbot Launcher Button */}
            <button
              onClick={onOpenBot}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-semibold shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer"
              title={isAr ? 'افتح بوت ألفا الذكي' : 'Open Alpha Bot'}
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">{isAr ? 'بوت ألفا' : 'Alpha Bot'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
            </button>

            {/* Backend / Admin Entrance (Owner & Supervisors) */}
            {adminUser?.isLoggedIn ? (
              <button
                onClick={() => setActiveTab('backend')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                  activeTab === 'backend'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                }`}
                title={isAr ? 'لوحة تحكم الباك إند' : 'Backend Dashboard'}
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-500" />
                <span className="hidden sm:inline">{isAr ? 'لوحة الإدارة (الباك إند)' : 'Admin Backend'}</span>
              </button>
            ) : (
              <button
                onClick={onOpenAdminLogin}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                title={isAr ? 'دخول صاحب الموقع والمشرفين' : 'Admin Login'}
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>{isAr ? 'دخول الإدارة' : 'Admin Login'}</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-1.5 animate-in slide-in-from-top duration-200">
          {publicNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            {adminUser?.isLoggedIn ? (
              <button
                onClick={() => {
                  setActiveTab('backend');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'لوحة تحكم الباك إند (المشرفين)' : 'Backend Portal'}</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                  {isAr ? 'نشط' : 'Logged in'}
                </span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onOpenAdminLogin();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                <Lock className="w-4 h-4" />
                <span>{isAr ? 'دخول الإدارة والمشرفين' : 'Admin & Supervisors Login'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
