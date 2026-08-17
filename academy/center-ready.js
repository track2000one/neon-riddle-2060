(()=>{
  'use strict';

  const center=document.body.dataset.center||'learning';
  let authReady=Boolean(window.NEON_AUTH_USER);
  let checks=0;

  function contentReady(){
    if(center==='step')return Boolean(document.querySelector('#stepAcademy .step-shell'));
    if(center==='exams'){
      const section=document.querySelector('#test-center .exam-family-grid')?.closest('#test-center');
      const diagnostics=window.NEON_EXAM_CENTER_DIAGNOSTICS;
      const visible=Number(section?.dataset.activeExamQuestions||-1);
      return Boolean(section&&diagnostics&&visible===Number(diagnostics.activeExamQuestions)&&section.dataset.build===String(window.NEON_ASSET_REV||'unversioned'));
    }
    if(center==='coding')return Boolean(document.querySelector('#coding #languageList > *'));
    if(center==='games'||center==='learning')return Boolean(document.querySelector('#library #lessonGrid > *'));
    return Boolean(document.querySelector('main'));
  }

  function finish(){
    document.body.classList.remove('auth-pending');
    document.body.classList.add('center-ready');
    document.getElementById('authBoot')?.classList.add('hidden');
  }

  function check(){
    checks++;
    authReady ||= Boolean(window.NEON_AUTH_USER);
    if(authReady&&contentReady()){
      finish();
      clearInterval(timer);
      return;
    }
    if(checks>500){
      clearInterval(timer);
      const text=document.querySelector('#authBoot .auth-boot-card p');
      if(text)text.textContent='استغرق التحميل وقتًا أطول من المعتاد. تحقق من الاتصال ثم حدّث الصفحة.';
    }
  }

  window.addEventListener('neon-center-auth-ready',()=>{authReady=true;check()});
  const timer=setInterval(check,80);
  check();
})();
