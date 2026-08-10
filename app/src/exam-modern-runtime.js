import './exam-modern-runtime.css';

const LEGACY_VISUAL_SOURCES = [
  'exam-visuals.js','exam-visuals-page06-07.js','exam-visuals-page08-09.js','exam-visuals-page10-11.js',
  'exam-visuals-page18-23.js','exam-visuals-page24-29.js','exam-visuals-page30-41.js','exam-visuals-page42-49.js',
  'exam-visuals-video-bank.js','exam-visuals-video-compilations-2026.js',
  'exam-visuals-uploaded-tahsili-math-model8-2026.js','exam-visuals-uploaded-tahsili-math-model12-2026.js'
];

const SUBJECT_TITLES = {
  'tahsili-math': 'رياضيات التحصيلي',
  'tahsili-physics': 'فيزياء التحصيلي',
  'tahsili-chemistry': 'كيمياء التحصيلي',
  'tahsili-biology': 'أحياء التحصيلي'
};

let learningPaths = { subjects: {} };
let activeLesson = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
}

async function readJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: 'force-cache' });
    if (!response.ok) return fallback;
    return await response.json();
  } catch { return fallback; }
}

function installVisualCompatibilityMarkers() {
  for (const file of LEGACY_VISUAL_SOURCES) {
    const absolute = new URL(`/legacy/${file}`, document.baseURI).href;
    if ([...document.scripts].some(script => script.src === absolute)) continue;
    const marker = document.createElement('script');
    marker.type = 'application/json';
    marker.src = `/legacy/${file}`;
    marker.dataset.loaded = 'true';
    marker.dataset.compatibilityMarker = 'modern-visual-json';
    document.head.appendChild(marker);
  }
}

function stateKey() {
  const uid = window.NEON_AUTH_USER?.uid || 'local';
  return `neonExamLessonStateV2:${uid}`;
}

function readState() {
  try {
    const value = JSON.parse(localStorage.getItem(stateKey()) || '{}');
    return { completed: Array.isArray(value.completed) ? value.completed.map(String) : [] };
  } catch { return { completed: [] }; }
}

function saveCompleted(lesson) {
  const state = readState();
  if (!state.completed.includes(String(lesson.id))) state.completed.push(String(lesson.id));
  localStorage.setItem(stateKey(), JSON.stringify(state));
  try {
    Promise.resolve(window.NEON_PROGRESS?.record?.({
      eventType: 'lesson_complete',
      eventKey: `modern-exam-lesson:${lesson.id}`,
      centerId: 'exams',
      itemType: 'lesson',
      itemId: lesson.id,
      title: lesson.title,
      status: 'completed',
      progressPercent: 100,
      masteryScore: 100,
      href: `/exams?subject=${encodeURIComponent(lesson.subject)}`,
      position: { subject: lesson.subject, category: lesson.category || 'general' },
      metadata: { subject: lesson.subject, category: lesson.category || 'general', runtime: 'modern-json' }
    })).catch(() => {});
  } catch { /* Offline local state remains available. */ }
}

function ensureSection() {
  let section = document.getElementById('examModernLearningPath');
  if (section) return section;
  section = document.createElement('section');
  section.id = 'examModernLearningPath';
  section.className = 'modern-learning-path';
  section.hidden = true;
  const setup = document.getElementById('examSetup');
  (setup?.parentElement || document.querySelector('main') || document.body).insertBefore(section, setup?.nextSibling || null);
  return section;
}

function lessonCards(subject, lessons) {
  const completed = new Set(readState().completed);
  return lessons.map((lesson, index) => `
    <article class="modern-lesson-card ${completed.has(String(lesson.id)) ? 'is-complete' : ''}">
      <div class="modern-lesson-index">${String(index + 1).padStart(2, '0')}</div>
      <div class="modern-lesson-copy">
        <small>${escapeHtml(lesson.category && lesson.category !== 'general' ? lesson.category : SUBJECT_TITLES[subject])}</small>
        <h3>${escapeHtml(lesson.title)}</h3>
        <p>${escapeHtml(lesson.summary || 'مراجعة مركزة للمفاهيم الأساسية والأخطاء الشائعة.')}</p>
      </div>
      <div class="modern-lesson-actions">
        ${completed.has(String(lesson.id)) ? '<span class="lesson-complete-badge">✓ تمت المراجعة</span>' : ''}
        <button class="exam-secondary" data-modern-lesson="${escapeHtml(lesson.id)}">فتح الدرس</button>
      </div>
    </article>
  `).join('');
}

function renderSubject(subject) {
  const section = ensureSection();
  const lessons = learningPaths.subjects?.[subject] || [];
  if (!lessons.length) {
    section.hidden = true;
    section.innerHTML = '';
    return;
  }
  const completed = new Set(readState().completed);
  const completedCount = lessons.filter(lesson => completed.has(String(lesson.id))).length;
  section.hidden = false;
  section.dataset.subject = subject;
  section.innerHTML = `
    <div class="modern-learning-head">
      <div>
        <span class="eyebrow">MODERN LEARNING PATH • JSON MODULE</span>
        <h2>مسار مراجعة مهارات ${escapeHtml(SUBJECT_TITLES[subject] || subject)}</h2>
        <p>المحتوى التعليمي أصبح جزءًا من Runtime الحديث: يُحمّل كبيانات JSON عند الطلب، دون تشغيل ملفات Legacy داخل المتصفح.</p>
      </div>
      <div class="modern-learning-progress"><strong>${completedCount.toLocaleString('ar-SA')}/${lessons.length.toLocaleString('ar-SA')}</strong><small>دروس راجعتها</small></div>
    </div>
    <div class="modern-lesson-grid">${lessonCards(subject, lessons)}</div>
  `;
}

