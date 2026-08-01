import './admin.js';
import { getApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { ADMIN_API_BASE_URL, ADMIN_UID } from './firebase-config.js';

const auth = getAuth(getApp());
auth.languageCode = 'ar';

const state = {
  users: [],
  filteredUsers: [],
  loading: false,
  apiOnline: false,
  currentEditingUid: null
};

const elements = {
  section: document.getElementById('playersSection'),
  tableBody: document.getElementById('firebaseUsersTableBody'),
  empty: document.getElementById('firebaseUsersEmpty'),
  error: document.getElementById('firebaseUsersError'),
  search: document.getElementById('firebaseUsersSearch'),
  refresh: document.getElementById('firebaseUsersRefresh'),
  create: document.getElementById('firebaseUserCreate'),
  apiState: document.getElementById('firebaseApiState'),
  countTotal: document.getElementById('firebaseUsersTotal'),
  countActive: document.getElementById('firebaseUsersActive'),
  countDisabled: document.getElementById('firebaseUsersDisabled'),
  countVerified: document.getElementById('firebaseUsersVerified'),
  modal: document.getElementById('firebaseUserModal'),
  modalTitle: document.getElementById('firebaseUserModalTitle'),
  modalClose: document.getElementById('firebaseUserModalClose'),
  form: document.getElementById('firebaseUserForm'),
  formMessage: document.getElementById('firebaseUserFormMessage'),
  uid: document.getElementById('firebaseUserUid'),
  displayName: document.getElementById('firebaseUserDisplayName'),
  email: document.getElementById('firebaseUserEmail'),
  phone: document.getElementById('firebaseUserPhone'),
  role: document.getElementById('firebaseUserRole'),
  password: document.getElementById('firebaseUserPassword'),
  passwordNote: document.getElementById('firebaseUserPasswordNote'),
  verified: document.getElementById('firebaseUserVerifiedInput'),
  disabled: document.getElementById('firebaseUserDisabledInput'),
  save: document.getElementById('firebaseUserSave'),
  cancel: document.getElementById('firebaseUserCancel')
};

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
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

function roleLabel(user) {
  const role = user.customClaims?.role || (user.customClaims?.admin ? 'admin' : 'student');
  const labels = {
    student: 'طالب',
    teacher: 'معلم',
    content_manager: 'مسؤول محتوى',
    admin: 'مسؤول'
  };
  return labels[role] || role;
}

function roleValue(user) {
  return user.customClaims?.role || (user.customClaims?.admin ? 'admin' : 'student');
}

function setApiState(kind, text) {
  if (!elements.apiState) return;
  elements.apiState.classList.remove('online', 'error');
  if (kind) elements.apiState.classList.add(kind);
  elements.apiState.textContent = text;
}

async function parseResponse(response) {
  const type = response.headers.get('content-type') || '';
  const payload = type.includes('application/json')
    ? await response.json()
    : { ok: false, message: await response.text() };

  if (!response.ok || payload.ok === false) {
    const error = new Error(payload.message || `فشل الطلب برمز ${response.status}`);
    error.status = response.status;
    error.code = payload.code || 'API_ERROR';
    throw error;
  }
  return payload;
}

async function apiRequest(path, options = {}, retry = true) {
  const user = auth.currentUser;
  if (!user || user.uid !== ADMIN_UID) {
    const error = new Error('جلسة المسؤول غير متاحة. سجل الدخول مجددًا.');
    error.code = 'ADMIN_SESSION_REQUIRED';
    throw error;
  }

  const token = await user.getIdToken(!retry);
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store'
  });

  if (response.status === 401 && retry) {
    await user.getIdToken(true);
    return apiRequest(path, options, false);
  }

  return parseResponse(response);
}

async function checkApiHealth() {
  setApiState('', 'جارٍ التحقق من خدمة Railway...');
  try {
    const response = await fetch(`${ADMIN_API_BASE_URL}/api/health`, { cache: 'no-store' });
    const payload = await parseResponse(response);
    state.apiOnline = true;
    setApiState('online', `Railway متصل • ${payload.projectId || 'Firebase Admin'}`);
    if (elements.error) elements.error.classList.add('hidden');
    return true;
  } catch (error) {
    state.apiOnline = false;
    setApiState('error', 'تعذر الاتصال بخدمة Railway');
    if (elements.error) {
      elements.error.classList.remove('hidden');
      elements.error.innerHTML = `تعذر الوصول إلى خدمة إدارة المستخدمين. تحقق من نجاح النشر والمتغيرات في Railway، ثم افتح <code>${escapeHtml(ADMIN_API_BASE_URL)}/api/health</code>.`;
    }
    console.error('Railway API health error:', error);
    return false;
  }
}

