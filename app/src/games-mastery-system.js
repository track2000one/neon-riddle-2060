import './games-mastery-system.css';
import { expandedGameQuestions } from './games-expansion-data.js';

const PROGRESS_KEY = 'neonGamesExpansionProgressV1';
const MASTERY_KEY = 'neonGamesMasteryV1';
const CATEGORIES = ['cross','visual','hidden','lateral'];
const banks = Object.fromEntries(CATEGORIES.map(cat => [cat, expandedGameQuestions.filter(q => q.cat === cat)]));
const categoryMeta = {
  cross:{title:'شبكات الكلمات',icon:'▦'},
  visual:{title:'الذكاء البصري',icon:'◈'},
  hidden:{title:'الصور الخفية',icon:'◉'},
  lateral:{title:'التفكير الجانبي',icon:'⚡'}
};
const tiers = [
  {id:'easy',title:'سهل',icon:'🌱'},
  {id:'medium',title:'متوسط',icon:'⚡'},
  {id:'hard',title:'صعب',icon:'🔥'},
  {id:'expert',title:'خبير',icon:'💎'},
  {id:'legendary',title:'أسطوري',icon:'👑'}
];
const achievements = [
  {id:'first',icon:'⭐',title:'الانطلاقة',desc:'إتقان أول مرحلة'},
  {id:'streak5',icon:'🔥',title:'سلسلة نارية',desc:'5 إجابات صحيحة متتالية'},
  {id:'stars50',icon:'🌟',title:'جامع النجوم',desc:'جمع 50 نجمة'},
  {id:'cross10',icon:'▦',title:'مهندس الكلمات',desc:'إكمال 10 شبكات كلمات'},
  {id:'visual10',icon:'◈',title:'عين نيون',desc:'إكمال 10 مراحل بصرية'},
  {id:'hidden10',icon:'◉',title:'كاشف الأسرار',desc:'إكمال 10 صور خفية'},
  {id:'lateral10',icon:'⚡',title:'خارج الصندوق',desc:'إكمال 10 ألغاز جانبية'},
  {id:'perfect20',icon:'💠',title:'إتقان مثالي',desc:'20 مرحلة بثلاث نجوم'},
  {id:'legendary',icon:'👑',title:'بوابة الأساطير',desc:'فتح المستوى الأسطوري'}
];

let activeCategory = null;
let attempt = {id:null,wrong:0,assist:0};
let mastery = loadMastery();

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);

function readJson(key, fallback={}) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function loadMastery() {
  const value = readJson(MASTERY_KEY, {});
  value.version = 1;
  value.stars ??= {};
  value.currentStreak ??= 0;
  value.bestStreak ??= 0;
  value.badges ??= [];
  value.migratedLegacy ??= false;
  CATEGORIES.forEach(cat => value.stars[cat] ??= {});
  return value;
}

function saveMastery() {
  localStorage.setItem(MASTERY_KEY, JSON.stringify(mastery));
}

function legacyProgress() {
  const value = readJson(PROGRESS_KEY, {});
  value.completed ??= {};
  return value;
}

function migrateLegacyProgress() {
  if (mastery.migratedLegacy) return;
  const legacy = legacyProgress();
  CATEGORIES.forEach(cat => {
    for (const id of legacy.completed?.[cat] || []) {
      if (!mastery.stars[cat][id]) mastery.stars[cat][id] = 2;
    }
  });
  mastery.migratedLegacy = true;
  updateBadges(false);
  saveMastery();
}

function tierRanges(total) {
  const base = Math.floor(total / 5);
  let extra = total % 5;
  let cursor = 0;
  return tiers.map((tier, index) => {
    const size = base + (extra-- > 0 ? 1 : 0);
    const range = {...tier,index,start:cursor,end:cursor + size - 1,size};
    cursor += size;
    return range;
  });
}

function tierForIndex(cat, stageIndex) {
  return tierRanges(banks[cat].length).find(range => stageIndex >= range.start && stageIndex <= range.end) || tierRanges(banks[cat].length)[0];
}

function completedIds(cat) {
  return new Set(legacyProgress().completed?.[cat] || []);
}

