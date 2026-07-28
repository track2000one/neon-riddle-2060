// إعدادات المعلم الذكي الحقيقي.
// مفتاح reCAPTCHA Enterprise العام مخصص للاستخدام داخل تطبيق الويب وليس مفتاحًا سريًا.
export const AI_MODEL = 'gemini-3.6-flash';
export const APP_CHECK_SITE_KEY = '6Lf8N2otAAAAANHgzwqPu5Nmp5yKMoifkzs5rVeM';

export const AI_LIMITS = Object.freeze({
  maxPromptCharacters: 5000,
  maxCodeCharacters: 9000,
  maxRequestsPerMinute: 8,
  maxHistoryTurns: 4
});
