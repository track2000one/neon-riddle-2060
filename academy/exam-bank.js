(() => {
  'use strict';
  const bank = { meta: {"version":"2026.07.28","sourceNote":"يتضمن أسئلة تدريبية أصلية وأسئلة نصية مستوردة ومراجعة من المرفق التاريخي لعام 1442. استبعدت الأسئلة المعتمدة على الصور والرسومات لتجنب فقدان المعنى.","subjects":[{"id":"tahsili-math","family":"tahsili","title":"رياضيات التحصيلي","icon":"∑","color":"#ffd46e"},{"id":"tahsili-physics","family":"tahsili","title":"فيزياء التحصيلي","icon":"⚛","color":"#63d8ff"},{"id":"tahsili-chemistry","family":"tahsili","title":"كيمياء التحصيلي","icon":"🧪","color":"#63f2a9"},{"id":"tahsili-biology","family":"tahsili","title":"أحياء التحصيلي","icon":"🧬","color":"#ff7fa6"},{"id":"qudurat-verbal","family":"qudurat","title":"القدرات اللفظية","icon":"ض","color":"#8db6ff"},{"id":"qudurat-quant","family":"qudurat","title":"القدرات الكمية","icon":"ك","color":"#ffb454"}],"categories":{"qudurat-verbal":[{"id":"analogy","title":"التناظر اللفظي"},{"id":"sentence-completion","title":"إكمال الجمل"},{"id":"contextual-error","title":"الخطأ السياقي"},{"id":"vocabulary","title":"معاني المفردات"},{"id":"relation-difference","title":"الارتباط والاختلاف"},{"id":"reading-comprehension","title":"استيعاب المقروء"}],"qudurat-quant":[{"id":"arithmetic","title":"الحساب"},{"id":"ratios-fractions","title":"الكسور والنسب"},{"id":"percentages","title":"النسب المئوية"},{"id":"algebra","title":"الجبر"},{"id":"geometry","title":"الهندسة"},{"id":"statistics-probability","title":"الإحصاء والاحتمال"},{"id":"speed-work","title":"السرعة والعمل"}]}}, questions: [
    ...(window.NEON_TAHSILI_MATH_QUESTIONS || []),
    ...(window.NEON_TAHSILI_PHYSICS_QUESTIONS || []),
    ...(window.NEON_TAHSILI_CHEMISTRY_QUESTIONS_PART1 || []),
    ...(window.NEON_TAHSILI_CHEMISTRY_QUESTIONS_PART2 || []),
    ...(window.NEON_TAHSILI_BIOLOGY_QUESTIONS || []),
    ...(window.NEON_QUDURAT_VERBAL_QUESTIONS || []),
    ...(window.NEON_QUDURAT_QUANT_QUESTIONS || [])
  ] };
  window.NEON_EXAM_BANK = bank;
  const academy = window.NEON_ACADEMY;
  if (!academy) return;
  const replacedTrackIds = new Set(['tahsili', 'qudurat-verbal', 'qudurat-quant']);
  academy.examTracks.splice(0, academy.examTracks.length,
    { id:'qudurat-verbal', title:'القدرات اللفظية', icon:'ض', color:'#8db6ff', modules:['التناظر اللفظي','إكمال الجمل','الخطأ السياقي','معاني المفردات','الارتباط والاختلاف','استيعاب المقروء','اختبار قصير','محاكاة لفظية'] },
    { id:'qudurat-quant', title:'القدرات الكمية', icon:'ك', color:'#ffb454', modules:['الحساب','الكسور والنسب','النسب المئوية','الجبر','الهندسة','الإحصاء والاحتمال','السرعة والعمل','محاكاة كمية'] },
    { id:'tahsili-math', title:'رياضيات التحصيلي', icon:'∑', color:'#ffd46e', modules:['الجبر والدوال','الهندسة','الإحصاء والاحتمال','التفاضل والتكامل','اختبار قصير','محاكاة الرياضيات'] },
    { id:'tahsili-physics', title:'فيزياء التحصيلي', icon:'⚛', color:'#63d8ff', modules:['الميكانيكا','الطاقة','الكهرباء والمغناطيسية','الموجات والبصريات','الفيزياء الحديثة','محاكاة الفيزياء'] },
    { id:'tahsili-chemistry', title:'كيمياء التحصيلي', icon:'🧪', color:'#63f2a9', modules:['بنية الذرة','الروابط والمركبات','الحسابات الكيميائية','المحاليل والاتزان','الكيمياء العضوية','محاكاة الكيمياء'] },
    { id:'tahsili-biology', title:'أحياء التحصيلي', icon:'🧬', color:'#ff7fa6', modules:['الخلية','الوراثة','التنوع الحيوي','أجهزة الجسم','البيئة والسلوك','محاكاة الأحياء'] },
    { id:'placement', title:'تحديد المستوى', icon:'◎', color:'#d98cff', modules:['لغة عربية','لغة إنجليزية','رياضيات','علوم','تقنية','تقرير المستوى'] },
    { id:'timed', title:'المحاكاة الزمنية', icon:'⏱️', color:'#ff6dbc', modules:['10 أسئلة','20 سؤالًا','40 سؤالًا','اختبار مختلط','تحدي النخبة'] }
  );
  academy.lessons.splice(0, academy.lessons.length, ...academy.lessons.filter(item => !replacedTrackIds.has(item.subjectId)));
  const levels=[['foundation','تأسيسي',55],['practice','تطبيقي',70],['mastery','إتقان',90]];
  academy.examTracks.filter(track => !['placement','timed'].includes(track.id)).forEach(track => {
    track.modules.forEach((module,index) => {
      const level=levels[index<2?0:index<4?1:2];
      academy.lessons.push({ id:`exams-${track.id}-${String(index+1).padStart(2,'0')}-${level[0]}`, area:'exams', subjectId:track.id, subject:track.title, subjectIcon:track.icon, color:track.color, title:`${module} — ${level[1]}`, topic:module, level:level[0], levelTitle:level[1], xp:level[2], duration:index>=4?30:18, summary:`تدريب منظم في ${module} ضمن ${track.title}.`, content:`تدريب تفاعلي يركز على ${module} مع تفسير الإجابات وقياس الأداء.`, objectives:['فهم المهارة الأساسية.','تطبيق استراتيجية الحل.','تحليل الأخطاء وتحسين الزمن.'], activity:`ابدأ اختبارًا قصيرًا في ${module} ثم راجع تفسير كل إجابة.`, examMode:true, disclaimer:'تدريب غير رسمي ولا يمثل الاختبارات الرسمية.' });
    });
  });
  academy.questionBank.push(...bank.questions);
  academy.counts.totalLessons=academy.lessons.length;
  academy.counts.examLessons=academy.lessons.filter(item=>item.area==='exams').length;
  academy.counts.questions=academy.questionBank.length;
  academy.counts.subjects=academy.knowledgeSubjects.length+academy.programmingSubjects.length+academy.examTracks.length+academy.gameTracks.length;
})();
