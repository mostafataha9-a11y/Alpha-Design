import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  RotateCcw,
  User,
  Loader2,
  Phone,
  PhoneCall,
  CheckCircle,
  ExternalLink,
  Briefcase,
  DollarSign,
  Clock,
  ShieldCheck,
  Tag,
  Zap,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { SiteSettings, Article } from '../types/blog';

interface ChatBotProps {
  settings: SiteSettings;
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  currentArticle?: Article | null;
  onSelectArticle: (article: Article) => void;
  initialMode?: 'general' | 'negotiate';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ParsedDeal {
  service: string;
  agreedPrice: string;
  originalPrice?: string;
  savings?: string;
  scope?: string;
  deliveryDays?: number;
  clientNeeds?: string;
  dealId: string;
}

export const ChatBot: React.FC<ChatBotProps> = ({
  settings,
  isOpen,
  onClose,
  articles,
  currentArticle,
  initialMode = 'general',
}) => {
  const isAr = settings.language === 'ar';
  const authorName = settings.authorName || 'الحضرى محمود';

  const negotiationConfig = settings.assistantNegotiation || {
    enabled: true,
    assistantName: 'مساعد ألفا الذكي للتفاوض والمبيعات',
    ownerPhone: '+201098765432',
    ownerWhatsApp: '201098765432',
    currency: '$',
    welcomePitch: '',
    maxDiscountPercent: 20,
    services: [],
  };

  const ownerPhone = negotiationConfig.ownerPhone || '+201098765432';
  const ownerWhatsApp = negotiationConfig.ownerWhatsApp || '201098765432';
  const cleanPhone = ownerPhone.replace(/\s+/g, '');
  const cleanWhatsApp = ownerWhatsApp.replace(/[^0-9]/g, '');

  const [activeMode, setActiveMode] = useState<'general' | 'negotiate'>(initialMode);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: isAr
        ? `مرحباً بك في مدونة واستوديو **ألفا ديزاين** للمصمم **${authorName}**!\n\nأنا **مساعد ألفا الذكي**؛ مفوض رسمياً بتقديم الاستشارات، وحساب أسعار الأعمال المطلوبة والتفاوض معك حول الميزانية والتسليم.\n\nعند الاتفاق على السعر، سأقوم بتحويلك مباشرة إلى **واتساب صاحب المدونة** أو الاتصال برقم هاتفه فوراً للبدء!`
        : `Welcome to **Alpha Design** founded by **${authorName}**!\n\nI am your AI Assistant & Sales Negotiator. I can calculate project costs, negotiate budgets according to ${authorName}'s rates, and upon agreement, directly connect you to WhatsApp or phone!`,
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showServicesCatalog, setShowServicesCatalog] = useState(false);
  const [activeAgreedDeal, setActiveAgreedDeal] = useState<ParsedDeal | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [autoRedirectCancelled, setAutoRedirectCancelled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested quick prompts based on active mode
  const suggestedPrompts = activeMode === 'negotiate'
    ? (isAr
        ? [
            'أريد تصميم هوية بصرية كاملة، كم السعر؟',
            'كم تكلفة تصميم وتطوير موقع إلكتروني؟',
            'أريد تصميم واجهات UI/UX لتطبيق جوال مع خصم',
            'كم سعر كتابة 5 مقالات متوافقة مع السيو؟',
          ]
        : [
            'How much is a full Brand Identity & Logo?',
            'What is the price for custom website development?',
            'I need mobile app UI/UX design, any discount?',
            'Cost of 5 SEO-optimized blog articles?',
          ])
    : (isAr
        ? [
            '💼 أريد الاستفسار عن أسعار وطلب عمل جديد',
            'ما هي أحدث المقالات المنشورة في المدونة؟',
            'كيف أختار ألوان متناسقة لهويتي التجارية؟',
            'انشر رابط أحدث مقال في وسائل التواصل الاجتماعي',
          ]
        : [
            '💼 I want to request work & negotiate price',
            'What are the latest articles on Alpha Design?',
            'How to choose harmonious branding colors?',
            'Broadcast latest post to social media',
          ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, activeAgreedDeal]);

  // Handle countdown for automatic WhatsApp transfer upon deal agreement
  useEffect(() => {
    if (countdown === null || countdown <= 0 || autoRedirectCancelled) return;

    const timer = setTimeout(() => {
      if (countdown === 1) {
        setCountdown(0);
        // Trigger auto WhatsApp redirection
        if (activeAgreedDeal) {
          const whatsAppUrl = getWhatsAppUrl(activeAgreedDeal);
          const link = document.createElement('a');
          link.href = whatsAppUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.click();
        }
      } else {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, autoRedirectCancelled, activeAgreedDeal]);

  // Extract deal json if present in message
  const parseDealFromContent = (text: string): { cleanText: string; deal: ParsedDeal | null } => {
    const match = text.match(/\[DEAL_AGREED:\s*(\{.*?\})\s*\]/s);
    if (!match) {
      return { cleanText: text, deal: null };
    }

    try {
      const parsed = JSON.parse(match[1]);
      const deal: ParsedDeal = {
        service: parsed.service || (isAr ? 'مشروع تصميم مخصص' : 'Custom Project'),
        agreedPrice: parsed.agreedPrice || '300$',
        originalPrice: parsed.originalPrice,
        savings: parsed.savings,
        scope: parsed.scope || (isAr ? 'حسب المواصفات المحددة في المحادثة' : 'Per discussion'),
        deliveryDays: parsed.deliveryDays || 5,
        clientNeeds: parsed.clientNeeds,
        dealId: 'ALPHA-' + Math.floor(1000 + Math.random() * 9000),
      };
      const cleanText = text.replace(/\[DEAL_AGREED:\s*\{.*?\}\s*\]/s, '').trim();
      return { cleanText, deal };
    } catch (e) {
      console.warn('Could not parse deal json:', e);
      return { cleanText: text, deal: null };
    }
  };

  const getWhatsAppUrl = (deal: ParsedDeal) => {
    const text = isAr
      ? `مرحباً أستاذ ${authorName}،
لقد اتفقت للتو مع المساعد الذكي في مدونة ألفا ديزاين على تنفيذ خدمة:
📌 *${deal.service}*
💰 *السعر المتفق عليه:* ${deal.agreedPrice} ${deal.savings ? `(توفير: ${deal.savings})` : ''}
⏱️ *مدة التسليم المعتمدة:* ${deal.deliveryDays || 5} أيام عمل
📝 *تفاصيل العمل:* ${deal.scope || deal.clientNeeds || 'حسب الاتفاق'}
🔖 *رقم مرجع الاتفاق:* #${deal.dealId}

أود تأكيد الحجز وبدء تنفيذ المشروع معك مباشرة!`
      : `Hello ${authorName},
I just reached an agreement with Alpha Design AI Assistant for:
📌 *${deal.service}*
💰 *Agreed Price:* ${deal.agreedPrice}
⏱️ *Delivery Time:* ${deal.deliveryDays || 5} days
📝 *Scope:* ${deal.scope || 'Per agreed terms'}
🔖 *Deal Reference:* #${deal.dealId}

Looking forward to starting immediately!`;

    return `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(text)}`;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    // Check if query is switching to negotiation
    if (query.includes('طلب عمل') || query.includes('أسعار') || query.includes('تفاوض') || query.includes('سعر')) {
      setActiveMode('negotiate');
    }

    const userMessage: Message = { role: 'user', content: query };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            content: m.content,
          })),
          siteInfo: {
            blogName: settings.blogName,
            tagline: settings.tagline,
            authorName,
            recentArticles: articles.slice(0, 5).map((a) => ({
              id: a.id,
              title: a.title,
              category: a.category,
              excerpt: a.excerpt,
            })),
          },
          negotiationConfig: {
            ownerPhone,
            ownerWhatsApp,
            currency: negotiationConfig.currency || '$',
            services: negotiationConfig.services || [],
          },
          currentArticle: currentArticle
            ? {
                title: currentArticle.title,
                category: currentArticle.category,
                excerpt: currentArticle.excerpt,
              }
            : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat API returned error');
      }

      const data = await response.json();
      const rawReply = data.reply || (isAr ? 'عفواً، لم أتمكن من الحصول على إجابة حالياً.' : 'Could not generate reply.');

      const { cleanText, deal } = parseDealFromContent(rawReply);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: cleanText,
        },
      ]);

      if (deal) {
        setActiveAgreedDeal(deal);
        setAutoRedirectCancelled(false);
        setCountdown(6); // 6 seconds automatic handover
      }
    } catch (err) {
      console.error('Chat error:', err);
      // Fallback local response
      const fallbackReply = isAr
        ? `يسعدنا تواصلك مع مدونة واستوديو ألفا ديزاين لإدارة وتصميم المشاريع بإشراف «${authorName}». يمكنك التواصل المباشر هاتفياً على ${ownerPhone} أو عبر الواتساب على ${ownerWhatsApp} لمناقشة كافة التفاصيل وحجز مشروعك فوراً.`
        : `Thank you for contacting Alpha Design Studio led by ${authorName}. You can call directly at ${ownerPhone} or reach out via WhatsApp at ${ownerWhatsApp} to kick off your project!`;

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fallbackReply },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectServiceFromCatalog = (serviceName: string) => {
    setShowServicesCatalog(false);
    setActiveMode('negotiate');
    const inquiryText = isAr
      ? `أريد الاستفسار عن خدمة "${serviceName}"، ما هي تفاصيلها وسعرها المحدد وكيف نتفاوض للبدء؟`
      : `I'm interested in "${serviceName}", what are the details, price and terms?`;
    handleSendMessage(inquiryText);
  };

  const handleResetChat = () => {
    setActiveAgreedDeal(null);
    setCountdown(null);
    setAutoRedirectCancelled(false);
    setMessages([
      {
        role: 'assistant',
        content: isAr
          ? `تم بدء محادثة جديدة مع مساعد **${authorName}**! يمكنك سؤالي عن التصميم، أو طلب عمل والتفاوض على الأسعار.`
          : `New conversation started with ${authorName}'s Assistant! Ask about design or request a project quote.`,
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-2 end-2 sm:bottom-4 sm:end-4 z-50 w-[calc(100vw-1rem)] sm:w-[440px] max-w-full h-[620px] max-h-[88vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
      {/* Bot Window Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-xs">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="w-3 h-3 rounded-full bg-emerald-400 absolute -top-1 -end-1 ring-2 ring-blue-700"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm leading-none">
                {isAr ? 'مساعد ألفا للتفاوض والمبيعات' : 'Alpha Sales & Negotiation Bot'}
              </h3>
            </div>
            <p className="text-[11px] text-blue-100 flex items-center gap-1 mt-0.5">
              <span>{isAr ? `المفوض باسم: ${authorName}` : `Delegated by: ${authorName}`}</span>
              <span className="text-emerald-300 font-bold">• {isAr ? 'متصل الآن' : 'Online'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowServicesCatalog((prev) => !prev)}
            className={`p-2 rounded-xl transition-colors text-xs font-bold flex items-center gap-1 ${
              showServicesCatalog
                ? 'bg-white text-blue-700'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={isAr ? 'قائمة الخدمات والأسعار' : 'Services & Pricing'}
          >
            <Briefcase className="w-4 h-4" />
            <span className="hidden sm:inline">{isAr ? 'الأسعار' : 'Pricing'}</span>
          </button>
          <button
            onClick={handleResetChat}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title={isAr ? 'بدء محادثة جديدة' : 'Reset chat'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title={isAr ? 'إغلاق النافذة' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveMode('negotiate')}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeMode === 'negotiate'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          <span>{isAr ? 'طلب عمل والتفاوض على الأسعار' : 'Work & Price Negotiation'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('general')}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeMode === 'general'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>{isAr ? 'الاستشارات والمقالات' : 'General & Articles'}</span>
        </button>
      </div>

      {/* Services Catalog Overlay Drawer */}
      {showServicesCatalog && (
        <div className="absolute inset-x-0 top-24 bottom-16 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>{isAr ? `خدمات وأسعار صاحب المدونة (${authorName})` : `${authorName}'s Service Rates`}</span>
            </h4>
            <button
              onClick={() => setShowServicesCatalog(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>

          <p className="text-[11px] text-slate-500 mb-3">
            {isAr
              ? 'اختر أي خدمة لبدء التفاوض المباشر حول متطلباتك وميزانيتك مع المساعد الذكي:'
              : 'Select any service to start live pricing negotiation with the AI Assistant:'}
          </p>

          <div className="space-y-2.5">
            {negotiationConfig.services?.map((serv) => (
              <div
                key={serv.id}
                onClick={() => handleSelectServiceFromCatalog(serv.name)}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {serv.name}
                  </span>
                  <div className="text-end">
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {serv.basePrice}{serv.currency}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{serv.unit}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{serv.description}</p>
                <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-500" />
                    {serv.deliveryDays} {isAr ? 'أيام تسليم' : 'days delivery'}
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold group-hover:underline flex items-center gap-1">
                    {isAr ? 'تفاوض على هذه الخدمة' : 'Negotiate this service'}
                    <ArrowLeft className="w-3 h-3 rtl:rotate-0 rotate-180" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold shadow-xs ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-te-xs shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-ts-xs border border-slate-200/50 dark:border-slate-700/50 shadow-2xs'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* Confirmed Deal Agreement Card Component */}
        {activeAgreedDeal && (
          <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-teal-500/10 border-2 border-emerald-500/40 dark:border-emerald-500/30 shadow-lg space-y-3.5 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
                    {isAr ? '🎉 تم الاتفاق واعتماد السعر بنجاح!' : 'Deal Agreed Successfully!'}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {isAr ? `مرجع الاتفاق: #${activeAgreedDeal.dealId}` : `Ref: #${activeAgreedDeal.dealId}`}
                  </p>
                </div>
              </div>

              <div className="text-end">
                <span className="text-xs sm:text-base font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-xl">
                  {activeAgreedDeal.agreedPrice}
                </span>
                {activeAgreedDeal.savings && (
                  <span className="block text-[10px] text-emerald-600 font-semibold mt-0.5">
                    {isAr ? `وفرت ${activeAgreedDeal.savings}` : `Saved ${activeAgreedDeal.savings}`}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="font-bold">{isAr ? 'الخدمة:' : 'Service:'}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{activeAgreedDeal.service}</span>
              </div>
              {activeAgreedDeal.deliveryDays && (
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="font-bold">{isAr ? 'مدة التنفيذ:' : 'Delivery Time:'}</span>
                  <span>{activeAgreedDeal.deliveryDays} {isAr ? 'أيام عمل' : 'business days'}</span>
                </div>
              )}
              {activeAgreedDeal.scope && (
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? 'نطاق العمل: ' : 'Scope: '}</span>
                  {activeAgreedDeal.scope}
                </div>
              )}
            </div>

            {/* Auto Transfer Countdown Banner */}
            {countdown !== null && countdown > 0 && !autoRedirectCancelled && (
              <div className="p-2.5 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>
                    {isAr
                      ? `جاري التحويل التلقائي للواتساب خلال (${countdown})...`
                      : `Redirecting to WhatsApp in (${countdown})...`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoRedirectCancelled(true)}
                  className="text-[10px] text-slate-500 hover:text-red-500 font-bold underline cursor-pointer"
                >
                  {isAr ? 'إلغاء التحويل التلقائي' : 'Cancel'}
                </button>
              </div>
            )}

            {/* Handover Action Buttons: WhatsApp & Phone Call */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* WhatsApp Direct Transfer */}
              <a
                href={getWhatsAppUrl(activeAgreedDeal)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setAutoRedirectCancelled(true)}
                className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isAr ? 'فتح الواتساب مع صاحب المدونة' : 'WhatsApp Owner Now'}</span>
              </a>

              {/* Direct Phone Call */}
              <a
                href={`tel:${cleanPhone}`}
                onClick={() => setAutoRedirectCancelled(true)}
                className="py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{isAr ? `اتصال هاتف: ${ownerPhone}` : `Call: ${ownerPhone}`}</span>
              </a>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs ps-9">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span>
              {activeMode === 'negotiate'
                ? (isAr ? 'المساعد يحسب السعر ويعد العرض...' : 'Assistant is calculating quote...')
                : (isAr ? 'بوت ألفا يفكر ويكتب الرد...' : 'Alpha Bot is thinking...')}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Chips */}
      {messages.length <= 4 && (
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {suggestedPrompts.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(q)}
              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            activeMode === 'negotiate'
              ? (isAr ? 'اكتب طلب العمل أو فاوض على السعر هنا...' : 'Type requested work or negotiate price...')
              : (isAr ? 'اسأل بوت ألفا عن أي موضوع أو مقال...' : 'Ask Alpha Bot about design or posts...')
          }
          className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4 rtl:rotate-180" />
        </button>
      </form>
    </div>
  );
};
