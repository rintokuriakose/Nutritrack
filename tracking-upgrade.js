(() => {
  'use strict';

  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];
  const MEALS = ['Breakfast','Lunch','Dinner','Snack'];
  const SHARES = { Breakfast:0.25, Lunch:0.35, Dinner:0.30, Snack:0.10 };
  const NUTRIENTS = [
    ['cal','Calories','kcal',0],['protein','Protein','g',1],['carbs','Carbs','g',1],['fat','Fat','g',1],
    ['fibre','Fibre','g',1],['sugar','Sugar','g',1],['sodium','Sodium','mg',0]
  ];
  const BODY_METRICS = [
    ['weight','Weight','kg'],['bmi','BMI',''],['fat','Body fat','%'],['bodyFatMass','Body fat mass','kg'],
    ['subcutaneousFat','Subcutaneous fat','%'],['visceral','Visceral fat',''],['musclePct','Muscle percentage','%'],['muscle','Muscle mass','kg'],
    ['skeletalMuscle','Skeletal muscle','%'],['skeletalMuscleMass','Skeletal muscle mass','kg'],['bonePct','Bone percentage','%'],['bone','Bone mass','kg'],
    ['fatFreeWeight','Fat-free mass','kg'],['metabolicAge','Metabolic age','years'],['bmr','BMR','kcal'],['water','Body water','%'],
    ['waterMass','Body water mass','kg'],['proteinPct','Protein percentage','%'],['proteinMass','Protein mass','kg'],['waist','Waist','cm'],['chest','Chest','cm']
  ];

  function num(v, d = 0) { const x = Number(v); return Number.isFinite(x) ? x : d; }
  function r(v, d = 1) { return Math.round(num(v) * 10 ** d) / 10 ** d; }
  function clone(v) { try { return JSON.parse(JSON.stringify(v)); } catch { return v; } }

  function ensureState() {
    if (!Array.isArray(state.waterIntake)) state.waterIntake = [];
    if (!state.profile) state.profile = {};
    if (!Number.isFinite(Number(state.profile.waterTarget)) || Number(state.profile.waterTarget) <= 0) state.profile.waterTarget = 2500;
    if (!state.profile.mealTargetMode) state.profile.mealTargetMode = 'auto';
    if (!state.profile.mealTargets || typeof state.profile.mealTargets !== 'object') state.profile.mealTargets = {};
  }
  ensureState();

  function distribute(total, digits = 0) {
    total = num(total);
    const factor = 10 ** digits;
    let used = 0;
    const out = {};
    MEALS.forEach((m, i) => {
      if (i === MEALS.length - 1) {
        out[m] = Math.max(0, Math.round((total - used) * factor) / factor);
      } else {
        const v = Math.round(total * SHARES[m] * factor) / factor;
        out[m] = v;
        used += v;
      }
    });
    return out;
  }

  function autoMealTargets() {
    const daily = targets();
    const out = Object.fromEntries(MEALS.map(m => [m, {}]));
    NUTRIENTS.forEach(([key,,,digits]) => {
      const alloc = distribute(daily[key], digits);
      MEALS.forEach(m => out[m][key] = alloc[m]);
    });
    return out;
  }

  function currentMealTargets() {
    ensureState();
    if (state.profile.mealTargetMode !== 'manual') return autoMealTargets();
    const auto = autoMealTargets();
    const saved = state.profile.mealTargets || {};
    const out = {};
    MEALS.forEach(m => {
      out[m] = {};
      NUTRIENTS.forEach(([key]) => {
        const v = Number(saved?.[m]?.[key]);
        out[m][key] = Number.isFinite(v) && v >= 0 ? v : auto[m][key];
      });
    });
    return out;
  }

  function mealTotals(date, meal) {
    const arr = state.foods.filter(x => x.date === date && x.meal === meal);
    return arr.reduce((a,x) => {
      NUTRIENTS.forEach(([k]) => a[k] += num(x[k]));
      return a;
    }, {cal:0,protein:0,carbs:0,fat:0,fibre:0,sugar:0,sodium:0});
  }

  function waterTotal(date) {
    ensureState();
    return state.waterIntake.filter(x => x.date === date).reduce((s,x) => s + num(x.ml), 0);
  }

  function addWater(ml, date = selectedDate()) {
    ml = Math.round(num(ml));
    if (ml < 25 || ml > 5000) return toast('Enter water between 25 and 5000 ml');
    state.waterIntake.push({ id: typeof id === 'function' ? id() : String(Date.now()), date, ml, created: Date.now() });
    save();
    renderWaterHome();
    if (q('#page-trends')?.classList.contains('active')) renderExtraTrends();
    toast(`Added ${ml} ml water`);
  }

  function undoWater(date = selectedDate()) {
    const candidates = state.waterIntake.filter(x => x.date === date).sort((a,b) => num(b.created) - num(a.created));
    if (!candidates.length) return toast('No water entry to undo');
    const last = candidates[0];
    state.waterIntake = state.waterIntake.filter(x => x.id !== last.id);
    save();
    renderWaterHome();
    if (q('#page-trends')?.classList.contains('active')) renderExtraTrends();
    toast(`Removed ${last.ml} ml`);
  }

  function injectStyles() {
    if (q('#trackingUpgradeStyles')) return;
    const style = document.createElement('style');
    style.id = 'trackingUpgradeStyles';
    style.textContent = `
      .water-progress,.meal-target-bar{height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin-top:8px}
      .water-progress>i,.meal-target-bar>i{display:block;height:100%;background:#14b8a6;border-radius:99px}
      .water-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
      .water-custom{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:10px;align-items:end}
      .meal-target-card{border:1px solid #e2e8f0;border-radius:16px;padding:12px;margin-top:10px;background:#fff}
      .meal-target-card h3{margin:0 0 8px;font-size:16px}
      .meal-target-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .meal-target-grid label{min-width:0}
      .meal-target-grid input{width:100%;min-width:0}
      .meal-target-mini{font-size:11px;color:#64748b;margin-top:5px;line-height:1.35}
      .target-mode-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
      .trend-control-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:10px}
      .trend-control-grid.one{grid-template-columns:1fr}
      .water-big{font-size:24px;font-weight:800;margin-top:4px}
      @media(max-width:420px){.water-actions{grid-template-columns:repeat(3,1fr)}.target-mode-actions{grid-template-columns:1fr}.trend-control-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureWaterCard() {
    if (q('#waterTodayCard')) return;
    const mealsCard = q('#mealSummary')?.closest('.section-card');
    if (!mealsCard) return;
    const card = document.createElement('section');
    card.id = 'waterTodayCard';
    card.className = 'section-card';
    card.innerHTML = `
      <div class="section-head"><h2>Water</h2><span id="waterTodayPct" class="pill">0%</span></div>
      <div class="muted">Drank on <span id="waterTodayDate"></span></div>
      <div class="water-big" id="waterTodayAmount">0 ml</div>
      <div class="muted" id="waterTodayTarget">of 2500 ml target</div>
      <div class="water-progress"><i id="waterProgressBar" style="width:0%"></i></div>
      <div class="water-actions">
        <button type="button" class="secondary" data-water-add="250">+250 ml</button>
        <button type="button" class="secondary" data-water-add="500">+500 ml</button>
        <button type="button" class="secondary" data-water-add="750">+750 ml</button>
      </div>
      <div class="water-custom"><label style="margin:0">Custom ml<input id="waterCustomMl" type="number" min="25" step="25" inputmode="numeric" placeholder="e.g. 350" /></label><button type="button" class="primary" id="waterCustomAdd">Add</button></div>
      <button type="button" class="link-btn" id="waterUndo" style="margin-top:10px">Undo last water entry</button>`;
    mealsCard.insertAdjacentElement('beforebegin', card);
    qa('[data-water-add]').forEach(b => b.addEventListener('click', () => addWater(b.dataset.waterAdd)));
    q('#waterCustomAdd')?.addEventListener('click', () => {
      const el = q('#waterCustomMl');
      addWater(el?.value);
      if (el) el.value = '';
    });
    q('#waterUndo')?.addEventListener('click', () => undoWater());
  }

  function renderWaterHome() {
    ensureWaterCard();
    const d = selectedDate();
    const total = waterTotal(d);
    const target = Math.round(num(state.profile.waterTarget, 2500));
    const pct = target ? Math.round(total / target * 100) : 0;
    if (q('#waterTodayDate')) q('#waterTodayDate').textContent = d;
    if (q('#waterTodayAmount')) q('#waterTodayAmount').textContent = total >= 1000 ? `${r(total/1000,2)} L` : `${total} ml`;
    if (q('#waterTodayTarget')) q('#waterTodayTarget').textContent = `of ${target} ml (${r(target/1000,2)} L) target`;
    if (q('#waterTodayPct')) q('#waterTodayPct').textContent = `${pct}%`;
    if (q('#waterProgressBar')) q('#waterProgressBar').style.width = `${Math.min(100, Math.max(0,pct))}%`;
  }

  function renderMealTargetSummary() {
    const d = selectedDate();
    const mt = currentMealTargets();
    const rows = qa('#mealSummary .meal-row');
    MEALS.forEach((meal, i) => {
      const row = rows[i]; if (!row) return;
      const left = row.firstElementChild; if (!left) return;
      left.querySelector('.meal-target-mini')?.remove();
      left.querySelector('.meal-target-bar')?.remove();
      const actual = mealTotals(d, meal), target = mt[meal];
      const mini = document.createElement('div');
      mini.className = 'meal-target-mini';
      mini.textContent = `Target ${Math.round(target.cal)} kcal · P ${r(actual.protein,1)}/${r(target.protein,1)}g · C ${r(actual.carbs,1)}/${r(target.carbs,1)}g · F ${r(actual.fat,1)}/${r(target.fat,1)}g`;
      const bar = document.createElement('div');
      bar.className = 'meal-target-bar';
      bar.innerHTML = `<i style="width:${Math.min(100, target.cal ? actual.cal/target.cal*100 : 0)}%"></i>`;
      left.appendChild(mini); left.appendChild(bar);
    });
  }

  function ensurePlanCards() {
    const page = q('#page-plan'); if (!page) return;
    if (!q('#mealTargetsCard')) {
      const card = document.createElement('section');
      card.id = 'mealTargetsCard';
      card.className = 'section-card';
      card.innerHTML = `
        <div class="section-head"><h2>Meal targets</h2><span id="mealTargetModePill" class="pill">Automatic</span></div>
        <p class="muted note">Set calories and nutrient targets for Breakfast, Lunch, Dinner and Snack. Automatic mode splits the current daily plan 25% / 35% / 30% / 10% and follows future calorie-plan changes.</p>
        <div class="target-mode-actions"><button type="button" class="secondary" id="useAutoMealTargets">Use automatic split</button><button type="button" class="primary" id="saveCustomMealTargets">Save custom targets</button></div>
        <div id="mealTargetsEditor"></div>
        <div id="mealTargetsCheck" class="plan-status" style="margin-top:12px"></div>`;
      const dailyPlanCard = q('#planExplanation')?.closest('.section-card');
      dailyPlanCard?.insertAdjacentElement('afterend', card);
      q('#useAutoMealTargets')?.addEventListener('click', () => {
        state.profile.mealTargetMode = 'auto';
        state.profile.mealTargets = autoMealTargets();
        save();
        populateMealTargetInputs(true);
        renderAll();
        toast('Meal targets now follow your daily plan');
      });
      q('#saveCustomMealTargets')?.addEventListener('click', saveCustomMealTargets);
    }
    if (!q('#waterTargetCard')) {
      const card = document.createElement('section');
      card.id = 'waterTargetCard';
      card.className = 'section-card';
      card.innerHTML = `
        <div class="section-head"><h2>Water target</h2><span class="pill">Daily</span></div>
        <p class="muted note">Set the amount you want NutriTrack to track each day.</p>
        <div class="field-row two"><label>Daily water target ml<input id="waterTargetInput" type="number" min="500" max="10000" step="100" inputmode="numeric" /></label><label>Target litres<input id="waterTargetLitres" type="text" readonly /></label></div>
        <button type="button" class="primary wide" id="saveWaterTarget">Save water target</button>`;
      q('#mealTargetsCard')?.insertAdjacentElement('afterend', card);
      q('#waterTargetInput')?.addEventListener('input', () => {
        const ml = num(q('#waterTargetInput')?.value);
        if (q('#waterTargetLitres')) q('#waterTargetLitres').value = ml ? `${r(ml/1000,2)} L` : '';
      });
      q('#saveWaterTarget')?.addEventListener('click', () => {
        const ml = Math.round(num(q('#waterTargetInput')?.value));
        if (ml < 500 || ml > 10000) return toast('Choose a water target between 500 and 10000 ml');
        state.profile.waterTarget = ml;
        save(); renderWaterHome(); renderExtraTrends(); toast('Water target saved');
      });
    }
    buildMealTargetInputs();
  }

  function buildMealTargetInputs() {
    const box = q('#mealTargetsEditor'); if (!box || box.children.length) return;
    box.innerHTML = MEALS.map(meal => `
      <div class="meal-target-card" data-meal-target-card="${meal}">
        <h3>${meal} <span class="muted" style="font-weight:400">(${Math.round(SHARES[meal]*100)}% auto split)</span></h3>
        <div class="meal-target-grid">${NUTRIENTS.map(([key,label,unit,digits]) => `<label>${label} ${unit}<input data-meal-target="${meal}" data-nutrient="${key}" type="number" min="0" step="${digits ? '0.1' : '1'}" inputmode="decimal" /></label>`).join('')}</div>
      </div>`).join('');
  }

  function populateMealTargetInputs(force = false) {
    ensurePlanCards();
    const active = document.activeElement;
    if (!force && active?.matches?.('[data-meal-target]')) return;
    const vals = currentMealTargets();
    qa('[data-meal-target]').forEach(inp => {
      const meal = inp.dataset.mealTarget, key = inp.dataset.nutrient;
      inp.value = vals?.[meal]?.[key] ?? '';
    });
    const mode = state.profile.mealTargetMode === 'manual' ? 'Custom' : 'Automatic';
    if (q('#mealTargetModePill')) q('#mealTargetModePill').textContent = mode;
    if (q('#waterTargetInput')) q('#waterTargetInput').value = Math.round(num(state.profile.waterTarget,2500));
    if (q('#waterTargetLitres')) q('#waterTargetLitres').value = `${r(num(state.profile.waterTarget,2500)/1000,2)} L`;
    renderMealTargetCheck();
  }

  function readMealInputs() {
    const out = Object.fromEntries(MEALS.map(m => [m, {}]));
    qa('[data-meal-target]').forEach(inp => {
      out[inp.dataset.mealTarget][inp.dataset.nutrient] = Math.max(0, num(inp.value));
    });
    return out;
  }

  function saveCustomMealTargets() {
    const vals = readMealInputs();
    state.profile.mealTargets = vals;
    state.profile.mealTargetMode = 'manual';
    save();
    populateMealTargetInputs(true);
    renderAll();
    toast('Custom meal targets saved');
  }

  function renderMealTargetCheck() {
    const box = q('#mealTargetsCheck'); if (!box) return;
    const vals = q('[data-meal-target]') ? readMealInputs() : currentMealTargets();
    const daily = targets();
    const sums = {};
    NUTRIENTS.forEach(([key]) => sums[key] = MEALS.reduce((s,m) => s + num(vals[m]?.[key]),0));
    const calDiff = Math.round(sums.cal - daily.cal);
    const pDiff = r(sums.protein - daily.protein,1);
    box.className = `plan-status ${Math.abs(calDiff) <= 10 && Math.abs(pDiff) <= 2 ? 'ok' : 'warn'}`;
    box.innerHTML = `Meal totals: <strong>${Math.round(sums.cal)} kcal</strong> vs daily <strong>${daily.cal} kcal</strong> · Protein <strong>${r(sums.protein,1)} g</strong> vs <strong>${daily.protein} g</strong>${state.profile.mealTargetMode === 'auto' ? ' · Auto-synced with your plan.' : ' · Custom targets stay fixed until you edit them.'}`;
  }

  function ensureTrendCards() {
    const page = q('#page-trends'); if (!page) return;
    if (!q('#chartBodyMetric')) {
      const body = document.createElement('section');
      body.className = 'chart-card';
      body.innerHTML = `<div class="section-head"><h3>RENPHO / body metric</h3><span class="muted" id="bodyMetricSummary"></span></div><div class="trend-control-grid one"><label>Metric<select id="bodyMetricSelect">${BODY_METRICS.map(([k,l,u])=>`<option value="${k}">${l}${u?` (${u})`:''}</option>`).join('')}</select></label></div><canvas id="chartBodyMetric" width="760" height="300"></canvas>`;
      page.appendChild(body);
      q('#bodyMetricSelect')?.addEventListener('change', renderExtraTrends);
    }
    if (!q('#chartWaterIntake')) {
      const water = document.createElement('section');
      water.className = 'chart-card';
      water.innerHTML = `<div class="section-head"><h3>Water intake</h3><span class="muted" id="waterTrendSummary"></span></div><canvas id="chartWaterIntake" width="760" height="300"></canvas>`;
      page.appendChild(water);
    }
    if (!q('#chartMealNutrient')) {
      const meal = document.createElement('section');
      meal.className = 'chart-card';
      meal.innerHTML = `<div class="section-head"><h3>Meal target trend</h3><span class="muted" id="mealTrendSummary"></span></div><div class="trend-control-grid"><label>Meal<select id="mealTrendMeal">${MEALS.map(m=>`<option>${m}</option>`).join('')}</select></label><label>Nutrient<select id="mealTrendNutrient">${NUTRIENTS.map(([k,l,u])=>`<option value="${k}">${l}${u?` (${u})`:''}</option>`).join('')}</select></label></div><canvas id="chartMealNutrient" width="760" height="300"></canvas>`;
      page.appendChild(meal);
      q('#mealTrendMeal')?.addEventListener('change', renderExtraTrends);
      q('#mealTrendNutrient')?.addEventListener('change', renderExtraTrends);
    }
  }

  function rangeLabels() {
    const days = num(q('#trendRange')?.value, 30), labels = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); labels.push(dateISO(d));
    }
    return labels;
  }

  function avgNonNull(vals) {
    const x = vals.filter(v => v != null && Number.isFinite(Number(v)));
    return x.length ? r(x.reduce((s,v)=>s+num(v),0)/x.length,1) : null;
  }

  function renderExtraTrends() {
    ensureTrendCards(); ensureState();
    const labels = rangeLabels();
    const bodyMap = Object.fromEntries(state.body.map(x => [x.date,x]));
    const key = q('#bodyMetricSelect')?.value || 'weight';
    const meta = BODY_METRICS.find(x => x[0] === key) || BODY_METRICS[0];
    const bodyVals = labels.map(d => {
      const v = bodyMap[d]?.[key]; return v == null ? null : num(v);
    });
    if (q('#chartBodyMetric')) drawChart('chartBodyMetric', labels, bodyVals, null);
    const ba = avgNonNull(bodyVals);
    if (q('#bodyMetricSummary')) q('#bodyMetricSummary').textContent = ba == null ? 'No data' : `Avg ${ba}${meta[2] ? ' '+meta[2] : ''}`;

    const waterVals = labels.map(d => {
      const entries = state.waterIntake.filter(x => x.date === d);
      return entries.length ? entries.reduce((s,x)=>s+num(x.ml),0) : null;
    });
    const wt = Math.round(num(state.profile.waterTarget,2500));
    if (q('#chartWaterIntake')) drawChart('chartWaterIntake', labels, waterVals, wt);
    const wa = avgNonNull(waterVals);
    if (q('#waterTrendSummary')) q('#waterTrendSummary').textContent = wa == null ? `Target ${wt} ml` : `Avg ${Math.round(wa)} ml · target ${wt} ml`;

    const meal = q('#mealTrendMeal')?.value || 'Breakfast';
    const nutrient = q('#mealTrendNutrient')?.value || 'cal';
    const nmeta = NUTRIENTS.find(x => x[0] === nutrient) || NUTRIENTS[0];
    const mealVals = labels.map(d => {
      const items = state.foods.filter(x => x.date === d && x.meal === meal);
      return items.length ? items.reduce((s,x)=>s+num(x[nutrient]),0) : null;
    });
    const target = num(currentMealTargets()?.[meal]?.[nutrient]);
    if (q('#chartMealNutrient')) drawChart('chartMealNutrient', labels, mealVals, target);
    const ma = avgNonNull(mealVals);
    if (q('#mealTrendSummary')) q('#mealTrendSummary').textContent = `${meal} ${nmeta[1]} · ${ma == null ? 'no data' : `avg ${ma}${nmeta[2]}`} · target ${r(target,nmeta[3])}${nmeta[2]}`;
  }

  injectStyles();
  ensureWaterCard();
  ensurePlanCards();
  ensureTrendCards();
  populateMealTargetInputs(true);

  // Keep custom data when the original Settings save replaces state.profile.
  const profileBtn = q('#saveProfile');
  if (profileBtn && typeof profileBtn.onclick === 'function') {
    const previous = profileBtn.onclick;
    profileBtn.onclick = () => {
      ensureState();
      const mealTargets = clone(state.profile.mealTargets);
      const mealTargetMode = state.profile.mealTargetMode;
      const waterTarget = state.profile.waterTarget;
      previous();
      state.profile.mealTargets = mealTargets || {};
      state.profile.mealTargetMode = mealTargetMode || 'auto';
      state.profile.waterTarget = waterTarget || 2500;
      save();
      renderAll();
      populateMealTargetInputs(true);
    };
  }

  // Add water and meal-target information after the original home render.
  if (typeof renderHome === 'function') {
    const previousRenderHome = renderHome;
    renderHome = function () {
      previousRenderHome();
      renderMealTargetSummary();
      renderWaterHome();
    };
    if (q('#selectedDate')) q('#selectedDate').onchange = renderHome;
  }

  // Extend the existing Trends page with body, water and mealwise charts.
  if (typeof renderTrends === 'function') {
    const previousRenderTrends = renderTrends;
    renderTrends = function () {
      previousRenderTrends();
      renderExtraTrends();
    };
    if (q('#trendRange')) q('#trendRange').onchange = renderTrends;
  }

  // Ensure imported backups / erase operations gain the new defaults and UI updates.
  if (typeof renderAll === 'function') {
    const previousRenderAll = renderAll;
    renderAll = function () {
      ensureState();
      previousRenderAll();
      renderMealTargetSummary();
      renderWaterHome();
      if (state.profile.mealTargetMode === 'auto') populateMealTargetInputs(true);
      else renderMealTargetCheck();
      if (q('#page-trends')?.classList.contains('active')) renderExtraTrends();
    };
  }

  // When body data changes, extra body graphs should refresh immediately if visible.
  q('#saveBody')?.addEventListener('click', () => setTimeout(() => {
    if (q('#page-trends')?.classList.contains('active')) renderExtraTrends();
  }, 0));

  save();
  renderAll();
  populateMealTargetInputs(true);
})();


// v8.2: logged-food editor + sugar visibility upgrade
(() => {
  'use strict';

  const q2 = s => document.querySelector(s);
  const qa2 = s => [...document.querySelectorAll(s)];
  const esc2 = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const num2 = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
  const round2 = (v, d = 1) => Math.round(num2(v) * 10 ** d) / 10 ** d;

  function injectFoodEditStyles() {
    if (q2('#foodEditSugarStyles')) return;
    const style = document.createElement('style');
    style.id = 'foodEditSugarStyles';
    style.textContent = `
      .logged-food-row{align-items:flex-start;gap:10px}
      .logged-food-row>div:first-child{min-width:0;flex:1}
      .logged-food-row .row-actions{display:flex;flex-direction:column;align-items:flex-end;gap:7px;flex:0 0 auto}
      .log-nutrients{margin-top:5px;line-height:1.45}
      .edit-food-mini{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:10px;padding:7px 10px;font-weight:700;font-size:12px;min-height:34px}
      .edit-food-mini:active{transform:translateY(1px)}
      .food-log-heading-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .other-nutrient-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .other-nutrient-card{border:1px solid #e2e8f0;border-radius:14px;padding:10px;background:#f8fafc;min-width:0}
      .other-nutrient-card strong{display:block;font-size:18px;margin:3px 0 2px}
      .other-nutrient-card small{display:block;color:#64748b;font-size:11px;line-height:1.3}
      .other-nutrient-card .mini-bar{margin-top:7px}
      #editFoodDialog .form-grid{margin-top:12px}
      #editFoodDialog .dialog-actions{align-items:center}
      #deleteEditedFood{margin-right:auto}
      @media(max-width:430px){
        .other-nutrient-grid{grid-template-columns:1fr}
        .logged-food-row{display:block}
        .logged-food-row .row-actions{margin-top:10px;flex-direction:row;align-items:center;justify-content:flex-end;flex-wrap:wrap}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureEditDialog() {
    if (q2('#editFoodDialog')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'editFoodDialog';
    dialog.innerHTML = `
      <form method="dialog" class="dialog-card" id="editFoodForm">
        <button class="dialog-close" value="cancel" aria-label="Close">×</button>
        <h3>Edit logged food</h3>
        <p class="muted" id="editFoodHint">Change the serving or any nutrition value, then save.</p>
        <div class="form-grid compact">
          <label>Date<input id="editFoodDate" type="date" /></label>
          <label>Meal<select id="editFoodMeal"><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select></label>
          <label>Name<input id="editFoodName" /></label>
          <label>Serving<input id="editFoodServing" placeholder="e.g. 150 g" /></label>
          <label>Calories<input id="editFoodCal" type="number" step="1" min="0" inputmode="decimal" /></label>
          <label>Protein g<input id="editFoodProtein" type="number" step="0.1" min="0" inputmode="decimal" /></label>
          <label>Carbs g<input id="editFoodCarbs" type="number" step="0.1" min="0" inputmode="decimal" /></label>
          <label>Fat g<input id="editFoodFat" type="number" step="0.1" min="0" inputmode="decimal" /></label>
          <label>Fibre g<input id="editFoodFibre" type="number" step="0.1" min="0" inputmode="decimal" /></label>
          <label>Sugar g<input id="editFoodSugar" type="number" step="0.1" min="0" inputmode="decimal" /></label>
          <label>Sodium mg<input id="editFoodSodium" type="number" step="1" min="0" inputmode="decimal" /></label>
        </div>
        <div class="dialog-actions">
          <button type="button" class="danger" id="deleteEditedFood">Delete</button>
          <button value="cancel" class="secondary">Cancel</button>
          <button type="button" class="primary" id="saveEditedFood">Save changes</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);
    q2('#saveEditedFood')?.addEventListener('click', saveEditedFood);
    q2('#deleteEditedFood')?.addEventListener('click', deleteEditedFood);
  }

  let editingFoodId = null;

  function openLoggedFoodEditor(fid) {
    ensureEditDialog();
    const item = state.foods.find(x => String(x.id) === String(fid));
    if (!item) return toast('Food entry not found');
    editingFoodId = item.id;
    const set = (id, value) => { const el = q2('#' + id); if (el) el.value = value ?? ''; };
    set('editFoodDate', item.date || (q2('#foodDate')?.value || today()));
    set('editFoodMeal', item.meal || 'Breakfast');
    set('editFoodName', item.name || '');
    set('editFoodServing', item.serving || '');
    set('editFoodCal', round2(item.cal, 0));
    set('editFoodProtein', round2(item.protein, 1));
    set('editFoodCarbs', round2(item.carbs, 1));
    set('editFoodFat', round2(item.fat, 1));
    set('editFoodFibre', round2(item.fibre, 1));
    set('editFoodSugar', round2(item.sugar, 1));
    set('editFoodSodium', round2(item.sodium, 0));
    q2('#editFoodDialog')?.showModal();
  }

  function saveEditedFood() {
    const item = state.foods.find(x => String(x.id) === String(editingFoodId));
    if (!item) return toast('Food entry not found');
    const name = q2('#editFoodName')?.value.trim();
    const date = q2('#editFoodDate')?.value;
    if (!name) return toast('Enter a food name');
    if (!date) return toast('Choose a date');
    Object.assign(item, {
      date,
      meal: q2('#editFoodMeal')?.value || 'Breakfast',
      name,
      serving: q2('#editFoodServing')?.value.trim() || 'custom',
      cal: Math.max(0, num2(q2('#editFoodCal')?.value)),
      protein: Math.max(0, num2(q2('#editFoodProtein')?.value)),
      carbs: Math.max(0, num2(q2('#editFoodCarbs')?.value)),
      fat: Math.max(0, num2(q2('#editFoodFat')?.value)),
      fibre: Math.max(0, num2(q2('#editFoodFibre')?.value)),
      sugar: Math.max(0, num2(q2('#editFoodSugar')?.value)),
      sodium: Math.max(0, num2(q2('#editFoodSodium')?.value)),
      updated: Date.now()
    });
    save();
    q2('#editFoodDialog')?.close();
    editingFoodId = null;
    renderAll();
    toast('Food entry updated');
  }

  function deleteEditedFood() {
    const item = state.foods.find(x => String(x.id) === String(editingFoodId));
    if (!item) return;
    if (!confirm(`Delete ${item.name || 'this food'} from the log?`)) return;
    state.foods = state.foods.filter(x => String(x.id) !== String(editingFoodId));
    save();
    q2('#editFoodDialog')?.close();
    editingFoodId = null;
    renderAll();
    toast('Food removed');
  }

  function deleteLoggedFood(fid) {
    const item = state.foods.find(x => String(x.id) === String(fid));
    if (!item) return;
    if (!confirm(`Delete ${item.name || 'this food'} from the log?`)) return;
    state.foods = state.foods.filter(x => String(x.id) !== String(fid));
    save();
    renderAll();
    toast('Food removed');
  }

  function renderEditableFoodLog() {
    const date = q2('#foodDate')?.value || today();
    const arr = state.foods
      .filter(x => x.date === date)
      .sort((a,b) => num2(a.created) - num2(b.created));
    const t = totals(date);
    const totalPill = q2('#logTotal');
    if (totalPill) totalPill.textContent = `${Math.round(t.cal)} kcal · Sugar ${round2(t.sugar, 1)} g`;
    const heading = q2('#foodLog')?.closest('.section-card')?.querySelector('.section-head h2');
    if (heading) heading.textContent = 'Logged foods';
    const box = q2('#foodLog');
    if (!box) return;
    box.innerHTML = arr.length ? arr.map(x => `
      <div class="log-row logged-food-row">
        <div>
          <strong>${esc2(x.name)}</strong>
          <div class="row-meta">${esc2(x.meal || '')} · ${esc2(x.serving || '')}</div>
          <div class="row-meta log-nutrients">P ${round2(x.protein,1)}g · C ${round2(x.carbs,1)}g · F ${round2(x.fat,1)}g · <strong>Sugar ${round2(x.sugar,1)}g</strong></div>
          <div class="row-meta">Fibre ${round2(x.fibre,1)}g · Sodium ${Math.round(num2(x.sodium))}mg</div>
        </div>
        <div class="row-actions">
          <strong>${Math.round(num2(x.cal))} kcal</strong>
          <button type="button" class="edit-food-mini" data-edit-food="${esc2(x.id)}">View / Edit</button>
          <button type="button" class="delete-mini" aria-label="Delete food" data-del-food-v82="${esc2(x.id)}">×</button>
        </div>
      </div>`).join('') : '<div class="empty-copy">Nothing logged for this day.</div>';
    qa2('[data-edit-food]').forEach(b => b.addEventListener('click', () => openLoggedFoodEditor(b.dataset.editFood)));
    qa2('[data-del-food-v82]').forEach(b => b.addEventListener('click', () => deleteLoggedFood(b.dataset.delFoodV82)));
  }

  function addSugarToFoodResults() {
    qa2('#foodResults .food-result').forEach(row => {
      const add = row.querySelector('[data-food]');
      const nutrition = row.querySelector('.nutrition');
      if (!add || !nutrition || /(?:^|·)\s*Sugar\s/i.test(nutrition.textContent)) return;
      const food = FOOD_DB.find(f => String(f.id) === String(add.dataset.food));
      if (!food) return;
      nutrition.textContent += ` · Sugar ${round2(food.sugar,1)}g`;
    });
  }

  function renderFullDialogNutrition() {
    if (!dialogFood) return;
    const qty = Math.max(.1, num2(q2('#dialogQty')?.value, 1));
    const box = q2('#dialogNutrition');
    if (!box) return;
    const vals = [
      ['Calories', dialogFood.cal * qty, 'kcal', 0],
      ['Protein', dialogFood.protein * qty, 'g', 1],
      ['Carbs', dialogFood.carbs * qty, 'g', 1],
      ['Fat', dialogFood.fat * qty, 'g', 1],
      ['Fibre', dialogFood.fibre * qty, 'g', 1],
      ['Sugar', dialogFood.sugar * qty, 'g', 1],
      ['Sodium', dialogFood.sodium * qty, 'mg', 0]
    ];
    box.innerHTML = vals.map(([label,value,unit,digits]) => `<div><b>${round2(value,digits)} ${unit}</b><span>${label}</span></div>`).join('');
  }

  function ensureViewEditButton() {
    const head = q2('#mealSummary')?.closest('.section-card')?.querySelector('.section-head');
    if (!head || q2('#viewEditFoodLog')) return;
    const actions = document.createElement('div');
    actions.className = 'food-log-heading-actions';
    const existingAdd = head.querySelector('[data-nav="food"]');
    if (existingAdd) actions.appendChild(existingAdd);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'viewEditFoodLog';
    btn.className = 'link-btn';
    btn.textContent = 'View / edit';
    actions.appendChild(btn);
    head.appendChild(actions);
    btn.addEventListener('click', () => {
      const date = selectedDate();
      if (q2('#foodDate')) q2('#foodDate').value = date;
      renderFoodLog();
      navigate('food');
      setTimeout(() => q2('#foodLog')?.closest('.section-card')?.scrollIntoView({behavior:'smooth',block:'start'}), 120);
    });
  }

  function ensureOtherNutrientsCard() {
    if (q2('#otherNutrientsCard')) return;
    const macroGrid = q2('#macroGrid');
    if (!macroGrid) return;
    const card = document.createElement('section');
    card.id = 'otherNutrientsCard';
    card.className = 'section-card';
    card.innerHTML = '<div class="section-head"><h2>Other nutrients</h2><span class="pill">Daily</span></div><div id="otherNutrientGrid" class="other-nutrient-grid"></div>';
    macroGrid.insertAdjacentElement('afterend', card);
  }

  function renderOtherNutrients() {
    ensureOtherNutrientsCard();
    const box = q2('#otherNutrientGrid');
    if (!box) return;
    const t = totals(selectedDate());
    const g = targets();
    const items = [
      ['Fibre', t.fibre, g.fibre, 'g', 1],
      ['Sugar', t.sugar, g.sugar, 'g', 1],
      ['Sodium', t.sodium, g.sodium, 'mg', 0]
    ];
    box.innerHTML = items.map(([label,value,target,unit,digits]) => {
      const p = target ? Math.min(100, Math.max(0, num2(value) / num2(target) * 100)) : 0;
      return `<div class="other-nutrient-card"><span class="muted">${label}</span><strong>${round2(value,digits)}${unit}</strong><div class="mini-bar"><i style="width:${p}%"></i></div><small>${round2(target,digits)}${unit} target</small></div>`;
    }).join('');
  }

  injectFoodEditStyles();
  ensureEditDialog();
  ensureViewEditButton();
  ensureOtherNutrientsCard();

  // Show sugar in every local / saved-food result.
  if (typeof renderFoodResults === 'function') {
    const previousRenderFoodResultsV82 = renderFoodResults;
    renderFoodResults = function () {
      previousRenderFoodResultsV82();
      addSugarToFoodResults();
    };
  }

  // Show full nutrition, including sugar, when choosing a serving.
  if (typeof renderDialogNutrition === 'function') {
    renderDialogNutrition = renderFullDialogNutrition;
    q2('#dialogQty')?.addEventListener('input', renderFullDialogNutrition);
  }

  // Replace the delete-only daily log with a proper view/edit log.
  if (typeof renderFoodLog === 'function') {
    renderFoodLog = renderEditableFoodLog;
    if (q2('#foodDate')) q2('#foodDate').onchange = renderFoodLog;
  }

  // Add fibre / sugar / sodium progress to Today.
  if (typeof renderHome === 'function') {
    const previousRenderHomeV82 = renderHome;
    renderHome = function () {
      previousRenderHomeV82();
      ensureViewEditButton();
      renderOtherNutrients();
    };
    if (q2('#selectedDate')) q2('#selectedDate').onchange = renderHome;
  }

  renderFoodResults();
  renderFoodLog();
  renderHome();
})();
