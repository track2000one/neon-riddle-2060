const question = (prompt, choices, answer, explain = '', visual = '') => ({ prompt, choices, answer, explain, visual });

const QUIZ_BANKS = {
  'word-rocket': [
    question('رتّب الحروف لتكوين كلمة صحيحة: ب ـ ا ـ ت ـ ك', ['كتاب', 'كابت', 'باتك', 'تباك'], 0, 'الكلمة الصحيحة هي «كتاب».', '📚'),
    question('أي كلمة تبدأ بحرف «م»؟', ['شمس', 'موز', 'قمر', 'باب'], 1, 'موز تبدأ بحرف الميم.', '🍌'),
    question('اختر الكلمة المناسبة للصورة.', ['طائرة', 'سيارة', 'قارب', 'قطار'], 0, 'هذه طائرة.', '✈️'),
    question('ما جمع كلمة «كتاب»؟', ['كاتب', 'مكتبة', 'كتب', 'كتابة'], 2, 'جمع كتاب هو كتب.', '📖'),
    question('أي كلمة مكتوبة إملائيًا بصورة صحيحة؟', ['مدرسه', 'مدرسة', 'مدرصة', 'مدرسا'], 1, 'تكتب الكلمة بتاء مربوطة: مدرسة.', '🏫')
  ],
  'puzzle-planet': [
    question('لدى سارة ثلاث تفاحات، أعطت واحدة لأختها. كم بقي؟', ['1', '2', '3', '4'], 1, '3 − 1 = 2.', '🍎'),
    question('ما الشكل الذي يكمل النمط؟ ★ ○ ★ ○ ...', ['★', '□', '△', '○'], 0, 'النمط يتناوب بين النجمة والدائرة.'),
    question('كل الطيور لها أجنحة، والعصفور طائر. ماذا نستنتج؟', ['العصفور يسبح', 'للعصفور أجنحة', 'العصفور سمكة', 'لا شيء'], 1, 'لأن العصفور طائر فهو يملك أجنحة.', '🐦'),
    question('أي عنصر لا ينتمي إلى المجموعة؟', ['قلم', 'دفتر', 'كتاب', 'تفاحة'], 3, 'التفاحة طعام، والبقية أدوات تعلم.'),
    question('إذا كان اليوم الثلاثاء، فما اليوم بعد يومين؟', ['الأربعاء', 'الخميس', 'الجمعة', 'الأحد'], 1, 'بعد الثلاثاء: الأربعاء ثم الخميس.', '🗓️')
  ],
  'letter-lab': [
    question('ما الحرف الأول في كلمة «أسد»؟', ['أ', 'س', 'د', 'ل'], 0, 'تبدأ كلمة أسد بحرف الألف.', '🦁'),
    question('أي كلمة تنتهي بحرف «ب»؟', ['باب', 'قلم', 'بيت', 'سمك'], 0, 'باب تنتهي بحرف الباء.'),
    question('اختر الحرف الناقص: مـ ـرسة', ['د', 'ر', 'ب', 'س'], 0, 'الكلمة هي مدرسة.', '🏫'),
    question('أي كلمتين تبدآن بالحرف نفسه؟', ['قمر وقلم', 'شمس وبيت', 'ورد وموز', 'باب وتفاح'], 0, 'قمر وقلم تبدآن بحرف القاف.'),
    question('أي حرف يأتي بعد «ج»؟', ['ب', 'ح', 'خ', 'د'], 1, 'ترتيب الحروف: ج ثم ح.', '🔤')
  ],
  'color-quest': [
    question('اختر اللون المطابق للتفاحة.', ['🔵 أزرق', '🔴 أحمر', '🟢 أخضر', '🟣 بنفسجي'], 1, 'التفاحة هنا حمراء.', '🍎'),
    question('ما اللون الناتج عن مزج الأزرق والأصفر؟', ['أخضر', 'برتقالي', 'بنفسجي', 'أحمر'], 0, 'الأزرق مع الأصفر ينتج الأخضر.', '🎨'),
    question('أي لون يطابق الشمس غالبًا؟', ['أصفر', 'أسود', 'بنفسجي', 'رمادي'], 0, 'ترسم الشمس غالبًا باللون الأصفر.', '☀️'),
    question('اختر العنصر الأخضر.', ['🍓', '🥦', '🍊', '🍇'], 1, 'البروكلي أخضر.'),
    question('ما اللون الناتج عن مزج الأحمر والأصفر؟', ['برتقالي', 'أخضر', 'أزرق', 'بني'], 0, 'الأحمر مع الأصفر ينتج البرتقالي.')
  ],
  'shape-city': [
    question('أي شكل له ثلاثة أضلاع؟', ['الدائرة', 'المثلث', 'المربع', 'المستطيل'], 1, 'المثلث له ثلاثة أضلاع.', '🔺'),
    question('أي شكل لا يحتوي على زوايا؟', ['الدائرة', 'المربع', 'المثلث', 'المعين'], 0, 'الدائرة بلا زوايا.', '⭕'),
    question('كم ضلعًا للمربع؟', ['2', '3', '4', '5'], 2, 'للمربع أربعة أضلاع متساوية.', '⬜'),
    question('أي شكل يشبه باب المنزل؟', ['دائرة', 'مستطيل', 'مثلث', 'نجمة'], 1, 'الباب غالبًا مستطيل.'),
    question('أي مجسم يشبه الكرة؟', ['مكعب', 'أسطوانة', 'كرة', 'هرم'], 2, 'المجسم الكروي يشبه الكرة.', '⚽')
  ],
  'animal-explorer': [
    question('أين يعيش الجمل غالبًا؟', ['المحيط', 'الصحراء', 'القطب', 'الغابة المطيرة'], 1, 'الجمل متكيف مع البيئة الصحراوية.', '🐪'),
    question('أي حيوان يعيش في الماء؟', ['دلفين', 'قطة', 'حصان', 'أرنب'], 0, 'الدلفين حيوان بحري.', '🐬'),
    question('ما غذاء الباندا الأساسي؟', ['العشب البحري', 'الخيزران', 'اللحوم', 'الحبوب'], 1, 'يتغذى الباندا أساسًا على الخيزران.', '🐼'),
    question('أي حيوان يبيض؟', ['الدجاجة', 'القطة', 'الحصان', 'الدلفين'], 0, 'الدجاجة من الطيور وتبيض.', '🐔'),
    question('ما الحيوان المعروف بملك الغابة؟', ['الفيل', 'الأسد', 'الزرافة', 'القرد'], 1, 'الأسد يُلقب بملك الغابة.', '🦁')
  ],
  'code-sprouts': [
    question('الروبوت أمامه الهدف مباشرة. ما الأمر المناسب؟', ['تقدّم', 'استدر يمينًا', 'استدر يسارًا', 'توقف'], 0, 'يكفي أمر التقدم للوصول.', '🤖 ➡️ 🎯'),
    question('ما معنى تكرار الأمر ثلاث مرات؟', ['تنفيذه مرة', 'تنفيذه 3 مرات', 'حذفه', 'إيقاف البرنامج'], 1, 'التكرار يعيد تنفيذ الأمر بالعدد المحدد.'),
    question('الروبوت متجه للأعلى والهدف على يمينه. ماذا يفعل أولًا؟', ['يتقدم', 'يستدير يمينًا', 'يستدير يسارًا', 'يقفز'], 1, 'يجب أن يستدير نحو الهدف أولًا.'),
    question('ما الخطأ البرمجي؟', ['تعليمة غير صحيحة في التسلسل', 'صورة جميلة', 'لون الروبوت', 'اسم اللعبة'], 0, 'الخطأ البرمجي خلل في التعليمات أو ترتيبها.'),
    question('أي تسلسل يصل إلى هدف يبعد خطوتين؟', ['تقدم، تقدم', 'يمين، يسار', 'توقف، توقف', 'يسار، يسار'], 0, 'خطوتان للأمام تصلان إلى الهدف.')
  ],
  'treasure-speller': [
    question('اختر التهجئة الصحيحة.', ['حديقه', 'حديقة', 'حضيقة', 'حديقا'], 1, 'الكتابة الصحيحة: حديقة.', '🌳'),
    question('رتب الحروف: ز ـ ن ـ ك', ['كنز', 'نكز', 'زنك', 'كزن'], 0, 'الكلمة هي كنز.', '💎'),
    question('أي كلمة تحتوي على حرفين متشابهين؟', ['مدرسة', 'تفاحة', 'معلّم', 'طريق'], 2, 'كلمة معلّم تحتوي على لام مشددة.'),
    question('أكمل: مـفـ ـاح', ['ت', 'س', 'ر', 'ن'], 0, 'الكلمة هي مفتاح.', '🔑'),
    question('اختر الكلمة التي تصف الصورة.', ['خريطة', 'ساعة', 'شجرة', 'نافذة'], 0, 'هذه خريطة.', '🗺️')
  ],
  'science-spark': [
    question('ماذا يحتاج النبات لينمو؟', ['الماء والضوء', 'الحجارة فقط', 'الظلام فقط', 'البلاستيك'], 0, 'يحتاج النبات إلى الماء والضوء والهواء.', '🌱'),
    question('أي مادة تنجذب إلى المغناطيس؟', ['الحديد', 'الخشب', 'الورق', 'الزجاج'], 0, 'الحديد ينجذب إلى المغناطيس.', '🧲'),
    question('ماذا يحدث للماء عند التجمّد؟', ['يتحول إلى ثلج', 'يتحول إلى نار', 'يختفي', 'يتحول إلى رمل'], 0, 'الماء المتجمد يصبح ثلجًا.', '🧊'),
    question('أي عضو نستخدمه للتنفس؟', ['الرئتان', 'المعدة', 'العظام', 'الجلد فقط'], 0, 'الرئتان هما العضوان الرئيسيان للتنفس.', '🫁'),
    question('ما مصدر الضوء الطبيعي نهارًا؟', ['الشمس', 'القمر', 'المصباح', 'المرآة'], 0, 'الشمس مصدر الضوء الطبيعي الأساسي.', '☀️')
  ],
  'safe-street-hero': [
    question('قبل عبور الطريق، ماذا تفعل؟', ['أنظر يمينًا ويسارًا', 'أجري مباشرة', 'أنظر للهاتف', 'ألعب في الطريق'], 0, 'يجب التأكد من خلو الطريق والعبور من المكان المخصص.', '🚦'),
    question('أين نعبر الطريق بأمان؟', ['ممر المشاة', 'بين السيارات', 'منعطف الطريق', 'أي مكان'], 0, 'ممر المشاة هو المكان الآمن المخصص.'),
    question('ما معنى الضوء الأحمر؟', ['قف', 'اعبر بسرعة', 'العب', 'لا معنى له'], 0, 'الضوء الأحمر يعني التوقف.'),
    question('أين يجلس الطفل في السيارة؟', ['في المقعد المناسب مع الحزام', 'دون حزام', 'في صندوق السيارة', 'واقفًا'], 0, 'المقعد المناسب والحزام يحميان الطفل.'),
    question('إذا سقطت الكرة في الطريق، ماذا تفعل؟', ['أطلب مساعدة بالغ', 'أجري خلفها', 'أقف وسط الطريق', 'أتجاهل السيارات'], 0, 'لا ندخل الطريق فجأة، بل نطلب مساعدة بالغ.')
  ],
  'emotion-detective': [
    question('فقد صديقك لعبته المفضلة. كيف يشعر غالبًا؟', ['حزين', 'متحمس', 'فخور', 'نعسان'], 0, 'فقدان شيء محبوب قد يسبب الحزن.', '😢'),
    question('نجحت زميلتك في مهمة صعبة. ما الاستجابة اللطيفة؟', ['أبارك لها', 'أسخر منها', 'أتجاهلها', 'أفسد عملها'], 0, 'التهنئة تعبر عن الدعم واللطف.', '🎉'),
    question('شخص غاضب، ما التصرف المناسب؟', ['أتحدث بهدوء وأمنحه مساحة', 'أصرخ عليه', 'أدفعه', 'أضحك عليه'], 0, 'الهدوء واحترام المساحة يساعدان.'),
    question('كيف نُظهر التعاطف؟', ['نستمع ونحاول فهم شعور الآخر', 'نقاطع دائمًا', 'نسخر', 'نرفض الكلام'], 0, 'الاستماع والفهم أساس التعاطف.'),
    question('طفل جديد يشعر بالخجل. ماذا تفعل؟', ['أرحب به وأدعوه للعب', 'أتركه وحده دائمًا', 'أضحك عليه', 'آخذ أغراضه'], 0, 'الترحيب يساعده على الشعور بالأمان.', '🤝')
  ],
  'robot-rescue': [
    question('الروبوت يحتاج بطارية قبل فتح الباب. ما الترتيب الصحيح؟', ['اجمع البطارية ثم افتح الباب', 'افتح الباب ثم ابحث', 'توقف', 'ابتعد عن البطارية'], 0, 'يجب جمع مصدر الطاقة أولًا.', '🔋 ➡️ 🚪'),
    question('هناك عائق أمام الروبوت وطريق خالٍ يمينًا. ماذا يفعل؟', ['يستدير يمينًا', 'يصطدم بالعائق', 'يتوقف نهائيًا', 'يرجع بلا سبب'], 0, 'اختيار الطريق الخالي يحل المشكلة.'),
    question('أي خطة أفضل لإنقاذ روبوتين؟', ['الأقرب أولًا ثم الأبعد', 'الابتعاد عنهما', 'إضاعة الطاقة', 'الدوران فقط'], 0, 'البدء بالأقرب يوفر الوقت والطاقة.'),
    question('إذا فشلت الخطة، ماذا نفعل؟', ['نراجع الأوامر ونصححها', 'نكرر الخطأ دون تغيير', 'نغلق اللعبة', 'نحذف الهدف'], 0, 'التصحيح جزء أساسي من حل المشكلات.'),
    question('ما الذي يساعد على عبور المتاهة؟', ['التخطيط خطوة بخطوة', 'الحركة العشوائية فقط', 'إهمال الخريطة', 'تجاهل العوائق'], 0, 'الخطة الواضحة تقلل الأخطاء.')
  ],
  'healthy-hero': [
    question('أي وجبة أكثر توازنًا؟', ['خضار وحبوب وبروتين', 'حلويات فقط', 'مشروب غازي فقط', 'رقائق فقط'], 0, 'الوجبة المتوازنة تجمع مجموعات غذائية متنوعة.', '🥗'),
    question('متى نغسل أيدينا؟', ['قبل الأكل وبعد استخدام دورة المياه', 'مرة في الشهر', 'لا نغسلها', 'بعد النوم فقط'], 0, 'غسل اليدين يقلل انتقال الجراثيم.', '🧼'),
    question('أي مشروب أفضل غالبًا للعطش؟', ['الماء', 'مشروب غازي', 'شراب شديد السكر', 'لا شيء'], 0, 'الماء هو الخيار الأساسي للترطيب.', '💧'),
    question('ماذا يحتاج الجسم يوميًا؟', ['حركة ونوم كافٍ', 'سهر دائم', 'جلوس طوال اليوم', 'حلويات فقط'], 0, 'النشاط والنوم يدعمان الصحة.'),
    question('ما العادة الجيدة للأسنان؟', ['تنظيفها مرتين يوميًا', 'عدم تنظيفها', 'الإكثار من السكر', 'استخدامها لفتح الأشياء'], 0, 'التنظيف المنتظم يحمي الأسنان.', '🦷')
  ],
  'eco-guardians': [
    question('أين نضع الورق المستخدم؟', ['حاوية إعادة تدوير الورق', 'في الشارع', 'في البحر', 'نحرقه دائمًا'], 0, 'إعادة تدوير الورق تقلل النفايات.', '♻️'),
    question('كيف نوفر الماء؟', ['نغلق الصنبور عند عدم الحاجة', 'نتركه مفتوحًا', 'نهدره في اللعب', 'نتجاهل التسرب'], 0, 'إغلاق الصنبور وإصلاح التسرب يوفران الماء.', '🚰'),
    question('أي وسيلة تقلل التلوث؟', ['المشي أو الدراجة للمسافات القريبة', 'تشغيل السيارة بلا حاجة', 'حرق النفايات', 'رمي البلاستيك'], 0, 'المشي والدراجة يقللان الانبعاثات.', '🚲'),
    question('ما التصرف الصحيح مع البطارية القديمة؟', ['تسليمها لنقطة جمع مخصصة', 'رميها في الماء', 'فتحها', 'وضعها مع الطعام'], 0, 'البطاريات تحتاج معالجة خاصة.'),
    question('كيف نحمي الأشجار؟', ['نقلل هدر الورق ونزرع', 'نكسر الأغصان', 'نرمي النفايات حولها', 'نقطعها بلا حاجة'], 0, 'ترشيد الورق والزراعة يحميان الغطاء النباتي.', '🌳')
  ]
};

