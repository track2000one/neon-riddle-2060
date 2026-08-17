import './auth-page.css';
import { firebaseConfig, SITE_ANALYTICS_ID } from './firebase-config.js';
import { claimLocalStateOwner, canMigrateLegacyProfile } from './account-local-state.js';

const FIREBASE_VERSION = '12.16.0';
const PROFILE_KEY = 'neonRiddleGrandProfilesV4';
const SETTINGS_KEY = 'neonRiddleGrandSettingsV4';
const RESET_COOLDOWN_SECONDS = 45;
const PASSWORD_RESET_API_URL = 'https://neon-riddle-2060-backend-production.up.railway.app/api/auth/password-reset';
const RESET_API_TIMEOUT_MS = 16_000;

const $ = selector => document.querySelector(selector);
const tabs = [...document.querySelectorAll('.auth-tab')];
const forms = [...document.querySelectorAll('.auth-form')];
const signedInPanel = $('#signedInPanel');
const signedInText = $('#signedInText');
const continueLink = $('#continueLink');
const blockedBanner = $('#blockedBanner');
const loginForm = $('#loginForm');
const registerForm = $('#registerForm');
const resetForm = $('#resetForm');
const loginButton = $('#loginButton');
const registerButton = $('#registerButton');
const resetButton = $('#resetButton');
const loginMessage = $('#loginMessage');
const registerMessage = $('#registerMessage');
const resetMessage = $('#resetMessage');
const registerPassword = $('#registerPassword');
const resetEmailInput = $('#resetEmail');
const passwordMeterBar = $('#passwordMeterBar');
const passwordStrengthText = $('#passwordStrengthText');
const toast = $('#toast');
let toastTimer;
let resetCooldownTimer;

window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
window.gtag('js', new Date());
window.gtag('config', SITE_ANALYTICS_ID, { send_page_view:true, page_title:'NEON Academy Account', transport_type:'beacon' });
const track = (eventName, parameters={}) => window.gtag?.('event', eventName, { app_name:'neon_academy_account', ...parameters });

function runtimeImport(url){ return import(/* @vite-ignore */ url); }
function readJson(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function clone(value){ try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); } }

function safeDestination(){
  const raw = new URLSearchParams(location.search).get('next');
  if (!raw) return '/';
  try {
    const decoded = decodeURIComponent(raw);
    const destination = new URL(decoded, location.origin);
    if (destination.origin !== location.origin) return '/';
    const path = destination.pathname.replace(/\/{2,}/g, '/');
    const forbidden = new Set(['/auth','/auth.html','/legacy','/legacy/','/legacy/index.html','/legacy/auth.html']);
    if (forbidden.has(path)) return '/';
    return `${path}${destination.search}${destination.hash}` || '/';
  } catch { return '/'; }
}

function toEnglishDigits(value){
  const ar='٠١٢٣٤٥٦٧٨٩', fa='۰۱۲۳۴۵۶۷۸۹';
  return String(value||'').replace(/[٠-٩]/g,d=>String(ar.indexOf(d))).replace(/[۰-۹]/g,d=>String(fa.indexOf(d)));
}
function normalizePhone(value){
  let phone=toEnglishDigits(value).trim().replace(/[\s().-]/g,'');
  if(!phone) return '';
  if(phone.startsWith('00966')) phone=`+${phone.slice(2)}`;
  else if(phone.startsWith('966')) phone=`+${phone}`;
  else if(/^05\d{8}$/.test(phone)) phone=`+966${phone.slice(1)}`;
  else if(/^5\d{8}$/.test(phone)) phone=`+966${phone}`;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

function seedProfile(user, phone=''){
  const profiles=readJson(PROFILE_KEY,{});
  const settings=readJson(SETTINGS_KEY,{});
  const previous=settings.activeId && profiles[settings.activeId] ? profiles[settings.activeId] : null;
  const displayName=user.displayName?.trim() || user.email?.split('@')[0] || 'الطالب';
  if(!profiles[user.uid]){
    profiles[user.uid]=canMigrateLegacyProfile(previous) ? clone(previous) : {
      id:user.uid,name:displayName,score:0,coins:180,levels:{},stats:{answered:0,correct:0,hintsUsed:0},theme:'academic',avatar:'🧠'
    };
  }
  const profile=profiles[user.uid];
  profile.id=user.uid; profile.firebaseUid=user.uid; profile.email=user.email||'';
  profile.name=profile.name && profile.name!=='طالب جديد' ? profile.name : displayName;
  profile.academy ??={}; profile.academy.name=profile.academy.name && profile.academy.name!=='طالب جديد' ? profile.academy.name : displayName;
  profile.academy.email=user.email||''; profile.lastAuthenticatedAt=new Date().toISOString();
  if(phone){ profile.phone=phone; profile.phoneVerified=Boolean(user.phoneNumber===phone); profile.phoneUpdatedAt=new Date().toISOString(); profile.academy.phone=phone; profile.academy.phoneVerified=profile.phoneVerified; }
  settings.activeId=user.uid;
  localStorage.setItem(PROFILE_KEY,JSON.stringify(profiles)); localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));
  return profile;
}

