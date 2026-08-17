NEON Learning Platform
======================

Modern Vite multi-page learning platform with Firebase Authentication, PostgreSQL-backed student/admin services, RBAC, adaptive assessment, modern coding, modern STEP, generated learning data, and auditable release gates.

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
STEP runs entirely from Vite/ES Modules and generated JSON at /data/step/content.json.
The build extracts maintained STEP source material from academy/ into modern JSON without publishing old runtime files.
STEP browser progress is scoped per Firebase UID under neonStepProgressV2:<uid>, with one-time migration from neonStepProgressV1 when safe.

Zero-Legacy production runtime
------------------------------
The academy/ directory is retained as source material for build-time extraction and historical compatibility work only.
No academy file is copied to dist/legacy in production.
CI fails if any modern page loads /legacy/*.js or a Legacy iframe, or if any file appears under dist/legacy.

Release and UAT gates
---------------------
npm run release:gate
npm run uat:gate
npm run rc:prepare

Manual UAT remains a human validation step. Its template is release/manual-uat-template.json.
After 15/15 real PASS results, the approved record is committed as release/manual-uat-signoff.json with the tested SHA, tester, evidence reference, zero Critical/High regressions, and approval time.
Final Merge Gate only runs when that record is added to the PR. It verifies that the only change after the tested SHA is the sign-off record itself, checks Railway on the current PR head, reruns rc:final, and emits the approved release manifest.

Build
-----
npm install
npm run build
npm run start

The build validates themes, retired features, modern authentication, modern coding, modern STEP, zero-Legacy runtime, generated exam/coding/STEP content, and the production package.
