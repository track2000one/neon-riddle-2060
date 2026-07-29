(() => {
  'use strict';

  const font = 'Tahoma,Segoe UI,Arial,DejaVu Sans,sans-serif';
  const ink = '#24323d';
  const muted = '#68747d';
  const green = '#78b84b';
  const orange = '#d87632';
  const blue = '#3f78a8';
  const purple = '#7b62a3';
  const grid = '#d8dfe4';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[ch]));

  const t = (x,y,value,size=22,weight=700,fill=ink,anchor='middle') =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" direction="rtl" unicode-bidi="plaintext">${esc(value)}</text>`;

  const frame = (body,title='') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560" role="img" aria-label="${esc(title)}"><rect width="960" height="560" rx="28" fill="#fff"/>${body}</svg>`;

  function comparisonTriangles() {
    let body = t(480,50,'مقارنة المساحات',30,900);
    body += '<line x1="160" y1="125" x2="810" y2="125" stroke="#111" stroke-width="5"/>';
    body += '<line x1="160" y1="420" x2="810" y2="420" stroke="#111" stroke-width="5"/>';
    body += '<line x1="270" y1="125" x2="270" y2="420" stroke="#111" stroke-width="6"/>';
    body += '<line x1="270" y1="125" x2="500" y2="420" stroke="#111" stroke-width="6"/>';
    body += '<line x1="500" y1="420" x2="690" y2="125" stroke="#111" stroke-width="6"/>';
    body += '<line x1="690" y1="125" x2="640" y2="420" stroke="#111" stroke-width="6"/>';
    body += '<path d="M270 125 L500 420 L690 125 Z" fill="#9ca5aa" opacity=".76"/>';
    body += '<path d="M270 420 h42 v-42" fill="none" stroke="#111" stroke-width="4"/>';
    body += t(682,398,'80°',22,800,orange,'start');
    body += t(480,500,'المثلث الأوسط مظلل، والمثلثان الجانبيان غير مظللين',21,700,muted);
    return frame(body,'مثلث مظلل بين مثلثين غير مظللين على مستقيمين متوازيين');
  }

  function houseDiagonal() {
    let body = t(480,50,'المربع والمثلث العلوي',30,900);
    body += '<rect x="300" y="220" width="300" height="260" fill="#f8fbfd" stroke="#111" stroke-width="6"/>';
    body += '<path d="M300 220 L450 130 L600 220 Z" fill="#eef4f7" stroke="#111" stroke-width="6"/>';
    body += '<line x1="300" y1="480" x2="450" y2="130" stroke="#d33" stroke-width="8"/>';
    body += t(450,350,'مساحة المربع = 100 سم²',22,800,blue);
    body += t(450,190,'مساحة المثلث = 10 سم²',20,800,green);
    body += t(330,455,'الخط المطلوب',19,800,'#b32929','start');
    return frame(body,'مربع وفوقه مثلث متساوي الساقين وخط من الزاوية السفلية إلى الرأس');
  }

  function rightIsosceles() {
    let body=t(480,50,'مثلث قائم متساوي الساقين',30,900);
    body+='<path d="M250 420 L500 140 L500 420 Z" fill="#f8fbfd" stroke="#111" stroke-width="7"/>';
    body+='<path d="M466 420 v-34 h34" fill="none" stroke="#111" stroke-width="5"/>';
    body+='<line x1="365" y1="406" x2="385" y2="434" stroke="'+blue+'" stroke-width="5"/>';
    body+='<line x1="485" y1="290" x2="515" y2="290" stroke="'+blue+'" stroke-width="5"/>';
    body+=t(340,255,'√72',28,900,orange);
    body+=t(238,447,'ج',24,900); body+=t(515,447,'ب',24,900); body+=t(510,130,'أ',24,900);
    body+=t(480,505,'أب = بج، والزاوية عند ب قائمة',21,700,muted);
    return frame(body,'مثلث قائم متساوي الساقين وتره جذر 72');
  }

  function squareSemicircle() {
    let body=t(480,50,'مربع ونصف دائرة',30,900);
    body+='<rect x="280" y="120" width="400" height="400" fill="#fff" stroke="#111" stroke-width="6"/>';
    body+='<path d="M280 520 A200 200 0 0 1 680 520 Z" fill="'+blue+'" opacity=".92"/>';
    body+=t(480,105,'4 سم',22,800,green);
    body+=t(480,485,'الجزء المظلل نصف دائرة',22,800,'#fff');
    return frame(body,'مربع طول ضلعه أربعة سنتيمترات وفيه نصف دائرة مظللة');
  }

  function consumptionDots() {
    const days=['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'];
    const first=[12,10,10,20,15,15];
    const second=[5,3,4,5,7,3];
    const left=120,top=95,w=720,h=350,max=25;
    let body=t(480,50,'الاستهلاك اليومي لفئتين',30,900);
    for(let i=0;i<=5;i++){
      const y=top+h-i*h/5;
      body+=`<line x1="${left}" y1="${y}" x2="${left+w}" y2="${y}" stroke="${grid}" stroke-width="2"/>${t(left-15,y+6,i*5,16,600,muted,'end')}`;
    }
    days.forEach((day,i)=>{
      const x=left+40+i*(w-80)/(days.length-1);
      body+=`<circle cx="${x}" cy="${top+h-first[i]/max*h}" r="10" fill="${orange}"/><circle cx="${x}" cy="${top+h-second[i]/max*h}" r="10" fill="${blue}"/>${t(x,top+h+36,day,16,700)}`;
    });
    body+=`<circle cx="720" cy="505" r="9" fill="${orange}"/>${t(695,512,'الفئة الأولى',17,700,ink,'end')}<circle cx="440" cy="505" r="9" fill="${blue}"/>${t(415,512,'الفئة الثانية',17,700,ink,'end')}`;
    return frame(body,'مخطط نقاط لفئتين خلال أيام الأسبوع');
  }

  function triangleAngles() {
    let body=t(480,50,'زوايا المثلث الداخلية والخارجية',30,900);
    body+='<path d="M310 425 L485 135 L680 425" fill="none" stroke="#111" stroke-width="7"/>';
    body+='<line x1="225" y1="425" x2="760" y2="425" stroke="#111" stroke-width="6"/>';
    body+='<line x1="485" y1="135" x2="570" y2="25" stroke="#111" stroke-width="6"/>';
    body+=t(486,195,'س',25,900,blue); body+=t(350,405,'ع',25,900,blue); body+=t(640,405,'ص',25,900,blue);
    body+=t(555,70,'أ',25,900,orange); body+=t(710,410,'ب',25,900,orange); body+=t(270,410,'ج',25,900,orange);
    body+=t(480,505,'الخارجية عند كل رأس مكملة للداخلية',20,700,muted);
    return frame(body,'مثلث موضح عليه ثلاث زوايا داخلية وثلاث زوايا خارجية');
  }

  function exteriorSum() {
    let body=t(480,50,'زوايا خارجية عند رأسي مثلث',30,900);
    body+='<path d="M350 150 L480 430 L610 150" fill="none" stroke="#111" stroke-width="7"/>';
    body+='<line x1="305" y1="150" x2="655" y2="150" stroke="#111" stroke-width="6"/>';
    body+='<line x1="350" y1="150" x2="285" y2="30" stroke="#111" stroke-width="6"/>';
    body+='<line x1="610" y1="150" x2="675" y2="30" stroke="#111" stroke-width="6"/>';
    body+=t(480,405,'50°',25,900,orange); body+=t(330,135,'ص',28,900,blue); body+=t(630,135,'س',28,900,blue);
    return frame(body,'مثلث مقلوب زاوية رأسه خمسون درجة وزاويتان خارجيتان س وص');
  }

  function pieChart(items,title) {
    const cx=355,cy=305,r=185,total=items.reduce((s,i)=>s+i.value,0);
    let a=-Math.PI/2,body=t(480,50,title,30,900);
    items.forEach((item,index)=>{
      const b=a+item.value/total*Math.PI*2;
      const x1=cx+r*Math.cos(a),y1=cy+r*Math.sin(a),x2=cx+r*Math.cos(b),y2=cy+r*Math.sin(b),large=b-a>Math.PI?1:0;
      const color=item.color||[green,orange,blue,purple,'#e0ad3c'][index%5];
      body+=`<path d="M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${color}" stroke="#fff" stroke-width="5"/>`;
      const mid=(a+b)/2;
      body+=t(cx+r*.62*Math.cos(mid),cy+r*.62*Math.sin(mid)+7,item.display||item.value,18,900,index===4?ink:'#fff');
      a=b;
    });
    let y=185;
    items.forEach((item,index)=>{
      const color=item.color||[green,orange,blue,purple,'#e0ad3c'][index%5];
      body+=`<rect x="650" y="${y-18}" width="24" height="24" rx="5" fill="${color}"/>${t(695,y,item.label,18,700,ink,'start')}`; y+=52;
    });
    return frame(body,title);
  }

  function inflationTable() {
    const headers=['الجهة','2003','2004','2005','2006','2007'];
    const rows=[
      ['البحرين','0.7','2.4','2.8','2.9','2.9'],
      ['دول مجلس التعاون','1.6','2.4','2.6','2.8','2.9'],
      ['دول اليورو','2.2','2.3','2.1','2.3','2.5']
    ];
    const left=70,top=115,width=820,cw=width/headers.length,rh=82;
    let body=t(480,55,'معدل التضخم (%)',30,900);
    headers.forEach((h,i)=>{body+=`<rect x="${left+i*cw}" y="${top}" width="${cw}" height="${rh}" fill="${ink}" stroke="#fff" stroke-width="2"/>${t(left+i*cw+cw/2,top+52,h,18,800,'#fff')}`;});
    rows.forEach((row,r)=>row.forEach((v,i)=>{body+=`<rect x="${left+i*cw}" y="${top+(r+1)*rh}" width="${cw}" height="${rh}" fill="${r%2?'#f7fafb':'#eef5e9'}" stroke="${grid}" stroke-width="2"/>${t(left+i*cw+cw/2,top+(r+1)*rh+52,v,18,700)}`;}));
    return frame(body,'جدول معدلات التضخم للأعوام 2003 إلى 2007');
  }

  function midpointTriangle() {
    let body=t(480,50,'القطعة الواصلة بين منتصفي ضلعين',30,900);
    body+='<path d="M250 440 L480 95 L710 440 Z" fill="#fff" stroke="#111" stroke-width="7"/>';
    body+='<line x1="365" y1="268" x2="595" y2="268" stroke="'+blue+'" stroke-width="8"/>';
    body+='<line x1="352" y1="252" x2="378" y2="283" stroke="'+green+'" stroke-width="5"/><line x1="582" y1="252" x2="608" y2="283" stroke="'+green+'" stroke-width="5"/>';
    body+=t(480,475,'طول كل ضلع = 6 سم',22,800,orange); body+=t(350,245,'م',23,900); body+=t(610,245,'ن',23,900);
    return frame(body,'مثلث متطابق الأضلاع ونقطتا منتصف موصولتان');
  }

  function cutSquare() {
    let body=t(480,50,'مساحة الجزء المظلل',30,900);
    body+='<rect x="285" y="105" width="390" height="390" fill="#b9bfc3" stroke="#111" stroke-width="6"/>';
    body+='<path d="M480 105 L675 105 L675 251 Z" fill="#fff" stroke="#111" stroke-width="4"/>';
    body+='<line x1="480" y1="105" x2="675" y2="251" stroke="#111" stroke-width="5"/>';
    body+=t(382,90,'4 سم',22,800,green); body+=t(700,365,'5 سم من الأسفل',20,800,green,'start'); body+=t(255,315,'8 سم',22,800,green,'end');
    return frame(body,'مربع ضلعه ثمانية وفيه مثلث علوي أيمن غير مظلل');
  }

  function heightBars() {
    const labels=['130','140','150','160']; const vals=[15,25,35,30];
    const left=110,top=90,w=730,h=350,max=40,gw=w/4;
    let body=t(480,50,'عدد الطلاب عند كل طول',30,900);
    for(let i=0;i<=4;i++){const y=top+h-i*h/4;body+=`<line x1="${left}" y1="${y}" x2="${left+w}" y2="${y}" stroke="${grid}" stroke-width="2"/>${t(left-15,y+6,i*10,16,600,muted,'end')}`;}
    vals.forEach((v,i)=>{const bw=90,x=left+gw*i+(gw-bw)/2,hv=v/max*h,y=top+h-hv;body+=`<rect x="${x}" y="${y}" width="${bw}" height="${hv}" rx="7" fill="${blue}"/>${t(x+bw/2,y-10,v,18,800)}${t(x+bw/2,top+h+38,labels[i]+' سم',18,700)}`;});
    return frame(body,'أعمدة للأطوال مئة وثلاثين إلى مئة وستين سنتيمترًا');
  }

  function isoscelesExterior() {
    let body=t(480,50,'مثلث متساوي الساقين',30,900);
    body+='<path d="M275 420 L485 140 L660 420 Z" fill="none" stroke="#111" stroke-width="7"/>';
    body+='<line x1="660" y1="420" x2="720" y2="530" stroke="#111" stroke-width="7"/>';
    body+='<line x1="365" y1="273" x2="387" y2="290" stroke="'+green+'" stroke-width="5"/><line x1="570" y1="275" x2="592" y2="292" stroke="'+green+'" stroke-width="5"/>';
    body+=t(684,470,'50°',24,900,orange); body+=t(492,175,'س',26,900,blue);
    return frame(body,'مثلث متساوي الساقين مع زاوية خارجية خمسين درجة');
  }

  function coordinateRectangle() {
    let body=t(480,50,'مستطيل على المستوى الإحداثي',30,900);
    const ox=165,oy=465;
    body+=`<line x1="${ox}" y1="${oy}" x2="865" y2="${oy}" stroke="${ink}" stroke-width="5"/><line x1="${ox}" y1="515" x2="${ox}" y2="80" stroke="${ink}" stroke-width="5"/>`;
    body+='<rect x="410" y="165" width="360" height="300" fill="#f7fbfd" stroke="'+green+'" stroke-width="7"/>';
    body+='<line x1="410" y1="165" x2="770" y2="465" stroke="'+green+'" stroke-width="5"/><line x1="770" y1="165" x2="410" y2="465" stroke="'+green+'" stroke-width="5"/>';
    body+='<circle cx="590" cy="315" r="9" fill="'+orange+'"/>';
    body+=t(590,288,'(10،3)',24,900,orange); body+=t(795,155,'ب',26,900); body+=t(480,520,'المساحة = 48',22,800,blue);
    return frame(body,'مستطيل مركزه عشرة فاصلة ثلاثة ومساحته ثمانية وأربعون');
  }

  function parallelogramRectangle() {
    let body=t(480,50,'متوازي أضلاع ومستطيل داخلي',30,900);
    body+='<path d="M215 455 L370 120 L735 120 L580 455 Z" fill="#f7fbfd" stroke="#111" stroke-width="7"/>';
    body+='<rect x="370" y="120" width="210" height="335" fill="'+blue+'" opacity=".88" stroke="#111" stroke-width="5"/>';
    body+=t(552,102,'9 سم',22,800,green); body+=t(260,280,'10 سم',22,800,green); body+=t(480,505,'مساحة متوازي الأضلاع = 72 سم²',21,800,orange);
    return frame(body,'متوازي أضلاع قاعدته تسعة وضلع مائل عشرة وداخله مستطيل');
  }

  function hajjTable() {
    const headers=['العام','حجاج الداخل','حجاج الخارج'];
    const rows=[['1430','800,000','1,200,000'],['1431','700,000','1,100,000'],['1432','600,000','1,000,000'],['1433','700,000','1,000,000'],['1434','900,000','1,300,000']];
    const left=105,top=95,width=750,cw=250,rh=70;
    let body=t(480,50,'حجاج الداخل والخارج',30,900);
    headers.forEach((h,i)=>{body+=`<rect x="${left+i*cw}" y="${top}" width="${cw}" height="${rh}" fill="${blue}" stroke="#fff" stroke-width="2"/>${t(left+i*cw+cw/2,top+45,h,19,800,'#fff')}`;});
    rows.forEach((row,r)=>row.forEach((v,i)=>{body+=`<rect x="${left+i*cw}" y="${top+(r+1)*rh}" width="${cw}" height="${rh}" fill="${r%2?'#f8fafb':'#eef5e9'}" stroke="${grid}" stroke-width="2"/>${t(left+i*cw+cw/2,top+(r+1)*rh+45,v,18,700)}`;}));
    return frame(body,'جدول حجاج الداخل والخارج للأعوام 1430 إلى 1434');
  }

  function ellipseGrid() {
    const left=210,top=80,cell=55;
    let body=t(480,50,'المساحة المظللة على شبكة مربعات',30,900);
    for(let i=0;i<=6;i++){
      body+=`<line x1="${left+i*cell}" y1="${top}" x2="${left+i*cell}" y2="${top+6*cell}" stroke="${ink}" stroke-width="2"/><line x1="${left}" y1="${top+i*cell}" x2="${left+6*cell}" y2="${top+i*cell}" stroke="${ink}" stroke-width="2"/>`;
    }
    body+=`<ellipse cx="${left+4.1*cell}" cy="${top+3.4*cell}" rx="${2.5*cell}" ry="${1.5*cell}" fill="${blue}" opacity=".75" stroke="${ink}" stroke-width="4"/>`;
    body+=t(480,465,'كل مربع = 1 سم²',21,800,green);
    return frame(body,'شبكة ستة في ستة وعليها شكل بيضاوي مظلل');
  }

  function straightAngles() {
    const cx=480,cy=430;
    let body=t(480,50,'زاوية مستقيمة مقسمة إلى خمسة أجزاء',30,900);
    body+=`<line x1="145" y1="${cy}" x2="815" y2="${cy}" stroke="${ink}" stroke-width="7"/>`;
    const deg=[0,12,36,72,120,180];
    for(let i=1;i<deg.length-1;i++){
      const a=Math.PI-deg[i]*Math.PI/180;
      body+=`<line x1="${cx}" y1="${cy}" x2="${cx+330*Math.cos(a)}" y2="${cy-330*Math.sin(a)}" stroke="${ink}" stroke-width="6"/>`;
    }
    const labels=['س','2س','3س','4س','5س'];
    const mids=[6,24,54,96,150];
    mids.forEach((d,i)=>{const a=Math.PI-d*Math.PI/180;body+=t(cx+175*Math.cos(a),cy-175*Math.sin(a)+6,labels[i],23,900,i%2?orange:blue);});
    body+=t(480,505,'مجموع الزوايا = 180°',21,800,green);
    return frame(body,'خط مستقيم مقسم إلى زوايا س واثنين س وثلاثة س وأربعة س وخمسة س');
  }

  const additions = {
    'video-v-001':comparisonTriangles(),
    'video-v-006':houseDiagonal(),
    'video-v-008':rightIsosceles(),
    'video-v-009':squareSemicircle(),
    'video-v-010':consumptionDots(),
    'video-v-011':triangleAngles(),
    'video-v-018':exteriorSum(),
    'video-v-020':pieChart([{label:'الناجحون',value:50,color:green},{label:'الفئة الثانية',value:30,color:orange},{label:'س',value:20,color:blue}],'قطاع مجهول الزاوية'),
    'video-v-021':inflationTable(),
    'video-v-023':midpointTriangle(),
    'video-v-024':cutSquare(),
    'video-v-027':pieChart([{label:'الربيع',value:20,color:blue},{label:'الشتاء',value:70,color:orange},{label:'الصيف',value:50,color:'#999'},{label:'الخريف',value:60,color:'#e0ad3c'}],'تفضيلات فصول السنة'),
    'video-v-030':heightBars(),
    'video-v-031':isoscelesExterior(),
    'video-v-033':coordinateRectangle(),
    'video-v-036':parallelogramRectangle(),
    'video-v-041':hajjTable(),
    'video-v-045':ellipseGrid(),
    'video-v-047':straightAngles()
  };

  window.NEON_EXAM_VISUALS = Object.freeze({ ...(window.NEON_EXAM_VISUALS || {}), ...additions });
})();
