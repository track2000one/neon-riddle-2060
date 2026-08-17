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

  const QQ_FILE = 'exam-bank-uploaded-pdf-qqtahsili-00004-chemistry-2026.js?v=20260817-2210-prod-sync';
  let attempts = 0;

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

  function addUnique(target, question) {
    if (!Array.isArray(target) || !question) return false;
    const key = `${question.subject || ''}|${normalize(question.q)}`;
    if (target.some(item => item && `${item.subject || ''}|${normalize(item.q)}` === key)) return false;
    target.push({ ...question, active: question.active !== false });
    return true;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function refresh(academy, extra = {}) {
    const active = (academy.questionBank || []).filter(item => item?.area === 'exams' && item.active !== false);
    const chemistry = active.filter(item => item.subject === 'tahsili-chemistry').length;
    const math = active.filter(item => item.subject === 'tahsili-math').length;
    const nasser = active.filter(item => String(item.source || '').includes('ناصر 2026')).length;
    const qq = active.filter(item => String(item.source || '').includes('QqTahsili-00004.pdf')).length;
    setText('examCenterTotal', active.length.toLocaleString('ar-SA'));
    setText('count-tahsili-chemistry', `${chemistry.toLocaleString('ar-SA')} سؤال`);
    setText('count-tahsili-math', `${math.toLocaleString('ar-SA')} سؤال`);
    document.documentElement.dataset.productionSmoke = '20260817-002';
    window.NEON_PRODUCTION_SMOKE_REPORT = {
      activeExamQuestions: active.length,
      chemistry,
      math,
      nasser,
      qq,
      chemistryQuestionPresent: active.some(item => item.id === 'verify-tc-prod-20260817-001'),
      mathQuestionPresent: active.some(item => item.id === 'verify-tm-prod-20260817-001'),
      ...extra,
      checkedAt: new Date().toISOString()
    };
  }

  function loadQqFile() {
    return new Promise((resolve, reject) => {
      if (Array.isArray(window.NEON_UPLOADED_PDF_QQTAHSILI_00004_QUESTIONS)) return resolve();
      const absolute = new URL(QQ_FILE, document.baseURI).href;
      const existing = [...document.scripts].find(script => script.src === absolute);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = QQ_FILE;
      script.async = false;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  async function reconcile() {
    attempts += 1;
    const academy = window.NEON_ACADEMY;
    const bank = window.NEON_EXAM_BANK;
    if (!academy || !Array.isArray(academy.questionBank) || !bank || !Array.isArray(bank.questions)) {
      if (attempts < 600) setTimeout(reconcile, 50);
      return;
    }

    let verificationAdded = 0;
    verificationQuestions.forEach(question => {
      if (addUnique(academy.questionBank, question)) verificationAdded += 1;
      addUnique(bank.questions, question);
    });

    let qqAdded = 0;
    let qqAvailable = 0;
    try {
      await loadQqFile();
      const qqQuestions = window.NEON_UPLOADED_PDF_QQTAHSILI_00004_QUESTIONS || [];
      qqAvailable = qqQuestions.length;
      qqQuestions.forEach(question => {
        if (addUnique(academy.questionBank, question)) qqAdded += 1;
        addUnique(bank.questions, question);
      });
    } catch (error) {
      console.error('Unable to load the QqTahsili production import.', error);
    }

    academy.counts ||= {};
    academy.counts.questions = academy.questionBank.length;
    academy.counts.examQuestions = academy.questionBank.filter(item => item?.area === 'exams' && item.active !== false).length;

    refresh(academy, { verificationAdded, qqAvailable, qqAdded });
    setTimeout(() => refresh(academy, { verificationAdded, qqAvailable, qqAdded }), 250);
    setTimeout(() => refresh(academy, { verificationAdded, qqAvailable, qqAdded }), 1000);
  }

  reconcile();
})();
