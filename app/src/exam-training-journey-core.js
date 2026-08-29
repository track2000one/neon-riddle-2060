export const TRAINING_STAGES = [
  { id: 1, title: 'التأسيس', short: 'تأسيس', description: 'ابدأ بالمفاهيم الأساسية والأسئلة الجديدة.', mode: 'new', level: 'foundation', count: 20, minutes: 20 },
  { id: 2, title: 'التدريب المباشر', short: 'تدريب', description: 'وسّع التغطية بأسئلة جديدة متنوعة.', mode: 'new', level: 'all', count: 20, minutes: 20 },
  { id: 3, title: 'التثبيت الذكي', short: 'تثبيت', description: 'امزج الجديد مع النقاط التي تحتاج تثبيتًا.', mode: 'smart', level: 'all', count: 20, minutes: 20 },
  { id: 4, title: 'تطوير المستوى', short: 'تطوير', description: 'ارفع مستوى التدريب مع أولوية لنقاط الضعف.', mode: 'smart', level: 'practice', count: 40, minutes: 40 },
  { id: 5, title: 'التحدي', short: 'تحدي', description: 'جولة موسعة تحاكي ضغط الاختبار وتنوّع الأسئلة.', mode: 'smart', level: 'all', count: 40, minutes: 40 },
  { id: 6, title: 'مراجعة الأخطاء', short: 'مراجعة', description: 'نظّف الأخطاء والأسئلة التي تنتظر جولة تثبيت.', mode: 'review', level: 'all', count: 20, minutes: 0 },
  { id: 7, title: 'اختبار الإتقان', short: 'إتقان', description: 'اختبار شامل لقياس جاهزيتك بعد إنهاء المراحل السابقة.', mode: 'all', level: 'all', count: 40, minutes: 40 }
];

const PRACTICE_CAPS = [20, 50, 100, 160, 240];
const PRACTICE_RATIOS = [0.12, 0.28, 0.45, 0.62, 0.78];

function recordTime(record) {
  const value = Date.parse(record?.updatedAt || record?.lastSeenAt || 0);
  return Number.isFinite(value) ? value : 0;
}

export function dedupeMasteryRecords(records = []) {
  const map = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const questionId = String(record?.questionId || record?.id || '').trim();
    if (!questionId) continue;
    const normalized = { ...record, questionId };
    const current = map.get(questionId);
    if (!current || recordTime(normalized) >= recordTime(current)) map.set(questionId, normalized);
  }
  return [...map.values()];
}

export function trainingThresholds(totalQuestions) {
  const total = Math.max(1, Number(totalQuestions || 1));
  return PRACTICE_CAPS.map((cap, index) => Math.max(1, Math.min(cap, Math.ceil(total * PRACTICE_RATIOS[index]))));
}

export function summarizeMastery(records = [], totalQuestions = 0) {
  const unique = dedupeMasteryRecords(records);
  const total = Math.max(Number(totalQuestions || 0), unique.length);
  const stats = {
    total,
    practiced: 0,
    mastered: 0,
    learning: 0,
    review: 0,
    reinforcing: 0,
    new: 0,
    reviewBacklog: 0,
    masteryPercent: 0,
    practicedPercent: 0
  };

  for (const record of unique) {
    const attempts = Math.max(0, Number(record.attempts || 0));
    const status = String(record.status || (attempts ? 'learning' : 'new'));
    if (attempts > 0) stats.practiced += 1;
    if (status === 'mastered') stats.mastered += 1;
    else if (status === 'review') stats.review += 1;
    else if (status === 'reinforcing') stats.reinforcing += 1;
    else if (status === 'learning') stats.learning += 1;
  }

  stats.reviewBacklog = stats.review + stats.reinforcing;
  stats.new = Math.max(0, total - stats.practiced);
  stats.masteryPercent = total ? Math.round((stats.mastered / total) * 100) : 0;
  stats.practicedPercent = total ? Math.round((stats.practiced / total) * 100) : 0;
  return stats;
}

export function buildJourneyStages(stats) {
  const thresholds = trainingThresholds(stats.total);
  const reviewAllowance = Math.max(3, Math.round(stats.practiced * 0.06));
  const contentDone = thresholds.map(threshold => stats.practiced >= threshold);
  const reviewDone = contentDone[4] && stats.reviewBacklog <= reviewAllowance;
  const masteryGoal = Math.min(stats.total, Math.max(10, Math.round(Math.max(stats.practiced, 1) * 0.7)));
  const masteryDone = reviewDone && stats.mastered >= masteryGoal;
  const completion = [...contentDone, reviewDone, masteryDone];
  let current = completion.findIndex(done => !done) + 1;
  if (!current) current = 7;

  return TRAINING_STAGES.map((stage, index) => ({
    ...stage,
    status: completion[index] ? 'done' : stage.id === current ? 'current' : 'upcoming',
    target: stage.id <= 5 ? thresholds[index] : stage.id === 6 ? reviewAllowance : masteryGoal,
    value: stage.id <= 5 ? stats.practiced : stage.id === 6 ? stats.reviewBacklog : stats.mastered
  }));
}

export function currentJourneyStage(stats) {
  return buildJourneyStages(stats).find(stage => stage.status === 'current') || TRAINING_STAGES[TRAINING_STAGES.length - 1];
}

export function resetMasteryRecords(records = [], resetAt = new Date().toISOString()) {
  return dedupeMasteryRecords(records).map(record => ({
    questionId: record.questionId,
    status: 'new',
    attempts: 0,
    correctCount: 0,
    wrongCount: 0,
    correctStreak: 0,
    masteryScore: 0,
    lastAnswerCorrect: null,
    nextReviewAt: null,
    firstSeenAt: null,
    lastSeenAt: null,
    masteredAt: null,
    updatedAt: resetAt,
    metadata: {
      ...(record.metadata && typeof record.metadata === 'object' ? record.metadata : {}),
      resetAt,
      resetReason: 'training-journey-restart'
    }
  }));
}
