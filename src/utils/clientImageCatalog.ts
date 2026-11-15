import { EXPANDED_DECOR_CATALOG, CuratedDecorImage } from '../data/curatedImagesCatalog';
import { INITIAL_ARTICLES } from '../data/initialData';

const STORAGE_KEY_ARTICLES = 'alpha_decor_articles_v3';

function getStoredArticleImageUrls(): Set<string> {
  const used = new Set<string>();

  const collectFromArticle = (a: any) => {
    if (!a || typeof a !== 'object') return;
    if (typeof a.featuredImage === 'string' && a.featuredImage.trim()) {
      used.add(a.featuredImage.trim());
    }
    if (typeof a.content === 'string') {
      const matches = a.content.matchAll(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g);
      for (const m of matches) {
        if (m[1]) used.add(m[1].trim());
      }
    }
  };

  INITIAL_ARTICLES.forEach(collectFromArticle);

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_ARTICLES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(collectFromArticle);
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }

  return used;
}

export function getClientCatalogStatus() {
  const usedUrls = getStoredArticleImageUrls();
  const totalCatalog = EXPANDED_DECOR_CATALOG.length;
  const available = EXPANDED_DECOR_CATALOG.filter((img) => !usedUrls.has(img.url.trim()));
  return {
    success: true,
    totalCatalogImages: totalCatalog,
    totalUsedSiteImages: usedUrls.size,
    availableUnusedCatalogImagesCount: available.length,
    availableCatalogImages: available,
  };
}

export function checkClientImageDuplicates(urls: string[], extraUsedUrls: string[] = []) {
  const siteUsedUrls = getStoredArticleImageUrls();
  extraUsedUrls.forEach((u) => {
    if (u && typeof u === 'string') siteUsedUrls.add(u.trim());
  });

  // Also check if URL appears in stored articles and capture its title
  const urlToTitle = new Map<string, string>();
  const registerArticleUrls = (a: any) => {
    if (!a || typeof a !== 'object') return;
    if (typeof a.featuredImage === 'string' && a.featuredImage.trim()) {
      urlToTitle.set(a.featuredImage.trim(), a.title || 'مقال منشور');
    }
    if (typeof a.content === 'string') {
      for (const m of a.content.matchAll(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g)) {
        if (m[1]) urlToTitle.set(m[1].trim(), a.title || 'مقال منشور');
      }
    }
  };

  INITIAL_ARTICLES.forEach(registerArticleUrls);
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_ARTICLES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) parsed.forEach(registerArticleUrls);
      }
    }
  } catch {}

  const seenBatch = new Set<string>();
  const results = urls.map((rawUrl) => {
    const clean = (rawUrl || '').trim();
    if (!clean) {
      return { url: clean, isDuplicate: false, status: 'unique', reason: 'رابط فارغ' };
    }

    if (clean.startsWith('data:')) {
      const inBatch = seenBatch.has(clean);
      seenBatch.add(clean);
      return {
        url: clean,
        isDuplicate: inBatch,
        status: inBatch ? 'duplicate_in_batch' : 'unique',
        reason: inBatch
          ? 'الصورة مكررة داخل نفس المقال.'
          : 'صورة مرفوعة محلياً فريدة وحصرية.',
      };
    }

    if (seenBatch.has(clean)) {
      return {
        url: clean,
        isDuplicate: true,
        status: 'duplicate_in_batch',
        reason: 'الصورة مكررة في أكثر من موضع داخل هذا المقال.',
      };
    }
    seenBatch.add(clean);

    if (siteUsedUrls.has(clean)) {
      return {
        url: clean,
        isDuplicate: true,
        status: 'duplicate_in_site',
        matchedArticleTitle: urlToTitle.get(clean) || 'مقال سابق في المدونة',
        reason: `الصورة مستخدمة مسبقاً في: ${urlToTitle.get(clean) || 'مقال سابق في المدونة'}`,
      };
    }

    return {
      url: clean,
      isDuplicate: false,
      status: 'unique',
      reason: 'صورة فريدة غير مكررة في المقالات المنشورة.',
    };
  });

  return { success: true, results };
}

export function getUniqueClientDecorReplacement(
  excludeUrls: string[] = [],
  topic: string = ''
): CuratedDecorImage | null {
  const siteUsed = getStoredArticleImageUrls();
  const excluded = new Set([
    ...siteUsed,
    ...excludeUrls.map((u) => (u || '').trim()).filter(Boolean),
  ]);

  const keywords = (topic || '')
    .toLowerCase()
    .split(/[\s,،]+/)
    .filter((k) => k.length > 2);

  let candidates = EXPANDED_DECOR_CATALOG.filter((img) => !excluded.has(img.url.trim()));

  if (candidates.length === 0) {
    // Fallback to any catalog item not explicitly in the caller's excludeUrls batch
    const batchExcluded = new Set(excludeUrls.map((u) => (u || '').trim()).filter(Boolean));
    candidates = EXPANDED_DECOR_CATALOG.filter((img) => !batchExcluded.has(img.url.trim()));
  }

  if (candidates.length === 0) {
    return EXPANDED_DECOR_CATALOG[0] || null;
  }

  if (keywords.length > 0) {
    const scored = candidates
      .map((img) => {
        const hay = `${img.title} ${img.topicCategory} ${img.defaultCaption} ${img.altText}`.toLowerCase();
        const score = keywords.reduce((acc, kw) => (hay.includes(kw) ? acc + 2 : acc), 0);
        return { img, score };
      })
      .sort((a, b) => b.score - a.score);

    const topScore = scored[0]?.score || 0;
    const topPool = topScore > 0 ? scored.filter((s) => s.score >= Math.max(2, topScore - 2)).map((s) => s.img) : candidates;
    return topPool[Math.floor(Math.random() * topPool.length)] || scored[0].img;
  }

  return candidates[Math.floor(Math.random() * candidates.length)] || null;
}
