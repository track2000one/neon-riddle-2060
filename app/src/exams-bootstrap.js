import './exam-skill-selector.js';
import './exam-subject-icons.js';
import { prepareModernExamRuntime } from './exam-modern-runtime.js';

const initialParams = new URLSearchParams(location.search);
const initialSubject = String(initialParams.get('subject') || '').trim();
const initialSkill = String(initialParams.get('skill') || '').trim();
const initialDiagnostic = String(initialParams.get('diagnostic') || '').trim();
const hasInitialRoute = Boolean(initialSubject || ['tahsili', 'qudurat'].includes(initialDiagnostic));

function holdInitialRouteCover() {
  if (!hasInitialRoute) return () => {};
  const overlay = document.getElementById('bootOverlay');
  if (!overlay) return () => {};

  overlay.dataset.initialRoutePending = 'true';
  overlay.style.setProperty('opacity', '1', 'important');
  overlay.style.setProperty('visibility', 'visible', 'important');
  overlay.style.setProperty('pointer-events', 'auto', 'important');
  const text = overlay.querySelector('p');
  if (text) text.textContent = initialDiagnostic
    ? 'جارٍ فتح التشخيص المطلوب…'
    : 'جارٍ فتح التدريب المطلوب…';

  let released = false;
  let observer;
  let timeout;

  const release = () => {
    if (released) return;
    released = true;
    observer?.disconnect();
    clearTimeout(timeout);
    delete overlay.dataset.initialRoutePending;
    overlay.style.removeProperty('opacity');
    overlay.style.removeProperty('visibility');
    overlay.style.removeProperty('pointer-events');
    overlay.classList.add('hidden');
  };

  const routeIsReady = () => {
    if (initialDiagnostic) {
      const shell = document.getElementById('diagnosticShell');
      return Boolean(shell && !shell.hidden);
    }

    if (initialSubject) {
      const selected = document.querySelector(`.exam-subject.selected[data-subject="${CSS.escape(initialSubject)}"]`);
      const setup = document.getElementById('examSetup');
      const skillReady = !initialSkill || Boolean(document.getElementById('examSkill'));
      return Boolean(selected && setup && !setup.hidden && skillReady);
    }

    return true;
  };

  const check = () => {
    if (!routeIsReady()) return;
    requestAnimationFrame(() => requestAnimationFrame(release));
  };

  observer = new MutationObserver(check);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'hidden']
  });
  timeout = window.setTimeout(release, 8000);
  check();
  return check;
}

const checkInitialRoute = holdInitialRouteCover();

await prepareModernExamRuntime();
await import('./exams.js');
await import('./exam-training-journey.js');
checkInitialRoute();
