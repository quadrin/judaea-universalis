// Judaea Universalis — monthly AI (SPEC §6.3). Gathers stacks, marches on the
// enemy, sieges, retreats from bad odds, recruits toward aiHints.targetRegiments.
// DOM-free.

import {
  num, clamp, B, devTotal, regCount, armiesOf, armiesInProv, isHostile, sameSide,
  canEnter, issueMove, mergeInto, recruitRegiment, bfsDistances, disciplineOf,
  breakAllianceCore, assaultInfo, doAssault,
  peaceDealInfo, executePeaceDeal, monthsBetween,
  declareWar, truceActive, opinionOf, casusBelli,
} from './military.js';
import { LOAN_SIZE } from './economy.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/ai]', ...args);
}

function hasAiPassive(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t) return false;
  for (const mod of t.modifiers || []) {
    if (mod && mod.effects && mod.effects.aiPassive) return true;
  }
  return false;
}
function armyStrength(ctx, a) {
  const moraleFrac = a.maxMorale > 0 ? clamp(num(a.morale) / a.maxMorale, 0.1, 1) : 0.5;
  return a.men * disciplineOf(ctx, a.tag) * (0.5 + 0.5 * moraleFrac);
}
function stackStrengthAt(ctx, provId, predicate) {
  let s = 0;
  for (const a of armiesInProv(ctx, provId)) {
    if (!a.retreating && a.men > 0 && predicate(a)) s += armyStrength(ctx, a);
  }
  return s;
}
function pickRecruitProv(ctx, tag, hints) {
  const g = ctx.game;
  const names = (hints && hints.rally) || [];
  for (const n of names) {
    const p = ctx.prov(n);
    if (p && p.controller === tag && !armiesInProv(ctx, p.id).some((a) => isHostile(ctx, tag, a.tag))) return p.id;
  }
  const capName = ctx.DEFINES.TAGS && ctx.DEFINES.TAGS[tag] ? ctx.DEFINES.TAGS[tag].capital : null;
  const cap = capName ? ctx.prov(capName) : null;
  if (cap && cap.owner === tag && cap.controller === tag) return cap.id;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === tag && p.controller === tag) return p.id;
  }
  return 0;
}
function aiRecruit(ctx, tag, hints) {
  const t = ctx.game.tags[tag];
  const target = num(hints && hints.targetRegiments, 20);
  let cur = 0;
  for (const a of armiesOf(ctx, tag)) cur += regCount(a);
  let guard = 0;
  while (cur < target && num(t.treasury) > 50 && num(t.manpower) >= B(ctx, 'regSize', 1000) && guard++ < 5) {
    const pid = pickRecruitProv(ctx, tag, hints);
    if (!pid) break;
    const res = recruitRegiment(ctx, tag, pid, 'inf');
    if (!res.ok) break;
    cur++;
  }
}
function retreatToFort(ctx, army) {
  const g = ctx.game;
  let best = 0, bestDist = Infinity;
  const dists = bfsDistances(ctx, army.prov, (id) => canEnter(ctx, army.tag, id), 20);
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.controller !== army.tag || !(p.fort > 0)) continue;
    const d = dists.has(p.id) ? dists.get(p.id) : Infinity;
    if (d < bestDist) { bestDist = d; best = p.id; }
  }
  if (best && best !== army.prov) issueMove(ctx, army, best);
}
function threatened(ctx, army) {
  const own = stackStrengthAt(ctx, army.prov, (a) => sameSide(ctx, army.tag, a.tag)) || armyStrength(ctx, army);
  const nbs = ctx.geom && ctx.geom.neighbors ? ctx.geom.neighbors[army.prov] : null;
  if (!nbs) return false;
  for (const nb of nbs) {
    const enemy = stackStrengthAt(ctx, nb, (a) => isHostile(ctx, army.tag, a.tag));
    if (enemy > own * 1.4) return true;
  }
  return false;
}
function pickTarget(ctx, army, enemies) {
  const g = ctx.game;
  const dists = bfsDistances(ctx, army.prov, (id) => canEnter(ctx, army.tag, id), 32);
  const own = stackStrengthAt(ctx, army.prov, (a) => sameSide(ctx, army.tag, a.tag)) || armyStrength(ctx, army);
  let best = 0, bestScore = Infinity;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || i === army.prov) continue;
    if (enemies.indexOf(p.controller) < 0) continue;
    if (!dists.has(i)) continue;
    // Odds check: never march into a defended province we can't beat —
    // terrain multiplies the defenders' effective strength.
    const defenders = stackStrengthAt(ctx, i, (a) => isHostile(ctx, army.tag, a.tag));
    if (defenders > 0) {
      const terr = ctx.DEFINES.TERRAINS ? ctx.DEFINES.TERRAINS[p.terrain] : null;
      const defFactor = 1 + 0.25 * (terr ? num(terr.defBonus, 0) : 0);
      if (defenders * defFactor > own * 0.9) continue;
    }
    // Reduce the countryside before the fortresses (Vespasian's method):
    // forts and attrition terrain are strongly deprioritized, not forbidden.
    const terr2 = ctx.DEFINES.TERRAINS ? ctx.DEFINES.TERRAINS[p.terrain] : null;
    const score = dists.get(i) * 3 + (p.fort | 0) * 12 + (terr2 ? num(terr2.attrition, 0) * 3 : 0) - devTotal(p) * 0.15;
    if (score < bestScore) { bestScore = score; best = i; }
  }
  return best;
}
function busy(a) {
  return a.inBattle || a.retreating || (a.path && a.path.length > 0);
}
function besiegingHere(ctx, army) {
  const p = ctx.byId(army.prov);
  if (!p) return false;
  if (p.siege) return p.siege.by === army.tag || sameSide(ctx, army.tag, p.siege.by);
  return isHostile(ctx, army.tag, p.controller);
}

