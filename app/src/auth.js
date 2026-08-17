import './brand.css';
import './brand-runtime.js';
import './ui-preferences.js';
import './surface-contrast.css';
import './platform-theme-compat.css';
import './step-core-theme-compat.css';
import './navigation-enhancements.js';
import './mobile-header-flow.css';
import './student-success-bootstrap.js';
import './success-diagnostic-routing.js';
import './exam-experience.js';
import './diagnostic-experience.js';
import './diagnostic-notebook-bridge.js';
import './student-state-sync.js';
import { firebaseConfig } from './firebase-config.js';
import { claimLocalStateOwner, canMigrateLegacyProfile } from './account-local-state.js';
import { configureProgress, flushProgressQueue } from './progress-client.js';
import './progress-integrations.js';

const FIREBASE_VERSION = '12.16.0';
let signOutCurrentUser = null;

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

async function registerPlatformAccess(user) {
  try {
    const token = await user.getIdToken();
    const response = await fetch('/api/access/session', {
      method: 'POST',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 403 && data.error === 'ACCOUNT_SUSPENDED') {
      throw Object.assign(new Error(data.message || 'تم إيقاف الوصول إلى المنصة لهذا الحساب.'), { code: 'ACCOUNT_SUSPENDED', access: data.access });
    }
    if (!response.ok) {
      if (response.status >= 500) return { role: 'student', status: 'active', configured: false, degraded: true };
      throw Object.assign(new Error(data.message || `HTTP_${response.status}`), { code: data.error || 'ACCESS_CHECK_FAILED' });
    }
    return data.access || { role: 'student', status: 'active', configured: false };
  } catch (error) {
    if (error?.code === 'ACCOUNT_SUSPENDED') throw error;
    console.warn('NEON platform access check degraded:', error?.message || error);
    return { role: 'student', status: 'active', configured: false, degraded: true };
  }
}

function seedProfile(user) {
  const profilesKey = 'neonRiddleGrandProfilesV4';
  const settingsKey = 'neonRiddleGrandSettingsV4';
  const profiles = readJson(profilesKey, {});
  const settings = readJson(settingsKey, {});
  const previous = settings.activeId && profiles[settings.activeId] ? profiles[settings.activeId] : null;
  const name = user.displayName?.trim() || user.email?.split('@')[0] || 'الطالب';

  if (!profiles[user.uid]) {
    profiles[user.uid] = canMigrateLegacyProfile(previous) ? clone(previous) : {
      id: user.uid,
      name,
      score: 0,
      coins: 180,
      levels: {},
      stats: { answered: 0, correct: 0, hintsUsed: 0 },
      theme: 'academic',
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

function installLogoutButton() {
  const accountChip = document.getElementById('accountChip') || document.querySelector('.auth-user-chip,.account-chip');
  if (!accountChip?.parentElement || document.getElementById('accountLogoutButton')) return;

  const button = document.createElement('button');
  button.id = 'accountLogoutButton';
  button.className = 'account-logout-button';
  button.type = 'button';
  button.title = 'تسجيل الخروج من الحساب';
  button.setAttribute('aria-label', 'تسجيل الخروج من الحساب');
  button.innerHTML = '<span aria-hidden="true">⇥</span><b>تسجيل الخروج</b>';

  button.addEventListener('click', async () => {
    if (button.disabled || typeof signOutCurrentUser !== 'function') return;
    const confirmed = window.confirm('هل تريد تسجيل الخروج من حساب NEON؟');
    if (!confirmed) return;

    button.disabled = true;
    button.classList.add('is-loading');
    button.querySelector('b').textContent = 'جارٍ الخروج…';
    try {
      await Promise.allSettled([
        flushProgressQueue(),
        window.NEON_STUDENT_STATE?.flush?.()
      ]);
      await signOutCurrentUser();
      location.replace('/auth');
    } catch (error) {
      console.error('NEON sign-out error:', error);
      button.disabled = false;
      button.classList.remove('is-loading');
      button.querySelector('b').textContent = 'تسجيل الخروج';
      window.alert('تعذر تسجيل الخروج مؤقتًا. أعد المحاولة.');
    }
  });

  accountChip.insertAdjacentElement('afterend', button);
}

export async function ensureAuth() {
  const appUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`;
  const authUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`;

  const [{ initializeApp, getApp, getApps }, { getAuth, onAuthStateChanged, signOut }] = await Promise.all([
    runtimeImport(appUrl),
    runtimeImport(authUrl)
  ]);

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  signOutCurrentUser = () => signOut(auth);

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      unsubscribe();
      if (!user) {
        const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
        location.replace(`/auth?next=${next}`);
        reject(new Error('Authentication required'));
        return;
      }

      try {
        const access = await registerPlatformAccess(user);
        if (access.status === 'suspended') throw Object.assign(new Error('تم إيقاف الوصول إلى المنصة لهذا الحساب.'), { code: 'ACCOUNT_SUSPENDED' });

        const ownership = claimLocalStateOwner(localStorage, user.uid);
        if (ownership.changed) {
          console.info(`NEON local cache isolated for account switch (${ownership.cleared.length} shared keys cleared).`);
        }

        const profile = seedProfile(user);
        const session = { user, profile, auth, access };
        window.NEON_PLATFORM_ACCESS = access;
        window.NEON_AUTH_USER = { uid: user.uid, email: user.email || '', displayName: profile.academy?.name || profile.name, role: access.role || 'student' };
        window.NEON_AUTH_SESSION = session;
        configureProgress(session);
        flushProgressQueue().catch(() => {});
        window.dispatchEvent(new CustomEvent('neon-auth-session', { detail: session }));
        resolve(session);
      } catch (error) {
        if (error?.code === 'ACCOUNT_SUSPENDED') {
          await signOut(auth).catch(() => {});
          window.alert('تم إيقاف الوصول إلى خدمات NEON لهذا الحساب. إذا كنت تعتقد أن هذا بالخطأ فتواصل مع إدارة المنصة.');
          location.replace('/auth?blocked=1');
        }
        reject(error);
      }
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
  installLogoutButton();
}
