const HISTORY_KEY = 'neonOptimizedExamHistoryV1';
const NOTEBOOK_KEY = 'neonErrorNotebookV1';

function safeJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback; }
  catch { return fallback; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
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
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

async function storeDiagnosticMistakes(result) {
  if (!String(result?.subject || '').startsWith('diagnostic-') || !Array.isArray(result.answers)) return;
  const wrong = result.answers.filter(answer => answer.correct !== true && answer.subject);
  if (!wrong.length) return;
  const subjects = [...new Set(wrong.map(answer => answer.subject))];
  const banks = await Promise.all(subjects.map(async subject => [subject, await loadBank(subject)]));
  const questions = new Map();
  for (const [subject, rows] of banks) {
    for (const question of rows) questions.set(`${subject}:${question.id}`, question);
  }

  const notebook = safeJson(NOTEBOOK_KEY, []);
  const byId = new Map(notebook.map(item => [String(item.id), item]));
  const now = new Date().toISOString();
  for (const answer of wrong) {
    const question = questions.get(`${answer.subject}:${answer.id}`);
    if (!question) continue;
    const id = `${answer.subject}:${question.id}`;
    const previous = byId.get(id);
    const wrongCount = Number(previous?.wrongCount || 0) + 1;
    const reviewDays = wrongCount <= 1 ? 1 : wrongCount === 2 ? 2 : 4;
    byId.set(id, {
      id,
      questionId:String(question.id),
      subject:answer.subject,
      subjectTitle:subjectTitle(answer.subject),
      question:question.q,
      options:question.options,
      answer:Number(question.answer),
      correctText:question.options?.[Number(question.answer)] || '',
      explain:question.explain || 'راجع المهارة المرتبطة بالسؤال.',
      category:question.category || '',
      wrongCount,
      lastWrongAt:now,
      nextReviewAt:new Date(Date.now() + reviewDays * 86_400_000).toISOString()
    });
  }
  safeSet(NOTEBOOK_KEY, [...byId.values()].slice(-300));
  window.dispatchEvent(new CustomEvent('neon-error-notebook-updated'));
}

if (!window.__NEON_DIAGNOSTIC_NOTEBOOK_BRIDGE__) {
  window.__NEON_DIAGNOSTIC_NOTEBOOK_BRIDGE__ = true;
  const previousSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function diagnosticSetItem(key, value) {
    const before = this === localStorage && key === HISTORY_KEY ? safeJson(HISTORY_KEY, []) : null;
    previousSetItem.call(this, key, value);
    if (this !== localStorage || key !== HISTORY_KEY) return;
    let after = [];
    try { after = JSON.parse(String(value)) || []; } catch {}
    const added = Array.isArray(after) ? after.slice(Array.isArray(before) ? before.length : 0) : [];
    for (const result of added) {
      if (String(result?.subject || '').startsWith('diagnostic-')) {
        queueMicrotask(() => storeDiagnosticMistakes(result).catch(error => console.warn('Diagnostic notebook update failed:', error)));
      }
    }
  };
}
