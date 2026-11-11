import React, { useState } from 'react';
import {
  Edit3,
  Download,
  Printer,
  Copy,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Briefcase,
  User,
  MapPin,
  Calendar,
  Layers,
} from 'lucide-react';
import { ProjectAccount, fmtEN, calculateProject } from './contractorTypes';

interface ContractorProjectCardProps {
  project: ProjectAccount;
  index: number;
  isExportingPdf: boolean;
  onExportPDF: (project: ProjectAccount) => void;
  onPrint: (project: ProjectAccount) => void;
  onDuplicate: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateField: (projectId: string, field: keyof ProjectAccount, value: any) => void;
  onUpdateRow: (projectId: string, table: 'payments' | 'labor' | 'daily' | 'expenses', rowId: string, field: string, value: any) => void;
  onAddRow: (projectId: string, table: 'payments' | 'labor' | 'daily' | 'expenses') => void;
  onDeleteRow: (projectId: string, table: 'payments' | 'labor' | 'daily' | 'expenses', rowId: string) => void;
  onToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

export const ContractorProjectCard: React.FC<ContractorProjectCardProps> = ({
  project,
  index,
  isExportingPdf,
  onExportPDF,
  onPrint,
  onDuplicate,
  onDeleteProject,
  onUpdateField,
  onUpdateRow,
  onAddRow,
  onDeleteRow,
  onToast,
}) => {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const calc = calculateProject(project);

  return (
    <div className="rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-900 transition-all hover:border-blue-400">
      {/* Operation Card Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
              #{index + 1}
            </span>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              <span>{project.client}</span>
            </h3>
            {project.name && (
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-blue-300 text-xs font-bold border border-slate-700 flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-blue-400" />
                {project.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
            {project.address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {project.address}
              </span>
            )}
            {project.date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {project.date}
              </span>
            )}
            {project.notes && (
              <span className="flex items-center gap-1 text-slate-300">
                <Layers className="w-3 h-3 text-slate-400" />
                {project.notes}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {/* Contract Agreed Amount Quick Input */}
          <div className="px-3 py-1.5 rounded-xl bg-blue-600/90 border border-blue-400/40 text-white font-black text-xs shadow-md flex items-center gap-1.5">
            <span>المتفق عليه:</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={project.agreed}
              onChange={(e) => onUpdateField(project.id, 'agreed', e.target.value)}
              className="w-24 bg-blue-900/90 text-amber-300 font-black px-1.5 py-0.5 rounded border border-blue-400 text-center text-xs focus:outline-none focus:ring-1 focus:ring-amber-300"
            />
            <span>ج.م</span>
          </div>

          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              editing ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{editing ? 'إخفاء التعديل' : 'تعديل الحساب'}</span>
          </button>

          <button
            type="button"
            onClick={() => onExportPDF(project)}
            disabled={isExportingPdf}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تحميل PDF</span>
          </button>

          <button
            type="button"
            onClick={() => onPrint(project)}
            className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-amber-300" />
            <span>طباعة</span>
          </button>

          <button
            type="button"
            onClick={() => onDuplicate(project.id)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>تكرار</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmDelete(!confirmDelete)}
            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-red-900/40 transition-all cursor-pointer border border-red-400/50"
          >
            <Trash2 className="w-3.5 h-3.5 text-white" />
            <span>حذف الحساب</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Banner */}
      {confirmDelete && (
        <div className="p-4 bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white m-3 sm:m-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl border-2 border-white/40 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">هل أنت متأكد من حذف هذا الحساب نهائياً؟</h4>
              <p className="text-xs text-red-100">
                سيتم حذف حساب عملية «<strong className="text-amber-200 underline">{project.name || project.client}</strong>» بجميع جداول الدفعات والمصنعيات واليوميات والمصروفات.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <button
              type="button"
              onClick={() => {
                onDeleteProject(project.id);
                setConfirmDelete(false);
              }}
              className="px-4 py-2 rounded-xl bg-white text-red-700 hover:bg-red-50 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>نعم، احذف الحساب الآن نهائياً</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 rounded-xl bg-black/40 hover:bg-black/60 text-white font-bold text-xs transition-all cursor-pointer"
            >
              إلغاء ✕
            </button>
          </div>
        </div>
      )}

      {/* Inline Editing Panel */}
      {editing && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 m-3 sm:m-4 rounded-2xl space-y-4 shadow-sm animate-in fade-in text-slate-900">
          <div className="flex items-center justify-between border-b border-blue-200 pb-2">
            <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-blue-900">
              <Edit3 className="w-4 h-4 text-blue-600" />
              <span>تعديل بيانات العملية وقيم الحسابات والتعاقد</span>
            </div>
            <span className="text-[11px] text-blue-700 font-bold bg-blue-100 px-2.5 py-1 rounded-lg">
              يتم الحفظ وإعادة الحساب فوراً وتلقائياً
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">اسم العميل *</label>
              <input
                type="text"
                value={project.client}
                onChange={(e) => onUpdateField(project.id, 'client', e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">اسم المشروع / العملية</label>
              <input
                type="text"
                value={project.name}
                onChange={(e) => onUpdateField(project.id, 'name', e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-800">المبلغ المتفق عليه الإجمالي (ج.م) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={project.agreed}
                onChange={(e) => onUpdateField(project.id, 'agreed', e.target.value)}
                className="w-full p-2 rounded-lg border-2 border-blue-500 bg-white text-xs sm:text-sm font-black text-blue-700 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">العنوان / المكان</label>
              <input
                type="text"
                value={project.address}
                onChange={(e) => onUpdateField(project.id, 'address', e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">تاريخ بدء المشروع</label>
              <input
                type="date"
                value={project.date}
                onChange={(e) => onUpdateField(project.id, 'date', e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">ملاحظات الاتفاق</label>
              <input
                type="text"
                value={project.notes}
                onChange={(e) => onUpdateField(project.id, 'notes', e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                onToast('✅ تم حفظ تعديلات بيانات العملية والاتفاق', 'success');
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>تم وحفظ التعديلات ✓</span>
            </button>
          </div>
        </div>
      )}

      {/* Tables Body */}
      <div className="p-4 sm:p-6 space-y-6 bg-slate-50">
        {/* Table 1: الدفعات المستلمة */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="p-3 bg-gradient-to-r from-[#27ae60] to-[#1e8449] text-white flex items-center justify-between font-black text-xs sm:text-sm">
            <span>💵 الدفعات المستلمة من العميل</span>
            <span>إجمالي المحصّل: {fmtEN(calc.totalPaid)} ج.م</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-bold">
                  <th className="p-2 border border-slate-700 w-10">#</th>
                  <th className="p-2 border border-slate-700">التاريخ</th>
                  <th className="p-2 border border-slate-700">البيان / الوصف</th>
                  <th className="p-2 border border-slate-700">المبلغ (ج.م)</th>
                  <th className="p-2 border border-slate-700">طريقة الدفع</th>
                  <th className="p-2 border border-slate-700 w-12">حذف</th>
                </tr>
              </thead>
              <tbody>
                {project.payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-slate-400 italic">
                      لا توجد دفعات مسجلة بعد — اضغط "إضافة دفعة" بالأسفل
                    </td>
                  </tr>
                ) : (
                  project.payments.map((r, i) => (
                    <tr key={r.id} className="hover:bg-blue-50/50">
                      <td className="p-1.5 border border-slate-200 font-bold text-slate-500">{i + 1}</td>
                      <td className="p-1 border border-slate-200">
                        <input
                          type="date"
                          value={r.date}
                          onChange={(e) => onUpdateRow(project.id, 'payments', r.id, 'date', e.target.value)}
                          className="w-full p-1 text-center bg-white border border-slate-200 rounded"
                        />
                      </td>
                      <td className="p-1 border border-slate-200">
                        <input
                          type="text"
                          placeholder="مثال: دفعة أولى مقدم تعاقد..."
                          value={r.desc}
                          onChange={(e) => onUpdateRow(project.id, 'payments', r.id, 'desc', e.target.value)}
                          className="w-full p-1 text-right bg-white border border-slate-200 rounded"
                        />
                      </td>
                      <td className="p-1 border border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={r.amount}
                          onChange={(e) => onUpdateRow(project.id, 'payments', r.id, 'amount', e.target.value)}
                          className="w-full p-1 text-center font-bold text-emerald-700 bg-white border border-slate-200 rounded"
                        />
                      </td>
                      <td className="p-1 border border-slate-200">
                        <select
                          value={r.method}
                          onChange={(e) => onUpdateRow(project.id, 'payments', r.id, 'method', e.target.value)}
                          className="w-full p-1 text-center bg-white border border-slate-200 rounded"
                        >
                          <option value="نقدي">نقدي</option>
                          <option value="تحويل بنكي">تحويل بنكي</option>
                          <option value="فودافون كاش">فودافون كاش</option>
                          <option value="شيك">شيك</option>
                          <option value="أخرى">أخرى</option>
                        </select>
                      </td>
                      <td className="p-1 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => onDeleteRow(project.id, 'payments', r.id)}
                          className="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50 font-black text-slate-800">
                  <td colSpan={3} className="p-2.5 text-right border border-emerald-200">إجمالي الدفعات المستلمة:</td>
                  <td className="p-2.5 text-center text-emerald-700 text-sm border border-emerald-200">{fmtEN(calc.totalPaid)} ج.م</td>
                  <td colSpan={2} className="border border-emerald-200"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-2 bg-slate-50 border-t border-slate-200">
            <button
              type="button"
              onClick={() => onAddRow(project.id, 'payments')}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة دفعة جديدة</span>
            </button>
          </div>
        </div>

        {/* Table 2: المصنعيات */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="p-3 bg-gradient-to-r from-[#e67e22] to-[#d35400] text-white flex items-center justify-between font-black text-xs sm:text-sm">
            <span>👷 أجور المصنعيات والصنايعية</span>
            <span>إجمالي المصنعيات: {fmtEN(calc.totalLabor)} ج.م</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-bold">
                  <th className="p-2 border border-slate-700 w-10">#</th>
                  <th className="p-2 border border-slate-700">التاريخ</th>
                  <th className="p-2 border border-slate-700">اسم الصنايعي</th>
                  <th className="p-2 border border-slate-700">نوع العمل</th>
                  <th className="p-2 border border-slate-700">المبلغ (ج.م)</th>
                  <th className="p-2 border border-slate-700 w-12">حذف</th>
                </tr>
              </thead>
              <tbody>
                {project.labor.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-slate-400 italic">
                      لا توجد مصنعيات مسجلة بعد — اضغط "إضافة مصنعية" بالأسفل
                    </td>
                  </tr>
                ) : (
                  project.labor.map((r, i) => (
                    <tr key={r.id} className="hover:bg-amber-50/50">
                      <td className="p-1.5 border border-slate-200 font-bold text-slate-500">{i + 1}</td>
                      <td className="p-1 border border-slate-200">
                        <input
                          type="date"
                          value={r.date}
                          onChange={(e) => onUpdateRow(project.id, 'labor', r.id, 'date', e.target.value)}
                          className="w-full p-1 text-center bg-white border border-slate-200 rounded"
                        />
                      </td>
                      <td className="p-1 border border-slate-200">
                        <input
                          type="text"
                          placeholder="مثال: الأسطى حسن..."
                          value={r.name}
                          onChange={(e) => onUpdateRow(project.id, 'labor', r.id, 'name', e.target.value)}
                          className="w-full p-1 text-right bg-white border border-slate-200 rounded font-bold"
                        />
                      </td>
                      <td className="p-1 border border-slate-200">
                        <input
                          type="text"
                          placeholder="مثال: تأسيس معجون وصنفرة..."
                          value={r.work}
                          onChange={(e) => onUpdateRow(project.id, 'labor', r.id, 'work', e.target.value)}
                          className="w-full p-1 text-right bg-white border border-slate-200 rounded"
                        />
                      </td>
                      <td className="p-1 border border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={r.amount}
                          onChange={(e) => onUpdateRow(project.id, 'labor', r.id, 'amount', e.target.value)}
                          className="w-full p-1 text-center font-bold text-amber-700 bg-white border border-slate-200 rounded"
                        />
                      </td>
                      <td className="p-1 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => onDeleteRow(project.id, 'labor', r.id)}
                          className="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50 font-black text-slate-800">
                  <td colSpan={4} className="p-2.5 text-right border border-amber-200">إجمالي أجور المصنعيات:</td>
                  <td className="p-2.5 text-center text-amber-700 text-sm border border-amber-200">{fmtEN(calc.totalLabor)} ج.م</td>
                  <td className="border border-amber-200"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-2 bg-slate-50 border-t border-slate-200">
            <button
              type="button"
              onClick={() => onAddRow(project.id, 'labor')}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مصنعية / صنايعي</span>
            </button>
          </div>
        </div>

        {/* Table 3: اليوميات */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="p-3 bg-gradient-to-r from-[#8e44ad] to-[#6c3483] text-white flex items-center justify-between font-black text-xs sm:text-sm">
            <span>📅 اليوميات</span>
            <span>إجمالي اليوميات: {fmtEN(calc.totalDaily)} ج.م</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-bold">
                  <th className="p-2 border border-slate-700 w-10">#</th>
                  <th className="p-2 border border-slate-700">التاريخ</th>
                  <th className="p-2 border border-slate-700">البيان</th>
                  <th className="p-2 border border-slate-700">المبلغ (ج.م)</th>
                  <th className="p-2 border border-slate-700 w-12">حذف</th>
                </tr>
              </thead>
              <tbody>
                {project.daily.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-slate-400 italic">
                      لا توجد يوميات مسجلة بعد — اضغط "إضافة يومية" بالأسفل
                    </td>
                  </tr>
                ) : (
                  project.daily.map((r, i) => (
                    <tr key={r.id} className="hover:bg-purple-50/50">
                      <td className="p-1.5 border border-slate-200 font-bold text-slate-500">{i + 1}</td>
                      <td className="p-1 border border-slate-200">
                        <input
                          type="date"
                          value={r.date}
                          onChange={(e) => onUpdateRow(project.id, 'daily', r.id, 'date', e.target.value)}
                          className="w-full p-1 text-center bg-white border border-slate-200 rounded"
                        />
                      </td>
                      <td className="p-1 border border-slate-200">
                        <input
                          type="text"
                          placeholder="مثال: يومية عمال نقل وسقالات..."
                          value={r.desc}
                          onChange={(e) => onUpdateRow(project.id, 'daily', r.id, 'desc', e.target.value)}
                          className="w-full p-1 text-right bg-white border border-slate-200 rounded"
                        />
                      </td>
                      <td className="p-1 border border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={r.amount}
                          onChange={(e) => onUpdateRow(project.id, 'daily', r.id, 'amount', e.target.value)}
                          className="w-full p-1 text-center font-bold text-purple-700 bg-white border border-slate-200 rounded"
                        />
                      </td>
                      <td className="p-1 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => onDeleteRow(project.id, 'daily', r.id)}
                          className="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-purple-50 font-black text-slate-800">
                  <td colSpan={3} className="p-2.5 text-right border border-purple-200">إجمالي اليوميات:</td>
                  <td className="p-2.5 text-center text-purple-700 text-sm border border-purple-200">{fmtEN(calc.totalDaily)} ج.م</td>
                  <td className="border border-purple-200"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-2 bg-slate-50 border-t border-slate-200">
            <button
              type="button"
              onClick={() => onAddRow(project.id, 'daily')}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة يومية</span>
            </button>
          </div>
        </div>

        {/* Table 4: المصروفات والخامات */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="p-3 bg-gradient-to-r from-[#c0392b] to-[#922b21] text-white flex items-center justify-between font-black text-xs sm:text-sm">
            <span>🧾 المصروفات والخامات</span>
            <span>إجمالي المصروفات: {fmtEN(calc.totalExpenses)} ج.م</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-bold">
                  <th className="p-2 border border-slate-700 w-10">#</th>
                  <th className="p-2 border border-slate-700">التاريخ</th>
                  <th className="p-2 border border-slate-700">البيان / نوع المصروف</th>
                  <th className="p-2 border border-slate-700">المبلغ (ج.م)</th>
                  <th className="p-2 border border-slate-700 w-12">حذف</th>
                </tr>
              </thead>
              <tbody>
                {project.expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-slate-400 italic">
                      لا توجد مصروفات مسجلة بعد — اضغط "إضافة مصروف" بالأسفل
                    </td>
                  </tr>
                ) : (
                  project.expenses.map((r, i) => (
                    <tr key={r.id} className="hover:bg-rose-50/50">
                      <td className="p-1.5 border border-slate-200 font-bold text-slate-500">{i + 1}</td>
                      <td className="p-1 border border-slate-200">
                        <input
                          type="date"
                          value={r.date}
                          onChange={(e) => onUpdateRow(project.id, 'expenses', r.id, 'date', e.target.value)}
                          className="w-full p-1 text-center bg-white border border-slate-200 rounded"
                        />
                      </td>
                      <td className="p-1 border border-slate-200">
                        <input
                          type="text"
                          placeholder="مثال: شراء بويات معجون وبلاستيك..."
                          value={r.desc}
                          onChange={(e) => onUpdateRow(project.id, 'expenses', r.id, 'desc', e.target.value)}
                          className="w-full p-1 text-right bg-white border border-slate-200 rounded"
                        />
                      </td>
                      <td className="p-1 border border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={r.amount}
                          onChange={(e) => onUpdateRow(project.id, 'expenses', r.id, 'amount', e.target.value)}
                          className="w-full p-1 text-center font-bold text-rose-700 bg-white border border-slate-200 rounded"
                        />
                      </td>
                      <td className="p-1 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => onDeleteRow(project.id, 'expenses', r.id)}
                          className="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-rose-50 font-black text-slate-800">
                  <td colSpan={3} className="p-2.5 text-right border border-rose-200">إجمالي المصروفات والخامات:</td>
                  <td className="p-2.5 text-center text-rose-700 text-sm border border-rose-200">{fmtEN(calc.totalExpenses)} ج.م</td>
                  <td className="border border-rose-200"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-2 bg-slate-50 border-t border-slate-200">
            <button
              type="button"
              onClick={() => onAddRow(project.id, 'expenses')}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مصروف</span>
            </button>
          </div>
        </div>

        {/* Single Project Financial Summary Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span>📊 الملخص المالي لعملية: {project.client}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border-r-4 border-slate-400">
              <span className="text-[10px] text-slate-500 block mb-0.5">المتفق عليه</span>
              <span className="text-xs font-black text-slate-800">{fmtEN(calc.agreed)}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 border-r-4 border-emerald-500">
              <span className="text-[10px] text-emerald-700 block mb-0.5">المحصّل</span>
              <span className="text-xs font-black text-emerald-600">{fmtEN(calc.totalPaid)}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-50 border-r-4 border-rose-500">
              <span className="text-[10px] text-rose-700 block mb-0.5">المتبقي (دين)</span>
              <span className="text-xs font-black text-rose-600">{fmtEN(calc.remaining)}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border-r-4 border-amber-500">
              <span className="text-[10px] text-amber-700 block mb-0.5">المصنعيات</span>
              <span className="text-xs font-black text-amber-600">{fmtEN(calc.totalLabor)}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-50 border-r-4 border-purple-500">
              <span className="text-[10px] text-purple-700 block mb-0.5">اليوميات</span>
              <span className="text-xs font-black text-purple-600">{fmtEN(calc.totalDaily)}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-50 border-r-4 border-rose-400">
              <span className="text-[10px] text-rose-700 block mb-0.5">المصروفات</span>
              <span className="text-xs font-black text-rose-600">{fmtEN(calc.totalExpenses)}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-100/70 border-r-4 border-amber-600">
              <span className="text-[10px] text-amber-900 block mb-0.5">إجمالي التكاليف</span>
              <span className="text-xs font-black text-amber-800">{fmtEN(calc.totalCosts)}</span>
            </div>

            <div
              className={`p-2.5 rounded-xl border-r-4 ${
                calc.netProfit >= 0
                  ? 'bg-emerald-100/80 border-emerald-600 text-emerald-800'
                  : 'bg-rose-100 border-rose-600 text-rose-800'
              }`}
            >
              <span className="text-[10px] block mb-0.5">صافي الربح</span>
              <span className="text-xs font-black">{fmtEN(calc.netProfit)} ج.م</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
