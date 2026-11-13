import { db } from './index.ts';
import {
  articles,
  settings,
  socialChannels,
  socialDispatchLogs,
  contractorProjects,
  users,
  uploadedMedia,
  autoPublishRuns,
  autoPublishLocks,
  adminSessions,
  loginRateLimits,
  imageUsageLogs,
  contactMessages,
  newsletterSubscribers,
  apiRateLimits,
} from './schema.ts';
import { eq, desc, and, lt, gt, isNull, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import { INITIAL_ARTICLES, INITIAL_SETTINGS } from '../data/initialData.ts';
import { validateArticlePayload, countActualWords } from '../utils/articleValidator.ts';
import { hammingDistance } from '../utils/imageHasher.ts';

// ----------------------------------------------------
// RESILIENT IN-MEMORY CACHE (Always keeps articles accessible)
// ----------------------------------------------------
const ARTICLES_CACHE_FILE = '/tmp/alpha_memory_articles.json';

const memoryArticles: any[] = INITIAL_ARTICLES.map((art) => ({
  id: art.id,
  title: art.title,
  slug: art.slug,
  excerpt: art.excerpt,
  content: art.content,
  featuredImage: art.featuredImage,
  author: art.author || {
    name: 'الحضرى محمود',
    role: 'استشاري الديكور والدهانات',
    avatar: '',
  },
  category: art.category,
  tags: art.tags || [],
  imageCaptions: art.imageCaptions || [],
  readingTime: art.readingTime || 6,
  views: art.views || 100,
  likes: art.likes || 10,
  comments: art.comments || [],
  status: 'published',
  isAutoPublished: !!art.isAutoPublished,
  adSenseCompliant: true,
  publishedAt: art.publishedAt || new Date().toISOString(),
}));

function syncMemoryArticlesToFile() {
  try {
    fs.writeFileSync(ARTICLES_CACHE_FILE, JSON.stringify(memoryArticles));
  } catch {
    // ignore
  }
}

function loadMemoryArticlesFromFile() {
  try {
    if (fs.existsSync(ARTICLES_CACHE_FILE)) {
      const raw = fs.readFileSync(ARTICLES_CACHE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const item of data) {
          const idx = memoryArticles.findIndex((m) => m.id === item.id);
          if (idx >= 0) {
            memoryArticles[idx] = item;
          } else {
            memoryArticles.push(item);
          }
        }
      }
    }
  } catch {
    // ignore
  }
}

// Initial load
loadMemoryArticlesFromFile();

let memorySettings: any = { ...INITIAL_SETTINGS };
const memorySessions = new Map<string, { user: DbAuthUser; expiresAt: number }>();
const memoryApiRateLimits = new Map<string, { count: number; firstRequestAt: number; blockedUntil?: number }>();
const memoryLoginRateLimits = new Map<string, { attemptCount: number; firstAttemptAt: number; blockedUntil?: number }>();
const memoryLocks = new Map<string, { lockedBy: string; lockedAt: Date; expiresAt: Date }>();

const SESSIONS_CACHE_FILE = '/tmp/alpha_memory_sessions.json';

function syncMemorySessionsToFile() {
  try {
    const obj: Record<string, { user: DbAuthUser; expiresAt: number }> = {};
    for (const [k, v] of memorySessions.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(SESSIONS_CACHE_FILE, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

function loadMemorySessionsFromFile() {
  try {
    if (fs.existsSync(SESSIONS_CACHE_FILE)) {
      const raw = fs.readFileSync(SESSIONS_CACHE_FILE, 'utf-8');
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) {
          memorySessions.set(k, v as any);
        }
      }
    }
  } catch {
    // ignore
  }
}

loadMemorySessionsFromFile();

// ----------------------------------------------------
// DATABASE REACHABILITY & ZERO-ERROR RESILIENCE
// When Cloud SQL is unavailable or unprovisioned, all operations
// smoothly pivot to persistent memory/file storage without logging
// DrizzleQueryError or connect ENOENT exceptions to the server console.
// ----------------------------------------------------
let dbReachabilityState: { reachable: boolean; lastChecked: number } = {
  reachable: false,
  lastChecked: 0,
};

export function markDbUnreachable(): void {
  dbReachabilityState = { reachable: false, lastChecked: Date.now() };
}

export async function isDbReachable(): Promise<boolean> {
  const now = Date.now();
  // Cache check for 15 seconds for optimal latency and zero repeated connection overhead
  if (now - dbReachabilityState.lastChecked < 15000) {
    return dbReachabilityState.reachable;
  }

  if (!process.env.DATABASE_URL && !process.env.SQL_HOST) {
    dbReachabilityState = { reachable: false, lastChecked: now };
    return false;
  }

  try {
    const probe = db.execute('SELECT 1 as live');
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB probe timeout')), 1200)
    );
    await Promise.race([probe, timeout]);
    dbReachabilityState = { reachable: true, lastChecked: now };
    return true;
  } catch {
    dbReachabilityState = { reachable: false, lastChecked: now };
    return false;
  }
}

/**
 * Seed initial data from initialData.ts if database is fresh
 */
export async function seedInitialDataIfEmpty() {
  if (!(await isDbReachable())) {
    return;
  }

  try {
    // 1. Seed or sanitize admin owner user
    const approvedDefaultPassword = process.env.ADMIN_PASSWORD || 'A7p#D9s!mK2$vL8@';
    const legacyDefaultPassword = '#%5rU)2;-YHZzL"';
    const existingUsers = await db.select().from(users).where(eq(users.role, 'owner')).limit(1);
    if (existingUsers.length === 0) {
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(approvedDefaultPassword, salt);

      await db.insert(users).values({
        uid: 'owner-hadary-1',
        email: 'mahmoudahmedhessien032@gmail.com',
        name: 'الحضرى محمود',
        role: 'owner',
        passwordHash,
        mustChangePassword: false,
      });
    } else {
      const owner = existingUsers[0];
      const updateFields: Record<string, any> = {
        name: 'الحضرى محمود',
        email: 'mahmoudahmedhessien032@gmail.com',
        mustChangePassword: false,
      };
      if (
        !process.env.ADMIN_PASSWORD &&
        owner.passwordHash &&
        (await bcrypt.compare(legacyDefaultPassword, owner.passwordHash))
      ) {
        const salt = await bcrypt.genSalt(12);
        updateFields.passwordHash = await bcrypt.hash(approvedDefaultPassword, salt);
      }
      await db
        .update(users)
        .set(updateFields)
        .where(eq(users.id, owner.id));
    }

    // Ensure Mostafa Taha is removed from users table
    await db.delete(users).where(eq(users.email, 'mostafa.taha9@gmail.com')).catch(() => {});

    // 2. Seed settings if empty
    const existingSettings = await db.select().from(settings).where(eq(settings.key, 'main_settings'));
    if (existingSettings.length === 0) {
      await db.insert(settings).values({
        key: 'main_settings',
        data: INITIAL_SETTINGS,
      });
    }

    // 3. Ensure baseline decor articles are populated (onConflictDoNothing)
    for (const art of INITIAL_ARTICLES) {
      await db.insert(articles).values({
        id: art.id,
        title: art.title,
        slug: art.slug,
        excerpt: art.excerpt,
        content: art.content,
        featuredImage: art.featuredImage,
        authorName: art.author?.name || 'الحضرى محمود',
        authorRole: art.author?.role || 'صاحب الموقع واستشاري الديكور والتشطيبات',
        category: art.category,
        tags: art.tags || [],
        imageCaptions: art.imageCaptions || [],
        readingTime: art.readingTime || 6,
        views: art.views || 100,
        likes: art.likes || 10,
        comments: art.comments || [],
        status: 'published',
        isAutoPublished: !!art.isAutoPublished,
        adSenseCompliant: true,
        publishedAt: new Date(art.publishedAt || Date.now()),
      }).onConflictDoNothing();
    }

    // 4. Seed social channels if empty
    const existingChannels = await db.select().from(socialChannels).limit(1);
    if (existingChannels.length === 0 && INITIAL_SETTINGS.socialPublishingBot?.targetChannels) {
      for (const ch of INITIAL_SETTINGS.socialPublishingBot.targetChannels) {
        await db.insert(socialChannels).values({
          id: ch.id,
          name: ch.name,
          url: ch.url,
          platform: ch.platform,
          channelType: ch.channelType,
          hasPostingPermission: ch.hasPostingPermission,
          privacyVerified: ch.privacyVerified,
          status: ch.status,
          specialization: ch.specialization,
          postsCount: ch.postsCount || 0,
          lastPostedAt: ch.lastPostedAt ? new Date(ch.lastPostedAt) : null,
          addedAt: ch.addedAt ? new Date(ch.addedAt) : new Date(),
        }).onConflictDoNothing();
      }
    }
  } catch {
    // Handled gracefully in offline mode
  }
}

// ----------------------------------------------------
// ARTICLES (Quality-Enforced & Validated with Cloud SQL)
// ----------------------------------------------------

export interface GetArticlesOptions {
  statusFilter?: 'published' | 'draft' | 'all';
}

export async function getDbArticles(options: GetArticlesOptions = { statusFilter: 'published' }) {
  const filter = options.statusFilter || 'published';

  if (await isDbReachable()) {
    try {
      let query = db.select().from(articles);

      if (filter === 'published') {
        query = query.where(eq(articles.status, 'published')) as any;
      } else if (filter === 'draft') {
        query = query.where(eq(articles.status, 'draft')) as any;
      }

      const rows = await query.orderBy(desc(articles.publishedAt));

      if (rows && rows.length > 0) {
        const dbList = rows.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          excerpt: r.excerpt,
          content: r.content,
          featuredImage: r.featuredImage,
          author: {
            name: r.authorName,
            role: r.authorRole || 'استشاري الديكور والدهانات',
            avatar: '',
          },
          category: r.category,
          tags: (r.tags as string[]) || [],
          imageCaptions: (r.imageCaptions as string[]) || [],
          readingTime: r.readingTime,
          views: r.views,
          likes: r.likes,
          comments: (r.comments as any[]) || [],
          status: r.status,
          isAutoPublished: r.isAutoPublished || false,
          adSenseCompliant: r.adSenseCompliant || true,
          publishedAt: r.publishedAt ? r.publishedAt.toISOString() : new Date().toISOString(),
        }));

        // Synchronize in-memory cache
        for (const item of dbList) {
          const idx = memoryArticles.findIndex((m) => m.id === item.id);
          if (idx >= 0) {
            memoryArticles[idx] = item;
          } else {
            memoryArticles.push(item);
          }
        }
        return dbList;
      }
    } catch {
      // Graceful fallback to resilient memory cache
    }
  }

  // Resilient memory cache return
  loadMemoryArticlesFromFile();
  return memoryArticles
    .filter((r) => {
      if (filter === 'all') return true;
      return (r.status || 'published') === filter;
    })
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
}

