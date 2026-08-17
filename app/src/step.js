import './styles.css';
import './step.css';
import { ensureAuth, renderAccount } from './auth.js';

const LEGACY_PROGRESS_KEY = 'neonStepProgressV1';
const STATE_VERSION = 2;
const root = document.getElementById('stepRoot');
const overlay = document.getElementById('bootOverlay');
const statusElement = document.getElementById('loadStatus');
const progressElement = document.getElementById('loadProgress');

let content = null;
let session = null;
let state = null;
let stateKey = '';
let activeSkill = 'all';
let lessonSearch = '';
let currentQuiz = null;
let quizTimer = null;

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

function setProgress(percent, message) {
  if (progressElement) progressElement.style.width = `${percent}%`;
  if (statusElement) statusElement.textContent = message;
}

function freshState() {
  return { version: STATE_VERSION, completedLessons: [], attempts: [], modelBest: {}, bookmarks: [], migratedFromLegacy: false, updatedAt: null };
}

function normalizeState(value) {
  const next = { ...freshState(), ...(value && typeof value === 'object' ? value : {}) };
  next.version = STATE_VERSION;
  next.completedLessons = Array.isArray(next.completedLessons) ? [...new Set(next.completedLessons.map(String))] : [];
  next.attempts = Array.isArray(next.attempts) ? next.attempts.slice(-80) : [];
  next.modelBest = next.modelBest && typeof next.modelBest === 'object' ? next.modelBest : {};
  next.bookmarks = Array.isArray(next.bookmarks) ? [...new Set(next.bookmarks.map(String))] : [];
  return next;
}

function migrateLegacyState() {
  if (localStorage.getItem(stateKey)) return null;
  let legacy = null;
  try { legacy = JSON.parse(localStorage.getItem(LEGACY_PROGRESS_KEY) || 'null'); } catch {}
  if (!legacy || typeof legacy !== 'object') return null;

  const migrated = freshState();
  migrated.migratedFromLegacy = true;
  migrated.completedLessons = [...new Set([
    ...(Array.isArray(legacy.completedLessons) ? legacy.completedLessons : []),
    ...(Array.isArray(legacy.mastery?.completedLessons) ? legacy.mastery.completedLessons : []),
    ...(Array.isArray(legacy.book1?.completedLessons) ? legacy.book1.completedLessons : [])
  ].map(String))];
  migrated.attempts = [
    ...(Array.isArray(legacy.attempts) ? legacy.attempts : []),
    ...(Array.isArray(legacy.mastery?.attempts) ? legacy.mastery.attempts : []),
    ...(Array.isArray(legacy.book1?.attempts) ? legacy.book1.attempts : [])
  ].slice(-80);
  migrated.modelBest = {
    ...(legacy.book1?.modelBest && typeof legacy.book1.modelBest === 'object' ? legacy.book1.modelBest : {}),
    ...(legacy.mastery?.modelBest && typeof legacy.mastery.modelBest === 'object' ? legacy.mastery.modelBest : {})
  };
  migrated.bookmarks = Array.isArray(legacy.mastery?.bookmarks) ? legacy.mastery.bookmarks.map(String) : [];
  return normalizeState(migrated);
}

function loadState(uid) {
  stateKey = `neonStepProgressV2:${uid}`;
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem(stateKey) || 'null'); } catch {}
  state = normalizeState(stored || migrateLegacyState() || freshState());
  saveState();
}

function saveState() {
  if (!stateKey || !state) return;
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(stateKey, JSON.stringify(state));
}

