(()=>{
  'use strict';

  const GAMES=[
    {
      id:'letters-quest',title:'مغامرة الحروف',icon:'أ ب',badge:'للصغار',
      categories:['educational'],categoryLabel:'تعليمية',minAge:5,maxAge:8,difficulty:'سهل',duration:8,
      skill:'اللغة والقراءة',tags:['لغة عربية','مفردات'],searchTerm:'ألغاز كلمات',
      description:'رحلة مرحة لتكوين الكلمات، اكتشاف الحروف الناقصة، وربط الصورة بالكلمة الصحيحة.',
      goal:'تنمية الوعي الصوتي، توسيع المفردات، ورفع سرعة التعرّف على الحروف والكلمات.',
      colors:['#ff78c8','#8a6cff']
    },
    {
      id:'number-rush',title:'سباق الأرقام',icon:'1 2 3',badge:'تعلم سريع',
      categories:['educational'],categoryLabel:'تعليمية',minAge:6,maxAge:10,difficulty:'سهل',duration:7,
      skill:'الحساب الذهني',tags:['رياضيات','سرعة'],searchTerm:'ألغاز حساب',
      description:'جولات قصيرة مليئة بالجمع والطرح والأنماط العددية مع مكافآت عند الإجابات المتتالية.',
      goal:'تحسين الطلاقة العددية، الدقة، والقدرة على اكتشاف النمط بسرعة.',
      colors:['#ffd75f','#ff8c5a']
    },
    {
      id:'robot-memory',title:'ذاكرة الروبوت',icon:'🤖',badge:'الأكثر لعبًا',
      categories:['educational','entertainment'],categoryLabel:'تعليمية وترفيهية',minAge:6,maxAge:12,difficulty:'متوسط',duration:6,
      skill:'الذاكرة والتركيز',tags:['ذاكرة','انتباه'],searchTerm:'الذاكرة',
      description:'تذكّر بطاقات الروبوتات ومسارات الطاقة قبل اختفائها، ثم أعد ترتيبها بدقة.',
      goal:'تقوية الذاكرة البصرية، الانتباه للتفاصيل، والاسترجاع المتسلسل.',
      colors:['#66edff','#3977ff']
    },
    {
      id:'eagle-eye',title:'عين الصقر',icon:'👁️',badge:'تحدي بصري',
      categories:['entertainment'],categoryLabel:'ترفيهية',minAge:7,maxAge:12,difficulty:'متوسط',duration:6,
      skill:'سرعة الملاحظة',tags:['ملاحظة','تركيز'],searchTerm:'سرعة الملاحظة',
      description:'اكتشف الرمز المختلف والتفاصيل المخفية قبل انتهاء المؤقت في مشاهد نيون متغيرة.',
      goal:'رفع سرعة المعالجة البصرية وتحسين الانتباه الانتقائي.',
      colors:['#63f2a9','#1cae89']
    },
    {
      id:'neon-maze',title:'متاهة النيون',icon:'⌁',badge:'مغامرة',
      categories:['entertainment'],categoryLabel:'ترفيهية',minAge:8,maxAge:14,difficulty:'متوسط',duration:10,
      skill:'التخطيط المكاني',tags:['متاهة','تخطيط'],searchTerm:'حل المتاهة',
      description:'وجّه المركبة عبر بوابات متحركة، اجمع البلورات، واختر أقصر مسار للخروج.',
      goal:'تطوير التخطيط المسبق، الإدراك المكاني، واتخاذ القرار.',
      colors:['#a872ff','#5d5bff']
    },
    {
      id:'planet-mission',title:'مهمة الكواكب',icon:'🪐',badge:'علوم ممتعة',
      categories:['educational'],categoryLabel:'تعليمية',minAge:7,maxAge:12,difficulty:'متوسط',duration:10,
      skill:'العلوم والاستكشاف',tags:['فضاء','علوم'],searchTerm:'المحطة الفضائية',
      description:'أصلح المحطة الفضائية بالإجابة عن أسئلة الكواكب والجاذبية والطاقة.',
      goal:'ربط مفاهيم الفضاء والعلوم بمهمات قصصية قصيرة ومحفزة.',
      colors:['#57d8ff','#8d62ff']
    },
    {
      id:'digital-vault',title:'الخزنة الرقمية',icon:'🔐',badge:'للمتقدمين',
      categories:['educational'],categoryLabel:'تعليمية',minAge:9,maxAge:14,difficulty:'صعب',duration:12,
      skill:'المنطق والتقنية',tags:['تقنية','رموز'],searchTerm:'الخزنة الرقمية',
      description:'فك الشفرات، تعرّف على أوامر بسيطة، وافتح أقفال الخزنة قبل انتهاء الطاقة.',
      goal:'تعزيز التفكير المنطقي، الثقافة الرقمية، وتسلسل خطوات الحل.',
      colors:['#ff6fae','#ff4e74']
    },
    {
      id:'logic-city',title:'مدينة المنطق',icon:'🧠',badge:'ذكاء',
      categories:['educational','entertainment'],categoryLabel:'تعليمية وترفيهية',minAge:9,maxAge:14,difficulty:'صعب',duration:11,
      skill:'الاستدلال',tags:['منطق','استنتاج'],searchTerm:'ألغاز منطق',
      description:'حل قضايا المدينة عبر ترتيب الأدلة، استبعاد الاحتمالات، والوصول إلى الاستنتاج الصحيح.',
      goal:'تطوير الاستدلال، تحليل الأدلة، وبناء قرارات مبنية على المعطيات.',
      colors:['#ff9e59','#ff5a82']
    },
    {
      id:'family-challenge',title:'تحدي العائلة',icon:'👨‍👩‍👧‍👦',badge:'لجميع أفراد الأسرة',
      categories:['family','entertainment'],categoryLabel:'عائلية',minAge:6,maxAge:14,difficulty:'متدرج',duration:15,
      skill:'التعاون والمعرفة',tags:['عائلة','مسابقة'],searchTerm:'مسابقة العائلة',
      description:'أسئلة وتحديات سريعة يتناوب عليها أفراد العائلة لجمع أعلى رصيد جماعي.',
      goal:'تعزيز المشاركة، الحوار، والتعلم الاجتماعي بطريقة ممتعة.',
      colors:['#70e8c0','#36b9d4']
    },
    {
      id:'daily-flame',title:'شعلة اليوم',icon:'🔥',badge:'يتجدد يوميًا',
      categories:['educational','entertainment'],categoryLabel:'تحدٍ يومي',minAge:8,maxAge:14,difficulty:'متغير',duration:5,
      skill:'تنوع المهارات',tags:['يومي','مكافآت'],searchTerm:'تحدي اليوم',
      description:'مهمة قصيرة جديدة كل يوم تجمع سؤال معرفة ولغزًا ذهنيًا وتحديًا سريعًا.',
      goal:'بناء عادة تعلم يومية والمحافظة على سلسلة الإنجاز.',
      colors:['#ffbf58','#ff617a']
    }
  ];

  const state={category:'all',age:'all',query:''};
  let observer=null;
  let attempts=0;

  function escapeHtml(value){
    return String(value??'').replace(/[&<>'"]/g,char=>({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    })[char]);
  }

  function normalize(value){
    return String(value||'').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').trim();
  }

  function ageMatches(game,filter){
    if(filter==='all')return true;
    const [min,max]=filter.split('-').map(Number);
    return game.minAge<=max&&game.maxAge>=min;
  }

  function filteredGames(){
    const query=normalize(state.query);
    return GAMES.filter(game=>{
      const categoryMatch=state.category==='all'||game.categories.includes(state.category);
      const ageMatch=ageMatches(game,state.age);
      const haystack=normalize(`${game.title} ${game.description} ${game.skill} ${game.tags.join(' ')}`);
      return categoryMatch&&ageMatch&&(!query||haystack.includes(query));
    });
  }

  function renderCard(game){
    return `
      <article class="kids-game-card" style="--game-a:${game.colors[0]};--game-b:${game.colors[1]}" data-kids-card="${escapeHtml(game.id)}">
        <div class="kids-game-visual" aria-hidden="true">
          <span class="kids-game-badge">${escapeHtml(game.badge)}</span>
          <span class="kids-orbit kids-orbit-a"></span><span class="kids-orbit kids-orbit-b"></span>
          <div class="kids-game-icon">${escapeHtml(game.icon)}</div>
          <span class="kids-spark spark-a">✦</span><span class="kids-spark spark-b">•</span><span class="kids-spark spark-c">✧</span>
        </div>
        <div class="kids-game-body">
          <div class="kids-game-kicker"><span>${escapeHtml(game.categoryLabel)}</span><span>${escapeHtml(game.difficulty)}</span></div>
          <h3>${escapeHtml(game.title)}</h3>
          <p>${escapeHtml(game.description)}</p>
          <div class="kids-game-meta" aria-label="معلومات اللعبة">
            <span><b>العمر</b>${game.minAge}–${game.maxAge}</span>
            <span><b>المدة</b>${game.duration} د</span>
            <span><b>المهارة</b>${escapeHtml(game.skill)}</span>
          </div>
          <div class="kids-game-tags">${game.tags.map(tag=>`<span>${escapeHtml(tag)}</span>`).join('')}</div>
          <div class="kids-game-actions">
            <button class="kids-play-button" type="button" data-kids-start="${escapeHtml(game.id)}"><span>ابدأ اللعب</span><b>←</b></button>
            <button class="kids-details-button" type="button" data-kids-details="${escapeHtml(game.id)}" aria-label="عرض تفاصيل ${escapeHtml(game.title)}">التفاصيل</button>
          </div>
        </div>
      </article>`;
  }

  function renderGrid(){
    const grid=document.getElementById('kidsGamesGrid');
    const count=document.getElementById('kidsGamesCount');
    if(!grid||!count)return;
    const visible=filteredGames();
    count.textContent=visible.length.toLocaleString('ar-SA');
    grid.innerHTML=visible.length?visible.map(renderCard).join(''):`<div class="kids-games-empty"><span>🧭</span><h3>لا توجد لعبة مطابقة</h3><p>جرّب تغيير العمر أو نوع اللعبة أو عبارة البحث.</p><button type="button" id="kidsResetFilters">إظهار جميع الألعاب</button></div>`;
  }

  function renderHub(library){
    if(document.getElementById('kidsGamesHub'))return true;
    const hub=document.createElement('div');
    hub.id='kidsGamesHub';
    hub.className='kids-games-hub';
    hub.setAttribute('role','region');
    hub.setAttribute('aria-labelledby','kidsGamesTitle');
    hub.innerHTML=`
      <div class="kids-games-hero">
        <div class="kids-games-hero-copy">
          <span class="kids-games-eyebrow">NEON KIDS PLAYGROUND</span>
          <h1 id="kidsGamesTitle">عالم ألعاب الأطفال</h1>
          <p>ألعاب تعليمية وترفيهية مصممة لتجمع المتعة بالتعلّم، مع مستويات واضحة ومعلومات مناسبة للعمر والمهارة.</p>
          <div class="kids-safety-pills"><span>✓ تجربة مناسبة للأطفال</span><span>✓ تقدم محفوظ</span><span>✓ تصميم عربي متجاوب</span></div>
        </div>
        <div class="kids-games-hero-art" aria-hidden="true">
          <div class="kids-planet">🎮</div><span class="kids-hero-star star-one">✦</span><span class="kids-hero-star star-two">★</span><span class="kids-hero-star star-three">•</span>
        </div>
        <div class="kids-games-stats">
          <span><b>${GAMES.length.toLocaleString('ar-SA')}</b> ألعاب مختارة</span>
          <span><b>٣</b> أنماط لعب</span>
          <span><b>٥–١٤</b> سنة</span>
        </div>
      </div>

      <div class="kids-games-toolbar">
        <div class="kids-category-filters" role="group" aria-label="تصفية حسب نوع اللعبة">
          <button class="active" type="button" data-kids-category="all">الكل</button>
          <button type="button" data-kids-category="educational">تعليمية</button>
          <button type="button" data-kids-category="entertainment">ترفيهية</button>
          <button type="button" data-kids-category="family">عائلية</button>
        </div>
        <label class="kids-search"><span>⌕</span><input id="kidsGameSearch" type="search" placeholder="ابحث عن لعبة أو مهارة..." autocomplete="off"></label>
        <label class="kids-age-filter"><span>العمر</span><select id="kidsAgeFilter"><option value="all">كل الأعمار</option><option value="5-7">٥–٧ سنوات</option><option value="8-10">٨–١٠ سنوات</option><option value="11-14">١١–١٤ سنة</option></select></label>
        <div class="kids-result-count"><b id="kidsGamesCount">${GAMES.length.toLocaleString('ar-SA')}</b><span>لعبة ظاهرة</span></div>
      </div>

      <div id="kidsGamesGrid" class="kids-games-grid"></div>
    `;
    const heading=library.querySelector('.section-heading');
    if(heading)library.insertBefore(hub,heading);else library.prepend(hub);
    renderGrid();
    bindHubEvents(hub);
    return true;
  }

  function bindHubEvents(hub){
    hub.addEventListener('click',event=>{
      const categoryButton=event.target.closest('[data-kids-category]');
      if(categoryButton){
        state.category=categoryButton.dataset.kidsCategory;
        hub.querySelectorAll('[data-kids-category]').forEach(button=>button.classList.toggle('active',button===categoryButton));
        renderGrid();
        return;
      }
      const startButton=event.target.closest('[data-kids-start]');
      if(startButton){
        const game=GAMES.find(item=>item.id===startButton.dataset.kidsStart);
        if(game)startGame(game);
        return;
      }
      const detailsButton=event.target.closest('[data-kids-details]');
      if(detailsButton){
        const game=GAMES.find(item=>item.id===detailsButton.dataset.kidsDetails);
        if(game)openDetails(game);
        return;
      }
      if(event.target.closest('#kidsResetFilters'))resetFilters(hub);
    });

    hub.querySelector('#kidsGameSearch')?.addEventListener('input',event=>{
      state.query=event.target.value;
      renderGrid();
    });
    hub.querySelector('#kidsAgeFilter')?.addEventListener('change',event=>{
      state.age=event.target.value;
      renderGrid();
    });
  }

  function resetFilters(hub){
    state.category='all';state.age='all';state.query='';
    hub.querySelectorAll('[data-kids-category]').forEach(button=>button.classList.toggle('active',button.dataset.kidsCategory==='all'));
    const search=hub.querySelector('#kidsGameSearch');
    const age=hub.querySelector('#kidsAgeFilter');
    if(search)search.value='';
    if(age)age.value='all';
    renderGrid();
  }

  function startGame(game){
    const area=document.getElementById('areaFilter');
    const subject=document.getElementById('subjectFilter');
    const level=document.getElementById('levelFilter');
    const search=document.getElementById('searchInput');
    if(area){area.value='games';area.dispatchEvent(new Event('change',{bubbles:true}));}
    if(subject){subject.value='all';subject.dispatchEvent(new Event('change',{bubbles:true}));}
    if(level){level.value='all';level.dispatchEvent(new Event('change',{bubbles:true}));}
    if(search){search.value=game.searchTerm;search.dispatchEvent(new Event('input',{bubbles:true}));}

    setTimeout(()=>{
      const button=document.querySelector('#lessonGrid [data-open-lesson]');
      if(button){button.click();}
      else document.getElementById('library')?.scrollIntoView({behavior:'smooth',block:'start'});
    },80);

    window.gtag?.('event','kids_game_started',{game_id:game.id,game_title:game.title,app_name:'neon_academy_2060'});
  }

  function ensureModal(){
    let modal=document.getElementById('kidsGameDetailsModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='kidsGameDetailsModal';
    modal.className='kids-game-modal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<div class="kids-game-modal-panel" role="dialog" aria-modal="true" aria-labelledby="kidsModalTitle"><button class="kids-modal-close" type="button" aria-label="إغلاق">×</button><div id="kidsModalContent"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',event=>{
      if(event.target===modal||event.target.closest('.kids-modal-close'))closeModal();
      const start=event.target.closest('[data-kids-modal-start]');
      if(start){
        const game=GAMES.find(item=>item.id===start.dataset.kidsModalStart);
        closeModal();
        if(game)startGame(game);
      }
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&modal.classList.contains('open'))closeModal();});
    return modal;
  }

  function openDetails(game){
    const modal=ensureModal();
    const content=modal.querySelector('#kidsModalContent');
    content.innerHTML=`
      <div class="kids-modal-visual" style="--game-a:${game.colors[0]};--game-b:${game.colors[1]}"><span>${escapeHtml(game.icon)}</span></div>
      <div class="kids-modal-copy">
        <span class="kids-games-eyebrow">بطاقة اللعبة</span>
        <h2 id="kidsModalTitle">${escapeHtml(game.title)}</h2>
        <p>${escapeHtml(game.description)}</p>
        <div class="kids-modal-info">
          <span><small>الفئة العمرية</small><b>${game.minAge}–${game.maxAge} سنة</b></span>
          <span><small>المدة المتوقعة</small><b>${game.duration} دقائق</b></span>
          <span><small>مستوى الصعوبة</small><b>${escapeHtml(game.difficulty)}</b></span>
          <span><small>المهارة الرئيسة</small><b>${escapeHtml(game.skill)}</b></span>
        </div>
        <div class="kids-modal-goal"><b>الهدف التعليمي والترفيهي</b><p>${escapeHtml(game.goal)}</p></div>
        <button class="kids-play-button kids-modal-start" type="button" data-kids-modal-start="${escapeHtml(game.id)}"><span>ابدأ ${escapeHtml(game.title)}</span><b>←</b></button>
      </div>`;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('kids-modal-open');
    setTimeout(()=>modal.querySelector('.kids-modal-close')?.focus(),30);
  }

  function closeModal(){
    const modal=document.getElementById('kidsGameDetailsModal');
    if(!modal)return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('kids-modal-open');
  }

  function tryMount(){
    attempts++;
    if(document.body.dataset.center!=='games')return false;
    const library=document.getElementById('library');
    if(!library||!window.NEON_ACADEMY){
      if(attempts>240&&observer)observer.disconnect();
      return false;
    }
    const mounted=renderHub(library);
    if(mounted&&observer)observer.disconnect();
    return mounted;
  }

  observer=new MutationObserver(tryMount);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tryMount,{once:true});
  else tryMount();
  setTimeout(()=>observer?.disconnect(),25000);
})();