function runRebelAI(ctx) {
  const g = ctx.game;
  for (const a of armiesOf(ctx, 'REB')) {
    if (busy(a) || a.men <= 0) continue;
    const here = ctx.byId(a.prov);
    if (here && here.controller !== 'REB') continue; // siege in place
    const dists = bfsDistances(ctx, a.prov, () => true, 8);
    let best = 0, bestDist = Infinity;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.controller === 'REB') continue;
      const d = dists.has(i) ? dists.get(i) : Infinity;
      if (d < bestDist) { bestDist = d; best = i; }
    }
    if (best) issueMove(ctx, a, best);
  }
}

// Wartime credit: borrow when the campaign chest runs dry (never past 3 loans
// — the AI keeps headroom the player may spend to 5), settle debts in plenty.
function aiLoans(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t) return;
  if (num(t.treasury) > 400 && num(t.loans) > 0) {
    t.treasury = num(t.treasury) - LOAN_SIZE;
    t.loans = num(t.loans) - 1;
    return;
  }
  const atWar = (t.atWarWith || []).some((e) => ctx.game.tags[e] && ctx.game.tags[e].alive);
  if (atWar && num(t.treasury) < -50 && num(t.loans) < 3) {
    t.treasury = num(t.treasury) + LOAN_SIZE;
    t.loans = num(t.loans) + 1;
  }
}

// Historical stormings: once the breach is wide (>= 2) and the besiegers can
// soak the blood price (3x the garrison), the AI assaults rather than let a
// long siege stall out.
function aiAssaults(ctx, tag) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || !p.siege || p.siege.by !== tag) continue;
    if (num(p.siege.breach) < 2) continue;
    const info = assaultInfo(ctx, p, tag);
    if (!info.can) continue;
    if (info.besiegerMen < 3 * Math.max(1, num(p.garrison))) continue;
    doAssault(ctx, p, tag);
  }
}

function aiSpendPoints(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t || !t.points) return;
  if (t.stability < 1 && num(t.points.gov) >= 100) { t.points.gov -= 75; t.stability = clamp(t.stability + 1, -3, 3); }
  if (num(t.manpower) < num(t.maxManpower) * 0.2 && num(t.points.mar) >= 100) {
    t.points.mar -= 50;
    t.manpower = Math.min(num(t.maxManpower), num(t.manpower) + 2000);
  }
}

