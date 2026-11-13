import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  ShieldCheck,
  X,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Send
} from 'lucide-react';
import { AdminUser, SiteSettings } from '../types/blog';
import { AuthorBadge } from './AuthorBadge';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUser) => void;
  settings: SiteSettings;
}

const OFFICIAL_OWNER_EMAIL = 'mahmoudahmedhessien032@gmail.com';

function toSafeText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
  }
  return fallback;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  settings,
}) => {
  const isAr = settings?.language !== 'en';
  const ownerName = toSafeText(settings?.authorName, 'الحضرى محمود') || 'الحضرى محمود';

  const [mode, setMode] = useState<'login' | 'verifyCode' | 'changePassword'>('login');
  const [email, setEmail] = useState(OFFICIAL_OWNER_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Email Verification Code States (Secure Real OTP)
  const [challengeId, setChallengeId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Shared Status States
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [pendingUser, setPendingUser] = useState<AdminUser | null>(null);

  const isMountedRef = useRef(true);
  const otpInputRef = useRef<HTMLInputElement | null>(null);
  const timersRef = useRef<number[]>([]);

  const scheduleSafeTimeout = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      if (isMountedRef.current) {
        fn();
      }
    }, ms);
    timersRef.current.push(id);
    return id;
  };

  const clearPendingTimers = () => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearPendingTimers();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      clearPendingTimers();
      setMode('login');
      setPassword('');
      setShowPassword(false);
      setChallengeId('');
      setOtpCode('');
      setMaskedEmail('');
      setResendCooldown(0);
      setIsVerifying(false);
      setIsResending(false);
      setPendingUser(null);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || mode !== 'verifyCode') return;
    const focusTimer = window.setTimeout(() => {
      try {
        otpInputRef.current?.focus({ preventScroll: true });
      } catch {
        // Ignore focus errors
      }
    }, 60);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen, mode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const postAuthJson = async (url: string, payload: Record<string, unknown>) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      cache: 'no-store',
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    let data: Record<string, unknown> | null = null;
    try {
      const parsed = rawText ? JSON.parse(rawText) : {};
      data = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      data = null;
    }

    return { ok: response.ok, status: response.status, data, rawText };
  };

  // Step 1: Verify Email + Password & Request Real Email OTP
  const handleStep1Login = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isVerifying) return;

    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail !== OFFICIAL_OWNER_EMAIL) {
      setErrorMsg(
        isAr
          ? `عذراً: الدخول مقتصر حصرياً على البريد الرسمي للمالك (${OFFICIAL_OWNER_EMAIL}).`
          : `Only the official owner email is authorized.`
      );
      return;
    }

    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      setErrorMsg(isAr ? 'يرجى إدخال كلمة المرور للمتابعة.' : 'Password is required.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await postAuthJson('/api/auth/login', {
        email: cleanEmail,
        password: trimmedPassword,
      });

      if (!isMountedRef.current) return;

      const { ok, status, data } = res;

      if (!ok || !data) {
        const serverErr = toSafeText(data?.error) || toSafeText(data?.message);
        setErrorMsg(
          serverErr ||
            (isAr
              ? 'كلمة المرور غير صحيحة أو حدث خطأ في الخادم.'
              : 'Invalid credentials.')
        );
        return;
      }

      const nextChallengeId = toSafeText(data.challengeId);
      if (Boolean(data.requiresEmailCode) && nextChallengeId) {
        const nextMaskedEmail = toSafeText(data.maskedEmail, cleanEmail) || cleanEmail;

        setChallengeId(nextChallengeId);
        setMaskedEmail(nextMaskedEmail);
        setOtpCode('');
        setResendCooldown(45);
        setMode('verifyCode');
        setSuccessMsg(
          isAr
            ? `تم إرسال كود التحقق السري المكون من 6 أرقام إلى بريدك الإلكتروني المعتمد (${nextMaskedEmail}).`
            : `A 6-digit verification code has been sent to your email.`
        );
        return;
      }

      setErrorMsg(isAr ? 'فشل بدء عملية التحقق عبر البريد.' : 'Failed to initiate email verification.');
    } catch (err) {
      console.error('Login step 1 error:', err);
      if (isMountedRef.current) {
        setErrorMsg(
          isAr
            ? 'تعذر الاتصال بخادم المصادقة البريدي لإرسال الكود. تأكد من تفعيل مسارات الخادم الخلفية.'
            : 'Could not connect to authentication server.'
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsVerifying(false);
      }
    }
  };

  // Step 2: Verify Real 6-Digit Email Code
  const handleVerifyEmailCode = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isVerifying) return;

    setErrorMsg('');
    setSuccessMsg('');

    const cleanCode = otpCode.replace(/\s+/g, '').trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setErrorMsg(isAr ? 'يرجى إدخال كود التحقق المكون من 6 أرقام بدقة.' : 'Please enter the valid 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await postAuthJson('/api/auth/login/verify-code', {
        challengeId,
        code: cleanCode,
      });

      if (!isMountedRef.current) return;

      const { ok, status, data } = res;

      if (!ok || !data) {
        setErrorMsg(
          toSafeText(data?.error) ||
            toSafeText(data?.message) ||
            (isAr ? 'كود التحقق غير صحيح أو انتهت صلاحيته.' : 'Invalid or expired verification code.')
        );
        return;
      }

      const rawUser = (data.user && typeof data.user === 'object' ? data.user : {}) as Record<string, unknown>;
      const user: AdminUser = {
        name: toSafeText(rawUser.name, ownerName) || ownerName,
        role: (rawUser.role === 'supervisor' ? 'supervisor' : 'owner'),
        email: toSafeText(rawUser.email, OFFICIAL_OWNER_EMAIL) || OFFICIAL_OWNER_EMAIL,
        isLoggedIn: true,
        mustChangePassword: Boolean(rawUser.mustChangePassword),
      };

      if (user.mustChangePassword) {
        setPendingUser(user);
        setCurrentPassword(password.trim());
        setMode('changePassword');
        setErrorMsg(isAr ? 'يجب تحديث كلمة المرور قبل المتابعة.' : 'Please update your password.');
        return;
      }

      setSuccessMsg(isAr ? 'تم التحقق بنجاح وتسيجل الدخول!' : 'Verified and signed in successfully!');
      scheduleSafeTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 300);
    } catch (err) {
      console.error('Verify OTP error:', err);
      if (isMountedRef.current) {
        setErrorMsg(isAr ? 'خطأ في الاتصال بالخادم أثناء التحقق من الكود.' : 'Network error verifying code.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsVerifying(false);
      }
    }
  };

  // Resend Real OTP Code
  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsResending(true);

    try {
      const res = await postAuthJson('/api/auth/login/resend-code', { challengeId });
      if (!isMountedRef.current) return;

      const { ok, status, data } = res;

      if (!ok || !data) {
        setErrorMsg(
          toSafeText(data?.error) ||
            toSafeText(data?.message) ||
            (isAr ? 'تعذر إعادة إرسال الكود.' : 'Failed to resend code.')
        );
        return;
      }

      setResendCooldown(45);
      setSuccessMsg(
        isAr
          ? `تمت إعادة إرسال كود تحقق جديد إلى بريدك (${maskedEmail}).`
          : 'A new verification code has been sent to your email.'
      );
    } catch (err) {
      console.error('Resend OTP error:', err);
      if (isMountedRef.current) {
        setErrorMsg(isAr ? 'تعذر الاتصال لإعادة إرسال الكود.' : 'Failed to resend code.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsResending(false);
      }
    }
  };

  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isVerifying) return;

    setErrorMsg('');
    setSuccessMsg('');

    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedCurrent || trimmedNew.length < 8 || trimmedNew !== trimmedConfirm) {
      setErrorMsg(isAr ? 'يرجى إدخال البيانات بشكل صحيح (كلمة المرور الجديدة 8 أحرف على الأقل ومتطابقة).' : 'Invalid password details.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await postAuthJson('/api/auth/change-password', {
        currentPassword: trimmedCurrent,
        newPassword: trimmedNew,
      });

      if (!isMountedRef.current) return;

      const { ok, status, data } = res;
      if (!ok || !data) {
        setErrorMsg(toSafeText(data?.error) || (isAr ? 'فشل تغيير كلمة المرور.' : 'Failed to change password.'));
        return;
      }

      setSuccessMsg(isAr ? 'تم تغيير كلمة المرور بنجاح.' : 'Password updated successfully.');
      scheduleSafeTimeout(() => {
        if (pendingUser) {
          onLoginSuccess({ ...pendingUser, mustChangePassword: false });
        } else {
          onLoginSuccess({
            name: ownerName,
            role: 'owner',
            email: OFFICIAL_OWNER_EMAIL,
            isLoggedIn: true,
            mustChangePassword: false,
          });
        }
        onClose();
      }, 600);
    } catch (err) {
      console.error('Change password failed:', err);
      if (isMountedRef.current) {
        setErrorMsg(isAr ? 'حدث خطأ أثناء تغيير كلمة المرور.' : 'Error updating password.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsVerifying(false);
      }
    }
  };

  const modalTitleText =
    mode === 'verifyCode'
      ? isAr
        ? 'التحقق الأمني عبر البريد الإلكتروني'
        : 'Email Security Verification'
      : mode === 'changePassword'
        ? isAr
          ? 'تحديث كلمة المرور'
          : 'Update Password'
        : isAr
          ? 'بوابة دخول المالك المؤمنة'
          : 'Secure Owner Portal';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className="absolute top-4 end-4 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 pe-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
              {mode === 'verifyCode' ? (
                <span key="header-icon-mail" className="inline-flex">
                  <Mail className="w-6 h-6" />
                </span>
              ) : (
                <span key="header-icon-lock" className="inline-flex">
                  <Lock className="w-6 h-6" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-base">
                  <span key={`header-title-${mode}`}>{modalTitleText}</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  {isAr ? 'حماية فائقة' : 'Secure OTP'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAr
                  ? 'إرسال كود تحقق سري إلى بريد المالك الرسمي'
                  : 'Official owner email verification'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <AuthorBadge name={ownerName} size="md" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                  {ownerName}
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium block truncate" dir="ltr">
                  {OFFICIAL_OWNER_EMAIL}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>{isAr ? 'أمان تام' : 'Protected'}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'login' && (
            <form key="form-step1-login" noValidate onSubmit={handleStep1Login} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'البريد الإلكتروني المعتمد للمالك:' : 'Authorized Email:'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={OFFICIAL_OWNER_EMAIL}
                    className="w-full ps-10 pe-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'كلمة المرور السرية:' : 'Password:'}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isAr ? 'أدخل كلمة المرور...' : 'Enter password...'}
                    className="w-full ps-10 pe-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={isAr ? 'إظهار أو إخفاء كلمة المرور' : 'Toggle password visibility'}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جارٍ إرسال كود التحقق للإيميل...' : 'Sending verification code...'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    <span>{isAr ? 'إرسال كود التحقق إلى البريد الإلكتروني' : 'Send Verification Code to Email'}</span>
                  </span>
                )}
              </button>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                {isAr
                  ? 'لن يظهر أي كود على الشاشة؛ سيتم إرسال كود سري فريد مباشرة إلى بريدك الإلكتروني.'
                  : 'No code will be displayed on screen; it will be emailed directly.'}
              </p>
            </form>
          )}

          {mode === 'verifyCode' && (
            <form key="form-step2-verify" noValidate onSubmit={handleVerifyEmailCode} className="space-y-4">
              <div className="p-3.5 rounded-2xl border text-xs leading-relaxed bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200">
                <p>
                  {isAr
                    ? `تم إرسال كود التحقق المكون من 6 أرقام إلى بريدك الإلكتروني المعتمد (${maskedEmail}). يرجى تفقد صندوق الوارد أو البريد العشوائي (Spam) لإدخاله أدناه.`
                    : `A 6-digit verification code has been sent to ${maskedEmail}.`}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'أدخل كود التحقق المرسل لإيميلك:' : 'Enter Email Verification Code:'}
                </label>
                <input
                  ref={otpInputRef}
                  type="text"
                  name="otp"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                  placeholder="------"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-center font-mono text-xl font-black tracking-[0.45em] focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying || otpCode.trim().length !== 6}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جارٍ التحقق من الكود...' : 'Verifying code...'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isAr ? 'تأكيد الكود وتسجيل الدخول' : 'Confirm Code & Sign In'}</span>
                  </span>
                )}
              </button>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isResending}
                  className="text-blue-600 dark:text-blue-400 hover:underline disabled:text-slate-400 disabled:no-underline font-semibold flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? (
                    <span>{isAr ? `إعادة إرسال الكود (${resendCooldown}ث)` : `Resend (${resendCooldown}s)`}</span>
                  ) : (
                    <span>{isAr ? 'إعادة إرسال الكود للإيميل' : 'Resend Email Code'}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setOtpCode('');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>{isAr ? 'العودة' : 'Back'}</span>
                </button>
              </div>
            </form>
          )}

          {mode === 'changePassword' && (
            <form key="form-step3-change-pw" noValidate onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'كلمة المرور الحالية:' : 'Current Password:'}
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={isAr ? 'كلمة المرور الحالية...' : 'Current password...'}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'كلمة المرور الجديدة (8 أحرف على الأقل):' : 'New Password:'}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={isAr ? 'كلمة المرور الجديدة...' : 'New password...'}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'تأكيد كلمة المرور الجديدة:' : 'Confirm Password:'}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={isAr ? 'تأكيد كلمة المرور...' : 'Confirm password...'}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جارٍ تحديث كلمة المرور...' : 'Updating...'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    <span>{isAr ? 'حفظ وتحديث كلمة المرور' : 'Save & Update Password'}</span>
                  </span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
