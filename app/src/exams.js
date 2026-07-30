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

function selectSubject(subject) {
  selectedSubject = subject;
  const meta = subjectMeta[subject] || { title: subject, description: '' };
  document.querySelectorAll('.exam-subject').forEach(card => card.classList.toggle('selected', card.dataset.subject === subject));
  document.getElementById('setupTitle').textContent = `اختبار ${meta.title}`;
  document.getElementById('setupDescription').textContent = meta.description;
  document.getElementById('examLoadNote').textContent = `سيتم تحميل ملف ${meta.title} فقط عند بدء الاختبار.`;
  setupElement.hidden = false;
  setupElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    session = { subject: selectedSubject, questions, index: 0, correct: 0, answers: [], remaining: minutes * 60, openTime: minutes === 0 };
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
  const minutes = Math.floor(session.remaining / 60);
  const seconds = String(session.remaining % 60).padStart(2, '0');
  element.textContent = `${minutes}:${seconds}`;
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
  if (!session || session.index >= session.questions.length) return finishExam();
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
  if (!session) return;
  const question = session.questions[session.index];
  const correct = choice === question.answer;
  session.correct += correct ? 1 : 0;
  session.answers.push({ id: question.id, subject: question.subject, correct });
  runnerElement.querySelectorAll('[data-answer]').forEach((button, index) => {
    button.disabled = true;
    if (index === question.answer) button.classList.add('correct');
    else if (index === choice) button.classList.add('wrong');
  });
  document.getElementById('examFeedback').innerHTML = `
    <div class="exam-feedback ${correct ? 'is-correct' : 'is-wrong'}">
      <strong>${correct ? 'إجابة صحيحة ✓' : 'الإجابة تحتاج مراجعة'}</strong>
      <p>${escapeHtml(question.explain)}</p>
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

function finishExam() {
  if (!session) return;
  clearInterval(timer);
  const total = session.questions.length;
  const score = total ? Math.round((session.correct / total) * 100) : 0;
  const result = { date: new Date().toISOString(), subject: session.subject, correct: session.correct, total, score, answers: session.answers };
  saveResult(result);
  runnerElement.innerHTML = `
    <div class="exam-result">
      <span class="eyebrow">EXAM COMPLETED</span>
      <h2>${score}%</h2>
      <p>${session.correct} إجابة صحيحة من ${total} في ${escapeHtml(subjectMeta[session.subject]?.title || session.subject)}.</p>
      <div class="result-actions"><button class="exam-primary" id="retryExam">إعادة الاختبار</button><button id="chooseAnotherExam">اختيار مادة أخرى</button></div>
    </div>
  `;
  session = null;
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
  if (event.target.id === 'nextExamQuestion') { session.index += 1; renderQuestion(); }
  if (event.target.id === 'retryExam') { runnerElement.hidden = true; setupElement.hidden = false; setupElement.scrollIntoView({ behavior: 'smooth' }); }
  if (event.target.id === 'chooseAnotherExam') { runnerElement.hidden = true; setupElement.hidden = true; subjectsElement.scrollIntoView({ behavior: 'smooth' }); }
});

boot();
