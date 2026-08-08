import './styles.css';
import './games.css';
import { ensureAuth, renderAccount } from './auth.js';

const PROGRESS_KEY = 'neonGamesProgressV1';

const tracks = [
  { id:'puzzles', title:'ألغاز متنوعة', icon:'🧩', color:'#a56cff', description:'منطق، حساب، كلمات، استنتاج وأنماط.', modules:['ألغاز منطق','ألغاز خادعة','ألغاز حساب','ألغاز كلمات','ألغاز ترتيب','ألغاز استنتاج','ألغاز زمن','ألغاز تحقيق','ألغاز رموز','ألغاز صور','تحدي صعب','تحدي النخبة'] },
  { id:'escape', title:'غرف الهروب', icon:'🚪', color:'#ff6dbc', description:'مهمات مترابطة وحلول سريعة تحت الضغط.', modules:['غرفة المختبر','المكتبة السرية','المحطة الفضائية','القلعة القديمة','الخزنة الرقمية','المتحف الليلي','المدينة الضائعة','القطار الأخير','جزيرة الرموز','مختبر الروبوت','الممر الزمني','الغرفة 2060'] },
  { id:'daily', title:'التحديات اليومية', icon:'🔥', color:'#ff9966', description:'تحديات قصيرة تتجدد وتبني سلسلة إنجاز.', modules:['تحدي اليوم','سلسلة 3 أيام','سلسلة أسبوع','سرعة الإجابة','بدون تلميح','ثلاث نجوم','تحدي المعرفة','تحدي الرياضيات','تحدي اللغة','تحدي البرمجة','تحدي الأصدقاء','تحدي الشهر'] },
  { id:'competitions', title:'المسابقات', icon:'🏅', color:'#ffd46e', description:'جولات متعددة لقياس الدقة والسرعة.', modules:['مسابقة المبتدئين','مسابقة العائلة','مسابقة المدارس','مسابقة المعرفة','مسابقة العلوم','مسابقة الرياضيات','مسابقة اللغات','مسابقة التقنية','مسابقة السرعة','مسابقة الدقة','كأس الأسبوع','كأس المكتبة'] },
  { id:'tournaments', title:'البطولات', icon:'🏆', color:'#63f2a9', description:'اختبارات مركبة بمستويات أعلى وتحديات نهائية.', modules:['بطولة 5 جولات','بطولة 10 جولات','بطولة اللفظي','بطولة الكمي','بطولة المعرفة','بطولة الألغاز','بطولة البرمجة','بطولة السرعة','بطولة الإتقان','بطولة المتقدمين','بطولة الأساتذة','بطولة 2060'] },
  { id:'intelligence', title:'ألعاب الذكاء', icon:'🧠', color:'#67edff', description:'ذاكرة، انتباه، تسلسل، مقارنة وتخطيط.', modules:['الذاكرة','الانتباه','التسلسل','التصنيف','المقارنة','التخطيط','حل المتاهة','تتبع النمط','سرعة الملاحظة','الاستدلال','التفكير المكاني','اختبار الذكاء المركب'] }
];

