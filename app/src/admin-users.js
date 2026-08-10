import './admin-users.css';

const ROLE_LABELS = { 'super-admin':'Super Admin', 'content-admin':'Content Admin', support:'Support', student:'Student' };
const STATUS_LABELS = { active:'نشط', suspended:'موقوف' };
let access = { role:'student', capabilities:[] };
let currentPage = 1;
let activeUser = null;
let searchTimer;

function esc(value){ return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function ar(value){ return Number(value || 0).toLocaleString('ar-SA'); }
function date(value){ if(!value)return '—'; try{return new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(value));}catch{return String(value);} }
function can(capability){ return access.capabilities?.includes(capability); }

async function request(path, options={}){
  const user = window.NEON_AUTH_SESSION?.user;
  if(!user?.getIdToken) throw new Error('AUTH_SESSION_UNAVAILABLE');
  const token = await user.getIdToken();
  const response = await fetch(path,{...options,cache:'no-store',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})}});
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw Object.assign(new Error(data.message||`HTTP_${response.status}`),{code:data.error,status:response.status});
  return data;
}

function toast(message,tone='normal'){
  const fn = window.NEON_ADMIN_SHOW_TOAST;
  if(typeof fn==='function') return fn(message,tone);
  window.alert(message);
}

function metrics(values={}){
  const rows=[['إجمالي المستخدمين',values.total],['نشط آخر 7 أيام',values.active7d],['نشط آخر 30 يومًا',values.active30d],['حسابات موقوفة',values.suspended],['صلاحيات إدارية مفوضة',values.delegatedAdmins]];
  document.getElementById('userMetricGrid').innerHTML=rows.map(([label,value])=>`<article class="user-metric"><small>${esc(label)}</small><strong>${ar(value)}</strong></article>`).join('');
}

function rolePill(role){ return `<span class="role-pill role-${esc(role)}">${esc(ROLE_LABELS[role]||role)}</span>`; }
function statusPill(status){ return `<span class="account-status-pill status-${esc(status)}">${esc(STATUS_LABELS[status]||status)}</span>`; }

function renderPagination(page,pages){
  const box=document.getElementById('usersPagination');
  box.innerHTML=`<button ${page<=1?'disabled':''} data-users-prev>السابق</button><span>صفحة ${ar(page)} من ${ar(pages)}</span><button ${page>=pages?'disabled':''} data-users-next>التالي</button>`;
  box.querySelector('[data-users-prev]')?.addEventListener('click',()=>loadUsers(page-1).catch(handleError));
  box.querySelector('[data-users-next]')?.addEventListener('click',()=>loadUsers(page+1).catch(handleError));
}

async function loadUsers(page=currentPage){
  if(!can('users.read')) return;
  currentPage=page;
  const params=new URLSearchParams({q:document.getElementById('userSearch').value.trim(),role:document.getElementById('userRoleFilter').value,status:document.getElementById('userStatusFilter').value,page:String(page),pageSize:'40'});
  const body=document.getElementById('usersTable');
  body.innerHTML='<tr><td colspan="7"><div class="empty-state">جارٍ تحميل المستخدمين…</div></td></tr>';
  const data=await request(`/api/admin/users?${params}`);
  metrics(data.metrics);
  body.innerHTML=data.items?.length?data.items.map(user=>`<tr>
    <td><div class="user-name-cell"><strong>${esc(user.name||user.email||'مستخدم NEON')}</strong><small>${esc(user.email||user.uid)}</small></div></td>
    <td>${rolePill(user.role)}</td><td>${statusPill(user.status)}</td>
    <td><div class="user-progress-cell"><strong>${ar(user.averageScore||0)}%</strong><small>${ar(user.attempts||0)} محاولة</small></div></td>
    <td>${user.goal?`${esc(user.goal.examTrack||'—')} • ${ar(user.goal.targetScore||0)}%`:'—'}</td>
    <td>${date(user.lastSeenAt)}</td>
    <td><button class="admin-soft" data-user-detail="${esc(user.uid)}">عرض</button></td>
  </tr>`).join(''):'<tr><td colspan="7"><div class="empty-state">لا توجد حسابات مطابقة.</div></td></tr>';
  renderPagination(data.page,data.pages);
}

