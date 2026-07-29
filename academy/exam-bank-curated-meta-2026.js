(() => {
  'use strict';
  const bank = window.NEON_EXAM_BANK;
  if (!bank || window.__NEON_CURATED_EXAM_META_2026__) return;
  window.__NEON_CURATED_EXAM_META_2026__ = true;
  const categories = {"tahsili-math":[{"id":"algebra-functions","title":"الجبر والدوال","titleEn":"Algebra and functions"},{"id":"sequences-matrices","title":"المتتابعات والمصفوفات","titleEn":"Sequences and matrices"},{"id":"geometry-trigonometry","title":"الهندسة والمثلثات","titleEn":"Geometry and trigonometry"},{"id":"statistics-probability","title":"الإحصاء والاحتمال","titleEn":"Statistics and probability"},{"id":"calculus","title":"التفاضل والتكامل","titleEn":"Calculus"}],"tahsili-physics":[{"id":"mechanics","title":"الحركة والقوى","titleEn":"Motion and forces"},{"id":"energy-momentum","title":"الطاقة والزخم","titleEn":"Energy and momentum"},{"id":"electricity-magnetism","title":"الكهرباء والمغناطيسية","titleEn":"Electricity and magnetism"},{"id":"waves-optics","title":"الموجات والبصريات","titleEn":"Waves and optics"},{"id":"modern-physics","title":"الفيزياء الحديثة","titleEn":"Modern physics"}],"tahsili-chemistry":[{"id":"atomic-structure","title":"بنية الذرة والدورية","titleEn":"Atomic structure and periodicity"},{"id":"bonding","title":"الروابط والجزيئات","titleEn":"Bonding and molecules"},{"id":"stoichiometry","title":"الحسابات الكيميائية","titleEn":"Stoichiometry"},{"id":"solutions-equilibrium","title":"المحاليل والاتزان","titleEn":"Solutions and equilibrium"},{"id":"acids-bases","title":"الأحماض والقواعد","titleEn":"Acids and bases"},{"id":"redox","title":"الأكسدة والاختزال","titleEn":"Redox"},{"id":"organic","title":"الكيمياء العضوية","titleEn":"Organic chemistry"},{"id":"thermochemistry","title":"الكيمياء الحرارية","titleEn":"Thermochemistry"}],"tahsili-biology":[{"id":"cell-biology","title":"الخلية والطاقة","titleEn":"Cells and energy"},{"id":"plant-biology","title":"النبات والبناء الضوئي","titleEn":"Plants and photosynthesis"},{"id":"genetics","title":"الوراثة والمعلومات الجينية","titleEn":"Genetics and genetic information"},{"id":"human-systems","title":"أجهزة جسم الإنسان","titleEn":"Human body systems"},{"id":"ecology","title":"علم البيئة","titleEn":"Ecology"},{"id":"evolution-diversity","title":"التطور والتنوع","titleEn":"Evolution and diversity"}]};
  bank.meta.categories = { ...(bank.meta.categories || {}), ...categories };
  bank.meta.version = '2026.07.30-curated-1';
  bank.meta.sourceNote = 'محتوى تدريبي غير رسمي: يجمع أسئلة أصلية ومراجعة، ويصنفها حسب المهارة والمستوى مع شرح مختصر يساعد الطالب على فهم طريقة الحل.';
  bank.meta.sourceNoteEn = 'Unofficial practice content: original and reviewed questions organized by skill and level, with concise explanations that teach the solution method.';
  const curated = (bank.questions || []).filter(question => String(question.id || '').startsWith('cur26-'));
  window.NEON_CURATED_EXAM_EXPANSION_2026 = {
    version: bank.meta.version,
    addedQuestions: curated.length,
    bySubject: curated.reduce((counts, question) => {
      counts[question.subject] = (counts[question.subject] || 0) + 1;
      return counts;
    }, {}),
    methodAr: 'أسئلة أصلية مبنية على خرائط المهارات الشائعة، مع تدرج معرفي وشرح مختصر للإجابة.',
    methodEn: 'Original questions based on common skill maps, with cognitive progression and concise answer explanations.'
  };
})();
