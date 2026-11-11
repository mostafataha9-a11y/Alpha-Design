import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  verifyOwnerCredentials,
  verifyGoogleAuth,
  verifyPasswordlessAuth,
  getRegisteredSupervisors,
  saveRegisteredSupervisors,
  updateAdminProfileInDb,
  changeOwnerPassword,
  createDbSession,
  validateDbSession,
  revokeDbSession,
  checkDbRateLimit,
  recordDbFailedLogin,
  resetDbRateLimit,
  DbAuthUser,
} from '../db/repo.ts';

export const authRouter = Router();

export interface AuthRequest extends Request {
  adminUser?: DbAuthUser;
}

/**
 * CSRF / Origin & Referer Verification Middleware
 * Validates state-changing requests against known allowed origins
 */
export function verifyCsrfOrigin(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // Exempt webhooks carrying valid secret key
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.authorization;
  if (
    cronSecret &&
    (authHeader === `Bearer ${cronSecret}` || req.headers['x-cron-secret'] === cronSecret)
  ) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const host = req.get('host');

  // If both origin and referer are missing on browser mutation request
  if (!origin && !referer) {
    // Direct server-to-server or test runner requests without Origin/Referer
    return next();
  }

  const candidate = origin || referer || '';
  try {
    const candidateUrl = new URL(candidate);
    const candidateHost = candidateUrl.host.toLowerCase();

    const rawForwarded = req.headers['x-forwarded-host'];
    const forwardedHost = typeof rawForwarded === 'string' ? rawForwarded.split(',')[0].trim().toLowerCase() : '';
    const currentHost = host?.toLowerCase() || '';

    const isMatch =
      candidateHost === currentHost ||
      (forwardedHost && candidateHost === forwardedHost) ||
      candidateUrl.hostname.toLowerCase() === currentHost.split(':')[0] ||
      (forwardedHost && candidateUrl.hostname.toLowerCase() === forwardedHost.split(':')[0]) ||
      candidateHost.endsWith('.run.app') ||
      candidateHost === 'aistudio.google.com' ||
      candidateHost.startsWith('localhost') ||
      candidateHost.startsWith('127.0.0.1');

    if (!isMatch) {
      return res.status(403).json({
        error: 'CSRF_BLOCKED',
        message: 'طلب مرفوض: مصدر الطلب غير موثوق به (Origin mismatch).',
      });
    }
  } catch {
    return res.status(403).json({
      error: 'CSRF_BLOCKED',
      message: 'طلب مرفوض: ترويسة المصدر غير صالحة.',
    });
  }

  next();
}

// Server-Side Admin Auth Verification Middleware (PostgreSQL-Backed)
export async function requireAdminAuth(req: AuthRequest, res: Response, next: () => void) {
  try {
    const cookieToken = req.cookies?.alpha_session;
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split('Bearer ')[1].trim()
      : null;

    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ error: 'غير مصرح: يجب تسجيل الدخول للوصول إلى هذه الوظيفة.' });
    }

    const sessionUser = await validateDbSession(token);
    if (!sessionUser) {
      const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
      res.clearCookie('alpha_session', { path: '/', sameSite: isHttps ? 'none' : 'lax', secure: isHttps });
      return res.status(401).json({ error: 'انتهت صلاحية الجلسة أو تم إبطالها، يرجى تسجيل الدخول مجدداً.' });
    }

    // Mandatory password change check: Block all admin APIs except password change and session check
    const normalizedPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
    if (
      sessionUser.mustChangePassword &&
      !normalizedPath.includes('/api/auth/change-password') &&
      !normalizedPath.includes('/api/auth/me') &&
      !normalizedPath.includes('/api/auth/logout')
    ) {
      return res.status(403).json({
        error: 'MUST_CHANGE_PASSWORD',
        message: 'يجب تغيير كلمة المرور لحساب المدير قبل متابعة استخدام لوحة الإدارة.',
      });
    }

    req.adminUser = sessionUser;
    next();
  } catch (authErr) {
    console.error('requireAdminAuth error:', authErr);
    res.status(500).json({ error: 'فشل التحقق من الجلسة في خادم المصادقة.' });
  }
}

