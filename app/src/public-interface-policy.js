const TECHNICAL_ERROR_PATTERNS = [
  /\/legacy\//i,
  /HTTP[_\s-]?\d{3}/i,
  /AUTH_SESSION_UNAVAILABLE/i,
  /RAILWAY_TIMEOUT/i,
  /source\s*map/i,
  /chunk\s*load/i,
  /PostgreSQL/i,
  /Firebase/i,
  /Railway/i,
  /GitHub Pages/i,
  /\bUID\b/i,
  /\bAPI\b/i
];

const INTERNAL_NOTE_PATTERNS = [
  /تمت إزالة تكرار النسخ والأسئلة/i,
  /لا تُعرض بيانات المصادر داخل الدروس أو التقارير/i,
  /نتائج الفحص/i,
  /سجل التطوير/i
];

const INTERNAL_SELECTORS = '[data-admin-only],.internal-note,.maintenance-note,.developer-note,.source-note,.ms-note';
const ERROR_SELECTORS = '[role="alert"],.form-message,.exam-load-note,.center-intro p,.error-message,.status-message,.progress-empty,.progress-sync-state';

function hasInternalNote(text) {
  return INTERNAL_NOTE_PATTERNS.some(pattern => pattern.test(String(text || '')));
}

function hasTechnicalError(text) {
  return TECHNICAL_ERROR_PATTERNS.some(pattern => pattern.test(String(text || '')));
}

function matchingElements(root, selector) {
  const elements = [];
  if (root instanceof Element && root.matches(selector)) elements.push(root);
  if (root?.querySelectorAll) elements.push(...root.querySelectorAll(selector));
  return elements;
}

function removeInternalNotes(root = document) {
  matchingElements(root, INTERNAL_SELECTORS).forEach(element => {
    const text = element.textContent || '';
    if (element.hasAttribute('data-admin-only') || hasInternalNote(text)) element.remove();
  });
}

function sanitizeTechnicalErrors(root = document) {
  matchingElements(root, ERROR_SELECTORS).forEach(element => {
    const text = element.textContent || '';
    if (!hasTechnicalError(text)) return;
    element.textContent = text.includes('مزامنة')
      ? 'سيتم مزامنة تقدمك تلقائيًا عند عودة الاتصال.'
      : 'تعذر إكمال العملية حاليًا. أعد المحاولة بعد قليل.';
  });
}

function applyPublicInterfacePolicy(root = document) {
  removeInternalNotes(root);
  sanitizeTechnicalErrors(root);
}

function startPolicy() {
  applyPublicInterfacePolicy(document);

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof Element) applyPublicInterfacePolicy(node);
      });
      if (mutation.type === 'characterData' && mutation.target.parentElement) {
        applyPublicInterfacePolicy(mutation.target.parentElement);
      }
    });
  });

  if (document.body) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startPolicy, { once: true });
} else {
  startPolicy();
}

export { applyPublicInterfacePolicy };
