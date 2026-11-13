import React from 'react';
import {
  Sparkles,
  Palette,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Cpu,
  HeartHandshake,
  Home
} from 'lucide-react';
import { SiteSettings, PublicTab } from '../types/blog';
import { AuthorBadge } from './AuthorBadge';
import { SubpageBreadcrumb } from './SubpageBreadcrumb';

interface AboutViewProps {
  settings: SiteSettings;
  onNavigate: (tab: PublicTab) => void;
  articlesCount: number;
}

export const AboutView: React.FC<AboutViewProps> = ({
  settings,
  onNavigate,
  articlesCount,
}) => {
  const isAr = settings.language === 'ar';
  const authorName = settings.authorName || 'الحضرى محمود';

  return (
    <div className="space-y-12 pb-16 animate-in fade-in duration-300">
      {/* Interactive Breadcrumb Navigation: Homepage > About Us */}
      <SubpageBreadcrumb
        isAr={isAr}
        currentPageTitle={isAr ? 'معلومات عنا' : 'About Us'}
        onNavigateHome={() => onNavigate('home')}
        onNavigateArticles={() => onNavigate('articles')}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-14 border border-indigo-900/40 shadow-2xl">
        <div className="absolute -top-24 -end-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -start-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{isAr ? 'عن مدونة الفا للديكور والدهانات' : 'About Alpha Decor & Paints'}</span>
          </div>

          <h1 className="text-2xl sm:text-5xl font-black tracking-tight leading-tight">
            {isAr ? (
              <>
                المنصة الرائدة في <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300">عالم الديكور والتشطيبات الفاخرة</span>
              </>
            ) : (
              <>
                The Premier Hub for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300">Modern Interior Finishes & Paints</span>
              </>
            )}
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {isAr
              ? `تأسست مدونة «ألفا للديكور والدهانات» (Alpha Decor & Paints) بإشراف وإدارة خبير الديكور والتشطيبات المعمارية «${authorName}» لتكون المرجع العربي الأول في أحدث صيحات دهانات الجدران، وتطبيقات بديل الخشب وبديل الرخام، والأسقف المعلقة، مع تقديم استشارات فنية وهندسية متكاملة.`
              : `Alpha Decor & Paints was founded under the leadership of finishes expert ${authorName} to provide industry-leading guidance on architectural paints, wood/marble alternatives, and suspended ceilings.`}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigate('home')}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>{isAr ? 'العودة للصفحة الرئيسية' : 'Return to Home'}</span>
            </button>

            <button
              onClick={() => onNavigate('articles')}
              className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>{isAr ? 'تصفح المقالات والأخبار' : 'Browse Articles & News'}</span>
            </button>

            <button
              onClick={() => onNavigate('contact')}
              className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>{isAr ? 'تواصل معنا' : 'Contact Us'}</span>
            </button>
          </div>
        </div>
      </section>


      {/* Founder & Leadership Section */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Founder Monogram Visual */}
          <div className="shrink-0 flex flex-col items-center text-center">
            <AuthorBadge
              name={authorName}
              size="xl"
              role={isAr ? 'صاحب ومدير المدونة' : 'Founder & Editorial Lead'}
              showRole={false}
              className="justify-center"
            />
            <div className="mt-4 text-center">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                <span>{authorName}</span>
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                {isAr ? 'صاحب المدونة والمدير الفني العام' : 'Blog Owner & Creative Director'}
              </p>
            </div>
          </div>

          <div className="space-y-4 text-center md:text-start flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {isAr ? 'رسالة مؤسس المنصة' : 'Message from the Founder'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {isAr ? '«التصميم ليس كيف يبدو الشيء، بل كيف يعمل ويؤثر»' : '"Design is how it works and creates impact"'}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              {isAr
                ? `يقود «${authorName}» رؤية ألفا ديزاين لتقديم مقالات وتحليلات دقيقة تخدم المصممين والشركات الناشئة والمطورين. نحرص على تقديم محتوى أصيل مدعوم بدراسات حالة حقيقية، بالإضافة إلى تبني تقنيات الأتمتة والذكاء الاصطناعي لرفع جودة النشر والوصول إلى أوسع شريحة من المهتمين.`
                : `${authorName} leads Alpha Design with a focus on delivering high-grade architectural design content, real-world case studies, and automated intelligent workflows.`}
            </p>
          </div>
        </div>
      </section>

      {/* Core Values Grid */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isAr ? 'ركائز وقيم ألفا ديزاين' : 'Our Core Pillars'}
          </h2>
          <p className="text-slate-500 text-sm">
            {isAr ? 'المعايير التي نبني عليها كل مقال ودليل وتجربة في مدونتنا' : 'The principles behind every publication'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-blue-500/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Palette className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {isAr ? 'الجودة البصرية والاحترافية' : 'Visual Craftsmanship'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'نؤمن بأن كل مقال يجب أن يكون تحفة تصميمية بحد ذاته، منسق بعناية ومدعوم بصور عالية الدقة وتوزيع ألوان متناسق.'
                : 'Every article is crafted as a visual piece supported by high-res curation and typographic balance.'}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-indigo-500/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {isAr ? 'الذكاء الاصطناعي المسؤول' : 'Responsible AI Innovation'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'توظيف أحدث نماذج Gemini AI لمساعدة صناع المحتوى في صياغة مقالات ذكية من الصور وتحليل الكلمات المفتاحية وأتمتة النشر.'
                : 'Harnessing state-of-the-art Gemini models to organize smart articles from imagery and keywords responsibly.'}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-purple-500/50 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {isAr ? 'مجتمع تفاعلي مفتوح' : 'Active Community'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'إتاحة قنوات النقاش التفاعلية والتعليقات والمشاركة المباشرة عبر مختلف شبكات التواصل الاجتماعي.'
                : 'Engaging discussion channels, reader comments, and verified direct social link distribution.'}
            </p>
          </div>
        </div>
      </section>

      {/* Blog Key Metrics */}
      <section className="p-5 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-violet-900/10 border border-blue-200 dark:border-blue-900/50">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-4xl font-black text-blue-600 dark:text-blue-400">
              {articlesCount}+
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-semibold">
              {isAr ? 'مقالات منشورة' : 'Published Articles'}
            </p>
          </div>
          <div>
            <div className="text-2xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400">
              24h
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-semibold">
              {isAr ? 'نشر دوري آلي' : 'Autonomous Cycle'}
            </p>
          </div>
          <div>
            <div className="text-2xl sm:text-4xl font-black text-purple-600 dark:text-purple-400">
              100%
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-semibold">
              {isAr ? 'دعم العربية والإنجليزية' : 'Bilingual Support'}
            </p>
          </div>
          <div>
            <div className="text-2xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
              10
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-semibold">
              {isAr ? 'أقصى مقالات بالصفحة' : 'Max Posts/Page'}
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Return To Home Navigation Card */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white text-center space-y-4 border border-indigo-900/50 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/30 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
          <Home className="w-6 h-6" />
        </div>
        <h3 className="text-xl sm:text-2xl font-black">
          {isAr ? 'جاهز لاستكشاف أحدث أفكار الديكور والدهانات؟' : 'Ready to Explore Decor Ideas?'}
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
          {isAr
            ? 'تفضل بزيارة الصفحة الرئيسية للاطلاع على كافة المقالات والتقارير الإخبارية ودليل الأسعار الحديث لعام 2026.'
            : 'Visit the home page to discover our complete collection of modern paint guides and decor news.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>{isAr ? 'العودة إلى الصفحة الرئيسية' : 'Back to Home Page'}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
