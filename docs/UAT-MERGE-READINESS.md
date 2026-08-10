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
- عقد Manual UAT نفسه: لا يمر Sign-off آليًا إلا عند 15/15 `PASS`، ويرفض حالة ناقصة أو `FAIL` أو معرفًا غير معروف أو Railway غير ناجح أو وجود Critical/High regression.

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

## طريقة تنفيذ Manual UAT وتسجيلها

1. استخدم **الرأس الحالي** لـPR #1 فقط. إذا تغير HEAD أثناء الاختبار يجب إعادة الحالات المتأثرة على الرأس الجديد.
2. نفذ الحالات الـ15 أعلاه فعليًا على Preview باستخدام حسابات الاختبار المخولة. لا تضع كلمات مرور أو Firebase tokens في GitHub.
3. استخدم `release/manual-uat-template.json` كورقة عمل. اترك أي حالة لم تختبرها `PENDING`، وحول الحالة إلى `PASS` فقط بعد نجاحها فعليًا.
4. بعد أن تصبح الحالات الـ15 كلها `PASS` ولا توجد Critical/High regressions، افتح GitHub Actions وشغّل Workflow **Manual UAT Sign-off** يدويًا.
5. أدخل:
   - `candidate_sha`: SHA الكامل للرأس الذي تم اختباره.
   - `tester`: اسم/معرف المختبر.
   - `uat_results_json`: محتوى JSON للحالات الـ15 بعد أن أصبحت كلها `PASS`.
   - `no_high_severity_regressions`: `true` فقط بعد التحقق.
   - `evidence`: مرجع أو ملاحظات الاختبار بدون أسرار.
6. Workflow يتحقق من أن SHA هو رأس PR الحالي وأن Railway = `success` على نفس SHA، ثم ينشئ Artifact باسم `neon-manual-uat-<sha>` يحتوي `manual-uat-signoff.json`.
7. لا تشغّل **Final Merge Gate** قبل نجاح Manual UAT Sign-off. Final Gate يبحث عن تشغيل ناجح على نفس SHA، ينزّل Artifact، ويعيد التحقق من 15/15 PASS بدل قبول Boolean يدوي عام.

## Merge policy

لا يتم تحويل PR #1 من Draft إلى Ready for Review إلا عندما تتحقق الشروط التالية معًا:

1. `Vite Performance Build` = Success.
2. `Production Release Gate` = Success.
3. `Automated UAT Gate` = Success.
4. `Release Candidate Preparation` = Success.
5. Railway Preview = Success على نفس HEAD SHA.
6. Workflow **Manual UAT Sign-off** = Success على نفس HEAD SHA وله Artifact صالح يحتوي 15/15 PASS.
7. لا توجد Regression حرجة أو High severity مفتوحة.
8. Workflow **Final Merge Gate** = Success على نفس HEAD SHA وينتج RC Manifest بحالة `APPROVED`.

## Sign-off

- Automated UAT: GitHub Actions.
- Manual UAT owner: مالك المشروع/المختبر المخول الذي نفذ الحالات فعليًا.
- Manual sign-off record: Artifact غير قابل للتعديل بعد إنشائه، مربوط بالـSHA وWorkflow run والمختبر.
- Current merge state: **DRAFT — manual UAT required**.
