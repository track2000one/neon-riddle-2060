(() => {
  'use strict';

  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const font = 'Tahoma,Segoe UI,Arial,DejaVu Sans,sans-serif';
  const dark = '#263238';
  const green = '#78b94b';
  const orange = '#d77a35';
  const grid = '#d8dde3';

  const t = (x,y,value,size=26,weight=600,fill=dark,anchor='middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" direction="rtl" unicode-bidi="plaintext">${esc(value)}</text>`;
  const frame = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 520" role="img" aria-hidden="true"><rect width="920" height="520" rx="28" fill="#fff"/>${body}</svg>`;

  const numberCards = values => {
    const cardW = 118;
    const gap = 24;
    const total = values.length * cardW + (values.length - 1) * gap;
    const start = (920 - total) / 2;
    let body = t(460,82,'القيم المعطاة',30,800);
    values.forEach((value,index) => {
      const x = start + index * (cardW + gap);
      body += `<rect x="${x}" y="150" width="${cardW}" height="150" rx="22" fill="${index % 2 ? '#f6f9fb' : '#eef5e9'}" stroke="${index % 2 ? orange : green}" stroke-width="4"/>`;
      body += t(x + cardW / 2,245,value,42,900);
    });
    return frame(body);
  };

  const rangeGrid = (() => {
    const rows = [
      [2,4,3,2,1],
      [3,5,1,4,2],
      [2,5,3,1,5],
      [1,1,3,4,3]
    ];
    const left = 135, top = 95, cw = 130, ch = 78;
    let body = t(460,58,'مجموعة القيم الحالية',29,800);
    rows.forEach((row,r) => row.forEach((value,c) => {
      const x = left + c*cw, y = top + r*ch;
      body += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${(r+c)%2 ? '#f7fafc' : '#eef5e9'}" stroke="${dark}" stroke-width="2"/>`;
      body += t(x+cw/2,y+51,value,30,800);
    }));
    body += t(460,455,'أصغر قيمة = 1   •   أكبر قيمة = 5',24,700,'#5b6670');
    return frame(body);
  })();

  const gradeTable = (() => {
    const grades = [10,9,8,7,6,4,3];
    const counts = [2,3,4,1,5,3,2];
    const left = 95, top = 120, cw = 95, ch = 105;
    let body = t(460,62,'درجات الطلاب وعددهم',30,800);
    body += `<rect x="${left}" y="${top}" width="150" height="${ch}" rx="10" fill="${dark}"/>${t(left+75,top+64,'الدرجة',24,800,'#fff')}`;
    body += `<rect x="${left}" y="${top+ch}" width="150" height="${ch}" rx="10" fill="${dark}"/>${t(left+75,top+ch+64,'عدد الطلاب',22,800,'#fff')}`;
    grades.forEach((value,index) => {
      const x = left+150+index*cw;
      body += `<rect x="${x}" y="${top}" width="${cw}" height="${ch}" fill="${index%2 ? '#fff8ef' : '#eef5e9'}" stroke="${dark}" stroke-width="2"/>`;
      body += `<rect x="${x}" y="${top+ch}" width="${cw}" height="${ch}" fill="#fff" stroke="${dark}" stroke-width="2"/>`;
      body += t(x+cw/2,top+66,value,28,900);
      body += t(x+cw/2,top+ch+66,counts[index],28,900);
    });
    body += t(460,430,'إجمالي الطلاب = 20',24,700,'#5b6670');
    return frame(body);
  })();

  const pictograph = (() => {
    const rows = [
      {label:'3 حروف',count:1},
      {label:'4 حروف',count:2},
      {label:'5 حروف',count:4},
      {label:'6 حروف',count:2},
      {label:'7 حروف',count:1}
    ];
    let body = t(460,55,'عدد الطلاب بحسب حروف أسمائهم',29,800);
    const top=100, rowH=66;
    rows.forEach((row,index) => {
      const y=top+index*rowH;
      body += `<rect x="150" y="${y}" width="620" height="${rowH}" fill="${index%2 ? '#f8fafb' : '#eef5e9'}" stroke="${grid}" stroke-width="2"/>`;
      body += t(690,y+43,row.label,24,800,dark,'end');
      for(let i=0;i<row.count;i++) body += t(240+i*88,y+45,'☺',34,800,dark);
    });
    body += `<rect x="280" y="448" width="360" height="46" rx="14" fill="${green}"/>${t(460,479,'كل وجه = 5 طلاب',22,900,'#fff')}`;
    return frame(body);
  })();

  const additions = {
    'visual-median-values-06': numberCards([10,5,7,9,5]),
    'visual-range-values-06': numberCards([3,8,5,13,8]),
    'visual-range-grid-06': rangeGrid,
    'visual-grade-frequency-06': gradeTable,
    'visual-pictograph-names-06': pictograph
  };

  window.NEON_EXAM_VISUALS = Object.freeze({ ...(window.NEON_EXAM_VISUALS || {}), ...additions });
})();