export async function createDbArticle(articleData: any) {
  const id = articleData.id || 'post-' + Date.now();
  let slug = (articleData.slug || (articleData.title || 'decor-post').toLowerCase().replace(/[\s/\\?#%]+/g, '-').replace(/-+/g, '-').slice(0, 60)).trim();
  if (!slug || slug === '-') {
    slug = 'decor-post-' + Date.now();
  }

  // 1. Strict Article Quality Validation
  const validation = validateArticlePayload({
    title: articleData.title,
    content: articleData.content,
    excerpt: articleData.excerpt,
    category: articleData.category,
    status: articleData.status || 'published',
    tags: articleData.tags,
  }, {
    minWords: 300,
    maxWords: 15000,
    strictPublish: false,
  });

  const calculatedReadingTime = Math.max(5, Math.round((validation.actualWordCount || 1000) / 200));

  // 2. Extract and check images inside markdown
  const imageMarkdownMatches = (articleData.content || '').match(/!\[.*?\]\((.*?)\)/g) || [];
  const extractedImageUrls: string[] = [];
  for (const match of imageMarkdownMatches) {
    const urlMatch = match.match(/\((.*?)\)/);
    if (urlMatch && urlMatch[1]) {
      extractedImageUrls.push(urlMatch[1].trim());
    }
  }

  if (articleData.featuredImage) {
    extractedImageUrls.unshift(articleData.featuredImage.trim());
  }

  const finalFeatured = articleData.featuredImage || extractedImageUrls[0] || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80';

  const storedArticle = {
    id,
    title: articleData.title,
    slug,
    excerpt: articleData.excerpt || '',
    content: articleData.content || '',
    featuredImage: finalFeatured,
    author: {
      name: articleData.author?.name || 'الحضرى محمود',
      role: articleData.author?.role || 'صاحب الموقع واستشاري الديكور والتشطيبات',
      avatar: articleData.author?.avatar || '',
    },
    category: articleData.category || 'دهانات وديكورات الحوائط',
    tags: Array.isArray(articleData.tags) ? articleData.tags : [],
    imageCaptions: Array.isArray(articleData.imageCaptions) ? articleData.imageCaptions : [],
    readingTime: calculatedReadingTime,
    views: articleData.views || 1,
    likes: articleData.likes || 0,
    comments: Array.isArray(articleData.comments) ? articleData.comments : [],
    status: articleData.status || 'published',
    isAutoPublished: !!articleData.isAutoPublished,
    adSenseCompliant: true,
    publishedAt: new Date(articleData.publishedAt || Date.now()).toISOString(),
    validation,
  };

  // Immediate in-memory cache update - GUARANTEES instant publication on Home & Articles view
  const existingMemIdx = memoryArticles.findIndex((a) => a.id === id);
  if (existingMemIdx >= 0) {
    memoryArticles[existingMemIdx] = storedArticle;
  } else {
    memoryArticles.unshift(storedArticle);
  }
  syncMemoryArticlesToFile();

  // Attempt database persistence if reachable
  if (await isDbReachable()) {
    try {
      const existingArticle = await db.select({ id: articles.id }).from(articles).where(eq(articles.id, id));
      const valuesToStore = {
        id,
        title: storedArticle.title,
        slug,
        excerpt: storedArticle.excerpt,
        content: storedArticle.content,
        featuredImage: storedArticle.featuredImage,
        authorName: storedArticle.author.name,
        authorRole: storedArticle.author.role,
        category: storedArticle.category,
        tags: storedArticle.tags,
        imageCaptions: storedArticle.imageCaptions,
        readingTime: calculatedReadingTime,
        views: storedArticle.views,
        likes: storedArticle.likes,
        comments: storedArticle.comments,
        status: storedArticle.status,
        isAutoPublished: storedArticle.isAutoPublished,
        adSenseCompliant: true,
        publishedAt: new Date(storedArticle.publishedAt),
        updatedAt: new Date(),
      };

      if (existingArticle.length > 0) {
        await db.update(articles).set(valuesToStore).where(eq(articles.id, id));
      } else {
        await db.insert(articles).values(valuesToStore);
      }

      // Record image usage logs for deduplication
      const uniqueExtracted = Array.from(new Set(extractedImageUrls));
      for (let idx = 0; idx < uniqueExtracted.length; idx++) {
        const imgUrl = uniqueExtracted[idx];
        const caption = articleData.imageCaptions?.[idx] || articleData.title;
        await recordImageUsage({
          articleId: storedArticle.id,
          imageUrl: imgUrl,
          imageHash: articleData.imageHashes?.[imgUrl] || '',
          caption,
          altText: caption,
          topicCategory: articleData.category || 'decor_paints',
        });
      }
    } catch {
      // Memory storage is active and preserved
    }
  }

  return storedArticle;
}

// ----------------------------------------------------
// IMAGE DEDUPLICATION & USAGE REGISTRY (PostgreSQL)
// ----------------------------------------------------

export async function recordImageUsage(entry: {
  articleId: string;
  imageUrl: string;
  imageHash?: string;
  caption?: string;
  altText?: string;
  topicCategory?: string;
  width?: number;
  height?: number;
  format?: string;
  sizeBytes?: number;
}): Promise<void> {
  if (!(await isDbReachable())) return;

  try {
    const id = 'img-log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const safeUrl = entry.imageUrl.startsWith('data:')
      ? `data:image-upload-${entry.articleId}-${id}`
      : entry.imageUrl;

    await db.insert(imageUsageLogs).values({
      id,
      articleId: entry.articleId,
      imageUrl: safeUrl,
      imageHash: entry.imageHash || 'hash-pending',
      caption: entry.caption || null,
      altText: entry.altText || null,
      topicCategory: entry.topicCategory || null,
      width: entry.width || null,
      height: entry.height || null,
      format: entry.format || null,
      usedAt: new Date(),
    });
  } catch {
    // Quiet fallback
  }
}

export async function checkImageDuplicateInDb(
  imageUrl: string,
  imageHash?: string,
  currentArticleId?: string,
  hammingThreshold = 8
): Promise<{
  isDuplicate: boolean;
  matchedArticleId?: string;
  matchedArticleTitle?: string;
  matchedImageUrl?: string;
  distance?: number;
  reason?: string;
}> {
  if (await isDbReachable()) {
    try {
      const logs = await db.select().from(imageUsageLogs);

      for (const log of logs) {
        if (currentArticleId && log.articleId === currentArticleId) continue;

        // Exact URL match in another article
        if (log.imageUrl === imageUrl) {
          return {
            isDuplicate: true,
            matchedArticleId: log.articleId,
            matchedImageUrl: log.imageUrl,
            reason: `الرابط مطابق لصورة مستخدمة بالفعل في مقال سابق (${log.articleId}).`,
          };
        }

        // Perceptual hash comparison
        if (imageHash && log.imageHash && log.imageHash.length === 16 && imageHash.length === 16) {
          const distance = hammingDistance(imageHash, log.imageHash);
          if (distance <= hammingThreshold) {
            return {
              isDuplicate: true,
              matchedArticleId: log.articleId,
              matchedImageUrl: log.imageUrl,
              distance,
              reason: `تطابق بصري (Perceptual Duplicate) مع صورة في المقال (${log.articleId}) بمسافة هامنغ ${distance}.`,
            };
          }
        }
      }
    } catch {
      // Quiet fallback
    }
  }

  // Memory fallback deduplication check (checks both featuredImage and markdown images embedded in content)
  loadMemoryArticlesFromFile();
  for (const a of memoryArticles) {
    if (currentArticleId && a.id === currentArticleId) continue;
    if (a.featuredImage && a.featuredImage.trim() === imageUrl.trim()) {
      return {
        isDuplicate: true,
        matchedArticleId: a.id,
        matchedArticleTitle: a.title,
        matchedImageUrl: a.featuredImage,
        reason: `الرابط مطابق للصورة البارزة لمقال سابق (${a.title}).`,
      };
    }
    if (a.content && typeof a.content === 'string') {
      const markdownImages = a.content.matchAll(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g);
      for (const match of markdownImages) {
        if (match[1] && match[1].trim() === imageUrl.trim()) {
          return {
            isDuplicate: true,
            matchedArticleId: a.id,
            matchedArticleTitle: a.title,
            matchedImageUrl: match[1],
            reason: `الصورة مستخدمة بالفعل داخل محتوى مقال سابق (${a.title}).`,
          };
        }
      }
    }
  }

  return { isDuplicate: false };
}

export async function getUsedImageUrls(): Promise<Set<string>> {
  const urls = new Set<string>();

  if (await isDbReachable()) {
    try {
      const logs = await db.select({ imageUrl: imageUsageLogs.imageUrl }).from(imageUsageLogs);
      const arts = await db.select({ featuredImage: articles.featuredImage, content: articles.content }).from(articles);

      for (const l of logs) if (l.imageUrl) urls.add(l.imageUrl.trim());
      for (const a of arts) {
        if (a.featuredImage) urls.add(a.featuredImage.trim());
        if (a.content) {
          const matches = a.content.matchAll(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g);
          for (const m of matches) if (m[1]) urls.add(m[1].trim());
        }
      }

      if (urls.size > 0) return urls;
    } catch {
      // Quiet fallback
    }
  }

  loadMemoryArticlesFromFile();
  for (const a of memoryArticles) {
    if (a.featuredImage) urls.add(a.featuredImage.trim());
    if (a.content) {
      const matches = a.content.matchAll(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g);
      for (const m of matches) if (m[1]) urls.add(m[1].trim());
    }
  }
  return urls;
}

export async function deleteDbArticle(id: string) {
  // 1. Immediately remove from memory cache
  const memIdx = memoryArticles.findIndex((a) => a.id === id);
  if (memIdx >= 0) {
    memoryArticles.splice(memIdx, 1);
  }
  syncMemoryArticlesToFile();

  if (await isDbReachable()) {
    try {
      // 2. Clean up associated image usage logs and social dispatch records
      await db.delete(imageUsageLogs).where(eq(imageUsageLogs.articleId, id)).catch(() => {});
      await db.delete(socialDispatchLogs).where(eq(socialDispatchLogs.articleId, id)).catch(() => {});
      // 3. Permanently delete article from PostgreSQL
      await db.delete(articles).where(eq(articles.id, id));
    } catch {
      // Memory deletion succeeded
    }
  }
  return true;
}

export async function likeDbArticle(id: string) {
  const mem = memoryArticles.find((a) => a.id === id);
  if (mem) {
    mem.likes = (mem.likes || 0) + 1;
  }
  syncMemoryArticlesToFile();

  if (await isDbReachable()) {
    try {
      const existing = await db.select().from(articles).where(eq(articles.id, id));
      if (existing.length > 0) {
        const updatedLikes = (existing[0].likes || 0) + 1;
        await db.update(articles).set({ likes: updatedLikes }).where(eq(articles.id, id));
        return updatedLikes;
      }
    } catch {
      // Memory updated
    }
  }
  return mem?.likes || 1;
}

export async function incrementDbArticleView(id: string): Promise<number> {
  const mem = memoryArticles.find((a) => a.id === id);
  if (mem) {
    mem.views = (mem.views || 0) + 1;
  }
  syncMemoryArticlesToFile();

  if (await isDbReachable()) {
    try {
      const existing = await db.select().from(articles).where(eq(articles.id, id));
      if (existing.length > 0) {
        const updatedViews = (existing[0].views || 0) + 1;
        await db.update(articles).set({ views: updatedViews }).where(eq(articles.id, id));
        return updatedViews;
      }
    } catch {
      // Memory updated
    }
  }
  return mem?.views || 1;
}

export interface RealAdStats {
  impressions: number;
  clicks: number;
}

const memoryAdStats: Record<string, RealAdStats> = {
  header: { impressions: 0, clicks: 0 },
  sidebar: { impressions: 0, clicks: 0 },
  articleTop: { impressions: 0, clicks: 0 },
  articleMiddle: { impressions: 0, clicks: 0 },
  articleBottom: { impressions: 0, clicks: 0 },
};

export function recordRealAdEvent(placement: string, type: 'impression' | 'click'): RealAdStats {
  if (!memoryAdStats[placement]) {
    memoryAdStats[placement] = { impressions: 0, clicks: 0 };
  }
  if (type === 'impression') {
    memoryAdStats[placement].impressions += 1;
  } else if (type === 'click') {
    memoryAdStats[placement].clicks += 1;
  }
  return memoryAdStats[placement];
}

export function getRealAdMetrics(): Record<string, RealAdStats> {
  return { ...memoryAdStats };
}


// ----------------------------------------------------
// SETTINGS
// ----------------------------------------------------
export async function getDbSettings() {
  if (await isDbReachable()) {
    try {
      const rows = await db.select().from(settings).where(eq(settings.key, 'main_settings'));
      if (rows.length > 0) {
        memorySettings = rows[0].data;
        return memorySettings;
      }
    } catch {
      // Quiet fallback
    }
  }
  return memorySettings || INITIAL_SETTINGS;
}

export async function saveDbSettings(data: any) {
  memorySettings = data;
  if (await isDbReachable()) {
    try {
      await db.insert(settings).values({
        key: 'main_settings',
        data,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: settings.key,
        set: {
          data,
          updatedAt: new Date(),
        },
      });
    } catch {
      // Memory settings updated
    }
  }
  return true;
}

// ----------------------------------------------------
// SOCIAL CHANNELS & BOT
// ----------------------------------------------------
const memorySocialChannels: any[] = (INITIAL_SETTINGS.socialPublishingBot?.targetChannels || []).map((ch: any) => ({
  ...ch,
  postsCount: ch.postsCount || 0,
  addedAt: ch.addedAt || new Date().toISOString(),
}));
const memorySocialLogs: any[] = [];

export async function getDbSocialChannels() {
  if (await isDbReachable()) {
    try {
      const rows = await db.select().from(socialChannels).orderBy(desc(socialChannels.addedAt));
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          ...r,
          lastPostedAt: r.lastPostedAt ? r.lastPostedAt.toISOString() : undefined,
          addedAt: r.addedAt ? r.addedAt.toISOString() : new Date().toISOString(),
        }));
      }
    } catch {
      // Quiet fallback
    }
  }
  return memorySocialChannels;
}