function unlockedTierIndex(cat) {
  const done = completedIds(cat);
  const ranges = tierRanges(banks[cat].length);
  let unlocked = 0;
  const highestCompleted = banks[cat].reduce((max,q,i) => done.has(q.id) ? Math.max(max,i) : max, -1);
  if (highestCompleted >= 0) unlocked = Math.max(unlocked, tierForIndex(cat, highestCompleted).index);
  for (let i=1;i<ranges.length;i++) {
    const previous = ranges[i-1];
    const completeInPrevious = banks[cat].slice(previous.start, previous.end+1).filter(q => done.has(q.id)).length;
    const required = Math.max(1, Math.ceil(previous.size * .7));
    if (completeInPrevious >= required) unlocked = Math.max(unlocked,i);
    else if (highestCompleted < ranges[i].start) break;
  }
  return Math.min(4, unlocked);
}

function starValue(cat,id) { return Number(mastery.stars?.[cat]?.[id] || 0); }
function totalStars() { return CATEGORIES.reduce((sum,cat) => sum + Object.values(mastery.stars[cat] || {}).reduce((a,b)=>a+Number(b||0),0),0); }
function perfectCount() { return CATEGORIES.reduce((sum,cat) => sum + Object.values(mastery.stars[cat] || {}).filter(v => Number(v)===3).length,0); }
function masteredCount(cat) { return Object.keys(mastery.stars[cat] || {}).length; }
function totalMastered() { return CATEGORIES.reduce((sum,cat)=>sum+masteredCount(cat),0); }
function xp() {
  return CATEGORIES.reduce((sum,cat) => sum + Object.values(mastery.stars[cat] || {}).reduce((subtotal,stars)=>subtotal + ({1:50,2:80,3:120}[Number(stars)] || 0),0),0);
}
function rankInfo() {
  const ratio = totalStars() / (expandedGameQuestions.length * 3);
  if (ratio >= .82) return tiers[4];
  if (ratio >= .60) return tiers[3];
  if (ratio >= .35) return tiers[2];
  if (ratio >= .15) return tiers[1];
  return tiers[0];
}

function badgeConditions() {
  return {
    first: totalMastered() >= 1,
    streak5: mastery.bestStreak >= 5,
    stars50: totalStars() >= 50,
    cross10: completedIds('cross').size >= 10,
    visual10: completedIds('visual').size >= 10,
    hidden10: completedIds('hidden').size >= 10,
    lateral10: completedIds('lateral').size >= 10,
    perfect20: perfectCount() >= 20,
    legendary: CATEGORIES.some(cat => unlockedTierIndex(cat) >= 4)
  };
}

function updateBadges(showToast=true) {
  const conditions = badgeConditions();
  for (const badge of achievements) {
    if (conditions[badge.id] && !mastery.badges.includes(badge.id)) {
      mastery.badges.push(badge.id);
      if (showToast) toast(`${badge.icon} إنجاز جديد: ${badge.title}`, badge.desc);
    }
  }
}

function stageContext() {
  const runner = document.getElementById('expansionRunner');
  if (!runner || runner.hidden) return null;
  let cat = activeCategory;
  if (!cat) {
    const title = runner.querySelector('.expansion-runner-head span')?.textContent || '';
    cat = CATEGORIES.find(key => title.includes(categoryMeta[key].title)) || null;
  }
  const text = runner.querySelector('.expansion-runner-head strong')?.textContent || '';
  const match = text.match(/المرحلة\s+(\d+)/);
  const stageIndex = match ? Number(match[1]) - 1 : -1;
  if (!cat || stageIndex < 0 || !banks[cat]?.[stageIndex]) return null;
  return {cat,stageIndex,q:banks[cat][stageIndex],tier:tierForIndex(cat,stageIndex)};
}

function syncAttempt() {
  const context = stageContext();
  if (!context) return;
  if (attempt.id !== context.q.id) attempt = {id:context.q.id,wrong:0,assist:0};
}

function starsForAttempt() {
  if (attempt.wrong === 0 && attempt.assist === 0) return 3;
  if (attempt.wrong <= 1 && attempt.assist <= 1) return 2;
  return 1;
}

function awardIfNew(context) {
  if (!context) return;
  const completed = completedIds(context.cat).has(context.q.id);
  if (!completed || starValue(context.cat,context.q.id)) return;
  const stars = starsForAttempt();
  mastery.stars[context.cat][context.q.id] = stars;
  mastery.currentStreak = attempt.wrong ? 0 : mastery.currentStreak + 1;
  mastery.bestStreak = Math.max(mastery.bestStreak, mastery.currentStreak);
  updateBadges(true);
  saveMastery();
  toast(`${'★'.repeat(stars)}${'☆'.repeat(3-stars)} ${stars} نجوم`, stars===3?'إتقان مثالي من أول محاولة.':stars===2?'أداء قوي مع مساعدة بسيطة.':'تم اجتياز المرحلة؛ أعدها لاحقًا لرفع التقييم.');
  renderMastery();
  decorateRunner();
}

