/* NutriTrack v9 — compact glass interactions + food visuals */
(() => {
  'use strict';
  if (window.__nutriGlassV9) return;
  window.__nutriGlassV9 = true;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const ICONS = {
    home:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9"><path d="M3.5 10.8 12 3.8l8.5 7v9.1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z"/><path d="M9 20.8v-6.2h6v6.2"/></svg>',
    food:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>',
    body:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M5 20h14a2 2 0 0 0 2-2V7a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v11a2 2 0 0 0 2 2Z"/><path d="M8 9a4 4 0 0 1 8 0M12 9l2.2-2.1"/></svg>',
    plan:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>',
    trends:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9"><path d="M4 18V8M10 18V4M16 18v-7M22 18V6" stroke-linecap="round"/><path d="M3 20h20"/></svg>',
    settings:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19 13.5a7.7 7.7 0 0 0 0-3l2-1.5-2-3.4-2.5 1a8.3 8.3 0 0 0-2.6-1.5L13.5 2h-4l-.4 3.1a8.3 8.3 0 0 0-2.6 1.5l-2.5-1L2 9l2 1.5a7.7 7.7 0 0 0 0 3L2 15l2 3.4 2.5-1a8.3 8.3 0 0 0 2.6 1.5l.4 3.1h4l.4-3.1a8.3 8.3 0 0 0 2.6-1.5l2.5 1 2-3.4z"/></svg>',
    water:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M12 3S6.5 9.2 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.2 12 3 12 3Z"/><path d="M9.2 15.2c.5 1.2 1.5 1.8 2.8 1.8" stroke-linecap="round"/></svg>'
  };

  const PHOTOS = {
    generic:'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=360&q=72',
    chicken:'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=360&q=72',
    fish:'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=360&q=72',
    salad:'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=360&q=72',
    egg:'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=360&q=72',
    bread:'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=360&q=72',
    smoothie:'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=360&q=72',
    banana:'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=360&q=72',
    apple:'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=360&q=72',
    orange:'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=360&q=72',
    berries:'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=360&q=72',
    avocado:'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=360&q=72',
    vegetables:'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=360&q=72',
    nuts:'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=360&q=72',
    soup:'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=360&q=72',
    yogurt:'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=360&q=72',
    coffee:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=360&q=72',
    rice:'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=360&q=72',
    wrap:'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=360&q=72',
    protein:'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=360&q=72'
  };

  const categoryFor = raw => {
    const n = String(raw || '').toLowerCase();
    if (/chicken|turkey/.test(n)) return ['chicken','🍗'];
    if (/fish|salmon|tuna|cod|prawn|shrimp/.test(n)) return ['fish','🐟'];
    if (/salad|lettuce|spinach|cucumber|tomato|pepper|broccoli|carrot|vegetable|thoran|avial|olan/.test(n)) return ['salad','🥗'];
    if (/egg|omelette|omlette|bullseye/.test(n)) return ['egg','🍳'];
    if (/bread|toast|naan|chapati|parotta|tortilla/.test(n)) return ['bread','🍞'];
    if (/smoothie|shake/.test(n)) return ['smoothie','🥤'];
    if (/banana/.test(n)) return ['banana','🍌'];
    if (/apple/.test(n)) return ['apple','🍎'];
    if (/orange|lemon|citrus/.test(n)) return ['orange','🍊'];
    if (/grape|blueberr|strawberr|raisins/.test(n)) return ['berries','🍇'];
    if (/avocado/.test(n)) return ['avocado','🥑'];
    if (/cashew|almond|pecan|pistach|peanut|walnut|chia|flax/.test(n)) return ['nuts','🥜'];
    if (/soup|rasam|sambar/.test(n)) return ['soup','🍲'];
    if (/yogurt|curd|cottage cheese|paneer/.test(n)) return ['yogurt','🥣'];
    if (/coffee|tea/.test(n)) return ['coffee','☕'];
    if (/rice|biryani|poha|upma|pasta|quinoa|oat|puttu|idli|dosa|appam|idiyappam|dal|lentil|chickpea|rajma|kidney bean/.test(n)) return ['rice','🍚'];
    if (/wrap|samosa|vada/.test(n)) return ['wrap','🌯'];
    if (/whey|protein powder/.test(n)) return ['protein','🥤'];
    if (/corn|potato|sweet potato/.test(n)) return ['vegetables','🌽'];
    return ['generic','🍽️'];
  };

  function visualFor(name, exactImage='') {
    const [cat, emoji] = categoryFor(name);
    return { src: exactImage || PHOTOS[cat] || PHOTOS.generic, emoji };
  }

  function makePhoto(name, exactImage='', cls='food-photo-wrap') {
    const {src,emoji}=visualFor(name, exactImage);
    const wrap=document.createElement('div');
    wrap.className=cls;
    const fallback=document.createElement('span');
    fallback.className='food-photo-fallback';
    fallback.textContent=emoji;
    const img=document.createElement('img');
    img.loading='lazy'; img.decoding='async'; img.alt=name ? `${name} food` : 'Food'; img.referrerPolicy='no-referrer';
    img.addEventListener('load',()=>wrap.classList.add('has-photo'),{once:true});
    img.addEventListener('error',()=>wrap.classList.add('photo-error'),{once:true});
    img.src=src;
    wrap.append(img,fallback);
    return wrap;
  }

  function decorateFoodRow(row) {
    if (!row || row.dataset.glassPhoto==='1' || row.querySelector('.food-photo-wrap')) return;
    const title=row.querySelector('.title')?.textContent?.replace('★','').trim() || row.querySelector('strong')?.textContent?.trim();
    if (!title) return;
    const exact=row.dataset.foodImage || '';
    row.prepend(makePhoto(title,exact));
    row.dataset.glassPhoto='1';
  }

  function decorateFoodRows(root=document) {
    root.querySelectorAll?.('.food-result,.log-row').forEach(decorateFoodRow);
  }

  function decorateMealRows() {
    $$('#mealSummary .meal-row').forEach(row=>{
      if(row.dataset.glassMeal==='1') return;
      row.dataset.glassMeal='1'; row.classList.add('glass-clickable'); row.setAttribute('role','button'); row.tabIndex=0;
      const meal=row.querySelector('strong')?.textContent?.trim();
      const go=()=>{
        if(meal && $('#foodMeal')) $('#foodMeal').value=meal;
        if($('#foodDate') && $('#selectedDate')) $('#foodDate').value=$('#selectedDate').value;
        if(typeof navigate==='function') navigate('food');
        setTimeout(()=>$('#foodSearch')?.focus(),180);
      };
      row.addEventListener('click',go);
      row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
    });
  }

  function enhanceDialog() {
    const dialog=$('#foodDialog'), card=dialog?.querySelector('.dialog-card');
    if(!dialog||!card||!dialog.open) return;
    const name=$('#dialogFoodName')?.textContent?.trim() || 'Food';
    let visual=card.querySelector('.dialog-food-photo');
    if(visual) visual.remove();
    visual=makePhoto(name,'','dialog-food-photo');
    const close=card.querySelector('.dialog-close');
    if(close) close.insertAdjacentElement('afterend',visual); else card.prepend(visual);
  }

  function installDialogObserver(){
    const d=$('#foodDialog'); if(!d) return;
    new MutationObserver(()=>{ if(d.open) requestAnimationFrame(enhanceDialog); }).observe(d,{attributes:true,attributeFilter:['open']});
  }

  function installCustomPreview(){
    const details=$('#customName')?.closest('details'); if(!details || $('#customFoodVisual')) return;
    const box=document.createElement('div'); box.id='customFoodVisual'; box.className='custom-food-visual';
    const form=details.querySelector('.form-grid'); if(form) form.insertAdjacentElement('beforebegin',box);
    const render=()=>{
      const name=$('#customName')?.value.trim() || '';
      if(!name){box.classList.remove('show');box.innerHTML='';return;}
      box.innerHTML=''; box.append(makePhoto(name));
      const txt=document.createElement('div'); txt.innerHTML=`<strong>${escapeHtml(name)}</strong><span>Preview · review the nutrition values before adding</span>`; box.append(txt); box.classList.add('show');
    };
    $('#customName')?.addEventListener('input',render);
    const mo=new MutationObserver(()=>{if(details.open) setTimeout(render,50)}); mo.observe(details,{attributes:true,attributeFilter:['open']});
  }

  function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

  function installQuickActions(){
    const dateRow=$('#page-home .date-row'); if(!dateRow || $('#glassQuickActions')) return;
    const box=document.createElement('div'); box.id='glassQuickActions'; box.className='quick-actions';
    const defs=[
      ['food','Food',ICONS.food,()=>typeof navigate==='function'&&navigate('food')],
      ['water','+250 ml',ICONS.water,()=>{const b=$('[data-water-add="250"]'); if(b){b.click(); const q=box.querySelector('[data-qa="water"]');q?.classList.remove('water-pop');void q?.offsetWidth;q?.classList.add('water-pop');}else $('#waterTodayCard')?.scrollIntoView({behavior:'smooth'});} ],
      ['body','Body',ICONS.body,()=>typeof navigate==='function'&&navigate('body')],
      ['plan','Plan',ICONS.plan,()=>typeof navigate==='function'&&navigate('plan')]
    ];
    defs.forEach(([key,label,icon,fn])=>{const b=document.createElement('button');b.type='button';b.className='quick-action';b.dataset.qa=key;b.innerHTML=`${icon}<span>${label}</span>`;b.addEventListener('click',fn);box.appendChild(b);});
    dateRow.insertAdjacentElement('afterend',box);
  }

  function installNavIcons(){
    $$('.bottom-nav .nav-item').forEach(btn=>{
      const span=btn.querySelector('span'); const k=btn.dataset.nav; if(span&&ICONS[k]) span.innerHTML=ICONS[k];
    });
  }

  function compactHeader(){
    const title=$('.topbar h1'); const eye=$('.topbar .eyebrow');
    if(title) title.textContent='NutriTrack';
    if(eye){
      let name=''; try{name=String(state?.profile?.name||'').trim();}catch{}
      eye.textContent=name && name.toLowerCase()!=='me' ? `${name.toUpperCase()} · NUTRITION` : 'PERSONAL NUTRITION';
    }
  }

  function pulseUpdatedCards(mutations){
    for(const m of mutations){
      const t=m.target?.nodeType===1?m.target:m.target?.parentElement;
      const bar=t?.closest?.('.mini-bar,.water-progress,.meal-target-bar');
      if(bar) bar.classList.add('glass-updated');
    }
  }

  function observeDynamicUI(){
    const observer=new MutationObserver(muts=>{
      decorateFoodRows(); decorateMealRows(); pulseUpdatedCards(muts);
    });
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  function addPhotoHintToOnlineRows(){
    const results=$('#onlineFoodResults'); if(!results) return;
    new MutationObserver(()=>decorateFoodRows(results)).observe(results,{childList:true,subtree:true});
  }

  function init(){
    installNavIcons(); installQuickActions(); installDialogObserver(); installCustomPreview(); compactHeader();
    decorateFoodRows(); decorateMealRows(); observeDynamicUI(); addPhotoHintToOnlineRows();
    // Re-decorate after the first render cycle from upgrade scripts.
    setTimeout(()=>{decorateFoodRows();decorateMealRows();compactHeader();},120);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
