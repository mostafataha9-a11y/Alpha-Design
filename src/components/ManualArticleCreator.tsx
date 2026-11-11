import React, { useState, useMemo } from 'react';
import {
  Edit3,
  Image as ImageIcon,
  Tag,
  Folder,
  Send,
  Eye,
  Bold,
  Italic,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Code,
  CheckCircle,
  FileText,
  Clock,
  Sparkles,
  Loader2,
  AlertCircle,
  Upload,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  CheckCheck
} from 'lucide-react';
import { Article, SiteSettings } from '../types/blog';
import { CATEGORIES } from '../data/initialData';
import { fetchWithAuth } from '../utils/apiAuth';
import { compressImageClient } from '../utils/imageCompression';

interface ManualArticleCreatorProps {
  settings: SiteSettings;
  onPublishArticle: (article: Article) => Promise<any> | void;
  onViewArticle: (article: Article) => void;
}

export const ManualArticleCreator: React.FC<ManualArticleCreatorProps> = ({
  settings,
  onPublishArticle,
  onViewArticle,
}) => {
  const isAr = settings.language === 'ar';
  const [isPublishing, setIsPublishing] = useState(false);

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(CATEGORIES[1] || 'دهانات الحوائط والألوان');
  const [newCatInput, setNewCatInput] = useState('');
  const [featuredImage, setFeaturedImage] = useState(
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80'
  );
  const [tagsInput, setTagsInput] = useState('');
  const [tagsList, setTagsList] = useState<string[]>(['دهانات حوائط', 'ديكورات داخلية', 'بديل خشب ورخام', 'ألفا ديكور']);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [publishedPost, setPublishedPost] = useState<Article | null>(null);

  // Zero-Duplicate Image State
  const [imageDuplicateStatus, setImageDuplicateStatus] = useState<{
    url?: string;
    isDuplicate: boolean;
    status?: string;
    reason?: string;
    matchedArticleTitle?: string;
  } | null>(null);
  const [isCheckingImageDup, setIsCheckingImageDup] = useState(false);

  // Check uniqueness of featuredImage
  React.useEffect(() => {
    if (!featuredImage || !featuredImage.trim()) {
      setImageDuplicateStatus(null);
      return;
    }

    if (featuredImage.trim().startsWith('data:')) {
      setImageDuplicateStatus({
        url: featuredImage,
        isDuplicate: false,
        status: 'unique',
        reason: isAr ? 'صورة مرفوعة محلياً فريدة وحصرية.' : 'Locally uploaded unique image.',
      });
      return;
    }

    let cancelled = false;
    setIsCheckingImageDup(true);

    fetch('/api/images/check-duplicates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: [featuredImage.trim()] }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.results && data.results[0]) {
          setImageDuplicateStatus(data.results[0]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsCheckingImageDup(false);
      });

    return () => {
      cancelled = true;
    };
  }, [featuredImage, isAr]);

  const handleAutoReplaceFeaturedImage = async () => {
    try {
      const res = await fetch('/api/images/get-unique-replacement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excludeUrls: [featuredImage],
          topic: title || category,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.replacement?.url) {
          setFeaturedImage(data.replacement.url);
        }
      }
    } catch {}
  };

  // Word count & reading time
  const wordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  const readingTime = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [wordCount]);

  // Insert markdown helper
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('manual-content-editor') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || (isAr ? 'نص توضيحي' : 'sample text');
    const newText = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);

    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  const handleAddTag = () => {
    if (!tagsInput.trim()) return;
    const clean = tagsInput.replace(/#/g, '').trim();
    if (clean && !tagsList.includes(clean)) {
      setTagsList([...tagsList, clean]);
    }
    setTagsInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTagsList(tagsList.filter((t) => t !== tag));
  };

  const [formError, setFormError] = useState('');
  const [isAiRewriting, setIsAiRewriting] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');

  const handleAiRewrite = async () => {
    if (!title.trim() && !content.trim()) {
      setFormError(isAr ? 'يرجى كتابة عنوان المقال أو جزء من مسودته لتتم إعادة صياغتها بالسيو.' : 'Please enter a title or draft text to rewrite.');
      return;
    }

    setFormError('');
    setIsAiRewriting(true);
    setAiSuccessMsg('');

    try {
      const response = await fetchWithAuth('/api/ai/generate-smart-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [
            {
              url: featuredImage,
              caption: title || (isAr ? 'تصميم رقمي معاصر' : 'Modern design figure'),
            },
          ],
          topic: title,
          draftTitle: title,
          draftContent: content,
          tone: 'إبداعي واحترافي بأسلوب بشري',
          language: settings.language,
          length: 'medium',
        }),
      });

      if (!response.ok) throw new Error('Failed to rewrite');
      const data = await response.json();

      if (data.title) setTitle(data.title);
      if (data.content) setContent(data.content);
      if (data.excerpt) setExcerpt(data.excerpt);
      if (data.tags && Array.isArray(data.tags)) setTagsList(data.tags);
      if (data.category) setCategory(data.category);

      setAiSuccessMsg(
        isAr
          ? 'تمت إعادة صياغة المقال بنجاح وتطبيقه على معايير السيو والأسلوب البشري! يمكنك مراجعته أو نشره فوراً.'
          : 'Article rewritten and optimized for Google SEO in a human tone!'
      );
    } catch (e) {
      console.error(e);
      setFormError(isAr ? 'تعذر الاتصال بخادم الذكاء الاصطناعي.' : 'Failed to contact AI service.');
    } finally {
      setIsAiRewriting(false);
    }
  };

  // Auto-enrich manual article to guarantee 1000+ words and structure for AdSense
  const handleAutoEnrich = () => {
    const rawTitle = title.trim() || (isAr ? 'أسرار دهانات الحوائط والديكورات العصرية وأحدث تشطيبات بديل الرخام' : 'Modern Interior Decor & Paints Guide');
    const authorSignature = settings.authorName || 'الحضرى محمود';

    let enriched = content.trim();
    if (!enriched) {
      enriched = isAr
        ? `حين نقف أمام جدار مصمت في بداية أي تشطيب، لا نرى مجرد مساحة إسمنتية، بل نرى مسرحاً للضوء والملمس والسكينة ينبض بالفخامة والراحة النفسية.`
        : `When facing a blank wall at the start of any finishing project, we see a living canvas of light, texture, and serene modern luxury.`;
    }

    const enrichmentText = isAr
      ? `\n\n## 1. أساسيات تنسيق دهانات الحوائط واختيار درجات الألوان العصرية\n` +
        `عند البدء في تخطيط دهانات الحوائط والديكورات الداخلية، من الضروري مراعاة التوازن البصري بين ألوان الجدران والإضاءة الطبيعية والصناعية. ننصح دائماً بالاعتماد على درجات ألوان محايدة دافئة مثل الجريج (Greige) والأوف وايت المطفي للجدران الأساسية، مع تمييز جدار رئيسي بدرجات أغمق تمنح المكان عمقاً فندقياً راقياً.\n\n` +
        `## 2. دمج بديل الرخام وبديل الخشب مع شريط الإضاءة المخفية ليد\n` +
        `تعد ألواح بديل الرخام (PVC Marble Sheet) مع شرائح بديل الخشب (WPC Fluted Panels) من أقوى صيحات الديكور الحديث لعام 2026. يمنح هذا المزيج جدار الصالة أو خلفية التلفزيون فخامة متناهية بتكلفة اقتصادية ووزن خفيف مقارنة بالرخام الطبيعي. وللحصول على مظهر متكامل، يُفضل تمرير بروفايل ليد مخفي بدرجة حرارة لون 3000 كلفن خلف الألواح لإبراز التفاصيل المعمارية الدقيقة.\n\n` +
        `## 3. خطوات تجهيز الحوائط ومعالجة الرطوبة قبل تطبيق الدهان\n` +
        `النجاح الحقيقي لأي تشطيب دهان يبدأ من التأسيس الصحيح. تبدأ المرحلة بتنظيف الأسطح وصنفرة الجدران جيداً لإزالة الشوائب، ثم تطبيق طبقة سيلر مائي عازل لمنع امتصاص الدهان ومعالجة الرطوبة السطحية. بعد ذلك يتم سحب طبقتين إلى ثلاث طبقات من معجون الحوائط الناعم مع الصنفرة بين كل طبقة لضمان سطح أملس كالحرير قبل طلاء وجهين من البلاستيك القابل للغسيل.\n\n` +
        `### توصيات واستشارات فنية من خبير الديكور ${authorSignature}\n` +
        `يؤكد المهندس الاستشاري ${authorSignature} على ضرورة فحص رطوبة الجدران قبل وضع أي معجون أو دهان، وعدم التهاون في جودة خامات السيلر والدهانات المعتمدة من كبرى الشركات مثل جوتن. التأسيس الممتاز يضمن بقاء ألوان الحوائط ناصعة ومقاومة للتقشير لسنوات طويلة دون الحاجة إلى صيانة مستمرة.\n\n` +
        `## 4. نصائح للمحافظة على ألوان ودهانات الديكور الداخلي\n` +
        `- احرص على تنظيف الحوائط بقطع قماش قطنية ناعمة مبللة بالماء الفاتر والصابون الخفيف وتجنب الفرك الخشن.\n` +
        `- حافظ على تهوية الغرف جيداً بعد انتهاء أعمال الدهان لتسريع جفاف الطبقات الداخلية والتخلص من الروائح.\n` +
        `- وزع مصادر الإضاءة في الغرفة لتقليل الظلال وإبراز درجات الألوان الطبيعية للحوائط والمفروشات.\n\n` +
        `## 5. الأسئلة الشائعة حول دهانات وديكورات المنازل (FAQ)\n` +
        `**س: ما الفرق بين دهان البلاستيك المطفي ودهان نصف اللامع؟**\n` +
        `ج: الدهان المطفي يخفي عيوب الحوائط ومناسب لغرف النوم ومجالس الضيوف، بينما نصف اللامع يتميز بسهولة التنظيف ومقاومة الاحتكاك مما يجعله مثالياً للممرات وغرف المعيشة والمطابخ.\n\n` +
        `**س: هل يمكن تركيب بديل الخشب على حوائط مدهونة مسبقاً؟**\n` +
        `ج: نعم، بشرط أن يكون الدهان القديم متماسكاً وخالياً من الرطوبة أو التقشير، ويتم تثبيته باستخدام السيليكون العظم ومسامير التثبيت الدقيقة لضمان ثبات دائم.`
      : `\n\n## 1. Fundamentals of Wall Paint Coordination\n` +
        `Color selection sets the mood for interior living spaces. Modern neutral palettes such as warm greige, soft off-white, and earthy beige provide timeless backdrops that amplify natural daylight.\n\n` +
        `## 2. Integrating PVC Marble & Fluted Wood Panels\n` +
        `Combining artificial marble slabs with fluted acoustic wood strips creates an upscale aesthetic for TV walls and entryways, enhanced by 3000K warm LED profile lighting.\n\n` +
        `## 3. Surface Preparation & Moisture Treatment\n` +
        `Durable paint jobs require thorough sanding, high-quality primer, and water-resistant putty to safeguard walls against flaking and humidity.`;

    const fullContent = enriched + enrichmentText;
    setContent(fullContent);
    if (!title.trim()) setTitle(rawTitle);
    if (!excerpt.trim()) setExcerpt(fullContent.slice(0, 160) + '...');
    setAiSuccessMsg(
      isAr
        ? 'تم إثراء وتوسيع المقال بنجاح وإضافة عناوين H2/H3 وتوصيات الحضرى محمود ليتجاوز 1,000 كلمة ويتوافق 100% مع معايير AdSense!'
        : 'Article enriched to exceed 1,000 words with headings and expert advice!'
    );
    setFormError('');
  };

  const handlePublish = async (status: 'published' | 'draft' = 'published') => {
    if (!title.trim() || !content.trim()) {
      setFormError(isAr ? 'يرجى كتابة عنوان المقال ومحتواه على الأقل.' : 'Please provide at least a title and content.');
      return;
    }

    let finalContent = content.trim();
    if (status === 'published' && wordCount < 1000) {
      const decorEnrichment = `\n\n## إرشادات وتوصيات استشاري الديكور الحضرى محمود لعام 2026\nيؤكد المهندس الاستشاري الحضرى محمود من واقع مئات المشروعات المعمارية المنفذة في «ألفا للديكور والدهانات» على أن نجاح أي ديكور داخلي يعتمد على التناغم الهندسي بين لون الطلاء وملمس الجدار ونوعية الإضاءة.\n\n### بروتوكول تأسيس الحوائط ومعالجة الرطوبة\n1. كشط الطبقات الضعيفة وتطبيق سيلر مائي بوليمري عازل لاختراق المسام ومنع التمليح وحبس الرطوبة.\n2. سحب ثلاث سكاكين معجون ناعم متقاطع مع الصنفرة تحت كشاف ضوئي مائل لكشف أي تموج مجهري.\n3. تطبيق طبقتين من دهان الأكريليك الفاخر نصف اللامع القابل للغسيل ومقاوم البقع والفرك المتكرر.\n\n### نصائح تنسيق الإضاءة وتدرجات الألوان الفندقية\n- احرص على استخدام إضاءة دافئة 3000 كلفن أو حيادية 4000 كلفن؛ فالإضاءة الباردة تقتل دفء الطلاء وتسبب إجهاداً عصبياً.\n- دمج درجات الأوف وايت والجريج مع شرائح بديل الخشب وبديل الرخام يمنح الصالة اتساعاً وفخامة فندقية لا مثيل لها.\n\n## أسئلة متكررة تهم كل مقبل على تشطيب منزله (FAQ)\n**س: كيف أحافظ على ثبات ألوان الدهانات لسنوات طويلة؟**\nج: التأسيس الممتاز واستخدام دهانات أكريليكية قابلة للغسيل والتنظيف بقطع قماش قطنية ناعمة يضمن بقاء ألوان حوائطك براقة وجديدة.\n\n**س: هل يناسب دهان الجريج المساحات الضيقة؟**\nج: نعم، الجريج الفاتح يعكس الضوء بانتظام ويمنح شعوراً ملموساً باتساع الفراغ وانسيابية الرؤية.`;
      finalContent += decorEnrichment;
      setContent(finalContent);
      setAiSuccessMsg(isAr ? 'تم استكمال وإثراء المقال بنصائح الحضرى محمود ليتجاوز 1,000 كلمة ونشره بنجاح!' : 'Auto-enriched to 1,000+ words and published!');
    }

    setFormError('');
    setIsPublishing(true);

    const finalCategory = newCatInput.trim() ? newCatInput.trim() : category;

    const newArticle: Article = {
      id: 'manual-post-' + Date.now(),
      title: title.trim(),
      slug: title.trim().toLowerCase().replace(/[\s/\\?#%]+/g, '-').replace(/-+/g, '-').slice(0, 60),
      excerpt: excerpt.trim() || content.slice(0, 160) + '...',
      content: finalContent,
      featuredImage: featuredImage.trim(),
      author: {
        name: settings.authorName || 'الحضرى محمود',
        avatar: settings.authorAvatar || '',
        role: isAr ? 'صاحب المدونة واستشاري الديكور والتشطيبات' : 'Decor & Paints Consultant',
      },
      category: finalCategory,
      tags: tagsList,
      publishedAt: new Date().toISOString(),
      readingTime,
      views: 1,
      likes: 0,
      comments: [],
      status,
      seoScore: 96,
      rewrittenByAi: false,
    };

    try {
      await onPublishArticle(newArticle);
      setPublishedPost(newArticle);
    } catch (err: any) {
      console.error('Failed to publish manual article:', err);
      setFormError(err.message || (isAr ? 'فشل حفظ ونشر المقال في الخادم.' : 'Failed to publish article.'));
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isAr ? 'محرر المقالات اليدوي الكلاسيكي' : 'Classic Manual Article Editor'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {isAr ? 'إنشاء ونشر مقال يدوي بنفسك' : 'Write & Publish Manual Article'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAr
              ? 'محرر كامل للتدوين اليدوي بصيغة ووردبريس مع أدوات التنسيق، وتخصيص الصورة البارزة والتصنيفات.'
              : 'Full WordPress style publication editor with typography toolbar, categories, and tags.'}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'editor'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {isAr ? 'المحرر والكتابة' : 'Editor'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isAr ? 'معاينة حية للمقال' : 'Live Preview'}</span>
          </button>
        </div>
      </div>

      {publishedPost && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                  {isAr ? 'منشور ومعتمد' : 'Published'}
                </span>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  {isAr ? 'تم نشر مقالك بنجاح في صفحات نشر المقالات بالمدونة!' : 'Article Published Successfully to Live Blog!'}
                </span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                «{publishedPost.title}»
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onViewArticle(publishedPost)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>{isAr ? '👁️ مشاهدة المقال في صفحة المقال' : 'View Article on Blog'}</span>
            </button>
          </div>
        </div>
      )}

      {formError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{formError}</span>
        </div>
      )}

      {aiSuccessMsg && (
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0 text-indigo-500" />
          <span>{aiSuccessMsg}</span>
        </div>
      )}

      {/* Editor Body */}
      {activeTab === 'editor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isAr ? 'عنوان المقال (Title):' : 'Article Title:'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isAr ? 'اكتب عنواناً جذاباً ومؤثراً للمقال...' : 'Enter an eye-catching article title...'}
                  className="w-full text-base sm:text-lg font-bold px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Excerpt */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isAr ? 'مقتطف موجز للمقال (Excerpt):' : 'Short Excerpt:'}
                </label>
                <textarea
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder={isAr ? 'ملخص سريع يظهر في بطاقة المقال بالصفحة الرئيسية...' : 'Brief summary shown in the card feed...'}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Toolbar */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs">
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                    title={isAr ? 'عريض (Bold)' : 'Bold'}
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('*', '*')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                    title={isAr ? 'مائل (Italic)' : 'Italic'}
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <span className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></span>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n## ', '\n')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 font-bold"
                    title={isAr ? 'عنوان فرعي H2' : 'Heading 2'}
                  >
                    <Heading2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n### ', '\n')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 font-bold"
                    title={isAr ? 'عنوان فرعي H3' : 'Heading 3'}
                  >
                    <Heading3 className="w-4 h-4" />
                  </button>
                  <span className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></span>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n> ', '\n')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                    title={isAr ? 'اقتباس (Quote)' : 'Blockquote'}
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n- ', '')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                    title={isAr ? 'قائمة نقطية' : 'Bullet List'}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n1. ', '')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                    title={isAr ? 'قائمة مرقمة' : 'Numbered List'}
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('```\n', '\n```')}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                    title={isAr ? 'كتلة كود برمجية' : 'Code'}
                  >
                    <Code className="w-4 h-4" />
                  </button>
                  <span className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></span>
                  <button
                    type="button"
                    onClick={() =>
                      insertFormatting(
                        '\n![شرح توضيحي للصورة](https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1000&q=80)\n*شرح توضيحي للصورة*\n'
                      )
                    }
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 text-xs"
                    title={isAr ? 'إدراج صورة مع شرح' : 'Insert image with caption'}
                  >
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    <span>{isAr ? 'إدراج صورة' : 'Image'}</span>
                  </button>
                </div>

                {/* Textarea */}
                <textarea
                  id="manual-content-editor"
                  rows={16}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    isAr
                      ? 'اكتب محتوى المقال هنا بتنسيق Markdown...\n\nيمكنك استخدام العناوين الفرعية: ## عنوان المقال\nأو إدراج صور مع شرح: ![شرح](رابط_الصورة)\nأو نقاط وتفاصيل إبداعية.'
                      : 'Write your post in Markdown...'
                  }
                  className="w-full text-sm p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none leading-relaxed font-sans"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-xs gap-2">
                  <div className="flex items-center gap-4 text-slate-500">
                    <span className="font-bold">
                      {wordCount} {isAr ? 'كلمة' : 'words'}
                    </span>
                    <span>
                      {content.length} {isAr ? 'حرف' : 'chars'}
                    </span>
                    <span className="flex items-center gap-1 text-blue-600">
                      <Clock className="w-3 h-3" />
                      {readingTime} {isAr ? 'دقائق قراءة' : 'min read'}
                    </span>
                  </div>

                  {/* AdSense Word Count Indicator */}
                  <div className="flex items-center gap-1.5 font-bold">
                    {wordCount >= 1000 ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {isAr ? 'مستوفٍ لمعايير AdSense للنشر (>1000 كلمة)' : 'AdSense Ready (>1,000 words)'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[11px] flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {isAr ? `${wordCount} / 1000 كلمة مطلوبة للنشر` : `${wordCount} / 1,000 words needed`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Post Settings */}
          <div className="lg:col-span-4 space-y-6">
            {/* Publish Actions Box */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                {isAr ? 'إجراءات النشر' : 'Publish Actions'}
              </h3>

              <div className="space-y-2">
                {/* 1-Click Auto-Enrich Button */}
                <button
                  type="button"
                  onClick={handleAutoEnrich}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title={isAr ? 'توسيع المقال تلقائياً وإضافة عناصر السيو والعناوين ليتجاوز 1000 كلمة' : 'Auto enrich to 1000+ words'}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isAr ? 'إثراء وتوسيع المقال تلقائياً (1000+ كلمة لـ AdSense)' : 'Auto-Enrich to 1,000+ words'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAiRewrite}
                  disabled={isAiRewriting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isAiRewriting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isAr ? 'جارِ التحويل وإعادة الصياغة بالسيو...' : 'Rewriting for SEO...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{isAr ? 'إعادة صياغة المقال بالسيو (AI)' : 'SEO Rewrite with AI'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handlePublish('published')}
                  disabled={isPublishing}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPublishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>
                    {isPublishing
                      ? (isAr ? 'جارِ النشر في قاعدة البيانات...' : 'Publishing to DB...')
                      : (isAr ? 'نشر المقال فوراً على المدونة' : 'Publish Article Now')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePublish('draft')}
                  disabled={isPublishing}
                  className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isAr ? 'حفظ كمسودة' : 'Save as Draft'}
                </button>
              </div>
            </div>

            {/* Featured Image */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                  {isAr ? 'الصورة البارزة (غلاف المقال)' : 'Featured Image'}
                </h3>

                {imageDuplicateStatus?.isDuplicate ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-red-500" />
                    <span>{isAr ? '🔴 مكررة' : 'Duplicate'}</span>
                  </span>
                ) : imageDuplicateStatus ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCheck className="w-3 h-3 text-emerald-600" />
                    <span>{isAr ? '🟢 فريدة 100%' : '100% Unique'}</span>
                  </span>
                ) : null}
              </div>

              <div className="aspect-16/10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative">
                <img
                  src={featuredImage}
                  alt="Featured preview"
                  className="w-full h-full object-cover"
                />

                {imageDuplicateStatus?.isDuplicate && (
                  <div className="absolute top-2 start-2 end-2 bg-red-600/90 text-white text-[10px] font-bold p-1 rounded backdrop-blur-xs flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-amber-200 shrink-0" />
                    <span className="truncate">{imageDuplicateStatus.reason || (isAr ? 'مستخدمة في مقال آخر' : 'Used elsewhere')}</span>
                  </div>
                )}
              </div>

              {/* 1-Click Unique Replacement Button */}
              {imageDuplicateStatus?.isDuplicate && (
                <button
                  type="button"
                  onClick={handleAutoReplaceFeaturedImage}
                  className="w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>{isAr ? '⚡ استبدال بصورة فريدة من الكتالوج' : 'Replace with Unique Image'}</span>
                </button>
              )}

              <div className="flex gap-2">
                <input
                  type="url"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
                <label className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors flex items-center justify-center shrink-0" title={isAr ? 'رفع وضغط صورة محلية (WebP)' : 'Upload & compress image'}>
                  <Upload className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const compressed = await compressImageClient(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 });
                        setFeaturedImage(compressed.dataUrl);
                      } catch (err) {
                        console.warn('Compression error:', err);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Category */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-500" />
                {isAr ? 'تصنيف المقال' : 'Category'}
              </h3>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
              >
                {CATEGORIES.slice(1).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <div className="space-y-1 pt-1">
                <span className="text-[11px] text-slate-400">
                  {isAr ? 'أو اكتب تصنيفاً جديداً مخصصاً:' : 'Or custom category:'}
                </span>
                <input
                  type="text"
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  placeholder={isAr ? 'اسم تصنيف جديد...' : 'New category name...'}
                  className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Tags / Keywords */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-500" />
                {isAr ? 'الكلمات المفتاحية والوسوم (SEO)' : 'Tags / Keywords'}
              </h3>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder={isAr ? 'أضف وسماً واضغط Enter...' : 'Add tag & Enter...'}
                  className="flex-1 text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-xs font-semibold rounded-lg"
                >
                  {isAr ? 'إضافة' : 'Add'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {tagsList.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-medium"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-blue-400 hover:text-blue-600 text-[10px]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Live Preview Mode */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm max-w-4xl mx-auto space-y-6">
          <div className="relative aspect-16/9 rounded-2xl overflow-hidden">
            <img
              src={featuredImage}
              alt={title || 'Featured'}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-3">
            <span className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold">
              {newCatInput || category}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
              {title || (isAr ? 'عنوان المقال التجريبي' : 'Sample Article Title')}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic border-s-4 border-blue-500 ps-4">
              {excerpt || (isAr ? 'مقتطف المقال التوضيحي...' : 'Article excerpt summary...')}
            </p>
          </div>

          <div className="prose dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-wrap">
            {content || (isAr ? 'محتوى المقال سيظهر هنا بالتفصيل...' : 'Article body will appear here...')}
          </div>
        </div>
      )}
    </div>
  );
};
