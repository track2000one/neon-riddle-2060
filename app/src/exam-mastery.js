const STATUS_LABELS = {
  new: 'لم يبدأ',
  learning: 'قيد التثبيت',
  review: 'يحتاج مراجعة',
  reinforcing: 'جولة تثبيت',
  mastered: 'متقن'
};

const DAY = 24 * 60 * 60 * 1000;

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function recordTime(record) {
  const value = Date.parse(record?.updatedAt || record?.lastSeenAt || 0);
  return Number.isFinite(value) ? value : 0;
}

function cleanRecord(questionId, record = {}) {
  const attempts = Math.max(0, Number(record.attempts || 0));
  const correctCount = Math.max(0, Number(record.correctCount || 0));
  const wrongCount = Math.max(0, Number(record.wrongCount || 0));
  const status = ['new', 'learning', 'review', 'reinforcing', 'mastered'].includes(record.status)
    ? record.status
    : attempts ? 'learning' : 'new';
  return {
    questionId,
    status,
    attempts,
    correctCount,
    wrongCount,
    correctStreak: Math.max(0, Number(record.correctStreak || 0)),
    masteryScore: Math.max(0, Math.min(100, Number(record.masteryScore || 0))),
    lastAnswerCorrect: typeof record.lastAnswerCorrect === 'boolean' ? record.lastAnswerCorrect : null,
    nextReviewAt: record.nextReviewAt || null,
    firstSeenAt: record.firstSeenAt || null,
    lastSeenAt: record.lastSeenAt || null,
    masteredAt: record.masteredAt || null,
    updatedAt: record.updatedAt || null,
    metadata: record.metadata && typeof record.metadata === 'object' ? record.metadata : {}
  };
}

function mergeRecords(localRecords, remoteRecords) {
  const map = new Map();
  for (const record of [...(localRecords || []), ...(remoteRecords || [])]) {
    const questionId = String(record?.questionId || record?.id || '').trim();
    if (!questionId) continue;
    const normalized = cleanRecord(questionId, record);
    const current = map.get(questionId);
    if (!current || recordTime(normalized) >= recordTime(current)) map.set(questionId, normalized);
  }
  return map;
}

function priority(record) {
  if (record.status === 'review') return 120 + record.wrongCount * 8;
  if (record.status === 'reinforcing') return 105 + record.wrongCount * 5;
  if (record.status === 'learning') return 60 + record.attempts;
  if (record.status === 'new') return 20;
  return 0;
}

