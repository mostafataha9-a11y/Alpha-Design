import { Router, Request, Response } from 'express';
import { getDbArticles, getDbSettings } from '../db/repo.ts';

export const seoRouter = Router();

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * 1. Google AdSense ads.txt
 * Serves verified publisher ID or clear setup guidance when pending configuration.
 */
seoRouter.get('/ads.txt', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  try {
    const currentSettings: any = await getDbSettings();
    const rawPublisherId = currentSettings?.ads?.adSensePublisherId?.trim();

    if (rawPublisherId) {
      const cleanPubId = rawPublisherId.startsWith('ca-')
        ? rawPublisherId.replace(/^ca-/, '')
        : rawPublisherId;

      let output = `# Google AdSense Authorized Digital Sellers (ads.txt)\n# Domain: ${req.get('host')}\n# Publisher: ${cleanPubId}\ngoogle.com, ${cleanPubId}, DIRECT, f08c47fec0942fa0\n`;

      if (Array.isArray(currentSettings?.ads?.adsTxtCustomEntries)) {
        for (const entry of currentSettings.ads.adsTxtCustomEntries) {
          if (entry.trim()) output += `${entry.trim()}\n`;
        }
      }
      return res.send(output);
    }

    const setupText = [
      '# ==============================================================================',
      '# Google AdSense ads.txt - Alpha Decor & Paints (ألفا للديكور والدهانات)',
      '# الموقع الرسمي بإشراف: الحضرى محمود',
      '# ------------------------------------------------------------------------------',
      '# حالة الإعداد: بانتظار إدخال معرف الناشر الفعلي (AdSense Publisher ID).',
      '# تنبيه أمان ومطابقة: لم يتم وضع أي معرفات تجريبية أو وهمية منعاً لمخالفة سياسات Google.',
      '# عند استلام موافقة حساب AdSense، أدخل المعرف في لوحة التحكم (الإعدادات > الإعلانات).',
      '# الصيغة المعتمدة: google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0',
      '# ==============================================================================',
      '# Status: PENDING_PUBLISHER_ID',
    ].join('\n');

    res.send(setupText);
  } catch (err) {
    console.error('Error generating ads.txt:', err);
    res.send('# ads.txt - Status: PENDING_PUBLISHER_ID\n');
  }
});

/**
 * 2. Crawlers robots.txt
 */
seoRouter.get('/robots.txt', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  const content = [
    '# Robots.txt for Alpha Decor & Paints (ألفا للديكور والدهانات)',
    '# الموقع الرسمي لاستشارات وتشطيبات الديكور والدهانات المعمارية',
    'User-agent: *',
    'Allow: /',
    'Allow: /assets/',
    'Allow: /api/db/articles',
    'Disallow: /api/auth/',
    'Disallow: /api/db/contractor-projects',
    'Disallow: /api/social-bot/',
    'Disallow: /#backend',
    'Disallow: /backend',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ].join('\n');

  res.send(content);
});

/**
 * 3. Dynamic XML Sitemap
 */
seoRouter.get('/sitemap.xml', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;
  const today = new Date().toISOString().split('T')[0];

  try {
    const rawArticles = await getDbArticles();
    const publishedArticles = Array.isArray(rawArticles)
      ? rawArticles.filter((a) => (a.status || 'published') === 'published')
      : [];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    const staticPages = [
      { path: '', priority: '1.0', changefreq: 'daily' },
      { path: '#articles', priority: '0.9', changefreq: 'daily' },
      { path: '#about', priority: '0.8', changefreq: 'monthly' },
      { path: '#contact', priority: '0.8', changefreq: 'monthly' },
      { path: '#privacy', priority: '0.5', changefreq: 'monthly' },
      { path: '#terms', priority: '0.5', changefreq: 'monthly' },
    ];

    for (const page of staticPages) {
      const loc = page.path ? `${baseUrl}/${page.path}` : `${baseUrl}/`;
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(loc)}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    for (const art of publishedArticles) {
      const artUrl = `${baseUrl}/article/${encodeURIComponent(art.slug || art.id)}`;
      const pubDate = art.publishedAt
        ? new Date(art.publishedAt).toISOString().split('T')[0]
        : today;

      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(artUrl)}</loc>\n`;
      xml += `    <lastmod>${pubDate}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    xml += '</urlset>';
    res.send(xml);
  } catch (err) {
    console.error('Error generating sitemap.xml:', err);
    let fallbackXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    fallbackXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    fallbackXml += `  <url><loc>${escapeXml(baseUrl)}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>\n`;
    fallbackXml += `  <url><loc>${escapeXml(baseUrl)}/#articles</loc><lastmod>${today}</lastmod><priority>0.9</priority></url>\n`;
    fallbackXml += '</urlset>';
    res.send(fallbackXml);
  }
});