async function fetchAllUsers() {
  const users = [];
  let pageToken = '';
  let page = 0;

  do {
    const query = new URLSearchParams({ limit: '1000' });
    if (pageToken) query.set('pageToken', pageToken);
    const payload = await apiRequest(`/api/admin/users?${query}`);
    users.push(...(payload.users || []));
    pageToken = payload.nextPageToken || '';
    page += 1;
  } while (pageToken && page < 25);

  return users;
}

function updateStats() {
  const total = state.users.length;
  const active = state.users.filter(user => !user.disabled).length;
  const disabled = state.users.filter(user => user.disabled).length;
  const verified = state.users.filter(user => user.emailVerified).length;

  if (elements.countTotal) elements.countTotal.textContent = total.toLocaleString('ar-SA');
  if (elements.countActive) elements.countActive.textContent = active.toLocaleString('ar-SA');
  if (elements.countDisabled) elements.countDisabled.textContent = disabled.toLocaleString('ar-SA');
  if (elements.countVerified) elements.countVerified.textContent = verified.toLocaleString('ar-SA');
}

function applySearch() {
  const term = String(elements.search?.value || '').trim().toLocaleLowerCase('ar');
  if (!term) {
    state.filteredUsers = [...state.users];
  } else {
    state.filteredUsers = state.users.filter(user => {
      const haystack = [
        user.displayName,
        user.email,
        user.phoneNumber,
        user.uid,
        roleLabel(user),
        roleValue(user)
      ].filter(Boolean).join(' ').toLocaleLowerCase('ar');
      return haystack.includes(term);
    });
  }
  renderUsers();
}

