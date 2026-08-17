import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

const PROFILE_KEY = 'neonRiddleGrandProfilesV4';
const SETTINGS_KEY = 'neonRiddleGrandSettingsV4';
const AI_LOAD_TIMEOUT_MS = 15000;
const ASSET_REV = window.NEON_ASSET_REV || '20260817-2030-r2';
document.documentElement.dataset.neonBuild = ASSET_REV;
const EXAM_DATA_ASSETS = Array.from(window.NEON_EXAM_DATA_ASSETS || []);
const EXAM_RUNTIME_ASSETS = Array.from(window.NEON_EXAM_RUNTIME_ASSETS || []);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let academyLoaded = false;
let academyBootFinished = false;

const ACADEMY_SCRIPTS = [
  'academy-i18n-dict-1.js', 'academy-i18n-dict-2.js', 'academy-i18n-dict-3.js', 'academy-i18n-dict-4.js', 'academy-i18n.js',
  'step-nav-bootstrap.js', 'portal-cards.js',
  ...EXAM_DATA_ASSETS,
  'step-academy-data.js', 'step-academy-runtime.js',
  ...EXAM_RUNTIME_ASSETS,
  'academy.js', 'academy-performance-guard.js', 'academy-ai-render-throttle.js'
];

function versioned(src) {
  if (/^(?:https?:|data:|blob:)/i.test(src)) return src;
  return `${src}${src.includes('?') ? '&' : '?'}v=${ASSET_REV}`;
}

function tr(ar, en) {
  return window.NEON_I18N?.pick?.(ar, en) || ar;
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function clone(value) {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function seedAuthenticatedProfile(user) {
  const profiles = readJson(PROFILE_KEY, {});
  const settings = readJson(SETTINGS_KEY, {});
  const previousId = settings.activeId;
  const previousProfile = previousId && profiles[previousId] ? profiles[previousId] : null;
  const name = user.displayName?.trim() || user.email?.split('@')[0] || 'طالب';

  if (!profiles[user.uid]) {
    profiles[user.uid] = previousProfile
      ? clone(previousProfile)
      : {
          id: user.uid,
          name,
          score: 0,
          coins: 180,
          levels: {},
          stats: { answered: 0, correct: 0, hintsUsed: 0 },
          theme: 'neon',
          avatar: '🧠'
        };
  }

  const profile = profiles[user.uid];
  profile.id = user.uid;
  profile.firebaseUid = user.uid;
  profile.name = profile.name && profile.name !== 'طالب جديد' ? profile.name : name;
  profile.email = user.email || '';
  profile.accountCreatedAt ||= user.metadata?.creationTime || new Date().toISOString();
  profile.lastAuthenticatedAt = new Date().toISOString();
  profile.academy ??= {};
  profile.academy.name = profile.academy.name && profile.academy.name !== 'طالب جديد'
    ? profile.academy.name
    : name;
  profile.academy.email = user.email || '';

  settings.activeId = user.uid;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.NEON_AUTH_USER = {
    uid: user.uid,
    email: user.email || '',
    displayName: name,
    emailVerified: user.emailVerified
  };
}

function updateAccountUi(user) {
  const name = user.displayName?.trim() || user.email?.split('@')[0] || 'الطالب';
  const accountName = document.getElementById('accountName');
  const accountEmail = document.getElementById('accountEmail');
  const avatar = document.getElementById('accountAvatar');

  if (accountName) accountName.textContent = name;
  if (accountEmail) accountEmail.textContent = user.email || '';
  if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
}

function finishAcademyLoading() {
  if (academyBootFinished) return;
  academyBootFinished = true;
  document.body.classList.remove('auth-pending');
  document.getElementById('authBoot')?.classList.add('hidden');
}

function preloadAcademyAssets() {
  const classic = new Set(
    [...document.querySelectorAll('link[rel="preload"][as="script"]')].map(link => link.href)
  );
  const fragment = document.createDocumentFragment();

  ACADEMY_SCRIPTS.forEach(src => {
    const href = new URL(versioned(src), document.baseURI).href;
    if (classic.has(href)) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = href;
    fragment.appendChild(link);
    classic.add(href);
  });

  const aiHref = new URL(versioned('real-ai-teacher-bilingual.js'), document.baseURI).href;
  if (![...document.querySelectorAll('link[rel="modulepreload"]')].some(link => link.href === aiHref)) {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = aiHref;
    fragment.appendChild(link);
  }

  if (fragment.childNodes.length) document.head.appendChild(fragment);
}

function loadClassicScript(src) {
  return new Promise((resolve, reject) => {
    const requestSrc = versioned(src);
    const absolute = new URL(requestSrc, document.baseURI).href;
    const existing = [...document.scripts].find(script => script.src === absolute);

    if (existing?.dataset.loaded === 'true') return resolve();

    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error(`Could not load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = requestSrc;
    script.async = false;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.body.appendChild(script);
  });
}

function loadRealAiTeacher() {
  const button = document.getElementById('askTeacherButton');
  const response = document.getElementById('teacherResponse');
  let settled = false;

  if (button) {
    button.disabled = true;
    button.textContent = tr('جارٍ تشغيل المعلم الذكي...', 'Starting AI tutor...');
  }

  const script = document.createElement('script');
  script.type = 'module';
  script.src = versioned('real-ai-teacher-bilingual.js');

  const showAiLoadError = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutId);
    script.remove();

    if (button) {
      button.disabled = false;
      button.textContent = tr('إعادة تحميل المعلم الذكي', 'Reload AI tutor');
      button.addEventListener('click', () => location.reload(), { once: true });
    }

    if (response) {
      response.innerHTML = `<div class="response-placeholder"><span>!</span><h3>${tr('تعذر تحميل وحدة الذكاء الاصطناعي', 'Could not load the AI module')}</h3><p>${tr('يمكنك متابعة استخدام بقية الأكاديمية، ثم تحديث الصفحة لإعادة المحاولة.', 'You can continue using the rest of the academy, then refresh the page to retry.')}</p></div>`;
    }
  };

  const timeoutId = setTimeout(showAiLoadError, AI_LOAD_TIMEOUT_MS);
  script.onload = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutId);
  };
  script.onerror = showAiLoadError;
  document.body.appendChild(script);
}

async function loadAcademy() {
  if (academyLoaded) return;
  if (!EXAM_DATA_ASSETS.length || !EXAM_RUNTIME_ASSETS.length) {
    throw new Error('Exam asset manifest is missing');
  }
  academyLoaded = true;
  preloadAcademyAssets();

  try {
    for (const src of ACADEMY_SCRIPTS) {
      await loadClassicScript(src);
    }

    finishAcademyLoading();
    loadRealAiTeacher();
  } catch (error) {
    academyLoaded = false;
    console.error('Academy loading error:', error);
    const boot = document.querySelector('#authBoot p');
    if (boot) {
      boot.textContent = tr(
        'تعذر تحميل الأكاديمية أو مركز الاختبارات. حدّث الصفحة وحاول مجددًا.',
        'The academy or test center could not load. Refresh and try again.'
      );
    }
  }
}

document.getElementById('studentLogoutButton')?.addEventListener('click', async () => {
  await signOut(auth);
  location.replace('auth.html');
});

document.getElementById('authAccountButton')?.addEventListener('click', () => {
  document.getElementById('student')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

onAuthStateChanged(auth, user => {
  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
    location.replace(`auth.html?next=${next}`);
    return;
  }

  seedAuthenticatedProfile(user);
  updateAccountUi(user);
  loadAcademy();
});
