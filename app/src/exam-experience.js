import './exam-experience.css';

const HISTORY_KEY = 'neonOptimizedExamHistoryV1';
const NOTEBOOK_KEY = 'neonErrorNotebookV1';
let reportContext = null;

function safeJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback; }
  catch { return fallback; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
}

function normalize(value) {
  return String(value || '').normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
}

function subjectTitle(subject) {
  return {
    'tahsili-math':'رياضيات التحصيلي','tahsili-physics':'فيزياء التحصيلي','tahsili-chemistry':'كيمياء التحصيلي','tahsili-biology':'أحياء التحصيلي',
    'qudurat-verbal':'القدرات اللفظية','qudurat-quant':'القدرات الكمية'
  }[subject] || subject || 'مركز الاختبارات';
}

async function loadBank(subject) {
  const response = await fetch(`/data/exams/${encodeURIComponent(subject)}.json`, { cache:'force-cache' });
  if (!response.ok) return [];
  return response.json();
}

async function captureWrongAnswers(result) {
  if (!result?.subject || !Array.isArray(result.answers)) return;
  const wrong = result.answers.filter(item => item.correct !== true);
  if (!wrong.length) return;
  const bank = await loadBank(result.subject).catch(() => []);
  const byId = new Map(bank.map(question => [String(question.id), question]));
  const notebook = safeJson(NOTEBOOK_KEY, []);
  const byNotebookId = new Map(notebook.map(item => [String(item.id), item]));
  const now = new Date().toISOString();

  for (const answer of wrong) {
    const question = byId.get(String(answer.id));
    if (!question) continue;
    const id = `${result.subject}:${question.id}`;
    const previous = byNotebookId.get(id);
    const wrongCount = Number(previous?.wrongCount || 0) + 1;
    const reviewDays = wrongCount <= 1 ? 1 : wrongCount === 2 ? 2 : 4;
    const nextReview = new Date(Date.now() + reviewDays * 86_400_000).toISOString();
    byNotebookId.set(id, {
      id,
      questionId:String(question.id),
      subject:result.subject,
      subjectTitle:subjectTitle(result.subject),
      question:question.q,
      options:question.options,
      answer:Number(question.answer),
      correctText:question.options?.[Number(question.answer)] || '',
      explain:question.explain || 'راجع المهارة المرتبطة بالسؤال.',
      category:question.category || '',
      wrongCount,
      lastWrongAt:now,
      nextReviewAt:nextReview
    });
  }

  safeSet(NOTEBOOK_KEY, [...byNotebookId.values()].slice(-300));
  window.dispatchEvent(new CustomEvent('neon-error-notebook-updated'));
  updateToolCount();
}

function installHistoryBridge() {
  if (window.__NEON_EXAM_NOTEBOOK_BRIDGE__) return;
  window.__NEON_EXAM_NOTEBOOK_BRIDGE__ = true;
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    const previous = this === localStorage && key === HISTORY_KEY ? safeJson(HISTORY_KEY, []) : null;
    original.call(this, key, value);
    if (this === localStorage && key === HISTORY_KEY) {
      let next = [];
      try { next = JSON.parse(String(value)) || []; } catch {}
      const start = Array.isArray(previous) ? previous.length : 0;
      const added = Array.isArray(next) ? next.slice(start) : [];
      for (const result of added) queueMicrotask(() => captureWrongAnswers(result).catch(() => {}));
    }
  };
}

function ensureTools() {
  const subjectGrid = document.getElementById('examSubjects');
  if (!subjectGrid || document.getElementById('examSuccessTools')) return;
  const tools = document.createElement('section');
  tools.id = 'examSuccessTools';
  tools.className = 'exam-success-tools';
  tools.innerHTML = '<div><h2>دفتر الأخطاء والمراجعة الذكية</h2><p>كل خطأ يُحفظ تلقائيًا مع الإجابة الصحيحة والشرح وموعد المراجعة.</p></div><div class="exam-success-actions"><span class="exam-notebook-count" id="examNotebookCount">0</span><button class="exam-notebook-button" id="openExamNotebook">فتح دفتر الأخطاء</button></div>';
  subjectGrid.insertAdjacentElement('afterend', tools);

  document.body.insertAdjacentHTML('beforeend', `
    <div class="exam-tool-modal" id="examNotebookModal"><div class="exam-tool-card"><div class="exam-tool-head"><div><h2>دفتر الأخطاء</h2><p>ابدأ بالأسئلة المستحقة للمراجعة ثم عد إلى التدريب الذكي.</p></div><button class="exam-tool-close" data-close-exam-tool="examNotebookModal">×</button></div><div class="exam-notebook-list" id="examNotebookList"></div></div></div>
    <div class="exam-tool-modal" id="questionReportModal"><div class="exam-tool-card"><div class="exam-tool-head"><div><h2>الإبلاغ عن سؤال</h2><p>يرسل البلاغ إلى لوحة المراجعة لتحسين بنك الأسئلة.</p></div><button class="exam-tool-close" data-close-exam-tool="questionReportModal">×</button></div><form class="question-report-form" id="questionReportForm"><div class="question-report-context" id="questionReportContext"></div><label>سبب البلاغ<select name="reason"><option value="wrong-answer">الإجابة الصحيحة غير دقيقة</option><option value="unclear">السؤال أو الشرح غير واضح</option><option value="duplicate">السؤال مكرر</option><option value="typo">خطأ إملائي أو تنسيقي</option><option value="other">سبب آخر</option></select></label><label>ملاحظتك<textarea name="note" maxlength="1000" placeholder="اشرح الملاحظة باختصار…"></textarea></label><button class="question-report-submit" type="submit">إرسال البلاغ</button></form></div></div>
  `);
  updateToolCount();
}

