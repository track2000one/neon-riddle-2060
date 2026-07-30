import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

const PROFILE_KEY = 'neonRiddleGrandProfilesV4';
const SETTINGS_KEY = 'neonRiddleGrandSettingsV4';
const i18n = window.NEON_I18N || { pick: ar => ar };
const tr = (ar, en) => i18n.pick(ar, en);
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

let pendingPhone = '';
let pendingTimer = null;

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function toEnglishDigits(value) {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const eastern = '۰۱۲۳۴۵۶۷۸۹';
  return String(value || '')
    .replace(/[٠-٩]/g, digit => String(arabic.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String(eastern.indexOf(digit)));
}

function normalizePhone(value) {
  let phone = toEnglishDigits(value).trim().replace(/[\s().-]/g, '');
  if (!phone) return '';

  if (phone.startsWith('00966')) phone = `+${phone.slice(2)}`;
  else if (phone.startsWith('966')) phone = `+${phone}`;
  else if (/^05\d{8}$/.test(phone)) phone = `+966${phone.slice(1)}`;
  else if (/^5\d{8}$/.test(phone)) phone = `+966${phone}`;

  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

function clearPendingPhone() {
  pendingPhone = '';
  window.clearTimeout(pendingTimer);
  pendingTimer = null;
}

function savePhoneToProfile(user, phone) {
  if (!user?.uid || !phone) return;

  const profiles = readJson(PROFILE_KEY, {});
  const settings = readJson(SETTINGS_KEY, {});
  const displayName = user.displayName?.trim() || user.email?.split('@')[0] || tr('طالب', 'Student');
  const profile = profiles[user.uid] || {
    id: user.uid,
    name: displayName,
    score: 0,
    coins: 180,
    levels: {},
    stats: { answered: 0, correct: 0, hintsUsed: 0 },
    theme: 'neon',
    avatar: '🧠'
  };

  profile.id = user.uid;
  profile.firebaseUid = user.uid;
  profile.name ||= displayName;
  profile.email = user.email || profile.email || '';
  profile.phone = phone;
  profile.phoneVerified = Boolean(user.phoneNumber && user.phoneNumber === phone);
  profile.phoneUpdatedAt = new Date().toISOString();
  profile.academy ??= {};
  profile.academy.phone = phone;
  profile.academy.phoneVerified = profile.phoneVerified;

  profiles[user.uid] = profile;
  settings.activeId = user.uid;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function mountPhoneField() {
  const form = document.getElementById('registerForm');
  const emailInput = document.getElementById('registerEmail');
  const emailWrap = emailInput?.closest('.input-wrap');
  if (!form || !emailWrap || document.getElementById('registerPhone')) return;

  const fragment = document.createDocumentFragment();
  const label = document.createElement('label');
  label.htmlFor = 'registerPhone';
  label.textContent = tr('رقم الجوال (اختياري)', 'Mobile number (optional)');

  const wrap = document.createElement('div');
  wrap.className = 'input-wrap';
  wrap.innerHTML = '<span>☎</span><input id="registerPhone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" maxlength="18" placeholder="+9665XXXXXXXX" aria-describedby="registerPhoneNote" />';

  const note = document.createElement('small');
  note.id = 'registerPhoneNote';
  note.className = 'field-note';
  note.textContent = tr(
    'يمكن كتابة الرقم بصيغة 05XXXXXXXX أو +9665XXXXXXXX. سيُحفظ في ملف الطالب، ولا يُعد موثقًا برسالة SMS حاليًا.',
    'Use 05XXXXXXXX or +9665XXXXXXXX. It will be saved to the student profile and is not currently SMS-verified.'
  );

  fragment.append(label, wrap, note);
  emailWrap.after(fragment);

  form.addEventListener('submit', event => {
    const input = document.getElementById('registerPhone');
    const rawValue = input?.value.trim() || '';
    const normalized = normalizePhone(rawValue);

    if (rawValue && !normalized) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const message = document.getElementById('registerMessage');
      if (message) {
        message.textContent = tr(
          'صيغة رقم الجوال غير صحيحة. استخدم 05XXXXXXXX أو +9665XXXXXXXX.',
          'The mobile number format is invalid. Use 05XXXXXXXX or +9665XXXXXXXX.'
        );
        message.classList.remove('success');
      }
      input?.focus();
      return;
    }

    pendingPhone = normalized || '';
    if (normalized && input) input.value = normalized;
    window.clearTimeout(pendingTimer);
    pendingTimer = window.setTimeout(clearPendingPhone, 60_000);
  }, { capture: true });

  document.querySelectorAll('.auth-tab,[data-switch]').forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.view || button.dataset.switch;
      if (target && target !== 'register') clearPendingPhone();
    });
  });

  const registerMessage = document.getElementById('registerMessage');
  if (registerMessage) {
    const observer = new MutationObserver(() => {
      if (registerMessage.textContent.trim() && !registerMessage.classList.contains('success')) clearPendingPhone();
    });
    observer.observe(registerMessage, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
}

mountPhoneField();

onAuthStateChanged(auth, user => {
  if (!user || !pendingPhone) return;
  savePhoneToProfile(user, pendingPhone);
  clearPendingPhone();
});
