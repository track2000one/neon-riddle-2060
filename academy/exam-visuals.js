(() => {
  'use strict';

  const W = 920;
  const H = 520;
  const green = '#78b94b';
  const orange = '#d77a35';
  const dark = '#263238';
  const blue = '#3f6f96';
  const grid = '#d8dde3';
  const muted = '#5b6670';

  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const text = (x,y,value,size=24,anchor='middle',weight=500,fill=dark) => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Tahoma,Segoe UI,Arial,DejaVu Sans,sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" direction="rtl" unicode-bidi="plaintext">${esc(value)}</text>`;
  const frame = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true"><rect width="${W}" height="${H}" rx="28" fill="#fff"/>${body}</svg>`;
  const gridLines = (left,top,width,height,max,steps=5) => {
    let out='';
    for(let i=0;i<=steps;i++){
      const y=top+height-(height*i/steps);
      out += `<line x1="${left}" y1="${y}" x2="${left+width}" y2="${y}" stroke="${grid}" stroke-width="2"/>`;
      out += text(left-18,y+8,Math.round(max*i/steps),18,'end',500,muted);
    }
    return out;
  };

  function bars(labels, values, max, options={}){
    const left=95, top=48, width=760, height=365;
    const gap=32;
    const bw=(width-gap*(labels.length+1))/labels.length;
    let out=gridLines(left,top,width,height,max,options.steps||5);
    out += `<line x1="${left}" y1="${top+height}" x2="${left+width}" y2="${top+height}" stroke="${dark}" stroke-width="3"/>`;
    labels.forEach((label,i)=>{
      const x=left+gap+i*(bw+gap);
      const h=height*(values[i]/max);
      const y=top+height-h;
      out += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="8" fill="${options.colors?.[i]||options.color||green}"/>`;
      out += text(x+bw/2,y-12,values[i],20,'middle',700,dark);
      out += text(x+bw/2,top+height+42,label,20,'middle',600,dark);
    });
    return frame(out);
  }

  function groupedBars(labels, series, max){
    const left=90, top=62, width=770, height=335;
    const groupGap=34;
    const groupW=(width-groupGap*(labels.length+1))/labels.length;
    const innerGap=8;
    const bw=(groupW-innerGap*(series.length-1))/series.length;
    let out=gridLines(left,top,width,height,max,5);
    out += `<line x1="${left}" y1="${top+height}" x2="${left+width}" y2="${top+height}" stroke="${dark}" stroke-width="3"/>`;
    labels.forEach((label,i)=>{
      const gx=left+groupGap+i*(groupW+groupGap);
      series.forEach((s,j)=>{
        const value=s.values[i];
        const h=height*(value/max);
        const x=gx+j*(bw+innerGap);
        const y=top+height-h;
        out += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="6" fill="${s.color}"/>`;
      });
      out += text(gx+groupW/2,top+height+42,label,18,'middle',600,dark);
    });
    const legendY=28;
    series.forEach((s,i)=>{
      const x=150+i*220;
      out += `<rect x="${x}" y="${legendY-16}" width="24" height="16" rx="3" fill="${s.color}"/>`;
      out += text(x+34,legendY,s.name,18,'start',600,dark);
    });
    return frame(out);
  }

  function lineChart(labels, values, max, options={}){
    const left=90, top=48, width=770, height=355;
    let out=gridLines(left,top,width,height,max,options.steps||5);
    out += `<line x1="${left}" y1="${top+height}" x2="${left+width}" y2="${top+height}" stroke="${dark}" stroke-width="3"/>`;
    const pts=values.map((v,i)=>{
      const x=left+(width*i/(values.length-1));
      const y=top+height-height*(v/max);
      return [x,y];
    });
    out += `<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${options.color||orange}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
    pts.forEach(([x,y],i)=>{
      out += `<circle cx="${x}" cy="${y}" r="8" fill="${options.color||orange}" stroke="#fff" stroke-width="3"/>`;
      if(options.showValues) out += text(x,y-16,values[i],18,'middle',700,dark);
      if(labels[i]) out += text(x,top+height+40,labels[i],17,'middle',600,dark);
    });
    return frame(out);
  }

  function pie(parts, labels, colors){
    const cx=460, cy=250, r=175;
    let angle=-90;
    let out='';
    parts.forEach((part,i)=>{
      const start=angle;
      const end=angle+part*3.6;
      const large=part>50?1:0;
      const p1=[cx+r*Math.cos(start*Math.PI/180),cy+r*Math.sin(start*Math.PI/180)];
      const p2=[cx+r*Math.cos(end*Math.PI/180),cy+r*Math.sin(end*Math.PI/180)];
      out += `<path d="M ${cx} ${cy} L ${p1[0]} ${p1[1]} A ${r} ${r} 0 ${large} 1 ${p2[0]} ${p2[1]} Z" fill="${colors[i]}" stroke="#fff" stroke-width="5"/>`;
      const mid=(start+end)/2;
      const tx=cx+r*.62*Math.cos(mid*Math.PI/180);
      const ty=cy+r*.62*Math.sin(mid*Math.PI/180);
      out += text(tx,ty-3,labels[i],20,'middle',700,'#fff');
      out += text(tx,ty+25,`${part}%`,18,'middle',700,'#fff');
      angle=end;
    });
    return frame(out);
  }

  const visuals = {
    'visual-ages-table': frame(`
      ${text(460,55,'أعمار الطلاب وعددهم',28,'middle',800,dark)}
      <rect x="245" y="95" width="430" height="300" rx="14" fill="#fff" stroke="${dark}" stroke-width="3"/>
      <rect x="245" y="95" width="430" height="70" rx="14" fill="${dark}"/>
      <line x1="460" y1="95" x2="460" y2="395" stroke="${dark}" stroke-width="3"/>
      <line x1="245" y1="165" x2="675" y2="165" stroke="${dark}" stroke-width="3"/>
      <line x1="245" y1="242" x2="675" y2="242" stroke="${grid}" stroke-width="3"/>
      <line x1="245" y1="319" x2="675" y2="319" stroke="${grid}" stroke-width="3"/>
      ${text(355,140,'عمر الطالب',24,'middle',800,'#fff')}${text(570,140,'عدد الطلاب',24,'middle',800,'#fff')}
      ${text(355,215,'13 سنة',27,'middle',700,dark)}${text(570,215,'16',27,'middle',700,dark)}
      ${text(355,292,'14 سنة',27,'middle',700,dark)}${text(570,292,'24',27,'middle',700,dark)}
      ${text(355,369,'15 سنة',27,'middle',700,dark)}${text(570,369,'10',27,'middle',700,dark)}
    `),
    'visual-average-bars': bars(['الأولى','الثانية','الثالثة'],[50,40,30],60,{colors:[orange,green,orange]}),
    'visual-centers-years': bars(['1996','1997','1998','1999'],[80,90,100,100],110,{color:orange}),
    'visual-height-students': bars(['130 سم','140 سم','150 سم','160 سم'],[10,20,35,30],40,{color:green}),
    'visual-three-year-trend': bars(['1432','1433','1434'],[375,365,356],400,{color:green,steps:4}),
    'visual-region-population': groupedBars(['الشرقية','الجنوبية','الغربية','الشمالية'],[
      {name:'2020',color:green,values:[60,60,40,50]},
      {name:'2021',color:orange,values:[50,60,50,50]}
    ],70),
    'visual-sports-preference': groupedBars(['كرة التنس','كرة القدم','كرة السلة','الكرة الطائرة'],[
      {name:'الأول الثانوي',color:'#a64b3c',values:[30,55,30,25]},
      {name:'الثاني الثانوي',color:green,values:[20,60,80,40]},
      {name:'الثالث الثانوي',color:orange,values:[15,45,50,100]}
    ],110),
    'visual-plant-growth': lineChart(['1','2','3','4','5','6','7','8','9','10'],[1,2,4,5,6,7,8,9,8,8],10,{color:green,showValues:false,steps:5}),
    'visual-quarter-range': lineChart(['1','2','3','4','5','6','7','8','9','10','11','12','13'],[60,45,40,55,45,35,60,35,30,20,35,45,60],70,{color:'#b34f3d',showValues:false,steps:7}),
    'visual-age-population': bars(['1-5','6-10','11-15','16-20','21-25','26-30'],[10,14,8,12,20,16],22,{color:green,steps:5}),
    'visual-exam-outcomes': pie([50,40,10],['ناجحون','راسبون','غائبون'],[dark,orange,green]),
    'visual-unknown-sector': pie([50,30,20],['ناجحون','راسبون','س'],[dark,orange,green]),
    'visual-grades-pie': pie([25,10,50,15],['ممتاز','جيد','راسب','جيد جدًا'],[blue,orange,'#d2a62c','#5d6fb4']),
    'visual-hospital-patients': pie([25,12.5,62.5],['رجال 38','نساء 19','أطفال'],[dark,green,orange]),
    'visual-school-stages': pie([20,27,24,19,10],['الروضة','الابتدائي','المتوسطة','الثانوي','الجامعية'],[green,orange,blue,'#738f4b','#404b56'])
  };

  window.NEON_EXAM_VISUALS = Object.freeze(visuals);
})();
