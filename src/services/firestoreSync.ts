import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  increment,
  writeBatch,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Article, Comment, SiteSettings } from '../types/blog';
import { sha256Hex } from '../utils/apiAuth';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

// Run startup connection verification non-blockingly
testConnection().catch(() => {});

// ---------------------------------------------------------------------------
// Owner Session Write Gate Proof (SHA-256 preimage stored only during active session)
// ---------------------------------------------------------------------------
const OWNER_GATE_PROOF_KEY = 'alpha_decor_owner_gate_proof_v1';
export const OWNER_LOGIN_VERIFIER_HASH =
  'b8d5ea460dd5dccaab6f3c3abdc75caa8eba12c36051dd8574dee9514d5cd02d';
export const OWNER_GATE_EXPECTED_DOUBLE_HASH =
  'fea14cc824cf63b2a204dfcaff674de6c8b7a4a16d74109aa3f4b9ca0b0097b1';

export async function deriveOwnerLoginVerifier(email: string, password: string): Promise<string> {
  return sha256Hex(`ALPHA_DECOR_LOGIN_V1:${email.trim().toLowerCase()}:${password}`);
}

export async function deriveAndStoreOwnerGateProof(email: string, password: string): Promise<string | null> {
  const secret = await sha256Hex(`ALPHA_DECOR_FS_GATE_V1:${email.trim().toLowerCase()}:${password}`);
  if (!secret || secret.length !== 64) return null;
  const checkHash = await sha256Hex(secret);
  if (checkHash !== OWNER_GATE_EXPECTED_DOUBLE_HASH) return null;
  try {
    localStorage.setItem(OWNER_GATE_PROOF_KEY, secret);
  } catch {
    // Ignore storage quota errors
  }
  return secret;
}

export function getStoredOwnerGateProof(): string | null {
  try {
    const val = localStorage.getItem(OWNER_GATE_PROOF_KEY);
    return val && /^[a-f0-9]{64}$/i.test(val) ? val : null;
  } catch {
    return null;
  }
}

export function clearOwnerGateProof(): void {
  try {
    localStorage.removeItem(OWNER_GATE_PROOF_KEY);
  } catch {
    // Ignore
  }
}

// ---------------------------------------------------------------------------
// Blueprint Boundary Sanitizers (synchronized with firebase-blueprint.json & firestore.rules)
// ---------------------------------------------------------------------------
const FALLBACK_DECOR_IMAGE =
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85';

function sanitizeId(rawId: string, prefix: string): string {
  const clean = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-');
  if (clean.length >= 1 && clean.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(clean)) {
    return clean;
  }
  return `${prefix}-${Date.now()}`.slice(0, 128);
}

function clampString(val: unknown, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val.trim() : fallback;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function sanitizeStringArray(arr: unknown, maxItems: number, maxItemLen: number): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, maxItems)
    .map((item) => item.trim().slice(0, maxItemLen));
}

