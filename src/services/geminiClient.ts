import { GoogleGenAI } from '@google/genai';
import {
  countActualWords,
  sanitizeArticleSlug,
  assessArticleCreativity,
  validateArticlePayload,
} from '../utils/articleValidator';
import { EXPANDED_DECOR_CATALOG } from '../data/curatedImagesCatalog';

const CLIENT_GEMINI_MODELS = ['gemini-4-hydrogen', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'] as const;

export type GeminiKeyErrorCode = 'MISSING_KEY' | 'INVALID_KEY' | 'QUOTA_EXCEEDED' | 'API_ERROR';

export class GeminiKeyError extends Error {
  public readonly code: GeminiKeyErrorCode;
  public readonly isKeyIssue: boolean;

  constructor(code: GeminiKeyErrorCode, message: string) {
    super(message);
    this.name = 'GeminiKeyError';
    this.code = code;
    this.isKeyIssue = code === 'MISSING_KEY' || code === 'INVALID_KEY';
  }
}

export const ARABIC_MISSING_KEY_MESSAGE =
  'مفتاح الذكاء الاصطناعي Gemini API غير مضاف. يرجى إضافة المتغير VITE_GEMINI_API_KEY (أو VITE_API_KEY) في إعدادات الاستضافة (Vercel / .env) ثم إعادة النشر والمحاولة مجدداً.';

export const ARABIC_INVALID_KEY_MESSAGE =
  'مفتاح Gemini API غير صالح أو مرفوض الصلاحيات. يرجى التأكد من صحة المفتاح المضاف في VITE_GEMINI_API_KEY أو VITE_API_KEY وأنه مفعّل لخدمة Gemini API.';

export const ARABIC_QUOTA_KEY_MESSAGE =
  'تم تجاوز حد الاستخدام المسموح به لمفتاح Gemini API حالياً. يرجى المحاولة بعد قليل أو مراجعة الحصة في لوحة Google AI Studio.';

/**
 * Reads Gemini API key directly from Vite client environment variables
 * strictly in the order: VITE_GEMINI_API_KEY || VITE_API_KEY.
 */
export function getClientGeminiApiKey(): string {
  try {
    const raw =
      typeof import.meta !== 'undefined' && import.meta.env
        ? import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || ''
        : '';
    return typeof raw === 'string' ? raw.trim() : '';
  } catch {
    return '';
  }
}

function isPlaceholderKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    !key ||
    key.length < 15 ||
    lower.includes('yourgeminiapikey') ||
    lower.includes('your_api_key') ||
    lower.includes('placeholder') ||
    lower === 'undefined' ||
    lower === 'null'
  );
}

export function getClientGeminiStatus() {
  const apiKey = getClientGeminiApiKey();
  const validShape = !isPlaceholderKey(apiKey);
  return {
    provider: 'gemini',
    configured: validShape,
    mode: 'client-direct-sdk',
    model: CLIENT_GEMINI_MODELS[0],
  };
}

export function isGeminiKeyError(err: unknown): boolean {
  if (err instanceof GeminiKeyError) {
    return err.isKeyIssue;
  }
  const msg = (err instanceof Error ? err.message : String(err || '')).toLowerCase();
  return (
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('invalid api key') ||
    msg.includes('permission_denied') ||
    msg.includes('unauthenticated') ||
    msg.includes('غير مضاف') ||
    msg.includes('غير صالح')
  );
}

export function formatGeminiArabicError(err: unknown, fallbackContext?: string): string {
  if (err instanceof GeminiKeyError) {
    return err.message;
  }
  const raw = err instanceof Error ? err.message : String(err || '');
  const lower = raw.toLowerCase();
  if (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('invalid api key') ||
    lower.includes('permission_denied') ||
    lower.includes('unauthenticated') ||
    lower.includes('403') ||
    lower.includes('401')
  ) {
    return ARABIC_INVALID_KEY_MESSAGE;
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return ARABIC_QUOTA_KEY_MESSAGE;
  }
  return fallbackContext ? `${fallbackContext}: ${raw}` : raw || 'حدث خطأ أثناء الاتصال بخدمة Gemini AI.';
}

function createValidatedClient(): GoogleGenAI {
  const apiKey = getClientGeminiApiKey();
  if (isPlaceholderKey(apiKey)) {
    throw new GeminiKeyError('MISSING_KEY', ARABIC_MISSING_KEY_MESSAGE);
  }
  return new GoogleGenAI({ apiKey });
}

function isModelNotFoundError(errMsg: string): boolean {
  const lower = errMsg.toLowerCase();
  return (
    lower.includes('not_found') ||
    lower.includes('is not found for api version') ||
    (lower.includes('model') && lower.includes('404')) ||
    lower.includes('not supported for generatecontent')
  );
}

function classifyAndThrowGeminiError(err: unknown): never {
  if (err instanceof GeminiKeyError) throw err;
  const raw = err instanceof Error ? err.message : String(err || '');
  const lower = raw.toLowerCase();

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('invalid api key') ||
    lower.includes('permission_denied') ||
    lower.includes('unauthenticated') ||
    lower.includes('requested entity was not found') && lower.includes('key') ||
    (lower.includes('400') && lower.includes('api key')) ||
    lower.includes('401') ||
    lower.includes('403')
  ) {
    throw new GeminiKeyError('INVALID_KEY', ARABIC_INVALID_KEY_MESSAGE);
  }

  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    throw new GeminiKeyError('QUOTA_EXCEEDED', ARABIC_QUOTA_KEY_MESSAGE);
  }

  throw new GeminiKeyError('API_ERROR', raw || 'تعذر الاتصال بنموذج Gemini AI.');
}

