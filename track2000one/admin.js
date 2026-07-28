import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { firebaseConfig, ADMIN_UID, SITE_ANALYTICS_ID } from './firebase-config.js';

const PROFILE_KEY = 'neonRiddleGrandProfilesV4';
const SETTINGS_KEY = 'neonRiddleGrandSettingsV4';

const bootScreen = document.getElementById('bootScreen');
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginButton = document.getElementById('loginButton');
const loginMessage = document.getElementById('loginMessage');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordButton = document.getElementById('togglePassword');
const logoutButton = document.getElementById('logoutButton');
const refreshButton = document.getElementById('refreshButton');
const playersRefresh = document.getElementById('playersRefresh');
const exportButton = document.getElementById('exportButton');
const toast = document.getElementById('toast');

let toastTimer = null;
let currentUser = null;
let authReady = false;

window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
window.gtag('js', new Date());
window.gtag('config', SITE_ANALYTICS_ID, {
  send_page_view: true,
  page_title: 'NEON RIDDLE 2060 Admin',
  page_location: window.location.href,
  transport_type: 'beacon'
});

function track(eventName, parameters = {}) {
  window.gtag?.('event', eventName, {
    app_name: 'neon_riddle_2060_admin',
    ...parameters
  });
}

function showOnly(target) {
  [bootScreen, loginScreen, dashboard].forEach(element => element.classList.add('hidden'));
  target.classList.remove('hidden');
}

function showLogin(message = '') {
  showOnly(loginScreen);
  loginMessage.textContent = message;
  loginButton.disabled = false;
  loginButton.querySelector('span').textContent = 'دخول آمن';
  passwordInput.value = '';
  setTimeout(() => emailInput.focus(), 80);
}

function showDashboard(user) {
  currentUser = user;
  showOnly(dashboard);
  document.getElementById('adminEmail').textContent = user.email || 'المسؤول';
  document.getElementById('securityEmail').textContent = user.email || '—';
  document.getElementById('securityUid').textContent = maskUid(user.uid);
  document.getElementById('securityProvider').textContent = user.providerData?.[0]?.providerId || 'password';
  document.getElementById('securityLastLogin').textContent = formatDate(user.metadata?.lastSignInTime);
  refreshDashboard();
  track('admin_dashboard_viewed');
}

