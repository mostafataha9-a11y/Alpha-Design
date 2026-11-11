import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  ShieldCheck,
  Phone,
  MessageCircle,
  ExternalLink,
  Briefcase,
  Trash2,
  Clock,
} from 'lucide-react';
import { SiteSettings, ServicePricingItem } from '../../types/blog';

interface NegotiationSettingsTabProps {
  formData: SiteSettings;
  setFormData: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isAr: boolean;
}

export const NegotiationSettingsTab: React.FC<NegotiationSettingsTabProps> = ({
  formData,
  setFormData,
  isAr,
}) => {
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    nameEn: '',
    category: 'تصميم عام',
    description: '',
    basePrice: 200,
    minNegotiatedPrice: 150,
    currency: '$',
    deliveryDays: 5,
    unit: 'لكل مشروع',
    features: '',
  });

  const handleNegotiationFieldChange = (key: string, val: any) => {
    setFormData((prev) => ({
      ...prev,
      assistantNegotiation: {
        ...prev.assistantNegotiation,
        [key]: val,
      },
    }));
  };

  const handleUpdateService = (id: string, updates: Partial<ServicePricingItem>) => {
    setFormData((prev) => ({
      ...prev,
      assistantNegotiation: {
        ...prev.assistantNegotiation,
        services: prev.assistantNegotiation.services.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      },
    }));
  };

  const handleDeleteService = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      assistantNegotiation: {
        ...prev.assistantNegotiation,
        services: prev.assistantNegotiation.services.filter((s) => s.id !== id),
      },
    }));
  };

  const handleAddNewService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name.trim()) return;

    const created: ServicePricingItem = {
      id: 'service-' + Date.now(),
      name: newService.name,
      nameEn: newService.nameEn || newService.name,
      category: newService.category || 'تصميم',
      description: newService.description,
      basePrice: Number(newService.basePrice) || 100,
      minNegotiatedPrice: Number(newService.minNegotiatedPrice) || 80,
      currency: newService.currency || '$',
      deliveryDays: Number(newService.deliveryDays) || 3,
      unit: newService.unit || 'لكل مشروع',
      features: newService.features ? newService.features.split(',').map((f) => f.trim()) : [],
    };

    setFormData((prev) => ({
      ...prev,
      assistantNegotiation: {
        ...prev.assistantNegotiation,
        services: [...prev.assistantNegotiation.services, created],
      },
    }));

    setShowAddServiceModal(false);
    setNewService({
      name: '',
      nameEn: '',
      category: 'تصميم عام',
      description: '',
      basePrice: 200,
      minNegotiatedPrice: 150,
      currency: '$',
      deliveryDays: 5,
      unit: 'لكل مشروع',
      features: '',
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <DollarSign className="w-3.5 h-3.5" />
            <span>{isAr ? 'مساعد التفاوض والتحويل الآلي' : 'AI Sales Assistant & Handover'}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {isAr ? 'إعدادات أسعار العمل والتفاوض والتحويل لصاحب المدونة' : 'Work Pricing, Negotiation & Handover Settings'}
          </h2>
          <p className="text-xs text-slate-500">
            {isAr
              ? 'يتفاوض البوت مع الزوار بناءً على الأسعار التي تحددها هنا، وعند الوصول لاتفاق يتم تحويل العميل تلقائياً إلى واتسابك أو الاتصال بهاتفك.'
              : 'The AI negotiates work based on your set rates. Upon agreement, it automatically redirects visitors to your WhatsApp or direct phone call.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddServiceModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'إضافة خدمة عمل جديدة' : 'Add New Service'}</span>
        </button>
      </div>

      {/* Owner Direct Channels & Negotiation Strategy */}
      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-5">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{isAr ? 'قنوات اتصال وتحويل صاحب المدونة (الحضرى محمود)' : 'Owner Direct Contact & Handover Channels'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Owner Phone */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                {isAr ? 'رقم هاتف صاحب المدونة (للاتصال الهاتفي):' : 'Owner Phone Number:'}
              </span>
              <a
                href={`tel:${(formData.assistantNegotiation?.ownerPhone || '+201098765432').replace(/\s+/g, '')}`}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
              >
                <span>{isAr ? 'تجربة الاتصال' : 'Test Call'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="text"
              value={formData.assistantNegotiation?.ownerPhone || ''}
              onChange={(e) => handleNegotiationFieldChange('ownerPhone', e.target.value)}
              placeholder="+20 10 9876 5432"
              className="w-full text-xs sm:text-sm p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-[11px] text-slate-400 block">
              {isAr ? 'الرقم الذي سيتصل به الزائر مباشرة عبر زر الاتصال عند الاتفاق.' : 'Direct telephone number called when visitor clicks Call.'}
            </span>
          </div>

          {/* Owner WhatsApp */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                {isAr ? 'رقم واتساب صاحب المدونة (للتحويل التلقائي):' : 'Owner WhatsApp Number:'}
              </span>
              <a
                href={`https://wa.me/${(formData.assistantNegotiation?.ownerWhatsApp || '201098765432').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
              >
                <span>{isAr ? 'تجربة فتح الواتساب' : 'Test WhatsApp'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="text"
              value={formData.assistantNegotiation?.ownerWhatsApp || ''}
              onChange={(e) => handleNegotiationFieldChange('ownerWhatsApp', e.target.value)}
              placeholder="201098765432"
              className="w-full text-xs sm:text-sm p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[11px] text-slate-400 block">
              {isAr ? 'أدخل الرقم مع كود الدولة وبدون علامة + (مثال: 201098765432) للتحويل الفوري.' : 'Enter with country code without plus sign (e.g. 201098765432).'}
            </span>
          </div>
        </div>

        {/* Negotiation rules toggle & discount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.assistantNegotiation?.enabled ?? true}
              onChange={(e) => handleNegotiationFieldChange('enabled', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block">
                {isAr ? 'تفعيل مساعد التفاوض الآلي' : 'Enable Automated Negotiation'}
              </span>
              <span className="text-[11px] text-slate-500">
                {isAr ? 'السماح للبوت بحساب الأسعار وعرض الخصومات المعتمدة' : 'Allow bot to calculate prices and offer bounded discounts'}
              </span>
            </div>
          </label>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
              {isAr ? 'أقصى نسبة خصم للتفاوض:' : 'Max Discount %:'}
            </span>
            <div className="flex items-center gap-1.5 flex-1">
              <input
                type="number"
                min="5"
                max="40"
                value={formData.assistantNegotiation?.maxDiscountPercent || 20}
                onChange={(e) => handleNegotiationFieldChange('maxDiscountPercent', Number(e.target.value) || 20)}
                className="w-20 text-xs sm:text-sm p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-center font-bold"
              />
              <span className="text-xs font-bold text-slate-500">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Services & Base Pricing Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <span>{isAr ? 'الخدمات والأسعار المحددة من صاحب المدونة' : 'Configured Services & Floor Prices'}</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold">
              {formData.assistantNegotiation?.services?.length || 0}
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formData.assistantNegotiation?.services?.map((serv) => (
            <div
              key={serv.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3.5 relative"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                    {serv.category}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{serv.name}</h4>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteService(serv.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  title={isAr ? 'حذف الخدمة' : 'Delete service'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{serv.description}</p>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    {isAr ? 'السعر الأساسي:' : 'Base Price:'}
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={serv.basePrice}
                      onChange={(e) => handleUpdateService(serv.id, { basePrice: Number(e.target.value) || 0 })}
                      className="w-full text-xs font-black p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    <span className="text-xs font-bold text-slate-500">{serv.currency}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block">
                    {isAr ? 'الحد الأدنى للتفاوض:' : 'Floor Price:'}
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={serv.minNegotiatedPrice}
                      onChange={(e) => handleUpdateService(serv.id, { minNegotiatedPrice: Number(e.target.value) || 0 })}
                      className="w-full text-xs font-black p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    />
                    <span className="text-xs font-bold text-emerald-600">{serv.currency}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {serv.deliveryDays} {isAr ? 'أيام للتسليم' : 'delivery days'}
                </span>
                <span>{serv.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddServiceModal && (
        <div className="p-6 rounded-3xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>{isAr ? 'إضافة خدمة عمل جديدة إلى المساعد الذكي' : 'Add New Service to Assistant'}</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddServiceModal(false)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>

          <form onSubmit={handleAddNewService} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'اسم الخدمة (بالعربية):' : 'Service Name:'} *
                </label>
                <input
                  type="text"
                  required
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  placeholder={isAr ? 'مثال: تصميم متجر إلكتروني' : 'e.g. E-Commerce Store Design'}
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'التصنيف:' : 'Category:'}
                </label>
                <input
                  type="text"
                  value={newService.category}
                  onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                  placeholder={isAr ? 'تصميم / تشطيب / دهانات' : 'Design / Web / Writing'}
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'وصف تفصيلي للخدمة ونطاق العمل:' : 'Description & Scope:'}
              </label>
              <textarea
                rows={2}
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                placeholder={isAr ? 'اكتب ما تشمله الخدمة بدقة ليعرفها البوت أثناء إقناع العميل...' : 'Details for bot pitch...'}
                className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'السعر الأساسي ($):' : 'Base Price ($):'}
                </label>
                <input
                  type="number"
                  required
                  value={newService.basePrice}
                  onChange={(e) => setNewService({ ...newService, basePrice: Number(e.target.value) })}
                  className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  {isAr ? 'أدنى سعر للتفاوض ($):' : 'Floor Price ($):'}
                </label>
                <input
                  type="number"
                  required
                  value={newService.minNegotiatedPrice}
                  onChange={(e) => setNewService({ ...newService, minNegotiatedPrice: Number(e.target.value) })}
                  className="w-full text-xs p-2 rounded-xl bg-emerald-50 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'مدة التنفيذ (أيام):' : 'Delivery Days:'}
                </label>
                <input
                  type="number"
                  value={newService.deliveryDays}
                  onChange={(e) => setNewService({ ...newService, deliveryDays: Number(e.target.value) })}
                  className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'وحدة الحساب:' : 'Unit:'}
                </label>
                <input
                  type="text"
                  value={newService.unit}
                  onChange={(e) => setNewService({ ...newService, unit: e.target.value })}
                  placeholder="لكل مشروع"
                  className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddServiceModal(false)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
              >
                {isAr ? 'حفظ الخدمة' : 'Save Service'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