function registerWrong() {
  syncAttempt();
  attempt.wrong += 1;
  mastery.currentStreak = 0;
  saveMastery();
  renderMastery();
}

function registerAssist() {
  syncAttempt();
  attempt.assist += 1;
}

function tierProgress(cat, range) {
  const done = completedIds(cat);
  const questions = banks[cat].slice(range.start, range.end+1);
  const completed = questions.filter(q => done.has(q.id)).length;
  const required = Math.max(1,Math.ceil(range.size*.7));
  const stars = questions.reduce((sum,q)=>sum+starValue(cat,q.id),0);
  return {completed,required,stars,maxStars:questions.length*3};
}

function masteryDashboardHtml() {
  const rank = rankInfo();
  const stars = totalStars();
  const maxStars = expandedGameQuestions.length * 3;
  const xpValue = xp();
  const level = Math.floor(xpValue / 500) + 1;
  const levelProgress = xpValue % 500;
  return `
    <section class="mastery-hub" id="gamesMasteryHub">
      <div class="mastery-overview">
        <div class="mastery-rank-orb"><span>${rank.icon}</span><small>رتبتك</small><strong>${rank.title}</strong></div>
        <div class="mastery-copy"><span class="mastery-kicker">NEON MASTERY SYSTEM</span><h3>مسار الإتقان</h3><p>أتقن المراحل، اجمع النجوم، حافظ على سلسلة انتصاراتك وافتح مستوى الأساطير.</p></div>
        <div class="mastery-stats">
          <article><span>⭐</span><strong>${stars}</strong><small>من ${maxStars} نجمة</small></article>
          <article><span>🔥</span><strong>${mastery.currentStreak}</strong><small>السلسلة الحالية</small></article>
          <article><span>🏆</span><strong>${mastery.badges.length}</strong><small>إنجازات</small></article>
          <article><span>⚡</span><strong>${xpValue}</strong><small>XP • مستوى ${level}</small></article>
        </div>
      </div>
      <div class="mastery-xp"><div><span>تقدم المستوى ${level}</span><b>${levelProgress} / 500 XP</b></div><i><b style="width:${Math.round(levelProgress/5)}%"></b></i></div>
      <div class="mastery-category-roadmaps">
        ${CATEGORIES.map(cat => roadmapHtml(cat)).join('')}
      </div>
      <div class="mastery-achievements">
        <div class="mastery-subhead"><div><span>ACHIEVEMENTS</span><h4>شارات الإنجاز</h4></div><strong>${mastery.badges.length} / ${achievements.length}</strong></div>
        <div class="achievement-grid">${achievements.map(badge => `<article class="achievement-card ${mastery.badges.includes(badge.id)?'earned':'locked'}"><span>${badge.icon}</span><div><strong>${esc(badge.title)}</strong><small>${esc(badge.desc)}</small></div><em>${mastery.badges.includes(badge.id)?'مكتسبة':'مقفلة'}</em></article>`).join('')}</div>
      </div>
    </section>`;
}

function roadmapHtml(cat) {
  const ranges = tierRanges(banks[cat].length);
  const unlocked = unlockedTierIndex(cat);
  return `<article class="mastery-roadmap" data-mastery-roadmap="${cat}">
    <div class="roadmap-head"><span>${categoryMeta[cat].icon}</span><div><strong>${categoryMeta[cat].title}</strong><small>${completedIds(cat).size} / ${banks[cat].length} مرحلة مكتملة</small></div></div>
    <div class="tier-track">${ranges.map(range => {
      const stat = tierProgress(cat,range);
      const open = range.index <= unlocked;
      const completedTier = stat.completed === range.size;
      return `<div class="tier-node ${open?'open':'locked'} ${completedTier?'complete':''}" data-tier="${range.id}"><span>${open?range.icon:'🔒'}</span><strong>${range.title}</strong><small>${range.start+1}–${range.end+1}</small><i><b style="width:${Math.round((stat.completed/range.size)*100)}%"></b></i><em>${range.index===0?'مفتوح':open?`${stat.completed}/${range.size}`:`يتطلب ${stat.required} من المستوى السابق`}</em></div>`;
    }).join('<span class="tier-connector">›</span>')}</div>
  </article>`;
}