const puzzles = [
  { cat:'logic', q:'رجل ينظر إلى صورة ويقول: ليس لي أخ أو أخت، لكن والد هذا الرجل هو ابن أبي. من في الصورة؟', options:['والده','ابنه','عمه','نفسه'], answer:1, explain:'ابن أبي هو الرجل نفسه، إذن والد الشخص في الصورة هو الرجل، والشخص ابنه.' },
  { cat:'logic', q:'في غرفة ثلاثة مصابيح وخارجها ثلاثة مفاتيح. يمكنك دخول الغرفة مرة واحدة فقط. كيف تعرف مفتاح كل مصباح؟', options:['تشغيلها كلها','تشغيل الأول ثم الثاني','تشغيل الأول مدة ثم إطفاؤه وتشغيل الثاني','لا يمكن'], answer:2, explain:'المضاء للثاني، الدافئ للأول، والبارد للثالث.' },
  { cat:'tricky', q:'ما الشيء الذي كلما أخذت منه كبر؟', options:['العمر','الحفرة','المال','الظل'], answer:1, explain:'كلما أزلت ترابًا من الحفرة اتسعت.' },
  { cat:'tricky', q:'شيء له أسنان ولا يعض، ما هو؟', options:['المنشار','المشط','التمساح','المفتاح'], answer:1, explain:'للمشط أسنان لكنه لا يعض.' },
  { cat:'math', q:'عدد إذا ضربته في نفسه ثم أضفت إليه نفسه كان الناتج 30. ما العدد الموجب؟', options:['4','5','6','10'], answer:1, explain:'5×5 + 5 = 30.' },
  { cat:'math', q:'لديك 3 صناديق، في كل صندوق 4 أكياس، وفي كل كيس 5 كرات. كم كرة؟', options:['12','20','45','60'], answer:3, explain:'3 × 4 × 5 = 60.' },
  { cat:'math', q:'ساعة تتأخر دقيقتين كل ساعة. كم دقيقة تتأخر بعد 8 ساعات؟', options:['8','10','16','20'], answer:2, explain:'2 × 8 = 16 دقيقة.' },
  { cat:'words', q:'أي كلمة لا تنتمي للمجموعة: كتاب، مجلة، صحيفة، قلم؟', options:['كتاب','مجلة','صحيفة','قلم'], answer:3, explain:'الثلاثة الأولى مواد مقروءة، أما القلم أداة كتابة.' },
  { cat:'words', q:'أكمل العلاقة: طبيب : مستشفى، معلم : ؟', options:['مكتبة','مدرسة','صيدلية','مصنع'], answer:1, explain:'مكان عمل المعلم المعتاد هو المدرسة.' },
  { cat:'sequence', q:'ما العدد التالي: 2، 6، 12، 20، 30، ؟', options:['36','40','42','44'], answer:2, explain:'الفروق 4، 6، 8، 10 ثم 12؛ إذن 42.' },
  { cat:'sequence', q:'ما الحرف التالي: أ، ج، هـ، ز، ؟', options:['ح','ط','ي','ك'], answer:1, explain:'الانتقال حرفان كل مرة: أ ثم ج ثم هـ ثم ز ثم ط.' },
  { cat:'sequence', q:'أكمل: 81، 27، 9، 3، ؟', options:['0','1','2','6'], answer:1, explain:'كل عدد يساوي السابق مقسومًا على 3.' },
  { cat:'deduction', q:'كل الصقور طيور، وبعض الطيور لا تطير. أي عبارة مؤكدة؟', options:['كل الطيور صقور','بعض الصقور لا تطير','الصقور طيور','لا شيء مما سبق'], answer:2, explain:'العبارة الأولى في السؤال تؤكد أن الصقور طيور.' },
  { cat:'deduction', q:'أحمد أطول من سالم، وسالم أطول من فهد. من الأقصر؟', options:['أحمد','سالم','فهد','لا يمكن'], answer:2, explain:'فهد أقصر من سالم، وسالم أقصر من أحمد.' },
  { cat:'deduction', q:'إذا كان اليوم ليس الأحد ولا الاثنين، وغدًا الخميس، فما اليوم؟', options:['الثلاثاء','الأربعاء','الخميس','الجمعة'], answer:1, explain:'اليوم السابق للخميس هو الأربعاء.' },
  { cat:'attention', q:'كم مرة يظهر الرقم 7 في العدد 77170727؟', options:['3','4','5','6'], answer:2, explain:'يظهر الرقم 7 خمس مرات.' },
  { cat:'attention', q:'اختر الرمز المختلف: ◆ ◆ ◆ ◇ ◆', options:['الأول','الثاني','الرابع','الخامس'], answer:2, explain:'الرابع فارغ من الداخل بينما البقية ممتلئة.' },
  { cat:'memory', q:'احفظ الترتيب: قمر، مفتاح، شجرة، كتاب. ما العنصر الثالث؟', options:['قمر','مفتاح','شجرة','كتاب'], answer:2, explain:'العنصر الثالث هو شجرة.' },
  { cat:'logic', q:'خمسة أشخاص يتصافح كل واحد منهم مع كل الآخرين مرة واحدة. كم مصافحة؟', options:['5','10','15','20'], answer:1, explain:'عدد الأزواج = 5×4÷2 = 10.' },
  { cat:'math', q:'إذا كان نصف عدد يساوي 18، فما ربعه؟', options:['6','9','12','36'], answer:1, explain:'العدد 36 وربعه 9.' },
  { cat:'tricky', q:'أي شهر فيه 28 يومًا؟', options:['فبراير فقط','يناير فقط','كل الشهور','لا شهر'], answer:2, explain:'كل الشهور تحتوي على 28 يومًا على الأقل.' },
  { cat:'words', q:'ما الكلمة التي تصبح أقصر إذا أضفت إليها حرفًا؟', options:['قصير','قصر','أقصر','طويل'], answer:1, explain:'إضافة الهمزة إلى «قصر» تجعلها «أقصر».' },
  { cat:'sequence', q:'ما العدد التالي: 1، 1، 2، 3، 5، 8، ؟', options:['11','12','13','16'], answer:2, explain:'كل حد يساوي مجموع الحدين السابقين.' },
  { cat:'deduction', q:'ثلاثة صناديق مكتوب عليها تفاح، برتقال، مختلط، وكل الملصقات خاطئة. من أي صندوق تسحب أولًا؟', options:['تفاح','برتقال','مختلط','أي صندوق'], answer:2, explain:'صندوق «مختلط» لا يمكن أن يكون مختلطًا، وسحب ثمرة منه يكشف محتواه ويحدد البقية.' }
];

