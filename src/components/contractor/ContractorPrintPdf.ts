import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ProjectAccount, fmtEN, calculateProject } from './contractorTypes';

export const generatePrintableHTML = (project: ProjectAccount) => {
  const calc = calculateProject(project);

  const rowsHTML = (table: 'payments' | 'labor' | 'daily' | 'expenses', rows: any[]) => {
    if (!rows || rows.length === 0) {
      return `<tr><td colspan="6" style="padding:12px;text-align:center;color:#64748b;font-style:italic;background:#f8fafc;">لا توجد بيانات مسجلة في هذا الجدول</td></tr>`;
    }
    return rows
      .map((r, i) => {
        const date = r.date || '—';
        const amt = fmtEN(r.amount);
        const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        if (table === 'payments') {
          return `<tr style="background:${bg};">
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;font-weight:bold;color:#475569;">${i + 1}</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;font-weight:600;">${date}</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;">${r.desc || '—'}</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;color:#16a34a;font-weight:900;font-size:13px;">${amt}</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;color:#334155;font-weight:600;">${r.method || 'نقدي'}</td>
          </tr>`;
        }
        if (table === 'labor') {
          return `<tr style="background:${bg};">
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;font-weight:bold;color:#475569;">${i + 1}</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;font-weight:600;">${date}</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;font-weight:bold;color:#1e293b;">${r.name || '—'}</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;">${r.work || '—'}</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;color:#ea580c;font-weight:900;font-size:13px;">${amt}</td>
          </tr>`;
        }
        if (table === 'daily') {
          return `<tr style="background:${bg};">
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;font-weight:bold;color:#475569;">${i + 1}</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;font-weight:600;">${date}</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;">${r.desc || '—'}</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;color:#9333ea;font-weight:900;font-size:13px;">${amt}</td>
          </tr>`;
        }
        if (table === 'expenses') {
          return `<tr style="background:${bg};">
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;font-weight:bold;color:#475569;">${i + 1}</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;font-weight:600;">${date}</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;">${r.desc || '—'}</td>
            <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;color:#e11d48;font-weight:900;font-size:13px;">${amt}</td>
          </tr>`;
        }
        return '';
      })
      .join('');
  };

  return `
    <!-- Header Banner -->
    <div style="background:linear-gradient(135deg, #1e293b, #334155);border-radius:12px;padding:18px 24px;color:#ffffff;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:4px solid #3b82f6;direction:rtl;">
      <div style="text-align:right;">
        <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;font-family:'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;direction:rtl;line-height:1.4;">
          <span style="display:inline-block;margin-left:8px;">🎨</span><span style="display:inline-block;font-weight:900;">الفا ديزين للدهانات — حضرى</span>
        </h1>
        <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;font-weight:bold;font-family:'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;direction:rtl;">نظام إدارة ومتابعة حسابات مقاولات التشطيبات والدهانات الديكورية</p>
      </div>
      <div style="text-align:center;background:rgba(255,255,255,0.1);padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);direction:rtl;">
        <div style="font-size:11px;color:#cbd5e1;font-weight:bold;">وثيقة كشف حساب معتمدة</div>
        <div style="font-size:13px;font-weight:900;color:#38bdf8;margin-top:2px;">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</div>
      </div>
    </div>

    <!-- Project Core Details Table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12.5px;background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="border:1px solid #cbd5e1;padding:9px 12px;background:#f1f5f9;font-weight:bold;width:130px;color:#334155;">اسم العميل:</td>
        <td style="border:1px solid #cbd5e1;padding:9px 12px;font-weight:bold;color:#0f172a;font-size:13px;">${project.client}</td>
        <td style="border:1px solid #cbd5e1;padding:9px 12px;background:#f1f5f9;font-weight:bold;width:130px;color:#334155;">اسم المشروع / العملية:</td>
        <td style="border:1px solid #cbd5e1;padding:9px 12px;font-weight:bold;color:#0f172a;">${project.name || '—'}</td>
      </tr>
      <tr>
        <td style="border:1px solid #cbd5e1;padding:9px 12px;background:#f1f5f9;font-weight:bold;color:#334155;">العنوان / المكان:</td>
        <td style="border:1px solid #cbd5e1;padding:9px 12px;color:#334155;">${project.address || '—'}</td>
        <td style="border:1px solid #cbd5e1;padding:9px 12px;background:#f1f5f9;font-weight:bold;color:#334155;">تاريخ بدء المشروع:</td>
        <td style="border:1px solid #cbd5e1;padding:9px 12px;color:#334155;">${project.date || '—'}</td>
      </tr>
      <tr>
        <td style="border:1px solid #cbd5e1;padding:9px 12px;background:#eff6ff;font-weight:900;color:#1e40af;">المبلغ المتفق عليه:</td>
        <td style="border:1px solid #cbd5e1;padding:9px 12px;color:#1d4ed8;font-weight:900;font-size:14px;background:#eff6ff;">${fmtEN(calc.agreed)} ج.م</td>
        <td style="border:1px solid #cbd5e1;padding:9px 12px;background:#f1f5f9;font-weight:bold;color:#334155;">ملاحظات الاتفاق:</td>
        <td style="border:1px solid #cbd5e1;padding:9px 12px;color:#475569;">${project.notes || '—'}</td>
      </tr>
    </table>

    <!-- 1. Table: Payments -->
    <div style="margin-bottom:20px;border:1px solid #bbf7d0;border-radius:10px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(90deg, #16a34a, #15803d);color:#ffffff;padding:10px 14px;font-weight:900;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
        <span>💵 الدفعات المستلمة من العميل</span>
        <span style="font-size:12px;background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:6px;">إجمالي المحصّل: ${fmtEN(calc.totalPaid)} ج.م</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
        <thead>
          <tr style="background:#1e293b;color:#ffffff;font-weight:bold;">
            <th style="border:1px solid #334155;padding:8px;width:35px;text-align:center;">#</th>
            <th style="border:1px solid #334155;padding:8px;width:110px;text-align:center;">التاريخ</th>
            <th style="border:1px solid #334155;padding:8px;text-align:right;">البيان / الوصف</th>
            <th style="border:1px solid #334155;padding:8px;width:130px;text-align:center;">المبلغ (ج.م)</th>
            <th style="border:1px solid #334155;padding:8px;width:120px;text-align:center;">طريقة الدفع</th>
          </tr>
        </thead>
        <tbody>${rowsHTML('payments', project.payments)}</tbody>
        <tfoot>
          <tr style="background:#ecfdf5;font-weight:900;color:#065f46;">
            <td colspan="3" style="border:1px solid #a7f3d0;padding:10px;text-align:right;font-size:12px;">إجمالي الدفعات المستلمة:</td>
            <td style="border:1px solid #a7f3d0;padding:10px;text-align:center;color:#16a34a;font-size:14px;">${fmtEN(calc.totalPaid)} ج.م</td>
            <td style="border:1px solid #a7f3d0;padding:10px;"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 2. Table: Labor -->
    <div style="margin-bottom:20px;border:1px solid #fed7aa;border-radius:10px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(90deg, #ea580c, #c2410c);color:#ffffff;padding:10px 14px;font-weight:900;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
        <span>👷 أجور المصنعيات والصنايعية</span>
        <span style="font-size:12px;background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:6px;">إجمالي المصنعيات: ${fmtEN(calc.totalLabor)} ج.م</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
        <thead>
          <tr style="background:#1e293b;color:#ffffff;font-weight:bold;">
            <th style="border:1px solid #334155;padding:8px;width:35px;text-align:center;">#</th>
            <th style="border:1px solid #334155;padding:8px;width:110px;text-align:center;">التاريخ</th>
            <th style="border:1px solid #334155;padding:8px;width:160px;text-align:right;">اسم الصنايعي</th>
            <th style="border:1px solid #334155;padding:8px;text-align:right;">نوع العمل</th>
            <th style="border:1px solid #334155;padding:8px;width:130px;text-align:center;">المبلغ (ج.م)</th>
          </tr>
        </thead>
        <tbody>${rowsHTML('labor', project.labor)}</tbody>
        <tfoot>
          <tr style="background:#fff7ed;font-weight:900;color:#9a3412;">
            <td colspan="4" style="border:1px solid #fed7aa;padding:10px;text-align:right;font-size:12px;">إجمالي المصنعيات:</td>
            <td style="border:1px solid #fed7aa;padding:10px;text-align:center;color:#ea580c;font-size:14px;">${fmtEN(calc.totalLabor)} ج.م</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 3. Table: Daily -->
    <div style="margin-bottom:20px;border:1px solid #e9d5ff;border-radius:10px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(90deg, #9333ea, #7e22ce);color:#ffffff;padding:10px 14px;font-weight:900;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
        <span>📅 اليوميات</span>
        <span style="font-size:12px;background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:6px;">إجمالي اليوميات: ${fmtEN(calc.totalDaily)} ج.م</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
        <thead>
          <tr style="background:#1e293b;color:#ffffff;font-weight:bold;">
            <th style="border:1px solid #334155;padding:8px;width:35px;text-align:center;">#</th>
            <th style="border:1px solid #334155;padding:8px;width:110px;text-align:center;">التاريخ</th>
            <th style="border:1px solid #334155;padding:8px;text-align:right;">البيان</th>
            <th style="border:1px solid #334155;padding:8px;width:130px;text-align:center;">المبلغ (ج.م)</th>
          </tr>
        </thead>
        <tbody>${rowsHTML('daily', project.daily)}</tbody>
        <tfoot>
          <tr style="background:#faf5ff;font-weight:900;color:#6b21a8;">
            <td colspan="3" style="border:1px solid #e9d5ff;padding:10px;text-align:right;font-size:12px;">إجمالي اليوميات:</td>
            <td style="border:1px solid #e9d5ff;padding:10px;text-align:center;color:#9333ea;font-size:14px;">${fmtEN(calc.totalDaily)} ج.م</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 4. Table: Expenses -->
    <div style="margin-bottom:20px;border:1px solid #fecdd3;border-radius:10px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(90deg, #e11d48, #be123c);color:#ffffff;padding:10px 14px;font-weight:900;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
        <span>🧾 المصروفات والخامات</span>
        <span style="font-size:12px;background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:6px;">إجمالي المصروفات: ${fmtEN(calc.totalExpenses)} ج.م</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
        <thead>
          <tr style="background:#1e293b;color:#ffffff;font-weight:bold;">
            <th style="border:1px solid #334155;padding:8px;width:35px;text-align:center;">#</th>
            <th style="border:1px solid #334155;padding:8px;width:110px;text-align:center;">التاريخ</th>
            <th style="border:1px solid #334155;padding:8px;text-align:right;">البيان / نوع المصروف</th>
            <th style="border:1px solid #334155;padding:8px;width:130px;text-align:center;">المبلغ (ج.م)</th>
          </tr>
        </thead>
        <tbody>${rowsHTML('expenses', project.expenses)}</tbody>
        <tfoot>
          <tr style="background:#fff1f2;font-weight:900;color:#9f1239;">
            <td colspan="3" style="border:1px solid #fecdd3;padding:10px;text-align:right;font-size:12px;">إجمالي المصروفات والخامات:</td>
            <td style="border:1px solid #fecdd3;padding:10px;text-align:center;color:#e11d48;font-size:14px;">${fmtEN(calc.totalExpenses)} ج.م</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Final Financial Summary Cards Grid -->
    <div style="background:#f8fafc;border:2px solid #cbd5e1;border-radius:12px;padding:16px;margin-bottom:24px;">
      <h3 style="margin:0 0 12px;font-size:14px;font-weight:900;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">
        📊 الملخص المالي الختامي لعملية: ${project.client}
      </h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr>
          <td style="padding:6px;width:25%;">
            <div style="background:#ffffff;border:1px solid #cbd5e1;border-right:5px solid #64748b;border-radius:8px;padding:8px;text-align:center;">
              <div style="font-size:10px;color:#64748b;font-weight:bold;margin-bottom:2px;">المبلغ المتفق عليه</div>
              <div style="font-size:13px;font-weight:900;color:#0f172a;">${fmtEN(calc.agreed)} ج.م</div>
            </div>
          </td>
          <td style="padding:6px;width:25%;">
            <div style="background:#ffffff;border:1px solid #bbf7d0;border-right:5px solid #16a34a;border-radius:8px;padding:8px;text-align:center;">
              <div style="font-size:10px;color:#15803d;font-weight:bold;margin-bottom:2px;">إجمالي المحصّل</div>
              <div style="font-size:13px;font-weight:900;color:#16a34a;">${fmtEN(calc.totalPaid)} ج.م</div>
            </div>
          </td>
          <td style="padding:6px;width:25%;">
            <div style="background:#ffffff;border:1px solid #fecdd3;border-right:5px solid #e11d48;border-radius:8px;padding:8px;text-align:center;">
              <div style="font-size:10px;color:#be123c;font-weight:bold;margin-bottom:2px;">المتبقي على العميل (دين)</div>
              <div style="font-size:13px;font-weight:900;color:#e11d48;">${fmtEN(calc.remaining)} ج.م</div>
            </div>
          </td>
          <td style="padding:6px;width:25%;">
            <div style="background:#ffffff;border:1px solid #fed7aa;border-right:5px solid #ea580c;border-radius:8px;padding:8px;text-align:center;">
              <div style="font-size:10px;color:#c2410c;font-weight:bold;margin-bottom:2px;">إجمالي المصنعيات</div>
              <div style="font-size:13px;font-weight:900;color:#ea580c;">${fmtEN(calc.totalLabor)} ج.م</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:6px;width:25%;">
            <div style="background:#ffffff;border:1px solid #e9d5ff;border-right:5px solid #9333ea;border-radius:8px;padding:8px;text-align:center;">
              <div style="font-size:10px;color:#7e22ce;font-weight:bold;margin-bottom:2px;">إجمالي اليوميات</div>
              <div style="font-size:13px;font-weight:900;color:#9333ea;">${fmtEN(calc.totalDaily)} ج.م</div>
            </div>
          </td>
          <td style="padding:6px;width:25%;">
            <div style="background:#ffffff;border:1px solid #fecdd3;border-right:5px solid #e11d48;border-radius:8px;padding:8px;text-align:center;">
              <div style="font-size:10px;color:#be123c;font-weight:bold;margin-bottom:2px;">إجمالي المصروفات</div>
              <div style="font-size:13px;font-weight:900;color:#e11d48;">${fmtEN(calc.totalExpenses)} ج.م</div>
            </div>
          </td>
          <td style="padding:6px;width:25%;">
            <div style="background:#fefce8;border:1px solid #fef08a;border-right:5px solid #ca8a04;border-radius:8px;padding:8px;text-align:center;">
              <div style="font-size:10px;color:#854d0e;font-weight:bold;margin-bottom:2px;">إجمالي التكاليف</div>
              <div style="font-size:13px;font-weight:900;color:#ca8a04;">${fmtEN(calc.totalCosts)} ج.م</div>
            </div>
          </td>
          <td style="padding:6px;width:25%;">
            <div style="background:${calc.netProfit >= 0 ? '#ecfdf5' : '#fff1f2'};border:2px solid ${calc.netProfit >= 0 ? '#16a34a' : '#e11d48'};border-radius:8px;padding:8px;text-align:center;">
              <div style="font-size:10px;color:${calc.netProfit >= 0 ? '#15803d' : '#9f1239'};font-weight:bold;margin-bottom:2px;">صافي الربح الفعلي</div>
              <div style="font-size:14px;font-weight:900;color:${calc.netProfit >= 0 ? '#16a34a' : '#e11d48'};">${fmtEN(calc.netProfit)} ج.م</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Signature & Authenticity Block -->
    <table style="width:100%;margin-top:20px;font-size:12px;color:#475569;">
      <tr>
        <td style="width:50%;text-align:center;padding:12px;border:1px dashed #cbd5e1;border-radius:8px;background:#ffffff;">
          <div style="font-weight:bold;margin-bottom:30px;color:#1e293b;">توقيع وختم الإدارة (الحضرى للدهانات):</div>
          <div style="border-bottom:1px solid #94a3b8;width:180px;margin:0 auto;"></div>
        </td>
        <td style="width:20px;"></td>
        <td style="width:50%;text-align:center;padding:12px;border:1px dashed #cbd5e1;border-radius:8px;background:#ffffff;">
          <div style="font-weight:bold;margin-bottom:30px;color:#1e293b;">توقيع العميل المستلم (إقرار الحساب):</div>
          <div style="border-bottom:1px solid #94a3b8;width:180px;margin:0 auto;"></div>
        </td>
      </tr>
    </table>

    <!-- Footer Note -->
    <div style="text-align:center;margin-top:20px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">
      © حضرى للدهانات والديكورات — تم استخراج هذا التقرير آلياً عبر نظام إدارة الحسابات المتقدم.
    </div>
  `;
};

