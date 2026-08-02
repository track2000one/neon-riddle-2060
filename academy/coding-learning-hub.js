(()=>{
  'use strict';

  if(window.__MSAR_CODING_LEARNING_HUB__)return;
  window.__MSAR_CODING_LEARNING_HUB__=true;

  const THEME_KEY='neonAcademyThemeV3';
  const PROGRESS_KEY='msarCodingLearningProgressV1';
  const THEMES=[
    {id:'academic',name:'أزرق احترافي',mode:'dark'},
    {id:'deep-blue',name:'أزرق أكاديمي',mode:'dark'},
    {id:'soft-beige',name:'بيج هادئ',mode:'light'},
    {id:'pastel-study',name:'باستيل تعليمي',mode:'light'},
    {id:'mint-calm',name:'مينت هادئ',mode:'light'},
    {id:'summer-fresh',name:'صيفي مبهج',mode:'light'}
  ];

  const lesson=(id,title,level,duration,summary,body,code,question,options,answer,challenge)=>({id,title,level,duration,summary,body,code,question,options,answer,challenge});
  const course=(id,title,icon,color,description,lessons)=>({id,title,icon,color,description,lessons});

  const COURSES={
    html:course('html','HTML','<>','#22d3ee','بناء هيكل صفحات الويب بطريقة صحيحة ودلالية.',[
      lesson('html-1','هيكل صفحة الويب','تأسيسي','12 دقيقة','تعرف على العناصر الأساسية التي يبدأ بها أي مستند HTML.',['يبدأ الملف بتعريف نوع المستند، ثم عنصر html الذي يحتوي head وbody.','يوضع عنوان الصفحة والبيانات الوصفية في head، بينما يظهر المحتوى المرئي داخل body.'],`<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n  <meta charset="utf-8">\n  <title>صفحتي الأولى</title>\n</head>\n<body>\n  <h1>مرحبًا بالعالم</h1>\n</body>\n</html>`,'أين يوضع المحتوى المرئي للمستخدم؟',['داخل head','داخل body','داخل title','داخل meta'],1,'أنشئ صفحة فيها عنوان رئيسي وفقرة وزر.'),
      lesson('html-2','العناصر الدلالية','تطبيقي','14 دقيقة','استخدم عناصر توضّح معنى أجزاء الصفحة.',['العناصر مثل header وnav وmain وsection وfooter تمنح الصفحة بنية مفهومة.','البنية الدلالية تحسن الوصولية وتجعل الكود أسهل في الصيانة.'],`<header>\n  <nav aria-label="التنقل الرئيسي">القائمة</nav>\n</header>\n<main>\n  <section>\n    <h2>الدروس</h2>\n  </section>\n</main>\n<footer>جميع الحقوق محفوظة</footer>`,'أي عنصر يمثل المحتوى الرئيسي؟',['main','meta','style','script'],0,'حوّل مجموعة div إلى عناصر دلالية مناسبة.'),
      lesson('html-3','النماذج والوصولية','إتقان','16 دقيقة','أنشئ نموذجًا واضحًا يمكن استخدامه بلوحة المفاتيح.',['اربط كل حقل بعنصر label باستخدام for وid.','اختر نوع input المناسب وأضف required عندما يكون الإدخال إلزاميًا.'],`<form>\n  <label for="studentName">اسم الطالب</label>\n  <input id="studentName" name="studentName" required>\n  <button type="submit">حفظ</button>\n</form>`,'ما الفائدة الأساسية من label؟',['زيادة حجم الحقل','ربط الوصف بالحقل وتحسين الوصولية','تشغيل JavaScript','تغيير اللون'],1,'ابنِ نموذج تسجيل يحتوي الاسم والبريد وزر الإرسال.')
    ]),
    css:course('css','CSS','CSS','#a78bfa','تصميم واجهات متجاوبة وتنظيم الألوان والمسافات.',[
      lesson('css-1','المحددات والصندوق','تأسيسي','13 دقيقة','افهم طريقة اختيار العناصر وحساب أبعادها.',['يتكون صندوق العنصر من المحتوى ثم padding ثم border ثم margin.','استخدام box-sizing:border-box يجعل العرض يشمل الحشو والحدود.'],`* { box-sizing: border-box; }\n.card {\n  width: 320px;\n  padding: 24px;\n  border: 1px solid #94a3b8;\n  margin: 16px auto;\n}`,'أي خاصية تضيف مساحة داخل حدود العنصر؟',['margin','padding','gap','outline'],1,'صمم بطاقة بعرض مناسب وحواف دائرية.'),
      lesson('css-2','Flexbox وGrid','تطبيقي','17 دقيقة','رتب العناصر أفقيًا أو ضمن شبكة مرنة.',['Flexbox مناسب للمحاذاة في بعد واحد، بينما Grid ممتاز للتخطيطات ثنائية الأبعاد.','استخدم gap للمسافات بدل الهوامش المتكررة.'],`.toolbar {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n}\n.cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fit,minmax(220px,1fr));\n  gap: 16px;\n}`,'ما الأنسب لشبكة بطاقات متعددة الأعمدة؟',['Grid','float','position fixed','text-align'],0,'أنشئ شبكة بطاقات تستجيب لحجم الشاشة.'),
      lesson('css-3','الثيمات ومتغيرات CSS','إتقان','18 دقيقة','ابن نظام ألوان يمكن تبديله دون تكرار القواعد.',['تعرف المتغيرات داخل :root أو داخل محدد الثيم.','تستخدم الدالة var للوصول إلى القيمة مع إمكانية إضافة قيمة احتياطية.'],`:root {\n  --page-bg: #0f172a;\n  --surface: #172554;\n  --text: #f8fafc;\n}\n[data-theme="light"] {\n  --page-bg: #f8fafc;\n  --surface: #ffffff;\n  --text: #172033;\n}\nbody { background: var(--page-bg); color: var(--text); }`,'أين يفضل تعريف متغيرات الألوان العامة؟',['داخل كل زر','داخل :root','داخل HTML فقط','داخل التعليقات'],1,'أنشئ ثيمين فاتحًا وداكنًا لبطاقة واحدة.')
    ]),
    javascript:course('javascript','JavaScript','JS','#facc15','إضافة المنطق والتفاعل وإدارة بيانات الواجهة.',[
      lesson('js-1','المتغيرات والدوال','تأسيسي','14 دقيقة','خزن القيم ونظم منطق البرنامج داخل دوال.',['استخدم const عندما لا يعاد إسناد المتغير وlet عند الحاجة للتغيير.','الدوال تستقبل مدخلات وتعيد نتيجة قابلة لإعادة الاستخدام.'],`const student = 'أحمد';\nfunction welcome(name) {\n  return \`مرحبًا يا \${name}\`;\n}\nconsole.log(welcome(student));`,'أي كلمة تستخدم لمتغير يعاد إسناده؟',['const','let','return','class'],1,'اكتب دالة تحسب متوسط ثلاث درجات.'),
      lesson('js-2','المصفوفات والكائنات','تطبيقي','18 دقيقة','نظم مجموعة بيانات وعالجها بطرق واضحة.',['المصفوفة تحفظ قائمة مرتبة، والكائن يجمع خصائص مرتبطة بكيان واحد.','تساعد map وfilter وreduce على معالجة البيانات دون حلقات مطولة.'],`const scores = [72, 91, 84, 65];\nconst passed = scores.filter(score => score >= 70);\nconst average = scores.reduce((sum,score) => sum + score,0) / scores.length;\nconsole.log({ passed, average });`,'أي دالة تعيد العناصر المطابقة لشرط؟',['map','filter','join','push'],1,'استخرج الدرجات فوق 80 واحسب متوسطها.'),
      lesson('js-3','DOM والأحداث','تطبيقي','19 دقيقة','اربط الكود بعناصر الصفحة واستجب لتفاعل المستخدم.',['يمكن querySelector من الوصول إلى عنصر في الصفحة.','يسجل addEventListener معالجًا عند النقر أو الإدخال أو الإرسال.'],`const button = document.querySelector('#startButton');\nconst output = document.querySelector('#output');\nbutton.addEventListener('click', () => {\n  output.textContent = 'بدأ التدريب بنجاح';\n});`,'ما الذي يربط دالة بحدث النقر؟',['addEventListener','JSON.parse','setAttribute فقط','console.log'],0,'أنشئ زرًا يزيد عدادًا في كل نقرة.'),
      lesson('js-4','البرمجة غير المتزامنة','إتقان','20 دقيقة','تعامل مع العمليات التي تحتاج وقتًا دون تجميد الصفحة.',['تعيد fetch وعدًا Promise، ويمكن انتظار النتيجة باستخدام await داخل دالة async.','تحقق دائمًا من نجاح الاستجابة وعالج الأخطاء بوضوح.'],`async function loadData() {\n  try {\n    const response = await fetch('/data.json');\n    if (!response.ok) throw new Error('تعذر التحميل');\n    return await response.json();\n  } catch (error) {\n    console.error(error.message);\n    return [];\n  }\n}`,'أين يمكن استخدام await؟',['داخل دالة async','داخل CSS','داخل HTML فقط','بعد return دائمًا'],0,'اكتب دالة async تعيد قائمة فارغة عند فشل الطلب.')
    ]),
    python:course('python','Python','Py','#38bdf8','تعلم أساسيات البرمجة وحل المشكلات بلغة واضحة.',[
      lesson('py-1','القيم والشروط','تأسيسي','14 دقيقة','اكتب قرارات بسيطة اعتمادًا على البيانات.',['تحدد المسافات البادئة الكتل البرمجية في Python.','تستخدم if وelif وelse لاختيار مسار التنفيذ.'],`score = 86\nif score >= 90:\n    print("ممتاز")\nelif score >= 70:\n    print("ناجح")\nelse:\n    print("يحتاج مراجعة")`,'ما الذي يحدد كتلة if في Python؟',['الأقواس المعقوفة','المسافة البادئة','الفاصلة','النقطة'],1,'اكتب شرطًا يصنف العمر إلى طفل أو بالغ.'),
      lesson('py-2','القوائم والحلقات','تطبيقي','17 دقيقة','كرر العمليات على مجموعة قيم.',['القائمة بنية قابلة للتعديل وتحفظ عناصر متعددة.','حلقة for تمر على العناصر مباشرة بصورة مقروءة.'],`scores = [78, 92, 84]\ntotal = 0\nfor score in scores:\n    total += score\nprint(total / len(scores))`,'أي دالة تعيد عدد عناصر القائمة؟',['sum','len','range','type'],1,'احسب أعلى وأقل درجة في قائمة.'),
      lesson('py-3','الدوال والقواميس','إتقان','19 دقيقة','قسم الحل إلى وظائف صغيرة وتعامل مع بيانات منظمة.',['يعرف def دالة جديدة، ويعيد return قيمة إلى المستدعي.','القاموس يخزن أزواج مفتاح وقيمة.'],`def student_summary(student):\n    average = sum(student["scores"]) / len(student["scores"])\n    return {"name": student["name"], "average": average}\n\ndata = {"name": "سارة", "scores": [90, 88, 95]}\nprint(student_summary(data))`,'ما البنية المناسبة لأزواج مفتاح وقيمة؟',['tuple','dictionary','string','set فقط'],1,'اكتب دالة تعيد ملخص منتج من قاموس.')
    ]),
    java:course('java','Java','J','#fb923c','فهم البرمجة الكائنية وبناء تطبيقات منظمة.',[
      lesson('java-1','الفئات والأنواع','تأسيسي','16 دقيقة','تعرف على بنية برنامج Java والأنواع الأساسية.',['كل تطبيق يبدأ عادة من دالة main داخل class.','Java لغة ثابتة الأنواع، لذلك يحدد نوع المتغير عند تعريفه.'],`public class Main {\n  public static void main(String[] args) {\n    String name = "Lina";\n    int score = 95;\n    System.out.println(name + ": " + score);\n  }\n}`,'أين يبدأ تنفيذ التطبيق التقليدي؟',['main','constructor','package','import'],0,'اطبع اسم طالب ودرجته باستخدام متغيرين.'),
      lesson('java-2','الكائنات والتغليف','إتقان','20 دقيقة','أنشئ نماذج بيانات تحمي حالتها الداخلية.',['الكائن نسخة من class وتجمع خصائص وسلوكًا.','استخدم private للحقول، ثم وفر دوالًا عامة للوصول المنضبط.'],`class Student {\n  private String name;\n  Student(String name) { this.name = name; }\n  public String getName() { return name; }\n}`,'أي محدد وصول يحمي الحقل داخل الفئة؟',['public','private','static','final'],1,'أنشئ فئة Product بخصائص خاصة ودوال قراءة.')
    ]),
    cpp:course('cpp','C++','C+','#60a5fa','تعلم التحكم الدقيق وبنى البيانات والخوارزميات.',[
      lesson('cpp-1','الأنواع والإدخال','تأسيسي','16 دقيقة','اكتب برنامجًا بسيطًا يقرأ قيمة ويعرض نتيجة.',['يتضمن iostream أدوات الإدخال والإخراج القياسية.','تبدأ نقطة التنفيذ من الدالة main.'],`#include <iostream>\nusing namespace std;\nint main() {\n  int score;\n  cin >> score;\n  cout << score * 2 << endl;\n  return 0;\n}`,'أي كائن يستخدم للإدخال القياسي؟',['cout','cin','endl','vector'],1,'اقرأ رقمين واطبع مجموعهما.'),
      lesson('cpp-2','المتجهات والحلقات','تطبيقي','19 دقيقة','تعامل مع مجموعة ديناميكية من العناصر.',['vector يوفر مصفوفة ديناميكية آمنة نسبيًا.','يمكن استخدام حلقة range-based للمرور على العناصر.'],`#include <vector>\n#include <iostream>\nusing namespace std;\nint main(){\n  vector<int> values = {4,8,12};\n  int total = 0;\n  for (int value : values) total += value;\n  cout << total;\n}`,'أي بنية تمثل مصفوفة ديناميكية؟',['vector','namespace','include','endl'],0,'احسب متوسط عناصر vector.')
    ]),
    csharp:course('csharp','C#','C#','#e879f9','بناء تطبيقات منظمة باستخدام منظومة .NET.',[
      lesson('cs-1','بنية التطبيق','تأسيسي','16 دقيقة','تعرف على class ودالة Main والإخراج.',['تجمع namespace الأنواع المرتبطة، بينما تمثل class قالبًا للكائنات.','Console.WriteLine تعرض نصًا في وحدة التحكم.'],`using System;\nclass Program {\n  static void Main() {\n    string course = "C#";\n    Console.WriteLine($"Learning {course}");\n  }\n}`,'أي دالة تعرض سطرًا في الطرفية؟',['Console.WriteLine','return','new','using'],0,'اكتب برنامجًا يطبع مجموع رقمين.'),
      lesson('cs-2','LINQ والمجموعات','إتقان','20 دقيقة','استعلم عن المجموعات بعبارات واضحة.',['تقدم LINQ عمليات مثل Where وSelect وAverage.','تساعد على فصل منطق الاستعلام عن تفاصيل الحلقات.'],`using System.Linq;\nvar scores = new[] { 70, 92, 81, 66 };\nvar passed = scores.Where(score => score >= 70);\nConsole.WriteLine(passed.Average());`,'أي عملية تختار العناصر المطابقة؟',['Where','Select','Average','OrderBy فقط'],0,'رشح قائمة درجات ثم رتبها تنازليًا.')
    ]),
    dart:course('dart','Dart','D','#2dd4bf','بناء منطق واضح يمهد لتطبيقات Flutter.',[
      lesson('dart-1','المتغيرات والدوال','تأسيسي','15 دقيقة','تعرف على final وvar ودوال Dart.',['استخدم final لقيمة تضبط مرة واحدة، وvar عندما يستنتج النوع.','تدعم Dart الدوال المختصرة باستخدام =>.'],`double average(List<int> scores) =>\n    scores.reduce((a,b) => a + b) / scores.length;\nvoid main() {\n  final result = average([80, 90, 100]);\n  print(result);\n}`,'أي كلمة تمنع إعادة إسناد المتغير؟',['var','final','dynamic','void'],1,'اكتب دالة سهمية تضاعف رقمًا.'),
      lesson('dart-2','النماذج وNull Safety','إتقان','19 دقيقة','نمذج البيانات وتعامل مع القيم الاختيارية بأمان.',['علامة ? تجعل النوع قابلًا لأن يكون null.','يمكن استخدام ?? لتقديم قيمة احتياطية.'],`class Student {\n  final String name;\n  final String? email;\n  Student(this.name, this.email);\n  String label() => email ?? 'لا يوجد بريد';\n}`,'أي عامل يقدم قيمة بديلة عند null؟',['??','=>','==','&&'],0,'أنشئ فئة Course بعنوان ووصف اختياري.')
    ]),
    sql:course('sql','SQL','DB','#fbbf24','تصميم البيانات والاستعلام عنها بكفاءة.',[
      lesson('sql-1','الجداول والاستعلام','تأسيسي','15 دقيقة','أنشئ جدولًا واقرأ بياناته.',['يحدد CREATE TABLE بنية الجدول، بينما SELECT يقرأ الصفوف.','اختر أنواع بيانات مناسبة وضع مفتاحًا أساسيًا لكل سجل.'],`CREATE TABLE students (\n  id INTEGER PRIMARY KEY,\n  name VARCHAR(100) NOT NULL,\n  score INTEGER\n);\nSELECT name, score FROM students;`,'أي أمر يقرأ البيانات؟',['SELECT','DROP','ALTER','CREATE'],0,'أنشئ جدول courses ثم استعلم عن عناوينه.'),
      lesson('sql-2','التصفية والتجميع','تطبيقي','18 دقيقة','رشح النتائج واحسب مؤشرات مجمعة.',['تحدد WHERE الصفوف المطلوبة، وتجمع GROUP BY الصفوف حسب قيمة مشتركة.','تقدم الدوال COUNT وAVG وSUM ملخصات رقمية.'],`SELECT subject, AVG(score) AS average_score\nFROM results\nWHERE score >= 60\nGROUP BY subject\nORDER BY average_score DESC;`,'أي عبارة تستخدم لتجميع الصفوف؟',['GROUP BY','ORDER BY','WHERE','VALUES'],0,'احسب عدد الطلاب في كل مستوى.'),
      lesson('sql-3','الربط والفهارس','إتقان','21 دقيقة','اربط الجداول وحسن الاستعلامات المتكررة.',['JOIN يجمع بيانات من جداول مرتبطة بمفتاح.','الفهرس يسرع البحث لكنه يزيد تكلفة الكتابة والتخزين.'],`SELECT students.name, courses.title\nFROM enrollments\nJOIN students ON students.id = enrollments.student_id\nJOIN courses ON courses.id = enrollments.course_id;`,'ما وظيفة JOIN؟',['حذف قاعدة البيانات','ربط صفوف من جداول متعددة','إنشاء مستخدم','تشفير النص'],1,'اربط جدول الطلبات بجدول العملاء.')
    ]),
    git:course('git','Git وGitHub','Git','#fb7185','إدارة الإصدارات والعمل الجماعي بأمان.',[
      lesson('git-1','المستودع والالتزام','تأسيسي','14 دقيقة','تتبع التغييرات واحفظ نقاطًا مستقرة.',['يهيئ git init مستودعًا، ويضيف git add الملفات إلى منطقة التجهيز.','يسجل git commit لقطة موصوفة برسالة واضحة.'],`git init\ngit add .\ngit commit -m "Create learning page"\ngit status`,'أي أمر يسجل لقطة جديدة؟',['git add','git commit','git status','git init'],1,'ابدأ مستودعًا وسجل أول التزام.'),
      lesson('git-2','الفروع والدمج','تطبيقي','18 دقيقة','اعزل العمل الجديد ثم ادمجه بعد المراجعة.',['يمثل الفرع خط عمل مستقلًا.','يسمح الدمج بإدخال تغييرات فرع إلى آخر بعد اختبارها.'],`git switch -c feature/coding-lessons\n# edit files\ngit add .\ngit commit -m "Add coding lessons"\ngit switch main\ngit merge feature/coding-lessons`,'ما فائدة الفرع؟',['حذف التاريخ','عزل تغييرات ميزة جديدة','تشفير الملفات','تشغيل الخادم'],1,'أنشئ فرعًا لإصلاح ثم ادمجه في main.'),
      lesson('git-3','GitHub وطلبات السحب','إتقان','19 دقيقة','شارك العمل واطلب مراجعة منظمة.',['يربط remote المستودع المحلي بالمستودع البعيد.','طلب السحب يعرض التغييرات للمراجعة قبل الدمج.'],`git remote add origin https://github.com/USER/PROJECT.git\ngit push -u origin feature/coding-lessons\n# Open a pull request on GitHub`,'ما الغرض من Pull Request؟',['تشغيل CSS','مراجعة التغييرات قبل الدمج','حذف الفروع تلقائيًا','تثبيت Node.js'],1,'ادفع فرعًا بعيدًا ثم جهز وصف طلب سحب.')
    ])
  };

  const CHALLENGES=[
    {id:'c1',language:'html',title:'صفحة ملف طالب',level:'سهل',description:'أنشئ عنوانًا وفقرة وقائمة مهارات ورابطًا.',starter:`<!doctype html>\n<html lang="ar" dir="rtl">\n<body>\n  <!-- ابدأ هنا -->\n</body>\n</html>`,checks:['عنوان رئيسي h1','قائمة ul أو ol','رابط a']},
    {id:'c2',language:'css',title:'بطاقة متجاوبة',level:'متوسط',description:'صمم بطاقة تتكيف مع الشاشة وتستخدم متغيرات ألوان.',starter:`<!doctype html><html><head><style>\n:root { --accent:#7c3aed; }\n/* أكمل التنسيق */\n</style></head><body><article class="card"><h1>بطاقة تعلم</h1><p>اجعلها متجاوبة.</p></article></body></html>`,checks:['استخدام var','تخطيط مرن','حواف ومسافات']},
    {id:'c3',language:'javascript',title:'محلل الدرجات',level:'متوسط',description:'احسب المتوسط وأعلى درجة وعدد الناجحين.',starter:`const scores = [64, 92, 77, 88, 55, 100];\n// احسب النتائج هنا\n`,checks:['average','Math.max أو reduce','filter']},
    {id:'c4',language:'python',title:'تقرير المصروفات',level:'متوسط',description:'اجمع المصروفات وصنف أعلى بند.',starter:`expenses = {"food": 240, "transport": 130, "books": 310}\n# اكتب الحل هنا\n`,checks:['sum','max','print']},
    {id:'c5',language:'sql',title:'تقرير المتفوقين',level:'متقدم',description:'اكتب استعلامًا يعرض الطلاب فوق 85 مرتبًا.',starter:`SELECT name, score\nFROM students\n-- أكمل الشرط والترتيب\n`,checks:['WHERE score >= 85','ORDER BY','DESC']},
    {id:'c6',language:'git',title:'تدفق ميزة آمن',level:'متقدم',description:'اكتب أوامر إنشاء فرع وتسجيل التغييرات ودفعها.',starter:`git status\n# أكمل الأوامر\n`,checks:['git switch -c','git commit','git push']}
  ];

  let state=readProgress();
  let activeCourse=COURSES[state.lastCourse]||COURSES.javascript;
  let activeLesson=activeCourse.lessons.find(item=>item.id===state.lastLesson)||activeCourse.lessons[0];
  let activeTab='learn';
  let mounted=false;

  function readProgress(){
    try{
      const value=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}');
      return {completed:Array.isArray(value.completed)?value.completed:[],answers:value.answers||{},xp:Number(value.xp)||0,lastCourse:value.lastCourse||'javascript',lastLesson:value.lastLesson||'js-1'};
    }catch{return {completed:[],answers:{},xp:0,lastCourse:'javascript',lastLesson:'js-1'};}
  }
  function saveProgress(){state.lastCourse=activeCourse.id;state.lastLesson=activeLesson.id;localStorage.setItem(PROGRESS_KEY,JSON.stringify(state));}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));}
  function totalLessons(){return Object.values(COURSES).reduce((sum,item)=>sum+item.lessons.length,0);}
  function courseCompleted(courseItem){return courseItem.lessons.filter(item=>state.completed.includes(item.id)).length;}
  function progressPercent(){return Math.round((state.completed.length/Math.max(1,totalLessons()))*100);}

  function applyTheme(themeId,announce=false){
    const theme=THEMES.find(item=>item.id===themeId)||THEMES[0];
    document.documentElement.dataset.neonTheme=theme.id;
    document.documentElement.style.colorScheme=theme.mode;
    try{localStorage.setItem(THEME_KEY,theme.id);}catch{}
    document.querySelectorAll('[data-coding-theme]').forEach(button=>button.classList.toggle('active',button.dataset.codingTheme===theme.id));
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta){const color=getComputedStyle(document.documentElement).getPropertyValue('--ui-bg-0').trim();if(color)meta.content=color;}
    if(announce)window.dispatchEvent(new CustomEvent('neon-theme-changed',{detail:{theme:theme.id}}));
  }

  function injectThemePicker(){
    const header=document.querySelector('.site-header');
    if(!header||header.querySelector('.coding-theme-host'))return;
    const actions=header.querySelector('.header-actions')||header;
    const host=document.createElement('div');
    host.className='coding-theme-host';
    host.innerHTML=`<button class="coding-theme-trigger" type="button" aria-label="اختيار ثيم الألوان" aria-expanded="false">🎨</button><div class="coding-theme-panel"><strong>ثيمات المنصة</strong><div>${THEMES.map(item=>`<button type="button" data-coding-theme="${item.id}">${escapeHtml(item.name)}</button>`).join('')}</div></div>`;
    actions.insertBefore(host,actions.firstChild);
    const trigger=host.querySelector('.coding-theme-trigger');
    trigger.addEventListener('click',event=>{event.stopPropagation();const open=host.classList.toggle('open');trigger.setAttribute('aria-expanded',String(open));});
    host.addEventListener('click',event=>{const option=event.target.closest('[data-coding-theme]');if(!option)return;applyTheme(option.dataset.codingTheme,true);host.classList.remove('open');trigger.setAttribute('aria-expanded','false');});
    document.addEventListener('click',event=>{if(!host.contains(event.target)){host.classList.remove('open');trigger.setAttribute('aria-expanded','false');}});
    let saved='academic';try{saved=localStorage.getItem(THEME_KEY)||'academic';}catch{}
    applyTheme(saved);
  }

  function hubTemplate(){
    return `<div class="coding-learning-hub" id="codingLearningHub">
      <section class="coding-course-hero"><div><span class="coding-kicker">STRUCTURED CODING PATH</span><h3>تعلّم، طبّق، ثم ابنِ مشروعك</h3><p>مسارات متدرجة تبدأ بالمفاهيم، ثم تدريب قصير، ثم تحدٍ عملي داخل المختبر.</p></div><div class="coding-progress-ring" style="--coding-progress:${progressPercent()*3.6}deg"><strong id="codingOverallPercent">${progressPercent()}%</strong><small>التقدم الكلي</small></div></section>
      <div class="coding-stat-grid"><article><span>📘</span><div><strong id="codingCompletedCount">${state.completed.length}</strong><small>درس مكتمل من ${totalLessons()}</small></div></article><article><span>⚡</span><div><strong id="codingXpCount">${state.xp}</strong><small>نقطة خبرة</small></div></article><article><span>🧭</span><div><strong>${Object.keys(COURSES).length}</strong><small>مسارات برمجية</small></div></article><article><span>🧪</span><div><strong>${CHALLENGES.length}</strong><small>تحديات تطبيقية</small></div></article></div>
      <div class="coding-hub-tabs" role="tablist" aria-label="أقسام تعلم البرمجة"><button class="active" type="button" data-coding-tab="learn" role="tab">المسار التعليمي</button><button type="button" data-coding-tab="practice" role="tab">التدريب والتحديات</button><button type="button" data-coding-tab="lab" role="tab">المختبر التفاعلي</button></div>
      <section class="coding-tab-panel active" data-coding-panel="learn"><div class="coding-course-rail" id="codingCourseRail"></div><div class="coding-learning-layout"><aside class="coding-lesson-sidebar"><div class="coding-course-summary" id="codingCourseSummary"></div><div id="codingLessonList"></div></aside><article class="coding-lesson-view" id="codingLessonView"></article></div></section>
      <section class="coding-tab-panel" data-coding-panel="practice"><div class="coding-challenge-grid" id="codingChallengeGrid"></div></section>
      <section class="coding-tab-panel" data-coding-panel="lab"><div class="coding-active-challenge" id="codingActiveChallenge" hidden></div></section>
    </div>`;
  }

  function renderStats(){
    const percent=progressPercent();
    const ring=document.querySelector('.coding-progress-ring');if(ring)ring.style.setProperty('--coding-progress',`${percent*3.6}deg`);
    document.getElementById('codingOverallPercent')?.replaceChildren(document.createTextNode(`${percent}%`));
    document.getElementById('codingCompletedCount')?.replaceChildren(document.createTextNode(String(state.completed.length)));
    document.getElementById('codingXpCount')?.replaceChildren(document.createTextNode(String(state.xp)));
  }

  function renderCourses(){
    const rail=document.getElementById('codingCourseRail');if(!rail)return;
    rail.innerHTML=Object.values(COURSES).map(item=>{const complete=courseCompleted(item);return `<button type="button" class="coding-course-chip ${item.id===activeCourse.id?'active':''}" data-course-id="${item.id}" style="--course-color:${item.color}"><span>${escapeHtml(item.icon)}</span><b>${escapeHtml(item.title)}</b><small>${complete}/${item.lessons.length}</small></button>`;}).join('');
    const summary=document.getElementById('codingCourseSummary');
    summary.innerHTML=`<span class="coding-course-icon" style="--course-color:${activeCourse.color}">${escapeHtml(activeCourse.icon)}</span><div><small>المسار الحالي</small><h4>${escapeHtml(activeCourse.title)}</h4><p>${escapeHtml(activeCourse.description)}</p></div>`;
    renderLessonList();
  }

  function renderLessonList(){
    const list=document.getElementById('codingLessonList');if(!list)return;
    list.innerHTML=activeCourse.lessons.map((item,index)=>`<button type="button" class="coding-lesson-item ${item.id===activeLesson.id?'active':''} ${state.completed.includes(item.id)?'completed':''}" data-lesson-id="${item.id}"><span>${state.completed.includes(item.id)?'✓':index+1}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.level)} • ${escapeHtml(item.duration)}</small></div></button>`).join('');
    renderLesson();
  }

  function renderLesson(){
    const view=document.getElementById('codingLessonView');if(!view)return;
    const completed=state.completed.includes(activeLesson.id);const answered=Boolean(state.answers[activeLesson.id]);
    view.innerHTML=`<header><div><span class="coding-level-badge">${escapeHtml(activeLesson.level)}</span><h3>${escapeHtml(activeLesson.title)}</h3><p>${escapeHtml(activeLesson.summary)}</p></div><span class="coding-duration">⏱ ${escapeHtml(activeLesson.duration)}</span></header>
      <section class="coding-objectives"><h4>ستتعلم في هذا الدرس</h4><ul>${activeLesson.body.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
      <section class="coding-example"><div><h4>مثال تطبيقي</h4><button type="button" data-copy-code>نسخ الكود</button></div><pre><code>${escapeHtml(activeLesson.code)}</code></pre><button class="coding-open-lab" type="button" data-open-lesson-lab>افتح المثال في المختبر ←</button></section>
      <section class="coding-quiz"><span class="coding-kicker">QUICK CHECK</span><h4>${escapeHtml(activeLesson.question)}</h4><div class="coding-quiz-options">${activeLesson.options.map((option,index)=>`<button type="button" data-quiz-option="${index}" ${answered?'disabled':''}>${escapeHtml(option)}</button>`).join('')}</div><p class="coding-quiz-feedback" id="codingQuizFeedback">${answered?'أحسنت، تم اجتياز سؤال هذا الدرس.':'اختر الإجابة ثم تحقق من فهمك.'}</p></section>
      <section class="coding-mini-challenge"><div><span>🎯</span><div><h4>تطبيق الدرس</h4><p>${escapeHtml(activeLesson.challenge)}</p></div></div><button type="button" data-open-lesson-lab>ابدأ التطبيق</button></section>
      <footer><button type="button" class="coding-complete-button ${completed?'completed':''}" data-complete-lesson>${completed?'✓ تم إكمال الدرس':'أكملت الدرس'}</button><div class="coding-lesson-nav"><button type="button" data-lesson-nav="prev">السابق</button><button type="button" data-lesson-nav="next">التالي</button></div></footer>`;
  }

  function renderChallenges(){
    const grid=document.getElementById('codingChallengeGrid');if(!grid)return;
    grid.innerHTML=CHALLENGES.map(item=>`<article class="coding-challenge-card"><header><span>${escapeHtml(COURSES[item.language]?.icon||'⌘')}</span><b>${escapeHtml(item.level)}</b></header><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><ul>${item.checks.map(check=>`<li>${escapeHtml(check)}</li>`).join('')}</ul><button type="button" data-start-challenge="${item.id}">ابدأ التحدي في المختبر</button></article>`).join('');
  }

  function selectTab(tab){
    activeTab=tab;
    document.querySelectorAll('[data-coding-tab]').forEach(button=>{const active=button.dataset.codingTab===tab;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
    document.querySelectorAll('[data-coding-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.codingPanel===tab));
    const lab=document.querySelector('#coding>.coding-layout');if(lab)lab.hidden=tab!=='lab';
    if(tab==='lab')setTimeout(()=>lab?.scrollIntoView({behavior:'smooth',block:'start'}),50);
  }

  function openInLab(languageId,code,challengeTitle=''){
    selectTab('lab');
    document.querySelector(`.language-item[data-language="${languageId}"]`)?.click();
    setTimeout(()=>{const editor=document.getElementById('codeEditor');if(editor){editor.value=code;editor.dispatchEvent(new Event('input',{bubbles:true}));editor.focus();}const challenge=document.getElementById('codingActiveChallenge');if(challengeTitle){challenge.hidden=false;challenge.innerHTML=`<span>🎯</span><div><strong>${escapeHtml(challengeTitle)}</strong><small>اكتب الحل ثم اضغط «تشغيل وفحص».</small></div>`;}else challenge.hidden=true;},80);
  }

  function completeLesson(){if(!state.completed.includes(activeLesson.id)){state.completed.push(activeLesson.id);state.xp+=35;saveProgress();renderStats();renderCourses();showToast('تم إكمال الدرس وإضافة 35 نقطة خبرة.');}}
  function answerQuiz(index){
    if(state.answers[activeLesson.id])return;
    const feedback=document.getElementById('codingQuizFeedback');const buttons=[...document.querySelectorAll('[data-quiz-option]')];
    if(index===activeLesson.answer){state.answers[activeLesson.id]=true;state.xp+=15;saveProgress();buttons.forEach((button,buttonIndex)=>{button.disabled=true;button.classList.toggle('correct',buttonIndex===activeLesson.answer);});if(feedback){feedback.textContent='إجابة صحيحة — أضيفت 15 نقطة خبرة.';feedback.className='coding-quiz-feedback success';}renderStats();}
    else{buttons[index]?.classList.add('wrong');if(feedback){feedback.textContent='ليست الإجابة الصحيحة. راجع الشرح ثم حاول مرة أخرى.';feedback.className='coding-quiz-feedback error';}}
  }
  function navigateLesson(direction){const index=activeCourse.lessons.findIndex(item=>item.id===activeLesson.id);let next=index+(direction==='next'?1:-1);if(next<0)next=activeCourse.lessons.length-1;if(next>=activeCourse.lessons.length)next=0;activeLesson=activeCourse.lessons[next];saveProgress();renderLessonList();}
  function showToast(message){let toast=document.getElementById('codingLearningToast');if(!toast){toast=document.createElement('div');toast.id='codingLearningToast';toast.className='coding-learning-toast';document.body.appendChild(toast);}toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),2600);}

  function bindHubEvents(hub){
    hub.addEventListener('click',event=>{
      const tab=event.target.closest('[data-coding-tab]');if(tab){selectTab(tab.dataset.codingTab);return;}
      const courseButton=event.target.closest('[data-course-id]');if(courseButton){activeCourse=COURSES[courseButton.dataset.courseId]||activeCourse;activeLesson=activeCourse.lessons[0];saveProgress();renderCourses();return;}
      const lessonButton=event.target.closest('[data-lesson-id]');if(lessonButton){activeLesson=activeCourse.lessons.find(item=>item.id===lessonButton.dataset.lessonId)||activeLesson;saveProgress();renderLessonList();return;}
      const quiz=event.target.closest('[data-quiz-option]');if(quiz){answerQuiz(Number(quiz.dataset.quizOption));return;}
      if(event.target.closest('[data-complete-lesson]')){completeLesson();return;}
      const nav=event.target.closest('[data-lesson-nav]');if(nav){navigateLesson(nav.dataset.lessonNav);return;}
      if(event.target.closest('[data-copy-code]')){navigator.clipboard?.writeText(activeLesson.code).then(()=>showToast('تم نسخ الكود.')).catch(()=>showToast('حدد الكود وانسخه يدويًا.'));return;}
      if(event.target.closest('[data-open-lesson-lab]')){openInLab(activeCourse.id,activeLesson.code,activeLesson.challenge);return;}
      const challengeButton=event.target.closest('[data-start-challenge]');if(challengeButton){const challenge=CHALLENGES.find(item=>item.id===challengeButton.dataset.startChallenge);if(challenge)openInLab(challenge.language,challenge.starter,challenge.title);}
    });
  }

  function modernizePage(){
    document.title='تعليم البرمجة | مسار نيون';
    const heading=document.querySelector('#coding>.section-heading');
    if(heading){const eyebrow=heading.querySelector('.eyebrow');const title=heading.querySelector('h2');const paragraph=heading.querySelector('p');const badge=heading.querySelector('.lab-badge');if(eyebrow)eyebrow.textContent='CODING LEARNING CENTER';if(title)title.textContent='مسار تعليم البرمجة';if(paragraph)paragraph.textContent='دروس متدرجة، شرح وأمثلة، اختبارات قصيرة، تحديات عملية، ثم مختبر تفاعلي للتطبيق.';if(badge)badge.textContent='LEARN • PRACTICE • BUILD';}
    document.querySelectorAll('.brand strong').forEach(item=>item.textContent='مسار نيون');
    document.querySelectorAll('.brand small').forEach(item=>item.textContent='MSAR NEON • LEARN • PLAY • BUILD');
  }

  function mount(){
    const coding=document.getElementById('coding');const lab=coding?.querySelector(':scope>.coding-layout');
    if(!coding||!lab||coding.dataset.learningHubEnhanced==='true')return false;
    coding.dataset.learningHubEnhanced='true';modernizePage();lab.insertAdjacentHTML('beforebegin',hubTemplate());lab.hidden=true;renderCourses();renderChallenges();renderStats();bindHubEvents(document.getElementById('codingLearningHub'));injectThemePicker();selectTab('learn');mounted=true;return true;
  }

  let attempts=0;const timer=setInterval(()=>{attempts++;if(mount()||attempts>240)clearInterval(timer);},100);
  new MutationObserver(()=>{if(!mounted)mount();else{injectThemePicker();modernizePage();}}).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('storage',event=>{if(event.key===THEME_KEY)applyTheme(event.newValue||'academic');});
})();
