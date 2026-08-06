import nodemailer from 'nodemailer';

function normalizeSecret(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

const brevoApiKey = normalizeSecret(process.env.BREVO_API_KEY);
const brevoApiBaseUrl = 'https://api.brevo.com/v3';
const smtpHost = String(process.env.SMTP_HOST || 'smtp-relay.brevo.com').trim();
const smtpPort = Number.parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = String(process.env.SMTP_USER || '').trim();
const smtpPass = normalizeSecret(process.env.SMTP_PASS);
const fromEmail = String(process.env.EMAIL_FROM || '').trim().toLowerCase();
const fromName = String(process.env.EMAIL_FROM_NAME || 'NEON Academy 2060').trim();
const replyTo = String(process.env.EMAIL_REPLY_TO || '').trim().toLowerCase();
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

function brevoErrorCode(result, status) {
  const rawCode = String(result?.code || '').trim();
  if (!rawCode) return `BREVO_API_${status}`;
  return `BREVO_API_${rawCode.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
}

async function brevoRequest(path, { method = 'GET', body, timeoutMs = 12_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${brevoApiBaseUrl}${path}`, {
      method,
      headers: {
        accept: 'application/json',
        'api-key': brevoApiKey,
        ...(body ? { 'content-type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    const result = await readJsonSafely(response);
    return { response, result };
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

export function isEmailDeliveryConfigured() {
  return isBrevoApiConfigured() || isSmtpConfigured();
}

export async function verifyEmailDelivery() {
  if (isBrevoApiConfigured()) {
    try {
      const accountCheck = await brevoRequest('/account');
      if (!accountCheck.response.ok) {
        return {
          configured: true,
          reachable: false,
          provider: 'firebase-default',
          senderActive: false,
          errorCode: `BREVO_API_${accountCheck.response.status}`,
          responseCode: accountCheck.response.status
        };
      }

      const senderCheck = await brevoRequest('/senders');
      if (!senderCheck.response.ok) {
        return {
          configured: true,
          reachable: false,
          provider: 'firebase-default',
          senderActive: false,
          errorCode: `BREVO_SENDERS_${senderCheck.response.status}`,
          responseCode: senderCheck.response.status
        };
      }

      const senders = Array.isArray(senderCheck.result?.senders) ? senderCheck.result.senders : [];
      const configuredSender = senders.find(sender =>
        String(sender?.email || '').trim().toLowerCase() === fromEmail
      );

      if (!configuredSender) {
        return {
          configured: true,
          reachable: false,
          provider: 'firebase-default',
          senderActive: false,
          errorCode: 'BREVO_SENDER_NOT_FOUND',
          responseCode: 200
        };
      }

      if (configuredSender.active !== true) {
        return {
          configured: true,
          reachable: false,
          provider: 'firebase-default',
          senderActive: false,
          errorCode: 'BREVO_SENDER_INACTIVE',
          responseCode: 200
        };
      }

      return {
        configured: true,
        reachable: true,
        provider: 'brevo-api',
        senderActive: true,
        errorCode: null,
        responseCode: 200
      };
    } catch (error) {
      console.error('Brevo API verification failed.', {
        code: error?.code || 'BREVO_API_NETWORK_ERROR',
        timestamp: new Date().toISOString()
      });

      return {
        configured: true,
        reachable: false,
        provider: 'firebase-default',
        senderActive: false,
        errorCode: error?.code || 'BREVO_API_NETWORK_ERROR',
        responseCode: error?.responseCode || null
      };
    }
  }

  if (isSmtpConfigured()) {
    try {
      await getTransporter().verify();
      return {
        configured: true,
        reachable: true,
        provider: 'smtp',
        senderActive: true,
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
        senderActive: false,
        errorCode: String(error?.code || 'SMTP_VERIFY_FAILED'),
        responseCode: Number.isInteger(error?.responseCode) ? error.responseCode : null
      };
    }
  }

  return {
    configured: false,
    reachable: false,
    provider: 'firebase-default',
    senderActive: false,
    errorCode: 'EMAIL_SERVICE_NOT_CONFIGURED',
    responseCode: null
  };
}

function buildMessage({ displayName, resetLink, language }) {
  const isEnglish = language === 'en';
  const safeName = escapeHtml(displayName || (isEnglish ? 'Student' : 'الطالب'));
  const safeLink = escapeHtml(resetLink);
  const subject = isEnglish
    ? 'Reset your password | NEON Academy 2060'
    : 'إعادة تعيين كلمة المرور | NEON Academy 2060';

  const text = isEnglish
    ? [
        `Hello ${displayName || 'Student'},`,
        '',
        'We received a request to reset the password for your NEON Academy 2060 account.',
        'Open the following link to create a new password:',
        resetLink,
        '',
        'If you did not request this change, ignore this email and your account will remain unchanged.',
        '',
        'NEON Academy 2060 Team'
      ].join('\n')
    : [
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

  const direction = isEnglish ? 'ltr' : 'rtl';
  const fontFamily = isEnglish ? 'Arial,sans-serif' : 'Tahoma,Arial,sans-serif';
  const heading = isEnglish ? 'Reset your password' : 'إعادة تعيين كلمة المرور';
  const greeting = isEnglish ? 'Hello' : 'مرحبًا';
  const intro = isEnglish
    ? 'We received a request to reset your account password. Use the button below to create a new password:'
    : 'تلقينا طلبًا لإعادة تعيين كلمة المرور لحسابك. اضغط الزر التالي لإنشاء كلمة مرور جديدة:';
  const buttonText = isEnglish ? 'Create a new password' : 'تعيين كلمة مرور جديدة';
  const copyHint = isEnglish
    ? 'If the button does not open, copy and paste this link into your browser:'
    : 'عند تعذر فتح الزر، انسخ الرابط التالي والصقه في المتصفح:';
  const ignoreText = isEnglish
    ? 'If you did not request this change, ignore this email and your account will remain unchanged.'
    : 'إذا لم تطلب إعادة تعيين كلمة المرور، فتجاهل الرسالة ولن يتغير حسابك.';
  const footer = isEnglish
    ? 'Automated security message from NEON Academy 2060 — never share your password.'
    : 'رسالة أمنية آلية من NEON Academy 2060 — لا ترسل كلمة مرورك لأي شخص.';

  const html = `<!doctype html>
<html lang="${isEnglish ? 'en' : 'ar'}" dir="${direction}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#07101f;font-family:${fontFamily};color:#f8fbff">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#07101f;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#101a36;border:1px solid #29375e;border-radius:22px;overflow:hidden">
        <tr><td style="padding:28px 32px;background:linear-gradient(135deg,#58d7f4,#9869ff);color:#07101f">
          <div style="font-size:13px;font-weight:800;letter-spacing:1px">NEON ACADEMY 2060</div>
          <h1 style="margin:8px 0 0;font-size:28px">${heading}</h1>
        </td></tr>
        <tr><td style="padding:32px;line-height:1.9;color:#dce5ff">
          <p style="margin:0 0 16px;font-size:18px">${greeting} <strong style="color:#ffffff">${safeName}</strong>،</p>
          <p style="margin:0 0 20px">${intro}</p>
          <p style="margin:26px 0;text-align:center">
            <a href="${safeLink}" style="display:inline-block;padding:14px 28px;border-radius:13px;background:#67dcf4;color:#07101f;text-decoration:none;font-weight:800">${buttonText}</a>
          </p>
          <p style="margin:20px 0 8px;font-size:13px;color:#aebada">${copyHint}</p>
          <p style="margin:0;padding:12px;border-radius:10px;background:#0a132b;direction:ltr;text-align:left;word-break:break-all;font-size:12px;color:#80e7ff">${safeLink}</p>
          <p style="margin:24px 0 0;color:#b7c3e3">${ignoreText}</p>
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #29375e;color:#8997bd;font-size:12px">${footer}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

async function sendViaBrevoApi({ to, displayName, content }) {
  const payload = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: to, name: displayName || undefined }],
    subject: content.subject,
    htmlContent: content.html,
    tags: ['password-reset', 'security'],
    headers: {
      'X-Entity-Ref-ID': `neon-reset-${Date.now()}`,
      'X-NEON-Message-Type': 'password-reset',
      'Auto-Submitted': 'auto-generated'
    }
  };

  if (replyTo) payload.replyTo = { email: replyTo };

  const { response, result } = await brevoRequest('/smtp/email', {
    method: 'POST',
    body: payload,
    timeoutMs: 18_000
  });

  if (!response.ok) {
    throw createDeliveryError(
      result.message || `Brevo API rejected the message with status ${response.status}.`,
      brevoErrorCode(result, response.status),
      response.status
    );
  }

  return {
    provider: 'brevo-api',
    messageId: result.messageId || null
  };
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
      'X-NEON-Message-Type': 'password-reset',
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

  const content = buildMessage({ displayName, resetLink, language });

  if (isBrevoApiConfigured()) {
    return sendViaBrevoApi({ to, displayName, content });
  }

  return sendViaSmtp({ to, content });
}
