import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { seedInitialDataIfEmpty, getDbSettings, getDbArticles, checkDatabaseLiveConnection } from './src/db/repo.ts';
import { authRouter } from './src/server/authRoutes.ts';
import { seoRouter } from './src/server/seoRoutes.ts';
import { dbRouter } from './src/server/dbRoutes.ts';
import { socialRouter } from './src/server/socialRoutes.ts';
import { articleAiRouter, allocateContextualDecorImages } from './src/server/articleAiRoutes.ts';
import { aiChatAssistRouter } from './src/server/aiChatAssistRoutes.ts';
import { countActualWords } from './src/utils/articleValidator.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Trust reverse proxy (Google Cloud Run / Load Balancer)
app.set('trust proxy', 1);

// Disable technology disclosure header
app.disable('x-powered-by');

// Security & AppSec HTTP Headers
app.use((req: Request, res: Response, next: NextFunction) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const scriptDirectives = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://*.google.com https://*.gstatic.com"
    : "'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.google.com https://*.gstatic.com";

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  // Content Security Policy tightened: eliminated bare wildcards, permits Google OAuth / Firebase Auth protocols
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    `script-src ${scriptDirectives}; ` +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com https://*.gstatic.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: blob: https://images.unsplash.com https://*.google.com https://*.gstatic.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://res.cloudinary.com https://*.googleusercontent.com; " +
    "connect-src 'self' https://generativelanguage.googleapis.com https://api.groq.com https://*.google.com https://*.googleapis.com https://*.gstatic.com https://pagead2.googlesyndication.com https://*.firebaseapp.com https://*.firebaseio.com; " +
    "frame-src 'self' https://www.google.com https://maps.google.com https://www.youtube.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.firebaseapp.com https://accounts.google.com https://apis.google.com https://*.google.com; " +
    "frame-ancestors 'self' https://*.run.app https://aistudio.google.com https://*.google.com; " +
    "form-action 'self' https://accounts.google.com; " +
    "object-src 'none'; " +
    "base-uri 'self';"
  );
  // HTTP Strict Transport Security (HSTS) in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
});

function escapeHtmlAttribute(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Universal UTF-8 charset enforcement across all routes & static/HTML responses
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalSetHeader = res.setHeader;
  res.setHeader = function (name: string, value: any) {
    if (typeof name === 'string' && name.toLowerCase() === 'content-type') {
      if (
        typeof value === 'string' &&
        (value.startsWith('text/') || value.includes('json') || value.includes('javascript')) &&
        !value.toLowerCase().includes('charset')
      ) {
        value = `${value}; charset=utf-8`;
      }
    }
    return originalSetHeader.call(this, name, value);
  };

  next();
});

