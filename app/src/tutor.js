import './styles.css';
import './tutor.css';
import { ensureAuth, renderAccount } from './auth.js';

const HISTORY_KEY = 'neonLocalTutorHistoryV2';
const SETTINGS_KEY = 'neonLocalTutorSettingsV1';
const MAX_HISTORY = 80;

const modeMeta = {
  explain: { title:'وضع الشرح', hint:'اكتب المفهوم الذي تريد فهمه.' },
  exercise: { title:'وضع التمرين', hint:'حدد الموضوع وسأنشئ تدريبًا متدرجًا.' },
  plan: { title:'خطة المذاكرة', hint:'اكتب هدفك والمدة المتاحة يوميًا.' },
  review: { title:'مراجعة الإجابة', hint:'الصق السؤال وإجابتك وسأقدم تغذية راجعة.' },
  code: { title:'مراجعة الكود', hint:'الصق HTML أو CSS أو JavaScript للمراجعة.' }
};

const subjectMeta = {
  general: { name:'التعلم العام', icon:'📚', anchors:['الفكرة الرئيسة','المثال','التطبيق','التحقق'] },
  math: { name:'الرياضيات', icon:'∑', anchors:['المعطيات','القاعدة','التعويض','التحقق من الناتج'] },
  physics: { name:'الفيزياء', icon:'⚛️', anchors:['الظاهرة','القانون','الوحدات','التطبيق الواقعي'] },
  chemistry: { name:'الكيمياء', icon:'🧪', anchors:['المادة','التغير','المعادلة','الملاحظة التجريبية'] },
  biology: { name:'الأحياء', icon:'🧬', anchors:['التركيب','الوظيفة','العلاقة','الأثر على الكائن'] },
  arabic: { name:'اللغة العربية', icon:'ض', anchors:['السياق','القاعدة','الشاهد','التطبيق'] },
  english: { name:'اللغة الإنجليزية', icon:'EN', anchors:['meaning','form','example','common mistake'] },
  qudurat: { name:'القدرات', icon:'🎯', anchors:['فهم المطلوب','اختصار المعطيات','استراتيجية الحل','إدارة الوقت'] },
  coding: { name:'البرمجة', icon:'⌨️', anchors:['المطلوب','المنطق','التنفيذ','الاختبار'] }
};

const exerciseBank = {
  general:[
    ['اختر موضوعًا درسته اليوم، ثم لخصه في ثلاث جمل: تعريف، مثال، وفائدة.','تأكد أن الجمل الثلاث لا تكرر الفكرة نفسها.'],
    ['حوّل مفهومًا تعرفه إلى سؤال «لماذا؟» ثم أجب عنه بدليل أو مثال.','الإجابة الجيدة تربط السبب بالنتيجة.']
  ],
  math:[
    ['إذا كان 3x + 7 = 25، فأوجد قيمة x واشرح خطوة التحقق.','اعزل المتغير أولًا، ثم عوض بالقيمة في المعادلة الأصلية.'],
    ['ارتفع سعر منتج من 80 إلى 92 ريالًا. احسب نسبة الزيادة.','احسب مقدار الزيادة ثم اقسمه على السعر الأصلي.']
  ],
  physics:[
    ['قطعت سيارة 150 مترًا خلال 10 ثوانٍ. احسب السرعة المتوسطة واذكر الوحدة.','السرعة = المسافة ÷ الزمن.'],
    ['جسم كتلته 4 كجم تؤثر فيه قوة محصلة 20 نيوتن. احسب تسارعه.','استخدم F = ma.']
  ],
  chemistry:[
    ['صنّف ذوبان الملح في الماء: تغير فيزيائي أم كيميائي؟ علل.','فكر هل تكونت مادة جديدة أم يمكن استرجاع الملح.'],
    ['وازن المعادلة: H₂ + O₂ → H₂O.','اجعل عدد ذرات كل عنصر متساويًا في الطرفين.']
  ],
  biology:[
    ['قارن بين الخلية النباتية والحيوانية في نقطتين مشتركتين ونقطتين مختلفتين.','ركز على الجدار الخلوي والبلاستيدات والفجوة.'],
    ['اشرح مسار الأكسجين من الرئتين إلى خلايا الجسم.','رتب: الحويصلات، الدم، القلب، الأنسجة.']
  ],
  arabic:[
    ['حدد نوع الجملة في: «العلم نور» ثم أعرب الكلمتين.','ابدأ بالمبتدأ ثم الخبر وعلامة الرفع.'],
    ['استخرج الفكرة الرئيسة من فقرة قصيرة، ثم اكتب دليلًا واحدًا عليها.','الفكرة الرئيسة أعم من التفاصيل.']
  ],
  english:[
    ['Choose the correct form: She ___ to school every day. (go / goes / going / went)','Look for the present-simple marker and third-person singular subject.'],
    ['Write two sentences that show the difference between “since” and “for”.','Use since with a starting point and for with a duration.']
  ],
  qudurat:[
    ['عدد إذا زيد عليه 25% أصبح 100، فما العدد الأصلي؟','اعتبر العدد الأصلي 100% والناتج 125%.'],
    ['اختر الكلمة المختلفة: شجرة، زهرة، عشب، حجر. ثم اذكر معيار التصنيف.','ابحث عن الصفة المشتركة بين ثلاثة عناصر.']
  ],
  coding:[
    ['اكتب دالة JavaScript تستقبل مصفوفة أعداد وتعيد مجموع الأعداد الموجبة فقط.','استخدم filter ثم reduce أو حلقة واضحة.'],
    ['أنشئ زر HTML يغير نص فقرة عند الضغط عليه دون استخدام مكتبات.','اربط click listener ثم عدّل textContent.']
  ]
};