function maskUid(uid) {
  if (!uid || uid.length < 16) return uid || '—';
  return `${uid.slice(0, 8)}••••••${uid.slice(-6)}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function readLocalSnapshot() {
  const profiles = readJson(PROFILE_KEY, {});
  const settings = readJson(SETTINGS_KEY, {});
  const profileList = Object.values(profiles).filter(profile => profile && typeof profile === 'object');

  let completed = 0;
  let stars = 0;
  let totalScore = 0;
  let totalCoins = 0;
  let totalAnswered = 0;
  let totalCorrect = 0;
  let bestAptitude = 0;
  let bestTournament = 0;

  profileList.forEach(profile => {
    totalScore += Number(profile.score) || 0;
    totalCoins += Number(profile.coins) || 0;
    totalAnswered += Number(profile.stats?.answered) || 0;
    totalCorrect += Number(profile.stats?.correct) || 0;
    bestAptitude = Math.max(bestAptitude, Number(profile.aptitude?.best) || 0);
    bestTournament = Math.max(bestTournament, Number(profile.tournament?.best) || 0);

    Object.values(profile.levels || {}).forEach(bucket => {
      Object.values(bucket || {}).forEach(record => {
        if (record?.completed) completed += 1;
        stars += Number(record?.stars) || 0;
      });
    });
  });

  return {
    profiles,
    profileList,
    settings,
    completed,
    stars,
    totalScore,
    totalCoins,
    totalAnswered,
    totalCorrect,
    accuracy: totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
    bestAptitude,
    bestTournament
  };
}

function readLibrarySnapshot() {
  const modes = window.GAME_MODES || {};
  const data = window.GAME_DATA || { adult: {}, kids: {} };
  const rows = Object.entries(modes).map(([modeId, metadata]) => {
    const adult = Array.isArray(data.adult?.[modeId]) ? data.adult[modeId].length : 0;
    const kids = Array.isArray(data.kids?.[modeId]) ? data.kids[modeId].length : 0;
    return {
      id: modeId,
      title: metadata?.title || modeId,
      icon: metadata?.icon || '◈',
      color: metadata?.color || '#63ebff',
      adult,
      kids,
      total: adult + kids
    };
  });

  return {
    rows,
    modeCount: rows.length,
    adultTotal: rows.reduce((sum, row) => sum + row.adult, 0),
    kidsTotal: rows.reduce((sum, row) => sum + row.kids, 0),
    total: rows.reduce((sum, row) => sum + row.total, 0)
  };
}

function completedForProfile(profile) {
  let count = 0;
  Object.values(profile.levels || {}).forEach(bucket => {
    Object.values(bucket || {}).forEach(record => {
      if (record?.completed) count += 1;
    });
  });
  return count;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
}

function refreshDashboard() {
  const local = readLocalSnapshot();
  const library = readLibrarySnapshot();

  document.getElementById('metricProfiles').textContent = local.profileList.length.toLocaleString('ar-SA');
  document.getElementById('metricQuestions').textContent = library.total.toLocaleString('ar-SA');
  document.getElementById('metricModes').textContent = library.modeCount.toLocaleString('ar-SA');
  document.getElementById('metricCompleted').textContent = local.completed.toLocaleString('ar-SA');

  renderLocalSummary(local);
  renderPlayers(local.profileList);
  renderLibrary(library);
}

function renderLocalSummary(snapshot) {
  const summary = document.getElementById('localSummary');
  const entries = [
    ['مجموع النقاط', snapshot.totalScore.toLocaleString('ar-SA')],
    ['مجموع العملات', snapshot.totalCoins.toLocaleString('ar-SA')],
    ['دقة الإجابات', `${snapshot.accuracy}%`],
    ['النجوم المحصلة', snapshot.stars.toLocaleString('ar-SA')],
    ['أفضل نتيجة قدرات', `${snapshot.bestAptitude}%`],
    ['أفضل بطولة', snapshot.bestTournament.toLocaleString('ar-SA')]
  ];

  summary.innerHTML = entries.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function renderPlayers(profiles) {
  const body = document.getElementById('playersTableBody');
  const empty = document.getElementById('playersEmpty');

  if (!profiles.length) {
    body.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  body.innerHTML = profiles
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
    .map(profile => `
      <tr>
        <td><strong>${escapeHtml(profile.avatar || '🧠')} ${escapeHtml(profile.name || 'لاعب')}</strong></td>
        <td>${(Number(profile.score) || 0).toLocaleString('ar-SA')}</td>
        <td>${(Number(profile.coins) || 0).toLocaleString('ar-SA')}</td>
        <td>${completedForProfile(profile).toLocaleString('ar-SA')}</td>
        <td>${(Number(profile.aptitude?.best) || 0).toLocaleString('ar-SA')}%</td>
        <td>${(Number(profile.tournament?.best) || 0).toLocaleString('ar-SA')}</td>
      </tr>
    `).join('');
}

function renderLibrary(library) {
  const cards = document.getElementById('libraryCards');
  const tableBody = document.getElementById('libraryTableBody');

  const summaryCards = [
    ['كل التحديات', library.total, '#63ebff'],
    ['أسئلة البالغين', library.adultTotal, '#a46eff'],
    ['أسئلة الأطفال', library.kidsTotal, '#ff6dbd'],
    ['عدد الأقسام', library.modeCount, '#ffd46d']
  ];

  cards.innerHTML = summaryCards.map(([title, value, color]) => `
    <article class="library-mini" style="--c:${color}">
      <small>${title}</small><strong>${value.toLocaleString('ar-SA')}</strong><small>عنصر في المكتبة</small>
    </article>
  `).join('');

  tableBody.innerHTML = library.rows.map(row => `
    <tr>
      <td><strong>${escapeHtml(row.icon)} ${escapeHtml(row.title)}</strong></td>
      <td>${row.adult.toLocaleString('ar-SA')}</td>
      <td>${row.kids.toLocaleString('ar-SA')}</td>
      <td><strong>${row.total.toLocaleString('ar-SA')}</strong></td>
    </tr>
  `).join('');
}

function exportLocalData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    source: window.location.origin,
    profiles: readJson(PROFILE_KEY, {}),
    settings: readJson(SETTINGS_KEY, {}),
    library: readLibrarySnapshot()
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `neon-riddle-local-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('تم تصدير البيانات المحلية');
  track('admin_local_data_exported');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function activateSection(sectionName) {
  const titles = {
    overview: 'نظرة عامة',
    players: 'اللاعبون المحليون',
    library: 'مكتبة المحتوى',
    analytics: 'الإحصاءات',
    security: 'الأمان والجلسة'
  };

  document.querySelectorAll('.nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.section === sectionName);
  });
  document.querySelectorAll('.admin-section').forEach(section => section.classList.remove('active-section'));
  document.getElementById(`${sectionName}Section`)?.classList.add('active-section');
  document.getElementById('sectionTitle').textContent = titles[sectionName] || 'لوحة المسؤول';
  history.replaceState(null, '', `#${sectionName}`);
  track('admin_section_viewed', { section_name: sectionName });
}

