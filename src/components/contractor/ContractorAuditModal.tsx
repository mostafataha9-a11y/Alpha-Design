import React from 'react';
import { Sparkles, X, CheckCircle2 } from 'lucide-react';

interface ContractorAuditModalProps {
  isOpen: boolean;
  isAuditing: boolean;
  auditError: string | null;
  auditResult: any;
  onClose: () => void;
  onApplyCorrections: () => void;
}

export const ContractorAuditModal: React.FC<ContractorAuditModalProps> = ({
  isOpen,
  isAuditing,
  auditError,
  auditResult,
  onClose,
  onApplyCorrections,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-slate-900 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h3 className="text-base sm:text-lg font-black text-slate-800">
              فحص وتدقيق الحسابات بالذكاء الاصطناعي
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isAuditing ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-600 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-800">
              جارِ فحص ومطابقة جميع الدفعات والمصنعيات وصافي الأرباح...
            </p>
          </div>
        ) : auditError ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-center text-xs font-bold">
            {auditError}
          </div>
        ) : auditResult ? (
          <div className="space-y-4">
            {auditResult.corrections && auditResult.corrections.length > 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
                <span className="font-bold block">⚠️ تم رصد بعض الفروقات وتم تصحيحها:</span>
                <ul className="list-disc list-inside space-y-1">
                  {auditResult.corrections.map((c: any, i: number) => (
                    <li key={i}>
                      مشروع «{c.projectName}»: {c.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>جميع العمليات الحسابية والجمعيات متطابقة وصحيحة 100%!</span>
              </div>
            )}

            {auditResult.aiAuditReport && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-700">تقرير الذكاء الاصطناعي وتوصيات الأرباح:</h4>
                <div className="p-4 rounded-xl bg-slate-50 border text-xs text-slate-700 leading-relaxed whitespace-pre-line max-h-56 overflow-y-auto">
                  {auditResult.aiAuditReport}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={onApplyCorrections}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                اعتماد وتطبيق الحسابات المصححة في الجداول
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