function buildMathQuestions(speed = false) {
  const total = speed ? 8 : 6;
  return Array.from({ length: total }, (_, index) => {
    const level = index + 1;
    let a = 3 + ((index * 7) % 12);
    let b = 2 + ((index * 5) % 9);
    let operator = index < 2 ? '+' : index < 4 ? '−' : index % 2 ? '×' : '+';
    if (operator === '−' && b > a) [a, b] = [b, a];
    const result = operator === '+' ? a + b : operator === '−' ? a - b : a * b;
    const choices = [result, result + 2, Math.max(0, result - 1), result + 5]
      .filter((value, choiceIndex, values) => values.indexOf(value) === choiceIndex)
      .slice(0, 4);
    while (choices.length < 4) choices.push(result + choices.length + 1);
    const rotated = choices.slice(level % 4).concat(choices.slice(0, level % 4));
    return question(`${a} ${operator} ${b} = ؟`, rotated.map(String), rotated.indexOf(result), `الإجابة الصحيحة هي ${result}.`, speed ? '🥷⚡' : '🪐');
  });
}

const MEMORY_SYMBOLS = ['🚀', '⭐', '🪐', '🤖', '🌈', '🎯'];
const STORY_STEPS = [
  { label: 'اختر البطل', options: ['طفلة شجاعة', 'روبوت ودود', 'أسد صغير', 'عالِم فضاء'] },
  { label: 'اختر المكان', options: ['غابة مضيئة', 'مدينة مستقبلية', 'جزيرة الأسرار', 'محطة فضائية'] },
  { label: 'اختر المهمة', options: ['إنقاذ صديق', 'العثور على كنز', 'حل لغز كبير', 'حماية البيئة'] },
  { label: 'اختر النهاية', options: ['احتفل الجميع بالنجاح', 'تعلم البطل درسًا مهمًا', 'بدأت مغامرة جديدة', 'عاد السلام إلى المكان'] }
];

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function quizQuestions(game) {
  if (game.id === 'math-galaxy') return buildMathQuestions(false);
  if (game.id === 'number-ninja') return buildMathQuestions(true);
  return QUIZ_BANKS[game.id] || [question('اختر الإجابة الصحيحة لبدء النشاط.', ['ابدأ', 'توقف'], 0, 'أحسنت!')];
}

