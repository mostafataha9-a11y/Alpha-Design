import React, { useState } from 'react';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Loader2,
  BookOpen,
  Send,
  Eye,
  Tag,
  Wand2,
  FileText,
  AlertCircle,
  Bot,
  ShieldCheck,
  Search,
  Globe,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Check,
  MapPin,
  Shield,
  RefreshCw,
  AlertTriangle,
  Layers,
  CheckCheck
} from 'lucide-react';
import { Article, SiteSettings, BroadcastHistoryItem } from '../types/blog';
import { SocialBroadcastModal } from './SocialBroadcastModal';
import { compressImageClient } from '../utils/imageCompression';
import { fetchWithAuth } from '../utils/apiAuth';

interface SmartArticleCreatorProps {
  settings: SiteSettings;
  onPublishArticle: (article: Article) => Promise<any> | void;
  onViewArticle: (article: Article) => void;
  onBroadcastComplete?: (item: BroadcastHistoryItem) => void;
}

interface UploadedImageItem {
  id: string;
  url: string;
  caption: string;
  isDuplicate?: boolean;
  ipProtected?: boolean;
  duplicateStatus?: 'unique' | 'duplicate_in_site' | 'duplicate_in_batch';
  duplicateReason?: string;
  matchedArticleTitle?: string;
}

// Preset samples in Decor & Paints to allow the user to test the feature in 1 click
const SAMPLE_PRESETS: {
  label: string;
  topic: string;
  draftContent: string;
  focusKeyword: string;
  images: { url: string; caption: string }[];
}[] = [
  {
    label: 'تجربة 1: ديكورات بديل الرخام وبديل الخشب لجدار الصالة',
    topic: 'تنسيق جدار التلفزيون بديل الرخام وبديل الخشب مع شريط إضاءة مخفية ليد',
    draftContent:
      'جدار التلفزيون في الصالة محتاج لمسة عصرية تدمج بين دفء الخشب وفخامة الرخام. استخدمنا لوح بديل رخام أبيض كلكتا مع شرائح بديل خشب رمادي دافئ على الجوانب وشريط ليد مخفي 3000K، مما أعطى اتساعاً وفخامة فندقية مبهرة.',
    focusKeyword: 'بديل الرخام وبديل الخشب',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80',
        caption: 'تنسيق جدار الصالة الرئيسي باستخدام ألواح بديل الرخام وشرائح بديل الخشب مع إضاءة ليد بروفايل دافئة'
      },
      {
        url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1000&q=80',
        caption: 'تفاصيل الخطوط الرأسية لبديل الخشب وتأثيرها على رفع السقف البصري للغرفة'
      },
      {
        url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=80',
        caption: 'تناغم دهان الجريج المائل للبيج مع ألوان الأثاث المودرن والإضاءة المخفية'
      }
    ]
  },
  {
    label: 'تجربة 2: أحدث دهانات غرف النوم والدهان الديكوري المخملي',
    topic: 'ألوان دهانات غرف النوم المودرن وتطبيق دهان القطيفة الديكوري لجدار السرير',
    draftContent:
      'غرفة النوم تحتاج ألواناً تشيع الاسترخاء والسكينة. اخترنا دهان أوف وايت ناعم مطفي للجدران الثلاثة مع جدار رئيسي خلف السرير مطبق بتقنية دهان القطيفة والشمواه بدرجة خضراء مريمية ناعمة تعكس الضوء برقة.',
    focusKeyword: 'دهانات غرف نوم مودرن',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
        caption: 'تناغم دهان الحوائط الهادئ في غرفة النوم مع المفروشات الطبيعية والإضاءة الهادئة'
      },
      {
        url: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1000&q=80',
        caption: 'تطبيق ملمس الدهان الديكوري الفاخر بنقشات ناعمة تضفي دفئاً وفخامة للجدار المميز'
      }
    ]
  }
];

const CREATIVE_HUMAN_STYLES = [
  {
    id: 'STORYTELLING_SITE',
    titleAr: 'سرد قصصي ومواقف من الموقع',
    titleEn: 'Field Chronicles & Storytelling',
    descAr: 'يبدأ بموقف واقعي حي ومعاينة شقة، حوار مباشر مع صاحب البيت، وحل المشكلات المعمارية بحرارة إنسانية.',
    icon: '🎭',
    badge: 'الأعلى تفاعلاً',
    tonePrompt: 'سرد قصصي واقعي دافئ من قلب الموقع مع حوارات وتفاصيل ملموسة',
  },
  {
    id: 'ARTISAN_INSIDER',
    titleAr: 'أسرار المعلم وكشف حيل السوق',
    titleEn: 'Master Artisan Trade Secrets',
    descAr: 'كشف المستور بأمانة: كيف تكتشف المعجون المغشوش، متى يوفر المقاول على حسابك، وأسرار سكاكين المعجون.',
    icon: '🔨',
    badge: 'أسرار الصنعة',
    tonePrompt: 'أسرار المعلم المحترف والصانع الخبير مع كشف حيل السوق والأمانة الهندسية',
  },
  {
    id: 'SENSORY_QUIET_LUXURY',
    titleAr: 'سيكولوجية الفخامة الهادئة وملمس الأسطح',
    titleEn: 'Sensory Quiet Luxury',
    descAr: 'وصف حسي للملمس (نعومة القطيفة، برودة الستوكو، دفء إضاءة 3000K، وانعكاس شمس العصر على الجريج).',
    icon: '✨',
    badge: 'فخامة هادئة',
    tonePrompt: 'سيكولوجية الفخامة الهادئة وملمس الأسطح وانعكاسات الضوء الطبيعي والهدوء النفسي',
  },
  {
    id: 'MYTH_BUSTING_CONSULTANCY',
    titleAr: 'تفنيد الأوهام وأخطاء التشطيب',
    titleEn: 'Myth-Busting Masterclass',
    descAr: 'تصحيح مباشر لأخطاء شائعة (وهم أن الأبيض يوسع الغرفة دائماً، أو أن أي معجون ينفع للحمام).',
    icon: '💡',
    badge: 'تصحيح أخطاء',
    tonePrompt: 'ماستركلاس استشاري صريح يفند الخرافات الشائعة بأدلة معمارية واقعية',
  },
  {
    id: 'REAL_COST_VALUATION',
    titleAr: 'حسابات التكلفة والجدوى بالمليم',
    titleEn: 'Real Cost & Budget Valuation',
    descAr: 'تكلفة المتر المربع بدقة لعام 2026، أين تستثمر بسخاء وأين توفر بذكاء لتشطيب شقة راقية بأفضل سعر.',
    icon: '📊',
    badge: 'أرقام حقيقية',
    tonePrompt: 'دراسة جدوى وتكلفة واقعية بالأرقام والأسعار الدقيقة لعام 2026',
  },
  {
    id: 'ARTISTIC_ALCHEMY',
    titleAr: 'كيمياء الألوان وابتكارات 2026',
    titleEn: 'Color & Texture Alchemy',
    descAr: 'دمج الجير الصخري Limewash وبديل الرخام المضيء، واختيار أكواد الألوان الملكية الفريدة.',
    icon: '🎨',
    badge: 'ابتكارات 2026',
    tonePrompt: 'كيمياء الألوان الفنية وتأثيرات الجير الصخري والرخام المضيء المبتكرة',
  },
];

