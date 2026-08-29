(() => {
  const questions = window.NEON_UPLOADED_MAASER10_ZERO_LESSON1_20260828;
  if (!Array.isArray(questions)) {
    throw new Error('Maaser 10 zero lesson 1 question bank must load before its skill taxonomy.');
  }

  const taxonomy = {
    'qdq-maaser10-zero1-001': { category: 'ترتيب العمليات', skills: ['order-of-operations', 'powers'] },
    'qdq-maaser10-zero1-002': { category: 'ترتيب العمليات', skills: ['order-of-operations', 'powers', 'division'] },
    'qdq-maaser10-zero1-003': { category: 'ترتيب العمليات', skills: ['order-of-operations'] },
    'qdq-maaser10-zero1-004': { category: 'ترتيب العمليات', skills: ['order-of-operations'] },
    'qdq-maaser10-zero1-005': { category: 'المقارنة الكمية', skills: ['quantitative-comparison', 'multiplication-division'] },
    'qdq-maaser10-zero1-006': { category: 'الأسس وترتيب العمليات', skills: ['powers', 'order-of-operations'] },
    'qdq-maaser10-zero1-007': { category: 'ترتيب العمليات', skills: ['order-of-operations', 'multiplication-division'] },
    'qdq-maaser10-zero1-008': { category: 'اختيار العملية الحسابية', skills: ['operation-selection', 'order-of-operations'] },
    'qdq-maaser10-zero1-009': { category: 'تبسيط العمليات', skills: ['order-of-operations', 'cancellation'] },
    'qdq-maaser10-zero1-010': { category: 'المتتابعات والمجاميع', skills: ['sequences-series', 'repeated-addition'] },
    'qdq-maaser10-zero1-011': { category: 'الكسور', skills: ['fractions', 'repeated-addition'] },
    'qdq-maaser10-zero1-012': { category: 'الجذور', skills: ['roots', 'mental-arithmetic'] },
    'qdq-maaser10-zero1-013': { category: 'الأسس', skills: ['powers', 'like-terms'] },
    'qdq-maaser10-zero1-014': { category: 'المقارنة الكمية', skills: ['quantitative-comparison', 'arithmetic'] },
    'qdq-maaser10-zero1-015': { category: 'الأسس', skills: ['powers', 'number-one-property', 'sequences-series'] },
    'qdq-maaser10-zero1-016': { category: 'الحساب الذهني', skills: ['mental-arithmetic', 'smart-pairing'] },
    'qdq-maaser10-zero1-017': { category: 'الكسور العشرية والمجاميع', skills: ['decimals', 'sequences-series'] },
    'qdq-maaser10-zero1-018': { category: 'المتتابعات والمجاميع', skills: ['sequences-series', 'powers'] },
    'qdq-maaser10-zero1-019': { category: 'المقارنة الكمية', skills: ['quantitative-comparison', 'fractions-ratios'] },
    'qdq-maaser10-zero1-020': { category: 'المقارنة الكمية', skills: ['quantitative-comparison', 'sequences-series'] },
    'qdq-maaser10-zero1-021': { category: 'مجموع الأعداد الطبيعية', skills: ['sequences-series', 'triangular-numbers'] },
    'qdq-maaser10-zero1-022': { category: 'مجموع الأعداد الصحيحة', skills: ['integers', 'sequences-series'] },
    'qdq-maaser10-zero1-023': { category: 'المتتابعات والأسس', skills: ['sequences-series', 'powers'] },
    'qdq-maaser10-zero1-024': { category: 'المتتابعات والمجاميع', skills: ['sequences-series', 'multiples'] },
    'qdq-maaser10-zero1-025': { category: 'مجموع الأعداد الطبيعية', skills: ['sequences-series', 'triangular-numbers'] },
    'qdq-maaser10-zero1-026': { category: 'مسائل المتتابعات', skills: ['sequences-series', 'triangular-numbers', 'word-problems'] },
    'qdq-maaser10-zero1-027': { category: 'الأعداد الزوجية والفردية', skills: ['even-odd-numbers', 'sequences-series'] },
    'qdq-maaser10-zero1-028': { category: 'الجمع بالتجميع الذكي', skills: ['smart-pairing', 'sequences-series'] },
    'qdq-maaser10-zero1-029': { category: 'الأعداد الزوجية والفردية', skills: ['even-odd-numbers', 'number-construction'] },
    'qdq-maaser10-zero1-030': { category: 'الأعداد الزوجية والفردية', skills: ['even-odd-numbers', 'quantitative-comparison', 'sequences-series'] },
    'qdq-maaser10-zero1-031': { category: 'الأعداد الزوجية والفردية', skills: ['even-odd-numbers', 'quantitative-comparison', 'sequences-series'] },
    'qdq-maaser10-zero1-032': { category: 'خانة الآحاد', skills: ['place-value', 'units-digit', 'multiplication'] },
    'qdq-maaser10-zero1-033': { category: 'خصائص الأعداد الكلية', skills: ['whole-numbers', 'zero-property'] },
    'qdq-maaser10-zero1-034': { category: 'خانة الآحاد', skills: ['place-value', 'units-digit', 'sequences-series', 'powers'] },
    'qdq-maaser10-zero1-035': { category: 'القسمة', skills: ['division', 'long-division'] },
    'qdq-maaser10-zero1-036': { category: 'خانة العشرات', skills: ['place-value', 'tens-digit', 'multiplication'] },
    'qdq-maaser10-zero1-037': { category: 'خانة العشرات', skills: ['place-value', 'tens-digit', 'factorials-products'] },
    'qdq-maaser10-zero1-038': { category: 'المقارنة الكمية', skills: ['quantitative-comparison', 'multiplication', 'mental-arithmetic'] }
  };

  if (Object.keys(taxonomy).length !== 38) {
    throw new Error(`Maaser 10 zero lesson 1 taxonomy expected 38 entries, received ${Object.keys(taxonomy).length}.`);
  }

  const seen = new Set();
  for (const question of questions) {
    const metadata = taxonomy[String(question.id || '')];
    if (!metadata) continue;
    question.category = metadata.category;
    question.skills = [...metadata.skills];
    question.skillTaxonomy = 'maaser10-zero-lesson1-v1';
    seen.add(String(question.id));
  }

  if (seen.size !== 38) {
    throw new Error(`Maaser 10 zero lesson 1 taxonomy classified ${seen.size}/38 questions.`);
  }

  window.NEON_MAASER10_ZERO_LESSON1_SKILL_TAXONOMY_20260829 = taxonomy;
})();
