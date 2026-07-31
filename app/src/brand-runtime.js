const textReplacements = new Map([
  ['NEON ACADEMY 2060', 'NEON'],
  ['NEON Academy 2060', 'NEON'],
  ['ACADEMY 2060', 'LEARN • PLAY • BUILD'],
  ['الغرفة 2060', 'غرفة NEON'],
  ['بطولة 2060', 'بطولة NEON']
]);

function replaceBrandText(root = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    let value = node.nodeValue || '';
    for (const [from, to] of textReplacements) value = value.replaceAll(from, to);
    if (value !== node.nodeValue) node.nodeValue = value;
  });
}

function applyBrand() {
  document.title = document.title
    .replaceAll('NEON Academy 2060', 'NEON')
    .replaceAll('NEON ACADEMY 2060', 'NEON');
  replaceBrandText();
}

applyBrand();
new MutationObserver(records => {
  records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      let value = node.nodeValue || '';
      for (const [from, to] of textReplacements) value = value.replaceAll(from, to);
      if (value !== node.nodeValue) node.nodeValue = value;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      replaceBrandText(node);
    }
  }));
}).observe(document.documentElement, { childList: true, subtree: true });
