import './games-competition-system.css';
import { expandedGameQuestions } from './games-expansion-data.js';

const MASTERY_KEY = 'neonGamesMasteryV1';
const STATE_KEY = 'neonGamesCompetitionV2';
const CATEGORIES = ['cross','visual','hidden','lateral'];
const banks = Object.fromEntries(CATEGORIES.map(cat => [cat,expandedGameQuestions.filter(item => item.cat === cat)]));
const categoryMeta = {
  cross:{title:'شبكات الكلمات',icon:'▦'},
  visual:{title:'الذكاء البصري',icon:'◈'},
  hidden:{title:'الصور الخفية',icon:'◉'},
  lateral:{title:'التفكير الجانبي',icon:'⚡'}
};

let leaderboardData = null;
let leaderboardLoading = false;
let refreshTimer = null;
let state = loadState();

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
const readJson = (key,fallback={}) => { try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback; } catch { return fallback; } };
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));

function riyadhDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function weekKeyFromDay(dayKey) {
  const [y,m,d] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(y,m-1,d));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1-day;
  date.setUTCDate(date.getUTCDate()+diff);
  return date.toISOString().slice(0,10);
}

function monthKeyFromDay(dayKey) { return dayKey.slice(0,7); }
function todayKey() { return riyadhDateKey(); }
function currentWeekKey() { return weekKeyFromDay(todayKey()); }
function currentMonthKey() { return monthKeyFromDay(todayKey()); }

function loadState() {
  const value = readJson(STATE_KEY,{});
  value.version = 3;
  value.activity ??= [];
  value.claimed ??= {};
  value.outbox ??= [];
  value.synced ??= {};
  return value;
}

function saveState() {
  state.activity = state.activity.slice(-1000);
  state.outbox = state.outbox.slice(-250);
  localStorage.setItem(STATE_KEY,JSON.stringify(state));
}

function displayName() {
  const session = window.NEON_AUTH_SESSION;
  return session?.profile?.academy?.name || session?.profile?.name || session?.user?.displayName || session?.user?.email?.split('@')[0] || 'لاعب نيون';
}

function sessionReady() { return Boolean(window.NEON_AUTH_SESSION?.user?.getIdToken); }

async function api(path, options={}) {
  const user = window.NEON_AUTH_SESSION?.user;
  if (!user?.getIdToken) throw new Error('AUTH_SESSION_UNAVAILABLE');
  const token = await user.getIdToken();
  const response = await fetch(path,{
    ...options,
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})},
    cache:'no-store'
  });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw Object.assign(new Error(data.message || `HTTP_${response.status}`),{status:response.status});
  return data;
}

function enqueue(event) {
  if (state.synced[event.eventKey] || state.outbox.some(item => item.eventKey === event.eventKey)) return;
  state.outbox.push({...event,displayName:displayName()});
  saveState();
  flushOutbox().catch(()=>{});
}

async function flushOutbox() {
  if (!sessionReady() || !navigator.onLine || !state.outbox.length) return;
  const pending = [...state.outbox];
  const remaining = [];
  let changed = false;
  for (const event of pending) {
    try {
      await api('/api/competition/event',{method:'POST',body:JSON.stringify(event)});
      state.synced[event.eventKey] = Date.now();
      changed = true;
    } catch {
      remaining.push(event);
    }
  }
  state.outbox = remaining;
  if (changed) {
    saveState();
    refreshLeaderboard(true).catch(()=>{});
  }
}

async function waitForStars(cat,id) {
  for (let attempt=0; attempt<10; attempt++) {
    const mastery = readJson(MASTERY_KEY,{});
    const stars = Number(mastery.stars?.[cat]?.[id] || 0);
    if (stars) return Math.max(1,Math.min(3,stars));
    await delay(65);
  }
  return 1;
}

function activityMetrics(period,value) {
  const rows = state.activity.filter(item => item?.[period] === value);
  return {
    rows,
    stages:rows.length,
    stars:rows.reduce((sum,item)=>sum+Number(item.stars||0),0),
    perfect:rows.filter(item=>Number(item.stars)===3).length,
    category:cat=>rows.filter(item=>item.cat===cat).length
  };
}

function rotateCategory(day) {
  const n = day.replace(/-/g,'').split('').reduce((sum,char)=>sum+Number(char||0),0);
  return CATEGORIES[n % CATEGORIES.length];
}

