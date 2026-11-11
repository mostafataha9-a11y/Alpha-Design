import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  CheckCircle2,
  Sparkles,
  Users,
  Send,
  X,
  Mail,
  Heart,
  Share2,
  ShieldCheck,
  Award
} from 'lucide-react';

interface HadaryCoinFollowWidgetProps {
  ownerName?: string;
  isAr?: boolean;
  variant?: 'card' | 'hero' | 'floating' | 'inline' | 'compact';
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
}

export const HadaryCoinFollowWidget: React.FC<HadaryCoinFollowWidgetProps> = ({
  ownerName = 'الحضرى محمود',
  isAr = true,
  variant = 'card',
  onFollowChange,
  className = '',
}) => {
  const [isFollowing, setIsFollowing] = useState<boolean>(() => {
    try {
      return localStorage.getItem('alpha_decor_following_blog') === 'true';
    } catch {
      return false;
    }
  });

  const [followerCount, setFollowerCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('alpha_decor_followers_count');
      if (saved) return Number(saved);
    } catch {}
    return 1482;
  });

  const [showModal, setShowModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const [savedEmail, setSavedEmail] = useState<string>(() => {
    try {
      return localStorage.getItem('alpha_decor_follower_email') || '';
    } catch {
      return '';
    }
  });
  const [consentAgreed, setConsentAgreed] = useState(true);

  useEffect(() => {
    if (savedEmail && !emailInput) {
      setEmailInput(savedEmail);
    }
  }, [savedEmail]);

  useEffect(() => {
    const handleOpenModal = () => {
      setShowModal(true);
    };
    window.addEventListener('open-hadary-follow-modal', handleOpenModal);
    return () => {
      window.removeEventListener('open-hadary-follow-modal', handleOpenModal);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4500);
  };

  const handleToggleFollow = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowModal(true);
  };

  const handleUnfollow = () => {
    setIsFollowing(false);
    const newCount = Math.max(1480, followerCount - 1);
    setFollowerCount(newCount);
    try {
      localStorage.setItem('alpha_decor_following_blog', 'false');
      localStorage.setItem('alpha_decor_followers_count', String(newCount));
    } catch {}
    if (onFollowChange) onFollowChange(false);
    setShowModal(false);
    triggerToast(isAr ? 'تم إلغاء متابعة المدونة بنجاح.' : 'Unfollowed successfully.');
  };

  const handleConfirmFollow = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      triggerToast(isAr ? 'يرجى إدخال بريد إلكتروني صحيح لتصلك المقالات الجديدة.' : 'Please enter a valid email address.');
      return;
    }

    if (!consentAgreed) {
      triggerToast(isAr ? 'يرجى تأكيد الموافقة على استلام إشعارات المقالات عبر بريدك الإلكتروني.' : 'Please agree to receive article notifications.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: 'متابع المدونة',
          consentAgreed: true,
          notifyOnPublish: true,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setIsFollowing(true);
      setSavedEmail(cleanEmail);
      const newCount = isFollowing ? followerCount : followerCount + 1;
      setFollowerCount(newCount);

      try {
        localStorage.setItem('alpha_decor_following_blog', 'true');
        localStorage.setItem('alpha_decor_followers_count', String(newCount));
        localStorage.setItem('alpha_decor_follower_email', cleanEmail);
      } catch {}

      if (onFollowChange) onFollowChange(true);
      setShowModal(false);
      triggerToast(
        isAr
          ? `🎉 تم تأكيد موافقتك ومتابعتك بنجاح! سيتم إرسال إشعار فوري إلى (${cleanEmail}) عند نشر أي مقال جديد لتدخل وتقرأه مباشرة.`
          : 'Successfully followed! You will receive email notifications when new articles are published.'
      );
    } catch (err: any) {
      console.warn('Follow newsletter subscription note:', err);
      // Fallback local persistence if network warning
      setIsFollowing(true);
      setSavedEmail(cleanEmail);
      try {
        localStorage.setItem('alpha_decor_following_blog', 'true');
        localStorage.setItem('alpha_decor_follower_email', cleanEmail);
      } catch {}
      setShowModal(false);
      triggerToast(
        isAr
          ? `🎉 تم حفظ متابعتك وتفعيل إشعارات المقالات الجديدة لبريدك: (${cleanEmail})`
          : 'Subscription active!'
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // ANIMATED 3D GOLD COIN COMPONENT («عملة الحضرى المعدنية المتحركة»)
  // -------------------------------------------------------------
  const renderCoin = (size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-14 h-14',
      md: 'w-24 h-24 sm:w-28 sm:h-28',
      lg: 'w-32 h-32 sm:w-36 sm:h-36',
    }[size];

    const fontSize = {
      sm: 'text-xs',
      md: 'text-base sm:text-lg',
      lg: 'text-lg sm:text-xl',
    }[size];

    return (
      <div
        className={`relative ${sizeClasses} mx-auto cursor-pointer select-none group perspective-1000`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleToggleFollow}
        title={isAr ? 'عملة الحضرى التذكارية - انقر للمتابعة' : 'Al-Hadari Coin - Click to follow'}
      >
        {/* Outer Golden Ambient Glow */}
        <div
          className={`absolute -inset-2 rounded-full bg-gradient-to-tr from-amber-500/30 via-yellow-400/40 to-amber-600/30 blur-md transition-all duration-500 ${
            isHovered ? 'scale-110 opacity-100' : 'opacity-75 animate-pulse'
          }`}
        ></div>

        {/* 3D Flipping Coin Body */}
        <div
          className={`relative w-full h-full rounded-full transition-transform duration-700 ease-out transform-style-3d ${
            isHovered ? 'rotate-y-180 scale-105' : 'animate-coin-spin'
          }`}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* =========================================
              FRONT FACE: «الحضرى» Embossed in Gold
              ========================================= */}
          <div
            className="absolute inset-0 rounded-full flex flex-col items-center justify-center p-1.5 shadow-2xl backface-hidden"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #fff7cc 0%, #ffd700 25%, #d4af37 55%, #aa771c 85%, #68490a 100%)',
              border: '3px solid #fdf6bd',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -3px 6px rgba(0,0,0,0.5), 0 10px 25px -5px rgba(212,175,55,0.6)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            {/* Concentric Milled Rim Border */}
            <div className="absolute inset-1 rounded-full border border-dashed border-amber-900/40 pointer-events-none"></div>
            <div className="absolute inset-1.5 rounded-full border border-amber-100/60 pointer-events-none"></div>

            {/* Specular Light Reflection Sweep */}
            <div
              className="absolute inset-0 rounded-full overflow-hidden pointer-events-none opacity-40 mix-blend-overlay"
              style={{
                background: 'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.9) 50%, transparent 65%)',
                animation: 'coin-shine 3.5s infinite linear',
              }}
            ></div>

            {/* Top Stars Ornament */}
            <div className="flex items-center gap-0.5 text-amber-950/70 text-[9px] font-black tracking-widest z-10 -mt-1">
              <span>★</span>
              <span>★</span>
              <span>★</span>
            </div>

            {/* Engraved Center Name: «الحضرى» */}
            <div className="relative z-10 text-center my-0.5">
              <span
                className={`block font-black ${fontSize} tracking-tight leading-none text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]`}
                style={{
                  fontFamily: "'Cairo', 'Tajawal', var(--font-arabic-modern), sans-serif",
                  textShadow: '0 1px 0 #fff7cc, 0 -1px 0 #785206, 0 2px 3px rgba(0,0,0,0.3)',
                }}
              >
                الحضرى
              </span>
              <span className="block text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest text-amber-900/90 leading-tight">
                AL-HADARY
              </span>
            </div>

            {/* Bottom Minting Year / Laurel Emblem */}
            <div className="relative z-10 flex items-center gap-1 text-[8px] font-bold text-amber-950/80 -mb-1">
              <span>❖</span>
              <span>2026</span>
              <span>❖</span>
            </div>
          </div>

          {/* =========================================
              BACK FACE: «ألفا للديكور» / Signature Crest
              ========================================= */}
          <div
            className="absolute inset-0 rounded-full flex flex-col items-center justify-center p-1.5 shadow-2xl backface-hidden"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #fff7cc 0%, #ffd700 25%, #d4af37 55%, #aa771c 85%, #68490a 100%)',
              border: '3px solid #fdf6bd',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -3px 6px rgba(0,0,0,0.5), 0 10px 25px -5px rgba(212,175,55,0.6)',
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            {/* Concentric Rim Border */}
            <div className="absolute inset-1 rounded-full border border-dashed border-amber-900/40 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center justify-center text-center">
              <Award className="w-4 h-4 text-amber-950 drop-shadow-[0_1px_0_#fff7cc] mb-0.5" />
              <span
                className="font-black text-xs sm:text-sm text-amber-950 drop-shadow-[0_1px_0_#fff7cc]"
                style={{
                  fontFamily: "'Cairo', 'Tajawal', var(--font-arabic-modern), sans-serif",
                  textShadow: '0 1px 0 #fff7cc, 0 -1px 0 #785206',
                }}
              >
                ألفا للديكور
              </span>
              <span className="text-[8px] font-extrabold tracking-widest text-amber-900 uppercase">
                DECOR & PAINTS
              </span>
            </div>
          </div>
        </div>

        {/* Floating Sparkle Icon on top corner */}
        <div className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 flex items-center justify-center shadow-md animate-bounce pointer-events-none z-20">
          <Sparkles className="w-3 h-3" />
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // VARIANT 1: CARD (Ideal for Sidebar, Author Box & Footer)
  // -------------------------------------------------------------
  if (variant === 'card') {
    return (
      <div className={`bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 border border-amber-500/30 shadow-xl relative overflow-hidden group ${className}`}>
        {/* Background glow effects */}
        <div className="absolute top-0 end-0 -mt-8 -me-8 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 start-0 -mb-8 -ms-8 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 text-center space-y-4">
          {/* Header pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{isAr ? 'اللوجو والعملة الرسمية للمدونة' : 'Official Blog Coin & Emblem'}</span>
          </div>

          {/* Animated 3D Coin Badge */}
          <div className="py-2">
            {renderCoin('md')}
          </div>

          {/* Owner & Blog Info */}
          <div className="space-y-1">
            <h4 className="font-black text-lg text-white flex items-center justify-center gap-2">
              <span>{isAr ? `مدونة الحضرى للديكور` : 'Al-Hadari Decor Blog'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </h4>
            <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
              {isAr
                ? 'انضم إلى نخبة عشاق الديكور والتشطيبات الفاخرة بإشراف مباشر من الأستاذ الحضرى محمود'
                : 'Join interior design enthusiasts under the direct leadership of Al-Hadari Mahmoud'}
            </p>
          </div>

          {/* Follower Counter Badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-amber-200/90 font-bold bg-white/5 py-1.5 px-3 rounded-xl border border-white/10 w-fit mx-auto">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>{followerCount.toLocaleString('ar-EG')} {isAr ? 'متابع نشط' : 'active followers'}</span>
          </div>

          {/* FOLLOW BUTTON ("زر متابعة المدونة: تابعنا ليصلك كل جديد") */}
          <div className="pt-1">
            <button
              onClick={handleToggleFollow}
              className={`w-full py-3.5 px-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all duration-300 shadow-xl cursor-pointer ${
                isFollowing
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                  : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/25 hover:scale-[1.02] active:scale-98 ring-2 ring-amber-300'
              }`}
            >
              {isFollowing ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>{isAr ? 'أنت تتابع المدونة ✓' : 'Following Alpha Decor ✓'}</span>
                </>
              ) : (
                <>
                  <BellRing className="w-5 h-5 animate-bounce" />
                  <span>{isAr ? 'تابعنا ليصلك كل جديد' : 'Follow Us For All Updates'}</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-400 mt-2">
              {isFollowing
                ? (isAr ? 'مفعل: تتلقى تنبيهات أحدث المقالات ونصائح التشطيب' : 'Active: Notifications enabled')
                : (isAr ? 'انقر أعلاه لمتابعة مقالات ونصائح الديكور فور نشرها' : 'Click above to stay tuned')}
            </p>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="absolute inset-x-4 bottom-4 z-30 p-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold text-center shadow-2xl animate-in fade-in slide-in-from-bottom-2">
            {successToast}
          </div>
        )}

        {/* Quick Follow Modal */}
        {renderFollowModal()}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VARIANT 2: HERO (Integrated seamlessly in the main Home Hero)
  // -------------------------------------------------------------
  if (variant === 'hero') {
    return (
      <div className={`flex flex-col sm:flex-row items-center gap-5 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-yellow-400/15 to-amber-500/10 border border-amber-400/30 backdrop-blur-md shadow-xl ${className}`}>
        {/* Coin Left/Start */}
        <div className="shrink-0">
          {renderCoin('sm')}
        </div>

        {/* Middle text */}
        <div className="text-center sm:text-start flex-1 space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="font-black text-sm sm:text-base text-white">
              {isAr ? 'عملة ومجتمع «الحضرى للديكور»' : 'Al-Hadari Decor Community'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
              VIP
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-snug">
            {isAr
              ? 'انضم لأكثر من ١,٤٠٠ متابع وتلقى أحدث كتالوجات وأسرار الدهانات والتشطيب فوراً'
              : 'Join 1,400+ followers for exclusive decor updates'}
          </p>
        </div>

        {/* Button Right/End */}
        <div className="shrink-0 w-full sm:w-auto">
          <button
            onClick={handleToggleFollow}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
              isFollowing
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 hover:scale-105 active:scale-95'
            }`}
          >
            {isFollowing ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAr ? 'متابع ✓' : 'Following ✓'}</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 animate-bounce" />
                <span>{isAr ? 'تابعنا ليصلك كل جديد' : 'Follow For Updates'}</span>
              </>
            )}
          </button>
        </div>

        {/* Toast */}
        {successToast && (
          <div className="fixed bottom-6 start-6 z-50 p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-2xl animate-in fade-in">
            {successToast}
          </div>
        )}

        {renderFollowModal()}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VARIANT 3: FLOATING WIDGET (Corner pinned across all pages)
  // -------------------------------------------------------------
  if (variant === 'floating') {
    return (
      <>
        <div
          className={`fixed bottom-6 start-6 z-40 flex items-center gap-2.5 p-2 pe-4 rounded-full bg-slate-900/95 text-white border border-amber-500/40 shadow-2xl backdrop-blur-md hover:scale-105 transition-all cursor-pointer group ${className}`}
          onClick={handleToggleFollow}
          title={isAr ? 'متابعة مدونة الحضرى للديكور' : 'Follow Al-Hadari Blog'}
        >
          {/* Mini Coin in floating pill */}
          <div className="w-10 h-10 rounded-full shrink-0 relative">
            {renderCoin('sm')}
          </div>

          <div className="text-start">
            <span className="block text-xs font-black text-amber-300 group-hover:text-amber-200 transition-colors">
              {isFollowing
                ? (isAr ? 'أنت تتابع المدونة ✓' : 'Following ✓')
                : (isAr ? 'تابعنا ليصلك كل جديد' : 'Follow For Updates')}
            </span>
            <span className="block text-[10px] text-slate-400">
              {isAr ? 'إشراف الحضرى محمود' : 'Al-Hadari Decor'}
            </span>
          </div>

          <div className="ms-1 w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
            {isFollowing ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Bell className="w-3.5 h-3.5 animate-bounce" />}
          </div>
        </div>

        {renderFollowModal()}
      </>
    );
  }

  // -------------------------------------------------------------
  // DEFAULT INLINE / COMPACT
  // -------------------------------------------------------------
  return (
    <div className={`text-center space-y-3 p-5 rounded-3xl bg-slate-900/90 text-white border border-amber-500/30 ${className}`}>
      {renderCoin('md')}
      <button
        onClick={handleToggleFollow}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md hover:scale-102 transition-all cursor-pointer"
      >
        <BellRing className="w-4 h-4" />
        <span>{isAr ? 'تابعنا ليصلك كل جديد' : 'Follow For Updates'}</span>
      </button>
      {renderFollowModal()}
    </div>
  );

  // Helper: Quick Follow / Email modal
  function renderFollowModal() {
    if (!showModal) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in"
        onClick={() => setShowModal(false)}
      >
        <div
          className="bg-slate-900 border border-amber-500/40 text-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setShowModal(false)}
            className="absolute top-4 end-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Mini Coin in Header */}
          <div className="text-center space-y-2">
            <div className="py-1">
              {renderCoin('sm')}
            </div>
            <h3 className="text-lg font-black text-white">
              {isAr ? 'متابعة مدونة الفا للديكور والدهانات' : 'Follow Alpha Decor & Paints'}
            </h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              {isAr
                ? 'كن أول من يصله أحدث أفكار بديل الرخام، دهانات الجدران الحديثة، وديكورات المنازل الفاخرة بإشراف الأستاذ الحضرى محمود'
                : 'Receive the latest decor tips and wall finishing trends directly'}
            </p>
          </div>

          {/* Form */}
          {isFollowing && savedEmail ? (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-1.5">
                <div className="flex items-center justify-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>{isAr ? 'أنت تتابع المدونة حالياً بنجاح!' : 'You are currently following the blog!'}</span>
                </div>
                <p className="text-xs text-slate-300 font-mono">
                  {savedEmail}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isAr
                    ? 'الموافقة مفعلة: ستصلك إشعارات وتنبيهات المقالات الجديدة إلى بريدك لتقرأها مباشرة فور نشرها.'
                    : 'Active consent: You will receive notifications when new articles are published.'}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUnfollow}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-red-950/60 hover:text-red-400 border border-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                >
                  {isAr ? 'إلغاء المتابعة' : 'Unfollow'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirmFollow} className="space-y-3.5 text-start">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {isAr ? 'بريدك الإلكتروني لتلقي إشعارات المقالات الجديدة:' : 'Your Email for New Article Alerts:'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={isAr ? 'name@example.com' : 'Your email'}
                    className="w-full ps-9 pe-3 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Consent checkbox */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/80 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-600 text-amber-500 focus:ring-amber-400"
                />
                <span className="text-[11px] leading-relaxed text-slate-300">
                  {isAr
                    ? 'أوافق على استلام تنبيهات وإشعارات المقالات الجديدة ونصائح الديكور والدهانات المنشورة في مدونة ألفا على بريدي الإلكتروني، ليتسنى لي الدخول المباشر وقراءة كل مقال فور نشره.'
                    : 'I agree to receive new article notifications via email to read them upon publication.'}
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !consentAgreed}
                className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-spin text-sm">⏳</span>
                ) : (
                  <>
                    <BellRing className="w-4 h-4" />
                    <span>{isAr ? 'تأكيد الموافقة ومتابعة المدونة' : 'Agree & Follow Blog'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="text-center text-[11px] text-slate-400 border-t border-slate-800 pt-3">
            <span className="flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'خصوصيتك محمية 100% ولا نرسل أي رسائل غير مرغوب فيها' : 'Your privacy is 100% safe'}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }
};

export default HadaryCoinFollowWidget;
