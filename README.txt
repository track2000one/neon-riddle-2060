NEON Learning Platform
======================

Modern Vite multi-page learning platform with Firebase Authentication, PostgreSQL-backed student/admin services, RBAC, adaptive assessment, modern coding, modern STEP, and generated learning data.

Canonical routes
----------------
/
/auth
/step
/exams
/games
/kids-games
/learning
/coding
/trust
/admin

Modern STEP
-----------
STEP now runs entirely from Vite/ES Modules and generated JSON at /data/step/content.json.
The build extracts the maintained STEP source material from academy/ into modern JSON without publishing the old runtime files.
Current generated content is validated in CI and includes lessons, models, questions, and listening exercises.
STEP browser progress is scoped per Firebase UID under neonStepProgressV2:<uid>, with one-time migration from the legacy neonStepProgressV1 state when safe.

Zero-Legacy production runtime
------------------------------
The academy/ directory is retained as source material for build-time extraction and historical compatibility work only.
No academy file is copied to dist/legacy in production.
CI fails if any modern page loads /legacy/*.js or a Legacy iframe, or if any file appears under dist/legacy.
Old canonical HTML paths such as /legacy/auth.html and /legacy/coding.html are redirects only.

Build
-----
npm install
npm run build
npm run start

The build validates themes, retired features, modern authentication, modern coding, modern STEP, zero-Legacy runtime, generated exam/coding/STEP content, and the production package.
