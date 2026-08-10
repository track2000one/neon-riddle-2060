import './exam-skill-selector.js';
import { prepareModernExamRuntime } from './exam-modern-runtime.js';

await prepareModernExamRuntime();
await import('./exams.js');
