function clamp(value, minimum = 0, maximum = 100) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : 0;
}

function daysSince(value, now = Date.now()) {
  const timestamp = new Date(value || 0).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 999;
  return Math.max(0, (now - timestamp) / 86_400_000);
}

function recencyWeight(value, now = Date.now()) {
  const days = daysSince(value, now);
  if (days <= 14) return 1;
  if (days <= 30) return 0.88;
  if (days <= 60) return 0.72;
  if (days <= 90) return 0.58;
  return 0.42;
}

export function normalizeSkillEvidence(rows = [], now = Date.now()) {
  return (Array.isArray(rows) ? rows : [])
    .map(row => {
      const total = Math.max(0, Math.trunc(Number(row.total || row.questions || 0)));
      const correct = Math.max(0, Math.min(total || 100000, Math.trunc(Number(row.correct || 0))));
      const percent = total ? Math.round((correct / total) * 100) : Math.round(clamp(row.percent || row.average));
      const recency = recencyWeight(row.latestAt || row.latest_at || row.updatedAt, now);
      const evidence = Math.min(1, total / 6);
      const priorityScore = Math.round((100 - percent) * (0.65 + evidence * 0.35) * recency);
      const status = total < 2 ? 'needs-evidence' : percent >= 80 ? 'strong' : percent >= 60 ? 'developing' : 'priority';
      return {
        subjectId: String(row.subjectId || row.subject_id || row.subject || ''),
        subjectTitle: String(row.subjectTitle || row.subject_title || ''),
        category: String(row.category || row.categoryId || row.category_id || 'general'),
        title: String(row.title || row.categoryTitle || row.category_title || row.category || 'مهارات عامة'),
        total,
        correct,
        percent,
        latestAt: row.latestAt || row.latest_at || null,
        recency: Math.round(recency * 100) / 100,
        evidence: Math.round(evidence * 100) / 100,
        priorityScore,
        status
      };
    })
    .filter(row => row.subjectId && row.category)
    .sort((a, b) => (b.priorityScore - a.priorityScore) || (a.percent - b.percent) || (b.total - a.total));
}

export function computeReadiness({ sessions = 0, average = 0, latest = 0, mastery = 0, skills = [], now = Date.now() } = {}) {
  const normalizedSkills = normalizeSkillEvidence(skills, now);
  const skillEvidence = normalizedSkills.reduce((sum, row) => sum + row.total * row.recency, 0);
  const skillScore = skillEvidence
    ? normalizedSkills.reduce((sum, row) => sum + row.percent * row.total * row.recency, 0) / skillEvidence
    : 0;
  const skillConfidence = Math.min(1, skillEvidence / 28);

  const components = [];
  if (Number(sessions) > 0) {
    components.push({ key: 'average', value: clamp(average), weight: 0.30 });
    components.push({ key: 'latest', value: clamp(latest), weight: 0.20 });
  }
  if (Number(mastery) > 0) components.push({ key: 'mastery', value: clamp(mastery), weight: 0.15 });
  if (skillEvidence > 0) {
    components.push({
      key: 'skills',
      value: clamp(skillScore),
      weight: 0.20 + 0.15 * skillConfidence
    });
  }

  if (!components.length) return { value: 0, skillScore: 0, confidence: 0, components: [], skills: normalizedSkills };
  const weight = components.reduce((sum, item) => sum + item.weight, 0);
  let value = components.reduce((sum, item) => sum + item.value * item.weight, 0) / weight;

  // Very small evidence sets should not create an unrealistically high readiness score.
  const evidenceConfidence = Math.min(1, (Number(sessions) * 5 + skillEvidence) / 40);
  if (value > 70 && evidenceConfidence < 0.45) value = 70 + (value - 70) * evidenceConfidence;

  return {
    value: Math.round(clamp(value)),
    skillScore: Math.round(clamp(skillScore)),
    confidence: Math.round(evidenceConfidence * 100),
    skillConfidence: Math.round(skillConfidence * 100),
    components: components.map(item => ({ ...item, value: Math.round(item.value) })),
    skills: normalizedSkills
  };
}