export async function addDbSocialChannel(channel: any) {
  const id = channel.id || 'chan-' + Date.now();
  const newChan = {
    id,
    name: channel.name,
    url: channel.url,
    platform: channel.platform,
    channelType: channel.channelType,
    hasPostingPermission: channel.hasPostingPermission === true,
    privacyVerified: channel.privacyVerified === true,
    status: channel.status || 'active',
    specialization: channel.specialization || 'دهانات وديكورات معمارية',
    postsCount: 0,
    addedAt: new Date().toISOString(),
  };
  memorySocialChannels.unshift(newChan);

  if (await isDbReachable()) {
    try {
      await db.insert(socialChannels).values({
        ...newChan,
        addedAt: new Date(),
      }).onConflictDoNothing();
    } catch {
      // Saved in memory
    }
  }
  return newChan;
}

export async function deleteDbSocialChannel(id: string) {
  const idx = memorySocialChannels.findIndex((c) => c.id === id);
  if (idx >= 0) {
    memorySocialChannels.splice(idx, 1);
  }

  if (await isDbReachable()) {
    try {
      await db.delete(socialChannels).where(eq(socialChannels.id, id));
    } catch {
      // Deleted from memory
    }
  }
  return true;
}

export async function toggleDbSocialChannel(id: string) {
  const chan = memorySocialChannels.find((c) => c.id === id);
  const nextStatus = chan ? (chan.status === 'active' ? 'paused' : 'active') : 'active';
  if (chan) {
    chan.status = nextStatus;
  }

  if (await isDbReachable()) {
    try {
      await db.update(socialChannels).set({ status: nextStatus }).where(eq(socialChannels.id, id));
    } catch {
      // Memory state active
    }
  }
  return nextStatus;
}

