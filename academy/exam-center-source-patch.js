(() => {
  'use strict';
  const imported = window.NEON_IMPORTED_EXAM_QUESTIONS_2026 || [];
  const bank = window.NEON_EXAM_BANK;
  const academy = window.NEON_ACADEMY;
  const i18n = window.NEON_I18N || { isEnglish:false, pick:(ar)=>ar };
  const answerLabels = i18n.isEnglish ? ['A','B','C','D','E','F'] : ['أ','ب','ج','د','هـ','و'];
  const locale = i18n.isEnglish ? 'en-US' : 'ar-SA';
  let updateQueued = false;
  if (!document.querySelector('script[data-lesson-quickcheck-loader]')) {
    const quickCheckScript = document.createElement('script');
    quickCheckScript.src = 'lesson-quickcheck-unique.js';
    quickCheckScript.async = false;
    quickCheckScript.dataset.lessonQuickcheckLoader = 'true';
    document.body.appendChild(quickCheckScript);
  }
  function normalize(value) { const digits='٠١٢٣٤٥٦٧٨٩'; return String(value||'').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/[٠-٩]/g,digit=>String(digits.indexOf(digit))).toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,''); }
  const sourceMap = new Map();
  imported.forEach(question => { if (question?.q) sourceMap.set(normalize(question.q),question); if (question?.qEn) sourceMap.set(normalize(question.qEn),question); });
  function inferFamily(question) { if (question.family) return question.family; if (String(question.subject||'').startsWith('qudurat')) return 'qudurat'; if (String(question.subject||'').startsWith('tahsili')) return 'tahsili'; return 'other'; }
  function localizedTitle(item,fallback='') { return i18n.pick(item?.title||fallback,item?.titleEn||item?.title||fallback); }
  function repairOptionButtons(root=document) {
    root.querySelectorAll?.('.center-exam-screen .exam-option[data-center-answer]').forEach((button,index)=>{
      const label=button.querySelector('b');
      if(label&&label.textContent!==answerLabels[index]) label.textContent=answerLabels[index]||String(index+1);
      const screen=button.closest('.center-exam-screen');
      if(screen&&!screen.querySelector('.center-answer-feedback')) button.disabled=false;
    });
  }
  function repairSetupControls() {
    if(!bank||!academy)return;
    const questions=academy.questionBank.filter(item=>item.area==='exams'&&item.active!==false);
    const familySelect=document.getElementById('centerFamily');
    const subjectSelect=document.getElementById('centerSubject');
    const categorySelect=document.getElementById('centerCategory');
    if(!subjectSelect)return;
    const family=familySelect?.value||'all';
    const subjectMeta=new Map((bank.meta?.subjects||[]).map(item=>[item.id,item]));
    const subjectCounts=new Map(),categoryCounts=new Map();
    questions.forEach(item=>{ if(family==='all'||inferFamily(item)===family)subjectCounts.set(item.subject,(subjectCounts.get(item.subject)||0)+1); categoryCounts.set(`${item.subject}|${item.category}`,(categoryCounts.get(`${item.subject}|${item.category}`)||0)+1); });
    [...subjectSelect.options].forEach(option=>{
      if(option.value==='all'){option.textContent=i18n.pick('كل الأقسام','All sections');return;}
      const meta=subjectMeta.get(option.value),count=subjectCounts.get(option.value)||0;
      option.disabled=count===0;
      const text=`${meta?.icon||'🎯'} ${localizedTitle(meta,option.value)} (${count.toLocaleString(locale)})`;
      if(option.textContent!==text)option.textContent=text;
    });
    if(!categorySelect)return;
    const subject=subjectSelect.value;
    const categoryMeta=new Map((bank.meta?.categories?.[subject]||[]).map(item=>[item.id,item]));
    [...categorySelect.options].forEach(option=>{
      if(option.value==='all'){option.textContent=i18n.pick('كل الأنواع','All types');return;}
      const count=categoryCounts.get(`${subject}|${option.value}`)||0,meta=categoryMeta.get(option.value);
      option.disabled=count===0;
      const title=localizedTitle(meta,option.dataset.baseTitle||option.value);
      option.dataset.baseTitle=title;
      const text=`${title} (${count.toLocaleString(locale)})`;
      if(option.textContent!==text)option.textContent=text;
    });
  }
  function updateSourceDisplay(){
    updateQueued=false;
    const examModal=document.getElementById('examModal');
    const questionElement=examModal?.querySelector('.center-exam-screen .exam-question');
    const sourceElement=examModal?.querySelector('.center-exam-screen .center-source-line');
    if(questionElement&&sourceElement){
      const question=sourceMap.get(normalize(questionElement.textContent));
      if(question){
        const page=question.sourcePage?i18n.pick(` • الصفحة ${Number(question.sourcePage).toLocaleString(locale)}`,` • Page ${Number(question.sourcePage).toLocaleString(locale)}`):'';
        const timestamp=question.sourceTimestamp?i18n.pick(` • التوقيت ${question.sourceTimestamp}`,` • Timestamp ${question.sourceTimestamp}`):'';
        const source=i18n.pick(question.source||'سؤال تدريبي من المنصة',question.sourceEn||question.source||'Practice question from the platform');
        const value=`${source}${page}${timestamp}`;
        if(sourceElement.textContent!==value)sourceElement.textContent=value;
      }
    }
    repairOptionButtons(examModal||document);
    repairSetupControls();
    const testCenter=document.getElementById('test-center');
    const quduratEyebrow=testCenter?.querySelector('.qudurat-family .eyebrow');
    if(quduratEyebrow&&quduratEyebrow.textContent!=='GENERAL APTITUDE TEST')quduratEyebrow.textContent='GENERAL APTITUDE TEST';
    const audit=window.NEON_PLATFORM_AUDIT_REPORT||{};
    const health=testCenter?.querySelector('.exam-bank-health');
    if(health&&health.dataset.finalized!=='true'){
      health.dataset.finalized='true';
      const active=Number(audit.activeExamQuestions||0),invalid=Number(audit.totalInactiveRemoved||0),repaired=Number(audit.idsRepaired||0)+Number(audit.answersRepaired||0)+Number(audit.duplicateOptionsRepaired||0);
      health.innerHTML=i18n.isEnglish?`<span>✓ Question bank checked</span><span><b>${active.toLocaleString(locale)}</b> active questions</span><span><b>Duplicates processed</b></span>${repaired?`<span><b>${repaired.toLocaleString(locale)}</b> repairs</span>`:''}${invalid?`<span class="warn">${invalid.toLocaleString(locale)} invalid questions excluded</span>`:''}`:`<span>✓ تم فحص بنك الأسئلة</span><span><b>${active.toLocaleString(locale)}</b> سؤالًا فعالًا</span><span><b>تمت معالجة التكرار</b></span>${repaired?`<span><b>${repaired.toLocaleString(locale)}</b> حالة تم إصلاحها</span>`:''}${invalid?`<span class="warn">${invalid.toLocaleString(locale)} سؤالًا غير صالح تم استبعاده</span>`:''}`;
    }
    const note=testCenter?.querySelector('.exam-source-note');
    if(note&&note.dataset.importReviewApplied!=='true'){
      const report=window.NEON_EXAM_DEDUPE_REPORT||{},stats=window.NEON_IMPORTED_EXAM_SOURCE_STATS||{},visualCount=Number(stats.visualQuant||0);
      note.dataset.importReviewApplied='true';
      note.innerHTML=i18n.isEnglish?`<strong>Notice:</strong> This is unofficial practice content. ${Number(stats.total||imported.length).toLocaleString(locale)} reviewed questions were added${visualCount?`, including <b>${visualCount.toLocaleString(locale)}</b> quantitative questions with precise vector diagrams`:''}. Duplicates, answer choices, keys, and visuals are checked before questions are made available${Number(report.invalidRemoved||0)?`; ${Number(report.invalidRemoved).toLocaleString(locale)} incomplete questions were excluded`:''}.`:`<strong>تنبيه:</strong> المحتوى تدريبي غير رسمي. تمت مراجعة المرفقات وإضافة ${Number(stats.total||imported.length).toLocaleString(locale)} سؤالًا واضحًا${visualCount?`، منها <b>${visualCount.toLocaleString(locale)}</b> سؤال قدرات كمي برسومات متجهية دقيقة`:''}. يجري فحص التكرار وصحة الخيارات والإجابات والرسومات تلقائيًا قبل إتاحة الأسئلة للطالب${Number(report.invalidRemoved||0)?`، واستُبعد ${Number(report.invalidRemoved).toLocaleString(locale)} سؤالًا غير مكتمل أو غير قابل للتشغيل`:''}.`;
    }
  }
  function scheduleUpdate(){if(updateQueued)return;updateQueued=true;(window.requestAnimationFrame||(callback=>window.setTimeout(callback,16)))(updateSourceDisplay);}
  const observer=new MutationObserver(scheduleUpdate);
  const examModal=document.getElementById('examModal'),testCenter=document.getElementById('test-center');
  if(examModal)observer.observe(examModal,{childList:true,subtree:true});
  if(testCenter)observer.observe(testCenter,{childList:true,subtree:true});
  document.addEventListener('change',event=>{if(['centerFamily','centerSubject','centerCategory'].includes(event.target?.id))scheduleUpdate();},true);
  scheduleUpdate();
})();