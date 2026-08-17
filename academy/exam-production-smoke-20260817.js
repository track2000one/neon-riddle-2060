(() => {
  'use strict';

  const verificationQuestions = [
    {
      id: 'verify-tc-prod-20260817-001',
      area: 'exams',
      family: 'tahsili',
      subject: 'tahsili-chemistry',
      category: 'gases',
      level: 'practice',
      q: 'عينة من غاز مثالي ضغطها 2.4 atm وحجمها 5 L عند ثبوت درجة الحرارة. إذا أصبح حجمها 3 L، فما الضغط الجديد؟',
      options: ['2.0 atm', '3.0 atm', '4.0 atm', '6.0 atm'],
      answer: 2,
      explain: 'حسب قانون بويل: P₁V₁=P₂V₂، إذن P₂=(2.4×5)÷3=4 atm.',
      source: 'سؤال تحقق تشغيلي للإصدار المنشور — NEON Academy 2026',
      active: true
    },
    {
      id: 'verify-tm-prod-20260817-001',
      area: 'exams',
      family: 'tahsili',
      subject: 'tahsili-math',
      category: 'algebra-functions',
      level: 'practice',
      q: 'إذا كان log₂(x-1)=4، فما قيمة x؟',
      options: ['9', '15', '16', '17'],
      answer: 3,
      explain: 'من تعريف اللوغاريتم: x-1=2⁴=16، ومنه x=17.',
      source: 'سؤال تحقق تشغيلي للإصدار المنشور — NEON Academy 2026',
      active: true
    }
  ];

  let attempts = 0;

  function addUnique(target, question) {
    if (!Array.isArray(target)) return false;
    if (target.some(item => item && (item.id === question.id || (item.subject === question.subject && item.q === question.q)))) return false;
    target.push({ ...question });
    return true;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function refresh(academy) {
    const active = (academy.questionBank || []).filter(item => item?.area === 'exams' && item.active !== false);
    const chemistry = active.filter(item => item.subject === 'tahsili-chemistry').length;
    const math = active.filter(item => item.subject === 'tahsili-math').length;
    setText('examCenterTotal', active.length.toLocaleString('ar-SA'));
    setText('count-tahsili-chemistry', `${chemistry.toLocaleString('ar-SA')} سؤال`);
    setText('count-tahsili-math', `${math.toLocaleString('ar-SA')} سؤال`);
    document.documentElement.dataset.productionSmoke = '20260817-001';
    window.NEON_PRODUCTION_SMOKE_REPORT = {
      activeExamQuestions: active.length,
      chemistry,
      math,
      chemistryQuestionPresent: active.some(item => item.id === 'verify-tc-prod-20260817-001'),
      mathQuestionPresent: active.some(item => item.id === 'verify-tm-prod-20260817-001'),
      checkedAt: new Date().toISOString()
    };
  }

  function reconcile() {
    attempts += 1;
    const academy = window.NEON_ACADEMY;
    const bank = window.NEON_EXAM_BANK;
    if (!academy || !Array.isArray(academy.questionBank) || !bank || !Array.isArray(bank.questions)) {
      if (attempts < 600) setTimeout(reconcile, 50);
      return;
    }

    verificationQuestions.forEach(question => {
      addUnique(academy.questionBank, question);
      addUnique(bank.questions, question);
    });

    academy.counts ||= {};
    academy.counts.questions = academy.questionBank.length;
    academy.counts.examQuestions = academy.questionBank.filter(item => item?.area === 'exams' && item.active !== false).length;

    refresh(academy);
    setTimeout(() => refresh(academy), 250);
    setTimeout(() => refresh(academy), 1000);
  }

  reconcile();
})();
