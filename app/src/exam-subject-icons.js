import './exam-subject-icons.css';

const ICONS = {
  'tahsili-math': `<svg viewBox="0 0 64 64" role="img" aria-label="رياضيات"><path d="M10 48h44M14 48V16M19 41l9-10 8 5 13-17"/><path d="M41 19h8v8"/><rect x="19" y="38" width="6" height="10" rx="1"/><rect x="29" y="32" width="6" height="16" rx="1"/><rect x="39" y="27" width="6" height="21" rx="1"/></svg>`,
  'tahsili-physics': `<svg viewBox="0 0 64 64" role="img" aria-label="فيزياء"><circle cx="32" cy="32" r="4"/><ellipse cx="32" cy="32" rx="24" ry="10"/><ellipse cx="32" cy="32" rx="24" ry="10" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="24" ry="10" transform="rotate(120 32 32)"/><circle cx="52" cy="32" r="2.5"/><circle cx="20" cy="13" r="2.5"/><circle cx="21" cy="50" r="2.5"/></svg>`,
  'tahsili-chemistry': `<svg viewBox="0 0 64 64" role="img" aria-label="كيمياء"><path d="M18 10h12M21 10v15L12 46a6 6 0 0 0 5 8h17a6 6 0 0 0 5-8l-9-21V10"/><path d="M16 43h19M20 37h12"/><circle cx="47" cy="18" r="3"/><circle cx="54" cy="26" r="3"/><circle cx="45" cy="31" r="3"/><path d="M49 20l3 4M51 28l-4 2"/></svg>`,
  'tahsili-biology': `<svg viewBox="0 0 64 64" role="img" aria-label="أحياء"><path d="M22 10c18 8 18 36 0 44M42 10c-18 8-18 36 0 44"/><path d="M23 17h18M19 25h26M19 39h26M23 47h18"/><path d="M44 13c7-2 10 2 8 9-7 1-11-2-8-9ZM12 37c8-1 12 3 10 11-8 1-12-3-10-11Z"/></svg>`,
  'qudurat-verbal': `<svg viewBox="0 0 64 64" role="img" aria-label="قدرات لفظية"><path d="M10 16c8-3 15-2 22 3v31c-7-5-14-6-22-3V16Z"/><path d="M54 16c-8-3-15-2-22 3v31c7-5 14-6 22-3V16Z"/><path d="M16 25c4-1 8 0 12 2M16 33c4-1 8 0 12 2M48 25c-4-1-8 0-12 2M48 33c-4-1-8 0-12 2"/><path d="M43 13l7-5-3 8"/></svg>`,
  'qudurat-quant': `<svg viewBox="0 0 64 64" role="img" aria-label="قدرات كمية"><path d="M12 12h18l-10 10 10 10H12"/><path d="M39 13h13M45 13v13M37 27l8-14"/><path d="M11 48l8-13 8 13H11Z"/><circle cx="42" cy="43" r="8"/><path d="M42 35v8l6 4"/></svg>`
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
