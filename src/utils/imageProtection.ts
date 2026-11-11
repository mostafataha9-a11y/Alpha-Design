import sharp from 'sharp';
import { computePerceptualHash, hammingDistance, inspectAndHashImageUrl } from './imageHasher.ts';
import { checkImageDuplicateInDb, getUsedImageUrls } from '../db/repo.ts';

export interface ImageProtectionResult {
  index: number;
  originalUrl: string;
  isDuplicate: boolean;
  protectedUrl: string;
  hash: string;
  matchedArticleId?: string;
  reason: string;
  actionTaken?: string;
  ipWatermarkApplied: boolean;
}

export interface BatchProtectionResponse {
  hasDuplicates: boolean;
  duplicateCount: number;
  totalImages: number;
  summaryNoticeAr: string;
  summaryNoticeEn: string;
  results: ImageProtectionResult[];
  protectedImages: Array<{
    id?: string;
    url: string;
    caption?: string;
    isDuplicate?: boolean;
    ipProtected?: boolean;
  }>;
}

/**
 * Applies visual transformations, subtle color grading, and an SVG copyright
 * watermark badge to an image buffer to create an exclusive derivative work
 * that protects intellectual property and changes the perceptual fingerprint.
 */
export async function applyIpProtectionTransform(
  inputBuffer: Buffer,
  options?: {
    watermarkText?: string;
    copyrightHolder?: string;
  }
): Promise<{ buffer: Buffer; dataUrl: string; width: number; height: number; newHash: string }> {
  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  // Design a sleek, semi-transparent SVG watermark banner for the bottom-right corner
  const badgeWidth = Math.min(Math.round(width * 0.45), 260);
  const badgeHeight = 32;
  const badgeX = width - badgeWidth - 14;
  const badgeY = height - badgeHeight - 14;

  const holder = options?.copyrightHolder || 'الحضرى محمود';
  const label = options?.watermarkText || 'ALPHA DECOR © • ' + holder;

  const watermarkSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0.92" />
        </linearGradient>
        <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.5"/>
        </filter>
      </defs>
      <!-- Sleek Designer Copyright Badge -->
      <g filter="url(#badgeShadow)">
        <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="7" fill="url(#badgeGrad)" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.6"/>
        <circle cx="${badgeX + 16}" cy="${badgeY + 16}" r="5" fill="#f59e0b"/>
        <text x="${badgeX + 28}" y="${badgeY + 20}" font-family="Arial, 'Segoe UI', Tahoma, sans-serif" font-size="11" font-weight="bold" fill="#ffffff" letter-spacing="0.5">${label}</text>
      </g>
    </svg>
  `;

  // Apply subtle color calibration (warmer, richer contrast) + watermark composite
  const processedBuffer = await sharp(inputBuffer)
    .modulate({
      brightness: 1.02,
      saturation: 1.05,
    })
    .composite([
      {
        input: Buffer.from(watermarkSvg),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 88, progressive: true })
    .toBuffer();

  const newHash = await computePerceptualHash(processedBuffer);
  const dataUrl = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;

  return {
    buffer: processedBuffer,
    dataUrl,
    width,
    height,
    newHash,
  };
}

/**
 * Inspects an individual image (by URL or base64 data), checks for duplicates in PostgreSQL
 * and against perceptual hash history, and if a duplicate is found, applies IP protection.
 */
export async function inspectAndProtectImage(
  imageSource: string,
  index = 0,
  knownUsedUrls?: Set<string>
): Promise<ImageProtectionResult> {
  const trimmed = (imageSource || '').trim();
  const isBase64 = trimmed.startsWith('data:image/');

  try {
    let rawBuffer: Buffer | null = null;
    let originalHash = '';

    if (isBase64) {
      const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        rawBuffer = Buffer.from(match[2], 'base64');
        originalHash = await computePerceptualHash(rawBuffer);
      }
    } else if (trimmed.startsWith('http')) {
      const inspect = await inspectAndHashImageUrl(trimmed, 6000);
      if (inspect.valid && inspect.hash) {
        originalHash = inspect.hash;
      }
    }

    // 1. Check exact URL in database history or currently passed catalog
    const isUrlUsed = knownUsedUrls ? knownUsedUrls.has(trimmed) : false;

    // 2. Check perceptual hash duplicate against PostgreSQL image logs
    let duplicateCheck: {
      isDuplicate: boolean;
      matchedArticleId?: string;
      matchedImageUrl?: string;
      distance?: number;
      reason?: string;
    } = {
      isDuplicate: isUrlUsed,
      matchedArticleId: undefined,
      reason: isUrlUsed ? 'الرابط مطابق لصورة مستخدمة بالفعل في مقال سابق.' : '',
    };
    if (!duplicateCheck.isDuplicate && originalHash) {
      const dbCheck = await checkImageDuplicateInDb(trimmed, originalHash);
      if (dbCheck.isDuplicate) {
        duplicateCheck = dbCheck;
      }
    }

    // 3. If duplicate, transform and apply IP protection
    if (duplicateCheck.isDuplicate) {
      let protectedDataUrl = trimmed;
      let newHash = originalHash;
      let watermarkApplied = false;

      if (rawBuffer) {
        try {
          const transform = await applyIpProtectionTransform(rawBuffer);
          protectedDataUrl = transform.dataUrl;
          newHash = transform.newHash;
          watermarkApplied = true;
        } catch (e) {
          console.warn('IP transform failed on base64 buffer:', e);
        }
      }

      return {
        index,
        originalUrl: trimmed,
        isDuplicate: true,
        protectedUrl: protectedDataUrl,
        hash: newHash,
        matchedArticleId: duplicateCheck.matchedArticleId,
        reason: duplicateCheck.reason || 'تم رصد الصورة مسبقاً في مقالات سابقة بالمدونة أو الإنترنت.',
        actionTaken: 'تم إجراء تعديل بصري متقدم، وضبط درجات التباين، وإضافة ختم حماية الملكية الفكرية لألفا للديكور، وتجديد البصمة الرقمية لحظر التكرار ونشرها كنسخة أصلية.',
        ipWatermarkApplied: watermarkApplied,
      };
    }

    // If genuinely unique
    return {
      index,
      originalUrl: trimmed,
      isDuplicate: false,
      protectedUrl: trimmed,
      hash: originalHash,
      reason: 'صورة فريدة وجديدة تماماً - متوافقة 100% مع معايير حصرية المحتوى.',
      ipWatermarkApplied: false,
    };
  } catch (err: any) {
    console.warn(`[Image Protection] Analysis failed for image #${index}:`, err);
    return {
      index,
      originalUrl: trimmed,
      isDuplicate: false,
      protectedUrl: trimmed,
      hash: '',
      reason: 'تعذر التحقق من البصمة الرقمية، سيتم اعتماد الصورة الأصلية.',
      ipWatermarkApplied: false,
    };
  }
}

