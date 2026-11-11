export interface PaymentRow {
  id: string;
  date: string;
  desc: string;
  amount: number | '';
  method: string;
}

export interface LaborRow {
  id: string;
  date: string;
  name: string;
  work: string;
  amount: number | '';
}

export interface DailyRow {
  id: string;
  date: string;
  desc: string;
  amount: number | '';
}

export interface ExpenseRow {
  id: string;
  date: string;
  desc: string;
  amount: number | '';
}

export interface ProjectAccount {
  id: string;
  client: string;
  name: string;
  address: string;
  date: string;
  agreed: number | '';
  notes: string;
  payments: PaymentRow[];
  labor: LaborRow[];
  daily: DailyRow[];
  expenses: ExpenseRow[];
  createdAt: number;
}

export const STORAGE_KEY = 'hadry_paints_projects_v3';

export const INITIAL_SAMPLE_PROJECTS: ProjectAccount[] = [
  {
    id: 'proj_sample_1',
    client: 'أحمد كمال (فيلا الشيخ زايد)',
    name: 'تشطيب صالونات ودهانات مودرن وبديل خشب',
    address: 'الشيخ زايد - كمبوند الياسمين',
    date: new Date().toISOString().split('T')[0],
    agreed: 85000,
    notes: 'الاتفاق يشمل تأسيس معجون ودهانات جوتن وتوريد وتركيب بديل خشب',
    createdAt: Date.now(),
    payments: [
      { id: 'pay_1', date: new Date().toISOString().split('T')[0], desc: 'دفعة أولى مقدم تعاقد', amount: 30000, method: 'تحويل بنكي' },
      { id: 'pay_2', date: new Date().toISOString().split('T')[0], desc: 'دفعة ثانية بعد التأسيس والمعجون', amount: 25000, method: 'نقدي' },
    ],
    labor: [
      { id: 'lab_1', date: new Date().toISOString().split('T')[0], name: 'الأسطى سيد ومساعديه', work: 'صنفرة وتأسيس سيلر ومعجون 3 سكينات', amount: 12000 },
      { id: 'lab_2', date: new Date().toISOString().split('T')[0], name: 'معلم تركيب بديل الخشب', work: 'شاسيهات وتثبيت فوم وبديل رخام', amount: 6500 },
    ],
    daily: [
      { id: 'day_1', date: new Date().toISOString().split('T')[0], desc: 'يومية نظافة وتشوين خامات للدور الأول', amount: 600 },
      { id: 'day_2', date: new Date().toISOString().split('T')[0], desc: 'يومية تغطية الأرضيات وتيب حماية الألوميتال', amount: 500 },
    ],
    expenses: [
      { id: 'exp_1', date: new Date().toISOString().split('T')[0], desc: 'خامات معجون جوتن فينوماستيك وبستلات بلاستيك', amount: 14500 },
      { id: 'exp_2', date: new Date().toISOString().split('T')[0], desc: 'نثريات وصنفرة ورولات وشريط لاصق', amount: 1850 },
    ],
  },
];

export const fmtEN = (val: number | '' | undefined | null) => {
  if (val === '' || val === undefined || val === null || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-US');
};

export const calculateProject = (p: ProjectAccount) => {
  const agreed = Number(p.agreed) || 0;
  const totalPaid = (p.payments || []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const totalLabor = (p.labor || []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const totalDaily = (p.daily || []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const totalExpenses = (p.expenses || []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const totalCosts = totalLabor + totalDaily + totalExpenses;
  const netProfit = totalPaid - totalCosts;
  const remaining = agreed - totalPaid;

  return {
    agreed,
    totalPaid,
    totalLabor,
    totalDaily,
    totalExpenses,
    totalCosts,
    netProfit,
    remaining,
    profitMargin: agreed > 0 ? ((netProfit / agreed) * 100).toFixed(1) : '0',
    collectionRate: agreed > 0 ? ((totalPaid / agreed) * 100).toFixed(1) : '0',
  };
};
