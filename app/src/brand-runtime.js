const BRAND_AR = 'مسار نيون';
const BRAND_EN = 'MASAR NEON';

const exactTextReplacements = new Map([
  ['NEON', BRAND_AR],
  ['NEON • LEARN • PLAY • BUILD', `${BRAND_EN} • LEARN • PLAY • BUILD`],
  ['LEARN • PLAY • BUILD', 'LEARN • PLAY • BUILD'],
  ['ACADEMY 2060', BRAND_EN],
  ['الغرفة 2060', `غرفة ${BRAND_AR}`],
  ['غرفة NEON', `غرفة ${BRAND_AR}`],
  ['بطولة 2060', `بطولة ${BRAND_AR}`],
  ['بطولة NEON', `بطولة ${BRAND_AR}`],
  ['جارٍ تجهيز NEON…', `جارٍ تجهيز ${BRAND_AR}…`],
  ['جارٍ تجهيز NEON...', `جارٍ تجهيز ${BRAND_AR}...`]
]);

const phraseReplacements = new Map([
  ['NEON ACADEMY 2060', BRAND_EN],
  ['NEON Academy 2060', BRAND_EN],
  ['NEON ACADEMY', BRAND_EN],
  ['NEON Academy', BRAND_EN],
  ['NEON RIDDLE 2060', BRAND_EN]
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
  if (exactTextReplacements.has(value)) return exactTextReplacements.get(value);
  for (const [from, to] of phraseReplacements) value = value.replaceAll(from, to);
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

function replaceCompactMarks(root = document) {
  const marks = [];
  if (root instanceof Element && root.matches('.brand-mark,.center-brand-mark')) marks.push(root);
  if (root?.querySelectorAll) marks.push(...root.querySelectorAll('.brand-mark,.center-brand-mark'));
  marks.forEach(mark => {
    if (mark.textContent?.trim() === 'N') {
      mark.textContent = 'MN';
      mark.setAttribute('aria-label', BRAND_EN);
    }
  });
}

function applyBrand(root = document) {
  document.title = replaceBrandValue(document.title);
  replaceBrandText(root === document ? document.body : root);
  replaceBrandAttributes(root);
  replaceCompactMarks(root);
  document.documentElement.dataset.brand = 'masar-neon';
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
