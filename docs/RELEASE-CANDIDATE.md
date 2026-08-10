# NEON Release Candidate — 0.6.0-rc.1

هذه النسخة هي أول Release Candidate للبنية الحديثة Zero-Legacy. الهدف منها فصل ثلاث حالات بوضوح:

1. **Build Success**: الكود يبنى ويمر بحراس الجودة.
2. **RC PREPARED**: Release + Automated UAT نجحا وتم إنشاء Manifest مربوط بالـSHA وحزمة `dist`.
3. **RC APPROVED**: Manual UAT اكتملت، لا توجد Critical/High regressions، Railway Success على نفس SHA، وتم تشغيل Final Merge Gate بنجاح.

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

## Manual UAT

يجب تنفيذ جميع الحالات المحددة في `docs/UAT-MERGE-READINESS.md`، وتشمل الحسابات الفعلية، الصلاحيات، الحساب الموقوف، تبديل حسابين، STEP/Exams/Coding، الهاتف والكمبيوتر.

لا تدخل بيانات اعتماد أو كلمات مرور أو Firebase tokens في GitHub comments أو artifacts.

## Final Merge Gate

Workflow: **Final Merge Gate** ويعمل يدويًا فقط (`workflow_dispatch`).

المدخلات المطلوبة:

- `candidate_sha`: رأس PR #1 الكامل من 40 خانة.
- `manual_uat_approved`: يجب أن تكون `true` بعد إنهاء جميع حالات UAT.
- `no_high_severity_regressions`: يجب أن تكون `true` عند عدم وجود Critical/High مفتوحة.
- `signoff_owner`: اسم/معرّف صاحب الاعتماد.
- `uat_evidence`: مرجع اختياري لملاحظات/تذكرة الاختبار، بدون أسرار.

البوابة تتحقق آليًا من:

- أن `candidate_sha` هو **الرأس الحالي** لـPR #1، وليس Commit قديمًا.
- أن Railway Preview = `success` على **نفس SHA**.
- إعادة تشغيل كامل `uat:gate` على الـSHA المحدد.
- تحقق سياسة RC النهائية.
- إنشاء Manifest جديد بحالة `APPROVED` ورفعه كArtifact لمدة 90 يومًا.

## Ready for Review

بعد نجاح **Final Merge Gate** فقط يمكن تحويل PR #1 من Draft إلى Ready for Review. التحويل نفسه لا يتم تلقائيًا من Workflow حتى تبقى خطوة الدمج قرارًا صريحًا.

## Merge

لا يتم الدمج إلى `main` إلا بعد:

- Vite Performance Build = Success.
- Production Release Gate = Success.
- Automated UAT Gate = Success.
- Release Candidate Preparation = Success.
- Final Merge Gate = Success على الرأس الحالي.
- عدم تحرك HEAD بعد الاعتماد النهائي؛ إذا تحرك SHA يجب إعادة Final Merge Gate.