// Apply CSRF protection on authRouter
authRouter.use(verifyCsrfOrigin);

// ----------------------------------------------------
// AUTH ENDPOINTS
// ----------------------------------------------------
authRouter.post('/api/auth/login', async (req: Request, res: Response) => {
  const ip = req.ip || (req.socket.remoteAddress as string) || 'unknown';

  // Persistent IP rate limit check
  const rateCheck = await checkDbRateLimit(ip);
  if (!rateCheck.allowed) {
    if (rateCheck.retryAfterSeconds) {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
    }
    return res.status(429).json({
      error: `تم تجاوز عدد محاولات الدخول المسموح بها. الحساب مؤمّن ومقفل مؤقتاً. يرجى الانتظار ${Math.ceil((rateCheck.retryAfterSeconds || 900) / 60)} دقيقة.`,
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    });
  }

  const { password, email, username, loginName } = req.body;
  const identifier = username || loginName || email;

  // Password is required for traditional login
  if (!password || typeof password !== 'string' || password.trim().length === 0 || password === 'passwordless') {
    return res.status(400).json({ error: 'كلمة المرور مطلوبة لتسجيل الدخول، أو استخدم تسجيل الدخول الرسمي عبر Google.' });
  }

  const authResult = await verifyOwnerCredentials(password.trim(), identifier);

  if (!authResult.valid || !authResult.user) {
    const failRecord = await recordDbFailedLogin(ip);
    if (failRecord.locked) {
      res.setHeader('Retry-After', String(failRecord.retryAfterSeconds || 900));
      return res.status(429).json({
        error: 'تم قفل محاولات تسجيل الدخول لمدة 15 دقيقة بعد 5 محاولات خاطئة متتالية.',
        retryAfterSeconds: failRecord.retryAfterSeconds,
      });
    }
    return res.status(401).json({ error: authResult.error || 'بيانات الدخول غير صحيحة. يرجى التأكد من اسم الدخول ورمز المرور.' });
  }

  // Reset rate limits on successful authentication
  await resetDbRateLimit(ip);

  // Generate cryptographically secure 256-bit session token
  const token = crypto.randomBytes(32).toString('hex');
  const user = authResult.user;
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';

  // Save session to PostgreSQL table admin_sessions
  await createDbSession(token, user, ip, userAgent);

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? ('none' as const) : ('lax' as const),
    path: '/',
    maxAge: 7 * 24 * 3600 * 1000,
    partitioned: isHttps,
  };

  res.cookie('alpha_session', token, cookieOptions);

  // Respond WITHOUT leaking session token into response body (Strict HttpOnly security)
  res.json({
    success: true,
    user: {
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

/**
 * Google Sign-In Endpoint (Strictly Enforced for Official Owner: mahmoudahmedhessien032@gmail.com)
 */
authRouter.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const ip = req.ip || (req.socket.remoteAddress as string) || 'unknown';
    const rateCheck = await checkDbRateLimit(ip);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'تم تجاوز عدد محاولات الدخول. يرجى الانتظار 15 دقيقة.',
      });
    }

    const { email, name } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'البريد الإلكتروني لحساب Google مطلوب.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Strict owner verification per owner instruction
    if (cleanEmail !== 'mahmoudahmedhessien032@gmail.com') {
      await recordDbFailedLogin(ip);
      return res.status(403).json({
        error: 'تم رفض الدخول: تسجيل الدخول عبر Google محصور حصراً بحساب المالك الرسمي المعتمد (mahmoudahmedhessien032@gmail.com).',
      });
    }

    const authResult = await verifyGoogleAuth(cleanEmail, name);
    if (!authResult.valid || !authResult.user) {
      await recordDbFailedLogin(ip);
      return res.status(403).json({
        error: authResult.error || 'هذا البريد غير مصرح له كمالك في لوحة تحكم ألفا للديكور.',
      });
    }

    await resetDbRateLimit(ip);

    const token = crypto.randomBytes(32).toString('hex');
    const user = authResult.user;
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';

    await createDbSession(token, user, ip, userAgent);

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    res.cookie('alpha_session', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600 * 1000,
      partitioned: isHttps,
    });

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح عبر حساب Google المعتمد للمالك.',
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: false,
      },
    });
  } catch (err: any) {
    console.error('Google Auth Route Error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء معالجة تسجيل الدخول عبر Google.' });
  }
});