function buildFirestoreArticlePayload(article: Article) {
  const safeId = sanitizeId(article.id, 'art');
  let safeFeatured = clampString(article.featuredImage, 350000, FALLBACK_DECOR_IMAGE);
  if (!safeFeatured) safeFeatured = FALLBACK_DECOR_IMAGE;
  // Guard Firestore 1MB total doc size if featuredImage + content combined is unusually huge
  let safeContent = clampString(article.content, 650000, article.title || 'محتوى المقال');
  if (safeFeatured.length + safeContent.length > 850000) {
    if (safeFeatured.startsWith('data:image/')) {
      safeFeatured = FALLBACK_DECOR_IMAGE;
    } else {
      safeContent = safeContent.slice(0, 600000);
    }
  }

  const payload: Record<string, any> = {
    id: safeId,
    title: clampString(article.title, 300, 'مقال جديد في الديكور والدهانات'),
    slug: clampString(article.slug || safeId, 300, safeId),
    excerpt: clampString(article.excerpt, 1000, ''),
    content: safeContent || clampString(article.title, 300, 'مقال ديكور'),
    featuredImage: safeFeatured,
    author: {
      name: clampString(article.author?.name, 120, 'الحضرى محمود'),
      avatar: clampString(article.author?.avatar, 1000, ''),
      role: clampString(article.author?.role, 120, 'استشاري الديكور والدهانات'),
    },
    category: clampString(article.category, 120, 'الدهانات الحديثة'),
    tags: sanitizeStringArray(article.tags, 20, 60),
    publishedAt: clampString(
      article.publishedAt,
      64,
      new Date().toISOString().split('T')[0]
    ),
    readingTime: Math.max(1, Math.min(180, Math.round(Number(article.readingTime) || 5))),
    views: Math.max(0, Math.round(Number(article.views) || 0)),
    likes: Math.max(0, Math.round(Number(article.likes) || 0)),
    status: article.status === 'draft' ? 'draft' : 'published',
    updatedAt: serverTimestamp(),
  };

  if (typeof article.isAutoPublished === 'boolean') payload.isAutoPublished = article.isAutoPublished;
  if (typeof article.autoImagesCount === 'number' && Number.isFinite(article.autoImagesCount)) {
    payload.autoImagesCount = article.autoImagesCount;
  }
  if (Array.isArray(article.imageCaptions)) {
    payload.imageCaptions = sanitizeStringArray(article.imageCaptions, 20, 300);
  }
  if (typeof article.seoScore === 'number' && Number.isFinite(article.seoScore)) {
    payload.seoScore = article.seoScore;
  }
  if (typeof article.humanToneScore === 'number' && Number.isFinite(article.humanToneScore)) {
    payload.humanToneScore = article.humanToneScore;
  }
  if (typeof article.focusKeyword === 'string') {
    payload.focusKeyword = clampString(article.focusKeyword, 200, '');
  }
  if (typeof article.metaDescription === 'string') {
    payload.metaDescription = clampString(article.metaDescription, 500, '');
  }
  if (Array.isArray(article.secondaryKeywords)) {
    payload.secondaryKeywords = sanitizeStringArray(article.secondaryKeywords, 20, 100);
  }
  if (typeof article.rewrittenByAi === 'boolean') payload.rewrittenByAi = article.rewrittenByAi;
  if (typeof article.adSenseCompliant === 'boolean') payload.adSenseCompliant = article.adSenseCompliant;
  if (article.googleMapsLocation && typeof article.googleMapsLocation === 'object') {
    payload.googleMapsLocation = article.googleMapsLocation;
  }

  return { safeId, payload };
}

function hydrateArticleFromDoc(docId: string, data: Record<string, any>, comments: Comment[] = []): Article {
  return {
    id: String(data.id || docId),
    title: String(data.title || ''),
    slug: String(data.slug || docId),
    excerpt: String(data.excerpt || ''),
    content: String(data.content || ''),
    featuredImage: String(data.featuredImage || FALLBACK_DECOR_IMAGE),
    author: {
      name: String(data.author?.name || 'الحضرى محمود'),
      avatar: String(data.author?.avatar || ''),
      role: String(data.author?.role || 'استشاري الديكور والدهانات'),
    },
    category: String(data.category || 'الدهانات الحديثة'),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    publishedAt: String(data.publishedAt || new Date().toISOString().split('T')[0]),
    readingTime: Number(data.readingTime) || 5,
    views: Number(data.views) || 0,
    likes: Number(data.likes) || 0,
    comments,
    status: data.status === 'draft' ? 'draft' : 'published',
    isAutoPublished: Boolean(data.isAutoPublished),
    autoImagesCount: typeof data.autoImagesCount === 'number' ? data.autoImagesCount : undefined,
    imageCaptions: Array.isArray(data.imageCaptions) ? data.imageCaptions : undefined,
    seoScore: typeof data.seoScore === 'number' ? data.seoScore : undefined,
    humanToneScore: typeof data.humanToneScore === 'number' ? data.humanToneScore : undefined,
    focusKeyword: typeof data.focusKeyword === 'string' ? data.focusKeyword : undefined,
    metaDescription: typeof data.metaDescription === 'string' ? data.metaDescription : undefined,
    secondaryKeywords: Array.isArray(data.secondaryKeywords) ? data.secondaryKeywords : undefined,
    rewrittenByAi: typeof data.rewrittenByAi === 'boolean' ? data.rewrittenByAi : undefined,
    adSenseCompliant: typeof data.adSenseCompliant === 'boolean' ? data.adSenseCompliant : undefined,
    googleMapsLocation: data.googleMapsLocation || undefined,
  };
}

