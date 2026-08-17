(() => {
  'use strict';

  const chemistryQuestion = {
    id: 'verify-tc-20260817-001',
    area: 'exams',
    family: 'tahsili',
    subject: 'tahsili-chemistry',
    category: 'gases',
    level: 'practice',
    q: 'عينة من غاز مثالي ضغطها 2.4 atm وحجمها 5 L عند ثبوت درجة الحرارة. إذا أصبح حجمها 3 L، فما الضغط الجديد؟',
    options: ['2.0 atm', '3.0 atm', '4.0 atm', '6.0 atm'],
    answer: 2,
    explain: 'حسب قانون بويل: P₁V₁=P₂V₂، إذن P₂=(2.4×5)÷3=4 atm.',
    qEn: 'An ideal gas sample has a pressure of 2.4 atm and a volume of 5 L at constant temperature. If its volume becomes 3 L, what is the new pressure?',
    optionsEn: ['2.0 atm', '3.0 atm', '4.0 atm', '6.0 atm'],
    explainEn: 'By Boyle’s law, P1V1=P2V2, so P2=(2.4×5)/3=4 atm.',
    source: 'سؤال تحقق تشغيلي — NEON Academy 2026',
    sourceEn: 'Operational verification question — NEON Academy 2026'
  };

  const mathQuestion = {
    id: 'verify-tm-20260817-001',
    area: 'exams',
    family: 'tahsili',
    subject: 'tahsili-math',
    category: 'algebra-functions',
    level: 'practice',
    q: 'إذا كان log₂(x-1)=4، فما قيمة x؟',
    options: ['9', '15', '16', '17'],
    answer: 3,
    explain: 'من تعريف اللوغاريتم: x-1=2⁴=16، ومنه x=17.',
    qEn: 'If log₂(x-1)=4, what is x?',
    optionsEn: ['9', '15', '16', '17'],
    explainEn: 'By the logarithm definition, x-1=2⁴=16, so x=17.',
    source: 'سؤال تحقق تشغيلي — NEON Academy 2026',
    sourceEn: 'Operational verification question — NEON Academy 2026'
  };

  const appendUnique = (targetName, question) => {
    const target = Array.isArray(window[targetName]) ? window[targetName] : [];
    if (!target.some(item => item && item.id === question.id)) target.push(question);
    window[targetName] = target;
  };

  appendUnique('NEON_TAHSILI_CHEMISTRY_QUESTIONS_PART2', chemistryQuestion);
  appendUnique('NEON_TAHSILI_MATH_QUESTIONS', mathQuestion);

  window.NEON_SMOKE_VERIFICATION_20260817 = Object.freeze({
    chemistryId: chemistryQuestion.id,
    mathId: mathQuestion.id,
    expectedChemistryDelta: 1,
    expectedMathDelta: 1,
    expectedTotalDelta: 2
  });
})();
