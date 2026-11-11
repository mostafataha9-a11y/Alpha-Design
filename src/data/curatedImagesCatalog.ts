export interface CuratedDecorImage {
  id: string;
  url: string;
  topicCategory: 'greige_paints' | 'wood_slats_marble' | 'stucco_velvet' | 'moisture_prep' | 'luxury_bedroom' | 'gypsum_lighting' | 'dining_reception' | 'facade_exterior';
  title: string;
  defaultCaption: string;
  altText: string;
}

export const EXPANDED_DECOR_CATALOG: CuratedDecorImage[] = [
  // 1. Greige & Warm Neutral Paints
  {
    id: 'decor-greige-1',
    url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'greige_paints',
    title: 'صالون فخم بدهانات الجريج الملكي',
    defaultCaption: 'تناسق درجات دهان الجريج الدافئ مع الإضاءة السقفية المخفية لإشاعة الاتساع البصري',
    altText: 'صالة معيشة فسيحة مدهونة بلون جريج دافئ مع إضاءة معمارية حديثة',
  },
  {
    id: 'decor-greige-2',
    url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'greige_paints',
    title: 'غرفة معيشة مينيمال بدهان أوف وايت ناعم',
    defaultCaption: 'دهان أوف وايت مطفي يمنح الفراغ لمسة سكاندينافية مريحة للعين وخالية من الانعكاسات',
    altText: 'تصميم داخلي ناعم بجدران مدهونة بأوف وايت مطفي وديكورات بسيطة',
  },
  {
    id: 'decor-greige-3',
    url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'greige_paints',
    title: 'تدرجات البيج الكريمي في المساحات الهادئة',
    defaultCaption: 'تدرج دهانات البيج الكريمي الفاتح مع أثاث طبيعي مريح',
    altText: 'غرفة نوم مدهونة بلون بيج كريمي هادئ بتوزيع إضاءة طبيعي',
  },
  {
    id: 'decor-greige-4',
    url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'greige_paints',
    title: 'تناغم الألوان الترابية المعاصرة',
    defaultCaption: 'أحدث درجات الدهانات الترابية لعام 2026 مع لمسات خشبية متناغمة',
    altText: 'جدران بدهان ترابي عصري متناسق مع عناصر ديكورية خشبية',
  },

  // 2. Wood Slats, Marble Alternatives & Feature Walls
  {
    id: 'decor-wood-marble-1',
    url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'wood_slats_marble',
    title: 'جدار التلفزيون ببديل الخشب والبانوهات',
    defaultCaption: 'تأطير جدار التلفزيون بشرائح بديل الخشب وبانوهات جدارية مدهونة بنفس درجة الحائط',
    altText: 'جدار ديكوري مميز يجمع بين بانوهات الجدران وشرائح بديل الخشب المودرن',
  },
  {
    id: 'decor-wood-marble-2',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'wood_slats_marble',
    title: 'دمج بديل الرخام الكلكتا مع دهان الحوائط الفاخر',
    defaultCaption: 'لوح بديل الرخام بعروق ذهبية محاط بحزام إضاءة ليد بروفايل 3000K متناغم مع الدهان المطفي',
    altText: 'لوح بديل رخام أبيض بعروق رمادية وذهبية مثبت في صالة استقبال فندقية',
  },
  {
    id: 'decor-wood-marble-3',
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'wood_slats_marble',
    title: 'تكسيات جدارية خشبية معمارية رأسية',
    defaultCaption: 'الشرائح الخشبية الرأسية ترفع المدى البصري للأسقف وتمنح عمقاً ثلاثي الأبعاد للجدران',
    altText: 'تكسيات بديل الخشب الرأسية في مدخل فيلا مودرن مع إضاءة أرضية',
  },

  // 3. Stucco Antico, Velvet & Decorative Textures
  {
    id: 'decor-stucco-1',
    url: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'stucco_velvet',
    title: 'تطبيق دهان ستوكو أنتيكو رخامي الملمس',
    defaultCaption: 'ملمس دهان الستوكو المصقول يمنح الجدران بريقاً يشبه الرخام الطبيعي دون فواصل',
    altText: 'جدار ديكوري مطبق بتقنية الستوكو أنتيكو بملمس رخامي ناعم وألوان ترابية',
  },
  {
    id: 'decor-stucco-2',
    url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'stucco_velvet',
    title: 'دهان القطيفة والشمواه في جدار التمييز',
    defaultCaption: 'انعكاسات الضوء على دهان القطيفة الديكوري بلون رمادي فحمي فاخر',
    altText: 'جدار مميز بدهان شمواه رمادي غامق مع مقعد أنيق وإضاءة هادئة',
  },
  {
    id: 'decor-stucco-3',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'stucco_velvet',
    title: 'تداخل الملامس الديكورية وألوان الباليت المعمارية',
    defaultCaption: 'اختبار درجات الدهان الديكوري وملمس المعجون الإيطالي على ألواح العينات',
    altText: 'عينات ملامس دهانات ديكورية وألوان عصرية قيد الاختبار والتجهيز',
  },

  // 4. Moisture Treatment, Primer Sealing & Wall Preparation
  {
    id: 'decor-moisture-1',
    url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'moisture_prep',
    title: 'أدوات تأسيس المعجون والصنفرة الدقيقة',
    defaultCaption: 'أدوات الرول والفرش الاحترافية المعتمدة لتطبيق السيلر المائي ودهانات الأساس',
    altText: 'رولات دهان وسكاكين معجون وأدوات دهانات حوائط احترافية مرتبة بموقع التشطيب',
  },
  {
    id: 'decor-moisture-2',
    url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'moisture_prep',
    title: 'معالجة استواء الجدران وتأسيس الزوايا',
    defaultCaption: 'استواء الحائط والصنفرة بالضوء الكاشف يضمن سطحاً أملس خالياً من التموجات',
    altText: 'جدار غرفة معالج بالمعجون المسحوب ومجهز للوجه النهائي للدهان',
  },

  // 5. Luxury Bedrooms & Calming Tones
  {
    id: 'decor-bedroom-1',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'luxury_bedroom',
    title: 'غرفة نوم بدرجات الساج جرين المهدئة للأعصاب',
    defaultCaption: 'دهان اللون الأخضر الهادئ (Sage Green) يمنح غرف النوم سكينة نفسية وأناقة عصرية',
    altText: 'غرفة نوم فندقية أنيقة بجدران خضراء هادئة وإضاءة دافئة',
  },
  {
    id: 'decor-bedroom-2',
    url: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef7?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'luxury_bedroom',
    title: 'جدار خلفية السرير بتأطير بانوهات ودهان ناعم',
    defaultCaption: 'تنسيق ألوان دهانات خلفية السرير بتدرجات الرمادي الدافئ مع إضاءة أباجورات جانبية',
    altText: 'غرفة نوم ماستر مع ديكور جداري خلف السرير متناسق مع الدهانات الفاخرة',
  },

  // 6. Gypsum Board & Architectural Lighting
  {
    id: 'decor-gypsum-1',
    url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'gypsum_lighting',
    title: 'أسقف معلقة مع بيوت نور دهان أبيض ناصع',
    defaultCaption: 'تطبيق الدهان المطفي التام على الأسقف المعلقة لإخفاء فواصل ألواح الجبس بورد',
    altText: 'سقف معلق مودرن مع بيت نور وإضاءة غير مباشرة بلون دافئ',
  },
  {
    id: 'decor-gypsum-2',
    url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'gypsum_lighting',
    title: 'توزيع الإسبوتات والليد بروفايل في الأسقف',
    defaultCaption: 'توزيع إضاءة الاسبوت لايت بزاوية 45 درجة لتسليط الضوء على براعة الدهان الديكوري',
    altText: 'إضاءة سقفية معمارية توضح توزيع درجات الضوء على جدران الصالون',
  },

  // 7. Dining & Reception Areas
  {
    id: 'decor-dining-1',
    url: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'dining_reception',
    title: 'صالة طعام بدهانات ربع لامعة سهلة التنظيف',
    defaultCaption: 'استخدام دهانات البلاستيك المقاوم للفرك والبقع في صالات الطعام والممرات',
    altText: 'منطقة طعام مودرن مع جدران ناعمة مطلية بدهان عالي المتانة قابل للغسيل',
  },
  {
    id: 'decor-dining-2',
    url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'dining_reception',
    title: 'مجلس استقبال فندقي مفتوح بدهانات متدرجة',
    defaultCaption: 'اتساق لوني بديع بين صالة الاستقبال ومجلس الضيافة بدرجات ألوان متكاملة',
    altText: 'صالون استقبال واسع ومفتوح بدهانات بيج كريمي وأرضيات متناسقة',
  },

  // 8. Facades & Exterior Paints
  {
    id: 'decor-facade-1',
    url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'facade_exterior',
    title: 'واجهة فيلا بدهانات جرافيت مقاومة للعوامل الجوية',
    defaultCaption: 'تطبيق دهانات البروفايل والجرافيت المقاومة للحرارة وأشعة الشمس فوق البنفسجية في الواجهات الخارجية',
    altText: 'واجهة فيلا مودرن بدهانات خارجية ترابية مقاومة للرطوبة والشمس',
  },
  {
    id: 'decor-facade-2',
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'facade_exterior',
    title: 'تناغم دهانات الواجهات المعمارية مع الحجر والليد الخارجي',
    defaultCaption: 'دمج الدهانات الأسمنتية الحديثة مع تكسيات الحجر الطبيعي وإنارة الواجهات الموجهة',
    altText: 'واجهة منزل عصري بتشطيبات دهان خارجي فاخر مع إنارة معمارية دافئة',
  },

  // 9. Additional high-fidelity interior & color balance images
  {
    id: 'decor-palette-1',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=81',
    topicCategory: 'greige_paints',
    title: 'تناسق ألوان الجدران مع الأرضيات الباركيه',
    defaultCaption: 'تدرج لوني مدروس يربط بين دهان الحائط الدافئ وأرضيات الخشب الطبيعي',
    altText: 'غرفة بتناسق دهانات حوائط بيج مع خشب الباركيه الفاخر',
  },
  {
    id: 'decor-wallart-1',
    url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'luxury_bedroom',
    title: 'جدار ديكوري بدهانات داكنة ومريحة',
    defaultCaption: 'استخدام درجات الكحلي أو الفحمي في جدار واحد كعنصر تركيز بصري فخم',
    altText: 'جدار رئيسي بدهان داكن مخملي يبرز جمال السرير والمفروشات',
  },
  {
    id: 'decor-corridor-1',
    url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'moisture_prep',
    title: 'تطبيق دهانات ضد الرطوبة في الممرات والخدمات',
    defaultCaption: 'دهانات أكريليك مائية مضادة للعفن والنشوع للمناطق المعرضة للأبخرة والرطوبة',
    altText: 'ممر داخلي مشطب بدهانات ناعمة مضادة للرطوبة مع إضاءة سقفية',
  },
  {
    id: 'decor-wood-detail-1',
    url: 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?auto=format&fit=crop&w=1200&q=80',
    topicCategory: 'wood_slats_marble',
    title: 'تفاصيل تركيب بديل الخشب المعزول مع الحوائط',
    defaultCaption: 'تثبيت الشرائح الخشبية باستخدام السيليكون الإنشائي والمسامير المخفية لضمان ثبات تام',
    altText: 'تفاصيل معمارية لشرائح بديل الخشب الديكورية على حائط مدهون',
  },
];