// ---------------------------------------------------------------------------
// Public & Owner Firestore Operations
// ---------------------------------------------------------------------------

export async function fetchPublishedArticlesFromFirestore(): Promise<Article[]> {
  const path = 'articles';
  try {
    const q = query(collection(db, path), where('status', '==', 'published'), limit(100));
    const snap = await getDocs(q);
    if (snap.empty) return [];

    const items = await Promise.all(
      snap.docs.map(async (docSnap) => {
        const data = docSnap.data() as Record<string, any>;
        let comments: Comment[] = [];
        try {
          comments = await fetchArticleCommentsFromFirestore(docSnap.id);
        } catch {
          comments = [];
        }
        return hydrateArticleFromDoc(docSnap.id, data, comments);
      })
    );

    items.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveArticleToFirestore(article: Article): Promise<boolean> {
  const proof = getStoredOwnerGateProof();
  if (!proof) return false;

  const { safeId, payload } = buildFirestoreArticlePayload({
    ...article,
    // Keep public Firestore copy strictly aligned with status: published articles become visible to all visitors globally
  });
  const path = `articles/${safeId}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'adminSessions', 'gate'), {
      proof,
      ts: serverTimestamp(),
    });
    batch.set(doc(db, 'articles', safeId), payload);
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncMultipleArticlesToFirestore(articles: Article[]): Promise<void> {
  const proof = getStoredOwnerGateProof();
  if (!proof || articles.length === 0) return;

  const published = articles.filter((a) => a.status !== 'draft').slice(0, 50);
  if (published.length === 0) return;

  const path = 'articles';
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'adminSessions', 'gate'), {
      proof,
      ts: serverTimestamp(),
    });
    for (const art of published) {
      const { safeId, payload } = buildFirestoreArticlePayload(art);
      batch.set(doc(db, 'articles', safeId), payload);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteArticleFromFirestore(articleId: string): Promise<boolean> {
  const proof = getStoredOwnerGateProof();
  if (!proof) return false;

  const safeId = sanitizeId(articleId, 'art');
  const path = `articles/${safeId}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'adminSessions', 'gate'), {
      proof,
      ts: serverTimestamp(),
    });
    batch.delete(doc(db, 'articles', safeId));
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function likeArticleInFirestore(articleId: string): Promise<void> {
  const safeId = sanitizeId(articleId, 'art');
  const path = `articles/${safeId}`;
  try {
    const ref = doc(db, 'articles', safeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    await updateDoc(ref, {
      likes: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchArticleCommentsFromFirestore(articleId: string): Promise<Comment[]> {
  const safeArticleId = sanitizeId(articleId, 'art');
  const path = `articles/${safeArticleId}/comments`;
  try {
    const q = query(
      collection(db, path),
      where('articleId', '==', safeArticleId),
      where('isPublic', '==', true),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, any>;
      return {
        id: String(data.id || d.id),
        author: String(data.author || 'زائر'),
        avatar: String(data.avatar || ''),
        content: String(data.content || ''),
        createdAt: String(data.createdAtDisplay || new Date().toISOString().split('T')[0]),
        likes: Number(data.likes) || 0,
      };
    });
  } catch {
    // Fallback without orderBy index if composite index isn't created yet
    try {
      const qSimple = query(
        collection(db, path),
        where('articleId', '==', safeArticleId),
        where('isPublic', '==', true),
        limit(100)
      );
      const snap = await getDocs(qSimple);
      return snap.docs.map((d) => {
        const data = d.data() as Record<string, any>;
        return {
          id: String(data.id || d.id),
          author: String(data.author || 'زائر'),
          avatar: String(data.avatar || ''),
          content: String(data.content || ''),
          createdAt: String(data.createdAtDisplay || new Date().toISOString().split('T')[0]),
          likes: Number(data.likes) || 0,
        };
      });
    } catch {
      return [];
    }
  }
}

export async function addCommentToFirestore(articleId: string, comment: Comment): Promise<void> {
  const safeArticleId = sanitizeId(articleId, 'art');
  const safeCommentId = sanitizeId(comment.id, 'comment');
  const path = `articles/${safeArticleId}/comments/${safeCommentId}`;
  try {
    const articleSnap = await getDoc(doc(db, 'articles', safeArticleId));
    if (!articleSnap.exists() || articleSnap.data()?.status !== 'published') return;

    await setDoc(doc(db, 'articles', safeArticleId, 'comments', safeCommentId), {
      id: safeCommentId,
      articleId: safeArticleId,
      author: clampString(comment.author, 120, 'زائر'),
      avatar: clampString(comment.avatar, 500, ''),
      content: clampString(comment.content, 4000, ''),
      createdAtDisplay: clampString(comment.createdAt, 64, new Date().toISOString().split('T')[0]),
      createdAt: serverTimestamp(),
      likes: 0,
      isPublic: true,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchPublicSettingsFromFirestore(): Promise<Partial<SiteSettings> | null> {
  const path = 'siteSettings/public';
  try {
    const snap = await getDoc(doc(db, 'siteSettings', 'public'));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, any>;
    const { updatedAt: _u, ...rest } = data;
    return rest as Partial<SiteSettings>;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function savePublicSettingsToFirestore(settings: SiteSettings): Promise<boolean> {
  const proof = getStoredOwnerGateProof();
  if (!proof) return false;

  const path = 'siteSettings/public';
  try {
    const payload: Record<string, any> = {
      blogName: clampString(settings.blogName, 200, 'ألفا للديكور والدهانات'),
      blogNameEn: clampString(settings.blogNameEn, 200, 'Alpha Decor & Paints'),
      tagline: clampString(settings.tagline, 500, ''),
      taglineEn: clampString(settings.taglineEn, 500, ''),
      authorName: clampString(settings.authorName, 120, 'الحضرى محمود'),
      authorBio: clampString(settings.authorBio, 1000, ''),
      authorAvatar: clampString(settings.authorAvatar, 1000, ''),
      articlesPerPage: Math.max(3, Math.min(10, Math.round(Number(settings.articlesPerPage) || 6))),
      language: settings.language === 'en' ? 'en' : 'ar',
      direction: settings.direction === 'ltr' ? 'ltr' : 'rtl',
      themeColor: clampString(settings.themeColor, 30, 'blue'),
      fontFamily: clampString(settings.fontFamily, 30, 'cairo'),
      updatedAt: serverTimestamp(),
    };

    if (settings.socialLinks && typeof settings.socialLinks === 'object') {
      payload.socialLinks = settings.socialLinks;
    }
    if (settings.assistantNegotiation && typeof settings.assistantNegotiation === 'object') {
      payload.assistantNegotiation = settings.assistantNegotiation;
    }
    if (settings.ads && typeof settings.ads === 'object') {
      payload.ads = settings.ads;
    }
    if (settings.customEmbeddedCode && typeof settings.customEmbeddedCode === 'object') {
      payload.customEmbeddedCode = settings.customEmbeddedCode;
    }
    if (settings.developerCredit && typeof settings.developerCredit === 'object') {
      payload.developerCredit = settings.developerCredit;
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'adminSessions', 'gate'), {
      proof,
      ts: serverTimestamp(),
    });
    batch.set(doc(db, 'siteSettings', 'public'), payload);
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