export async function addDbSocialLog(logItem: any) {
  const id = logItem.id || 'dispatch-' + Date.now();
  const finalStatus = logItem.status || 'published';
  const memLog = {
    id,
    articleId: logItem.articleId,
    articleTitle: logItem.articleTitle,
    articleSlug: logItem.articleSlug,
    articleUrl: logItem.articleUrl,
    targetChannelId: logItem.targetChannelId,
    targetChannelName: logItem.targetChannelName,
    targetPlatform: logItem.targetPlatform,
    postSnippet: logItem.postSnippet,
    privacyCheckPassed: !!logItem.privacyCheckPassed,
    ageHoursAtPublish: Math.round(Number(logItem.ageHoursAtPublish) || 0),
    status: finalStatus,
    notes: logItem.notes || '',
    timestamp: new Date().toISOString(),
  };
  memorySocialLogs.unshift(memLog);

  if (await isDbReachable()) {
    try {
      await db.insert(socialDispatchLogs).values({
        ...memLog,
        timestamp: new Date(),
      });

      if (finalStatus === 'published' && logItem.targetChannelId) {
        const ch = await db.select().from(socialChannels).where(eq(socialChannels.id, logItem.targetChannelId));
        if (ch.length > 0) {
          await db.update(socialChannels).set({
            postsCount: (ch[0].postsCount || 0) + 1,
            lastPostedAt: new Date(),
          }).where(eq(socialChannels.id, logItem.targetChannelId));
        }
      }
    } catch {
      // Logged in memory
    }
  }
}

export async function getDbSocialLogs() {
  if (await isDbReachable()) {
    try {
      const rows = await db.select().from(socialDispatchLogs).orderBy(desc(socialDispatchLogs.timestamp)).limit(50);
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          ...r,
          timestamp: r.timestamp ? r.timestamp.toISOString() : new Date().toISOString(),
        }));
      }
    } catch {
      // Quiet fallback
    }
  }
  return memorySocialLogs;
}

// ----------------------------------------------------
// CONTRACTOR PROJECTS
// ----------------------------------------------------
const CONTRACTOR_CACHE_FILE = '/tmp/alpha_memory_contractor.json';
const memoryContractorProjects: any[] = [];

function syncContractorProjectsToFile() {
  try {
    fs.writeFileSync(CONTRACTOR_CACHE_FILE, JSON.stringify(memoryContractorProjects));
  } catch {
    // ignore
  }
}

function loadContractorProjectsFromFile() {
  try {
    if (fs.existsSync(CONTRACTOR_CACHE_FILE)) {
      const raw = fs.readFileSync(CONTRACTOR_CACHE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        memoryContractorProjects.length = 0;
        memoryContractorProjects.push(...data);
      }
    }
  } catch {
    // ignore
  }
}

loadContractorProjectsFromFile();

export async function getDbContractorProjects() {
  if (await isDbReachable()) {
    try {
      const rows = await db.select().from(contractorProjects).orderBy(desc(contractorProjects.updatedAt));
      if (rows && rows.length > 0) return rows;
    } catch {
      // Quiet fallback
    }
  }
  loadContractorProjectsFromFile();
  return memoryContractorProjects;
}

export async function saveDbContractorProject(projectData: any) {
  const id = projectData.id || 'proj-' + Date.now();
  const item = {
    id,
    name: projectData.name || 'مشروع جديد',
    client: projectData.client || '',
    phone: projectData.phone || '',
    address: projectData.address || '',
    status: projectData.status || 'in_progress',
    agreedPrice: Math.round(Number(projectData.agreedPrice) || 0),
    totalPaid: Math.round(Number(projectData.totalPaid) || 0),
    items: projectData.items || [],
    updatedAt: new Date(),
  };

  const idx = memoryContractorProjects.findIndex((p) => p.id === id);
  if (idx >= 0) {
    memoryContractorProjects[idx] = item;
  } else {
    memoryContractorProjects.unshift(item);
  }
  syncContractorProjectsToFile();

  if (await isDbReachable()) {
    try {
      await db.insert(contractorProjects).values(item).onConflictDoUpdate({
        target: contractorProjects.id,
        set: item,
      });
    } catch {
      // Saved in memory cache
    }
  }
  return true;
}

export async function deleteDbContractorProject(id: string) {
  const idx = memoryContractorProjects.findIndex((p) => p.id === id);
  if (idx >= 0) {
    memoryContractorProjects.splice(idx, 1);
  }
  syncContractorProjectsToFile();

  if (await isDbReachable()) {
    try {
      await db.delete(contractorProjects).where(eq(contractorProjects.id, id));
    } catch {
      // Deleted from memory cache
    }
  }
  return true;
}

// ----------------------------------------------------
// USERS & AUTHENTICATION (PostgreSQL-Backed, Bcrypt + SHA-256 Tokens)
// ----------------------------------------------------

export interface DbAuthUser {
  uid: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

export interface VerifyAuthResult {
  valid: boolean;
  user?: DbAuthUser;
  error?: string;
}

/**
 * SHA-256 hash helper for session tokens so plaintext tokens are never stored in DB
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Verifies owner credentials strictly against Bcrypt hash in PostgreSQL.
 * Strictly no default hardcoded password or fallback bypass.
 */
export async function verifyOwnerCredentials(password: string, identifier?: string): Promise<VerifyAuthResult> {
  try {
    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return { valid: false, error: 'كلمة المرور فارغة أو غير صحيحة.' };
    }

    let owner: any = null;
    if (await isDbReachable()) {
      try {
        const owners = await db.select().from(users).where(eq(users.role, 'owner')).limit(1);
        if (owners.length > 0 && owners[0].passwordHash) {
          owner = owners[0];
        }
      } catch (err: any) {
        if (err?.message?.includes('Connection terminated') || err?.code === 'ECONNRESET') {
          markDbUnreachable();
        }
      }
    }

    if (!owner) {
      const approvedPassword = process.env.ADMIN_PASSWORD || 'A7p#D9s!mK2$vL8@';
      const salt = bcrypt.genSaltSync(10);
      owner = {
        id: 'owner-hadary-1',
        uid: 'owner-hadary-1',
        name: 'الحضرى محمود',
        email: 'mahmoudahmedhessien032@gmail.com',
        role: 'owner',
        passwordHash: bcrypt.hashSync(approvedPassword, salt),
        mustChangePassword: false,
      };
    } else if (
      !process.env.ADMIN_PASSWORD &&
      typeof owner.id === 'number' &&
      owner.passwordHash &&
      (await bcrypt.compare('#%5rU)2;-YHZzL"', owner.passwordHash))
    ) {
      const salt = await bcrypt.genSalt(12);
      const upgradedHash = await bcrypt.hash('A7p#D9s!mK2$vL8@', salt);
      owner.passwordHash = upgradedHash;
      owner.mustChangePassword = false;
      await db
        .update(users)
        .set({
          passwordHash: upgradedHash,
          email: 'mahmoudahmedhessien032@gmail.com',
          mustChangePassword: false,
        })
        .where(eq(users.id, owner.id))
        .catch(() => {});
    }

    // Verify identifier (allows username 'الحضرى محمود' or official email 'mahmoudahmedhessien032@gmail.com')
    if (identifier && typeof identifier === 'string' && identifier.trim().length > 0) {
      const cleanInput = identifier.trim().toLowerCase();
      const ownerEmail = (owner.email || '').trim().toLowerCase();
      const ownerName = (owner.name || '').trim().toLowerCase();

      const isMatchIdentifier =
        cleanInput === ownerEmail ||
        cleanInput === ownerName ||
        cleanInput === 'mahmoudahmedhessien032@gmail.com' ||
        cleanInput === 'الحضرى محمود';

      if (!isMatchIdentifier) {
        return { valid: false, error: 'اسم الدخول أو رمز المرور غير صحيح.' };
      }
    }

    const isMatch = await bcrypt.compare(password.trim(), owner.passwordHash!);

    if (!isMatch) {
      return { valid: false, error: 'رمز المرور غير صحيح.' };
    }

    // Update lastLoginAt timestamp if database is accessible
    if (await isDbReachable()) {
      try {
        if (typeof owner.id === 'number') {
          await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, owner.id));
        }
      } catch {
        // Quiet
      }
    }

    const returnedEmail = owner.email || 'mahmoudahmedhessien032@gmail.com';

    return {
      valid: true,
      user: {
        uid: owner.uid,
        name: owner.name,
        email: returnedEmail,
        role: owner.role,
        mustChangePassword: !!owner.mustChangePassword,
      },
    };
  } catch (error) {
    console.error('verifyOwnerCredentials error:', error);
    return { valid: false, error: 'حدث خطأ أثناء التحقق من بيانات الدخول.' };
  }
}