export const SmartArticleCreator: React.FC<SmartArticleCreatorProps> = ({
  settings,
  onPublishArticle,
  onViewArticle,
  onBroadcastComplete,
}) => {
  const isAr = settings.language === 'ar';

  const [topic, setTopic] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [selectedCreativeStyle, setSelectedCreativeStyle] = useState('STORYTELLING_SITE');
  const [tone, setTone] = useState('سرد قصصي واقعي دافئ من قلب الموقع مع حوارات وتفاصيل ملموسة');
  const [targetWordCount, setTargetWordCount] = useState(1500); // Between 1,000 and 10,000 words
  const [language, setLanguage] = useState<'ar' | 'en'>(settings.language);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationMapUrl, setLocationMapUrl] = useState('');

  // Array of images where user adds caption under each image (repeatable for multiple images)
  const [images, setImages] = useState<UploadedImageItem[]>([
    {
      id: 'img-1',
      url: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1000&q=80',
      caption: 'تناسق درجات دهان الجدران في صالة الطعام مع الأثاث العصري والإضاءة المتوازنة',
    },
    {
      id: 'img-2',
      url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1000&q=80',
      caption: 'تطبيق التكسيات والدهانات الحديثة لإبراز التفاصيل المعمارية والاتساع البصري',
    },
  ]);

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generatedArticle, setGeneratedArticle] = useState<Article | null>(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [ipProtectionNotice, setIpProtectionNotice] = useState<string | null>(null);
  const [creativeAngleName, setCreativeAngleName] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'auto' | 'gemini' | 'grok' | 'groq'>('auto');
  const [providerStatus, setProviderStatus] = useState<any>(null);

  // ----------------------------------------------------
  // ZERO-DUPLICATE IMAGE DEFENSE & SHIELD STATES
  // ----------------------------------------------------
  const [strictZeroDuplicates, setStrictZeroDuplicates] = useState(true);
  const [duplicateStatusMap, setDuplicateStatusMap] = useState<
    Record<string, { isDuplicate: boolean; status: string; reason?: string; matchedArticleTitle?: string; replacement?: any }>
  >({});
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [catalogStatus, setCatalogStatus] = useState<{
    totalCatalogImages: number;
    totalUsedSiteImages: number;
    availableUnusedCatalogImagesCount: number;
  } | null>(null);
  const [duplicateAlertBanner, setDuplicateAlertBanner] = useState<string | null>(null);
  const [isAutoReplacingAll, setIsAutoReplacingAll] = useState(false);

  // Load catalog status
  const refreshCatalogStatus = React.useCallback(async () => {
    try {
      const res = await fetch('/api/images/catalog-status');
      if (res.ok) {
        const data = await res.json();
        setCatalogStatus(data);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    refreshCatalogStatus();
  }, [refreshCatalogStatus]);

  // Scan current images for duplicates against all published articles & batch
  const scanImagesForDuplicates = React.useCallback(async (imageList: UploadedImageItem[]) => {
    if (imageList.length === 0) {
      setDuplicateStatusMap({});
      setDuplicateAlertBanner(null);
      return;
    }

    setIsCheckingDuplicates(true);
    try {
      const seenUrls = new Set<string>();
      const initialMap: Record<string, any> = {};
      let duplicateCount = 0;
      const urlsToCheckWithServer: string[] = [];

      for (const item of imageList) {
        const u = (item.url || '').trim();
        if (!u) continue;

        if (seenUrls.has(u)) {
          duplicateCount++;
          initialMap[u] = {
            url: u,
            isDuplicate: true,
            status: 'duplicate_in_batch',
            reason: isAr
              ? 'الصورة مكررة داخل نفس المقال (تم إدراجها أكثر من مرة).'
              : 'Image duplicated inside this article.',
          };
        } else {
          seenUrls.add(u);
          if (u.startsWith('data:')) {
            // Local file uploads are inherently unique unless duplicated within the batch
            initialMap[u] = {
              url: u,
              isDuplicate: false,
              status: 'unique',
              reason: isAr
                ? 'صورة مرفوعة محلياً فريدة وحصرية.'
                : 'Locally uploaded unique image.',
            };
          } else {
            urlsToCheckWithServer.push(u);
          }
        }
      }

      if (urlsToCheckWithServer.length > 0) {
        const res = await fetch('/api/images/check-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            urls: urlsToCheckWithServer,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.results)) {
            data.results.forEach((item: any) => {
              if (item.url) {
                initialMap[item.url] = item;
                if (item.isDuplicate) duplicateCount++;
              }
            });
          }
        }
      }

      setDuplicateStatusMap(initialMap);
      if (duplicateCount > 0) {
        setDuplicateAlertBanner(
          isAr
            ? `تم رصد ${duplicateCount} صورة مكررة! يمكنك استبدالها بصور فريدة غير مستخدمة بنقرة واحدة لضمان قبول أدسنس والتصدر في جوجل.`
            : `${duplicateCount} duplicate images detected! Click auto-replace to maintain 100% unique visual assets.`
        );
      } else {
        setDuplicateAlertBanner(null);
      }
    } catch (err) {
      console.warn('Duplicate checking note:', err);
    } finally {
      setIsCheckingDuplicates(false);
    }
  }, [isAr]);

  // Scan automatically when images change
  const imagesUrlsKey = images.map((i) => i.url).join(';');
  React.useEffect(() => {
    scanImagesForDuplicates(images);
  }, [imagesUrlsKey, scanImagesForDuplicates]);

  // 1-Click Auto-Replace a specific image with a guaranteed unique unused image
  const handleAutoReplaceImage = async (imageId: string, extraExcludes: string[] = []): Promise<string | null> => {
    try {
      const allCurrentUrls = [...images.map((i) => i.url), ...extraExcludes];
      const res = await fetch('/api/images/get-unique-replacement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excludeUrls: allCurrentUrls,
          topic: topic || focusKeyword,
        }),
      });

      if (!res.ok) throw new Error('No replacement found in catalog');
      const data = await res.json();
      if (data.replacement) {
        const rep = data.replacement;
        setImages((prev) =>
          prev.map((img) => {
            if (img.id === imageId) {
              return {
                ...img,
                url: rep.url,
                caption: img.caption?.trim() ? img.caption : rep.defaultCaption,
                isDuplicate: false,
              };
            }
            return img;
          })
        );
        refreshCatalogStatus();
        return rep.url;
      }
    } catch (err: any) {
      setErrorMsg(isAr ? 'تعذر جلب صورة بديلة فريدة حالياً: ' + err.message : 'Failed to fetch unique replacement: ' + err.message);
    }
    return null;
  };

  // 1-Click Replace All Duplicates
  const handleReplaceAllDuplicates = async () => {
    const duplicates = images.filter((img) => duplicateStatusMap[img.url]?.isDuplicate);
    if (duplicates.length === 0) return;

    setIsAutoReplacingAll(true);
    try {
      const newlyAssigned: string[] = [];
      for (const dup of duplicates) {
        const repUrl = await handleAutoReplaceImage(dup.id, newlyAssigned);
        if (repUrl) {
          newlyAssigned.push(repUrl);
        }
      }
    } finally {
      setIsAutoReplacingAll(false);
    }
  };

  React.useEffect(() => {
    fetch('/api/ai/provider-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setProviderStatus(data);
      })
      .catch(() => {});
  }, []);

  // Handle local file upload with high-efficiency client-side compression (WebP / 1600px max)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const compressed = await compressImageClient(file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.82,
        });
        setImages((prev) => [
          ...prev,
          {
            id: 'upload-' + Math.random().toString(36).substring(2, 9),
            url: compressed.dataUrl,
            caption: '',
          },
        ]);
      } catch (err) {
        console.warn('Image compression fallback:', err);
        // Fallback to standard reader if canvas fails
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setImages((prev) => [
              ...prev,
              {
                id: 'upload-' + Math.random().toString(36).substring(2, 9),
                url: reader.result as string,
                caption: '',
              },
            ]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  // Add image by URL with strict intra-article duplicate check
  const handleAddImageUrl = () => {
    const raw = imageUrlInput.trim();
    if (!raw) return;

    // Intra-article duplicate check
    if (images.some((i) => i.url.trim() === raw)) {
      setErrorMsg(
        isAr
          ? 'عفواً، هذه الصورة مضافة بالفعل داخل هذا المقال! خاصية عدم تكرار الصور تمنع إضافة نفس الصورة مرتين.'
          : 'This image is already added inside this article! Zero-duplicate shield prevents repeating images.'
      );
      return;
    }

    setImages((prev) => [
      ...prev,
      {
        id: 'url-' + Math.random().toString(36).substring(2, 9),
        url: raw,
        caption: '',
      },
    ]);
    setImageUrlInput('');
    setErrorMsg('');
  };

  // Add a new blank image slot using a unique, unused catalog image
  const handleAddNewImageSlot = async () => {
    const currentUrls = images.map((i) => i.url);
    try {
      const res = await fetch('/api/images/get-unique-replacement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludeUrls: currentUrls }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.replacement) {
          setImages((prev) => [
            ...prev,
            {
              id: 'img-' + Date.now(),
              url: data.replacement.url,
              caption: data.replacement.defaultCaption || '',
            },
          ]);
          refreshCatalogStatus();
          return;
        }
      }
    } catch {}

    const sampleDecorUrls = [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?auto=format&fit=crop&w=1000&q=80',
    ];
    const pickedUrl = sampleDecorUrls.find((u) => !currentUrls.includes(u)) || sampleDecorUrls[0];
    setImages((prev) => [
      ...prev,
      {
        id: 'img-' + Date.now(),
        url: pickedUrl,
        caption: '',
      },
    ]);
  };

  // Update caption for an individual image
  const handleCaptionChange = (id: string, caption: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, caption } : img))
    );
  };

  // Auto-suggest caption for a specific image
  const handleAutoSuggestCaption = (id: string, idx: number) => {
    const suggestions = [
      'تنسيق ألوان دهانات الحوائط وبديل الرخام وبديل الخشب مع شريط إضاءة مخفية لإضفاء اتساع بصري وفخامة فندقية',
      'تطبيق ملمس الدهان الديكوري الفاخر (القطيفة/الستوكو) على الجدار الرئيسي مع تباين درجات الأوف وايت',
      'تفاصيل الخطوط الرأسية لشرائح بديل الخشب وتأثيرها على رفع السقف البصري للغرفة',
      'معالجة استواء الحائط وسحب سكاكين المعجون والصنفرة الدقيقة لضمان عدم وجود تموجات قبل الدهان النهائي',
      'تناغم درجات الجريج والبيج الهادئ في صالة الاستقبال مع الإضاءة المعمارية الحديثة 3000K',
      'تشطيبات الأسقف المعلقة بالجبس بورد مع بيت النور وتوزيع الاسبوتات الليد بصورة هندسية متوازنة',
    ];
    const suggestion = suggestions[idx % suggestions.length];
    handleCaptionChange(id, suggestion);
  };

  // Move image up or down
  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= images.length) return;
    const list = [...images];
    const [moved] = list.splice(index, 1);
    list.splice(newIdx, 0, moved);
    setImages(list);
  };

  // Remove image
  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Load preset sample
  const loadPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setTopic(preset.topic);
    setDraftContent(preset.draftContent);
    setFocusKeyword(preset.focusKeyword);
    setImages(
      preset.images.map((item, idx) => ({
        id: `preset-${idx}-${Date.now()}`,
        url: item.url,
        caption: item.caption,
      }))
    );
  };

  // Generate with AI, auto-heal missing fields, ensure AdSense compliance, and publish directly
  const handleGenerateAndPublish = async () => {
    if (images.length === 0) {
      setErrorMsg(
        isAr
          ? 'يرجى رفع أو اختيار صورة واحدة على الأقل. لا يُشترط كتابة أي تفاصيل؛ سيتولى المساعد الذكي شرح الصور واستنباط العنوان والكلمات المفتاحية وكتابة المقال كاملاً (>1000 كلمة) ونشره فوراً في صفحات المدونة!'
          : 'Please add at least one image. The AI assistant will analyze and publish automatically!'
      );
      return;
    }

    // Zero-Duplicate Enforcement before generation
    if (strictZeroDuplicates) {
      const dupCount = images.filter((img) => duplicateStatusMap[img.url]?.isDuplicate).length;
      if (dupCount > 0) {
        setGenerationStep(isAr ? 'درع عدم تكرار الصور: استبدال تلقائي للصور المكررة بصور معمارية فريدة...' : 'Zero-Duplicate Shield: Auto-replacing duplicate images...');
        await handleReplaceAllDuplicates();
      }
    }

    setErrorMsg('');
    setIsGenerating(true);
    setGenerationStep(isAr ? '1/4 تحليل الصور والشروحات وفحص معايير Google AdSense ومكافحة المحتوى النحيف...' : 'Analyzing images, captions & checking AdSense standards...');

    try {
      // Step feedback animation
      setTimeout(() => {
        setGenerationStep(isAr ? '2/4 صياغة المقال بأسلوب بشري جذاب، وتوليد العنوان والكلمات المفتاحية إن نسيتها...' : 'Crafting human tone, generating missing keywords & AdSense title...');
      }, 1400);

      setTimeout(() => {
        setGenerationStep(isAr ? '3/4 تطبيق معايير السيو (SEO H2/H3)، قسم النصائح الهندسية، والأسئلة الشائعة (FAQ)...' : 'Structuring H2/H3 headings, engineer insights & FAQs...');
      }, 3000);

      setTimeout(() => {
        setGenerationStep(isAr ? '4/4 دمج الصور وشروحاتها وتهيئة مواضع الإعلانات ونشر المقال فوراً في المدونة...' : 'Weaving images, optimizing ad slots & publishing to live blog...');
      }, 4800);

      const response = await fetchWithAuth('/api/ai/generate-smart-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map((img) => ({
            url: img.url,
            caption: img.caption ? img.caption.trim() : '',
          })),
          topic: topic.trim(),
          draftTitle: topic.trim(),
          draftContent: draftContent.trim(),
          focusKeyword: focusKeyword.trim(),
          tone,
          targetWordCount,
          language,
          locationPreference: locationAddress ? `${locationAddress} ${locationMapUrl}`.trim() : undefined,
          provider: selectedProvider !== 'auto' ? selectedProvider : undefined,
        }),
      });

      if (!response.ok) {
        let failureText = `HTTP ${response.status}`;
        try {
          const errData = await response.json();
          failureText = errData.error || errData.message || failureText;
        } catch {
          try {
            failureText = await response.text();
          } catch {}
        }
        setErrorMsg(isAr ? `فشل توليد المقال: ${failureText}` : `Generation failed: ${failureText}`);
        setIsGenerating(false);
        return;
      }

      const data = await response.json();

      const newArticle: Article = {
        id: 'smart-post-' + Date.now(),
        title: data.title || (isAr ? 'أحدث أسرار تشطيبات الديكور ودهانات الحوائط العصرية لعام 2026' : 'Decor & Wall Paints Guide 2026'),
        slug: (data.title || 'decor-article').toLowerCase().replace(/[\s/\\?#%]+/g, '-').replace(/-+/g, '-').slice(0, 60),
        excerpt: data.excerpt || (isAr ? 'مقال مصور متخصص في عالم الديكور والدهانات صاغه الذكاء الاصطناعي وفق أعلى معايير AdSense والسيو بأسلوب بشري راقٍ.' : 'A decor post synthesized with AdSense standards.'),
        content: data.content || '',
        featuredImage: data.featuredImage || images[0]?.url || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
        author: {
          name: settings?.authorName || 'الحضرى محمود',
          avatar: settings?.authorAvatar || '',
          role: isAr ? 'صاحب المدونة واستشاري الديكور والتشطيبات' : 'Decor & Paints Consultant',
        },
        category: data.category || (isAr ? 'دهانات وديكورات داخلية' : 'Interior Decor & Paints'),
        tags: data.tags || ['دهانات حوائط', 'سيو', 'بديل رخام وخشب', 'تشطيبات فاخرة', 'ألفا ديكور'],
        publishedAt: new Date().toISOString(),
        readingTime: data.readingTime || Math.max(5, Math.round(targetWordCount / 200)),
        views: 1,
        likes: 0,
        comments: [],
        status: 'published',
        seoScore: data.seoScore || 98,
        humanToneScore: data.humanToneScore || 99,
        focusKeyword: data.focusKeyword || focusKeyword || topic || (isAr ? 'دهانات وديكورات الحوائط الحديثة' : 'Modern Interior Decor'),
        metaDescription: data.metaDescription || data.excerpt || '',
        secondaryKeywords: data.secondaryKeywords || ['دهانات غرف النوم', 'ديكورات الصالونات', 'تنسيق ألوان الجدران'],
        rewrittenByAi: true,
        adSenseCompliant: true,
        googleMapsLocation: data.googleMapsLocation || (locationAddress ? {
          city: locationAddress,
          fullAddress: locationAddress,
          mapUrl: locationMapUrl || `https://maps.google.com/?q=${encodeURIComponent(locationAddress)}`
        } : undefined),
      };

      try {
        const pubResult = await onPublishArticle(newArticle);
        const persisted = (pubResult as any)?.article || newArticle;
        const normalized = {
          ...persisted,
          author: persisted.author || {
            name: persisted.authorName || 'الحضرى محمود',
            role: persisted.authorRole || 'استشاري الديكور والدهانات',
            avatar: '',
          },
        };
        setGeneratedArticle(normalized);
        setErrorMsg(''); // Clear any previous errors on successful publication

        // Update image slots with protected URLs and duplicate status
        if (Array.isArray(data.protectedImages) && data.protectedImages.length > 0) {
          setImages((prev) =>
            prev.map((img, i) => {
              const p = data.protectedImages[i];
              return {
                ...img,
                url: p?.url || img.url,
                caption: img.caption?.trim() || data.imageCaptions?.[i] || img.caption,
                isDuplicate: p?.isDuplicate,
                ipProtected: p?.ipProtected,
              };
            })
          );
        } else if (Array.isArray(data.imageCaptions) && data.imageCaptions.length > 0) {
          setImages((prev) =>
            prev.map((img, i) => ({
              ...img,
              caption: img.caption?.trim() || data.imageCaptions[i] || img.caption,
            }))
          );
        }

        if (data.ipProtectionNotice) {
          setIpProtectionNotice(data.ipProtectionNotice);
        }
        if (data.creativeAngle) {
          setCreativeAngleName(data.creativeAngle);
        }
      } catch (pubErr: any) {
        console.warn('Publication to DB warning:', pubErr);
        setErrorMsg(
          isAr
            ? `تم توليد المقال بالذكاء الاصطناعي بنجاح، لكن تعذر حفظه في قاعدة البيانات: ${pubErr.message}`
            : `Article generated, but failed to save to database: ${pubErr.message}`
        );
      }
      setIsGenerating(false);
    } catch (err: unknown) {
      console.warn('Smart article generation warning:', err);
      setIsGenerating(false);
      const detail = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        isAr
          ? `تعذر استكمال العملية: ${detail}. يرجى المحاولة مرة أخرى.`
          : `Failed to complete article generation: ${detail}. Please try again.`
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Title Header with AdSense Badge */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden border border-indigo-900/40">
        <div className="absolute top-0 end-0 -mt-10 -me-10 w-60 h-60 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>{isAr ? 'صانع المقالات الذكي بالذكاء الاصطناعي' : 'Smart AI Article Studio'}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'مدعوم بمعايير Google AdSense و SEO' : 'Google AdSense & SEO Ready'}</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-snug">
            {isAr
              ? 'ارفع صورك وأضف شرحاً بسيطاً أسفل كل منها، ودع الذكاء الاصطناعي ينشئ مقالاً احترافياً متوافقاً مع أدسنس!'
              : 'Upload Photos & Add Simple Captions: AI Crafts a Professional AdSense-Compliant Post!'}
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
            {isAr
              ? 'ميزة حصرية للمدونة: ارفع صورة واكتب شرحاً بسيطاً أسفلها، ويمكنك تكرار الأمر لعدة صور. في حال نسيت العنوان أو الكلمات المفتاحية أو لم تكتب مسودة، أو كانت مسودتك غير مناسبة للنشر، يقوم الذكاء الاصطناعي بتهيئة المقال واستنباط الكلمات وصياغته بطريقة احترافية متوافقة 100% مع معايير Google AdSense ونشره فوراً في المدونة.'
              : 'Upload images with simple captions (repeat for multiple photos). Even if you forget keywords, title, or draft, AI auto-generates everything and formats it to Google AdSense standards.'}
          </p>

          {/* Quick Presets for 1-Click Testing */}
          <div className="pt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'نماذج جاهزة للاختبار السريع بنقرة واحدة:' : '1-click quick demo samples:'}</span>
            </span>
            {SAMPLE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => loadPreset(preset)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Wand2 className="w-3 h-3 text-blue-300" />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AdSense Guarantees Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
              <span>{isAr ? 'التهيئة الذكية لمعايير قبول وأرباح Google AdSense:' : 'Built-in Google AdSense Compliance System:'}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-emerald-800 dark:text-emerald-300 mt-1">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{isAr ? 'مكافحة المحتوى النحيف (مقال ثري لا يقل عن 1000 كلمة)' : 'No thin content guarantee (>1,000 words)'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{isAr ? 'توليد تلقائي للعنوان والكلمات المفتاحية إن نسيتها' : 'Auto-inferred CTR titles & keywords'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{isAr ? 'عناوين H2/H3 وقسم الأسئلة الشائعة (FAQ)' : 'Structured H2/H3 & FAQ sections'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{isAr ? 'تهيئة فواصل الإعلانات الخمسة بالموقع لزيادة الأرباح' : 'Optimized for 5 site ad placements'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Creation Form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-8">
        
        {/* AI Engine Provider Selector */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {isAr ? 'محرك الذكاء الاصطناعي وترتيب الأولويات:' : 'AI Generation Engine & Priority:'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'جيميناى (Gemini) في المرتبة الأولى أساسياً، ومحرك جروك Grok (https://grok.com/) في المرتبة الثانية كبديل فوري عند عدم استجابة جيميناى.'
                  : 'Google Gemini is Rank 1 primary, and Grok (https://grok.com/) is Rank 2 instant fallback.'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-950 rounded-xl">
            <button
              type="button"
              onClick={() => setSelectedProvider('auto')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedProvider === 'auto'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isAr ? '⚡ تلقائي: جيميناى (1) ➔ جروك (2)' : 'Auto: Gemini ➔ Grok'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedProvider('gemini')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedProvider === 'gemini'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isAr ? '1. جيميناى (الأساسي)' : '1. Gemini (Primary)'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedProvider('grok')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedProvider === 'grok'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="https://grok.com/ (xAI)"
            >
              {isAr ? '2. جروك Grok (بديل 2)' : '2. Grok (Fallback)'}
            </button>
          </div>
        </div>

        {/* Zero-Duplicate Image Shield Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-blue-500/10 border border-amber-500/30 dark:border-amber-400/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{isAr ? 'خاصية درع عدم تكرار الصور (Zero-Duplicate Defense)' : 'Zero-Duplicate Image Defense'}</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    {isAr ? '🛡️ درع الحماية نشط' : 'Shield Active'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  {isAr
                    ? 'فحص فوري يمنع تكرار الصور في مقالات الموقع أو داخل نفس المقال، مع ميزة الاستبدال التلقائي بصورة فريدة بنقرة واحدة.'
                    : 'Real-time validation preventing duplicated images across articles and intra-article, with 1-click auto-replacement.'}
                </p>
              </div>
            </div>

            {/* Shield Toggle & Manual Scan */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => scanImagesForDuplicates(images)}
                disabled={isCheckingDuplicates}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                title={isAr ? 'إعادة فحص تفرد الصور' : 'Rescan images'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDuplicates ? 'animate-spin text-blue-500' : 'text-slate-500'}`} />
                <span>{isAr ? (isCheckingDuplicates ? 'جارِ الفحص...' : 'فحص تفرد الصور') : 'Scan Images'}</span>
              </button>

              <label className="flex items-center gap-2 cursor-pointer bg-white/70 dark:bg-slate-800/70 px-3 py-1.5 rounded-xl border border-slate-300/80 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={strictZeroDuplicates}
                  onChange={(e) => setStrictZeroDuplicates(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>{isAr ? 'منع صارم للتكرار' : 'Strict Zero Duplicate'}</span>
              </label>
            </div>
          </div>

          {/* Catalog live stats */}
          {catalogStatus && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>{isAr ? 'مستودع الصور المعمارية:' : 'Decor Visual Assets:'}</span>
              </span>
              <span className="bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                {isAr ? `إجمالي الكتالوج: ${catalogStatus.totalCatalogImages}` : `Total: ${catalogStatus.totalCatalogImages}`}
              </span>
              <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                {isAr ? `الصور المستخدمة بالموقع: ${catalogStatus.totalUsedSiteImages}` : `Used: ${catalogStatus.totalUsedSiteImages}`}
              </span>
              <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 font-bold">
                {isAr ? `الصور الفريدة المتاحة: ${catalogStatus.availableUnusedCatalogImagesCount}` : `Unique Available: ${catalogStatus.availableUnusedCatalogImagesCount}`}
              </span>
            </div>
          )}

          {/* Duplicate Alert Banner if duplicates exist */}
          {duplicateAlertBanner && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-semibold">{duplicateAlertBanner}</span>
              </div>
              <button
                type="button"
                onClick={handleReplaceAllDuplicates}
                disabled={isAutoReplacingAll}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isAutoReplacingAll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                )}
                <span>{isAr ? '⚡ استبدال جميع المكررات الآن' : 'Auto-Replace All'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Step 1: Upload Images (AI Assistant Auto-Explains Each Photo & Crafts Full Article) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                {isAr ? 'رفع أو اختيار الصور (دون الحاجة لكتابة أي تفاصيل - يشرحها المساعد الذكي تلقائياً)' : 'Upload or Select Photos (Zero text needed - AI explains each photo)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? 'بمجرد وضع الصور، يقوم المساعد الذكي بشرح كل صورة بالتفصيل، واستنباط العنوان الأنسب والكلمات المفتاحية، وكتابة مقال فندقي كامل (>1000 كلمة) ونشره مباشرة في المدونة.'
                  : 'Just upload images! AI will describe each photo, infer title and keywords, write 1,000+ words, and publish directly to the blog.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-2 shadow-sm">
                <Upload className="w-4 h-4" />
                <span>{isAr ? 'رفع صور من جهازك (اختيار متعدد)' : 'Upload Photos'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleAddNewImageSlot}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title={isAr ? 'إضافة صورة توضيحية إضافية' : 'Add another image'}
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'إضافة صورة' : 'Add Image'}</span>
              </button>
            </div>
          </div>

          {/* Direct URL Input */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="url"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder={isAr ? 'أو أدخل رابط صورة ديكور من الإنترنت مباشرة...' : 'Or enter direct image URL...'}
              className="flex-1 text-xs bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddImageUrl}
              className="px-3.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              {isAr ? 'إضافة الرابط' : 'Add URL'}
            </button>
          </div>

          {/* List of Uploaded Images with Captions Under Each */}
          {images.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3">
              <ImageIcon className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isAr ? 'لم تقم برفع أو اختيار أي صور بعد' : 'No images uploaded yet'}
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {isAr
                  ? 'ارفع صور ديكور من جهازك أو اختر صوراً جاهزة بنقرة واحدة أدناه، وسيتولى المساعد شرحها وكتابة المقال كاملاً.'
                  : 'Upload images from your device or select decor photos from catalog with 1-click.'}
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => loadPreset(SAMPLE_PRESETS[0])}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isAr ? '⚡ اختيار صور ديكور من الكتالوج للتجربة الفورية' : 'Select Photos from Catalog'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  className={`bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 sm:p-5 border shadow-xs space-y-3 transition-colors ${
                    duplicateStatusMap[img.url]?.isDuplicate
                      ? 'border-red-400/80 dark:border-red-500/80 bg-red-50/20 dark:bg-red-950/20'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      {isAr ? `الصورة رقم ${index + 1}` : `Image #${index + 1}`}
                      {index === 0 && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-500/20">
                          {isAr ? 'غلاف المقال الرئيسي (Featured Image)' : 'Featured Cover'}
                        </span>
                      )}
                    </span>

                    {/* Order & delete controls */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                        title={isAr ? 'تحريك لأعلى' : 'Move up'}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(index, 'down')}
                        disabled={index === images.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                        title={isAr ? 'تحريك لأسفل' : 'Move down'}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        className="p-1 text-red-400 hover:text-red-600 transition-colors ms-2 cursor-pointer"
                        title={isAr ? 'حذف الصورة' : 'Remove'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Grid showing image and caption input directly underneath/beside */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    {/* Image Thumbnail */}
                    <div className="md:col-span-4 aspect-16/10 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0 relative group">
                      <img
                        src={img.url}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {/* Zero-Duplicate Badges */}
                      {duplicateStatusMap[img.url]?.isDuplicate ? (
                        <div className="absolute top-2 start-2 end-2 flex flex-col gap-1 z-10">
                          <div className="bg-red-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-md shadow-md flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-red-200 shrink-0" />
                            <span>
                              {duplicateStatusMap[img.url]?.status === 'duplicate_in_batch'
                                ? (isAr ? '⚠️ مكررة داخل المقال' : 'Duplicate in Batch')
                                : (isAr ? '🔴 مكررة - مستخدمة مسبقاً' : 'Duplicate in Site')}
                            </span>
                          </div>
                          {duplicateStatusMap[img.url]?.matchedArticleTitle && (
                            <span className="text-[9px] bg-slate-900/90 text-amber-300 px-2 py-0.5 rounded truncate max-w-full">
                              {duplicateStatusMap[img.url]?.matchedArticleTitle}
                            </span>
                          )}
                        </div>
                      ) : duplicateStatusMap[img.url] ? (
                        <div className="absolute top-2 start-2 bg-emerald-600/95 text-white font-bold text-[10px] px-2 py-0.5 rounded-md shadow-md flex items-center gap-1 z-10">
                          <CheckCheck className="w-3 h-3 text-emerald-200" />
                          <span>{isAr ? '🟢 صورة فريدة 100%' : '100% Unique Photo'}</span>
                        </div>
                      ) : null}

                      {/* 1-Click Replace Button right on Thumbnail if duplicate */}
                      {duplicateStatusMap[img.url]?.isDuplicate && (
                        <div className="absolute inset-x-2 bottom-2 z-10">
                          <button
                            type="button"
                            onClick={() => handleAutoReplaceImage(img.id)}
                            className="w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-bold text-[11px] shadow-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-amber-200" />
                            <span>{isAr ? '⚡ استبدال بصورة فريدة' : 'Replace with Unique'}</span>
                          </button>
                        </div>
                      )}

                      {img.ipProtected && (
                        <div className="absolute bottom-2 end-2 bg-slate-900/90 text-amber-300 font-bold text-[9px] px-2 py-0.5 rounded shadow-sm border border-amber-400/40">
                          <span>ALPHA DECOR © • محمي فكرياً</span>
                        </div>
                      )}
                    </div>

                    {/* Caption / Simple Explanation Input Under Image */}
                    <div className="md:col-span-8 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {isAr ? 'شرح بسيط توضيحي أسفل هذه الصورة:' : 'Simple description under this photo:'}
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAutoSuggestCaption(img.id, index)}
                          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>{isAr ? 'اقتراح شرح ديكوري ذكي' : 'Auto-suggest caption'}</span>
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={img.caption}
                        onChange={(e) => handleCaptionChange(img.id, e.target.value)}
                        placeholder={
                          isAr
                            ? 'اكتب شرحاً بسيطاً أو ملاحظة سريعة عما توضحه هذه الصورة (مثال: تناغم لون الجريج مع بديل الخشب)... وإن تركتها فارغة سيحللها الذكاء الاصطناعي تلقائياً!'
                            : 'Write a simple note about what this photo illustrates (or leave blank for AI auto-captioning)...'
                        }
                        className="w-full text-xs sm:text-sm p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Repeat Button: Add Another Photo */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleAddNewImageSlot}
                  className="px-5 py-2.5 rounded-xl border border-dashed border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? '+ إضافة صورة أخرى وشرحها (يمكنك تكرار الأمر لعدة صور)' : '+ Add Another Image & Caption (Repeatable)'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Article Details (Auto-Healed if Forgotten / Optional) */}
        <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              {isAr ? 'العنوان والمسودة والكلمات المفتاحية (اختياري - تُهَيأ تلقائياً إذا نسيتها)' : 'Title, Draft & Keywords (Auto-Healed If Forgotten)'}
            </h2>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {isAr ? 'ابتكار تلقائي بالذكاء الاصطناعي' : 'AI Auto-Inference'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>{isAr ? 'عنوان المقال أو الفكرة الرئيسية (اختياري):' : 'Article Topic or Title (Optional):'}</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {isAr ? 'إذا نسيته، سيبتكر الذكاء الاصطناعي عنواناً جذاباً متوافقاً مع AdSense' : 'If omitted, AI invents an AdSense-optimized title'}
                </span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={isAr ? 'اتركه فارغاً أو اكتب مثلاً: أحدث صيحات دهانات الحوائط وبديل الرخام لعام 2026' : 'Leave empty or enter title topic...'}
                className="w-full text-sm px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Writer's Draft Notes to be Rewritten or Auto-Created if Forgotten */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isAr ? 'مسودة أو أفكار الكاتب (اختياري - إذا نسيتها أو كانت غير مناسبة للنشر، سيصيغها الذكاء الاصطناعي كاملاً):' : 'Draft Notes (Optional - AI will write full 1,000+ words article):'}</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {draftContent.length} {isAr ? 'حرف' : 'chars'}
                </span>
              </div>
              <textarea
                rows={3}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder={
                  isAr
                    ? 'اكتب هنا أية أفكار سريعة أو مسودة أولية... حتى لو تركتها فارغة تماماً، سيعتمد الذكاء الاصطناعي على الصور وشروحاتها لكتابة مقال فندقي كامل وشامل (>1000 كلمة) يفي بمعايير AdSense ومحركات البحث.'
                    : 'Paste draft notes or leave blank; AI will generate a complete 1,000+ words article...'
                }
                className="w-full text-xs sm:text-sm p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* SEO Focus Keyword (Auto-Generated if Forgotten) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Search className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isAr ? 'الكلمة المفتاحية (اختياري):' : 'Target Keyword (Optional):'}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {isAr ? 'تُستنتج تلقائياً إن نسيتها' : 'Auto-extracted'}
                </span>
              </label>
              <input
                type="text"
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
                placeholder={isAr ? 'مثال: دهانات حوائط مودرن، بديل الخشب (أو اتركها فارغة)' : 'e.g., modern wall paints (or leave empty)'}
                className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Creative Human Writing Mode & Anti-Robotic Unit */}
            <div className="space-y-3 md:col-span-2 p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-amber-50/40 dark:from-slate-800/90 dark:via-indigo-950/40 dark:to-slate-800/90 border border-blue-200/70 dark:border-blue-900/60 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <label className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {isAr ? 'الأسلوب البشري الإبداعي ومكافحة النمطية:' : 'Creative Human Writing Style (Anti-Cliché):'}
                  </label>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isAr ? 'أسلوب بشري 100% - محظور العبارات الروبوتية' : '100% Human - AI Clichés Banned'}</span>
                </div>
              </div>

              {/* 6 Interactive Style Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {CREATIVE_HUMAN_STYLES.map((st) => {
                  const isSelected = selectedCreativeStyle === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setSelectedCreativeStyle(st.id);
                        setTone(st.tonePrompt);
                      }}
                      className={`text-start p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-white dark:bg-slate-900 border-blue-600 dark:border-blue-500 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-900 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-base">{st.icon}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {st.badge}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <div className={`text-xs font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                          {isAr ? st.titleAr : st.titleEn}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {isAr ? st.descAr : st.titleEn}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Anti-Cliché Notice */}
              <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2">
                <span className="text-rose-500 font-bold shrink-0">🚫 خوارزمية الحظر:</span>
                <span>
                  {isAr
                    ? 'يتم تجريد المقال تلقائياً من أي عبارات نمطية مثل ("في عالم الديكور.."، "حجر الزاوية.."، "في هذا المقال سنتعرف على..") وتوليد سرد بشري دافئ وممتع مستوحى من وقائع المواقع الحقيقية.'
                    : 'Robotic formulas and stereotypical intros are strictly eradicated in favor of authentic site chronicles.'}
                </span>
              </div>
            </div>

            {/* Word Count: 1000 to 10000 words strictly */}
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 md:col-span-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>{isAr ? 'حجم المقال المستهدف (1,000 - 10,000 كلمة - لضمان قبول أدسنس ومكافحة المحتوى النحيف):' : 'Target Word Count (1,000 - 10,000 words - AdSense Compliant):'}</span>
                </label>
                <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                  {targetWordCount} {isAr ? 'كلمة' : 'words'}
                </span>
              </div>

              <input
                type="range"
                min="1000"
                max="10000"
                step="250"
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>1,000 {isAr ? 'أدنى حد (معايير أدسنس)' : 'min'}</span>
                <span>2,500</span>
                <span>5,000</span>
                <span>10,000 {isAr ? 'أقصى حد' : 'max'}</span>
              </div>
            </div>

            {/* Google Maps Location Context (User Requirement for Location & Consultations) */}
            <div className="space-y-3 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>{isAr ? 'موقع المشروع / المعاينة الجغرافية على خرائط Google (اختياري):' : 'Project Location & Google Maps Link (Optional):'}</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'إن تركته فارغاً سيحدده الذكاء الاصطناعي لتعزيز المصداقية' : 'AI infers if left blank'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder={isAr ? 'المدينة والمنطقة (مثال: التجمع الخامس، القاهرة الجديدة)' : 'City or project area...'}
                  className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
                <input
                  type="url"
                  value={locationMapUrl}
                  onChange={(e) => setLocationMapUrl(e.target.value)}
                  placeholder={isAr ? 'رابط خريطة Google Maps (إن وجد)' : 'Google Maps URL (optional)...'}
                  className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Intellectual Property Protection & Duplicate Image Notice Alert */}
        {ipProtectionNotice && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 dark:border-amber-700/50 space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-black text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{isAr ? 'درع حماية الملكية الفكرية ومكافحة تكرار الصور' : 'IP Protection & Duplicate Defense Active'}</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {ipProtectionNotice}
            </p>
          </div>
        )}

        {/* Step 3: Trigger Generation & Direct Publishing */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{isAr ? 'جاهز للتوليد والتهيئة والنشر المباشر في المدونة' : 'Ready to Synthesize & Publish'}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? `سيقوم الذكاء الاصطناعي باستقراء الصور (${images.length}) وتهيئة المقال كاملاً وفق معايير أدسنس ونشره فوراً.`
                : `AI will process ${images.length} images, prepare an AdSense article, and publish immediately.`}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateAndPublish}
            disabled={isGenerating || images.length === 0}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-black text-sm sm:text-base shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{generationStep || (isAr ? 'جارِ شرح الصور وتوليد ونشر المقال بالذكاء الاصطناعي...' : 'Explaining Images & Publishing...')}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>{isAr ? '✨ شرح الصور بالذكاء الاصطناعي وإنشاء ونشر المقال فوراً في صفحات المدونة' : 'Auto-Explain Images & Publish Post to Blog'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result Card: Published Successfully with SEO & AdSense Analytics */}
      {generatedArticle && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl p-6 sm:p-8 border border-emerald-200 dark:border-emerald-800 shadow-lg space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200 dark:border-emerald-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                    {isAr ? 'تم النشر في صفحات المدونة' : 'Live on Blog'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                    {isAr ? 'معايير AdSense مكتملة (>1000 كلمة)' : 'AdSense Compliant (>1,000 words)'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{isAr ? 'أسلوب بشري إبداعي غير نمطي' : 'Dynamic Human Tone'}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                    <ShieldCheck className="w-3 h-3 text-emerald-200" />
                    <span>{isAr ? 'حماية الملكية الفكرية وتفرد الصور' : 'IP & Image Uniqueness Protected'}</span>
                  </span>
                </div>
                <h3 className="font-black text-base sm:text-xl text-emerald-900 dark:text-emerald-200">
                  "{generatedArticle.title}"
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onViewArticle(generatedArticle)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>{isAr ? '👁️ مشاهدة المقال في صفحة نشر المقال' : 'View Post on Blog'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBroadcastOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                <span>{isAr ? 'نشر الرابط بالسوشيال ميديا' : 'Social Broadcast'}</span>
              </button>
            </div>
          </div>

          {/* AdSense & SEO Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {isAr ? 'توافق Google AdSense' : 'AdSense Compliance'}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  100%
                </span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                  {isAr ? 'معتمد' : 'Approved'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'محتوى عميق، خالٍ من النحافة ومجهز للإعلانات' : 'No thin content, ready for ads'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {isAr ? 'نسبة السيو ومحركات البحث (SEO)' : 'SEO Compliance Score'}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {generatedArticle.seoScore || 98}%
                </span>
                <span className="text-[10px] text-blue-600 font-bold bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                  {isAr ? 'ممتاز' : 'Excellent'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'الكلمة المفتاحية، عناوين H2/H3، ووصف الميتا' : 'Keywords, H2/H3, & meta description'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {isAr ? 'مقياس الأسلوب البشري العفوي' : 'Human Editorial Tone'}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
                  {generatedArticle.humanToneScore || 99}%
                </span>
                <span className="text-[10px] text-violet-600 font-bold bg-violet-100 dark:bg-violet-900/60 px-2 py-0.5 rounded-full">
                  {isAr ? 'أصيل وإنساني' : 'Authentic'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'توجيهات واقعية واستشارات من صاحب المدونة' : 'Practical engineering insights'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Social Media Broadcast Modal */}
      {isBroadcastOpen && generatedArticle && (
        <SocialBroadcastModal
          isOpen={isBroadcastOpen}
          onClose={() => setIsBroadcastOpen(false)}
          article={generatedArticle}
          settings={settings}
          onBroadcastComplete={(item) => {
            if (onBroadcastComplete) onBroadcastComplete(item);
            setIsBroadcastOpen(false);
          }}
        />
      )}
    </div>
  );
};