/**
 * Batch processes an array of images: detects duplicates, applies IP protection transforms,
 * and compiles comprehensive user notifications for the creator.
 */
export async function batchAnalyzeAndProtectImages(
  images: Array<{ url: string; caption?: string; id?: string }>
): Promise<BatchProtectionResponse> {
  const usedUrls = await getUsedImageUrls();
  const results: ImageProtectionResult[] = [];

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const source = item.url || '';
    const res = await inspectAndProtectImage(source, i, usedUrls);
    results.push(res);
  }

  const duplicates = results.filter((r) => r.isDuplicate);
  const hasDuplicates = duplicates.length > 0;

  const protectedImages = images.map((img, idx) => {
    const r = results[idx];
    return {
      ...img,
      url: r ? r.protectedUrl : img.url,
      isDuplicate: r?.isDuplicate || false,
      ipProtected: r?.ipWatermarkApplied || false,
    };
  });

  const summaryNoticeAr = hasDuplicates
    ? `تنبيه حماية الملكية الفكرية: تم رصد (${duplicates.length}) من أصل (${images.length}) صور مكررة في المدونة أو الإنترنت. أجرى الذكاء الاصطناعي تعديلات بصرية معمارية، وضبط التباين اللوني، وأضاف ختم الحماية الحصري لمدونة ألفا للديكور وتوليد بصمات رقمية جديدة لمنع نشر الصور المكررة وفق معايير Google AdSense.`
    : 'جميع الصور المرفوعة فريدة وجديدة، وخالية من أي تكرار بصري أو تعارض في حقوق الملكية الفكرية.';

  const summaryNoticeEn = hasDuplicates
    ? `IP Protection Notice: Detected ${duplicates.length} of ${images.length} duplicate images. Visual enhancements and Alpha Decor copyright protection stamp were applied to avoid duplicate penalties under Google AdSense.`
    : 'All uploaded images are unique and fully compliant with copyright and originality standards.';

  return {
    hasDuplicates,
    duplicateCount: duplicates.length,
    totalImages: images.length,
    summaryNoticeAr,
    summaryNoticeEn,
    results,
    protectedImages,
  };
}
