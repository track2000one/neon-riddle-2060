import nodemailer from 'nodemailer';

const brevoApiKey = String(process.env.BREVO_API_KEY || '').trim();
const brevoApiBaseUrl = 'https://api.brevo.com/v3';
const smtpHost = String(process.env.SMTP_HOST || 'smtp-relay.brevo.com').trim();
const smtpPort = Number.parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = String(process.env.SMTP_USER || '').trim();
const smtpPass = String(process.env.SMTP_PASS || '').trim();
const fromEmail = String(process.env.EMAIL_FROM || '').trim();
const fromName = String(process.env.EMAIL_FROM_NAME || 'NEON Academy 2060').trim();
const replyTo = String(process.env.EMAIL_REPLY_TO || '').trim();
const smtpSecure = String(process.env.SMTP_SECURE || '').trim()
  ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
  : smtpPort === 465;

let transporter = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

function isBrevoApiConfigured() {
  return Boolean(brevoApiKey && fromEmail);
}

function isSmtpConfigured() {
  return Boolean(smtpHost && smtpPort && smtpUser && smtpPass && fromEmail);
}

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000
  });

  return transporter;
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function createDeliveryError(message, code, responseCode = null) {
  const error = new Error(message);
  error.code = code;
  error.responseCode = responseCode;
  error.status = responseCode && responseCode >= 400 && responseCode < 500 ? 400 : 502;
  return error;
}

export function isEmailDeliveryConfigured() {
  return isBrevoApiConfigured() || isSmtpConfigured();
}

export async function verifyEmailDelivery() {
  if (isBrevoApiConfigured()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    try {
      const response = await fetch(`${brevoApiBaseUrl}/account`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey
        },
        signal: controller.signal
      });

      return {
        configured: true,
        reachable: response.ok,
        provider: response.ok ? 'brevo-api' : 'firebase-default',
        errorCode: response.ok ? null : `BREVO_API_${response.status}`,
        responseCode: response.status
      };
    } catch (error) {
      const timedOut = error?.name === 'AbortError';
      console.error('Brevo API verification failed.', {
        code: timedOut ? 'BREVO_API_TIMEOUT' : (error?.code || 'BREVO_API_NETWORK_ERROR'),
        timestamp: new Date().toISOString()
      });

      return {
        configured: true,
        reachable: false,
        provider: 'firebase-default',
        errorCode: timedOut ? 'BREVO_API_TIMEOUT' : 'BREVO_API_NETWORK_ERROR',
        responseCode: null
      };
    } finally {
      clearTimeout(timer);
    }
  }

  if (isSmtpConfigured()) {
    try {
      await getTransporter().verify();
      return {
        configured: true,
        reachable: true,
        provider: 'smtp',
        errorCode: null,
        responseCode: null
      };
    } catch (error) {
      console.error('SMTP verification failed.', {
        code: error?.code || 'SMTP_VERIFY_FAILED',
        command: error?.command || '',
        responseCode: error?.responseCode || null,
        timestamp: new Date().toISOString()
      });

      return {
        configured: true,
        reachable: false,
        provider: 'firebase-default',
        errorCode: String(error?.code || 'SMTP_VERIFY_FAILED'),
        responseCode: Number.isInteger(error?.responseCode) ? error.responseCode : null
      };
    }
  }

  return {
    configured: false,
    reachable: false,
    provider: 'firebase-default',
    errorCode: 'EMAIL_SERVICE_NOT_CONFIGURED',
    responseCode: null
  };
}

