/**
 * Strict real word count calculation for Arabic and English text.
 * Strips markdown images, URLs, and formatting tokens before counting genuine word tokens.
 */
export function countActualWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const cleaned = text
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[\[IMAGE_\d+\]\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#*`~_>\-[\]()|:؛،.؟]/gu, ' ')
    .trim();
  const tokens = cleaned.split(/\s+/).filter((t) => t.trim().length > 0);
  return tokens.length;
}

export interface ValidationResult {
  valid: boolean;
  actualWordCount: number;
  status: 'published' | 'draft';
  errors: string[];
  warnings: string[];
}

const DECOR_PAINTS_KEYWORDS = [
  'دهان',
  'دهانات',
  'ديكور',
  'ديكورات',
  'حائط',
  'حوائط',
  'جدار',
  'جدران',
  'ألوان',
  'لون',
  'رخام',
  'بديل الرخام',
  'بديل الخشب',
  'جبس بورد',
  'معجون',
  'صنفرة',
  'سيلر',
  'إضاءة',
  'جريج',
  'أوف وايت',
  'تشطيب',
  'تشطيبات',
  'معماري',
  'فندقي',
  'ستوكو',
  'قطيفة',
  'بلاستيك',
  'جوتن',
  'رطوبة'
];

/**
 * Validates article payload against editorial and quality standards.
 * Enforces:
 * - Actual word count between 1,000 and 10,000 words.
 * - Non-empty title and excerpt.
 * - Clear interior decor & paints specialization.
 * - Subheadings (H2, H3).
 * - No duplicate images within the same article.
 * - No leftover unresolved placeholders.
 */
export function validateArticlePayload(
  article: {
    title?: string;
    excerpt?: string;
    content?: string;
    category?: string;
    featuredImage?: string;
    status?: string;
    tags?: string[];
  },
  options: {
    minWords?: number;
    maxWords?: number;
    strictPublish?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const minWords = options.minWords ?? 1000;
  const maxWords = options.maxWords ?? 10000;
  const strictPublish = options.strictPublish ?? true;

  const title = (article.title || '').trim();
  const content = (article.content || '').trim();
  const excerpt = (article.excerpt || '').trim();

  // 1. Title validation
  if (!title) {
    errors.push('عنوان المقال مطلوب ولا يمكن تركه فارغاً.');
  } else if (title.length < 10) {
    errors.push('عنوان المقال قصير جداً (يجب ألا يقل عن 10 أحرف).');
  }

  // 2. Content presence
  if (!content) {
    errors.push('محتوى المقال فارغ.');
  }

  // 3. Word count validation (from actual text, not model metadata)
  const isDraft = article.status === 'draft';
  const actualWordCount = countActualWords(content);
  const effectiveMinWords = isDraft ? 10 : minWords;

  if (actualWordCount < effectiveMinWords) {
    errors.push(
      isDraft
        ? `المسودة قصيرة جداً (${actualWordCount} كلمة). يرجى كتابة 10 كلمات على الأقل لحفظ المسودة.`
        : `عدد الكلمات الفعلي (${actualWordCount} كلمة) أقل من الحد الأدنى الإلزامي لسياسات الموقع وأدسنس (${minWords} كلمة). يرجى استخدام زر "إثراء وتوسيع المقال" أو حفظه كمسودة.`
    );
  } else if (actualWordCount > maxWords) {
    errors.push(
      `عدد الكلمات الفعلي (${actualWordCount} كلمة) يتجاوز الحد الأقصى المسموح به (${maxWords} كلمة).`
    );
  }

  // 4. Decor & Paints Specialization Check
  const combinedText = `${title} ${excerpt} ${content}`.toLowerCase();
  const hasSpecialization = DECOR_PAINTS_KEYWORDS.some((kw) => combinedText.includes(kw));
  if (!hasSpecialization) {
    errors.push('المقال يفتقر إلى تخصص المدونة الحصري (الديكور والدهانات والتشطيبات المعمارية).');
  }

  // 5. Structure & Headings Check (Required for published articles)
  const hasH2 = /^##\s+.+/m.test(content);
  const hasH3 = /^###\s+.+/m.test(content);
  if (!isDraft && !hasH2 && !hasH3) {
    errors.push('المقال يفتقر إلى العناوين الفرعية الهيكلية (H2 / H3) لتنظيم القراءة.');
  }

  // 6. Leftover Placeholders Check
  if (/\[\[IMAGE_\d+\]\]/.test(content)) {
    errors.push('يحتوي المحتوى على وسوم صور غير مستبدلة ([[IMAGE_...]]).');
  }

  // 7. Duplicate Images Within Content Check
  const imageMarkdownMatches = content.match(/!\[.*?\]\((.*?)\)/g) || [];
  const extractedUrls: string[] = [];
  for (const m of imageMarkdownMatches) {
    const urlMatch = m.match(/\((.*?)\)/);
    if (urlMatch && urlMatch[1]) {
      extractedUrls.push(urlMatch[1].trim());
    }
  }

  const uniqueUrls = new Set(extractedUrls);
  if (uniqueUrls.size < extractedUrls.length) {
    errors.push('يحتوي المقال على صور مكررة في أكثر من موضع داخل النص.');
  }

  // Status determination: if errors exist, the article CANNOT be published
  const canPublish = errors.length === 0;
  const determinedStatus: 'published' | 'draft' = (canPublish && article.status !== 'draft') ? 'published' : 'draft';

  if (!canPublish && strictPublish && article.status === 'published') {
    warnings.push('تم تحويل حالة المقال تلقائياً إلى "مسودة" (Draft) لمنع نشر محتوى غير مستوفٍ لمعايير الجودة.');
  }

  return {
    valid: canPublish,
    actualWordCount,
    status: determinedStatus,
    errors,
    warnings,
  };
}

export interface CreativityAssessment {
  humanScore: number;
  isOriginal: boolean;
  detectedCliches: string[];
  suggestions: string[];
}

const ROBOTIC_CLICHES = [
  'في عالم الديكور المتسارع',
  'في عالم الديكور الحديث',
  'تعتبر دهانات الحوائط حجر الزاوية',
  'تلعب الدهانات دوراً حيوياً',
  'يلعب الدهان دوراً هاماً',
  'في هذا المقال سنتعرف على',
  'في هذه المقالة سوف نلقي الضوء',
  'مما لا شك فيه',
  'لا يخفى على أحد',
  'سواء كنت تبحث عن',
  'دعونا نستكشف',
  'دعنا نتعمق',
  'وفي الختام',
  'وخلاصة القول',
  'في النهاية يمكن القول',
];

export function assessArticleCreativity(text: string): CreativityAssessment {
  if (!text || typeof text !== 'string') {
    return { humanScore: 0, isOriginal: false, detectedCliches: [], suggestions: [] };
  }

  const detected: string[] = [];
  const lower = text.toLowerCase();

  for (const cliche of ROBOTIC_CLICHES) {
    if (lower.includes(cliche)) {
      detected.push(cliche);
    }
  }

  const score = Math.max(35, 100 - detected.length * 15);
  const suggestions: string[] = [];

  if (detected.length > 0) {
    suggestions.push(`تم رصد عبارات نمطية مستهلكة: (${detected.join('، ')}). يُفضل استبدالها بسرد قصصي ومواقف واقعية.`);
  } else {
    suggestions.push('أسلوب المقال بشري إبداعي ومتميز وخالٍ تماماً من القوالب الروبوتية.');
  }

  return {
    humanScore: score,
    isOriginal: detected.length === 0,
    detectedCliches: detected,
    suggestions,
  };
}