function runtimeShell(game) {
  return `
    <section class="kids-game-runtime" style="--game-a:${game.colors[0]};--game-b:${game.colors[1]}">
      <header class="runtime-header">
        <div class="runtime-game-id"><span>${game.icon}</span><div><small>${game.subject}</small><h2>${game.ar}</h2><b lang="en">${game.en}</b></div></div>
        <div class="runtime-score"><span>النتيجة</span><strong id="runtimeScore">0</strong></div>
      </header>
      <div class="runtime-progress"><div><span id="runtimeStep">المرحلة 1</span><b id="runtimePercent">0%</b></div><div class="progress-track"><i id="runtimeProgressBar"></i></div></div>
      <div id="runtimeStage" class="runtime-stage"></div>
    </section>`;
}

export function launchKidsGame({ game, mount, onProgress }) {
  const timeouts = new Set();
  let destroyed = false;
  mount.classList.add('game-active');
  mount.innerHTML = runtimeShell(game);
  const stage = mount.querySelector('#runtimeStage');
  const scoreNode = mount.querySelector('#runtimeScore');
  const stepNode = mount.querySelector('#runtimeStep');
  const percentNode = mount.querySelector('#runtimePercent');
  const barNode = mount.querySelector('#runtimeProgressBar');

  const setProgress = (percent, label, score = 0, total = 0, completed = false) => {
    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
    barNode.style.width = `${safePercent}%`;
    percentNode.textContent = `${safePercent}%`;
    stepNode.textContent = label;
    scoreNode.textContent = score.toLocaleString('ar-SA');
    onProgress?.({ percent: safePercent, score, total, completed });
  };

  const schedule = (callback, delay) => {
    const id = window.setTimeout(() => { timeouts.delete(id); if (!destroyed) callback(); }, delay);
    timeouts.add(id);
  };

  const renderComplete = (score, total, extra = '') => {
    const ratio = total ? score / total : 1;
    const stars = ratio >= 0.85 ? '⭐⭐⭐' : ratio >= 0.55 ? '⭐⭐' : '⭐';
    setProgress(100, 'اكتملت اللعبة', score, total, true);
    stage.innerHTML = `
      <div class="runtime-complete">
        <div class="complete-burst">${game.icon}</div>
        <span class="complete-stars">${stars}</span>
        <h3>أحسنت! أكملت ${game.ar}</h3>
        <p>${extra || `أجبت إجابة صحيحة عن ${score} من ${total}.`}</p>
        <div class="complete-actions"><button type="button" data-runtime-restart>العب مرة أخرى</button><button type="button" data-runtime-finish>العودة إلى الألعاب</button></div>
      </div>`;
    stage.querySelector('[data-runtime-restart]')?.addEventListener('click', () => start());
    stage.querySelector('[data-runtime-finish]')?.addEventListener('click', () => document.querySelector('.modal-close')?.click());
  };

  const runQuiz = () => {
    const questions = shuffle(quizQuestions(game)).map(item => ({ ...item, choices: [...item.choices] }));
    let index = 0;
    let score = 0;

    const renderQuestion = () => {
      const item = questions[index];
      const percent = Math.round((index / questions.length) * 100);
      setProgress(percent, `السؤال ${index + 1} من ${questions.length}`, score, questions.length);
      stage.innerHTML = `
        <div class="runtime-question-card">
          <div class="runtime-visual">${item.visual || game.icon}</div>
          <span class="runtime-kicker">اختر الإجابة الصحيحة</span>
          <h3>${item.prompt}</h3>
          <div class="runtime-options">${item.choices.map((choice, choiceIndex) => `<button type="button" data-runtime-answer="${choiceIndex}">${choice}</button>`).join('')}</div>
          <div class="runtime-feedback" aria-live="polite"></div>
          <button class="runtime-next" type="button" hidden>التالي</button>
        </div>`;
      const answerButtons = [...stage.querySelectorAll('[data-runtime-answer]')];
      const feedback = stage.querySelector('.runtime-feedback');
      const next = stage.querySelector('.runtime-next');
      answerButtons.forEach(button => button.addEventListener('click', () => {
        if (button.parentElement.dataset.locked === 'true') return;
        button.parentElement.dataset.locked = 'true';
        const selected = Number(button.dataset.runtimeAnswer);
        const correct = selected === item.answer;
        if (correct) score += 1;
        answerButtons.forEach((candidate, candidateIndex) => {
          candidate.disabled = true;
          if (candidateIndex === item.answer) candidate.classList.add('correct');
          else if (candidate === button) candidate.classList.add('wrong');
        });
        feedback.className = `runtime-feedback ${correct ? 'success' : 'error'}`;
        feedback.textContent = `${correct ? '✓ إجابة صحيحة. ' : 'الإجابة تحتاج مراجعة. '}${item.explain}`;
        next.hidden = false;
        setProgress(Math.round(((index + 1) / questions.length) * 100), `السؤال ${index + 1} من ${questions.length}`, score, questions.length);
      }));
      next.addEventListener('click', () => {
        index += 1;
        if (index >= questions.length) renderComplete(score, questions.length);
        else renderQuestion();
      });
    };
    renderQuestion();
  };

  const runMemory = () => {
    const symbols = MEMORY_SYMBOLS.slice(0, 6);
    const cards = shuffle([...symbols, ...symbols]).map((symbol, index) => ({ id: index, symbol, matched: false }));
    let first = null;
    let second = null;
    let matched = 0;
    let moves = 0;
    setProgress(0, 'اكتشف الأزواج', 0, symbols.length);
    stage.innerHTML = `
      <div class="memory-board-intro"><h3>اكتشف أزواج النجوم</h3><p>افتح بطاقتين في كل محاولة وتذكر أماكن الرموز.</p></div>
      <div class="memory-board">${cards.map(card => `<button type="button" class="memory-card" data-memory-card="${card.id}" aria-label="بطاقة مخفية"><span>?</span></button>`).join('')}</div>
      <div class="memory-moves">المحاولات: <b id="memoryMoves">0</b></div>`;
    const buttons = [...stage.querySelectorAll('[data-memory-card]')];
    const movesNode = stage.querySelector('#memoryMoves');
    buttons.forEach(button => button.addEventListener('click', () => {
      const card = cards[Number(button.dataset.memoryCard)];
      if (card.matched || second || first?.id === card.id) return;
      button.classList.add('open');
      button.querySelector('span').textContent = card.symbol;
      if (!first) {
        first = card;
        return;
      }
      second = card;
      moves += 1;
      movesNode.textContent = moves.toLocaleString('ar-SA');
      if (first.symbol === second.symbol) {
        first.matched = true;
        second.matched = true;
        buttons[first.id].classList.add('matched');
        buttons[second.id].classList.add('matched');
        matched += 1;
        first = null;
        second = null;
        setProgress((matched / symbols.length) * 100, `${matched} من ${symbols.length} أزواج`, matched, symbols.length);
        if (matched === symbols.length) schedule(() => renderComplete(symbols.length, symbols.length, `اكتشفت جميع الأزواج في ${moves} محاولة.`), 500);
      } else {
        const firstCard = first;
        const secondCard = second;
        schedule(() => {
          [firstCard, secondCard].forEach(item => {
            const cardButton = buttons[item.id];
            cardButton.classList.remove('open');
            cardButton.querySelector('span').textContent = '?';
          });
          first = null;
          second = null;
        }, 750);
      }
    }));
  };

  const runStory = () => {
    const selections = [];
    let index = 0;
    const renderStep = () => {
      const step = STORY_STEPS[index];
      setProgress((index / STORY_STEPS.length) * 100, `الاختيار ${index + 1} من ${STORY_STEPS.length}`, index, STORY_STEPS.length);
      stage.innerHTML = `
        <div class="story-builder-stage">
          <div class="runtime-visual">📖✨</div>
          <span class="runtime-kicker">ابنِ قصتك خطوة بخطوة</span>
          <h3>${step.label}</h3>
          <div class="story-options">${step.options.map((option, optionIndex) => `<button type="button" data-story-option="${optionIndex}">${option}</button>`).join('')}</div>
        </div>`;
      stage.querySelectorAll('[data-story-option]').forEach(button => button.addEventListener('click', () => {
        selections[index] = step.options[Number(button.dataset.storyOption)];
        index += 1;
        if (index < STORY_STEPS.length) renderStep();
        else {
          const story = `${selections[0]} انطلق إلى ${selections[1]} من أجل ${selections[2]}. وبعد مغامرة مليئة بالشجاعة والتعاون، ${selections[3]}.`;
          setProgress(100, 'اكتملت القصة', STORY_STEPS.length, STORY_STEPS.length, true);
          stage.innerHTML = `
            <div class="story-result"><div class="runtime-visual">📚</div><span class="runtime-kicker">قصتك الجديدة</span><h3>مغامرة من صنعك</h3><p>${story}</p>
            <div class="complete-actions"><button type="button" data-story-again>اصنع قصة أخرى</button><button type="button" data-runtime-finish>إنهاء النشاط</button></div></div>`;
          stage.querySelector('[data-story-again]')?.addEventListener('click', () => start());
          stage.querySelector('[data-runtime-finish]')?.addEventListener('click', () => document.querySelector('.modal-close')?.click());
        }
      }));
    };
    renderStep();
  };

  function start() {
    if (destroyed) return;
    if (game.id === 'memory-stars') runMemory();
    else if (game.id === 'story-builder') runStory();
    else runQuiz();
  }

  start();
  return () => {
    destroyed = true;
    timeouts.forEach(id => window.clearTimeout(id));
    timeouts.clear();
    mount.classList.remove('game-active');
    mount.onclick = null;
  };
}
