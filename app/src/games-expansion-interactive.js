import './games-expansion-v2.css';
import { expandedGameQuestions } from './games-expansion-data.js';
import { hiddenArtMarkup } from './games-hidden-art.js';

const STORAGE_KEY = 'neonGamesExpansionProgressV1';
const banks = Object.fromEntries(['cross','visual','hidden','lateral'].map(cat => [cat, expandedGameQuestions.filter(q => q.cat === cat)]));
let category = null;
let index = 0;
let hiddenReveal = 0;
let crossHints = 0;
let crossState = null;

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'})[ch]);
const norm = value => String(value || '').trim().replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي');
const key = (r,c) => `${r}:${c}`;

function progress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function firstIncomplete(cat) {
  const done = new Set(progress().completed?.[cat] || []);
  const found = banks[cat].findIndex(q => !done.has(q.id));
  return found < 0 ? 0 : found;
}

function current() { return banks[category]?.[index] || null; }
function deferEnhance() { requestAnimationFrame(() => requestAnimationFrame(enhanceCurrent)); }

function clue(q) {
  return String(q.q || '').replace(/^أكمل الخانة من الدليل:\s*«/,'').replace(/»\s*$/,'');
}

function wordCells(word,row,col,orientation) {
  const dr = orientation === 'down' ? 1 : 0;
  const dc = orientation === 'across' ? -1 : 0;
  return Array.from(word).map((letter,i)=>({row:row+dr*i,col:col+dc*i,letter}));
}

function canPlace(grid,word,row,col,orientation,size) {
  const cells = wordCells(word,row,col,orientation);
  if (cells.some(c => c.row<0 || c.row>=size || c.col<0 || c.col>=size)) return false;
  if (grid.size && !cells.some(c => grid.has(key(c.row,c.col)))) return false;
  return cells.every(c => !grid.has(key(c.row,c.col)) || grid.get(key(c.row,c.col)) === c.letter);
}

function buildCrossword(stage) {
  const size=13, grid=new Map(), placed=[];
  const candidates=Array.from({length:12},(_,offset)=>banks.cross[(stage+offset)%banks.cross.length]);
  const first=candidates.shift();
  const firstWord=first.options[first.answer];
  const firstRow=Math.floor(size/2);
  const firstCol=Math.max(firstWord.length-1,Math.min(size-2,Math.floor(size/2)+Math.floor(firstWord.length/2)));
  const commit=(q,word,row,col,orientation)=>{
    wordCells(word,row,col,orientation).forEach(c=>grid.set(key(c.row,c.col),c.letter));
    placed.push({q,word,row,col,orientation});
  };
  commit(first,firstWord,firstRow,firstCol,'across');
  for (const q of candidates) {
    if (placed.length>=5) break;
    const word=q.options[q.answer];
    const orientations=placed.filter(x=>x.orientation==='down').length<=placed.filter(x=>x.orientation==='across').length?['down','across']:['across','down'];
    let done=false;
    for (const orientation of orientations) {
      for (const [gridKey,letter] of grid) {
        const [tr,tc]=gridKey.split(':').map(Number);
        for (let wi=0;wi<word.length;wi++) {
          if (word[wi]!==letter) continue;
          const dr=orientation==='down'?1:0, dc=orientation==='across'?-1:0;
          const row=tr-dr*wi, col=tc-dc*wi;
          if (!canPlace(grid,word,row,col,orientation,size)) continue;
          commit(q,word,row,col,orientation); done=true; break;
        }
        if (done) break;
      }
      if (done) break;
    }
  }
  const coords=[...grid.keys()].map(k=>k.split(':').map(Number));
  const minR=Math.max(0,Math.min(...coords.map(x=>x[0]))-1), maxR=Math.min(size-1,Math.max(...coords.map(x=>x[0]))+1);
  const minC=Math.max(0,Math.min(...coords.map(x=>x[1]))-1), maxC=Math.min(size-1,Math.max(...coords.map(x=>x[1]))+1);
  const starts=new Map();
  placed.forEach((w,i)=>{const k=key(w.row,w.col); starts.set(k,[...(starts.get(k)||[]),i+1]);});
  return {grid,placed,minR,maxR,minC,maxC,starts};
}

