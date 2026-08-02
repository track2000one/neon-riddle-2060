const TUTOR_PATHS = new Set(['/tutor', '/tutor/', '/tutor.html']);
const LAST_CENTER_KEY = 'neonAcademyLastCenterV1';

function isTutorHref(value) {
  if (!value) return false;
  try {
    const url = new URL(value, location.origin);
    return TUTOR_PATHS.has(url.pathname);
  } catch {
    return false;
  }
}

function retireTutorEntries(root = document) {
  const scope = root?.querySelectorAll ? root : document;

  scope.querySelectorAll('a[href], [data-center="tutor"], [data-progress-center="tutor"]').forEach(element => {
    if (
      element.matches('[data-center="tutor"], [data-progress-center="tutor"]') ||
      isTutorHref(element.getAttribute?.('href'))
    ) {
      element.remove();
    }
  });

  scope.querySelectorAll('.section-heading p').forEach(paragraph => {
    const original = paragraph.textContent || '';
    const updated = original
      .replace(/والمعلم الذكي[،,]?\s*/g, '')
      .replace(/المعلم الذكي[،,]?\s*/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (updated && updated !== original.trim()) paragraph.textContent = updated;
  });

  const continueButton = document.getElementById('continueButton');
  if (continueButton && isTutorHref(continueButton.getAttribute('href'))) {
    continueButton.setAttribute('href', '/step');
    continueButton.title = 'متابعة التعلم';
  }
}

function clearRetiredDestination() {
  try {
    if (isTutorHref(localStorage.getItem(LAST_CENTER_KEY))) {
      localStorage.removeItem(LAST_CENTER_KEY);
    }
  } catch {
    // Storage restrictions must not block the interface cleanup.
  }
}

const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
if (normalizedPath === '/tutor' || normalizedPath === '/tutor.html') {
  location.replace('/');
} else {
  clearRetiredDestination();
  retireTutorEntries();

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) retireTutorEntries(node);
      });
    }
    retireTutorEntries();
  });

  const start = () => {
    retireTutorEntries();
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.addEventListener('neon-progress-summary', () => queueMicrotask(() => retireTutorEntries()));
}