function closeModal() {
  document.getElementById('modernLessonModal')?.remove();
  activeLesson = null;
}

function openLesson(lesson) {
  activeLesson = lesson;
  closeModal();
  activeLesson = lesson;
  const modal = document.createElement('div');
  modal.id = 'modernLessonModal';
  modal.className = 'modern-lesson-modal';
  modal.innerHTML = `
    <article class="modern-lesson-modal-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(lesson.title)}">
      <button class="modern-modal-close" data-modern-close aria-label="إغلاق">×</button>
      <span class="eyebrow">MODERN LESSON</span>
      <h2>${escapeHtml(lesson.title)}</h2>
      <p class="modern-lesson-summary">${escapeHtml(lesson.summary || '')}</p>
      <section class="modern-concepts"><h3>المفاهيم الأساسية</h3><ul>${(lesson.concepts || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
      ${(lesson.traps || []).length ? `<section class="modern-traps"><h3>أخطاء شائعة</h3><ul>${lesson.traps.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : ''}
      ${lesson.check ? `<section class="modern-check"><h3>تحقق سريع</h3><p>${escapeHtml(lesson.check.q)}</p><div class="modern-check-options">${lesson.check.options.map((option, index) => `<button data-modern-check="${index}">${escapeHtml(option)}</button>`).join('')}</div><div id="modernCheckFeedback"></div></section>` : ''}
      <div class="modern-modal-actions">
        <button class="exam-primary" data-modern-complete>تمت مراجعة الدرس</button>
        <button class="exam-secondary" data-modern-practice>تدريب مرتبط</button>
      </div>
    </article>
  `;
  document.body.appendChild(modal);
}

function answerCheck(index) {
  if (!activeLesson?.check) return;
  const correct = Number(index) === Number(activeLesson.check.answer);
  document.querySelectorAll('[data-modern-check]').forEach((button, buttonIndex) => {
    button.disabled = true;
    if (buttonIndex === Number(activeLesson.check.answer)) button.classList.add('is-correct');
    else if (buttonIndex === Number(index)) button.classList.add('is-wrong');
  });
  const feedback = document.getElementById('modernCheckFeedback');
  if (feedback) feedback.innerHTML = `<div class="modern-check-feedback ${correct ? 'is-correct' : 'is-wrong'}"><strong>${correct ? 'صحيح ✓' : 'راجع الفكرة'}</strong><p>${escapeHtml(activeLesson.check.explain || '')}</p></div>`;
}

function openPractice(lesson) {
  const category = String(lesson.category || '').trim();
  closeModal();
  if (category && category !== 'general') {
    location.href = `/exams?subject=${encodeURIComponent(lesson.subject)}&skill=${encodeURIComponent(category)}`;
    return;
  }
  const mode = document.getElementById('examMode');
  if (mode) mode.value = 'smart';
  document.getElementById('examSetup')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function installEvents() {
  document.addEventListener('click', event => {
    const subject = event.target.closest('[data-subject]');
    if (subject) queueMicrotask(() => renderSubject(subject.dataset.subject));

    const lessonButton = event.target.closest('[data-modern-lesson]');
    if (lessonButton) {
      const subjectId = ensureSection().dataset.subject;
      const lesson = (learningPaths.subjects?.[subjectId] || []).find(item => String(item.id) === lessonButton.dataset.modernLesson);
      if (lesson) openLesson(lesson);
    }
    if (event.target.closest('[data-modern-close]')) closeModal();
    const check = event.target.closest('[data-modern-check]');
    if (check) answerCheck(Number(check.dataset.modernCheck));
    if (event.target.closest('[data-modern-complete]') && activeLesson) {
      const subjectId = activeLesson.subject;
      saveCompleted(activeLesson);
      closeModal();
      renderSubject(subjectId);
    }
    if (event.target.closest('[data-modern-practice]') && activeLesson) openPractice(activeLesson);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
}

export async function prepareModernExamRuntime() {
  const [visuals, paths] = await Promise.all([
    readJson('/data/exams/visuals.json', {}),
    readJson('/data/exams/learning-paths.json', { subjects: {} })
  ]);
  window.NEON_EXAM_VISUALS = visuals && typeof visuals === 'object' ? visuals : {};
  learningPaths = paths && typeof paths === 'object' ? paths : { subjects: {} };
  installVisualCompatibilityMarkers();
  ensureSection();
  installEvents();
  window.NEON_MODERN_EXAM_RUNTIME = {
    mode: 'json-es-modules',
    visualCount: Object.keys(window.NEON_EXAM_VISUALS).length,
    lessonCount: Number(learningPaths.total || 0)
  };
  window.dispatchEvent(new CustomEvent('neon-modern-exam-runtime-ready', { detail: window.NEON_MODERN_EXAM_RUNTIME }));
  return window.NEON_MODERN_EXAM_RUNTIME;
}
