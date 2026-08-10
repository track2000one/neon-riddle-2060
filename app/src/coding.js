import './coding.css';
import { ensureAuth, renderAccount } from './auth.js';

const CONTENT_URL = '/data/coding/content.json';
const LEGACY_PROGRESS_KEY = 'msarCodingLearningProgressV2';
const PROGRESS_PREFIX = 'neonCodingProgressV3:';
const BROWSER_LANGUAGES = new Set(['html', 'css', 'javascript']);
const STRUCTURE_CHECKS = {
  python: [/#|print\s*\(|def\s+|for\s+|if\s+/i, 'أضف تعليمة Python مثل print أو دالة أو شرط أو حلقة.'],
  java: [/class\s+\w+|public\s+static\s+void\s+main/i, 'أضف بنية Java مثل class أو دالة main.'],
  cpp: [/#include|int\s+main|cout/i, 'أضف include أو main أو cout إلى مثال C++.'],
  csharp: [/using\s+System|class\s+\w+|Console\.WriteLine/i, 'أضف بنية C# مثل class أو Console.WriteLine.'],
  dart: [/void\s+main|final\s+|print\s*\(/i, 'أضف main أو متغيرًا أو print في Dart.'],
  sql: [/SELECT|CREATE\s+TABLE|INSERT|UPDATE|DELETE/i, 'أضف استعلام SQL مثل SELECT أو CREATE TABLE.'],
  git: [/git\s+(init|add|commit|push|pull|status|switch|branch)/i, 'أضف أمر Git صحيحًا مثل git status أو git commit.']
};

let content = null;
let session = null;
let state = null;
let activeCourse = null;
let activeLesson = null;
let activeChallenge = null;
let activeTab = 'learn';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);

function progressKey() {
  return `${PROGRESS_PREFIX}${session.user.uid}`;
}

function defaultState() {
  return {
    completed: [],
    answers: {},
    challengeCompleted: [],
    drafts: {},
    xp: 0,
    lastCourse: 'javascript',
    lastLesson: 'js-1',
    activeLanguage: 'javascript'
  };
}

function sanitizeState(value) {
  const base = defaultState();
  if (!value || typeof value !== 'object') return base;
  return {
    completed: Array.isArray(value.completed) ? [...new Set(value.completed.map(String))] : [],
    answers: value.answers && typeof value.answers === 'object' ? value.answers : {},
    challengeCompleted: Array.isArray(value.challengeCompleted) ? [...new Set(value.challengeCompleted.map(String))] : [],
    drafts: value.drafts && typeof value.drafts === 'object' ? value.drafts : {},
    xp: Math.max(0, Number(value.xp) || 0),
    lastCourse: String(value.lastCourse || base.lastCourse),
    lastLesson: String(value.lastLesson || base.lastLesson),
    activeLanguage: String(value.activeLanguage || base.activeLanguage)
  };
}

function loadState() {
  const key = progressKey();
  try {
    const current = localStorage.getItem(key);
    if (current) return sanitizeState(JSON.parse(current));
    const legacy = localStorage.getItem(LEGACY_PROGRESS_KEY);
    if (legacy) {
      const migrated = sanitizeState(JSON.parse(legacy));
      localStorage.setItem(key, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_PROGRESS_KEY);
      return migrated;
    }
  } catch (error) {
    console.warn('NEON coding progress load failed:', error?.message || error);
  }
  return defaultState();
}

function saveState() {
  if (!state || !session?.user?.uid) return;
  state.lastCourse = activeCourse?.id || state.lastCourse;
  state.lastLesson = activeLesson?.id || state.lastLesson;
  try { localStorage.setItem(progressKey(), JSON.stringify(state)); }
  catch (error) { console.warn('NEON coding progress save failed:', error?.message || error); }
}

function courseById(id) {
  return content.courses.find(course => course.id === id) || content.courses.find(course => course.id === 'javascript') || content.courses[0];
}

function lessonCount() {
  return content.courses.reduce((sum, course) => sum + course.lessons.length, 0);
}

function completedInCourse(course) {
  return course.lessons.filter(lesson => state.completed.includes(lesson.id)).length;
}

function progressPercent() {
  return Math.round((state.completed.length / Math.max(1, lessonCount())) * 100);
}

function toast(message) {
  const node = $('#codingToast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 2300);
}

function renderStats() {
  $('#codingCourseCount').textContent = String(content.counts.courses);
  $('#codingLessonCount').textContent = String(content.counts.lessons);
  $('#codingChallengeCount').textContent = String(content.counts.challenges);
  $('#codingCompletedCount').textContent = String(state.completed.length);
  $('#codingXpCount').textContent = String(state.xp);
  $('#codingProgressPercent').textContent = `${progressPercent()}%`;
  $('#codingProgressBar').style.width = `${progressPercent()}%`;
}

function renderCourses() {
  $('#codingCourseRail').innerHTML = content.courses.map(course => `
    <button class="coding-course-chip ${course.id === activeCourse.id ? 'active' : ''}" data-course-id="${esc(course.id)}" style="--course-color:${esc(course.color)}">
      <span>${esc(course.icon)}</span><b>${esc(course.title)}</b><small>${completedInCourse(course)}/${course.lessons.length}</small>
    </button>`).join('');

  $('#codingCourseSummary').innerHTML = `
    <span class="coding-course-icon" style="--course-color:${esc(activeCourse.color)}">${esc(activeCourse.icon)}</span>
    <div><small>المسار الحالي</small><h3>${esc(activeCourse.title)}</h3><p>${esc(activeCourse.description)}</p></div>`;
  renderLessonList();
}

function renderLessonList() {
  $('#codingLessonList').innerHTML = activeCourse.lessons.map((lesson, index) => {
    const complete = state.completed.includes(lesson.id);
    return `<button class="coding-lesson-item ${lesson.id === activeLesson.id ? 'active' : ''} ${complete ? 'completed' : ''}" data-lesson-id="${esc(lesson.id)}">
      <span>${complete ? '✓' : index + 1}</span><div><strong>${esc(lesson.title)}</strong><small>${esc(lesson.level)} • ${lesson.minutes} دقيقة</small></div>
    </button>`;
  }).join('');
  renderLesson();
}

function renderLesson() {
  const answered = Boolean(state.answers[activeLesson.id]);
  const completed = state.completed.includes(activeLesson.id);
  $('#codingLessonView').innerHTML = `
    <header class="lesson-head">
      <div><span class="coding-level-badge">${esc(activeLesson.level)}</span><h2>${esc(activeLesson.title)}</h2><p>${esc(activeLesson.summary)}</p></div>
      <span class="coding-duration">⏱ ${activeLesson.minutes} دقيقة</span>
    </header>
    <section class="coding-objectives"><h3>ستتعلم في هذا الدرس</h3><ul>${activeLesson.points.map(point => `<li>${esc(point)}</li>`).join('')}</ul></section>
    <section class="coding-example"><div class="section-line"><h3>مثال تطبيقي</h3><button type="button" data-copy-code>نسخ الكود</button></div><pre><code>${esc(activeLesson.code)}</code></pre><button class="coding-open-lab" type="button" data-open-lesson-lab>افتح المثال في المختبر ←</button></section>
    <section class="coding-quiz"><span class="coding-kicker">QUICK CHECK</span><h3>${esc(activeLesson.question)}</h3><div class="coding-quiz-options">${activeLesson.options.map((option, index) => `<button type="button" data-option="${index}" ${answered ? 'disabled' : ''} class="${answered && index === activeLesson.answer ? 'correct' : ''}">${esc(option)}</button>`).join('')}</div><p id="codingQuizFeedback" class="coding-quiz-feedback ${answered ? 'success' : ''}">${answered ? 'أحسنت، تم اجتياز السؤال.' : 'اختر الإجابة الصحيحة.'}</p></section>
    <section class="coding-mini-challenge"><span>🎯</span><div><h3>تطبيق الدرس</h3><p>${esc(activeLesson.task)}</p></div><button type="button" data-open-lesson-lab>ابدأ التطبيق</button></section>
    <footer class="lesson-footer"><button type="button" class="coding-complete-button ${completed ? 'completed' : ''}" data-complete>${completed ? '✓ تم إكمال الدرس' : 'أكملت الدرس'}</button><div><button type="button" data-nav="prev">السابق</button><button type="button" data-nav="next">التالي</button></div></footer>`;
}

function renderChallenges() {
  $('#codingChallengeGrid').innerHTML = content.challenges.map(challenge => {
    const course = courseById(challenge.language);
    const done = state.challengeCompleted.includes(challenge.id);
    return `<article class="coding-challenge-card ${done ? 'completed' : ''}"><header><span>${esc(course.icon)}</span><b>${esc(challenge.level)}</b></header><h3>${esc(challenge.title)}</h3><p>${esc(challenge.description)}</p><ul>${challenge.checks.map(check => `<li>${esc(check)}</li>`).join('')}</ul><button type="button" data-challenge="${esc(challenge.id)}">${done ? '✓ افتح التحدي مجددًا' : 'ابدأ التحدي في المختبر'}</button></article>`;
  }).join('');
}

function setTab(tab) {
  activeTab = tab;
  $$('[data-coding-tab]').forEach(button => button.classList.toggle('active', button.dataset.codingTab === tab));
  $$('[data-coding-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.codingPanel === tab));
}

function languageDraftKey(language) {
  return `language:${language}`;
}

function starterForLanguage(language) {
  const course = courseById(language);
  return state.drafts[languageDraftKey(language)] || course.lessons[0]?.code || '';
}

function setLanguage(language, code = null) {
  const course = courseById(language);
  state.activeLanguage = course.id;
  $$('[data-lab-language]').forEach(button => button.classList.toggle('active', button.dataset.labLanguage === course.id));
  $('#activeLanguageIcon').textContent = course.icon;
  $('#activeLanguageTitle').textContent = course.title;
  $('#codeEditor').value = code ?? starterForLanguage(course.id);
  $('#codeFeedback').className = 'code-feedback';
  $('#codeFeedback').textContent = BROWSER_LANGUAGES.has(course.id)
    ? 'هذا المسار يعمل داخل معاينة متصفح معزولة عن المنصة.'
    : 'هذا المسار يقدم فحصًا تعليميًا لبنية الكود دون تشغيل مترجم على الخادم.';
  $('#consoleOutput').textContent = `${course.title} workspace ready…`;
  $('#livePreview').srcdoc = '';
  saveState();
}

function renderLabLanguages() {
  $('#codingLanguageList').innerHTML = content.courses.map(course => `<button type="button" data-lab-language="${esc(course.id)}"><span>${esc(course.icon)}</span>${esc(course.title)}</button>`).join('');
  setLanguage(state.activeLanguage);
}

function previewBridge() {
  return `<script>(()=>{const send=(type,args)=>parent.postMessage({channel:'neon-coding-preview',type,args:args.map(v=>{try{return typeof v==='object'?JSON.stringify(v):String(v)}catch{return String(v)}})},'*');['log','info','warn','error'].forEach(type=>{const original=console[type];console[type]=(...args)=>{send(type,args);original.apply(console,args)}});addEventListener('error',event=>send('error',[event.message]));addEventListener('unhandledrejection',event=>send('error',[event.reason?.message||event.reason||'Unhandled rejection']));})();<\/script>`;
}

function safeScript(code) {
  return String(code).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
}

function renderBrowserPreview(language, code) {
  const preview = $('#livePreview');
  if (language === 'html') {
    const bridge = previewBridge();
    preview.srcdoc = /<head[\s>]/i.test(code) ? code.replace(/<head([^>]*)>/i, `<head$1>${bridge}`) : `${bridge}${code}`;
    return 'تم تحديث معاينة HTML داخل Sandbox.';
  }
  if (language === 'css') {
    preview.srcdoc = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">${previewBridge()}<style>${safeScript(code)}</style></head><body><main class="card"><h1>معاينة CSS</h1><p>عدّل التنسيق وشاهد النتيجة هنا.</p><button>عنصر تجريبي</button></main></body></html>`;
    return 'تم تطبيق CSS داخل صفحة معاينة معزولة.';
  }
  preview.srcdoc = `<!doctype html><html><head><meta charset="utf-8">${previewBridge()}<style>body{font-family:system-ui;background:#0b1220;color:#eaf2ff;display:grid;place-items:center;min-height:100vh;margin:0}main{text-align:center}</style></head><body><main><h2>JavaScript Sandbox</h2><p>راجع Console لنتائج التنفيذ.</p></main><script>${safeScript(code)}<\/script></body></html>`;
  return 'تم إرسال JavaScript إلى بيئة Sandbox منفصلة عن المنصة.';
}

function structuralCheck(language, code) {
  const [pattern, message] = STRUCTURE_CHECKS[language] || [/.+/, 'أضف كودًا صالحًا للفحص.'];
  const valid = pattern.test(code);
  return { valid, message: valid ? 'اجتاز الكود الفحص البنيوي التعليمي. استخدم مترجمًا موثوقًا للتنفيذ الفعلي.' : message };
}

function runCode() {
  const language = state.activeLanguage;
  const code = $('#codeEditor').value;
  const feedback = $('#codeFeedback');
  const output = $('#consoleOutput');
  feedback.className = 'code-feedback';
  output.textContent = '';
  if (!code.trim()) {
    feedback.classList.add('error');
    feedback.textContent = 'اكتب كودًا أولًا.';
    return;
  }
  state.drafts[languageDraftKey(language)] = code;
  saveState();

  if (BROWSER_LANGUAGES.has(language)) {
    feedback.classList.add('success');
    feedback.textContent = renderBrowserPreview(language, code);
    output.textContent = language === 'javascript' ? 'جارٍ استقبال Console من الـSandbox…' : 'Preview rendered successfully.';
  } else {
    const result = structuralCheck(language, code);
    feedback.classList.add(result.valid ? 'success' : 'error');
    feedback.textContent = result.message;
    output.textContent = result.valid ? 'Structure check passed.' : result.message;
    $('#livePreview').srcdoc = '';
  }
}

function requirementPass(code, requirement) {
  const normalized = code.toLowerCase();
  return String(requirement).toLowerCase().split(/\s+(?:أو|or)\s+|\|/).some(part => normalized.includes(part.trim()));
}

function checkChallenge() {
  if (!activeChallenge) {
    toast('اختر تحديًا من تبويب التدريب أولًا.');
    return;
  }
  const code = $('#codeEditor').value;
  const results = activeChallenge.checks.map(check => ({ check, pass: requirementPass(code, check) }));
  $('#challengeCheckList').innerHTML = results.map(item => `<li class="${item.pass ? 'pass' : 'miss'}">${item.pass ? '✓' : '○'} ${esc(item.check)}</li>`).join('');
  const passed = results.every(item => item.pass);
  $('#challengeCheckResult').textContent = passed ? 'اكتملت متطلبات التحدي الأساسية.' : 'بعض المتطلبات لم تظهر في الكود بعد.';
  $('#challengeCheckResult').className = passed ? 'success' : 'error';
  if (passed && !state.challengeCompleted.includes(activeChallenge.id)) {
    state.challengeCompleted.push(activeChallenge.id);
    state.xp += 50;
    saveState();
    renderStats();
    renderChallenges();
    toast('تم اجتياز التحدي وإضافة 50 نقطة.');
  }
}

function openLessonLab() {
  activeChallenge = null;
  $('#activeChallengeCard').hidden = true;
  setTab('lab');
  setLanguage(activeCourse.id, activeLesson.code);
  $('#codeEditor').focus();
}

function openChallenge(challengeId) {
  const challenge = content.challenges.find(item => item.id === challengeId);
  if (!challenge) return;
  activeChallenge = challenge;
  $('#activeChallengeCard').hidden = false;
  $('#activeChallengeTitle').textContent = challenge.title;
  $('#activeChallengeDescription').textContent = challenge.description;
  $('#challengeCheckList').innerHTML = challenge.checks.map(check => `<li>○ ${esc(check)}</li>`).join('');
  $('#challengeCheckResult').textContent = 'اكتب الحل ثم شغّل الكود وافحص المتطلبات.';
  $('#challengeCheckResult').className = '';
  setTab('lab');
  setLanguage(challenge.language, challenge.starter);
  $('#codeEditor').focus();
}

function selectCourse(courseId) {
  activeCourse = courseById(courseId);
  activeLesson = activeCourse.lessons[0];
  saveState();
  renderCourses();
}

function selectLesson(lessonId) {
  activeLesson = activeCourse.lessons.find(lesson => lesson.id === lessonId) || activeLesson;
  saveState();
  renderLessonList();
}

function answerQuestion(index, button) {
  if (state.answers[activeLesson.id]) return;
  const feedback = $('#codingQuizFeedback');
  if (index === activeLesson.answer) {
    state.answers[activeLesson.id] = true;
    state.xp += 15;
    saveState();
    $$('[data-option]').forEach((option, optionIndex) => {
      option.disabled = true;
      option.classList.toggle('correct', optionIndex === activeLesson.answer);
    });
    feedback.textContent = 'إجابة صحيحة — أضيفت 15 نقطة.';
    feedback.className = 'coding-quiz-feedback success';
    renderStats();
  } else {
    button.classList.add('wrong');
    feedback.textContent = 'راجع الشرح وحاول مرة أخرى.';
    feedback.className = 'coding-quiz-feedback error';
  }
}

function completeLesson() {
  if (state.completed.includes(activeLesson.id)) return;
  state.completed.push(activeLesson.id);
  state.xp += 35;
  saveState();
  renderStats();
  renderCourses();
  toast('تم إكمال الدرس وإضافة 35 نقطة.');
}

function navigateLesson(direction) {
  let index = activeCourse.lessons.findIndex(lesson => lesson.id === activeLesson.id) + (direction === 'next' ? 1 : -1);
  if (index < 0) index = activeCourse.lessons.length - 1;
  if (index >= activeCourse.lessons.length) index = 0;
  activeLesson = activeCourse.lessons[index];
  saveState();
  renderLessonList();
}

function bindEvents() {
  document.addEventListener('click', event => {
    const tab = event.target.closest('[data-coding-tab]');
    if (tab) return setTab(tab.dataset.codingTab);
    const course = event.target.closest('[data-course-id]');
    if (course) return selectCourse(course.dataset.courseId);
    const lesson = event.target.closest('[data-lesson-id]');
    if (lesson) return selectLesson(lesson.dataset.lessonId);
    const option = event.target.closest('[data-option]');
    if (option) return answerQuestion(Number(option.dataset.option), option);
    if (event.target.closest('[data-complete]')) return completeLesson();
    const nav = event.target.closest('[data-nav]');
    if (nav) return navigateLesson(nav.dataset.nav);
    if (event.target.closest('[data-open-lesson-lab]')) return openLessonLab();
    if (event.target.closest('[data-copy-code]')) {
      navigator.clipboard?.writeText(activeLesson.code).then(() => toast('تم نسخ الكود.')).catch(() => toast('تعذر النسخ التلقائي.'));
      return;
    }
    const challenge = event.target.closest('[data-challenge]');
    if (challenge) return openChallenge(challenge.dataset.challenge);
    const language = event.target.closest('[data-lab-language]');
    if (language) return setLanguage(language.dataset.labLanguage);
  });

  $('#runCodeButton').addEventListener('click', runCode);
  $('#resetCodeButton').addEventListener('click', () => {
    const language = state.activeLanguage;
    delete state.drafts[languageDraftKey(language)];
    setLanguage(language, activeChallenge?.language === language ? activeChallenge.starter : courseById(language).lessons[0]?.code || '');
    toast('تمت استعادة كود البداية.');
  });
  $('#checkChallengeButton').addEventListener('click', checkChallenge);
  $('#codeEditor').addEventListener('input', event => {
    state.drafts[languageDraftKey(state.activeLanguage)] = event.target.value;
    saveState();
  });
  window.addEventListener('message', event => {
    const preview = $('#livePreview');
    if (event.source !== preview?.contentWindow || event.data?.channel !== 'neon-coding-preview') return;
    const line = `[${event.data.type || 'log'}] ${(event.data.args || []).join(' ')}`;
    const output = $('#consoleOutput');
    output.textContent = output.textContent.includes('جارٍ استقبال') ? line : `${output.textContent}${output.textContent ? '\n' : ''}${line}`;
  });
}

async function loadContent() {
  const response = await fetch(CONTENT_URL, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`CODING_CONTENT_HTTP_${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.courses) || !data.courses.length || !Array.isArray(data.challenges)) throw new Error('CODING_CONTENT_INVALID');
  return data;
}

function initStateFromContent() {
  activeCourse = courseById(state.lastCourse);
  activeLesson = activeCourse.lessons.find(lesson => lesson.id === state.lastLesson) || activeCourse.lessons[0];
  if (!content.courses.some(course => course.id === state.activeLanguage)) state.activeLanguage = activeCourse.id;
}

async function boot() {
  const overlay = $('#codingBootOverlay');
  try {
    session = await ensureAuth();
    renderAccount(session);
    content = await loadContent();
    state = loadState();
    initStateFromContent();
    renderStats();
    renderCourses();
    renderChallenges();
    renderLabLanguages();
    bindEvents();
    overlay?.remove();
  } catch (error) {
    if (String(error?.message || '').includes('Authentication required')) return;
    console.error('Modern coding center boot failed:', error);
    if (overlay) overlay.innerHTML = '<div class="coding-boot-error"><strong>تعذر تجهيز مركز البرمجة</strong><p>أعد تحميل الصفحة، وإذا استمرت المشكلة فتحقق من اتصال المنصة.</p><button type="button" onclick="location.reload()">إعادة المحاولة</button></div>';
  }
}

boot();
