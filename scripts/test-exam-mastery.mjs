import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key)
};
globalThis.window = {
  NEON_QUESTION_MASTERY: { userId: 'ci-student' }
};

const { ExamMasteryController } = await import('../app/src/exam-mastery.js');

const questions = [
  { id: 'q1', subject: 'tahsili-math', category: 'algebra', level: 'practice', active: true },
  { id: 'q2', subject: 'tahsili-math', category: 'geometry', level: 'practice', active: true },
  { id: 'q3', subject: 'tahsili-math', category: 'statistics', level: 'foundation', active: true },
  { id: 'q4', subject: 'tahsili-math', category: 'functions', level: 'mastery', active: true }
];

const controller = new ExamMasteryController('tahsili-math', questions);

let state = controller.applyAnswer(questions[0], false, { mode: 'smart' });
assert.equal(state.status, 'review', 'A wrong answer must enter review.');
assert.equal(state.correctStreak, 0);
assert.equal(controller.summary().review, 1);

state = controller.applyAnswer(questions[0], true, { mode: 'review' });
assert.equal(state.status, 'reinforcing', 'One correct review answer must require reinforcement.');
assert.equal(state.correctStreak, 1);

state = controller.applyAnswer(questions[0], true, { mode: 'review' });
assert.equal(state.status, 'mastered', 'Two consecutive correct answers must mark mastery.');
assert.equal(state.masteryScore, 100);
assert.equal(state.correctStreak, 2);

controller.applyAnswer(questions[1], true, { mode: 'smart' });
assert.equal(controller.record(questions[1]).status, 'learning', 'A first correct answer remains in learning.');

const smartIds = controller.select({ mode: 'smart', count: 10, level: 'all' }).map(question => question.id);
assert.ok(!smartIds.includes('q1'), 'Mastered questions must be excluded from smart selection.');
assert.ok(smartIds.includes('q3') || smartIds.includes('q4'), 'Smart selection must continue with non-mastered questions.');

const masteredIds = controller.select({ mode: 'mastered', count: 10, level: 'all' }).map(question => question.id);
assert.deepEqual(masteredIds, ['q1'], 'Mastered questions must remain available by explicit choice.');

const reviewIds = controller.select({ mode: 'review', count: 10, level: 'all' }).map(question => question.id);
assert.ok(!reviewIds.includes('q1'), 'Mastered questions must not return to review automatically.');

const summary = controller.summary();
assert.equal(summary.mastered, 1);
assert.equal(summary.learning, 1);
assert.equal(summary.new, 2);
assert.equal(summary.masteryPercent, 25);

console.log('Adaptive exam mastery transitions validated successfully.');
