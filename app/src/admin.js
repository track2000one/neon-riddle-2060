import './admin.css';
import { ensureAuth, renderAccount } from './auth.js';
import { configureAdminUsers, activateAdminUsers } from './admin-users.js';

const SUBJECTS = {
  'tahsili-math':'رياضيات التحصيلي','tahsili-physics':'فيزياء التحصيلي','tahsili-chemistry':'كيمياء التحصيلي','tahsili-biology':'أحياء التحصيلي','qudurat-verbal':'القدرات اللفظية','qudurat-quant':'القدرات الكمية'
};
const STATUS_LABELS={published:'منشور','needs-review':'يحتاج مراجعة',hidden:'مخفي'};
const REPORT_LABELS={new:'جديد',reviewing:'قيد المراجعة',resolved:'تمت المعالجة',dismissed:'مستبعد'};
const REASON_LABELS={'wrong-answer':'إجابة غير صحيحة',unclear:'سؤال غير واضح',duplicate:'مكرر',typo:'خطأ كتابي',other:'أخرى'};
const TAB_CAPABILITIES={overview:'dashboard.read',questions:'content.read',reports:'reports.manage',duplicates:'duplicates.read',users:'users.read',audit:'audit.read'};

let session;
let adminAccess={role:'student',capabilities:[]};
let currentQuestions=[];
let currentQuestionPage=1;
let currentReportPage=1;
let activeQuestion=null;
let questionSearchTimer;

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function arNumber(value){return Number(value||0).toLocaleString('ar-SA');}
function formatDate(value){if(!value)return'—';try{return new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(value));}catch{return String(value);}}
function can(capability){return adminAccess.capabilities?.includes(capability);}