async function waitForClient(timeoutMs = 5000) {
  const started = Date.now();
  while (!window.NEON_QUESTION_MASTERY && Date.now() - started < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return window.NEON_QUESTION_MASTERY || null;
}

export class ExamMasteryController {
  constructor(subjectId, questions) {
    this.subjectId = subjectId;
    this.questions = Array.isArray(questions) ? questions : [];
    this.records = new Map();
    this.changed = new Set();
    this.loaded = false;
  }

  userId() {
    return window.NEON_QUESTION_MASTERY?.userId || 'anonymous';
  }

  localKey() {
    return `neonQuestionMasteryV2:${this.userId()}:${this.subjectId}`;
  }

  readLocal() {
    try {
      const value = JSON.parse(localStorage.getItem(this.localKey()) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  persistLocal() {
    try { localStorage.setItem(this.localKey(), JSON.stringify([...this.records.values()])); }
    catch { /* Mastery remains available in memory. */ }
  }

  async load() {
    const client = await waitForClient();
    const local = this.readLocal();
    const remote = client?.load ? await client.load(this.subjectId) : [];
    this.records = mergeRecords(local, remote);
    this.persistLocal();
    this.loaded = true;
    return this;
  }

  record(question) {
    const questionId = String(question?.id || '').trim();
    if (!questionId) return cleanRecord('unknown');
    return this.records.get(questionId) || cleanRecord(questionId);
  }

  isDue(record, now = Date.now()) {
    if (!record.nextReviewAt) return true;
    const time = Date.parse(record.nextReviewAt);
    return !Number.isFinite(time) || time <= now;
  }

  status(question) {
    return this.record(question).status;
  }

  summary(questions = this.questions) {
    const counts = { total: 0, new: 0, learning: 0, review: 0, reinforcing: 0, mastered: 0, due: 0 };
    for (const question of questions) {
      if (question.active === false) continue;
      counts.total += 1;
      const record = this.record(question);
      counts[record.status] += 1;
      if ((record.status === 'review' || record.status === 'reinforcing' || record.status === 'learning') && this.isDue(record)) counts.due += 1;
    }
    counts.practiced = counts.total - counts.new;
    counts.pending = counts.total - counts.mastered;
    counts.masteryPercent = counts.total ? Math.round((counts.mastered / counts.total) * 100) : 0;
    return counts;
  }

  filterByLevel(level) {
    return this.questions.filter(question => question.active !== false && (level === 'all' || question.level === level));
  }

  select({ mode = 'smart', count = 10, level = 'all' } = {}) {
    const now = Date.now();
    const eligible = this.filterByLevel(level);
    const buckets = { new: [], learning: [], review: [], reinforcing: [], mastered: [] };
    for (const question of eligible) buckets[this.record(question).status].push(question);
    Object.values(buckets).forEach(bucket => bucket.sort((a, b) => priority(this.record(b)) - priority(this.record(a))));

    const requested = Math.max(1, Number(count || 10));
    if (mode === 'new') return shuffle(buckets.new).slice(0, requested);
    if (mode === 'review') {
      const due = [...buckets.review, ...buckets.reinforcing, ...buckets.learning]
        .filter(question => this.isDue(this.record(question), now));
      return shuffle(due).sort((a, b) => priority(this.record(b)) - priority(this.record(a))).slice(0, requested);
    }
    if (mode === 'mastered') return shuffle(buckets.mastered).slice(0, requested);
    if (mode === 'all') return shuffle(eligible).slice(0, requested);

    const review = shuffle([...buckets.review, ...buckets.reinforcing].filter(question => this.isDue(this.record(question), now)))
      .sort((a, b) => priority(this.record(b)) - priority(this.record(a)));
    const learningDue = shuffle(buckets.learning.filter(question => this.isDue(this.record(question), now)));
    const newQuestions = shuffle(buckets.new);
    const learningNotDue = shuffle(buckets.learning.filter(question => !this.isDue(this.record(question), now)));

    const result = [];
    const take = (source, amount) => {
      while (source.length && result.length < requested && amount > 0) {
        result.push(source.shift());
        amount -= 1;
      }
    };

    take(review, Math.ceil(requested * 0.6));
    take(learningDue, Math.ceil(requested * 0.25));
    take(newQuestions, requested - result.length);
    take(review, requested - result.length);
    take(learningDue, requested - result.length);
    take(learningNotDue, requested - result.length);
    return result.slice(0, requested);
  }

  applyAnswer(question, correct, { mode = 'smart' } = {}) {
    const now = new Date();
    const current = this.record(question);
    const next = {
      ...current,
      attempts: current.attempts + 1,
      correctCount: current.correctCount + (correct ? 1 : 0),
      wrongCount: current.wrongCount + (correct ? 0 : 1),
      correctStreak: correct ? current.correctStreak + 1 : 0,
      lastAnswerCorrect: correct,
      firstSeenAt: current.firstSeenAt || now.toISOString(),
      lastSeenAt: now.toISOString(),
      updatedAt: now.toISOString(),
      metadata: {
        ...current.metadata,
        category: question.category || '',
        level: question.level || '',
        lastMode: mode
      }
    };

    if (!correct) {
      next.status = 'review';
      next.masteryScore = Math.max(10, Math.round(current.masteryScore * 0.55));
      next.nextReviewAt = now.toISOString();
      next.masteredAt = null;
    } else if (next.correctStreak >= 2) {
      next.status = 'mastered';
      next.masteryScore = 100;
      next.nextReviewAt = null;
      next.masteredAt = now.toISOString();
    } else if (current.status === 'review' || current.status === 'reinforcing' || mode === 'review') {
      next.status = 'reinforcing';
      next.masteryScore = Math.max(70, current.masteryScore);
      next.nextReviewAt = now.toISOString();
      next.masteredAt = null;
    } else {
      next.status = 'learning';
      next.masteryScore = Math.max(45, Math.round((next.correctCount / next.attempts) * 70));
      next.nextReviewAt = new Date(now.getTime() + DAY).toISOString();
      next.masteredAt = null;
    }

    this.records.set(next.questionId, next);
    this.changed.add(next.questionId);
    this.persistLocal();
    return next;
  }

  questionsByIds(ids, { includeMastered = false } = {}) {
    const wanted = new Set((ids || []).map(String));
    return this.questions.filter(question => {
      if (!wanted.has(String(question.id))) return false;
      return includeMastered || this.record(question).status !== 'mastered';
    });
  }

  pendingFrom(ids) {
    return this.questionsByIds(ids).filter(question => {
      const status = this.record(question).status;
      return status === 'review' || status === 'reinforcing' || status === 'learning';
    });
  }

  statusLabel(questionOrRecord) {
    const record = questionOrRecord?.questionId ? questionOrRecord : this.record(questionOrRecord);
    return STATUS_LABELS[record.status] || STATUS_LABELS.new;
  }

  async sync() {
    if (!this.changed.size) return { ok: true, saved: 0 };
    const records = [...this.changed]
      .map(questionId => this.records.get(questionId))
      .filter(Boolean);
    const client = await waitForClient(1500);
    const result = client?.save
      ? await client.save(this.subjectId, records)
      : { ok: false, localOnly: true, saved: records.length };
    this.changed.clear();
    return result;
  }
}

export { STATUS_LABELS };
