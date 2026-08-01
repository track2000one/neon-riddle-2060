(() => {
  'use strict';

  if (window.__NEON_FIREBASE_DELETE_CONFIRM__) return;
  window.__NEON_FIREBASE_DELETE_CONFIRM__ = true;

  const FIREBASE_VERSION = '10.14.1';
  const CONFIRM_WORD = 'حذف';
  let pendingDeletion = null;
  let modal = null;

  function injectStyles() {
    if (document.getElementById('firebaseDeleteConfirmStyles')) return;
    const style = document.createElement('style');
    style.id = 'firebaseDeleteConfirmStyles';
    style.textContent = `
      body.firebase-delete-lock{overflow:hidden}
      .firebase-delete-modal{position:fixed;inset:0;z-index:2400;display:grid;place-items:center;padding:20px;background:rgba(2,5,15,.82);backdrop-filter:blur(14px)}
      .firebase-delete-modal.hidden{display:none}
      .firebase-delete-card{width:min(560px,100%);overflow:hidden;border:1px solid rgba(255,116,136,.3);border-radius:24px;background:linear-gradient(145deg,#12172d,#0b1023);color:var(--text,#f7f9ff);box-shadow:0 34px 100px rgba(0,0,0,.62)}
      .firebase-delete-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:21px 22px;border-bottom:1px solid var(--line,rgba(255,255,255,.1));background:rgba(255,116,136,.055)}
      .firebase-delete-head h3{margin:5px 0 0;font-size:22px}.firebase-delete-eyebrow{color:#ff8ea2;font-size:10px;font-weight:900;letter-spacing:.12em}
      .firebase-delete-close{width:39px;height:39px;flex:0 0 39px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:12px;background:rgba(255,255,255,.055);color:var(--text,#fff);font-size:23px;cursor:pointer}
      .firebase-delete-body{padding:22px}.firebase-delete-warning{margin:0 0 16px;color:#ffd6de;line-height:1.85}
      .firebase-delete-user{display:grid;gap:7px;padding:15px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:16px;background:rgba(255,255,255,.035)}
      .firebase-delete-user strong{font-size:16px}.firebase-delete-user span{color:var(--muted,#aeb8d2);direction:ltr;text-align:right;overflow-wrap:anywhere}.firebase-delete-user code{color:#9ceeff;font-size:11px;direction:ltr;text-align:left;overflow-wrap:anywhere}
      .firebase-delete-instruction{display:block;margin:18px 0 8px;color:var(--muted,#aeb8d2);font-size:12px;line-height:1.7}.firebase-delete-instruction b{color:#ffb3c0}
      .firebase-delete-input{width:100%;min-height:48px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:13px;background:rgba(255,255,255,.05);color:var(--text,#fff);padding:0 14px;font:inherit}.firebase-delete-input:focus{outline:none;border-color:rgba(255,116,136,.6);box-shadow:0 0 0 4px rgba(255,116,136,.1)}
      .firebase-delete-error{min-height:24px;margin-top:10px;color:#ff9caf;font-size:12px;line-height:1.65}
      .firebase-delete-actions{display:flex;justify-content:flex-start;gap:10px;margin-top:16px}.firebase-delete-actions button{min-height:43px;border-radius:12px;padding:0 18px;font:inherit;font-weight:900;cursor:pointer}
      .firebase-delete-cancel{border:1px solid var(--line,rgba(255,255,255,.1));background:rgba(255,255,255,.055);color:var(--text,#fff)}
      .firebase-delete-submit{border:1px solid rgba(90,24,42,.36);background:#ff8b9e;color:#351018}.firebase-delete-submit:disabled{opacity:.45;cursor:not-allowed}
      .firebase-delete-submit.is-loading{cursor:wait}
      @media(max-width:560px){.firebase-delete-modal{padding:12px}.firebase-delete-head,.firebase-delete-body{padding:17px}.firebase-delete-actions{flex-direction:column}.firebase-delete-actions button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function ensureModal() {
    if (modal?.isConnected) return modal;
    modal = document.createElement('div');
    modal.className = 'firebase-delete-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'firebaseDeleteTitle');
    modal.innerHTML = `
      <div class="firebase-delete-card">
        <div class="firebase-delete-head">
          <div><div class="firebase-delete-eyebrow">PERMANENT ACCOUNT DELETION</div><h3 id="firebaseDeleteTitle">تأكيد حذف المستخدم</h3></div>
          <button class="firebase-delete-close" type="button" aria-label="إغلاق">×</button>
        </div>
        <div class="firebase-delete-body">
          <p class="firebase-delete-warning">سيُحذف الحساب نهائيًا من Firebase Authentication، ولن يستطيع المستخدم تسجيل الدخول مرة أخرى بهذا الحساب.</p>
          <div class="firebase-delete-user">
            <strong data-delete-name>مستخدم Firebase</strong>
            <span data-delete-email>—</span>
            <code data-delete-uid>—</code>
          </div>
          <label class="firebase-delete-instruction" for="firebaseDeletePhrase">للتأكيد اكتب كلمة <b>${CONFIRM_WORD}</b> فقط:</label>
          <input id="firebaseDeletePhrase" class="firebase-delete-input" type="text" autocomplete="off" spellcheck="false" placeholder="${CONFIRM_WORD}" />
          <div class="firebase-delete-error" role="alert" aria-live="polite"></div>
          <div class="firebase-delete-actions">
            <button class="firebase-delete-submit" type="button" disabled>حذف الحساب نهائيًا</button>
            <button class="firebase-delete-cancel" type="button">إلغاء</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const input = modal.querySelector('.firebase-delete-input');
    const submit = modal.querySelector('.firebase-delete-submit');
    const closeButtons = modal.querySelectorAll('.firebase-delete-close,.firebase-delete-cancel');

    input.addEventListener('input', () => {
      submit.disabled = input.value.trim() !== CONFIRM_WORD || submit.classList.contains('is-loading');
      modal.querySelector('.firebase-delete-error').textContent = '';
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !submit.disabled) submit.click();
    });
    submit.addEventListener('click', performDeletion);
    closeButtons.forEach(button => button.addEventListener('click', closeModal));
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });
    return modal;
  }

  function openModal(details) {
    pendingDeletion = details;
    const dialog = ensureModal();
    dialog.querySelector('[data-delete-name]').textContent = details.name || 'مستخدم بدون اسم';
    dialog.querySelector('[data-delete-email]').textContent = details.email || 'لا يوجد بريد إلكتروني';
    dialog.querySelector('[data-delete-uid]').textContent = `UID: ${details.uid}`;
    dialog.querySelector('.firebase-delete-input').value = '';
    dialog.querySelector('.firebase-delete-error').textContent = '';
    const submit = dialog.querySelector('.firebase-delete-submit');
    submit.disabled = true;
    submit.classList.remove('is-loading');
    submit.textContent = 'حذف الحساب نهائيًا';
    dialog.classList.remove('hidden');
    document.body.classList.add('firebase-delete-lock');
    window.setTimeout(() => dialog.querySelector('.firebase-delete-input').focus(), 60);
  }

  function closeModal() {
    if (!modal || modal.querySelector('.firebase-delete-submit')?.classList.contains('is-loading')) return;
    modal.classList.add('hidden');
    document.body.classList.remove('firebase-delete-lock');
    pendingDeletion?.button?.focus?.();
    pendingDeletion = null;
  }

  async function parseResponse(response) {
    const type = response.headers.get('content-type') || '';
    const payload = type.includes('application/json')
      ? await response.json()
      : { ok: false, message: await response.text() };
    if (!response.ok || payload.ok === false) {
      const error = new Error(payload.message || `فشل الحذف برمز ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  async function deleteThroughAdminApi(uid) {
    const [{ getApp }, { getAuth }, config] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import('./firebase-config.js')
    ]);
    const auth = getAuth(getApp());
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== config.ADMIN_UID) {
      throw new Error('انتهت جلسة المسؤول. سجل الدخول مجددًا ثم أعد المحاولة.');
    }
    const token = await currentUser.getIdToken(true);
    const response = await fetch(`${config.ADMIN_API_BASE_URL}/api/admin/users/${encodeURIComponent(uid)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ confirmUid: uid }),
      cache: 'no-store'
    });
    return parseResponse(response);
  }

  async function performDeletion() {
    if (!pendingDeletion || !modal) return;
    const input = modal.querySelector('.firebase-delete-input');
    const submit = modal.querySelector('.firebase-delete-submit');
    const errorBox = modal.querySelector('.firebase-delete-error');
    if (input.value.trim() !== CONFIRM_WORD || submit.disabled) return;

    submit.disabled = true;
    submit.classList.add('is-loading');
    submit.textContent = 'جارٍ حذف الحساب...';
    errorBox.textContent = '';
    pendingDeletion.button.disabled = true;

    try {
      const identity = pendingDeletion.email || pendingDeletion.name || pendingDeletion.uid;
      await deleteThroughAdminApi(pendingDeletion.uid);
      submit.classList.remove('is-loading');
      modal.classList.add('hidden');
      document.body.classList.remove('firebase-delete-lock');
      pendingDeletion.button.disabled = false;
      pendingDeletion = null;
      showToast(`تم حذف حساب ${identity}`);
      document.getElementById('firebaseUsersRefresh')?.click();
    } catch (error) {
      console.error('Firebase user deletion error:', error);
      pendingDeletion.button.disabled = false;
      submit.classList.remove('is-loading');
      submit.textContent = 'إعادة محاولة الحذف';
      submit.disabled = false;
      errorBox.textContent = error.message || 'تعذر حذف المستخدم. أعد المحاولة.';
    }
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest('[data-user-action="delete"]');
    if (!button || !button.closest('#firebaseUsersTableBody') || button.disabled) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const row = button.closest('tr');
    const uid = row?.dataset.uid;
    if (!uid) {
      showToast('تعذر تحديد UID للمستخدم');
      return;
    }
    openModal({
      uid,
      name: row.querySelector('.firebase-user-cell strong')?.textContent?.trim() || '',
      email: row.querySelector('.firebase-user-cell small')?.textContent?.trim() || '',
      button
    });
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal && !modal.classList.contains('hidden')) closeModal();
  });

  injectStyles();
})();