function friendlyAuthError(error) {
  const code = error?.code || '';
  const messages = {
    'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'auth/user-disabled': 'تم تعطيل هذا الحساب داخل Firebase.',
    'auth/too-many-requests': 'تم إيقاف المحاولات مؤقتًا بسبب كثرتها. حاول لاحقًا.',
    'auth/network-request-failed': 'تعذر الاتصال بخدمة المصادقة. تحقق من الإنترنت.',
    'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.'
  };
  return messages[code] || 'تعذر تسجيل الدخول. تحقق من البيانات وحاول مجددًا.';
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

try {
  await setPersistence(auth, browserLocalPersistence);
} catch (error) {
  console.error('Firebase persistence error:', error);
}

authReady = true;

onAuthStateChanged(auth, async user => {
  if (!authReady) return;

  if (!user) {
    currentUser = null;
    showLogin();
    return;
  }

  if (user.uid !== ADMIN_UID) {
    track('admin_access_denied');
    await signOut(auth);
    showLogin('هذا الحساب غير مخول للدخول إلى لوحة المسؤول.');
    return;
  }

  showDashboard(user);
});

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginMessage.textContent = '';
  loginButton.disabled = true;
  loginButton.querySelector('span').textContent = 'جارٍ التحقق...';

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value
    );

    if (credential.user.uid !== ADMIN_UID) {
      await signOut(auth);
      track('admin_login_denied');
      showLogin('هذا الحساب مسجل، لكنه لا يملك صلاحية المسؤول.');
      return;
    }

    track('admin_login_success');
  } catch (error) {
    loginMessage.textContent = friendlyAuthError(error);
    loginButton.disabled = false;
    loginButton.querySelector('span').textContent = 'دخول آمن';
    track('admin_login_failed', { error_code: error?.code || 'unknown' });
  }
});

togglePasswordButton.addEventListener('click', () => {
  const visible = passwordInput.type === 'text';
  passwordInput.type = visible ? 'password' : 'text';
  togglePasswordButton.textContent = visible ? '◉' : '◌';
});

logoutButton.addEventListener('click', async () => {
  track('admin_logout');
  await signOut(auth);
  showToast('تم تسجيل الخروج');
});

refreshButton.addEventListener('click', () => {
  refreshDashboard();
  showToast('تم تحديث البيانات');
});

playersRefresh.addEventListener('click', () => {
  renderPlayers(readLocalSnapshot().profileList);
  showToast('تم تحديث قائمة اللاعبين المحليين');
});

exportButton.addEventListener('click', exportLocalData);

document.querySelectorAll('.nav-item').forEach(button => {
  button.addEventListener('click', () => activateSection(button.dataset.section));
});

window.addEventListener('storage', event => {
  if (event.key === PROFILE_KEY || event.key === SETTINGS_KEY) {
    refreshDashboard();
  }
});

const initialSection = location.hash.replace('#', '');
if (['overview', 'players', 'library', 'analytics', 'security'].includes(initialSection)) {
  activateSection(initialSection);
}
