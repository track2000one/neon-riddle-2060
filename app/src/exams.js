import './styles.css';
import { ensureAuth, renderAccount } from './auth.js';
import { ExamMasteryController } from './exam-mastery.js';

const subjectMeta = {
  'tahsili-math': { title: 'رياضيات التحصيلي', family: 'التحصيلي العلمي', icon: '∑', description: 'الجبر والدوال والهندسة والإحصاء والتفاضل.' },
  'tahsili-physics': { title: 'فيزياء التحصيلي', family: 'التحصيلي العلمي', icon: '⚛', description: 'الميكانيكا والطاقة والكهرباء والموجات.' },
  'tahsili-chemistry': { title: 'كيمياء التحصيلي', family: 'التحصيلي العلمي', icon: '🧪', description: 'الذرة والروابط والمحاليل والكيمياء العضوية.' },
  'tahsili-biology': { title: 'أحياء التحصيلي', family: 'التحصيلي العلمي', icon: '🧬', description: 'الخلية والوراثة وأجهزة الجسم والبيئة.' },
  'qudurat-verbal': { title: 'القدرات اللفظية', family: 'اختبار القدرات', icon: 'ض', description: 'التناظر وإكمال الجمل والمفردات واستيعاب المقروء.' },
  'qudurat-quant': { title: 'القدرات الكمية', family: 'اختبار القدرات', icon: 'ك', description: 'الحساب والنسب والجبر والهندسة والاحتمال.' }
};

const categoryMeta = {
  algebra: 'الجبر', functions: 'الدوال', geometry: 'الهندسة', 'analytic-geometry': 'الهندسة التحليلية',
  transformations: 'التحويلات', conics: 'القطوع المخروطية', probability: 'الاحتمالات', statistics: 'الإحصاء',
  calculus: 'التفاضل', sequences: 'المتتابعات', trigonometry: 'المثلثات', matrices: 'المصفوفات',
  motion: 'الحركة', projectiles: 'المقذوفات', energy: 'الطاقة', momentum: 'الزخم', rotation: 'الدوران',
  equilibrium: 'الاتزان', waves: 'الموجات', sound: 'الصوت', optics: 'البصريات', electricity: 'الكهرباء',
  circuits: 'الدوائر', magnetism: 'المغناطيسية', modern: 'الفيزياء الحديثة', measurement: 'القياس',
  matter: 'المادة', atomic: 'الذرة', nuclear: 'النواة', periodic: 'الجدول الدوري', bonding: 'الروابط',
  reactions: 'التفاعلات', stoichiometry: 'الحسابات الكيميائية', gases: 'الغازات', liquids: 'السوائل',
  genetics: 'الوراثة', ecology: 'البيئة', cells: 'الخلايا', plants: 'النبات', animals: 'الحيوان',
  microbiology: 'الأحياء الدقيقة', anatomy: 'أجهزة الجسم'
};

const visualScripts = [
  'exam-visuals.js','exam-visuals-page06-07.js','exam-visuals-page08-09.js','exam-visuals-page10-11.js','exam-visuals-page18-23.js','exam-visuals-page24-29.js','exam-visuals-page30-41.js','exam-visuals-page42-49.js','exam-visuals-video-bank.js','exam-visuals-video-compilations-2026.js','exam-visuals-uploaded-tahsili-math-model8-2026.js','exam-visuals-uploaded-tahsili-math-model12-2026.js'
];

const memoryBanks = new Map();
const masteryControllers = new Map();
const masteryLoads = new Map();
let manifest;
let selectedSubject;
let session;
let timer;
let visualsReady;
let lastExamConfig;
let lastFocusIds = [];

const subjectsElement = document.getElementById('examSubjects');
const setupElement = document.getElementById('examSetup');
const runnerElement = document.getElementById('examRunner');
const overlay = document.getElementById('bootOverlay');
const masteryDashboard = document.getElementById('masteryDashboard');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
}

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function categoryTitle(question) {
  const category = String(question?.category || '').trim();
  return categoryMeta[category] || category.replace(/[-_]+/g, ' ') || 'مهارات عامة';
}

function loadClassicScript(src) {
  return new Promise((resolve, reject) => {
    const absolute = new URL(src, document.baseURI).href;
    const existing = [...document.scripts].find(script => script.src === absolute);
    if (existing?.dataset.loaded === 'true') return resolve();
    const script = existing || document.createElement('script');
    script.src = absolute;
    script.async = false;
    script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
    script.onerror = () => reject(new Error(`تعذر تحميل ${src}`));
    if (!existing) document.body.appendChild(script);
  });
}

