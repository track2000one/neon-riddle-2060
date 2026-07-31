const STEP_KEY = 'neonStepProgressV1';
const TUTOR_HISTORY_KEY = 'neonLocalTutorHistoryV3';
const TUTOR_SETTINGS_KEY = 'neonLocalTutorSettingsV2';

const stepLessonTitles = {
  g1: 'Present Simple & Present Continuous',
  g2: 'Past Simple & Present Perfect',
  g3: 'Future Forms',
  g4: 'Subject–Verb Agreement',
  g5: 'Modal Verbs',
  g6: 'Passive Voice',
  g7: 'Conditionals',
  g8: 'Relative Clauses',
  g9: 'Gerunds & Infinitives',
  g10: 'Articles & Determiners',
  v1: 'Context Clues',
  v2: 'Academic Vocabulary',
  v3: 'Prefixes & Suffixes',
  v4: 'Collocations',
  r1: 'Main Idea',
  r2: 'Details & Evidence',
  r3: 'Inference',
  r4: 'Reference & Purpose',
  l1: 'Listening for Gist',
  l2: 'Listening for Details'
};

const tutorModeTitles = {
  explain: 'جلسة شرح',
  exercise: 'جلسة تدريب',
  plan: 'خطة مذاكرة',
  review: 'مراجعة إجابة',
  code: 'مراجعة كود'
};

const tutorSubjectTitles = {
  general: 'التعلم العام',
  math: 'الرياضيات',
  physics: 'الفيزياء',
  chemistry: 'الكيمياء',
  biology: 'الأحياء',
  english: 'اللغة الإنجليزية',
  arabic: 'اللغة العربية',
  geography: 'الجغرافيا',
  history: 'التاريخ',
  coding: 'البرمجة',
  qudurat: 'القدرات',
  tahsili: 'التحصيلي'
};

function parseJson(value, fallback) {
  try { return JSON.parse(value || '') ?? fallback; }
  catch { return fallback; }
}

function readJson(key, fallback) {
  try { return parseJson(localStorage.getItem(key), fallback); }
  catch { return fallback; }
}

