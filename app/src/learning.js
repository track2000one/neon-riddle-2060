import './styles.css';
import './learning.css';
import { ensureAuth, renderAccount } from './auth.js';

const PROGRESS_KEY = 'neonLearningProgressV1';
const LAST_KEY = 'neonLearningLastLessonV1';
const PAGE_SIZE = 24;
const levels = [
  { id:'foundation', title:'تأسيسي', xp:30, intro:'شرح مبسط ومنظم يركز على المفاهيم الأساسية.' },
  { id:'practice', title:'تطبيقي', xp:45, intro:'أمثلة وتمارين عملية لتحويل الفكرة إلى مهارة.' },
  { id:'mastery', title:'إتقان', xp:65, intro:'تحليل متقدم وتطبيقات مركبة للتحقق من الإتقان.' }
];

const subjects = [
  { id:'science', title:'العلوم', icon:'🔬', color:'#64dfff', topics:[
    ['المنهج العلمي','الملاحظة وصياغة الفرضيات والتجربة وتحليل النتائج.'],['المادة وخواصها','حالات المادة والكثافة والكتلة والحجم والتغيرات الفيزيائية.'],['الذرة والعناصر','مكونات الذرة والجدول الدوري والروابط بصورة مبسطة.'],['القوى والحركة','السرعة والتسارع والقوة والاحتكاك وقوانين الحركة.'],['الطاقة وتحولاتها','الطاقة الحرارية والكهربائية والحركية وحفظ الطاقة.'],['الضوء والصوت','الموجات والانعكاس والانكسار وخصائص الصوت.'],['الخلايا والكائنات','تركيب الخلية ووظائفها والتكاثر والنمو.'],['الوراثة','الجينات والصفات والكروموسومات ومبادئ الوراثة.'],['الأنظمة البيئية','السلاسل الغذائية والتوازن البيئي والتنوع الحيوي.'],['الأرض والفضاء','طبقات الأرض والمجموعة الشمسية والنجوم والمجرات.']
  ]},
  { id:'mathematics', title:'الرياضيات', icon:'∑', color:'#ffd46e', topics:[
    ['الأعداد والعمليات','العمليات الأربع والأولوية والتقدير والتحقق.'],['الكسور والأعداد العشرية','المقارنة والتحويل والعمليات على الكسور.'],['النسبة والتناسب','معدلات الوحدة والتناسب المباشر والتطبيقات اليومية.'],['النسب المئوية','الزيادة والنقصان والخصم والنسبة من عدد.'],['الجبر الأساسي','المتغيرات والتعابير وتبسيط الحدود.'],['المعادلات','حل المعادلات الخطية والتحقق من الحل.'],['الهندسة المستوية','الزوايا والمضلعات والمحيط والمساحة.'],['الهندسة الفراغية','الحجوم والمساحات السطحية والمجسمات.'],['الإحصاء','المتوسط والوسيط والمنوال والمدى وقراءة البيانات.'],['الاحتمالات','الفضاء العيني والاحتمال البسيط والمركب.']
  ]},
  { id:'arabic', title:'اللغة العربية', icon:'ض', color:'#a56cff', topics:[
    ['الفهم القرائي','استخراج الفكرة الرئيسة والتفاصيل والاستنتاج.'],['المفردات والسياق','فهم معنى الكلمة من السياق والمترادفات والأضداد.'],['النحو الأساسي','أقسام الكلام والجملة الاسمية والفعلية.'],['الإعراب','الرفع والنصب والجر والجزم والعلامات الأصلية.'],['الإملاء','الهمزات والتاء والهاء والألف اللينة وعلامات الترقيم.'],['الصرف','الجذور والأوزان والاشتقاق وصيغ الكلمات.'],['البلاغة','التشبيه والاستعارة والكناية والمحسنات.'],['الكتابة الوظيفية','الرسائل والتقارير والملخصات والسيرة.'],['الكتابة الإبداعية','الوصف والسرد والحوار وبناء الفكرة.'],['التلخيص','تقليص النص مع الحفاظ على معناه وأفكاره الرئيسة.']
  ]},
  { id:'english', title:'اللغة الإنجليزية', icon:'EN', color:'#49b9ff', topics:[
    ['Basic Vocabulary','High-frequency words for daily life and school.'],['Present Tenses','Present simple and present continuous in context.'],['Past Tenses','Past simple and past continuous with time markers.'],['Future Forms','Will, going to, and present continuous for plans.'],['Reading Skills','Main idea, details, inference, and reference words.'],['Listening Skills','Keywords, context clues, and note taking.'],['Writing Sentences','Clear sentence structure, punctuation, and linking.'],['Paragraph Writing','Topic sentence, support, and conclusion.'],['Speaking','Fluency, pronunciation, common expressions, and confidence.'],['Academic Vocabulary','Words used in science, math, and study contexts.']
  ]},
  { id:'history', title:'التاريخ', icon:'🏛️', color:'#ff9966', topics:[
    ['مصادر التاريخ','المصادر الأولية والثانوية وكيفية التحقق منها.'],['الحضارات القديمة','ملامح الحضارات وتأثير البيئة في نشأتها.'],['التاريخ الإسلامي','المراحل والأحداث والمراكز العلمية والحضارية.'],['تاريخ الجزيرة العربية','طرق التجارة والمجتمعات والتحولات التاريخية.'],['تاريخ المملكة','التأسيس والتوحيد ومراحل التنمية الحديثة.'],['الثورات الصناعية','تطور الصناعة والنقل والاتصال وأثرها الاجتماعي.'],['الحروب العالمية','الأسباب العامة والنتائج والتحولات السياسية.'],['المنظمات الدولية','نشأتها وأهدافها وأدوارها الأساسية.'],['التاريخ الاقتصادي','التجارة والعملات والموارد وتطور الأسواق.'],['تاريخ العلوم','محطات تطور الطب والفلك والرياضيات والتقنية.']
  ]},
  { id:'geography', title:'الجغرافيا', icon:'🌍', color:'#4be1a8', topics:[
    ['الخريطة ومكوناتها','الاتجاهات والمقياس والمفتاح والرموز.'],['الموقع والإحداثيات','دوائر العرض وخطوط الطول وتحديد المواقع.'],['التضاريس','الجبال والهضاب والسهول والأودية وتكوينها.'],['المناخ','العوامل المؤثرة والأقاليم المناخية.'],['السكان','التوزيع والكثافة والهجرة والنمو السكاني.'],['الموارد الطبيعية','المياه والمعادن والطاقة وإدارة الموارد.'],['الزراعة والصناعة','عوامل الموقع والإنتاج وسلاسل الإمداد.'],['المدن والتخطيط','النمو الحضري والخدمات والنقل والاستدامة.'],['جغرافية المملكة','المناطق والتضاريس والمناخ والموارد.'],['الكوارث الطبيعية','الزلازل والبراكين والسيول وإدارة المخاطر.']
  ]},
  { id:'technology', title:'التقنية والحاسب', icon:'🖥️', color:'#67edff', topics:[
    ['مكونات الحاسب','المعالج والذاكرة والتخزين وأجهزة الإدخال والإخراج.'],['أنظمة التشغيل','إدارة الملفات والبرامج والمستخدمين والموارد.'],['الإنترنت والشبكات','الاتصال والعناوين والخدمات والبروتوكولات الأساسية.'],['الأمن السيبراني','كلمات المرور والتصيد والخصوصية والتحديثات.'],['البيانات والمعلومات','جمع البيانات وتنظيمها وتحليلها وعرضها.'],['الذكاء الاصطناعي','التعلم الآلي والنماذج والاستخدام المسؤول.'],['الحوسبة السحابية','التخزين والخدمات والتعاون عبر الإنترنت.'],['الوسائط الرقمية','الصور والصوت والفيديو والحقوق الرقمية.'],['الخوارزميات','خطوات الحل والمنطق والترتيب والتكرار.'],['المواطنة الرقمية','السلوك الآمن والأخلاقي والموثوق على الإنترنت.']
  ]},
  { id:'culture', title:'الثقافة والمهارات', icon:'💡', color:'#ff70cf', topics:[
    ['التفكير النقدي','تحليل الادعاءات والأدلة والتمييز بين الرأي والحقيقة.'],['حل المشكلات','تعريف المشكلة وتوليد البدائل واختيار الحل.'],['إدارة الوقت','ترتيب الأولويات والتخطيط والمتابعة.'],['مهارات التواصل','الاستماع والتعبير والتغذية الراجعة.'],['العمل الجماعي','الأدوار والتعاون وإدارة الاختلاف.'],['الثقافة المالية','الميزانية والادخار والشراء الواعي.'],['الصحة العامة','العادات اليومية والنوم والنشاط والتوازن.'],['السلامة','الوقاية والاستجابة للمخاطر اليومية.'],['التحقق من المعلومات','فحص المصدر والمقارنة والبحث عن الدليل.'],['التعلم الذاتي','تحديد الهدف وبناء الخطة وقياس التقدم.']
  ]}
];

