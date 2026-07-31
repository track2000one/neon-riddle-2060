(()=>{
  'use strict';

  const PROFILE_KEY='neonRiddleGrandProfilesV4';
  const API_BASE=String(window.NEON_PROGRESS_API_BASE||'').replace(/\/$/,'');
  let activeUser=null;

  function parseJson(value,fallback){
    try{return JSON.parse(value||'')??fallback}catch{return fallback}
  }

  function safeSet(key,value){
    try{localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value))}catch{}
  }

  function queueKey(){return `neonProgressQueueV1:${activeUser?.uid||'anonymous'}`}

  function normalizeEvent(event){
    return {
      eventType:event.eventType||'activity',
      eventKey:event.eventKey||`${event.eventType||'activity'}:${event.centerId||'coding'}:${event.itemId||Date.now()}`,
      centerId:event.centerId||'coding',
      itemType:event.itemType||'activity',
      itemId:event.itemId||String(Date.now()),
      title:event.title||'',
      status:event.status||'in_progress',
      progressPercent:Number(event.progressPercent||0),
      masteryScore:Number(event.masteryScore??event.score??0),
      score:Number(event.score??event.masteryScore??0),
      subjectId:event.subjectId||'',
      correct:Number(event.correct||0),
      total:Number(event.total||0),
      durationSeconds:Number(event.durationSeconds||0),
      href:event.href||`${location.pathname}${location.search}${location.hash}`,
      position:event.position||{},
      metadata:event.metadata||{},
      details:event.details||{}
    };
  }

  async function request(event){
    if(!activeUser?.getIdToken)throw new Error('AUTH_SESSION_UNAVAILABLE');
    const token=await activeUser.getIdToken();
    const response=await fetch(`${API_BASE}/api/progress/activity`,{
      method:'POST',
      headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify(normalizeEvent(event)),
      cache:'no-store'
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`HTTP_${response.status}`);
    return data;
  }

  async function record(event){
    const normalized=normalizeEvent(event);
    try{return await request(normalized)}
    catch(error){
      if(activeUser?.uid){
        const queue=parseJson(localStorage.getItem(queueKey()),[]);
        queue.push(normalized);
        safeSet(queueKey(),queue.slice(-200));
      }
      return {ok:false,queued:true,error:error.message};
    }
  }

  async function flush(){
    if(!activeUser?.uid)return;
    const key=queueKey();
    const queue=parseJson(localStorage.getItem(key),[]);
    if(!Array.isArray(queue)||!queue.length)return;
    const remaining=[];
    for(const event of queue){
      try{await request(event)}catch{remaining.push(event)}
    }
    safeSet(key,remaining);
  }

  function academyFor(value,uid){
    const profiles=parseJson(value,{});
    return profiles?.[uid]?.academy||{};
  }

  function activeLanguage(){
    const id=document.querySelector('.language-item.active')?.dataset?.language;
    const title=document.getElementById('activeLanguageTitle')?.textContent?.trim();
    return {id:id||'coding',title:title||id||'البرمجة'};
  }

  function synchronizeProfile(previousValue,nextValue){
    if(!activeUser?.uid||document.body.dataset.center!=='coding')return;
    const before=academyFor(previousValue,activeUser.uid);
    const after=academyFor(nextValue,activeUser.uid);
    const beforeCompleted=new Set(Array.isArray(before.completed)?before.completed:[]);

    for(const lessonId of Array.isArray(after.completed)?after.completed:[]){
      if(beforeCompleted.has(lessonId))continue;
      record({
        eventType:'coding_lesson_complete',
        eventKey:`coding:lesson:${lessonId}:complete`,
        centerId:'coding',
        itemType:'lesson',
        itemId:lessonId,
        title:`درس برمجة — ${lessonId}`,
        status:'completed',
        progressPercent:100,
        masteryScore:100,
        href:'/legacy/coding.html',
        position:{lessonId},
        metadata:{source:PROFILE_KEY}
      });
    }

    if(after.lastLesson&&after.lastLesson!==before.lastLesson){
      record({
        eventType:'activity',
        eventKey:`coding:lesson:${after.lastLesson}:opened`,
        centerId:'coding',
        itemType:'lesson',
        itemId:after.lastLesson,
        title:`درس برمجة — ${after.lastLesson}`,
        status:'in_progress',
        progressPercent:10,
        href:'/legacy/coding.html',
        position:{lessonId:after.lastLesson},
        metadata:{source:PROFILE_KEY}
      });
    }

    const beforeAttempts=Number(before.domainAttempts?.coding||0);
    const afterAttempts=Number(after.domainAttempts?.coding||0);
    const beforeScore=Number(before.domainScores?.coding||0);
    const afterScore=Number(after.domainScores?.coding||0);
    const addedAttempts=Math.max(0,afterAttempts-beforeAttempts);
    const addedSuccesses=Math.max(0,Math.min(addedAttempts,afterScore-beforeScore));

    for(let offset=1;offset<=addedAttempts;offset+=1){
      const attemptNumber=beforeAttempts+offset;
      const successful=offset<=addedSuccesses;
      const language=activeLanguage();
      record({
        eventType:'activity',
        eventKey:`coding:run:${attemptNumber}`,
        centerId:'coding',
        itemType:'code_run',
        itemId:`run-${attemptNumber}`,
        title:`تشغيل ${language.title}`,
        status:'completed',
        progressPercent:100,
        masteryScore:successful?100:0,
        score:successful?100:0,
        subjectId:language.id,
        correct:successful?1:0,
        total:1,
        href:'/legacy/coding.html#coding',
        position:{language:language.id},
        metadata:{language:language.id,successful,source:PROFILE_KEY}
      });
    }
  }

  function installStorageBridge(){
    if(window.__NEON_LEGACY_PROGRESS_BRIDGE__)return;
    window.__NEON_LEGACY_PROGRESS_BRIDGE__=true;
    const previousSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function legacyProgressSetItem(key,value){
      const tracked=this===localStorage&&String(key)===PROFILE_KEY;
      const previousValue=tracked?this.getItem(PROFILE_KEY):null;
      previousSetItem.call(this,key,value);
      if(!tracked||previousValue===String(value))return;
      queueMicrotask(()=>{
        try{synchronizeProfile(previousValue,String(value))}
        catch(error){console.warn('Legacy progress bridge:',error)}
      });
    };
  }

  window.NEON_CONFIGURE_LEGACY_PROGRESS=user=>{
    activeUser=user||null;
    flush().catch(()=>{});
  };
  window.addEventListener('online',()=>flush().catch(()=>{}));
  installStorageBridge();
})();
