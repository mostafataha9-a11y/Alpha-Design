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
import { compressImageClient } from '../utils/imageCompression';
import { countActualWords, sanitizeArticleSlug } from '../utils/articleValidator';
import {
  generateSmartArticleWithGeminiClient,
  formatGeminiArabicError,
} from '../services/geminiClient';
import {
  checkClientImageDuplicates,
  getUniqueClientDecorReplacement,
} from '../utils/clientImageCatalog';

const MANUAL_CREATIVE_STYLES = [
  { id: 'STORYTELLING_SITE', labelAr: 'سرد قصصي ومواقف موقع', labelEn: 'Field Storytelling', tone: 'سرد قصصي واقعي دافئ من قلب الموقع مع حوارات وتفاصيل ملموسة' },
  { id: 'ARTISAN_INSIDER', labelAr: 'أسرار المعلم وخبرة الورشة', labelEn: 'Artisan Trade Secrets', tone: 'أسرار المعلم المحترف والصانع الخبير مع الأمانة الهندسية' },
  { id: 'SENSORY_QUIET_LUXURY', labelAr: 'سيكولوجية الفخامة الهادئة', labelEn: 'Sensory Quiet Luxury', tone: 'سيكولوجية الفخامة الهادئة وملمس الأسطح وانعكاس الضوء 3000K' },
  { id: 'MYTH_BUSTING_CONSULTANCY', labelAr: 'تفنيد الأوهام والأخطاء', labelEn: 'Myth-Busting', tone: 'ماستركلاس استشاري صريح يفند الخرافات الشائعة بأدلة معمارية' },
  { id: 'REAL_COST_VALUATION', labelAr: 'حسابات التكلفة والجدوى', labelEn: 'Cost & Budget', tone: 'دراسة جدوى وتكلفة واقعية بالأرقام والأسعار الدقيقة لعام 2026' },
  { id: 'ARTISTIC_ALCHEMY', labelAr: 'كيمياء الألوان 2026', labelEn: 'Color Alchemy', tone: 'كيمياء الألوان الفنية وتأثيرات الجير الصخري والرخام المضيء' },
];

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

    setIsCheckingImageDup(true);
    try {
      const data = checkClientImageDuplicates([featuredImage.trim()]);
      if (data.results && data.results[0]) {
        setImageDuplicateStatus(data.results[0]);
      }
    } finally {
      setIsCheckingImageDup(false);
    }
  }, [featuredImage, isAr]);

  const handleAutoReplaceFeaturedImage = async () => {
    const rep = getUniqueClientDecorReplacement([featuredImage], title || category);
    if (rep?.url) {
      setFeaturedImage(rep.url);
    }
  };

  // Accurate real word count synced with server validator
  const wordCount = useMemo(() => {
    return countActualWords(content);
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
  const [selectedCreativeStyle, setSelectedCreativeStyle] = useState('STORYTELLING_SITE');

  // Insert a genuine non-duplicate decor image into the markdown editor
  const handleInsertDecorImage = async () => {
    const existingUrls = new Set<string>([featuredImage.trim()]);
    const matches = content.matchAll(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g);
    for (const m of matches) {
      if (m[1]) existingUrls.add(m[1].trim());
    }

    let pickedUrl = '';
    let pickedCaption = isAr ? 'تصميم ديكور وتشطيبات جدران حديثة بإضاءة دافئة 3000K' : 'Modern interior wall paint and decor design';
    const rep = getUniqueClientDecorReplacement(Array.from(existingUrls), title || category);
    if (rep?.url) {
      pickedUrl = rep.url;
      if (rep.defaultCaption) pickedCaption = rep.defaultCaption;
    }

    if (!pickedUrl) {
      const fallbackDecorImages = [
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1000&q=80',
      ];
      pickedUrl = fallbackDecorImages.find((u) => !existingUrls.has(u)) || fallbackDecorImages[0];
    }

    insertFormatting(`\n![${pickedCaption}](${pickedUrl})\n*${pickedCaption}*\n`);
  };

  // Shared non-repetitive creative human enrichment (guarantees >= targetWords actual tokens)
  const enrichManualContent = (baseContent: string, articleTopic: string, targetWords = 1080): string => {
    const authorSignature = settings.authorName || 'الحضرى محمود';
    let working = baseContent.trim();
    if (!working) {
      working = isAr
        ? `حين نقف أمام جدار مصمت في بداية أي تشطيب، لا نرى مجرد مساحة إسمنتية، بل نرى مسرحاً للضوء والملمس والسكينة يجمع بين دفء البيت وفخامة التنفيذ المتقن.`
        : `When facing a blank wall at the start of any finishing project, we see a living canvas of light, texture, and serene modern luxury.`;
    }

    const blocks = isAr
      ? [
          {
            marker: 'قراءة الضوء الطبيعي واختيار درجات الدهان',
            text: `\n\n## 1. قراءة الضوء الطبيعي واختيار درجات الدهان في ${articleTopic}\n` +
              `عند التخطيط لتشطيب الجدران والألوان داخل البيت، تبدأ القصة دائماً من حركة الضوء الطبيعي وزوايا الشمس خلال النهار. اختيار كود الطلاء من كتالوج ورقي تحت إضاءة المعرض كثيراً ما يخدع العين؛ لذلك نوصي دائماً بتطبيق عينة فعلية على متر مربع كامل من الحائط ومراقبتها في الصباح وعند الغروب. بالاعتماد على قاعدة التوزيع اللوني 60-30-10، تمنحك الدرجات الدافئة الهادئة مثل الأوف وايت اللؤلؤي والجريج المتوازن مساحة رحبة مريحة للأعصاب، بينما تأتي الإكسسوارات الخشبية ولمسات اللون التكميلي لتصنع شخصية دافئة وأصيلة في كل ركن.`
          },
          {
            marker: 'دمج بديل الرخام وبديل الخشب وإضاءة 3000K',
            text: `\n\n## 2. فن دمج بديل الرخام وبديل الخشب مع إضاءة الليد المخفية 3000K\n` +
              `يمثل المزج الذكي بين ألواح بديل الرخام المعالجة بطبقة حماية UV (سماكة صلبة لا تقل عن 2.8 إلى 3 مم) وشرائح بديل الخشب الرأسية WPC واحدة من أنجح صيحات التشطيب المعماري لعام 2026. الخطوط الرأسية للخشب ترفع السقف بصرياً وتضفي إيقاعاً دافئاً هادئاً، فيما تعكس عروق الرخام النقية ضوء الليد المخفي بدرجة حرارة 3000 كلفن خلف الجدار المحوري لتخرج الصالة بمظهر فندقي متزن دون مبالغة أو إرهاق للميزانية.`
          },
          {
            marker: 'أصول الصنعة في التأسيس ومعالجة الرطوبة',
            text: `\n\n## 3. أصول الصنعة في تأسيس الحوائط ومعالجة الرطوبة\n` +
              `جودة الدهان النهائي تقف على أكتاف التأسيس السليم قبل أن يلمس الرول الجدار. خطواتنا الميدانية المعتمدة تبدأ بكشط القشور الضعيفة وفتح المسام بحجر الجلخ، ثم دهان وجه مشبع من السيلر المائي البوليمري المقاوم للأملاح لحبس الرطوبة وتثبيت الحبيبات الرملية. بعد الجفاف التام يتم سحب ثلاث سكاكين معجون متعامدة (رأسياً ثم أفقياً ثم ناعماً) يعقبها تنعيم ميكانيكي بصنفرة 320 تحت كشاف ضوئي مائل 500 واط يكشف أدق التموجات قبل طلاء وجهي الأكريليك النقي القابل للغسيل المتكرر.`
          },
          {
            marker: 'توصيات واستشارات ميدانية من خبير الديكور',
            text: `\n\n### توصيات واستشارات ميدانية بقلم خبير الديكور ${authorSignature}\n` +
              `- **افحص رطوبة الحوائط قبل بدء المعجون:** التأكد من جفاف الجدار وعلاج أي مصدر تسريب بجوار الحمامات يوفر عليك تكلفة إعادة التشطيب لاحقاً.\n` +
              `- **احرص على زمن الجفاف الكافي بين كل سكينة معجون:** العمل على طبقات رطبة يحبس بخار الماء ويؤدي إلى فقاعات وتقشير مبكر.\n` +
              `- **طابق درجة اللمعان مع وظيفة الفراغ:** استخدم المطفي للأسقف وغرف النوم الهادئة، وربع اللامع أو نصف اللامع القابل للغسيل للممرات وغرف المعيشة.\n` +
              `- **تجنب الإضاءة البيضاء القاسية 6500K:** اعتمد دائماً درجات 3000K الدافئة أو 4000K المحايدة لإبراز جمال الصبغات اللونية وراحة العين.`
          },
          {
            marker: 'الأسئلة العملية الشائعة بين أصحاب المنازل',
            text: `\n\n## 4. الأسئلة العملية الشائعة حول الدهانات والديكورات (FAQ)\n` +
              `**س: ما الفرق الفعلي بين دهان البلاستيك المطفي ونصف اللامع؟**\n` +
              `ج: الدهان المطفي يخفي عيوب استواء الحوائط ويناسب الأسقف وغرف النوم، أما نصف اللامع فيتميز بصلابة سطحية عالية وسهولة التنظيف بالماء الدافئ والمنظف اللطيف، ما يجعله مثالياً للممرات وصالات الأسرة.\n\n` +
              `**س: هل يفضل تركيب بديل الخشب والرخام قبل الوجه الأخير من الطلاء؟**\n` +
              `ج: نعم، الأسلوب الميداني الأدق هو إتمام التأسيس والوجه الأول للدهان، ثم تركيب الألواح بسليكون عظمي نقي، وبعدها تطبيق الوجه النهائي للطلاء لضمان حواف وفواصل فائقة النظافة.\n\n` +
              `**س: متى يمكن تنظيف الحوائط المدهونة حديثاً دون التأثير على الصبغة؟**\n` +
              `ج: يجف السطح ظاهرياً في ساعات، لكن التصلب الكيميائي الكامل للفيلم الأكريليكي يكتمل خلال 10 إلى 14 يوماً قبل الغسيل اللطيف بقطعة قطنية ناعمة.`
          },
          {
            marker: 'مراجعة الاستلام الهندسي والحفاظ على الطلاء',
            text: `\n\n## 5. مراجعة الاستلام الهندسي والحفاظ على الطلاء طويل الأمد\n` +
              `قبل استلام الشقة بشكل نهائي، نقوم بجولة فحص دقيقة في ضوء النهار الطبيعي ومع تشغيل الإضاءة المخفية للتأكد من نظافة التقاء الألوان عند الوزرات وأحواض الأبواب، وتجانس الملمس على امتداد الجدران دون أي تسييل أو علامات رول. وللمحافظة على هذا الصفاء لسنوات طويلة، يكفي التنظيف الدوري اللطيف والتهوية الجيدة والبعد تماماً عن المواد الكاشطة أو الكلور المركز.`
          },
        ]
      : [
          {
            marker: 'Evaluating Natural Light and Color Balance',
            text: `\n\n## 1. Evaluating Natural Light and Color Balance in ${articleTopic}\n` +
              `Successful architectural painting starts by observing natural daylight across morning and evening hours before buying full gallons. Testing a full square meter sample on site protects you from cold undertones in north-facing rooms and helps anchor the serene 60-30-10 color harmony.`
          },
          {
            marker: 'Combining PVC Marble, Fluted Wood & 3000K LED',
            text: `\n\n## 2. Combining PVC Marble, Fluted Wood & 3000K LED\n` +
              `Pairing 3mm UV-protected PVC marble sheets with WPC fluted timber panels creates a balanced focal wall anchored by warm 3000K indirect lighting profiles without overwhelming the room budget.`
          },
          {
            marker: 'Surface Preparation and Multi-Coat Putty Protocol',
            text: `\n\n## 3. Surface Preparation & Multi-Coat Putty Protocol\n` +
              `Long-lasting finishes demand patient preparation: sanding weak plaster, sealing masonry with polymer primer, pulling three cross-hatched coats of fine putty, and inspecting flatness under a 500W raking light before applying two washable acrylic finish coats.`
          },
          {
            marker: 'Field Advice from',
            text: `\n\n### Practical Field Notes by ${authorSignature}\n` +
              `- Respect full curing times between putty and finish layers to avoid trapped moisture.\n` +
              `- Choose dead matte for ceilings, soft satin eggshell for bedrooms, and washable semi-gloss for high-traffic corridors.\n\n` +
              `## 4. Frequently Asked Questions (FAQ)\n` +
              `**How long does acrylic interior paint take to cure before gentle washing?**\n` +
              `Allow 10 to 14 days for full polymer curing before wiping walls with a soft damp microfiber cloth.\n\n` +
              `**Should decorative wall panels be installed before or after final touch-up coats?**\n` +
              `Complete priming, puttying, and the first paint coat first, mount decorative panels cleanly second, and finish with crisp edge touch-ups.`
          },
        ];

    for (const block of blocks) {
      if (countActualWords(working) >= targetWords) break;
      if (!working.includes(block.marker)) {
        working = `${working}${block.text}`;
      }
    }
    return working;
  };

  const handleAiRewrite = async () => {
    if (!title.trim() && !content.trim()) {
      setFormError(isAr ? 'يرجى كتابة عنوان المقال أو جزء من مسودته لتتم إعادة صياغتها بالسيو.' : 'Please enter a title or draft text to rewrite.');
      return;
    }

    setFormError('');
    setIsAiRewriting(true);
    setAiSuccessMsg('');

    const styleObj = MANUAL_CREATIVE_STYLES.find((s) => s.id === selectedCreativeStyle) || MANUAL_CREATIVE_STYLES[0];
    const currentActualWords = countActualWords(content);

    try {
      const data = await generateSmartArticleWithGeminiClient({
        images: [
          {
            url: featuredImage,
            caption: title || (isAr ? 'تصميم ديكور معاصر — ألفا للديكور والدهانات' : 'Modern interior decor figure'),
          },
        ],
        topic: title.trim(),
        draftTitle: title.trim(),
        draftContent: content.trim(),
        creativeStyle: styleObj.id,
        tone: styleObj.tone,
        targetWordCount: Math.max(1250, currentActualWords + 350),
        language: settings.language,
        businessLocation: (settings as any)?.businessLocation || null,
        authorName: settings?.authorName || 'الحضرى محمود',
      });

      if (data.title) setTitle(data.title);
      if (data.content) setContent(data.content);
      if (data.excerpt) setExcerpt(data.excerpt);
      if (data.tags && Array.isArray(data.tags)) setTagsList(data.tags);
      if (data.category) setCategory(data.category);

      setAiSuccessMsg(
        isAr
          ? `تمت إعادة صياغة مسودتك بأسلوب «${styleObj.labelAr}» البشري الإبداعي (${data.actualWordCount || countActualWords(data.content || '')} كلمة) وتهيئتها للسيو وأدسنس! يمكنك المراجعة أو النشر فوراً.`
          : 'Article rewritten and optimized for Google SEO in a warm creative human tone!'
      );
    } catch (e: unknown) {
      console.error(e);
      setFormError(
        formatGeminiArabicError(e, isAr ? 'تعذر إتمام إعادة الصياغة الذكية' : 'Failed to rewrite with AI')
      );
    } finally {
      setIsAiRewriting(false);
    }
  };

  // Auto-enrich manual article to guarantee 1050+ actual words and creative structure
  const handleAutoEnrich = () => {
    const rawTitle = title.trim() || (isAr ? 'أسرار دهانات الحوائط والديكورات العصرية وأحدث تشطيبات بديل الرخام' : 'Modern Interior Decor & Paints Guide');
    const enrichedContent = enrichManualContent(content, rawTitle, 1120);
    const enrichedWords = countActualWords(enrichedContent);

    setContent(enrichedContent);
    if (!title.trim()) setTitle(rawTitle);
    if (!excerpt.trim()) {
      const cleanPreview = enrichedContent.replace(/!\[.*?\]\(.*?\)/g, '').replace(/[#*>_-]/g, '').trim();
      setExcerpt(cleanPreview.slice(0, 160) + '...');
    }
    setAiSuccessMsg(
      isAr
        ? `تم إثراء وتوسيع المقال بأسلوب بشري إبداعي ليصل إلى ${enrichedWords} كلمة فعلية مع عناوين H2/H3 وتوصيات الحضرى محمود ليتوافق 100% مع معايير AdSense!`
        : `Article enriched cleanly to ${enrichedWords} actual words with structured headings and expert insights!`
    );
    setFormError('');
  };

  const handlePublish = async (status: 'published' | 'draft' = 'published') => {
    setFormError('');
    setPublishedPost(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError(isAr ? 'يرجى كتابة عنوان المقال أولاً.' : 'Please enter an article title.');
      return;
    }
    if (status === 'draft' && trimmedTitle.length < 3) {
      setFormError(isAr ? 'عنوان المسودة قصير جداً (يجب ألا يقل عن 3 أحرف).' : 'Draft title must be at least 3 characters.');
      return;
    }
    if (status === 'published' && trimmedTitle.length < 10) {
      setFormError(isAr ? 'عنوان المقال للنشر قصير جداً (يجب ألا يقل عن 10 أحرف).' : 'Published article title must be at least 10 characters.');
      return;
    }

    let finalContent = content.trim();
    if (!finalContent) {
      setFormError(isAr ? 'يرجى كتابة محتوى المقال أولاً.' : 'Please write the article content.');
      return;
    }

    const currentWords = countActualWords(finalContent);
    if (status === 'draft' && currentWords < 10) {
      setFormError(
        isAr
          ? `المسودة قصيرة جداً (${currentWords} كلمة). يرجى كتابة 10 كلمات على الأقل لحفظ المسودة.`
          : `Draft is too short (${currentWords} words). Write at least 10 words to save a draft.`
      );
      return;
    }

    if (status === 'published' && currentWords < 1020) {
      finalContent = enrichManualContent(finalContent, trimmedTitle, 1080);
      setContent(finalContent);
      setAiSuccessMsg(
        isAr
          ? `تم استكمال وإثراء المقال إبداعياً ليبلغ ${countActualWords(finalContent)} كلمة فعلية متوافقة مع AdSense وجاري نشره الآن!`
          : `Auto-enriched to ${countActualWords(finalContent)} actual words for AdSense and publishing now!`
      );
    }

    setIsPublishing(true);

    const finalCategory = newCatInput.trim() ? newCatInput.trim() : category;
    const finalWords = countActualWords(finalContent);
    const finalReadingTime = Math.max(1, Math.ceil(finalWords / 200));
    const cleanAutoExcerpt = finalContent.replace(/!\[.*?\]\(.*?\)/g, '').replace(/[#*>_-]/g, '').trim().slice(0, 160) + '...';

    const newArticle: Article = {
      id: 'manual-post-' + Date.now(),
      title: trimmedTitle,
      slug: sanitizeArticleSlug(trimmedTitle),
      excerpt: excerpt.trim() || cleanAutoExcerpt,
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
      readingTime: finalReadingTime,
      views: 1,
      likes: 0,
      comments: [],
      status,
      seoScore: status === 'published' ? 96 : 75,
      rewrittenByAi: false,
    };

    try {
      const pubRes = await onPublishArticle(newArticle);
      const persisted = (pubRes as any)?.article || newArticle;
      setPublishedPost({
        ...persisted,
        author: persisted.author || newArticle.author,
      });
    } catch (err: any) {
      console.error('Failed to publish manual article:', err);
      setFormError(err.message || (isAr ? 'فشل حفظ ونشر المقال في قاعدة البيانات.' : 'Failed to publish article.'));
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
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in ${
            publishedPost.status === 'draft'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <CheckCircle
              className={`w-6 h-6 shrink-0 ${
                publishedPost.status === 'draft' ? 'text-amber-500' : 'text-emerald-500'
              }`}
            />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-white text-[10px] font-bold ${
                    publishedPost.status === 'draft' ? 'bg-amber-600' : 'bg-emerald-600'
                  }`}
                >
                  {publishedPost.status === 'draft'
                    ? (isAr ? 'مسودة محفوظة' : 'Draft Saved')
                    : (isAr ? 'منشور ومعتمد' : 'Published')}
                </span>
                <span
                  className={`text-xs font-bold ${
                    publishedPost.status === 'draft'
                      ? 'text-amber-900 dark:text-amber-200'
                      : 'text-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  {publishedPost.status === 'draft'
                    ? (isAr ? 'تم حفظ المسودة في قاعدة البيانات ولن تظهر للزوار حتى تنشرها!' : 'Draft saved privately to database!')
                    : (isAr ? 'تم نشر مقالك بنجاح في صفحات نشر المقالات بالمدونة!' : 'Article Published Successfully to Live Blog!')}
                </span>
              </div>
              <p
                className={`text-xs font-medium ${
                  publishedPost.status === 'draft'
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-emerald-700 dark:text-emerald-300'
                }`}
              >
                «{publishedPost.title}»
              </p>
            </div>
          </div>
          {publishedPost.status !== 'draft' && (
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
          )}
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
                    onClick={handleInsertDecorImage}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 text-xs cursor-pointer"
                    title={isAr ? 'إدراج صورة ديكور فريدة مع شرح' : 'Insert unique decor image with caption'}
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
                {/* Creative Human Writing Angle Selector for AI Rewrite */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isAr ? 'نبرة وأسلوب الصياغة البشرية الإبداعية:' : 'Creative Human Rewrite Angle:'}</span>
                  </label>
                  <select
                    value={selectedCreativeStyle}
                    onChange={(e) => setSelectedCreativeStyle(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    {MANUAL_CREATIVE_STYLES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {isAr ? st.labelAr : st.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

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
