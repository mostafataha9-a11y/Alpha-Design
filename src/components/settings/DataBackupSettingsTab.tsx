import React from 'react';
import { Database, Download, Upload, RotateCcw } from 'lucide-react';
import { SiteSettings, Article } from '../../types/blog';
import { INITIAL_SETTINGS } from '../../data/initialData';

interface DataBackupSettingsTabProps {
  formData: SiteSettings;
  setFormData: React.Dispatch<React.SetStateAction<SiteSettings>>;
  articles: Article[];
  onSaveSettings: (newSettings: SiteSettings) => void;
  onImportArticles: (articles: Article[]) => void;
  onResetData: () => void;
  setImportNotification: (val: { type: 'success' | 'error'; message: string } | null) => void;
  isAr: boolean;
}

export const DataBackupSettingsTab: React.FC<DataBackupSettingsTabProps> = ({
  formData,
  setFormData,
  articles,
  onSaveSettings,
  onImportArticles,
  onResetData,
  setImportNotification,
  isAr,
}) => {
  const handleExportData = () => {
    const dataToExport = {
      settings: formData,
      articles,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alpha-design-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.settings) {
          setFormData(json.settings);
          onSaveSettings(json.settings);
        }
        if (json.articles && Array.isArray(json.articles)) {
          onImportArticles(json.articles);
        }
        setImportNotification({
          type: 'success',
          message: isAr ? 'تم استيراد البيانات والإعدادات بنجاح!' : 'Data imported successfully!',
        });
        setTimeout(() => setImportNotification(null), 4000);
      } catch (err) {
        setImportNotification({
          type: 'error',
          message: isAr ? 'ملف غير صالح، يرجى اختيار ملف JSON صحيح.' : 'Invalid backup JSON file.',
        });
        setTimeout(() => setImportNotification(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 animate-in fade-in duration-200">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Database className="w-5 h-5 text-emerald-500" />
        <span>{isAr ? 'إدارة البيانات، النسخ الاحتياطي والاستعادة' : 'Data Management & Backup'}</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={handleExportData}
          className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-start space-y-2 transition-colors cursor-pointer"
        >
          <Download className="w-6 h-6 text-blue-600" />
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            {isAr ? 'تصدير نسخة احتياطية' : 'Export Full Backup'}
          </h4>
          <p className="text-xs text-slate-500">
            {isAr ? 'تنزيل جميع المقالات والإعدادات كملف JSON محفوظ.' : 'Download articles and settings.'}
          </p>
        </button>

        <label className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-start space-y-2 transition-colors cursor-pointer">
          <Upload className="w-6 h-6 text-indigo-600" />
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            {isAr ? 'استيراد نسخة سابقة' : 'Restore from Backup'}
          </h4>
          <p className="text-xs text-slate-500">
            {isAr ? 'رفع ملف JSON تم تصديره مسبقاً.' : 'Upload JSON backup file.'}
          </p>
          <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
        </label>

        <button
          type="button"
          onClick={() => {
            if (confirm(isAr ? 'هل أنت متأكد من إعادة ضبط البيانات إلى النماذج الافتراضية؟' : 'Reset all data to defaults?')) {
              onResetData();
              setFormData(INITIAL_SETTINGS);
            }
          }}
          className="p-5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 border border-red-200 dark:border-red-900/50 text-start space-y-2 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-6 h-6 text-red-600" />
          <h4 className="font-bold text-sm text-red-900 dark:text-red-200">
            {isAr ? 'إعادة التعيين الافتراضي' : 'Reset to Defaults'}
          </h4>
          <p className="text-xs text-red-600/80">
            {isAr ? 'استعادة المقالات النموذجية الأصلية لألفا ديزاين.' : 'Restore seed sample articles.'}
          </p>
        </button>
      </div>
    </div>
  );
};