async function generateWithClientGemini(params: {
  prompt: string;
  systemInstruction?: string;
  responseJson?: boolean;
  parts?: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}): Promise<{ text: string; modelUsed: string }> {
  const ai = createValidatedClient();
  let lastErr: unknown = null;

  const contents = params.parts && params.parts.length > 0
    ? { parts: params.parts }
    : params.prompt;

  for (let i = 0; i < CLIENT_GEMINI_MODELS.length; i++) {
    const model = CLIENT_GEMINI_MODELS[i];
    const config: Record<string, any> = {};
    if (params.systemInstruction) {
      config.systemInstruction = params.systemInstruction;
    }
    if (params.responseJson) {
      config.responseMimeType = 'application/json';
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        ...(Object.keys(config).length > 0 ? { config } : {}),
      });
      const text = (response.text || '').trim();
      if (!text) {
        throw new Error('استجابة فارغة من نموذج Gemini.');
      }
      return { text, modelUsed: model };
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err || '');

      // Key/auth errors must fail immediately with clear Arabic key error
      const lower = msg.toLowerCase();
      if (
        lower.includes('api_key_invalid') ||
        lower.includes('api key not valid') ||
        lower.includes('invalid api key') ||
        lower.includes('permission_denied') ||
        lower.includes('unauthenticated') ||
        (lower.includes('400') && lower.includes('api key')) ||
        lower.includes('401') ||
        lower.includes('403')
      ) {
        classifyAndThrowGeminiError(err);
      }

      if (i < CLIENT_GEMINI_MODELS.length - 1 && isModelNotFoundError(msg)) {
        continue;
      }

      classifyAndThrowGeminiError(err);
    }
  }

  classifyAndThrowGeminiError(lastErr);
}

function extractAndParseJson(rawText: string): any {
  const clean = rawText
    .replace(/^\s*```json\s*/i, '')
    .replace(/^\s*```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(clean);
  } catch {
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('تعذر تحليل استجابة JSON من نموذج Gemini.');
  }
}

// ---------------------------------------------------------------------------
// 1. SMART & MANUAL ARTICLE CREATOR (Client-side Direct @google/genai)
// ---------------------------------------------------------------------------

const CREATIVE_ANGLE_META: Record<string, { titleAr: string; instruction: string }> = {
  STORYTELLING_SITE: {
    titleAr: 'سرد قصصي ومواقف واقعية من قلب الموقع (Field Storytelling)',
    instruction:
      'ابدأ بمشهد حي وموقف واقعي من قلب موقع عمل أو معاينة حقيقية مع حوار مباشر بين صاحب البيت وخبير التشطيبات «الحضرى محمود»، ثم بيّن خطوات التحول بالصور والتفاصيل الميدانية.',
  },
  ARTISAN_INSIDER: {
    titleAr: 'أسرار المعلم المحترف وكشف حيل السوق (Artisan Master Secrets)',
    instruction:
      'تحدث بنبرة المعلم الصادق الذي يكشف أسرار الورشة: كيف تفرّق بين المعجون الأصلي والمغشوش، أهمية سحب السكاكين المتعامدة، السيلر المائي عالي اللزوجة، وأصول الصنعة بأمانة هندسية.',
  },
  SENSORY_QUIET_LUXURY: {
    titleAr: 'سيكولوجية الفخامة الهادئة وملمس الأسطح (Sensory Quiet Luxury)',
    instruction:
      'اجعل القارئ يلمس الملمس ويشعر بالضوء: نعومة القطيفة والستوكو، دفء إضاءة 3000K، وانعكاس ضوء العصر على درجات الجريج والأوف وايت وانعكاسه على راحة الأعصاب.',
  },
  MYTH_BUSTING_CONSULTANCY: {
    titleAr: 'تفنيد الأوهام ومواجهة أخطاء التشطيب الشائعة (Myth-Busting Masterclass)',
    instruction:
      'صحح الخرافات الشائعة مباشرة بأدلة فيزيائية وميدانية: وهم أن الأبيض يوسع كل غرفة، ووهم أن أي معجون يناسب الحمامات، وحقيقة تثبيت بديل الرخام والخشب بشكل معمر.',
  },
  REAL_COST_VALUATION: {
    titleAr: 'دراسة الجدوى والتكلفة الحقيقية لعام 2026 (Real Market Budget)',
    instruction:
      'قدّم تحليلاً مالياً وميدانياً واضحاً لحسابات التكلفة وأولويات الاستثمار في التأسيس والعزل والسيلر مقابل التوفير الذكي في الألواح والديكورات دون المساس بالجودة.',
  },
  ARTISTIC_ALCHEMY: {
    titleAr: 'كيمياء الألوان وخلطات الباليتات المبتكرة لعام 2026 (Color & Texture Alchemy)',
    instruction:
      'ركّز على تقنيات الجير الصخري Limewash وبديل الرخام المضيء وأكواد باليتات 2026 (مثل Breeze 10341 و Timeless 1024) وتفاعل الضوء مع الطلاء المط وربع اللامع.',
  },
};