// Peacetime statecraft: the AI assimilates its conquests exactly like the
// player — lowering autonomy with spare governance, converting the biggest
// wrong-faith province with spare influence, drilling when flush at war.
// One act per pool per month, always keeping a reserve for the basics.
function aiIntegration(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  if (!t || !t.points) return;
  if (num(t.points.gov) >= 125) {
    let best = null;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.owner !== tag || p.controller !== tag) continue;
      const au = num(p.autonomy, 0.25);
      if (au > 0.3 && (!best || au > num(best.autonomy, 0))) best = p;
    }
    if (best) {
      t.points.gov -= 25;
      best.autonomy = Math.max(0, num(best.autonomy, 0.25) - 0.15);
      best.modifiers = (best.modifiers || []).filter((m) => m && m.id !== 'tightened_grip');
      best.modifiers.push({ id: 'tightened_grip', name: 'Tightened Grip', months: 6, effects: { unrest: 2 } });
    }
  }
  if (num(t.points.infl) >= 100 && t.religion) {
    let best = null;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.owner !== tag || p.controller !== tag) continue;
      if (p.religion === t.religion || p.conversion) continue;
      if (!best || devTotal(p) > devTotal(best)) best = p;
    }
    if (best) {
      t.points.infl -= 50;
      best.conversion = { by: tag, monthsLeft: 12 };
      best.modifiers = (best.modifiers || []).filter((m) => m && m.id !== 'religious_tension');
      best.modifiers.push({ id: 'religious_tension', name: 'Religious Tension', months: 12, effects: { unrest: 3 } });
    }
  }
  const atWar = (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
  if (atWar && num(t.points.mar) >= 150
      && !(t.modifiers || []).some((m) => m && m.id === 'drilled_ranks')) {
    t.points.mar -= 50;
    t.modifiers.push({ id: 'drilled_ranks', name: 'Drilled Ranks', months: 18, effects: { disciplineMult: 1.05 } });
  }
}

// Reciprocity: an ally whose opinion of the player has sunk below -25 walks
// away from the alliance (breakAllianceCore handles the mutual removal and
// the player's -50 opinion of the deserter).
function aiDiploReciprocity(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  const player = g.playerTag;
  if (!t || !player || tag === player || !g.tags[player]) return;
  if ((t.allies || []).indexOf(player) < 0) return;
  if (num(t.opinion && t.opinion[player]) >= -25) return;
  if (breakAllianceCore(ctx, tag, player)) {
    ctx.bus.emit('notify', {
      title: 'Alliance broken',
      text: (t.name || tag) + ' renounces its alliance with us — our standing at their court has sunk too low.',
      type: 'bad',
    });
  }
}

function runTagAI(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  aiSpendPoints(ctx, tag);
  aiIntegration(ctx, tag);
  aiLoans(ctx, tag);
  const enemies = (t.atWarWith || []).filter((e) => g.tags[e] && g.tags[e].alive);
  if (!enemies.length) return; // non-warring AI idles
  const hints = (ctx.bookmark && ctx.bookmark.aiHints && ctx.bookmark.aiHints[tag]) || {};
  aiRecruit(ctx, tag, hints);
  // Storming an already-invested fortress is siege prosecution, not a new
  // offensive — it runs even under aiPassive so scripted lulls don't freeze
  // half-finished sieges forever.
  aiAssaults(ctx, tag);
  if (hasAiPassive(ctx, tag)) return; // armies hold, no new offensives
  const armies = armiesOf(ctx, tag).filter((a) => a.men > 0 && !a.inBattle && !a.retreating);
  if (!armies.length) return;
  let main = armies[0];
  for (const a of armies) if (a.men > main.men) main = a;
  // gather: every idle non-main stack converges on the main stack — a 0.6x
  // threshold left mid-sized armies permanently orderless after a lost battle
  for (const a of armies) {
    if (a === main) continue;
    if (a.prov === main.prov) { mergeInto(ctx, a.id, main.id); continue; }
    if (!busy(a) && !besiegingHere(ctx, a)) {
      issueMove(ctx, a, main.prov);
    }
  }
  // main stack: flee bad odds, hold sieges, else march on the best target
  if (!g.armies[main.id]) return;
  if (threatened(ctx, main)) { retreatToFort(ctx, main); return; }
  if (busy(main) || besiegingHere(ctx, main)) return;
  const target = pickTarget(ctx, main, enemies);
  if (target) issueMove(ctx, main, target);
}