const trackCategories = {
  puzzles:['logic','tricky','math','words','sequence','deduction'],
  escape:['logic','deduction','sequence'],
  daily:['logic','tricky','math','words','sequence','deduction','attention','memory'],
  competitions:['logic','math','words','sequence','attention'],
  tournaments:['logic','math','sequence','deduction'],
  intelligence:['logic','sequence','deduction','attention','memory']
};

let selectedTrack = tracks[0];
let currentModule = '';
let session = null;
let timerId = null;

const trackGrid = document.getElementById('gameTrackGrid');
const modulesSection = document.getElementById('gameModules');
const moduleGrid = document.getElementById('gameModuleGrid');
const runner = document.getElementById('gameRunner');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
}

function shuffle(values, seed = Math.random()) {
  const result = [...values];
  let state = Math.floor(seed * 2147483647) || 1;
  const random = () => ((state = state * 48271 % 2147483647) - 1) / 2147483646;
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function readProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || { played:0, best:0, completed:[] }; }
  catch { return { played:0, best:0, completed:[] }; }
}

function writeProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  renderStats(progress);
}

function renderStats(progress = readProgress()) {
  document.getElementById('gamesPlayed').textContent = Number(progress.played || 0).toLocaleString('ar-SA');
  document.getElementById('gamesBest').textContent = `${Number(progress.best || 0).toLocaleString('ar-SA')}%`;
}

function renderTracks() {
  trackGrid.innerHTML = tracks.map(track => `
    <button class="game-track-card" data-track="${track.id}" style="--track:${track.color}">
      <span class="game-track-icon">${track.icon}</span>
      <small>12 تحديًا</small>
      <strong>${escapeHtml(track.title)}</strong>
      <p>${escapeHtml(track.description)}</p>
      <b>فتح المسار ←</b>
    </button>
  `).join('');
}

function selectTrack(trackId) {
  selectedTrack = tracks.find(track => track.id === trackId) || tracks[0];
  document.querySelectorAll('.game-track-card').forEach(card => card.classList.toggle('selected', card.dataset.track === selectedTrack.id));
  document.getElementById('moduleTitle').textContent = selectedTrack.title;
  document.getElementById('moduleDescription').textContent = selectedTrack.description;
  document.getElementById('moduleEyebrow').textContent = `${selectedTrack.id.toUpperCase()} CHALLENGES`;
  document.getElementById('moduleSearch').value = '';
  renderModules('');
  modulesSection.hidden = false;
  modulesSection.scrollIntoView({ behavior:'smooth', block:'start' });
}

function renderModules(query = '') {
  const progress = readProgress();
  const normalized = query.trim().toLowerCase();
  const modules = selectedTrack.modules.filter(module => module.toLowerCase().includes(normalized));
  moduleGrid.innerHTML = modules.map((module, index) => {
    const key = `${selectedTrack.id}:${module}`;
    const done = progress.completed.includes(key);
    return `
      <button class="game-module-card ${done ? 'completed' : ''}" data-module="${escapeHtml(module)}">
        <span>${String(index + 1).padStart(2, '0')}</span>
        <strong>${escapeHtml(module)}</strong>
        <small>${done ? '✓ مكتمل' : `${8 + index} دقائق • ${35 + index * 3} XP`}</small>
      </button>
    `;
  }).join('') || '<p class="empty-games">لا توجد نتائج مطابقة.</p>';
}

function buildSession(track, module, daily = false) {
  const categories = trackCategories[track.id] || trackCategories.daily;
  const pool = puzzles.filter(item => categories.includes(item.cat));
  const daySeed = daily ? Number(new Date().toISOString().slice(0,10).replaceAll('-','')) / 99999999 : Math.random();
  const count = track.id === 'tournaments' ? 8 : 5;
  return {
    track,
    module,
    questions: shuffle(pool, daySeed).slice(0, Math.min(count, pool.length)),
    index:0,
    correct:0,
    remaining:track.id === 'tournaments' ? 150 : 90,
    answered:false
  };
}

function startGame(track = selectedTrack, module = 'تحدي سريع', daily = false) {
  clearInterval(timerId);
  currentModule = module;
  session = buildSession(track, module, daily);
  modulesSection.hidden = true;
  runner.hidden = false;
  renderQuestion();
  timerId = setInterval(() => {
    session.remaining -= 1;
    updateTimer();
    if (session.remaining <= 0) finishGame();
  }, 1000);
  runner.scrollIntoView({ behavior:'smooth', block:'start' });
}