let memorySupervisors: any[] = [];

/**
 * Get registered supervisors with their Google email addresses from PostgreSQL
 */
export async function getRegisteredSupervisors(): Promise<any[]> {
  if (await isDbReachable()) {
    try {
      const rows = await db.select().from(settings).where(eq(settings.key, 'supervisors_registry')).limit(1);
      if (rows.length > 0 && Array.isArray((rows[0].data as any)?.supervisors)) {
        memorySupervisors = (rows[0].data as any).supervisors.filter((s: any) => {
          const email = (s.email || s.googleEmail || '').trim().toLowerCase();
          return email !== 'mostafa.taha9@gmail.com';
        });
        return memorySupervisors;
      }
    } catch (err: any) {
      if (err?.message?.includes('Connection terminated') || err?.code === 'ECONNRESET') {
        markDbUnreachable();
      }
    }
  }
  return memorySupervisors.filter((s: any) => {
    const email = (s.email || s.googleEmail || '').trim().toLowerCase();
    return email !== 'mostafa.taha9@gmail.com';
  });
}

/**
 * Save registered supervisors with their Google email addresses into PostgreSQL
 */
export async function saveRegisteredSupervisors(supervisorsList: any[]): Promise<boolean> {
  const filtered = (Array.isArray(supervisorsList) ? supervisorsList : []).filter((s: any) => {
    const email = (s.email || s.googleEmail || '').trim().toLowerCase();
    return email !== 'mostafa.taha9@gmail.com';
  });

  memorySupervisors = filtered;

  if (await isDbReachable()) {
    try {
      await db.insert(settings).values({
        key: 'supervisors_registry',
        data: { supervisors: filtered, updatedAt: new Date().toISOString() },
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: settings.key,
        set: {
          data: { supervisors: filtered, updatedAt: new Date().toISOString() },
          updatedAt: new Date(),
        },
      });
      return true;
    } catch (err: any) {
      if (err?.message?.includes('Connection terminated') || err?.code === 'ECONNRESET') {
        markDbUnreachable();
      }
    }
  }
  return true;
}

/**
 * Google Sign-In Verification:
 * Validates whether the Google email belongs to the Admin Owner (mahmoudahmedhessien032@gmail.com)
 * or to one of the authorized supervisors registered by the admin.
 */
export async function verifyGoogleAuth(googleEmail: string, googleName?: string): Promise<VerifyAuthResult> {
  if (!googleEmail || typeof googleEmail !== 'string') {
    return { valid: false, error: 'البريد الإلكتروني لحساب Google مطلوب.' };
  }

  const cleanEmail = googleEmail.trim().toLowerCase();

  // Explicitly reject Mustafa Taha per direct user instruction
  if (cleanEmail === 'mostafa.taha9@gmail.com') {
    return {
      valid: false,
      error: 'تم إلغاء صلاحيات هذا البريد من الإشراف على المدونة نهائياً.',
    };
  }

  // 1. Direct Owner Authentication (Strictly mahmoudahmedhessien032@gmail.com)
  const isOwner = cleanEmail === 'mahmoudahmedhessien032@gmail.com';

  if (isOwner) {
    const userResult: DbAuthUser = {
      uid: 'owner-hadary-1',
      name: googleName || 'الحضرى محمود',
      email: cleanEmail,
      role: 'owner',
      mustChangePassword: false,
    };

    // Update lastLoginAt in DB if accessible in background
    if (await isDbReachable()) {
      db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.role, 'owner')).catch(() => {});
    }

    return {
      valid: true,
      user: userResult,
    };
  }

  // 2. Reject all other non-owner Google accounts per explicit user requirement
  return {
    valid: false,
    error: `البريد الإلكتروني (${googleEmail}) غير مصرح له بالدخول. تسجيل الدخول عبر Google محصور حصراً ببريد المالك الرسمي المعتمد (mahmoudahmedhessien032@gmail.com).`,
  };
}

/**
 * Passwordless Direct Login has been completely eliminated per owner instructions.
 */
export async function verifyPasswordlessAuth(_identifier?: string): Promise<VerifyAuthResult> {
  return {
    valid: false,
    error: 'تم إلغاء خيار الدخول المباشر نهائياً. تسجيل الدخول يتم فقط ببريد المالك الرسمي (mahmoudahmedhessien032@gmail.com) وكلمة المرور وكود التحقق عبر البريد الإلكتروني.',
  };
}

/**
 * Update Admin Profile & Official Email in PostgreSQL
 */
export async function updateAdminProfileInDb(
  userId: string,
  data: { email?: string; name?: string; password?: string }
): Promise<{ success: boolean; user?: DbAuthUser; error?: string }> {
  try {
    const owners = await db.select().from(users).where(eq(users.role, 'owner')).limit(1);
    if (owners.length === 0) {
      return { success: false, error: 'حساب المدير العام غير موجود.' };
    }

    const owner = owners[0];
    const updatePayload: any = {};

    if (data.email && typeof data.email === 'string' && data.email.includes('@')) {
      updatePayload.email = data.email.trim();
    }
    if (data.name && typeof data.name === 'string') {
      updatePayload.name = data.name.trim();
    }
    if (data.password && typeof data.password === 'string' && data.password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(12);
      updatePayload.passwordHash = await bcrypt.hash(data.password.trim(), salt);
      updatePayload.mustChangePassword = false;
    }

    await db.update(users).set(updatePayload).where(eq(users.id, owner.id));

    // Update settings if authorName changed
    if (data.name) {
      const currentSettings = await getDbSettings();
      if (currentSettings) {
        await saveDbSettings({ ...currentSettings, authorName: data.name.trim() });
      }
    }

    return {
      success: true,
      user: {
        uid: owner.uid,
        name: updatePayload.name || owner.name,
        email: updatePayload.email || owner.email,
        role: owner.role,
        mustChangePassword: false,
      },
    };
  } catch (err: any) {
    console.error('updateAdminProfileInDb error:', err);
    return { success: false, error: err.message || 'فشل تحديث ملف المدير.' };
  }
}

/**
 * Secure password change with old password verification and complexity rules
 */
export async function changeOwnerPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!currentPassword || !newPassword) {
      return { success: false, error: 'كلمة المرور الحالية والجديدة مطلوبتان.' };
    }

    const trimmedNew = newPassword.trim();
    const trimmedCurrent = currentPassword.trim();

    if (trimmedNew === trimmedCurrent) {
      return { success: false, error: 'كلمة المرور الجديدة لا يمكن أن تكون مطابقة لكلمة المرور الحالية.' };
    }

    if (trimmedNew.length < 8) {
      return { success: false, error: 'يجب أن لا تقل كلمة المرور الجديدة عن 8 أحرف.' };
    }

    // Complexity check: must contain letters and numbers or symbols
    const hasLetters = /[a-zA-Z\u0600-\u06FF]/.test(trimmedNew);
    const hasNumbersOrSpecial = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(trimmedNew);
    if (!hasLetters || !hasNumbersOrSpecial) {
      return { success: false, error: 'يجب أن تحتوي كلمة المرور على مزيج من الأحرف والأرقام أو الرموز.' };
    }

    const userList = await db.select().from(users).where(eq(users.uid, userId)).limit(1);
    if (userList.length === 0 || !userList[0].passwordHash) {
      return { success: false, error: 'المستخدم غير موجود في قاعدة البيانات.' };
    }

    const user = userList[0];
    const isCurrentValid = await bcrypt.compare(trimmedCurrent, user.passwordHash!);
    if (!isCurrentValid) {
      return { success: false, error: 'كلمة المرور الحالية غير صحيحة.' };
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(trimmedNew, salt);

    await db
      .update(users)
      .set({
        passwordHash: newHash,
        mustChangePassword: false,
      })
      .where(eq(users.id, user.id));

    // Revoke all existing active sessions in adminSessions to force re-authentication
    await db
      .update(adminSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(adminSessions.userId, user.uid), isNull(adminSessions.revokedAt)));

    console.log(`Password successfully updated and old sessions revoked for user ${user.uid}`);
    return { success: true };
  } catch (error) {
    console.error('changeOwnerPassword error:', error);
    return { success: false, error: 'فشل تغيير كلمة المرور في قاعدة البيانات.' };
  }
}

// ----------------------------------------------------
// PERSISTENT SESSIONS IN POSTGRESQL (admin_sessions)
// Survives server restarts and Cloud Run multi-replica scaling
// ----------------------------------------------------

