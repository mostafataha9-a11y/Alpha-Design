import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.setCustomParameters({ prompt: 'select_account' });

export interface GoogleAuthUser {
  email: string;
  name: string;
  photoURL?: string;
  idToken: string;
}

/**
 * Executes official Google Sign-In popup using Google Identity / Firebase Auth.
 * Reads the real authenticated Google account (email, name, picture, token) directly from Google.
 */
export async function executeRealGoogleSignIn(): Promise<GoogleAuthUser> {
  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    const email = (result.user.email || '').trim().toLowerCase();
    const name = result.user.displayName || 'مستخدم Google';
    const photoURL = result.user.photoURL || undefined;

    if (!email) {
      throw new Error('لم يتم استرجاع بريد إلكتروني من حساب Google المصادق عليه.');
    }

    return { email, name, photoURL, idToken };
  } catch (error: any) {
    console.error('Google Sign-In Popup Error:', error);
    if (error.code === 'auth/popup-blocked') {
      throw new Error('تم حظر النافذة المنبثقة من قِبل المتصفح أو الإطار. يرجى السماح بالنوافذ المنبثقة (Popups) لحساب Google.');
    }
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('تم إغلاق نافذة تسجيل الدخول من قِبل المستخدم قبل إتمام التفويض.');
    }
    if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('تم إلغاء طلب تسجيل الدخول.');
    }
    throw new Error(error.message || 'فشلت عملية التفويض مع Google.');
  }
}

export async function signOutFromGoogle(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.debug('Google sign-out error:', e);
  }
}