function crossHtml() {
  crossState=buildCrossword(index);
  const s=crossState, cells=[];
  for(let r=s.minR;r<=s.maxR;r++) for(let c=s.minC;c<=s.maxC;c++) {
    const k=key(r,c), letter=s.grid.get(k), number=s.starts.get(k)?.join('/')||'';
    cells.push(letter?`<label class="cross-cell cross-letter-cell">${number?`<small>${number}</small>`:''}<input maxlength="1" data-cross-key="${k}" data-cross-expected="${esc(letter)}" autocomplete="off" spellcheck="false" aria-label="حرف في شبكة الكلمات"></label>`:'<span class="cross-cell cross-block"></span>');
  }
  const clues=s.placed.map((w,i)=>`<li><b>${i+1}</b><span>${w.orientation==='across'?'أفقي':'رأسي'}</span><p>${esc(clue(w.q))}</p></li>`).join('');
  return `<div class="crossword-game"><div class="crossword-toolbar"><div><span>▦ CROSSWORD GRID</span><strong>أكمل خمس كلمات متقاطعة</strong></div><button class="cross-hint-button" data-cross-hint>💡 كشف حرف</button></div><div class="crossword-layout"><div class="crossword-board-wrap"><div class="crossword-board" style="--cross-cols:${s.maxC-s.minC+1}">${cells.join('')}</div><p class="crossword-note">الأفقي يُقرأ من اليمين إلى اليسار. التقاطع يثبت الحرف للكلمتين.</p></div><aside class="crossword-clues"><h4>الأدلة</h4><ol>${clues}</ol></aside></div><button class="cross-check-button" data-cross-check>تحقق من الشبكة</button></div>`;
}

function shape(token,x,y,size=42) {
  const h=size/2, filled='▲●■◆✦★⬛🟦🟥'.includes(token);
  const fill=token==='🟥'?'#ff617a':token==='🟦'?'#57d8ff':filled?'url(#vg)':'rgba(255,255,255,.03)';
  if ('●○'.includes(token)) return `<circle cx="${x}" cy="${y}" r="${h*.72}" fill="${fill}" stroke="#91efff" stroke-width="3"/>`;
  if ('■□⬛⬜🟦🟥'.includes(token)) return `<rect x="${x-h*.72}" y="${y-h*.72}" width="${size*.72*2}" height="${size*.72*2}" rx="6" fill="${fill}" stroke="#91efff" stroke-width="3"/>`;
  if ('▲△'.includes(token)) return `<path d="M${x} ${y-h*.85} L${x+h*.86} ${y+h*.72} L${x-h*.86} ${y+h*.72}Z" fill="${fill}" stroke="#91efff" stroke-width="3"/>`;
  if ('◆◇'.includes(token)) return `<rect x="${x-h*.62}" y="${y-h*.62}" width="${size*1.24}" height="${size*1.24}" rx="4" transform="rotate(45 ${x} ${y})" fill="${fill}" stroke="#91efff" stroke-width="3"/>`;
  const arrows={'→':0,'↘':45,'↓':90,'↙':135,'←':180,'↖':225,'↑':270,'↗':315,'↔':0,'↕':90};
  if (Object.hasOwn(arrows,token)) return `<g transform="translate(${x} ${y}) rotate(${arrows[token]})"><line x1="-20" y1="0" x2="12" y2="0" class="visual-stroke"/><path d="M6 -10 L22 0 L6 10" class="visual-fill"/></g>`;
  if (token==='?') return `<g class="visual-missing"><circle cx="${x}" cy="${y}" r="22"/><text x="${x}" y="${y+9}" text-anchor="middle">?</text></g>`;
  return `<text x="${x}" y="${y+9}" text-anchor="middle" class="visual-text">${esc(token)}</text>`;
}

function visualHtml(q) {
  const raw=String(q.visual||''), sep=raw.includes('/')?'/':raw.includes('|')?'|':null;
  const rows=(sep?raw.split(sep):[raw]).map(row=>row.trim().split(/\s+/).filter(Boolean));
  const max=Math.max(...rows.map(r=>r.length),1), width=Math.max(520,120+max*78), height=rows.length>1?120+rows.length*92:210;
  const simple=new Set(Array.from('▲△●○■□◆◇✦✧★☆'));
  const body=rows.map((tokens,ri)=>{const y=rows.length>1?72+ri*86:height/2, gap=Math.min(92,(width-140)/Math.max(tokens.length,1)), sx=width/2-((tokens.length-1)*gap)/2; return tokens.map((token,ti)=>{token=token.replace(/,$/,''); const chars=Array.from(token); if(chars.length>1&&chars.every(c=>simple.has(c))){const st=sx+ti*gap-((chars.length-1)*28)/2; return chars.map((c,j)=>shape(c,st+j*28,y,26)).join('');} return shape(token,sx+ti*gap,y);}).join('');}).join('');
  return `<div class="visual-stage"><svg class="visual-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="نمط بصري"><defs><linearGradient id="vg"><stop stop-color="#67edff"/><stop offset="1" stop-color="#a56cff"/></linearGradient></defs><rect x="8" y="8" width="${width-16}" height="${height-16}" rx="28" class="visual-bg"/><g>${body}</g></svg><div class="visual-instruction">حلّل الاتجاه والتكرار والعدد قبل اختيار الإجابة.</div></div>`;
}

function coverTiles(id) {
  const order=[5,10,0,15,7,2,13,8,3,12,1,14,6,9,4,11];
  const shift=Array.from(id).reduce((s,c)=>s+c.charCodeAt(0),0)%16;
  const visible=[2,6,10,16][Math.min(hiddenReveal,3)], revealed=new Set(order.map(x=>(x+shift)%16).slice(0,visible));
  return Array.from({length:16},(_,i)=>revealed.has(i)?'':`<rect class="hidden-cover-tile" x="${(i%4)*180}" y="${Math.floor(i/4)*105}" width="182" height="107" rx="12"/>`).join('');
}

