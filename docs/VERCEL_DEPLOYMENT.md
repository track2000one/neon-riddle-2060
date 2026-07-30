# نشر نسخة الأداء على Vercel

## الفرع التجريبي

استخدم الفرع:

```text
performance-vite
```

لا تغيّر فرع الإنتاج `main` قبل اكتمال الاختبار.

## إنشاء مشروع Vercel

1. افتح Vercel ثم اختر **Add New → Project**.
2. استورد المستودع `track2000one/neon-riddle-2060`.
3. غيّر **Production Branch** مؤقتًا إلى `performance-vite`، أو أنشئ Preview Deployment من هذا الفرع.
4. يعتمد Vercel الإعدادات الموجودة في `vercel.json`:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. اختر Node.js 22.x إذا لم يقرأ Vercel قيمة `engines` تلقائيًا.
6. نفّذ Deploy.

## ربط Firebase Authentication

بعد ظهور رابط Vercel:

1. افتح Firebase Console.
2. انتقل إلى **Authentication → Settings → Authorized domains**.
3. أضف نطاق Vercel بدون `https://`، مثل:

```text
neon-academy-preview.vercel.app
```

4. عند ربط نطاق مخصص، أضفه أيضًا إلى Authorized domains.

## روابط الاختبار

اختبر الروابط التالية بعد النشر:

```text
/
/step.html
/exams.html
/legacy/coding.html
/legacy/games.html
/legacy/learning.html
```

## معايير القبول

- ظهور البوابة خلال وقت قصير دون تحميل بنك الاختبارات.
- فتح STEP وعرض الواجهة قبل اكتمال بنك الأسئلة الكبير.
- فتح مركز الاختبارات مع ظهور عدد الأسئلة من `manifest.json`.
- عدم تنزيل ملف المادة قبل اختيارها والضغط على بدء الاختبار.
- نجاح تسجيل الدخول والعودة إلى الرابط المطلوب.
- عمل الرسومات عند الوصول إلى سؤال يحتوي `visualId`.
- حفظ بنك المادة في IndexedDB بعد أول استخدام.
- عدم وجود تمرير أفقي غير مقصود على الجوال.

## ما بعد نجاح المعاينة

1. تحويل صفحات البرمجة والألعاب والمعرفة إلى نقاط دخول Vite مستقلة.
2. إجراء اختبار أداء على الهاتف والكمبيوتر.
3. جعل Pull Request جاهزًا للمراجعة.
4. دمج `performance-vite` في `main`.
5. تغيير Production Branch في Vercel إلى `main`.
6. إبقاء GitHub Pages مؤقتًا كنسخة احتياطية حتى استقرار النسخة الجديدة.