function percent(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

function completionRate() {
  return percent(state.completedLessons.length, content.lessons.length);
}

function skillTitle(id) {
  return content.skills?.[id] || id || 'عام';
}

function levelTitle(level) {
  return ({ foundation:'تأسيسي', practice:'تطبيقي', mastery:'إتقان' })[level] || level || 'تطبيقي';
}

function isLessonComplete(id) {
  return state.completedLessons.includes(String(id));
}

function markLessonComplete(id) {
  const key = String(id);
  if (!state.completedLessons.includes(key)) state.completedLessons.push(key);
  saveState();
  renderOverviewStats();
  renderLessons();
}

function renderOverviewStats() {
  const completed = state.completedLessons.length;
  document.getElementById('stepCompletedValue')?.replaceChildren(document.createTextNode(String(completed)));
  document.getElementById('stepProgressValue')?.replaceChildren(document.createTextNode(`${completionRate()}%`));
  const bar = document.getElementById('stepMainProgress');
  if (bar) bar.style.width = `${completionRate()}%`;
}

function renderShell() {
  root.innerHTML = `
    <div class="step-modern" data-modern-step-center="true">
      <section class="step-hero">
        <div class="step-hero-grid">
          <div>
            <span class="step-eyebrow">MODERN STEP CENTER • ES MODULES</span>
            <h1>اللغة الإنجليزية STEP</h1>
            <p>مسار متكامل للدروس والقواعد والقراءة والمفردات والاستماع والنماذج التدريبية. المحتوى يعمل الآن من بيانات JSON حديثة دون تشغيل أي Runtime قديم.</p>
            <div class="step-progress-card">
              <strong>تقدم الدروس: <span id="stepProgressValue">${completionRate()}%</span></strong>
              <div class="step-progress-track"><span id="stepMainProgress" style="width:${completionRate()}%"></span></div>
            </div>
          </div>
          <div class="step-stats">
            <div class="step-stat"><small>الدروس</small><strong>${content.counts.lessons}</strong></div>
            <div class="step-stat"><small>الأسئلة</small><strong>${content.counts.questions}</strong></div>
            <div class="step-stat"><small>النماذج</small><strong>${content.counts.models}</strong></div>
            <div class="step-stat"><small>المكتمل</small><strong id="stepCompletedValue">${state.completedLessons.length}</strong></div>
          </div>
        </div>
      </section>

      <nav class="step-tabs" aria-label="أقسام STEP">
        <button class="step-tab active" data-step-tab="lessons">الدروس</button>
        <button class="step-tab" data-step-tab="practice">تدريب ذكي</button>
        <button class="step-tab" data-step-tab="models">النماذج</button>
        <button class="step-tab" data-step-tab="listening">الاستماع</button>
        <button class="step-tab" data-step-tab="progress">التقدم</button>
      </nav>

      <section class="step-panel active" data-step-panel="lessons"><div id="stepLessons"></div></section>
      <section class="step-panel" data-step-panel="practice"><div id="stepPractice"></div></section>
      <section class="step-panel" data-step-panel="models"><div id="stepModels"></div></section>
      <section class="step-panel" data-step-panel="listening"><div id="stepListening"></div></section>
      <section class="step-panel" data-step-panel="progress"><div id="stepProgressPanel"></div></section>
    </div>`;

  document.querySelectorAll('[data-step-tab]').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.stepTab)));
  renderLessons();
  renderPracticeHome();
  renderModels();
  renderListening();
  renderProgress();
}