function buildArabicMessage({ displayName, resetLink }) {
  const safeName = escapeHtml(displayName || 'الطالب');
  const safeLink = escapeHtml(resetLink);
  const subject = 'إعادة تعيين كلمة المرور | NEON Academy 2060';

  const text = [
    `مرحبًا ${displayName || 'بالطالب'}،`,
    '',
    'تلقينا طلبًا لإعادة تعيين كلمة المرور لحسابك في NEON Academy 2060.',
    'افتح الرابط التالي لإنشاء كلمة مرور جديدة:',
    resetLink,
    '',
    'إذا لم تطلب إعادة تعيين كلمة المرور، فتجاهل هذه الرسالة ولن يتغير حسابك.',
    '',
    'فريق NEON Academy 2060'
  ].join('\n');

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#07101f;font-family:Tahoma,Arial,sans-serif;color:#f8fbff">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#07101f;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#101a36;border:1px solid #29375e;border-radius:22px;overflow:hidden">
        <tr><td style="padding:28px 32px;background:linear-gradient(135deg,#58d7f4,#9869ff);color:#07101f">
          <div style="font-size:13px;font-weight:800;letter-spacing:1px">NEON ACADEMY 2060</div>
          <h1 style="margin:8px 0 0;font-size:28px">إعادة تعيين كلمة المرور</h1>
        </td></tr>
        <tr><td style="padding:32px;line-height:1.9;color:#dce5ff">
          <p style="margin:0 0 16px;font-size:18px">مرحبًا <strong style="color:#ffffff">${safeName}</strong>،</p>
          <p style="margin:0 0 20px">تلقينا طلبًا لإعادة تعيين كلمة المرور لحسابك. اضغط الزر التالي لإنشاء كلمة مرور جديدة:</p>
          <p style="margin:26px 0;text-align:center">
            <a href="${safeLink}" style="display:inline-block;padding:14px 28px;border-radius:13px;background:#67dcf4;color:#07101f;text-decoration:none;font-weight:800">تعيين كلمة مرور جديدة</a>
          </p>
          <p style="margin:20px 0 8px;font-size:13px;color:#aebada">عند تعذر فتح الزر، انسخ الرابط التالي والصقه في المتصفح:</p>
          <p style="margin:0;padding:12px;border-radius:10px;background:#0a132b;direction:ltr;text-align:left;word-break:break-all;font-size:12px;color:#80e7ff">${safeLink}</p>
          <p style="margin:24px 0 0;color:#b7c3e3">إذا لم تطلب إعادة تعيين كلمة المرور، فتجاهل الرسالة ولن يتغير حسابك.</p>
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #29375e;color:#8997bd;font-size:12px">رسالة أمنية آلية من NEON Academy 2060 — لا ترسل كلمة مرورك لأي شخص.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function buildEnglishMessage({ displayName, resetLink }) {
  const safeName = escapeHtml(displayName || 'Student');
  const safeLink = escapeHtml(resetLink);
  const subject = 'Reset your password | NEON Academy 2060';

  const text = [
    `Hello ${displayName || 'Student'},`,
    '',
    'We received a request to reset the password for your NEON Academy 2060 account.',
    'Open the following link to create a new password:',
    resetLink,
    '',
    'If you did not request this change, ignore this email and your account will remain unchanged.',
    '',
    'NEON Academy 2060 Team'
  ].join('\n');

  const html = `<!doctype html>
<html lang="en" dir="ltr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#07101f;font-family:Arial,sans-serif;color:#f8fbff">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#07101f;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#101a36;border:1px solid #29375e;border-radius:22px;overflow:hidden">
        <tr><td style="padding:28px 32px;background:linear-gradient(135deg,#58d7f4,#9869ff);color:#07101f">
          <div style="font-size:13px;font-weight:800;letter-spacing:1px">NEON ACADEMY 2060</div>
          <h1 style="margin:8px 0 0;font-size:28px">Reset your password</h1>
        </td></tr>
        <tr><td style="padding:32px;line-height:1.8;color:#dce5ff">
          <p style="margin:0 0 16px;font-size:18px">Hello <strong style="color:#ffffff">${safeName}</strong>,</p>
          <p style="margin:0 0 20px">We received a request to reset your account password. Use the button below to create a new password:</p>
          <p style="margin:26px 0;text-align:center">
            <a href="${safeLink}" style="display:inline-block;padding:14px 28px;border-radius:13px;background:#67dcf4;color:#07101f;text-decoration:none;font-weight:800">Create a new password</a>
          </p>
          <p style="margin:20px 0 8px;font-size:13px;color:#aebada">If the button does not open, copy and paste this link into your browser:</p>
          <p style="margin:0;padding:12px;border-radius:10px;background:#0a132b;word-break:break-all;font-size:12px;color:#80e7ff">${safeLink}</p>
          <p style="margin:24px 0 0;color:#b7c3e3">If you did not request this change, ignore the email and your account will remain unchanged.</p>
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #29375e;color:#8997bd;font-size:12px">Automated security message from NEON Academy 2060 — never share your password.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

async function sendViaBrevoApi({ to, displayName, content }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);

  try {
    const payload = {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to, name: displayName || undefined }],
      subject: content.subject,
      textContent: content.text,
      htmlContent: content.html,
      headers: {
        'X-Entity-Ref-ID': `neon-reset-${Date.now()}`,
        'Auto-Submitted': 'auto-generated'
      }
    };

    if (replyTo) payload.replyTo = { email: replyTo };

    const response = await fetch(`${brevoApiBaseUrl}/smtp/email`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': brevoApiKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const result = await readJsonSafely(response);
    if (!response.ok) {
      throw createDeliveryError(
        result.message || `Brevo API rejected the message with status ${response.status}.`,
        result.code || `BREVO_API_${response.status}`,
        response.status
      );
    }

    return {
      provider: 'brevo-api',
      messageId: result.messageId || null
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createDeliveryError('Brevo API request timed out.', 'BREVO_API_TIMEOUT');
    }
    if (error instanceof TypeError) {
      throw createDeliveryError('Brevo API network request failed.', 'BREVO_API_NETWORK_ERROR');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function sendViaSmtp({ to, content }) {
  const info = await getTransporter().sendMail({
    from: { name: fromName, address: fromEmail },
    to,
    replyTo: replyTo || undefined,
    subject: content.subject,
    text: content.text,
    html: content.html,
    headers: {
      'X-Entity-Ref-ID': `neon-reset-${Date.now()}`,
      'Auto-Submitted': 'auto-generated'
    }
  });

  return {
    provider: 'smtp',
    messageId: info.messageId || null
  };
}

export async function sendPasswordResetMessage({ to, displayName, resetLink, language = 'ar' }) {
  if (!isEmailDeliveryConfigured()) {
    const error = new Error('Transactional email delivery is not configured.');
    error.code = 'EMAIL_SERVICE_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }

  const content = language === 'en'
    ? buildEnglishMessage({ displayName, resetLink })
    : buildArabicMessage({ displayName, resetLink });

  if (isBrevoApiConfigured()) {
    return sendViaBrevoApi({ to, displayName, content });
  }

  return sendViaSmtp({ to, content });
}