function updateToolCount() {
  const count = safeJson(NOTEBOOK_KEY, []).length;
  const element = document.getElementById('examNotebookCount');
  if (element) element.textContent = Number(count).toLocaleString('ar-SA');
}

function openTool(id) {
  document.getElementById(id)?.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeTool(id) {
  document.getElementById(id)?.classList.remove('is-open');
  if (!document.querySelector('.exam-tool-modal.is-open')) document.body.style.overflow = '';
}

function renderNotebook() {
  const list = document.getElementById('examNotebookList');
  if (!list) return;
  const rows = safeJson(NOTEBOOK_KEY, []).sort((a,b) => new Date(a.nextReviewAt || 0) - new Date(b.nextReviewAt || 0));
  if (!rows.length) {
    list.innerHTML = '<div class="exam-tool-empty">لا توجد أخطاء محفوظة بعد. عند أول إجابة خاطئة سيُضاف السؤال هنا تلقائيًا.</div>';
    return;
  }
  list.innerHTML = rows.map(item => `
    <article class="exam-notebook-item"><header><strong>${escapeHtml(item.question)}</strong><button data-resolve-error="${escapeHtml(item.id)}">تمت المراجعة</button></header><p>الصحيحة: <b>${escapeHtml(item.correctText)}</b></p><p>${escapeHtml(item.explain)}</p><small>${escapeHtml(item.subjectTitle)} • تكرر الخطأ ${Number(item.wrongCount || 1).toLocaleString('ar-SA')} مرة</small></article>
  `).join('');
}

function injectReportButtons() {
  document.querySelectorAll('.exam-review-card').forEach(card => {
    if (card.querySelector('.question-report-button')) return;
    const questionText = card.querySelector('.exam-review-question strong')?.textContent?.trim();
    if (!questionText) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'question-report-button';
    button.textContent = '⚑ الإبلاغ عن السؤال';
    button.dataset.questionText = questionText;
    card.appendChild(button);
  });
}

function showToast(message) {
  document.querySelector('.exam-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'exam-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

async function authenticatedPost(path, payload) {
  const user = window.NEON_AUTH_SESSION?.user;
  if (!user?.getIdToken) throw new Error('AUTH_SESSION_UNAVAILABLE');
  const token = await user.getIdToken();
  const response = await fetch(path, { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'تعذر إرسال البلاغ.');
  return data;
}

function openReport(questionText) {
  const notebook = safeJson(NOTEBOOK_KEY, []);
  const match = notebook.find(item => normalize(item.question) === normalize(questionText));
  reportContext = {
    questionText,
    questionId:match?.questionId || '',
    subjectId:match?.subject || ''
  };
  const context = document.getElementById('questionReportContext');
  if (context) context.textContent = questionText;
  openTool('questionReportModal');
}

function installEvents() {
  document.addEventListener('click', event => {
    if (event.target.id === 'openExamNotebook') {
      renderNotebook();
      openTool('examNotebookModal');
    }
    const close = event.target.closest('[data-close-exam-tool]');
    if (close) closeTool(close.dataset.closeExamTool);
    const resolve = event.target.closest('[data-resolve-error]');
    if (resolve) {
      safeSet(NOTEBOOK_KEY, safeJson(NOTEBOOK_KEY, []).filter(item => String(item.id) !== String(resolve.dataset.resolveError)));
      renderNotebook();
      updateToolCount();
      window.dispatchEvent(new CustomEvent('neon-error-notebook-updated'));
    }
    const report = event.target.closest('.question-report-button');
    if (report) openReport(report.dataset.questionText || '');
    if (event.target.classList.contains('exam-tool-modal')) closeTool(event.target.id);
  });

  document.getElementById('questionReportForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'جارٍ الإرسال…';
    try {
      const fields = Object.fromEntries(new FormData(form));
      await authenticatedPost('/api/success/question-report', { ...reportContext, reason:fields.reason, note:fields.note });
      form.reset();
      closeTool('questionReportModal');
      showToast('تم استلام البلاغ وسيظهر للمراجعة الإدارية.');
    } catch (error) {
      showToast(error.message || 'تعذر إرسال البلاغ مؤقتًا.');
    } finally {
      submit.disabled = false;
      submit.textContent = 'إرسال البلاغ';
    }
  });
}

function initializeExamExperience() {
  if (!document.getElementById('examSubjects')) return;
  installHistoryBridge();
  ensureTools();
  installEvents();
  const observer = new MutationObserver(() => injectReportButtons());
  observer.observe(document.body, { childList:true, subtree:true });
  if (location.hash === '#notebook') {
    renderNotebook();
    openTool('examNotebookModal');
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeExamExperience, { once:true });
else initializeExamExperience();
