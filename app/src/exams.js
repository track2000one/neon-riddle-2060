import './styles.css';
import { ensureAuth, renderAccount } from './auth.js';

const subjectMeta = {
  'tahsili-math': { title: 'رياضيات التحصيلي', family: 'التحصيلي العلمي', icon: '∑', description: 'الجبر والدوال والهندسة والإحصاء والتفاضل.' },
  'tahsili-physics': { title: 'فيزياء التحصيلي', family: 'التحصيلي العلمي', icon: '⚛', description: 'الميكانيكا والطاقة والكهرباء والموجات.' },
  'tahsili-chemistry': { title: 'كيمياء التحصيلي', family: 'التحصيلي العلمي', icon: '🧪', description: 'الذرة والروابط والمحاليل والكيمياء العضوية.' },
  'tahsili-biology': { title: 'أحياء التحصيلي', family: 'التحصيلي العلمي', icon: '🧬', description: 'الخلية والوراثة وأجهزة الجسم والبيئة.' },
  'qudurat-verbal': { title: 'القدرات اللفظية', family: 'اختبار القدرات', icon: 'ض', description: 'التناظر وإكمال الجمل والمفردات واستيعاب المقروء.' },
  'qudurat-quant': { title: 'القدرات الكمية', family: 'اختبار القدرات', icon: 'ك', description: 'الحساب والنسب والجبر والهندسة والاحتمال.' }
};

const visualScripts = [
  'exam-visuals.js','exam-visuals-page06-07.js','exam-visuals-page08-09.js','exam-visuals-page10-11.js','exam-visuals-page18-23.js','exam-visuals-page24-29.js','exam-visuals-page30-41.js','exam-visuals-page42-49.js','exam-visuals-video-bank.js','exam-visuals-video-compilations-2026.js','exam-visuals-uploaded-tahsili-math-model8-2026.js','exam-visuals-uploaded-tahsili-math-model12-2026.js'
];

const memoryBanks = new Map();
let manifest;
let selectedSubject;
let session;
let timer;
let visualsReady;
let lastExamConfig;

const subjectsElement = document.getElementById('examSubjects');
const setupElement = document.getElementById('examSetup');
const runnerElement = document.getElementById('examRunner');
const overlay = document.getElementById('bootOverlay');

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

