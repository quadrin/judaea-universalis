import { rememberCourtEvent } from './court_plans.js';
// Diplomacy and treaty readers. No random draws: previews are pure.
const n = (v, d = 0) => Number.isFinite(v) ? v : d;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const provinces = (ctx, tag) => ctx.game.provinces.filter(p => p && !p.impassable && p.owner === tag);
const dev = p => n(p.dev && p.dev.tax) + n(p.dev && p.dev.prod) + n(p.dev && p.dev.mp);
const opinion = (ctx, a, b) => n(ctx.game.tags[a]?.opinion?.[b]);
const neighbors = (ctx, id) => [...(ctx.geom?.neighbors?.[id] || [])];

export function diplomaticCredit(ctx, provider, caller) {
  const r = ctx.game.tags[provider]?.diplomaticCredit?.[caller];
  return { trust: clamp(n(r?.trust, 50), 0, 100), favors: clamp(n(r?.favors), 0, 100) };
}
function credit(ctx, provider, caller) {
  const t = ctx.game.tags[provider];
  t.diplomaticCredit ||= {};
  return t.diplomaticCredit[caller] ||= diplomaticCredit(ctx, provider, caller);
}

export function strategicInterests(ctx, tag, enemy) {
  const own = new Set(provinces(ctx, tag).map(p => p.id));
  const claims = ctx.game.tags[tag]?.claims || [];
  const capital = ctx.prov?.(ctx.game.tags[tag]?.dynamicCapital || ctx.DEFINES.TAGS?.[tag]?.capital);
  return provinces(ctx, enemy).map(p => ({ id: p.id, name: p.name,
    score: (claims.includes(p.id) ? 100 : 0) + (neighbors(ctx, p.id).some(id => own.has(id)) ? 50 : 0)
      + (p.culture === ctx.game.tags[tag]?.culture ? 10 : 0) + dev(p)
      - (capital ? Math.hypot(n(p.x) - n(capital.x), n(p.y) - n(capital.y)) / 100 : 0),
  })).sort((a, b) => b.score - a.score || a.id - b.id).slice(0, 5);
}

export function offensiveCall(ctx, ally, caller, enemy, offer = {}, readiness = { ok: true, why: '' }) {
  const c = diplomaticCredit(ctx, ally, caller);
  const t = ctx.game.tags[ally];
  const reasons = [];
  const promise = Number(offer.province) || 0;
  const validPromise = !promise || strategicInterests(ctx, ally, enemy).some(p => p.id === promise);
  if (!t?.alive || !(ctx.game.tags[caller]?.allies || []).includes(ally)) reasons.push('No active alliance');
  if (t?.overlord) reasons.push('Their overlord controls foreign policy');
  if ((t?.allies || []).includes(enemy)) reasons.push('Allied to the defender');
  if (c.trust < 25) reasons.push('Trust is below 25');
  if (offer.favors && promise) reasons.push('Choose favors or a territorial promise');
  if (!validPromise) reasons.push('The promised province is outside their interests');
  if (offer.favors && c.favors < 10) reasons.push('Fewer than 10 favors available');
  const effectiveOpinion = opinion(ctx, ally, caller) + (c.trust - 50) / 2
    + (offer.favors && c.favors >= 10 ? 20 : 0) + (promise && validPromise ? 15 : 0);
  if (effectiveOpinion < 25) reasons.push(`Willingness ${Math.round(effectiveOpinion)}; 25 required`);
  // Favors and promises can overcome reluctance, never an exhausted treasury
  // or missing soldiers. The existing readiness function names those failures.
  if (!readiness.ok && !/thinks too little/.test(readiness.why)) reasons.push(readiness.why);
  return { ally, ...c, promise, effectiveOpinion, interests: strategicInterests(ctx, ally, enemy),
    ok: reasons.length === 0, reasons: reasons.length ? reasons : ['Willing and able to join'] };
}

export function commitAllyCall(ctx, war, ally, caller, offer, answer) {
  if (!answer.ok) return;
  if (offer?.favors) credit(ctx, ally, caller).favors -= 10;
  if (answer.promise) {
    war.promises ||= [];
    war.promises.push({ caller, ally, province: answer.promise });
  }
}

