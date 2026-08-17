const SUBJECT_LABELS = {
  'english-step': 'اللغة الإنجليزية STEP',
  step: 'اللغة الإنجليزية STEP',
  'qudurat-quant': 'القدرات الكمية',
  'qudurat-verbal': 'القدرات اللفظية',
  qudurat: 'اختبار القدرات',
  'tahsili-math': 'رياضيات التحصيلي',
  'tahsili-physics': 'فيزياء التحصيلي',
  'tahsili-chemistry': 'كيمياء التحصيلي',
  'tahsili-biology': 'أحياء التحصيلي',
  tahsili: 'التحصيلي العلمي'
};

const SUBJECT_ID_PATTERN = new RegExp(
  Object.keys(SUBJECT_LABELS)
    .sort((first, second) => second.length - first.length)
    .map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'gi'
);

function profileForCurrentUser() {
  const uid = window.NEON_AUTH_SESSION?.user?.uid;
  if (!uid) return null;
  try {
    return JSON.parse(localStorage.getItem(`neonStudentGoalV1:${uid}`) || 'null');
  } catch {
    return null;
  }
}

function routeForTrack(track) {
  return track === 'step' ? '/step' : '/exams';
}

function normalizeTaskTitle(title) {
  return String(title || '')
    .trim()
    .replace(SUBJECT_ID_PATTERN, identifier => SUBJECT_LABELS[identifier.toLowerCase()] || identifier)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function routeFromTaskText(text) {
  const value = String(text || '').toLowerCase();
  if (/english[\s_-]*step|\bstep\b|اللغة الإنجليزية/.test(value)) return '/step';
  if (/qudurat|tahsili|قدرات|تحصيلي|كمي|لفظي|رياضيات|فيزياء|كيمياء|أحياء|علوم البيئة/.test(value)) return '/exams';
  return '';
}

function focusedRoute(list) {
  const focused = list?.querySelector('[data-plan-task="focused-practice"]');
  return focused ? routeFromTaskText(focused.textContent) || focused.dataset.resolvedRoute || '' : '';
}

function resolvedTaskRoute(task) {
  const taskId = task.dataset.planTask || '';
  const profile = profileForCurrentUser();
  const profileRoute = routeForTrack(profile?.examTrack);
  const textRoute = routeFromTaskText(task.textContent);

  if (taskId === 'diagnostic') {
    if (profile?.examTrack === 'tahsili' || profile?.examTrack === 'qudurat') {
      return `/exams?diagnostic=${profile.examTrack}`;
    }
    return profile?.examTrack === 'step' ? '/step#diagnostic' : profileRoute;
  }

  if (taskId === 'focused-practice') return textRoute || profileRoute;
  if (taskId === 'mini-simulation') return focusedRoute(task.closest('.daily-plan-list')) || textRoute || profileRoute;
  return task.getAttribute('href') || profileRoute;
}

function applyTaskRouting(root = document) {
  const tasks = [];
  if (root instanceof Element && root.matches('[data-plan-task]')) tasks.push(root);
  if (root?.querySelectorAll) tasks.push(...root.querySelectorAll('[data-plan-task]'));

  tasks.forEach(task => {
    const title = task.querySelector('.plan-copy strong');
    if (title) title.textContent = normalizeTaskTitle(title.textContent);

    const route = resolvedTaskRoute(task);
    task.dataset.resolvedRoute = route;
    task.setAttribute('href', route);

    if (task.dataset.planTask === 'focused-practice' && route === '/step') {
      task.setAttribute('aria-label', 'فتح تدريب مركز في اللغة الإنجليزية STEP');
    }
    if (task.dataset.planTask === 'mini-simulation' && route === '/step') {
      task.setAttribute('aria-label', 'فتح محاكاة قصيرة في اللغة الإنجليزية STEP');
    }
  });
}

function startRoutingObserver() {
  applyTaskRouting(document);
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof Element) applyTaskRouting(node);
      });
    });
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener('click', event => {
  const task = event.target.closest?.('[data-plan-task]');
  if (!task) return;

  const route = resolvedTaskRoute(task);
  if (!route) return;
  event.preventDefault();
  location.assign(route);
}, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startRoutingObserver, { once: true });
} else {
  startRoutingObserver();
}
