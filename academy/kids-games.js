(()=>{
  'use strict';

  const GAMES=[
    {
      id:'word-rocket',title:'Word Rocket',arabicTitle:'صاروخ الكلمات',icon:'🚀',badge:'اختيار أساسي',
      categories:['educational'],categoryLabel:'لغة ومفردات',minAge:6,maxAge:10,difficulty:'سهل',duration:8,stages:36,mode:'فردي',
      skill:'المفردات والإملاء',tags:['English','Vocabulary','Spelling'],searchTerm:'ألغاز كلمات',
      description:'يُطلق الطفل الصاروخ عبر إكمال الكلمات، مطابقة الصور بالمفردات، وترتيب الحروف ترتيبًا صحيحًا.',
      goal:'تنمية المفردات، الإملاء، التعرّف على الحروف، والتركيز.',
      howToPlay:['تظهر صورة مع حروف مختلطة.','يرتب الطفل الحروف لتكوين الكلمة الصحيحة.','كل إجابة صحيحة تضيف وقودًا للصاروخ.','ينطلق الصاروخ بعد إكمال المستوى.'],
      teacherSummary:'مناسب للتدريب القصير على الكلمات عالية التكرار، ويمكن للمعلم متابعة أخطاء ترتيب الحروف وتكرار الكلمات الصعبة.',
      colors:['#ff78c8','#8a6cff'],featured:true
    },
    {
      id:'math-galaxy',title:'Math Galaxy',arabicTitle:'مجرة الرياضيات',icon:'🪐',badge:'اختيار أساسي',
      categories:['educational'],categoryLabel:'رياضيات',minAge:7,maxAge:12,difficulty:'متدرج',duration:10,stages:48,mode:'فردي',
      skill:'الحساب الذهني والمنطق',tags:['Math','Numbers','Logic'],searchTerm:'ألغاز حساب',
      description:'رحلة بين الكواكب تعتمد على حل تحديات الجمع والطرح والضرب والقسمة قبل نفاد طاقة المركبة.',
      goal:'تطوير الحساب الذهني، السرعة، التفكير المنطقي، وحل المشكلات.',
      howToPlay:['اختر كوكبًا يمثل مستوى الصعوبة.','حل سؤال العملية الحسابية الظاهر.','الإجابة الصحيحة تحرك المركبة للأمام.','أكمل المهمة قبل نفاد الطاقة.'],
      teacherSummary:'يعرض مهارات العمليات الأربع في جولات قصيرة، ويفيد في قياس سرعة الاستجابة والدقة لكل مستوى.',
      colors:['#ffd75f','#ff8c5a'],featured:true
    },
    {
      id:'puzzle-planet',title:'Puzzle Planet',arabicTitle:'كوكب الألغاز',icon:'🧩',badge:'اختيار أساسي',
      categories:['educational','entertainment'],categoryLabel:'منطق وألغاز',minAge:6,maxAge:13,difficulty:'متدرج',duration:11,stages:42,mode:'فردي',
      skill:'التفكير النقدي',tags:['Puzzles','Logic','Creativity'],searchTerm:'ألغاز منطق',
      description:'يحتوي كل كوكب على ألغاز منطقية وترتيبية يجب حلها لفتح العالم التالي وجمع النجوم.',
      goal:'تعزيز الاستدلال المنطقي، التفكير النقدي، الإبداع، واتخاذ القرار.',
      howToPlay:['اقرأ أو استمع إلى اللغز.','اختر الإجابة أو رتّب القطع.','استخدم التلميح عند الحاجة.','احصل على نجوم إضافية عند الحل دون مساعدة.'],
      teacherSummary:'مناسب لمناقشة استراتيجية الحل وليس الإجابة فقط، مع فرصة لقياس الاعتماد على التلميحات.',
      colors:['#a872ff','#5d5bff'],featured:true
    },
    {
      id:'memory-stars',title:'Memory Stars',arabicTitle:'نجوم الذاكرة',icon:'⭐',badge:'اختيار أساسي',
      categories:['educational','entertainment'],categoryLabel:'ذاكرة وتركيز',minAge:4,maxAge:10,difficulty:'سهل',duration:6,stages:30,mode:'فردي',
      skill:'الذاكرة البصرية',tags:['Memory','Focus','Patterns'],searchTerm:'الذاكرة',
      description:'يكتشف الطفل أزواج البطاقات المتطابقة المخفية بين النجوم المضيئة في مستويات متدرجة.',
      goal:'تقوية الذاكرة البصرية، التركيز، الملاحظة، والتعرّف على الأنماط.',
      howToPlay:['تظهر البطاقات لثوانٍ ثم تنقلب.','يفتح الطفل بطاقتين في كل محاولة.','تبقى البطاقات المتطابقة ظاهرة.','ينتهي المستوى بعد اكتشاف جميع الأزواج.'],
      teacherSummary:'يصلح كإحماء ذهني، ويمكن مقارنة عدد المحاولات وزمن الإكمال بين الجولات.',
      colors:['#66edff','#3977ff'],featured:true
    },
    {
      id:'code-sprouts',title:'Code Sprouts',arabicTitle:'براعم البرمجة',icon:'🤖',badge:'اختيار أساسي',
      categories:['educational'],categoryLabel:'برمجة مبكرة',minAge:7,maxAge:13,difficulty:'متوسط',duration:12,stages:40,mode:'فردي',
      skill:'التفكير الحاسوبي',tags:['Coding','Sequencing','Debugging'],searchTerm:'التسلسل',
      description:'يرشد الطفل روبوتًا ودودًا عبر ترتيب أوامر بصرية بسيطة مثل تقدم، يمين، ويسار.',
      goal:'تنمية التفكير الحاسوبي، التسلسل، اكتشاف الأخطاء، والتخطيط.',
      howToPlay:['شاهد هدف الروبوت على الخريطة.','رتّب أوامر الحركة بالترتيب الصحيح.','شغّل سلسلة الأوامر.','صحح التسلسل إذا وصل الروبوت إلى مكان خاطئ.'],
      teacherSummary:'يقدم مدخلًا بصريًا لمفاهيم الخوارزمية والتصحيح دون الحاجة إلى كتابة كود نصي.',
      colors:['#57d8ff','#8d62ff'],featured:true
    },
    {
      id:'science-spark',title:'Science Spark',arabicTitle:'شرارة العلوم',icon:'⚗️',badge:'اختيار أساسي',
      categories:['educational'],categoryLabel:'علوم وتجارب',minAge:8,maxAge:13,difficulty:'متوسط',duration:12,stages:32,mode:'فردي',
      skill:'الاستقصاء العلمي',tags:['Science','Experiments','Prediction'],searchTerm:'مسابقة العلوم',
      description:'يجري الطفل تجارب افتراضية، يرتب خطواتها، يتوقع النتيجة، ثم يفسر ما شاهده.',
      goal:'تطوير التفكير العلمي، التوقع، الملاحظة، وفهم السبب والنتيجة.',
      howToPlay:['اختر المواد الصحيحة.','رتّب خطوات التجربة.','توقع النتيجة قبل التشغيل.','شاهد النتيجة وأجب عن سؤال التفسير.'],
      teacherSummary:'يدعم دورة الاستقصاء: سؤال، توقع، تجربة، ملاحظة، وتفسير، مع تجنب أي مواد حقيقية أو مخاطر.',
      colors:['#63f2a9','#1cae89'],featured:true
    },
    {
      id:'emotion-detective',title:'Emotion Detective',arabicTitle:'محقق المشاعر',icon:'🕵️',badge:'اختيار أساسي',
      categories:['educational'],categoryLabel:'تعلم اجتماعي',minAge:5,maxAge:12,difficulty:'متوسط',duration:8,stages:28,mode:'فردي',
      skill:'الذكاء العاطفي',tags:['Emotions','Empathy','Communication'],searchTerm:'المقارنة',
      description:'يتعرّف الطفل على المشاعر من تعبيرات الوجه ونبرة الصوت والمواقف اليومية، ثم يختار استجابة لطيفة.',
      goal:'تنمية الذكاء العاطفي، التعاطف، التواصل، والوعي الاجتماعي.',
      howToPlay:['شاهد الشخصية أو الموقف القصير.','حدد الشعور الأقرب.','اختر استجابة مناسبة ولطيفة.','اجمع نقاط التعاطف للقرارات الجيدة.'],
      teacherSummary:'يساعد في فتح حوار هادئ حول المشاعر والاستجابات، ولا يستخدم لتشخيص الحالة النفسية.',
      colors:['#ff9e59','#ff5a82'],featured:true
    },
    {
      id:'robot-rescue',title:'Robot Rescue',arabicTitle:'إنقاذ الروبوتات',icon:'🦾',badge:'اختيار أساسي',
      categories:['educational','entertainment'],categoryLabel:'منطق ومغامرة',minAge:7,maxAge:13,difficulty:'متوسط',duration:12,stages:36,mode:'فردي',
      skill:'التخطيط والمثابرة',tags:['Robots','Maze','Logic'],searchTerm:'حل المتاهة',
      description:'ينقذ اللاعب روبوتات ودودة عبر حل الألغاز وعبور متاهات مستقبلية وجمع خلايا الطاقة.',
      goal:'تعزيز التخطيط، التفكير المنطقي، الملاحة، والمثابرة.',
      howToPlay:['استكشف الخريطة.','حل اللغز لفتح الطريق المغلق.','تجنب العوائق واجمع خلايا الطاقة.','أنقذ جميع الروبوتات قبل انتهاء الوقت.'],
      teacherSummary:'يجمع بين التخطيط المكاني وحل المشكلات، ويمكن مراجعة المسارات البديلة بعد كل محاولة.',
      colors:['#ff6fae','#ff4e74'],featured:true
    },
    {
      id:'eco-guardians',title:'Eco Guardians',arabicTitle:'حماة البيئة',icon:'🌍',badge:'اختيار أساسي',
      categories:['educational'],categoryLabel:'بيئة واستدامة',minAge:7,maxAge:13,difficulty:'متوسط',duration:10,stages:30,mode:'فردي',
      skill:'المسؤولية البيئية',tags:['Environment','Recycling','Conservation'],searchTerm:'تحدي المعرفة',
      description:'يحمي اللاعب مدينة افتراضية عبر إعادة التدوير، توفير الماء، وتقليل مصادر التلوث.',
      goal:'تعزيز المسؤولية البيئية، الترشيد، إعادة التدوير، وحل المشكلات.',
      howToPlay:['اختر مهمة بيئية.','صنّف النفايات في الحاويات الصحيحة.','أصلح المواقع الملوثة.','شاهد المدينة تصبح أنظف بعد كل مهمة.'],
      teacherSummary:'يربط السلوك اليومي بنتيجته البيئية ويصلح لبدء نشاط منزلي أو صفي بسيط.',
      colors:['#70e8c0','#36b9d4'],featured:true
    },
    {
      id:'story-builder',title:'Story Builder',arabicTitle:'صانع القصص',icon:'📖',badge:'اختيار أساسي',
      categories:['educational'],categoryLabel:'قراءة وإبداع',minAge:7,maxAge:13,difficulty:'متوسط',duration:14,stages:24,mode:'فردي',
      skill:'الكتابة الإبداعية',tags:['Reading','Writing','Storytelling'],searchTerm:'ألغاز كلمات',
      description:'يبني الطفل قصته باختيار الشخصيات والمكان والمهمة وترتيب الجمل وصناعة نهاية خاصة.',
      goal:'تنمية القراءة، الكتابة، الخيال، بناء الجملة، والسرد.',
      howToPlay:['اختر الشخصية الرئيسة.','حدد المكان والمهمة.','رتب الجمل أو اكتب مقاطع قصيرة.','اختر النهاية واحفظ القصة.'],
      teacherSummary:'يوفر مدخلًا منظمًا للسرد ويمكن استخدام القصة الناتجة كنشاط قراءة أو مراجعة لغوية.',
      colors:['#b28cff','#ff79c9'],featured:true
    },
    {
      id:'letter-lab',title:'Letter Lab',arabicTitle:'مختبر الحروف',icon:'🔤',badge:'لغة مبكرة',
      categories:['educational'],categoryLabel:'حروف وأصوات',minAge:5,maxAge:9,difficulty:'سهل',duration:7,stages:34,mode:'فردي',
      skill:'الوعي الصوتي',tags:['Letters','Phonics','Words'],searchTerm:'ألغاز كلمات',
      description:'يجري الطفل تجارب مرحة بالحروف والأصوات والكلمات، وتتحول الإجابات الصحيحة إلى مؤثرات مخبرية.',
      goal:'تنمية الصوتيات، الإملاء، النطق، وتكوين الكلمات.',
      howToPlay:['استمع إلى الصوت أو شاهد الصورة.','اختر الحرف الصحيح.','كوّن كلمات كاملة في المستويات المتقدمة.','فعّل التجربة المتحركة بالإجابة الصحيحة.'],
      teacherSummary:'مناسب للتأسيس الصوتي وملاحظة الحروف التي يخلط بينها الطفل.',
      colors:['#72e7ff','#3b8cff']
    },
    {
      id:'number-ninja',title:'Number Ninja',arabicTitle:'نينجا الأرقام',icon:'🥷',badge:'سرعة ودقة',
      categories:['educational','entertainment'],categoryLabel:'رياضيات سريعة',minAge:7,maxAge:12,difficulty:'متوسط',duration:7,stages:40,mode:'فردي',
      skill:'سرعة الحساب',tags:['Math','Speed','Accuracy'],searchTerm:'ألغاز حساب',
      description:'يتجاوز النينجا العوائق عبر الإجابة السريعة والدقيقة عن التحديات العددية.',
      goal:'رفع سرعة الحساب، الدقة، التركيز، والثقة.',
      howToPlay:['يظهر سؤال بجانب العائق.','اختر الإجابة الصحيحة بسرعة.','الإجابة الصحيحة تجعل النينجا يتجاوز العائق.','تنتهي المهمة بعد ثلاث أخطاء.'],
      teacherSummary:'مفيد لتدريب الطلاقة العددية، مع ضرورة التركيز على الدقة قبل السرعة.',
      colors:['#ffbf58','#ff617a']
    },
    {
      id:'color-quest',title:'Color Quest',arabicTitle:'مغامرة الألوان',icon:'🎨',badge:'للصغار',
      categories:['educational'],categoryLabel:'ألوان وتصنيف',minAge:3,maxAge:7,difficulty:'سهل',duration:6,stages:24,mode:'فردي',
      skill:'التصنيف البصري',tags:['Colors','Shapes','Listening'],searchTerm:'التصنيف',
      description:'يستكشف الطفل عالمًا ملونًا وينفذ مهمات تتعلق بالألوان والأشياء والأشكال.',
      goal:'التعرّف على الألوان، الاستماع، التصنيف البصري، والتنسيق.',
      howToPlay:['استمع أو اقرأ اسم اللون المطلوب.','اختر العنصر المطابق.','ادمج اللون مع الشكل في المستويات التالية.','أكمل المشهد لتحصل على المكافأة.'],
      teacherSummary:'مناسب للتعلم المبكر ويمكن دعمه بتسمية أشياء حقيقية من اللون نفسه.',
      colors:['#ff75cf','#ffd75f']
    },
    {
      id:'shape-city',title:'Shape City',arabicTitle:'مدينة الأشكال',icon:'🔷',badge:'هندسة مبكرة',
      categories:['educational'],categoryLabel:'أشكال وهندسة',minAge:4,maxAge:8,difficulty:'سهل',duration:8,stages:28,mode:'فردي',
      skill:'الإدراك المكاني',tags:['Shapes','Geometry','Matching'],searchTerm:'التفكير المكاني',
      description:'يعيد الطفل بناء مدينة مستقبلية عبر سحب الدوائر والمربعات والمثلثات والمستطيلات إلى أماكنها.',
      goal:'تمييز الأشكال، الذكاء المكاني، المطابقة، والتنسيق الحركي.',
      howToPlay:['يظهر مخطط المبنى.','اسحب الشكل الهندسي إلى مكانه.','كل شكل صحيح يكمل جزءًا من البناء.','أكمل المباني لفتح حي جديد.'],
      teacherSummary:'يربط الأشكال بالمحيط المبني ويدعم مفردات الموقع والحجم والاتجاه.',
      colors:['#63f2a9','#57d8ff']
    },
    {
      id:'animal-explorer',title:'Animal Explorer',arabicTitle:'مستكشف الحيوانات',icon:'🦁',badge:'علوم ممتعة',
      categories:['educational'],categoryLabel:'علوم ومعرفة',minAge:5,maxAge:11,difficulty:'متدرج',duration:10,stages:35,mode:'فردي',
      skill:'التصنيف العلمي',tags:['Animals','Habitats','Sounds'],searchTerm:'تحدي المعرفة',
      description:'يسافر الطفل بين الغابات والمحيطات والمزارع والصحارى لاكتشاف الحيوانات وبيئاتها.',
      goal:'معرفة الحيوانات، التصنيف، الاستماع، والوعي البيئي.',
      howToPlay:['ادخل موطنًا طبيعيًا.','تعرف على الحيوان من الصورة أو الصوت أو الدليل.','طابق الحيوان مع غذائه أو بيئته.','اجمع بطاقة معلومات بعد الإجابة.'],
      teacherSummary:'يدعم التصنيف حسب البيئة والغذاء والخصائص، ويمكن ربطه ببحث قصير عن حيوان مفضل.',
      colors:['#70e8c0','#ff9e59']
    },
    {
      id:'treasure-speller',title:'Treasure Speller',arabicTitle:'كنز الإملاء',icon:'🗺️',badge:'مغامرة لغوية',
      categories:['educational','entertainment'],categoryLabel:'إملاء ومغامرة',minAge:6,maxAge:11,difficulty:'متوسط',duration:9,stages:32,mode:'فردي',
      skill:'الإملاء والاستماع',tags:['Spelling','Listening','Vocabulary'],searchTerm:'ألغاز كلمات',
      description:'يتبع الطفل خريطة كنز ويفتح الصناديق عبر تهجئة الكلمات بالترتيب الصحيح.',
      goal:'تنمية الإملاء، الاستماع، المفردات، وتسلسل الحروف.',
      howToPlay:['استمع إلى الكلمة أو شاهد صورتها.','اختر الحروف بالترتيب الصحيح.','كل كلمة تكشف جزءًا من الخريطة.','أكمل الخريطة لفتح الصندوق الأخير.'],
      teacherSummary:'يوضح أخطاء تسلسل الحروف ويساعد في بناء قوائم مراجعة شخصية.',
      colors:['#ffd75f','#b27535']
    },
    {
      id:'safe-street-hero',title:'Safe Street Hero',arabicTitle:'بطل الطريق الآمن',icon:'🚦',badge:'مهارات حياتية',
      categories:['educational'],categoryLabel:'سلامة ومسؤولية',minAge:5,maxAge:11,difficulty:'سهل',duration:8,stages:26,mode:'فردي',
      skill:'الوعي بالسلامة',tags:['Safety','Traffic','Decisions'],searchTerm:'تحدي المعرفة',
      description:'يتعلم الطفل السلامة المرورية والسلوك المسؤول عبر مواقف تفاعلية قصيرة.',
      goal:'تعزيز الوعي بالسلامة، المسؤولية، اتخاذ القرار، ومعرفة إشارات المرور.',
      howToPlay:['شاهد موقف الطريق القصير.','اختر التصرف الأكثر أمانًا.','ساعد الشخصيات على العبور والالتزام بالإشارة.','احصل على شارة السلامة بعد المهمة.'],
      teacherSummary:'محتوى توعوي داعم ولا يغني عن إشراف البالغين والتدريب الميداني الآمن.',
      colors:['#ff617a','#ffd75f']
    },
    {
      id:'healthy-hero',title:'Healthy Hero',arabicTitle:'بطل الصحة',icon:'🥗',badge:'صحة وعادات',
      categories:['educational'],categoryLabel:'صحة وتغذية',minAge:5,maxAge:11,difficulty:'سهل',duration:8,stages:27,mode:'فردي',
      skill:'العادات الصحية',tags:['Health','Nutrition','Hygiene'],searchTerm:'تحدي المعرفة',
      description:'يساعد الطفل بطلًا خارقًا على اختيار الطعام المتوازن والعادات اليومية الصحية.',
      goal:'رفع الوعي بالتغذية، النظافة، العادات الصحية، والعناية بالنفس.',
      howToPlay:['صنف الأطعمة إلى يومية وأحيانًا.','كوّن وجبة متوازنة.','أكمل تحديات الحركة والنوم والنظافة.','اجمع نقاط الطاقة للاختيارات الصحية.'],
      teacherSummary:'يقدم مبادئ عامة مبسطة ولا يقدم تشخيصًا أو خطة غذائية طبية.',
      colors:['#63f2a9','#ffd75f']
    }
  ];

  const PROGRESS_KEY='neonKidsGamesProgressV1';
  const state={category:'all',age:'all',query:''};
  let observer=null;
  let attempts=0;
  let lastFocusedElement=null;

  function escapeHtml(value){
    return String(value??'').replace(/[&<>'"]/g,char=>({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    })[char]);
  }

  function normalize(value){
    return String(value||'').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').trim();
  }

  function readProgress(){
    try{
      const data=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}');
      return data&&typeof data==='object'?data:{};
    }catch{
      return {};
    }
  }

  function writeProgress(data){
    try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(data));}catch{}
  }

  function progressFor(game){
    const saved=readProgress()[game.id]||{};
    const percent=Math.max(0,Math.min(100,Number(saved.percent)||0));
    const stars=Math.max(0,Math.min(3,Number(saved.stars)||0));
    return {percent,stars,started:Boolean(saved.started),lastPlayed:saved.lastPlayed||''};
  }

  function markStarted(game){
    const all=readProgress();
    const current=all[game.id]||{};
    all[game.id]={
      ...current,
      started:true,
      percent:Math.max(5,Number(current.percent)||0),
      stars:Math.max(0,Number(current.stars)||0),
      lastPlayed:new Date().toISOString()
    };
    writeProgress(all);
  }

  function ageMatches(game,filter){
    if(filter==='all')return true;
    const [min,max]=filter.split('-').map(Number);
    return game.minAge<=max&&game.maxAge>=min;
  }

  function filteredGames(){
    const query=normalize(state.query);
    return GAMES.filter(game=>{
      const categoryMatch=state.category==='all'||game.categories.includes(state.category);
      const ageMatch=ageMatches(game,state.age);
      const haystack=normalize(`${game.title} ${game.arabicTitle} ${game.description} ${game.skill} ${game.tags.join(' ')}`);
      return categoryMatch&&ageMatch&&(!query||haystack.includes(query));
    });
  }

  function starsMarkup(count){
    return [1,2,3].map(index=>`<span class="${index<=count?'earned':''}" aria-hidden="true">★</span>`).join('');
  }

  function renderCard(game){
    const progress=progressFor(game);
    return `
      <article class="kids-game-card ${game.featured?'kids-game-featured':''}" style="--game-a:${game.colors[0]};--game-b:${game.colors[1]}" data-kids-card="${escapeHtml(game.id)}">
        <div class="kids-game-visual" aria-hidden="true">
          <span class="kids-game-badge">${escapeHtml(game.badge)}</span>
          <span class="kids-orbit kids-orbit-a"></span><span class="kids-orbit kids-orbit-b"></span>
          <div class="kids-game-icon">${escapeHtml(game.icon)}</div>
          <span class="kids-spark spark-a">✦</span><span class="kids-spark spark-b">•</span><span class="kids-spark spark-c">✧</span>
        </div>
        <div class="kids-game-body">
          <div class="kids-game-kicker"><span>${escapeHtml(game.categoryLabel)}</span><span>${escapeHtml(game.difficulty)}</span></div>
          <h3 lang="en">${escapeHtml(game.title)}</h3>
          <div class="kids-game-arabic-title">${escapeHtml(game.arabicTitle)}</div>
          <p>${escapeHtml(game.description)}</p>
          <div class="kids-game-meta" aria-label="معلومات اللعبة">
            <span><b>العمر</b>${game.minAge}–${game.maxAge}</span>
            <span><b>المدة</b>${game.duration} د</span>
            <span><b>المراحل</b>${game.stages}</span>
            <span><b>النمط</b>${escapeHtml(game.mode)}</span>
          </div>
          <div class="kids-game-progress" aria-label="تقدم اللعبة ${progress.percent}%">
            <div><span>التقدم</span><b>${progress.percent}%</b></div>
            <div class="kids-progress-track"><i style="width:${progress.percent}%"></i></div>
            <div class="kids-progress-rewards"><span class="kids-stars">${starsMarkup(progress.stars)}</span><small>${progress.started?'بدأت اللعبة':'لم تبدأ بعد'}</small></div>
          </div>
          <div class="kids-game-tags">${game.tags.slice(0,3).map(tag=>`<span>${escapeHtml(tag)}</span>`).join('')}</div>
          <div class="kids-game-actions">
            <button class="kids-play-button" type="button" data-kids-start="${escapeHtml(game.id)}"><span>${progress.started?'متابعة اللعب':'ابدأ اللعب'}</span><b>←</b></button>
            <button class="kids-details-button" type="button" data-kids-details="${escapeHtml(game.id)}" aria-label="عرض طريقة لعب ${escapeHtml(game.title)}">طريقة اللعب</button>
          </div>
        </div>
      </article>`;
  }

  function renderGrid(){
    const grid=document.getElementById('kidsGamesGrid');
    const count=document.getElementById('kidsGamesCount');
    if(!grid||!count)return;
    const visible=filteredGames();
    count.textContent=visible.length.toLocaleString('ar-SA');
    grid.innerHTML=visible.length?visible.map(renderCard).join(''):`<div class="kids-games-empty"><span>🧭</span><h3>لا توجد لعبة مطابقة</h3><p>جرّب تغيير العمر أو نوع اللعبة أو عبارة البحث.</p><button type="button" id="kidsResetFilters">إظهار جميع الألعاب</button></div>`;
  }

  function renderHub(library){
    if(document.getElementById('kidsGamesHub'))return true;
    const hub=document.createElement('div');
    hub.id='kidsGamesHub';
    hub.className='kids-games-hub';
    hub.setAttribute('role','region');
    hub.setAttribute('aria-labelledby','kidsGamesTitle');
    hub.innerHTML=`
      <div class="kids-games-hero">
        <div class="kids-games-hero-copy">
          <span class="kids-games-eyebrow">NEON KIDS PLAYGROUND</span>
          <h1 id="kidsGamesTitle">مكتبة ألعاب الأطفال</h1>
          <p>ثماني عشرة تجربة تعليمية وترفيهية تغطي اللغة والرياضيات والعلوم والبرمجة والإبداع والصحة والمهارات الاجتماعية.</p>
          <div class="kids-safety-pills"><span>✓ مناسبة للعمر</span><span>✓ تقدم محفوظ محليًا</span><span>✓ ملخص للوالد والمعلم</span></div>
        </div>
        <div class="kids-games-hero-art" aria-hidden="true">
          <div class="kids-planet">🎮</div><span class="kids-hero-star star-one">✦</span><span class="kids-hero-star star-two">★</span><span class="kids-hero-star star-three">•</span>
        </div>
        <div class="kids-games-stats">
          <span><b>${GAMES.length.toLocaleString('ar-SA')}</b> لعبة</span>
          <span><b>${GAMES.filter(game=>game.featured).length.toLocaleString('ar-SA')}</b> اختيارات أساسية</span>
          <span><b>٣–١٣</b> سنة</span>
        </div>
      </div>

      <div class="kids-games-toolbar">
        <div class="kids-category-filters" role="group" aria-label="تصفية حسب نوع اللعبة">
          <button class="active" type="button" data-kids-category="all">الكل</button>
          <button type="button" data-kids-category="educational">تعليمية</button>
          <button type="button" data-kids-category="entertainment">ترفيهية</button>
        </div>
        <label class="kids-search"><span>⌕</span><input id="kidsGameSearch" type="search" placeholder="ابحث بالعربية أو الإنجليزية..." autocomplete="off"></label>
        <label class="kids-age-filter"><span>العمر</span><select id="kidsAgeFilter"><option value="all">كل الأعمار</option><option value="3-5">٣–٥ سنوات</option><option value="6-8">٦–٨ سنوات</option><option value="9-11">٩–١١ سنة</option><option value="12-14">١٢–١٤ سنة</option></select></label>
        <div class="kids-result-count"><b id="kidsGamesCount">${GAMES.length.toLocaleString('ar-SA')}</b><span>لعبة ظاهرة</span></div>
      </div>

      <div id="kidsGamesGrid" class="kids-games-grid"></div>
    `;
    const heading=library.querySelector('.section-heading');
    if(heading)library.insertBefore(hub,heading);else library.prepend(hub);
    renderGrid();
    bindHubEvents(hub);
    return true;
  }

  function bindHubEvents(hub){
    hub.addEventListener('click',event=>{
      const categoryButton=event.target.closest('[data-kids-category]');
      if(categoryButton){
        state.category=categoryButton.dataset.kidsCategory;
        hub.querySelectorAll('[data-kids-category]').forEach(button=>button.classList.toggle('active',button===categoryButton));
        renderGrid();
        return;
      }
      const startButton=event.target.closest('[data-kids-start]');
      if(startButton){
        const game=GAMES.find(item=>item.id===startButton.dataset.kidsStart);
        if(game)startGame(game);
        return;
      }
      const detailsButton=event.target.closest('[data-kids-details]');
      if(detailsButton){
        const game=GAMES.find(item=>item.id===detailsButton.dataset.kidsDetails);
        if(game)openDetails(game,detailsButton);
        return;
      }
      if(event.target.closest('#kidsResetFilters'))resetFilters(hub);
    });

    hub.querySelector('#kidsGameSearch')?.addEventListener('input',event=>{
      state.query=event.target.value;
      renderGrid();
    });
    hub.querySelector('#kidsAgeFilter')?.addEventListener('change',event=>{
      state.age=event.target.value;
      renderGrid();
    });
  }

  function resetFilters(hub){
    state.category='all';state.age='all';state.query='';
    hub.querySelectorAll('[data-kids-category]').forEach(button=>button.classList.toggle('active',button.dataset.kidsCategory==='all'));
    const search=hub.querySelector('#kidsGameSearch');
    const age=hub.querySelector('#kidsAgeFilter');
    if(search)search.value='';
    if(age)age.value='all';
    renderGrid();
  }

  function startGame(game){
    markStarted(game);
    renderGrid();

    const area=document.getElementById('areaFilter');
    const subject=document.getElementById('subjectFilter');
    const level=document.getElementById('levelFilter');
    const search=document.getElementById('searchInput');
    if(area){area.value='games';area.dispatchEvent(new Event('change',{bubbles:true}));}
    if(subject){subject.value='all';subject.dispatchEvent(new Event('change',{bubbles:true}));}
    if(level){level.value='all';level.dispatchEvent(new Event('change',{bubbles:true}));}
    if(search){search.value=game.searchTerm;search.dispatchEvent(new Event('input',{bubbles:true}));}

    setTimeout(()=>{
      const button=document.querySelector('#lessonGrid [data-open-lesson]');
      if(button){button.click();}
      else document.getElementById('library')?.scrollIntoView({behavior:'smooth',block:'start'});
    },100);

    window.gtag?.('event','kids_game_started',{game_id:game.id,game_title:game.title,app_name:'neon_academy_2060'});
  }

  function ensureModal(){
    let modal=document.getElementById('kidsGameDetailsModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='kidsGameDetailsModal';
    modal.className='kids-game-modal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<div class="kids-game-modal-panel" role="dialog" aria-modal="true" aria-labelledby="kidsModalTitle"><button class="kids-modal-close" type="button" aria-label="إغلاق">×</button><div id="kidsModalContent"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',event=>{
      if(event.target===modal||event.target.closest('.kids-modal-close'))closeModal();
      const start=event.target.closest('[data-kids-modal-start]');
      if(start){
        const game=GAMES.find(item=>item.id===start.dataset.kidsModalStart);
        closeModal();
        if(game)startGame(game);
      }
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&modal.classList.contains('open'))closeModal();
    });
    return modal;
  }

  function openDetails(game,trigger){
    const modal=ensureModal();
    const progress=progressFor(game);
    const content=modal.querySelector('#kidsModalContent');
    lastFocusedElement=trigger||document.activeElement;
    content.innerHTML=`
      <div class="kids-modal-visual" style="--game-a:${game.colors[0]};--game-b:${game.colors[1]}"><span>${escapeHtml(game.icon)}</span></div>
      <div class="kids-modal-copy">
        <span class="kids-games-eyebrow">${escapeHtml(game.categoryLabel)}</span>
        <h2 id="kidsModalTitle" lang="en">${escapeHtml(game.title)}</h2>
        <div class="kids-modal-arabic-title">${escapeHtml(game.arabicTitle)}</div>
        <p>${escapeHtml(game.description)}</p>
        <div class="kids-modal-info">
          <span><small>الفئة العمرية</small><b>${game.minAge}–${game.maxAge} سنة</b></span>
          <span><small>المدة المتوقعة</small><b>${game.duration} دقائق</b></span>
          <span><small>مستوى الصعوبة</small><b>${escapeHtml(game.difficulty)}</b></span>
          <span><small>المهارة الرئيسة</small><b>${escapeHtml(game.skill)}</b></span>
          <span><small>عدد المراحل</small><b>${game.stages} مرحلة</b></span>
          <span><small>نمط اللعب</small><b>${escapeHtml(game.mode)}</b></span>
        </div>
        <div class="kids-modal-progress">
          <div><span>التقدم المحفوظ</span><b>${progress.percent}%</b></div>
          <div class="kids-progress-track"><i style="width:${progress.percent}%"></i></div>
          <div class="kids-stars">${starsMarkup(progress.stars)}</div>
        </div>
        <section class="kids-how-to-play"><h3>طريقة اللعب</h3><ol>${game.howToPlay.map(step=>`<li>${escapeHtml(step)}</li>`).join('')}</ol></section>
        <div class="kids-modal-goal"><b>المهارات التي تطورها اللعبة</b><p>${escapeHtml(game.goal)}</p></div>
        <div class="kids-teacher-summary"><b>ملخص للوالد أو المعلم</b><p>${escapeHtml(game.teacherSummary)}</p></div>
        <button class="kids-play-button kids-modal-start" type="button" data-kids-modal-start="${escapeHtml(game.id)}"><span>${progress.started?'متابعة '+escapeHtml(game.title):'ابدأ '+escapeHtml(game.title)}</span><b>←</b></button>
      </div>`;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('kids-modal-open');
    setTimeout(()=>modal.querySelector('.kids-modal-close')?.focus(),30);
  }

  function closeModal(){
    const modal=document.getElementById('kidsGameDetailsModal');
    if(!modal)return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('kids-modal-open');
    if(lastFocusedElement?.isConnected)lastFocusedElement.focus();
  }

  function tryMount(){
    attempts++;
    if(document.body.dataset.center!=='games')return false;
    const library=document.getElementById('library');
    if(!library||!window.NEON_ACADEMY){
      if(attempts>240&&observer)observer.disconnect();
      return false;
    }
    const mounted=renderHub(library);
    if(mounted&&observer)observer.disconnect();
    return mounted;
  }

  observer=new MutationObserver(tryMount);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tryMount,{once:true});
  else tryMount();
  setTimeout(()=>observer?.disconnect(),25000);
})();