function renderUsers() {
  if (!elements.tableBody) return;

  if (state.loading) {
    elements.tableBody.innerHTML = '<tr class="firebase-users-loading"><td colspan="7">جارٍ تحميل مستخدمي Firebase...</td></tr>';
    elements.empty?.classList.add('hidden');
    return;
  }

  if (!state.filteredUsers.length) {
    elements.tableBody.innerHTML = '';
    elements.empty?.classList.remove('hidden');
    return;
  }

  elements.empty?.classList.add('hidden');
  elements.tableBody.innerHTML = state.filteredUsers.map(user => {
    const isSelf = user.uid === auth.currentUser?.uid;
    return `
      <tr data-uid="${escapeHtml(user.uid)}">
        <td class="firebase-user-cell">
          <strong>${escapeHtml(user.displayName || 'مستخدم بدون اسم')}</strong>
          <small>${escapeHtml(user.email || user.phoneNumber || 'لا توجد وسيلة اتصال')}</small>
        </td>
        <td><span class="user-role">${escapeHtml(roleLabel(user))}</span></td>
        <td><span class="user-badge ${user.emailVerified ? 'verified' : 'pending'}">${user.emailVerified ? 'موثّق' : 'غير موثّق'}</span></td>
        <td><span class="user-badge ${user.disabled ? 'disabled' : 'active'}">${user.disabled ? 'معطّل' : 'نشط'}</span></td>
        <td>${formatDate(user.metadata?.creationTime)}</td>
        <td>${formatDate(user.metadata?.lastSignInTime)}</td>
        <td>
          <div class="user-actions">
            <button class="user-action" data-user-action="edit">تعديل</button>
            <button class="user-action" data-user-action="reset" ${user.email ? '' : 'disabled'}>استعادة المرور</button>
            <button class="user-action" data-user-action="toggle" ${isSelf ? 'disabled' : ''}>${user.disabled ? 'تفعيل' : 'تعطيل'}</button>
            <button class="user-action" data-user-action="revoke">إنهاء الجلسات</button>
            <button class="user-action danger" data-user-action="delete" ${isSelf ? 'disabled' : ''}>حذف</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadUsers({ silent = false } = {}) {
  if (state.loading) return;
  state.loading = true;
  if (!silent) renderUsers();

  try {
    if (!state.apiOnline) {
      const healthy = await checkApiHealth();
      if (!healthy) return;
    }
    state.users = await fetchAllUsers();
    state.users.sort((a, b) => new Date(b.metadata?.creationTime || 0) - new Date(a.metadata?.creationTime || 0));
    updateStats();
    applySearch();
    if (!silent) showToast(`تم تحميل ${state.users.length.toLocaleString('ar-SA')} مستخدمًا من Firebase`);
  } catch (error) {
    console.error('Firebase users loading error:', error);
    state.users = [];
    state.filteredUsers = [];
    updateStats();
    if (elements.error) {
      elements.error.classList.remove('hidden');
      elements.error.textContent = error.message || 'تعذر تحميل مستخدمي Firebase.';
    }
    setApiState(error.status === 403 ? 'error' : '', error.status === 403 ? 'الحساب لا يحمل صلاحية الإدارة' : 'تعذر تحميل المستخدمين');
  } finally {
    state.loading = false;
    renderUsers();
  }
}

function resetForm() {
  elements.form?.reset();
  state.currentEditingUid = null;
  if (elements.uid) elements.uid.value = '';
  if (elements.formMessage) elements.formMessage.textContent = '';
  if (elements.save) elements.save.disabled = false;
}

function openCreateModal() {
  resetForm();
  elements.modalTitle.textContent = 'إنشاء مستخدم جديد';
  elements.password.required = true;
  elements.password.placeholder = 'ستة أحرف على الأقل';
  elements.passwordNote.textContent = 'سيستخدم المستخدم كلمة المرور المؤقتة لتسجيل الدخول لأول مرة.';
  elements.role.value = 'student';
  elements.modal.classList.remove('hidden');
  setTimeout(() => elements.displayName.focus(), 80);
}

function openEditModal(user) {
  resetForm();
  state.currentEditingUid = user.uid;
  elements.uid.value = user.uid;
  elements.modalTitle.textContent = 'تعديل حساب المستخدم';
  elements.displayName.value = user.displayName || '';
  elements.email.value = user.email || '';
  elements.phone.value = user.phoneNumber || '';
  elements.role.value = roleValue(user);
  elements.verified.checked = Boolean(user.emailVerified);
  elements.disabled.checked = Boolean(user.disabled);
  elements.password.required = false;
  elements.password.placeholder = 'اتركها فارغة دون تغيير';
  elements.passwordNote.textContent = `UID: ${user.uid} — اترك كلمة المرور فارغة للاحتفاظ بكلمة المرور الحالية.`;
  elements.modal.classList.remove('hidden');
  setTimeout(() => elements.displayName.focus(), 80);
}

function closeModal() {
  elements.modal?.classList.add('hidden');
  resetForm();
}

async function saveUser(event) {
  event.preventDefault();
  if (elements.save.disabled) return;

  const isEditing = Boolean(state.currentEditingUid);
  const password = elements.password.value;
  const role = elements.role.value;
  const payload = {
    email: elements.email.value.trim(),
    displayName: elements.displayName.value.trim() || null,
    phoneNumber: elements.phone.value.trim() || null,
    emailVerified: elements.verified.checked,
    disabled: elements.disabled.checked
  };

  if (!payload.email) {
    elements.formMessage.textContent = 'البريد الإلكتروني مطلوب.';
    return;
  }
  if (!isEditing && password.length < 6) {
    elements.formMessage.textContent = 'كلمة المرور المؤقتة يجب ألا تقل عن 6 أحرف.';
    return;
  }
  if (password && password.length < 6) {
    elements.formMessage.textContent = 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.';
    return;
  }
  if (password) payload.password = password;

  elements.save.disabled = true;
  elements.formMessage.textContent = '';

  try {
    if (isEditing) {
      const previous = state.users.find(user => user.uid === state.currentEditingUid);
      await apiRequest(`/api/admin/users/${encodeURIComponent(state.currentEditingUid)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      if (role !== roleValue(previous || {})) {
        await apiRequest(`/api/admin/users/${encodeURIComponent(state.currentEditingUid)}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role })
        });
      }
      showToast('تم تحديث حساب المستخدم');
    } else {
      await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ ...payload, password, role })
      });
      showToast('تم إنشاء المستخدم بنجاح');
    }

    closeModal();
    await loadUsers({ silent: true });
  } catch (error) {
    console.error('User save error:', error);
    elements.formMessage.textContent = error.message || 'تعذر حفظ بيانات المستخدم.';
    elements.save.disabled = false;
  }
}

async function toggleUser(user, button) {
  const verb = user.disabled ? 'تفعيل' : 'تعطيل';
  if (!window.confirm(`هل تريد ${verb} حساب ${user.email || user.displayName || user.uid}؟`)) return;
  button.disabled = true;
  try {
    await apiRequest(`/api/admin/users/${encodeURIComponent(user.uid)}`, {
      method: 'PATCH',
      body: JSON.stringify({ disabled: !user.disabled })
    });
    showToast(`تم ${verb} الحساب`);
    await loadUsers({ silent: true });
  } catch (error) {
    showToast(error.message || `تعذر ${verb} الحساب`);
    button.disabled = false;
  }
}

async function revokeSessions(user, button) {
  if (!window.confirm(`سيتم إنهاء جميع جلسات ${user.email || user.displayName || user.uid}. متابعة؟`)) return;
  button.disabled = true;
  try {
    await apiRequest(`/api/admin/users/${encodeURIComponent(user.uid)}/revoke-sessions`, { method: 'POST' });
    showToast('تم إنهاء جلسات المستخدم');
  } catch (error) {
    showToast(error.message || 'تعذر إنهاء الجلسات');
  } finally {
    button.disabled = false;
  }
}

async function sendReset(user, button) {
  if (!user.email) return;
  if (!window.confirm(`إرسال رابط إعادة تعيين كلمة المرور إلى ${user.email}؟`)) return;
  button.disabled = true;
  try {
    await sendPasswordResetEmail(auth, user.email);
    showToast('تم إرسال رابط استعادة كلمة المرور');
  } catch (error) {
    console.error('Password reset error:', error);
    const messages = {
      'auth/too-many-requests': 'تجاوزت محاولات الإرسال الحد المؤقت.',
      'auth/network-request-failed': 'تعذر الاتصال بخدمة Firebase.',
      'auth/invalid-email': 'البريد الإلكتروني غير صالح.'
    };
    showToast(messages[error.code] || 'تعذر إرسال رابط الاستعادة');
  } finally {
    button.disabled = false;
  }
}

async function deleteUser(user, button) {
  const identity = user.email || user.displayName || user.uid;
  const confirmation = window.prompt(`حذف الحساب نهائي ولا يمكن التراجع عنه. اكتب UID للتأكيد:\n${user.uid}`);
  if (confirmation !== user.uid) {
    if (confirmation !== null) showToast('لم يتم الحذف لأن UID غير مطابق');
    return;
  }
  button.disabled = true;
  try {
    await apiRequest(`/api/admin/users/${encodeURIComponent(user.uid)}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirmUid: user.uid })
    });
    showToast(`تم حذف حساب ${identity}`);
    await loadUsers({ silent: true });
  } catch (error) {
    showToast(error.message || 'تعذر حذف المستخدم');
    button.disabled = false;
  }
}

