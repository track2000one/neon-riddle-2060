import './exam-subject-icons.css';
import './exam-subject-reference-art.css';
import verbalArt from './assets/exam-subjects/qudurat-verbal.webp';
import quantArt from './assets/exam-subjects/qudurat-quant.webp';
import mathArt from './assets/exam-subjects/tahsili-math.webp';
import physicsArt from './assets/exam-subjects/tahsili-physics.webp';
import chemistryArt from './assets/exam-subjects/tahsili-chemistry.webp';
import biologyArt from './assets/exam-subjects/tahsili-biology.webp';

const SUBJECT_ART = {
  'qudurat-verbal': verbalArt,
  'qudurat-quant': quantArt,
  'tahsili-math': mathArt,
  'tahsili-physics': physicsArt,
  'tahsili-chemistry': chemistryArt,
  'tahsili-biology': biologyArt
};

const FAMILY_LABELS = {
  'qudurat-verbal': 'القدرات العامة',
  'qudurat-quant': 'القدرات العامة',
  'tahsili-math': 'التحصيلي',
  'tahsili-physics': 'التحصيلي',
  'tahsili-chemistry': 'التحصيلي',
  'tahsili-biology': 'التحصيلي'
};

const CARD_COPY = {
  'qudurat-verbal': 'فهم أعمق .. وتعبير أدق',
  'qudurat-quant': 'أرقام .. تحليلات .. قرارات أفضل',
  'tahsili-math': 'منطق دقيق .. لحلول أوسع',
  'tahsili-physics': 'اكتشف القوانين التي تحرك العالم',
  'tahsili-chemistry': 'مادة تصنع المستقبل',
  'tahsili-biology': 'استكشف أسرار الحياة'
};

function ensureArrow(card) {
  if (card.querySelector('.exam-subject-arrow')) return;
  const arrow = document.createElement('span');
  arrow.className = 'exam-subject-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.innerHTML = `<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>`;
  card.append(arrow);
}

function enhanceCard(card) {
  const subject = card?.dataset?.subject;
  const icon = card?.querySelector?.('.exam-subject-icon');
  if (!subject || !icon || !SUBJECT_ART[subject]) return;

  const family = card.querySelector('small');
  if (family && FAMILY_LABELS[subject]) family.textContent = FAMILY_LABELS[subject];

  const description = card.querySelector('p');
  if (description && CARD_COPY[subject]) description.textContent = CARD_COPY[subject];

  if (icon.dataset.enhanced !== 'true') {
    icon.dataset.enhanced = 'true';
    icon.dataset.iconSubject = subject;
    icon.classList.add('neon-subject-icon', 'reference-subject-art');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = `<img src="${SUBJECT_ART[subject]}" alt="" loading="eager" decoding="async">`;
  }

  ensureArrow(card);
  card.classList.add('has-premium-subject-icon', 'glass-reference-card');
}

function enhanceAll(root = document) {
  if (root instanceof Element && root.matches('.exam-subject[data-subject]')) enhanceCard(root);
  root?.querySelectorAll?.('.exam-subject[data-subject]').forEach(enhanceCard);
}

function initialize() {
  enhanceAll(document);
  const host = document.getElementById('examSubjects') || document.body;
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) enhanceAll(node);
      }
    }
  });
  observer.observe(host, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