async function openUser(uid){
  const data=await request(`/api/admin/user/detail?uid=${encodeURIComponent(uid)}`);
  activeUser=data.user;
  const user=data.user;
  document.getElementById('userModalTitle').textContent=user.name||user.email||'تفاصيل المستخدم';
  document.getElementById('userModalSubtitle').textContent=user.email||user.uid;
  document.getElementById('userDetailSummary').innerHTML=`
    <article class="user-detail-card"><small>الدور</small><strong>${rolePill(user.role)}</strong></article>
    <article class="user-detail-card"><small>الحالة</small><strong>${statusPill(user.status)}</strong></article>
    <article class="user-detail-card"><small>أول ظهور في المنصة</small><strong>${date(user.firstSeenAt)}</strong></article>
    <article class="user-detail-card"><small>آخر نشاط</small><strong>${date(user.lastSeenAt)}</strong></article>
    <article class="user-detail-card"><small>متوسط الاختبارات</small><strong>${ar(user.assessmentSummary?.average_score||0)}%</strong></article>
    <article class="user-detail-card"><small>عدد المحاولات</small><strong>${ar(user.assessmentSummary?.attempts||0)}</strong></article>`;
  const attempts=document.getElementById('userAttempts');
  attempts.innerHTML=user.recentAttempts?.length?user.recentAttempts.map(item=>`<div class="attempt-row"><strong>${esc(item.subject_id||item.mode||'اختبار')}</strong><b>${ar(item.score)}%</b><small>${date(item.created_at)}</small></div>`).join(''):'<div class="empty-state">لا توجد محاولات اختبار محفوظة بعد.</div>';
  const editor=document.getElementById('userAccessEditor');
  const protectedUser=user.bootstrapAdmin||user.uid===window.NEON_AUTH_USER?.uid;
  editor.hidden=!can('users.manage');
  if(can('users.manage')){
    editor.innerHTML=protectedUser?`<div class="bootstrap-note full">${user.bootstrapAdmin?'هذا الحساب مسؤول أساسي معرف في بيئة الخادم ومحمي من تغيير الدور أو الإيقاف داخل اللوحة.':'لا يمكن تعديل دور الحساب المستخدم في الجلسة الحالية أو إيقافه من نفس الجلسة.'}</div>`:`
      <label>الدور<select id="editUserRole"><option value="student">Student</option><option value="support">Support</option><option value="content-admin">Content Admin</option><option value="super-admin">Super Admin</option></select></label>
      <label>الحالة<select id="editUserStatus"><option value="active">نشط</option><option value="suspended">موقوف على مستوى المنصة</option></select></label>
      <label class="full">سبب الإيقاف / ملاحظة إدارية<textarea id="editUserReason" rows="3" placeholder="يظهر للإدارة فقط"></textarea></label>
      <div class="modal-actions full"><span></span><button class="admin-primary" id="saveUserAccess" type="button">حفظ الصلاحيات</button></div>`;
    if(!protectedUser){
      document.getElementById('editUserRole').value=user.storedRole||user.role||'student';
      document.getElementById('editUserStatus').value=user.status||'active';
      document.getElementById('editUserReason').value=user.statusReason||'';
      document.getElementById('saveUserAccess').addEventListener('click',saveUserAccess);
    }
  }
  document.getElementById('userModal').classList.add('is-open');
  document.getElementById('userModal').setAttribute('aria-hidden','false');
}

function closeUser(){ document.getElementById('userModal').classList.remove('is-open'); document.getElementById('userModal').setAttribute('aria-hidden','true'); activeUser=null; }

async function saveUserAccess(){
  if(!activeUser||!can('users.manage'))return;
  const button=document.getElementById('saveUserAccess'); button.disabled=true; button.textContent='جارٍ الحفظ…';
  try{
    await request('/api/admin/user',{method:'PUT',body:JSON.stringify({uid:activeUser.uid,role:document.getElementById('editUserRole').value,status:document.getElementById('editUserStatus').value,reason:document.getElementById('editUserReason').value})});
    closeUser(); await loadUsers(currentPage); toast('تم تحديث دور المستخدم وحالة الوصول.', 'success');
  }finally{ if(button){button.disabled=false;button.textContent='حفظ الصلاحيات';} }
}

function handleError(error){ console.error('NEON Admin Users:',error); toast(error?.message||'تعذر تنفيذ عملية إدارة المستخدمين.','error'); }

function install(){
  document.addEventListener('click',event=>{
    const detail=event.target.closest('[data-user-detail]'); if(detail)openUser(detail.dataset.userDetail).catch(handleError);
    if(event.target.closest('[data-close-user-modal]'))closeUser();
    if(event.target.id==='userModal')closeUser();
  });
  document.getElementById('searchUsers')?.addEventListener('click',()=>loadUsers(1).catch(handleError));
  document.getElementById('userRoleFilter')?.addEventListener('change',()=>loadUsers(1).catch(handleError));
  document.getElementById('userStatusFilter')?.addEventListener('change',()=>loadUsers(1).catch(handleError));
  document.getElementById('userSearch')?.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>loadUsers(1).catch(handleError),350);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeUser();});
}

export function configureAdminUsers(nextAccess){
  access=nextAccess||access;
  const tab=document.querySelector('[data-admin-tab="users"]');
  if(tab)tab.hidden=!can('users.read');
  const badge=document.getElementById('adminRoleBadge');
  if(badge){badge.textContent=ROLE_LABELS[access.role]||access.role;badge.className=`admin-role-badge role-${access.role}`;}
}
export function activateAdminUsers(){ return loadUsers(1); }

install();
window.NEON_ADMIN_USERS={configure:configureAdminUsers,activate:activateAdminUsers};
