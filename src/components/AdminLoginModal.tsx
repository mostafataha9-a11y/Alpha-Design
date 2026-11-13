import React, { useState, useEffect } from 'react';
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
  Copy,
  Check,
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

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  settings,
}) => {
  const isAr = settings.language === 'ar';
  const ownerName = settings.authorName || 'الحضرى محمود';

  const [mode, setMode] = useState<'login' | 'verifyCode' | 'changePassword'>('login');
  const [email, setEmail] = useState(OFFICIAL_OWNER_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Email Verification Code States
  const [challengeId, setChallengeId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<string>('');
  const [previewCode, setPreviewCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [copiedOtp, setCopiedOtp] = useState(false);

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

  useEffect(() => {
    if (!isOpen) {
      setMode('login');
      setPassword('');
      setShowPassword(false);
      setChallengeId('');
      setOtpCode('');
      setPreviewCode('');
      setEmailSent(false);
      setDeliveryMethod('');
      setResendCooldown(0);
      setIsVerifying(false);
      setIsResending(false);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const postAuthJson = async (url: string, payload: Record<string, unknown>) => {
    let lastError: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
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
        let data: any = null;
        try {
          data = rawText ? JSON.parse(rawText) : {};
        } catch {
          data = null;
        }

        if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt === 0) {
          await new Promise((r) => setTimeout(r, 450));
          continue;
        }

        return { ok: response.ok, status: response.status, data, rawText };
      } catch (err: any) {
        lastError = err;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 450));
          continue;
        }
      }
    }
    throw lastError || new Error('Network error');
  };

  // Step 1: Verify Email + Password & Request Email OTP Code
  const handleStep1Login = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail !== OFFICIAL_OWNER_EMAIL) {
      setErrorMsg(
        isAr
          ? `عذراً: الدخول مقتصر على البريد الرسمي المعتمد للمالك فقط (${OFFICIAL_OWNER_EMAIL}).`
          : `Only the official owner email (${OFFICIAL_OWNER_EMAIL}) is authorized.`
      );
      return;
    }

    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      setErrorMsg(isAr ? 'يرجى إدخال كلمة المرور للمتابعة وإرسال كود التحقق.' : 'Password is required.');
      return;
    }

    setIsVerifying(true);
    try {
      const { ok, status, data } = await postAuthJson('/api/auth/login', {
        email: cleanEmail,
        password: trimmedPassword,
      });

      if (!ok || !data) {
        const serverErr = data?.error || data?.message;
        setErrorMsg(
          serverErr ||
            (status >= 500
              ? isAr
                ? `استجابة غير متوقعة من خادم المصادقة (رمز ${status}). يرجى تحديث الصفحة والمحاولة مجدداً.`
                : `Authentication server returned status ${status}.`
              : isAr
                ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
                : 'Invalid credentials.')
        );
        return;
      }

      if (data.requiresEmailCode && data.challengeId) {
        setChallengeId(data.challengeId);
        setMaskedEmail(data.maskedEmail || cleanEmail);
        setEmailSent(Boolean(data.emailSent));
        setDeliveryMethod(data.deliveryMethod || '');
        setPreviewCode(data.previewCode || '');
        setOtpCode('');
        setResendCooldown(30);
        setMode('verifyCode');
        setSuccessMsg(
          data.emailSent
            ? isAr
              ? `تم إرسال كود تسجيل الدخول المكون من 6 أرقام إلى بريدك (${data.maskedEmail || cleanEmail}).`
              : `A 6-digit login code has been sent to ${data.maskedEmail || cleanEmail}.`
            : isAr
              ? 'تم التحقق من كلمة المرور بنجاح. أدخل كود التحقق المكون من 6 أرقام لإتمام الدخول.'
              : 'Password verified. Enter the 6-digit verification code to sign in.'
        );
        return;
      }

      const user: AdminUser = {
        name: data.user?.name || ownerName,
        role: data.user?.role || 'owner',
        email: data.user?.email || OFFICIAL_OWNER_EMAIL,
        isLoggedIn: true,
        mustChangePassword: Boolean(data.user?.mustChangePassword),
      };
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      console.error('Login step 1 error:', err);
      setErrorMsg(isAr ? 'تعذر الاتصال بخادم المصادقة. يرجى التحقق من الاتصال وتحديث الصفحة ثم المحاولة مجدداً.' : 'Unable to connect to authentication server.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 2: Verify 6-Digit Email Code & Complete Sign-In
  const handleVerifyEmailCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanCode = otpCode.replace(/\s+/g, '').trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setErrorMsg(isAr ? 'يرجى إدخال كود التحقق المكون من 6 أرقام بشكل صحيح.' : 'Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      const { ok, status, data } = await postAuthJson('/api/auth/login/verify-code', {
        challengeId,
        code: cleanCode,
      });

      if (!ok || !data) {
        setErrorMsg(
          data?.error ||
            data?.message ||
            (isAr ? `فشل التحقق من الكود (رمز ${status}).` : 'Invalid or expired verification code.')
        );
        return;
      }

      const user: AdminUser = {
        name: data.user?.name || ownerName,
        role: data.user?.role || 'owner',
        email: data.user?.email || OFFICIAL_OWNER_EMAIL,
        isLoggedIn: true,
        mustChangePassword: Boolean(data.user?.mustChangePassword),
      };

      if (user.mustChangePassword) {
        setPendingUser(user);
        setCurrentPassword(password.trim());
        setMode('changePassword');
        setErrorMsg(isAr ? 'يجب تحديث كلمة المرور قبل متابعة استخدام لوحة الإدارة.' : 'Please update your password.');
        return;
      }

      setSuccessMsg(isAr ? 'تم تأكيد الكود وتسجيل الدخول بنجاح إلى لوحة الإدارة!' : 'Verified and signed in successfully!');
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 350);
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setErrorMsg(isAr ? 'تعذر التحقق من الكود مع الخادم. يرجى المحاولة مجدداً.' : 'Failed to verify code.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend 6-digit OTP Code
  const handleResendCode = async () => {
    if (!challengeId || resendCooldown > 0 || isResending) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsResending(true);

    try {
      const { ok, status, data } = await postAuthJson('/api/auth/login/resend-code', { challengeId });

      if (!ok || !data) {
        setErrorMsg(
          data?.error ||
            data?.message ||
            (isAr ? `تعذر إعادة إرسال الكود (رمز ${status}).` : 'Failed to resend code.')
        );
        if (data?.retryAfterSeconds) {
          setResendCooldown(Number(data.retryAfterSeconds));
        }
        return;
      }

      setEmailSent(Boolean(data.emailSent));
      setDeliveryMethod(data.deliveryMethod || '');
      setPreviewCode(data.previewCode || '');
      setResendCooldown(30);
      setSuccessMsg(
        data.emailSent
          ? isAr
            ? `تمت إعادة إرسال كود تحقق جديد إلى (${data.maskedEmail || maskedEmail}).`
            : `A new verification code was sent to ${data.maskedEmail || maskedEmail}.`
          : isAr
            ? 'تم توليد كود تحقق جديد بنجاح.'
            : 'Generated a new verification code.'
      );
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      setErrorMsg(isAr ? 'تعذر الاتصال بالخادم لإعادة إرسال الكود.' : 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCopyPreviewCode = () => {
    if (!previewCode) return;
    setOtpCode(previewCode);
    try {
      navigator.clipboard.writeText(previewCode);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    } catch {
      // Ignore clipboard failure
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
      const { ok, status, data } = await postAuthJson('/api/auth/change-password', {
        currentPassword: trimmedCurrent,
        newPassword: trimmedNew,
      });

      if (!ok || !data) {
        setErrorMsg(
          data?.error ||
            data?.message ||
            (isAr ? `فشل تغيير كلمة المرور (رمز ${status}).` : 'Failed to change password.')
        );
        return;
      }

      setSuccessMsg(isAr ? 'تم تغيير كلمة المرور بنجاح وحفظها مشفرة في قاعدة البيانات.' : 'Password updated successfully.');
      setTimeout(() => {
        if (pendingUser) {
          onLoginSuccess({ ...pendingUser, mustChangePassword: false });
        }
        onClose();
      }, 1000);
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
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className="absolute top-4 end-4 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 pe-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
              {mode === 'verifyCode' ? <Mail className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-base">
                  {mode === 'verifyCode'
                    ? (isAr ? 'تأكيد كود الدخول عبر الإيميل' : 'Verify Email Login Code')
                    : mode === 'changePassword'
                      ? (isAr ? 'تغيير كلمة المرور وتحديث الأمان' : 'Update Admin Password')
                      : (isAr ? 'بوابة دخول المالك المشفرة' : 'Secure Owner Portal')}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  {isAr ? 'تحقق مزدوج' : '2-Step Auth'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAr
                  ? 'الدخول بالبريد المعتمد وكلمة المرور وكود التحقق عبر البريد'
                  : 'Authorized owner email, password, and email OTP'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Owner Identity Highlight */}
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
              <span>{isAr ? 'حماية بالبريد' : 'Email OTP'}</span>
            </div>
          </div>

          {mode === 'login' && (
            <form onSubmit={handleStep1Login} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'البريد الإلكتروني المعتمد:' : 'Authorized Email:'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={OFFICIAL_OWNER_EMAIL}
                    required
                    className="w-full ps-10 pe-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'كلمة المرور:' : 'Password:'}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isAr ? 'أدخل كلمة مرور المالك...' : 'Enter owner password...'}
                    required
                    className="w-full ps-10 pe-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جارٍ التحقق وإرسال الكود...' : 'Verifying & sending code...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isAr ? 'التحقق وإرسال كود الدخول عبر الإيميل' : 'Verify & Send Email Code'}</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                {isAr
                  ? 'بعد مطابقة البريد وكلمة المرور سيتم إرسال كود تحقق من 6 أرقام لتأكيد دخولك بأمان.'
                  : 'A 6-digit verification code will be sent after validating your password.'}
              </p>
            </form>
          )}

          {mode === 'verifyCode' && (
            <form onSubmit={handleVerifyEmailCode} className="space-y-4 animate-in fade-in duration-150">
              <div
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                  emailSent
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                }`}
              >
                {emailSent ? (
                  <p>
                    {isAr
                      ? `تم إرسال رسالة تحتوي على كود من 6 أرقام إلى البريد (${maskedEmail}). يرجى فتح البريد وإدخال الكود أدناه خلال 10 دقائق.`
                      : `A 6-digit code was sent to ${maskedEmail}. Enter it below within 10 minutes.`}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p>
                      {isAr
                        ? 'تم تأكيد كلمة المرور بنجاح، لكن إعدادات إرسال البريد الخارجي (SMTP / GMAIL_APP_PASSWORD) غير مضافة حالياً لمتغيرات الخادم. يمكنك استخدام كود التحقق المباشر لهذه الجلسة أدناه:'
                        : 'Password verified. External SMTP is not configured on the server yet; use the session verification code below:'}
                    </p>
                    {previewCode && (
                      <div className="flex items-center gap-2 pt-1">
                        <code
                          dir="ltr"
                          className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 font-mono text-base font-black tracking-[0.3em] text-center text-blue-700 dark:text-blue-300 select-all"
                        >
                          {previewCode}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyPreviewCode}
                          className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                          {copiedOtp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedOtp ? (isAr ? 'تم التعبئة' : 'Filled') : (isAr ? 'تعبئة الكود' : 'Use Code')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'أدخل كود التحقق (6 أرقام):' : 'Verification Code (6 digits):'}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-center font-mono text-xl font-black tracking-[0.45em] focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying || otpCode.trim().length !== 6}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جارٍ تأكيد الكود...' : 'Verifying code...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isAr ? 'تأكيد كود الدخول والمتابعة' : 'Confirm Code & Sign In'}</span>
                  </>
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
                  <span>
                    {resendCooldown > 0
                      ? (isAr ? `إعادة إرسال الكود (${resendCooldown}ث)` : `Resend (${resendCooldown}s)`)
                      : (isAr ? 'إعادة إرسال الكود' : 'Resend Code')}
                  </span>
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
                  <span>{isAr ? 'العودة لتغيير البيانات' : 'Back'}</span>
                </button>
              </div>
            </form>
          )}

          {mode === 'changePassword' && (
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
      </div>
    </div>
  );
};
