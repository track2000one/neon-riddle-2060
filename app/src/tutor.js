import './styles.css';
import './tutor.css';
import { ensureAuth, renderAccount } from './auth.js';

const HISTORY_KEY = 'neonLocalTutorHistoryV3';
const SETTINGS_KEY = 'neonLocalTutorSettingsV2';
const MAX_HISTORY = 80;

const modeMeta = {
  explain: { title:'وضع الشرح', hint:'اكتب المفهوم الذي تريد فهمه.' },
  exercise: { title:'وضع التمرين', hint:'حدد الموضوع وسأنشئ تدريبًا متدرجًا.' },
  plan: { title:'خطة المذاكرة', hint:'اكتب هدفك والمدة المتاحة يوميًا.' },
  review: { title:'مراجعة الإجابة', hint:'الصق السؤال وإجابتك وسأقدم تغذية راجعة.' },
  code: { title:'مراجعة الكود', hint:'الصق HTML أو CSS أو JavaScript للمراجعة.' }
};

const subjectMeta = {
  general: {
    name:'التعلم العام', icon:'📚',
    anchors:['الفكرة الرئيسة','المثال','التطبيق','التحقق'],
    method:'التعريف ثم المثال ثم التطبيق ثم التلخيص',
    review:'وضوح الفكرة وترابطها مع المثال'
  },
  math: {
    name:'الرياضيات', icon:'∑',
    anchors:['المعطيات','القاعدة','التعويض','التحقق من الناتج'],
    method:'تحديد المعطيات والمطلوب، اختيار القانون، الحل، ثم التحقق',
    review:'صحة الخطوات والقانون والوحدات'
  },
  physics: {
    name:'الفيزياء', icon:'⚛️',
    anchors:['الظاهرة','القانون','الوحدات','التطبيق الواقعي'],
    method:'وصف الظاهرة ثم ربطها بالقانون والوحدات والتطبيق',
    review:'القانون والاتجاه والوحدة وتفسير النتيجة'
  },
  chemistry: {
    name:'الكيمياء', icon:'🧪',
    anchors:['المادة','التغير','المعادلة','الملاحظة التجريبية'],
    method:'تحديد المواد والجسيمات ثم التغير والمعادلة والدليل',
    review:'اتزان المعادلات ودقة المصطلحات والتمييز بين التغيرات'
  },
  biology: {
    name:'الأحياء', icon:'🧬',
    anchors:['التركيب','الوظيفة','العلاقة','الأثر على الكائن'],
    method:'ربط كل تركيب بوظيفته ثم أثره في النظام الحيوي',
    review:'ترتيب العمليات والعلاقة بين التركيب والوظيفة'
  },
  earthScience: {
    name:'علوم الأرض والفضاء', icon:'🌍',
    anchors:['البنية','العملية','الدليل','التغير عبر الزمن'],
    method:'وصف النظام الأرضي أو الفضائي ثم تفسير العملية بالأدلة',
    review:'التسلسل الزمني والمكاني وربط الظاهرة بأسبابها'
  },
  environment: {
    name:'العلوم البيئية', icon:'🌱',
    anchors:['النظام البيئي','العامل المؤثر','النتيجة','الحل المستدام'],
    method:'تحديد عناصر النظام ثم سبب المشكلة وأثرها والحلول الممكنة',
    review:'العلاقة بين السبب والنتيجة وقابلية الحل للتطبيق'
  },
  arabic: {
    name:'اللغة العربية', icon:'ض',
    anchors:['السياق','القاعدة','الشاهد','التطبيق'],
    method:'قراءة السياق ثم تحديد القاعدة والاستشهاد والتطبيق',
    review:'سلامة اللغة والدليل النحوي أو البلاغي'
  },
  english: {
    name:'اللغة الإنجليزية', icon:'EN',
    anchors:['meaning','form','example','common mistake'],
    method:'فهم المعنى ثم الصيغة والاستخدام والخطأ الشائع',
    review:'grammar, vocabulary, clarity, and natural usage'
  },
  geography: {
    name:'الجغرافيا', icon:'🗺️',
    anchors:['الموقع','الخصائص','العوامل','النتائج المكانية'],
    method:'تحديد أين تحدث الظاهرة، وما خصائص المكان، ولماذا تختلف مكانيًا',
    review:'دقة الموقع وربط العوامل الطبيعية والبشرية بالنتائج'
  },
  history: {
    name:'التاريخ', icon:'🏺',
    anchors:['الزمن','الحدث','الأسباب','النتائج والدلالات'],
    method:'بناء خط زمني يربط الحدث بأسبابه ونتائجه ومصادره',
    review:'التسلسل الزمني وصحة العلاقة بين السبب والنتيجة'
  },
  socialStudies: {
    name:'الدراسات الاجتماعية', icon:'👥',
    anchors:['المجتمع','المؤسسة','السلوك','الأثر المتبادل'],
    method:'تحليل العلاقة بين الفرد والمجتمع والمؤسسات والقيم',
    review:'تعدد وجهات النظر والاستناد إلى مثال اجتماعي واضح'
  },
  islamicStudies: {
    name:'الدراسات الإسلامية', icon:'🕌',
    anchors:['النص أو الحكم','المعنى','الدليل','التطبيق والسلوك'],
    method:'فهم النص أو الحكم في سياقه ثم بيان دليله وأثره العملي',
    review:'سلامة الاستدلال واحترام سياق النص والمصطلح الشرعي'
  },
  civics: {
    name:'المواطنة والأنظمة', icon:'⚖️',
    anchors:['الحق','المسؤولية','النظام','الأثر المجتمعي'],
    method:'ربط الحقوق بالواجبات وبيان دور الأنظمة والمؤسسات',
    review:'دقة المفاهيم النظامية والتمييز بين الحق والواجب'
  },
  economics: {
    name:'الاقتصاد', icon:'📈',
    anchors:['المورد','الاختيار','التكلفة','الأثر الاقتصادي'],
    method:'تحديد الموارد والبدائل والحوافز ثم تحليل النتائج',
    review:'التمييز بين السبب الاقتصادي والمؤشر والنتيجة'
  },
  business: {
    name:'إدارة الأعمال وريادة الأعمال', icon:'💼',
    anchors:['المشكلة','العميل','القيمة','نموذج التنفيذ'],
    method:'تحديد حاجة العميل ثم القيمة المقترحة والموارد ومؤشرات النجاح',
    review:'وضوح الهدف وقابلية التنفيذ والقياس'
  },
  accounting: {
    name:'المحاسبة', icon:'🧾',
    anchors:['العملية المالية','الحسابات','القيد','الأثر على القوائم'],
    method:'تحليل العملية ثم تحديد المدين والدائن وأثرها المالي',
    review:'توازن القيد وتصنيف الحسابات ودقة الأرقام'
  },
  health: {
    name:'الصحة واللياقة', icon:'❤️',
    anchors:['السلوك الصحي','الفائدة','المخاطر','الخطة الآمنة'],
    method:'فهم الهدف الصحي ثم اختيار سلوك تدريجي قابل للقياس',
    review:'السلامة والواقعية والاستمرارية وعدم المبالغة'
  },
  digitalSkills: {
    name:'المهارات الرقمية والحاسب', icon:'💻',
    anchors:['المهمة','الأداة','الخطوات','الأمان الرقمي'],
    method:'اختيار الأداة المناسبة وتنفيذ الخطوات مع حماية البيانات',
    review:'الدقة والأمان وسهولة إعادة تنفيذ الخطوات'
  },
  coding: {
    name:'البرمجة', icon:'⌨️',
    anchors:['المطلوب','المنطق','التنفيذ','الاختبار'],
    method:'تحويل المشكلة إلى خطوات ثم كود صغير واختبارات واضحة',
    review:'صحة المنطق والأمان وقابلية القراءة والحالات الحدية'
  },
  research: {
    name:'مهارات البحث العلمي', icon:'🔬',
    anchors:['سؤال البحث','المصدر','المنهج','النتيجة والحدود'],
    method:'صياغة سؤال محدد ثم جمع مصادر موثوقة وتحليلها وتوثيقها',
    review:'جودة المصادر ووضوح المنهج وعدم تجاوز الأدلة'
  },
  criticalThinking: {
    name:'التفكير الناقد', icon:'🧠',
    anchors:['الادعاء','الدليل','الافتراض','الاستنتاج البديل'],
    method:'فصل الادعاء عن الدليل واختبار الافتراضات والمغالطات',
    review:'قوة الدليل وعدالة المقارنة ووجود بدائل منطقية'
  },
  qudurat: {
    name:'القدرات', icon:'🎯',
    anchors:['فهم المطلوب','اختصار المعطيات','استراتيجية الحل','إدارة الوقت'],
    method:'تصنيف السؤال واختيار أقصر استراتيجية ثم التحقق السريع',
    review:'الدقة والسرعة واختيار الاستراتيجية الأنسب'
  },
  tahsili: {
    name:'التحصيلي', icon:'🧪',
    anchors:['المفهوم العلمي','القانون أو العلاقة','التطبيق','الربط بين المواد'],
    method:'استرجاع المفهوم ثم تطبيقه في سؤال متدرج وربطه بمفاهيم قريبة',
    review:'دقة المفهوم وسرعة الاستدعاء والربط بين القوانين'
  }
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
  earthScience:[
    ['فسر باختصار كيف تتكون الصخور الرسوبية، ورتب المراحل.','ابدأ بالتجوية ثم النقل فالترسيب والتماسك.'],
    ['قارن بين دوران الأرض حول نفسها ودورانها حول الشمس من حيث المدة والنتيجة.','اربط كل حركة بظاهرة زمنية محددة.']
  ],
  environment:[
    ['حلل أثر قطع الأشجار في التنوع الحيوي ودورة الكربون.','اكتب سلسلة سبب ونتيجة، ثم اقترح حلًا مستدامًا.'],
    ['اقترح ثلاث خطوات لخفض استهلاك المياه في مدرسة مع مؤشر قياس لكل خطوة.','الحل الجيد قابل للتنفيذ والقياس.']
  ],
  arabic:[
    ['حدد نوع الجملة في: «العلم نور» ثم أعرب الكلمتين.','ابدأ بالمبتدأ ثم الخبر وعلامة الرفع.'],
    ['استخرج الفكرة الرئيسة من فقرة قصيرة، ثم اكتب دليلًا واحدًا عليها.','الفكرة الرئيسة أعم من التفاصيل.']
  ],
  english:[
    ['Choose the correct form: She ___ to school every day. (go / goes / going / went)','Look for the present-simple marker and third-person singular subject.'],
    ['Write two sentences that show the difference between “since” and “for”.','Use since with a starting point and for with a duration.']
  ],
  geography:[
    ['فسر اختلاف المناخ بين مدينتين تقعان على خط عرض متقارب إحداهما ساحلية والأخرى داخلية.','قارن أثر البحر والرطوبة والمدى الحراري.'],
    ['اقرأ خريطة افتراضية وحدد أفضل موقع لمدينة جديدة مع ذكر ثلاثة معايير.','فكر في المياه والنقل والتضاريس والمخاطر.']
  ],
  history:[
    ['أنشئ خطًا زمنيًا من أربعة أحداث لمرحلة تاريخية، ثم وضح نقطة التحول الرئيسة.','لا تكتف بالتواريخ؛ اربط الحدث بما غيّره.'],
    ['قارن بين سبب مباشر وسبب طويل المدى لحدث تاريخي تختاره.','السبب المباشر يطلق الحدث، والطويل يهيئ الظروف.']
  ],
  socialStudies:[
    ['اشرح كيف تؤثر الأسرة والمدرسة في تشكيل سلوك الفرد مع مثال لكل مؤسسة.','ميز بين القيم والتعلم والمراقبة الاجتماعية.'],
    ['ناقش أثر وسائل التواصل في المجتمع: فائدتان ومخاطرتان وحل وقائي.','استخدم أمثلة متوازنة ولا تعتمد على رأي واحد.']
  ],
  islamicStudies:[
    ['اختر قيمة إسلامية مثل الأمانة واشرح معناها وأثرها في موقف يومي.','اربط القيمة بالسلوك العملي والنتيجة.'],
    ['بيّن الفرق بين العبادة والمعاملة مع مثالين لكل منهما.','ركز على التعريف ثم التطبيق.']
  ],
  civics:[
    ['اذكر حقين وواجبين للمواطن، ثم وضح كيف يكمل كل حق واجبًا.','لا تجعل الحقوق منفصلة عن المسؤولية.'],
    ['حلل موقفًا يتعارض فيه حق الفرد مع مصلحة عامة واقترح حلًا متوازنًا.','استند إلى النظام والعدالة والتناسب.']
  ],
  economics:[
    ['لديك 100 ريال وخياران للشراء. اشرح مفهوم تكلفة الفرصة البديلة في هذا الموقف.','التكلفة ليست السعر فقط، بل ما تنازلت عنه.'],
    ['إذا ارتفع الطلب على منتج مع ثبات العرض، ماذا تتوقع للسعر والكمية؟ علل.','استخدم علاقة العرض والطلب.']
  ],
  business:[
    ['اختر مشكلة يومية وحولها إلى فكرة مشروع: العميل، المشكلة، الحل، والقيمة.','ابدأ بالمشكلة لا بالمنتج.'],
    ['صمم مؤشر أداء لمتجر إلكتروني يقيس رضا العملاء.','يجب أن يكون المؤشر محددًا وقابلًا للقياس.']
  ],
  accounting:[
    ['اشترت منشأة معدات نقدًا بمبلغ 5000 ريال. حدد الحساب المدين والدائن.','الأصل زاد والنقد انخفض.'],
    ['صنف الحسابات الآتية: صندوق، قرض، رأس مال، إيراد مبيعات، مصروف إيجار.','حدد هل الحساب أصل أو التزام أو حقوق ملكية أو إيراد أو مصروف.']
  ],
  health:[
    ['ضع خطة أسبوعية بسيطة للنشاط البدني تشمل التدرج والراحة.','اجعل الهدف واقعيًا وحدد الشدة والمدة.'],
    ['فسر لماذا النوم المنتظم مهم للتعلم والصحة.','اربط النوم بالتركيز والذاكرة والمناعة.']
  ],
  digitalSkills:[
    ['رتب خطوات إنشاء كلمة مرور قوية مع تفعيل المصادقة الثنائية.','تجنب المعلومات الشخصية وإعادة استخدام كلمة المرور.'],
    ['قارن بين التخزين المحلي والتخزين السحابي من حيث الوصول والنسخ الاحتياطي والخصوصية.','لا يوجد خيار أفضل مطلقًا؛ يعتمد على الاستخدام.']
  ],
  coding:[
    ['اكتب دالة JavaScript تستقبل مصفوفة أعداد وتعيد مجموع الأعداد الموجبة فقط.','استخدم filter ثم reduce أو حلقة واضحة.'],
    ['أنشئ زر HTML يغير نص فقرة عند الضغط عليه دون استخدام مكتبات.','اربط click listener ثم عدّل textContent.']
  ],
  research:[
    ['حوّل موضوع «استخدام التقنية في التعليم» إلى سؤال بحث محدد قابل للدراسة.','حدد الفئة والمتغير والبيئة والزمن.'],
    ['قيّم مصدرًا إلكترونيًا باستخدام: المؤلف، التاريخ، الدليل، والتحيز.','المظهر الاحترافي لا يكفي لإثبات الموثوقية.']
  ],
  criticalThinking:[
    ['حلل الادعاء: «كل من يدرس ساعات أطول يحصل على نتيجة أعلى». ما الافتراضات؟','ابحث عن عوامل أخرى مثل جودة الدراسة والنوم.'],
    ['اكتب دليلًا يؤيد رأيًا ودليلًا يعارضه، ثم حدد أيهما أقوى ولماذا.','قارن جودة المصدر وملاءمته لا عدد الأدلة فقط.']
  ],
  qudurat:[
    ['عدد إذا زيد عليه 25% أصبح 100، فما العدد الأصلي؟','اعتبر العدد الأصلي 100% والناتج 125%.'],
    ['اختر الكلمة المختلفة: شجرة، زهرة، عشب، حجر. ثم اذكر معيار التصنيف.','ابحث عن الصفة المشتركة بين ثلاثة عناصر.']
  ],
  tahsili:[
    ['اختر مفهومًا من الرياضيات أو الفيزياء، واكتب سؤالًا يربطه بتطبيق واقعي.','اجعل السؤال يحتاج فهمًا لا حفظ تعريف فقط.'],
    ['أنشئ خريطة مفاهيم تربط ثلاثة قوانين أو مفاهيم من مادة علمية واحدة.','اكتب على كل رابط نوع العلاقة بين المفهومين.']
  ]
};