async function registerPlatformAccess(user){
  const token=await user.getIdToken();
  const response=await fetch('/api/access/session',{method:'POST',cache:'no-store',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});
  const data=await response.json().catch(()=>({}));
  if(response.status===403 && data.error==='ACCOUNT_SUSPENDED') throw Object.assign(new Error(data.message||'تم إيقاف الوصول إلى المنصة لهذا الحساب.'),{code:'ACCOUNT_SUSPENDED'});
  if(!response.ok){
    if(response.status>=500) return {role:'student',status:'active',configured:false,degraded:true};
    throw Object.assign(new Error(data.message||`HTTP_${response.status}`),{code:data.error||'ACCESS_CHECK_FAILED'});
  }
  return data.access||{role:'student',status:'active',configured:false};
}

async function activateUser(user, phone=''){
  const access=await registerPlatformAccess(user);
  if(access.status==='suspended') throw Object.assign(new Error('تم إيقاف الوصول إلى المنصة لهذا الحساب.'),{code:'ACCOUNT_SUSPENDED'});
  claimLocalStateOwner(localStorage,user.uid);
  seedProfile(user,phone);
  return access;
}

function switchView(view){
  signedInPanel.classList.add('hidden');
  tabs.forEach(tab=>tab.classList.toggle('active',tab.dataset.view===view));
  forms.forEach(form=>form.classList.toggle('active-form',form.dataset.form===view));
  [loginMessage,registerMessage,resetMessage].forEach(el=>{el.textContent='';el.classList.remove('success');});
  if(view==='reset'){
    resetEmailInput.value ||= $('#loginEmail')?.value.trim() || $('#registerEmail')?.value.trim() || '';
    setTimeout(()=>resetEmailInput.focus(),80);
  }
  history.replaceState(null,'',`${location.pathname}${location.search}${view==='login'?'':`#${view}`}`);
}
function setBusy(button,busy,busyText,defaultText){ button.disabled=busy; const span=button.querySelector('span'); if(span) span.textContent=busy?busyText:defaultText; }
function showMessage(el,text,success=false){ el.textContent=text; el.classList.toggle('success',success); }
function showToast(text){ toast.textContent=text; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),2300); }
function showBlocked(text){ blockedBanner.textContent=text; blockedBanner.classList.remove('hidden'); }