function updateTimer() {
  const timer = document.getElementById('gameTimer');
  if (!timer || !session) return;
  const minutes = Math.floor(session.remaining / 60);
  const seconds = String(session.remaining % 60).padStart(2, '0');
  timer.textContent = `${minutes}:${seconds}`;
}

function renderQuestion() {
  if (!session || session.index >= session.questions.length) return finishGame();
  session.answered = false;
  const question = session.questions[session.index];
  const progress = Math.round((session.index / session.questions.length) * 100);
  runner.innerHTML = `
    <div class="game-runner-head">
      <div><small>${escapeHtml(session.track.title)}</small><strong>${escapeHtml(session.module)}</strong></div>
      <time id="gameTimer"></time>
    </div>
    <div class="game-progress"><span style="width:${progress}%"></span></div>
    <div class="game-counter">السؤال ${session.index + 1} من ${session.questions.length}</div>
    <h2>${escapeHtml(question.q)}</h2>
    <div class="game-options">${question.options.map((option,index) => `<button data-answer="${index}"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>`).join('')}</div>
    <div class="game-feedback" id="gameFeedback" hidden></div>
  `;
  updateTimer();
}

function answerQuestion(answerIndex) {
  if (!session || session.answered) return;
  session.answered = true;
  const question = session.questions[session.index];
  const correct = answerIndex === question.answer;
  if (correct) session.correct += 1;
  document.querySelectorAll('.game-options button').forEach((button,index) => {
    button.disabled = true;
    if (index === question.answer) button.classList.add('correct');
    else if (index === answerIndex) button.classList.add('wrong');
  });
  const feedback = document.getElementById('gameFeedback');
  feedback.hidden = false;
  feedback.innerHTML = `<strong>${correct ? 'إجابة صحيحة ✓' : 'إجابة غير صحيحة'}</strong><p>${escapeHtml(question.explain)}</p><button id="nextGameQuestion">${session.index + 1 === session.questions.length ? 'عرض النتيجة' : 'السؤال التالي'}</button>`;
}

function finishGame() {
  clearInterval(timerId);
  if (!session) return;
  const percent = Math.round((session.correct / session.questions.length) * 100);
  const progress = readProgress();
  progress.played = Number(progress.played || 0) + 1;
  progress.best = Math.max(Number(progress.best || 0), percent);
  const key = `${session.track.id}:${session.module}`;
  if (percent >= 60 && !progress.completed.includes(key)) progress.completed.push(key);
  writeProgress(progress);
  runner.innerHTML = `
    <div class="game-result">
      <span class="result-icon">${percent >= 80 ? '🏆' : percent >= 60 ? '⭐' : '🧠'}</span>
      <small>${escapeHtml(session.track.title)}</small>
      <h2>${escapeHtml(session.module)}</h2>
      <strong>${percent}%</strong>
      <p>أجبت عن ${session.correct} من ${session.questions.length} إجابات صحيحة.</p>
      <div><button class="game-primary" id="replayGame">إعادة التحدي</button><button class="game-secondary" id="backToModules">العودة للمسار</button></div>
    </div>
  `;
}

trackGrid.addEventListener('click', event => {
  const card = event.target.closest('[data-track]');
  if (card) selectTrack(card.dataset.track);
});

moduleGrid.addEventListener('click', event => {
  const card = event.target.closest('[data-module]');
  if (card) startGame(selectedTrack, card.dataset.module);
});

document.getElementById('moduleSearch').addEventListener('input', event => renderModules(event.target.value));
document.getElementById('dailyChallengeButton').addEventListener('click', () => startGame(tracks.find(track => track.id === 'daily'), 'تحدي اليوم', true));

runner.addEventListener('click', event => {
  const answer = event.target.closest('[data-answer]');
  if (answer) answerQuestion(Number(answer.dataset.answer));
  if (event.target.closest('#nextGameQuestion')) {
    session.index += 1;
    renderQuestion();
  }
  if (event.target.closest('#replayGame')) startGame(session.track, currentModule);
  if (event.target.closest('#backToModules')) {
    runner.hidden = true;
    modulesSection.hidden = false;
    renderModules();
    modulesSection.scrollIntoView({ behavior:'smooth', block:'start' });
  }
});

async function boot() {
  renderTracks();
  renderStats();
  document.getElementById('bootOverlay')?.classList.add('hidden');
  ensureAuth().then(renderAccount).catch(error => {
    if (error.message !== 'Authentication required') console.warn('Games auth:', error);
  });
}

boot();
