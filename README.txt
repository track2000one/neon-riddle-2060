NEON Academy 2060
=================

Modern Vite multi-page learning platform with Firebase Authentication, PostgreSQL-backed student state, readiness diagnostics, RBAC administration, and a compiled exam bank.

Primary routes
--------------
/              Main learning portal
/auth          Modern Firebase login, registration, password recovery, account isolation and platform access validation
/step          STEP learning
/exams         Qudurat/Tahsili exam center
/games         Learning games
/kids-games    Children games
/learning      Learning library
/coding        Coding center (transition wrapper)
/trust         Quality and transparency
/admin         Secured administration dashboard

Legacy compatibility
--------------------
Legacy content is still copied into /legacy while migration continues. User-facing legacy routes redirect to canonical modern routes. /legacy/auth.html redirects to /auth and preserves the next query parameter. The coding center still uses an embedded legacy implementation during its transition.

Tutor/Gemini
------------
The retired Tutor/Gemini runtime has been removed. /tutor redirects to the home page and old Tutor API clients receive FEATURE_RETIRED.

Build
-----
npm run build
npm run start
