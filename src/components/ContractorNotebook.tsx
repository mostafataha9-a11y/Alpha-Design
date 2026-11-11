import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Lock,
  Maximize2,
  Minimize2,
  Sparkles,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { AdminUser, SiteSettings } from '../types/blog';
import { fetchWithAuth } from '../utils/apiAuth';
import {
  ProjectAccount,
  INITIAL_SAMPLE_PROJECTS,
  STORAGE_KEY,
  fmtEN,
  calculateProject,
} from './contractor/contractorTypes';
import { exportProjectAsPDF, printProjectInBrowser } from './contractor/ContractorPrintPdf';
import { ContractorAuditModal } from './contractor/ContractorAuditModal';
import { ContractorProjectForm } from './contractor/ContractorProjectForm';
import { ContractorProjectCard } from './contractor/ContractorProjectCard';

interface ContractorNotebookProps {
  currentUser?: AdminUser | null;
  settings: SiteSettings;
}

export const ContractorNotebook: React.FC<ContractorNotebookProps> = ({
  currentUser,
  settings,
}) => {
  const isOwner = currentUser?.role === 'owner';
  const isAr = true;

  const [projects, setProjects] = useState<ProjectAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse projects from localStorage:', e);
    }
    return INITIAL_SAMPLE_PROJECTS;
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [newProject, setNewProject] = useState({
    client: '',
    name: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    agreed: '' as number | '',
    notes: '',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'warning' | 'error'>('success');

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');

  const [isAuditing, setIsAuditing] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditError, setAuditError] = useState('');

  // Fetch projects from Cloud SQL on mount
  useEffect(() => {
    fetchWithAuth('/api/db/contractor-projects')
      .then((res) => res.json())
      .then((dbData) => {
        if (Array.isArray(dbData) && dbData.length > 0) {
          const mapped: ProjectAccount[] = dbData.map((d: any) => ({
            id: d.id,
            client: d.client || '',
            name: d.name || '',
            address: d.address || '',
            date: d.updatedAt ? new Date(d.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            agreed: d.agreedPrice || 0,
            notes: d.items?.notes || '',
            payments: d.items?.payments || [],
            labor: d.items?.labor || [],
            daily: d.items?.daily || [],
            expenses: d.items?.expenses || [],
            createdAt: d.updatedAt ? new Date(d.updatedAt).getTime() : Date.now(),
          }));
          setProjects(mapped);
        }
      })
      .catch((err) => console.warn('Could not load projects from Cloud SQL:', err));
  }, []);

  // Save to localStorage & Cloud SQL whenever projects change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to localStorage:', e);
    }
  }, [projects]);

  const showToast = (msg: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!isOwner) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 max-w-xl mx-auto shadow-2xl animate-in fade-in">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
          <EyeOff className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-white">
          {isAr ? 'صفحة سرية ومحمية تماماً' : 'Restricted Confidential Section'}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          {isAr
            ? 'هذه المفكرة مخصصة حصرياً لصاحب الموقع (الحضرى محمود). لا يمكن للمشرفين أو الزوار أو أي شخص سواك رؤيتها أو الدخول إليها.'
            : 'This notebook is restricted exclusively to the Site Owner. Supervisors, visitors, and unauthorized staff cannot access it.'}
        </p>
      </div>
    );
  }

  const globalSummary = projects.reduce(
    (acc, p) => {
      const c = calculateProject(p);
      acc.agreed += c.agreed;
      acc.paid += c.totalPaid;
      acc.labor += c.totalLabor;
      acc.daily += c.totalDaily;
      acc.expenses += c.totalExpenses;
      acc.costs += c.totalCosts;
      acc.netProfit += c.netProfit;
      acc.remaining += c.remaining;
      return acc;
    },
    { agreed: 0, paid: 0, labor: 0, daily: 0, expenses: 0, costs: 0, netProfit: 0, remaining: 0 }
  );

  const handleCreateProject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const client = newProject.client.trim();
    const agreed = Number(newProject.agreed);

    if (!client) {
      showToast('⚠️ يرجى إدخال اسم العميل', 'warning');
      return;
    }
    if (!agreed || agreed <= 0) {
      showToast('⚠️ يرجى إدخال المبلغ المتفق عليه الإجمالي', 'warning');
      return;
    }

    const created: ProjectAccount = {
      id: 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      client,
      name: newProject.name.trim() || `مشروع ${client}`,
      address: newProject.address.trim(),
      date: newProject.date || new Date().toISOString().split('T')[0],
      agreed,
      notes: newProject.notes.trim(),
      payments: [],
      labor: [],
      daily: [],
      expenses: [],
      createdAt: Date.now(),
    };

    setProjects((prev) => [created, ...prev]);

    fetchWithAuth('/api/db/contractor-projects', {
      method: 'POST',
      body: JSON.stringify({
        id: created.id,
        name: created.name,
        client: created.client,
        address: created.address,
        agreedPrice: agreed,
        totalPaid: 0,
        items: {
          payments: [],
          labor: [],
          daily: [],
          expenses: [],
          notes: created.notes,
        },
      }),
    }).catch((err) => console.warn('Failed to save new project to Cloud SQL:', err));

    setNewProject({
      client: '',
      name: '',
      address: '',
      date: new Date().toISOString().split('T')[0],
      agreed: '',
      notes: '',
    });

    showToast('✅ تم إنشاء صفحة الحساب بنجاح، وظهر جدول العملية بالأسفل!', 'success');
  };

  const handleAddRow = (projectId: string, table: 'payments' | 'labor' | 'daily' | 'expenses') => {
    const today = new Date().toISOString().split('T')[0];
    const newId = 'row_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        if (table === 'payments') {
          return { ...p, payments: [...(p.payments || []), { id: newId, date: today, desc: '', amount: '', method: 'نقدي' }] };
        }
        if (table === 'labor') {
          return { ...p, labor: [...(p.labor || []), { id: newId, date: today, name: '', work: '', amount: '' }] };
        }
        if (table === 'daily') {
          return { ...p, daily: [...(p.daily || []), { id: newId, date: today, desc: '', amount: '' }] };
        }
        if (table === 'expenses') {
          return { ...p, expenses: [...(p.expenses || []), { id: newId, date: today, desc: '', amount: '' }] };
        }
        return p;
      })
    );
  };

  const handleUpdateRowField = (
    projectId: string,
    table: 'payments' | 'labor' | 'daily' | 'expenses',
    rowId: string,
    field: string,
    val: any
  ) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const rows = (p[table] || []) as any[];
        const updated = rows.map((r) => {
          if (r.id !== rowId) return r;
          if (field === 'amount') {
            const num = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
            return { ...r, [field]: num };
          }
          return { ...r, [field]: val };
        });
        return { ...p, [table]: updated };
      })
    );
  };

  const handleDeleteRow = (projectId: string, table: 'payments' | 'labor' | 'daily' | 'expenses', rowId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          [table]: (p[table] as any[]).filter((r) => r.id !== rowId),
        };
      })
    );
    showToast('🗑️ تم حذف الصف', 'success');
  };

  const handleDuplicateProject = (projectId: string) => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;

    const cloned: ProjectAccount = {
      ...JSON.parse(JSON.stringify(p)),
      id: 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: (p.name || '') + ' (نسخة مكررة)',
      createdAt: Date.now(),
      payments: (p.payments || []).map((r: any) => ({ ...r, id: 'row_' + Math.random().toString(36).slice(2, 7) })),
      labor: (p.labor || []).map((r: any) => ({ ...r, id: 'row_' + Math.random().toString(36).slice(2, 7) })),
      daily: (p.daily || []).map((r: any) => ({ ...r, id: 'row_' + Math.random().toString(36).slice(2, 7) })),
      expenses: (p.expenses || []).map((r: any) => ({ ...r, id: 'row_' + Math.random().toString(36).slice(2, 7) })),
    };

    const idx = projects.findIndex((x) => x.id === projectId);
    const updated = [...projects];
    updated.splice(idx + 1, 0, cloned);
    setProjects(updated);
    showToast('📋 تم تكرار صفحة العملية بنفس الحسابات بنجاح!', 'success');
  };

  const handleUpdateProjectField = (
    projectId: string,
    field: keyof ProjectAccount,
    val: any
  ) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        if (field === 'agreed') {
          const num = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
          return { ...p, agreed: num };
        }
        return { ...p, [field]: val };
      })
    );
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    fetchWithAuth(`/api/db/contractor-projects/${projectId}`, { method: 'DELETE' }).catch((err) =>
      console.warn('Failed to delete project from Cloud SQL:', err)
    );
    showToast('🗑️ تم حذف الحساب بالكامل بنجاح!', 'success');
  };

  const handleExportPDF = (project: ProjectAccount) => {
    setIsExportingPdf(true);
    exportProjectAsPDF(project, setPdfProgressText, showToast).finally(() => {
      setIsExportingPdf(false);
    });
  };

  const handlePrintProject = (project: ProjectAccount) => {
    printProjectInBrowser(project, showToast);
  };

  const handleRunAiAudit = async () => {
    setIsAuditing(true);
    setAuditError('');
    setShowAuditModal(true);

    try {
      if (projects.length === 0) {
        setAuditError('لا توجد أي مشاريع مسجلة حالياً لفحصها.');
        setIsAuditing(false);
        return;
      }

      const res = await fetch('/api/ai/audit-contractor-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects }),
      });

      if (!res.ok) throw new Error('Audit request failed');

      const data = await res.json();
      setAuditResult(data);
    } catch (err) {
      console.error('AI audit error:', err);
      setAuditError('تعذر الاتصال بخدمة التدقيق بالذكاء الاصطناعي، يرجى المحاولة لاحقاً.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleApplyAiCorrections = () => {
    if (!auditResult?.auditedProjects) return;
    setProjects(auditResult.auditedProjects);
    setShowAuditModal(false);
    showToast('✅ تم اعتماد وتطبيق الحسابات المصححة بالذكاء الاصطناعي بنجاح!', 'success');
  };

  return (
    <div
      className={`relative min-h-[90vh] rounded-3xl p-3 sm:p-6 transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[99999] bg-[#0f1724] overflow-y-auto'
          : 'bg-[#0f1724] border border-slate-800 shadow-2xl'
      }`}
      style={{ fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif", color: '#ffffff' }}
    >
      <div className="relative z-10 max-w-6xl mx-auto space-y-6">
        {/* Top Control Header */}
        <header className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-500/30 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-white">
                  🎨 الفا ديزين للدهانات — حضرى
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  خاص بصاحب الموقع فقط
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/40 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                  مدعوم بالذكاء الاصطناعي
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                نظام إدارة حسابات مقاولات الدهانات — تسجيل الدفعات والمصنعيات واليوميات والمصروفات مع حفظ دائم وتصدير PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
            <button
              type="button"
              onClick={handleRunAiAudit}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer ring-2 ring-purple-400/30"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>فحص وتصحيح الحسابات بالذكاء الاصطناعي</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Global Summary Card */}
        {projects.length > 0 && (
          <section className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>📊 الملخص العام الكلي لجميع العمليات والمشاريع</span>
              </h2>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {projects.length} مشاريع مسجلة
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="p-3 rounded-xl bg-slate-800/80 border-r-4 border-blue-500 text-center">
                <span className="text-[11px] text-slate-400 block mb-1">إجمالي التعاقدات</span>
                <span className="text-sm font-black text-white">{fmtEN(globalSummary.agreed)} ج.م</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border-r-4 border-emerald-500 text-center">
                <span className="text-[11px] text-emerald-400 block mb-1">إجمالي المحصّل</span>
                <span className="text-sm font-black text-emerald-400">{fmtEN(globalSummary.paid)} ج.م</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border-r-4 border-amber-500 text-center">
                <span className="text-[11px] text-amber-400 block mb-1">إجمالي المصنعيات</span>
                <span className="text-sm font-black text-amber-400">{fmtEN(globalSummary.labor)} ج.م</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border-r-4 border-purple-500 text-center">
                <span className="text-[11px] text-purple-400 block mb-1">إجمالي اليوميات</span>
                <span className="text-sm font-black text-purple-400">{fmtEN(globalSummary.daily)} ج.م</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border-r-4 border-rose-500 text-center">
                <span className="text-[11px] text-rose-400 block mb-1">إجمالي المصروفات</span>
                <span className="text-sm font-black text-rose-400">{fmtEN(globalSummary.expenses)} ج.م</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border-r-4 border-emerald-400 text-center">
                <span className="text-[11px] text-emerald-300 block mb-1">صافي الربح الكلي</span>
                <span className={`text-sm font-black ${globalSummary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {fmtEN(globalSummary.netProfit)} ج.م
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border-r-4 border-rose-600 text-center col-span-2 sm:col-span-1">
                <span className="text-[11px] text-rose-400 block mb-1">المتبقي على العملاء</span>
                <span className="text-sm font-black text-rose-400">{fmtEN(globalSummary.remaining)} ج.م</span>
              </div>
            </div>
          </section>
        )}

        {/* Create Project Form */}
        <ContractorProjectForm
          newProject={newProject}
          setNewProject={setNewProject}
          onSubmit={handleCreateProject}
        />

        {/* Projects Cards List */}
        <div className="space-y-8">
          {projects.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 rounded-3xl border border-slate-800 text-slate-400 space-y-2">
              <Calculator className="w-12 h-12 mx-auto text-slate-600" />
              <p className="font-bold text-sm">لا توجد عمليات مسجلة حالياً.</p>
              <p className="text-xs">استخدم النموذج بالأعلى لإنشاء أول صفحة حساب مقاولات.</p>
            </div>
          ) : (
            projects.map((project, idx) => (
              <ContractorProjectCard
                key={project.id}
                project={project}
                index={idx}
                isExportingPdf={isExportingPdf}
                onExportPDF={handleExportPDF}
                onPrint={handlePrintProject}
                onDuplicate={handleDuplicateProject}
                onDeleteProject={handleDeleteProject}
                onUpdateField={handleUpdateProjectField}
                onUpdateRow={handleUpdateRowField}
                onAddRow={handleAddRow}
                onDeleteRow={handleDeleteRow}
                onToast={showToast}
              />
            ))
          )}
        </div>

        <footer className="text-center text-xs text-slate-400 pt-4 border-t border-slate-800">
          © حضرى للدهانات — جميع الحسابات والجداول والعمليات محفوظة على جهازك تلقائياً وبشكل دائم حتى بعد إغلاق المتصفح.
        </footer>
      </div>

      {/* PDF Export Overlay */}
      {isExportingPdf && (
        <div className="fixed inset-0 z-[9999999] bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-white p-6 shadow-2xl animate-in fade-in">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <div className="text-center space-y-1">
            <p className="text-base sm:text-lg font-black text-white">{pdfProgressText}</p>
            <p className="text-xs text-slate-400 font-semibold">يتم الحفاظ على كامل الجداول، الألوان، والتنسيقات الرسمية</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100000] px-5 py-3 rounded-full text-xs sm:text-sm font-bold shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom flex items-center gap-2 ${
            toastType === 'success'
              ? 'bg-emerald-600 text-white'
              : toastType === 'warning'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-rose-600 text-white'
          }`}
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* AI Calculation Audit Modal */}
      <ContractorAuditModal
        isOpen={showAuditModal}
        isAuditing={isAuditing}
        auditError={auditError}
        auditResult={auditResult}
        onClose={() => setShowAuditModal(false)}
        onApplyCorrections={handleApplyAiCorrections}
      />
    </div>
  );
};
