(() => {
  'use strict';

  function normalizeQuestionText(value) {
    const digits = '٠١٢٣٤٥٦٧٨٩';
    return String(value || '')
      .normalize('NFKC')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/[٠-٩]/g, digit => String(digits.indexOf(digit)))
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, '');
  }

  function questionKey(question) {
    const passage = normalizeQuestionText(question?.passage || '').slice(0, 240);
    return `${question?.subject || ''}|${normalizeQuestionText(question?.q)}|${passage}`;
  }

  function dedupeQuestions(questions) {
    const seen = new Set();
    return questions.filter(question => {
      const key = questionKey(question);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const rawQuestions = [
    ...(window.NEON_TAHSILI_MATH_QUESTIONS || []),
    ...(window.NEON_TAHSILI_PHYSICS_QUESTIONS || []),
    ...(window.NEON_TAHSILI_CHEMISTRY_QUESTIONS_PART1 || []),
    ...(window.NEON_TAHSILI_CHEMISTRY_QUESTIONS_PART2 || []),
    ...(window.NEON_TAHSILI_BIOLOGY_QUESTIONS || []),
    ...(window.NEON_QUDURAT_VERBAL_QUESTIONS || []),
    ...(window.NEON_QUDURAT_QUANT_QUESTIONS || []),
    ...(window.NEON_IMPORTED_EXAM_QUESTIONS_2026 || []),
    ...(window.NEON_IMPORTED_ZIP8887777_20260808 || [])
  ];

  const bank = {
    meta: {
      version: '2026.07.29',
      sourceNote: 'يتضمن أسئلة تدريبية أصلية وأسئلة نصية واضحة مستوردة ومراجعة من المرفقات. تُستبعد الأسئلة المعتمدة على صور أو رسوم غير قابلة للعرض، وتزال الأسئلة المكررة آليًا بعد توحيد الحروف والأرقام وعلامات الترقيم.',
      subjects: [
        { id:'tahsili-math', family:'tahsili', title:'رياضيات التحصيلي', icon:'∑', color:'#ffd46e' },
        { id:'tahsili-physics', family:'tahsili', title:'فيزياء التحصيلي', icon:'⚛', color:'#63d8ff' },
        { id:'tahsili-chemistry', family:'tahsili', title:'كيمياء التحصيلي', icon:'🧪', color:'#63f2a9' },
        { id:'tahsili-biology', family:'tahsili', title:'أحياء التحصيلي', icon:'🧬', color:'#ff7fa6' },
        { id:'qudurat-verbal', family:'qudurat', title:'القدرات اللفظية', icon:'ض', color:'#8db6ff' },
        { id:'qudurat-quant', family:'qudurat', title:'القدرات الكمية', icon:'ك', color:'#ffb454' }
      ],
      categories: {
        'qudurat-verbal': [
          { id:'analogy', title:'التناظر اللفظي' },
          { id:'sentence-completion', title:'إكمال الجمل' },
          { id:'contextual-error', title:'الخطأ السياقي' },
          { id:'vocabulary', title:'معاني المفردات' },
          { id:'relation-difference', title:'الارتباط والاختلاف' },
          { id:'reading-comprehension', title:'استيعاب المقروء' }
        ],
        'qudurat-quant': [
          { id:'arithmetic', title:'الحساب' },
          { id:'ratios-fractions', title:'الكسور والنسب' },
          { id:'percentages', title:'النسب المئوية' },
          { id:'algebra', title:'الجبر' },
          { id:'geometry', title:'الهندسة' },
          { id:'statistics-probability', title:'الإحصاء والاحتمال' },
          { id:'speed-work', title:'السرعة والعمل' },
          { id:'motion', title:'الحركة والمسافة والزمن' },
          { id:'sequences', title:'المتتابعات والأنماط العددية' },
          { id:'visual-patterns', title:'الأنماط البصرية' }
        ]
      }
    },
    questions: dedupeQuestions(rawQuestions)
  };

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
  const levels = [['foundation','تأسيسي',55],['practice','تطبيقي',70],['mastery','إتقان',90]];

  academy.examTracks.filter(track => !['placement','timed'].includes(track.id)).forEach(track => {
    track.modules.forEach((module,index) => {
      const level = levels[index < 2 ? 0 : index < 4 ? 1 : 2];
      academy.lessons.push({
        id:`exams-${track.id}-${String(index+1).padStart(2,'0')}-${level[0]}`,
        area:'exams',
        subjectId:track.id,
        subject:track.title,
        subjectIcon:track.icon,
        color:track.color,
        title:`${module} — ${level[1]}`,
        topic:module,
        level:level[0],
        levelTitle:level[1],
        xp:level[2],
        duration:index >= 4 ? 30 : 18,
        summary:`تدريب منظم في ${module} ضمن ${track.title}.`,
        content:`تدريب تفاعلي يركز على ${module} مع تفسير الإجابات وقياس الأداء.`,
        objectives:['فهم المهارة الأساسية.','تطبيق استراتيجية الحل.','تحليل الأخطاء وتحسين الزمن.'],
        activity:`ابدأ اختبارًا قصيرًا في ${module} ثم راجع تفسير كل إجابة.`,
        examMode:true,
        disclaimer:'تدريب غير رسمي ولا يمثل الاختبارات الرسمية.'
      });
    });
  });

  const academyKeys = new Set(academy.questionBank.map(questionKey));
  const questionsToAdd = bank.questions.filter(question => {
    const key = questionKey(question);
    if (academyKeys.has(key)) return false;
    academyKeys.add(key);
    return true;
  });

  academy.questionBank.push(...questionsToAdd);

  window.NEON_EXAM_DEDUPE_REPORT = {
    rawBankQuestions: rawQuestions.length,
    uniqueBankQuestions: bank.questions.length,
    removedInsideBanks: rawQuestions.length - bank.questions.length,
    addedToAcademy: questionsToAdd.length,
    skippedAgainstExistingAcademy: bank.questions.length - questionsToAdd.length
  };

  academy.counts.totalLessons = academy.lessons.length;
  academy.counts.examLessons = academy.lessons.filter(item => item.area === 'exams').length;
  academy.counts.questions = academy.questionBank.length;
  academy.counts.subjects = academy.knowledgeSubjects.length + academy.programmingSubjects.length + academy.examTracks.length + academy.gameTracks.length;
})();
