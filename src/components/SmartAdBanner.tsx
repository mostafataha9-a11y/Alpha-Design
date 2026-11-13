import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Sparkles, ShieldCheck, Tag } from 'lucide-react';
import { SmartAdConfig, AdPlacementId } from '../types/blog';

interface SmartAdBannerProps {
  config?: SmartAdConfig;
  placement: AdPlacementId;
  isAr?: boolean;
  className?: string;
}

export const SmartAdBanner: React.FC<SmartAdBannerProps> = ({
  config,
  placement,
  isAr = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [hasRenderError, setHasRenderError] = useState(false);

  // Real Ad Impression Tracking (fires once per mount when ad slot is active)
  useEffect(() => {
    if (!config || !config.enabled) return;
    try {
      fetch('/api/db/analytics/ad-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placement, type: 'impression' }),
      }).catch(() => {});
    } catch {
      // Quiet
    }
  }, [placement, config?.enabled]);

  const handleAdClick = () => {
    try {
      fetch('/api/db/analytics/ad-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placement, type: 'click' }),
      }).catch(() => {});
    } catch {
      // Quiet
    }
  };

  // Measure container for AI responsive scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.round(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // If slot is missing or disabled, do not render
  if (!config || !config.enabled) {
    return null;
  }

  // Determine styling based on placement
  const placementStyles: Record<AdPlacementId, { wrapper: string; bannerMaxH: string; defaultH: number }> = {
    header: {
      wrapper: 'w-full max-w-7xl mx-auto my-3 px-3 sm:px-4',
      bannerMaxH: 'max-h-[110px] sm:max-h-[120px]',
      defaultH: 90,
    },
    sidebar: {
      wrapper: 'w-full my-4',
      bannerMaxH: 'max-h-[380px]',
      defaultH: 320,
    },
    articleTop: {
      wrapper: 'w-full my-5',
      bannerMaxH: 'max-h-[140px]',
      defaultH: 110,
    },
    articleMiddle: {
      wrapper: 'w-full my-8 p-3 rounded-2xl bg-gradient-to-r from-blue-50/50 via-slate-50 to-indigo-50/50 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-indigo-950/40 border border-blue-100 dark:border-slate-800',
      bannerMaxH: 'max-h-[180px]',
      defaultH: 140,
    },
    articleBottom: {
      wrapper: 'w-full my-6',
      bannerMaxH: 'max-h-[160px]',
      defaultH: 130,
    },
  };

  const currentPlacementStyle = placementStyles[placement] || placementStyles.header;
  const maxHeightPx = config.maxHeight || currentPlacementStyle.defaultH;
  const adCodeRef = useRef<HTMLDivElement>(null);

  // Dynamic script execution for AdSense and custom HTML/JS ad codes
  useEffect(() => {
    if (config.type !== 'code' || !config.code || !adCodeRef.current) return;

    const container = adCodeRef.current;
    container.innerHTML = '';

    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = `ai-ad-slot-wrapper-${placement} w-full flex justify-center items-center overflow-hidden`;
    if (config.aiAutoFit) {
      wrapper.style.maxWidth = '100%';
      wrapper.style.margin = '0 auto';
    }

    // Parse HTML string safely
    const parser = new DOMParser();
    const doc = parser.parseFromString(config.code, 'text/html');

    // Extract non-script nodes and scripts
    const nonScripts: Node[] = [];
    const scripts: HTMLScriptElement[] = [];

    Array.from(doc.body.childNodes).forEach((node) => {
      if (node.nodeName.toLowerCase() === 'script') {
        scripts.push(node as HTMLScriptElement);
      } else {
        nonScripts.push(node.cloneNode(true));
      }
    });

    // Append non-script DOM nodes
    nonScripts.forEach((n) => wrapper.appendChild(n));
    container.appendChild(wrapper);

    // Dynamically execute scripts in order
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      container.appendChild(newScript);
    });

    // Safely trigger AdSense push if ins.adsbygoogle is present
    if (config.code.includes('adsbygoogle') && typeof window !== 'undefined') {
      try {
        const insElement = container.querySelector('ins.adsbygoogle');
        if (insElement && !insElement.getAttribute('data-adsbygoogle-status')) {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        }
      } catch (err) {
        console.debug('AdSense push caught safely:', err);
      }
    }
  }, [config.code, config.type, config.aiAutoFit, placement]);

  // Process and sanitize AI-adapted code if code type
  const renderCodeSnippet = () => {
    if (!config.code || config.code.trim() === '') {
      return (
        <div className="w-full py-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <span>{isAr ? 'لم يتم إدخال كود إعلاني لهذا الموضع بعد. أدخل شفرة AdSense في لوحة التحكم.' : 'No ad code configured for this placement.'}</span>
        </div>
      );
    }

    return (
      <div
        ref={adCodeRef}
        className="w-full flex justify-center items-center overflow-hidden min-h-[50px]"
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative group ${currentPlacementStyle.wrapper} ${className}`}
      data-ad-placement={placement}
      data-ad-autofit={config.aiAutoFit ? 'true' : 'false'}
    >
      {/* Container Card */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-400/50">
        
        {/* Subtle Top Metadata Bar (Badge + Sponsor Name + AI Auto-Fit Indicator) */}
        <div className="px-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 select-none">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-[10px] border border-blue-200/50 dark:border-blue-800">
              <Tag className="w-2.5 h-2.5" />
              {config.badgeText || (isAr ? 'إعلان ممول' : 'Sponsored')}
            </span>
            {config.sponsorName && (
              <span className="truncate max-w-[200px] text-slate-700 dark:text-slate-300 font-semibold">
                {config.sponsorName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {config.aiAutoFit && (
              <span
                className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-mono"
                title={isAr ? 'الأبعاد مضبوطة تلقائياً بالذكاء الاصطناعي لمنع التمدد أو التشوه' : 'Auto-adapted by AI engine'}
              >
                <Sparkles className="w-2.5 h-2.5" />
                {isAr ? 'تهيئة ذكية' : 'AI Auto-Fit'}
              </span>
            )}
            {config.targetUrl && (
              <a
                href={config.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleAdClick}
                className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline text-[10px]"
              >
                <span>{isAr ? 'زيارة الرابط' : 'Visit'}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>

        {/* Ad Content Rendering */}
        <div className="p-2 sm:p-3 flex items-center justify-center min-h-[70px] bg-slate-50/50 dark:bg-slate-950/40">
          {config.type === 'code' && config.code ? (
            renderCodeSnippet()
          ) : config.imageUrl ? (
            <a
              href={config.targetUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleAdClick}
              className="relative block w-full overflow-hidden rounded-xl group/link"
              style={{
                maxHeight: `${maxHeightPx}px`,
              }}
            >
              <img
                src={config.imageUrl}
                alt={config.altText || config.sponsorName || 'Banner Ad'}
                onError={() => setHasRenderError(true)}
                className={`w-full ${currentPlacementStyle.bannerMaxH} ${
                  config.aiAutoFit
                    ? 'object-contain sm:object-cover'
                    : 'object-contain'
                } rounded-xl transition-transform duration-500 group-hover/link:scale-[1.015] mx-auto`}
                style={{
                  maxHeight: `${maxHeightPx}px`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/link:opacity-100 transition-opacity flex items-end p-2 pointer-events-none">
                <span className="text-white text-xs font-bold flex items-center gap-1 drop-shadow-md">
                  <span>{isAr ? 'اضغط للمشاهدة والتواصل' : 'Click to view & connect'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </div>
            </a>
          ) : (
            /* Fallback tasteful sponsor invitation */
            <div className="w-full py-3 px-4 sm:py-4 sm:px-6 text-center rounded-xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-violet-600/10 border border-blue-200/60 dark:border-blue-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-start space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>{isAr ? 'مساحة إعلانية معتمدة ومضمونة' : 'Certified Sponsor Placement'}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {isAr
                    ? 'أعلن عن علامتك التجارية في أكبر منصة ديكورات وتشطيبات معمارية'
                    : 'Showcase your brand to thousands of luxury interior decor enthusiasts'}
                </p>
              </div>
              <a
                href="https://wa.me/201098765432?text=مرحباً+باشمهندس+الحضرى+أرغب+في+حجز+مساحة+إعلانية+في+المدونة"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleAdClick}
                className="shrink-0 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center gap-1.5"
              >
                <span>{isAr ? 'احجز هذا الإعلان الآن' : 'Book This Ad'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