function findUserFromButton(button) {
  const uid = button.closest('tr')?.dataset.uid;
  return state.users.find(user => user.uid === uid) || null;
}

elements.tableBody?.addEventListener('click', event => {
  const button = event.target.closest('[data-user-action]');
  if (!button) return;
  const user = findUserFromButton(button);
  if (!user) return;

  const action = button.dataset.userAction;
  if (action === 'edit') openEditModal(user);
  if (action === 'reset') sendReset(user, button);
  if (action === 'toggle') toggleUser(user, button);
  if (action === 'revoke') revokeSessions(user, button);
  if (action === 'delete') deleteUser(user, button);
});

elements.search?.addEventListener('input', applySearch);
elements.refresh?.addEventListener('click', () => loadUsers());
elements.create?.addEventListener('click', openCreateModal);
elements.modalClose?.addEventListener('click', closeModal);
elements.cancel?.addEventListener('click', closeModal);
elements.form?.addEventListener('submit', saveUser);
elements.modal?.addEventListener('click', event => {
  if (event.target === elements.modal) closeModal();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !elements.modal?.classList.contains('hidden')) closeModal();
});

document.querySelector('[data-section="players"]')?.addEventListener('click', () => {
  document.getElementById('sectionTitle').textContent = 'مستخدمو Firebase';
  if (!state.users.length && !state.loading) loadUsers();
});

document.getElementById('refreshButton')?.addEventListener('click', () => {
  if (document.getElementById('playersSection')?.classList.contains('active-section')) {
    loadUsers({ silent: true });
  }
});

onAuthStateChanged(auth, user => {
  if (!user || user.uid !== ADMIN_UID) return;
  checkApiHealth().then(healthy => {
    if (healthy && location.hash === '#players') loadUsers({ silent: true });
  });
});

if (location.hash === '#players') {
  document.getElementById('sectionTitle').textContent = 'مستخدمو Firebase';
}
