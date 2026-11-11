import React, { useState } from 'react';
import {
  Mail,
  MessageSquare,
  Send,
  MapPin,
  Clock,
  CheckCircle2,
  Phone,
  Sparkles,
  HelpCircle,
  Twitter,
  Facebook,
  Linkedin,
  Github,
  Youtube,
  Home
} from 'lucide-react';
import { SiteSettings } from '../types/blog';
import { SubpageBreadcrumb } from './SubpageBreadcrumb';

interface ContactViewProps {
  settings: SiteSettings;
  onOpenChatBot?: () => void;
  onNavigateHome?: () => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ settings, onOpenChatBot, onNavigateHome }) => {
  const isAr = settings.language === 'ar';
  const authorName = settings.authorName || 'الحضرى محمود';


  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [serverReplyMsg, setServerReplyMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isAr ? 'فشل إرسال الرسالة، يرجى المحاولة لاحقاً.' : 'Failed to send message.'));
      }
      setIsSubmitted(true);
      setServerReplyMsg(data.message || '');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر الاتصال بالخادم لإرسال الرسالة.' : 'Could not submit form.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 pb-16 animate-in fade-in duration-300">
      {/* Interactive Breadcrumb Navigation: Homepage > Contact Us */}
      <SubpageBreadcrumb
        isAr={isAr}
        currentPageTitle={isAr ? 'اتصل بنا' : 'Contact Us'}
        onNavigateHome={onNavigateHome || (() => window.location.hash = '')}
      />

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-semibold">
          <Mail className="w-3.5 h-3.5" />
          <span>{isAr ? 'تواصل مع إدارة الفا للديكور والدهانات' : 'Contact Alpha Decor & Paints'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
          {isAr ? 'يسعدنا دائماً الاستماع إلى استفساراتكم وطلبات المعاينة' : "We'd love to hear from you"}
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          {isAr
            ? `يمكنكم مراسلة فريق العمل وإدارة المدونة برئاسة استشاري التشطيبات «${authorName}» لطلب معاينات هندسية، استشارات ألوان الدهانات، أو تنفيذ أعمال بديل الرخام والخشب والأسقف.`
            : `Reach out to the Alpha Decor & Paints team led by ${authorName} for finishing consultations and site inspections.`}
        </p>

        {onNavigateHome && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>{isAr ? 'العودة للصفحة الرئيسية' : 'Return to Home'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Form Card */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
          {isSubmitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {isAr ? 'تم إرسال وحفظ رسالتك بنجاح!' : 'Message Sent & Saved Successfully!'}
              </h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                {isAr
                  ? `شكراً لتواصلك مع مدونة الفا للديكور والدهانات. تم تسجيل رسالتك بنجاح وسيتم الرد عليك في أقرب وقت عبر البريد الإلكتروني أو الهاتف.`
                  : 'Thank you for reaching out to Alpha Decor & Paints. We will review your message and reply soon.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  {isAr ? 'إرسال رسالة أخرى' : 'Send Another Message'}
                </button>
                {onNavigateHome && (
                  <button
                    type="button"
                    onClick={onNavigateHome}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>{isAr ? 'العودة للصفحة الرئيسية' : 'Return to Home'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'الاسم بالكامل' : 'Full Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={isAr ? 'مثال: أحمد مصطفى' : 'Your name'}
                    className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'البريد الإلكتروني' : 'Email Address'} *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'موضوع الرسالة' : 'Subject'}
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder={isAr ? 'مثال: اقتراح مقال أو استفسار تصميمي' : 'Subject of your message'}
                  className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'نص الرسالة' : 'Message'} *
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={isAr ? 'اكتب تفاصيل رسالتك هنا...' : 'Write your message details here...'}
                  className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>{isAr ? 'جارِ الإرسال...' : 'Sending...'}</span>
                ) : (
                  <>
                    <Send className="w-4 h-4 rtl:rotate-180" />
                    <span>{isAr ? 'إرسال الرسالة الآن' : 'Send Message Now'}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Info & Social Channels */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {isAr ? 'قنوات التواصل المباشرة' : 'Direct Channels'}
            </h3>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {isAr ? 'البريد الرسمي' : 'Official Email'}
                  </span>
                  <a
                    href="mailto:contact@alphadesign.blog"
                    className="text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    contact@alphadesign.blog
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {isAr ? 'أوقات المتابعة والرد' : 'Response Hours'}
                  </span>
                  <span className="text-slate-500">
                    {isAr ? 'على مدار 24 ساعة عبر البوت الذكي والبريد' : '24/7 via AI Assistant & Email'}
                  </span>
                </div>
              </div>

              {/* Owner Direct Phone */}
              {settings.assistantNegotiation?.ownerPhone && (
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {isAr ? `هاتف صاحب المدونة (${authorName})` : `${authorName}'s Direct Phone`}
                    </span>
                    <a
                      href={`tel:${settings.assistantNegotiation.ownerPhone.replace(/\s+/g, '')}`}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      {settings.assistantNegotiation.ownerPhone}
                    </a>
                  </div>
                </div>
              )}

              {/* Owner Direct WhatsApp */}
              {settings.assistantNegotiation?.ownerWhatsApp && (
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {isAr ? 'واتساب صاحب المدونة المعتمد' : 'Verified Owner WhatsApp'}
                    </span>
                    <a
                      href={`https://wa.me/${settings.assistantNegotiation.ownerWhatsApp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      +{settings.assistantNegotiation.ownerWhatsApp}
                    </a>
                  </div>
                </div>
              )}

              {/* Bot Negotiation Callout */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200 dark:border-indigo-900 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span>{isAr ? 'مساعد التفاوض الآلي وحساب الأسعار' : 'AI Price Negotiation Assistant'}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {isAr
                    ? 'هل لديك مشروع تصميم أو برمجة وتريد معرفة التكلفة والتفاوض فوراً؟ سيتفاوض معك المساعد ويحولك لصاحب المدونة عند الاتفاق!'
                    : 'Need design or dev work? Negotiate prices with our AI assistant and get instantly connected!'}
                </p>
                {onOpenChatBot && (
                  <button
                    type="button"
                    onClick={onOpenChatBot}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAr ? 'ابدأ التفاوض على السعر الآن' : 'Start Price Negotiation Now'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Configured Social Media Links */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                {isAr ? 'تابعنا على شبكات التواصل المعتمدة:' : 'Follow Official Channels:'}
              </span>

              <div className="flex flex-wrap gap-2">
                {settings.socialLinks.twitter && (
                  <a
                    href={settings.socialLinks.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                    title="X / Twitter"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {settings.socialLinks.facebook && (
                  <a
                    href={settings.socialLinks.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    title="Facebook"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {settings.socialLinks.linkedin && (
                  <a
                    href={settings.socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    title="LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {settings.socialLinks.github && (
                  <a
                    href={settings.socialLinks.github}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="GitHub"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                )}
                {settings.socialLinks.youtube && (
                  <a
                    href={settings.socialLinks.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="YouTube"
                  >
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
