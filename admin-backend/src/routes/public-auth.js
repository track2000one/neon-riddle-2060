import crypto from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { adminAuth } from '../config/firebase.js';
import {
  isEmailDeliveryConfigured,
  sendPasswordResetMessage,
  verifyEmailDelivery
} from '../services/mailer.js';

const router = Router();
const requestCache = new Map();
const resetReturnUrl = String(
  process.env.PASSWORD_RESET_RETURN_URL ||
  'https://track2000one.github.io/neon-riddle-2060/academy/auth.html#login'
).trim();
const perEmailCooldownMs = 60_000;
const smtpErrorCodes = new Set([
  'EAUTH',
  'ECONNECTION',
  'ECONNREFUSED',
  'ECONNRESET',
  'EENVELOPE',
  'EMESSAGE',
  'ENOTFOUND',
  'ESOCKET',
  'ETIMEDOUT'
]);

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    ok: false,
    code: 'PASSWORD_RESET_RATE_LIMITED',
    message: 'تم تجاوز عدد طلبات الاستعادة مؤقتًا. حاول بعد عدة دقائق.'
  }
});

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function hashEmail(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function genericResponse(language = 'ar') {
  return {
    ok: true,
    message: language === 'en'
      ? 'If the email is linked to an account, a password-reset message will arrive shortly.'
      : 'إذا كان البريد مرتبطًا بحساب، فستصل رسالة إعادة تعيين كلمة المرور خلال دقائق.'
  };
}

function customEmailUnavailableResponse(res, language = 'ar') {
  return res.status(503).json({
    ok: false,
    code: 'EMAIL_SERVICE_NOT_CONFIGURED',
    message: language === 'en'
      ? 'The custom email service is temporarily unavailable. Use the Firebase fallback.'
      : 'خدمة البريد المخصصة غير متاحة مؤقتًا. استخدم الإرسال الاحتياطي عبر Firebase.'
  });
}

function isSmtpDeliveryError(error) {
  const code = String(error?.code || '').toUpperCase();
  const command = String(error?.command || '').toUpperCase();

  return smtpErrorCodes.has(code) ||
    Number.isInteger(error?.responseCode) ||
    ['CONN', 'AUTH', 'MAIL FROM', 'RCPT TO', 'DATA'].includes(command);
}

function deliveryStageFor(error) {
  const code = String(error?.code || '').toUpperCase();
  if (code.startsWith('BREVO_API')) return 'brevo-api';
  if (isSmtpDeliveryError(error)) return 'smtp';
  return 'firebase-admin';
}

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, timestamp] of requestCache.entries()) {
    if (now - timestamp > perEmailCooldownMs * 3) requestCache.delete(key);
  }
}

router.get('/email-status', async (_req, res) => {
  const status = await verifyEmailDelivery();

  res.json({
    ok: true,
    configured: status.configured,
    reachable: status.reachable,
    provider: status.provider,
    errorCode: status.errorCode,
    responseCode: status.responseCode,
    checkedAt: new Date().toISOString()
  });
});

router.post('/password-reset', resetLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const language = req.body?.language === 'en' ? 'en' : 'ar';

  if (!isValidEmail(email)) {
    return res.status(400).json({
      ok: false,
      code: 'INVALID_EMAIL',
      message: language === 'en' ? 'Enter a valid email address.' : 'أدخل بريدًا إلكترونيًا صحيحًا.'
    });
  }

  if (!isEmailDeliveryConfigured()) {
    return customEmailUnavailableResponse(res, language);
  }

  cleanExpiredCache();
  const cacheKey = hashEmail(email);
  const lastRequestAt = requestCache.get(cacheKey) || 0;
  if (Date.now() - lastRequestAt < perEmailCooldownMs) {
    return res.json(genericResponse(language));
  }

  try {
    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
    } catch (error) {
      if (error?.code === 'auth/user-not-found') {
        await sleep(350 + Math.floor(Math.random() * 250));
        requestCache.set(cacheKey, Date.now());
        return res.json(genericResponse(language));
      }
      throw error;
    }

    const resetLink = await adminAuth.generatePasswordResetLink(email, {
      url: resetReturnUrl,
      handleCodeInApp: false
    });

    const delivery = await sendPasswordResetMessage({
      to: email,
      displayName: user.displayName || '',
      resetLink,
      language
    });

    requestCache.set(cacheKey, Date.now());
    console.info('Password reset email accepted for delivery.', {
      uid: user.uid,
      language,
      provider: delivery?.provider || 'unknown',
      messageId: delivery?.messageId || null,
      timestamp: new Date().toISOString()
    });

    return res.json(genericResponse(language));
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      return res.json(genericResponse(language));
    }

    console.error('Custom password-reset delivery failed; browser Firebase fallback requested.', {
      stage: deliveryStageFor(error),
      code: error?.code || 'RESET_DELIVERY_ERROR',
      command: error?.command || '',
      responseCode: error?.responseCode || null,
      timestamp: new Date().toISOString()
    });

    return customEmailUnavailableResponse(res, language);
  }
});

export default router;
