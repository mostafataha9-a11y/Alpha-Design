/**
 * Architectural & Decor Terminology Glossary
 * Contains authoritative architectural explanations for key decor materials,
 * paint techniques, lighting temperatures, and interior design concepts.
 * Displayed dynamically as interactive hover tooltips in article content.
 */

export interface GlossaryEntry {
  term: string;
  category: 'materials' | 'paints' | 'lighting' | 'psychology' | 'construction';
  titleAr: string;
  reasonAr: string;
  titleEn: string;
  reasonEn: string;
}

export const DECOR_GLOSSARY: Record<string, GlossaryEntry> = {
  'بديل الرخام': {
    term: 'بديل الرخام',
    category: 'materials',
    titleAr: 'ألواح بديل الرخام (PVC Marble)',
    reasonAr: 'ألواح PVC عالية الكثافة بعروق بصرية فخمة تحاكي الرخام الإيطالي. تم تحديدها لكونها مقاومة للرطوبة وخفيفة الوزن وخالية من المسامية دون تكلفة الرخام الطبيعي.',
    titleEn: 'PVC Marble Alternative',
    reasonEn: 'High-density PVC sheets with natural marble veining. Highlighted for moisture resistance and luxury aesthetics without structural weight.',
  },
  'بديل الخشب': {
    term: 'بديل الخشب',
    category: 'materials',
    titleAr: 'شرائح بديل الخشب (WPC Fluted Panels)',
    reasonAr: 'شرائح معالجة من ألياف البوليمر والخشب (WPC) مقاومة للماء والنمل الأبيض. تم تحديدها لدورها في كسر الصدى الصوتي وإضفاء الدفء البصري والعمق الهندسي.',
    titleEn: 'WPC Fluted Panels',
    reasonEn: 'Moisture-resistant composite wood-polymer panels. Highlighted for acoustic dampening and modern vertical warmth.',
  },
  'الجريج': {
    term: 'الجريج',
    category: 'psychology',
    titleAr: 'لون الجريج (Greige = Grey + Beige)',
    reasonAr: 'المزيج الحيادي الذهبي بين برودة الرمادي المودرن ودفء البيج الكلاسيكي. تم تحديده لأنه يعكس الإضاءة بنعومة فائقة ويعطي اتساعاً نفسياً للأماكن الضيقة.',
    titleEn: 'Greige Color Scheme',
    reasonEn: 'The perfect blend of modern gray and warm beige. Highlighted for optical enlargement and soothing ambient light dispersion.',
  },
  'الأوف وايت': {
    term: 'الأوف وايت',
    category: 'paints',
    titleAr: 'درجات الأوف وايت (Off-White)',
    reasonAr: 'البديل الفندقي للأبيض الصريح؛ تم تحديده لقدرته على تشتيت أشعة الشمس وإضاءات الليد دون التسبب في إجهاد العين، مع منح الحوائط وقاراً فخماً.',
    titleEn: 'Off-White Shades',
    reasonEn: 'Hospitality-grade white alternative. Highlighted for soft glare reduction and cohesive multi-room flow.',
  },
  '3000K': {
    term: '3000K',
    category: 'lighting',
    titleAr: 'حرارة الإضاءة الدافئة (3000 كلفن - Warm White)',
    reasonAr: 'الحرارة الضوئية المثالية للاسترخاء في غرف المعيشة والنوم. تم تحديدها لأنها تبرز الصبغات الدافئة في دهانات الحوائط وتمنح هدوءاً فسيولوجياً للأعصاب.',
    titleEn: 'Warm White Light (3000K)',
    reasonEn: 'Optimal warm illumination that flatters wall undertones and induces psychological tranquility.',
  },
  '4000K': {
    term: '4000K',
    category: 'lighting',
    titleAr: 'حرارة الإضاءة المحايدة (4000 كلفن - Neutral Daylight)',
    reasonAr: 'درجة حرارة الضوء الطبيعي المحايد؛ تم تحديدها كمعيار ذهبي للمطابخ والمكاتب لأنها تظهر الألوان الحقيقية للدهانات والأثاث دون تشويه لوني.',
    titleEn: 'Neutral Light (4000K)',
    reasonEn: 'True-color reproduction lighting essential for functional spaces like kitchens and home offices.',
  },
  'سيلر مائي': {
    term: 'سيلر مائي',
    category: 'construction',
    titleAr: 'السيلر المائي البوليمري (Primer Sealer)',
    reasonAr: 'طبقة التأسيس الأهم على المحارة الجافة؛ تم تحديدها لأنها تخترق المسام لربط الذرات وعزل الأملاح الكلسية، مما يضمن ثبات المعجون لعشرات السنين دون تقشير.',
    titleEn: 'Water-based Primer Sealer',
    reasonEn: 'Penetrative foundation layer that bonds substrate particles and stops efflorescence.',
  },
  'معجون ناعم': {
    term: 'معجون ناعم',
    category: 'construction',
    titleAr: 'معجون التسوية والتشطيب (Fine Putty)',
    reasonAr: 'سكينتا معجون متتاليتان لإغلاق أدق المسامات؛ تم تحديده لأنه يمنح الحائط استواءً بصرياً يمنع ظهور الظلال المتموجة تحت إضاءات الليد الجانبية.',
    titleEn: 'Fine Finishing Putty',
    reasonEn: 'Ultra-smooth smoothing compound preventing surface waves under raking led light.',
  },
  'ستوكو': {
    term: 'ستوكو',
    category: 'paints',
    titleAr: 'دهان الستوكو الإيطالي (Stucco Veneziano)',
    reasonAr: 'دهان جيري تراثي مصقول بالمالج يعطي عمق الرخام الطبيعي وانعكاسات ضوئية مرآتية. تم تحديده كبديل هندسي فاخر للجدران الرئيسية في المجالس والمداخل.',
    titleEn: 'Venetian Stucco',
    reasonEn: 'Hand-troweled polished marble-plaster finish reflecting ambient light with regal depth.',
  },
  'القطيفة': {
    term: 'القطيفة',
    category: 'paints',
    titleAr: 'دهان القطيفة المخملي (Velvet Paint)',
    reasonAr: 'دهان ملمسي يحتوي على صبغات ميكروية حريرية؛ تم تحديده لقدرته على تغيير تدريجه اللوني حسب زاوية الرؤية، مما يمنح الجدار إحساساً قماشياً باذخاً.',
    titleEn: 'Velvet Texture Paint',
    reasonEn: 'Micronized metallic silky wall coating shifting shades with perspective and lighting.',
  },
  'بلاستيك مطفي': {
    term: 'بلاستيك مطفي',
    category: 'paints',
    titleAr: 'الدهان البلاستيكي المطفي (Matt Emulsion)',
    reasonAr: 'دهان يمتص أشعة الضوء تماماً دون أي لمعة؛ تم تحديده كحل عبقري للأسقف والحوائط التي تحتوي على عيوب تسوية طفيفة لأن انعدام اللمعان يخفي التموجات.',
    titleEn: 'Dead Matt Emulsion',
    reasonEn: 'Zero-sheen paint that absorbs harsh reflections and camouflages minor surface imperfections.',
  },
  'نصف لمعة': {
    term: 'نصف لمعة',
    category: 'paints',
    titleAr: 'دهان نصف لمعة (Semi-Gloss Emulsion)',
    reasonAr: 'التوازن المثالي بين المتانة وسهولة الغسيل والرونق البصري؛ تم تحديده لممرات الحركة وغرف المعيشة والأطفال لقدرته العالية على مقاومة البقع والفرك.',
    titleEn: 'Semi-Gloss Washable Paint',
    reasonEn: 'High-scrub durability balance perfect for high-traffic hallways and family living areas.',
  },
  'بانوهات الفوم': {
    term: 'بانوهات الفوم',
    category: 'materials',
    titleAr: 'إطارات البانوهات الكلاسيكية (Polyurethane Moldings)',
    reasonAr: 'إطارات جدارية مصنوعة من مادة البولي يوريثان عالية الكثافة المقاومة للصدمات؛ تم تحديدها لإعطاء الجدران السادة طابعاً نيو كلاسيكياً فخماً بأقل تكلفة.',
    titleEn: 'Polyurethane Wall Moldings',
    reasonEn: 'High-density architectural trims adding neoclassical structural proportion to bare walls.',
  },
  'سيكولوجية الألوان': {
    term: 'سيكولوجية الألوان',
    category: 'psychology',
    titleAr: 'علم سيكولوجية الألوان وتأثيرها العصبي',
    reasonAr: 'دراسة تأثير ترددات الضوء المنعكسة على نبضات القلب والهدوء الذهني؛ تم تحديدها للتأكيد على اختيار ألوان تعزز السكينة في غرف النوم والتركيز في المكاتب.',
    titleEn: 'Color Psychology in Design',
    reasonEn: 'The neural and emotional impact of optical wavebands on mood, heart rate, and spatial focus.',
  },
  'ليد بروفايل': {
    term: 'ليد بروفايل',
    category: 'lighting',
    titleAr: 'مسارات الليد بروفايل المخفية (LED Aluminum Profiles)',
    reasonAr: 'مجاري ألومنيوم مع مشتتات سيليكون ناعمة؛ تم تحديدها لأنها تمنع الوهج النقطي المزعج وتوفر إضاءة خطية عصرية تبرز جمال ديكورات الحوائط.',
    titleEn: 'Recessed LED Channel',
    reasonEn: 'Aluminum housing with milky diffusers delivering glare-free continuous linear illumination.',
  },
  'سيراميك باركيه': {
    term: 'سيراميك باركيه',
    category: 'materials',
    titleAr: 'بورسلين وسيراميك بطابع الباركيه',
    reasonAr: 'ألواح بورسلين تحاكي تجزيعات أخشاب البلوط الطبيعي؛ تم تحديدها للجمع بين صلابة السيراميك ومقاومته للماء مع دفء وفخامة منظر الخشب الطبيعي.',
    titleEn: 'Wood-Look Porcelain Planks',
    reasonEn: 'Combines the thermal and waterproof durability of porcelain with the organic warmth of oak.',
  },
  'عزل الرطوبة': {
    term: 'عزل الرطوبة',
    category: 'construction',
    titleAr: 'العزل المائي والبوليمري ضد الرطوبة',
    reasonAr: 'دهانات عازلة إسمنتية وبوليمرية تمنع ارتشاح المياه؛ تم تحديدها كخط دفاع أول يمنع سقوط الدهانات وظهور البقع الكلسية وتلف الجدران.',
    titleEn: 'Damp-Proofing Barrier',
    reasonEn: 'Polymeric sub-layer stopping capillary moisture rise and long-term paint delamination.',
  },
  'ورق حائط 3D': {
    term: 'ورق حائط 3D',
    category: 'materials',
    titleAr: 'ورق الحائط ثلاثي الأبعاد والبانورامي',
    reasonAr: 'كسوة جدارية فينيل ذات عمق بصري؛ تم تحديدها لخلق جدار بؤري مميز (Accent Wall) يضاعف الشعور بالاتساع في المساحات المحدودة.',
    titleEn: '3D Panoramic Wallcoverings',
    reasonEn: 'Textured vinyl prints engineered to create deep focal perspective in compact spaces.',
  },
  'الجبسوم بورد': {
    term: 'الجبسوم بورد',
    category: 'construction',
    titleAr: 'ألواح الجبسوم بورد (Knauf Gypsum Boards)',
    reasonAr: 'ألواح جبسية معالجة خفيفة الوزن؛ تم تحديدها لإتاحة إمكانية توزيع الإضاءات المخفية وتكييف الهواء وإخفاء الأسلاك مع عزل حراري وصوتي متميز.',
    titleEn: 'Gypsum Board Ceilings',
    reasonEn: 'Lightweight suspended ceiling framework enabling recessed lighting and clean acoustic isolation.',
  },
  'كود اللون': {
    term: 'كود اللون',
    category: 'paints',
    titleAr: 'كود اللون الرقمي (NCS / RAL Color Code)',
    reasonAr: 'الرمز الرقمي المعتمد لتركيب خلطة الدهان بالكمبيوتر؛ تم تحديده لضمان مطابقة الدرجة بنسبة 100% في حال الرغبة في عمل صيانة أو دهان غرف إضافية مستقبلاً.',
    titleEn: 'Computerized Color Code',
    reasonEn: 'Exact spectral formula ensuring 100% batch reproducibility across seasons and renovations.',
  },
};

/**
 * Searches text for any matching glossary key
 */
export function findGlossaryMatch(wordOrPhrase: string): GlossaryEntry | undefined {
  const clean = wordOrPhrase.trim().replace(/^['"«»„“”]+|['"«»„“”]+$/g, '');
  if (!clean) return undefined;

  // Direct match
  if (DECOR_GLOSSARY[clean]) {
    return DECOR_GLOSSARY[clean];
  }

  // Case-insensitive or substring check
  const lower = clean.toLowerCase();
  for (const [key, entry] of Object.entries(DECOR_GLOSSARY)) {
    if (key.toLowerCase() === lower || lower.includes(key.toLowerCase())) {
      return entry;
    }
  }

  return undefined;
}
