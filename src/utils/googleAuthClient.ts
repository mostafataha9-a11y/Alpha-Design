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
let sameOriginAuthInstance: Auth | null = null;

function getSameOriginAuth(): Auth | null {
  if (typeof window === 'undefined') return null;
  if (window.self !== window.top) return null;
  if (!window.location.hostname.endsWith('.run.app')) return null;

  if (!sameOriginAuthInstance) {
    const appName = 'alpha-same-origin-auth';
    const existing = getApps().find((a) => a.name === appName);
    const sameOriginApp =
      existing ||
      initializeApp(
        {
          ...firebaseConfig,
          authDomain: window.location.host,
        },
        appName
      );
    sameOriginAuthInstance = createResilientAuth(sameOriginApp);
    sameOriginAuthInstance.languageCode = 'ar';
  }
  return sameOriginAuthInstance;
}

function preloadGapiScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if ((window as any).gapi?.iframes) return Promise.resolve();

  const existingScript = document.querySelector<HTMLScriptElement>(
    'script[src^="https://apis.google.com/js/api.js"]'
  );
  if (existingScript) {
    return new Promise((resolve) => {
      if ((window as any).gapi) {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => resolve(), { once: true });
      setTimeout(resolve, 1500);
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
    setTimeout(resolve, 1500);
  });
}

/**
 * Proactively initializes Firebase PopupRedirectResolver + gapi + auth iframe
 * BEFORE the user clicks "Sign in with Google", preventing async gesture loss
 * that triggers browser popup blockers (`auth/popup-blocked`).
 */
export function warmUpGoogleAuth(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (warmupPromise) return warmupPromise;

  warmupPromise = (async () => {
    try {
      await preloadGapiScript();
      await getRedirectResult(auth, browserPopupRedirectResolver).catch(() => null);
    } catch {
      // Non-fatal warmup failure; sign-in flow will handle errors explicitly
    }
  })();

  return warmupPromise;
}

function formatGoogleAuthErrorMessage(error: any): string {
  const code = String(error?.code || '');
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
    return 'المتصفح يمنع تخزين البيانات للجهات الخارجية داخل الإطار (Third-Party Storage/Cookies). يرجى السماح بالكوكيز للموقع أو فتح التطبيق في نافذة مستقلة.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'النطاق الحالي غير مصرح به في إعدادات مصادقة Firebase.';
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
  const provider = createGoogleProvider();

  try {
    let result;
    try {
      result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    } catch (primaryErr: any) {
      const code = String(primaryErr?.code || '');
      const sameOriginAuth = getSameOriginAuth();
      if (
        sameOriginAuth &&
        (code === 'auth/web-storage-unsupported' ||
          code === 'auth/internal-error' ||
          code === 'auth/network-request-failed')
      ) {
        result = await signInWithPopup(sameOriginAuth, provider, browserPopupRedirectResolver);
      } else {
        throw primaryErr;
      }
    }

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
  }
}

export async function signOutFromGoogle(): Promise<void> {
  try {
    await signOut(auth);
    if (sameOriginAuthInstance) {
      await signOut(sameOriginAuthInstance);
    }
  } catch (e) {
    console.debug('Google sign-out error:', e);
  }
}
