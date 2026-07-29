import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { firebaseConfig, SITE_ANALYTICS_ID } from './firebase-config.js';

const PROFILE_KEY = 'neonRiddleGrandProfilesV4';
const SETTINGS_KEY = 'neonRiddleGrandSettingsV4';
const RESET_COOLDOWN_SECONDS = 45;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'ar';

const tabs = [...document.querySelectorAll('.auth-tab')];
const forms = [...document.querySelectorAll('.auth-form')];
const signedInPanel = document.getElementById('signedInPanel');
const signedInText = document.getElementById('signedInText');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resetForm = document.getElementById('resetForm');
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const resetButton = document.getElementById('resetButton');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');
const resetMessage = document.getElementById('resetMessage');
const registerPassword = document.getElementById('registerPassword');
const resetEmailInput = document.getElementById('resetEmail');
const passwordMeterBar = document.getElementById('passwordMeterBar');
const passwordStrengthText = document.getElementById('passwordStrengthText');
const toast = document.getElementById('toast');
let toastTimer = null;
let resetCooldownTimer = null;

window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
window.gtag('js', new Date());
window.gtag('config', SITE_ANALYTICS_ID, {
  send_page_view: true,
  page_title: 'NEON Academy Account',
  page_location: window.location.href,
  transport_type: 'beacon'
});

function track(eventName, parameters = {}) {
  window.gtag?.('event', eventName, { app_name: 'neon_academy_account', ...parameters });
}

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function seedLocalProfile(user) {
  const profiles = readJson(PROFILE_KEY, {});
  const settings = readJson(SETTINGS_KEY, {});
  const currentId = settings.activeId;
  const displayName = user.displayName?.trim() || user.email?.split('@')[0] || 'طالب';

  if (!profiles[user.uid]) {
    const currentProfile = currentId && profiles[currentId] ? structuredCloneSafe(profiles[currentId]) : null;
    profiles[user.uid] = currentProfile || {
      id: user.uid,
      name: displayName,
      score: 0,
      coins: 180,
      levels: {},
      stats: { answered: 0, correct: 0, hintsUsed: 0 },
      theme: 'neon',
      avatar: '🧠'
    };
  }

  profiles[user.uid].id = user.uid;
  profiles[user.uid].name = displayName;
  profiles[user.uid].email = user.email || '';
  profiles[user.uid].firebaseUid = user.uid;
  profiles[user.uid].accountCreatedAt ||= new Date().toISOString();
  profiles[user.uid].academy ??= {};
  profiles[user.uid].academy.name ||= displayName;
  profiles[user.uid].academy.email = user.email || '';

  settings.activeId = user.uid;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function structuredCloneSafe(value) {
  try { return structuredClone(value); }
  catch { return JSON.parse(JSON.stringify(value)); }
}

function prefillResetEmail() {
  if (resetEmailInput.value.trim()) return;
  const loginEmail = document.getElementById('loginEmail')?.value.trim();
  const registerEmail = document.getElementById('registerEmail')?.value.trim();
  resetEmailInput.value = loginEmail || registerEmail || '';
}

function switchView(viewName) {
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.view === viewName));
  forms.forEach(form => form.classList.toggle('active-form', form.dataset.form === viewName));
  [loginMessage, registerMessage, resetMessage].forEach(message => {
    message.textContent = '';
    message.classList.remove('success');
  });

  if (viewName === 'reset') {
    prefillResetEmail();
    window.setTimeout(() => resetEmailInput.focus(), 80);
  }

  const hash = viewName === 'login' ? '' : `#${viewName}`;
  history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
}

function setButtonBusy(button, busy, busyText, defaultText) {
  button.disabled = busy;
  const span = button.querySelector('span');
  if (span) span.textContent = busy ? busyText : defaultText;
}

function showMessage(element, text, success = false) {
  element.textContent = text;
  element.classList.toggle('success', success);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
}

