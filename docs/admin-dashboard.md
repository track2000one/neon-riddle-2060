# NEON Admin Dashboard

لوحة الإدارة: `/admin`.

## Bootstrap Admin
المسؤول الأساسي يحدد عبر `NEON_ADMIN_EMAILS` أو `NEON_ADMIN_UIDS` أو Firebase claim (`admin: true` / `role: "admin"` / `role: "super-admin"`). يعامل كـ `super-admin` ومحمي من تغيير دوره أو إيقافه داخل اللوحة.

## الأدوار
- `super-admin`: جميع الصلاحيات، بما فيها إدارة المستخدمين والأدوار وحالة الوصول.
- `content-admin`: إدارة المحتوى والبلاغات والمكرر وسجل التدقيق، دون إدارة المستخدمين.
- `support`: ملخص الإدارة والمستخدمون والبلاغات والتدقيق، دون بنك الأسئلة أو تغيير الصلاحيات.
- `student`: لا يدخل لوحة الإدارة.

التحقق من الصلاحيات Server-side باستخدام Capability Matrix: `dashboard.read`, `content.read`, `content.manage`, `reports.manage`, `duplicates.read`, `audit.read`, `users.read`, `users.manage`.

## المستخدمون
يحفظ `neon_platform_users` UID والبريد والاسم والدور وحالة الوصول وسبب الإيقاف وأوقات النشاط. يتم Backfill للمستخدمين المعروفين من `neon_users` وجداول الأهداف والاختبارات. تعرض اللوحة النشاط، محاولات الاختبار ومتوسطها، الهدف الدراسي، وآخر المحاولات عند توفر البيانات.

## Platform-level Suspension
الحالة `suspended` تمنع الوصول إلى خدمات NEON عبر `/api/access/session` و`ensureAuth()` وAccess Guard المركزي، وتسجل في `neon_admin_audit`. هذا لا يعطل حساب Firebase Authentication نفسه؛ ذلك يحتاج Firebase Admin SDK وصلاحيات خادم مستقلة.

لا يستطيع المسؤول إيقاف نفسه أو تغيير دوره من الجلسة الحالية، وBootstrap Admin محمي من التعديل داخل اللوحة.

## المحتوى والبلاغات
تعديلات الأسئلة تحفظ في `neon_question_overrides` وتطبق على `/data/exams/*.json` مع `adminRevision` لإبطال Cache. السؤال `hidden` لا يصل للطالب. حالات البلاغات: `new`, `reviewing`, `resolved`, `dismissed`. جميع التغييرات الإدارية تسجل في `neon_admin_audit`.

كشف المكرر المحتمل للمراجعة البشرية فقط ولا يحذف الأسئلة تلقائيًا.
