const fs = require('fs');
const vm = require('vm');
const path = require('path');

global.window = global;

function run(file) {
  const full = path.resolve(__dirname, '..', file);
  const code = fs.readFileSync(full, 'utf8');
  vm.runInThisContext(code, { filename: file });
}

run('exam-bank-tahsili-chemistry-1.js');
run('exam-bank-tahsili-chemistry-2.js');
run('exam-bank-imported-2026.js');

const beforePdf = window.NEON_IMPORTED_EXAM_QUESTIONS_2026 || [];
const nasser = beforePdf.filter(q => String(q.source || '').includes('ناصر 2026'));
console.log('after imported-2026:', beforePdf.length);
console.log('nasser chemistry:', nasser.length);

run('exam-bank-uploaded-pdf-qqtahsili-00004-chemistry-2026.js');

const report = window.NEON_UPLOADED_PDF_QQTAHSILI_00004_REPORT || {};
const qq = window.NEON_UPLOADED_PDF_QQTAHSILI_00004_QUESTIONS || [];
const finalImported = window.NEON_IMPORTED_EXAM_QUESTIONS_2026 || [];
console.log('qq accepted:', qq.length);
console.log('qq report:', JSON.stringify({
  sourceQuestions: report.sourceQuestions,
  candidatesAfterInternalExactDedupe: report.candidatesAfterInternalExactDedupe,
  internalExactDuplicatesRemoved: report.internalExactDuplicatesRemoved,
  duplicatesAgainstExistingBankSkipped: report.duplicatesAgainstExistingBankSkipped,
  uniqueAdded: report.uniqueAdded
}));
console.log('final imported:', finalImported.length);

if (nasser.length !== 28) {
  console.error(`Expected 28 Nasser questions, got ${nasser.length}`);
  process.exitCode = 1;
}
if (!qq.length) {
  console.error('Expected at least one QqTahsili question to be accepted, got 0');
  process.exitCode = 1;
}