export function rememberAllianceBreak(ctx, breaker, other) {
  const c = credit(ctx, other, breaker);
  c.trust = clamp(c.trust - 20, 0, 100);
  c.favors = 0;
  rememberCourtEvent(ctx, other, breaker, 'abandoned_ally', { reason: 'Broke our alliance' });
}

export function settlePromises(ctx, war) {
  for (const p of war.promises || []) {
    if (p.settled || !ctx.game.tags[p.ally] || !ctx.game.tags[p.caller]) continue;
    p.settled = true;
    const kept = ctx.byId(p.province)?.owner === p.ally;
    // Defeat excuses the promise; a victorious principal must keep its word.
    if (!kept && !war.promiseVictory?.[p.caller]) continue;
    rememberCourtEvent(ctx, p.ally, p.caller, kept ? 'kept_promise' : 'broken_promise', { province: p.province, reason: kept ? 'Honoured a territorial promise' : 'Withheld promised territory after victory' });
    const c = credit(ctx, p.ally, p.caller);
    c.trust = clamp(c.trust + (kept ? 10 : -25), 0, 100);
    const t = ctx.game.tags[p.ally];
    t.opinion ||= {};
    t.opinion[p.caller] = clamp(opinion(ctx, p.ally, p.caller) + (kept ? 15 : -50), -200, 200);
    if (p.caller === ctx.game.playerTag) ctx.bus.emit('notify', {
      title: kept ? 'A promise kept' : 'A promise broken', type: kept ? 'good' : 'bad',
      text: `${t.name || p.ally}: ${kept ? '+10' : '−25'} trust after the settlement of ${ctx.byId(p.province)?.name || 'the promised province'}.`,
    });
  }
}

export function expansionPreview(ctx, conqueror, ids) {
  const taken = [...new Set(ids)].map(id => ctx.byId(id)).filter(Boolean);
  if (!taken.length) return [];
  const coalitions = ctx.bookmark?.mechanics?.coalitions !== false;
  const homes = new Map();
  for (const p of ctx.game.provinces) {
    if (!p || p.impassable) continue;
    if (!homes.has(p.owner)) homes.set(p.owner, []);
    homes.get(p.owner).push(p);
  }
  return Object.entries(ctx.game.tags).filter(([tag, t]) => tag !== conqueror && tag !== 'REB' && t?.alive)
    .map(([tag, t]) => {
      const home = homes.get(tag) || [];
      let gain = 0;
      for (const p of taken) {
        const distance = home.length ? Math.min(...home.map(q => Math.hypot(n(q.x) - n(p.x), n(q.y) - n(p.y)))) : Infinity;
        const proximity = distance < 400 ? 1 : distance < 1200 ? 0.45 : 0.1;
        const religion = t.religion === p.religion ? 1.35 : 1;
        const culture = t.culture === p.culture ? 1.25 : 1;
        const alliance = (t.allies || []).includes(conqueror) ? 0.5 : 1;
        gain += dev(p) * 0.55 * proximity * religion * culture * alliance;
      }
      gain = Math.round(gain * 10) / 10;
      const before = n(t.expansionConcern?.[conqueror], n(ctx.game.tags[conqueror]?.aggression));
      const after = before + gain;
      const eligible = coalitions && after >= 30 && opinion(ctx, tag, conqueror) - Math.ceil(gain / 2) <= -25
        && !(t.allies || []).includes(conqueror) && t.overlord !== conqueror;
      return { tag, name: t.name || tag, gain, before, after, coalition: eligible, newlyAlarmed: eligible && !(before >= 30 && opinion(ctx, tag, conqueror) <= -25) };
    }).filter(r => r.gain > 0).sort((a, b) => b.after - a.after || a.tag.localeCompare(b.tag));
}

export function applyExpansion(ctx, conqueror, rows) {
  for (const r of rows) {
    const t = ctx.game.tags[r.tag];
    if (!t) continue;
    t.expansionConcern ||= {};
    t.expansionConcern[conqueror] = n(t.expansionConcern[conqueror], n(r.before)) + r.gain;
    t.opinion ||= {};
    t.opinion[conqueror] = clamp(opinion(ctx, r.tag, conqueror) - Math.ceil(r.gain / 2), -200, 200);
  }
}