function missionDefinitions() {
  const day=todayKey(), week=currentWeekKey(), month=currentMonthKey();
  const cat=rotateCategory(day), meta=categoryMeta[cat];
  return {
    daily:{key:day,label:'مهمات اليوم',icon:'☀️',missions:[
      {id:'daily-stages',title:'انطلاقة اليوم',desc:'أكمل 3 مراحل',target:3,reward:100,metric:m=>m.stages},
      {id:'daily-stars',title:'صائد النجوم',desc:'اجمع 7 نجوم',target:7,reward:100,metric:m=>m.stars},
      {id:'daily-category',title:`تخصص اليوم ${meta.icon}`,desc:`أكمل مرحلتين في ${meta.title}`,target:2,reward:100,metric:m=>m.category(cat)}
    ]},
    weekly:{key:week,label:'مهمات الأسبوع',icon:'🗓️',missions:[
      {id:'weekly-stages',title:'ماراثون نيون',desc:'أكمل 12 مرحلة',target:12,reward:250,metric:m=>m.stages},
      {id:'weekly-stars',title:'مخزون الطاقة',desc:'اجمع 27 نجمة',target:27,reward:250,metric:m=>m.stars},
      {id:'weekly-perfect',title:'إتقان بلا حدود',desc:'احصل على 5 مراحل بثلاث نجوم',target:5,reward:250,metric:m=>m.perfect}
    ]},
    season:{key:month,label:'مهمة الموسم',icon:'🌌',missions:[
      {id:'season-stages',title:'رحلة الموسم',desc:'أكمل 40 مرحلة خلال الشهر',target:40,reward:400,metric:m=>m.stages}
    ]}
  };
}

function claimKey(group,periodKey,missionId) { return `${group}:${periodKey}:${missionId}`; }
function isClaimed(group,periodKey,missionId) { return Boolean(state.claimed[claimKey(group,periodKey,missionId)]); }

function missionProgress(group,definition) {
  const metrics = activityMetrics(group==='daily'?'day':group==='weekly'?'week':'month',definition.key);
  return definition.missions.map(mission => ({...mission,current:Math.min(mission.target,mission.metric(metrics)),raw:mission.metric(metrics)}));
}

function claimMission(group,periodKey,mission) {
  const key = claimKey(group,periodKey,mission.id);
  if (state.claimed[key]) return;
  const definition = missionDefinitions()[group];
  const current = missionProgress(group,definition).find(item=>item.id===mission.id)?.raw || 0;
  if (current < mission.target) return;
  state.claimed[key] = {at:Date.now(),reward:mission.reward};
  saveState();
  enqueue({
    eventType:group==='daily'?'daily_mission':group==='weekly'?'weekly_mission':'season_mission',
    eventKey:`mission:${key}`,
    category:'missions',
    stars:0,
    metadata:{missionId:mission.id,period:periodKey}
  });
  toast(`+${mission.reward} نقطة تنافسية`,`تم استلام مكافأة «${mission.title}».`);
  render();
}

function stageContext() {
  const runner=document.getElementById('expansionRunner');
  if(!runner || runner.hidden) return null;
  const title=runner.querySelector('.expansion-runner-head span')?.textContent || '';
  const cat=CATEGORIES.find(key=>title.includes(categoryMeta[key].title));
  const text=runner.querySelector('.expansion-runner-head strong')?.textContent || '';
  const match=text.match(/المرحلة\s+(\d+)/);
  const index=match?Number(match[1])-1:-1;
  const q=cat&&index>=0?banks[cat]?.[index]:null;
  return q?{cat,index,q}:null;
}

async function recordGameplay(cat,id) {
  if(!CATEGORIES.includes(cat)) return;
  const now=new Date();
  const day=riyadhDateKey(now);
  if(state.activity.some(item=>item.id===id && item.day===day)) return;
  const stars=await waitForStars(cat,id);
  const week=weekKeyFromDay(day);
  const entry={id,cat,stars,at:now.toISOString(),day,week,month:monthKeyFromDay(day)};
  state.activity.push(entry);
  saveState();
  enqueue({eventType:'stage_complete',eventKey:`stage:${week}:${id}`,category:cat,stars,metadata:{stageId:id,week}});
  render();
}

function handleStageAnswer(event) {
  const answer=event.target.closest('[data-expansion-answer]');
  if(!answer) return false;
  const context=stageContext();
  if(!context) return false;
  if(Number(answer.dataset.expansionAnswer)!==Number(context.q.answer)) return false;
  setTimeout(()=>recordGameplay(context.cat,context.q.id).catch(()=>{}),90);
  return true;
}

