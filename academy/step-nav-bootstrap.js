(()=>{
  'use strict';

  const BUTTON_ID='stepNavButton';
  const TARGET_ID='stepAcademy';
  const STEP_TEXT=/\bSTEP\b|English STEP|اختبار\s*STEP|اللغة الإنجليزية STEP/i;
  const SECTION_SELECTORS=[
    '#stepAcademy','#step-academy','#englishStep','#english-step',
    '#stepSection','#step-section','.step-academy','[data-step-academy]'
  ];

  function findStepSection(){
    for(const selector of SECTION_SELECTORS){
      const section=document.querySelector(selector);
      if(section)return section;
    }
    return [...document.querySelectorAll('main section, main [role="region"]')]
      .find(section=>STEP_TEXT.test(section.textContent||''))||null;
  }

  function prepareSection(section){
    if(!section)return null;
    if(!section.id)section.id=TARGET_ID;
    section.dataset.stepAcademy='true';
    return section;
  }

  function showMessage(message){
    const toast=document.getElementById('toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(showMessage.timer);
    showMessage.timer=setTimeout(()=>toast.classList.remove('show'),3200);
  }

  function openStep(){
    const immediate=prepareSection(findStepSection());
    if(immediate){
      immediate.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }

    showMessage('جارٍ تجهيز مسار English STEP...');
    const deadline=Date.now()+12000;
    const timer=setInterval(()=>{
      const section=prepareSection(findStepSection());
      if(section){
        clearInterval(timer);
        section.scrollIntoView({behavior:'smooth',block:'start'});
      }else if(Date.now()>=deadline){
        clearInterval(timer);
        showMessage('تعذر فتح STEP الآن. حدّث الصفحة وحاول مجددًا.');
        window.dispatchEvent(new CustomEvent('neon-step-open-request'));
      }
    },180);
  }

  function ensureButton(){
    const nav=document.querySelector('.main-nav');
    if(!nav)return false;

    const matches=[...nav.querySelectorAll('button,a')]
      .filter(item=>STEP_TEXT.test(item.textContent||''));
    let button=document.getElementById(BUTTON_ID)||matches[0];

    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='nav-link step-nav-link';
      button.id=BUTTON_ID;
      button.textContent='English STEP';
      button.title='مسار اللغة الإنجليزية STEP';
      button.setAttribute('aria-label','فتح مسار اللغة الإنجليزية STEP');
      button.style.whiteSpace='nowrap';

      const examCenter=[...nav.querySelectorAll('button,a')]
        .find(item=>/مركز الاختبارات|Exam Center/i.test(item.textContent||''));
      const library=nav.querySelector('[data-scroll="library"]');
      if(examCenter?.nextSibling)nav.insertBefore(button,examCenter.nextSibling);
      else if(library)nav.insertBefore(button,library);
      else nav.appendChild(button);
    }else{
      button.id=BUTTON_ID;
      button.classList.add('step-nav-link');
    }

    for(const duplicate of matches){
      if(duplicate!==button)duplicate.remove();
    }

    if(button.dataset.stepBound!=='true'){
      button.dataset.stepBound='true';
      button.addEventListener('click',event=>{
        event.preventDefault();
        openStep();
      });
    }

    return true;
  }

  ensureButton();
  prepareSection(findStepSection());

  const observer=new MutationObserver(()=>{
    ensureButton();
    prepareSection(findStepSection());
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener('neon-step-ready',()=>{
    ensureButton();
    prepareSection(findStepSection());
  });
})();