export function monthlyStrategy(ctx) {
  const g = ctx.game;
  for (const [tag, t] of Object.entries(g.tags)) {
    for (const [of, value] of Object.entries(t.expansionConcern || {})) {
      t.expansionConcern[of] = Math.max(0, n(value) - ((g.tags[of]?.atWarWith || []).length ? 0.2 : 0.5));
    }
    if (!t.alive) continue;
    for (const ally of t.allies || []) {
      if (!g.tags[ally]?.alive) continue;
      const shared = g.wars.filter(w => [w.attackers, w.defenders].some(side => side.includes(tag) && side.includes(ally)));
      const deployed = shared.length ? Object.values(g.armies || {}).filter(a => a.tag === tag &&
        (a.inBattle || ctx.byId(a.prov)?.owner !== tag) && (t.atWarWith || []).includes(ctx.byId(a.prov)?.owner))
        .reduce((s, a) => s + n(a.men), 0) : 0;
      // Helping earns a claim on the ally's assistance, not on oneself.
      const c = credit(ctx, ally, tag);
      c.favors = clamp(c.favors + (deployed > 0 ? Math.min(2, deployed / 5000) : 0.1), 0, 100);
    }
  }
}

export function warEnthusiasm(ctx, war, enemy, byTag) {
  const g = ctx.game;
  const side = war.attackers.includes(enemy) ? war.attackers : war.defenders;
  const foes = side === war.attackers ? war.defenders : war.attackers;
  const t = g.tags[enemy] || {};
  const land = provinces(ctx, enemy);
  const occupied = land.filter(p => foes.includes(p.controller)).length / Math.max(1, land.length);
  const started = war.started || g.date;
  const months = Math.max(0, (g.date.y - started.y) * 12 + g.date.m - started.m);
  const men = tags => Object.values(g.armies || {}).filter(a => tags.includes(a.tag)).reduce((s, a) => s + n(a.men), 0);
  const theirMen = men(side), ourMen = men(foes);
  const capitalName = t.dynamicCapital || ctx.DEFINES.TAGS?.[enemy]?.capital;
  const capital = capitalName ? ctx.prov?.(capitalName) : null;
  const factors = [
    { label: 'War exhaustion', value: n(t.warExhaustion) * 0.6 },
    { label: 'Occupied provinces', value: occupied * 12 },
    { label: 'Manpower depleted', value: (1 - clamp(n(t.manpower) / Math.max(1, n(t.maxManpower, 1)), 0, 1)) * 4 },
    { label: 'Capital occupied', value: capital && foes.includes(capital.controller) ? 6 : 0 },
    { label: 'Length of war', value: Math.min(6, months / 12) },
    { label: 'Forces still in the field', value: -clamp((theirMen - ourMen) / Math.max(1000, theirMen + ourMen) * 10, -10, 10) },
  ].map(r => ({ ...r, value: Math.round(r.value * 10) / 10 }));
  const willingness = clamp(factors.reduce((s, r) => s + r.value, 0) - 4, -10, 20);
  return { enemy, name: t.name || enemy, factors, willingness,
    level: willingness >= 12 ? 'Low' : willingness >= 3 ? 'Medium' : 'High' };
}

// One score calculation for peace acceptance and the scores shown to players.
// The military ledger remains the input, so repeated reads cannot add the
// willingness adjustment again. Crown settlements use their military threshold.
export function peaceWarScore(ctx, war, enemy, byTag, militaryWarScore, unifyCrown = false) {
  const enthusiasm = warEnthusiasm(ctx, war, enemy, byTag);
  const acceptanceAdjustment = unifyCrown || militaryWarScore >= 99 ? 0
    : clamp(enthusiasm.willingness, -10, Math.max(0, militaryWarScore) * .25);
  const warScore = clamp(militaryWarScore + acceptanceAdjustment, -100, 100);
  return { militaryWarScore, warScore, enthusiasm, acceptanceAdjustment, acceptanceBudget: Math.max(0, warScore) };
}