function hiddenHtml(q) {
  return `<div class="hidden-image-game"><div class="hidden-art-stage">${hiddenArtMarkup(q.id)}<svg class="hidden-cover" viewBox="0 0 720 420">${coverTiles(q.id)}</svg><div class="hidden-scanline"></div></div><div class="hidden-reveal-controls"><span>نسبة الكشف: <b>${[12,38,64,100][hiddenReveal]}%</b></span><button class="reveal-button" data-expansion-reveal ${hiddenReveal>=3?'disabled':''}>${hiddenReveal>=3?'تم كشف الصورة بالكامل':`كشف مستوى ${hiddenReveal+1} / 3`}</button></div></div>`;
}

function enhanceCurrent() {
  const card=document.querySelector('#expansionRunner .expansion-question-card');
  const q=current();
  if (!card || !q || card.dataset.interactiveEnhanced===`${category}:${index}:${hiddenReveal}`) return;
  card.dataset.interactiveEnhanced=`${category}:${index}:${hiddenReveal}`;
  if (category==='cross') {
    const oldVisual=card.querySelector('.cross-pattern');
    const h3=card.querySelector('h3');
    const options=card.querySelector('.expansion-options');
    if (!options) return;
    options.classList.add('interactive-original-options');
    options.hidden=true;
    oldVisual?.remove(); h3?.remove();
    options.insertAdjacentHTML('beforebegin',crossHtml());
  } else if (category==='visual') {
    card.querySelector('.pattern-visual')?.replaceWith(fragment(visualHtml(q)));
  } else if (category==='hidden') {
    card.querySelector('.hidden-visual-wrap')?.replaceWith(fragment(hiddenHtml(q)));
  }
}

function fragment(html) {
  const template=document.createElement('template'); template.innerHTML=html.trim(); return template.content.firstElementChild;
}

function clickCorrectOriginal() {
  const q=current();
  const buttons=[...document.querySelectorAll('#expansionRunner .interactive-original-options [data-expansion-answer]')];
  buttons[q.answer]?.click();
}

function checkCross() {
  const inputs=[...document.querySelectorAll('[data-cross-key]')];
  let correct=0, empty=0;
  inputs.forEach(input=>{const ok=norm(input.value)===norm(input.dataset.crossExpected); input.classList.remove('cross-correct','cross-wrong'); if(!input.value){empty++;return;} input.classList.add(ok?'cross-correct':'cross-wrong'); if(ok)correct++;});
  const feedback=document.getElementById('expansionFeedback');
  if(correct===inputs.length&&!empty){clickCorrectOriginal(); inputs.forEach(i=>i.disabled=true); if(feedback){feedback.className='expansion-feedback visible success';feedback.innerHTML=`<strong>✓ شبكة مكتملة</strong><p>أحسنت؛ حللت خمس كلمات متقاطعة${crossHints?` باستخدام ${crossHints} تلميح`:''}.</p>`;} return;}
  if(feedback){feedback.className='expansion-feedback visible error';feedback.innerHTML=`<strong>${empty?'أكمل الخانات أولًا':'راجع الحروف المحددة'}</strong><p>الصحيح الآن: ${correct} من ${inputs.length} خانة.</p>`;}
}

function hintCross() {
  const inputs=[...document.querySelectorAll('[data-cross-key]')];
  const target=inputs.find(i=>norm(i.value)!==norm(i.dataset.crossExpected));
  if(!target)return; target.value=target.dataset.crossExpected; target.classList.add('cross-hinted'); crossHints++;
}

document.addEventListener('input',e=>{
  if(!e.target.matches('[data-cross-key]'))return;
  e.target.value=Array.from(String(e.target.value||'').trim()).at(-1)||'';
  e.target.classList.remove('cross-wrong','cross-correct');
});

document.addEventListener('click',e=>{
  const cat=e.target.closest('[data-expansion-category]');
  if(cat){category=cat.dataset.expansionCategory; index=firstIncomplete(category); hiddenReveal=0; crossHints=0; deferEnhance(); return;}
  if(e.target.closest('[data-cross-check]')){e.preventDefault();e.stopImmediatePropagation();checkCross();return;}
  if(e.target.closest('[data-cross-hint]')){e.preventDefault();e.stopImmediatePropagation();hintCross();return;}
  if(e.target.closest('[data-expansion-reveal]')&&category==='hidden'){hiddenReveal=Math.min(3,hiddenReveal+1);deferEnhance();return;}
  if(e.target.closest('[data-expansion-next]')&&category){index=(index+1)%banks[category].length;hiddenReveal=0;crossHints=0;deferEnhance();return;}
  if(e.target.closest('[data-expansion-back]')){category=null;crossState=null;}
});