function friendlyError(error){
  const messages={
    'auth/email-already-in-use':'يوجد حساب مسجل بهذا البريد بالفعل.','auth/invalid-email':'صيغة البريد الإلكتروني غير صحيحة.','auth/weak-password':'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.','auth/invalid-credential':'البريد الإلكتروني أو كلمة المرور غير صحيحة.','auth/user-disabled':'تم تعطيل هذا الحساب.','auth/too-many-requests':'تم إيقاف المحاولات مؤقتًا بسبب كثرتها. حاول لاحقًا.','auth/network-request-failed':'تعذر الاتصال بالخدمة. تحقق من الإنترنت.','auth/missing-password':'اكتب كلمة المرور.','ACCOUNT_SUSPENDED':'تم إيقاف الوصول إلى منصة NEON لهذا الحساب.','PASSWORD_RESET_RATE_LIMITED':'تم تجاوز عدد طلبات الاستعادة مؤقتًا. حاول بعد عدة دقائق.','EMAIL_DELIVERY_FAILED':'تعذر إرسال رسالة الاستعادة حاليًا.'
  };
  return messages[error?.code]||error?.message||'تعذر تنفيذ العملية. تحقق من البيانات وحاول مرة أخرى.';
}
function passwordStrength(value){ let score=0;if(value.length>=8)score++;if(value.length>=12)score++;if(/[A-Zء-ي]/.test(value))score++;if(/\d/.test(value))score++;if(/[^A-Za-z0-9ء-ي]/.test(value))score++;return Math.min(4,score); }
function updatePasswordMeter(){ const states=[['0%','#ff768a','استخدم 8 أحرف على الأقل، ويفضل أرقامًا ورموزًا.'],['25%','#ff768a','ضعيفة'],['50%','#ffd46d','متوسطة'],['75%','#64eaff','جيدة'],['100%','#62f0a7','قوية']];const [width,color,text]=states[passwordStrength(registerPassword.value)];passwordMeterBar.style.width=width;passwordMeterBar.style.background=color;passwordStrengthText.textContent=text; }

async function customPasswordReset(email){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),RESET_API_TIMEOUT_MS);
  try{
    const response=await fetch(PASSWORD_RESET_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,language:'ar'}),signal:controller.signal});
    let payload={};try{payload=await response.json();}catch{}
    if(response.ok) return true;
    if(payload.code==='EMAIL_SERVICE_NOT_CONFIGURED') return false;
    const error=new Error(payload.message||'Password reset delivery failed.');error.code=payload.code||'EMAIL_DELIVERY_FAILED';throw error;
  }catch(error){ if(error?.name==='AbortError'||error instanceof TypeError)return false;throw error; }finally{clearTimeout(timer);}
}
function beginResetCooldown(){ clearInterval(resetCooldownTimer);let seconds=RESET_COOLDOWN_SECONDS;resetButton.disabled=true;const render=()=>{const span=resetButton.querySelector('span');if(span)span.textContent=`إعادة الإرسال بعد ${seconds} ثانية`;};render();resetCooldownTimer=setInterval(()=>{seconds--;if(seconds<=0){clearInterval(resetCooldownTimer);resetButton.disabled=false;resetButton.querySelector('span').textContent='إرسال الرابط مرة أخرى';return;}render();},1000); }

