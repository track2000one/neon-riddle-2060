(()=>{
'use strict';
const LEGACY_LESSONS=window.NEON_STEP_BOOK_KAFAYAT_LESSONS||[];
const EXTRA_LESSONS=window.NEON_STEP_MASTERY_LESSONS||[];
const LEGACY_MODELS=(window.NEON_STEP_BOOK_KAFAYAT_MODELS||[]).slice().sort((a,b)=>Number(a.number)-Number(b.number));
const EXTRA_QUESTIONS=window.NEON_STEP_MASTERY_QUESTIONS||[];
const LEGACY_LISTENING=window.NEON_STEP_BOOK_KAFAYAT_LISTENING||{interactiveExercises:[]};
if(!LEGACY_LESSONS.length&&!EXTRA_LESSONS.length)return;

const STORE_KEY='neonStepProgressV1';
const SECTION_ID='stepBookKafayat1';
const trackTitles={core:'التأسيس والتطبيق',strategy:'استراتيجيات الاختبار',spelling:'الإملاء وبناء الكلمات','grammar-plus':'قواعد متقدمة'};
const skillTitles={grammar:'القواعد',reading:'فهم المقروء',vocabulary:'المفردات والإملاء',analysis:'التحليل الكتابي',listening:'الاستماع'};
const levelTitles={foundation:'تأسيسي',practice:'تطبيقي',mastery:'إتقان'};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const shuffle=array=>{const result=[...array];for(let index=result.length-1;index>0;index-=1){const other=Math.floor(Math.random()*(index+1));[result[index],result[other]]=[result[other],result[index]]}return result};
const fingerprint=item=>`${String(item.q||item.question||'').trim().toLowerCase()}|${(item.options||[]).join('|').toLowerCase()}`;
const normalizedLegacyLessons=LEGACY_LESSONS.map(item=>({...item,track:'core',skill:item.unit||item.skill||'grammar'}));
const LESSONS=[...normalizedLegacyLessons,...EXTRA_LESSONS].filter((item,index,array)=>array.findIndex(other=>other.id===item.id)===index);
const normalizeQuestion=(item,index,prefix='legacy')=>({
 id:item.id||`${prefix}-${index}`,
 skill:item.skill||item.unit||'grammar',
 topic:item.topic||item.category||item.skill||'general',
 level:item.level||'practice',
 q:item.q||item.question||'',
 options:Array.isArray(item.options)?item.options:[],
 answer:Number(item.answer??item.correct??0),
 explain:item.explain||item.explanation||'راجع القاعدة المرتبطة بالسؤال.',
 passage:item.passage||null,
 audio:item.audio||item.transcript||null
});
const legacyQuestions=LEGACY_MODELS.flatMap(model=>(model.questions||[]).map((question,index)=>normalizeQuestion(question,index,model.id||'legacy')));
const listeningQuestions=(LEGACY_LISTENING.interactiveExercises||[]).map((question,index)=>normalizeQuestion(question,index,'listen'));
const ALL_QUESTIONS=[...legacyQuestions,...EXTRA_QUESTIONS.map((question,index)=>normalizeQuestion(question,index,'mastery')),...listeningQuestions]
 .filter(item=>item.q&&item.options.length>=2&&Number.isInteger(item.answer)&&item.answer>=0&&item.answer<item.options.length)
 .filter((item,index,array)=>array.findIndex(other=>fingerprint(other)===fingerprint(item))===index);
window.NEON_STEP_MASTERY_BANK=ALL_QUESTIONS;
window.NEON_STEP_LESSON_TITLES={...(window.NEON_STEP_LESSON_TITLES||{}),...Object.fromEntries(LESSONS.map(item=>[item.id,item.arTitle||item.title]))};

function readState(){
 let root={completedLessons:[],attempts:[],target:75};
 try{root={...root,...JSON.parse(localStorage.getItem(STORE_KEY)||'{}')}}catch{}
 root.completedLessons=Array.isArray(root.completedLessons)?root.completedLessons:[];
 root.attempts=Array.isArray(root.attempts)?root.attempts:[];
 root.mastery={completedLessons:[],attempts:[],modelBest:{},lastActivity:null,bookmarks:[],...(root.mastery||{})};
 root.mastery.completedLessons=Array.isArray(root.mastery.completedLessons)?root.mastery.completedLessons:[];
 root.mastery.attempts=Array.isArray(root.mastery.attempts)?root.mastery.attempts:[];
 root.mastery.modelBest=root.mastery.modelBest&&typeof root.mastery.modelBest==='object'?root.mastery.modelBest:{};
 root.mastery.bookmarks=Array.isArray(root.mastery.bookmarks)?root.mastery.bookmarks:[];
 root.book1={completedLessons:[],modelBest:{},attempts:[],...(root.book1||{})};
 return root;
}
let state=readState();
let session=null;
let timer=null;
let currentLessonFilter='all';
let currentLessonSearch='';
const save=()=>{state.mastery.lastUpdatedAt=new Date().toISOString();localStorage.setItem(STORE_KEY,JSON.stringify(state));renderSummary()};
const isComplete=id=>state.completedLessons.includes(id)||state.mastery.completedLessons.includes(id)||state.book1.completedLessons?.includes(id);
function completeLesson(lesson){
 if(!state.completedLessons.includes(lesson.id))state.completedLessons.push(lesson.id);
 if(!state.mastery.completedLessons.includes(lesson.id))state.mastery.completedLessons.push(lesson.id);
 state.mastery.lastActivity={type:'lesson',id:lesson.id,title:lesson.arTitle||lesson.title,at:new Date().toISOString()};
 save();
}
function topicStats(){
 const stats={};
 for(const attempt of state.mastery.attempts||[]){
  for(const answer of attempt.answers||[]){
   const key=answer.topic||'general';
   stats[key]||={correct:0,total:0};
   stats[key].total+=1;
   if(answer.correct)stats[key].correct+=1;
  }
 }
 return stats;
}
function skillStats(){
 const stats={};
 for(const key of Object.keys(skillTitles))stats[key]={correct:0,total:0};
 for(const attempt of state.mastery.attempts||[])for(const answer of attempt.answers||[]){
  const key=answer.skill||'grammar';stats[key]||={correct:0,total:0};stats[key].total+=1;if(answer.correct)stats[key].correct+=1;
 }
 return stats;
}
function expandPool(pool,count){
 if(!pool.length)return [];
 const result=[];let cycle=0;
 while(result.length<count){
  for(const item of shuffle(pool)){
   if(result.length>=count)break;
   result.push(cycle?{...item,id:`${item.id}-repeat-${cycle}-${result.length}`}:{...item});
  }
  cycle+=1;
 }
 return result;
}
function adaptivePool(count=30){
 const stats=topicStats();
 const ranked=Object.entries(stats).sort((a,b)=>{
  const ar=a[1].total?a[1].correct/a[1].total:0;
  const br=b[1].total?b[1].correct/b[1].total:0;
  return ar-br;
 }).map(([topic])=>topic);
 if(!ranked.length)return expandPool(ALL_QUESTIONS,count);
 const weak=new Set(ranked.slice(0,Math.max(3,Math.ceil(ranked.length/3))));
 const priority=ALL_QUESTIONS.filter(item=>weak.has(item.topic));
 const rest=ALL_QUESTIONS.filter(item=>!weak.has(item.topic));
 return [...expandPool(priority,Math.ceil(count*.65)),...expandPool(rest,Math.floor(count*.35))].slice(0,count);
}
const dynamicModels=[
 {id:'mastery-diagnostic',title:'التشخيص الشامل',description:'اختبار متوازن لتحديد نقاط القوة والضعف.',count:40,minutes:48,filter:()=>true},
 {id:'mastery-grammar',title:'التراكيب والتحليل المكثف',description:'الأزمنة، السؤال، الشرط، المبني للمجهول، الترقيم واكتشاف الخطأ.',count:40,minutes:42,filter:q=>q.skill==='grammar'||q.skill==='analysis'},
 {id:'mastery-spelling',title:'الإملاء وبناء الكلمات',description:'قواعد النهايات واللواحق والحروف الصامتة والتهجئة الدقيقة.',count:30,minutes:30,filter:q=>q.skill==='vocabulary'&&/^msq-s/.test(q.id)},
 {id:'mastery-reading',title:'القراءة والاستماع',description:'فكرة رئيسة، تفاصيل، مفردات سياقية، استنتاج ومقاطع مسموعة.',count:24,minutes:34,filter:q=>q.skill==='reading'||q.skill==='listening'},
 {id:'mastery-adaptive',title:'تدريب تكيفي لنقاط الضعف',description:'يبني جلسة جديدة اعتمادًا على أخطاء الطالب السابقة.',count:30,minutes:38,adaptive:true}
];
const legacyModels=LEGACY_MODELS.map((model,index)=>({
 id:model.id||`legacy-model-${index+1}`,
 title:`النموذج التدريبي ${index+1}`,
 description:'تدريب متكامل مع تقرير تفصيلي بعد الانتهاء.',
 count:Number(model.questionCount||model.questions?.length||25),
 minutes:Number(model.minutes||30),
 questions:(model.questions||[]).map((item,qIndex)=>normalizeQuestion(item,qIndex,model.id||`legacy-${index+1}`))
}));
const MODELS=[...dynamicModels,...legacyModels];

function injectStyles(){
 if(document.getElementById('stepMasteryStyle'))return;
 const style=document.createElement('style');style.id='stepMasteryStyle';style.textContent=`
#${SECTION_ID}{margin-top:30px;scroll-margin-top:92px}.ms-shell{border:1px solid rgba(102,225,255,.28);border-radius:32px;padding:28px;background:radial-gradient(circle at 8% 8%,rgba(66,222,255,.13),transparent 31%),radial-gradient(circle at 92% 12%,rgba(174,102,255,.16),transparent 33%),linear-gradient(145deg,rgba(7,24,51,.98),rgba(24,16,60,.97));box-shadow:0 30px 92px rgba(0,0,0,.35)}.ms-hero{display:grid;grid-template-columns:1.3fr .7fr;gap:24px;align-items:center}.ms-badge{display:inline-flex;padding:8px 13px;border:1px solid rgba(100,228,255,.34);border-radius:999px;background:rgba(100,228,255,.07);color:#72e8ff;font-size:11px;font-weight:900}.ms-hero h2{font-size:clamp(32px,4.6vw,58px);margin:10px 0 7px}.ms-hero p{color:#bdcae4;line-height:1.9}.ms-actions{display:flex;gap:9px;flex-wrap:wrap}.ms-btn{border:0;border-radius:13px;padding:11px 16px;background:linear-gradient(135deg,#5ce3ff,#9b68ff);color:#06101f;font-family:inherit;font-weight:900;cursor:pointer}.ms-btn.secondary{color:#fff;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14)}.ms-btn.warning{background:linear-gradient(135deg,#ffd76d,#ff8c80)}.ms-btn:disabled{opacity:.55;cursor:not-allowed}.ms-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ms-stat{padding:16px;border:1px solid rgba(255,255,255,.11);border-radius:18px;background:rgba(255,255,255,.045)}.ms-stat small,.ms-stat strong{display:block}.ms-stat small{color:#9eafd0}.ms-stat strong{font-size:29px;margin-top:4px}.ms-note{margin-top:17px;padding:13px 15px;border-radius:16px;border:1px solid rgba(75,232,163,.22);background:rgba(75,232,163,.065);color:#bff5d8;line-height:1.8;font-size:12px}.ms-tabs{display:flex;gap:8px;overflow:auto;scrollbar-width:none;margin:23px 0 17px}.ms-tabs::-webkit-scrollbar{display:none}.ms-tab{white-space:nowrap;border:1px solid rgba(255,255,255,.12);border-radius:13px;padding:10px 15px;background:rgba(255,255,255,.05);color:#dce6fa;font-family:inherit;font-weight:800;cursor:pointer}.ms-tab.active{background:linear-gradient(135deg,#5ce3ff,#9b68ff);color:#06101f}.ms-panel{display:none}.ms-panel.active{display:block}.ms-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.ms-card,.ms-lesson,.ms-model,.ms-progress-card{border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:17px;background:rgba(4,15,38,.58)}.ms-card h3,.ms-lesson h3,.ms-model h3{margin:7px 0}.ms-card p,.ms-lesson p,.ms-model p{color:#aebdd9;line-height:1.75;font-size:13px}.ms-toolbar{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:15px}.ms-toolbar input,.ms-toolbar select{min-height:42px;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:9px 12px;background:#07142d;color:#fff;font-family:inherit}.ms-toolbar input{flex:1;min-width:210px}.ms-filters{display:flex;gap:7px;overflow:auto;padding-bottom:6px}.ms-filter{white-space:nowrap;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:8px 12px;background:rgba(255,255,255,.05);color:#dce6fa;cursor:pointer}.ms-filter.active{border-color:#68e7ff;color:#68e7ff;background:rgba(104,231,255,.08)}.ms-lesson{display:flex;flex-direction:column;min-height:245px}.ms-lesson small{color:#6fe8ff}.ms-lesson h4{direction:ltr;text-align:left;margin:0 0 6px;color:#dbe7fb}.ms-lesson .ms-btn{margin-top:auto;align-self:flex-start}.ms-lesson.done{border-color:rgba(75,232,163,.38);background:rgba(75,232,163,.055)}.ms-model-meta{display:flex;justify-content:space-between;gap:10px;color:#78e8ff;font-size:11px}.ms-best{margin:10px 0;padding:9px 11px;border-radius:12px;background:rgba(255,255,255,.05);font-size:12px}.ms-practice-box{max-width:930px;margin:auto}.ms-progress-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.ms-progress-card small,.ms-progress-card strong{display:block}.ms-progress-card strong{font-size:25px;margin:5px 0}.ms-modal{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:18px;background:rgba(1,5,16,.89);backdrop-filter:blur(12px)}.ms-modal-card{width:min(900px,100%);max-height:92vh;overflow:auto;border:1px solid rgba(102,227,255,.35);border-radius:25px;padding:25px;background:linear-gradient(150deg,#0a1934,#17113d);box-shadow:0 35px 100px rgba(0,0,0,.55);position:relative}.ms-close{position:absolute;top:12px;left:12px;width:40px;height:40px;border:0;border-radius:11px;background:rgba(255,255,255,.1);color:#fff;font-size:23px;cursor:pointer}.ms-rule,.ms-traps{padding:15px;border-radius:16px;margin:13px 0;line-height:1.85}.ms-rule{border:1px solid rgba(93,226,255,.2);background:rgba(93,226,255,.065)}.ms-traps{border:1px solid rgba(255,128,158,.2);background:rgba(255,128,158,.06)}.ms-ltr{direction:ltr;text-align:left}.ms-mini{padding:16px;border-radius:17px;background:rgba(255,255,255,.045);margin-top:15px}.ms-mini-options,.ms-options{display:grid;gap:9px;margin:10px 0}.ms-mini-options button,.ms-option{direction:ltr;text-align:left;border:1px solid rgba(255,255,255,.13);border-radius:13px;padding:12px;background:rgba(255,255,255,.045);color:#fff;cursor:pointer}.ms-runner{max-width:980px;margin:18px auto 0;border:1px solid rgba(101,227,255,.24);border-radius:24px;padding:22px;background:rgba(4,14,37,.8)}.ms-runner-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.ms-timer{padding:9px 13px;border-radius:12px;background:rgba(255,255,255,.06);color:#ffd76b;font-weight:900}.ms-track{height:7px;margin:15px 0 20px;border-radius:999px;background:rgba(255,255,255,.075);overflow:hidden}.ms-track b{display:block;height:100%;background:linear-gradient(90deg,#5ce3ff,#9b68ff,#ff75d2)}.ms-passage{direction:ltr;text-align:left;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.045);padding:15px;margin-bottom:16px;white-space:pre-line;line-height:1.85;color:#dce5f7}.ms-question{direction:ltr;text-align:left;font-size:clamp(19px,2.6vw,27px);line-height:1.65}.ms-option{display:flex;gap:11px;align-items:flex-start;width:100%;font-size:15px}.ms-option b{width:31px;height:31px;display:grid;place-items:center;flex:0 0 31px;border-radius:9px;background:rgba(255,255,255,.08)}.ms-option.selected{border-color:#6ee8ff;background:rgba(110,232,255,.1)}.ms-option.correct{border-color:#47e6a1;background:rgba(71,230,161,.11)}.ms-option.wrong{border-color:#ff718f;background:rgba(255,113,143,.11)}.ms-feedback{margin-top:14px;padding:15px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);line-height:1.8}.ms-audio{margin-bottom:14px}.ms-report-hero{display:flex;align-items:center;gap:18px;padding:18px;border-radius:20px;background:linear-gradient(135deg,rgba(92,227,255,.09),rgba(154,104,255,.11));border:1px solid rgba(255,255,255,.1)}.ms-report-hero>strong{font-size:clamp(48px,8vw,76px);color:#64e6ff}.ms-breakdown{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:15px 0}.ms-breakdown article{padding:13px;border-radius:15px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035)}.ms-breakdown i{display:block;height:5px;margin-top:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}.ms-breakdown i b{display:block;height:100%;background:linear-gradient(90deg,#5ce3ff,#9b68ff)}.ms-review{padding:14px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);margin-bottom:9px}.ms-review h4{direction:ltr;text-align:left;line-height:1.65}.ms-review p{margin:7px 0;color:#b9c6df}.ms-review em{color:#ff91aa;font-style:normal}.ms-review b{color:#73e8ff}.ms-history{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}.ms-history th,.ms-history td{padding:10px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right}.ms-history th{color:#76e6ff}.ms-empty{padding:24px;text-align:center;color:#9dafcf}@media(max-width:1000px){.ms-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ms-progress-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:680px){.ms-shell{padding:17px;border-radius:23px}.ms-hero{grid-template-columns:1fr}.ms-grid,.ms-breakdown{grid-template-columns:1fr}.ms-progress-grid{grid-template-columns:1fr 1fr}.ms-runner{padding:15px 12px}.ms-report-hero{align-items:flex-start}.ms-history{font-size:10px}}
`;document.head.appendChild(style);
}

function createSection(){
 let section=document.getElementById(SECTION_ID);if(section)return section;
 section=document.createElement('section');section.id=SECTION_ID;section.innerHTML=`<div class="ms-shell">
 <div class="ms-hero"><div><span class="ms-badge">STEP • MASTERY LIBRARY</span><h2>مكتبة الإتقان والتدريب</h2><p>مسار موحّد يدمج التأسيس والقواعد المتقدمة والإملاء وبناء الكلمات والقراءة والتحليل والاستماع، مع تدريب موجه ومحاكاة وتقارير تكيفية.</p><div class="ms-actions"><button class="ms-btn" data-ms-action="adaptive">ابدأ تدريب نقاط الضعف</button><button class="ms-btn secondary" data-ms-tab="lessons">استعرض الشرح</button></div><div class="ms-note">تمت إزالة تكرار النسخ والأسئلة، ومراجعة الصياغة ومفاتيح الإجابة. لا تُعرض بيانات المصادر داخل الدروس أو التقارير.</div></div>
 <div class="ms-stats"><div class="ms-stat"><small>الدروس المنظمة</small><strong id="msLessonCount">${LESSONS.length}</strong></div><div class="ms-stat"><small>الأسئلة الموحّدة</small><strong id="msQuestionCount">${ALL_QUESTIONS.length}</strong></div><div class="ms-stat"><small>الدروس المكتملة</small><strong id="msCompleteCount">0</strong></div><div class="ms-stat"><small>متوسط الدقة</small><strong id="msAverage">—</strong></div></div></div>
 <div class="ms-tabs"><button class="ms-tab active" data-ms-tab="overview">خطة الإتقان</button><button class="ms-tab" data-ms-tab="lessons">الشرح</button><button class="ms-tab" data-ms-tab="practice">تدريب موجّه</button><button class="ms-tab" data-ms-tab="models">النماذج</button><button class="ms-tab" data-ms-tab="listening">الاستماع</button><button class="ms-tab" data-ms-tab="progress">التقدم</button></div>
 <div class="ms-panel active" data-ms-panel="overview"><div class="ms-grid"><article class="ms-card"><small>1</small><h3>شخّص مستواك</h3><p>ابدأ بجلسة شاملة، ثم سيحدد التقرير القواعد والمهارات الأقل دقة.</p><button class="ms-btn" data-ms-model="mastery-diagnostic" data-mode="exam">ابدأ التشخيص</button></article><article class="ms-card"><small>2</small><h3>تعلم بالقاعدة والمثال</h3><p>كل درس يتضمن شرحًا عربيًا، أمثلة، أخطاء شائعة وسؤال تحقق قصير.</p><button class="ms-btn secondary" data-ms-tab="lessons">فتح الدروس</button></article><article class="ms-card"><small>3</small><h3>درب نقاط الضعف</h3><p>الجلسة التكيفية تعطي أولوية للموضوعات التي أخطأت فيها سابقًا.</p><button class="ms-btn secondary" data-ms-action="adaptive">جلسة تكيفية</button></article></div><div id="msOverviewSkills" style="margin-top:16px"></div></div>
 <div class="ms-panel" data-ms-panel="lessons"><div class="ms-toolbar"><input id="msLessonSearch" type="search" placeholder="ابحث عن قاعدة أو مهارة…"><div class="ms-filters" id="msLessonFilters"></div></div><div class="ms-grid" id="msLessonGrid"></div></div>
 <div class="ms-panel" data-ms-panel="practice"><div class="ms-practice-box ms-card"><h3>أنشئ جلسة تدريب خاصة بك</h3><div class="ms-toolbar"><select id="msPracticeSkill"><option value="all">كل المهارات</option>${Object.entries(skillTitles).map(([key,value])=>`<option value="${key}">${value}</option>`).join('')}</select><select id="msPracticeLevel"><option value="all">كل المستويات</option>${Object.entries(levelTitles).map(([key,value])=>`<option value="${key}">${value}</option>`).join('')}</select><select id="msPracticeCount"><option value="10">10 أسئلة</option><option value="20">20 سؤالًا</option><option value="30">30 سؤالًا</option><option value="40">40 سؤالًا</option></select><button class="ms-btn" data-ms-action="custom-practice">ابدأ مع الشرح</button><button class="ms-btn secondary" data-ms-action="custom-exam">محاكاة صامتة</button></div><div id="msPracticeRunner"></div></div></div>
 <div class="ms-panel" data-ms-panel="models"><div class="ms-grid" id="msModelGrid"></div><div id="msModelRunner"></div></div>
 <div class="ms-panel" data-ms-panel="listening"><div class="ms-grid"><article class="ms-card"><h3>استماع للمعلومة الدقيقة</h3><p>تدريب على المكان والوقت والأرقام والتغيير والقرار النهائي. يعمل المقطع بصوت المتصفح ولا يظهر النص قبل الإجابة.</p><button class="ms-btn" data-ms-action="listening">ابدأ الاستماع</button></article><article class="ms-card"><h3>التدوين المختصر</h3><p>اكتب كلمة أو رقمًا بدل الجملة الكاملة: 4:00 → 4:30، room → library، cost &gt; 1500.</p><button class="ms-btn secondary" data-ms-lesson="ms-strategy-07">شرح الاستراتيجية</button></article><article class="ms-card"><h3>قاعدة المحاولة الواحدة</h3><p>درّب نفسك على التقاط الفكرة من تشغيل واحد، ثم استخدم الإعادة فقط أثناء مرحلة التعلم.</p><button class="ms-btn secondary" data-ms-action="listening-exam">محاكاة استماع</button></article></div><div id="msListeningRunner"></div></div>
 <div class="ms-panel" data-ms-panel="progress"><div id="msProgress"></div></div>
 </div>`;
 const parent=document.getElementById('stepAcademy');if(parent?.parentNode)parent.insertAdjacentElement('afterend',section);else document.querySelector('main')?.appendChild(section);
 bind(section);renderFilters();renderLessons();renderModels();renderProgress();renderSummary();return section;
}
function switchTab(name){
 document.querySelectorAll(`#${SECTION_ID} [data-ms-tab]`).forEach(button=>button.classList.toggle('active',button.dataset.msTab===name));
 document.querySelectorAll(`#${SECTION_ID} [data-ms-panel]`).forEach(panel=>panel.classList.toggle('active',panel.dataset.msPanel===name));
 if(name==='progress')renderProgress();
 document.getElementById(SECTION_ID)?.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderFilters(){
 const box=document.getElementById('msLessonFilters');if(!box)return;
 box.innerHTML=[['all','كل المسارات'],...Object.entries(trackTitles)].map(([key,value])=>`<button class="ms-filter ${currentLessonFilter===key?'active':''}" data-ms-filter="${key}">${value}</button>`).join('');
}
function renderLessons(){
 const grid=document.getElementById('msLessonGrid');if(!grid)return;
 const needle=currentLessonSearch.trim().toLowerCase();
 const filtered=LESSONS.filter(item=>(currentLessonFilter==='all'||item.track===currentLessonFilter)&&(!needle||`${item.arTitle||''} ${item.title||''} ${item.summary||''}`.toLowerCase().includes(needle)));
 grid.innerHTML=filtered.length?filtered.map((lesson,index)=>`<article class="ms-lesson ${isComplete(lesson.id)?'done':''}"><small>${trackTitles[lesson.track]||'التدريب'} • ${skillTitles[lesson.skill||lesson.unit]||lesson.skill||lesson.unit} • ${levelTitles[lesson.level]||lesson.level}</small><h3>${esc(lesson.arTitle||lesson.title)}</h3><h4>${esc(lesson.title||'')}</h4><p>${esc(lesson.summary||'')}</p><button class="ms-btn ${isComplete(lesson.id)?'secondary':''}" data-ms-lesson="${lesson.id}">${isComplete(lesson.id)?'مراجعة الدرس ✓':'فتح الدرس'}</button></article>`).join(''):'<div class="ms-empty">لا توجد نتائج مطابقة.</div>';
}
function renderModels(){
 const grid=document.getElementById('msModelGrid');if(!grid)return;
 grid.innerHTML=MODELS.map(model=>{const best=Number(state.mastery.modelBest[model.id]||state.book1.modelBest?.[model.id]||0);return `<article class="ms-model"><div class="ms-model-meta"><span>${model.count} سؤالًا</span><span>${model.minutes} دقيقة</span></div><h3>${esc(model.title)}</h3><p>${esc(model.description)}</p><div class="ms-best">أفضل نتيجة: <strong>${best?best+'%':'لم يُختبر'}</strong></div><div class="ms-actions"><button class="ms-btn" data-ms-model="${model.id}" data-mode="training">تدريب مع شرح</button><button class="ms-btn secondary" data-ms-model="${model.id}" data-mode="exam">محاكاة صامتة</button></div></article>`}).join('');
}
function openLesson(id){
 const lesson=LESSONS.find(item=>item.id===id);if(!lesson)return;
 const modal=document.createElement('div');modal.className='ms-modal';modal.innerHTML=`<div class="ms-modal-card"><button class="ms-close" aria-label="إغلاق">×</button><span class="ms-badge">${esc(trackTitles[lesson.track]||'مسار تدريبي')} • ${esc(levelTitles[lesson.level]||lesson.level)}</span><h2>${esc(lesson.arTitle||lesson.title)}<small class="ms-ltr" style="display:block;color:#9fb1d3;font-size:15px;margin-top:7px">${esc(lesson.title||'')}</small></h2><p>${esc(lesson.summary||'')}</p><div class="ms-rule"><h3>القاعدة والاستراتيجية</h3><p>${esc(lesson.rule||'')}</p></div><div class="ms-ltr"><h3>Examples</h3><ul>${(lesson.examples||[]).map(example=>`<li>${esc(example)}</li>`).join('')}</ul></div><div class="ms-traps"><h3>أخطاء شائعة</h3><ul>${(lesson.traps||[]).map(trap=>`<li>${esc(trap)}</li>`).join('')}</ul></div>${lesson.check?`<div class="ms-mini"><h3>تحقق سريع</h3><p class="ms-ltr">${esc(lesson.check.q)}</p><div class="ms-mini-options">${lesson.check.options.map((option,index)=>`<button data-ms-mini="${index}">${String.fromCharCode(65+index)}. ${esc(option)}</button>`).join('')}</div><div data-ms-mini-feedback></div></div>`:''}<button class="ms-btn" data-ms-complete>${isComplete(id)?'مكتمل — إغلاق':'اعتماد إكمال الدرس'}</button></div>`;
 document.body.appendChild(modal);const close=()=>{modal.remove();window.speechSynthesis?.cancel()};modal.querySelector('.ms-close').onclick=close;modal.onclick=event=>{if(event.target===modal)close()};
 modal.querySelectorAll('[data-ms-mini]').forEach(button=>button.onclick=()=>{const choice=Number(button.dataset.msMini);modal.querySelectorAll('[data-ms-mini]').forEach((item,index)=>{item.disabled=true;if(index===lesson.check.answer)item.style.borderColor='#47e6a1';else if(index===choice)item.style.borderColor='#ff718f'});modal.querySelector('[data-ms-mini-feedback]').innerHTML=`<div class="ms-feedback"><strong>${choice===lesson.check.answer?'إجابة صحيحة ✓':'راجع القاعدة'}</strong><p>${esc(lesson.check.explain)}</p></div>`});
 modal.querySelector('[data-ms-complete]').onclick=()=>{completeLesson(lesson);close()};
}
function modelQuestions(model){
 if(model.adaptive)return adaptivePool(model.count);
 if(model.questions)return expandPool(model.questions,model.count);
 return expandPool(ALL_QUESTIONS.filter(model.filter||(()=>true)),model.count);
}
function startModel(modelId,mode='training',target='msModelRunner'){
 const model=MODELS.find(item=>item.id===modelId);if(!model)return;
 startSession({id:model.id,title:model.title,minutes:model.minutes,questions:modelQuestions(model),mode,target});
}
function startCustom(mode='training'){
 const skill=document.getElementById('msPracticeSkill')?.value||'all';
 const level=document.getElementById('msPracticeLevel')?.value||'all';
 const count=Number(document.getElementById('msPracticeCount')?.value||10);
 let pool=ALL_QUESTIONS.filter(item=>(skill==='all'||item.skill===skill)&&(level==='all'||item.level===level));if(!pool.length)pool=ALL_QUESTIONS;
 startSession({id:`custom-${skill}-${level}`,title:'جلسة تدريب مخصصة',minutes:Math.max(12,Math.ceil(count*1.15)),questions:expandPool(pool,count),mode,target:'msPracticeRunner'});
}
function startListening(mode='training'){
 const pool=ALL_QUESTIONS.filter(item=>item.skill==='listening'&&item.audio);startSession({id:'mastery-listening',title:'تدريب الاستماع',minutes:18,questions:expandPool(pool,Math.min(12,pool.length||12)),mode,target:'msListeningRunner'});
}
function startSession({id,title,minutes,questions,mode,target}){
 clearInterval(timer);window.speechSynthesis?.cancel();
 session={id,title,minutes,questions,index:0,correct:0,answers:[],mode,target,remaining:minutes*60,startedAt:Date.now(),selected:null,finished:false};
 state.mastery.lastActivity={type:'session',id,title,mode,at:new Date().toISOString()};save();
 if(target==='msPracticeRunner')switchTab('practice');else if(target==='msListeningRunner')switchTab('listening');else switchTab('models');
 timer=setInterval(tick,1000);renderQuestion();
}
function tick(){if(!session||session.finished)return;session.remaining=Math.max(0,session.remaining-1);const el=document.getElementById('msSessionTimer');if(el)el.textContent=formatTime(session.remaining);if(session.remaining<=0)finishSession()}
const formatTime=value=>`${String(Math.floor(Math.max(0,value)/60)).padStart(2,'0')}:${String(Math.max(0,value)%60).padStart(2,'0')}`;
function speak(text){if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';utterance.rate=.9;window.speechSynthesis.speak(utterance)}
function renderQuestion(){
 if(!session)return;const box=document.getElementById(session.target);if(!box)return;
 if(session.index>=session.questions.length){finishSession();return}
 const question=session.questions[session.index];const progress=Math.round(session.index/session.questions.length*100);
 box.innerHTML=`<div class="ms-runner"><div class="ms-runner-top"><div><small>${esc(session.title)} • ${session.mode==='training'?'تدريب مع شرح':'محاكاة صامتة'}</small><strong>السؤال ${session.index+1} من ${session.questions.length}</strong></div><div class="ms-timer" id="msSessionTimer">${formatTime(session.remaining)}</div></div><div class="ms-track"><b style="width:${progress}%"></b></div>${question.passage?`<div class="ms-passage">${esc(question.passage)}</div>`:''}${question.audio?`<div class="ms-audio"><button class="ms-btn secondary" id="msPlayAudio">🔊 تشغيل المقطع</button><small style="display:block;margin-top:7px;color:#9dafcf">استمع أولًا، ثم اختر الإجابة.</small></div>`:''}<div class="ms-question">${esc(question.q)}</div><div class="ms-options">${question.options.map((option,index)=>`<button class="ms-option" data-ms-answer="${index}"><b>${String.fromCharCode(65+index)}</b><span>${esc(option)}</span></button>`).join('')}</div><div id="msFeedback"></div>${session.mode==='exam'?'<div class="ms-actions" style="margin-top:14px"><button class="ms-btn" id="msConfirmAnswer" disabled>تأكيد والانتقال</button><button class="ms-btn secondary" id="msSkipAnswer">تخطي مؤقتًا</button></div>':''}</div>`;
 if(question.audio)box.querySelector('#msPlayAudio').onclick=()=>speak(question.audio);
 box.querySelectorAll('[data-ms-answer]').forEach(button=>button.onclick=()=>selectAnswer(Number(button.dataset.msAnswer)));
 if(session.mode==='exam'){
  box.querySelector('#msConfirmAnswer').onclick=()=>commitExamAnswer();
  box.querySelector('#msSkipAnswer').onclick=()=>{recordAnswer(null);session.index+=1;session.selected=null;renderQuestion()};
 }
}
function selectAnswer(choice){
 if(!session)return;const question=session.questions[session.index];
 if(session.mode==='exam'){
  session.selected=choice;document.querySelectorAll(`#${session.target} [data-ms-answer]`).forEach((button,index)=>button.classList.toggle('selected',index===choice));const confirm=document.getElementById('msConfirmAnswer');if(confirm)confirm.disabled=false;return;
 }
 const correct=choice===question.answer;recordAnswer(choice);document.querySelectorAll(`#${session.target} [data-ms-answer]`).forEach((button,index)=>{button.disabled=true;if(index===question.answer)button.classList.add('correct');else if(index===choice)button.classList.add('wrong')});
 document.getElementById('msFeedback').innerHTML=`<div class="ms-feedback"><strong>${correct?'إجابة صحيحة ✓':'الإجابة تحتاج مراجعة'}</strong><p>${esc(question.explain)}</p><button class="ms-btn" id="msNextQuestion">${session.index+1===session.questions.length?'عرض التقرير':'السؤال التالي'}</button></div>`;
 document.getElementById('msNextQuestion').onclick=()=>{session.index+=1;renderQuestion()};
}
function commitExamAnswer(){if(session.selected===null)return;recordAnswer(session.selected);session.index+=1;session.selected=null;renderQuestion()}
function recordAnswer(choice){
 const question=session.questions[session.index];const correct=choice===question.answer;if(correct)session.correct+=1;
 session.answers.push({id:question.id,skill:question.skill,topic:question.topic,correct,choice,answer:question.answer,q:question.q,options:question.options,explain:question.explain});
}
function finishSession(){
 if(!session||session.finished)return;session.finished=true;clearInterval(timer);window.speechSynthesis?.cancel();
 while(session.answers.length<session.questions.length){const question=session.questions[session.answers.length];session.answers.push({id:question.id,skill:question.skill,topic:question.topic,correct:false,choice:null,answer:question.answer,q:question.q,options:question.options,explain:question.explain})}
 const percent=Math.round(session.correct/session.questions.length*100);const elapsed=Math.max(1,Math.round((Date.now()-session.startedAt)/1000));
 const attempt={date:new Date().toISOString(),title:session.title,modelId:session.id,mode:session.mode,score:percent,correct:session.correct,total:session.questions.length,elapsed,answers:session.answers};
 state.mastery.attempts.push(attempt);state.mastery.attempts=state.mastery.attempts.slice(-50);state.attempts.push(attempt);state.attempts=state.attempts.slice(-50);state.mastery.modelBest[session.id]=Math.max(Number(state.mastery.modelBest[session.id]||0),percent);state.mastery.lastActivity={type:'result',id:session.id,title:session.title,score:percent,at:new Date().toISOString()};save();
 renderReport(attempt,session.target);session=null;renderProgress();
}
function renderReport(attempt,target){
 const box=document.getElementById(target);if(!box)return;const grouped={};for(const answer of attempt.answers){const key=answer.topic||answer.skill;grouped[key]||={correct:0,total:0};grouped[key].total+=1;if(answer.correct)grouped[key].correct+=1}
 const weakest=Object.entries(grouped).sort((a,b)=>(a[1].correct/a[1].total)-(b[1].correct/b[1].total)).slice(0,5);
 const wrong=attempt.answers.filter(item=>!item.correct);
 box.innerHTML=`<div class="ms-runner"><div class="ms-report-hero"><strong>${attempt.score}%</strong><div><h2>${attempt.score>=80?'أداء قوي':attempt.score>=60?'تقدم جيد يحتاج تثبيتًا':'ابدأ بمراجعة القواعد الأضعف'}</h2><p>${attempt.correct} صحيحة من ${attempt.total} • ${Math.floor(attempt.elapsed/60)} دقيقة و${attempt.elapsed%60} ثانية</p></div></div><h3>أكثر الموضوعات حاجة للمراجعة</h3><div class="ms-breakdown">${weakest.map(([topic,data])=>{const score=Math.round(data.correct/data.total*100);return `<article><div><span>${esc(topic)}</span><strong>${score}%</strong></div><i><b style="width:${score}%"></b></i></article>`}).join('')}</div><div class="ms-actions"><button class="ms-btn" data-ms-action="adaptive">تدريب نقاط الضعف</button><button class="ms-btn secondary" data-ms-tab="progress">عرض سجل التقدم</button></div><h3 style="margin-top:22px">مراجعة الأخطاء</h3>${wrong.length?wrong.map((item,index)=>`<article class="ms-review"><small>خطأ ${index+1} • ${skillTitles[item.skill]||item.skill}</small><h4>${esc(item.q)}</h4><p><em>إجابتك: ${item.choice===null?'لم تُجب':esc(item.options[item.choice])}</em></p><p><b>الصحيح: ${esc(item.options[item.answer])}</b></p><p>${esc(item.explain)}</p></article>`).join(''):'<div class="ms-feedback">إجابات كاملة بلا أخطاء. أحسنت.</div>'}</div>`;
 box.querySelectorAll('[data-ms-action="adaptive"]').forEach(button=>button.onclick=()=>startModel('mastery-adaptive','training'));
 box.querySelectorAll('[data-ms-tab="progress"]').forEach(button=>button.onclick=()=>switchTab('progress'));
}
function renderProgress(){
 const box=document.getElementById('msProgress');if(!box)return;const stats=skillStats();const attempts=[...(state.mastery.attempts||[])].reverse();
 box.innerHTML=`<div class="ms-progress-grid">${Object.entries(stats).map(([key,data])=>`<article class="ms-progress-card"><small>${skillTitles[key]}</small><strong>${data.total?Math.round(data.correct/data.total*100)+'%':'—'}</strong><span>${data.correct}/${data.total} صحيحة</span></article>`).join('')}</div><h3 style="margin-top:22px">آخر المحاولات</h3>${attempts.length?`<div style="overflow:auto"><table class="ms-history"><thead><tr><th>الجلسة</th><th>النتيجة</th><th>الصحيح</th><th>الزمن</th><th>التاريخ</th></tr></thead><tbody>${attempts.slice(0,15).map(item=>`<tr><td>${esc(item.title||'تدريب STEP')}</td><td>${item.score}%</td><td>${item.correct}/${item.total}</td><td>${Math.floor((item.elapsed||0)/60)}:${String((item.elapsed||0)%60).padStart(2,'0')}</td><td>${new Date(item.date).toLocaleDateString('ar-SA')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="ms-empty">لم تبدأ أي محاولة بعد.</div>'}`;
 const overview=document.getElementById('msOverviewSkills');if(overview)overview.innerHTML=`<div class="ms-progress-grid">${Object.entries(stats).map(([key,data])=>`<article class="ms-progress-card"><small>${skillTitles[key]}</small><strong>${data.total?Math.round(data.correct/data.total*100)+'%':'—'}</strong><span>دقة المهارة</span></article>`).join('')}</div>`;
}
function renderSummary(){
 const complete=LESSONS.filter(item=>isComplete(item.id)).length;const attempts=state.mastery.attempts||[];const average=attempts.length?Math.round(attempts.reduce((sum,item)=>sum+Number(item.score||0),0)/attempts.length):null;
 const completeEl=document.getElementById('msCompleteCount');if(completeEl)completeEl.textContent=complete;const averageEl=document.getElementById('msAverage');if(averageEl)averageEl.textContent=average===null?'—':average+'%';renderLessons();renderModels();renderProgress();
}
function bind(section){
 section.addEventListener('click',event=>{
  const tab=event.target.closest('[data-ms-tab]');if(tab){switchTab(tab.dataset.msTab);return}
  const filter=event.target.closest('[data-ms-filter]');if(filter){currentLessonFilter=filter.dataset.msFilter;renderFilters();renderLessons();return}
  const lesson=event.target.closest('[data-ms-lesson]');if(lesson){openLesson(lesson.dataset.msLesson);return}
  const model=event.target.closest('[data-ms-model]');if(model){startModel(model.dataset.msModel,model.dataset.mode||'training');return}
  const action=event.target.closest('[data-ms-action]');if(action){const name=action.dataset.msAction;if(name==='adaptive')startModel('mastery-adaptive','training');if(name==='custom-practice')startCustom('training');if(name==='custom-exam')startCustom('exam');if(name==='listening')startListening('training');if(name==='listening-exam')startListening('exam')}
 });
 const search=section.querySelector('#msLessonSearch');if(search)search.addEventListener('input',event=>{currentLessonSearch=event.target.value;renderLessons()});
}
injectStyles();createSection();window.addEventListener('neon-step-open-request',()=>document.getElementById(SECTION_ID)?.scrollIntoView({behavior:'smooth',block:'start'}));
})();
