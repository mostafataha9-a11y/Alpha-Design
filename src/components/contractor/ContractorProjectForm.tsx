import React from 'react';

interface ContractorProjectFormProps {
  newProject: {
    client: string;
    name: string;
    address: string;
    date: string;
    agreed: number | '';
    notes: string;
  };
  setNewProject: (val: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ContractorProjectForm: React.FC<ContractorProjectFormProps> = ({
  newProject,
  setNewProject,
  onSubmit,
}) => {
  return (
    <section className="p-5 sm:p-6 rounded-2xl bg-white text-slate-900 shadow-xl border border-slate-200 space-y-4">
      <div className="flex items-center justify-between border-b-2 border-blue-500 pb-2.5">
        <h2 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2">
          <span>➕ إنشاء مشروع / صفحة حساب جديدة لعملية مقاولات</span>
        </h2>
        <span className="text-xs text-slate-500">حفظ تلقائي ودائم على جهازك</span>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">اسم العميل *</label>
            <input
              type="text"
              required
              placeholder="مثال: أحمد محمد"
              value={newProject.client}
              onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
              className="w-full p-2.5 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none text-xs sm:text-sm font-semibold text-slate-900 bg-slate-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">اسم المشروع / الشقة</label>
            <input
              type="text"
              placeholder="مثال: شقة 3 - فيلا الشيخ زايد"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              className="w-full p-2.5 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none text-xs sm:text-sm font-semibold text-slate-900 bg-slate-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">العنوان / المكان</label>
            <input
              type="text"
              placeholder="مثال: المعادي - شارع 9"
              value={newProject.address}
              onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
              className="w-full p-2.5 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none text-xs sm:text-sm font-semibold text-slate-900 bg-slate-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">تاريخ بدء المشروع</label>
            <input
              type="date"
              value={newProject.date}
              onChange={(e) => setNewProject({ ...newProject, date: e.target.value })}
              className="w-full p-2.5 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none text-xs sm:text-sm font-semibold text-slate-900 bg-slate-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">المبلغ المتفق عليه الإجمالي (ج.م) *</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="0.00"
              value={newProject.agreed}
              onChange={(e) =>
                setNewProject({ ...newProject, agreed: e.target.value === '' ? '' : Number(e.target.value) })
              }
              className="w-full p-2.5 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none text-xs sm:text-sm font-bold text-blue-700 bg-slate-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">ملاحظات الاتفاق</label>
            <input
              type="text"
              placeholder="أي تفاصيل أو شروط خاصة"
              value={newProject.notes}
              onChange={(e) => setNewProject({ ...newProject, notes: e.target.value })}
              className="w-full p-2.5 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none text-xs sm:text-sm font-semibold text-slate-900 bg-slate-50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <span>💾 إنشاء صفحة حساب جديدة وإظهار الجداول</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setNewProject({
                client: '',
                name: '',
                address: '',
                date: new Date().toISOString().split('T')[0],
                agreed: '',
                notes: '',
              })
            }
            className="py-3 px-5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
          >
            مسح الحقول
          </button>
        </div>
      </form>
    </section>
  );
};