const lessons = subjects.flatMap(subject => subject.topics.flatMap((topic, topicIndex) => levels.map(level => ({
  id:`${subject.id}-${String(topicIndex + 1).padStart(2,'0')}-${level.id}`,
  subjectId:subject.id, subject:subject.title, icon:subject.icon, color:subject.color,
  topic:topic[0], title:`${topic[0]} — ${level.title}`, summary:topic[1], level:level.id,
  levelTitle:level.title, xp:level.xp, duration:level.id === 'foundation' ? 10 : level.id === 'practice' ? 16 : 24,
  content:`${level.intro} ${topic[1]}`,
  objectives:[`فهم المفهوم الرئيس في ${topic[0]}.`,`تطبيق الفكرة بمستوى ${level.title}.`,'التحقق من الفهم من خلال نشاط قصير.'],
  activity:level.id === 'foundation' ? `اكتب تعريفًا مبسطًا لموضوع ${topic[0]} مع مثال واحد.` : level.id === 'practice' ? `حل مثالًا تطبيقيًا يوضح ${topic[0]} واشرح خطواتك.` : `حل موقفًا مركبًا يرتبط بـ ${topic[0]} ثم قيّم دقة الحل.`
}))));

let visibleLimit = PAGE_SIZE;
let currentLesson = null;
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);

