import './ui-preferences.js';

const FIREBASE_VERSION = '12.16.0';

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function clone(value) {
  try { return structuredClone(value); }
  catch { return JSON.parse(JSON.stringify(value)); }
}

function runtimeImport(url) {
  return import(/* @vite-ignore */ url);
}

function seedProfile(user) {
  const profilesKey = 'neonRiddleGrandProfilesV4';
  const settingsKey = 'neonRiddleGrandSettingsV4';
  const profiles = readJson(profilesKey, {});
  const settings = readJson(settingsKey, {});
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
  profile.academy ??= {};
  profile.academy.name = profile.academy.name && profile.academy.name !== 'طالب جديد' ? profile.academy.name : name;
  profile.academy.email = user.email || '';
  profile.lastAuthenticatedAt = new Date().toISOString();
  settings.activeId = user.uid;

  localStorage.setItem(profilesKey, JSON.stringify(profiles));
  localStorage.setItem(settingsKey, JSON.stringify(settings));
  return profile;
}

export async function ensureAuth() {
  const appUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`;
  const authUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`;
  const configUrl = new URL('/legacy/firebase-config.js', window.location.origin).href;

  const [{ initializeApp, getApp, getApps }, { getAuth, onAuthStateChanged }, configModule] = await Promise.all([
    runtimeImport(appUrl),
    runtimeImport(authUrl),
    runtimeImport(configUrl)
  ]);

  const app = getApps().length ? getApp() : initializeApp(configModule.firebaseConfig);
  const auth = getAuth(app);

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      if (!user) {
        const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
        location.replace(`/legacy/auth.html?next=${next}`);
        reject(new Error('Authentication required'));
        return;
      }
      const profile = seedProfile(user);
      window.NEON_AUTH_USER = { uid: user.uid, email: user.email || '', displayName: profile.academy?.name || profile.name };
      resolve({ user, profile, auth });
    }, reject);
  });
}

export function renderAccount({ user, profile }) {
  const name = profile?.academy?.name || profile?.name || user.displayName || user.email?.split('@')[0] || 'الطالب';
  const email = user.email || '';
  const avatar = (name.trim().charAt(0) || 'ط').toUpperCase();
  document.getElementById('accountName')?.replaceChildren(document.createTextNode(name));
  document.getElementById('accountEmail')?.replaceChildren(document.createTextNode(email));
  document.getElementById('accountAvatar')?.replaceChildren(document.createTextNode(avatar));
}