function enrichClientContentToTargetWords(params: {
  topic: string;
  existingContent: string;
  targetWordCount: number;
  language: 'ar' | 'en';
  authorName: string;
}): string {
  const { topic, existingContent, targetWordCount, language, authorName } = params;
  let working = existingContent.trim();

  const sections =
    language === 'ar'
      ? [
          {
            marker: 'تحضير السطح وسكاكين المعجون',
            block: `\n\n## تحضير السطح وسكاكين المعجون تحت إشراف ${authorName}\nقبل أن يلمس الرول النهائي أي حائط، تبدأ المعركة الحقيقية مع استواء السطح. نحرص دائماً على كشط القشور الضعيفة بحجر الجلخ وتنظيف الغبار، ثم تشبيع المسام بسيلر مائي بوليمري متماسك يغلق الشعيرات الإسمنتية ويمنع تشرب الطلاء غير المتجانس. بعدها نسحب ثلاث سكاكين معجون متعامدة بين كل طبقة والأخرى زمن جفاف كامل، مع فحص الجدار جانبياً بكشاف 500 واط مع صنفرة ناعمة برقم 320 لضمان نعومة حريرية تخلو من أي تموجات.`,
          },
          {
            marker: 'قراءة الضوء وتوازن 60-30-10',
            block: `\n\n## قراءة الضوء الطبيعي وقاعدة التوازن اللوني 60-30-10\nدرجة الطلاء التي تبدو مشرقة تحت كشافات المعرض قد تميل إلى الرمادية أو البرودة داخل صالة بيتك؛ لذلك نعتمد تجربة عينة على متر مربع كامل من الجدار لمراقبة تحولاتها صباحاً ومع إضاءة 3000K الدافئة مساءً. بتطبيق قاعدة 60% للون المحايد المريح كالجريج أو الأوف وايت، و30% للتكسيات الخشبية أو بديل الرخام الداعم، و10% للمسات الدافئة في الإكسسوارات، يتحقق اتساع بصري وهدوء نفسي يدوم لسنوات.`,
          },
          {
            marker: 'توصيات واستشارات ميدانية من واقع الموقع',
            block: `\n\n### توصيات واستشارات ميدانية في تشطيب ${topic}\n- **افحص رطوبة الحوائط قبل بدء العمل:** معالجة مصادر المياه بجوار الحمامات والنوافذ بعوازل إسمنتية مرنة تحمي المعجون والدهان من التقشير.\n- **طابق درجة اللمعان مع حركة الأسرة:** خصص الدهان المطفي العميق للأسقف وغرف النوم، وربع اللامع القابل للغسيل للصالات والممرات.\n- **اعتمد السليكون العظمي الصافي للألواح:** تثبيت بديل الرخام وبديل الخشب بنقاط منظمة مع الفواصل الدقيقة يحمي الحواف من الفك أو الامتلاء بالغبار.`,
          },
          {
            marker: 'الأسئلة الشائعة حول دهانات الحوائط والديكور',
            block: `\n\n## الأسئلة الشائعة حول دهانات الحوائط والديكور (FAQ)\n**س: كم يوماً يستغرق الطلاء الأكريليكي حتى يكتمل تصلبه قبل التنظيف؟**\nج: يجف السطح ظاهرياً خلال ساعات، إلا أن البوليمرات تصل إلى صلابتها القصوى خلال 10 إلى 14 يوماً قبل استخدام قطعة قماش رطبة ناعمة.\n\n**س: هل يركّب بديل الخشب والرخام قبل الوجه الأخير من الدهان أم بعده؟**\nج: الطريقة الاحترافية هي إنهاء التأسيس وأول وجهين، ثم تركيب التكسيات الجدارية، وأخيراً دهان الوجه النهائي لضبط الالتقاءات بدقة تامة.`,
          },
        ]
      : [
          {
            marker: 'Surface Preparation and Lighting Calibration',
            block: `\n\n## Surface Preparation & Lighting Calibration\nTrue paint longevity begins long before the finish coat. Grinding loose plaster, saturating masonry with polymer sealer, pulling three cross-hatched putty layers, and raking the wall with a 500W inspection lamp eliminate shadows before two washable acrylic finish coats are applied.`,
          },
          {
            marker: 'Balancing PVC Marble, WPC Slats, and 3000K Profiles',
            block: `\n\n## Balancing PVC Marble, WPC Slats, and 3000K LED Profiles\nTesting a full square-meter paint sample under morning daylight and warm 3000K evening light prevents cool gray shifts, while 60-30-10 color proportioning unifies warm neutral paints with WPC wood flutes and Calacatta PVC panels.`,
          },
        ];

  for (const s of sections) {
    if (countActualWords(working) >= targetWordCount) break;
    if (!working.includes(s.marker)) {
      working += s.block;
    }
  }
  return working;
}

export interface SmartArticleClientInput {
  images: Array<{ url: string; caption?: string }>;
  topic?: string;
  draftTitle?: string;
  draftContent?: string;
  focusKeyword?: string;
  tone?: string;
  creativeStyle?: string;
  targetWordCount?: number;
  language?: 'ar' | 'en';
  locationPreference?: string;
  businessLocation?: { fullAddress?: string; mapUrl?: string; city?: string; area?: string } | null;
  authorName?: string;
}

