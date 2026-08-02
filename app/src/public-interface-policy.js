const TECHNICAL_ERROR_PATTERNS = [
  /\/legacy\//i,
  /HTTP[_\s-]?\d{3}/i,
  /AUTH_SESSION_UNAVAILABLE/i,
  /RAILWAY_TIMEOUT/i,
  /source\s*map/i,
  /chunk\s*load/i
];

const INTERNAL_NOTE_PATTERNS = [
  /تمت إزالة تكرار النسخ والأسئلة/i,
  /لا تُعرض بيانات المصادر داخل الدروس أو التقارير/i,
  /نتائج الفحص/i,
  /سجل التطوير/i
];

function hasInternalNote(text) {
  return INTERNAL_NOTE_PATTERNS.some(pattern => pattern.test(String(text || '')));
}

function hasTechnicalError(text) {
  return TECHNICAL_ERROR_PATTERNS.some(pattern => pattern.test(String(text || '')));
}

function removeInternalNotes(root = document) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll('[data-admin-only],.internal-note,.maintenance-note,.developer-note,.source-note,.ms-note').forEach(element => {
    const text = element.textContent || '';
    if (element.hasAttribute('data-admin-only') || hasInternalNote(text)) element.remove();
  });
}

function sanitizeTechnicalErrors(root = document) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll('[role="alert"],.form-message,.exam-load-note,.center-intro p,.error-message,.status-message').forEach(element => {
    const text = element.textContent || '';
    if (!hasTechnicalError(text)) return;
    element.textContent = 'تعذر إكمال العملية حاليًا. أعد المحاولة بعد قليل.';
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
        if (node instanceof HTMLElement) applyPublicInterfacePolicy(node);
      });
    });
  });

  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startPolicy, { once: true });
} else {
  startPolicy();
}

export { applyPublicInterfacePolicy };
