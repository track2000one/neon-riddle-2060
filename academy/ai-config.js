// إعدادات المعلم الذكي الحقيقي.
// مفتاح reCAPTCHA Enterprise العام ليس سرًا، ويُضاف بعد تفعيل App Check من Firebase Console.
export const AI_MODEL = 'gemini-3.6-flash';
export const APP_CHECK_SITE_KEY = '';

export const AI_LIMITS = Object.freeze({
  maxPromptCharacters: 5000,
  maxCodeCharacters: 9000,
  maxRequestsPerMinute: 8,
  maxHistoryTurns: 4
});