export async function generateSmartArticleWithGeminiClient(input: SmartArticleClientInput) {
  const {
    images,
    topic = '',
    draftTitle = '',
    draftContent = '',
    focusKeyword = '',
    tone = 'سرد قصصي واقعي دافئ بأسلوب بشري إبداعي',
    creativeStyle = 'STORYTELLING_SITE',
    targetWordCount = 1250,
    language = 'ar',
    locationPreference = '',
    businessLocation = null,
    authorName = 'الحضرى محمود',
  } = input;

  if (!images || images.length === 0) {
    throw new Error(
      language === 'ar'
        ? 'يرجى إضافة صورة واحدة على الأقل قبل بدء التوليد الذكي.'
        : 'Please add at least one image before generating.'
    );
  }

  const clampedWords = Math.max(1000, Math.min(10000, Number(targetWordCount) || 1250));
  const angleKey = CREATIVE_ANGLE_META[creativeStyle] ? creativeStyle : 'STORYTELLING_SITE';
  const pickedAngle = CREATIVE_ANGLE_META[angleKey];
  const isAr = language === 'ar';

  const defaultCaptions = [
    'تنسيق ألوان دهانات الحوائط وبديل الرخام وبديل الخشب بإضاءة ليد مخفية 3000K',
    'تطبيق ملمس الدهان الديكوري الفاخر وتدرجات الأوف وايت والجريج المعاصر',
    'تشطيبات جدارية فندقية مع تناسق الإضاءة السقفية وألواح بديل الخشب الرأسية',
    'معالجة استواء الحوائط وتأسيس سكاكين المعجون والصنفرة الدقيقة لضمان سطح حريري',
  ];

  const imageDescriptionsText = images
    .map((img, idx) => {
      const hasCaption = Boolean(img.caption && img.caption.trim());
      return hasCaption
        ? `الصورة [${idx + 1}]: وصف الكاتب "${img.caption!.trim()}"`
        : `الصورة [${idx + 1}]: (بدون شرح مسبق — حلّل وفسّر عناصر الديكور والألوان بدقة في imageCaptions[${idx}])`;
    })
    .join('\n');

  const systemInstruction = `أنت كاتب مقالات إبداعي وخبير ديكور وتشطيبات بشري حقيقي لمدونة «ألفا للديكور والدهانات» بإشراف صاحب الموقع وخبير التشطيبات «${authorName}».

قواعد الإبداع البشري الصارمة (مكافحة الجمل الروبوتية):
1. اكتب بصوت إنساني دافئ، حي، وشغوف بالصنعة؛ وابدأ مباشرة من قلب المشهد الميداني أو الموقف الواقعي.
2. يُمنع منعاً باتاً استخدام الكليشيهات النمطية مثل: ("في عالم الديكور المتسارع"، "في عالم الديكور الحديث"، "تعتبر دهانات الحوائط حجر الزاوية"، "يلعب الدهان دوراً هاماً"، "في هذا المقال سنتعرف على"، "مما لا شك فيه"، "لا يخفى على أحد"، "دعونا نستكشف"، "وفي الختام"، "وخلاصة القول").
3. التزم بالزاوية الإبداعية: «${pickedAngle.titleAr}» — ${pickedAngle.instruction}.
4. وظّف لغة المواقع الحقيقية: (سكاكين المعجون المتعامدة، كشاف 500 واط، صنفرة 320، سيلر مائي بوليمري، شرائح WPC بديل الخشب، ألواح PVC بديل الرخام، إضاءة 3000K دافئة، درجات الجريج والأوف وايت).
5. اكتب مقالاً غنياً ومترابطاً لا يقل عن ${clampedWords} كلمة فعلية متوافقاً تماماً مع معايير Google AdSense و SEO بعناوين H2 و H3 وقسم أسئلة شائعة (FAQ).
6. وزّع وسوم الصور [[IMAGE_0]]، [[IMAGE_1]] ... طبيعياً بين فقرات المقال.

أعد الرد حصراً بصيغة JSON صالحة بهذه البنية:
{
  "title": "عنوان جذاب ومبتكر",
  "slug": "clean-arabic-or-english-slug",
  "excerpt": "موجز تشويقي بليغ للمقال من سطرين",
  "metaDescription": "وصف ميتا احترافي 150 حرفاً",
  "category": "دهانات وديكورات داخلية",
  "focusKeyword": "الكلمة المفتاحية الرئيسية",
  "secondaryKeywords": ["كلمة 1", "كلمة 2", "كلمة 3"],
  "tags": ["دهانات حوائط", "بديل الرخام", "ديكورات حديثة", "ألفا ديكور"],
  "creativeAngle": "${angleKey}",
  "imageCaptions": ["شرح إبداعي لكل صورة بالترتيب"],
  "content": "نص المقال الكامل بصيغة Markdown مع عناوين ## و ### ووسوم [[IMAGE_0]] ..."
}`;

  const userPromptText = `الموضوع المطلوب: ${topic.trim() || 'أسرار تشطيبات الديكور ودهانات الحوائط الحديثة'}
العنوان الأولي: ${draftTitle.trim() || 'يستنتجه الكاتب بذكاء وإبداع'}
الكلمة المفتاحية المستهدفة: ${focusKeyword.trim() || 'دهانات وديكورات الحوائط الحديثة'}
نبرة الكتابة المطلوبة: ${tone}
لغة المقال: ${isAr ? 'العربية الفصحى السلسة الدافئة' : 'English'}
عدد الكلمات المطلوب: ${clampedWords} كلمة على الأقل
${draftContent.trim() ? `مسودة/ملاحظات صاحب المدونة التي يجب دمجها بأسلوب بشري: """${draftContent.trim()}"""` : ''}
${locationPreference ? `نطاق المعاينة والمشروع الميداني: ${locationPreference}` : ''}

تفاصيل الصور المرفقة (${images.length} صور):
${imageDescriptionsText}`;

  // Attach uploaded data:image/* photos directly as multimodal inlineData parts for true visual inspection!
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  for (let i = 0; i < Math.min(images.length, 4); i++) {
    const url = (images[i].url || '').trim();
    const match = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (match && match[1] && match[2]) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      });
    }
  }
  parts.push({ text: userPromptText });

  const { text, modelUsed } = await generateWithClientGemini({
    prompt: userPromptText,
    systemInstruction,
    responseJson: true,
    parts,
  });

  const parsed = extractAndParseJson(text);

  // Preserve user draft if Gemini skipped any key phrase from it
  let finalContent = String(parsed.content || '').trim();
  if (draftContent.trim() && !finalContent.includes(draftContent.trim().slice(0, 28))) {
    finalContent = `### ملاحظات وتفاصيل من واقع العمل\n${draftContent.trim()}\n\n${finalContent}`;
  }

  // Weave images naturally
  const embeddedImages: { url: string; caption: string }[] = [];
  const usedInArticle = new Set<string>();

  for (let idx = 0; idx < images.length; idx++) {
    const rawImg = images[idx];
    let imgSrc = (rawImg.url || '').trim();
    if (!imgSrc || usedInArticle.has(imgSrc)) {
      const replacement = EXPANDED_DECOR_CATALOG.find((c) => !usedInArticle.has(c.url));
      imgSrc = replacement?.url || EXPANDED_DECOR_CATALOG[0].url;
    }
    usedInArticle.add(imgSrc);

    const modelCaption = Array.isArray(parsed.imageCaptions) && parsed.imageCaptions[idx]
      ? String(parsed.imageCaptions[idx]).trim()
      : '';
    const captionText =
      rawImg.caption && rawImg.caption.trim()
        ? rawImg.caption.trim()
        : modelCaption || defaultCaptions[idx % defaultCaptions.length];

    embeddedImages.push({ url: imgSrc, caption: captionText });

    const placeholder = `[[IMAGE_${idx}]]`;
    const imgMarkdown = `\n\n![${captionText}](${imgSrc})\n*${captionText}*\n\n`;

    if (finalContent.includes(placeholder)) {
      finalContent = finalContent.split(placeholder).join(imgMarkdown);
    } else {
      const h2Matches: RegExpMatchArray[] = Array.from(finalContent.matchAll(/^##\s+.+$/gm));
      const targetHeading = h2Matches[Math.min(idx, Math.max(0, h2Matches.length - 1))];
      if (targetHeading && typeof targetHeading.index === 'number') {
        const insertPos = targetHeading.index + targetHeading[0].length;
        finalContent = finalContent.slice(0, insertPos) + imgMarkdown + finalContent.slice(insertPos);
      } else {
        finalContent += imgMarkdown;
      }
    }
  }

  finalContent = finalContent.replace(/\[\[IMAGE_\d+\]\]/g, '').trim();

  // Optional Google Maps location anchor (only if configured or user provided)
  let resolvedLocation: any = null;
  if (businessLocation && (businessLocation.mapUrl || businessLocation.fullAddress)) {
    resolvedLocation = businessLocation;
    const mapsBlock = `\n\n---\n### 📍 استشارات ومعاينة الموقع الميداني\nيسعد الخبير **${authorName}** وفريق عمل «ألفا للديكور والدهانات» بتقديم خدمات المعاينة الميدانية وتنفيذ الدهانات والتشطيبات الفاخرة.\n${businessLocation.fullAddress ? `- **الموقع المعتمد:** ${businessLocation.fullAddress}\n` : ''}${businessLocation.mapUrl ? `- **رابط الخريطة:** [عرض موقع المعاينة على خرائط Google](${businessLocation.mapUrl})\n` : ''}---\n`;
    if (!finalContent.includes('خرائط Google') && !finalContent.includes('Google Maps')) {
      finalContent += mapsBlock;
    }
  } else if (locationPreference && locationPreference.trim()) {
    const cleanLoc = locationPreference.trim();
    resolvedLocation = { city: cleanLoc, area: cleanLoc };
    if (!finalContent.includes('المعاينة الميدانية')) {
      finalContent += `\n\n---\n### 📍 خدمات المعاينة الميدانية والتشطيبات\nيسعد الخبير **${authorName}** بتقديم خدمات المعاينة الميدانية وتنفيذ الدهانات المتخصصة في نطاق **${cleanLoc}** والمناطق المحيطة.\n---\n`;
    }
  }

  // Ensure >= 1,050 real words without duplicate headings
  let actualWordCount = countActualWords(finalContent);
  const enrichmentTarget = Math.max(1050, Math.min(clampedWords, 2000));
  if (actualWordCount < enrichmentTarget) {
    finalContent = enrichClientContentToTargetWords({
      topic: String(parsed.title || topic || draftTitle || 'الديكور والدهانات'),
      existingContent: finalContent,
      targetWordCount: enrichmentTarget,
      language: isAr ? 'ar' : 'en',
      authorName,
    });
    actualWordCount = countActualWords(finalContent);
  }

  const finalTitle = String(parsed.title || topic || draftTitle || 'أحدث أسرار تشطيبات الديكور ودهانات الحوائط').trim();
  const finalSlug = sanitizeArticleSlug(String(parsed.slug || finalTitle));
  const finalExcerpt =
    String(parsed.excerpt || '').trim() ||
    finalContent.replace(/!\[.*?\]\(.*?\)/g, '').replace(/[#*>_-]/g, '').trim().slice(0, 165) + '...';

  const validation = validateArticlePayload(
    {
      title: finalTitle,
      content: finalContent,
      excerpt: finalExcerpt,
      category: String(parsed.category || 'دهانات وديكورات داخلية'),
      status: 'published',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    },
    { minWords: 1000, maxWords: 10000, strictPublish: true }
  );

  const kw = (focusKeyword || topic || '').toLowerCase().trim();
  let dynamicSeo = 60;
  if (finalTitle.length >= 25 && finalTitle.length <= 90) dynamicSeo += 10;
  if (finalExcerpt.length >= 50) dynamicSeo += 10;
  if (actualWordCount >= 1200) dynamicSeo += 12;
  else if (actualWordCount >= 1000) dynamicSeo += 8;
  if (kw && finalTitle.toLowerCase().includes(kw)) dynamicSeo += 4;
  if (kw && finalContent.toLowerCase().includes(kw)) dynamicSeo += 4;
  const seoScore = validation.valid ? Math.min(99, dynamicSeo) : Math.min(72, dynamicSeo);

  const creativityReport = assessArticleCreativity(finalContent);
  const humanToneScore = Math.min(
    99,
    Math.max(70, creativityReport.humanScore - (actualWordCount >= 1000 ? 0 : 10))
  );

  return {
    title: finalTitle,
    slug: finalSlug,
    excerpt: finalExcerpt,
    metaDescription: String(parsed.metaDescription || finalExcerpt),
    category: String(parsed.category || (isAr ? 'دهانات وديكورات داخلية' : 'Interior Decor & Paints')),
    focusKeyword: String(parsed.focusKeyword || focusKeyword || topic || 'دهانات وديكورات الحوائط الحديثة'),
    secondaryKeywords: Array.isArray(parsed.secondaryKeywords)
      ? parsed.secondaryKeywords
      : ['دهانات غرف النوم', 'بديل الرخام', 'تنسيق ألوان الجدران'],
    tags: Array.isArray(parsed.tags) && parsed.tags.length > 0
      ? parsed.tags
      : ['دهانات حوائط', 'ديكورات داخلية', 'بديل رخام وخشب', 'ألفا ديكور'],
    content: finalContent,
    featuredImage: embeddedImages[0]?.url || EXPANDED_DECOR_CATALOG[0].url,
    imageCaptions: embeddedImages.map((e) => e.caption),
    protectedImages: embeddedImages.map((e) => ({ url: e.url, isDuplicate: false, ipProtected: true })),
    creativeAngle: String(parsed.creativeAngle || angleKey),
    actualWordCount,
    readingTime: Math.max(5, Math.round(actualWordCount / 200)),
    seoScore,
    humanToneScore,
    humanCreativity: creativityReport,
    googleMapsLocation: resolvedLocation,
    ipProtectionNotice: null as string | null,
    providerUsed: 'gemini',
    modelUsed,
    validation,
  };
}

// ---------------------------------------------------------------------------
// 2. CHATBOT & NEGOTIATION ASSISTANT (Client-side Direct @google/genai)
// ---------------------------------------------------------------------------

export async function chatWithGeminiClient(input: {
  messages: Array<{ role: string; content: string }>;
  siteInfo: {
    blogName: string;
    tagline?: string;
    authorName: string;
    recentArticles: Array<{ id: string; title: string; category: string; excerpt: string }>;
  };
  negotiationConfig: {
    ownerPhone: string;
    ownerWhatsApp: string;
    currency: string;
    services: Array<{
      name: string;
      basePrice: number;
      minNegotiatedPrice: number;
      currency: string;
      deliveryDays: number;
      unit: string;
      description: string;
      features?: string[];
    }>;
  };
  currentArticle?: { title: string; category: string; excerpt: string } | null;
}): Promise<{ reply: string; modelUsed: string }> {
  const { messages, siteInfo, negotiationConfig, currentArticle } = input;
  const authorName = siteInfo.authorName || 'الحضرى محمود';
  const ownerPhone = negotiationConfig.ownerPhone || '+201098765432';
  const ownerWhatsApp = negotiationConfig.ownerWhatsApp || '201098765432';

  const servicesText = (negotiationConfig.services || [])
    .map(
      (s) =>
        `• خدمة: ${s.name}
  - السعر الأساسي المحدد من صاحب المدونة: ${s.basePrice}${s.currency} (${s.unit})
  - الحد الأدنى المقبول في التفاوض: ${s.minNegotiatedPrice}${s.currency}
  - مدة التسليم: ${s.deliveryDays} أيام
  - الوصف: ${s.description}
  - الميزات: ${s.features?.join('، ') || ''}`
    )
    .join('\n');

  const systemInstruction = `أنت «مساعد ألفا الذكي» (Alpha Assistant)، المساعد الرسمي والمفوض التنفيذي للمبيعات والتفاوض وخدمة العملاء لمدونة واستوديو «ألفا للديكور والدهانات» التابع لخبير الديكور والتشطيبات المعمارية «${authorName}».

أدوارك ومهامك:
1. الترحيب بالزوار بلباقة، والتعريف بصاحب الموقع خبير الديكور «${authorName}»، والإجابة عن أسئلة الديكورات والدهانات وبديل الخشب والرخام.
2. التفاوض على أسعار أعمال الديكور والدهانات:
قائمة الخدمات والأسعار المعتمدة:
${servicesText}
- اعرض السعر الأساسي أولاً، وإذا طلب العميل خصماً امنحه خصماً ودوداً لا يقل نهائياً عن الحد الأدنى المسموح.
- عند موافقة العميل الصريحة على السعر أدرج الوسم التالي في نهاية ردك:
[DEAL_AGREED:{"service":"اسم الخدمة","agreedPrice":"السعر المتفق عليه","originalPrice":"السعر الأصلي","savings":"قيمة الخصم","scope":"نطاق العمل","deliveryDays":5,"clientNeeds":"طلب العميل"}]
وأخبره ببيانات التواصل: هاتف ${ownerPhone} / واتساب ${ownerWhatsApp}.
3. التزم باللغة التي يخاطبك بها الزائر (العربية أو الإنجليزية).
${currentArticle ? `المقال المفتوح حالياً: "${currentArticle.title}"` : ''}`;

  const historyText = messages
    .map((m) => `${m.role === 'user' ? 'الزائر' : 'المساعد الذكي'}: ${m.content}`)
    .join('\n');

  const { text, modelUsed } = await generateWithClientGemini({
    systemInstruction,
    prompt: `سجل المحادثة حتى الآن:\n${historyText}\n\nرد المساعد الذكي الآن:`,
  });

  return { reply: text, modelUsed };
}

// ---------------------------------------------------------------------------
// 3. SOCIAL BROADCAST COPYWRITER (Client-side Direct @google/genai)
// ---------------------------------------------------------------------------

export async function generateSocialBroadcastWithGeminiClient(input: {
  articleTitle: string;
  articleExcerpt: string;
  articleUrl: string;
  tags?: string[];
  authorName?: string;
}): Promise<Record<string, string>> {
  const { articleTitle, articleExcerpt, articleUrl, tags = [], authorName = 'الحضرى محمود' } = input;

  const prompt = `أنت المساعد التسويقي المفوض رسمياً من صاحب المدونة "${authorName}" لمدونة "ألفا للديكور والدهانات".
المهمة: صياغة منشورات احترافية وجذابة لمشاركة رابط المقال التالي على وسائل التواصل الاجتماعي:
- عنوان المقال: "${articleTitle}"
- الملخص: "${articleExcerpt}"
- الرابط المعتمد: "${articleUrl}"
- الوسوم: ${tags.join(' #')}

أعد النتيجة حصراً بتنسيق JSON بالشكل التالي:
{
  "twitter": "تغريدة جذابة مع رابط المقال ووسوم تفاعلية",
  "linkedin": "منشور مهني يستعرض الفائدة الهندسية مع الرابط",
  "facebook": "منشور ملهم يشجع القراءة والمناقشة مع الرابط",
  "telegram": "رسالة أنيقة للقنوات مع رابط التصفح",
  "whatsapp": "رسالة موجزة للمحادثات السريعة مع الرابط"
}`;

  const { text } = await generateWithClientGemini({
    prompt,
    responseJson: true,
  });

  return extractAndParseJson(text);
}

// ---------------------------------------------------------------------------
// 4. CONTRACTOR ACCOUNTS AI AUDITOR (Client-side Direct @google/genai)
// ---------------------------------------------------------------------------

export async function auditContractorAccountsWithGeminiClient(projects: any[]) {
  const corrections: Array<{
    projectId: string;
    projectName: string;
    field: string;
    oldValue: number | string;
    correctedValue: number | string;
    reason: string;
  }> = [];

  const auditedProjects = projects.map((p: any) => {
    const agreed = Number(p.agreed) || 0;
    const normalizeRows = (rows: any[] = []) =>
      rows.map((row: any) => ({
        ...row,
        amount: row.amount === '' || isNaN(Number(row.amount)) ? 0 : Math.max(0, Number(row.amount)),
      }));

    const payments = normalizeRows(p.payments);
    const labor = normalizeRows(p.labor);
    const daily = normalizeRows(p.daily);
    const expenses = normalizeRows(p.expenses);

    const totalPaid = payments.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
    const totalLabor = labor.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
    const totalDaily = daily.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
    const totalExpenses = expenses.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
    const totalCosts = totalLabor + totalDaily + totalExpenses;
    const netProfit = totalPaid - totalCosts;
    const remaining = agreed - totalPaid;

    if (agreed < 0) {
      corrections.push({
        projectId: p.id,
        projectName: p.name || p.client,
        field: 'المبلغ المتفق عليه',
        oldValue: p.agreed,
        correctedValue: Math.abs(p.agreed),
        reason: 'تم تصحيح القيمة السالبة للمبلغ المتفق عليه إلى قيمة موجبة',
      });
    }

    return {
      ...p,
      agreed: Math.max(0, agreed),
      payments,
      labor,
      daily,
      expenses,
      calc: {
        agreed: Math.max(0, agreed),
        totalPaid,
        totalLabor,
        totalDaily,
        totalExpenses,
        totalCosts,
        netProfit,
        remaining,
        profitMarginPercent: agreed > 0 ? ((netProfit / agreed) * 100).toFixed(1) : '0',
        collectionRatePercent: agreed > 0 ? ((totalPaid / agreed) * 100).toFixed(1) : '0',
      },
    };
  });

  let gAgreed = 0;
  let gPaid = 0;
  let gLabor = 0;
  let gDaily = 0;
  let gExp = 0;
  let gCosts = 0;
  let gProfit = 0;
  let gRemaining = 0;

  auditedProjects.forEach((p: any) => {
    gAgreed += p.calc.agreed;
    gPaid += p.calc.totalPaid;
    gLabor += p.calc.totalLabor;
    gDaily += p.calc.totalDaily;
    gExp += p.calc.totalExpenses;
    gCosts += p.calc.totalCosts;
    gProfit += p.calc.netProfit;
    gRemaining += p.calc.remaining;
  });

  const prompt = `أنت المدقق المالي والاستشاري الذكي لمقاولات الدهانات والديكور للمعلم «الحضرى محمود».
راجع هذه المؤشرات الحسابية لمشاريع مقاولات الدهانات:
- عدد المشاريع: ${auditedProjects.length}
- إجمالي التعاقدات: ${gAgreed.toLocaleString('ar-EG')} ج.م
- إجمالي المحصل: ${gPaid.toLocaleString('ar-EG')} ج.م
- المتبقي على العملاء: ${gRemaining.toLocaleString('ar-EG')} ج.م
- أجور المصنعيات: ${gLabor.toLocaleString('ar-EG')} ج.م
- اليوميات: ${gDaily.toLocaleString('ar-EG')} ج.م
- مصروفات الخامات والنثريات: ${gExp.toLocaleString('ar-EG')} ج.م
- صافي الربح الحالي: ${gProfit.toLocaleString('ar-EG')} ج.م

قدّم تقريراً عربياً منظماً يوضح توازن الحسابات وتقييم هوامش الربح وأبرز 4 توصيات مالية عملية.`;

  const { text, modelUsed } = await generateWithClientGemini({ prompt });

  return {
    success: true,
    auditedProjects,
    corrections,
    summary: {
      totalProjects: auditedProjects.length,
      totalAgreed: gAgreed,
      totalPaid: gPaid,
      totalLabor: gLabor,
      totalDaily: gDaily,
      totalExpenses: gExp,
      totalCosts: gCosts,
      netProfit: gProfit,
      totalRemaining: gRemaining,
    },
    aiAuditReport: text,
    modelUsed,
  };
}

// ---------------------------------------------------------------------------
// 5. ACCESSIBILITY BLIND SCREEN READER AI (Client-side Direct @google/genai)
// ---------------------------------------------------------------------------

export async function describeArticleVisualsWithGeminiClient(input: {
  articleTitle: string;
  category: string;
  excerpt: string;
  content: string;
  ownerName?: string;
}) {
  const { articleTitle, category, excerpt, content, ownerName = 'الحضرى محمود' } = input;
  const prompt = `أنت خبير الوصف الصوتي للمكفوفين وضعاف البصر المتحدث باسم خبير الديكور «${ownerName}».
صف المشهد اللوني والمعماري لمقال: "${articleTitle}" (${category}).
المقدمة: ${excerpt}
مقتطف المحتوى: ${content.slice(0, 1400)}

أجب حصراً بصيغة JSON:
{
  "title": "وصف المشهد اللوني والديكوري",
  "audioDescription": "وصف حسي صوتي غني للألوان والإضاءة والملمس",
  "dominantPalette": [
    { "colorName": "اسم اللون بالعربية", "feel": "إحساسه في الفراغ" }
  ],
  "designerTip": "نصيحة عملية مختصرة"
}`;

  const { text } = await generateWithClientGemini({
    prompt,
    responseJson: true,
  });

  return extractAndParseJson(text);
}

export async function blindReaderDialogueWithGeminiClient(input: {
  userSpeech: string;
  currentArticle: any;
  articles: any[];
  history: Array<{ role: string; text: string }>;
  ownerName?: string;
}) {
  const { userSpeech, currentArticle, articles, history, ownerName = 'الحضرى محمود' } = input;
  const articlesSummary = (articles || []).slice(0, 12).map((a: any) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    excerpt: a.excerpt,
  }));

  const prompt = `أنت المضيف الصوتي الذكي لمدونة «ألفا للديكور والدهانات» باسم المهندس «${ownerName}».
المقال الحالي: ${currentArticle ? JSON.stringify({ id: currentArticle.id, title: currentArticle.title }) : 'لا يوجد'}
المقالات المتاحة: ${JSON.stringify(articlesSummary)}
المحادثة السابقة: ${JSON.stringify(history.slice(-4))}
طلب الزائر الآن: "${userSpeech}"

أجب حصراً بصيغة JSON:
{
  "speechResponse": "رد صوتي عربي دافئ ومباشر",
  "recommendedArticleIds": ["id للمقال المرشح إن وجد"],
  "navigation": {
    "type": "article | tab | read | describe | none",
    "targetId": "",
    "tabName": ""
  }
}`;

  const { text } = await generateWithClientGemini({
    prompt,
    responseJson: true,
  });

  return extractAndParseJson(text);
}

// ---------------------------------------------------------------------------
// 6. ARABIC TEXT-TO-SPEECH (Client-side Direct @google/genai TTS)
// ---------------------------------------------------------------------------

const CLIENT_TTS_MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts'] as const;

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary);
}