export const exportProjectAsPDF = async (
  project: ProjectAccount,
  onProgress: (text: string) => void,
  onToast: (msg: string, type: 'success' | 'error' | 'warning') => void
) => {
  let printEl: HTMLDivElement | null = null;

  try {
    onProgress('جاري تجهيز وتنسيق ملف PDF بجودة عالية...');

    printEl = document.createElement('div');
    printEl.id = 'hadry-pdf-capture-root';
    printEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 820px;
      background-color: #ffffff;
      padding: 26px;
      font-family: 'Cairo', 'Tajawal', 'Almarai', 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      color: #1e293b;
      z-index: 9999990;
      opacity: 1;
      visibility: visible;
      pointer-events: none;
      box-sizing: border-box;
    `;

    printEl.innerHTML = generatePrintableHTML(project);
    document.body.appendChild(printEl);

    await new Promise((r) => setTimeout(r, 450));

    onProgress('جاري التقاط صفحات الجداول والبيانات بالألوان الكاملة...');

    const contentHeight = printEl.scrollHeight || printEl.offsetHeight || 1000;

    const canvas = await html2canvas(printEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: 820,
      height: contentHeight,
      windowWidth: 820,
      windowHeight: contentHeight,
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('فشل إنشاء لوحة التصوير للتقرير');
    }

    onProgress('جاري تقسيم وتوليد صفحات مستند PDF...');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;

    const pxPerMm = canvas.width / printableWidth;
    const pageHeightPx = Math.floor(printableHeight * pxPerMm);

    const totalPages = Math.ceil(canvas.height / pageHeightPx) || 1;

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();

      const srcY = i * pageHeightPx;
      const srcHeight = Math.min(pageHeightPx, canvas.height - srcY);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = pageHeightPx;
      const pageCtx = pageCanvas.getContext('2d');
      if (pageCtx) {
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          canvas,
          0, srcY, canvas.width, srcHeight,
          0, 0, canvas.width, srcHeight
        );
      }

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.96);
      pdf.addImage(pageImgData, 'JPEG', margin, margin, printableWidth, printableHeight);
    }

    const safeName = (project.client || 'عميل').replace(/[\\/:*?"<>|]/g, '_');
    const safeProj = (project.name || 'مشروع').replace(/[\\/:*?"<>|]/g, '_');
    pdf.save(`كشف_حساب_${safeProj}_${safeName}.pdf`);

    onToast('✅ تم تنزيل كشف الحساب بصيغة PDF بنجاح مع كامل الألوان والتنسيقات!', 'success');
  } catch (err: any) {
    console.error('PDF generation error:', err);
    onToast('❌ حدث خطأ في تصدير PDF: ' + (err?.message || 'حاول مرة أخرى'), 'error');
  } finally {
    if (printEl && printEl.parentNode) {
      document.body.removeChild(printEl);
    }
  }
};

export const printProjectInBrowser = (
  project: ProjectAccount,
  onToast: (msg: string, type: 'success' | 'error' | 'warning') => void
) => {
  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (!printWindow) {
    onToast('⚠️ يرجى السماح بالنوافذ المنبثقة للطباعة', 'warning');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>كشف حساب — ${project.name || project.client}</title>
      <style>
        @page { size: A4 portrait; margin: 8mm; }
        body { font-family: 'Cairo', 'Tajawal', 'Almarai', 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 12px; background: #fff; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      ${generatePrintableHTML(project)}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.focus();
            window.print();
          }, 300);
        };
      <\/script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
