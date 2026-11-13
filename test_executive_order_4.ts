import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import {
  verifyOwnerCredentials,
  verifyGoogleAuth,
  checkDatabaseLiveConnection,
  checkDbApiRateLimit,
  getDbArticles,
  getDbSettings,
} from './src/db/repo.ts';
import {
  isPrivateOrBlockedIp,
  hammingDistance,
  isPerceptualDuplicate,
} from './src/utils/imageHasher.ts';
import { allocateContextualDecorImages } from './src/server/articleAiRoutes.ts';

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

async function runExecutiveOrder4Suite() {
  console.log('================================================================');
  console.log('🔒 فحص وتدقيق الأمر التنفيذي الرابع: الأمان والجلسات والصور والتكاملات');
  console.log('================================================================\n');

  let total = 0;
  let passed = 0;

  function assert(cond: boolean, desc: string, extra: any = '') {
    total++;
    if (cond) {
      console.log(`✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${desc}`, extra);
      throw new Error(`Test failed: ${desc}`);
    }
  }

  // 1. Admin Credentials Verification
  console.log('--- 1. التحقق من هوية وبيانات اعتماد المسؤول المعتمد ورصد حظر البريد السابق ---');
  const adminEmail = 'mahmoudahmedhessien032@gmail.com';
  const adminPass = 'A7p#D9s!mK2$vL8@';
  const credsCheck = await verifyOwnerCredentials(adminPass, adminEmail);
  assert(credsCheck.valid === true, 'بيانات اعتماد المالك المعتمد (mahmoudahmedhessien032@gmail.com) صالحة ومطابقة');
  assert(credsCheck.user?.email === adminEmail, 'البريد الإلكتروني المسترجع يطابق mahmoudahmedhessien032@gmail.com بدقة');
  assert(credsCheck.user?.mustChangePassword === false, 'حالة mustChangePassword مضبوطة على false للمسؤول');

  // Verify old password is rejected
  const legacyPassCheck = await verifyOwnerCredentials('#%5rU)2;-YHZzL"', adminEmail);
  assert(legacyPassCheck.valid === false, 'تم رفض كلمة المرور القديمة بعد اعتماد كلمة المرور الجديدة');

  // Verify mostafa.taha9 is blocked
  const blockedCheck = await verifyGoogleAuth('mostafa.taha9@gmail.com');
  assert(blockedCheck.valid === false, 'تم التحقق من حظر البريد mostafa.taha9@gmail.com ورفض دخوله بنجاح');

  // New Owner Name Login Verification ('الحضرى محمود')
  const nameCredsCheck = await verifyOwnerCredentials(adminPass, 'الحضرى محمود');
  assert(nameCredsCheck.valid === true, 'تسجيل الدخول باسم صاحب الموقع (الحضرى محمود) ينجح ومطابق في قاعدة البيانات');
  assert(nameCredsCheck.user?.name === 'الحضرى محمود', 'الاسم المسترجع يطابق صاحب الموقع الحضرى محمود');

  // 2. Two-Step Email OTP Login API & HttpOnly Cookie
  console.log('\n--- 2. فحص مسار تسجيل الدخول بكلمة المرور وكود التحقق عبر البريد واستخدام Cookie HttpOnly ---');
  // 2.1 Verify Google Auth endpoint is disabled (410)
  const disabledGoogleRes = await httpRequest({
    path: '/api/auth/google',
    method: 'POST',
    body: { email: adminEmail },
  });
  assert(disabledGoogleRes.status === 410, 'تم إلغاء مسار تسجيل الدخول عبر Google (/api/auth/google -> 410)');

  // 2.2 Verify unauthenticated emergency-key request is blocked (401)
  const unauthEmergencyRes = await httpRequest({
    path: '/api/auth/2fa/emergency-key/request',
    method: 'POST',
    body: { email: adminEmail },
  });
  assert(unauthEmergencyRes.status === 401, 'حماية مسار مفتاح الطوارئ من الوصول غير المصادق عليه (401)');

  // 2.3 Step 1 login issues OTP challenge without setting session cookie yet
  const step1Res = await httpRequest({
    path: '/api/auth/login',
    method: 'POST',
    body: { email: adminEmail, password: adminPass },
  });
  assert(step1Res.status === 200, 'الخطوة الأولى (البريد + كلمة المرور) تنجح برمز 200 OK');
  assert(step1Res.body?.requiresEmailCode === true && Boolean(step1Res.body?.challengeId), 'إصدار تحدي كود التحقق عبر البريد الإلكتروني');
  assert(!step1Res.headers['set-cookie'], 'عدم إصدار كوكي الجلسة قبل إدخال كود التحقق البريدي');

  // 2.4 Reject invalid 6-digit OTP code
  const badOtpRes = await httpRequest({
    path: '/api/auth/login/verify-code',
    method: 'POST',
    body: { challengeId: step1Res.body.challengeId, code: '000000' },
  });
  assert(badOtpRes.status === 401, 'رفض كود التحقق الخاطئ برمز 401 Unauthorized');

  // 2.5 Verify valid OTP code issues HttpOnly session cookie
  const otpCode = step1Res.body?.previewCode;
  assert(typeof otpCode === 'string' && /^\d{6}$/.test(otpCode), 'كود التحقق المولد مكون من 6 أرقام صحيحة');

  const verifyOtpRes = await httpRequest({
    path: '/api/auth/login/verify-code',
    method: 'POST',
    body: { challengeId: step1Res.body.challengeId, code: otpCode },
  });
  assert(verifyOtpRes.status === 200, 'تأكيد كود التحقق البريدي ينجح برمز 200 OK');
  assert(verifyOtpRes.body?.success === true, 'استجابة تأكيد كود البريد تشير لنجاح العملية');
  assert(verifyOtpRes.body?.token === undefined, 'عدم تسريب توكن الجلسة داخل جسم استجابة الـ JSON');

  const setCookieHeader = verifyOtpRes.headers['set-cookie'];
  assert(Array.isArray(setCookieHeader) && setCookieHeader.some(c => c.includes('alpha_session')), 'تعيين كوكي الجلسة alpha_session في الترويسات');
  const sessionCookie = (setCookieHeader || []).find(c => c.includes('alpha_session')) || '';
  assert(sessionCookie.includes('HttpOnly'), 'الكوكي مشفر ومحمي بخاصية HttpOnly لمنع قراءته عبر JavaScript');
  assert(sessionCookie.includes('SameSite=Lax') || sessionCookie.includes('SameSite=Strict') || sessionCookie.includes('SameSite=None'), 'تطبيق حماية SameSite على الكوكي');

  // Extract raw cookie value for authenticated tests
  const cookieMatch = sessionCookie.match(/alpha_session=([^;]+)/);
  const rawCookie = cookieMatch ? `alpha_session=${cookieMatch[1]}` : '';

  // 3. CSRF / Origin Verification on Mutations
  console.log('\n--- 3. فحص الحماية من هجمات CSRF والتحقق من Origin/Referer في العمليات الحساسة ---');
  const csrfBlockedRes = await httpRequest({
    path: '/api/db/settings',
    method: 'POST',
    headers: {
      Cookie: rawCookie,
      Origin: 'https://malicious-attacker-site.com',
    },
    body: { autoPublish: { enabled: false } },
  });
  assert(
    csrfBlockedRes.status === 403 && csrfBlockedRes.body?.error?.includes('CSRF'),
    'حظر طلبات التعديل الحساسة القادمة من أصول غير مصرح بها (CSRF Attack Blocked)'
  );

  // 4. SSRF & IP Boundary Defense
  console.log('\n--- 4. فحص جدار حماية SSRF وتصفية نطاقات العناوين المحظورة ---');
  assert(isPrivateOrBlockedIp('127.0.0.1') === true, 'حظر عنوان Loopback المحلي (127.0.0.1)');
  assert(isPrivateOrBlockedIp('169.254.169.254') === true, 'حظر عنوان Cloud Metadata Link-Local (169.254.169.254)');
  assert(isPrivateOrBlockedIp('10.240.0.1') === true, 'حظر شبكة خاصة 10.0.0.0/8');
  assert(isPrivateOrBlockedIp('172.20.1.1') === true, 'حظر شبكة خاصة 172.16.0.0/12');
  assert(isPrivateOrBlockedIp('192.168.1.100') === true, 'حظر شبكة خاصة 192.168.0.0/16');
  assert(isPrivateOrBlockedIp('100.64.0.1') === true, 'حظر نطاق CGNAT (100.64.0.0/10)');
  assert(isPrivateOrBlockedIp('::1') === true, 'حظر عنوان IPv6 Loopback');
  assert(isPrivateOrBlockedIp('fe80::1') === true, 'حظر عنوان IPv6 Link-Local');
  assert(isPrivateOrBlockedIp('8.8.8.8') === false, 'السماح بعنوان IP عام سليم (8.8.8.8)');
  assert(isPrivateOrBlockedIp('1.1.1.1') === false, 'السماح بعنوان IP عام سليم (1.1.1.1)');

  // 5. Perceptual Hashing (dHash) & Hamming Distance Image Deduplication
  console.log('\n--- 5. فحص التجزئة الإدراكية (dHash) ومسافة هامنج لمنع تكرار الصور ---');
  const hashA = 'ffff0000ffff0000';
  const hashIdentical = 'ffff0000ffff0000';
  const hashSimilar = 'ffff0000ffff0001'; // 1 bit diff
  const hashCompletelyDifferent = '0000ffff0000ffff';

  assert(hammingDistance(hashA, hashIdentical) === 0, 'مسافة هامنج بين صورتين متطابقتين = 0');
  assert(hammingDistance(hashA, hashSimilar) === 1, 'مسافة هامنج لصور متقاربة جداً = 1');
  assert(isPerceptualDuplicate(hashA, hashSimilar, 8) === true, 'اعتبار الصورتين متطابقتين إدراكياً وفق حد العتبة 8');
  assert(isPerceptualDuplicate(hashA, hashCompletelyDifferent, 8) === false, 'التمييز الدقيق بين صور مختلفة بصرياً');

  // 6. Contextual Image Allocation & Exhaustion Signaling
  console.log('\n--- 6. فحص تخصيص الصور الدلالي والتنبيه الصريح عند نفاد الكتالوج ---');
  const allocated = await allocateContextualDecorImages(3, ['دهانات', 'مودرن', 'بديل رخام']);
  assert(Array.isArray(allocated) && allocated.length > 0, 'تخصيص صور الكتالوج المتناسقة دلالياً بنجاح');
  const uniqueUrls = new Set(allocated.map(a => a.url));
  assert(uniqueUrls.size === allocated.length, 'عدم وجود أي صور مكررة في الدفعة الواحدة');

  // Test exhaustion: request more images than remaining unused catalog items
  const allExistingUrls = new Set(allocated.map(a => a.url));
  const massiveRequest = await allocateContextualDecorImages(100, ['دهانات'], allExistingUrls);
  assert(
    (massiveRequest as any).exhausted === true,
    'تفعيل علم نفاد الصور (exhausted: true) بدلاً من إعادة استخدام الصور المكررة بصمت'
  );

  // 7. Social Dispatch & Truth in Reporting
  console.log('\n--- 7. فحص أمان النشر الاجتماعي وصحة حالة المنصات غير المهيأة ---');
  // Verify bot pause rejection
  const pausedBotRes = await httpRequest({
    path: '/api/social-bot/dispatch',
    method: 'POST',
    headers: { Cookie: rawCookie },
    body: {
      article: { id: 'test-art', title: 'مقال تجريبي', slug: 'test-art' },
    },
  });
  assert(pausedBotRes.status === 400 && pausedBotRes.body?.error === 'BOT_PAUSED', 'حظر البث عند توقف البوت بقرار الإدارة');

  // 8. Distributed Rate Limiting via PostgreSQL
  console.log('\n--- 8. فحص محدد المعدل الموزع (Distributed Rate Limiting) عبر PostgreSQL ---');
  const rateLimitTestIp = `10.99.88.${Date.now() % 250}`;
  const rl1 = await checkDbApiRateLimit('test_unit', rateLimitTestIp, 3, 60, 300);
  assert(rl1.allowed === true, 'الطلب الأول مسموح به في محدد المعدل الموزع');
  const rl2 = await checkDbApiRateLimit('test_unit', rateLimitTestIp, 3, 60, 300);
  assert(rl2.allowed === true, 'الطلب الثاني مسموح به في محدد المعدل الموزع');
  const rl3 = await checkDbApiRateLimit('test_unit', rateLimitTestIp, 3, 60, 300);
  assert(rl3.allowed === true, 'الطلب الثالث مسموح به في محدد المعدل الموزع');
  const rl4 = await checkDbApiRateLimit('test_unit', rateLimitTestIp, 3, 60, 300);
  assert(rl4.allowed === false, 'حظر الطلب الرابع فوراً لتجاوزه الحد الأقصى (3 محاولات) وتخزينه في جدول api_rate_limits');

  // 9. True Database Live Probe (SELECT 1)
  console.log('\n--- 9. فحص استعلام الاتصال الحي المباشر SELECT 1 ---');
  const dbLiveProbe = await checkDatabaseLiveConnection();
  assert(dbLiveProbe === true, 'نجاح استعلام SELECT 1 الحي الحقيقي على PostgreSQL السحابية');

  const healthReadyRes = await httpRequest({ path: '/health/ready' });
  assert(
    healthReadyRes.status === 200 && healthReadyRes.body?.probe === 'SELECT 1 passed',
    'مسار الجاهزية /health/ready يؤكد نجاح استعلام SELECT 1 الحي'
  );

  // 10. AI Hierarchy: Gemini Rank 1 & Grok (https://grok.com/) Rank 2
  console.log('\n--- 10. فحص تراتبية الذكاء الاصطناعي: جيميناى (مرتبة 1) وجروك https://grok.com/ (مرتبة 2 كبديل) ---');
  const aiStatusRes = await httpRequest({ path: '/api/ai/provider-status' });
  assert(aiStatusRes.status === 200, 'فحص حالة مزودي الذكاء الاصطناعي برمز 200');
  assert(aiStatusRes.body?.hierarchy?.rank1?.provider === 'gemini', 'تأكيد جيميناى (Google Gemini) في المرتبة الأولى كأساس');
  assert(aiStatusRes.body?.hierarchy?.rank2?.provider === 'grok', 'تأكيد جروك (Grok) في المرتبة الثانية كبديل تلقائي عند عدم استجابة جيميناى');
  assert(aiStatusRes.body?.hierarchy?.rank2?.website === 'https://grok.com/', 'تضمين رابط https://grok.com/ المعتمد رسمياً لجروك');

  // 11. Strict Google Owner Auth & Zero Passwordless Bypass & Genuine Analytics
  console.log('\n--- 11. فحص حصر مصادقة Google ببريد المالك فقط وإلغاء الدخول المباشر والإحصائيات الحقيقية ---');
  const ownerGoogleCheck = await verifyGoogleAuth('mahmoudahmedhessien032@gmail.com');
  assert(ownerGoogleCheck.valid === true, 'مصادقة Google المعتمدة لحساب المالك (mahmoudahmedhessien032@gmail.com) صالحة');
  assert(ownerGoogleCheck.user?.role === 'owner', 'رتبة المستخدم المسترجعة هي مالك المدونة');

  const unauthorizedGoogleCheck = await verifyGoogleAuth('unauthorized.user@gmail.com');
  assert(unauthorizedGoogleCheck.valid === false, 'حظر ورفض أي بريد Google آخر غير بريد المالك الرسمي');

  // Passwordless route must return 403 Forbidden
  const passwordlessAttempt = await httpRequest({
    path: '/api/auth/passwordless',
    method: 'POST',
    body: { email: 'mahmoudahmedhessien032@gmail.com' },
  });
  assert(passwordlessAttempt.status === 403, 'مسار الدخول المباشر /api/auth/passwordless تم إلغاؤه وحظره برمز 403 Forbidden');

  // Real Analytics verification
  const analyticsRes = await httpRequest({
    path: '/api/db/analytics',
    headers: { Cookie: rawCookie },
  });
  assert(analyticsRes.status === 200, 'استرجاع إحصائيات المدونة بنجاح برمز 200');
  assert(analyticsRes.body?.isRealData === true, 'تأكيد قراءة إحصائيات حقيقية من قاعدة البيانات');
  assert(typeof analyticsRes.body?.totalBlogViews === 'number', 'إجمالي الزيارات رقم حقيقي مقروء');
  assert(Array.isArray(analyticsRes.body?.ads), 'قائمة الإعلانات مقروءة بنجاح');

  // Ad event tracking verification
  const adEventRes = await httpRequest({
    path: '/api/db/analytics/ad-event',
    method: 'POST',
    body: { placement: 'header', type: 'impression' },
  });
  assert(adEventRes.status === 200 && adEventRes.body?.success === true, 'تسجيل ظهور إعلاني حقيقي عبر /api/db/analytics/ad-event');

  console.log('\n================================================================');
  console.log(`🎉 اكتملت جميع اختبارات التحقق بنجاح تام: (${passed}/${total})`);
  console.log('================================================================');
}

runExecutiveOrder4Suite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ فشل اختبارات الأمر التنفيذي الرابع:', err);
    process.exit(1);
  });
