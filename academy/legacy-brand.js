(()=>{
  'use strict';
  const BRAND_AR='مسار نيون';
  const BRAND_EN='MSAR NEON';
  const replacements=new Map([
    ['MASAR NEON',BRAND_EN],
    ['NEON ACADEMY 2060',BRAND_EN],
    ['NEON Academy 2060',BRAND_EN],
    ['ACADEMY 2060','LEARN • PLAY • BUILD'],
    ['الغرفة 2060',`غرفة ${BRAND_AR}`],
    ['غرفة NEON',`غرفة ${BRAND_AR}`],
    ['بطولة 2060',`بطولة ${BRAND_AR}`],
    ['بطولة NEON',`بطولة ${BRAND_AR}`]
  ]);

  function setText(element,value){if(element&&element.textContent!==value)element.textContent=value;}

  function ensureHead(){
    const nextTitle=document.title.replaceAll('MASAR NEON',BRAND_EN).replaceAll('NEON Academy 2060',BRAND_AR).replaceAll('NEON ACADEMY 2060',BRAND_EN).replaceAll(' | NEON',` | ${BRAND_AR}`);
    if(document.title!==nextTitle)document.title=nextTitle;
    const description=document.querySelector('meta[name="description"]');
    if(description){
      const nextDescription=description.content.replaceAll('MASAR NEON',BRAND_EN).replaceAll('NEON Academy 2060',BRAND_AR).replaceAll('NEON ACADEMY 2060',BRAND_EN).replaceAll('NEON',BRAND_AR);
      if(description.content!==nextDescription)description.content=nextDescription;
    }
    if(!document.querySelector('link[data-neon-favicon]')){
      const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href='favicon.svg';icon.dataset.neonFavicon='true';document.head.appendChild(icon);
    }
    if(!document.getElementById('neonLegacyBrandStyle')){
      const style=document.createElement('style');style.id='neonLegacyBrandStyle';
      style.textContent='.neon-brand-img{width:52px;height:52px;display:block;object-fit:contain;filter:drop-shadow(0 0 13px rgba(99,231,255,.28))}.auth-brand .neon-brand-img{width:58px;height:58px}.mobile-brand .neon-brand-img{width:38px;height:38px}.academy-core,.showcase-orbit .orbit-core{background:transparent!important;box-shadow:none!important}.academy-core .neon-core-logo,.showcase-orbit .neon-core-logo{width:100%;height:100%;display:block;object-fit:contain}.academy-core{padding:0!important;transform:none!important}.brand strong,.auth-brand strong{letter-spacing:0}.brand small,.auth-brand small{letter-spacing:.12em}';
      document.head.appendChild(style);
    }
  }

  function replaceText(root){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{let value=node.nodeValue||'';replacements.forEach((to,from)=>{value=value.replaceAll(from,to)});if(value!==node.nodeValue)node.nodeValue=value;});
  }

  function logoImage(className='neon-brand-img'){
    const img=document.createElement('img');img.src='neon-logo.svg';img.alt=`شعار ${BRAND_AR}`;img.className=className;return img;
  }

  function apply(){
    ensureHead();replaceText(document.body);
    document.querySelectorAll('.brand,.auth-brand').forEach(brand=>{
      const mark=brand.querySelector('.brand-mark');if(mark&&!brand.querySelector('.neon-brand-img'))mark.replaceWith(logoImage());
      setText(brand.querySelector('strong'),BRAND_AR);
      setText(brand.querySelector('small'),`${BRAND_EN} • LEARN • PLAY • BUILD`);
    });
    document.querySelectorAll('.academy-core').forEach(core=>{if(!core.querySelector('.neon-core-logo'))core.replaceChildren(logoImage('neon-core-logo'));});
    document.querySelectorAll('.showcase-orbit .orbit-core').forEach(core=>{if(!core.querySelector('.neon-core-logo'))core.replaceChildren(logoImage('neon-core-logo'));});
    document.querySelectorAll('.mobile-brand').forEach(brand=>{
      const first=brand.firstElementChild;if(first&&!first.classList.contains('neon-brand-img'))first.replaceWith(logoImage());
      setText(brand.querySelector('strong'),BRAND_AR);
    });
  }

  apply();let scheduled=false;
  new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply()});}).observe(document.documentElement,{childList:true,subtree:true});
})();
