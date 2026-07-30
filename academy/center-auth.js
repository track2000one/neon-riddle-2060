import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

const PROFILE_KEY = 'neonRiddleGrandProfilesV4';
const SETTINGS_KEY = 'neonRiddleGrandSettingsV4';
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function clone(value) {
  try { return structuredClone(value); }
  catch { return JSON.parse(JSON.stringify(value)); }
}

function seedProfile(user) {
  const profiles = readJson(PROFILE_KEY, {});
  const settings = readJson(SETTINGS_KEY, {});
  const previous = settings.activeId && profiles[settings.activeId] ? profiles[settings.activeId] : null;
  const name = user.displayName?.trim() || user.email?.split('@')[0] || 'الطالب';

  if (!profiles[user.uid]) {
    profiles[user.uid] = previous ? clone(previous) : {
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
  window.NEON_AUTH_USER = { uid: user.uid, email: user.email || '', displayName: name, emailVerified: user.emailVerified };
  return profile;
}

function updateUi(user, profile) {
  const name = profile?.academy?.name || profile?.name || user.displayName?.trim() || user.email?.split('@')[0] || 'الطالب';
  const avatarText = (name.trim().charAt(0) || 'ط').toUpperCase();
  const values = {
    accountName: name,
    accountEmail: user.email || '',
    accountAvatar: avatarText,
    studentName: name,
    studentAvatar: profile?.academy?.avatar || profile?.avatar || '🧠'
  };
  for (const [id, text] of Object.entries(values)) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }
}

function finish() {
  document.body.classList.remove('auth-pending');
  document.getElementById('authBoot')?.classList.add('hidden');
  window.dispatchEvent(new CustomEvent('neon-center-auth-ready'));
}

document.addEventListener('click', async event => {
  if (event.target.closest('#studentLogoutButton')) {
    event.preventDefault();
    await signOut(auth);
    location.replace('auth.html');
  }
  if (event.target.closest('#authAccountButton')) {
    event.preventDefault();
    location.href = 'index.html#student';
  }
});

onAuthStateChanged(auth, user => {
  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
    location.replace(`auth.html?next=${next}`);
    return;
  }
  const profile = seedProfile(user);
  updateUi(user, profile);
  finish();
});