async function ensureVisuals() {
  if (visualsReady) return visualsReady;
  visualsReady = (async () => {
    for (const file of visualScripts) await loadClassicScript(`/legacy/${file}`);
    return window.NEON_EXAM_VISUALS || {};
  })();
  return visualsReady;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return resolve(null);
    const request = indexedDB.open('neon-exam-banks-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('banks');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCachedBank(key) {
  try {
    const database = await openDatabase();
    if (!database) return null;
    return await new Promise((resolve, reject) => {
      const request = database.transaction('banks').objectStore('banks').get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch { return null; }
}

async function cacheBank(key, value) {
  try {
    const database = await openDatabase();
    if (!database) return;
    await new Promise((resolve, reject) => {
      const request = database.transaction('banks', 'readwrite').objectStore('banks').put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch { /* Browser cache remains available. */ }
}

async function loadSubject(subject) {
  if (memoryBanks.has(subject)) return memoryBanks.get(subject);
  const entry = manifest.subjects[subject];
  if (!entry) throw new Error('ملف المادة غير موجود في الفهرس.');
  const cacheKey = `${manifest.version}:${subject}`;
  const cached = await getCachedBank(cacheKey);
  if (Array.isArray(cached)) {
    memoryBanks.set(subject, cached);
    return cached;
  }

  const response = await fetch(`/data/exams/${entry.file}`, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`تعذر تحميل أسئلة ${subjectMeta[subject]?.title || subject}.`);
  const questions = await response.json();
  memoryBanks.set(subject, questions);
  cacheBank(cacheKey, questions);
  return questions;
}

async function prepareMastery(subject) {
  if (masteryControllers.has(subject)) return masteryControllers.get(subject);
  if (masteryLoads.has(subject)) return masteryLoads.get(subject);
  const load = (async () => {
    const questions = await loadSubject(subject);
    const controller = new ExamMasteryController(subject, questions);
    await controller.load();
    masteryControllers.set(subject, controller);
    masteryLoads.delete(subject);
    return controller;
  })().catch(error => {
    masteryLoads.delete(subject);
    throw error;
  });
  masteryLoads.set(subject, load);
  return load;
}

function renderSubjects() {
  subjectsElement.innerHTML = Object.entries(manifest.subjects).map(([subject, entry]) => {
    const meta = subjectMeta[subject] || { title: subject, family: 'اختبارات', icon: '🎯', description: 'تدريب مخصص.' };
    return `
      <button class="exam-subject" data-subject="${escapeHtml(subject)}">
        <span class="exam-subject-icon">${escapeHtml(meta.icon)}</span>
        <small>${escapeHtml(meta.family)}</small>
        <strong>${escapeHtml(meta.title)}</strong>
        <p>${escapeHtml(meta.description)}</p>
        <b>${Number(entry.count).toLocaleString('ar-SA')} سؤال</b>
      </button>
    `;
  }).join('');
}

function masteryGuidance(stats) {
  if (stats.review || stats.reinforcing) return `لديك ${stats.review + stats.reinforcing} سؤالًا يحتاج مراجعة أو تثبيت. ابدأ بها قبل الأسئلة الجديدة.`;
  if (stats.mastered === stats.total && stats.total) return 'أتممت إتقان جميع الأسئلة المتاحة. يمكنك مراجعة المتقن أو بدء محاكاة شاملة.';
  if (stats.practiced) return 'استمر في المزيج الذكي؛ ستختفي الأسئلة تلقائيًا بعد إجابتين صحيحتين متتاليتين.';
  return 'ابدأ بالمزيج الذكي. ستتعرف المنصة على نقاط الضعف وتعيدها لك تلقائيًا.';
}

function renderMasteryDashboard(controller) {
  if (!masteryDashboard || selectedSubject !== controller.subjectId) return;
  const stats = controller.summary();
  masteryDashboard.hidden = false;
  masteryDashboard.innerHTML = `
    <div class="mastery-overview-head">
      <div>
        <span class="eyebrow">ADAPTIVE MASTERY</span>
        <h3>خريطة تدريبك في المادة</h3>
        <p>${escapeHtml(masteryGuidance(stats))}</p>
      </div>
      <div class="mastery-ring" style="--mastery:${stats.masteryPercent * 3.6}deg">
        <strong>${stats.masteryPercent}%</strong><small>إتقان</small>
      </div>
    </div>
    <div class="mastery-stat-grid">
      <article><span>🆕</span><strong>${stats.new.toLocaleString('ar-SA')}</strong><small>لم تبدأ</small></article>
      <article><span>🧠</span><strong>${stats.learning.toLocaleString('ar-SA')}</strong><small>قيد التثبيت</small></article>
      <article class="needs-review"><span>↻</span><strong>${(stats.review + stats.reinforcing).toLocaleString('ar-SA')}</strong><small>تحتاج مراجعة</small></article>
      <article class="mastered"><span>✓</span><strong>${stats.mastered.toLocaleString('ar-SA')}</strong><small>متقنة</small></article>
    </div>
    <div class="mastery-progress-line"><span style="width:${stats.masteryPercent}%"></span></div>
    <div class="mastery-dashboard-actions">
      ${stats.review + stats.reinforcing ? `<button class="exam-primary" data-mastery-mode="review">ابدأ مراجعة المستحق (${stats.review + stats.reinforcing})</button>` : ''}
      ${stats.mastered ? '<button class="exam-secondary" data-mastery-mode="mastered">مراجعة الأسئلة المتقنة</button>' : ''}
    </div>
  `;
}

function renderMasteryLoading() {
  if (!masteryDashboard) return;
  masteryDashboard.hidden = false;
  masteryDashboard.innerHTML = '<div class="mastery-loading"><span class="loader"></span><p>جارٍ قراءة سجل تدريبك وحالة كل سؤال…</p></div>';
}

async function selectSubject(subject, { scroll = true } = {}) {
  selectedSubject = subject;
  const meta = subjectMeta[subject] || { title: subject, description: '' };
  document.querySelectorAll('.exam-subject').forEach(card => card.classList.toggle('selected', card.dataset.subject === subject));
  document.getElementById('setupTitle').textContent = `تدريب ${meta.title}`;
  document.getElementById('setupDescription').textContent = 'اختر عدد الأسئلة ونمط التدريب. المزيج الذكي يستبعد المتقن ويركز على نقاط الضعف.';
  document.getElementById('examLoadNote').textContent = `جارٍ تجهيز سجل ${meta.title} الخاص بحسابك…`;
  setupElement.hidden = false;
  renderMasteryLoading();
  if (scroll) setupElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

  try {
    const controller = await prepareMastery(subject);
    if (selectedSubject !== subject) return;
    renderMasteryDashboard(controller);
    document.getElementById('examLoadNote').textContent = 'جاهز: كل إجابة تُحفظ، والخطأ ينتقل تلقائيًا إلى مراجعة مركزة.';
  } catch (error) {
    document.getElementById('examLoadNote').textContent = String(error.message || error);
    if (masteryDashboard) masteryDashboard.hidden = true;
  }
}

function modeTitle(mode) {
  return {
    smart: 'مزيج ذكي',
    new: 'أسئلة جديدة',
    review: 'مراجعة الأخطاء',
    mastered: 'مراجعة المتقن',
    all: 'محاكاة شاملة'
  }[mode] || 'تدريب';
}

function emptyModeMessage(mode) {
  if (mode === 'review') return 'لا توجد أسئلة مستحقة للمراجعة الآن. اختر المزيج الذكي أو الأسئلة الجديدة.';
  if (mode === 'new') return 'لا توجد أسئلة جديدة ضمن هذا المستوى.';
  if (mode === 'mastered') return 'لم تصل أسئلة إلى حالة الإتقان بعد. يلزم إجابتان صحيحتان متتاليتان.';
  return 'لا توجد أسئلة مطابقة للاختيارات الحالية.';
}

async function startExam(overrides = {}) {
  if (!selectedSubject) return;
  const button = document.getElementById('startExamButton');
  button.disabled = true;
  button.textContent = 'جارٍ تجهيز التدريب…';
  try {
    const controller = await prepareMastery(selectedSubject);
    const level = overrides.level || document.getElementById('examLevel').value;
    const requestedCount = Number(overrides.requestedCount || document.getElementById('examCount').value);
    const minutes = Number(overrides.minutes ?? document.getElementById('examMinutes').value);
    const mode = overrides.mode || document.getElementById('examMode').value;
    const questions = Array.isArray(overrides.questions)
      ? overrides.questions
      : controller.select({ mode, count: requestedCount, level });
    if (!questions.length) throw new Error(emptyModeMessage(mode));

    lastExamConfig = { subject: selectedSubject, level, requestedCount, minutes, mode };
    lastFocusIds = Array.isArray(overrides.focusIds) ? overrides.focusIds.map(String) : [];
    session = {
      subject: selectedSubject,
      controller,
      questions: shuffle(questions),
      index: 0,
      correct: 0,
      answers: [],
      wrongIds: new Set(),
      masteredIds: new Set(),
      focusIds: lastFocusIds,
      remaining: minutes * 60,
      openTime: minutes === 0,
      startedAt: Date.now(),
      level,
      requestedCount,
      minutes,
      mode,
      finished: false
    };
    setupElement.hidden = true;
    runnerElement.hidden = false;
    startTimer();
    renderQuestion();
    runnerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    document.getElementById('examLoadNote').textContent = String(error.message || error);
  } finally {
    button.disabled = false;
    button.textContent = 'بدء التدريب';
  }
}

function startTimer() {
  clearInterval(timer);
  if (session.openTime) return;
  timer = setInterval(() => {
    if (!session || session.finished) return;
    session.remaining -= 1;
    updateTimer();
    if (session.remaining <= 0) finishExam();
  }, 1000);
}

function updateTimer() {
  const element = document.getElementById('examTimer');
  if (!element || !session) return;
  element.textContent = session.openTime ? 'وقت مفتوح' : formatSeconds(session.remaining);
}

async function renderQuestionVisual(question) {
  const holder = document.getElementById('examQuestionVisual');
  if (!holder || !question.visualId) return;
  holder.innerHTML = '<span class="visual-loading">جارٍ تحميل الرسم…</span>';
  try {
    const visuals = await ensureVisuals();
    const svg = visuals[question.visualId];
    holder.innerHTML = svg || '';
    holder.hidden = !svg;
  } catch { holder.hidden = true; }
}

function renderQuestion() {
  if (!session || session.finished) return;
  if (session.index >= session.questions.length) return finishExam();
  const question = session.questions[session.index];
  const record = session.controller.record(question);
  const progress = Math.round((session.index / session.questions.length) * 100);
  runnerElement.innerHTML = `
    <div class="exam-runner-head">
      <div>
        <small>${escapeHtml(subjectMeta[session.subject]?.title || session.subject)} • ${escapeHtml(modeTitle(session.mode))}</small>
        <strong>السؤال ${session.index + 1} من ${session.questions.length}</strong>
      </div>
      <div class="runner-status-group">
        <span class="question-state state-${record.status}">${escapeHtml(session.controller.statusLabel(record))}</span>
        <time id="examTimer"></time>
      </div>
    </div>
    <div class="runner-progress"><span style="width:${progress}%"></span></div>
    ${question.passage ? `<div class="exam-passage">${escapeHtml(question.passage)}</div>` : ''}
    <div class="exam-question-visual" id="examQuestionVisual" ${question.visualId ? '' : 'hidden'}></div>
    <small class="question-category">${escapeHtml(categoryTitle(question))}</small>
    <h2 class="exam-question">${escapeHtml(question.q)}</h2>
    <div class="exam-options">${question.options.map((option, index) => `<button data-answer="${index}"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>`).join('')}</div>
    <div id="examFeedback"></div>
  `;
  updateTimer();
  renderQuestionVisual(question);
}

function answerQuestion(choice) {
  if (!session || session.finished) return;
  const question = session.questions[session.index];
  const correct = choice === question.answer;
  const updated = session.controller.applyAnswer(question, correct, { mode: session.mode });
  session.correct += correct ? 1 : 0;
  if (!correct) session.wrongIds.add(String(question.id));
  if (updated.status === 'mastered') session.masteredIds.add(String(question.id));
  session.answers.push({
    questionIndex: session.index,
    id: question.id,
    subject: question.subject || session.subject,
    selected: choice,
    answer: question.answer,
    correct,
    statusAfter: updated.status
  });

  runnerElement.querySelectorAll('[data-answer]').forEach((button, index) => {
    button.disabled = true;
    if (index === question.answer) button.classList.add('correct');
    else if (index === choice) button.classList.add('wrong');
  });

  const learningMessage = !correct
    ? 'تم نقل السؤال إلى قائمة المراجعة، وسيعاد لك حتى تثبت الإجابة.'
    : updated.status === 'mastered'
      ? 'تم إتقان هذا السؤال. لن يعود في الاختبارات الذكية إلا عند اختيار مراجعة المتقن.'
      : updated.status === 'reinforcing'
        ? 'إجابة صحيحة. بقيت إجابة صحيحة متتالية واحدة لإغلاق السؤال كمتقن.'
        : 'إجابة صحيحة. سيعود السؤال في مراجعة لاحقة لتثبيت المعلومة.';

  document.getElementById('examFeedback').innerHTML = `
    <div class="exam-feedback ${correct ? 'is-correct' : 'is-wrong'}">
      <strong>${correct ? 'إجابة صحيحة ✓' : 'الإجابة تحتاج مراجعة'}</strong>
      <p>${escapeHtml(question.explain || 'راجع القاعدة المرتبطة بهذا السؤال.')}</p>
      <div class="memory-note">🧠 ${escapeHtml(learningMessage)}</div>
      <button class="exam-primary" id="nextExamQuestion">${session.index + 1 === session.questions.length ? 'عرض النتيجة' : 'السؤال التالي'}</button>
    </div>
  `;
}

function saveResult(result) {
  const key = 'neonOptimizedExamHistoryV1';
  let history = [];
  try { history = JSON.parse(localStorage.getItem(key) || '[]'); } catch { history = []; }
  history.push(result);
  localStorage.setItem(key, JSON.stringify(history.slice(-80)));
}

function completeAnswers(currentSession) {
  const byQuestion = new Map(currentSession.answers.map(answer => [answer.questionIndex, answer]));
  return currentSession.questions.map((question, questionIndex) => {
    const answer = byQuestion.get(questionIndex);
    if (!answer) {
      const updated = currentSession.controller.applyAnswer(question, false, { mode: currentSession.mode });
      currentSession.wrongIds.add(String(question.id));
      return { question, questionIndex, selected: null, correct: false, statusAfter: updated.status };
    }
    return {
      question,
      questionIndex,
      selected: answer.selected,
      correct: answer.correct === true,
      statusAfter: answer.statusAfter
    };
  });
}

function buildBreakdown(answers) {
  const rows = new Map();
  for (const item of answers) {
    const key = categoryTitle(item.question);
    const row = rows.get(key) || { title: key, total: 0, correct: 0 };
    row.total += 1;
    if (item.correct) row.correct += 1;
    rows.set(key, row);
  }
  return [...rows.values()]
    .map(row => ({ ...row, percent: row.total ? Math.round((row.correct / row.total) * 100) : 0 }))
    .sort((a, b) => a.percent - b.percent || b.total - a.total);
}

function resultLabel(percent) {
  if (percent >= 90) return 'ممتاز جدًا';
  if (percent >= 80) return 'ممتاز';
  if (percent >= 70) return 'جيد جدًا';
  if (percent >= 60) return 'جيد';
  return 'يحتاج إلى مراجعة منظمة';
}

function reviewVisual(question) {
  if (!question.visualId) return '';
  const svg = window.NEON_EXAM_VISUALS?.[question.visualId];
  if (!svg) return '';
  return `<figure class="report-question-visual" aria-label="${escapeHtml(question.imageAlt || 'الرسم المرافق للسؤال')}">${svg}</figure>`;
}

function reviewCard(item, index, controller) {
  const question = item.question;
  const selectedText = item.selected === null ? 'لم تُجب' : question.options?.[item.selected] ?? 'لم تُجب';
  const correctText = question.options?.[question.answer] ?? 'غير محددة';
  const record = controller.record(question);
  return `
    <article class="exam-review-card ${item.selected === null ? 'is-unanswered' : ''}">
      <div class="exam-review-question"><span>${(index + 1).toLocaleString('ar-SA')}</span><strong>${escapeHtml(question.q)}</strong></div>
      ${reviewVisual(question)}
      <div class="review-state-row"><span class="question-state state-${record.status}">${escapeHtml(controller.statusLabel(record))}</span><small>${escapeHtml(categoryTitle(question))}</small></div>
      <p>إجابتك: <em>${escapeHtml(selectedText)}</em></p>
      <p>الصحيحة: <b>${escapeHtml(correctText)}</b></p>
      <small>${escapeHtml(question.explain || 'راجع القاعدة أو المهارة المرتبطة بهذا السؤال.')}</small>
    </article>
  `;
}

function renderDetailedReport(currentSession, answers, score, elapsed) {
  const total = currentSession.questions.length;
  const breakdown = buildBreakdown(answers);
  const wrong = answers.filter(item => !item.correct);
  const focusBase = currentSession.focusIds.length ? currentSession.focusIds : [...currentSession.wrongIds];
  const pending = currentSession.controller.pendingFrom(focusBase);
  const stats = currentSession.controller.summary();
  const nextLabel = currentSession.mode === 'review' ? 'جولة تثبيت أخرى' : 'تدريب على الأخطاء الآن';

  runnerElement.innerHTML = `
    <div class="exam-report">
      <span class="eyebrow">ADAPTIVE MASTERY REPORT</span>
      <h2>تقرير التدريب</h2>

      <div class="exam-report-hero">
        <strong>${score}%</strong>
        <div>
          <b>${resultLabel(score)}</b>
          <small>${currentSession.correct} من ${total} • ${formatSeconds(elapsed)} • ${escapeHtml(modeTitle(currentSession.mode))}</small>
        </div>
      </div>

      <div class="session-mastery-summary">
        <article><strong>${currentSession.masteredIds.size.toLocaleString('ar-SA')}</strong><small>أتقنتها في هذه الجلسة</small></article>
        <article><strong>${pending.length.toLocaleString('ar-SA')}</strong><small>تحتاج جولة إضافية</small></article>
        <article><strong>${stats.mastered.toLocaleString('ar-SA')}</strong><small>إجمالي المتقن في المادة</small></article>
        <article><strong>${stats.pending.toLocaleString('ar-SA')}</strong><small>المتبقي حتى الإتقان</small></article>
      </div>

      <div class="exam-report-breakdown">
        ${breakdown.map(item => `
          <article>
            <div><span>${escapeHtml(item.title)}</span><strong>${item.percent}%</strong></div>
            <small>${item.correct}/${item.total}</small>
            <i><b style="width:${item.percent}%"></b></i>
          </article>
        `).join('')}
      </div>

      <section class="exam-review-section">
        <h3>مراجعة الأخطاء (${wrong.length})</h3>
        ${wrong.length ? wrong.map((item, index) => reviewCard(item, index, currentSession.controller)).join('') : '<div class="exam-perfect-result">🏆 جميع إجابات هذه الجولة صحيحة.</div>'}
      </section>

      <div class="exam-report-actions">
        ${pending.length ? `<button class="exam-primary" id="reviewMistakes">${nextLabel} (${pending.length})</button>` : ''}
        <button class="exam-primary" id="retrySmartExam">اختبار ذكي جديد</button>
        ${stats.mastered ? '<button class="exam-secondary" id="reviewMastered">مراجعة المتقن</button>' : ''}
        <button class="exam-secondary" id="returnToExamSubjects">العودة</button>
      </div>
    </div>
  `;
  lastFocusIds = pending.map(question => String(question.id));
}

async function finishExam() {
  if (!session || session.finished) return;
  session.finished = true;
  clearInterval(timer);
  timer = null;

  const currentSession = session;
  const answers = completeAnswers(currentSession);
  const total = currentSession.questions.length;
  const score = total ? Math.round((currentSession.correct / total) * 100) : 0;
  const elapsed = Math.max(1, Math.round((Date.now() - currentSession.startedAt) / 1000));
  const result = {
    date: new Date().toISOString(),
    subject: currentSession.subject,
    title: subjectMeta[currentSession.subject]?.title || currentSession.subject,
    correct: currentSession.correct,
    total,
    score,
    durationSeconds: elapsed,
    level: currentSession.level,
    mode: currentSession.mode,
    wrongCount: total - currentSession.correct,
    masteredThisSession: currentSession.masteredIds.size,
    answers: answers.map(item => ({
      id: item.question.id,
      subject: item.question.subject || currentSession.subject,
      selected: item.selected,
      answer: item.question.answer,
      correct: item.correct,
      statusAfter: item.statusAfter
    }))
  };
  saveResult(result);
  currentSession.controller.sync().catch(() => {});
  renderDetailedReport(currentSession, answers, score, elapsed);
  session = null;
}

async function startFocusedReview() {
  if (!selectedSubject || !lastFocusIds.length) return;
  const controller = await prepareMastery(selectedSubject);
  const questions = controller.pendingFrom(lastFocusIds);
  if (!questions.length) {
    selectSubject(selectedSubject, { scroll: false });
    return;
  }
  await startExam({
    mode: 'review',
    level: 'all',
    requestedCount: questions.length,
    minutes: 0,
    questions,
    focusIds: lastFocusIds
  });
}

async function retrySmartExam() {
  if (!lastExamConfig) return;
  selectSubject(lastExamConfig.subject, { scroll: false });
  document.getElementById('examLevel').value = lastExamConfig.level;
  document.getElementById('examCount').value = String(lastExamConfig.requestedCount);
  document.getElementById('examMinutes').value = String(lastExamConfig.minutes);
  document.getElementById('examMode').value = 'smart';
  await startExam({ mode: 'smart' });
}

async function startMasteredReview() {
  if (!selectedSubject) return;
  const controller = await prepareMastery(selectedSubject);
  const count = Number(document.getElementById('examCount').value || 10);
  const questions = controller.select({ mode: 'mastered', count, level: 'all' });
  if (!questions.length) {
    document.getElementById('examLoadNote').textContent = emptyModeMessage('mastered');
    return;
  }
  await startExam({ mode: 'mastered', questions, requestedCount: questions.length, minutes: 0 });
}

function returnToSubjects() {
  clearInterval(timer);
  timer = null;
  session = null;
  runnerElement.hidden = true;
  setupElement.hidden = true;
  subjectsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatSeconds(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = String(safeSeconds % 60).padStart(2, '0');
  return `${String(minutes).padStart(2, '0')}:${remainder}`;
}

async function boot() {
  try {
    const [authSession, manifestResponse] = await Promise.all([
      ensureAuth(),
      fetch('/data/exams/manifest.json', { cache: 'no-cache' })
    ]);
    if (!manifestResponse.ok) throw new Error('تعذر تحميل فهرس بنك الاختبارات.');
    manifest = await manifestResponse.json();
    renderAccount(authSession);
    document.getElementById('totalQuestions').textContent = Number(manifest.totalQuestions).toLocaleString('ar-SA');
    renderSubjects();
    overlay?.classList.add('hidden');
  } catch (error) {
    console.error(error);
    document.getElementById('bootText').textContent = String(error.message || error);
  }
}

document.addEventListener('click', event => {
  const subject = event.target.closest('[data-subject]');
  if (subject) selectSubject(subject.dataset.subject);

  const masteryMode = event.target.closest('[data-mastery-mode]');
  if (masteryMode) {
    const mode = masteryMode.dataset.masteryMode;
    document.getElementById('examMode').value = mode;
    if (mode === 'review') startExam({ mode: 'review' });
    if (mode === 'mastered') startMasteredReview();
  }

  if (event.target.id === 'startExamButton') startExam();
  const answer = event.target.closest('[data-answer]');
  if (answer) answerQuestion(Number(answer.dataset.answer));
  if (event.target.id === 'nextExamQuestion' && session) {
    session.index += 1;
    renderQuestion();
  }
  if (event.target.id === 'reviewMistakes') startFocusedReview();
  if (event.target.id === 'retrySmartExam') retrySmartExam();
  if (event.target.id === 'reviewMastered') startMasteredReview();
  if (event.target.id === 'returnToExamSubjects') returnToSubjects();
});

document.addEventListener('change', event => {
  if (event.target.id !== 'examMode' || !selectedSubject) return;
  const mode = event.target.value;
  const note = document.getElementById('examLoadNote');
  note.textContent = mode === 'smart'
    ? 'المزيج الذكي يستبعد المتقن ويرتب الأولوية للأخطاء والأسئلة المستحقة.'
    : mode === 'review'
      ? 'سيتم اختيار الأسئلة التي أخطأت فيها أو التي تنتظر جولة تثبيت.'
      : mode === 'new'
        ? 'سيتم اختيار أسئلة لم تتدرب عليها من قبل.'
        : mode === 'mastered'
          ? 'هذا الاختيار يعيد الأسئلة المتقنة بطلبك فقط.'
          : 'المحاكاة الشاملة قد تشمل جميع الحالات، بما فيها الأسئلة المتقنة.';
});

boot();
