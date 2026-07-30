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

  document.title=`${meta.title} | NEON Academy 2060`;

  function loadScript(src,type='classic'){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      if(type==='module')script.type='module';
      script.onload=resolve;
      script.onerror=()=>reject(new Error(`تعذر تحميل ${src}`));
      document.body.appendChild(script);
    });
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

  async function boot(){
    try{
      const response=await fetch('index.html',{cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const html=await response.text();
      const parsed=new DOMParser().parseFromString(html,'text/html');
      parsed.querySelectorAll('script').forEach(script=>script.remove());
      document.body.className=parsed.body.className;
      document.body.innerHTML=parsed.body.innerHTML;
      document.body.dataset.center=center;
      document.body.classList.add('center-page');
      applyCenter();

      await loadScript('catalog.js');
      await loadScript('auth-guard.js','module');

      let attempts=0;
      const settle=setInterval(()=>{
        attempts++;
        const ready=applyCenter();
        if(ready||attempts>160){
          clearInterval(settle);
          if(ready)setTimeout(()=>window.scrollTo({top:0,behavior:'instant'}),80);
        }
      },100);

      const observer=new MutationObserver(()=>applyCenter());
      observer.observe(document.body,{childList:true,subtree:true});
    }catch(error){
      console.error('Center page boot error:',error);
      document.body.innerHTML=`<main class="center-page-error"><h1>تعذر تحميل ${meta.title}</h1><p>حدث خطأ أثناء تجهيز الصفحة المخصصة. حدّث الصفحة وحاول مجددًا.</p><a href="index.html" style="color:#72e7ff">العودة إلى الأكاديمية</a></main>`;
    }
  }

  boot();
})();