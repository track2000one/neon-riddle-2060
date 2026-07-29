(() => {
  'use strict';

  const font = 'Tahoma,Segoe UI,Arial,DejaVu Sans,sans-serif';
  const ink = '#25323d';
  const muted = '#68747d';
  const cyan = '#61d8f6';
  const violet = '#9271ff';
  const orange = '#f29b4b';
  const green = '#78c87c';
  const grid = '#d9e0e6';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[char]));

  const text = (x, y, value, size=24, weight=700, fill=ink, anchor='middle') =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" direction="rtl" unicode-bidi="plaintext">${esc(value)}</text>`;

  const frame = (body, title='') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560" role="img" aria-label="${esc(title)}"><rect width="960" height="560" rx="28" fill="#fff"/>${body}</svg>`;

  function straightFourAngles() {
    const cx = 480, cy = 430, radius = 300;
    let body = text(480, 52, 'زاوية مستقيمة مقسمة إلى أربعة أجزاء', 30, 900);
    body += `<line x1="120" y1="${cy}" x2="840" y2="${cy}" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>`;
    [38, 86, 137].forEach(degree => {
      const angle = Math.PI - degree * Math.PI / 180;
      body += `<line x1="${cx}" y1="${cy}" x2="${cx + radius*Math.cos(angle)}" y2="${cy - radius*Math.sin(angle)}" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>`;
    });
    const labels = [
      { degree:19, value:'س', color:cyan },
      { degree:62, value:'ص', color:violet },
      { degree:111, value:'س', color:cyan },
      { degree:158, value:'ص', color:violet }
    ];
    labels.forEach(item => {
      const angle = Math.PI - item.degree * Math.PI / 180;
      body += text(cx + 180*Math.cos(angle), cy - 180*Math.sin(angle) + 7, item.value, 31, 900, item.color);
    });
    body += text(480, 515, 'مجموع الزوايا على الخط المستقيم = 180°', 21, 800, muted);
    return frame(body, 'زاوية مستقيمة مقسمة إلى س وص وس وص');
  }

  function scoreTable() {
    const scores = ['4','5','6','7','8','9','10'];
    const counts = ['1','3','6','3','4','2','1'];
    const left = 80, top = 135, width = 800, cell = width / scores.length, rowHeight = 112;
    let body = text(480, 55, 'درجات الطلاب وتكراراتها', 30, 900);
    body += `<rect x="${left}" y="${top-58}" width="${width}" height="48" rx="10" fill="#eef4f8"/>`;
    body += text(480, top-25, 'إجمالي الطلاب: 20', 20, 800, muted);
    scores.forEach((score, index) => {
      const x = left + index * cell;
      body += `<rect x="${x}" y="${top}" width="${cell}" height="${rowHeight}" fill="${index <= 2 ? '#e8f8ee' : '#f7fafc'}" stroke="${grid}" stroke-width="3"/>`;
      body += `<rect x="${x}" y="${top+rowHeight}" width="${cell}" height="${rowHeight}" fill="${index <= 2 ? '#d7f1df' : '#edf2f5'}" stroke="${grid}" stroke-width="3"/>`;
      body += text(x+cell/2, top+68, score, 27, 900, ink);
      body += text(x+cell/2, top+rowHeight+68, counts[index], 27, 900, index <= 2 ? green : ink);
    });
    body += text(40, top+68, 'الدرجة', 21, 800, ink, 'start');
    body += text(40, top+rowHeight+68, 'عدد الطلاب', 21, 800, ink, 'start');
    body += text(480, 505, 'الخانات الخضراء تمثل الدرجات 6 فأقل', 21, 800, green);
    return frame(body, 'جدول درجات الطلاب من أربعة إلى عشرة');
  }

  function adjacentRectangles() {
    let body = text(480, 52, 'إيجاد طول أ هـ', 30, 900);
    body += `<rect x="190" y="150" width="580" height="280" fill="#f8fbfd" stroke="${ink}" stroke-width="7"/>`;
    body += `<line x1="445" y1="150" x2="445" y2="430" stroke="${ink}" stroke-width="7"/>`;
    body += `<line x1="445" y1="126" x2="770" y2="126" stroke="${orange}" stroke-width="5" marker-start="url(#arrowLeft)" marker-end="url(#arrowRight)"/>`;
    body += `<defs><marker id="arrowLeft" markerWidth="10" markerHeight="10" refX="3" refY="3" orient="auto"><path d="M6,0 L0,3 L6,6" fill="${orange}"/></marker><marker id="arrowRight" markerWidth="10" markerHeight="10" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="${orange}"/></marker></defs>`;
    body += text(190, 135, 'هـ', 27, 900, ink);
    body += text(445, 135, 'و', 27, 900, ink);
    body += text(770, 135, 'أ', 27, 900, ink);
    body += text(607, 108, 'أ و = 8', 23, 900, orange);
    body += text(317, 315, 'و هـ', 27, 900, violet);
    body += text(607, 315, 'أ و', 27, 900, cyan);
    body += text(480, 500, 'أ و = 2 × و هـ', 22, 800, muted);
    return frame(body, 'مستطيلان متجاوران وطول أ و يساوي ثمانية');
  }

  function halfGrid() {
    const cols = 8, rows = 2, cell = 82, left = 152, top = 165;
    let body = text(480, 55, 'نسبة الجزء المظلل إلى الشكل', 30, 900);
    for (let row=0; row<rows; row++) {
      for (let col=0; col<cols; col++) {
        const index = row*cols + col;
        body += `<rect x="${left+col*cell}" y="${top+row*cell}" width="${cell}" height="${cell}" fill="${index < 8 ? violet : '#fff'}" stroke="${ink}" stroke-width="4"/>`;
      }
    }
    body += text(480, 390, '8 مربعات مظللة من أصل 16', 24, 900, violet);
    body += text(480, 450, 'نسبة المظلل = 8/16 = 1/2', 23, 800, muted);
    body += text(480, 500, 'نصف هذه النسبة = 1/4', 23, 900, green);
    return frame(body, 'شبكة من ستة عشر مربعًا نصفها مظلل');
  }

  function verticalAngles() {
    const cx = 480, cy = 300;
    let body = text(480, 52, 'زاويتان متقابلتان بالرأس', 30, 900);
    body += `<line x1="180" y1="95" x2="780" y2="505" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>`;
    body += `<line x1="780" y1="95" x2="180" y2="505" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>`;
    body += `<path d="M405 250 A92 92 0 0 1 555 250" fill="none" stroke="${cyan}" stroke-width="8"/>`;
    body += `<path d="M555 350 A92 92 0 0 1 405 350" fill="none" stroke="${violet}" stroke-width="8"/>`;
    body += text(cx, 190, '2س + 80°', 27, 900, cyan);
    body += text(cx, 435, 'س + 100°', 27, 900, violet);
    body += text(480, 525, 'الزاويتان المتقابلتان بالرأس متساويتان', 21, 800, muted);
    return frame(body, 'خطان متقاطعان وزاويتان متقابلتان بالرأس');
  }

  const additions = {
    'video-comp-v-004': straightFourAngles(),
    'video-comp-v-006': scoreTable(),
    'video-comp-v-012': adjacentRectangles(),
    'video-comp-v-013': halfGrid(),
    'video-comp-v-019': verticalAngles()
  };

  window.NEON_EXAM_VISUALS = Object.freeze({ ...(window.NEON_EXAM_VISUALS || {}), ...additions });
})();
