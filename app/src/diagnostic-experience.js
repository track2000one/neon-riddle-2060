import './diagnostic-experience.css';

const HISTORY_KEY = 'neonOptimizedExamHistoryV1';
const DIAGNOSTIC_COUNT = 20;
const DIAGNOSTIC_MINUTES = 25;
const tracks = {
  tahsili: {
    title: 'التشخيص الشامل للتحصيلي العلمي',
    shortTitle: 'التحصيلي',
    subjects: ['tahsili-math', 'tahsili-physics', 'tahsili-chemistry', 'tahsili-biology']
  },
  qudurat: {
    title: 'التشخيص الشامل لاختبار القدرات',
    shortTitle: 'القدرات',
    subjects: ['qudurat-verbal', 'qudurat-quant']
  }
};
const subjectTitles = {
  'tahsili-math': 'رياضيات التحصيلي',
  'tahsili-physics': 'فيزياء التحصيلي',
  'tahsili-chemistry': 'كيمياء التحصيلي',
  'tahsili-biology': 'أحياء التحصيلي',
  'qudurat-verbal': 'القدرات اللفظية',
  'qudurat-quant': 'القدرات الكمية'
};

let manifest;
let state;
let timer;

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

function safeHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function saveHistory(result) {
  const history = safeHistory();
  history.push(result);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-80)));
}

function ensureUi() {
  const subjectGrid = document.getElementById('examSubjects');
  if (!subjectGrid || document.getElementById('diagnosticLaunch')) return;
  const launch = document.createElement('section');
  launch.id = 'diagnosticLaunch';
  launch.className = 'diagnostic-launch';
  launch.innerHTML = `
    <div><h2>ابدأ بقياس مستواك قبل التدريب</h2><p>تشخيص موحّد من 20 سؤالًا يوزع النتيجة على المواد ويحدد أولويات خطتك.</p></div>
    <div class="diagnostic-launch-actions"><button class="diagnostic-primary" data-start-diagnostic="tahsili">تشخيص التحصيلي</button><button class="diagnostic-secondary" data-start-diagnostic="qudurat">تشخيص القدرات</button></div>`;
  subjectGrid.insertAdjacentElement('beforebegin', launch);

  const shell = document.createElement('section');
  shell.id = 'diagnosticShell';
  shell.className = 'diagnostic-shell';
  shell.hidden = true;
  launch.insertAdjacentElement('afterend', shell);
}

function toggleStandardCenter(hidden) {
  for (const id of ['examSubjects', 'examSetup', 'examRunner', 'examSuccessTools']) {
    const element = document.getElementById(id);
    if (!element) continue;
    if (hidden) {
      element.dataset.diagnosticWasHidden = String(element.hidden);
      element.hidden = true;
    } else {
      element.hidden = element.dataset.diagnosticWasHidden === 'true';
      delete element.dataset.diagnosticWasHidden;
    }
  }
  const launch = document.getElementById('diagnosticLaunch');
  if (launch) launch.hidden = hidden;
}