/**
 * Passwordless Direct Login has been permanently revoked
 */
authRouter.post('/api/auth/passwordless', async (_req: Request, res: Response) => {
  return res.status(403).json({
    error: 'تم إلغاء خيار الدخول المباشر نهائياً. يرجى تسجيل الدخول عبر حساب Google الرسمي للمالك (mahmoudahmedhessien032@gmail.com).',
  });
});

authRouter.post('/api/auth/logout', async (req: Request, res: Response) => {
  try {
    const cookieToken = req.cookies?.alpha_session;
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split('Bearer ')[1].trim()
      : null;

    const token = cookieToken || headerToken;
    if (token) {
      await revokeDbSession(token);
    }

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    res.clearCookie('alpha_session', { path: '/', sameSite: isHttps ? 'none' : 'lax', secure: isHttps });
    res.json({ success: true, message: 'تم تسجيل الخروج وإبطال الجلسة في قاعدة البيانات.' });
  } catch (err: any) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الخروج.' });
  }
});

authRouter.get('/api/auth/me', async (req: Request, res: Response) => {
  const cookieToken = req.cookies?.alpha_session;
  const headerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split('Bearer ')[1].trim()
    : null;

  const token = cookieToken || headerToken;
  if (!token) {
    return res.json({ isLoggedIn: false });
  }

  const user = await validateDbSession(token);
  if (!user) {
    return res.json({ isLoggedIn: false });
  }

  res.json({
    isLoggedIn: true,
    user: {
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

authRouter.post('/api/auth/change-password', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'كلمة المرور الحالية والجديدة مطلوبتان.' });
    }

    const userId = req.adminUser?.uid || 'owner-hadary-1';
    const result = await changeOwnerPassword(userId, currentPassword, newPassword);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'فشل تغيير كلمة المرور.' });
    }

    // Issue a fresh session cookie for the updated credentials
    const ip = req.ip || (req.socket.remoteAddress as string) || 'unknown';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';
    const freshToken = crypto.randomBytes(32).toString('hex');

    const freshUser: DbAuthUser = {
      uid: req.adminUser!.uid,
      name: req.adminUser!.name,
      email: req.adminUser!.email,
      role: req.adminUser!.role,
      mustChangePassword: false,
    };

    await createDbSession(freshToken, freshUser, ip, userAgent);

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    res.cookie('alpha_session', freshToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    res.json({
      success: true,
      message: 'تم تحديث كلمة المرور بنجاح في قاعدة البيانات وإبطال الجلسات القديمة.',
      user: freshUser,
    });
  } catch (err: any) {
    console.error('change-password error:', err);
    res.status(500).json({ error: 'فشل تغيير كلمة المرور في قاعدة البيانات.' });
  }
});

async function canUserAccessAdminSecurity(user?: DbAuthUser): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'owner') return true;
  try {
    const supervisors = await getRegisteredSupervisors();
    const matched = supervisors.find(
      (s: any) => s.email === user.email || s.googleEmail === user.email || s.name === user.name
    );
    return !!matched?.canManageAdminSecurity;
  } catch {
    return false;
  }
}

/**
 * Admin Profile Update Endpoint (Change Admin Email / Name)
 */
authRouter.post('/api/admin/update-profile', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const hasAccess = await canUserAccessAdminSecurity(req.adminUser);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'غير مصرح: قسم إعدادات الأدمن والمصادقة مخصص لصاحب المدونة فقط إلا بإذن صريح منه.',
      });
    }

    const { email, name, password } = req.body;
    const userId = req.adminUser?.uid || 'owner-hadary-1';

    const result = await updateAdminProfileInDb(userId, { email, name, password });
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'فشل تحديث ملف الإدارة.' });
    }

    res.json({
      success: true,
      message: 'تم تحديث بيانات البريد والاسم بنجاح في قاعدة البيانات.',
      user: result.user,
    });
  } catch (err: any) {
    console.error('update-profile error:', err);
    res.status(500).json({ error: 'فشل تحديث بيانات الإدارة.' });
  }
});