/**
 * Maps topic text to preferred image categories
 */
function inferPreferredCategories(topic: string): CuratedDecorImage['topicCategory'][] {
  const t = topic.toLowerCase();
  const categories: CuratedDecorImage['topicCategory'][] = [];

  if (t.includes('بديل الخشب') || t.includes('بديل الرخام') || t.includes('بانوهات') || t.includes('تلفزيون')) {
    categories.push('wood_slats_marble');
  }
  if (t.includes('ستوكو') || t.includes('قطيفة') || t.includes('شمواه') || t.includes('مارمورينو') || t.includes('ملمس')) {
    categories.push('stucco_velvet');
  }
  if (t.includes('رطوبة') || t.includes('معجون') || t.includes('صنفرة') || t.includes('سيلر') || t.includes('تأسيس')) {
    categories.push('moisture_prep');
  }
  if (t.includes('نوم') || t.includes('هدوء') || t.includes('مستر') || t.includes('سرير')) {
    categories.push('luxury_bedroom');
  }
  if (t.includes('سقف') || t.includes('جبس') || t.includes('نور') || t.includes('إضاءة') || t.includes('اسبوت')) {
    categories.push('gypsum_lighting');
  }
  if (t.includes('واجهات') || t.includes('بروفايل') || t.includes('خارجي') || t.includes('فلل')) {
    categories.push('facade_exterior');
  }
  if (t.includes('طعام') || t.includes('صالون') || t.includes('مجلس') || t.includes('استقبال') || t.includes('غسيل')) {
    categories.push('dining_reception');
  }

  // Default to greige paints and general decor if no specific category matched
  if (categories.length === 0) {
    categories.push('greige_paints', 'wood_slats_marble', 'gypsum_lighting');
  }

  return categories;
}

