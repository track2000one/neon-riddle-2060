import './exam-subject-icons.css';

const ICONS = {
  'tahsili-math': `<svg viewBox="0 0 96 96" role="img" aria-label="رياضيات"><path d="M17 76h62M22 76V23"/><rect x="31" y="57" width="10" height="19" rx="2"/><rect x="47" y="47" width="10" height="29" rx="2"/><rect x="63" y="34" width="10" height="42" rx="2"/><path d="M28 50c12-5 19-13 27-23 7 5 12 4 20-5"/><path d="M67 21h11v11"/></svg>`,
  'tahsili-physics': `<svg viewBox="0 0 96 96" role="img" aria-label="فيزياء"><circle cx="48" cy="48" r="6"/><ellipse cx="48" cy="48" rx="34" ry="14"/><ellipse cx="48" cy="48" rx="34" ry="14" transform="rotate(60 48 48)"/><ellipse cx="48" cy="48" rx="34" ry="14" transform="rotate(120 48 48)"/><circle cx="77" cy="48" r="3.2"/><circle cx="31" cy="21" r="3.2"/><circle cx="31" cy="75" r="3.2"/></svg>`,
  'tahsili-chemistry': `<svg viewBox="0 0 96 96" role="img" aria-label="كيمياء"><path d="M18 18h22M24 18v26L12 72a8 8 0 0 0 7 11h27a8 8 0 0 0 7-11L40 44V18"/><path d="M18 66h29M22 57h21"/><path d="M62 24l9-5 9 5v10l-9 5-9-5V24Z"/><circle cx="71" cy="29" r="2.5"/><path d="M70 39v12M60 56h23M64 56v19h15V56"/><path d="M67 65h9"/></svg>`,
  'tahsili-biology': `<svg viewBox="0 0 96 96" role="img" aria-label="أحياء"><path d="M34 15c25 12 25 54 0 66M62 15c-25 12-25 54 0 66"/><path d="M35 25h26M30 36h36M30 60h36M35 71h26"/><path d="M66 18c12-4 19 2 16 14-12 3-19-3-16-14ZM12 54c14-3 22 4 18 18-14 2-22-5-18-18Z"/><path d="M26 62c-8 5-12 11-15 18M70 28c7 5 11 10 15 17"/></svg>`,
  'qudurat-verbal': `<svg viewBox="0 0 96 96" role="img" aria-label="قدرات لفظية"><path d="M13 24c12-5 24-3 35 5v47c-11-8-23-10-35-5V24Z"/><path d="M83 24c-12-5-24-3-35 5v47c11-8 23-10 35-5V24Z"/><path d="M22 39c8-2 14 0 20 3M22 49c8-2 14 0 20 3M74 39c-8-2-14 0-20 3M74 49c-8-2-14 0-20 3"/><path d="M66 21c10-8 16-10 20-9-1 6-5 13-14 21l-9 4 3-16Z"/></svg>`,
  'qudurat-quant': `<svg viewBox="0 0 96 96" role="img" aria-label="قدرات كمية"><path d="M16 18h26L28 31l14 13H16"/><path d="M51 18h12l7 14 8-24"/><path d="M15 70l12-20 12 20H15Z"/><path d="M51 54l12-7 12 7v14l-12 7-12-7V54Z"/><circle cx="77" cy="72" r="10"/><path d="M77 62v10l7 5"/></svg>`
};

function enhanceCard(card) {
  const subject = card?.dataset?.subject;
  const icon = card?.querySelector?.('.exam-subject-icon');
  if (!subject || !icon || icon.dataset.enhanced === 'true') return;
  const markup = ICONS[subject];
  if (!markup) return;

  icon.dataset.enhanced = 'true';
  icon.dataset.iconSubject = subject;
  icon.classList.add('neon-subject-icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = markup;
  card.classList.add('has-premium-subject-icon');
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