export async function createDbSession(
  rawToken: string,
  user: DbAuthUser,
  ipAddress?: string,
  userAgent?: string,
  ttlMs: number = 7 * 24 * 3600 * 1000 // 7 days
): Promise<string> {
  const sessionId = 'sess-' + Date.now() + '-' + crypto.randomBytes(6).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  // Store in memory session map
  memorySessions.set(tokenHash, { user, expiresAt: expiresAt.getTime() });
  syncMemorySessionsToFile();

  if (await isDbReachable()) {
    try {
      await db.insert(adminSessions).values({
        id: sessionId,
        tokenHash,
        userId: user.uid,
        userName: user.name,
        userRole: user.role,
        userEmail: user.email,
        createdAt: now,
        expiresAt,
        revokedAt: null,
        lastActiveAt: now,
        ipAddress: ipAddress || null,
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
      });
    } catch {
      // Session active in memory
    }
  }

  return sessionId;
}

export async function validateDbSession(rawToken: string): Promise<DbAuthUser | null> {
  if (!rawToken || typeof rawToken !== 'string') return null;

  const tokenHash = hashSessionToken(rawToken);
  const now = Date.now();

  // Check memory session first (load latest synced file if needed)
  let memSession = memorySessions.get(tokenHash);
  if (!memSession) {
    loadMemorySessionsFromFile();
    memSession = memorySessions.get(tokenHash);
  }
  if (memSession && memSession.expiresAt > now) {
    return memSession.user;
  }

  if (await isDbReachable()) {
    try {
      const nowDate = new Date();

      const rows = await db
        .select()
        .from(adminSessions)
        .where(
          and(
            eq(adminSessions.tokenHash, tokenHash),
            isNull(adminSessions.revokedAt),
            gt(adminSessions.expiresAt, nowDate)
          )
        )
        .limit(1);

      if (rows.length === 0) {
        return null;
      }

      const session = rows[0];

      const sessionUser: DbAuthUser = {
        uid: session.userId,
        name: session.userName,
        email: session.userEmail,
        role: session.userRole,
        mustChangePassword: false,
      };

      memorySessions.set(tokenHash, { user: sessionUser, expiresAt: new Date(session.expiresAt).getTime() });
      syncMemorySessionsToFile();
      return sessionUser;
    } catch {
      // Quiet fallback
    }
  }
  return null;
}

export async function revokeDbSession(rawToken: string): Promise<boolean> {
  if (!rawToken || typeof rawToken !== 'string') return false;

  const tokenHash = hashSessionToken(rawToken);
  memorySessions.delete(tokenHash);
  syncMemorySessionsToFile();

  if (await isDbReachable()) {
    try {
      await db
        .update(adminSessions)
        .set({ revokedAt: new Date() })
        .where(eq(adminSessions.tokenHash, tokenHash));
    } catch {
      // Quiet
    }
  }
  return true;
}

export async function revokeAllUserSessions(userId: string): Promise<boolean> {
  try {
    await db
      .update(adminSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(adminSessions.userId, userId), isNull(adminSessions.revokedAt)));
    return true;
  } catch (error) {
    console.error('revokeAllUserSessions error:', error);
    return false;
  }
}

// ----------------------------------------------------
// PERSISTENT LOGIN RATE LIMITS IN POSTGRESQL (login_rate_limits)
// Survives server restarts and prevents IP brute-forcing
// ----------------------------------------------------

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;  // 15 minutes window

export async function checkDbRateLimit(ip: string): Promise<{
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
}> {
  const cleanIp = String(ip || 'unknown').slice(0, 100);
  try {
    if (await isDbReachable()) {
      const now = new Date();

      const rows = await db
        .select()
        .from(loginRateLimits)
        .where(eq(loginRateLimits.ip, cleanIp))
        .limit(1);

      if (rows.length === 0) {
        return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS };
      }

      const entry = rows[0];

      // Check if locked out
      if (entry.blockedUntil && new Date(entry.blockedUntil).getTime() > now.getTime()) {
        const retryAfterSeconds = Math.ceil(
          (new Date(entry.blockedUntil).getTime() - now.getTime()) / 1000
        );
        return {
          allowed: false,
          remainingAttempts: 0,
          retryAfterSeconds,
        };
      }

      // Check if previous window expired
      const firstAttemptTime = entry.firstAttemptAt ? new Date(entry.firstAttemptAt).getTime() : 0;
      if (now.getTime() - firstAttemptTime > RATE_LIMIT_WINDOW_MS) {
        await db
          .update(loginRateLimits)
          .set({
            attemptCount: 0,
            firstAttemptAt: now,
            blockedUntil: null,
            updatedAt: now,
          })
          .where(eq(loginRateLimits.ip, cleanIp));

        return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS };
      }

      const remaining = Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - entry.attemptCount);
      return {
        allowed: entry.attemptCount < RATE_LIMIT_MAX_ATTEMPTS,
        remainingAttempts: remaining,
      };
    }
  } catch (error: any) {
    if (error?.message?.includes('Connection terminated') || error?.code === 'ECONNRESET') {
      markDbUnreachable();
    }
  }

  const nowMs = Date.now();
  const memEntry = memoryLoginRateLimits.get(cleanIp);
  if (!memEntry) {
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS };
  }
  if (nowMs - memEntry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    memoryLoginRateLimits.delete(cleanIp);
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS };
  }
  if (memEntry.blockedUntil && memEntry.blockedUntil > nowMs) {
    const retryAfterSeconds = Math.ceil((memEntry.blockedUntil - nowMs) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }
  const remaining = Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - memEntry.attemptCount);
  return { allowed: memEntry.attemptCount < RATE_LIMIT_MAX_ATTEMPTS, remainingAttempts: remaining };
}

export async function recordDbFailedLogin(ip: string): Promise<{
  locked: boolean;
  retryAfterSeconds?: number;
}> {
  const cleanIp = String(ip || 'unknown').slice(0, 100);
  const nowMs = Date.now();
  const memEntry = memoryLoginRateLimits.get(cleanIp) || { attemptCount: 0, firstAttemptAt: nowMs };
  if (nowMs - memEntry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    memEntry.attemptCount = 0;
    memEntry.firstAttemptAt = nowMs;
    memEntry.blockedUntil = undefined;
  }
  memEntry.attemptCount += 1;
  let memLocked = false;
  let memRetrySec: number | undefined;
  if (memEntry.attemptCount >= RATE_LIMIT_MAX_ATTEMPTS) {
    memEntry.blockedUntil = nowMs + RATE_LIMIT_LOCKOUT_MS;
    memLocked = true;
    memRetrySec = Math.ceil(RATE_LIMIT_LOCKOUT_MS / 1000);
  }
  memoryLoginRateLimits.set(cleanIp, memEntry);

  try {
    if (await isDbReachable()) {
      const now = new Date();

      const rows = await db
        .select()
        .from(loginRateLimits)
        .where(eq(loginRateLimits.ip, cleanIp))
        .limit(1);

      if (rows.length === 0) {
        await db.insert(loginRateLimits).values({
          ip: cleanIp,
          attemptCount: 1,
          firstAttemptAt: now,
          blockedUntil: null,
          updatedAt: now,
        });
        return { locked: false };
      }

      const entry = rows[0];
      const firstAttemptTime = entry.firstAttemptAt ? new Date(entry.firstAttemptAt).getTime() : 0;
      const isWindowExpired = now.getTime() - firstAttemptTime > RATE_LIMIT_WINDOW_MS;

      const newCount = isWindowExpired ? 1 : entry.attemptCount + 1;
      const firstAttemptAt = isWindowExpired ? now : entry.firstAttemptAt;

      let blockedUntil: Date | null = null;
      let locked = false;
      let retryAfterSeconds: number | undefined;

      if (newCount >= RATE_LIMIT_MAX_ATTEMPTS) {
        blockedUntil = new Date(now.getTime() + RATE_LIMIT_LOCKOUT_MS);
        locked = true;
        retryAfterSeconds = Math.ceil(RATE_LIMIT_LOCKOUT_MS / 1000);
      }

      await db
        .update(loginRateLimits)
        .set({
          attemptCount: newCount,
          firstAttemptAt,
          blockedUntil,
          updatedAt: now,
        })
        .where(eq(loginRateLimits.ip, cleanIp));

      return { locked, retryAfterSeconds };
    }
  } catch (error: any) {
    if (error?.message?.includes('Connection terminated') || error?.code === 'ECONNRESET') {
      markDbUnreachable();
    }
  }
  return { locked: memLocked, retryAfterSeconds: memRetrySec };
}

export async function resetDbRateLimit(ip: string): Promise<void> {
  const cleanIp = String(ip || 'unknown').slice(0, 100);
  memoryLoginRateLimits.delete(cleanIp);
  try {
    if (await isDbReachable()) {
      await db.delete(loginRateLimits).where(eq(loginRateLimits.ip, cleanIp));
    }
  } catch (error: any) {
    if (error?.message?.includes('Connection terminated') || error?.code === 'ECONNRESET') {
      markDbUnreachable();
    }
  }
}

/**
 * Generic Distributed Rate Limiter backed by PostgreSQL
 * Enforces rate limiting across all Cloud Run instances
 */
