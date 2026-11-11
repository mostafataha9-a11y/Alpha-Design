export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // Markdown formatted with images, headings, lists
  featuredImage: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  category: string;
  tags: string[];
  publishedAt: string;
  readingTime: number; // in minutes
  views: number;
  likes: number;
  comments: Comment[];
  status: 'published' | 'draft';
  isAutoPublished?: boolean;
  autoImagesCount?: number;
  imageCaptions?: string[];
  // SEO & Human-Tone AI Metadata
  seoScore?: number; // e.g., 96/100
  humanToneScore?: number; // e.g., 98/100
  focusKeyword?: string;
  metaDescription?: string;
  secondaryKeywords?: string[];
  rewrittenByAi?: boolean;
  adSenseCompliant?: boolean;
  googleMapsLocation?: {
    city?: string;
    area?: string;
    fullAddress?: string;
    mapUrl?: string;
  };
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  createdAt: string;
  likes: number;
}

export interface SocialLinks {
  facebook: string;
  twitter: string; // X
  instagram: string;
  linkedin: string;
  youtube: string;
  github: string;
  tiktok: string;
  whatsapp: string;
  telegram: string;
}

export interface AutoPublishConfig {
  enabled: boolean;
  frequencyHours: number; // default 24
  lastPublishedAt: string;
  targetWordCount: number; // e.g., 750
  wordsPerImageRatio: number; // e.g. 250 words per image
  selectedTopics: string[];
  language: 'ar' | 'en';
}

export interface BroadcastHistoryItem {
  id: string;
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  timestamp: string;
  networks: string[];
  status: 'published' | 'simulated';
  summary?: string;
}

export interface SocialBroadcastConfig {
  isDelegated: boolean; // تفويض صاحب المدونة للبوت
  delegationDate?: string;
  autoBroadcastOnPublish: boolean;
  activeNetworks: ('twitter' | 'facebook' | 'linkedin' | 'telegram' | 'whatsapp')[];
  customHashtags: string;
  history: BroadcastHistoryItem[];
}

export interface ServicePricingItem {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  description: string;
  basePrice: number; // السعر المحدد من صاحب المدونة
  minNegotiatedPrice: number; // أدنى سعر يقبل به البوت في التفاوض
  currency: string;
  deliveryDays: number;
  unit: string;
  features: string[];
  popular?: boolean;
}

export interface AgreedDeal {
  dealId: string;
  service: string;
  agreedPrice: string;
  originalPrice?: string;
  savings?: string;
  scope?: string;
  clientNeeds?: string;
  deliveryDays?: number;
  timestamp: string;
}

export interface AssistantNegotiationConfig {
  enabled: boolean;
  assistantName: string;
  ownerPhone: string; // للتواصل التليفوني المباشر (tel:+...)
  ownerWhatsApp: string; // للتواصل التلقائي عبر واتساب
  currency: string;
  welcomePitch: string;
  maxDiscountPercent: number; // أقصى خصم للتفاوض
  services: ServicePricingItem[];
}

export interface SiteSettings {
  blogName: string;
  blogNameEn: string;
  tagline: string;
  taglineEn: string;
  authorName: string;
  authorBio: string;
  authorAvatar: string; // If empty or removed, uses elegant monogram badge
  articlesPerPage: number; // strictly between 3 and 10!
  language: 'ar' | 'en';
  direction: 'rtl' | 'ltr';
  socialLinks: SocialLinks;
  autoPublish: AutoPublishConfig;
  socialBroadcast: SocialBroadcastConfig;
  assistantNegotiation: AssistantNegotiationConfig;
  customEmbeddedCode?: {
    enabled: boolean;
    fileName?: string;
    content: string;
    fileType?: string;
    updatedAt?: string;
    targetPlacement?: 'head' | 'body' | 'settings' | 'sidebar' | 'footer';
  };
  themeColor: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'slate';
  fontFamily: 'cairo' | 'inter';
  ads?: SiteAdsSettings;
  socialPublishingBot?: SocialPublishingBotConfig;
  developerCredit?: {
    enabled?: boolean;
    name?: string;
    email?: string;
  };
}

export type AdPlacementId = 'header' | 'sidebar' | 'articleTop' | 'articleMiddle' | 'articleBottom';

export interface SmartAdConfig {
  id: AdPlacementId;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  enabled: boolean;
  type: 'code' | 'image' | 'custom_banner'; // كود برمجي، أو صورة بنر، أو كارت إعلاني مخصص
  code: string; // كود AdSense أو HTML أو JS
  imageUrl?: string; // رابط صورة البنر
  targetUrl?: string; // رابط الوصول عند النقر
  altText?: string;
  sponsorName?: string; // اسم الراعي أو المعلن
  badgeText?: string; // شارة الإعلان (إعلان ممول / شريك معتمد / برعاية)
  aiAutoFit: boolean; // التهيئة الذكية التلقائية للأبعاد (True)
  maxHeight?: number; // أقصى ارتفاع مسموح به بالبكسل
  aspectRatio?: 'auto' | '16:9' | '4:1' | '728:90' | '300:250' | '300:600';
  customStyles?: string;
}