function readProgress(){ try{return JSON.parse(localStorage.getItem(PROGRESS_KEY))||{completed:[]};}catch{return{completed:[]};} }
function writeProgress(progress){ localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress)); renderStats(); renderLessons(); }
function filteredLessons(){
  const query=$('lessonSearch').value.trim().toLowerCase();
  const subject=$('subjectFilter').value;
  const level=$('levelFilter').value;
  return lessons.filter(lesson => (subject==='all'||lesson.subjectId===subject) && (level==='all'||lesson.level===level) && (!query||`${lesson.title} ${lesson.summary} ${lesson.subject}`.toLowerCase().includes(query)));
}
function renderStats(){
  const progress=readProgress(); const done=progress.completed.length;
  $('subjectCount').textContent=subjects.length.toLocaleString('ar-SA');
  $('lessonCount').textContent=lessons.length.toLocaleString('ar-SA');
  $('completedCount').textContent=done.toLocaleString('ar-SA');
  $('masteryPercent').textContent=`${Math.round(done/lessons.length*100).toLocaleString('ar-SA')}%`;
}
function renderSubjects(){
  $('subjectFilter').innerHTML='<option value="all">كل التخصصات</option>'+subjects.map(s=>`<option value="${s.id}">${escapeHtml(s.title)}</option>`).join('');
  $('subjectGrid').innerHTML=subjects.map(s=>`<button class="subject-card" data-subject="${s.id}" style="--subject:${s.color}"><span>${s.icon}</span><strong>${escapeHtml(s.title)}</strong><small>${(s.topics.length*levels.length).toLocaleString('ar-SA')} درسًا</small><p>${escapeHtml(s.topics[0][1])}</p></button>`).join('');
}
function renderLessons(){
  const progress=readProgress(); const list=filteredLessons(); const shown=list.slice(0,visibleLimit);
  $('visibleLessonCount').textContent=list.length.toLocaleString('ar-SA');
  $('lessonResultText').textContent=list.length?`تم العثور على ${list.length.toLocaleString('ar-SA')} درسًا مطابقًا.`:'لا توجد دروس مطابقة للتصفية الحالية.';
  $('lessonGrid').innerHTML=shown.map(lesson=>{
    const done=progress.completed.includes(lesson.id);
    return `<button class="lesson-card ${done?'completed':''}" data-lesson="${lesson.id}" style="--lesson:${lesson.color}"><div class="lesson-card-head"><span>${lesson.icon}</span><small>${escapeHtml(lesson.subject)}</small></div><strong>${escapeHtml(lesson.title)}</strong><p>${escapeHtml(lesson.summary)}</p><div class="lesson-meta"><span>${lesson.duration} دقيقة</span><span>${lesson.xp} XP</span><span>${done?'✓ مكتمل':escapeHtml(lesson.levelTitle)}</span></div></button>`;
  }).join('')||'<p class="empty-learning">لا توجد نتائج مطابقة.</p>';
  $('loadMoreButton').hidden=shown.length>=list.length;
}
function openLesson(id){
  const lesson=lessons.find(item=>item.id===id); if(!lesson)return; currentLesson=lesson; localStorage.setItem(LAST_KEY,id);
  const done=readProgress().completed.includes(id);
  $('lessonModalContent').innerHTML=`<div class="lesson-modal-icon" style="--lesson:${lesson.color}">${lesson.icon}</div><span class="eyebrow">${escapeHtml(lesson.subject)} • ${escapeHtml(lesson.levelTitle)}</span><h2 id="lessonModalTitle">${escapeHtml(lesson.title)}</h2><p class="lesson-lead">${escapeHtml(lesson.content)}</p><div class="lesson-info"><span>${lesson.duration} دقيقة</span><span>${lesson.xp} XP</span></div><h3>أهداف الدرس</h3><ul>${lesson.objectives.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul><div class="lesson-activity"><strong>نشاط تطبيقي</strong><p>${escapeHtml(lesson.activity)}</p></div><button class="learning-primary complete-lesson" id="completeLessonButton">${done?'تم إكمال الدرس ✓':'اعتماد إكمال الدرس'}</button>`;
  $('lessonModal').hidden=false; document.body.classList.add('modal-open');
}
function closeModal(){ $('lessonModal').hidden=true; document.body.classList.remove('modal-open'); }
function completeCurrent(){
  if(!currentLesson)return; const progress=readProgress();
  if(!progress.completed.includes(currentLesson.id))progress.completed.push(currentLesson.id);
  writeProgress(progress); $('completeLessonButton').textContent='تم إكمال الدرس ✓';
}
function resetAndRender(){visibleLimit=PAGE_SIZE;renderLessons();}