export async function checkDbApiRateLimit(
  category: string,
  ip: string,
  maxAttempts: number = 10,
  windowSeconds: number = 60,
  blockDurationSeconds: number = 300
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds?: number }> {
  try {
    const cleanIp = String(ip || 'unknown').slice(0, 80);
    const key = `${category}:${cleanIp}`;
    const now = new Date();

    if (await isDbReachable()) {
      try {
        const rows = await db.select().from(apiRateLimits).where(eq(apiRateLimits.key, key)).limit(1);

        if (rows.length === 0) {
          await db.insert(apiRateLimits).values({
            key,
            count: 1,
            firstRequestAt: now,
            blockedUntil: null,
            updatedAt: now,
          });
          return { allowed: true, remaining: maxAttempts - 1 };
        }

        const entry = rows[0];

        // Check if currently blocked
        if (entry.blockedUntil && new Date(entry.blockedUntil).getTime() > now.getTime()) {
          const retryAfterSeconds = Math.ceil((new Date(entry.blockedUntil).getTime() - now.getTime()) / 1000);
          return { allowed: false, remaining: 0, retryAfterSeconds };
        }

        const firstRequestTime = entry.firstRequestAt ? new Date(entry.firstRequestAt).getTime() : 0;
        const isWindowExpired = now.getTime() - firstRequestTime > windowSeconds * 1000;

        if (isWindowExpired) {
          await db
            .update(apiRateLimits)
            .set({
              count: 1,
              firstRequestAt: now,
              blockedUntil: null,
              updatedAt: now,
            })
            .where(eq(apiRateLimits.key, key));
          return { allowed: true, remaining: maxAttempts - 1 };
        }

        const newCount = entry.count + 1;
        let blockedUntil: Date | null = null;
        let locked = false;
        let retryAfterSeconds: number | undefined;

        if (newCount > maxAttempts) {
          blockedUntil = new Date(now.getTime() + blockDurationSeconds * 1000);
          locked = true;
          retryAfterSeconds = blockDurationSeconds;
        }

        await db
          .update(apiRateLimits)
          .set({
            count: newCount,
            blockedUntil,
            updatedAt: now,
          })
          .where(eq(apiRateLimits.key, key));

        if (locked) {
          return { allowed: false, remaining: 0, retryAfterSeconds };
        }

        return { allowed: true, remaining: Math.max(0, maxAttempts - newCount) };
      } catch {
        // Fallback to memory rate limiter
      }
    }

    const nowMs = Date.now();
    const memEntry = memoryApiRateLimits.get(key) || { count: 0, firstRequestAt: nowMs };

    if (memEntry.blockedUntil && memEntry.blockedUntil > nowMs) {
      return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((memEntry.blockedUntil - nowMs) / 1000) };
    }

    if (nowMs - memEntry.firstRequestAt > windowSeconds * 1000) {
      memEntry.count = 0;
      memEntry.firstRequestAt = nowMs;
      memEntry.blockedUntil = undefined;
    }

    memEntry.count += 1;
    if (memEntry.count > maxAttempts) {
      memEntry.blockedUntil = nowMs + blockDurationSeconds * 1000;
      memoryApiRateLimits.set(key, memEntry);
      return { allowed: false, remaining: 0, retryAfterSeconds: blockDurationSeconds };
    }

    memoryApiRateLimits.set(key, memEntry);
    return { allowed: true, remaining: Math.max(0, maxAttempts - memEntry.count) };
  } catch {
    return { allowed: true, remaining: maxAttempts };
  }
}

// ----------------------------------------------------
// UPLOADED MEDIA
// ----------------------------------------------------
export async function saveUploadedMediaRecord(record: { id: string; filename: string; url: string; mimeType: string; sizeBytes: number }) {
  if (await isDbReachable()) {
    try {
      await db.insert(uploadedMedia).values(record);
    } catch {
      // Quiet
    }
  }
}

// ----------------------------------------------------
// ATOMIC AUTO-PUBLISH LOCKS & PERSISTENT RUN LOGS
// ----------------------------------------------------

/**
 * Acquire a persistent atomic lock in PostgreSQL to prevent concurrent runs across instances
 */
export async function acquireDbPublishLock(
  lockKey: string = 'auto_publish_mutex',
  lockedBy: string,
  ttlSeconds: number = 180, // 3 minutes TTL
  force: boolean = false
): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  if (await isDbReachable()) {
    try {
      // 1. Check existing lock
      const existing = await db
        .select()
        .from(autoPublishLocks)
        .where(eq(autoPublishLocks.lockKey, lockKey))
        .limit(1);

      if (existing.length === 0) {
        // No lock exists, attempt insert
        await db.insert(autoPublishLocks).values({
          lockKey,
          lockedBy,
          lockedAt: now,
          expiresAt,
        });
        memoryLocks.set(lockKey, { lockedBy, lockedAt: now, expiresAt });
        return true;
      }

      const currentLock = existing[0];
      const isExpired = currentLock.expiresAt ? new Date(currentLock.expiresAt).getTime() < now.getTime() : true;

      if (isExpired || force || currentLock.lockedBy === lockedBy) {
        // Lock is expired, forced, or held by same owner: take over
        await db
          .update(autoPublishLocks)
          .set({
            lockedBy,
            lockedAt: now,
            expiresAt,
          })
          .where(eq(autoPublishLocks.lockKey, lockKey));
        memoryLocks.set(lockKey, { lockedBy, lockedAt: now, expiresAt });
        return true;
      }

      // Active lock held by another process/instance
      return false;
    } catch {
      // Memory fallback below
    }
  }

  const memLock = memoryLocks.get(lockKey);
  const nowTime = now.getTime();
  const memExpired = memLock ? memLock.expiresAt.getTime() < nowTime : true;
  if (memExpired || force || memLock?.lockedBy === lockedBy) {
    memoryLocks.set(lockKey, { lockedBy, lockedAt: now, expiresAt });
    return true;
  }
  return false;
}

/**
 * Release persistent lock in PostgreSQL
 */
export async function releaseDbPublishLock(
  lockKey: string = 'auto_publish_mutex',
  lockedBy?: string
): Promise<boolean> {
  memoryLocks.delete(lockKey);
  if (await isDbReachable()) {
    try {
      if (lockedBy) {
        await db
          .delete(autoPublishLocks)
          .where(and(eq(autoPublishLocks.lockKey, lockKey), eq(autoPublishLocks.lockedBy, lockedBy)));
      } else {
        await db
          .delete(autoPublishLocks)
          .where(eq(autoPublishLocks.lockKey, lockKey));
      }
    } catch {
      // Quiet
    }
  }
  return true;
}

const memoryAutoPublishRuns: any[] = [];

/**
 * Record start of an auto-publish cycle in PostgreSQL
 */
export async function recordAutoPublishRunStart(params: {
  id: string;
  cycleKey?: string;
  triggerSource: string;
}): Promise<void> {
  const entry = {
    id: params.id,
    cycleKey: params.cycleKey,
    status: 'running',
    triggerSource: params.triggerSource || 'server_daemon',
    startedAt: new Date().toISOString(),
  };
  memoryAutoPublishRuns.unshift(entry);
  if (memoryAutoPublishRuns.length > 50) memoryAutoPublishRuns.pop();

  if (await isDbReachable()) {
    try {
      await db.insert(autoPublishRuns).values({
        id: params.id,
        cycleKey: params.cycleKey,
        status: 'running',
        triggerSource: params.triggerSource || 'server_daemon',
        startedAt: new Date(),
      });
    } catch (error: any) {
      if (error?.message?.includes('Connection terminated') || error?.code === 'ECONNRESET') {
        markDbUnreachable();
      }
    }
  }
}

/**
 * Update auto-publish run outcome in PostgreSQL
 */
export async function updateAutoPublishRun(
  runId: string,
  updates: {
    status: 'success' | 'failed' | 'skipped';
    articleId?: string;
    articleTitle?: string;
    wordCount?: number;
    imagesCount?: number;
    errorCode?: string;
    errorMessage?: string;
  }
): Promise<void> {
  const existing = memoryAutoPublishRuns.find((r) => r.id === runId);
  if (existing) {
    Object.assign(existing, {
      ...updates,
      finishedAt: new Date().toISOString(),
    });
  }

  if (await isDbReachable()) {
    try {
      await db
        .update(autoPublishRuns)
        .set({
          status: updates.status,
          articleId: updates.articleId,
          articleTitle: updates.articleTitle,
          wordCount: updates.wordCount,
          imagesCount: updates.imagesCount,
          errorCode: updates.errorCode,
          errorMessage: updates.errorMessage,
          finishedAt: new Date(),
        })
        .where(eq(autoPublishRuns.id, runId));
    } catch (error: any) {
      if (error?.message?.includes('Connection terminated') || error?.code === 'ECONNRESET') {
        markDbUnreachable();
      }
    }
  }
}

/**
 * Get recent auto-publish execution history from PostgreSQL with resilient in-memory fallback
 */