const subjectQuickPrompts = {
  geography:['اشرح توزيع المناخات','قارن بين موقعين','حلل خريطة','اختبرني في الجغرافيا'],
  history:['أنشئ خطًا زمنيًا','فسر أسباب حدث تاريخي','قارن بين مرحلتين','اختبرني في التاريخ'],
  islamicStudies:['اشرح قيمة إسلامية','وضح حكمًا مع تطبيق','اختبرني بسؤال','ضع خطة مراجعة'],
  economics:['اشرح العرض والطلب','أعطني حالة اقتصادية','حلل قرارًا ماليًا','اختبر فهمي'],
  research:['ساعدني في سؤال بحث','قيّم مصدرًا','رتب خطوات البحث','راجع صياغتي'],
  criticalThinking:['حلل هذا الادعاء','اكتشف الافتراضات','قيّم قوة الدليل','أعطني مغالطة لأحللها']
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
  const value = document.getElementById('tutorSubject').value;
  return subjectMeta[value] ? value : 'general';
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
  updateQuickPrompts();
}
function updateQuickPrompts() {
  const prompts = subjectQuickPrompts[getSubject()] || [
    'اشرح الفكرة بطريقة سهلة',
    'أعطني مثالًا محلولًا',
    'اختبر فهمي بسؤال',
    'ضع خطوات للمراجعة'
  ];
  document.querySelectorAll('#tutorQuickPrompts button').forEach((button, index) => {
    button.textContent = prompts[index] || prompts[0];
  });
}

