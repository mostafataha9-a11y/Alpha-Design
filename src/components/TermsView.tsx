import React from 'react';
import { FileText, ShieldAlert, Award, CheckCircle, Scale, AlertCircle, Home } from 'lucide-react';
import { SiteSettings } from '../types/blog';
import { SubpageBreadcrumb } from './SubpageBreadcrumb';

interface TermsViewProps {
  settings: SiteSettings;
  onNavigateHome?: () => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ settings, onNavigateHome }) => {
  const isAr = settings.language === 'ar';
  const authorName = settings.authorName || 'الحضرى محمود';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Interactive Breadcrumb Navigation: Homepage > Terms of Use */}
      <SubpageBreadcrumb
        isAr={isAr}
        currentPageTitle={isAr ? 'شروط الاستخدام' : 'Terms of Use'}
        onNavigateHome={onNavigateHome || (() => window.location.hash = '')}
      />

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-semibold">
          <Scale className="w-4 h-4" />
          <span>{isAr ? 'شروط وأحكام الاستخدام' : 'Terms of Service'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
          {isAr ? 'شروط الاستخدام لمدونة الفا للديكور والدهانات' : 'Alpha Decor & Paints Terms of Use'}
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm">
          {isAr
            ? `تسري هذه الشروط على جميع الزوار والقراء | صاحب المدونة: «${authorName}»`
            : `Applicable to all visitors and users | Owner: ${authorName}`}
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


      {/* Main Content Body */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <span>{isAr ? '1. الموافقة على الشروط' : '1. Acceptance of Terms'}</span>
          </h2>
          <p>
            {isAr
              ? `بوصولك إلى مدونة «ألفا ديزاين» (Alpha Design) واستخدامك لمحتواها ومقالاتها، فإنك توافق التام على الالتزام بشروط الاستخدام الموضحة هنا. إذا كنت لا توافق على هذه الشروط، يُرجى التوقف عن استخدام المنصة.`
              : `By accessing Alpha Design and utilizing its design articles and resources, you agree to comply with these terms of use in full.`}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <span>{isAr ? '2. حقوق الملكية الفكرية والعلامة التجارية' : '2. Intellectual Property Rights'}</span>
          </h2>
          <p>
            {isAr
              ? `جميع حقوق الملكية الفكرية للمقالات، التصاميم البصرية، الهويات، والشعارات المعروضة في مدونة «ألفا ديزاين» محفوظة لصاحب المدونة «${authorName}» ولإدارة المنصة. يُسمح بمشاركة روابط المقالات ونشرها عبر وسائل التواصل الاجتماعي مع ذكر المصدر الأصلي ورابط المقال، بينما يُحظر نسخ المقالات كاملة أو إعادة نشرها بدون تصريح كتابي مسبق.`
              : `All intellectual property rights pertaining to articles, visual identities, and editorial works belong to ${authorName} and Alpha Design. Sharing article links on social media with proper attribution is welcomed, while verbatim plagiarism without consent is strictly prohibited.`}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <span>{isAr ? '3. سياسة التعليقات والمشاركات المجتمعية' : '3. Commenting & Community Conduct'}</span>
          </h2>
          <ul className="list-disc list-inside space-y-1.5 ps-2">
            <li>
              {isAr
                ? 'يجب أن تكون التعليقات بنّاءة ومحترمة وتصب في نقاش موضوع المقال والتصميم.'
                : 'Comments must remain professional, respectful, and relevant to the design topic.'}
            </li>
            <li>
              {isAr
                ? 'يُمنع نشر أي روابط تسويقية ضارة (Spam) أو محتوى مسيء أو انتهاك لحقوق الغير.'
                : 'Spam, promotional solicitations, and abusive language are strictly prohibited.'}
            </li>
            <li>
              {isAr
                ? 'تحتفظ إدارة المدونة والمشرفون بالحق الكامل في تعديل أو حذف أي تعليق يخالف هذه المعايير.'
                : 'The blog administration and supervisors reserve the right to moderate or delete non-compliant comments.'}
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <span>{isAr ? '4. إخلاء المسؤولية ومحتوى الذكاء الاصطناعي' : '4. AI Content & Disclaimer'}</span>
          </h2>
          <p>
            {isAr
              ? 'تتضمن المدونة مقالات وأدوات مدعومة بنماذج الذكاء الاصطناعي (Gemini). يتم بذل أقصى جهد لضمان دقة المعلومات التصميمية والتقنية، ومع ذلك يُقدَّم المحتوى لأغراض التثقيف والإلهام دون ضمانات ضمنية لنتائج مشاريع تجارية محددة.'
              : 'Content includes AI-assisted design perspectives and summaries. Materials are provided for educational and inspirational purposes.'}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
            <span>{isAr ? '5. التعديلات على الشروط' : '5. Amendments to Terms'}</span>
          </h2>
          <p>
            {isAr
              ? `تحتفظ إدارة المدونة بحق تحديث أو تعديل هذه الشروط في أي وقت. ويُعتبر استمرارك في استخدام الموقع بمثابة موافقة على التعديلات المحدثة.`
              : 'Alpha Design management reserves the right to amend these terms at any time.'}
          </p>
        </section>
      </div>

      {/* Bottom Return To Homepage Card */}
      {onNavigateHome && (
        <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            {isAr ? 'العودة إلى الصفحة الرئيسية لمدونة الفا للديكور والدهانات' : 'Return to Home Page'}
          </h3>
          <button
            type="button"
            onClick={onNavigateHome}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{isAr ? 'العودة للصفحة الرئيسية' : 'Return to Home'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

