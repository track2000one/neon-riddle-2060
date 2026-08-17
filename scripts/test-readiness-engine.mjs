import assert from 'node:assert/strict';
import { computeReadiness, normalizeSkillEvidence } from '../server/readiness-engine.mjs';

const now = Date.parse('2026-08-10T12:00:00Z');

const sparse = computeReadiness({
  sessions:1,
  average:100,
  latest:100,
  mastery:0,
  skills:[{ subjectId:'tahsili-math', category:'probability', title:'الاحتمالات', correct:1, total:1, latestAt:'2026-08-10T10:00:00Z' }],
  now
});
assert.ok(sparse.value < 90, `Sparse perfect evidence must not create near-certain readiness, got ${sparse.value}`);
assert.ok(sparse.confidence < 50, 'Sparse evidence must expose low measurement confidence.');
assert.equal(sparse.skills[0].status, 'needs-evidence');

const strong = computeReadiness({
  sessions:8,
  average:84,
  latest:88,
  mastery:82,
  skills:[
    { subjectId:'tahsili-math', category:'algebra', title:'الجبر', correct:10, total:12, latestAt:'2026-08-09T10:00:00Z' },
    { subjectId:'tahsili-physics', category:'motion', title:'الحركة', correct:8, total:10, latestAt:'2026-08-08T10:00:00Z' },
    { subjectId:'tahsili-chemistry', category:'atomic', title:'الذرة', correct:9, total:10, latestAt:'2026-08-07T10:00:00Z' }
  ],
  now
});
assert.ok(strong.value >= 80 && strong.value <= 90, `Strong multi-source evidence should yield a high but bounded readiness, got ${strong.value}`);
assert.ok(strong.confidence >= 90, 'Rich evidence should produce high confidence.');
assert.ok(strong.skillScore >= 80, 'Strong recent skill evidence should produce a strong skill score.');

const priorities = normalizeSkillEvidence([
  { subjectId:'tahsili-math', category:'probability', title:'الاحتمالات', correct:2, total:6, latestAt:'2026-08-09T10:00:00Z' },
  { subjectId:'tahsili-math', category:'geometry', title:'الهندسة', correct:7, total:8, latestAt:'2026-05-01T10:00:00Z' },
  { subjectId:'tahsili-math', category:'matrices', title:'المصفوفات', correct:3, total:4, latestAt:'2026-08-09T10:00:00Z' }
], now);
assert.equal(priorities[0].category, 'probability', 'Weak recent evidence must receive the highest training priority.');
assert.equal(priorities.find(item => item.category === 'geometry')?.status, 'strong');
assert.equal(priorities.find(item => item.category === 'matrices')?.status, 'developing');

console.log('Evidence-weighted readiness and skill prioritization validated successfully.');