/**
 * Allocates unique, contextually relevant decor images for an article.
 * Guarantees:
 * 1. Zero duplicate images inside the same article.
 * 2. Avoids reusing images already published in past articles (when unused ones are available).
 * 3. Binds images to the topic and assigns descriptive captions and alt-texts.
 */
export function allocateContextualDecorImages(options: {
  count: number;
  topic?: string;
  usedUrls?: Set<string>;
  existingArticleUrls?: Set<string>;
}): {
  url: string;
  caption: string;
  altText: string;
  topicCategory: string;
}[] {
  const count = Math.max(1, options.count || 4);
  const topic = options.topic || '';
  const usedUrls = options.usedUrls || new Set<string>();
  const intraArticleUrls = new Set<string>(options.existingArticleUrls || []);
  const allocated: { url: string; caption: string; altText: string; topicCategory: string }[] = [];

  const preferredCategories = inferPreferredCategories(topic);

  // Pool 1: Catalog images in preferred categories that haven't been used in ANY article
  const poolPreferredUnused = EXPANDED_DECOR_CATALOG.filter(
    (img) => preferredCategories.includes(img.topicCategory) && !usedUrls.has(img.url) && !intraArticleUrls.has(img.url)
  );

  // Pool 2: Any catalog image that hasn't been used in ANY article
  const poolOtherUnused = EXPANDED_DECOR_CATALOG.filter(
    (img) => !preferredCategories.includes(img.topicCategory) && !usedUrls.has(img.url) && !intraArticleUrls.has(img.url)
  );

  // Pool 3: Catalog images in preferred categories not yet used in THIS article (if total unique images in library is exhausted)
  const poolPreferredReused = EXPANDED_DECOR_CATALOG.filter(
    (img) => preferredCategories.includes(img.topicCategory) && !intraArticleUrls.has(img.url)
  );

  // Pool 4: Any image not yet used in THIS article
  const poolAnyNotIntra = EXPANDED_DECOR_CATALOG.filter(
    (img) => !intraArticleUrls.has(img.url)
  );

  // Combine prioritizing unused & topic-matched
  const candidatePool = [
    ...shuffleArray(poolPreferredUnused),
    ...shuffleArray(poolOtherUnused),
    ...shuffleArray(poolPreferredReused),
    ...shuffleArray(poolAnyNotIntra),
  ];

  for (const candidate of candidatePool) {
    if (allocated.length >= count) break;
    if (intraArticleUrls.has(candidate.url)) continue; // Never allow intra-article duplicates

    intraArticleUrls.add(candidate.url);
    allocated.push({
      url: candidate.url,
      caption: candidate.defaultCaption,
      altText: candidate.altText,
      topicCategory: candidate.topicCategory,
    });
  }

  return allocated;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