async function loadManifest() {
  if (manifest) return manifest;
  const response = await fetch('/data/exams/manifest.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('تعذر تحميل فهرس الأسئلة.');
  manifest = await response.json();
  return manifest;
}

async function loadSubject(subject) {
  const data = await loadManifest();
  const entry = data.subjects?.[subject];
  if (!entry?.file) throw new Error(`ملف ${subjectTitles[subject] || subject} غير متاح.`);
  const response = await fetch(`/data/exams/${entry.file}`, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`تعذر تحميل ${subjectTitles[subject] || subject}.`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows.filter(item => item?.q && Array.isArray(item.options) && Number.isInteger(Number(item.answer))) : [];
}

function balancedSample(rows, count) {
  const byCategory = new Map();
  for (const row of shuffle(rows)) {
    const key = String(row.category || 'general');
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(row);
  }
  const buckets = shuffle([...byCategory.values()]);
  const selected = [];
  while (selected.length < count && buckets.some(bucket => bucket.length)) {
    for (const bucket of buckets) {
      const question = bucket.shift();
      if (question) selected.push(question);
      if (selected.length >= count) break;
    }
  }
  return selected;
}

async function buildDiagnostic(trackId) {
  const track = tracks[trackId];
  if (!track) throw new Error('المسار التشخيصي غير معروف.');
  const perSubject = Math.floor(DIAGNOSTIC_COUNT / track.subjects.length);
  const remainder = DIAGNOSTIC_COUNT % track.subjects.length;
  const banks = await Promise.all(track.subjects.map(loadSubject));
  const selected = [];
  banks.forEach((rows, index) => {
    const count = perSubject + (index < remainder ? 1 : 0);
    const subject = track.subjects[index];
    selected.push(...balancedSample(rows, count).map(question => ({ ...question, subject: question.subject || subject })));
  });
  return shuffle(selected);
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function renderLoading(trackId) {
  const shell = document.getElementById('diagnosticShell');
  shell.hidden = false;
  shell.innerHTML = `<div class="diagnostic-loading">جارٍ تجهيز ${escapeHtml(tracks[trackId].title)} وتوزيع الأسئلة على المهارات…</div>`;
  shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderQuestion() {
  if (!state || state.finished) return;
  if (state.index >= state.questions.length) return finishDiagnostic();
  const question = state.questions[state.index];
  const selected = state.answers[state.index]?.selected;
  const percent = Math.round((state.index / state.questions.length) * 100);
  const shell = document.getElementById('diagnosticShell');
  shell.innerHTML = `
    <div class="diagnostic-head"><div><span class="eyebrow">STANDARDIZED DIAGNOSTIC</span><h2>${escapeHtml(tracks[state.trackId].title)}</h2><p>لا تظهر الإجابات أثناء التشخيص حتى تكون النتيجة أقرب إلى مستواك الفعلي.</p></div><time class="diagnostic-timer" id="diagnosticTimer">${formatTime(state.remaining)}</time></div>
    <div class="diagnostic-progress"><span style="width:${percent}%"></span></div>
    <span class="diagnostic-subject">${escapeHtml(subjectTitles[question.subject] || question.subject)} • السؤال ${(state.index + 1).toLocaleString('ar-SA')} من ${state.questions.length.toLocaleString('ar-SA')}</span>
    ${question.passage ? `<div class="exam-passage">${escapeHtml(question.passage)}</div>` : ''}
    <h3 class="diagnostic-question">${escapeHtml(question.q)}</h3>
    <div class="diagnostic-options">${question.options.map((option, index) => `<button class="diagnostic-option ${selected === index ? 'selected' : ''}" data-diagnostic-answer="${index}"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>`).join('')}</div>
    <div class="diagnostic-actions"><button class="diagnostic-secondary" id="cancelDiagnostic">إلغاء التشخيص</button><button class="diagnostic-primary" id="nextDiagnosticQuestion" ${Number.isInteger(selected) ? '' : 'disabled'}>${state.index + 1 === state.questions.length ? 'إنهاء وعرض التقرير' : 'السؤال التالي'}</button></div>`;
}

function updateTimer() {
  const element = document.getElementById('diagnosticTimer');
  if (element && state) element.textContent = formatTime(state.remaining);
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    if (!state || state.finished) return;
    state.remaining -= 1;
    updateTimer();
    if (state.remaining <= 0) finishDiagnostic();
  }, 1000);
}

async function startDiagnostic(trackId) {
  renderLoading(trackId);
  toggleStandardCenter(true);
  try {
    const questions = await buildDiagnostic(trackId);
    if (questions.length < 10) throw new Error('عدد الأسئلة المتاحة لا يكفي للتشخيص.');
    state = {
      trackId,
      questions,
      answers: [],
      index: 0,
      remaining: DIAGNOSTIC_MINUTES * 60,
      startedAt: Date.now(),
      finished: false
    };
    history.replaceState(null, '', `/exams?diagnostic=${trackId}`);
    renderQuestion();
    startTimer();
    window.NEON_PROGRESS?.record?.({
      eventType: 'exam_start', eventKey: `diagnostic:${trackId}:${Date.now()}`,
      centerId: 'exams', itemType: 'diagnostic', itemId: `diagnostic-${trackId}`,
      title: tracks[trackId].title, status: 'in_progress', progressPercent: 5,
      subjectId: `diagnostic-${trackId}`, href: `/exams?diagnostic=${trackId}`
    }).catch?.(() => {});
  } catch (error) {
    const shell = document.getElementById('diagnosticShell');
    shell.innerHTML = `<div class="diagnostic-loading">${escapeHtml(error.message || error)}<div class="diagnostic-result-actions"><button class="diagnostic-secondary" id="cancelDiagnostic">العودة إلى المركز</button></div></div>`;
  }
}

function selectAnswer(choice) {
  if (!state || state.finished) return;
  const question = state.questions[state.index];
  state.answers[state.index] = {
    id: String(question.id),
    subject: question.subject,
    selected: choice,
    answer: Number(question.answer),
    correct: choice === Number(question.answer)
  };
  renderQuestion();
}

function nextQuestion() {
  if (!state || !Number.isInteger(state.answers[state.index]?.selected)) return;
  state.index += 1;
  renderQuestion();
}

function breakdownFor(answers) {
  const map = new Map();
  for (const answer of answers) {
    const row = map.get(answer.subject) || { subject: answer.subject, total: 0, correct: 0 };
    row.total += 1;
    if (answer.correct) row.correct += 1;
    map.set(answer.subject, row);
  }
  return [...map.values()].map(row => ({
    ...row,
    title: subjectTitles[row.subject] || row.subject,
    percent: row.total ? Math.round((row.correct / row.total) * 100) : 0
  })).sort((a, b) => a.percent - b.percent);
}

function readinessMessage(score) {
  if (score >= 85) return 'مستواك قوي. ركز على المحاكاة الزمنية والأسئلة المتقدمة للحفاظ على الجاهزية.';
  if (score >= 70) return 'مستواك جيد. خطتك القادمة ينبغي أن تجمع تثبيت الأخطاء مع محاكاة قصيرة متكررة.';
  if (score >= 50) return 'لديك أساس مناسب، لكنك تحتاج تدريبًا مركزًا على أضعف مادتين قبل المحاكاة الشاملة.';
  return 'ابدأ بالتأسيس المنظم ثم التدريب القصير. ستتغير خطتك تلقائيًا كلما تحسنت نتائجك.';
}

async function finishDiagnostic() {
  if (!state || state.finished) return;
  state.finished = true;
  clearInterval(timer);
  const current = state;
  const answers = current.questions.map((question, index) => current.answers[index] || {
    id: String(question.id), subject: question.subject, selected: null,
    answer: Number(question.answer), correct: false
  });
  const correct = answers.filter(answer => answer.correct).length;
  const total = answers.length;
  const score = total ? Math.round((correct / total) * 100) : 0;
  const elapsed = Math.max(1, Math.round((Date.now() - current.startedAt) / 1000));
  const breakdown = breakdownFor(answers);
  const weakest = breakdown[0];
  const result = {
    date: new Date().toISOString(),
    subject: `diagnostic-${current.trackId}`,
    title: tracks[current.trackId].title,
    correct,
    total,
    score,
    durationSeconds: elapsed,
    level: 'diagnostic',
    mode: 'diagnostic',
    wrongCount: total - correct,
    breakdown,
    answers
  };
  saveHistory(result);
  window.NEON_PROGRESS?.record?.({
    eventType: 'exam_complete', eventKey: `diagnostic:${current.trackId}:${result.date}`,
    centerId: 'exams', itemType: 'diagnostic', itemId: `diagnostic-${current.trackId}-${Date.now()}`,
    title: result.title, status: 'completed', progressPercent: 100,
    masteryScore: score, score, subjectId: `diagnostic-${current.trackId}`,
    correct, total, durationSeconds: elapsed, href: '/exams',
    details: { breakdown, trackId: current.trackId }
  }).catch?.(() => {});

  const shell = document.getElementById('diagnosticShell');
  shell.innerHTML = `
    <div class="diagnostic-head"><div><span class="eyebrow">DIAGNOSTIC REPORT</span><h2>تقرير التشخيص</h2><p>النتيجة إرشادية وتُستخدم لترتيب الخطة والتدريب، وليست توقعًا رسميًا للدرجة.</p></div></div>
    <div class="diagnostic-result-hero"><div class="diagnostic-result-score" style="--diagnostic-angle:${score * 3.6}deg"><strong>${score}%</strong></div><div><h3>${score >= 70 ? 'بداية جيدة لبناء خطة الإتقان' : 'الخطوة التالية واضحة الآن'}</h3><p>${escapeHtml(readinessMessage(score))}</p></div></div>
    <div class="diagnostic-breakdown">${breakdown.map(item => `<article><strong>${escapeHtml(item.title)}</strong><b>${item.percent}%</b><small>${item.correct} من ${item.total}</small></article>`).join('')}</div>
    <div class="diagnostic-recommendation"><strong>الأولوية الأولى:</strong> ${weakest ? `ابدأ بتدريب ${escapeHtml(weakest.title)}؛ فهي الأقل أداءً في هذا التشخيص.` : 'ابدأ بالتدريب الذكي.'}</div>
    <div class="diagnostic-result-actions">${weakest ? `<a class="diagnostic-primary" href="/exams?subject=${encodeURIComponent(weakest.subject)}">تدريب ${escapeHtml(weakest.title)}</a>` : ''}<a class="diagnostic-secondary" href="/">عرض خطتي اليومية</a><button class="diagnostic-secondary" data-start-diagnostic="${current.trackId}">إعادة التشخيص</button></div>`;
  state = null;
}

function cancelDiagnostic() {
  clearInterval(timer);
  state = null;
  const shell = document.getElementById('diagnosticShell');
  if (shell) {
    shell.hidden = true;
    shell.innerHTML = '';
  }
  toggleStandardCenter(false);
  history.replaceState(null, '', '/exams');
  document.getElementById('examSubjects')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function autoSelectSubject() {
  const subject = new URLSearchParams(location.search).get('subject');
  if (!subject) return;
  let attempts = 0;
  const timerId = setInterval(() => {
    attempts += 1;
    const button = document.querySelector(`[data-subject="${CSS.escape(subject)}"]`);
    if (button) {
      clearInterval(timerId);
      button.click();
    } else if (attempts > 80) clearInterval(timerId);
  }, 100);
}

function initialize() {
  if (!document.getElementById('examSubjects')) return;
  ensureUi();
  document.addEventListener('click', event => {
    const start = event.target.closest('[data-start-diagnostic]');
    if (start) startDiagnostic(start.dataset.startDiagnostic);
    const answer = event.target.closest('[data-diagnostic-answer]');
    if (answer) selectAnswer(Number(answer.dataset.diagnosticAnswer));
    if (event.target.id === 'nextDiagnosticQuestion') nextQuestion();
    if (event.target.id === 'cancelDiagnostic') cancelDiagnostic();
  });
  const diagnostic = new URLSearchParams(location.search).get('diagnostic');
  if (tracks[diagnostic]) startDiagnostic(diagnostic);
  else autoSelectSubject();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