function wrapPcm16AsWavBase64(pcmBase64: string, sampleRate = 24000, channels = 1): string {
  const pcmBytes = base64ToUint8Array(pcmBase64);
  const blockAlign = channels * 2;
  const byteRate = sampleRate * blockAlign;
  const buffer = new ArrayBuffer(44 + pcmBytes.length);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.length, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, pcmBytes.length, true);

  new Uint8Array(buffer, 44).set(pcmBytes);
  return uint8ArrayToBase64(new Uint8Array(buffer));
}

export async function synthesizeArabicSpeechWithGeminiClient(input: {
  text: string;
  voiceName?: string;
}): Promise<{ audioBase64: string; mimeType: string; dataUrl: string; modelUsed: string }> {
  const cleanText = (input.text || '').trim();
  if (!cleanText) {
    throw new GeminiKeyError('API_ERROR', 'لا يوجد نص عربي لقراءته صوتياً.');
  }

  const ai = createValidatedClient();
  const voiceName = input.voiceName || 'Kore';
  let lastError: unknown = null;

  for (const model of CLIENT_TTS_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `اقرأ النص العربي التالي باللغة العربية الفصحى بنبرة دافئة وواضحة وبإلقاء إذاعي متزن دون إضافة أي تعليق أو مقدمات من عندك:\n\n${cleanText}`,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const audioPart = parts.find((p: any) => p?.inlineData?.data);
      const inlineData = audioPart?.inlineData;

      if (!inlineData?.data) {
        throw new Error('لم يُعد النموذج بيانات صوتية صالحة.');
      }

      let mimeType = (inlineData.mimeType || 'audio/wav').toLowerCase();
      let base64Audio = inlineData.data;

      if (mimeType.includes('pcm') || mimeType.includes('l16')) {
        const rateMatch = mimeType.match(/rate=(\d+)/);
        const sampleRate = rateMatch ? Number(rateMatch[1]) || 24000 : 24000;
        base64Audio = wrapPcm16AsWavBase64(base64Audio, sampleRate, 1);
        mimeType = 'audio/wav';
      } else if (!mimeType.startsWith('audio/')) {
        mimeType = 'audio/wav';
      }

      return {
        audioBase64: base64Audio,
        mimeType,
        dataUrl: `data:${mimeType};base64,${base64Audio}`,
        modelUsed: model,
      };
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err || '');
      if (isModelNotFoundError(msg)) {
        continue;
      }
      classifyAndThrowGeminiError(err);
    }
  }

  classifyAndThrowGeminiError(lastError);
}

