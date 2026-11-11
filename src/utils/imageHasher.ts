import sharp from 'sharp';
import http from 'http';
import https from 'https';
import dns from 'dns';
import { URL } from 'url';

/**
 * Validates whether an IP address belongs to loopback, private, link-local,
 * cloud metadata, carrier-grade NAT, multicast, or broadcast ranges.
 */
export function isPrivateOrBlockedIp(ipStr: string): boolean {
  if (!ipStr) return true;
  const ip = ipStr.trim().toLowerCase();

  // IPv6 mapped IPv4 (e.g. ::ffff:127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    return isPrivateOrBlockedIp(ip.substring(7));
  }

  // IPv6 checks
  if (ip.includes(':')) {
    // IPv6 Loopback (::1)
    if (ip === '::1' || ip === '0:0:0:0:0:0:0:1' || ip === '::') return true;
    // IPv6 Link-Local (fe80::/10)
    if (ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) return true;
    // IPv6 Unique Local Address (fc00::/7)
    if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
    return false;
  }

  // IPv4 checks
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is treated as unsafe
  }

  const [p0, p1] = parts;

  // 0.0.0.0/8 (Current network)
  if (p0 === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (p0 === 127) return true;

  // 10.0.0.0/8 (Private Network)
  if (p0 === 10) return true;

  // 172.16.0.0/12 (Private Network: 172.16.0.0 - 172.31.255.255)
  if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;

  // 192.168.0.0/16 (Private Network)
  if (p0 === 192 && p1 === 168) return true;

  // 169.254.0.0/16 (Link-Local & Cloud Metadata, e.g. 169.254.169.254)
  if (p0 === 169 && p1 === 254) return true;

  // 100.64.0.0/10 (Carrier-Grade NAT)
  if (p0 === 100 && p1 >= 64 && p1 <= 127) return true;

  // 224.0.0.0/4 (Multicast)
  if (p0 >= 224 && p0 <= 239) return true;

  // 240.0.0.0/4 & 255.255.255.255 (Reserved & Broadcast)
  if (p0 >= 240) return true;

  return false;
}

/**
 * Validates a hostname and verifies all resolved IP addresses are public
 */