function renderWelcome() {
  const selected = subjectMeta[getSubject()];
  messages.innerHTML = `<div class="tutor-welcome"><span>${selected.icon}</span><h2>مرحبًا ${escapeHtml(activeUserName)}</h2><p>أنا المعلم الذكي المحلي. اخترت مادة ${escapeHtml(selected.name)}. أعمل داخل جهازك، ولا أرسل رسائلك إلى خدمة خارجية.</p></div>`;
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
  const meta = subjectMeta[subject] || subjectMeta.general;
  const topic = cleanTopic(text);
  const depth = level === 'foundation'
    ? 'استخدم تعريفًا مبسطًا ومثالًا واحدًا، ثم أعد شرح الفكرة بكلماتك.'
    : level === 'mastery'
      ? 'اربط المفهوم بحالة مركبة، وقارن بين تفسيرين، وحدد الخطأ الشائع.'
      : 'اجمع بين الفكرة والخطوات ومثال تطبيقي وسؤال تحقق.';
  return `${meta.icon} شرح ${topic} — ${meta.name} (${levelName(level)})

1) مدخل المادة
الطريقة الأنسب هنا: ${meta.method}.

2) عناصر الفهم
• ${meta.anchors[0]}
• ${meta.anchors[1]}
• ${meta.anchors[2]}
• ${meta.anchors[3]}

3) خطوات الدراسة
• ابدأ بتحديد ما تعرفه وما تحتاج إلى معرفته.
• استخرج الكلمات أو البيانات الأساسية.
• اربط كل فكرة بدليل أو مثال من المادة.
• اختبر فهمك بسؤال جديد، لا بمجرد إعادة النص.

4) مثال تطبيقي
طبّق «${topic}» في موقف صغير: حدد ${meta.anchors[0]}، ثم حلل ${meta.anchors[1]}، واربطه بـ${meta.anchors[2]}، واختم بـ${meta.anchors[3]}.

5) معيار الجودة
ركز على: ${meta.review}.

سؤال تحقق: كيف تشرح «${topic}» في ثلاث جمل: تعريف، سبب أو دليل، وتطبيق؟

${depth}`;
}
function exerciseResponse(subject, level) {
  const meta = subjectMeta[subject] || subjectMeta.general;
  const entries = exerciseBank[subject] || exerciseBank.general;
  const index = Math.floor((Date.now() / 1000) % entries.length);
  const [question, hint] = entries[index];
  return `${meta.icon} تمرين ${meta.name} — مستوى ${levelName(level)}

السؤال:
${question}

تلميح تدريجي:
${hint}

طريقة العمل المناسبة للمادة:
${meta.method}.

خطوات عامة:
1. اكتب الكلمات أو المعطيات الأساسية.
2. حدد القاعدة أو الدليل أو الاستراتيجية.
3. نفذ الإجابة بترتيب واضح.
4. راجع ${meta.review}.

أرسل إجابتك بعد الحل، ثم استخدم وضع «راجع إجابتي» للحصول على تقييم مفصل.`;
}
function planResponse(text, subject, level) {
  const meta = subjectMeta[subject] || subjectMeta.general;
  const minutesMatch = String(text).match(/(\d{2,3})\s*(?:دقيقة|دق|minutes?)/i);
  const daily = Math.min(180, Math.max(20, Number(minutesMatch?.[1] || 45)));
  const days = level === 'foundation' ? 7 : level === 'mastery' ? 10 : 8;
  const learn = Math.round(daily * .35);
  const practice = Math.round(daily * .45);
  const review = daily - learn - practice;
  return `🗓️ خطة ${meta.name} — ${days} أيام (${daily} دقيقة يوميًا)

التقسيم اليومي:
• ${learn} دقيقة: فهم ${meta.anchors[0]} و${meta.anchors[1]}.
• ${practice} دقيقة: تطبيق على ${meta.anchors[2]}.
• ${review} دقيقة: مراجعة ${meta.anchors[3]} وتسجيل الأخطاء.

الأيام 1–2: المصطلحات والخريطة العامة للمادة.
الأيام 3–4: أمثلة وتمارين أو مصادر متدرجة.
اليوم 5: اختبار قصير أو مهمة تطبيقية دون الرجوع للملاحظات.
اليوم 6: تحليل الأخطاء وإعادة تدريب النقاط الضعيفة.
اليوم 7: تلخيص صفحة واحدة ومحاكاة شاملة.
${days > 7 ? `الأيام 8–${days}: تحليل أعمق، أسئلة مركبة، واختبار إتقان.` : ''}

أسلوب الدراسة المقترح:
${meta.method}.

قاعدة المتابعة:
اكتب بعد كل جلسة: ما فهمته، الدليل أو المثال، الخطأ الذي صححته، والخطوة التالية.`;
}
function reviewResponse(text, subject, level) {
  const meta = subjectMeta[subject] || subjectMeta.general;
  const length = text.trim().length;
  const hasReason = /(لأن|بسبب|حيث|إذ|يدل|وفق|المصدر|therefore|because|so that|=|=>)/i.test(text);
  const hasSteps = /(1[.)]|2[.)]|أول|ثم|بعد ذلك|الخطوة|من جهة|في المقابل)/i.test(text);
  const score = Math.min(95, 42 + (length > 100 ? 20 : length > 45 ? 12 : 4) + (hasReason ? 18 : 0) + (hasSteps ? 15 : 0));
  return `✅ مراجعة أولية لإجابتك — ${meta.name}

التقدير المبدئي: ${score}%

نقاط جيدة:
• الإجابة مرتبطة بالمادة والموضوع.
• ${length > 100 ? 'قدمت تفاصيل كافية تسمح بتتبع الفكرة.' : 'بدأت بإجابة مباشرة دون حشو كبير.'}
• ${hasReason ? 'استخدمت تعليلًا أو دليلًا أو علاقة واضحة.' : 'يمكن تطوير الإجابة بإضافة سبب أو دليل.'}

ما يحتاج تحسينًا:
• ${hasSteps ? 'حافظ على الترابط بين كل خطوة وما يليها.' : 'رتب الإجابة في خطوات أو فقرات قصيرة.'}
• أضف مثالًا أو مصدرًا أو عملية تحقق مناسبة.
• راجع ${meta.review}.

صيغة أقوى:
ابدأ بإجابة مباشرة، ثم وضح ${meta.anchors[0]}، وأضف ${meta.anchors[1]}، واربط ذلك بـ${meta.anchors[2]}، واختم بـ${meta.anchors[3]}.

ملاحظة: هذه مراجعة محلية بنظام قواعد، وليست تصحيحًا رسميًا من مختص المادة.`;
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
  return `⌨️ مراجعة كود محلية

ملخص:
• عدد الأسطر: ${code.split('\n').length}
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
document.getElementById('tutorSubject').addEventListener('change', () => {
  persistSettings();
  updateQuickPrompts();
  if (!history.length) renderWelcome();
});
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