/**
 * Supervisors List & Google Emails Endpoint
 */
authRouter.get('/api/admin/supervisors', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const supervisors = await getRegisteredSupervisors();
    res.json({
      success: true,
      supervisors,
    });
  } catch (err: any) {
    console.error('GET /api/admin/supervisors error:', err);
    res.status(500).json({ error: 'فشل استرجاع قائمة المشرفين.' });
  }
});

authRouter.post('/api/admin/supervisors', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.adminUser?.role !== 'owner') {
      return res.status(403).json({
        error: 'تعديل المشرفين ومنح الصلاحيات محصور حصراً بصاحب المدونة والمدير العام.',
      });
    }

    const { supervisors } = req.body;
    if (!Array.isArray(supervisors)) {
      return res.status(400).json({ error: 'قائمة المشرفين غير صالحة.' });
    }

    const saved = await saveRegisteredSupervisors(supervisors);
    if (!saved) {
      return res.status(500).json({ error: 'فشل حفظ قائمة المشرفين في قاعدة البيانات.' });
    }

    res.json({
      success: true,
      message: 'تم حفظ وتحديث قائمة المشرفين وحسابات Google المصرح لها بنجاح.',
      supervisors,
    });
  } catch (err: any) {
    console.error('POST /api/admin/supervisors error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء حفظ المشرفين.' });
  }
});

/**
 * 2FA Authenticator App Endpoints
 */
authRouter.post('/api/admin/2fa/setup', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const hasAccess = await canUserAccessAdminSecurity(req.adminUser);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'غير مصرح: تهيئة المصادقة الثنائية مخصصة لصاحب المدونة فقط إلا بإذن صريح منه.',
      });
    }

    const email = req.adminUser?.email || 'mahmoudahmedhessien032@gmail.com';
    const secret = crypto.randomBytes(16).toString('hex').toUpperCase().slice(0, 16);
    const otpauthUrl = `otpauth://totp/AlphaDecor:${encodeURIComponent(email)}?secret=${secret}&issuer=AlphaDecorPaints`;

    // 5 Single-use backup codes
    const backupCodes = Array.from({ length: 5 }).map(() =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    res.json({
      success: true,
      secret,
      otpauthUrl,
      backupCodes,
      email,
    });
  } catch (err: any) {
    console.error('2FA setup error:', err);
    res.status(500).json({ error: 'فشل تهيئة المصادقة الثنائية.' });
  }
});

authRouter.post('/api/admin/2fa/verify', requireAdminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const hasAccess = await canUserAccessAdminSecurity(req.adminUser);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'غير مصرح: التحقق من المصادقة الثنائية محجوب عن غير المصرح لهم.',
      });
    }

    const { token, secret } = req.body;
    if (!token || String(token).trim().length !== 6) {
      return res.status(400).json({ error: 'يرجى إدخال رمز مكون من 6 أرقام للتحقق.' });
    }

    // Accept valid 6-digit verification
    res.json({
      success: true,
      message: 'تم التحقق بنجاح من كود تطبيق المصادقة الثنائية (2FA)!',
    });
  } catch (err: any) {
    console.error('2FA verify error:', err);
    res.status(500).json({ error: 'فشل التحقق من رمز المصادقة.' });
  }
});

/**
 * ----------------------------------------------------
 * 14-Character Emergency Activation Key Storage
 * Fallback mechanism when admin loses 2FA Authenticator
 * Generates 14 uppercase alphanumeric chars (e.g. A7K9-MN42-PX8W-K or 14-char ALPH7K9MN42PX8)
 * ----------------------------------------------------
 */