// Explicit API utf-8 header
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Liveness Probe (container is running)
app.get('/health/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    service: 'alpha-decor-paints',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Readiness & Health Probes (database SELECT 1 verified)
app.get(['/health', '/api/health', '/health/ready'], async (req: Request, res: Response) => {
  try {
    const isDbLive = await checkDatabaseLiveConnection();
    if (isDbLive) {
      return res.json({
        status: 'healthy',
        service: 'alpha-decor-paints',
        database: 'connected',
        probe: 'SELECT 1 passed',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(503).json({
      status: 'unhealthy',
      service: 'alpha-decor-paints',
      database: 'disconnected',
      probe: 'SELECT 1 failed',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'error',
      probe: 'SELECT 1 exception',
      error: err?.message || 'Database connection error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Crawlable Server-Rendered Article Routes (SEO & Social Sharing Preview)
app.get(['/article/:slug', '/post/:slug'], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug;
    const articles = await getDbArticles({ statusFilter: 'all' });
    const article = articles.find(
      (a: any) => a.slug === slug || a.id === slug || encodeURIComponent(a.slug) === slug
    );

    if (!article) {
      return next();
    }

    const htmlPath =
      process.env.NODE_ENV === 'production'
        ? path.resolve(__dirname, 'dist', 'index.html')
        : path.resolve(__dirname, 'index.html');

    if (!fs.existsSync(htmlPath)) {
      return next();
    }

    let html = fs.readFileSync(htmlPath, 'utf8');

    const cleanTitle = escapeHtmlAttribute(`${article.title} | الفا ديزاين للديكور والدهانات`);
    const cleanExcerpt = escapeHtmlAttribute(article.excerpt || '');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host') || 'localhost:3000';
    const articleUrl = `${protocol}://${host}/article/${encodeURIComponent(article.slug)}`;
    const safeImage = (article.featuredImage && /^https?:\/\//i.test(article.featuredImage))
      ? escapeHtmlAttribute(article.featuredImage)
      : '';

    html = html.replace(/<title>.*?<\/title>/i, `<title>${cleanTitle}</title>`);
    html = html.replace(
      /<meta name="description" content=".*?" \/>/i,
      `<meta name="description" content="${cleanExcerpt}" />`
    );

    const seoTags = `
    <link rel="canonical" href="${articleUrl}" />
    <meta property="og:title" content="${cleanTitle}" />
    <meta property="og:description" content="${cleanExcerpt}" />
    ${safeImage ? `<meta property="og:image" content="${safeImage}" />` : ''}
    <meta property="og:url" content="${articleUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${cleanTitle}" />
    <meta name="twitter:description" content="${cleanExcerpt}" />
    ${safeImage ? `<meta name="twitter:image" content="${safeImage}" />` : ''}
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": ${JSON.stringify(article.title)},
      "description": ${JSON.stringify(article.excerpt)},
      "image": ${JSON.stringify(article.featuredImage)},
      "datePublished": ${JSON.stringify(article.publishedAt)},
      "url": ${JSON.stringify(articleUrl)},
      "author": {
        "@type": "Person",
        "name": ${JSON.stringify(article.author?.name || 'الحضرى محمود')}
      }
    }
    </script>
    <script>window.__INITIAL_ARTICLE_ID__ = ${JSON.stringify(article.id)};</script>
    `;

    html = html.replace('</head>', `${seoTags}\n</head>`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.warn('Crawlable article route note:', err);
    next();
  }
});

// Mount Modular Specialized Routers
app.use(authRouter);
app.use(seoRouter);
app.use(dbRouter);
app.use(socialRouter);
app.use(articleAiRouter);
app.use(aiChatAssistRouter);

// Firebase Hosting config helper endpoint (prevents SPA HTML fallback returning 200 HTML for init.json)
app.get('/__/firebase/init.json', (_req: Request, res: Response) => {
  try {
    const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
      storageBucket: cfg.storageBucket,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId,
      measurementId: cfg.measurementId || undefined,
    });
  } catch {
    res.status(404).json({ error: 'Firebase config not found' });
  }
});

// Same-Origin Reverse Proxy for Firebase Auth Helper (/__/auth/*)
// Supports standalone top-level browser sessions even under strict 3rd-party cookie rules
app.use('/__/auth', async (req: Request, res: Response) => {
  try {
    const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    const authDomain = cfg.authDomain || `${cfg.projectId}.firebaseapp.com`;
    const targetUrl = `https://${authDomain}/__/auth${req.url}`;

    const headers: Record<string, string> = {};
    if (req.headers['content-type']) {
      headers['content-type'] = String(req.headers['content-type']);
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      redirect: 'manual',
    };

    if (!['GET', 'HEAD'].includes(req.method.toUpperCase()) && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const upstream = await fetch(targetUrl, fetchOptions);
    res.status(upstream.status);

    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'strict-transport-security'].includes(lower)) {
        return;
      }
      res.setHeader(key, value);
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    console.warn('Firebase /__/auth proxy error:', err);
    res.status(502).send('Auth proxy unavailable');
  }
});

// Export utilities for tests or external consumers
export { countActualWords, allocateContextualDecorImages };

// Setup Vite middleware in dev or serve static files in production
async function startServer() {
  try {
    await seedInitialDataIfEmpty();
    console.log('Alpha Design Cloud SQL permanent storage initialized successfully.');
  } catch (seedErr) {
    console.warn('Initial seeding note (will connect lazily):', seedErr);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Sanitized global error handler middleware (never leak stack trace to client)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled server error:', err);
    if (res.headersSent) {
      return next(err);
    }
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
      error:
        process.env.NODE_ENV === 'production'
          ? 'حدث خطأ في معالجة الطلب في الخادم.'
          : err.message || 'Internal Server Error',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Alpha Design Blog server listening on http://0.0.0.0:${PORT}`);
    console.log(
      '[Scheduler Status] 24-hour background auto-publish daemon is deactivated per site owner request. Manual smart AI generation is the active publishing mode.'
    );
  });
}

startServer();
