(()=>{
  'use strict';

  const CATALOG=[
    {id:'adventure',title:'Adventure',genre:'مغامرات',category:'adventure',glyph:'◆',accent:'gold',hint:'استكشاف متاهات وقلاع وجمع عناصر.'},
    {id:'asteroids',title:'Asteroids',genre:'أركيد فضائي',category:'arcade',glyph:'✦',accent:'cyan',hint:'مواجهة كويكبات في جولات أركيد سريعة.'},
    {id:'breakout',title:'Breakout',genre:'مهارة ورد فعل',category:'arcade',glyph:'▦',accent:'orange',hint:'تحكم دقيق بالمضرب وكسر صفوف الحواجز.'},
    {id:'combat',title:'Combat',genre:'مواجهة كلاسيكية',category:'action',glyph:'▲',accent:'red',hint:'مواجهات قصيرة بطابع Atari الكلاسيكي.'},
    {id:'missile-command',title:'Missile Command',genre:'استراتيجية أركيد',category:'strategy',glyph:'⌁',accent:'violet',hint:'دفاع سريع واتخاذ قرار تحت الضغط.'},
    {id:'space-invaders',title:'Space Invaders',genre:'أركيد',category:'arcade',glyph:'▣',accent:'lime',hint:'موجات متدرجة من الأهداف بأسلوب كلاسيكي.'},
    {id:'yars-revenge',title:"Yars' Revenge",genre:'أكشن فضائي',category:'action',glyph:'✺',accent:'pink',hint:'حركة وهجوم وتوقيت في ساحة فضائية.'},
    {id:'centipede',title:'Centipede',genre:'أركيد',category:'arcade',glyph:'•••',accent:'green',hint:'رد فعل سريع وتتبع أهداف متحركة.'},
    {id:'river-raid',title:'River Raid',genre:'أكشن',category:'action',glyph:'≈',accent:'blue',hint:'رحلة سريعة عبر مسارات ضيقة ومتغيرة.'},
    {id:'pitfall',title:'Pitfall!',genre:'مغامرات',category:'adventure',glyph:'♢',accent:'amber',hint:'قفز واستكشاف وتوقيت عبر مراحل متتابعة.'},
    {id:'frogger',title:'Frogger',genre:'مهارة',category:'arcade',glyph:'＋',accent:'emerald',hint:'توقيت الحركة والعبور الآمن عبر مسارات متعددة.'},
    {id:'pac-man',title:'Pac-Man',genre:'متاهة',category:'strategy',glyph:'◒',accent:'yellow',hint:'تنقل داخل متاهة وجمع عناصر مع إدارة المسار.'}
  ];

  const state={query:'',category:'all',selected:null,objectUrl:null};
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];

  function normalize(value){
    return String(value||'').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').trim();
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>'"]/g,char=>({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    })[char]);
  }

  function visibleGames(){
    const q=normalize(state.query);
    return CATALOG.filter(game=>{
      const category=state.category==='all'||game.category===state.category;
      const haystack=normalize(`${game.title} ${game.genre} ${game.hint}`);
      return category&&(!q||haystack.includes(q));
    });
  }

  function cardMarkup(game,index){
    return `<article class="atari-game-card accent-${game.accent}" data-game-id="${escapeHtml(game.id)}" style="--delay:${index*35}ms">
      <div class="atari-cover" aria-hidden="true">
        <span class="scan"></span>
        <b>${escapeHtml(game.glyph)}</b>
        <i></i><i></i><i></i>
      </div>
      <div class="atari-game-copy">
        <span class="atari-genre">${escapeHtml(game.genre)}</span>
        <h3 lang="en">${escapeHtml(game.title)}</h3>
        <p>${escapeHtml(game.hint)}</p>
        <button type="button" class="atari-select-game" data-select-game="${escapeHtml(game.id)}">اختيار وتشغيل ROM</button>
      </div>
    </article>`;
  }

  function renderCatalog(){
    const grid=$('#atariCatalogGrid');
    const count=$('#atariVisibleCount');
    if(!grid)return;
    const games=visibleGames();
    if(count)count.textContent=games.length.toLocaleString('ar-SA');
    grid.innerHTML=games.length?games.map(cardMarkup).join(''):`<div class="atari-empty"><b>لا توجد نتيجة</b><br><span>غيّر البحث أو نوع اللعبة.</span></div>`;
  }

  function selectGame(id){
    state.selected=CATALOG.find(game=>game.id===id)||null;
    const title=$('#selectedGameTitle');
    const meta=$('#selectedGameMeta');
    if(title)title.textContent=state.selected?state.selected.title:'أي لعبة متوافقة';
    if(meta)meta.textContent=state.selected?`${state.selected.genre} — اختر نسخة ROM التي يحق لك استخدامها.`:'اختر لعبة من الكتالوج أو حمّل ROM مباشرة.';
    $$('.atari-game-card').forEach(card=>card.classList.toggle('selected',card.dataset.gameId===id));
    $('#atariPlayerSection')?.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(()=>$('#romInput')?.focus({preventScroll:true}),500);
  }

  function setStatus(message,type='info'){
    const box=$('#atariStatus');
    if(!box)return;
    box.dataset.type=type;
    box.textContent=message;
  }

  function validateRom(file){
    if(!file)return 'لم يتم اختيار ملف.';
    const ext=(file.name.split('.').pop()||'').toLowerCase();
    const allowed=['a26','bin','rom','zip','7z','rar'];
    if(!allowed.includes(ext))return 'صيغة الملف غير معتادة لهذه التجربة. استخدم A26 أو BIN أو ROM أو ملفًا مضغوطًا مدعومًا.';
    if(file.size>32*1024*1024)return 'حجم الملف أكبر من الحد التجريبي (32 MB).';
    return '';
  }

  function safeGameName(file){
    return String(file.name||'atari2600').replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,80)||'atari2600';
  }

  function buildPlayerDocument(romUrl,file){
    const gameName=safeGameName(file);
    const urlJson=JSON.stringify(romUrl).replace(/</g,'\\u003c');
    const nameJson=JSON.stringify(gameName).replace(/</g,'\\u003c');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#02050a;height:100%;overflow:hidden}#game{width:100%;height:100%;min-height:420px}</style></head><body><div id="game"></div><script>window.EJS_player='#game';window.EJS_core='atari2600';window.EJS_gameUrl=${urlJson};window.EJS_gameName=${nameJson};window.EJS_pathtodata='https://cdn.emulatorjs.org/stable/data/';window.EJS_startOnLoaded=true;<\/script><script src="https://cdn.emulatorjs.org/stable/data/loader.js"><\/script></body></html>`;
  }

  function launchRom(file){
    const error=validateRom(file);
    if(error){setStatus(error,'error');return;}

    if(state.objectUrl)URL.revokeObjectURL(state.objectUrl);
    state.objectUrl=URL.createObjectURL(file);

    const frame=$('#atariEmulatorFrame');
    const placeholder=$('#playerPlaceholder');
    if(!frame)return;
    frame.srcdoc=buildPlayerDocument(state.objectUrl,file);
    frame.hidden=false;
    if(placeholder)placeholder.hidden=true;

    const name=$('#loadedRomName');
    if(name)name.textContent=file.name;
    const size=$('#loadedRomSize');
    if(size)size.textContent=`${Math.max(1,Math.round(file.size/1024)).toLocaleString('ar-SA')} KB`;
    setStatus('تم تجهيز ROM داخل جلسة المتصفح. إذا لم يبدأ تلقائيًا، استخدم زر التشغيل داخل المحاكي.','success');
    $('#playerResetButton')?.removeAttribute('disabled');
    window.gtag?.('event','atari2600_rom_loaded',{file_extension:(file.name.split('.').pop()||'').toLowerCase(),app_name:'neon_academy_2060'});
  }

  function resetPlayer(){
    const frame=$('#atariEmulatorFrame');
    if(frame){frame.srcdoc='';frame.hidden=true;}
    $('#playerPlaceholder')?.removeAttribute('hidden');
    if(state.objectUrl){URL.revokeObjectURL(state.objectUrl);state.objectUrl=null;}
    const input=$('#romInput');
    if(input)input.value='';
    const name=$('#loadedRomName');if(name)name.textContent='لا يوجد';
    const size=$('#loadedRomSize');if(size)size.textContent='—';
    setStatus('المحاكي جاهز. اختر ROM من جهازك للبدء.','info');
    $('#playerResetButton')?.setAttribute('disabled','disabled');
  }

  function bindDropzone(){
    const zone=$('#romDropzone');
    const input=$('#romInput');
    if(!zone||!input)return;
    zone.addEventListener('click',event=>{if(!event.target.closest('a,button'))input.click();});
    zone.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&!event.target.closest('button')){event.preventDefault();input.click();}});
    input.addEventListener('change',()=>launchRom(input.files?.[0]));
    ['dragenter','dragover'].forEach(name=>zone.addEventListener(name,event=>{event.preventDefault();zone.classList.add('dragging');}));
    ['dragleave','drop'].forEach(name=>zone.addEventListener(name,event=>{event.preventDefault();zone.classList.remove('dragging');}));
    zone.addEventListener('drop',event=>launchRom(event.dataTransfer?.files?.[0]));
  }

  function bindFilters(){
    $('#atariSearch')?.addEventListener('input',event=>{state.query=event.target.value;renderCatalog();});
    $('#atariCategoryFilters')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-category]');
      if(!button)return;
      state.category=button.dataset.category;
      $$('#atariCategoryFilters [data-category]').forEach(item=>item.classList.toggle('active',item===button));
      renderCatalog();
    });
  }

  function bindActions(){
    $('#atariCatalogGrid')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-select-game]');
      if(button)selectGame(button.dataset.selectGame);
    });
    $('#playerResetButton')?.addEventListener('click',resetPlayer);
    $('#focusPlayerButton')?.addEventListener('click',()=>$('#atariEmulatorFrame')?.focus());
    window.addEventListener('gamepadconnected',()=>{const el=$('#gamepadState');if(el)el.textContent='يد تحكم متصلة';});
    window.addEventListener('gamepaddisconnected',()=>{const el=$('#gamepadState');if(el)el.textContent='لا توجد يد تحكم';});
    window.addEventListener('beforeunload',()=>{if(state.objectUrl)URL.revokeObjectURL(state.objectUrl);});
  }

  function init(){
    renderCatalog();
    bindFilters();
    bindDropzone();
    bindActions();
    resetPlayer();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
