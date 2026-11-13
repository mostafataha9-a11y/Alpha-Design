import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  ShieldCheck,
  X,
  KeyRound,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Mail,
  Zap,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Copy,
  Check,
  Smartphone,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { AdminUser, SiteSettings } from '../types/blog';
import { AuthorBadge } from './AuthorBadge';
import { executeRealGoogleSignIn, signOutFromGoogle, warmUpGoogleAuth, GoogleAuthUser } from '../utils/googleAuthClient';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUser) => void;
  settings: SiteSettings;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  settings,
}) => {
  const isAr = settings.language === 'ar';
  const ownerName = settings.authorName || 'الحضرى محمود';

  const [mode, setMode] = useState<'login' | 'changePassword'>('login');
  const [loginName, setLoginName] = useState('mahmoudahmedhessien032@gmail.com');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingUser, setPendingUser] = useState<AdminUser | null>(null);

  // Google & Traditional Auth States
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [authorizedGoogleAccount, setAuthorizedGoogleAccount] = useState<GoogleAuthUser | null>(null);
  const [isGooglePopupActive, setIsGooglePopupActive] = useState(false);
  const googlePopupLockRef = useRef(false);

  // 14-Character 2FA Emergency Key States
  const [showEmergencyKeySection, setShowEmergencyKeySection] = useState(false);
  const [isRequestingKey, setIsRequestingKey] = useState(false);
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const [generatedEmergencyKey, setGeneratedEmergencyKey] = useState('');
  const [emergencyKeyInput, setEmergencyKeyInput] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  // Pre-warm Firebase Auth iframe & authorizedDomains when modal opens so popup never loses user gesture
  useEffect(() => {
    if (isOpen) {
      warmUpGoogleAuth();
    } else {
      googlePopupLockRef.current = false;
      setIsGooglePopupActive(false);
      setIsVerifying(false);
      setAuthorizedGoogleAccount(null);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Request 14-Character Emergency Key to Admin Email
  const handleRequestEmergencyKey = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsRequestingKey(true);

    try {
      const response = await fetch('/api/auth/2fa/emergency-key/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: 'mahmoudahmedhessien032@gmail.com' }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || (isAr ? 'فشل إرسال مفتاح التفعيل البديل.' : 'Failed to request emergency key.'));
        setIsRequestingKey(false);
        return;
      }

      const keyVal = data.formattedKey || data.normalizedKey || '';
      setGeneratedEmergencyKey(keyVal);
      setEmergencyKeyInput(keyVal);
      setSuccessMsg(
        isAr
          ? 'تم إرسال مفتاح تفعيل الطوارئ (14 حرفاً) إلى بريدك بنجاح! يمكنك نسخه بنقرة واحدة وتأكيد الدخول.'
          : 'Emergency 14-character key dispatched to your email! Copy with 1 click to sign in.'
      );
    } catch (err: any) {
      console.error('Request emergency key error:', err);
      setErrorMsg(isAr ? 'تعذر الاتصال بالخادم لطلب مفتاح التفعيل.' : 'Failed to reach auth server.');
    } finally {
      setIsRequestingKey(false);
    }
  };

  // 1-Click Copy Emergency Key
  const handleCopyEmergencyKey = () => {
    if (!generatedEmergencyKey) return;
    try {
      navigator.clipboard.writeText(generatedEmergencyKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  // Verify 14-Character Emergency Key & Login
  const handleVerifyEmergencyKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedKey = emergencyKeyInput.trim();
    if (!trimmedKey) {
      setErrorMsg(isAr ? 'يرجى إدخال أو لصق مفتاح التفعيل المكون من 14 حرفاً.' : 'Please enter the 14-char key.');
      return;
    }

    setIsVerifyingKey(true);
    try {
      const response = await fetch('/api/auth/2fa/emergency-key/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: 'mahmoudahmedhessien032@gmail.com',
          key: trimmedKey,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || (isAr ? 'مفتاح التفعيل غير صحيح أو انتهت صلاحيته.' : 'Invalid emergency key.'));
        setIsVerifyingKey(false);
        return;
      }

      const user: AdminUser = {
        name: data.user?.name || ownerName,
        role: data.user?.role || 'owner',
        email: data.user?.email || 'mahmoudahmedhessien032@gmail.com',
        isLoggedIn: true,
        mustChangePassword: false,
      };

      setSuccessMsg(isAr ? 'تم التحقق بنجاح من مفتاح الطوارئ وتسجيل الدخول كمالك للمدونة!' : 'Emergency login successful!');
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Emergency key verification error:', err);
      setErrorMsg(isAr ? 'تعذر الاتصال بخادم المصادقة.' : 'Failed to verify emergency key.');
    } finally {
      setIsVerifyingKey(false);
    }
  };

  // Trigger Real Google OAuth via Firebase Auth & Google OAuth 2.0
  const handleTriggerRealGoogleOAuth = async () => {
    if (googlePopupLockRef.current || isGooglePopupActive || isVerifying) {
      return;
    }
    googlePopupLockRef.current = true;
    setErrorMsg('');
    setSuccessMsg('');
    setIsGooglePopupActive(true);

    try {
      const googleUser = await executeRealGoogleSignIn();
      const cleanEmail = (googleUser.email || '').trim().toLowerCase();

      // Enforce ONLY the official owner account per explicit owner requirement
      if (cleanEmail !== 'mahmoudahmedhessien032@gmail.com') {
        await signOutFromGoogle();
        setErrorMsg(
          isAr
            ? `تم رفض الدخول: الحساب الذي تم تسجيل الدخول به من Google هو (${cleanEmail}). لا يُسمح بالدخول إلى لوحة الإدارة إلا عبر حساب المالك الرسمي المعتمد (mahmoudahmedhessien032@gmail.com).`
            : `Unauthorized: Selected Google account (${cleanEmail}) is not the authorized owner (mahmoudahmedhessien032@gmail.com).`
        );
        return;
      }

      setAuthorizedGoogleAccount(googleUser);
      // Proceed with real Google account session creation
      await handleGoogleLogin(cleanEmail, googleUser.name, googleUser.idToken, googleUser.googleIdToken);
    } catch (err: any) {
      console.warn('Real Google OAuth note:', err);
      // Explicitly reject and guide user without any bypass or backdoor
      setErrorMsg(
        err.message ||
        (isAr
          ? 'تعذر إتمام المصادقة مع Google. يرجى التأكد من تسجيل دخولك بحساب المالك (mahmoudahmedhessien032@gmail.com) في متصفحك والسماح بالنوافذ المنبثقة لحساب Google.'
          : 'Google authentication failed. Please sign in with mahmoudahmedhessien032@gmail.com.')
      );
    } finally {
      googlePopupLockRef.current = false;
      setIsGooglePopupActive(false);
    }
  };

  // Handle Google Sign-In Verification for Official Admin Owner
  const handleGoogleLogin = async (
    targetEmail: string = 'mahmoudahmedhessien032@gmail.com',
    targetName?: string,
    idToken?: string,
    googleIdToken?: string
  ) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsVerifying(true);

    try {
      const cleanEmail = targetEmail.trim().toLowerCase();
      if (cleanEmail !== 'mahmoudahmedhessien032@gmail.com') {
        setErrorMsg(isAr ? 'تم رفض الدخول: هذا البريد غير مصرح له كمالك للمدونة.' : 'Access denied: Unauthorized email.');
        setIsVerifying(false);
        return;
      }

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: cleanEmail,
          name: targetName || ownerName,
          idToken,
          googleIdToken,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || (isAr ? 'فشل تسجيل الدخول بحساب Google. تأكد من أن بريدك هو حساب المالك المعتمد.' : 'Google sign-in failed.'));
        setIsVerifying(false);
        setAuthorizedGoogleAccount(null);
        return;
      }

      const user: AdminUser = {
        name: data.user?.name || targetName || ownerName,
        role: 'owner',
        email: cleanEmail,
        isLoggedIn: true,
        mustChangePassword: false,
      };

      setSuccessMsg(
        isAr
          ? `✓ تم تأكيد تسجيل الدخول بنجاح عبر حساب Google الرسمي للمالك (${user.email})!`
          : `Signed in with Google successfully as (${user.email})!`
      );
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Google login error:', err);
      setErrorMsg(isAr ? 'تعذر الاتصال بخادم المصادقة.' : 'Failed to connect to auth server.');
      setAuthorizedGoogleAccount(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      setErrorMsg(isAr ? 'يرجى إدخال كلمة المرور، أو اضغط على الدخول عبر Google.' : 'Password cannot be empty.');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: loginName.trim(),
          email: loginName.trim(),
          loginName: loginName.trim(),
          password: trimmedPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || (isAr ? 'فشل تسجيل الدخول. يرجى التحقق من كلمة المرور.' : 'Login failed. Please check your credentials.'));
        setIsVerifying(false);
        return;
      }

      const user: AdminUser = {
        name: data.user?.name || ownerName,
        role: data.user?.role || 'owner',
        email: data.user?.email || 'mahmoudahmedhessien032@gmail.com',
        isLoggedIn: true,
        mustChangePassword: data.mustChangePassword,
      };

      // If server demands password change (e.g. bootstrap password or legacy default rotation)
      if (data.mustChangePassword) {
        setPendingUser(user);
        setCurrentPassword(trimmedPassword);
        setMode('changePassword');
        setErrorMsg(isAr ? 'تنبيه أمان إلزامي: يجب تعيين كلمة مرور جديدة قوية وخاصة بحساب المالك قبل المتابعة.' : 'Mandatory security check: Please set a new strong password.');
        setIsVerifying(false);
        return;
      }

      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      console.error('Login request failed:', err);
      setErrorMsg(isAr ? 'تعذر الاتصال بخادم المصادقة. يرجى المحاولة لاحقاً.' : 'Unable to connect to authentication server.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedCurrent) {
      setErrorMsg(isAr ? 'يرجى إدخال كلمة المرور الحالية.' : 'Current password is required.');
      return;
    }

    if (trimmedNew.length < 8) {
      setErrorMsg(isAr ? 'يجب أن لا تقل كلمة المرور الجديدة عن 8 أحرف.' : 'New password must be at least 8 characters.');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setErrorMsg(isAr ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: trimmedCurrent,
          newPassword: trimmedNew,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || (isAr ? 'فشل تغيير كلمة المرور.' : 'Failed to change password.'));
        setIsVerifying(false);
        return;
      }

      setSuccessMsg(isAr ? 'تم تغيير كلمة المرور بنجاح وحفظها مشفرة في قاعدة البيانات.' : 'Password updated successfully.');

      setTimeout(() => {
        if (pendingUser) {
          onLoginSuccess({ ...pendingUser, mustChangePassword: false });
        }
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Change password failed:', err);
      setErrorMsg(isAr ? 'تعذر الاتصال بالخادم.' : 'Server connection failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 end-4 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 text-blue-300 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">
                  {mode === 'login'
                    ? (isAr ? 'بوابة الإدارة المشفرة (Cloud SQL Auth)' : 'Secure Admin Portal')
                    : (isAr ? 'تغيير كلمة المرور وتحديث الأمان' : 'Update Admin Password')}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  {isAr ? 'محمي وموثق' : 'Protected'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAr
                  ? 'مخصص فقط لصاحب الموقع والمشرفين المعتمدين'
                  : 'Restricted to site owner & authorized staff'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* Owner Identity Highlight */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <AuthorBadge name={ownerName} size="md" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {ownerName}
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                  {isAr ? 'صاحب المدونة والمدير العام' : 'Blog Owner'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>{isAr ? 'مصادقة الخادم' : 'Server Auth'}</span>
            </div>
          </div>

          {mode === 'login' ? (
            <div className="space-y-4">
              {/* State A: Google Account Authorized via Real OAuth (Read Email & Confirm) */}
              {authorizedGoogleAccount ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/90 border-2 border-emerald-500 dark:border-emerald-500 shadow-md space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {isAr ? 'تم التفويض وقراءة الحساب من Google بنجاح' : 'Google Account Authorized & Read'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800">
                      Google OAuth 2.0
                    </span>
                  </div>

                  {/* Profile Card Read from Google */}
                  <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-700 shadow-sm">
                    {authorizedGoogleAccount.photoURL ? (
                      <img
                        src={authorizedGoogleAccount.photoURL}
                        alt={authorizedGoogleAccount.name || 'Google User'}
                        className="w-12 h-12 rounded-full border-2 border-emerald-500 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-slate-800 border-2 border-emerald-500 flex items-center justify-center shrink-0">
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                      </div>
                    )}

                    <div className="text-start flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                        {authorizedGoogleAccount.name || (isAr ? 'مستخدم Google' : 'Google User')}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block truncate" dir="ltr">
                        {authorizedGoogleAccount.email}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        {authorizedGoogleAccount.email.toLowerCase() === 'mahmoudahmedhessien032@gmail.com'
                          ? (isAr ? 'حساب المالك الأساسي المعتمد' : 'Primary Owner Account')
                          : (isAr ? 'مشرف معتمد' : 'Authorized Supervisor')}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-start">
                    {isAr
                      ? `تمت قراءة البريد (${authorizedGoogleAccount.email}) وتفويض هويتك عبر Google. يرجى تأكيد تسجيل الدخول لبدء جلستك الإدارية في لوحة تحكم المدونة.`
                      : `Email (${authorizedGoogleAccount.email}) verified via Google. Please confirm to begin your session.`}
                  </p>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleGoogleLogin(
                          authorizedGoogleAccount.email,
                          authorizedGoogleAccount.name,
                          authorizedGoogleAccount.idToken,
                          authorizedGoogleAccount.googleIdToken
                        )
                      }
                      disabled={isVerifying}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <span className="animate-spin text-xs">⏳</span>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>{isAr ? '✓ تأكيد تسجيل الدخول بعد التفويض' : 'Confirm Login After Auth'}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthorizedGoogleAccount(null);
                        handleTriggerRealGoogleOAuth();
                      }}
                      disabled={isVerifying}
                      className="py-3 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isAr ? 'تبديل الحساب' : 'Switch'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Main Google Sign-In Action (Official Google Identity Protocol) */
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleTriggerRealGoogleOAuth}
                    disabled={isVerifying || isGooglePopupActive}
                    className="w-full py-3.5 px-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-white font-bold text-xs sm:text-sm border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-50"
                  >
                    {isGooglePopupActive ? (
                      <>
                        <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span>{isAr ? 'جارٍ الاتصال بنافذة Google والتحقق من حساب المالك...' : 'Connecting to Google OAuth...'}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>{isAr ? 'تسجيل الدخول من خلال Google (المصادقة الرسمية)' : 'Sign in with Google (Official OAuth)'}</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-normal">
                    {isAr
                      ? 'يتم التحقق وتفويض الحساب مباشرة من خوادم Google. يتطلب حساب المالك المعتمد (mahmoudahmedhessien032@gmail.com).'
                      : 'Requires the verified owner account (mahmoudahmedhessien032@gmail.com).'}
                  </p>
                </div>
              )}

              {/* Expandable Fallback Password Form */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 py-1 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isAr ? 'خيارات إضافية: الدخول بكلمة المرور المشفرة' : 'Alternative: Login with password'}</span>
                  </div>
                  {showPasswordForm ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showPasswordForm && (
                  <form onSubmit={handleLogin} className="space-y-3 mt-3 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        {isAr ? 'اسم المستخدم أو البريد:' : 'Username or Email:'}
                      </label>
                      <input
                        type="text"
                        value={loginName}
                        onChange={(e) => setLoginName(e.target.value)}
                        placeholder="الحضرى محمود أو mahmoudahmedhessien032@gmail.com"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        {isAr ? 'كلمة المرور المشفرة:' : 'Password:'}
                      </label>
                      <div className="relative">
                        <KeyRound className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={isAr ? 'أدخل كلمة مرور الإدارة...' : 'Enter your password...'}
                          className="w-full ps-9 pe-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="w-full py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تأكيد الدخول بكلمة المرور' : 'Confirm Password Login'}</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Emergency 14-Character 2FA Key Accordion */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEmergencyKeySection(!showEmergencyKeySection)}
                  className="w-full flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 py-1 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{isAr ? 'فقدت تطبيق المصادقة 2FA؟ (الدخول بمفتاح تفعيل 14 حرفاً)' : 'Lost 2FA App? (14-Char Emergency Key)'}</span>
                  </div>
                  {showEmergencyKeySection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showEmergencyKeySection && (
                  <div className="mt-2.5 p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-3 animate-in fade-in duration-150">
                    <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                      {isAr
                        ? 'إذا فقدت هاتفك أو تطبيق المصادقة الثنائية 2FA، اضغط أدناه لإرسال مفتاح تفعيل طوارئ مكون من 14 حرفاً إلى بريد المالك الرسمي، وانسخه بنقرة واحدة لتسجيل الدخول الفوري:'
                        : 'If you lost your 2FA authenticator app, generate a 14-character emergency key to owner email and copy with 1-click:'}
                    </p>

                    {/* Step 1: Request Emergency Key Button */}
                    <button
                      type="button"
                      onClick={handleRequestEmergencyKey}
                      disabled={isRequestingKey}
                      className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                    >
                      {isRequestingKey ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Mail className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isAr
                          ? 'إرسال مفتاح تفعيل (14 حرفاً) إلى mahmoudahmedhessien032@gmail.com'
                          : 'Send 14-char key to admin email'}
                      </span>
                    </button>

                    {/* Generated Key Display with 1-Click Copy */}
                    {generatedEmergencyKey && (
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>{isAr ? 'مفتاح التفعيل البديل (14 حرفاً):' : 'Emergency 14-char key:'}</span>
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                            {isAr ? 'صالح لمدة 15 دقيقة' : 'Valid 15m'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 rounded-lg bg-amber-50/70 dark:bg-slate-800 font-mono text-xs sm:text-sm font-black text-amber-900 dark:text-amber-300 tracking-wider text-center border border-amber-200 dark:border-slate-700 select-all">
                            {generatedEmergencyKey}
                          </code>
                          <button
                            type="button"
                            onClick={handleCopyEmergencyKey}
                            className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                            title={isAr ? 'نسخ المفتاح بنقرة واحدة' : 'Copy with 1-click'}
                          >
                            {copiedKey ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ بنقرة واحدة' : 'Copy')}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Input & Submit Emergency Key */}
                    <form onSubmit={handleVerifyEmergencyKey} className="space-y-2 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                          {isAr ? 'أدخل أو الصق مفتاح التفعيل (14 حرفاً):' : 'Enter or paste 14-char key:'}
                        </label>
                        <input
                          type="text"
                          value={emergencyKeyInput}
                          onChange={(e) => setEmergencyKeyInput(e.target.value.toUpperCase())}
                          placeholder="ALPH-9X7K-2M4Q"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isVerifyingKey || !emergencyKeyInput.trim()}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        {isVerifyingKey ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                        <span>{isAr ? 'تأكيد الدخول بمفتاح الطوارئ (14 حرفاً)' : 'Verify & Log In'}</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Feedback messages */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>
          ) : (
            /* Change Password Form */
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'كلمة المرور الحالية:' : 'Current Password:'}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={isAr ? 'كلمة المرور الحالية...' : 'Current password...'}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'كلمة المرور الجديدة (8 أحرف على الأقل):' : 'New Password (min 8 chars):'}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={isAr ? 'أدخل كلمة مرور جديدة قوية...' : 'Enter new strong password...'}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'تأكيد كلمة المرور الجديدة:' : 'Confirm New Password:'}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={isAr ? 'أعد إدخال كلمة المرور الجديدة...' : 'Re-enter new password...'}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isVerifying ? (
                    <span>{isAr ? 'جارِ الحفظ والتشفير...' : 'Saving...'}</span>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>{isAr ? 'حفظ كلمة المرور الجديدة' : 'Save New Password'}</span>
                    </>
                  )}
                </button>

                {!pendingUser?.mustChangePassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                    }}
                    className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

