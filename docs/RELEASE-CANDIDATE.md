# NEON Release Candidate — 0.6.0-rc.1

هذه النسخة هي أول Release Candidate للبنية الحديثة Zero-Legacy، وتفصل أربع حالات بوضوح:

1. **Build Success**: الكود يبنى ويمر بحراس الجودة.
2. **RC PREPARED**: Release + Automated UAT نجحا وتم إنشاء Manifest مربوط بالـSHA وحزمة `dist`.
3. **Manual UAT APPROVED**: نفذت الحالات الـ15 فعليًا على SHA محدد وتم إنشاء سجل اعتماد داخل PR.
4. **RC APPROVED**: Final Merge Gate أثبت أن Runtime لم يتغير بعد الاختبار، وتحقق من Railway ثم أعاد الاختبارات وأصدر Manifest نهائيًا `APPROVED`.

## RC Preparation

```bash
npm run rc:prepare
```

ويشمل `uat:gate` وفحص سياسة RC وإنشاء `artifacts/release-candidate-manifest.json` مع SHA-256 تجميعي لحزمة `dist`.

Workflow: **Release Candidate Preparation**. نجاحه يعني **PREPARED فقط**.

## Manual UAT

نفذ الحالات المحددة في `docs/UAT-MERGE-READINESS.md` على رأس PR ثابت، وسجل SHA هذا كـ`testedSha`.

استخدم `release/manual-uat-template.json` أثناء التنفيذ. لا تحول أي حالة إلى `PASS` قبل نجاحها فعليًا، ولا تدخل كلمات مرور أو Firebase tokens أو أسرارًا في المستودع.

بعد 15/15 PASS:

1. أنشئ `release/manual-uat-signoff.json` من القالب.
2. اجعل `status = APPROVED` و`approvedCaseCount = 15`.
3. ضع `testedSha` الذي تم اختبار Runtime عليه، واسم المختبر، ومرجع الأدلة، ووقت `approvedAt`.
4. يجب أن يكون Commit الاعتماد هو **التغيير الوحيد** بعد `testedSha`؛ لا تعدل أي كود أو Runtime معه.

هذا يجعل Git نفسه سجل التدقيق: الاختبار تم على `testedSha`، والرأس اللاحق يضيف سجل الاعتماد فقط.

## Final Merge Gate

Workflow: **Final Merge Gate** ويعمل تلقائيًا عند إضافة/تعديل `release/manual-uat-signoff.json` في PR.

البوابة تتحقق من:

- أن checkout هو رأس PR الحالي نفسه.
- صحة سجل Manual UAT ووجود 15/15 PASS وصفر Critical/High regressions.
- أن `testedSha` أصل للرأس الحالي.
- أن `git diff testedSha..HEAD` يحتوي ملفًا واحدًا فقط: `release/manual-uat-signoff.json`.
- أن رأس PR لم يتحرك أثناء الفحص.
- Railway Preview = `success` على رأس الـPR الحالي.
- إعادة تشغيل `npm run rc:final` بالكامل.
- إنشاء Manifest بحالة `APPROVED` ورفع كل من Manifest وسجل UAT كArtifact لمدة 90 يومًا.

إذا تغيّر أي ملف آخر بعد `testedSha`، تفشل البوابة ويجب إعادة Manual UAT على SHA الجديد.

## Ready for Review

بعد نجاح **Final Merge Gate** فقط يمكن تحويل PR #1 من Draft إلى Ready for Review. التحويل لا يتم تلقائيًا حتى تبقى خطوة الدمج قرارًا صريحًا.

## Merge

لا يتم الدمج إلى `main` إلا بعد:

- Vite Performance Build = Success.
- Production Release Gate = Success.
- Automated UAT Gate = Success.
- Release Candidate Preparation = Success.
- Railway Preview = Success على الرأس الحالي.
- Manual UAT = 15/15 PASS بسجل صالح.
- Final Merge Gate = Success على الرأس الحالي.
- عدم وجود Critical/High regressions مفتوحة.