// Opportunistic wars (monthly). A stable, unengaged AI power that despises a
// weaker neighbor — especially one already bleeding in another war — may
// strike. Gated hard: strength ratio, opinion, stability, and a dice roll, so
// peace is the norm and a war of opportunity is an event.
function aiConsiderWar(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  if (!t || t.overlord) return; // clients follow their overlord to war, never lead
  if ((t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive)) return;
  if (num(t.warExhaustion) > 5 || num(t.stability) < 1) return;
  const strength = (k) => armiesOf(ctx, k).reduce((s, a) => s + num(a.men), 0) + num(g.tags[k].manpower) * 0.5;
  const myMen = strength(tag);
  if (myMen < 8000) return; // no army worth the name, no adventures
  // Realms adjacent to ours, by province adjacency.
  const nbTags = new Set();
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag) continue;
    const set = ctx.geom && ctx.geom.neighbors ? ctx.geom.neighbors[i] : null;
    if (!set) continue;
    for (const nb of set) {
      const q = ctx.byId(nb);
      if (q && !q.impassable && q.owner !== tag && g.tags[q.owner]) nbTags.add(q.owner);
    }
  }
  for (const tgt of nbTags) {
    if (tgt === 'REB') continue;
    const e = g.tags[tgt];
    if (!e || !e.alive) continue;
    if (truceActive(ctx, tag, tgt)) continue;
    if ((t.allies || []).indexOf(tgt) >= 0 || e.overlord === tag || t.overlord === tgt) continue;
    if (opinionOf(ctx, tag, tgt) > -50) continue;
    const busyElsewhere = (e.atWarWith || []).some((x) => g.tags[x] && g.tags[x].alive);
    const enemyMen = strength(tgt);
    const ratio = enemyMen > 0 ? myMen / enemyMen : 99;
    if (!(ratio >= 1.6 || (busyElsewhere && ratio >= 1.2))) continue;
    if (!ctx.rng.chance(0.08)) continue;
    const cb = casusBelli(ctx, tag, tgt);
    t.stability = clamp(num(t.stability) - (cb ? (cb.type === 'claim' ? 0 : 1) : 2), -3, 3);
    declareWar(ctx, tag, tgt, null, cb ? cb.type : null);
    return; // at most one declaration a month, per power
  }
}

// Peace feelers (monthly). A losing AI leader sues the player for peace — a
// nudge to open the dove dialog and dictate terms. Wars between two AI powers
// resolve themselves once one side clearly prevails or both sides tire.
function monthlyWarDiplomacy(ctx) {
  const g = ctx.game;
  const player = g.playerTag;
  for (const w of (g.wars || []).slice()) {
    if (!w || w.noNegotiation) continue;
    const playerIn = w.attackers.indexOf(player) >= 0 || w.defenders.indexOf(player) >= 0;
    if (playerIn) {
      const theirSide = w.attackers.indexOf(player) >= 0 ? w.defenders : w.attackers;
      const leader = theirSide.find((t) => g.tags[t] && g.tags[t].alive);
      if (!leader) continue;
      const lt = g.tags[leader];
      const ws = num(w.warscore && w.warscore[leader]);
      if (ws > -40 && !(ws <= -10 && num(lt.warExhaustion) >= 15)) continue;
      if (w._sueCd && monthsBetween(w._sueCd, g.date) < 6) continue;
      w._sueCd = { ...g.date };
      ctx.bus.emit('notify', {
        title: (lt.name || leader) + ' sues for peace',
        text: 'Their envoys ask what terms we would set. Open the war in the outliner to dictate them.',
        type: 'good',
      });
    } else {
      const attLead = w.attackers.find((t) => g.tags[t] && g.tags[t].alive);
      const defLead = w.defenders.find((t) => g.tags[t] && g.tags[t].alive);
      if (!attLead || !defLead) continue;
      const wsAtt = num(w.warscore && w.warscore[attLead]);
      const months = monthsBetween(w.started, g.date);
      if (Math.abs(wsAtt) < 50 && months < 36) continue;
      const winner = wsAtt >= 0 ? attLead : defLead;
      const info = peaceDealInfo(ctx, w, winner);
      const deal = { provinces: [], gold: 0, humiliate: false };
      let budget = info.myWs;
      for (const row of info.provinces) {
        if (row.cost <= budget) { deal.provinces.push(row.id); budget -= row.cost; }
      }
      executePeaceDeal(ctx, w, winner, deal);
    }
  }
}

export function runMonthlyAI(ctx) {
  const g = ctx.game;
  for (const tag of Object.keys(g.tags)) {
    try {
      const t = g.tags[tag];
      if (!t || !t.alive || !t.ai) continue;
      if (tag === 'REB') { runRebelAI(ctx); continue; }
      aiDiploReciprocity(ctx, tag);
      aiConsiderWar(ctx, tag);
      runTagAI(ctx, tag);
    } catch (e) { warnOnce('ai:' + tag, 'AI failed for', tag, e); }
  }
  try { monthlyWarDiplomacy(ctx); } catch (e) { warnOnce('warDiplo', 'war diplomacy failed', e); }
}