function friendlyError(error) {
  const messages = {
    'auth/email-already-in-use': 'يوجد حساب مسجل بهذا البريد بالفعل.',
    'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
    'auth/weak-password': 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.',
    'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'auth/user-disabled': 'تم تعطيل هذا الحساب.',
    'auth/too-many-requests': 'تم إيقاف المحاولات مؤقتًا بسبب كثرتها. حاول لاحقًا.',
    'auth/network-request-failed': 'تعذر الاتصال بالخدمة. تحقق من الإنترنت.',
    'auth/missing-password': 'اكتب كلمة المرور.',
    'auth/unauthorized-continue-uri': 'نطاق المنصة غير مصرح به في إعدادات Firebase.',
    'auth/invalid-continue-uri': 'تعذر إنشاء رابط الرجوع إلى المنصة.'
  };
  return messages[error?.code] || 'تعذر تنفيذ العملية. تحقق من البيانات وحاول مرة أخرى.';
}

function passwordStrength(value) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) || /[ء-ي]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9ء-ي]/.test(value)) score += 1;
  return Math.min(4, score);
}

function updatePasswordMeter() {
  const score = passwordStrength(registerPassword.value);
  const states = [
    ['0%', '#ff768a', 'استخدم 8 أحرف على الأقل، ويفضل أرقامًا ورموزًا.'],
    ['25%', '#ff768a', 'ضعيفة'],
    ['50%', '#ffd46d', 'متوسطة'],
    ['75%', '#64eaff', 'جيدة'],
    ['100%', '#62f0a7', 'قوية']
  ];
  const [width, color, text] = states[score];
  passwordMeterBar.style.width = width;
  passwordMeterBar.style.background = color;
  passwordStrengthText.textContent = text;
}

function getResetActionSettings() {
  const returnUrl = new URL('./auth.html', window.location.href);
  returnUrl.hash = 'login';
  return {
    url: returnUrl.href,
    handleCodeInApp: false
  };
}

function beginResetCooldown() {
  clearInterval(resetCooldownTimer);
  let seconds = RESET_COOLDOWN_SECONDS;
  resetButton.disabled = true;

  const updateLabel = () => {
    const span = resetButton.querySelector('span');
    if (span) span.textContent = `إعادة الإرسال بعد ${seconds} ثانية`;
  };

  updateLabel();
  resetCooldownTimer = window.setInterval(() => {
    seconds -= 1;
    if (seconds <= 0) {
      clearInterval(resetCooldownTimer);
      resetButton.disabled = false;
      const span = resetButton.querySelector('span');
      if (span) span.textContent = 'إرسال الرابط مرة أخرى';
      return;
    }
    updateLabel();
  }, 1000);
}

async function redirectToAcademy(user) {
  seedLocalProfile(user);
  showToast('تم تسجيل الدخول بنجاح');
  setTimeout(() => { window.location.href = './'; }, 650);
}

tabs.forEach(tab => tab.addEventListener('click', () => switchView(tab.dataset.view)));
document.querySelectorAll('[data-switch]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.switch)));
document.querySelectorAll('[data-toggle-password]').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.togglePassword);
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    button.textContent = visible ? '◉' : '◌';
  });
});
registerPassword.addEventListener('input', updatePasswordMeter);

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  showMessage(loginMessage, '');
  setButtonBusy(loginButton, true, 'جارٍ تسجيل الدخول...', 'تسجيل الدخول');

  try {
    const persistence = document.getElementById('rememberLogin').checked ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    const credential = await signInWithEmailAndPassword(
      auth,
      document.getElementById('loginEmail').value.trim(),
      document.getElementById('loginPassword').value
    );
    track('student_login_success');
    await redirectToAcademy(credential.user);
  } catch (error) {
    showMessage(loginMessage, friendlyError(error));
    setButtonBusy(loginButton, false, '', 'تسجيل الدخول');
    track('student_login_failed', { error_code: error?.code || 'unknown' });
  }
});

registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  showMessage(registerMessage, '');

  const name = document.getElementById('registerName').value.trim().replace(/\s+/g, ' ');
  const email = document.getElementById('registerEmail').value.trim();
  const password = registerPassword.value;
  const confirmation = document.getElementById('registerConfirm').value;
  const accepted = document.getElementById('registerTerms').checked;

  if (name.length < 2) return showMessage(registerMessage, 'اكتب اسمًا صحيحًا من حرفين على الأقل.');
  if (password.length < 8) return showMessage(registerMessage, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
  if (password !== confirmation) return showMessage(registerMessage, 'كلمتا المرور غير متطابقتين.');
  if (!accepted) return showMessage(registerMessage, 'يجب الموافقة على استخدام الحساب للتعلم وحفظ الجلسة.');

  setButtonBusy(registerButton, true, 'جارٍ إنشاء الحساب...', 'إنشاء الحساب');

  try {
    await setPersistence(auth, browserLocalPersistence);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    try { await sendEmailVerification(credential.user); } catch { /* verification email is optional */ }
    seedLocalProfile(credential.user);
    showMessage(registerMessage, 'تم إنشاء الحساب. أرسلنا رسالة تحقق إلى بريدك، وسيتم نقلك إلى الأكاديمية.', true);
    track('student_account_created');
    setTimeout(() => { window.location.href = './'; }, 1200);
  } catch (error) {
    showMessage(registerMessage, friendlyError(error));
    setButtonBusy(registerButton, false, '', 'إنشاء الحساب');
    track('student_registration_failed', { error_code: error?.code || 'unknown' });
  }
});

resetForm.addEventListener('submit', async event => {
  event.preventDefault();
  showMessage(resetMessage, '');

  const email = resetEmailInput.value.trim().toLowerCase();
  resetEmailInput.value = email;

  if (!email) {
    resetEmailInput.focus();
    return showMessage(resetMessage, 'اكتب البريد الإلكتروني المسجل في حسابك.');
  }

  if (!resetEmailInput.checkValidity()) {
    resetEmailInput.focus();
    return showMessage(resetMessage, 'صيغة البريد الإلكتروني غير صحيحة.');
  }

  setButtonBusy(resetButton, true, 'جارٍ إرسال رابط الاستعادة...', 'إرسال رابط الاستعادة');

  try {
    await sendPasswordResetEmail(auth, email, getResetActionSettings());
    showMessage(
      resetMessage,
      'تم إرسال رابط إعادة تعيين كلمة المرور. افتح الرسالة واتبع التعليمات، ثم ارجع لتسجيل الدخول بكلمة المرور الجديدة. تحقق أيضًا من البريد غير المرغوب فيه.',
      true
    );
    beginResetCooldown();
    track('password_reset_requested');
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      showMessage(resetMessage, 'إذا كان البريد مرتبطًا بحساب فستصلك رسالة إعادة التعيين. تحقق من البريد غير المرغوب فيه.', true);
      beginResetCooldown();
      track('password_reset_requested');
      return;
    }

    showMessage(resetMessage, friendlyError(error));
    setButtonBusy(resetButton, false, '', 'إرسال رابط الاستعادة');
    track('password_reset_failed', { error_code: error?.code || 'unknown' });
  }
});

document.getElementById('signedOutButton').addEventListener('click', async () => {
  await signOut(auth);
  signedInPanel.classList.add('hidden');
  tabs.forEach(tab => tab.classList.remove('hidden'));
  switchView('login');
});

onAuthStateChanged(auth, user => {
  if (!user) return;
  seedLocalProfile(user);
  forms.forEach(form => form.classList.remove('active-form'));
  tabs.forEach(tab => tab.classList.add('hidden'));
  signedInPanel.classList.remove('hidden');
  signedInText.textContent = `${user.displayName || 'الطالب'} — ${user.email || ''}`;
});

const initialView = location.hash.replace('#', '');
if (['register', 'reset'].includes(initialView)) switchView(initialView);
updatePasswordMeter();
