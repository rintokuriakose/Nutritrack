(() => {
  'use strict';

  const qInput = document.getElementById('foodSearch');
  const localResults = document.getElementById('foodResults');
  const customDetails = document.querySelector('#page-food details');
  if (!qInput || !localResults || !customDetails) return;

  const $id = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const num = v => Number.isFinite(Number(v)) ? Number(v) : null;
  const round = (v, d = 1) => v == null ? 0 : Math.round(v * 10 ** d) / 10 ** d;

  const MY_FOODS_KEY = 'nutritrack_my_foods_v1';
  let myFoods = [];

  function loadMyFoods() {
    try {
      if (typeof state !== 'undefined' && Array.isArray(state.myFoods)) return state.myFoods;
      const v = JSON.parse(localStorage.getItem(MY_FOODS_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  function persistMyFoods() {
    try {
      if (typeof state !== 'undefined') {
        state.myFoods = myFoods;
        if (typeof save === 'function') save();
      }
      localStorage.setItem(MY_FOODS_KEY, JSON.stringify(myFoods));
    } catch {}
  }

  function attachMyFoodsToDatabase() {
    try {
      if (typeof FOOD_DB === 'undefined' || !Array.isArray(FOOD_DB)) return;
      const existing = new Set(FOOD_DB.map(f => f.id));
      myFoods.forEach(f => {
        if (!existing.has(f.id)) FOOD_DB.push({ ...f, tags: `${f.tags || ''} myfood online`.trim() });
      });
    } catch (e) {
      console.warn('Could not attach My Foods', e);
    }
  }

  function saveOnlineFoodToMyFoods(f) {
    if (!f) return null;
    const key = `${String(f.code || '').trim()}|${String(f.name || '').trim().toLowerCase()}|${String(f.serving || '').trim().toLowerCase()}`;
    const found = myFoods.find(x => x._lookupKey === key || (f.code && String(x.code || '') === String(f.code)));
    const item = {
      ...(found || {}),
      id: found?.id || `my${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      _lookupKey: key,
      source: f.source || 'Online',
      code: f.code || '',
      name: f.name || 'Saved food',
      serving: f.serving || '100 g',
      cal: round(f.cal, 0), protein: round(f.protein, 1), carbs: round(f.carbs, 1),
      fat: round(f.fat, 1), fibre: round(f.fibre, 1), sugar: round(f.sugar, 1),
      sodium: round(f.sodium, 0), tags: 'myfood online'
    };
    if (found) Object.assign(found, item); else myFoods.unshift(item);
    persistMyFoods();

    try {
      if (typeof FOOD_DB !== 'undefined' && Array.isArray(FOOD_DB)) {
        const i = FOOD_DB.findIndex(x => x.id === item.id);
        if (i >= 0) FOOD_DB[i] = { ...item }; else FOOD_DB.unshift({ ...item });
      }
    } catch {}
    return item;
  }

  myFoods = loadMyFoods();
  try {
    if (typeof state !== 'undefined' && !Array.isArray(state.myFoods)) {
      state.myFoods = myFoods;
      if (typeof save === 'function') save();
    }
  } catch {}


  // Quick local food pack requested for NutriTrack. Values are practical generic
  // estimates for the stated serving and can vary by recipe, brand, cooking oil,
  // salt, and portion size. Branded foods can still be looked up online below.
  const QUICK_FOOD_PACK = [
    ['Grilled Chicken Breast','150 g',248,46.5,0,5.4,0,0,111,'quick protein'],
    ['Veg salad','200 g, no dressing',60,3,12,0.8,5,6,80,'quick'],
    ['Fried Fish','1 medium fillet (150 g)',280,30,8,14,1,1,500,'quick protein'],
    ['Wholegrain bread','1 slice (40 g)',95,4,17,1.5,3,1.5,180,'quick'],
    ['Wholegrain tortilla','1 medium (60 g)',180,6,31,4.5,5,2,320,'quick'],
    ['Banana Apple smoothie','1 glass (350 ml), fruit + water',205,1.8,55,0.7,7.5,37,4,'quick'],
    ['Salt lemon water','300 ml, 1/2 lemon + pinch salt',6,0.1,2,0,0.2,0.5,200,'quick'],
    ['Bullseye egg (fried)','1 large egg + 1 tsp oil',112,6.3,0.4,9.3,0,0.2,71,'quick protein'],
    ['Omelette / Omlette','2 eggs + 1 tsp oil',190,12.6,1,15.5,0,0.5,145,'quick protein'],
    ['Boiled egg','1 large',78,6.3,0.6,5.3,0,0.6,62,'quick protein'],
    ['Orange','1 medium',62,1.2,15.4,0.2,3.1,12.2,0,'quick'],
    ['Apple','1 medium',95,0.5,25,0.3,4.4,19,2,'quick'],
    ['Ireland Banana','1 medium',105,1.3,27,0.4,3.1,14.4,1,'quick'],
    ['Broccoli','100 g',35,2.4,7.2,0.4,3.3,1.4,41,'quick'],
    ['Carrot','100 g',41,0.9,9.6,0.2,2.8,4.7,69,'quick'],
    ['Lettuce','100 g',15,1.4,2.9,0.2,1.3,0.8,28,'quick'],
    ['Cherry tomato','100 g',18,0.9,3.9,0.2,1.2,2.6,5,'quick'],
    ['Green tea','1 cup (250 ml), no sugar',2,0,0,0,0,0,7,'quick'],
    ['Chickpea salad','1 bowl (250 g)',290,15,47,5,13,9,250,'quick protein'],
    ['Red kidney bean salad','1 bowl (250 g)',260,15,45,2,13,7,250,'quick protein'],
    ['Cashew nuts','30 g',166,5.2,9,13.2,0.9,1.7,3,'quick'],
    ['Raisins','30 g',90,0.9,23.7,0.1,1.1,17.7,3,'quick'],
    ['Whey Protein powder','1 scoop (30 g)',120,24,3,2,1,2,120,'quick protein'],
    ['Pecan nuts','30 g',207,2.7,4.2,21.6,2.9,1.2,0,'quick'],
    ['Chicken soup','1 bowl (300 ml)',150,15,12,5,2,3,600,'quick protein'],

    // Extra useful everyday foods
    ['Cucumber','100 g',15,0.7,3.6,0.1,0.5,1.7,2,'quick'],
    ['Bell pepper','100 g',31,1,6,0.3,2.1,4.2,4,'quick'],
    ['Sweet corn','100 g, cooked',96,3.4,21,1.5,2.4,4.5,1,'quick'],
    ['Walnuts','30 g',196,4.6,4.1,19.6,2,0.8,1,'quick'],
    ['Pistachios','30 g',168,6,8,13.5,3,2.3,2,'quick'],
    ['Chia seeds','1 tbsp (12 g)',58,2,5,3.7,4.1,0,2,'quick'],
    ['Flax seeds','1 tbsp (10 g)',53,1.8,2.9,4.2,2.7,0.2,3,'quick'],
    ['Coconut water','250 ml',46,1.7,9,0.5,2.6,6.3,63,'quick'],
    ['Black coffee','1 cup (250 ml), no sugar',2,0.3,0,0,0,0,5,'quick'],
    ['Tea without sugar','1 cup (250 ml)',2,0,0,0,0,0,7,'quick'],
    ['Lentil soup','1 bowl (300 ml)',180,11,30,2.5,9,4,500,'quick protein'],
    ['Vegetable soup','1 bowl (300 ml)',110,4,20,2,5,7,480,'quick'],
    ['Chicken wholegrain wrap','1 wrap',410,36,39,12,7,5,650,'quick protein'],
    ['Boiled sweet corn + vegetables','1 bowl (200 g)',150,5,31,2,6,7,180,'quick'],
    ['Greek yogurt, plain 0%','200 g',118,20,7.2,0.8,0,7.2,72,'quick protein']
  ];

  try {
    if (typeof FOOD_DB !== 'undefined' && Array.isArray(FOOD_DB)) {
      const existing = new Set(FOOD_DB.map(f => f.name.toLowerCase()));
      QUICK_FOOD_PACK.forEach((x, i) => {
        if (existing.has(x[0].toLowerCase())) return;
        FOOD_DB.push({
          id: 'quick' + i,
          name: x[0], serving: x[1], cal: x[2], protein: x[3], carbs: x[4],
          fat: x[5], fibre: x[6], sugar: x[7], sodium: x[8], tags: x[9]
        });
      });
      if (typeof renderFoodResults === 'function') renderFoodResults();
    }
  } catch (e) {
    console.warn('NutriTrack quick food pack could not be loaded', e);
  }

  attachMyFoodsToDatabase();

  // Add a dedicated My Foods filter. Online foods saved with "Use" appear here
  // and are also searchable normally, so they do not require another web lookup.
  try {
    const chips = document.getElementById('foodFilterChips');
    const baseRenderFoodResults = typeof renderFoodResults === 'function' ? renderFoodResults : null;
    if (chips && baseRenderFoodResults && !document.getElementById('myFoodsChip')) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.id = 'myFoodsChip';
      chip.textContent = 'My Foods';
      chips.appendChild(chip);

      renderFoodResults = function () {
        if (typeof foodFilter === 'undefined' || foodFilter !== 'my') return baseRenderFoodResults();
        const q = document.getElementById('foodSearch')?.value.trim().toLowerCase() || '';
        const arr = FOOD_DB.filter(f => String(f.tags || '').includes('myfood') &&
          (!q || String(f.name || '').toLowerCase().includes(q) || String(f.serving || '').toLowerCase().includes(q))).slice(0, 50);
        localResults.innerHTML = arr.length ? arr.map(f => `
          <div class="food-result">
            <div>
              <div class="title">${state?.favorites?.includes(f.id) ? '<span class="star">★</span> ' : ''}${esc(f.name)}</div>
              <div class="nutrition">${esc(f.serving)} · ${esc(f.cal)} kcal · P ${esc(f.protein)}g · C ${esc(f.carbs)}g · F ${esc(f.fat)}g</div>
              <div class="row-meta">Saved from ${esc(f.source || 'online search')}</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <button class="add-btn" type="button" data-food="${esc(f.id)}">Add</button>
              <button class="delete-mini" type="button" aria-label="Delete saved food" data-del-myfood="${esc(f.id)}">×</button>
            </div>
          </div>`).join('') : '<div class="empty-copy">No saved foods yet. Search online and tap Use to save one here.</div>';
        localResults.querySelectorAll('[data-food]').forEach(b => b.onclick = () => openFoodDialog(b.dataset.food));
        localResults.querySelectorAll('[data-del-myfood]').forEach(b => b.onclick = () => {
          const fid = b.dataset.delMyfood;
          myFoods = myFoods.filter(x => x.id !== fid);
          persistMyFoods();
          const ix = FOOD_DB.findIndex(x => x.id === fid);
          if (ix >= 0) FOOD_DB.splice(ix, 1);
          if (typeof state !== 'undefined') {
            state.favorites = (state.favorites || []).filter(x => x !== fid);
            state.recent = (state.recent || []).filter(x => x !== fid);
            if (typeof save === 'function') save();
          }
          renderFoodResults();
          if (typeof toast === 'function') toast('Removed from My Foods');
        });
      };

      chip.addEventListener('click', () => {
        chips.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
        chip.classList.add('active');
        foodFilter = 'my';
        renderFoodResults();
      });
    }
  } catch (e) {
    console.warn('My Foods filter could not be installed', e);
  }

  const panel = document.createElement('div');
  panel.id = 'onlineFoodPanel';
  panel.style.marginTop = '12px';
  panel.innerHTML = `
    <button type="button" id="onlineFoodBtn" class="secondary wide" style="display:none">🌐 Search online</button>
    <div id="onlineFoodStatus" class="muted note" style="margin-top:8px;display:none"></div>
    <div id="onlineFoodResults" class="food-results" style="margin-top:8px"></div>`;
  localResults.insertAdjacentElement('afterend', panel);

  const btn = $id('onlineFoodBtn');
  const status = $id('onlineFoodStatus');
  const results = $id('onlineFoodResults');
  let current = [];
  let debounce = null;

  function updateButton() {
    const q = qInput.value.trim();
    if (q.length < 2) {
      btn.style.display = 'none';
      status.style.display = 'none';
      results.innerHTML = '';
      return;
    }
    btn.style.display = 'block';
    btn.textContent = /^\d{8,14}$/.test(q)
      ? `📷 Look up barcode ${q}`
      : `🌐 Search online for “${q}”`;
  }

  qInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(updateButton, 60);
  });
  updateButton();

  function parseAmount(text) {
    const m = String(text || '').replace(',', '.').match(/([0-9]+(?:\.[0-9]+)?)\s*(g|ml)\b/i);
    if (!m) return null;
    return { amount: Number(m[1]), unit: m[2].toLowerCase() };
  }

  function firstFinite(...vals) {
    for (const v of vals) {
      const x = num(v);
      if (x != null) return x;
    }
    return null;
  }

  function offProductToFood(p) {
    const N = p?.nutriments || {};
    const parsed = parseAmount(p?.serving_size);
    const hasServing = [
      N['energy-kcal_serving'], N.proteins_serving, N.carbohydrates_serving,
      N.fat_serving, N.fiber_serving, N.sugars_serving, N.sodium_serving
    ].some(v => num(v) != null);

    const suffix = hasServing ? '_serving' : '_100g';
    const factor = hasServing ? 1 : (parsed ? parsed.amount / 100 : 1);

    let kcal = firstFinite(N[`energy-kcal${suffix}`]);
    if (kcal == null) {
      const kj = firstFinite(N[`energy-kj${suffix}`], N[`energy${suffix}`]);
      if (kj != null) kcal = kj / 4.184;
    }

    const protein = firstFinite(N[`proteins${suffix}`]);
    const carbs = firstFinite(N[`carbohydrates${suffix}`]);
    const fat = firstFinite(N[`fat${suffix}`]);
    const fibre = firstFinite(N[`fiber${suffix}`]);
    const sugar = firstFinite(N[`sugars${suffix}`]);
    const sodiumG = firstFinite(N[`sodium${suffix}`]);
    const saltG = firstFinite(N[`salt${suffix}`]);

    const scale = v => v == null ? 0 : v * factor;
    const sodiumMg = sodiumG != null ? scale(sodiumG) * 1000 : (saltG != null ? scale(saltG) * 400 : 0);

    if (kcal == null && protein == null && carbs == null && fat == null) return null;

    const productName = String(p?.product_name || '').trim();
    const brand = String(p?.brands || '').split(',')[0].trim();
    const name = brand && productName && !productName.toLowerCase().includes(brand.toLowerCase())
      ? `${productName} — ${brand}`
      : (productName || brand || 'Online food');

    return {
      source: 'Open Food Facts',
      code: p?.code || '',
      name,
      serving: hasServing && p?.serving_size ? p.serving_size : (parsed ? p.serving_size : '100 g'),
      cal: round(scale(kcal), 0),
      protein: round(scale(protein), 1),
      carbs: round(scale(carbs), 1),
      fat: round(scale(fat), 1),
      fibre: round(scale(fibre), 1),
      sugar: round(scale(sugar), 1),
      sodium: round(sodiumMg, 0)
    };
  }

  function nutrient(food, ids, names, unit) {
    const arr = food?.foodNutrients || [];
    const found = arr.find(x => {
      const id = String(x?.nutrientId ?? x?.nutrient?.id ?? '');
      const name = String(x?.nutrientName ?? x?.nutrient?.name ?? '').toLowerCase();
      const u = String(x?.unitName ?? x?.nutrient?.unitName ?? '').toLowerCase();
      const idOk = ids.map(String).includes(id);
      const nameOk = names.some(nm => name === nm || name.includes(nm));
      const unitOk = !unit || u === unit.toLowerCase();
      return (idOk || nameOk) && unitOk;
    });
    return firstFinite(found?.value, found?.amount);
  }

  function usdaFoodToFood(f) {
    let kcal = nutrient(f, [1008], ['energy'], 'kcal');
    if (kcal == null) {
      const kj = nutrient(f, [1062], ['energy'], 'kj');
      if (kj != null) kcal = kj / 4.184;
    }
    const protein = nutrient(f, [1003], ['protein'], 'g');
    const fat = nutrient(f, [1004], ['total lipid', 'total fat'], 'g');
    const carbs = nutrient(f, [1005], ['carbohydrate'], 'g');
    const fibre = nutrient(f, [1079], ['fiber', 'fibre'], 'g');
    const sugar = nutrient(f, [2000, 1063], ['sugars, total', 'total sugars'], 'g');
    const sodium = nutrient(f, [1093], ['sodium'], 'mg');

    if (kcal == null && protein == null && carbs == null && fat == null) return null;

    const size = num(f?.servingSize);
    const unit = String(f?.servingSizeUnit || '').toLowerCase();
    const useServing = size != null && (unit === 'g' || unit === 'ml') && size > 0;
    const factor = useServing ? size / 100 : 1;
    const scale = v => v == null ? 0 : v * factor;

    const brand = String(f?.brandOwner || f?.brandName || '').trim();
    const desc = String(f?.description || 'USDA food').trim();
    const name = brand && !desc.toLowerCase().includes(brand.toLowerCase()) ? `${desc} — ${brand}` : desc;

    return {
      source: 'USDA FoodData Central',
      code: String(f?.fdcId || ''),
      name,
      serving: useServing ? `${round(size, 1)} ${unit}` : '100 g',
      cal: round(scale(kcal), 0),
      protein: round(scale(protein), 1),
      carbs: round(scale(carbs), 1),
      fat: round(scale(fat), 1),
      fibre: round(scale(fibre), 1),
      sugar: round(scale(sugar), 1),
      sodium: round(scale(sodium), 0)
    };
  }

  async function searchOpenFoodFacts(q) {
    if (/^\d{8,14}$/.test(q)) {
      const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(q)}.json?fields=code,product_name,brands,serving_size,nutriments`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open Food Facts ${res.status}`);
      const data = await res.json();
      if (data?.status !== 1 || !data?.product) return [];
      const item = offProductToFood({ ...data.product, code: data.code || q });
      return item ? [item] : [];
    }

    const params = new URLSearchParams({
      search_terms: q,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '6',
      fields: 'code,product_name,brands,serving_size,nutriments'
    });
    const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`);
    if (!res.ok) throw new Error(`Open Food Facts ${res.status}`);
    const data = await res.json();
    return (data?.products || []).map(offProductToFood).filter(Boolean).slice(0, 6);
  }

  async function searchUSDA(q) {
    if (/^\d{8,14}$/.test(q)) return [];
    const params = new URLSearchParams({
      api_key: 'DEMO_KEY',
      query: q,
      pageSize: '6',
      dataType: 'Foundation,SR Legacy,Survey (FNDDS),Branded'
    });
    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`);
    if (!res.ok) throw new Error(`USDA ${res.status}`);
    const data = await res.json();
    return (data?.foods || []).map(usdaFoodToFood).filter(Boolean).slice(0, 6);
  }

  function dedupe(items) {
    const seen = new Set();
    return items.filter(x => {
      const key = `${x.name.toLowerCase()}|${x.serving.toLowerCase()}|${Math.round(x.cal)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function render(items, warnings = []) {
    current = items;
    if (!items.length) {
      results.innerHTML = '<div class="empty-copy">No usable online nutrition result found. Try the brand name, a more specific food name, or the barcode.</div>';
    } else {
      results.innerHTML = items.map((f, i) => `
        <div class="food-result">
          <div>
            <div class="title">${esc(f.name)}</div>
            <div class="nutrition">${esc(f.serving)} · ${esc(f.cal)} kcal · P ${esc(f.protein)}g · C ${esc(f.carbs)}g · F ${esc(f.fat)}g</div>
            <div class="row-meta">${esc(f.source)}${f.code ? ` · ${esc(f.code)}` : ''}</div>
          </div>
          <button class="add-btn" type="button" data-online-food="${i}">Use + save</button>
        </div>`).join('');

      results.querySelectorAll('[data-online-food]').forEach(b => {
        b.addEventListener('click', () => fillCustom(current[Number(b.dataset.onlineFood)]));
      });
    }

    if (warnings.length) {
      status.textContent = warnings.join(' · ');
      status.style.display = 'block';
    } else {
      status.style.display = items.length ? 'block' : 'none';
      status.textContent = items.length ? 'Tap Use + save to fill the custom-food nutrition and keep the item in My Foods for next time. Review the serving before adding.' : '';
    }
  }

  function fillCustom(f) {
    if (!f) return;
    const saved = saveOnlineFoodToMyFoods(f);
    if (saved && typeof renderFoodResults === 'function') renderFoodResults();
    const set = (id, value) => { const el = $id(id); if (el) el.value = value ?? ''; };
    set('customName', f.name);
    set('customServing', f.serving);
    set('customCal', f.cal);
    set('customProtein', f.protein);
    set('customCarbs', f.carbs);
    set('customFat', f.fat);
    set('customFibre', f.fibre);
    set('customSugar', f.sugar);
    set('customSodium', f.sodium);
    customDetails.open = true;
    customDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $id('customName')?.focus({ preventScroll: true }), 350);
    if (typeof toast === 'function') toast('Saved to My Foods');
  }

  btn.addEventListener('click', async () => {
    const q = qInput.value.trim();
    if (q.length < 2) return;

    btn.disabled = true;
    btn.textContent = 'Searching online…';
    status.style.display = 'block';
    status.textContent = 'Checking Open Food Facts and USDA FoodData Central…';
    results.innerHTML = '';

    const warnings = [];
    const [off, usda] = await Promise.allSettled([
      searchOpenFoodFacts(q),
      searchUSDA(q)
    ]);

    const items = [];
    if (off.status === 'fulfilled') items.push(...off.value);
    else warnings.push('Open Food Facts unavailable');
    if (usda.status === 'fulfilled') items.push(...usda.value);
    else if (!/^\d{8,14}$/.test(q)) warnings.push('USDA unavailable or demo limit reached');

    render(dedupe(items).slice(0, 10), warnings);
    btn.disabled = false;
    updateButton();
  });

  // Keep My Foods aligned with NutriTrack backup import and data erase.
  try {
    document.getElementById('importData')?.addEventListener('change', () => setTimeout(() => {
      try {
        myFoods = (typeof state !== 'undefined' && Array.isArray(state.myFoods)) ? state.myFoods : [];
        persistMyFoods();
        attachMyFoodsToDatabase();
        if (typeof renderFoodResults === 'function') renderFoodResults();
      } catch {}
    }, 120));
    document.getElementById('eraseData')?.addEventListener('click', () => setTimeout(() => {
      try {
        if (typeof state !== 'undefined' && !Array.isArray(state.myFoods)) {
          myFoods = [];
          state.myFoods = [];
          localStorage.removeItem(MY_FOODS_KEY);
          if (typeof save === 'function') save();
        }
      } catch {}
    }, 40));
  } catch {}
})();


(() => {
  'use strict';

  const bodyPage = document.getElementById('page-body');
  const bodyDate = document.getElementById('bodyDate');
  const bodyFormGrid = bodyPage?.querySelector('.section-card .form-grid');
  const saveBodyBtn = document.getElementById('saveBody');
  if (!bodyPage || !bodyFormGrid || !saveBodyBtn) return;

  const get = id => document.getElementById(id);
  const safeNum = v => Number.isFinite(Number(v)) ? Number(v) : null;
  const fmt = (v, d = 1) => v == null ? '' : String(Math.round(v * 10 ** d) / 10 ** d);

  // Extra RENPHO measurements that were not in the original Body form.
  const extraFields = [
    ['bodyBMI', 'BMI', '0.1'],
    ['bodySubcutaneousFat', 'Subcutaneous fat %', '0.1'],
    ['bodySkeletalMuscle', 'Skeletal muscle %', '0.1'],
    ['bodyFatFreeWeight', 'Fat-free body weight kg', '0.1'],
    ['bodyProteinPct', 'Protein %', '0.1'],
    ['bodyBMR', 'BMR kcal', '1']
  ];
  extraFields.forEach(([id, label, step]) => {
    if (get(id)) return;
    const el = document.createElement('label');
    el.innerHTML = `${label}<input id="${id}" type="number" step="${step}" inputmode="decimal" />`;
    bodyFormGrid.appendChild(el);
  });

  const importCard = document.createElement('section');
  importCard.className = 'section-card';
  importCard.id = 'renphoImportCard';
  importCard.innerHTML = `
    <div class="section-head"><h2>Import RENPHO screenshot</h2><span class="pill">On-device OCR</span></div>
    <p class="muted note">Choose a screenshot from the RENPHO app. NutriTrack will read the values on this device, fill the measurement fields, and let you review them before saving.</p>
    <label class="secondary file-label" style="display:flex;justify-content:center;align-items:center;min-height:44px;cursor:pointer">
      Choose RENPHO screenshot
      <input id="renphoScreenshot" type="file" accept="image/*" hidden />
    </label>
    <img id="renphoPreview" alt="RENPHO screenshot preview" style="display:none;width:100%;max-height:420px;object-fit:contain;border-radius:12px;margin-top:12px" />
    <button type="button" class="primary wide" id="renphoReadBtn" style="margin-top:12px" disabled>Read values from screenshot</button>
    <div id="renphoStatus" class="muted note" style="margin-top:10px"></div>
    <div id="renphoExtracted" style="margin-top:10px"></div>`;
  const firstBodyCard = bodyPage.querySelector('.section-card');
  firstBodyCard?.insertAdjacentElement('beforebegin', importCard);

  const fileInput = get('renphoScreenshot');
  const preview = get('renphoPreview');
  const readBtn = get('renphoReadBtn');
  const status = get('renphoStatus');
  const extractedBox = get('renphoExtracted');
  let selectedFile = null;
  let previewUrl = null;
  let lastImported = false;

  function setStatus(text) { status.textContent = text || ''; }

  fileInput.addEventListener('change', () => {
    selectedFile = fileInput.files?.[0] || null;
    lastImported = false;
    extractedBox.innerHTML = '';
    readBtn.disabled = !selectedFile;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    if (selectedFile) {
      previewUrl = URL.createObjectURL(selectedFile);
      preview.src = previewUrl;
      preview.style.display = 'block';
      setStatus('Screenshot selected. Tap “Read values from screenshot”.');
    } else {
      preview.removeAttribute('src');
      preview.style.display = 'none';
      setStatus('');
    }
  });

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-nutritrack-tesseract]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.Tesseract), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
      s.async = true;
      s.dataset.nutritrackTesseract = '1';
      s.onload = () => resolve(window.Tesseract);
      s.onerror = () => reject(new Error('Could not load OCR library'));
      document.head.appendChild(s);
    });
  }

  const cleanLabel = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const numberMatch = s => String(s).match(/(-?\d{1,4}(?:[.,]\d{1,2})?)\s*(kg|kgs|lb|lbs|%|kcal)?/i);

  function metricFromLines(lines, labels, { skip = [], min = -Infinity, max = Infinity, weight = false } = {}) {
    const normalizedLabels = labels.map(cleanLabel);
    const normalizedSkip = skip.map(cleanLabel);
    for (let i = 0; i < lines.length; i++) {
      const cl = cleanLabel(lines[i]);
      if (!normalizedLabels.some(l => cl.includes(l))) continue;
      if (normalizedSkip.some(l => cl.includes(l))) continue;

      let candidate = lines[i];
      // Remove text before/including the first matching label so a number in the label area is not selected.
      const lower = candidate.toLowerCase();
      let cut = -1;
      for (const label of labels) {
        const pos = lower.indexOf(label.toLowerCase());
        if (pos >= 0) { cut = Math.max(cut, pos + label.length); }
      }
      if (cut >= 0) candidate = candidate.slice(cut);
      let m = numberMatch(candidate);
      if (!m && i + 1 < lines.length) m = numberMatch(lines[i + 1]);
      if (!m) continue;

      let value = Number(m[1].replace(',', '.'));
      const unit = (m[2] || '').toLowerCase();
      if (weight && (unit === 'lb' || unit === 'lbs')) value *= 0.45359237;
      if (value >= min && value <= max) return value;
    }
    return null;
  }

  function parseRenpho(text) {
    const lines = String(text || '')
      .replace(/\r/g, '\n')
      .split(/\n+/)
      .map(x => x.replace(/[|]/g, 'I').replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    return {
      weight: metricFromLines(lines, ['weight'], { skip: ['fat free', 'fat-free'], min: 20, max: 300, weight: true }),
      bmi: metricFromLines(lines, ['bmi'], { min: 10, max: 80 }),
      fat: metricFromLines(lines, ['body fat'], { min: 2, max: 75 }),
      subcutaneous: metricFromLines(lines, ['subcutaneous fat'], { min: 1, max: 70 }),
      visceral: metricFromLines(lines, ['visceral fat'], { min: 1, max: 60 }),
      water: metricFromLines(lines, ['body water', 'water'], { min: 20, max: 85 }),
      skeletalMuscle: metricFromLines(lines, ['skeletal muscle'], { min: 10, max: 80 }),
      muscle: metricFromLines(lines, ['muscle mass'], { min: 10, max: 180, weight: true }),
      bone: metricFromLines(lines, ['bone mass'], { min: 0.5, max: 12, weight: true }),
      proteinPct: metricFromLines(lines, ['protein'], { min: 5, max: 35 }),
      bmr: metricFromLines(lines, ['bmr', 'basal metabolic rate'], { min: 500, max: 4500 }),
      metabolicAge: metricFromLines(lines, ['metabolic age'], { min: 10, max: 120 }),
      fatFreeWeight: metricFromLines(lines, ['fat-free body weight', 'fat free body weight', 'fat free weight'], { min: 20, max: 250, weight: true })
    };
  }

  function fillParsed(x) {
    const mapping = [
      ['bodyWeight', x.weight], ['bodyBMI', x.bmi], ['bodyFat', x.fat],
      ['bodySubcutaneousFat', x.subcutaneous], ['bodyVisceral', x.visceral],
      ['bodyWater', x.water], ['bodySkeletalMuscle', x.skeletalMuscle],
      ['bodyMuscle', x.muscle], ['bodyBone', x.bone], ['bodyProteinPct', x.proteinPct],
      ['bodyBMR', x.bmr], ['bodyMetabolicAge', x.metabolicAge], ['bodyFatFreeWeight', x.fatFreeWeight]
    ];
    let count = 0;
    mapping.forEach(([id, value]) => {
      const el = get(id);
      if (el && value != null) {
        el.value = fmt(value, id === 'bodyBMR' || id === 'bodyMetabolicAge' ? 0 : 1);
        count++;
      }
    });
    lastImported = count > 0;
    return count;
  }

  function renderExtracted(x) {
    const labels = [
      ['Weight', x.weight, 'kg'], ['BMI', x.bmi, ''], ['Body fat', x.fat, '%'],
      ['Subcutaneous fat', x.subcutaneous, '%'], ['Visceral fat', x.visceral, ''],
      ['Body water', x.water, '%'], ['Skeletal muscle', x.skeletalMuscle, '%'],
      ['Muscle mass', x.muscle, 'kg'], ['Bone mass', x.bone, 'kg'],
      ['Protein', x.proteinPct, '%'], ['BMR', x.bmr, 'kcal'],
      ['Metabolic age', x.metabolicAge, ''], ['Fat-free body weight', x.fatFreeWeight, 'kg']
    ].filter(([, v]) => v != null);
    if (!labels.length) {
      extractedBox.innerHTML = '<div class="empty-copy">No RENPHO values were recognised. Try a clear, uncropped screenshot with the labels and numbers visible.</div>';
      return;
    }
    extractedBox.innerHTML = `<div class="history-row"><div><strong>Recognised ${labels.length} values</strong><div class="row-meta">${labels.map(([a, v, u]) => `${a} ${fmt(v, a === 'BMR' || a === 'Metabolic age' ? 0 : 1)}${u}`).join(' · ')}</div></div><span class="pill">Review below</span></div>`;
  }

  readBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    readBtn.disabled = true;
    readBtn.textContent = 'Reading screenshot…';
    setStatus('Loading OCR…');
    extractedBox.innerHTML = '';
    try {
      const Tesseract = await loadTesseract();
      const result = await Tesseract.recognize(selectedFile, 'eng', {
        logger: m => {
          if (m?.status === 'recognizing text' && Number.isFinite(m.progress)) {
            setStatus(`Reading screenshot… ${Math.round(m.progress * 100)}%`);
          } else if (m?.status) {
            setStatus(String(m.status).replace(/^./, c => c.toUpperCase()) + '…');
          }
        }
      });
      const parsed = parseRenpho(result?.data?.text || '');
      const count = fillParsed(parsed);
      renderExtracted(parsed);
      if (count) {
        setStatus(`Filled ${count} measurement fields. Check the numbers, then tap Save measurement.`);
        bodyFormGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (typeof toast === 'function') toast('RENPHO values filled');
      } else {
        setStatus('Could not confidently read RENPHO measurements from this screenshot.');
      }
    } catch (e) {
      console.error(e);
      setStatus('OCR could not run. Make sure you are online the first time, then try again.');
    } finally {
      readBtn.disabled = false;
      readBtn.textContent = 'Read values from screenshot';
    }
  });

  // Extend the existing Save measurement action with the RENPHO-only fields.
  const originalSaveBody = saveBodyBtn.onclick;
  saveBodyBtn.onclick = () => {
    if (typeof originalSaveBody === 'function') originalSaveBody();
    try {
      const date = bodyDate?.value;
      const rec = typeof state !== 'undefined' ? state.body.find(x => x.date === date) : null;
      if (!rec) return;
      const read = id => {
        const v = safeNum(get(id)?.value);
        return v == null || v === 0 ? null : v;
      };
      rec.bmi = read('bodyBMI');
      rec.subcutaneousFat = read('bodySubcutaneousFat');
      rec.skeletalMuscle = read('bodySkeletalMuscle');
      rec.fatFreeWeight = read('bodyFatFreeWeight');
      rec.proteinPct = read('bodyProteinPct');
      rec.bmr = read('bodyBMR');
      if (lastImported) rec.source = 'RENPHO screenshot';
      if (typeof save === 'function') save();
      if (typeof renderAll === 'function') renderAll();
      lastImported = false;
    } catch (e) {
      console.warn('Could not save RENPHO extra fields', e);
    }
  };

  // Show the extra RENPHO measurements in body history without changing app.js.
  try {
    const originalRenderBody = typeof renderBody === 'function' ? renderBody : null;
    if (originalRenderBody) {
      renderBody = function () {
        originalRenderBody();
        const arr = [...state.body].sort((a, b) => b.date.localeCompare(a.date));
        const rows = [...document.querySelectorAll('#bodyHistory .history-row')];
        rows.forEach((row, i) => {
          const x = arr[i];
          if (!x) return;
          const extras = [];
          if (x.bmi) extras.push(`BMI ${x.bmi}`);
          if (x.subcutaneousFat) extras.push(`Subcutaneous ${x.subcutaneousFat}%`);
          if (x.skeletalMuscle) extras.push(`Skeletal muscle ${x.skeletalMuscle}%`);
          if (x.fatFreeWeight) extras.push(`Fat-free ${x.fatFreeWeight} kg`);
          if (x.proteinPct) extras.push(`Protein ${x.proteinPct}%`);
          if (x.bmr) extras.push(`BMR ${x.bmr} kcal`);
          if (extras.length) {
            const info = document.createElement('div');
            info.className = 'row-meta';
            info.textContent = extras.join(' · ');
            const textWrap = row.firstElementChild;
            textWrap?.appendChild(info);
          }
        });
      };
    }
  } catch (e) {
    console.warn('RENPHO history enhancement unavailable', e);
  }
})();