export async function assertSafeUrlHost(targetUrl: string): Promise<string> {
  const parsed = new URL(targetUrl);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`SSRF_BLOCKED: البروتوكول غير مدعوم (${parsed.protocol}). يُسمح فقط بـ HTTP و HTTPS.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block obvious localhost and cloud metadata hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === 'metadata.google.internal' ||
    hostname.endsWith('.metadata.google.internal') ||
    hostname === 'metadata.internal' ||
    hostname.endsWith('.local')
  ) {
    throw new Error(`SSRF_BLOCKED: تم حظر الوصول إلى مضيف محلي أو بيانات وصفية سحابية (${hostname}).`);
  }

  // If hostname is directly an IP literal
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':')) {
    if (isPrivateOrBlockedIp(hostname)) {
      throw new Error(`SSRF_BLOCKED: تم حظر الوصول إلى عنوان IP محجوز أو داخلي (${hostname}).`);
    }
    return hostname;
  }

  // Resolve hostname through DNS and check every address
  const addresses = await dns.promises.lookup(hostname, { all: true });
  if (!addresses || addresses.length === 0) {
    throw new Error(`DNS_RESOLUTION_FAILED: تعذر حل عنوان المضيف (${hostname}).`);
  }

  for (const addr of addresses) {
    if (isPrivateOrBlockedIp(addr.address)) {
      throw new Error(`SSRF_BLOCKED: النطاق (${hostname}) يشير إلى عنوان داخلي محظور (${addr.address}).`);
    }
  }

  return addresses[0].address;
}

/**
 * Secure HTTP/HTTPS image downloader with SSRF protection, redirect verification,
 * size ceiling enforcement, and timeout handling.
 */
export async function fetchSafeImageBuffer(
  targetUrl: string,
  options: {
    timeoutMs?: number;
    maxSizeBytes?: number;
    maxRedirects?: number;
  } = {}
): Promise<Buffer> {
  const timeoutMs = options.timeoutMs ?? 7000;
  const maxSizeBytes = options.maxSizeBytes ?? 10 * 1024 * 1024; // 10MB maximum
  const maxRedirects = options.maxRedirects ?? 3;

  let currentUrl = targetUrl;
  let redirectsRemaining = maxRedirects;

  while (true) {
    // Assert current URL is safe from SSRF before requesting
    const verifiedIp = await assertSafeUrlHost(currentUrl);
    const parsed = new URL(currentUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const buffer = await new Promise<Buffer | { redirectUrl: string }>((resolve, reject) => {
      let isSettled = false;
      const safeReject = (err: any) => {
        if (!isSettled) {
          isSettled = true;
          reject(err);
        }
      };

      const safeResolve = (val: any) => {
        if (!isSettled) {
          isSettled = true;
          resolve(val);
        }
      };

      const requestOptions: http.RequestOptions = {
        method: 'GET',
        headers: {
          'User-Agent': 'AlphaDecorBot/2.0 (ImageValidation; +https://alphadecor.blog)',
          Accept: 'image/jpeg,image/png,image/webp,image/avif;q=0.9,*/*;q=0.5',
        },
        timeout: timeoutMs,
        // Pin DNS lookup to verified IP to prevent DNS rebinding attacks
        lookup: (hostname, lookupOpts, cb) => {
          cb(null, verifiedIp, 4);
        },
      };

      const req = client.request(currentUrl, requestOptions, (res) => {
        // Handle redirect
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          req.destroy();
          try {
            const nextUrl = new URL(res.headers.location, currentUrl).href;
            return safeResolve({ redirectUrl: nextUrl });
          } catch {
            return safeReject(new Error('INVALID_REDIRECT_URL: رابط التحويل غير صالح.'));
          }
        }

        if (res.statusCode !== 200) {
          req.destroy();
          return safeReject(new Error(`HTTP_ERROR_${res.statusCode}: الخادم أعاد رمز استجابة غير ناجح.`));
        }

        // Check Content-Length if reported
        const contentLength = res.headers['content-length'];
        if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
          req.destroy();
          return safeReject(new Error(`IMAGE_SIZE_EXCEEDED: حجم الصورة المعلن يتجاوز الحد المسموح به (${maxSizeBytes} بايت).`));
        }

        const chunks: Buffer[] = [];
        let downloadedBytes = 0;

        res.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;
          if (downloadedBytes > maxSizeBytes) {
            req.destroy();
            return safeReject(new Error(`IMAGE_SIZE_EXCEEDED: تم قطع التنزيل لتجاوز الصورة الحد الأقصى (${maxSizeBytes} بايت).`));
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          safeResolve(Buffer.concat(chunks));
        });

        res.on('error', safeReject);
      });

      req.on('timeout', () => {
        req.destroy();
        safeReject(new Error('DOWNLOAD_TIMEOUT: استغرق تنزيل الصورة وقتاً أطول من المهلة المحددة.'));
      });

      req.on('error', safeReject);
      req.end();
    });

    if ('redirectUrl' in buffer) {
      if (redirectsRemaining <= 0) {
        throw new Error('REDIRECT_LIMIT_EXCEEDED: تم تجاوز الحد الأقصى لإعادة التوجيه (3 تحويلات).');
      }
      redirectsRemaining--;
      currentUrl = buffer.redirectUrl;
      continue;
    }

    return buffer;
  }
}

/**
 * Computes 64-bit difference perceptual hash (dHash) from image buffer
 * Resizes to 9x8 greyscale and compares adjacent pixels horizontally.
 * Resilient against resizing, minor color adjustments, and JPEG/WebP compression.
 */
export async function computePerceptualHash(buffer: Buffer): Promise<string> {
  try {
    const raw = await sharp(buffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    let binary = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const leftPixel = raw[row * 9 + col];
        const rightPixel = raw[row * 9 + col + 1];
        binary += leftPixel > rightPixel ? '1' : '0';
      }
    }

    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = binary.substring(i, i + 4);
      hex += parseInt(nibble, 2).toString(16);
    }
    return hex;
  } catch (err) {
    console.warn('Perceptual hash computation failed on buffer, using deterministic fallback hash:', err);
    let sum = 0;
    for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
      sum = (sum * 31 + buffer[i]) >>> 0;
    }
    return sum.toString(16).padStart(16, '0');
  }
}

/**
 * Calculates Hamming distance (number of bit differences) between two 64-bit hex hashes.
 * Distance <= 8-10 indicates identical or visually duplicate images under compression/resizing.
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    const v1 = parseInt(hash1[i], 16);
    const v2 = parseInt(hash2[i], 16);
    if (isNaN(v1) || isNaN(v2)) return 64;
    let xor = v1 ^ v2;
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

export function isPerceptualDuplicate(hash1: string, hash2: string, threshold = 8): boolean {
  if (!hash1 || !hash2) return false;
  if (hash1 === hash2) return true;
  return hammingDistance(hash1, hash2) <= threshold;
}

/**
 * Downloads and validates an image from URL with full SSRF protection,
 * checks true raster format (rejecting SVG & fake mime), checks dimensions,
 * and generates perceptual hash.
 */
export async function inspectAndHashImageUrl(
  url: string,
  timeoutMs = 7000
): Promise<{
  valid: boolean;
  hash: string;
  width?: number;
  height?: number;
  format?: string;
  sizeBytes?: number;
  optimizedBuffer?: Buffer;
  error?: string;
}> {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return { valid: false, hash: '', error: 'رابط الصورة غير صالح أو غير مكتمل.' };
  }

  try {
    const buffer = await fetchSafeImageBuffer(url, { timeoutMs, maxSizeBytes: 10 * 1024 * 1024 });
    if (!buffer || buffer.length === 0) {
      return { valid: false, hash: '', error: 'فشل استرجاع بيانات الصورة من الرابط.' };
    }

    // Verify true image using sharp (rejects fake images, executables, scripts, SVGs)
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height || !metadata.format) {
      return { valid: false, hash: '', error: 'الملف ليس صورة صالحة أو تالف.' };
    }

    // Enforce raster formats only: Reject SVG to prevent stored XSS and XML attacks
    const allowedFormats = ['jpeg', 'png', 'webp', 'avif'];
    if (!allowedFormats.includes(metadata.format.toLowerCase())) {
      return {
        valid: false,
        hash: '',
        error: `صيغة الصورة (${metadata.format}) غير مسموح بها. يُسمح فقط بصيغ JPEG, PNG, WebP, AVIF.`,
      };
    }

    // Prevent decompression bomb (pixel flood attacks)
    const totalPixels = metadata.width * metadata.height;
    if (metadata.width > 8192 || metadata.height > 8192 || totalPixels > 25000000) {
      return {
        valid: false,
        hash: '',
        error: `أبعاد الصورة تتجاوز الحد الأقصى المسموح به (${metadata.width}x${metadata.height}).`,
      };
    }

    const hash = await computePerceptualHash(buffer);

    return {
      valid: true,
      hash,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      sizeBytes: buffer.length,
    };
  } catch (err: any) {
    return {
      valid: false,
      hash: '',
      error: `فشل التحقق من الصورة: ${err.message || String(err)}`,
    };
  }
}