async function boot(){
  renderSubjects(); renderStats(); renderLessons();
  $('subjectGrid').addEventListener('click',event=>{const card=event.target.closest('[data-subject]');if(!card)return;$('subjectFilter').value=card.dataset.subject;resetAndRender();$('lessonSection').scrollIntoView({behavior:'smooth'});});
  $('lessonGrid').addEventListener('click',event=>{const card=event.target.closest('[data-lesson]');if(card)openLesson(card.dataset.lesson);});
  $('lessonSearch').addEventListener('input',resetAndRender); $('subjectFilter').addEventListener('change',resetAndRender); $('levelFilter').addEventListener('change',resetAndRender);
  $('loadMoreButton').addEventListener('click',()=>{visibleLimit+=PAGE_SIZE;renderLessons();});
  $('continueLesson').addEventListener('click',()=>{const id=localStorage.getItem(LAST_KEY);openLesson(id&&lessons.some(l=>l.id===id)?id:lessons[0].id);});
  $('lessonModal').addEventListener('click',event=>{if(event.target.matches('[data-close-modal]'))closeModal();if(event.target.id==='completeLessonButton')completeCurrent();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('lessonModal').hidden)closeModal();});
  try{const session=await ensureAuth();renderAccount(session);}catch(error){if(error.message!=='Authentication required')console.error(error);}finally{$('bootOverlay')?.classList.add('hidden');}
}
boot();
