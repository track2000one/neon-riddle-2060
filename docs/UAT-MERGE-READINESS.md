# NEON UAT & Merge Readiness

هذه الوثيقة تفصل بين ما يمكن إثباته آليًا داخل CI وما يحتاج تجربة فعلية بحسابات Firebase وأجهزة مستخدمين قبل تحويل PR إلى Ready for Review.

## Automated UAT — PASS criteria

يجب أن ينجح `npm run uat:gate` بالكامل، ويشمل:

- Production build وجميع حراس Modern Auth / Coding / STEP / Zero-Legacy.
- Release artifact checks ومنع sourcemaps وملفات الأسرار والمفاتيح.
- Production server smoke test و`/healthz` وSecurity Headers.
- Firebase-style RS256 JWT verification باستخدام مفتاح RSA اختباري موقّع فعليًا.
- رفض حالات المصادقة غير الصحيحة: no token، malformed، expired، wrong audience، invalid signature.
- RBAC للأدوار `super-admin`, `content-admin`, `support`, `student`.
- حمايات `SELF_MANAGEMENT_FORBIDDEN`, `BOOTSTRAP_ADMIN_PROTECTED`, `ACCOUNT_SUSPENDED`, `CAPABILITY_REQUIRED`.
- عزل Local State عند تبديل Firebase UID.
- Responsive viewport في جميع مداخل HTML الحديثة.
- عدم تحميل أي Legacy script/iframe من الصفحات الحديثة.
- عقد Manual UAT: سجل الاعتماد لا يقبل إلا 15/15 `PASS`، SHA صالح، مختبر/دليل موجودين، وصفر Critical/High regressions.

## Manual UAT — REQUIRED before Ready for Review

| ID | السيناريو | النتيجة المتوقعة | الحالة |
|---|---|---|---|
| AUTH-01 | إنشاء حساب طالب جديد | إنشاء الحساب ثم الدخول بدون خطأ | PENDING |
| AUTH-02 | تسجيل دخول طالب موجود | الانتقال عبر `next` للصفحة المطلوبة | PENDING |
| AUTH-03 | استعادة كلمة المرور | إرسال الاستعادة بدون كشف معلومات حساسة | PENDING |
| AUTH-04 | تسجيل الخروج | مسح الجلسة والعودة إلى `/auth` | PENDING |
| ACCESS-01 | حساب طالب Active | يستخدم المراكز ولا يدخل وظائف الإدارة | PENDING |
| ACCESS-02 | حساب Suspended | يمنع من خدمات NEON ويعاد إلى `/auth?blocked=1` | PENDING |
| RBAC-01 | Support | يرى المستخدمين/التقارير/التدقيق وفق المصفوفة فقط | PENDING |
| RBAC-02 | Content Admin | يدير المحتوى ولا يدير المستخدمين | PENDING |
| RBAC-03 | Super Admin | يدير المستخدمين والأدوار دون Lockout ذاتي | PENDING |
| STATE-01 | التبديل بين حسابين | لا تتسرب بيانات STEP/Coding/Exam بين الحسابين | PENDING |
| STEP-01 | درس + تدريب + نموذج | يحفظ التقدم والنتيجة للحساب نفسه | PENDING |
| EXAM-01 | اختبار قصير ثم مراجعة | يحفظ النتيجة ويظهر Skill evidence الصحيح | PENDING |
| CODING-01 | تشغيل HTML/CSS/JS | المعاينة داخل Sandbox ولا تصل إلى DOM المنصة | PENDING |
| MOBILE-01 | شاشة هاتف ~390px | Auth/Home/STEP/Exams/Coding بلا قص أفقي مؤثر | PENDING |
| DESKTOP-01 | شاشة 1366–1440px | المراكز ولوحة الإدارة سليمة بصريًا ووظيفيًا | PENDING |

## طريقة التنفيذ والتوقيع

1. ثبّت SHA رأس PR #1 الذي ستختبره؛ هذا هو `testedSha`.
2. نفذ الحالات الـ15 أعلاه فعليًا على Preview وبحسابات الاختبار المخولة. لا تضع كلمات مرور أو Firebase tokens في GitHub.
3. استخدم `release/manual-uat-template.json` كورقة عمل. اترك الحالة `PENDING` حتى تنجح فعليًا.
4. عند 15/15 PASS وصفر Critical/High regressions، أنشئ ملف `release/manual-uat-signoff.json` من القالب بالقيم التالية:
   - `status`: `APPROVED`
   - `testedSha`: SHA الذي اختبرته قبل إضافة ملف الاعتماد.
   - `tester`: اسم/معرف المختبر.
   - `evidence`: مرجع أو ملخص الأدلة بدون أسرار.
   - كل الحالات = `PASS`.
   - `approvedCaseCount`: `15`.
   - `approvedAt`: وقت ISO صالح.
5. يجب أن يكون Commit الاعتماد **Sign-off only**: التغيير الوحيد منذ `testedSha` هو `release/manual-uat-signoff.json`.
6. إضافة الملف تشغّل Workflow **Final Merge Gate** تلقائيًا على PR.
7. Final Merge Gate يتحقق من السجل، ويثبت عبر Git أن الفرق منذ `testedSha` هو ملف الاعتماد فقط، ويتأكد من Railway Success على رأس الـPR، ثم يعيد `rc:final` ويصدر Manifest نهائيًا بحالة `APPROVED`.

إذا تغيّر أي Runtime/Source بعد الاختبار اليدوي، يجب إعادة Manual UAT على SHA الجديد؛ لا يسمح بتجاوز ذلك عبر تعديل سجل الاعتماد.

## Merge policy

لا يتم تحويل PR #1 من Draft إلى Ready for Review إلا عندما تتحقق الشروط التالية معًا:

1. `Vite Performance Build` = Success.
2. `Production Release Gate` = Success.
3. `Automated UAT Gate` = Success.
4. `Release Candidate Preparation` = Success.
5. Railway Preview = Success على رأس PR الحالي.
6. `release/manual-uat-signoff.json` صالح ويحتوي 15/15 PASS على `testedSha` الصحيح.
7. لا توجد Critical/High severity regressions مفتوحة.
8. `Final Merge Gate` = Success على رأس PR الحالي ويصدر RC Manifest بحالة `APPROVED`.

## Sign-off

- Automated UAT: GitHub Actions.
- Manual UAT owner: المختبر المخول الذي نفذ الحالات فعليًا.
- Manual sign-off record: Git commit + `release/manual-uat-signoff.json`.
- Current merge state: **DRAFT — manual UAT required**.