let currentMode = 'explain';
let history = readJson(HISTORY_KEY, []);
let activeUserName = 'الطالب';

const messages = document.getElementById('tutorMessages');
const input = document.getElementById('tutorInput');
const form = document.getElementById('tutorForm');

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback; }
  catch { return fallback; }
}
function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* local mode remains usable */ }
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
}
function nowLabel(date = new Date()) {
  return new Intl.DateTimeFormat('ar-SA', { hour:'2-digit', minute:'2-digit' }).format(date);
}
function getSubject() {
  return document.getElementById('tutorSubject').value;
}
function getLevel() {
  return document.getElementById('tutorLevel').value;
}
function levelName(level = getLevel()) {
  return ({ foundation:'تأسيسي', practice:'تطبيقي', mastery:'إتقان' })[level] || 'تطبيقي';
}
function persistSettings() {
  saveJson(SETTINGS_KEY, { subject:getSubject(), level:getLevel(), mode:currentMode });
}
function restoreSettings() {
  const settings = readJson(SETTINGS_KEY, {});
  if (subjectMeta[settings.subject]) document.getElementById('tutorSubject').value = settings.subject;
  if (['foundation','practice','mastery'].includes(settings.level)) document.getElementById('tutorLevel').value = settings.level;
  if (modeMeta[settings.mode]) setMode(settings.mode, false);
}

function renderWelcome() {
  messages.innerHTML = `<div class="tutor-welcome"><span>🧠</span><h2>مرحبًا ${escapeHtml(activeUserName)}</h2><p>أنا المعلم الذكي المحلي. أعمل داخل جهازك، ولا أرسل رسائلك إلى خدمة ذكاء اصطناعي خارجية. اختر المادة والوضع ثم اكتب سؤالك.</p></div>`;
}
function renderHistory() {
  if (!history.length) return renderWelcome();
  messages.innerHTML = history.map(item => `
    <article class="tutor-message ${item.role === 'user' ? 'user' : 'assistant'}">
      <div class="message-meta"><strong>${item.role === 'user' ? 'أنت' : 'المعلم المحلي'}</strong><span>${escapeHtml(item.time || '')}</span></div>
      <div class="message-body">${escapeHtml(item.text)}</div>
    </article>`).join('');
  messages.scrollTop = messages.scrollHeight;
}
function appendMessage(role, text, save = true) {
  if (messages.querySelector('.tutor-welcome')) messages.innerHTML = '';
  const item = { role, text:String(text), time:nowLabel() };
  if (save) {
    history.push(item);
    history = history.slice(-MAX_HISTORY);
    saveJson(HISTORY_KEY, history);
  }
  messages.insertAdjacentHTML('beforeend', `<article class="tutor-message ${role === 'user' ? 'user' : 'assistant'}"><div class="message-meta"><strong>${role === 'user' ? 'أنت' : 'المعلم المحلي'}</strong><span>${escapeHtml(item.time)}</span></div><div class="message-body">${escapeHtml(item.text)}</div></article>`);
  messages.scrollTop = messages.scrollHeight;
}
function showTyping() {
  const holder = document.createElement('article');
  holder.className = 'tutor-message assistant';
  holder.id = 'tutorTyping';
  holder.innerHTML = '<div class="tutor-typing" aria-label="جارٍ إعداد الرد"><i></i><i></i><i></i></div>';
  messages.appendChild(holder);
  messages.scrollTop = messages.scrollHeight;
}

