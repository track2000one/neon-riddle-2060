# NEON UAT & Merge Readiness

هذه الوثيقة تفصل بين ما يمكن إثباته آليًا داخل CI وما يحتاج تجربة فعلية بحسابات Firebase وأجهزة مستخدمين قبل تحويل PR إلى Ready for Review.

## Automated UAT — PASS criteria

يجب أن ينجح `npm run uat:gate` بالكامل، ويشمل:

- Production build وجميع حراس Modern Auth / Coding / STEP / Zero-Legacy.
- Release artifact checks ومنع sourcemaps وملفات الأسرار والمفاتيح.
- Production server smoke test و`/healthz` وSecurity Headers.
- Firebase-style RS256 JWT verification باستخدام مفتاح RSA اختباري موقّع فعليًا.
- رفض الحالات: no token، malformed token، expired token، wrong audience، invalid signature.
- RBAC capability matrix:
  - `super-admin`: إدارة المحتوى والمستخدمين وكامل لوحة الإدارة.
  - `content-admin`: إدارة المحتوى والتقارير والمكرر والتدقيق، بدون `users.manage`.
  - `support`: قراءة المستخدمين وإدارة التقارير وقراءة التدقيق، بدون إدارة المستخدمين أو المحتوى.
  - `student`: لا صلاحيات إدارية.
- وجود حمايات `SELF_MANAGEMENT_FORBIDDEN`, `BOOTSTRAP_ADMIN_PROTECTED`, `ACCOUNT_SUSPENDED`, `CAPABILITY_REQUIRED`.
- عزل Local State عند تبديل Firebase UID.
- Responsive viewport في جميع مداخل HTML الحديثة.
- عدم تحميل أي Legacy script/iframe من الصفحات الحديثة.

## Manual UAT — REQUIRED before Ready for Review

الحالات التالية لا يجوز تعليمها PASS إلا بعد تنفيذها بحسابات اختبار فعلية على Preview/Production-like environment:

| ID | السيناريو | النتيجة المتوقعة | الحالة |
|---|---|---|---|
| AUTH-01 | إنشاء حساب طالب جديد | إنشاء الحساب ثم الدخول إلى المنصة بدون خطأ | PENDING |
| AUTH-02 | تسجيل دخول طالب موجود | الانتقال إلى الصفحة المطلوبة عبر `next` | PENDING |
| AUTH-03 | استعادة كلمة المرور | إرسال طلب الاستعادة بدون كشف معلومات حساسة | PENDING |
| AUTH-04 | تسجيل الخروج | مسح الجلسة والعودة إلى `/auth` | PENDING |
| ACCESS-01 | حساب طالب Active | يستطيع استخدام المراكز ولا يدخل وظائف الإدارة | PENDING |
| ACCESS-02 | حساب Suspended | يمنع من خدمات NEON ويعاد إلى `/auth?blocked=1` | PENDING |
| RBAC-01 | Support | يرى المستخدمين/التقارير/التدقيق فقط وفق المصفوفة | PENDING |
| RBAC-02 | Content Admin | يدير المحتوى ولا يدير المستخدمين | PENDING |
| RBAC-03 | Super Admin | يدير المستخدمين والأدوار والتعليق دون Lockout ذاتي | PENDING |
| STATE-01 | التبديل بين حسابين في نفس المتصفح | لا تظهر بيانات STEP/Coding/Exam للحساب السابق | PENDING |
| STEP-01 | إكمال درس + تدريب + نموذج | يحفظ التقدم والنتيجة للحساب نفسه | PENDING |
| EXAM-01 | اختبار قصير ثم مراجعة | يحفظ النتيجة ويظهر Skill evidence الصحيح | PENDING |
| CODING-01 | تشغيل HTML/CSS/JS | المعاينة تعمل داخل Sandbox ولا تصل إلى DOM المنصة | PENDING |
| MOBILE-01 | شاشة هاتف تقريبًا 390px | Auth/Home/STEP/Exams/Coding قابلة للاستخدام بلا قص أفقي مؤثر | PENDING |
| DESKTOP-01 | شاشة 1366–1440px | المراكز ولوحة الإدارة سليمة بصريًا ووظيفيًا | PENDING |

## Merge policy

لا يتم تحويل PR #1 من Draft إلى Ready for Review إلا عندما تتحقق الشروط التالية معًا:

1. `Vite Performance Build` = Success.
2. `Production Release Gate` = Success.
3. `Automated UAT Gate` = Success.
4. Railway Preview = Success على نفس HEAD SHA.
5. جميع حالات Manual UAT أعلاه = PASS أو يوجد استثناء موثق ومقبول صراحة قبل الدمج.
6. لا توجد Regression حرجة أو High severity مفتوحة.

## Sign-off

- Automated UAT: يُحدّث آليًا من GitHub Actions.
- Manual UAT owner: مالك المشروع/حسابات الاختبار المخولة.
- Current merge state: **DRAFT — manual UAT required**.