async function request(path,options={}){
  if(!session?.user?.getIdToken)throw new Error('AUTH_SESSION_UNAVAILABLE');
  const token=await session.user.getIdToken();
  const response=await fetch(path,{...options,cache:'no-store',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(data.message||`HTTP_${response.status}`),{code:data.error,status:response.status});
  return data;
}

function showToast(message,tone='normal'){
  let toast=document.getElementById('adminToast');
  if(!toast){toast=document.createElement('div');toast.id='adminToast';Object.assign(toast.style,{position:'fixed',insetInlineStart:'24px',bottom:'24px',zIndex:'130',maxWidth:'420px',padding:'12px 15px',borderRadius:'13px',boxShadow:'0 18px 60px rgba(0,0,0,.35)',fontWeight:'800',transition:'.2s ease'});document.body.appendChild(toast);}
  toast.style.background=tone==='error'?'#5b1f28':tone==='success'?'#123d34':'#152346';toast.style.color='#f5f8ff';toast.style.border=`1px solid ${tone==='error'?'#ff938c':tone==='success'?'#63e6ad':'#63dbe4'}`;toast.textContent=message;toast.style.opacity='1';clearTimeout(toast._timer);toast._timer=setTimeout(()=>{toast.style.opacity='0';},3200);
}
window.NEON_ADMIN_SHOW_TOAST=showToast;

function populateSubjects(){const select=document.getElementById('questionSubject');for(const[id,title]of Object.entries(SUBJECTS)){const option=document.createElement('option');option.value=id;option.textContent=title;select.appendChild(option);}}

function applyCapabilities(){
  document.querySelectorAll('[data-admin-tab]').forEach(button=>{const capability=TAB_CAPABILITIES[button.dataset.adminTab];button.hidden=Boolean(capability&&!can(capability));});
  configureAdminUsers(adminAccess);
}

function activateTab(name){
  const capability=TAB_CAPABILITIES[name];
  if(capability&&!can(capability)){showToast('الدور الحالي لا يملك صلاحية فتح هذا القسم.','error');return;}
  document.querySelectorAll('[data-admin-tab]').forEach(button=>button.classList.toggle('is-active',button.dataset.adminTab===name));
  document.querySelectorAll('[data-admin-panel]').forEach(panel=>panel.classList.toggle('is-active',panel.dataset.adminPanel===name));
  if(name==='questions')loadQuestions(1).catch(handleError);
  if(name==='reports')loadReports(1).catch(handleError);
  if(name==='duplicates')loadDuplicates().catch(handleError);
  if(name==='users')activateAdminUsers().catch(handleError);
  if(name==='audit')loadAudit().catch(handleError);
}

function metricCard(label,value,className=''){return`<article class="metric-card ${className}"><small>${escapeHtml(label)}</small><strong>${arNumber(value)}</strong></article>`;}
async function loadDashboard(){
  const data=await request('/api/admin/dashboard');const totals=data.totals||{};
  document.getElementById('metricGrid').innerHTML=[metricCard('إجمالي بنك الأسئلة',totals.total),metricCard('منشور للطلاب',totals.active,'success'),metricCard('مخفي',totals.hidden,totals.hidden?'danger':''),metricCard('يحتاج مراجعة',totals.needsReview,totals.needsReview?'warn':''),metricCard('بلاغات مفتوحة',totals.openReports,totals.openReports?'warn':'')].join('');
  document.getElementById('contentRevision').textContent=data.revision||'base';document.getElementById('questionsBadge').textContent=arNumber(totals.total);document.getElementById('reportsBadge').textContent=arNumber(totals.openReports);document.getElementById('duplicatesBadge').textContent=arNumber(totals.potentialDuplicates);
  document.getElementById('subjectHealth').innerHTML=(data.bySubject||[]).map(item=>{const activePercent=item.total?Math.round(item.active/item.total*100):0;return`<div class="subject-row"><div><strong>${escapeHtml(item.title)}</strong><small>${arNumber(item.total)} سؤالًا</small></div><div class="subject-bar"><span style="width:${activePercent}%"></span></div><div class="subject-counts"><span>${arNumber(item.active)} منشور</span>${item.needsReview?`<span>${arNumber(item.needsReview)} مراجعة</span>`:''}${item.hidden?`<span>${arNumber(item.hidden)} مخفي</span>`:''}</div></div>`;}).join('');
}
function questionStatusClass(status){return`status-${String(status||'published')}`;}
async function loadQuestions(page=currentQuestionPage){
  if(!can('content.read'))return;currentQuestionPage=page;
  const params=new URLSearchParams({subject:document.getElementById('questionSubject').value,status:document.getElementById('questionStatus').value,q:document.getElementById('questionSearch').value.trim(),page:String(page),pageSize:'40'});
  const body=document.getElementById('questionsTable');body.innerHTML='<tr><td colspan="6"><div class="empty-state">جارٍ تحميل الأسئلة…</div></td></tr>';
  const data=await request(`/api/admin/questions?${params}`);currentQuestions=data.items||[];
  body.innerHTML=currentQuestions.length?currentQuestions.map((question,index)=>`<tr><td class="question-cell"><strong>${escapeHtml(question.q)}</strong><small>${escapeHtml(question.id)}${question.adminEdited?' • معدل إداريًا':''}</small></td><td>${escapeHtml(question.subjectTitle)}</td><td>${escapeHtml(question.category||'—')}</td><td><span class="status-pill ${questionStatusClass(question.adminStatus)}">${escapeHtml(STATUS_LABELS[question.adminStatus]||question.adminStatus)}</span></td><td>${question.openReports?`<strong>${arNumber(question.openReports)}</strong>`:'0'}</td><td><button class="admin-soft" data-edit-question="${index}">مراجعة</button></td></tr>`).join(''):'<tr><td colspan="6"><div class="empty-state">لا توجد نتائج مطابقة.</div></td></tr>';
  renderPagination('questionsPagination',data.page,data.pages,next=>loadQuestions(next));
}
function renderPagination(id,page,pages,loader){const container=document.getElementById(id);if(!container)return;container.innerHTML=`<button ${page<=1?'disabled':''} data-page-prev>السابق</button><span>صفحة ${arNumber(page)} من ${arNumber(pages)}</span><button ${page>=pages?'disabled':''} data-page-next>التالي</button>`;container.querySelector('[data-page-prev]')?.addEventListener('click',()=>loader(page-1));container.querySelector('[data-page-next]')?.addEventListener('click',()=>loader(page+1));}
function openQuestion(question){
  if(!can('content.manage')){showToast('الدور الحالي يملك عرض المحتوى دون صلاحية تعديله.','error');return;}
  activeQuestion=question;const form=document.getElementById('questionForm');form.elements.subjectId.value=question.subjectId;form.elements.questionId.value=question.id;form.elements.q.value=question.q||'';form.elements.passage.value=question.passage||'';form.elements.category.value=question.category||'';form.elements.level.value=question.level||'';form.elements.reviewStatus.value=question.adminStatus||'published';form.elements.explain.value=question.explain||'';document.getElementById('questionModalTitle').textContent=`${question.subjectTitle} • ${question.id}`;
  document.getElementById('optionEditor').innerHTML=(question.options||[]).map((option,index)=>`<label class="option-row"><span>${String.fromCharCode(65+index)}</span><input data-option-index="${index}" value="${escapeHtml(option)}" required /></label>`).join('');rebuildAnswerOptions(Number(question.answer||0));document.getElementById('questionModal').classList.add('is-open');document.getElementById('questionModal').setAttribute('aria-hidden','false');
}
function rebuildAnswerOptions(selected=0){const inputs=[...document.querySelectorAll('[data-option-index]')],answer=document.getElementById('answerSelect');answer.innerHTML=inputs.map((input,index)=>`<option value="${index}">${String.fromCharCode(65+index)} — ${escapeHtml(input.value||`الخيار ${index+1}`)}</option>`).join('');answer.value=String(Math.min(selected,Math.max(0,inputs.length-1)));}
function closeQuestionModal(){document.getElementById('questionModal').classList.remove('is-open');document.getElementById('questionModal').setAttribute('aria-hidden','true');activeQuestion=null;}
async function saveQuestion(event){event.preventDefault();if(!can('content.manage'))return;const form=event.currentTarget,options=[...document.querySelectorAll('[data-option-index]')].map(input=>input.value.trim());const body={subjectId:form.elements.subjectId.value,questionId:form.elements.questionId.value,reviewStatus:form.elements.reviewStatus.value,patch:{q:form.elements.q.value,passage:form.elements.passage.value,options,answer:Number(form.elements.answer.value),category:form.elements.category.value,level:form.elements.level.value,explain:form.elements.explain.value,active:form.elements.reviewStatus.value!=='hidden'}};const submit=form.querySelector('[type="submit"]');submit.disabled=true;submit.textContent='جارٍ الحفظ…';try{await request('/api/admin/question',{method:'PUT',body:JSON.stringify(body)});closeQuestionModal();await Promise.all([loadQuestions(currentQuestionPage),loadDashboard()]);showToast('تم حفظ التعديل وتحديث إصدار بنك الأسئلة.','success');}finally{submit.disabled=false;submit.textContent='حفظ التعديل';}}
async function resetQuestion(){if(!activeQuestion||!can('content.manage'))return;if(!window.confirm('سيتم حذف التعديل الإداري وإعادة السؤال إلى النسخة الأصلية. هل تريد المتابعة؟'))return;await request('/api/admin/question/reset',{method:'POST',body:JSON.stringify({subjectId:activeQuestion.subjectId,questionId:activeQuestion.id})});closeQuestionModal();await Promise.all([loadQuestions(currentQuestionPage),loadDashboard()]);showToast('تمت إعادة النسخة الأصلية للسؤال.','success');}

async function loadReports(page=currentReportPage){
  if(!can('reports.manage'))return;currentReportPage=page;const status=document.getElementById('reportStatus').value,container=document.getElementById('reportList');container.innerHTML='<div class="empty-state">جارٍ تحميل البلاغات…</div>';const data=await request(`/api/admin/reports?status=${encodeURIComponent(status)}&page=${page}&pageSize=30`);
  container.innerHTML=data.items?.length?data.items.map(report=>`<article class="report-card" data-report-id="${report.id}"><header><div><span class="reason-pill">${escapeHtml(REASON_LABELS[report.reason]||report.reason)}</span><strong> ${escapeHtml(SUBJECTS[report.subject_id]||report.subject_id||'غير محدد')}</strong></div><small>${formatDate(report.created_at)}</small></header><p><strong>${escapeHtml(report.question_text||report.question_id||'السؤال غير متاح نصه')}</strong></p>${report.note?`<p>ملاحظة الطالب: ${escapeHtml(report.note)}</p>`:''}<small>Question ID: ${escapeHtml(report.question_id||'—')} • الحالة: ${escapeHtml(REPORT_LABELS[report.status]||report.status)}</small><div class="report-actions"><select data-report-status><option value="new" ${report.status==='new'?'selected':''}>جديد</option><option value="reviewing" ${report.status==='reviewing'?'selected':''}>قيد المراجعة</option><option value="resolved" ${report.status==='resolved'?'selected':''}>تمت المعالجة</option><option value="dismissed" ${report.status==='dismissed'?'selected':''}>مستبعد</option></select><input data-report-note placeholder="قرار / ملاحظة المسؤول" value="${escapeHtml(report.admin_note||'')}" /><button class="admin-primary" data-save-report="${report.id}">حفظ القرار</button></div>${can('content.read')&&report.question_id&&report.subject_id?`<button class="admin-soft" data-open-reported-question="${escapeHtml(report.subject_id)}|${escapeHtml(report.question_id)}">فتح السؤال في البنك</button>`:''}</article>`).join(''):'<div class="empty-state">لا توجد بلاغات ضمن هذا الفلتر.</div>';renderPagination('reportsPagination',data.page,data.pages,next=>loadReports(next));
}
async function saveReport(button){const card=button.closest('[data-report-id]'),id=Number(card.dataset.reportId),status=card.querySelector('[data-report-status]').value,adminNote=card.querySelector('[data-report-note]').value;button.disabled=true;try{await request('/api/admin/report',{method:'PUT',body:JSON.stringify({id,status,adminNote})});await Promise.all([loadReports(currentReportPage),loadDashboard()]);showToast('تم توثيق قرار معالجة البلاغ.','success');}finally{button.disabled=false;}}
async function openReportedQuestion(subjectId,questionId){if(!can('content.read'))return;activateTab('questions');document.getElementById('questionSubject').value=subjectId;document.getElementById('questionStatus').value='all';document.getElementById('questionSearch').value=questionId;await loadQuestions(1);const question=currentQuestions.find(item=>String(item.id)===String(questionId));if(question&&can('content.manage'))openQuestion(question);}

async function loadDuplicates(){if(!can('duplicates.read'))return;const container=document.getElementById('duplicateList');container.innerHTML='<div class="empty-state">جارٍ تحليل التشابه داخل المواد…</div>';const data=await request('/api/admin/duplicates'),rows=data.items||[];document.getElementById('duplicatesBadge').textContent=arNumber(rows.length);container.innerHTML=rows.length?rows.map((pair,index)=>`<article class="duplicate-card"><header><div><strong>${escapeHtml(pair.subjectTitle)}</strong><small> • مراجعة بشرية مطلوبة</small></div><span class="duplicate-score">${arNumber(pair.similarity)}%</span></header><div class="duplicate-pair"><div class="duplicate-side"><small>${escapeHtml(pair.left.id)}</small><p>${escapeHtml(pair.left.q)}</p>${can('content.read')?`<button class="admin-soft" data-duplicate-question="${index}|left">فتح السؤال</button>`:''}</div><div class="duplicate-side"><small>${escapeHtml(pair.right.id)}</small><p>${escapeHtml(pair.right.q)}</p>${can('content.read')?`<button class="admin-soft" data-duplicate-question="${index}|right">فتح السؤال</button>`:''}</div></div></article>`).join(''):'<div class="empty-state">لا توجد أزواج تستدعي المراجعة وفق العتبة الحالية.</div>';container._duplicateRows=rows;}
async function openDuplicate(index,side){const rows=document.getElementById('duplicateList')._duplicateRows||[],pair=rows[index],item=pair?.[side];if(pair&&item)await openReportedQuestion(pair.subjectId,item.id);}

async function loadAudit(){if(!can('audit.read'))return;const container=document.getElementById('auditList');container.innerHTML='<div class="empty-state">جارٍ تحميل سجل التدقيق…</div>';const data=await request('/api/admin/audit?limit=100');container.innerHTML=data.items?.length?data.items.map(item=>`<article class="audit-card"><header><strong>${escapeHtml(item.action)}</strong><small>${formatDate(item.created_at)}</small></header><div class="audit-meta"><span>${escapeHtml(item.entity_type)}</span><span>${escapeHtml(item.entity_id)}</span><span>${escapeHtml(item.admin_email||item.firebase_uid)}</span></div><p>${auditSummary(item)}</p></article>`).join(''):'<div class="empty-state">لا توجد إجراءات مسجلة بعد.</div>';}
function auditSummary(item){if(item.action==='question.update')return`تم تحديث السؤال. الحالة الجديدة: ${escapeHtml(STATUS_LABELS[item.after_state?.adminStatus]||item.after_state?.adminStatus||'منشور')}.`;if(item.action==='question.reset')return'تمت إعادة السؤال إلى النسخة الأصلية.';if(item.action==='report.update')return`تم تحديث حالة البلاغ إلى ${escapeHtml(REPORT_LABELS[item.after_state?.status]||item.after_state?.status||'')}.`;if(item.action==='user.access.update')return`تم تحديث صلاحية المستخدم إلى ${escapeHtml(item.after_state?.role||'student')} وحالة ${escapeHtml(item.after_state?.account_status||'active')}.`;return'تم تسجيل إجراء إداري على المنصة.';}

function installEvents(){
  document.addEventListener('click',event=>{const tab=event.target.closest('[data-admin-tab]');if(tab)activateTab(tab.dataset.adminTab);const edit=event.target.closest('[data-edit-question]');if(edit)openQuestion(currentQuestions[Number(edit.dataset.editQuestion)]);if(event.target.closest('[data-close-modal]'))closeQuestionModal();if(event.target.id==='resetQuestion')resetQuestion().catch(handleError);const save=event.target.closest('[data-save-report]');if(save)saveReport(save).catch(handleError);const reported=event.target.closest('[data-open-reported-question]');if(reported){const[subjectId,questionId]=reported.dataset.openReportedQuestion.split('|');openReportedQuestion(subjectId,questionId).catch(handleError);}const duplicate=event.target.closest('[data-duplicate-question]');if(duplicate){const[index,side]=duplicate.dataset.duplicateQuestion.split('|');openDuplicate(Number(index),side).catch(handleError);}if(event.target.closest('[data-refresh="dashboard"]'))loadDashboard().catch(handleError);});
  document.getElementById('questionForm').addEventListener('submit',event=>saveQuestion(event).catch(handleError));document.getElementById('optionEditor').addEventListener('input',()=>rebuildAnswerOptions(Number(document.getElementById('answerSelect').value)));document.getElementById('searchQuestions').addEventListener('click',()=>loadQuestions(1).catch(handleError));document.getElementById('questionSubject').addEventListener('change',()=>loadQuestions(1).catch(handleError));document.getElementById('questionStatus').addEventListener('change',()=>loadQuestions(1).catch(handleError));document.getElementById('questionSearch').addEventListener('input',()=>{clearTimeout(questionSearchTimer);questionSearchTimer=setTimeout(()=>loadQuestions(1).catch(handleError),350);});document.getElementById('reportStatus').addEventListener('change',()=>loadReports(1).catch(handleError));document.getElementById('refreshDuplicates').addEventListener('click',()=>loadDuplicates().catch(handleError));document.getElementById('refreshAudit').addEventListener('click',()=>loadAudit().catch(handleError));document.getElementById('questionModal').addEventListener('click',event=>{if(event.target.id==='questionModal')closeQuestionModal();});document.addEventListener('keydown',event=>{if(event.key==='Escape')closeQuestionModal();});
}
function handleError(error){console.error('NEON Admin:',error);showToast(error?.message||'تعذر تنفيذ العملية.','error');}

async function initialize(){
  populateSubjects();installEvents();
  try{
    session=await ensureAuth();renderAccount(session);
    adminAccess=await request('/api/admin/access');applyCapabilities();
    document.getElementById('adminBoot').hidden=true;document.getElementById('adminApp').hidden=false;
    await loadDashboard();
  }catch(error){
    if(error?.message==='Authentication required'||error?.code==='ACCOUNT_SUSPENDED')return;
    document.getElementById('adminBoot').hidden=true;document.getElementById('adminApp').hidden=true;document.getElementById('adminDenied').hidden=false;
    document.getElementById('adminDeniedMessage').textContent=error?.code==='ADMIN_REQUIRED'?'تم تسجيل الدخول بنجاح، لكن هذا الحساب لا يملك دورًا إداريًا في NEON.':error?.message||'تعذر التحقق من صلاحية الإدارة.';
  }
}
initialize();
