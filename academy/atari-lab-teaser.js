(()=>{
  'use strict';
  let observer=null;
  let attempts=0;

  function markup(){
    return `<section class="kids-atari-lab" aria-labelledby="kidsAtariLabTitle">
      <div class="kids-atari-copy">
        <span class="kids-atari-kicker">NEW EXPERIMENT • RETRO SYSTEMS</span>
        <div class="kids-atari-heading"><span class="kids-atari-2600">2600</span><div><h2 id="kidsAtariLabTitle"><span lang="en">Atari 2600</span> Retro Lab</h2><p>مكتبة محاكاة كلاسيكية جديدة داخل Msar Neon. استكشف 12 عنوانًا تجريبيًا وشغّل نسختك القانونية من ROM مباشرة في المتصفح.</p></div></div>
        <div class="kids-atari-chips"><span>Adventure</span><span>Asteroids</span><span>Breakout</span><span>Combat</span><span>+8</span></div>
        <div class="kids-atari-actions"><a href="atari-2600.html">دخول مكتبة Atari 2600 <b>←</b></a><small>لا تتضمن التجربة ملفات ROM تجارية.</small></div>
      </div>
      <div class="kids-atari-art" aria-hidden="true"><div class="kids-atari-console"><i></i><i></i><i></i><b>VIDEO COMPUTER SYSTEM</b><span>2600</span></div><div class="kids-atari-stick"><i></i><b></b></div><div class="kids-atari-rays"></div></div>
    </section>`;
  }

  function mount(){
    attempts++;
    if(document.getElementById('kidsAtariLab'))return true;
    const hub=document.getElementById('kidsGamesHub');
    const hero=hub?.querySelector('.kids-games-hero');
    if(!hub||!hero){if(attempts>240)observer?.disconnect();return false;}
    const wrapper=document.createElement('div');
    wrapper.id='kidsAtariLab';
    wrapper.innerHTML=markup();
    hero.insertAdjacentElement('afterend',wrapper);
    observer?.disconnect();
    return true;
  }

  observer=new MutationObserver(mount);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  setTimeout(()=>observer?.disconnect(),25000);
})();
