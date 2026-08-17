(()=>{
  'use strict';

  const center=document.body.dataset.center||'learning';
  const meta={
    step:{title:'اللغة الإنجليزية STEP',target:'#stepAcademy'},
    exams:{title:'مركز التحصيلي والقدرات',target:'#test-center'},
    coding:{title:'تعليم البرمجة',target:'#coding'},
    games:{title:'الألعاب والألغاز',target:'#library'},
    learning:{title:'المعرفة والدروس',target:'#library'}
  }[center]||{title:'NEON Academy 2060',target:'main'};

  const SHELL_CACHE_KEY='neonAcademyCenterShellV2';
  const SCRIPT_CACHE=new Map();

  const EXAM_ASSETS=[
    'exam-practice-tah-math.js','exam-practice-tah-physics.js','exam-practice-tah-chemistry.js','exam-practice-tah-biology.js','exam-practice-qud-verbal.js','exam-practice-qud-quant.js',
    'exam-bank-tahsili-math.js','exam-bank-tahsili-physics.js','exam-bank-tahsili-chemistry-1.js','exam-bank-tahsili-chemistry-2.js','exam-bank-tahsili-biology.js','exam-bank-qudurat-verbal.js','exam-bank-qudurat-quant.js',
    'exam-bank-curated-tahsili-math-2026.js','exam-bank-curated-tahsili-physics-2026.js','exam-bank-curated-tahsili-chemistry-2026.js','exam-bank-curated-tahsili-biology-2026.js','exam-bank-curated-qudurat-verbal-2026.js','exam-bank-curated-qudurat-quant-2026.js',
    'exam-bank-uploaded-video-verbal-bank1-2026.js','exam-bank-uploaded-video-quant-2026-02.js','exam-bank-uploaded-video-tahsili-math-model8-2026.js','exam-bank-uploaded-video-tahsili-math-model12-2026.js',
    'exam-bank-uploaded-video-arithmetic-20260808-v1.js','exam-bank-uploaded-video-arithmetic-20260808-v2.js','exam-bank-uploaded-video-arithmetic-20260808-v3.js',
    'exam-visuals.js','exam-visuals-page06-07.js','exam-visuals-page08-09.js','exam-visuals-page10-11.js','exam-visuals-page18-23.js','exam-visuals-page24-29.js','exam-visuals-page30-41.js','exam-visuals-page42-49.js','exam-visuals-video-bank.js','exam-visuals-video-compilations-2026.js','exam-visuals-uploaded-tahsili-math-model8-2026.js','exam-visuals-uploaded-tahsili-math-model12-2026.js',
    'exam-bank-imported-quant-a.js','exam-bank-imported-quant-b.js','exam-bank-imported-quant-c.js','exam-bank-imported-verbal-a.js','exam-bank-imported-verbal-b.js','exam-bank-imported-reading.js','exam-bank-imported-noon-quant.js','exam-bank-imported-noon-verbal-a.js','exam-bank-imported-noon-verbal-b.js',
    'exam-bank-imported-visual-quant.js','exam-bank-imported-visual-quant-page06-07.js','exam-bank-imported-visual-quant-page08-09.js','exam-bank-imported-visual-quant-page10-11.js','exam-bank-imported-visual-quant-page18-23.js','exam-bank-imported-visual-quant-page24-29.js','exam-bank-imported-visual-quant-page30-35.js','exam-bank-imported-visual-quant-page36-41.js','exam-bank-imported-visual-quant-page42-45.js','exam-bank-imported-visual-quant-page46-49.js',
    'exam-bank-imported-video-quant-a.js','exam-bank-imported-video-quant-b.js','exam-bank-imported-video-compilations-2026-a.js','exam-bank-imported-video-compilations-2026-b.js','exam-bank-imported-2026.js',
    'exam-bank-uploaded-pdf-tahsili-mock001-math-2026.js','exam-bank-uploaded-pdf-tahsili-mock001-physics-2026.js','exam-bank-uploaded-pdf-tahsili-mock001-chemistry-2026.js','exam-bank-uploaded-pdf-tahsili-mock001-biology-2026.js',
    'exam-bank-uploaded-images-tahsili-talo-math-2026.js','exam-bank-uploaded-images-tahsili-talo-physics-2026.js','exam-bank-uploaded-images-tahsili-talo-chemistry-2026.js','exam-bank-uploaded-images-tahsili-talo-biology-2026.js',
    'exam-bank-uploaded-images-daily-physics-2026.js','exam-bank-uploaded-images-daily-chemistry-2026.js',
    'exam-bank-uploaded-pdf-qudurat-43-44-verbal-2026.js','exam-bank-uploaded-pdf-qudurat-43-44-quant-2026.js',
    'exam-bank-uploaded-pdf-qqtahsili-00004-chemistry-2026.js'
  ];

  document.title=`${meta.title} | NEON Academy 2060`;

  function loadScript(src,type='classic'){
    const key=`${type}:${src}`;
    if(SCRIPT_CACHE.has(key))return SCRIPT_CACHE.get(key);
    const promise=new Promise((resolve,reject)=>{
      const absolute=new URL(src,document.baseURI).href;
      const existing=[...document.scripts].find(script=>script.src===absolute);
      if(existing){
        if(existing.dataset.loaded==='true')return resolve();
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',()=>reject(new Error(`تعذر تحميل ${src}`)),{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      if(type==='module')script.type='module';
      script.onload=()=>{script.dataset.loaded='true';resolve()};
      script.onerror=()=>reject(new Error(`تعذر تحميل ${src}`));
      document.body.appendChild(script);
    });
    SCRIPT_CACHE.set(key,promise);
    return promise;
  }

  async function loadOptional(src,type='classic'){
    try{await loadScript(src,type);return true}
    catch(error){console.warn(error);return false}
  }

  async function loadBatches(files,size=8){
    for(let index=0;index<files.length;index+=size){
      const batch=files.slice(index,index+size);
      setBootStatus(`جارٍ تحميل محتوى ${meta.title}… ${Math.min(index+batch.length,files.length)} / ${files.length}`);
      await Promise.all(batch.map(file=>loadScript(file)));
    }
  }

  async function getShell(){
    try{
      const cached=sessionStorage.getItem(SHELL_CACHE_KEY);
      if(cached)return cached;
    }catch{}
    const response=await fetch('index.html');
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const html=await response.text();
    try{sessionStorage.setItem(SHELL_CACHE_KEY,html)}catch{}
    return html;
  }

  function mountShell(html){
    const parsed=new DOMParser().parseFromString(html,'text/html');
    parsed.querySelectorAll('script').forEach(script=>script.remove());
    document.body.className=parsed.body.className;
    document.body.innerHTML=parsed.body.innerHTML;
    document.body.dataset.center=center;
    document.body.classList.add('center-page');
    const boot=document.querySelector('#authBoot .auth-boot-card');
    if(boot){
      const heading=boot.querySelector('h2');
      const paragraph=boot.querySelector('p');
      if(heading)heading.textContent=`جارٍ فتح ${meta.title}`;
      if(paragraph)paragraph.textContent='يتم تحميل الملفات المطلوبة لهذا المركز فقط.';
    }
  }

  function setBootStatus(message){
    const paragraph=document.querySelector('#authBoot .auth-boot-card p');
    if(paragraph)paragraph.textContent=message;
  }

  function updateLibraryMode(){
    if(center!=='games'&&center!=='learning')return false;
    const library=document.getElementById('library');
    const filter=document.getElementById('areaFilter');
    if(!library||!filter)return false;
    const wanted=center==='games'?'games':'knowledge';
    if(filter.value!==wanted){
      filter.value=wanted;
      filter.dispatchEvent(new Event('change',{bubbles:true}));
    }
    const heading=library.querySelector('.section-heading h2');
    const description=library.querySelector('.section-heading p');
    const eyebrow=library.querySelector('.section-heading .eyebrow');
    if(center==='games'){
      if(heading)heading.textContent='الألعاب والألغاز';
      if(description)description.textContent='ألغاز منطقية وتحديات وغرف هروب وأنشطة تعليمية تفاعلية.';
      if(eyebrow)eyebrow.textContent='GAMES & PUZZLES CENTER';
    }else{
      if(heading)heading.textContent='المعرفة والدروس';
      if(description)description.textContent='مكتبة تعليمية متعددة التخصصات من التأسيس إلى التطبيق ثم الإتقان.';
      if(eyebrow)eyebrow.textContent='LEARNING LIBRARY';
    }
    return true;
  }

  function applyCenter(){
    document.body.classList.add('center-page');
    document.body.dataset.center=center;
    updateLibraryMode();
    const target=document.querySelector(meta.target);
    if(!target)return false;
    target.setAttribute('aria-label',meta.title);
    return true;
  }

  async function loadCenterAssets(){
    if(center==='step'){
      setBootStatus('جارٍ تجهيز واجهة STEP…');
      await loadScript('step-academy-runtime.js');
      loadOptional('step-academy-data.js').then(loaded=>{
        if(loaded)window.dispatchEvent(new CustomEvent('neon-step-data-loaded'));
      });
      return;
    }

    setBootStatus('جارٍ تحميل المكتبة الأساسية…');
    await loadScript('catalog.js');

    if(center==='exams'){
      await loadBatches(EXAM_ASSETS,8);
      setBootStatus('جارٍ تجميع الأسئلة وإعداد مركز الاختبارات…');
      for(const file of ['exam-bank.js','exam-bank-curated-meta-2026.js','exam-bank-bilingual-practice.js','academy-performance-bootstrap.js','exam-dedupe-enhanced.js','exam-center-ui.js','exam-center-source-patch.js','exam-source-visibility-policy.js','exam-bilingual-runtime.js']){
        await loadScript(file);
      }
      return;
    }

    setBootStatus(`جارٍ تجهيز ${meta.title}…`);
    await loadScript('academy.js');
  }

  async function boot(){
    try{
      const html=await getShell();
      mountShell(html);
      applyCenter();

      const commonPromise=Promise.all([
        loadScript('center-auth.js','module'),
        loadScript('portal-cards.js')
      ]);
      await loadCenterAssets();
      await commonPromise;

      let attempts=0;
      const settle=setInterval(()=>{
        attempts++;
        const ready=applyCenter();
        if(ready||attempts>100){
          clearInterval(settle);
          if(ready)setTimeout(()=>window.scrollTo({top:0,behavior:'instant'}),50);
        }
      },80);

      const observer=new MutationObserver(()=>applyCenter());
      observer.observe(document.body,{childList:true,subtree:true});
    }catch(error){
      console.error('Center page boot error:',error);
      document.body.className='';
      document.body.innerHTML=`<main class="center-page-error"><h1>تعذر تحميل ${meta.title}</h1><p>${String(error.message||error)}</p><button onclick="location.reload()" style="padding:12px 18px;border:0;border-radius:12px;cursor:pointer">إعادة المحاولة</button><p><a href="index.html" style="color:#72e7ff">العودة إلى الأكاديمية</a></p></main>`;
    }
  }

  boot();
})();