function cleanTopic(text) {
  return String(text).trim().replace(/^(اشرح|وضح|فسر|ما هو|ما هي|أريد شرح|ساعدني في)\s*/i, '').slice(0, 180) || 'الموضوع المطلوب';
}
function explainResponse(text, subject, level) {
  const meta = subjectMeta[subject];
  const topic = cleanTopic(text);
  const depth = level === 'foundation'
    ? 'سأستخدم لغة بسيطة ومثالًا واحدًا مباشرًا.'
    : level === 'mastery'
      ? 'سأربط المفهوم بالتطبيق والتحليل والأخطاء الشائعة.'
      : 'سأجمع بين الفكرة والخطوات ومثال تطبيقي.';
  return `${meta.icon} شرح ${topic} — ${meta.name} (${levelName(level)})

1) الفكرة الأساسية
${topic} يُفهم بصورة أفضل عندما نفككه إلى: ${meta.anchors.join('، ')}.

2) طريقة الفهم
• حدد ما الذي تعرفه مسبقًا عن الموضوع.
• اربط كل مصطلح بوظيفته أو أثره.
• طبّق الفكرة على مثال صغير قبل الانتقال إلى حالة أصعب.
• تحقق من الفهم بشرح الفكرة بكلماتك أنت.

3) مثال مبسط
تخيل موقفًا واقعيًا يحتاج إلى ${meta.anchors[2]}. ابدأ بتحديد ${meta.anchors[0]}، ثم استخدم ${meta.anchors[1]}، وبعدها راجع ${meta.anchors[3]}.

4) سؤال تحقق
كيف تشرح «${topic}» في جملتين دون استخدام النص الأصلي؟

${depth}`;
}
function exerciseResponse(subject, level) {
  const entries = exerciseBank[subject] || exerciseBank.general;
  const index = Math.floor((Date.now() / 1000) % entries.length);
  const [question, hint] = entries[index];
  return `${subjectMeta[subject].icon} تمرين ${subjectMeta[subject].name} — مستوى ${levelName(level)}

السؤال:
${question}

تلميح تدريجي:
${hint}

طريقة العمل:
1. اكتب المعطيات أو الكلمات المفتاحية.
2. حدد القاعدة أو الاستراتيجية المناسبة.
3. نفذ الحل خطوة خطوة.
4. راجع الناتج أو المعنى قبل اعتماده.

أرسل إجابتك بعد الحل، ثم استخدم وضع «راجع إجابتي» للحصول على تقييم مفصل.`;
}
function planResponse(text, subject, level) {
  const minutesMatch = String(text).match(/(\d{2,3})\s*(?:دقيقة|دق|minutes?)/i);
  const daily = Math.min(180, Math.max(20, Number(minutesMatch?.[1] || 45)));
  const days = level === 'foundation' ? 7 : level === 'mastery' ? 10 : 8;
  const learn = Math.round(daily * .38);
  const practice = Math.round(daily * .42);
  const review = daily - learn - practice;
  return `🗓️ خطة ${subjectMeta[subject].name} — ${days} أيام (${daily} دقيقة يوميًا)

التقسيم اليومي:
• ${learn} دقيقة: فهم وشرح المفهوم.
• ${practice} دقيقة: تطبيق وتمارين.
• ${review} دقيقة: مراجعة الأخطاء والتلخيص.

الأيام 1–2: تأسيس المفاهيم والمصطلحات الأساسية.
الأيام 3–4: أمثلة محلولة وتطبيقات متدرجة.
اليوم 5: اختبار قصير دون الرجوع للملاحظات.
اليوم 6: تحليل الأخطاء وإعادة تدريب النقاط الضعيفة.
اليوم 7: محاكاة شاملة وتلخيص صفحة واحدة.
${days > 7 ? `الأيام 8–${days}: مسائل مركبة، سرعة الأداء، واختبار إتقان نهائي.` : ''}

قاعدة المتابعة:
سجل في نهاية كل جلسة: ما أتقنته، ما أخطأت فيه، وما ستراجعه غدًا. لا تنتقل لمفهوم جديد قبل القدرة على شرح الحالي بمثال.`;
}
function reviewResponse(text, subject, level) {
  const length = text.trim().length;
  const hasReason = /(لأن|بسبب|حيث|إذ|therefore|because|so that|=|=>)/i.test(text);
  const hasSteps = /(1[.)]|2[.)]|أول|ثم|بعد ذلك|الخطوة)/i.test(text);
  const score = Math.min(95, 45 + (length > 80 ? 18 : length > 35 ? 10 : 3) + (hasReason ? 17 : 0) + (hasSteps ? 15 : 0));
  return `✅ مراجعة أولية لإجابتك — ${subjectMeta[subject].name}

التقدير المبدئي: ${score}%

نقاط جيدة:
• الإجابة مرتبطة بالموضوع المطلوب.
• ${length > 80 ? 'قدمت تفاصيل كافية تسمح بتتبع الفكرة.' : 'بدأت بإجابة مباشرة دون حشو كبير.'}
• ${hasReason ? 'استخدمت تعليلًا أو ربطًا بين السبب والنتيجة.' : 'يمكن تطوير الإجابة بإضافة تعليل واضح.'}

ما يحتاج تحسينًا:
• ${hasSteps ? 'اجعل كل خطوة مرتبطة بوضوح بالخطوة التي تليها.' : 'رتب الحل أو الفكرة في خطوات قصيرة.'}
• أضف دليلًا، مثالًا، أو عملية تحقق مناسبة للمادة.
• راجع المصطلحات والدقة اللغوية قبل التسليم.

صيغة أقوى مقترحة:
ابدأ بجملة تجيب مباشرة، ثم اذكر القاعدة أو السبب، وبعدها مثالًا أو تطبيقًا، واختم بطريقة تحقق من صحة الإجابة.

ملاحظة: هذه مراجعة محلية بنظام قواعد، وليست تصحيحًا رسميًا من المعلم.`;
}
function codeResponse(text) {
  const code = String(text);
  const notes = [];
  if (!/[<>{};=]/.test(code)) notes.push('لم أتعرف على مقطع كود واضح؛ الصق الكود كاملًا داخل الرسالة.');
  if (/innerHTML\s*=/.test(code)) notes.push('استخدام innerHTML مع نص قادم من المستخدم قد يسبب حقن HTML؛ استخدم textContent أو نظّف المدخلات.');
  if (/eval\s*\(/.test(code)) notes.push('تجنب eval لأنها تنفذ نصًا ككود وتزيد المخاطر الأمنية.');
  if (/var\s+/.test(code)) notes.push('يمكن استبدال var بـ const أو let لتقليل تغيّر النطاق غير المقصود.');
  if (/console\.log/.test(code)) notes.push('احذف رسائل console التجريبية أو اجعلها خلف وضع التطوير قبل الإنتاج.');
  if (/catch\s*\([^)]*\)\s*\{\s*\}/s.test(code)) notes.push('يوجد catch فارغ؛ أظهر رسالة مفيدة أو سجل الخطأ بطريقة آمنة.');
  if (/<img(?![^>]*\balt=)/i.test(code)) notes.push('أضف alt للصور لتحسين الوصول.');
  if (/<button(?![^>]*\btype=)/i.test(code)) notes.push('حدد type="button" للأزرار غير المخصصة لإرسال نموذج.');
  if (/fetch\s*\(/.test(code) && !/\.ok\b/.test(code)) notes.push('تحقق من response.ok قبل تحليل استجابة fetch.');
  if (!notes.length) notes.push('لم أجد نمطًا خطيرًا واضحًا في الفحص السريع. راجع منطق الحالات الحدية واختبر المدخلات غير المتوقعة.');
  const lineCount = code.split('\n').length;
  return `⌨️ مراجعة كود محلية

ملخص:
• عدد الأسطر: ${lineCount}
• نوع المراجعة: أمان، وضوح، وصول، ومعالجة أخطاء.

الملاحظات:
${notes.map((note, index) => `${index + 1}. ${note}`).join('\n')}

قائمة اختبار قبل الاعتماد:
• اختبر القيم الفارغة وغير الصحيحة.
• تجنب إدخال بيانات المستخدم مباشرة في HTML.
• أضف رسائل خطأ مفهومة.
• افصل الوظائف الطويلة إلى وحدات صغيرة.
• تحقق من عمل الواجهة بلوحة المفاتيح والجوال.

هذه مراجعة ثابتة محلية ولا تشغّل الكود المرسل.`;
}
function buildResponse(text) {
  const subject = getSubject();
  const level = getLevel();
  if (currentMode === 'exercise') return exerciseResponse(subject, level);
  if (currentMode === 'plan') return planResponse(text, subject, level);
  if (currentMode === 'review') return reviewResponse(text, subject, level);
  if (currentMode === 'code') return codeResponse(text);
  return explainResponse(text, subject, level);
}

function setMode(mode, persist = true) {
  if (!modeMeta[mode]) return;
  currentMode = mode;
  document.querySelectorAll('[data-mode]').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
  document.getElementById('tutorModeTitle').textContent = modeMeta[mode].title;
  document.getElementById('tutorModeHint').textContent = modeMeta[mode].hint;
  input.placeholder = mode === 'code' ? 'الصق الكود هنا للمراجعة…' : mode === 'review' ? 'الصق السؤال ثم إجابتك…' : 'اكتب سؤالك هنا…';
  if (persist) persistSettings();
}

async function handleSubmit(event) {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  appendMessage('user', text);
  input.value = '';
  document.getElementById('tutorCharCount').textContent = '0';
  document.getElementById('sendTutorMessage').disabled = true;
  showTyping();
  await new Promise(resolve => setTimeout(resolve, Math.min(800, 250 + text.length * 2)));
  document.getElementById('tutorTyping')?.remove();
  appendMessage('assistant', buildResponse(text));
  document.getElementById('sendTutorMessage').disabled = false;
  input.focus();
}

function newChat() {
  history = [];
  saveJson(HISTORY_KEY, history);
  renderWelcome();
  input.focus();
}

async function boot() {
  restoreSettings();
  try {
    const session = await ensureAuth();
    renderAccount(session);
    activeUserName = session.profile?.academy?.name || session.profile?.name || session.user?.displayName || 'الطالب';
  } catch (error) {
    if (error.message !== 'Authentication required') console.warn('Tutor auth:', error);
  }
  renderHistory();
  document.getElementById('bootOverlay')?.classList.add('hidden');
}

document.getElementById('tutorModes').addEventListener('click', event => {
  const button = event.target.closest('[data-mode]');
  if (button) setMode(button.dataset.mode);
});
document.getElementById('tutorSubject').addEventListener('change', persistSettings);
document.getElementById('tutorLevel').addEventListener('change', persistSettings);
document.getElementById('tutorQuickPrompts').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  input.value = button.textContent.trim();
  input.dispatchEvent(new Event('input'));
  input.focus();
});
input.addEventListener('input', () => document.getElementById('tutorCharCount').textContent = String(input.value.length));
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
form.addEventListener('submit', handleSubmit);
document.getElementById('newTutorChat').addEventListener('click', newChat);
document.getElementById('clearTutorHistory').addEventListener('click', () => {
  if (confirm('حذف جميع محادثات المعلم الذكي المحفوظة على هذا الجهاز؟')) newChat();
});

boot();