function switchTab(tab) {
  stopTimer();
  document.querySelectorAll('[data-step-tab]').forEach(button => button.classList.toggle('active', button.dataset.stepTab === tab));
  document.querySelectorAll('[data-step-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.stepPanel === tab));
  if (tab === 'progress') renderProgress();
}

function lessonMatches(lesson) {
  if (activeSkill !== 'all' && String(lesson.skill || lesson.unit) !== activeSkill) return false;
  if (!lessonSearch) return true;
  const haystack = `${lesson.title || ''} ${lesson.arTitle || ''} ${lesson.summary || ''} ${lesson.rule || ''}`.toLowerCase();
  return haystack.includes(lessonSearch.toLowerCase());
}

function renderLessons() {
  const host = document.getElementById('stepLessons');
  if (!host) return;
  const lessons = content.lessons.filter(lessonMatches);
  host.innerHTML = `
    <div class="step-toolbar">
      <input id="stepLessonSearch" type="search" placeholder="ابحث في الدروس والقواعد…" value="${esc(lessonSearch)}" />
    </div>
    <div class="step-skill-pills">
      <button class="step-pill ${activeSkill === 'all' ? 'active' : ''}" data-step-skill="all">الكل</button>
      ${Object.entries(content.skills).map(([id,title]) => `<button class="step-pill ${activeSkill === id ? 'active' : ''}" data-step-skill="${esc(id)}">${esc(title)}</button>`).join('')}
    </div>
    <div class="step-grid">
      ${lessons.map(lesson => `
        <article class="step-card ${isLessonComplete(lesson.id) ? 'done' : ''}">
          <small>${esc(skillTitle(lesson.skill || lesson.unit))} • ${esc(levelTitle(lesson.level))}</small>
          <h3>${esc(lesson.arTitle || lesson.title)}</h3>
          <p>${esc(lesson.summary || '')}</p>
          <div class="step-actions">
            <button class="step-btn" data-open-lesson="${esc(lesson.id)}">فتح الدرس</button>
            ${isLessonComplete(lesson.id) ? '<button class="step-btn secondary" disabled>✓ مكتمل</button>' : ''}
          </div>
        </article>`).join('') || '<div class="step-empty">لا توجد دروس مطابقة للبحث.</div>'}
    </div>`;

  host.querySelector('#stepLessonSearch')?.addEventListener('input', event => { lessonSearch = event.target.value.trim(); renderLessons(); });
  host.querySelectorAll('[data-step-skill]').forEach(button => button.addEventListener('click', () => { activeSkill = button.dataset.stepSkill; renderLessons(); }));
  host.querySelectorAll('[data-open-lesson]').forEach(button => button.addEventListener('click', () => openLesson(button.dataset.openLesson)));
}

function openLesson(id) {
  const lesson = content.lessons.find(item => String(item.id) === String(id));
  if (!lesson) return;
  closeModal();
  const check = lesson.check;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="step-modal" id="stepModal" role="dialog" aria-modal="true">
      <div class="step-modal-card">
        <button class="step-modal-close" id="stepModalClose" aria-label="إغلاق">×</button>
        <span class="step-eyebrow">${esc(skillTitle(lesson.skill || lesson.unit))} • ${esc(levelTitle(lesson.level))}</span>
        <h2>${esc(lesson.arTitle || lesson.title)}</h2>
        <p>${esc(lesson.summary || '')}</p>
        ${lesson.rule ? `<h3>القاعدة</h3><div class="step-rule">${esc(lesson.rule)}</div>` : ''}
        ${Array.isArray(lesson.examples) && lesson.examples.length ? `<h3>أمثلة</h3><ul class="step-list" dir="ltr">${lesson.examples.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}
        ${Array.isArray(lesson.traps) && lesson.traps.length ? `<h3>أخطاء شائعة</h3><ul class="step-list">${lesson.traps.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}
        ${check?.q ? `<div class="step-check"><strong>تحقق سريع</strong><p class="step-question">${esc(check.q)}</p><div class="step-options">${(check.options || []).map((option,index) => `<button class="step-option" data-lesson-answer="${index}">${esc(option)}</button>`).join('')}</div><div id="stepLessonExplain"></div></div>` : ''}
        <div class="step-actions" style="margin-top:16px"><button class="step-btn" id="stepCompleteLesson">${isLessonComplete(lesson.id) ? '✓ الدرس مكتمل' : 'إكمال الدرس'}</button></div>
      </div>
    </div>`);
  document.getElementById('stepModalClose')?.addEventListener('click', closeModal);
  document.getElementById('stepModal')?.addEventListener('click', event => { if (event.target.id === 'stepModal') closeModal(); });
  document.getElementById('stepCompleteLesson')?.addEventListener('click', () => { markLessonComplete(lesson.id); closeModal(); });
  document.querySelectorAll('[data-lesson-answer]').forEach(button => button.addEventListener('click', () => {
    const chosen = Number(button.dataset.lessonAnswer);
    document.querySelectorAll('[data-lesson-answer]').forEach((option,index) => {
      option.disabled = true;
      option.classList.toggle('correct', index === Number(check.answer));
      option.classList.toggle('wrong', index === chosen && chosen !== Number(check.answer));
    });
    const explain = document.getElementById('stepLessonExplain');
    if (explain) explain.innerHTML = `<div class="step-explain">${esc(check.explain || '')}</div>`;
  }));
}

function closeModal() {
  document.getElementById('stepModal')?.remove();
}

function renderPracticeHome() {
  const host = document.getElementById('stepPractice');
  if (!host) return;
  host.innerHTML = `
    <div class="step-quiz">
      <span class="step-eyebrow">SMART PRACTICE</span>
      <h2>تدريب مركّز حسب المهارة</h2>
      <p>اختر المهارة وعدد الأسئلة. الأسئلة تُسحب من بنك STEP الحديث دون تكرار داخل الجلسة.</p>
      <div class="step-toolbar">
        <select id="practiceSkill"><option value="all">جميع المهارات</option>${Object.entries(content.skills).map(([id,title]) => `<option value="${esc(id)}">${esc(title)}</option>`).join('')}</select>
        <select id="practiceCount"><option value="10">10 أسئلة</option><option value="20">20 سؤالًا</option><option value="30">30 سؤالًا</option></select>
        <button class="step-btn" id="startPractice">ابدأ التدريب</button>
      </div>
    </div>`;
  document.getElementById('startPractice')?.addEventListener('click', () => {
    const skill = document.getElementById('practiceSkill').value;
    const count = Number(document.getElementById('practiceCount').value || 10);
    const pool = content.questions.filter(question => skill === 'all' || question.skill === skill);
    startQuiz(shuffle(pool).slice(0, Math.min(count, pool.length)), { type:'practice', title: skill === 'all' ? 'تدريب STEP شامل' : `تدريب ${skillTitle(skill)}`, hostId:'stepPractice' });
  });
}

function renderModels() {
  const host = document.getElementById('stepModels');
  if (!host) return;
  host.innerHTML = `<div class="step-grid">${content.models.map(model => {
    const best = Number(state.modelBest?.[model.id] || 0);
    return `<article class="step-card"><div class="step-model-meta"><span>${model.questionCount} سؤالًا</span><span>${model.minutes} دقيقة</span></div><h3>${esc(model.title)}</h3><p>نموذج كامل يحفظ أفضل نتيجة للحساب الحالي.</p><p><strong>أفضل نتيجة:</strong> ${best ? `${best}%` : 'لم يُختبر بعد'}</p><div class="step-actions"><button class="step-btn" data-step-model="${esc(model.id)}">ابدأ النموذج</button></div></article>`;
  }).join('')}</div>`;
  host.querySelectorAll('[data-step-model]').forEach(button => button.addEventListener('click', () => {
    const model = content.models.find(item => item.id === button.dataset.stepModel);
    if (model) startQuiz(model.questions, { type:'model', title:model.title, modelId:model.id, minutes:model.minutes, hostId:'stepModels' });
  }));
}

function renderListening() {
  const host = document.getElementById('stepListening');
  if (!host) return;
  host.innerHTML = `
    <div class="step-listening-note"><strong>ملاحظة:</strong> التسجيلات الأصلية للأقسام الثلاثة غير متاحة ضمن المصدر. التدريبات التفاعلية أدناه تحتوي نصوصًا تعليمية، ويمكن استخدام النطق الآلي في المتصفح كمساعدة تدريبية فقط، وليس بوصفه التسجيل الأصلي للاختبار.</div>
    <div class="step-grid">
      ${(content.listening.sets || []).map(set => `<article class="step-card"><small>${esc(set.questionRange || '')}</small><h3>${esc(set.title)}</h3><p>${esc(set.note || 'التسجيل الأصلي غير متاح.')}</p><div class="step-model-meta"><span>${esc(set.status || '')}</span><span>${Number(set.minutes || 0)} دقيقة</span></div></article>`).join('')}
      <article class="step-card"><small>تدريب تفاعلي</small><h3>تمارين الاستماع المساندة</h3><p>${content.listening.exercises.length} تمارين تحتوي نصوصًا قابلة للنطق الآلي.</p><div class="step-actions"><button class="step-btn" id="startListeningPractice">ابدأ التمارين</button></div></article>
    </div>`;
  document.getElementById('startListeningPractice')?.addEventListener('click', () => startQuiz(content.listening.exercises, { type:'listening', title:'تدريب الاستماع المساند', hostId:'stepListening', speech:true }));
}

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function stopTimer() {
  if (quizTimer) clearInterval(quizTimer);
  quizTimer = null;
}

function startQuiz(questions, options) {
  stopTimer();
  const usable = questions.filter(question => question?.q && Array.isArray(question.options) && question.options.length >= 2);
  if (!usable.length) return;
  currentQuiz = { questions: usable, index:0, correct:0, answers:[], startedAt:Date.now(), ...options, remainingSeconds: options.minutes ? Math.max(60, Math.round(options.minutes * 60)) : null };
  renderQuizQuestion();
  if (currentQuiz.remainingSeconds) {
    quizTimer = setInterval(() => {
      currentQuiz.remainingSeconds -= 1;
      const timer = document.getElementById('stepQuizTimer');
      if (timer) timer.textContent = formatTime(currentQuiz.remainingSeconds);
      if (currentQuiz.remainingSeconds <= 0) finishQuiz();
    }, 1000);
  }
}

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds || 0));
  return `${String(Math.floor(safe / 60)).padStart(2,'0')}:${String(safe % 60).padStart(2,'0')}`;
}

function renderQuizQuestion() {
  const quiz = currentQuiz;
  if (!quiz) return;
  const host = document.getElementById(quiz.hostId);
  const question = quiz.questions[quiz.index];
  if (!host || !question) return finishQuiz();
  host.innerHTML = `
    <div class="step-quiz">
      <div class="step-quiz-head"><div><strong>${esc(quiz.title)}</strong><div class="step-quiz-meta">السؤال ${quiz.index + 1} من ${quiz.questions.length}</div></div>${quiz.remainingSeconds !== null ? `<strong id="stepQuizTimer">${formatTime(quiz.remainingSeconds)}</strong>` : ''}</div>
      ${question.passage ? `<div class="step-passage">${esc(question.passage)}</div>` : ''}
      ${quiz.speech && question.audio ? `<div class="step-tts">${esc(question.audio)}</div><div class="step-actions" style="margin:10px 0"><button class="step-btn secondary" id="stepSpeak">🔊 نطق آلي مساعد</button></div>` : ''}
      <div class="step-question">${esc(question.q)}</div>
      <div class="step-options">${question.options.map((option,index) => `<button class="step-option" data-quiz-answer="${index}">${esc(option)}</button>`).join('')}</div>
      <div id="stepQuizExplain"></div>
      <div class="step-actions" style="margin-top:14px"><button class="step-btn" id="stepQuizNext" disabled>${quiz.index + 1 === quiz.questions.length ? 'إنهاء' : 'التالي'}</button><button class="step-btn secondary" id="stepQuizExit">إنهاء الجلسة</button></div>
    </div>`;
  document.getElementById('stepQuizExit')?.addEventListener('click', finishQuiz);
  document.getElementById('stepSpeak')?.addEventListener('click', () => speak(question.audio));
  host.querySelectorAll('[data-quiz-answer]').forEach(button => button.addEventListener('click', () => answerQuiz(Number(button.dataset.quizAnswer))));
  document.getElementById('stepQuizNext')?.addEventListener('click', () => {
    currentQuiz.index += 1;
    if (currentQuiz.index >= currentQuiz.questions.length) finishQuiz(); else renderQuizQuestion();
  });
}

function answerQuiz(chosen) {
  const quiz = currentQuiz;
  if (!quiz || quiz.answers.some(answer => answer.index === quiz.index)) return;
  const question = quiz.questions[quiz.index];
  const correct = chosen === Number(question.answer);
  if (correct) quiz.correct += 1;
  quiz.answers.push({ index:quiz.index, id:question.id, skill:question.skill, topic:question.topic, chosen, answer:Number(question.answer), correct });
  document.querySelectorAll('[data-quiz-answer]').forEach((button,index) => {
    button.disabled = true;
    button.classList.toggle('correct', index === Number(question.answer));
    button.classList.toggle('wrong', index === chosen && !correct);
  });
  const explain = document.getElementById('stepQuizExplain');
  if (explain) explain.innerHTML = `<div class="step-explain">${esc(question.explain || '')}</div>`;
  const next = document.getElementById('stepQuizNext');
  if (next) next.disabled = false;
}

function speak(text) {
  if (!('speechSynthesis' in window) || !text) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(text));
  utterance.lang = 'en-US';
  utterance.rate = .9;
  speechSynthesis.speak(utterance);
}

function finishQuiz() {
  if (!currentQuiz) return;
  stopTimer();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  const quiz = currentQuiz;
  const answered = quiz.answers.length;
  const score = percent(quiz.correct, quiz.questions.length);
  const durationSeconds = Math.max(1, Math.round((Date.now() - quiz.startedAt) / 1000));
  const attempt = { id:`step-${Date.now()}`, type:quiz.type, title:quiz.title, modelId:quiz.modelId || null, score, correct:quiz.correct, total:quiz.questions.length, answered, durationSeconds, answers:quiz.answers, createdAt:new Date().toISOString() };
  state.attempts.push(attempt);
  state.attempts = state.attempts.slice(-80);
  if (quiz.modelId) state.modelBest[quiz.modelId] = Math.max(Number(state.modelBest[quiz.modelId] || 0), score);
  saveState();
  const host = document.getElementById(quiz.hostId);
  if (host) host.innerHTML = `<div class="step-quiz step-result"><span class="step-eyebrow">RESULT</span><h2>${esc(quiz.title)}</h2><strong>${score}%</strong><p>${quiz.correct} صحيحة من ${quiz.questions.length} • أُجيب عن ${answered}</p><div class="step-actions" style="justify-content:center"><button class="step-btn" id="stepResultHome">العودة</button></div></div>`;
  document.getElementById('stepResultHome')?.addEventListener('click', () => {
    if (quiz.hostId === 'stepPractice') renderPracticeHome();
    else if (quiz.hostId === 'stepModels') renderModels();
    else renderListening();
  });
  currentQuiz = null;
}

function renderProgress() {
  const host = document.getElementById('stepProgressPanel');
  if (!host) return;
  const attempts = [...state.attempts].reverse();
  const best = attempts.length ? Math.max(...attempts.map(item => Number(item.score || 0))) : 0;
  const average = attempts.length ? Math.round(attempts.reduce((sum,item) => sum + Number(item.score || 0), 0) / attempts.length) : 0;
  host.innerHTML = `
    <div class="step-stats" style="margin-bottom:16px"><div class="step-stat"><small>الدروس المكتملة</small><strong>${state.completedLessons.length}</strong></div><div class="step-stat"><small>الجلسات</small><strong>${attempts.length}</strong></div><div class="step-stat"><small>المتوسط</small><strong>${average}%</strong></div><div class="step-stat"><small>أفضل نتيجة</small><strong>${best}%</strong></div></div>
    <div class="step-history">${attempts.slice(0,20).map(item => `<div class="step-history-row"><div><strong>${esc(item.title || 'جلسة STEP')}</strong><small style="display:block;color:#98a9c8">${esc(new Date(item.createdAt || Date.now()).toLocaleString('ar-SA'))}</small></div><strong>${Number(item.score || 0)}%</strong></div>`).join('') || '<div class="step-empty">لا توجد جلسات مسجلة لهذا الحساب حتى الآن.</div>'}</div>`;
}

async function boot() {
  try {
    setProgress(12, 'جارٍ التحقق من حساب الطالب…');
    session = await ensureAuth();
    renderAccount(session);
    loadState(session.user.uid);

    setProgress(42, 'جارٍ تحميل محتوى STEP الحديث…');
    const response = await fetch('/data/step/content.json', { cache:'no-cache' });
    if (!response.ok) throw new Error(`STEP_CONTENT_HTTP_${response.status}`);
    content = await response.json();
    if (!content?.counts?.lessons || !Array.isArray(content.questions)) throw new Error('STEP_CONTENT_INVALID');

    setProgress(80, 'جارٍ تجهيز مسارك الشخصي…');
    renderShell();
    setProgress(100, 'اكتمل تجهيز مركز STEP.');
    overlay?.classList.add('hidden');
    document.getElementById('stepIntro')?.remove();
    window.dispatchEvent(new CustomEvent('neon-step-modern-ready', { detail:{ counts:content.counts, uid:session.user.uid } }));
  } catch (error) {
    console.error('NEON STEP modern boot error:', error);
    overlay?.classList.add('hidden');
    setProgress(100, 'تعذر فتح المسار بالكامل.');
    if (root) root.innerHTML = `<section class="center-intro"><h2>تعذر تحميل مركز STEP</h2><p>تعذر تجهيز البيانات الحديثة حاليًا. أعد المحاولة.</p><p><button onclick="location.reload()">إعادة المحاولة</button> أو <a href="/">العودة إلى المراكز</a>.</p></section>`;
  }
}

boot();
