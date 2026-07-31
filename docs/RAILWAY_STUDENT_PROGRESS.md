# ربط تقدم الطلاب بقاعدة PostgreSQL في Railway

## البنية

```text
المتصفح + Firebase Authentication
        ↓ HTTPS + Firebase ID Token
خدمة NEON على Railway
        ↓ DATABASE_URL عبر شبكة Railway الخاصة
Postgres-neon-academy
```

لا تتصل الواجهة الأمامية بقاعدة البيانات مباشرة. الخادم يتحقق من Firebase ID Token ويستخرج `uid`، ثم يقرأ ويكتب سجلات هذا المستخدم فقط.

## متغيرات Railway المطلوبة

في خدمة التطبيق التي تشغّل `npm run start` افتح **Variables** وأضف:

```text
DATABASE_URL=${{Postgres-neon-academy.DATABASE_URL}}
FIREBASE_PROJECT_ID=neon-riddle-2060-admin
FRONTEND_ORIGIN=https://neon-academy-frontend-preview-production.up.railway.app
```

يمكن استخدام الإكمال التلقائي في Railway لاختيار خدمة PostgreSQL ومتغير `DATABASE_URL` بدل كتابة المرجع يدويًا.

## التحقق

بعد حفظ المتغيرات وإعادة النشر افتح:

```text
https://neon-academy-frontend-preview-production.up.railway.app/api/progress/status
```

النتيجة المطلوبة:

```json
{
  "configured": true,
  "database": "postgresql",
  "firebaseProjectId": "neon-riddle-2060-admin",
  "authentication": "firebase-id-token"
}
```

## الجداول

ينشئ الخادم الجداول التالية تلقائيًا عند أول طلب موثق:

- `neon_users`
- `neon_progress_items`
- `neon_assessment_attempts`
- `neon_xp_events`
- `neon_user_achievements`

## ما تتم مزامنته في المرحلة الأولى

- الدروس المكتملة وآخر درس مفتوح في المعرفة والدروس.
- الأنشطة المكتملة في الألعاب والألغاز.
- نتائج ومحاولات التحصيلي والقدرات.
- نقاط الخبرة المحسوبة من الخادم.
- نسبة الإتقان.
- سلسلة أيام التعلم.
- رابط واصل من حيث توقفت.
- ترحيل بيانات `localStorage` القديمة مرة واحدة لكل حساب.
- قائمة انتظار محلية عند انقطاع الشبكة ثم مزامنة تلقائية عند عودتها.

## الحماية

- لا يُقبل `firebase_uid` من جسم الطلب.
- هوية المستخدم تُستخرج من Firebase ID Token بعد التحقق من التوقيع والناشر والجمهور ووقت الانتهاء.
- مفاتيح XP فريدة لمنع احتساب المكافأة نفسها عدة مرات.
- `DATABASE_URL` يبقى داخل Railway ولا يصل إلى المتصفح.
