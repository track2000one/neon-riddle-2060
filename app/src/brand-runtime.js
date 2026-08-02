const BRAND_AR = 'مسار نيون';
const BRAND_EN = 'MASAR NEON';

const exactTextReplacements = new Map([
  ['NEON ACADEMY 2060', BRAND_EN],
  ['NEON Academy 2060', BRAND_EN],
  ['NEON ACADEMY', BRAND_EN],
  ['NEON Academy', BRAND_EN],
  ['NEON RIDDLE 2060', BRAND_EN],
  ['ACADEMY 2060', BRAND_EN],
  ['ACADEMY', BRAND_EN],
  ['LEARN • PLAY • BUILD', `${BRAND_EN} • LEARN • PLAY • BUILD`],
  ['NEON • LEARN • PLAY • BUILD', `${BRAND_EN} • LEARN • PLAY • BUILD`],
  ['الغرفة 2060', `غرفة ${BRAND_AR}`],
  ['غرفة NEON', `غرفة ${BRAND_AR}`],
  ['بطولة 2060', `بطولة ${BRAND_AR}`],
  ['بطولة NEON', `بطولة ${BRAND_AR}`],
  ['جارٍ تجهيز NEON…', `جارٍ تجهيز ${BRAND_AR}…`],
  ['جارٍ تجهيز NEON...', `جارٍ تجهيز ${BRAND_AR}...`]
]);

function replaceStandaloneNeon(value) {
  const hasArabic = /[\u0600-\u06ff]/.test(value);
  const replacement = hasArabic ? BRAND_AR : BRAND_EN;
  return value.replace(/\bNEON\b/g, (match, offset, source) => {
    const prefix = source.slice(Math.max(0, offset - 6), offset).toUpperCase();
    return prefix === 'MASAR ' ? match : replacement;
  });
}

function replaceBrandValue(input) {
  let value = String(input ?? '');
  for (const [from, to] of exactTextReplacements) {
    if (value === from) return to;
    value = value.replaceAll(from, to);
  }
  return replaceStandaloneNeon(value);
}

function replaceBrandText(root = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const value = replaceBrandValue(node.nodeValue || '');
    if (value !== node.nodeValue) node.nodeValue = value;
  });
}

function replaceBrandAttributes(root = document) {
  const elements = [];
  if (root instanceof Element) elements.push(root);
  if (root?.querySelectorAll) elements.push(...root.querySelectorAll('[aria-label],[title],[alt],[content],[placeholder]'));

  elements.forEach(element => {
    ['aria-label', 'title', 'alt', 'content', 'placeholder'].forEach(attribute => {
      if (!element.hasAttribute?.(attribute)) return;
      const current = element.getAttribute(attribute) || '';
      const next = replaceBrandValue(current);
      if (next !== current) element.setAttribute(attribute, next);
    });
  });
}

function applyBrand(root = document) {
  document.title = replaceBrandValue(document.title)
    .replace(/^MASAR NEON\s*[|—-]\s*/i, `${BRAND_AR} | `)
    .replace(/^NEON\s*[|—-]\s*/i, `${BRAND_AR} | `);

  replaceBrandText(root === document ? document.body : root);
  replaceBrandAttributes(root);

  document.documentElement.dataset.brand = 'masar-neon';
  document.documentElement.style.setProperty('--brand-name-ar', `'${BRAND_AR}'`);
  document.documentElement.style.setProperty('--brand-name-en', `'${BRAND_EN}'`);
}

applyBrand();
new MutationObserver(records => {
  records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = replaceBrandValue(node.nodeValue || '');
      if (value !== node.nodeValue) node.nodeValue = value;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      applyBrand(node);
    }
  }));
}).observe(document.documentElement, { childList: true, subtree: true });
