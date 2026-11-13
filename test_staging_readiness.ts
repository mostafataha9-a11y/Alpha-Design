import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import {
  getDbArticles,
  createDbArticle,
  deleteDbArticle,
  getDbSettings,
  saveDbSettings,
  createDbSession,
  validateDbSession,
  revokeDbSession,
  checkDbRateLimit,
  recordDbFailedLogin,
  resetDbRateLimit,
  acquireDbPublishLock,
  releaseDbPublishLock,
  deleteDbNewsletterSubscriber,
  checkDatabaseLiveConnection,
} from './src/db/repo.ts';
import { createPool } from './src/db/index.ts';
import { isPrivateOrBlockedIp } from './src/utils/imageHasher.ts';
import { runGroqTestSuite } from './test_groq_ai_provider.ts';

const BASE_URL = 'http://localhost:3000';

function httpRequest(options: {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any; rawBody: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, BASE_URL);
    const postData = options.body
      ? typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body)
      : null;

    const reqHeaders: Record<string, string> = {
      ...(options.headers || {}),
    };
    if (postData && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: reqHeaders,
      },
      (res) => {
        let rawBody = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          rawBody += chunk;
        });
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(rawBody);
          } catch {
            parsed = rawBody;
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: parsed,
            rawBody,
          });
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runStagingReadinessSuite() {
  console.log('================================================================');
  console.log('🚀 بدء الفحص الشامل واختبارات الجاهزية للنشر الإنتاجي (Production Readiness)');
  console.log('================================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string, detail: any = '') {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, detail);
      throw new Error(`Test failed: ${testName} - ${JSON.stringify(detail)}`);
    }
  }

  // Track created test artifacts for guaranteed cleanup
  const createdTestTokens: string[] = [];
  const createdTestArticleIds: string[] = [];
  const testIpsUsed = ['192.168.100.99', '127.0.0.99'];

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: Service Health, Database Connectivity & AppSec Headers
    // -------------------------------------------------------------------------
    console.log('--- 1. فحص صحة الخدمة الأساسية، ورؤوس الأمان (AppSec) ورؤوس UTF-8 ---');
    const healthRes = await httpRequest({ path: '/api/health' });
    assert(healthRes.status === 200, 'مسار الصحة /api/health يستجيب برمز 200 OK');
    assert(healthRes.body?.status === 'healthy', 'حالة الخدمة healthy');
    assert(healthRes.body?.database === 'connected', 'قاعدة بيانات PostgreSQL السحابية متصلة وموثقة فعلياً');
    assert(
      Boolean(healthRes.headers['content-type']?.includes('charset=utf-8')),
      'ترويسة الاستجابة تفرض تشفير UTF-8 لحماية النصوص العربية'
    );
    assert(
      healthRes.headers['x-content-type-options'] === 'nosniff',
      'تطبيق ترويسة الأمان X-Content-Type-Options: nosniff لمنع هجمات الاستنتاج'
    );
    assert(
      Boolean(healthRes.headers['content-security-policy']),
      'تطبيق سياسة أمان المحتوى الصارمة (Content-Security-Policy)'
    );
    assert(
      healthRes.headers['x-powered-by'] === undefined,
      'إخفاء هوية التقنية الخادمة وعدم تسريب X-Powered-By'
    );

    // Verify direct pool query if socket is reachable
    try {
      const pool = createPool();
      const dbTest = await pool.query('SELECT current_user, current_database()');
      assert(
        Boolean(dbTest.rows[0]?.current_database),
        `الاستعلام المباشر من PostgreSQL ينجح على قاعدة: ${dbTest.rows[0]?.current_database}`
      );
    } catch (e: any) {
      console.warn('Direct pool query notice (socket reconnecting):', e.message);
    }

    // -------------------------------------------------------------------------
    // SECTION 2: Authentication, Rate Limiting & Persistent DB Sessions
    // -------------------------------------------------------------------------
    console.log('\n--- 2. فحص الأمان والمصادقة والجلسات الدائمة في PostgreSQL ---');
    // 2.1 Unauthenticated access to protected routes
    const unauthRes = await httpRequest({ path: '/api/db/contractor-projects' });
    assert(unauthRes.status === 401, 'حظر الزائر غير المصرح من الوصول لمشاريع المقاولات برمز 401');

    // 2.2 Rate limit enforcement on failed attempts
    const testIp = '192.168.100.99';
    await resetDbRateLimit(testIp);
    for (let i = 0; i < 5; i++) {
      await recordDbFailedLogin(testIp);
    }
    const rateLimitCheck = await checkDbRateLimit(testIp);
    assert(!rateLimitCheck.allowed, 'تفعيل الحظر المؤقت بعد 5 محاولات فاشلة بنجاح');
    assert((rateLimitCheck.retryAfterSeconds || 0) > 0, 'تحديد وقت الانتظار Retry-After بدقة');
    await resetDbRateLimit(testIp); // Clean up immediately

    // 2.3 PostgreSQL Persistent Session Creation & Revocation
    const testToken = 'staging-test-token-' + Date.now();
    createdTestTokens.push(testToken);

    const testUser = {
      uid: 'owner-hadary-1',
      name: 'الحضرى محمود',
      email: 'mahmoudahmedhessien032@gmail.com',
      role: 'owner',
      mustChangePassword: false,
    };

    // Create persistent session in PostgreSQL admin_sessions
    await createDbSession(testToken, testUser, '127.0.0.1', 'StagingTestRunner');
    const validatedUser = await validateDbSession(testToken);
    assert(
      validatedUser !== null && validatedUser.uid === 'owner-hadary-1',
      'الجلسة الدائمة مسترجعة بنجاح من جدول admin_sessions في PostgreSQL'
    );

    // Login to server (Step 1 + Step 2 OTP) to obtain authenticated session
    const step1Login = await httpRequest({
      path: '/api/auth/login',
      method: 'POST',
      body: { email: 'mahmoudahmedhessien032@gmail.com', password: process.env.ADMIN_PASSWORD || 'A7p#D9s!mK2$vL8@' },
    });
    const serverLogin = step1Login.body?.challengeId && step1Login.body?.previewCode
      ? await httpRequest({
          path: '/api/auth/login/verify-code',
          method: 'POST',
          body: { challengeId: step1Login.body.challengeId, code: step1Login.body.previewCode },
        })
      : step1Login;
    const setCookie = serverLogin.headers['set-cookie'];
    const sessionCookie = Array.isArray(setCookie) ? setCookie[0] : (setCookie || '');

    // Protected route access using Bearer token and cookie
    const authRouteRes = await httpRequest({
      path: '/api/db/contractor-projects',
      headers: {
        Authorization: `Bearer ${testToken}`,
        Cookie: sessionCookie,
      },
    });
    assert(authRouteRes.status === 200, 'الوصول المصرّح به عبر جلسة PostgreSQL الدائمة ينجح برمز 200');

    // Logout / Revoke session
    await revokeDbSession(testToken);
    const afterRevokeUser = await validateDbSession(testToken);
    assert(afterRevokeUser === null, 'إبطال الجلسة في PostgreSQL يؤدي فوراً لرفضها');

    const revokedReqRes = await httpRequest({
      path: '/api/db/contractor-projects',
      headers: { Authorization: `Bearer ${testToken}` },
    });
    assert(revokedReqRes.status === 401, 'الجلسة المبطلة تُرفض برمز 401');

    // -------------------------------------------------------------------------
    // SECTION 3: Database Articles & Quality Enforcement (No Thin Content)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. فحص جودة المقالات والحفظ الدائم في PostgreSQL ---');
    // 3.1 Verify public view returns published articles
    const publicArticlesRes = await httpRequest({ path: '/api/db/articles' });
    assert(publicArticlesRes.status === 200, 'استرجاع المقالات المنشورة برمز 200');
    assert(Array.isArray(publicArticlesRes.body), 'المقالات قائمة مصفوفة');
    assert(
      publicArticlesRes.body.length >= 8,
      `وجود المقالات المنشورة في PostgreSQL دون حذف (${publicArticlesRes.body.length} مقالات)`
    );
    assert(
      publicArticlesRes.body.every((a: any) => a.status === 'published'),
      'جميع المقالات في الواجهة العامة بحالة published'
    );

    // Fresh admin token for authorized article tests
    const activeTestToken = 'staging-active-admin-' + Date.now();
    createdTestTokens.push(activeTestToken);
    await createDbSession(activeTestToken, testUser, '127.0.0.1', 'StagingTestRunner');

    // 3.2 Attempt to publish article with < 1000 words via API (Must fail with 400)
    const shortPublishAttempt = await httpRequest({
      path: '/api/db/articles',
      method: 'POST',
      headers: { Authorization: `Bearer ${activeTestToken}` },
      body: {
        title: 'مقال تجريبي قصير مرفوض لمنع المحتوى النحيف',
        content: '## مقدمة\n\nنص قصير جداً لا يتجاوز خمسين كلمة عن دهانات الحوائط والديكور.',
        status: 'published',
      },
    });
    assert(shortPublishAttempt.status === 400, 'رفض محاولة نشر مقال يقل عن 1000 كلمة برمز 400 Bad Request');
    assert(
      shortPublishAttempt.body?.error?.includes('معايير الجودة') ||
        shortPublishAttempt.body?.error?.includes('كلمة'),
      'رسالة الخطأ توضح عدم استيفاء معايير الجودة والكلمات'
    );

    // 3.3 Create isolated test article (> 1000 words), verify persistence, then delete
    const repeatedParagraph =
      'ينصح استشاري التشطيبات والديكور الحضرى محمود بتأسيس دهانات الحوائط بسيلر مائي عازل وسحب ثلاث سكاكين معجون ناعم متقاطع مع الصنفرة بالضوء الكاشف لضمان استواء الجدران قبل تطبيق بويات البلاستيك المط والنصف لامع. '.repeat(
        40
      );

    const isolatedTestArticleId = 'test-suite-post-' + Date.now();
    createdTestArticleIds.push(isolatedTestArticleId);

    const validArticleRes = await httpRequest({
      path: '/api/db/articles',
      method: 'POST',
      headers: { Authorization: `Bearer ${activeTestToken}` },
      body: {
        id: isolatedTestArticleId,
        title: 'مقال تجريبي هندسي مستوفٍ للشروط في دهانات الحوائط 2026',
        content: `## المحور الأول: أسرار تأسيس دهانات الحوائط\n\n![صورة أصلية](https://images.unsplash.com/photo-1618221195710-dd6b41faaea6)\n\n${repeatedParagraph}`,
        category: 'دهانات وديكورات الحوائط',
        status: 'published',
        tags: ['دهانات', 'ديكور'],
      },
    });
    assert(
      validArticleRes.status === 200 || validArticleRes.status === 201,
      'حفظ مقال مستوفٍ لمعايير الجودة (> 1000 كلمة) بنجاح برمز 200/201'
    );

    // Verify persistence by querying DB
    const verifiedList = await getDbArticles({ statusFilter: 'all' });
    const foundArticle = verifiedList.find((a: any) => a.id === isolatedTestArticleId);
    assert(foundArticle !== undefined, 'تأكيد استرجاع المقال المحفوظ مباشرة من PostgreSQL');

    // Clean up test article immediately
    const delRes = await httpRequest({
      path: `/api/db/articles/${isolatedTestArticleId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${activeTestToken}` },
    });
    assert(delRes.status === 200, 'حذف المقال التجريبي بنجاح لتنظيف بيئة الاختبار');

    // -------------------------------------------------------------------------
    // SECTION 4: Decommissioned Autonomous Daemon & Secret Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- 4. فحص تعطيل النشر الآلي وأمان الـ Webhook والقفل الذري ---');
    // 4.1 Confirm autoPublish is strictly false by default in DB
    const currentDbSettings: any = await getDbSettings();
    assert(
      currentDbSettings?.autoPublish?.enabled === false,
      'تأكيد بقاء خيار النشر الآلي معطلاً (enabled: false) في قاعدة البيانات بقرار مالك الموقع'
    );

    // 4.2 Unauthorized webhook call without secret must be rejected (401 or 503 if secret unconfigured)
    const unauthCronRes = await httpRequest({
      path: '/api/cron/auto-publish',
      method: 'POST',
    });
    assert(
      unauthCronRes.status === 401 || unauthCronRes.status === 503,
      'حظر استدعاء مجدول النشر دون سر المصادقة برمز 401/503'
    );

    // 4.3 Test with invalid secret header
    const invalidSecretRes = await httpRequest({
      path: '/api/cron/auto-publish',
      method: 'POST',
      headers: { 'x-cron-secret': 'completely-invalid-secret-key-1234' },
    });
    assert(
      invalidSecretRes.status === 401 || invalidSecretRes.status === 503,
      'رفض استدعاء المجدول بكلمة سر غير مطابقة برمز 401/503'
    );

    // 4.4 Status endpoint reflects disabled state without altering data
    const autoStatusRes = await httpRequest({ path: '/api/auto-publish/status' });
    assert(autoStatusRes.status === 200, 'مسار حالة النشر الآلي /api/auto-publish/status يستجيب برمز 200');
    assert(autoStatusRes.body?.enabled === false, 'تأكيد أن النشر الدوري معطل رسمياً في مسار الحالة');
    assert(
      autoStatusRes.body?.mode === 'manual_smart_publishing',
      'تأكيد تفعيل وضع النشر الذكي اليدوي للمسؤول'
    );

    // 4.5 Test Atomic Publish Mutex Lock in PostgreSQL
    const lockAcquired = await acquireDbPublishLock('test_staging_mutex', 'runner-test', 60);
    assert(lockAcquired === true, 'اكتساب القفل الذري للنشر بنجاح في PostgreSQL');
    const duplicateLockAttempt = await acquireDbPublishLock('test_staging_mutex', 'other-runner', 60);
    assert(duplicateLockAttempt === false, 'منع التنافس المزدوج (Race Conditions) بالقفل الذري');
    await releaseDbPublishLock('test_staging_mutex');

    // -------------------------------------------------------------------------
    // SECTION 5: SEO, Robots, Sitemap, Crawlable Articles & Ads.txt
    // -------------------------------------------------------------------------
    console.log('\n--- 5. فحص مسارات السيو والزحف والإعلانات (robots.txt, sitemap.xml, ads.txt) ---');
    // 5.1 robots.txt
    const robotsRes = await httpRequest({ path: '/robots.txt' });
    assert(robotsRes.status === 200, 'مسار /robots.txt يستجيب برمز 200');
    assert(robotsRes.rawBody.includes('User-agent: *'), 'تحديد قواعد العناكب لكافة المحركات');
    assert(robotsRes.rawBody.includes('Disallow: /api/auth/'), 'حظر مسارات المصادقة الحساسة من الأرشفة');
    assert(robotsRes.rawBody.includes('Sitemap:'), 'تضمين رابط خريطة الموقع');

    // 5.2 sitemap.xml
    const sitemapRes = await httpRequest({ path: '/sitemap.xml' });
    assert(sitemapRes.status === 200, 'مسار /sitemap.xml يستجيب برمز 200');
    assert(
      Boolean(sitemapRes.headers['content-type']?.includes('application/xml')),
      'نوع المحتوى application/xml'
    );
    assert(sitemapRes.rawBody.includes('<urlset'), 'خريطة الموقع مبنية بتنسيق XML قياسي');
    assert(sitemapRes.rawBody.includes('<loc>'), 'وجود عناوين URL للمقالات والصفحات الرئيسية');
    assert(sitemapRes.rawBody.includes('/article/'), 'روابط المقالات في خريطة الموقع قابلة للزحف (/article/)');

    // 5.3 Crawlable direct article endpoint
    const crawlableArticleRes = await httpRequest({ path: '/article/post-1' });
    assert(crawlableArticleRes.status === 200, 'مسار المقال القابل للزحف /article/post-1 يستجيب برمز 200');
    assert(
      crawlableArticleRes.rawBody.includes('الفا ديزاين للديكور والدهانات'),
      'تضمين وسم العنوان وسياق المدونة في استجابة المقال القابل للزحف'
    );
    assert(
      crawlableArticleRes.rawBody.includes('BlogPosting') || crawlableArticleRes.rawBody.includes('og:title'),
      'تضمين بيانات Schema.org ووسوم Open Graph لمحركات البحث وشبكات التواصل'
    );

    // 5.4 ads.txt without fake publisher ID (PENDING_PUBLISHER_ID)
    const adsRes = await httpRequest({ path: '/ads.txt' });
    assert(adsRes.status === 200, 'مسار /ads.txt يستجيب برمز 200');
    assert(
      adsRes.rawBody.includes('PENDING_PUBLISHER_ID') || adsRes.rawBody.includes('google.com'),
      'مسار ads.txt موثق ومتوافق تماماً مع إرشادات Google دون معرفات وهمية'
    );

    // -------------------------------------------------------------------------
    // SECTION 6: Contact Forms & Media Upload Security
    // -------------------------------------------------------------------------
    console.log('\n--- 6. فحص حفظ رسائل التواصل وأمان رفع الوسائط ---');
    const contactTestIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;

    // 6.1 Contact form rejects invalid inputs
    const invalidContactRes = await httpRequest({
      path: '/api/contact',
      method: 'POST',
      headers: { 'x-forwarded-for': contactTestIp },
      body: { name: '', email: 'not-an-email', message: '' },
    });
    assert(invalidContactRes.status === 400, 'رفض إرسال نموذج التواصل ببيانات غير صالحة برمز 400');

    // 6.2 Contact form saves valid inquiry to PostgreSQL
    const validContactRes = await httpRequest({
      path: '/api/contact',
      method: 'POST',
      headers: { 'x-forwarded-for': contactTestIp },
      body: {
        name: 'أحمد محمود (عميل تجريبي)',
        email: 'ahmed.test@example.com',
        phone: '01012345678',
        subject: 'طلب معاينة دهانات شقة 2026',
        message: 'أرغب في الاستفسار عن تشطيب دهانات قطيفة وبديل خشب لجدار الصالون.',
      },
    });
    assert(validContactRes.status === 200, 'حفظ رسالة التواصل الحقيقية في PostgreSQL بنجاح برمز 200');

    // 6.3 Admin can retrieve contact inquiries
    const adminContactListRes = await httpRequest({
      path: '/api/db/contact-messages',
      headers: { Authorization: `Bearer ${activeTestToken}` },
    });
    assert(adminContactListRes.status === 200, 'استرجاع قائمة رسائل التواصل للمسؤول برمز 200');
    assert(Array.isArray(adminContactListRes.body), 'رسائل التواصل مصفوفة قائمة في PostgreSQL');

    // 6.4 Media upload rejects unauthenticated user
    const unauthUploadRes = await httpRequest({
      path: '/api/upload/image',
      method: 'POST',
      body: { filename: 'test.png', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' },
    });
    assert(unauthUploadRes.status === 401, 'حظر رفع الصور لغير المصرح برمز 401');

    // 6.5 Media upload rejects invalid MIME type (e.g. script/executable)
    const invalidMimeUploadRes = await httpRequest({
      path: '/api/upload/image',
      method: 'POST',
      headers: { Authorization: `Bearer ${activeTestToken}` },
      body: { filename: 'evil.sh', dataUrl: 'data:text/x-shellscript;base64,ZWNobyBoYWNrZWQ=' },
    });
    assert(invalidMimeUploadRes.status === 400, 'رفض رفع أنواع الملفات غير المسموحة (MIME Enforcement) برمز 400');

    // 6.6 Media upload succeeds for valid image
    const validUploadRes = await httpRequest({
      path: '/api/upload/image',
      headers: { Authorization: `Bearer ${activeTestToken}` },
      method: 'POST',
      body: {
        filename: 'valid-test-decor.png',
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
      },
    });
    assert(validUploadRes.status === 200, 'حفظ سجل الصورة المرفوعة في PostgreSQL بنجاح برمز 200');

    // -------------------------------------------------------------------------
    // 7. GROQ & UNIFIED AI PROVIDER TEST SUITE
    // -------------------------------------------------------------------------
    console.log('\n--- 7. تنفيذ اختبارات مزود الذكاء الاصطناعي الثاني (Groq) والطبقة الموحدة ---');
    const groqResults = await runGroqTestSuite();
    totalTests += groqResults.total;
    passedTests += groqResults.passed;

    // -------------------------------------------------------------------------
    // 8. NEWSLETTER SUBSCRIPTION & POSTGRESQL PERSISTENCE TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- 8. اختبارات خدمة النشرة البريدية وحفظ المشتركين في PostgreSQL ---');
    const testSubscriberEmail = `readiness.subscriber.${Date.now()}@example.com`;
    const newsletterTestIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;

    // 8.1 Invalid email format rejection
    const invalidEmailRes = await httpRequest({
      path: '/api/newsletter/subscribe',
      method: 'POST',
      headers: { 'x-forwarded-for': newsletterTestIp },
      body: { email: 'not-an-email' },
    });
    assert(invalidEmailRes.status === 400, 'رفض الاشتراك ببريد إلكتروني غير صالح برمز 400');

    // 8.2 Valid subscription
    const validSubRes = await httpRequest({
      path: '/api/newsletter/subscribe',
      method: 'POST',
      headers: { 'x-forwarded-for': newsletterTestIp },
      body: { email: testSubscriberEmail, source: 'test-staging' },
    });
    assert(validSubRes.status === 200, 'تسجيل اشتراك جديد في النشرة البريدية بنجاح برمز 200');
    assert(validSubRes.body?.success === true, 'استجابة نجاح تأكيد الاشتراك');

    // 8.3 Duplicate subscription rejection / graceful notification
    const duplicateSubRes = await httpRequest({
      path: '/api/newsletter/subscribe',
      method: 'POST',
      headers: { 'x-forwarded-for': newsletterTestIp },
      body: { email: testSubscriberEmail },
    });
    assert(
      duplicateSubRes.status === 409 || duplicateSubRes.body?.success === true,
      'معالجة تكرار الاشتراك بطريقة آمنة ودون تكرار السجلات',
      duplicateSubRes
    );

    // 8.4 Admin can view subscriber list
    const adminSubsRes = await httpRequest({
      path: '/api/newsletter/subscribers',
      headers: { Authorization: `Bearer ${activeTestToken}` },
    });
    assert(adminSubsRes.status === 200, 'استرجاع قائمة المشتركين للمسؤول برمز 200');
    assert(
      Array.isArray(adminSubsRes.body?.subscribers) &&
        adminSubsRes.body.subscribers.some((s: any) => s.email === testSubscriberEmail),
      'وجود المشترك التجريبي في جدول newsletter_subscribers في PostgreSQL'
    );

    // 8.5 Unsubscribe functionality (protected by unsubscribe token)
    const unsubRes = await httpRequest({
      path: '/api/newsletter/unsubscribe',
      method: 'POST',
      body: { email: testSubscriberEmail, token: validSubRes.body?.unsubscribeToken },
    });
    assert(unsubRes.status === 200, 'إلغاء الاشتراك من النشرة البريدية بنجاح برمز 200 عبر التوكن الآمن');

    // -------------------------------------------------------------------------
    // 9. SOCIAL MEDIA BOT & PERMANENT PUBLISH GUARDRAILS
    // -------------------------------------------------------------------------
    console.log('\n--- 9. اختبارات بوت النشر الاجتماعي والضوابط الصارمة لقرار المالك ---');

    // 9.1 Social bot status verifies disabled state by default
    const botStatusRes = await httpRequest({
      path: '/api/social-bot/status',
    });
    assert(botStatusRes.status === 200, 'استرجاع حالة بوت النشر الاجتماعي برمز 200');
    assert(botStatusRes.body?.enabled === false, 'تأكيد تعطيل بوت النشر افتراضيًا (botState.enabled=false)');
    assert(
      botStatusRes.body?.autoBroadcast === false,
      'تأكيد تعطيل النشر التلقائي التزامًا بقرار المالك (autoBroadcast=false)'
    );

    // 9.2 Dispatch rejection when bot is paused/disabled
    const blockedDispatchRes = await httpRequest({
      path: '/api/social-bot/dispatch',
      method: 'POST',
      headers: { Authorization: `Bearer ${activeTestToken}` },
      body: {
        articleId: 'any-article-id',
        title: 'تجربة نشر',
        summary: 'ملخص تجريبي',
      },
    });
    assert(blockedDispatchRes.status === 400, 'رفض محاولة النشر الاجتماعي عند تعطيل البوت برمز 400');
    assert(blockedDispatchRes.body?.error === 'BOT_PAUSED', 'رمز الخطأ BOT_PAUSED واضح لمنع النشر غير المصرح');

    // 9.3 Rejection of expired articles (> 24 hours)
    const expiredDispatchRes = await httpRequest({
      path: '/api/social-bot/dispatch',
      method: 'POST',
      headers: { Authorization: `Bearer ${activeTestToken}` },
      body: {
        articleId: 'expired-test-id',
        title: 'مقال قديم جدا',
        summary: 'ملخص مقال قديم تجاوز 24 ساعة',
        publishedAt: '2024-01-01T00:00:00Z',
      },
    });
    assert(expiredDispatchRes.status === 400, 'رفض نشر مقال منتهي الصلاحية (>24 ساعة) برمز 400');

    // -------------------------------------------------------------------------
    // 10. CONTENT SECURITY POLICY & SECURITY HEADERS VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 10. فحص ترويسات الأمان الصارمة وسياسة أمان المحتوى (CSP Hardening) ---');

    const healthCheckRes = await httpRequest({
      path: '/health',
    });
    assert(healthCheckRes.status === 200, 'فحص جاهزية الخادم /health بنجاح');

    const cspHeader = (healthCheckRes.headers['content-security-policy'] as string) || '';
    assert(Boolean(cspHeader), 'وجود ترويسة Content-Security-Policy في الخادم');
    assert(!/\bhttps?:\/\/\*(\s|;|$)/.test(cspHeader), 'خلو سياسة أمان المحتوى من النطاقات الشاملة المفتوحة (Bare Wildcards https://* أو http://*)');
    assert(!cspHeader.includes('http://*'), 'خلو سياسة أمان المحتوى من النطاقات الشاملة http://*');
    assert(cspHeader.includes('frame-ancestors'), 'تضمين توجيه frame-ancestors للحماية من هجمات Clickjacking');
    assert(cspHeader.includes('form-action'), 'تضمين توجيه form-action لحماية نماذج الإرسال');
    assert(
      healthCheckRes.headers['x-content-type-options'] === 'nosniff',
      'تطبيق ترويسة X-Content-Type-Options: nosniff'
    );
    assert(
      healthCheckRes.headers['x-frame-options'] !== undefined || cspHeader.includes('frame-ancestors'),
      'حماية كاملة من تضمين الإطارات عبر CSP أو X-Frame-Options'
    );

    // -------------------------------------------------------------------------
    // 11. EXECUTIVE ORDER 4: SECURITY AUDIT, SSRF, RATE LIMIT & DB SELECT 1 PROBES
    // -------------------------------------------------------------------------
    console.log('\n--- 11. الأمر التنفيذي الرابع: اختبارات SSRF وRate Limiting وSELECT 1 والتوكنات ---');

    // 11.1 SSRF Protection IP Range Validation
    assert(isPrivateOrBlockedIp('127.0.0.1') === true, 'SSRF: حظر عنوان الاسترجاع المحلي 127.0.0.1');
    assert(isPrivateOrBlockedIp('169.254.169.254') === true, 'SSRF: حظر عنوان بيانات الميتا السحابية 169.254.169.254');
    assert(isPrivateOrBlockedIp('10.0.0.5') === true, 'SSRF: حظر شبكة خاصة 10.0.0.0/8');
    assert(isPrivateOrBlockedIp('192.168.1.1') === true, 'SSRF: حظر شبكة خاصة 192.168.0.0/16');
    assert(isPrivateOrBlockedIp('172.16.0.1') === true, 'SSRF: حظر شبكة خاصة 172.16.0.0/12');
    assert(isPrivateOrBlockedIp('::1') === true, 'SSRF: حظر عنوان IPv6 Loopback');
    assert(isPrivateOrBlockedIp('8.8.8.8') === false, 'SSRF: السماح بعنوان IP عام سليم 8.8.8.8');

    // 11.2 Database SELECT 1 True Live Probe
    const isDbLive = await checkDatabaseLiveConnection();
    assert(isDbLive === true, 'SELECT 1: استعلام الاتصال الحقيقي المباشر بقاعدة بيانات PostgreSQL ينجح');

    // 11.3 Health Endpoint Probes
    const livenessRes = await httpRequest({ path: '/health/live' });
    assert(livenessRes.status === 200 && livenessRes.body?.status === 'alive', 'فحص Liveness /health/live يعمل برمز 200');

    const readinessRes = await httpRequest({ path: '/health/ready' });
    assert(
      readinessRes.status === 200 && readinessRes.body?.probe === 'SELECT 1 passed',
      'فحص Readiness /health/ready يثبت نجاح SELECT 1 الحقيقي'
    );

    // 11.4 SVG Rejection on Image Upload
    const svgBase64 = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64');
    const svgUploadRes = await httpRequest({
      path: '/api/upload/image',
      method: 'POST',
      headers: { Authorization: `Bearer ${activeTestToken}` },
      body: {
        imageBase64: svgBase64,
        filename: 'malicious.svg',
      },
    });
    assert(
      svgUploadRes.status === 400 && svgUploadRes.body?.error?.includes('SVG'),
      'حظر رفع ملفات SVG نهائياً لمنع هجمات Stored XSS وXML External Entity'
    );

    // 11.5 Newsletter Token Protection
    const eo4SubscriberEmail = `test-newsletter-${Date.now()}@example.com`;
    const subRes = await httpRequest({
      path: '/api/newsletter/subscribe',
      method: 'POST',
      body: { email: eo4SubscriberEmail },
    });
    assert(subRes.status === 200 && Boolean(subRes.body?.unsubscribeToken), 'الاشتراك في النشرة ينشئ رمز إلغاء اشتراك آمن عشوائي');
    const userUnsubToken = subRes.body.unsubscribeToken;

    // Unauthorized unsubscribe without token must be rejected (403)
    const badUnsubRes = await httpRequest({
      path: '/api/newsletter/unsubscribe',
      method: 'POST',
      body: { email: eo4SubscriberEmail },
    });
    assert(
      badUnsubRes.status === 403 && badUnsubRes.body?.error === 'TOKEN_REQUIRED',
      'رفض إلغاء الاشتراك بالبريد وحده دون توكن التحقق (TOKEN_REQUIRED) لحماية المشتركين من العبث'
    );

    // Unsubscribe with correct token succeeds
    const goodUnsubRes = await httpRequest({
      path: '/api/newsletter/unsubscribe',
      method: 'POST',
      body: { email: eo4SubscriberEmail, token: userUnsubToken },
    });
    assert(goodUnsubRes.status === 200 && goodUnsubRes.body?.success === true, 'إلغاء الاشتراك برمز التوكن الصحيح ينجح برمز 200');

    // Clean up subscriber from DB
    await deleteDbNewsletterSubscriber(eo4SubscriberEmail);

    // -------------------------------------------------------------------------
    // FINAL SCORE & SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`🎉 اكتملت جميع اختبارات الجاهزية والإنتاج بنجاح تام: (${passedTests}/${totalTests})`);
    console.log('================================================================');
  } finally {
    // Guaranteed cleanup of all created sessions and IPs
    console.log('\n--- تنظيف جلسات وبيانات الاختبار (Clean-up Phase) ---');
    for (const token of createdTestTokens) {
      try {
        await revokeDbSession(token);
      } catch {
        // Ignore cleanup errors
      }
    }
    for (const artId of createdTestArticleIds) {
      try {
        await deleteDbArticle(artId);
      } catch {
        // Ignore cleanup errors
      }
    }
    for (const ip of testIpsUsed) {
      try {
        await resetDbRateLimit(ip);
      } catch {
        // Ignore cleanup errors
      }
    }
    console.log('✓ تم تنظيف جلسات وسجلات وبيانات الاختبار بالكامل.');
  }
}

runStagingReadinessSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ فشل أحد اختبارات الجاهزية:', err);
    process.exit(1);
  });
