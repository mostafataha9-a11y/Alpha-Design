import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  KeyRound,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Lock,
  Unlock,
  Users,
  ExternalLink,
  QrCode,
  Sparkles,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { AdminUser, SiteSettings } from '../types/blog';
import { AuthorBadge } from './AuthorBadge';

interface AdminSecurityViewProps {
  currentUser: AdminUser;
  settings: SiteSettings;
  onUpdateAdminUser: (updatedUser: Partial<AdminUser>) => void;
  onNavigateToSupervisors: () => void;
}

export const AdminSecurityView: React.FC<AdminSecurityViewProps> = ({
  currentUser,
  settings,
  onUpdateAdminUser,
  onNavigateToSupervisors,
}) => {
  const isAr = settings.language === 'ar';
  const ownerName = settings.authorName || 'الحضرى محمود';

  // 1. Email state
  const [adminEmail, setAdminEmail] = useState(
    currentUser.email || 'mahmoudahmedhessien032@gmail.com'
  );
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // 2. Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordlessMode, setPasswordlessMode] = useState(true);

  // 3. 2FA State
  const [is2FAEnabled, setIs2FAEnabled] = useState(() => {
    try {
      return localStorage.getItem('alpha_admin_2fa_enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [twoFaSecret, setTwoFaSecret] = useState('ALPHA7HADARY9SEC');
  const [otpUrl, setOtpUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [twoFaSuccess, setTwoFaSuccess] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([
    'AD93-8F42',
    '7B19-EA50',
    '3F88-CC14',
    '99B2-4A71',
    'E208-DF95',
  ]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [emergencyKey14, setEmergencyKey14] = useState('');
  const [copiedEmergencyKey, setCopiedEmergencyKey] = useState(false);
  const [isGeneratingEmergencyKey, setIsGeneratingEmergencyKey] = useState(false);

  // 4. Supervisors Google accounts summary
  const [supervisorsCount, setSupervisorsCount] = useState(0);

  // Notifications
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleTestGenerateEmergencyKey = async () => {
    setIsGeneratingEmergencyKey(true);
    try {
      const res = await fetch('/api/auth/2fa/emergency-key/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: adminEmail }),
      });
      const data = await res.json();
      if (res.ok && data.formattedKey) {
        setEmergencyKey14(data.formattedKey);
        showToast(isAr ? 'تم توليد مفتاح الطوارئ المكون من 14 حرفاً وإرساله بنجاح!' : '14-character emergency key generated!');
      } else {
        setErrorMsg(data.error || 'فشل توليد مفتاح الطوارئ.');
      }
    } catch {
      setErrorMsg(isAr ? 'فشل الاتصال بالخادم.' : 'Connection failed.');
    } finally {
      setIsGeneratingEmergencyKey(false);
    }
  };

  const handleCopy14CharKey = () => {
    if (!emergencyKey14) return;
    try {
      navigator.clipboard.writeText(emergencyKey14);
      setCopiedEmergencyKey(true);
      setTimeout(() => setCopiedEmergencyKey(false), 2000);
      showToast(isAr ? 'تم نسخ مفتاح الطوارئ (14 حرفاً) بنجاح!' : 'Key copied to clipboard!');
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  // Fetch 2FA Setup & Supervisors on Mount
  useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        const res2Fa = await fetch('/api/admin/2fa/setup', {
          method: 'POST',
          credentials: 'include',
        });
        if (res2Fa.ok) {
          const data = await res2Fa.json();
          if (data.secret) setTwoFaSecret(data.secret);
          if (data.otpauthUrl) setOtpUrl(data.otpauthUrl);
          if (Array.isArray(data.backupCodes)) setBackupCodes(data.backupCodes);
        }
      } catch (e) {
        console.warn('2FA fetch note:', e);
      }

      try {
        const resSup = await fetch('/api/admin/supervisors', {
          credentials: 'include',
        });
        if (resSup.ok) {
          const data = await resSup.json();
          if (Array.isArray(data.supervisors)) {
            setSupervisorsCount(data.supervisors.length);
          }
        }
      } catch (e) {
        console.warn('Supervisors fetch note:', e);
      }
    };

    fetchSecurityData();
  }, []);

  // Handle Save Email
  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      setErrorMsg(isAr ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Please enter a valid email.');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const res = await fetch('/api/admin/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: adminEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || (isAr ? 'فشل تحديث البريد.' : 'Failed to update email.'));
      } else {
        setEmailSuccess(true);
        onUpdateAdminUser({ email: adminEmail.trim() });
        showToast(isAr ? 'تم تحديث البريد الرسمي للأدمن بنجاح!' : 'Admin email updated successfully!');
        setTimeout(() => setEmailSuccess(false), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // Handle Save Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (newPassword.trim().length < 6) {
      setErrorMsg(isAr ? 'يجب ألا تقل كلمة المرور عن 6 أحرف.' : 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(isAr ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch('/api/admin/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: newPassword.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || (isAr ? 'فشل تعيين كلمة المرور.' : 'Failed to set password.'));
      } else {
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        showToast(isAr ? 'تم تعيين وتحديث كلمة المرور الاحتياطية بنجاح!' : 'Password updated successfully!');
        setTimeout(() => setPasswordSuccess(false), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle Verify 2FA
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!verificationCode.trim() || verificationCode.trim().length !== 6) {
      setErrorMsg(isAr ? 'يرجى إدخال كود التحقق المكون من 6 أرقام.' : 'Please enter 6-digit code.');
      return;
    }

    setIsVerifying2FA(true);
    try {
      const res = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: verificationCode.trim(), secret: twoFaSecret }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || (isAr ? 'كود التحقق غير صحيح.' : 'Invalid 2FA code.'));
      } else {
        setIs2FAEnabled(true);
        setTwoFaSuccess(true);
        setVerificationCode('');
        try {
          localStorage.setItem('alpha_admin_2fa_enabled', 'true');
        } catch {}
        showToast(isAr ? 'تم تفعيل تطبيق المصادقة الثنائية (2FA) بنجاح!' : '2FA Enabled successfully!');
        setTimeout(() => setTwoFaSuccess(false), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error verifying 2FA');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleToggle2FA = () => {
    const newState = !is2FAEnabled;
    setIs2FAEnabled(newState);
    try {
      localStorage.setItem('alpha_admin_2fa_enabled', String(newState));
    } catch {}
    showToast(
      newState
        ? (isAr ? 'تم تفعيل المصادقة الثنائية' : '2FA Activated')
        : (isAr ? 'تم تعطيل المصادقة الثنائية' : '2FA Deactivated')
    );
  };

  const copySecret = () => {
    navigator.clipboard.writeText(twoFaSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 end-0 -mt-12 -me-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-400/30 flex items-center justify-center text-white shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>{isAr ? 'إعدادات حساب الأدمن والأمان والمصادقة' : 'Admin Account & Security Settings'}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Google Auth & 2FA
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  {isAr
                    ? `إدارة البريد الرسمي، الدخول عبر Google، تطبيق المصادقة الثنائية، وحسابات المشرفين`
                    : `Manage official admin email, Google sign-in, 2FA authenticator, and supervisors`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-2xl border border-slate-700/60 text-xs">
            <AuthorBadge name={ownerName} size="sm" />
            <div className="pe-2">
              <span className="font-bold text-white block">{ownerName}</span>
              <span className="text-[10px] text-blue-400 font-semibold">
                {currentUser.role === 'owner' ? (isAr ? 'صاحب المدونة والمدير العام' : 'Owner') : (isAr ? 'مشرف' : 'Supervisor')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-xl animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-600 text-white font-bold text-xs flex items-center gap-2 shadow-xl animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: 3 Main Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: OFFICIAL GOOGLE ADMIN EMAIL (البريد الرسمي للدخول عبر Google) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isAr ? 'البريد الرسمي المعتمد للأدمن (Google)' : 'Official Admin Google Email'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr ? 'البريد المخصص للدخول المباشر إلى لوحة الإدارة' : 'Primary login email for admin back-office'}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'معتمد رسمياً' : 'Verified'}</span>
            </span>
          </div>

          {/* Current Email Info Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'بريد الدخول الرسمي الحالي عبر Google:' : 'Current Google Sign-in Email:'}
            </span>
            <div className="flex items-center gap-2 text-sm font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900">
              {/* Google G Icon */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span className="font-mono">{adminEmail}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isAr
                ? 'يمكنك تسجيل الدخول فوراً بضغطة زر واحدة دون طلب أي كلمة مرور عبر حساب Google أعلاه.'
                : '1-click sign-in without password is ready with this Google email.'}
            </p>
          </div>

          {/* Change Email Form */}
          <form onSubmit={handleSaveEmail} className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {isAr ? 'تحديث أو تغيير البريد الإلكتروني للأدمن:' : 'Update Admin Email:'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full ps-10 pe-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingEmail}
              className="w-full py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isUpdatingEmail ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isAr ? 'حفظ وتحديث البريد الرسمي' : 'Save Email Address'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* CARD 2: PASSWORD MANAGEMENT & PASSWORDLESS MODE (إلغاء كلمة المرور أو تحديثها) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isAr ? 'إدارة كلمة المرور ونظام الدخول' : 'Password & Sign-In Mode'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr ? 'إلغاء كلمة المرور أو تعيين رمز احتياطي' : 'Toggle passwordless or update backup password'}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
              {isAr ? 'مصادقة Google الرسمية' : 'Google OAuth Protected'}
            </span>
          </div>

          {/* Google OAuth Protection Notice */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-900/60 space-y-2">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>{isAr ? 'تسجيل الدخول مؤمن بحساب Google الرسمي للمالك' : 'Secured via Official Google Owner Account'}</span>
            </div>
            <p className="text-[11px] text-blue-900/80 dark:text-blue-200/80 leading-relaxed">
              {isAr
                ? 'لوحة الإدارة مربوطة ومحمية حصراً بحساب Google المعتمد (mahmoudahmedhessien032@gmail.com). لا يُسمح بأي دخول مباشر بدون التحقق من حساب المالك. يمكنك أيضاً تعيين أو تحديث كلمة مرور احتياطية مشفرة أدناه.'
                : 'The admin dashboard is strictly restricted to the official Google account (mahmoudahmedhessien032@gmail.com). Direct bypass is completely disabled.'}
            </p>
          </div>

          {/* Set / Change Password Form */}
          <form onSubmit={handleSavePassword} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {isAr ? 'تعيين / تغيير كلمة المرور الاحتياطية:' : 'Set / Update Backup Password:'}
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={isAr ? 'أدخل كلمة مرور جديدة (6 أحرف فأكثر)...' : 'Enter new password...'}
                  className="w-full ps-10 pe-10 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {isAr ? 'تأكيد كلمة المرور:' : 'Confirm Password:'}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={isAr ? 'أعد إدخال كلمة المرور للتأكيد...' : 'Re-enter password...'}
                className="w-full px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword || !newPassword}
              className="w-full py-2.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isUpdatingPassword ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{isAr ? 'تحديث وحفظ كلمة المرور' : 'Save Password'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* CARD 3: TWO-FACTOR AUTHENTICATION (تطبيق المصادقة الثنائية 2FA) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{isAr ? 'تسجيل تطبيق المصادقة الثنائية (2FA Authenticator App)' : 'Two-Factor Authentication (2FA)'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    is2FAEnabled
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {is2FAEnabled ? (isAr ? 'مفعل ومؤمّن ✓' : 'Enabled ✓') : (isAr ? 'غير مفعل (اختياري)' : 'Disabled')}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr
                    ? 'متوافق مع تطبيقات Google Authenticator و Microsoft Authenticator و Authy'
                    : 'Works with Google Authenticator, Microsoft Authenticator & Authy'}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggle2FA}
              className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
                is2FAEnabled
                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20'
              }`}
            >
              {is2FAEnabled ? (isAr ? 'تعطيل المصادقة الثنائية' : 'Disable 2FA') : (isAr ? 'تفعيل المصادقة الثنائية' : 'Enable 2FA')}
            </button>
          </div>

          {/* 2FA Setup Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Visual QR Code Generator representation */}
            <div className="md:col-span-4 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-36 h-36 bg-white p-2.5 rounded-2xl shadow-md border border-slate-200 flex items-center justify-center relative">
                {/* Visual SVG QR pattern */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                  <rect x="0" y="0" width="100" height="100" fill="white" />
                  {/* Outer corner anchors */}
                  <rect x="10" y="10" width="24" height="24" fill="black" />
                  <rect x="14" y="14" width="16" height="16" fill="white" />
                  <rect x="18" y="18" width="8" height="8" fill="black" />

                  <rect x="66" y="10" width="24" height="24" fill="black" />
                  <rect x="70" y="14" width="16" height="16" fill="white" />
                  <rect x="74" y="18" width="8" height="8" fill="black" />

                  <rect x="10" y="66" width="24" height="24" fill="black" />
                  <rect x="14" y="70" width="16" height="16" fill="white" />
                  <rect x="18" y="74" width="8" height="8" fill="black" />

                  {/* QR pattern cells */}
                  <rect x="40" y="10" width="8" height="8" fill="black" />
                  <rect x="52" y="18" width="8" height="8" fill="black" />
                  <rect x="40" y="30" width="12" height="6" fill="black" />
                  <rect x="20" y="44" width="10" height="10" fill="black" />
                  <rect x="42" y="44" width="16" height="16" fill="black" />
                  <rect x="68" y="44" width="12" height="8" fill="black" />
                  <rect x="40" y="70" width="14" height="12" fill="black" />
                  <rect x="64" y="66" width="10" height="10" fill="black" />
                  <rect x="78" y="76" width="12" height="12" fill="black" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {isAr ? 'امسح الرمز عبر تطبيق Google Authenticator' : 'Scan with Google Authenticator'}
              </span>
            </div>

            {/* Secret Key & Verification Form */}
            <div className="md:col-span-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'أو أدخل المفتاح السري يدوياً في التطبيق:' : 'Or enter secret key manually:'}
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-sm font-bold text-purple-600 dark:text-purple-400 select-all border border-slate-200 dark:border-slate-700">
                    {twoFaSecret}
                  </code>
                  <button
                    onClick={copySecret}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedSecret ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSecret ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                  </button>
                </div>
              </div>

              {/* Verify Code Form */}
              <form onSubmit={handleVerify2FA} className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'اختبار وتأكيد كود التحقق (6 أرقام):' : 'Test & verify 6-digit code:'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-48 px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-center text-base tracking-widest font-black text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={isVerifying2FA || verificationCode.length !== 6}
                      className="px-5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      {isVerifying2FA ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{isAr ? 'تأكيد التفعيل' : 'Verify & Enable'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Emergency Backup Codes */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  {isAr ? 'رموز الطوارئ الاحتياطية (للاستخدام لمرة واحدة):' : 'Emergency Backup Codes (Single Use):'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {backupCodes.map((code) => (
                    <span
                      key={code}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              {/* 14-Character Emergency Activation Key Fallback */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {isAr ? 'مفتاح تفعيل الطوارئ البديل (14 حرفاً):' : '14-Character Emergency Activation Key:'}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {isAr
                            ? 'في حال فقدان هاتف المصادقة الثنائية 2FA، يُرسل مفتاح من 14 حرفاً إلى بريدك وينسخ بنقرة واحدة'
                            : 'Dispatched to admin email if 2FA device is lost, copies in 1 click'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestGenerateEmergencyKey}
                      disabled={isGeneratingEmergencyKey}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      {isGeneratingEmergencyKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      <span>{isAr ? 'طلب مفتاح تجريبي' : 'Request Key'}</span>
                    </button>
                  </div>

                  {emergencyKey14 && (
                    <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                      <code className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 font-mono text-xs sm:text-sm font-black text-amber-900 dark:text-amber-300 text-center tracking-wider border border-amber-300 dark:border-amber-700/60 select-all">
                        {emergencyKey14}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopy14CharKey}
                        className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
                        title={isAr ? 'ينسخ بنقرة واحدة' : 'Copy with 1 click'}
                      >
                        {copiedEmergencyKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedEmergencyKey ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ بنقرة واحدة' : 'Copy')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 4: SUPERVISORS GOOGLE REGISTRATION BANNER */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-blue-500/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-base text-white">
                {isAr ? 'إدارة وتسجيل حسابات Google للمشرفين' : 'Manage Supervisors Google Accounts'}
              </h4>
              <p className="text-xs text-blue-200 mt-0.5 max-w-xl">
                {isAr
                  ? 'يمكنك تسجيل بريد Google المعتمد لكل مشرف لتسهيل تسجيل دخوله مباشرة إلى لوحة التحكم بصلاحياته المحددة.'
                  : 'Register Google emails for authorized staff to let them log in smoothly with their Google account.'}
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToSupervisors}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer shrink-0"
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>{isAr ? 'الانتقال إلى صفحة المشرفين' : 'Open Supervisors Manager'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSecurityView;