export interface SiteAdsSettings {
  enabled: boolean;
  adSensePublisherId?: string; // e.g. pub-XXXXXXXXXXXXXXXX (or ca-pub-XXXXXXXXXXXXXXXX)
  adSenseVerified?: boolean;
  adsTxtCustomEntries?: string[];
  header: SmartAdConfig;
  sidebar: SmartAdConfig;
  articleTop: SmartAdConfig;
  articleMiddle: SmartAdConfig;
  articleBottom: SmartAdConfig;
}

export type DecorPlatform = 'facebook' | 'telegram' | 'whatsapp' | 'instagram' | 'twitter' | 'linkedin' | 'pinterest';

export interface DecorSocialTargetChannel {
  id: string;
  name: string;
  url: string;
  platform: DecorPlatform;
  channelType: 'group' | 'page' | 'channel' | 'account' | 'community';
  hasPostingPermission: boolean; // إذن النشر والتسجيل معتمد
  privacyVerified: boolean; // تم فحص شروط الخصوصية والسياسات
  status: 'active' | 'paused';
  specialization: string; // تخصص الدهانات والديكور (دهانات، بديل رخام، جبس، تشطيب)
  postsCount: number;
  lastPostedAt?: string;
  addedAt: string;
}

export interface SocialDispatchLogItem {
  id: string;
  timestamp: string;
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  articleUrl: string;
  targetChannelId: string;
  targetChannelName: string;
  targetPlatform: DecorPlatform;
  postSnippet: string;
  privacyCheckPassed: boolean;
  ageHoursAtPublish: number;
  status: 'published' | 'skipped_expired_24h' | 'rate_limited' | 'policy_warning';
  notes: string;
}

export interface SocialPublishingBotConfig {
  enabled: boolean;
  intervalMinutes: number; // دوري كل 30 دقيقة
  maxArticleAgeHours: number; // 24 ساعة كحد أقصى للمقال الواحد
  lastDispatchAt: string;
  nextDispatchAt: string;
  privacyComplianceRules: {
    antiSpamEnforced: boolean;
    checkTermsBeforePost: boolean;
    customDecorIntro: boolean;
    includeDecorHashtags: boolean;
  };
  targetChannels: DecorSocialTargetChannel[];
  dispatchHistory: SocialDispatchLogItem[];
}

export type PublicTab = 'home' | 'articles' | 'about' | 'contact' | 'privacy' | 'terms' | 'article-detail';
export type BackendSubTab = 'overview' | 'settings' | 'admin-security' | 'ads' | 'analytics' | 'contractor-notebook' | 'smart-creator' | 'manual-creator' | 'auto-publish' | 'social-bot' | 'social-broadcast' | 'manage-articles' | 'supervisors';
export type ActiveTab = PublicTab | 'backend' | 'settings' | 'smart-creator' | 'manual-creator' | 'auto-publish';

export interface ArticleAnalyticsItem {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  category: string;
  author: string;
  date: string;
  views: number;
  likes: number;
  commentsCount: number;
  readTime: string;
  trafficSharePercent: number;
  engagementRatePercent: number;
  status: 'published' | 'draft';
}

export interface AdAnalyticsItem {
  id: AdPlacementId;
  nameAr: string;
  nameEn: string;
  slotLocation: string;
  sponsorName: string;
  type: string;
  enabled: boolean;
  impressions: number;
  clicks: number;
  ctr: number;
  performanceGrade: 'excellent' | 'good' | 'average';
  badgeText: string;
}

export interface BlogAnalyticsSummary {
  totalBlogViews: number;
  uniqueVisitors: number;
  totalArticlesCount: number;
  totalLikes: number;
  totalComments: number;
  averageReadTimeMinutes: number;
  totalAdImpressions: number;
  totalAdClicks: number;
  overallAdCtr: number;
  deviceBreakdown: { labelAr: string; labelEn: string; percent: number; count: number }[];
  sourceBreakdown: { labelAr: string; labelEn: string; percent: number; count: number }[];
  weeklyTrend: { dayAr: string; date: string; views: number; uniqueVisitors: number }[];
  articles: ArticleAnalyticsItem[];
  ads: AdAnalyticsItem[];
}

export interface AdminUser {
  name: string;
  role: 'owner' | 'supervisor';
  email: string;
  isLoggedIn: boolean;
  mustChangePassword?: boolean;
}

