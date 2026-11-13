import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  Auth,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createResilientAuth(firebaseApp: FirebaseApp): Auth {
  try {
    return initializeAuth(firebaseApp, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
        inMemoryPersistence,
      ],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(firebaseApp);
  }
}

export const auth: Auth = createResilientAuth(app);
auth.languageCode = 'ar';

function createGoogleProvider(): GoogleAuthProvider {
  const p = new GoogleAuthProvider();
  p.addScope('https://www.googleapis.com/auth/userinfo.email');
  p.addScope('https://www.googleapis.com/auth/userinfo.profile');
  p.setCustomParameters({
    prompt: 'select_account',
  });
  return p;
}

export interface GoogleAuthUser {
  email: string;
  name: string;
  photoURL?: string;
  idToken: string;
  googleIdToken?: string;
}

let warmupPromise: Promise<void> | null = null;
let cachedAuthorizedDomains: string[] | null = null;
let inFlightGoogleSignIn: Promise<GoogleAuthUser> | null = null;

function isHostnameAuthorized(hostname: string, domains: string[]): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  return domains.some((raw) => {
    const domain = String(raw || '').trim().toLowerCase();
    if (!domain) return false;
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
      return host === domain;
    }
    const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^(.+\\.${escaped}|${escaped})$`, 'i');
    return re.test(host);
  });
}

async function prefetchAuthorizedDomains(): Promise<string[] | null> {
  if (cachedAuthorizedDomains) return cachedAuthorizedDomains;
  if (!firebaseConfig.apiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects?key=${encodeURIComponent(firebaseConfig.apiKey)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data?.authorizedDomains)) {
      cachedAuthorizedDomains = data.authorizedDomains;
      return cachedAuthorizedDomains;
    }
  } catch {
    // Non-fatal network note; Firebase SDK will verify during auth
  }
  return null;
}

/**
 * Proactively initializes Firebase PopupRedirectResolver + authorizedDomains cache
 * BEFORE the user clicks "Sign in with Google", preventing async gesture loss
 * (`auth/popup-blocked`) and unstable popup opening/closing.
 */
export function warmUpGoogleAuth(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (warmupPromise) return warmupPromise;

  warmupPromise = (async () => {
    try {
      await Promise.allSettled([
        prefetchAuthorizedDomains(),
        getRedirectResult(auth, browserPopupRedirectResolver).catch(() => null),
      ]);
    } catch {
      // Non-fatal warmup failure; sign-in flow handles errors explicitly
    }
  })();

  return warmupPromise;
}

function formatGoogleAuthErrorMessage(error: any): string {
  const code = String(error?.code || '');
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  if (code === 'auth/popup-blocked') {
    return 'تم حظر النافذة المنبثقة من قِبل المتصفح. يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع ثم إعادة المحاولة.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'تم إغلاق نافذة تسجيل الدخول من قِبل المستخدم قبل إتمام تفويض حساب Google.';
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'تم إلغاء طلب تسجيل الدخول السابق؛ يرجى الضغط مرة أخرى للمتابعة.';
  }
  if (code === 'auth/web-storage-unsupported') {
    return 'المتصفح يمنع تخزين البيانات للجهات الخارجية داخل الإطار (Third-Party Storage/Cookies). يرجى السماح بالكوكيز لموقع firebaseapp.com أو فتح التطبيق في نافذة مستقلة.';
  }
  if (code === 'auth/unauthorized-domain') {
    return currentHost
      ? `النطاق الحالي (${currentHost}) غير مضاف في النطاقات المصرح بها (Authorized domains) في إعدادات مصادقة Firebase للمشروع (${firebaseConfig.projectId}). يمكنك إضافته من Firebase Console أو استخدام رابط المعاينة المعتمد أو كلمة المرور.`
      : 'النطاق الحالي غير مصرح به في إعدادات مصادقة Firebase.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'تسجيل الدخول عبر مزود Google غير مفعّل في مشروع المصادقة.';
  }
  if (code === 'auth/network-request-failed') {
    return 'تعذر الاتصال بخوادم Google للمصادقة. يرجى التحقق من اتصال الإنترنت ثم المحاولة مجدداً.';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'يوجد حساب مرتبط بهذا البريد بطريقة مصادقة مختلفة.';
  }
  return error?.message || 'فشلت عملية التفويض مع Google.';
}

/**
 * Executes official Google Sign-In popup using Firebase Auth + Google OAuth 2.0.
 * Reads the real authenticated Google account (email, name, picture, Firebase ID Token)
 * directly from the Google account signed in on the user's device.
 */
export async function executeRealGoogleSignIn(): Promise<GoogleAuthUser> {
  if (inFlightGoogleSignIn) {
    return inFlightGoogleSignIn;
  }

  // Synchronous pre-check against prefetched Firebase authorizedDomains so we never
  // flash-open a popup only for Firebase to close it ~500ms later with unauthorized-domain.
  if (typeof window !== 'undefined' && cachedAuthorizedDomains) {
    const host = window.location.hostname;
    if (!isHostnameAuthorized(host, cachedAuthorizedDomains)) {
      throw new Error(formatGoogleAuthErrorMessage({ code: 'auth/unauthorized-domain' }));
    }
  }

  const provider = createGoogleProvider();

  inFlightGoogleSignIn = (async () => {
    try {
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);

      const idToken = await result.user.getIdToken(true);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const email = (result.user.email || '').trim().toLowerCase();
      const name = result.user.displayName || 'الحضرى محمود';
      const photoURL = result.user.photoURL || undefined;

      if (!email || !idToken) {
        throw new Error('لم يتم استرجاع بريد إلكتروني أو رمز تحقق موثق من حساب Google.');
      }

      return {
        email,
        name,
        photoURL,
        idToken,
        googleIdToken: credential?.idToken,
      };
    } catch (error: any) {
      console.error('Google Sign-In Popup Error:', error);
      throw new Error(formatGoogleAuthErrorMessage(error));
    } finally {
      inFlightGoogleSignIn = null;
    }
  })();

  return inFlightGoogleSignIn;
}

export async function signOutFromGoogle(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.debug('Google sign-out error:', e);
  }
}
