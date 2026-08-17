const fs = require('fs');
const vm = require('vm');
const path = require('path');

global.window = global;

const academyDir = path.resolve(__dirname, '..');
function run(file) {
  const full = path.join(academyDir, file);
  const code = fs.readFileSync(full, 'utf8');
  vm.runInThisContext(code, { filename: file });
}

run('catalog.js');
const baseAcademyExamCount = (window.NEON_ACADEMY?.questionBank || []).filter(q => q.area === 'exams').length;
console.log('base catalog exam questions:', baseAcademyExamCount);

run('exam-assets-manifest.js');
const files = Array.from(window.NEON_EXAM_DATA_ASSETS || []);
if (!files.length) throw new Error('Exam data manifest is empty');
console.log('exam data manifest:', files.length);

for (const file of files) {
  if (file.startsWith('exam-visuals')) continue;
  try {
    run(file);
  } catch (error) {
    console.error('FAILED QUESTION ASSET:', file, error && error.stack || error);
    process.exit(1);
  }
}

const imported = window.NEON_IMPORTED_EXAM_QUESTIONS_2026 || [];
const nasser = imported.filter(q => String(q.source || '').includes('ناصر 2026'));
const qq = imported.filter(q => String(q.source || '').includes('QqTahsili-00004.pdf'));
console.log('imported total before bank:', imported.length);
console.log('recent imported:', { nasser: nasser.length, qq: qq.length, total: nasser.length + qq.length });
const zipImported = window.NEON_IMPORTED_ZIP8887777_20260808 || [];
const arithmeticImages = window.NEON_UPLOADED_IMAGES_ARITHMETIC_20260808 || [];
console.log('additional source coverage:', { zip: zipImported.length, arithmeticImages: arithmeticImages.length });

run('exam-bank.js');
const bank = window.NEON_EXAM_BANK;
const academy = window.NEON_ACADEMY;
if (!bank || !academy) throw new Error('Exam bank or academy was not assembled');

const recentRegex = /(?:ناصر 2026|QqTahsili-00004\.pdf)/i;
const recentInBank = bank.questions.filter(q => recentRegex.test(String(q.source || '')));
const recentInAcademy = academy.questionBank.filter(q => recentRegex.test(String(q.source || '')));
const nasserInBank = recentInBank.filter(q => String(q.source || '').includes('ناصر 2026'));
const qqInBank = recentInBank.filter(q => String(q.source || '').includes('QqTahsili-00004.pdf'));
const finalAcademyExamCount = academy.questionBank.filter(q => q.area === 'exams').length;

console.log('bank unique total:', bank.questions.length);
console.log('recent surviving in final bank:', { nasser: nasserInBank.length, qq: qqInBank.length, total: recentInBank.length });
console.log('recent present in academy:', recentInAcademy.length);
console.log('final academy exam count:', finalAcademyExamCount);
console.log('expected count without recent batches:', finalAcademyExamCount - recentInAcademy.length);
console.log('chemistry total in academy:', academy.questionBank.filter(q => q.area === 'exams' && q.subject === 'tahsili-chemistry').length);
const zipInBank = bank.questions.filter(q => String(q.id || '').startsWith('zip8887777-')).length;
console.log('zip questions in final bank:', zipInBank);

if (zipImported.length !== 215) throw new Error(`Expected 215 ZIP questions, got ${zipImported.length}`);
if (arithmeticImages.length < 300) throw new Error(`Arithmetic image bank did not load correctly: ${arithmeticImages.length}`);
if (zipInBank < 200) throw new Error(`ZIP question integration is incomplete: ${zipInBank}`);
if (nasser.length !== 28) throw new Error(`Expected 28 Nasser imported questions, got ${nasser.length}`);
if (qq.length !== 98) throw new Error(`Expected 98 QQ imported questions, got ${qq.length}`);
if (recentInBank.length !== 126) throw new Error(`Expected 126 recent questions in final bank, got ${recentInBank.length}`);
if (recentInAcademy.length !== 126) throw new Error(`Expected 126 recent questions in academy, got ${recentInAcademy.length}`);