function hashText(value) {
  let hash = 2166136261;
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function emit(event) {
  const record = window.NEON_PROGRESS?.record;
  if (typeof record !== 'function') return;
  Promise.resolve(record(event)).catch(() => {});
}

function attemptFingerprint(attempt) {
  return hashText([
    attempt?.date || '',
    attempt?.score ?? '',
    attempt?.correct ?? '',
    attempt?.total ?? '',
    JSON.stringify(attempt?.answers || [])
  ].join('|'));
}

function stepSkillSummary(answers) {
  const summary = {};
  for (const answer of Array.isArray(answers) ? answers : []) {
    const skill = String(answer?.skill || 'general');
    summary[skill] ||= { correct: 0, total: 0 };
    summary[skill].total += 1;
    if (answer?.correct) summary[skill].correct += 1;
  }
  return summary;
}

function synchronizeStep(previousValue, nextValue) {
  const before = parseJson(previousValue, { completedLessons: [], attempts: [] });
  const after = parseJson(nextValue, { completedLessons: [], attempts: [] });
  const beforeLessons = new Set(Array.isArray(before.completedLessons) ? before.completedLessons : []);

  for (const lessonId of Array.isArray(after.completedLessons) ? after.completedLessons : []) {
    if (beforeLessons.has(lessonId)) continue;
    emit({
      eventType: 'lesson_complete',
      eventKey: `step:lesson:${lessonId}:complete`,
      centerId: 'step',
      itemType: 'lesson',
      itemId: lessonId,
      title: stepLessonTitles[lessonId] || `درس STEP ${lessonId}`,
      status: 'completed',
      progressPercent: 100,
      masteryScore: 100,
      href: '/step#stepAcademy',
      position: { section: 'lessons', lessonId },
      metadata: { skillPath: lessonId.charAt(0), source: STEP_KEY }
    });
  }

  const previousAttempts = Array.isArray(before.attempts) ? before.attempts : [];
  const previousFingerprints = new Set(previousAttempts.map(attemptFingerprint));
  const nextAttempts = Array.isArray(after.attempts) ? after.attempts : [];

  for (const attempt of nextAttempts) {
    const fingerprint = attemptFingerprint(attempt);
    if (previousFingerprints.has(fingerprint)) continue;
    const total = Math.max(0, Number(attempt?.total || 0));
    const correct = Math.max(0, Number(attempt?.correct || 0));
    const score = Math.max(0, Math.min(100, Number(attempt?.score || (total ? Math.round((correct / total) * 100) : 0))));
    const occurredAt = attempt?.date || new Date().toISOString();
    emit({
      eventType: 'step_training_complete',
      eventKey: `step:attempt:${fingerprint}`,
      centerId: 'step',
      itemType: 'assessment',
      itemId: `attempt-${fingerprint}`,
      title: `تدريب STEP — ${total || 'عدة'} سؤالًا`,
      status: 'completed',
      progressPercent: 100,
      masteryScore: score,
      score,
      subjectId: 'english-step',
      correct,
      total,
      href: '/step#stepAcademy',
      position: { section: 'progress' },
      metadata: {
        occurredAt,
        targetScore: Number(after.target || 75),
        skillSummary: stepSkillSummary(attempt?.answers),
        source: STEP_KEY
      },
      details: { answers: Array.isArray(attempt?.answers) ? attempt.answers.slice(0, 120) : [] }
    });
  }
}

function tutorMessageFingerprint(item, index) {
  return hashText(`${item?.role || ''}|${item?.time || ''}|${item?.text || ''}|${index}`);
}

function synchronizeTutor(previousValue, nextValue) {
  const before = parseJson(previousValue, []);
  const after = parseJson(nextValue, []);
  if (!Array.isArray(after) || after.length === 0) return;

  const previousFingerprints = new Set(
    (Array.isArray(before) ? before : []).map((item, index) => tutorMessageFingerprint(item, index))
  );
  const settings = readJson(TUTOR_SETTINGS_KEY, {});

  after.forEach((item, index) => {
    if (item?.role !== 'assistant') return;
    const fingerprint = tutorMessageFingerprint(item, index);
    if (previousFingerprints.has(fingerprint)) return;

    let prompt = null;
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (after[cursor]?.role === 'user') {
        prompt = after[cursor];
        break;
      }
    }

    const mode = String(settings.mode || 'explain');
    const subject = String(settings.subject || 'general');
    const level = String(settings.level || 'practice');
    emit({
      eventType: 'activity',
      eventKey: `tutor:exchange:${fingerprint}`,
      centerId: 'tutor',
      itemType: 'session',
      itemId: `exchange-${fingerprint}`,
      title: `${tutorModeTitles[mode] || 'جلسة تعليمية'} — ${tutorSubjectTitles[subject] || subject}`,
      status: 'completed',
      progressPercent: 100,
      masteryScore: 0,
      href: '/tutor',
      position: { mode, subject, level },
      metadata: {
        mode,
        subject,
        level,
        promptLength: String(prompt?.text || '').length,
        responseLength: String(item?.text || '').length,
        source: TUTOR_HISTORY_KEY
      }
    });
  });
}

function installIntegrations() {
  if (window.__NEON_PROGRESS_INTEGRATIONS__) return;
  window.__NEON_PROGRESS_INTEGRATIONS__ = true;

  const trackedKeys = new Set([STEP_KEY, TUTOR_HISTORY_KEY]);
  const previousSetItem = Storage.prototype.setItem;

  Storage.prototype.setItem = function integratedSetItem(key, value) {
    const normalizedKey = String(key);
    const tracked = this === localStorage && trackedKeys.has(normalizedKey);
    const previousValue = tracked ? this.getItem(normalizedKey) : null;
    previousSetItem.call(this, key, value);
    if (!tracked || previousValue === String(value)) return;

    queueMicrotask(() => {
      try {
        if (normalizedKey === STEP_KEY) synchronizeStep(previousValue, String(value));
        if (normalizedKey === TUTOR_HISTORY_KEY) synchronizeTutor(previousValue, String(value));
      } catch (error) {
        console.warn('NEON progress integration:', error);
      }
    });
  };
}

installIntegrations();