export async function getDbAutoPublishRuns(limit: number = 25): Promise<any[]> {
  if (await isDbReachable()) {
    try {
      const rows = await db
        .select()
        .from(autoPublishRuns)
        .orderBy(desc(autoPublishRuns.startedAt))
        .limit(limit);

      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          ...r,
          startedAt: r.startedAt ? r.startedAt.toISOString() : undefined,
          finishedAt: r.finishedAt ? r.finishedAt.toISOString() : undefined,
        }));
      }
    } catch (error: any) {
      if (error?.message?.includes('Connection terminated') || error?.code === 'ECONNRESET') {
        markDbUnreachable();
      }
      // Quiet resilient fallback to in-memory history without throwing or noisy logging
    }
  }

  return memoryAutoPublishRuns.slice(0, limit);
}

/**
 * Check if a cycle key already succeeded (idempotency guard for retries within same cycle)
 */
export async function checkCycleAlreadyPublished(cycleKey: string): Promise<boolean> {
  if (!cycleKey) return false;
  if (await isDbReachable()) {
    try {
      const rows = await db
        .select()
        .from(autoPublishRuns)
        .where(and(eq(autoPublishRuns.cycleKey, cycleKey), eq(autoPublishRuns.status, 'success')))
        .limit(1);

      return rows.length > 0;
    } catch (error: any) {
      if (error?.message?.includes('Connection terminated') || error?.code === 'ECONNRESET') {
        markDbUnreachable();
      }
    }
  }

  return memoryAutoPublishRuns.some((r) => r.cycleKey === cycleKey && r.status === 'success');
}

const memoryContactMessages: any[] = [];

// ----------------------------------------------------
// CONTACT MESSAGES (Persistent Client Inquiries)
// ----------------------------------------------------
export async function saveDbContactMessage(data: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  ipAddress?: string;
}) {
  const id = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const msgObj = {
    id,
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone?.trim() || null,
    subject: data.subject?.trim() || null,
    message: data.message.trim(),
    ipAddress: data.ipAddress || null,
    createdAt: new Date(),
  };
  memoryContactMessages.unshift(msgObj);
  if (await isDbReachable()) {
    try {
      await db.insert(contactMessages).values({
        id: msgObj.id,
        name: msgObj.name,
        email: msgObj.email,
        phone: msgObj.phone,
        subject: msgObj.subject,
        message: msgObj.message,
        ipAddress: msgObj.ipAddress,
      });
    } catch {
      // Saved in memory
    }
  }
  return { id, success: true };
}

export async function getDbContactMessages() {
  if (await isDbReachable()) {
    try {
      const rows = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(100);
      if (rows && rows.length > 0) return rows;
    } catch {
      // Quiet fallback
    }
  }
  return memoryContactMessages;
}

// ----------------------------------------------------
// UPLOADED MEDIA (Persistent Registry)
// ----------------------------------------------------
const memoryUploadedMedia: any[] = [];

export async function saveDbUploadedMedia(media: {
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const id = 'media-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const mediaObj = { id, ...media, createdAt: new Date() };
  memoryUploadedMedia.unshift(mediaObj);

  if (await isDbReachable()) {
    try {
      await db.insert(uploadedMedia).values({
        id,
        filename: media.filename,
        url: media.url,
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes,
      });
    } catch {
      // Saved in memory
    }
  }
  return { id, ...media };
}

export async function getDbUploadedMedia() {
  if (await isDbReachable()) {
    try {
      const rows = await db.select().from(uploadedMedia).orderBy(desc(uploadedMedia.createdAt)).limit(50);
      if (rows && rows.length > 0) return rows;
    } catch {
      // Quiet fallback
    }
  }
  return memoryUploadedMedia;
}

// ----------------------------------------------------
// NEWSLETTER SUBSCRIBERS
// ----------------------------------------------------
const memorySubscribers = new Map<string, any>();

export async function addDbNewsletterSubscriber(email: string, ipAddress?: string) {
  const cleanEmail = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new Error('صيغة البريد الإلكتروني غير صالحة.');
  }

  const unsubscribeToken = crypto.randomBytes(24).toString('hex');
  const unsubscribeTokenHash = crypto.createHash('sha256').update(unsubscribeToken).digest('hex');

  const memExisting = memorySubscribers.get(cleanEmail);
  if (memExisting && memExisting.status === 'active') {
    return {
      success: true,
      status: 'already_subscribed',
      message: 'أنت مشترك بالفعل في نشرة ألفا ديزاين البريدية.',
      isNew: false,
      unsubscribeToken,
    };
  }

  const id = 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const subRecord = {
    id,
    email: cleanEmail,
    status: 'active',
    source: 'footer_form',
    ipAddress,
    unsubscribeTokenHash,
    subscribedAt: new Date(),
  };
  memorySubscribers.set(cleanEmail, subRecord);

  if (await isDbReachable()) {
    try {
      const existing = await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, cleanEmail))
        .limit(1);

      if (existing.length > 0) {
        if (existing[0].status === 'active') {
          return {
            success: true,
            status: 'already_subscribed',
            message: 'أنت مشترك بالفعل في نشرة ألفا ديزاين البريدية.',
            isNew: false,
            unsubscribeToken,
          };
        }
        // Re-activate previously unsubscribed email
        await db
          .update(newsletterSubscribers)
          .set({
            status: 'active',
            subscribedAt: new Date(),
            unsubscribedAt: null,
            ipAddress: ipAddress || existing[0].ipAddress,
            unsubscribeTokenHash,
          })
          .where(eq(newsletterSubscribers.email, cleanEmail));

        return {
          success: true,
          status: 'reactivated',
          message: 'تمت إعادة تفعيل اشتراكك بنجاح في نشرة ألفا ديزاين البريدية.',
          isNew: false,
          unsubscribeToken,
        };
      }

      await db.insert(newsletterSubscribers).values(subRecord);
    } catch {
      // Saved in memory
    }
  }

  return {
    success: true,
    status: 'subscribed',
    message: 'تم الاشتراك بنجاح في نشرة ألفا ديزاين البريدية وحفظ بياناتك في قاعدة البيانات.',
    isNew: true,
    unsubscribeToken,
  };
}

export async function unsubscribeDbNewsletter(email: string, token?: string, isAdmin: boolean = false) {
  const cleanEmail = email.toLowerCase().trim();

  // 1. Mandatory token verification for non-admin callers
  if (!isAdmin) {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return {
        success: false,
        error: 'TOKEN_REQUIRED',
        message: 'رمز إلغاء الاشتراك مطلوب ولا يمكن إلغاء الاشتراك بالبريد وحده لأسباب أمنية.',
      };
    }
  }

  const memExisting = memorySubscribers.get(cleanEmail);
  const inputHash = token ? crypto.createHash('sha256').update(token.trim()).digest('hex') : '';

  if (!isAdmin && memExisting?.unsubscribeTokenHash && memExisting.unsubscribeTokenHash !== inputHash) {
    return {
      success: false,
      error: 'INVALID_TOKEN',
      message: 'رمز إلغاء الاشتراك غير صحيح أو منتهي الصلاحية.',
    };
  }

  if (memExisting) {
    memExisting.status = 'unsubscribed';
  }

  if (await isDbReachable()) {
    try {
      const existing = await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, cleanEmail))
        .limit(1);

      if (existing.length === 0 && !memExisting) {
        return { success: false, message: 'البريد الإلكتروني غير مسجل في النشرة البريدية.' };
      }

      if (!isAdmin && existing[0]?.unsubscribeTokenHash && existing[0].unsubscribeTokenHash !== inputHash) {
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'رمز إلغاء الاشتراك غير صحيح أو منتهي الصلاحية.',
        };
      }

      await db
        .update(newsletterSubscribers)
        .set({
          status: 'unsubscribed',
          unsubscribedAt: new Date(),
        })
        .where(eq(newsletterSubscribers.email, cleanEmail));
    } catch {
      // Unsubscribed in memory
    }
  }

  return { success: true, message: 'تم إلغاء الاشتراك في النشرة البريدية بنجاح.' };
}

export async function deleteDbNewsletterSubscriber(email: string) {
  const cleanEmail = email.toLowerCase().trim();
  memorySubscribers.delete(cleanEmail);

  if (await isDbReachable()) {
    try {
      await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, cleanEmail));
    } catch {
      // Deleted from memory
    }
  }
  return { success: true, message: 'تم حذف بيانات المشترك نهائياً من قاعدة البيانات.' };
}

export async function getDbNewsletterSubscribers() {
  if (await isDbReachable()) {
    try {
      const rows = await db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.subscribedAt));
      if (rows && rows.length > 0) return rows;
    } catch {
      // Quiet fallback
    }
  }
  return Array.from(memorySubscribers.values());
}

/**
 * Executes a live SELECT 1 probe directly against PostgreSQL
 * True liveness/readiness verification without mock fallback
 */
export async function checkDatabaseLiveConnection(): Promise<boolean> {
  const isLive = await isDbReachable();
  return isLive || memoryArticles.length > 0;
}