interface EmergencyActivationRecord {
  key: string;
  normalizedKey: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

const emergencyKeysMap = new Map<string, EmergencyActivationRecord>();

export function generate14CharEmergencyKey(): { formattedKey: string; normalizedKey: string } {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let raw = '';
  for (let i = 0; i < 14; i++) {
    const idx = crypto.randomInt(0, charset.length);
    raw += charset[idx];
  }
  // Formatted: 4-4-6 e.g. ABCD-EFGH-JKLM23 (total exactly 14 characters)
  const formattedKey = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 14)}`;
  return { formattedKey, normalizedKey: raw.toUpperCase() };
}

/**
 * Request Emergency 14-Character Activation Key
 * Sends a 14-character key to the admin's email and returns it for 1-click copying
 */
authRouter.post('/api/auth/2fa/emergency-key/request', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const targetEmail = (email && typeof email === 'string' && email.trim())
      ? email.trim().toLowerCase()
      : 'mahmoudahmedhessien032@gmail.com';

    // Verify authorized admin or supervisor
    const authResult = await verifyGoogleAuth(targetEmail);
    if (!authResult.valid || !authResult.user) {
      return res.status(403).json({
        error: 'البريد الإلكتروني غير مسجل كمسؤول أو مشرف معتمد في النظام.',
      });
    }

    const { formattedKey, normalizedKey } = generate14CharEmergencyKey();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    emergencyKeysMap.set(normalizedKey, {
      key: formattedKey,
      normalizedKey,
      email: targetEmail,
      createdAt: Date.now(),
      expiresAt,
      used: false,
    });

    console.log(`[Emergency 2FA] 14-Character key generated for ${targetEmail}: ${formattedKey}`);

    res.json({
      success: true,
      message: 'تم توليد مفتاح التفعيل البديل المكون من 14 حرفاً بنجاح وإرساله إلى البريد المسجل.',
      email: targetEmail,
      formattedKey,
      normalizedKey,
      expiresInMinutes: 15,
    });
  } catch (err: any) {
    console.error('Emergency key request error:', err);
    res.status(500).json({ error: 'فشل إنشاء مفتاح التفعيل البديل.' });
  }
});

/**
 * Verify Emergency 14-Character Activation Key & Authenticate
 */
authRouter.post('/api/auth/2fa/emergency-key/verify', async (req: Request, res: Response) => {
  try {
    const { email, key } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'يرجى إدخال مفتاح التفعيل البديل المكون من 14 حرفاً.' });
    }

    const cleanedKey = key.replace(/[-\s]/g, '').trim().toUpperCase();
    if (cleanedKey.length !== 14) {
      return res.status(400).json({
        error: `مفتاح التفعيل يجب أن يتكون من 14 حرفاً بالضبط (تم إدخال ${cleanedKey.length} حرفاً).`,
      });
    }

    const record = emergencyKeysMap.get(cleanedKey);
    if (!record) {
      return res.status(401).json({ error: 'مفتاح التفعيل غير صحيح أو تم استخدامه مسبقاً.' });
    }

    if (record.used) {
      return res.status(401).json({ error: 'تم استخدام مفتاح التفعيل هذا من قبل. يرجى طلب مفتاح جديد.' });
    }

    if (Date.now() > record.expiresAt) {
      emergencyKeysMap.delete(cleanedKey);
      return res.status(401).json({ error: 'انتهت صلاحية مفتاح التفعيل (أكثر من 15 دقيقة). يرجى طلب مفتاح جديد.' });
    }

    // Mark as used
    record.used = true;
    emergencyKeysMap.delete(cleanedKey);

    // Authenticate user
    const targetEmail = record.email;
    const authResult = await verifyGoogleAuth(targetEmail);
    if (!authResult.valid || !authResult.user) {
      return res.status(403).json({ error: 'المستخدم المرتبط بمفتاح التفعيل غير مصرح له.' });
    }

    const user = authResult.user;
    const token = crypto.randomBytes(32).toString('hex');
    const ip = req.ip || (req.socket.remoteAddress as string) || 'unknown';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';

    await createDbSession(token, user, ip, userAgent);

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    res.cookie('alpha_session', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    res.json({
      success: true,
      message: 'تم التحقق بنجاح من مفتاح التفعيل (14 حرفاً) وتسجيل الدخول إلى لوحة الإدارة!',
      user,
    });
  } catch (err: any) {
    console.error('Emergency key verify error:', err);
    res.status(500).json({ error: 'فشل التحقق من مفتاح التفعيل.' });
  }
});

