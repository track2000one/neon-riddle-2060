(() => {
  'use strict';

  const font = 'Tahoma,Segoe UI,Arial,DejaVu Sans,sans-serif';
  const ink = '#27323a';
  const muted = '#68747d';
  const green = '#76b84b';
  const orange = '#d97831';
  const blue = '#376f9f';
  const grid = '#d8dee4';
  const palette = [orange, green, blue, '#8e68b1', '#e3ae3b', '#4f5d66', '#c4576d', '#55a4a6'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const text = (x,y,value,size=23,weight=700,fill=ink,anchor='middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" direction="rtl" unicode-bidi="plaintext">${esc(value)}</text>`;
  const frame = (body,title='') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560" role="img" aria-label="${esc(title)}"><rect width="960" height="560" rx="28" fill="#fff"/>${body}</svg>`;

  function verticalBars({title,labels,values,max,series,colors=[orange,green],suffix=''}) {
    const left=90, top=95, width=790, height=350;
    const groups=labels.length;
    const seriesList=series || [{values,color:colors[0]}];
    const topValue=max || Math.max(...seriesList.flatMap(item=>item.values))*1.15;
    let body=text(480,55,title,30,900);
    for(let i=0;i<=5;i++){
      const y=top+height-(i/5)*height;
      body+=`<line x1="${left}" y1="${y}" x2="${left+width}" y2="${y}" stroke="${grid}" stroke-width="2"/>`;
      body+=text(left-18,y+8,Math.round(topValue*i/5),17,600,muted,'end');
    }
    const groupWidth=width/groups;
    const barGap=7;
    const usable=Math.min(58,(groupWidth-22)/seriesList.length);
    labels.forEach((label,index)=>{
      const center=left+groupWidth*(index+.5);
      seriesList.forEach((item,seriesIndex)=>{
        const value=item.values[index];
        const h=(value/topValue)*height;
        const totalW=seriesList.length*usable+(seriesList.length-1)*barGap;
        const x=center-totalW/2+seriesIndex*(usable+barGap);
        const y=top+height-h;
        body+=`<rect x="${x}" y="${y}" width="${usable}" height="${h}" rx="6" fill="${item.color||colors[seriesIndex%colors.length]}"/>`;
        body+=text(x+usable/2,y-9,`${value}${suffix}`,16,800,ink);
      });
      body+=text(center,top+height+40,label,18,700,ink);
    });
    if(seriesList.some(item=>item.name)){
      let x=760;
      seriesList.forEach(item=>{body+=`<rect x="${x}" y="500" width="20" height="20" rx="4" fill="${item.color}"/>${text(x-10,517,item.name,16,700,ink,'end')}`;x-=155;});
    }
    return frame(body,title);
  }

  function horizontalBars({title,labels,values,max}){
    const barLeft=90, top=96, barWidth=590, row=62;
    const labelPanelLeft=735, labelRight=910, separatorX=710;
    const topValue=max || Math.max(...values)*1.15;
    let body=text(480,55,title,30,900);
    body+=`<line x1="${separatorX}" y1="88" x2="${separatorX}" y2="470" stroke="${grid}" stroke-width="2"/>`;
    body+=`<text x="${labelRight}" y="84" text-anchor="end" font-family="${font}" font-size="15" font-weight="800" fill="${muted}">المنصة</text>`;
    values.forEach((value,index)=>{
      const y=top+index*row;
      const fillWidth=Math.max(3,value/topValue*barWidth);
      const valueX=Math.min(barLeft+fillWidth+14,barLeft+barWidth-8);
      const valueAnchor=valueX>=barLeft+barWidth-10?'end':'start';
      body+=`<rect x="${labelPanelLeft}" y="${y-2}" width="190" height="40" rx="10" fill="${index%2?'#f8fafb':'#f3f7f9'}"/>`;
      body+=`<text x="${labelRight}" y="${y+25}" text-anchor="end" font-family="${font}" font-size="20" font-weight="800" fill="${ink}">${esc(labels[index])}</text>`;
      body+=`<rect x="${barLeft}" y="${y}" width="${barWidth}" height="34" rx="8" fill="#edf1f4"/>`;
      body+=`<rect x="${barLeft}" y="${y}" width="${fillWidth}" height="34" rx="8" fill="${index%2?green:orange}"/>`;
      body+=`<text x="${valueX}" y="${y+25}" text-anchor="${valueAnchor}" font-family="${font}" font-size="18" font-weight="900" fill="${ink}">${value}</text>`;
    });
    return frame(body,title);
  }

  function lineChart({title,labels,values,max}){
    const left=100, top=95, width=760, height=340;
    const topValue=max || Math.max(...values)*1.2;
    let body=text(480,55,title,30,900);
    for(let i=0;i<=5;i++){
      const y=top+height-(i/5)*height;
      body+=`<line x1="${left}" y1="${y}" x2="${left+width}" y2="${y}" stroke="${grid}" stroke-width="2"/>`;
      body+=text(left-20,y+7,Math.round(topValue*i/5),16,600,muted,'end');
    }
    const points=values.map((value,index)=>({x:left+(labels.length===1?width/2:index*(width/(labels.length-1))),y:top+height-value/topValue*height,value,index}));
    body+=`<polyline points="${points.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${orange}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
    points.forEach(point=>{
      body+=`<circle cx="${point.x}" cy="${point.y}" r="9" fill="${ink}" stroke="#fff" stroke-width="4"/>`;
      body+=text(point.x,point.y-18,point.value,16,800,ink);
      body+=text(point.x,top+height+40,labels[point.index],17,700,ink);
    });
    return frame(body,title);
  }

  function pie({title,items}){
    const cx=360, cy=300, r=180;
    const total=items.reduce((sum,item)=>sum+item.value,0);
    let angle=-Math.PI/2;
    let body=text(480,55,title,30,900);
    items.forEach((item,index)=>{
      const next=angle+(item.value/total)*Math.PI*2;
      const x1=cx+r*Math.cos(angle), y1=cy+r*Math.sin(angle);
      const x2=cx+r*Math.cos(next), y2=cy+r*Math.sin(next);
      const large=next-angle>Math.PI?1:0;
      body+=`<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${item.color||palette[index%palette.length]}" stroke="#fff" stroke-width="5"/>`;
      const mid=(angle+next)/2;
      const tx=cx+r*.62*Math.cos(mid), ty=cy+r*.62*Math.sin(mid);
      body+=text(tx,ty+7,`${item.label} ${item.display ?? `${Math.round(item.value/total*100)}%`}`,16,800,index===4?ink:'#fff');
      angle=next;
    });
    let ly=170;
    items.forEach((item,index)=>{
      body+=`<rect x="650" y="${ly-18}" width="22" height="22" rx="5" fill="${item.color||palette[index%palette.length]}"/>`;
      body+=text(690,ly,item.label,18,700,ink,'start');
      ly+=48;
    });
    return frame(body,title);
  }

  function table({title,headers,rows,widths}){
    const left=90, top=105, totalWidth=780;
    const columnWidths=widths || headers.map(()=>totalWidth/headers.length);
    const rowH=Math.min(72,360/(rows.length+1));
    let body=text(480,55,title,30,900);
    let x=left;
    headers.forEach((header,index)=>{
      body+=`<rect x="${x}" y="${top}" width="${columnWidths[index]}" height="${rowH}" fill="${ink}" stroke="#fff" stroke-width="2"/>`;
      body+=text(x+columnWidths[index]/2,top+rowH*.64,header,18,800,'#fff');
      x+=columnWidths[index];
    });
    rows.forEach((row,rowIndex)=>{
      x=left;
      row.forEach((value,index)=>{
        body+=`<rect x="${x}" y="${top+(rowIndex+1)*rowH}" width="${columnWidths[index]}" height="${rowH}" fill="${rowIndex%2?'#f7fafb':'#eef5e9'}" stroke="${grid}" stroke-width="2"/>`;
        body+=text(x+columnWidths[index]/2,top+(rowIndex+1)*rowH+rowH*.64,value,18,700,ink);
        x+=columnWidths[index];
      });
    });
    return frame(body,title);
  }

  const additions={
    'visual-grade-frequency-line-18':lineChart({title:'الدرجة وعدد الطلاب',labels:['1','2','3','4','5','6','7'],values:[3,4,3,6,5,2,3],max:8}),
    'visual-waste-pie-18':pie({title:'النفايات وفق النوع',items:[{label:'نفايات ورقية',value:40},{label:'نفايات بلاستيكية',value:30},{label:'نفايات طعام',value:15},{label:'نفايات طبية',value:15}]}),
    'visual-goals-19':verticalBars({title:'عدد الأهداف المسجلة',labels:['خالد','عبدالله','ماجد','علي','صقر'],values:[5,7,7,4,2],max:8}),
    'visual-social-apps-19':horizontalBars({title:'عدد المستخدمين للمنصات',labels:['تيك توك','إنستجرام','X','سناب','واتس','فيسبوك'],values:[30,40,30,40,15,30],max:50}),
    'visual-fruit-pie-19':pie({title:'الفواكه التي يأكلها الأطفال',items:[{label:'برتقال',value:30},{label:'موز',value:45},{label:'مانجو',value:10},{label:'تفاح',value:5},{label:'عنب',value:10}]}),
    'visual-student-scores-19':verticalBars({title:'درجات الطلاب',labels:['محمد','أحمد','علي','نواف','نايف','إبراهيم','راكان','بدر'],values:[10,8,2,8,4,6,10,8],max:12}),
    'visual-traffic-table-19':table({title:'المخالفات المرورية حسب العمر',headers:['عدد المخالفات','30 سنة فأقل','أكبر من 30 سنة'],rows:[[1,4,6],[2,6,4],[3,8,2]],widths:[220,280,280]}),
    'visual-temperatures-20':verticalBars({title:'درجات الحرارة',labels:['مكة','الدمام','أبها','الرياض'],values:[29,31,25,30],max:35}),
    'visual-petrol-20':verticalBars({title:'سعر لتر البنزين بالدولار',labels:['السعودية','قطر','الكويت','الإمارات','عُمان','البحرين'],values:[30,31,25,45,27,30],max:50}),
    'visual-points-20':verticalBars({title:'عدد الطلاب حسب فئة النقاط',labels:['ممتاز','جيد جدًا','جيد','مقبول','راسب'],values:[10,8,15,13,7],max:18}),
    'visual-revenue-line-20':lineChart({title:'إيرادات الشركة خلال ست سنوات',labels:['1431','1432','1433','1434','1435','1436'],values:[15,9,12,11,25,29],max:30}),
    'visual-expenses-line-20':lineChart({title:'أسعار المشتريات',labels:['قطعة حلوى','شطيرة','عصير','سلطة'],values:[12,7,4,8],max:14}),
    'visual-subject-difference-21':verticalBars({title:'درجات الطالب وأحد أصدقائه',labels:['عربي','اجتماعيات','علوم','إنجليزي'],series:[{name:'درجة الصديق',values:[91,91,92,90],color:ink},{name:'درجة الطالب',values:[86,86,88,50],color:orange}],max:100}),
    'visual-hashem-21':verticalBars({title:'درجات هاشم',labels:['رياضيات','كيمياء'],values:[60,40],max:100}),
    'visual-chapters-21':verticalBars({title:'درجات الفصول',labels:['فصل 1','فصل 2','فصل 3','فصل 4'],values:[6,5,3,5],max:7}),
    'visual-row-capacity-21':verticalBars({title:'عدد الطلاب في ستة صفوف',labels:['الأول','الثاني','الثالث','الرابع','الخامس','السادس'],values:[15,20,25,15,20,20],max:25}),
    'visual-system-impact-21':lineChart({title:'أثر نظام ساهر عبر الأسابيع',labels:['الأول','الثاني','الثالث','الرابع'],values:[0,0,1,2],max:3}),
    'visual-share-pie-21':pie({title:'توزيع المبلغ على خمسة أشخاص',items:[{label:'الشخص 1',value:90,display:'90°'},{label:'الشخص 2',value:45,display:'45°'},{label:'الشخص 3',value:135,display:'135°'},{label:'الشخص 4',value:45,display:'45°'},{label:'الشخص 5',value:45,display:'45°'}]}),
    'visual-not-passed-22':verticalBars({title:'عدد المجتازين وغير المجتازين',labels:['فصل 1','فصل 2','فصل 3','فصل 4','فصل 5'],series:[{name:'اجتاز',values:[30,45,40,35,25],color:ink},{name:'لم يجتز',values:[15,15,20,20,10],color:orange}],max:50}),
    'visual-km-miles-22':lineChart({title:'التحويل بين الكيلومترات والأميال',labels:['0 كم','40 كم','80 كم','120 كم','160 كم'],values:[0,25,50,75,100],max:100}),
    'visual-loans-table-22':table({title:'القروض العقارية',headers:['الدولة','القروض العقارية'],rows:[['السعودية',86],['قطر',185],['الإمارات',256],['البحرين',175]],widths:[390,390]}),
    'visual-person-table-23':table({title:'العمر والطول والهواية',headers:['الاسم','العمر','الطول','الهواية'],rows:[['فارس',16,'1.98 م','سباحة'],['خالد',18,'1.56 م','كرة سلة'],['عمر',19,'1.78 م','كرة مضرب'],['محمد',17,'1.60 م','كرة طائرة']],widths:[190,150,190,250]}),
    'visual-subject-pie-23':pie({title:'نسب المواد',items:[{label:'لغة عربية',value:35},{label:'فنية',value:29},{label:'رياضيات',value:23},{label:'لغة إنجليزية',value:13}]}),
    'visual-library-bars-23':verticalBars({title:'عدد قرّاء أنواع الكتب',labels:['علمية','أدبية','تاريخية','تقنية'],values:[20,15,25,15],max:30}),
    'visual-vehicles-table-23':table({title:'أعداد أنواع المركبات',headers:['النوع','العدد'],rows:[['دراجات هوائية',10],['دراجات نارية',15],['سيارات سيدان',20],['سيارات دفع رباعي',20],['قطارات',35]],widths:[500,280]})
  };

  window.NEON_EXAM_VISUALS=Object.freeze({...(window.NEON_EXAM_VISUALS||{}),...additions});
})();