function missionCard(group,definition) {
  const progress=missionProgress(group,definition);
  return `<article class="quest-panel quest-${group}">
    <div class="quest-head"><div><span>${definition.icon}</span><div><small>${group.toUpperCase()} QUESTS</small><strong>${definition.label}</strong></div></div><em>${definition.key}</em></div>
    <div class="quest-list">${progress.map(mission=>{
      const pct=Math.min(100,Math.round((mission.current/mission.target)*100));
      const claimed=isClaimed(group,definition.key,mission.id);
      const ready=mission.raw>=mission.target;
      return `<div class="quest-item ${ready?'ready':''} ${claimed?'claimed':''}">
        <div class="quest-copy"><strong>${esc(mission.title)}</strong><small>${esc(mission.desc)}</small></div>
        <div class="quest-progress"><i><b style="width:${pct}%"></b></i><span>${mission.current}/${mission.target}</span></div>
        <button data-quest-claim="${group}" data-period="${definition.key}" data-mission="${mission.id}" ${!ready||claimed?'disabled':''}>${claimed?'✓ مستلمة':ready?`استلم +${mission.reward}`:`+${mission.reward}`}</button>
      </div>`;
    }).join('')}</div>
  </article>`;
}

function leaderboardRows(rows=[]) {
  if (!rows.length) return `<div class="leaderboard-empty"><span>🏁</span><strong>المنافسة تبدأ الآن</strong><small>سيظهر ترتيب اللاعبين بعد تسجيل أول نقاط لهذا الأسبوع.</small></div>`;
  return rows.map(row=>`<div class="leader-row ${row.isYou?'is-you':''}"><b class="leader-rank">${row.rank<=3?['🥇','🥈','🥉'][row.rank-1]:`#${row.rank}`}</b><span class="leader-avatar">${esc((row.name||'ن').trim().charAt(0).toUpperCase()||'ن')}</span><div><strong>${esc(row.name)}${row.isYou?' <em>أنت</em>':''}</strong><small>${row.stages} مرحلة • ${row.stars} نجمة</small></div><b class="leader-points">${row.points}<small>PTS</small></b></div>`).join('');
}

function formatRemaining(end) {
  if (!end) return 'ينتهي نهاية الأسبوع';
  const diff=Math.max(0,new Date(end).getTime()-Date.now());
  const days=Math.floor(diff/86400000), hours=Math.floor((diff%86400000)/3600000), mins=Math.floor((diff%3600000)/60000);
  return days?`${days} يوم و ${hours} ساعة`:hours?`${hours} ساعة و ${mins} دقيقة`:`${mins} دقيقة`;
}

function tournamentHtml() {
  const weekly=leaderboardData?.weekly;
  const you=weekly?.you;
  return `<article class="weekly-tournament">
    <div class="tournament-glow"></div>
    <div class="tournament-head"><div><span>🏆 WEEKLY TOURNAMENT</span><h4>كأس نيون الأسبوعي</h4><p>كل مرحلة متقنة تضيف نقاطًا. الترتيب يعاد من الصفر كل يوم اثنين بتوقيت الرياض.</p></div><div class="tournament-countdown"><small>الوقت المتبقي</small><strong data-tournament-countdown>${formatRemaining(weekly?.end)}</strong></div></div>
    <div class="tournament-scorecards"><article><small>ترتيبك</small><strong>${you?`#${you.rank}`:'—'}</strong></article><article><small>نقاط الأسبوع</small><strong>${you?.points||0}</strong></article><article><small>نجوم الأسبوع</small><strong>${you?.stars||0}</strong></article><article><small>مراحل محتسبة</small><strong>${you?.stages||0}</strong></article></div>
    <div class="tournament-rewards"><span>🥇 المركز 1 <b>تاج الأسبوع</b></span><span>🥈 المركز 2 <b>شارة النخبة</b></span><span>🥉 المركز 3 <b>شارة المنافس</b></span></div>
  </article>`;
}

function competitionHubHtml() {
  const defs=missionDefinitions();
  const weeklyRows=leaderboardData?.weekly?.top||[];
  const seasonRows=leaderboardData?.season?.top||[];
  return `<section class="competition-hub" id="gamesCompetitionHub">
    <div class="competition-titlebar"><div><span class="competition-kicker">NEON LIVE COMPETITION</span><h3>المهمات والمنافسات</h3><p>تحديات تتجدد، نقاط تنافسية حقيقية، وبطولة أسبوعية بين حسابات NEON.</p></div><div class="competition-live"><i></i><span>${leaderboardLoading?'مزامنة…':'LIVE'}</span></div></div>
    <div class="quest-grid">${missionCard('daily',defs.daily)}${missionCard('weekly',defs.weekly)}${missionCard('season',defs.season)}</div>
    ${tournamentHtml()}
    <div class="leaderboard-grid">
      <article class="leaderboard-panel"><div class="leaderboard-head"><div><span>⚡ WEEKLY RANKING</span><h4>صدارة الأسبوع</h4></div><button data-leaderboard-refresh aria-label="تحديث الترتيب">↻</button></div><div class="leaderboard-list">${leaderboardRows(weeklyRows)}</div></article>
      <article class="leaderboard-panel season-board"><div class="leaderboard-head"><div><span>🌌 SEASON RANKING</span><h4>صدارة الموسم</h4></div><em>${currentMonthKey()}</em></div><div class="leaderboard-list">${leaderboardRows(seasonRows)}</div></article>
    </div>
    <div class="competition-scoring"><span>★★★ = <b>100</b> نقطة</span><span>★★☆ = <b>80</b></span><span>★☆☆ = <b>60</b></span><span>مهمة يومية = <b>100</b></span><span>أسبوعية = <b>250</b></span><span>موسمية = <b>400</b></span></div>
  </section>`;
}

function fragment(html) { const template=document.createElement('template');template.innerHTML=html.trim();return template.content.firstElementChild; }

function render() {
  const mastery=document.getElementById('gamesMasteryHub');
  const expansion=document.getElementById('expandedChallenges');
  const anchor=mastery||expansion;
  if (!anchor) return;
  const node=fragment(competitionHubHtml());
  const old=document.getElementById('gamesCompetitionHub');
  if (old) old.replaceWith(node); else anchor.insertAdjacentElement('afterend',node);
}

function toast(title,desc='') {
  let host=document.getElementById('competitionToastHost');
  if(!host){host=document.createElement('div');host.id='competitionToastHost';host.className='competition-toast-host';document.body.appendChild(host);}
  const node=document.createElement('div');node.className='competition-toast';node.innerHTML=`<strong>${esc(title)}</strong>${desc?`<small>${esc(desc)}</small>`:''}`;host.appendChild(node);
  requestAnimationFrame(()=>node.classList.add('show'));
  setTimeout(()=>{node.classList.remove('show');setTimeout(()=>node.remove(),240);},3800);
}

async function refreshLeaderboard(force=false) {
  if (leaderboardLoading && !force) return;
  if (!sessionReady()) return;
  leaderboardLoading=true; render();
  try { leaderboardData=await api('/api/competition/leaderboard'); }
  catch { if (!leaderboardData) leaderboardData={weekly:{top:[],you:null},season:{top:[],you:null},offline:true}; }
  finally { leaderboardLoading=false; render(); }
}

function registerPresence() {
  enqueue({eventType:'presence',eventKey:`presence:${todayKey()}`,category:'session',stars:0,metadata:{page:'games'}});
}

function handleClick(event) {
  handleStageAnswer(event);
  const claim=event.target.closest('[data-quest-claim]');
  if (claim) {
    const group=claim.dataset.questClaim, period=claim.dataset.period, id=claim.dataset.mission;
    const definition=missionDefinitions()[group];
    const mission=definition?.missions.find(item=>item.id===id);
    if (mission && definition.key===period) claimMission(group,period,mission);
    return;
  }
  if (event.target.closest('[data-leaderboard-refresh]')) refreshLeaderboard(true).catch(()=>{});
}

function startCountdown() {
  clearInterval(refreshTimer);
  refreshTimer=setInterval(()=>{
    const node=document.querySelector('[data-tournament-countdown]');
    if(node) node.textContent=formatRemaining(leaderboardData?.weekly?.end);
  },60000);
}

function onAuth() {
  registerPresence();
  flushOutbox().catch(()=>{});
  refreshLeaderboard(true).catch(()=>{});
}

function init() {
  render();
  startCountdown();
  if(sessionReady()) onAuth();
  else window.addEventListener('neon-auth-session',onAuth,{once:true});
  const observer=new MutationObserver(()=>{if(!document.getElementById('gamesCompetitionHub')) render();});
  observer.observe(document.body,{childList:true,subtree:true});
}

document.addEventListener('click',handleClick);
window.addEventListener('online',()=>{flushOutbox().catch(()=>{});refreshLeaderboard(true).catch(()=>{});});
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