const [{initializeApp,getApp,getApps},{getAuth,setPersistence,browserLocalPersistence,browserSessionPersistence,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendPasswordResetEmail,sendEmailVerification,updateProfile,onAuthStateChanged,signOut}] = await Promise.all([
  runtimeImport(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
  runtimeImport(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`)
]);
const app=getApps().length?getApp():initializeApp(firebaseConfig);const auth=getAuth(app);auth.languageCode='ar';

async function finishAuth(user, phone=''){
  try{
    await activateUser(user,phone);
    showToast('تم تسجيل الدخول بنجاح');
    setTimeout(()=>location.replace(safeDestination()),450);
  }catch(error){
    if(error?.code==='ACCOUNT_SUSPENDED'){ await signOut(auth).catch(()=>{});showBlocked(friendlyError(error)); }
    throw error;
  }
}

tabs.forEach(tab=>tab.addEventListener('click',()=>switchView(tab.dataset.view)));
document.querySelectorAll('[data-switch]').forEach(button=>button.addEventListener('click',()=>switchView(button.dataset.switch)));
document.querySelectorAll('[data-toggle-password]').forEach(button=>button.addEventListener('click',()=>{const input=document.getElementById(button.dataset.togglePassword);const visible=input.type==='text';input.type=visible?'password':'text';button.textContent=visible?'◉':'◌';}));
registerPassword.addEventListener('input',updatePasswordMeter);

loginForm.addEventListener('submit',async event=>{
  event.preventDefault();showMessage(loginMessage,'');setBusy(loginButton,true,'جارٍ تسجيل الدخول...','تسجيل الدخول');
  try{
    await setPersistence(auth,$('#rememberLogin').checked?browserLocalPersistence:browserSessionPersistence);
    const credential=await signInWithEmailAndPassword(auth,$('#loginEmail').value.trim(),$('#loginPassword').value);
    await finishAuth(credential.user);track('student_login_success');
  }catch(error){ if(error?.code!=='ACCOUNT_SUSPENDED')showMessage(loginMessage,friendlyError(error));setBusy(loginButton,false,'','تسجيل الدخول');track('student_login_failed',{error_code:error?.code||'unknown'}); }
});

registerForm.addEventListener('submit',async event=>{
  event.preventDefault();showMessage(registerMessage,'');
  const name=$('#registerName').value.trim().replace(/\s+/g,' '),email=$('#registerEmail').value.trim(),password=registerPassword.value,confirmation=$('#registerConfirm').value,accepted=$('#registerTerms').checked,phone=normalizePhone($('#registerPhone').value);
  if(name.length<2)return showMessage(registerMessage,'اكتب اسمًا صحيحًا من حرفين على الأقل.');if(phone===null)return showMessage(registerMessage,'صيغة رقم الجوال غير صحيحة. استخدم 05XXXXXXXX أو +9665XXXXXXXX.');if(password.length<8)return showMessage(registerMessage,'كلمة المرور يجب أن تكون 8 أحرف على الأقل.');if(password!==confirmation)return showMessage(registerMessage,'كلمتا المرور غير متطابقتين.');if(!accepted)return showMessage(registerMessage,'يجب الموافقة على استخدام الحساب للتعلم وحفظ الجلسة.');
  setBusy(registerButton,true,'جارٍ إنشاء الحساب...','إنشاء الحساب');
  try{
    await setPersistence(auth,browserLocalPersistence);const credential=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(credential.user,{displayName:name});try{await sendEmailVerification(credential.user);}catch{}
    await finishAuth(credential.user,phone||'');track('student_account_created');
  }catch(error){ if(error?.code!=='ACCOUNT_SUSPENDED')showMessage(registerMessage,friendlyError(error));setBusy(registerButton,false,'','إنشاء الحساب');track('student_registration_failed',{error_code:error?.code||'unknown'}); }
});

resetForm.addEventListener('submit',async event=>{
  event.preventDefault();showMessage(resetMessage,'');const email=resetEmailInput.value.trim().toLowerCase();resetEmailInput.value=email;if(!email)return showMessage(resetMessage,'اكتب البريد الإلكتروني المسجل بالحساب.');setBusy(resetButton,true,'جارٍ إرسال الرابط...','إرسال رابط الاستعادة');
  try{
    const customSent=await customPasswordReset(email);if(!customSent){try{await sendPasswordResetEmail(auth,email,{url:new URL('/auth#login',location.origin).href,handleCodeInApp:false});}catch(error){if(['auth/unauthorized-continue-uri','auth/invalid-continue-uri'].includes(error?.code))await sendPasswordResetEmail(auth,email);else throw error;}}
    showMessage(resetMessage,'تم إرسال رابط استعادة كلمة المرور. تحقق من بريدك.',true);track('password_reset_requested');beginResetCooldown();
  }catch(error){showMessage(resetMessage,friendlyError(error));setBusy(resetButton,false,'','إرسال رابط الاستعادة');track('password_reset_failed',{error_code:error?.code||'unknown'});}
});

$('#signedOutButton').addEventListener('click',async()=>{await signOut(auth);location.replace('/auth');});
continueLink.href=safeDestination();

onAuthStateChanged(auth,async user=>{
  if(!user)return;
  try{
    await activateUser(user);
    forms.forEach(form=>form.classList.remove('active-form'));tabs.forEach(tab=>tab.classList.remove('active'));signedInPanel.classList.remove('hidden');signedInText.textContent=user.displayName?`${user.displayName} — ${user.email||''}`:(user.email||'الحساب الحالي');
  }catch(error){if(error?.code==='ACCOUNT_SUSPENDED'){await signOut(auth).catch(()=>{});showBlocked(friendlyError(error));}}
});

const requestedHash=location.hash.replace('#','');if(['register','reset'].includes(requestedHash))switchView(requestedHash);if(new URLSearchParams(location.search).get('blocked')==='1')showBlocked('تم إيقاف الوصول إلى خدمات NEON لهذا الحساب. إذا كنت تعتقد أن ذلك بالخطأ فتواصل مع إدارة المنصة.');
