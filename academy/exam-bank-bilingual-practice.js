(() => {
  'use strict';
  const QUESTIONS = window.NEON_BILINGUAL_PRACTICE_PARTS || [];
  const META = {
  "subjectsEn": {
    "tahsili-math": "Achievement Mathematics",
    "tahsili-physics": "Achievement Physics",
    "tahsili-chemistry": "Achievement Chemistry",
    "tahsili-biology": "Achievement Biology",
    "qudurat-verbal": "Verbal Aptitude",
    "qudurat-quant": "Quantitative Aptitude"
  },
  "categories": {
    "tahsili-math": [
      {"id":"algebra-functions","title":"الجبر والدوال","titleEn":"Algebra and Functions"},
      {"id":"geometry","title":"الهندسة","titleEn":"Geometry"},
      {"id":"statistics-probability","title":"الإحصاء والاحتمال","titleEn":"Statistics and Probability"},
      {"id":"calculus","title":"التفاضل والتكامل","titleEn":"Calculus"}
    ],
    "tahsili-physics": [
      {"id":"mechanics","title":"الميكانيكا","titleEn":"Mechanics"},
      {"id":"energy","title":"الطاقة","titleEn":"Energy"},
      {"id":"electricity-magnetism","title":"الكهرباء والمغناطيسية","titleEn":"Electricity and Magnetism"},
      {"id":"waves-optics","title":"الموجات والبصريات","titleEn":"Waves and Optics"},
      {"id":"modern-physics","title":"الفيزياء الحديثة","titleEn":"Modern Physics"}
    ],
    "tahsili-chemistry": [
      {"id":"atomic-structure","title":"بنية الذرة","titleEn":"Atomic Structure"},
      {"id":"bonding","title":"الروابط والمركبات","titleEn":"Bonding and Compounds"},
      {"id":"stoichiometry","title":"الحسابات الكيميائية","titleEn":"Stoichiometry"},
      {"id":"solutions-equilibrium","title":"المحاليل والاتزان","titleEn":"Solutions and Equilibrium"},
      {"id":"organic-chemistry","title":"الكيمياء العضوية","titleEn":"Organic Chemistry"}
    ],
    "tahsili-biology": [
      {"id":"cell-biology","title":"الخلية","titleEn":"Cell Biology"},
      {"id":"genetics","title":"الوراثة","titleEn":"Genetics"},
      {"id":"biodiversity-evolution","title":"التنوع والتطور","titleEn":"Biodiversity and Evolution"},
      {"id":"human-systems","title":"أجهزة الجسم","titleEn":"Human Body Systems"},
      {"id":"ecology-behavior","title":"البيئة والسلوك","titleEn":"Ecology and Behavior"}
    ],
    "qudurat-verbal": [
      {"id":"analogy","title":"التناظر اللفظي","titleEn":"Verbal Analogy"},
      {"id":"sentence-completion","title":"إكمال الجمل","titleEn":"Sentence Completion"},
      {"id":"contextual-error","title":"الخطأ السياقي","titleEn":"Contextual Error"},
      {"id":"vocabulary","title":"معاني المفردات","titleEn":"Vocabulary"},
      {"id":"relation-difference","title":"الارتباط والاختلاف","titleEn":"Relations and Differences"},
      {"id":"reading-comprehension","title":"استيعاب المقروء","titleEn":"Reading Comprehension"}
    ],
    "qudurat-quant": [
      {"id":"arithmetic","title":"الحساب","titleEn":"Arithmetic"},
      {"id":"ratios-fractions","title":"الكسور والنسب","titleEn":"Fractions and Ratios"},
      {"id":"percentages","title":"النسب المئوية","titleEn":"Percentages"},
      {"id":"algebra","title":"الجبر","titleEn":"Algebra"},
      {"id":"geometry","title":"الهندسة","titleEn":"Geometry"},
      {"id":"statistics-probability","title":"الإحصاء والاحتمال","titleEn":"Statistics and Probability"},
      {"id":"speed-work","title":"السرعة والعمل","titleEn":"Speed and Work"}
    ]
  }
};

  function normalize(value) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, '');
  }

  function mergeCategories(bank) {
    bank.meta ||= {};
    bank.meta.categories ||= {};
    bank.meta.subjects ||= [];
    bank.meta.subjects.forEach(subject => { subject.titleEn ||= META.subjectsEn[subject.id] || subject.title; });
    Object.entries(META.categories).forEach(([subjectId, categories]) => {
      const existing = Array.isArray(bank.meta.categories[subjectId]) ? bank.meta.categories[subjectId] : [];
      const byId = new Map(existing.map(item => [item.id, item]));
      categories.forEach(category => {
        const previous = byId.get(category.id);
        if (previous) { previous.titleEn ||= category.titleEn; previous.title ||= category.title; }
        else existing.push({ ...category });
      });
      bank.meta.categories[subjectId] = existing;
    });
    Object.values(bank.meta.categories).forEach(categories => (categories || []).forEach(category => { category.titleEn ||= category.title; }));
  }

  function mergeQuestions(target) {
    if (!Array.isArray(target)) return 0;
    const ids = new Set(target.map(question => question?.id).filter(Boolean));
    const keys = new Set(target.map(question => `${question?.subject || ''}|${normalize(question?.q)}`));
    let added = 0;
    QUESTIONS.forEach(question => {
      const key = `${question.subject}|${normalize(question.q)}`;
      if (ids.has(question.id) || keys.has(key)) return;
      target.push({ ...question, options: [...question.options], optionsEn: [...question.optionsEn] });
      ids.add(question.id); keys.add(key); added += 1;
    });
    return added;
  }

  const bank = window.NEON_EXAM_BANK;
  const academy = window.NEON_ACADEMY;
  if (!bank || !academy) return;
  mergeCategories(bank);
  const addedToBank = mergeQuestions(bank.questions);
  const addedToAcademy = mergeQuestions(academy.questionBank);
  academy.counts ||= {};
  academy.counts.questions = academy.questionBank.length;
  window.NEON_BILINGUAL_PRACTICE_QUESTIONS = QUESTIONS;
  window.NEON_BILINGUAL_PRACTICE_REPORT = {
    total: QUESTIONS.length,
    addedToBank,
    addedToAcademy,
    subjects: new Set(QUESTIONS.map(question => question.subject)).size,
    categories: new Set(QUESTIONS.map(question => `${question.subject}|${question.category}`)).size,
    languages: ['ar', 'en'],
    validated: QUESTIONS.every(question => question.id && question.q && question.qEn && Array.isArray(question.options) && Array.isArray(question.optionsEn) && question.options.length === question.optionsEn.length && Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length && question.explain && question.explainEn)
  };
  console.info('[NEON Academy] Bilingual achievement and aptitude practice loaded', window.NEON_BILINGUAL_PRACTICE_REPORT);
})();