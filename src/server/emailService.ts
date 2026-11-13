import nodemailer from 'nodemailer';

export interface EmailSendResult {
  sent: boolean;
  provider: 'smtp' | 'resend' | 'console_preview';
  error?: string;
}

const OFFICIAL_OWNER_EMAIL = 'mahmoudahmedhessien032@gmail.com';

export function maskEmailAddress(email: string): string {
  const clean = email.trim();
  const atIndex = clean.indexOf('@');
  if (atIndex <= 2) return clean;
  const local = clean.slice(0, atIndex);
  const domain = clean.slice(atIndex);
  const start = local.slice(0, Math.min(3, local.length));
  const end = local.length > 5 ? local.slice(-3) : '';
  return `${start}***${end}${domain}`;
}

export function isRealEmailConfigured(): boolean {
  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasGmailApp = Boolean(process.env.GMAIL_APP_PASSWORD?.trim());
  const hasSmtp = Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
  return hasResend || hasGmailApp || hasSmtp;
}

export async function sendLoginVerificationEmail(params: {
  to: string;
  code: string;
  expiresInMinutes: number;
  ip?: string;
}): Promise<EmailSendResult> {
  const recipient = params.to.trim().toLowerCase();
  const code = params.code.trim();
  const expires = params.expiresInMinutes;

  const subject = `كود التحقق لتسجيل الدخول: ${code} - مدونة ألفا للديكور`;
  const textBody = [
    'مرحباً الحضرى محمود،',
    '',
    'تم طلب تسجيل الدخول إلى لوحة إدارة مدونة ألفا للديكور والدهانات.',
    `كود التحقق الخاص بك هو: ${code}`,
    `صلاحية الكود: ${expires} دقائق فقط ولا يُستخدم إلا مرة واحدة.`,
    '',
    'إذا لم تطلب تسجيل الدخول، يرجى تجاهل هذه الرسالة وتغيير كلمة المرور فوراً.',
  ].join('\n');

  const htmlBody = `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; color: #0f172a;">
      <div style="background: linear-gradient(135deg, #0f172a, #1e1b4b); color: #ffffff; padding: 18px 20px; border-radius: 12px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px;">ألفا للديكور والدهانات</h2>
        <p style="margin: 6px 0 0; font-size: 12px; color: #cbd5e1;">كود التحقق الثنائي لتسجيل دخول المالك</p>
      </div>
      <div style="padding: 20px 8px;">
        <p style="font-size: 14px; line-height: 1.7;">مرحباً <strong>الحضرى محمود</strong>،</p>
        <p style="font-size: 14px; line-height: 1.7;">استخدم كود التحقق التالي لإتمام تسجيل الدخول إلى لوحة الإدارة:</p>
        <div style="margin: 20px 0; padding: 18px; background: #ffffff; border: 2px dashed #2563eb; border-radius: 12px; text-align: center;">
          <span style="font-family: 'Courier New', monospace; font-size: 30px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8;" dir="ltr">${code}</span>
        </div>
        <p style="font-size: 12px; color: #475569; line-height: 1.6;">
          • هذا الكود صالح لمدة <strong>${expires} دقائق</strong> فقط ولمرة واحدة.<br/>
          • البريد المعتمد: <span dir="ltr">${recipient}</span>
        </p>
      </div>
    </div>
  `;

  // 1. Try SMTP via Nodemailer (supports custom SMTP_* or GMAIL_APP_PASSWORD)
  const gmailAppPass = process.env.GMAIL_APP_PASSWORD?.trim();
  const smtpUser = process.env.SMTP_USER?.trim() || (gmailAppPass ? OFFICIAL_OWNER_EMAIL : '');
  const smtpPass = process.env.SMTP_PASS?.trim() || gmailAppPass || '';
  const smtpHost = process.env.SMTP_HOST?.trim() || (smtpUser ? 'smtp.gmail.com' : '');
  const smtpPort = Number(process.env.SMTP_PORT || '465');
  const smtpSecure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.trim().toLowerCase() === 'true'
    : smtpPort === 465;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const fromAddress = process.env.MAIL_FROM?.trim() || `Alpha Decor Auth <${smtpUser}>`;
      await transporter.sendMail({
        from: fromAddress,
        to: recipient,
        subject,
        text: textBody,
        html: htmlBody,
      });

      return { sent: true, provider: 'smtp' };
    } catch (smtpErr: any) {
      console.error('SMTP email dispatch failed:', smtpErr?.message || smtpErr);
      // Continue to Resend fallback if configured
      if (!process.env.RESEND_API_KEY?.trim()) {
        return {
          sent: false,
          provider: 'console_preview',
          error: smtpErr?.message || 'فشل الإرسال عبر خادم SMTP.',
        };
      }
    }
  }

  // 2. Try Resend HTTP API if RESEND_API_KEY is configured
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const fromAddress = process.env.MAIL_FROM?.trim() || 'Alpha Decor <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipient],
          subject,
          text: textBody,
          html: htmlBody,
        }),
      });

      if (res.ok) {
        return { sent: true, provider: 'resend' };
      }

      const errText = await res.text().catch(() => '');
      console.error('Resend API email dispatch failed:', res.status, errText);
      return {
        sent: false,
        provider: 'console_preview',
        error: `فشل إرسال البريد عبر Resend (${res.status})`,
      };
    } catch (resendErr: any) {
      console.error('Resend network error:', resendErr?.message || resendErr);
      return {
        sent: false,
        provider: 'console_preview',
        error: resendErr?.message || 'تعذر الاتصال بخدمة Resend.',
      };
    }
  }

  // 3. Truthful unconfigured fallback (no SMTP or Resend keys in environment)
  console.log(`[Email OTP Preview] Login verification code for ${recipient}: ${code} (expires in ${expires}m)`);
  return {
    sent: false,
    provider: 'console_preview',
    error: 'خدمة البريد SMTP / RESEND غير مهيأة في متغيرات البيئة بعد.',
  };
}
