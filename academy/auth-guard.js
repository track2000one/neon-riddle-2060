import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

const PROFILE_KEY = 'neonRiddleGrandProfilesV4';
const SETTINGS_KEY = 'neonRiddleGrandSettingsV4';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let academyLoaded = false;

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function clone(value) {
  try { return structuredClone(value); }
  catch { return JSON.parse(JSON.stringify(value)); }
}

function seedAuthenticatedProfile(user) {
  const profiles = readJson(PROFILE_KEY, {});
  const settings = readJson(SETTINGS_KEY, {});
  const previousId = settings.activeId;
  const previousProfile = previousId && profiles[previousId] ? profiles[previousId] : null;
  const name = user.displayName?.trim() || user.email?.split('@')[0] || 'طالب';

  if (!profiles[user.uid]) {
    profiles[user.uid] = previousProfile ? clone(previousProfile) : {
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
  profile.academy.name = profile.academy.name && profile.academy.name !== 'طالب جديد' ? profile.academy.name : name;
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
  const displayName = user.displayName?.trim() || user.email?.split('@')[0] || 'الطالب';
  const accountName = document.getElementById('accountName');
  const accountEmail = document.getElementById('accountEmail');
  const accountAvatar = document.getElementById('accountAvatar');
  if (accountName) accountName.textContent = displayName;
  if (accountEmail) accountEmail.textContent = user.email || '';
  if (accountAvatar) accountAvatar.textContent = displayName.charAt(0).toUpperCase();
}

function finishAcademyLoading() {
  document.body.classList.remove('auth-pending');
  document.getElementById('authBoot')?.classList.add('hidden');
}

function loadRealAiTeacher() {
  const button = document.getElementById('askTeacherButton');
  if (button) {
    button.disabled = true;
    button.textContent = 'جارٍ تشغيل المعلم الذكي...';
  }

  const aiScript = document.createElement('script');
  aiScript.type = 'module';
  aiScript.src = 'real-ai-teacher.js';
  aiScript.onload = finishAcademyLoading;
  aiScript.onerror = () => {
    finishAcademyLoading();
    if (button) {
      button.disabled = false;
      button.textContent = 'إعادة تحميل المعلم الذكي';
      button.addEventListener('click', () => window.location.reload(), { once: true });
    }
    const response = document.getElementById('teacherResponse');
    if (response) {
      response.innerHTML = '<div class="response-placeholder"><span>!</span><h3>تعذر تحميل وحدة الذكاء الاصطناعي</h3><p>حدّث الصفحة وتأكد من اتصال الإنترنت.</p></div>';
    }
  };
  document.body.appendChild(aiScript);
}

function loadAcademy() {
  if (academyLoaded) return;
  academyLoaded = true;
  const script = document.createElement('script');
  script.src = 'academy.js';
  script.onload = loadRealAiTeacher;
  script.onerror = () => {
    const bootText = document.querySelector('#authBoot p');
    if (bootText) bootText.textContent = 'تعذر تحميل الأكاديمية. حدّث الصفحة وحاول مجددًا.';
  };
  document.body.appendChild(script);
}

document.getElementById('studentLogoutButton')?.addEventListener('click', async () => {
  await signOut(auth);
  window.location.replace('auth.html');
});

document.getElementById('authAccountButton')?.addEventListener('click', () => {
  document.getElementById('student')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

onAuthStateChanged(auth, user => {
  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
    window.location.replace(`auth.html?next=${next}`);
    return;
  }

  seedAuthenticatedProfile(user);
  updateAccountUi(user);
  loadAcademy();
});
