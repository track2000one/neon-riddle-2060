(()=>{
  'use strict';

  const centers=[
    {id:'step',href:'step.html',title:'اللغة الإنجليزية STEP',subtitle:'STEP English',description:'شرح متدرج، تدريب تكيفي، استماع، قراءة ومحاكاة كاملة.',icon:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 14h38a7 7 0 0 1 7 7v20a7 7 0 0 1-7 7H31L18 57v-9h-5a7 7 0 0 1-7-7V21a7 7 0 0 1 7-7Z"/><circle cx="23" cy="31" r="2.7"/><circle cx="32" cy="31" r="2.7"/><circle cx="41" cy="31" r="2.7"/></svg>'},
    {id:'exams',href:'exams.html',title:'مركز التحصيلي والقدرات',subtitle:'Tahsili & Qudurat',description:'بنوك أسئلة ضخمة، محاكاة زمنية، مراجعة أخطاء وتحليل أداء.',icon:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 51h44M16 45V32h9v13M28 45V23h9v22M40 45V14h9v31M15 22l12-9 10 5 14-10"/><path d="m45 8 6 0 0 6"/></svg>'},
    {id:'coding',href:'coding.html',title:'تعليم البرمجة',subtitle:'Coding',description:'دروس عملية ومختبر تفاعلي ومسارات HTML وCSS وJavaScript وغيرها.',icon:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m24 16-16 16 16 16M40 16l16 16-16 16M37 10 27 54"/></svg>'},
    {id:'games',href:'games.html',title:'الألعاب والألغاز',subtitle:'Games & Puzzles',description:'ألغاز منطقية، تحديات يومية، مسابقات وغرف هروب تعليمية.',icon:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 21h24c8 0 13 7 14 17l1 9c1 7-7 10-11 5l-7-8H23l-7 8c-4 5-12 2-11-5l1-9c1-10 6-17 14-17Z"/><path d="M18 31v10M13 36h10M43 32h.1M50 39h.1"/></svg>'},
    {id:'learning',href:'learning.html',title:'المعرفة والدروس',subtitle:'Learning Library',description:'مكتبة تعليمية متعددة التخصصات من التأسيس إلى الإتقان.',icon:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 13h18c5 0 8 3 8 8v32c0-5-3-8-8-8H8V13Zm48 0H38c-5 0-8 3-8 8v32c0-5 3-8 8-8h18V13Z"/><path d="M15 22h12M15 29h12M49 22H37M49 29H37"/></svg>'}
  ];

  function injectStyles(){
    if(document.getElementById('neonPortalStyles'))return;
    const style=document.createElement('style');
    style.id='neonPortalStyles';
    style.textContent=`
      .center-portal-section{position:relative;padding-top:42px;padding-bottom:62px;scroll-margin-top:92px}
      .center-portal-heading{text-align:center;max-width:760px;margin:0 auto 30px}.center-portal-heading h2{font-size:clamp(32px,4vw,58px);margin:8px 0 12px}.center-portal-heading p{color:#aebcda;line-height:1.9;font-size:16px}.center-portal-heading .eyebrow{color:#66e9ff}
      .center-portal-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:18px;align-items:stretch;perspective:1400px}
      .neon-center-card{--card-glow:#68e8ff;position:relative;isolation:isolate;min-width:0;min-height:470px;padding:18px 17px 16px;border-radius:24px;text-decoration:none;color:#f8fbff;display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden;background:linear-gradient(155deg,rgba(18,45,84,.88),rgba(7,19,45,.96) 46%,rgba(21,16,62,.94));border:1px solid color-mix(in srgb,var(--card-glow) 48%,transparent);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),inset 0 0 34px rgba(103,225,255,.07),0 18px 48px rgba(0,0,0,.32),0 0 22px color-mix(in srgb,var(--card-glow) 15%,transparent);transition:transform .28s ease,box-shadow .28s ease,border-color .28s ease}
      .neon-center-card::before{content:'';position:absolute;inset:7px;border-radius:19px;border:1px solid rgba(255,255,255,.18);box-shadow:inset 0 0 22px color-mix(in srgb,var(--card-glow) 10%,transparent);pointer-events:none}
      .neon-center-card::after{content:'';position:absolute;inset:-35% -50%;z-index:-1;background:radial-gradient(circle at 50% 45%,color-mix(in srgb,var(--card-glow) 22%,transparent),transparent 36%),repeating-radial-gradient(circle at 50% 45%,transparent 0 42px,rgba(135,147,255,.14) 43px 44px,transparent 45px 68px);opacity:.82}
      .neon-center-card:hover,.neon-center-card:focus-visible{transform:translateY(-9px);border-color:color-mix(in srgb,var(--card-glow) 82%,white 18%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 25px 58px rgba(0,0,0,.42),0 0 38px color-mix(in srgb,var(--card-glow) 32%,transparent);outline:none}
      .portal-card-brand{font-size:19px;letter-spacing:.16em;font-weight:900;margin-top:5px}.portal-card-brand small{display:block;font-size:8px;letter-spacing:.17em;color:#b9c8e7;margin-top:4px}
      .portal-card-icon{width:128px;aspect-ratio:1;margin:42px auto 30px;border-radius:31px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(85,226,255,.9),rgba(139,111,255,.88) 54%,rgba(255,99,203,.9));box-shadow:inset 0 2px 10px rgba(255,255,255,.45),0 0 24px color-mix(in srgb,var(--card-glow) 46%,transparent),0 18px 30px rgba(0,0,0,.28)}
      .portal-card-icon svg{width:72px;height:72px;fill:none;stroke:white;stroke-width:3.6;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 8px rgba(255,255,255,.52))}.portal-card-icon svg circle{fill:white;stroke:none}
      .neon-center-card h3{font-size:clamp(22px,2vw,29px);line-height:1.35;margin:0;min-height:78px;display:grid;place-items:center}.portal-card-subtitle{font-size:13px;color:#c6d3ed;margin:2px 0 14px}.portal-card-description{font-size:12px;line-height:1.75;color:#9fb0d1;margin:0 auto;max-width:230px}
      .portal-card-footer{margin-top:auto;width:100%;padding-top:20px;font-size:9px;letter-spacing:.12em;color:#93a7cc;display:flex;align-items:center;justify-content:center;gap:7px}.portal-card-footer::before,.portal-card-footer::after{content:'';height:1px;flex:1;background:linear-gradient(90deg,transparent,var(--card-glow),transparent);opacity:.56}
      .neon-center-card[data-center="step"]{--card-glow:#62e9ff}.neon-center-card[data-center="exams"]{--card-glow:#a977ff}.neon-center-card[data-center="coding"]{--card-glow:#55dfff}.neon-center-card[data-center="games"]{--card-glow:#ff76d4}.neon-center-card[data-center="learning"]{--card-glow:#6ee6c8}
      body.portal-home #tracks,body.portal-home .action-zone,body.portal-home #library,body.portal-home #coding,body.portal-home #test-center,body.portal-home #stepAcademy{display:none!important}
      body.portal-home .hero [data-scroll="tracks"]{cursor:pointer}
      .main-nav a.nav-link{text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
      @media(max-width:1100px){.center-portal-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.neon-center-card{min-height:450px}}
      @media(max-width:760px){.center-portal-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.neon-center-card{min-height:430px}.portal-card-icon{width:112px;margin-top:34px}.center-portal-section{padding-inline:12px}}
      @media(max-width:520px){.center-portal-grid{grid-template-columns:1fr}.neon-center-card{min-height:410px;max-width:360px;width:100%;margin:auto}.portal-card-icon{margin-top:30px;margin-bottom:24px}.neon-center-card h3{min-height:auto}.center-portal-heading{text-align:right}}
      @media(prefers-reduced-motion:reduce){.neon-center-card{transition:none}.neon-center-card:hover{transform:none}}
    `;
    document.head.appendChild(style);
  }

  function isHome(){
    if(document.body.dataset.center)return false;
    const path=location.pathname.replace(/\/+$/,'');
    return path.endsWith('/academy')||path.endsWith('/academy/index.html');
  }

  function renderNav(){
    const nav=document.querySelector('.main-nav');
    if(!nav)return;
    const current=document.body.dataset.center||'home';
    const items=[
      ['home','index.html','الرئيسية'],['centers','index.html#centers','المراكز'],['step','step.html','English STEP'],['exams','exams.html','التحصيلي والقدرات'],['coding','coding.html','البرمجة'],['games','games.html','الألعاب'],['learning','learning.html','المكتبة']
    ];
    const signature=items.map(item=>item.join(':')).join('|')+`|${current}`;
    const valid=nav.dataset.portalSignature===signature&&nav.children.length===items.length&&[...nav.children].every(item=>item.matches('a.nav-link'));
    if(valid)return;
    nav.innerHTML=items.map(([id,href,label])=>`<a class="nav-link ${current===id||(current==='home'&&id==='home')?'active':''}" href="${href}">${label}</a>`).join('');
    nav.dataset.portalSignature=signature;
  }

  function renderCards(){
    if(!isHome()||document.getElementById('centers'))return;
    document.body.classList.add('portal-home');
    const section=document.createElement('section');
    section.id='centers';
    section.className='section-shell center-portal-section';
    section.innerHTML=`
      <div class="center-portal-heading"><span class="eyebrow">NEON LEARNING CENTERS</span><h2>اختر مركز التعلم</h2><p>كل مركز أصبح مساحة مستقلة بواجهة ومحتوى مخصصين، مع استمرار حفظ تقدم الطالب في حساب واحد.</p></div>
      <div class="center-portal-grid">${centers.map(card=>`<a class="neon-center-card" data-center="${card.id}" href="${card.href}" aria-label="فتح ${card.title}"><div class="portal-card-brand">NEON<small>ACADEMY 2060</small></div><div class="portal-card-icon">${card.icon}</div><h3>${card.title}</h3><div class="portal-card-subtitle">${card.subtitle}</div><p class="portal-card-description">${card.description}</p><div class="portal-card-footer">NEON ACADEMY 2060</div></a>`).join('')}</div>`;
    const metrics=document.querySelector('.metric-strip');
    if(metrics?.parentNode)metrics.insertAdjacentElement('afterend',section);else document.querySelector('main')?.prepend(section);
    const heroAction=document.querySelector('.hero [data-scroll="tracks"]');
    if(heroAction){heroAction.removeAttribute('data-scroll');heroAction.addEventListener('click',()=>section.scrollIntoView({behavior:'smooth',block:'start'}));}
  }

  injectStyles();
  renderNav();
  renderCards();
  const observer=new MutationObserver(()=>{renderNav();renderCards();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();