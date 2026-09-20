/* NutriTrack weight-loss goal planner
   Adds a target-weight/date plan and safely overrides the original fixed calorie adjustment
   while an active plan is saved. All data remains in NutriTrack's existing local state. */
(() => {
  'use strict';

  if (typeof state === 'undefined' || typeof targets !== 'function' || typeof save !== 'function') {
    console.warn('NutriTrack planner: app.js was not ready');
    return;
  }

  const q = (s) => document.querySelector(s);
  const DAY = 86400000;
  const KCAL_PER_KG = 7700; // planning approximation, not a promise of linear weight loss
  const MAX_DAILY_DEFICIT = 1000;

  const isoToday = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseDate = (s) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return null;
    const [y, m, d] = s.split('-').map(Number);
    const x = new Date(Date.UTC(y, m - 1, d));
    return Number.isNaN(x.getTime()) ? null : x;
  };

  const addDays = (iso, days) => {
    const d = parseDate(iso) || parseDate(isoToday());
    d.setUTCDate(d.getUTCDate() + Math.max(0, Math.ceil(days)));
    return d.toISOString().slice(0, 10);
  };

  const daysBetween = (fromISO, toISO) => {
    const a = parseDate(fromISO), b = parseDate(toISO);
    if (!a || !b) return 0;
    return Math.ceil((b - a) / DAY);
  };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const num = (v, fallback = 0) => Number.isFinite(+v) ? +v : fallback;
  const round1 = (v) => Math.round(v * 10) / 10;
  const prettyDate = (iso) => {
    const d = parseDate(iso);
    return d ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d) : iso;
  };

  function maintenanceFor(profile, weightOverride) {
    const weight = num(weightOverride, num(profile.weight));
    const height = num(profile.height);
    const age = num(profile.age);
    const activity = num(profile.activity, 1.2);
    if (!weight || !height || !age) return 0;
    const bmr = 10 * weight + 6.25 * height - 5 * age + (profile.sex === 'male' ? 5 : -161);
    return Math.max(0, Math.round(bmr * activity));
  }

  function macroTargets(calories, targetWeight) {
    // Protein is anchored to goal weight so a higher starting body weight does not inflate the target excessively.
    const protein = Math.round(clamp(num(targetWeight) * 1.6, 80, 200));
    const fat = Math.round(Math.max(40, calories * 0.27 / 9));
    const carbs = Math.round(Math.max(50, (calories - protein * 4 - fat * 9) / 4));
    const fibre = Math.round(Math.max(25, calories / 1000 * 14));
    return {
      protein,
      fat,
      carbs,
      fibre,
      sugar: Math.round(calories * 0.05 / 4),
      sodium: 2300
    };
  }

  function evaluatePlan(planLike, profile = state.profile) {
    const current = num(planLike?.currentWeight, num(profile.weight));
    const target = num(planLike?.targetWeight);
    const targetDate = String(planLike?.targetDate || '');
    const todayISO = isoToday();
    const days = daysBetween(todayISO, targetDate);
    const loss = current - target;
    const maintenance = maintenanceFor(profile, current);
    const floor = profile.sex === 'male' ? 1500 : 1200;

    const result = {
      valid: false, current, target, targetDate, days, loss, maintenance, floor,
      reason: '', requiredDeficit: 0, appliedDeficit: 0, calories: 0,
      requiredRate: 0, appliedRate: 0, aggressive: false, projectedDate: '', macros: null
    };

    if (!current || current < 35 || current > 350) {
      result.reason = 'Enter a valid current weight.';
      return result;
    }
    if (!target || target < 35 || target >= current) {
      result.reason = 'Target weight must be lower than your current weight.';
      return result;
    }
    if (!parseDate(targetDate) || days < 1) {
      result.reason = 'Choose a target date in the future.';
      return result;
    }
    if (!maintenance) {
      result.reason = 'Complete age, height, sex and activity in Settings first.';
      return result;
    }

    const requiredDeficit = loss * KCAL_PER_KG / days;
    const maxByFloor = Math.max(0, maintenance - floor);
    const safeCap = Math.max(0, Math.min(MAX_DAILY_DEFICIT, maxByFloor));
    const appliedDeficit = Math.min(requiredDeficit, safeCap);
    const calories = Math.max(floor, Math.round(maintenance - appliedDeficit));
    const requiredRate = loss / (days / 7);
    const appliedRate = appliedDeficit * 7 / KCAL_PER_KG;
    const aggressive = requiredDeficit > safeCap + 5;
    const daysAtApplied = appliedDeficit > 0 ? Math.ceil(loss * KCAL_PER_KG / appliedDeficit) : 0;

    result.valid = true;
    result.requiredDeficit = requiredDeficit;
    result.appliedDeficit = appliedDeficit;
    result.calories = calories;
    result.requiredRate = requiredRate;
    result.appliedRate = appliedRate;
    result.aggressive = aggressive;
    result.projectedDate = aggressive && daysAtApplied ? addDays(todayISO, daysAtApplied) : targetDate;
    result.macros = macroTargets(calories, target);
    return result;
  }

  // Replace the original fixed -250 / -500 target only while a valid saved plan is active.
  const originalTargets = targets;
  targets = function () {
    const p = state.profile || {};
    const plan = p.plan;
    if (!plan || !plan.active) return originalTargets();

    const ev = evaluatePlan({
      currentWeight: p.weight,
      targetWeight: plan.targetWeight,
      targetDate: plan.targetDate
    }, p);
    if (!ev.valid) return originalTargets();

    return {
      cal: ev.calories,
      protein: ev.macros.protein,
      carbs: ev.macros.carbs,
      fat: ev.macros.fat,
      fibre: ev.macros.fibre,
      sugar: ev.macros.sugar,
      sodium: ev.macros.sodium
    };
  };

  function ensureHomePlanNote() {
    const macro = q('#macroGrid');
    if (!macro || q('#weightPlanHomeNote')) return;
    const note = document.createElement('div');
    note.id = 'weightPlanHomeNote';
    note.className = 'plan-home-note';
    note.style.display = 'none';
    macro.insertAdjacentElement('afterend', note);
  }

  function draftFromInputs() {
    return {
      currentWeight: num(q('#planCurrentWeight')?.value),
      targetWeight: num(q('#planTargetWeight')?.value),
      targetDate: q('#planTargetDate')?.value || ''
    };
  }

  function renderPlan(useDraft = false) {
    const plan = state.profile?.plan || {};
    const saved = {
      currentWeight: num(state.profile?.weight),
      targetWeight: num(plan.targetWeight),
      targetDate: plan.targetDate || ''
    };
    const source = useDraft ? draftFromInputs() : saved;

    if (!useDraft) {
      if (q('#planCurrentWeight')) q('#planCurrentWeight').value = source.currentWeight || '';
      if (q('#planTargetWeight')) q('#planTargetWeight').value = source.targetWeight || '';
      if (q('#planTargetDate')) q('#planTargetDate').value = source.targetDate || '';
    }

    const ev = evaluatePlan(source);
    const active = !!plan.active;
    if (q('#planActivePill')) q('#planActivePill').textContent = active ? 'Active' : 'Not active';
    if (q('#planWeeks')) q('#planWeeks').value = ev.days > 0 ? `${round1(ev.days / 7)} weeks` : '';

    const set = (id, txt) => { const el = q(id); if (el) el.textContent = txt; };
    const validation = q('#planValidation');
    const explanation = q('#planExplanation');

    if (!ev.valid) {
      set('#planCalories', '—'); set('#planMaintenance', ev.maintenance ? `${ev.maintenance} kcal` : '—');
      set('#planProtein', '—'); set('#planCarbs', '—'); set('#planFat', '—'); set('#planFibre', '—'); set('#planPace', '');
      if (validation) {
        validation.style.display = useDraft ? 'block' : (source.targetWeight || source.targetDate ? 'block' : 'none');
        validation.className = 'plan-status warn';
        validation.textContent = ev.reason;
      }
      if (explanation) explanation.textContent = 'Enter your goal above to see a personalized starting target.';
      updateHomeNote();
      return;
    }

    set('#planCalories', `${ev.calories} kcal`);
    set('#planMaintenance', `${ev.maintenance} kcal`);
    set('#planProtein', `${ev.macros.protein} g`);
    set('#planCarbs', `${ev.macros.carbs} g`);
    set('#planFat', `${ev.macros.fat} g`);
    set('#planFibre', `${ev.macros.fibre} g`);
    set('#planPace', `${round1(ev.appliedRate)} kg/week`);

    if (validation) {
      validation.style.display = 'block';
      validation.className = `plan-status ${ev.aggressive ? 'warn' : 'ok'}`;
      validation.textContent = ev.aggressive
        ? `That date would require about ${Math.round(ev.requiredDeficit)} kcal/day of deficit (${round1(ev.requiredRate)} kg/week). NutriTrack will cap the plan at about ${Math.round(ev.appliedDeficit)} kcal/day instead.`
        : `This works out to about ${Math.round(ev.appliedDeficit)} kcal/day of deficit and roughly ${round1(ev.appliedRate)} kg/week at your current estimate.`;
    }

    if (explanation) {
      explanation.className = `plan-status ${ev.aggressive ? 'warn' : 'ok'}`;
      explanation.innerHTML = ev.aggressive
        ? `Requested goal: <strong>${round1(ev.current)} → ${round1(ev.target)} kg by ${prettyDate(ev.targetDate)}</strong>.<br>At the current capped pace, the rough projection is <strong>${prettyDate(ev.projectedDate)}</strong>. This will recalculate as your logged weight changes.<br>Also aim around <strong>${ev.macros.fibre} g fibre</strong>; sodium target is <strong>≤ ${ev.macros.sodium} mg/day</strong>.`
        : `Goal: <strong>${round1(ev.current)} → ${round1(ev.target)} kg by ${prettyDate(ev.targetDate)}</strong>.<br>Starting calorie target: <strong>${ev.calories} kcal/day</strong>. It will automatically recalculate when your current weight changes.<br>Also aim around <strong>${ev.macros.fibre} g fibre</strong>; sodium target is <strong>≤ ${ev.macros.sodium} mg/day</strong>.`;
    }
    updateHomeNote();
  }

  function updateHomeNote() {
    ensureHomePlanNote();
    const el = q('#weightPlanHomeNote');
    if (!el) return;
    const plan = state.profile?.plan;
    if (!plan?.active) { el.style.display = 'none'; return; }
    const ev = evaluatePlan({ currentWeight: state.profile.weight, targetWeight: plan.targetWeight, targetDate: plan.targetDate });
    if (!ev.valid) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.innerHTML = `<strong>Active plan:</strong> ${round1(ev.current)} → ${round1(ev.target)} kg · ${ev.calories} kcal/day · ${round1(ev.appliedRate)} kg/week${ev.aggressive ? ` · requested date is aggressive; current projection ${prettyDate(ev.projectedDate)}` : ` · target ${prettyDate(ev.targetDate)}`}`;
  }

  function savePlan() {
    const draft = draftFromInputs();
    const ev = evaluatePlan(draft);
    renderPlan(true);
    if (!ev.valid) return;

    state.profile.weight = round1(draft.currentWeight);
    state.profile.plan = {
      active: true,
      targetWeight: round1(draft.targetWeight),
      targetDate: draft.targetDate,
      startedAt: state.profile?.plan?.startedAt || isoToday(),
      updatedAt: isoToday()
    };
    save();
    if (typeof renderAll === 'function') renderAll();
    renderPlan(false);
    if (typeof toast === 'function') toast('Weight-loss plan saved');
  }

  function disablePlan() {
    if (!state.profile.plan) state.profile.plan = {};
    state.profile.plan.active = false;
    state.profile.plan.updatedAt = isoToday();
    save();
    if (typeof renderAll === 'function') renderAll();
    renderPlan(false);
    if (typeof toast === 'function') toast('Manual calorie target restored');
  }

  q('#saveWeightPlan')?.addEventListener('click', savePlan);
  q('#disableWeightPlan')?.addEventListener('click', disablePlan);
  ['#planCurrentWeight', '#planTargetWeight', '#planTargetDate'].forEach((sel) => {
    q(sel)?.addEventListener('input', () => renderPlan(true));
    q(sel)?.addEventListener('change', () => renderPlan(true));
  });

  // Saving Settings in the original app replaces profile wholesale; preserve the saved plan through that action.
  const saveProfileBtn = q('#saveProfile');
  if (saveProfileBtn && typeof saveProfileBtn.onclick === 'function') {
    const originalSaveProfile = saveProfileBtn.onclick;
    saveProfileBtn.onclick = () => {
      const planCopy = state.profile?.plan ? { ...state.profile.plan } : null;
      originalSaveProfile();
      if (planCopy) state.profile.plan = planCopy;
      save();
      if (typeof renderAll === 'function') renderAll();
      renderPlan(false);
    };
  }

  // Keep the page and home banner fresh after food/body/profile changes.
  if (typeof renderAll === 'function') {
    const originalRenderAll = renderAll;
    renderAll = function () {
      originalRenderAll();
      renderPlan(false);
      updateHomeNote();
    };
  }

  // Initialize after overriding targets so the homepage immediately uses the plan if one already exists.
  ensureHomePlanNote();
  renderPlan(false);
  if (typeof renderAll === 'function') renderAll();
})();
