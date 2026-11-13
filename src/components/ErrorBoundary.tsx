import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  isRtl?: boolean;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorId = 'ERR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    // Sanitize and log error without exposing API keys, cookies, or user tokens
    try {
      const rawMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : String(error ?? 'Unknown error');
      const sanitizedMsg = rawMessage.replace(/([a-zA-Z0-9_-]{20,})/g, '[REDACTED]');
      console.error(`[Alpha ErrorBoundary ${this.state.errorId}] Sanitized caught error:`, sanitizedMsg, {
        componentStack: errorInfo?.componentStack?.slice(0, 500),
      });
    } catch {
      // Never allow logging inside ErrorBoundary to throw
    }
  }

  handleRetry = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({
      hasError: false,
      error: null,
      errorId: '',
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isRtl = this.props.isRtl !== false;
      return (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className="my-8 mx-auto max-w-2xl p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95"
        >
          {/* Visual Alert Icon */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {this.props.fallbackTitle ||
                (isRtl
                  ? 'تعذر عرض هذا القسم مؤقتاً'
                  : 'This section encountered a temporary issue')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
              {this.props.fallbackMessage ||
                (isRtl
                  ? 'حدث استثناء غير متوقع أثناء المعالجة، تم احتواء المشكلة بنجاح وباقي أجزاء مدونة ألفا للديكور تعمل بصورة طبيعية ومستقرة.'
                  : 'An unexpected issue occurred while rendering. The rest of the site remains unaffected and secure.')}
            </p>
          </div>

          {/* Reference ID Pill (Safe) */}
          {this.state.errorId && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {isRtl ? 'رمز التتبع الفني:' : 'Ref:'} {this.state.errorId}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isRtl ? 'إعادة المحاولة' : 'Try Again'}</span>
            </button>

            <button
              type="button"
              onClick={this.handleReload}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>{isRtl ? 'تحديث الصفحة بالكامل' : 'Reload Page'}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