function renderMastery() {
  const expansion = document.getElementById('expandedChallenges');
  if (!expansion) return;
  const old = document.getElementById('gamesMasteryHub');
  const html = masteryDashboardHtml();
  if (old) old.replaceWith(fragment(html));
  else expansion.querySelector('.expansion-heading')?.insertAdjacentElement('afterend', fragment(html));
}

function decorateRunner() {
  const context = stageContext();
  const head = document.querySelector('#expansionRunner .expansion-runner-head');
  if (!context || !head) return;
  syncAttempt();
  let badge = head.querySelector('.mastery-stage-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'mastery-stage-badge';
    head.appendChild(badge);
  }
  const stars = starValue(context.cat,context.q.id);
  badge.innerHTML = `<span>${context.tier.icon} ${context.tier.title}</span><b>${stars?'★'.repeat(stars)+'☆'.repeat(3-stars):'☆☆☆'}</b>`;
}

function canEnterStage(cat, stageIndex) {
  const targetTier = tierForIndex(cat,stageIndex).index;
  if (targetTier <= unlockedTierIndex(cat)) return true;
  if (completedIds(cat).has(banks[cat][stageIndex]?.id)) return true;
  return false;
}

function blockLockedNext(event) {
  const next = event.target.closest('[data-expansion-next]');
  if (!next) return;
  const context = stageContext();
  if (!context) return;
  const target = (context.stageIndex + 1) % banks[context.cat].length;
  if (target === 0 || canEnterStage(context.cat,target)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const nextTier = tierForIndex(context.cat,target);
  const previous = tierRanges(banks[context.cat].length)[nextTier.index-1];
  const stat = tierProgress(context.cat,previous);
  toast(`🔒 مستوى ${nextTier.title} ما زال مقفلًا`,`أكمل ${stat.required} مراحل على الأقل من مستوى ${previous.title}. أنجزت ${stat.completed} حتى الآن.`);
  document.querySelector(`[data-mastery-roadmap="${context.cat}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
}

function toast(title,desc='') {
  let host = document.getElementById('masteryToastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'masteryToastHost';
    host.className = 'mastery-toast-host';
    document.body.appendChild(host);
  }
  const node = document.createElement('div');
  node.className = 'mastery-toast';
  node.innerHTML = `<strong>${esc(title)}</strong>${desc?`<small>${esc(desc)}</small>`:''}`;
  host.appendChild(node);
  requestAnimationFrame(()=>node.classList.add('show'));
  setTimeout(()=>{node.classList.remove('show');setTimeout(()=>node.remove(),240);},3600);
}

function fragment(html) {
  const template=document.createElement('template');
  template.innerHTML=html.trim();
  return template.content.firstElementChild;
}

function handleResultClick(event) {
  const categoryButton = event.target.closest('[data-expansion-category]');
  if (categoryButton) {
    activeCategory = categoryButton.dataset.expansionCategory;
    attempt = {id:null,wrong:0,assist:0};
    setTimeout(()=>{decorateRunner();renderMastery();},0);
    return;
  }
  if (event.target.closest('[data-expansion-reveal],[data-cross-hint]')) {
    registerAssist();
    setTimeout(decorateRunner,0);
    return;
  }
  const answer = event.target.closest('[data-expansion-answer]');
  if (answer) {
    const context = stageContext();
    if (!context) return;
    syncAttempt();
    const chosen = Number(answer.dataset.expansionAnswer);
    if (chosen !== context.q.answer) registerWrong();
    setTimeout(()=>{
      awardIfNew(context);
      decorateRunner();
    },0);
    return;
  }
  if (event.target.closest('[data-expansion-next]')) {
    setTimeout(()=>{syncAttempt();decorateRunner();renderMastery();},0);
  }
}

function init() {
  migrateLegacyProgress();
  renderMastery();
  decorateRunner();
  const observer = new MutationObserver(() => {
    if (!document.getElementById('gamesMasteryHub')) renderMastery();
    decorateRunner();
  });
  observer.observe(document.body,{childList:true,subtree:true});
}

document.addEventListener('click',blockLockedNext,true);
document.addEventListener('click',handleResultClick,false);

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
