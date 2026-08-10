# NEON Release Candidate — 0.6.0-rc.1

هذه النسخة هي أول Release Candidate للبنية الحديثة Zero-Legacy. الهدف منها فصل أربع حالات بوضوح:

1. **Build Success**: الكود يبنى ويمر بحراس الجودة.
2. **RC PREPARED**: Release + Automated UAT نجحا وتم إنشاء Manifest مربوط بالـSHA وحزمة `dist`.
3. **Manual UAT APPROVED**: نفذت الحالات الـ15 فعليًا وسُجلت في Artifact غير قابل للتعديل مربوط بالـSHA والمختبر.
4. **RC APPROVED**: Final Merge Gate تحقق من Manual UAT Artifact وRailway على نفس SHA، ثم أعاد الاختبارات وأصدر Manifest نهائيًا بحالة `APPROVED`.

## RC Preparation

الأمر المحلي/CI:

```bash
npm run rc:prepare
```

ويشمل:

- `npm run uat:gate`
- فحص سياسة RC.
- إنشاء `artifacts/release-candidate-manifest.json`.
- حساب SHA-256 تجميعي لحزمة `dist` مع عدد الملفات والحجم.

Workflow: **Release Candidate Preparation**.

نجاح هذا Workflow يعني **PREPARED فقط** ولا يعني الموافقة على الدمج.

## Manual UAT Sign-off

يجب تنفيذ جميع الحالات المحددة في `docs/UAT-MERGE-READINESS.md` فعليًا، وتشمل الحسابات والصلاحيات والحساب الموقوف وتبديل حسابين وSTEP/Exams/Coding والهاتف والكمبيوتر.

استخدم `release/manual-uat-template.json` أثناء التنفيذ. لا تحول أي حالة إلى `PASS` قبل نجاحها فعليًا، ولا تدخل كلمات مرور أو Firebase tokens في GitHub comments أو artifacts.

بعد 15/15 PASS شغّل Workflow **Manual UAT Sign-off**. هذا Workflow:

- يتأكد أن `candidate_sha` هو الرأس الحالي لـPR #1.
- يتأكد أن Railway Preview = `success` على نفس SHA.
- يرفض أي حالة ليست `PASS`، أو حالة ناقصة/زائدة، أو وجود Critical/High regression.
- يحفظ اسم المختبر ومرجع الأدلة بدون أسرار.
- ينتج Artifact باسم `neon-manual-uat-<sha>` محفوظًا 90 يومًا.

نجاح Workflow هو سجل الاعتماد البشري القابل للتدقيق. لا يكفي إدخال Boolean عام في Final Gate.

## Final Merge Gate

Workflow: **Final Merge Gate** ويعمل يدويًا فقط (`workflow_dispatch`).

المدخل الوحيد المطلوب:

- `candidate_sha`: رأس PR #1 الكامل من 40 خانة.

البوابة تتحقق آليًا من:

- أن `candidate_sha` هو **الرأس الحالي** لـPR #1، وليس Commit قديمًا.
- أن Railway Preview = `success` على **نفس SHA**.
- وجود تشغيل ناجح لـ**Manual UAT Sign-off** على نفس SHA.
- تنزيل Artifact `neon-manual-uat-<sha>` من تشغيل UAT الناجح.
- التحقق مرة أخرى من أن الحالات الـ15 كلها PASS، وRegression clearance = صفر، واسم المختبر/الدليل موجودان.
- إعادة تشغيل كامل `rc:final` على SHA المحدد.
- إنشاء Manifest جديد بحالة `APPROVED` ورفعه كArtifact لمدة 90 يومًا.

## Ready for Review

بعد نجاح **Final Merge Gate** فقط يمكن تحويل PR #1 من Draft إلى Ready for Review. التحويل نفسه لا يتم تلقائيًا من Workflow حتى تبقى خطوة الدمج قرارًا صريحًا.

## Merge

لا يتم الدمج إلى `main` إلا بعد:

- Vite Performance Build = Success.
- Production Release Gate = Success.
- Automated UAT Gate = Success.
- Release Candidate Preparation = Success.
- Railway Preview = Success على الرأس الحالي.
- Manual UAT Sign-off = Success على الرأس الحالي و15/15 PASS.
- Final Merge Gate = Success على الرأس الحالي.
- عدم تحرك HEAD بعد الاعتماد النهائي؛ إذا تحرك SHA يجب إعادة Manual UAT للحالات المتأثرة ثم Final Merge Gate على SHA الجديد.