function selectSubject(subject, { scroll = true } = {}) {
  selectedSubject = subject;
  const meta = subjectMeta[subject] || { title: subject, description: '' };
  document.querySelectorAll('.exam-subject').forEach(card => card.classList.toggle('selected', card.dataset.subject === subject));
  document.getElementById('setupTitle').textContent = `اختبار ${meta.title}`;
  document.getElementById('setupDescription').textContent = meta.description;
  document.getElementById('examLoadNote').textContent = `سيتم تحميل ملف ${meta.title} فقط عند بدء الاختبار.`;
  setupElement.hidden = false;
  if (scroll) setupElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function startExam() {
  if (!selectedSubject) return;
  const button = document.getElementById('startExamButton');
  button.disabled = true;
  button.textContent = 'جارٍ تحميل المادة…';
  try {
    const allQuestions = await loadSubject(selectedSubject);
    const level = document.getElementById('examLevel').value;
    const requestedCount = Number(document.getElementById('examCount').value);
    const minutes = Number(document.getElementById('examMinutes').value);
    const pool = allQuestions.filter(question => question.active !== false && (level === 'all' || question.level === level));
    if (!pool.length) throw new Error('لا توجد أسئلة مطابقة للمستوى المحدد.');
    const questions = shuffle(pool).slice(0, Math.min(requestedCount, pool.length));
    lastExamConfig = { subject: selectedSubject, level, requestedCount, minutes };
    session = {
      subject: selectedSubject,
      questions,
      index: 0,
      correct: 0,
      answers: [],
      remaining: minutes * 60,
      openTime: minutes === 0,
      startedAt: Date.now(),
      level,
      requestedCount,
      minutes,
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
    button.textContent = 'بدء الاختبار';
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
  if (session.openTime) {
    element.textContent = 'وقت مفتوح';
    return;
  }
  element.textContent = formatSeconds(session.remaining);
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
  } catch {
    holder.hidden = true;
  }
}

function renderQuestion() {
  if (!session || session.finished) return;
  if (session.index >= session.questions.length) return finishExam();
  const question = session.questions[session.index];
  const progress = Math.round((session.index / session.questions.length) * 100);
  runnerElement.innerHTML = `
    <div class="exam-runner-head">
      <div><small>${escapeHtml(subjectMeta[session.subject]?.title || session.subject)}</small><strong>السؤال ${session.index + 1} من ${session.questions.length}</strong></div>
      <time id="examTimer"></time>
    </div>
    <div class="runner-progress"><span style="width:${progress}%"></span></div>
    ${question.passage ? `<div class="exam-passage">${escapeHtml(question.passage)}</div>` : ''}
    <div class="exam-question-visual" id="examQuestionVisual" ${question.visualId ? '' : 'hidden'}></div>
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
  session.correct += correct ? 1 : 0;
  session.answers.push({
    questionIndex: session.index,
    id: question.id,
    subject: question.subject || session.subject,
    selected: choice,
    answer: question.answer,
    correct
  });
  runnerElement.querySelectorAll('[data-answer]').forEach((button, index) => {
    button.disabled = true;
    if (index === question.answer) button.classList.add('correct');
    else if (index === choice) button.classList.add('wrong');
  });
  document.getElementById('examFeedback').innerHTML = `
    <div class="exam-feedback ${correct ? 'is-correct' : 'is-wrong'}">
      <strong>${correct ? 'إجابة صحيحة ✓' : 'الإجابة تحتاج مراجعة'}</strong>
      <p>${escapeHtml(question.explain || 'راجع القاعدة المرتبطة بهذا السؤال.')}</p>
      <button class="exam-primary" id="nextExamQuestion">${session.index + 1 === session.questions.length ? 'عرض النتيجة' : 'السؤال التالي'}</button>
    </div>
  `;
}

function saveResult(result) {
  const key = 'neonOptimizedExamHistoryV1';
  let history = [];
  try { history = JSON.parse(localStorage.getItem(key) || '[]'); } catch { history = []; }
  history.push(result);
  localStorage.setItem(key, JSON.stringify(history.slice(-50)));
}

function completeAnswers(currentSession) {
  const byQuestion = new Map(currentSession.answers.map(answer => [answer.questionIndex, answer]));
  return currentSession.questions.map((question, questionIndex) => {
    const answer = byQuestion.get(questionIndex);
    return {
      question,
      questionIndex,
      selected: answer?.selected ?? null,
      correct: answer?.correct === true
    };
  });
}

function buildBreakdown(answers) {
  const rows = new Map();
  for (const item of answers) {
    const subject = item.question.subject || selectedSubject || 'general';
    const meta = subjectMeta[subject] || { title: subject, icon: '🎯' };
    const row = rows.get(subject) || { subject, title: meta.title, icon: meta.icon, total: 0, correct: 0 };
    row.total += 1;
    if (item.correct) row.correct += 1;
    rows.set(subject, row);
  }
  return [...rows.values()].map(row => ({ ...row, percent: row.total ? Math.round((row.correct / row.total) * 100) : 0 }));
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

function reviewCard(item, index) {
  const question = item.question;
  const selectedText = item.selected === null ? 'لم تُجب' : question.options?.[item.selected] ?? 'لم تُجب';
  const correctText = question.options?.[question.answer] ?? 'غير محددة';
  const source = question.sourcePage
    ? `<small class="report-source">${escapeHtml(subjectMeta[question.subject]?.title || '')} • صفحة الملف ${Number(question.sourcePage).toLocaleString('ar-SA')}</small>`
    : question.source ? `<small class="report-source">${escapeHtml(question.source)}</small>` : '';
  return `
    <article class="exam-review-card ${item.selected === null ? 'is-unanswered' : ''}">
      <div class="exam-review-question"><span>${(index + 1).toLocaleString('ar-SA')}</span><strong>${escapeHtml(question.q)}</strong></div>
      ${reviewVisual(question)}
      <p>إجابتك: <em>${escapeHtml(selectedText)}</em></p>
      <p>الصحيحة: <b>${escapeHtml(correctText)}</b></p>
      <small>${escapeHtml(question.explain || 'راجع القاعدة أو المهارة المرتبطة بهذا السؤال.')}</small>
      ${source}
    </article>
  `;
}

function renderDetailedReport(currentSession, answers, score, elapsed) {
  const total = currentSession.questions.length;
  const breakdown = buildBreakdown(answers);
  const wrong = answers.filter(item => !item.correct);
  runnerElement.innerHTML = `
    <div class="exam-report">
      <span class="eyebrow">DETAILED PERFORMANCE REPORT</span>
      <h2>تقرير الاختبار</h2>

      <div class="exam-report-hero">
        <strong>${score}%</strong>
        <div>
          <b>${resultLabel(score)}</b>
          <small>${currentSession.correct} من ${total} • ${formatSeconds(elapsed)}</small>
        </div>
      </div>

      <div class="exam-report-breakdown">
        ${breakdown.map(item => `
          <article>
            <div><span>${escapeHtml(item.icon)} ${escapeHtml(item.title)}</span><strong>${item.percent}%</strong></div>
            <small>${item.correct}/${item.total}</small>
            <i><b style="width:${item.percent}%"></b></i>
          </article>
        `).join('')}
      </div>

      <section class="exam-review-section">
        <h3>مراجعة الأخطاء (${wrong.length})</h3>
        ${wrong.length ? wrong.map(reviewCard).join('') : '<div class="exam-perfect-result">🏆 جميع الإجابات صحيحة. أداء ممتاز.</div>'}
      </section>

      <div class="exam-report-actions">
        <button class="exam-primary" id="retrySimilarExam">إعادة اختبار مشابه</button>
        <button class="exam-secondary" id="returnToExamSubjects">العودة</button>
      </div>
    </div>
  `;
}

function finishExam() {
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
    wrongCount: total - currentSession.correct,
    answers: answers.map(item => ({
      id: item.question.id,
      subject: item.question.subject || currentSession.subject,
      selected: item.selected,
      answer: item.question.answer,
      correct: item.correct
    }))
  };
  saveResult(result);
  renderDetailedReport(currentSession, answers, score, elapsed);
  session = null;
}

async function retrySimilarExam() {
  if (!lastExamConfig) return;
  selectSubject(lastExamConfig.subject, { scroll: false });
  document.getElementById('examLevel').value = lastExamConfig.level;
  document.getElementById('examCount').value = String(lastExamConfig.requestedCount);
  document.getElementById('examMinutes').value = String(lastExamConfig.minutes);
  await startExam();
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
  if (event.target.id === 'startExamButton') startExam();
  const answer = event.target.closest('[data-answer]');
  if (answer) answerQuestion(Number(answer.dataset.answer));
  if (event.target.id === 'nextExamQuestion' && session) {
    session.index += 1;
    renderQuestion();
  }
  if (event.target.id === 'retrySimilarExam') retrySimilarExam();
  if (event.target.id === 'returnToExamSubjects') returnToSubjects();
});

boot();
