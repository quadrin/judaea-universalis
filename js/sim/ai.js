// Judaea Universalis — monthly AI (SPEC §6.3). Gathers stacks, marches on the
// enemy, sieges, retreats from bad odds, recruits toward aiHints.targetRegiments.
// DOM-free.

import {
  num, clamp, B, devTotal, regCount, armiesOf, armiesInProv, isHostile, sameSide,
  canEnter, issueMove, mergeInto, recruitRegiment, bfsDistances, disciplineOf,
  resolveTagMult,
  breakAllianceCore, assaultInfo, doAssault,
  peaceDealInfo, evaluatePeaceDeal, executePeaceDeal, monthsBetween,
  coalitionAgainst, forceLimitOf, vassalsOf,
  declareWar, truceActive, opinionOf, casusBelli, addOpinion, areRivals,
  modernizeInfo, modernizeArmyCore, switchTagCore,
  hasAirfield, airWingsAt, airWingsOf, raiseAirWing, raidTargets, airRaidCore,
  tagGen, mechanicOn,
} from './military.js';
import { modernizeFleetInfo, modernizeFleetCore } from './navy.js';
import { fireEvent } from './events.js';
import { IDEA_TREES, ideaCost, applyReformsToTag } from '../data/ideas.js';
import { TECH_CATEGORIES, TECH_MAX, techCost, eraBaseline, aheadMult, genUpkeepMult } from '../data/tech.js';
import { FORMABLES } from '../data/formables.js';
import { LOAN_SIZE, developCore, developInfo, DEV_KINDS } from './economy.js';
import { popTotal, popTension } from './population.js';
import { queuedUnitCount, queuedUnitsOf } from './recruitment.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/ai]', ...args);
}

function personality(ctx, tag) {
  const P = ctx.DEFINES.PERSONALITIES || {};
  return P[tag] || { aggression: 1, caution: 1 };
}

function hasAiPassive(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t) return false;
  for (const mod of t.modifiers || []) {
    if (mod && mod.effects && mod.effects.aiPassive) return true;
  }
  return false;
}
function hasTagEffect(ctx, tag, key) {
  const t = ctx.game.tags[tag];
  if (!t) return false;
  return (t.modifiers || []).some((mod) => mod && mod.effects && mod.effects[key]);
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
function aiRecruit(ctx, tag, hints, fraction) {
  const t = ctx.game.tags[tag];
  // Affordability governor (balance harness, SPEC §21): the hint is an
  // ambition, the treasury is a fact. Cap the standing army at what ~75% of
  // gross income can maintain — small realms stop drilling themselves into
  // debt spirals.
  // What a NEW regiment will actually cost this court per month: the flat
  // rate × its current pattern's upkeep (SPEC §52) × tag tuning, plus the
  // fuel a mechanized pattern burns (import-priced when it has no oil).
  let maintPerReg = ((ctx.DEFINES.BASE && ctx.DEFINES.BASE.maintPerReg) || 0.35)
    * genUpkeepMult(tagGen(ctx, tag))
    * resolveTagMult(ctx, tag, 'maintMult');
  const F = ctx.DEFINES.FUEL;
  if (F && tagGen(ctx, tag) >= num(F.gen, 5)) {
    maintPerReg += num(F.perReg, 0.2) * num(F.importMult, 2); // budget for the dear case
  }
  // 0.65 of income may go to upkeep — the rest is headroom for the day war
  // occupation halves the tax rolls (tech-boosted incomes made 0.75 too greedy).
  const affordable = Math.max(3, Math.floor((num(t.income) * 0.65) / maintPerReg));
  let desired = num(hints && hints.targetRegiments, 20);
  // The establishment grows with the realm (SPEC §21 extended): the bookmark
  // hint is a floor frozen at start, not a ceiling — a court that has doubled
  // its lands garrisons them, and the player's neighbors keep pace with the
  // decades instead of fielding 167 BCE armies in 150.
  let ownDev = 0;
  for (let i = 1; i < ctx.game.provinces.length; i++) {
    const p = ctx.game.provinces[i];
    if (p && !p.impassable && p.owner === tag) ownDev += devTotal(p);
  }
  desired = Math.max(desired, Math.ceil(ownDev * 0.3));
  // Arms race: a neighbor wearing real infamy (>= 20) is armed against,
  // whoever they are — the answer to the conqueror who felt safe because
  // nobody dared match his host.
  const nbTags = new Set();
  const geoNb = ctx.geom && ctx.geom.neighbors;
  if (geoNb) {
    for (let i = 1; i < ctx.game.provinces.length; i++) {
      const p = ctx.game.provinces[i];
      if (!p || p.impassable || p.owner !== tag || !geoNb[i]) continue;
      for (const nb of geoNb[i]) {
        const q = ctx.byId(nb);
        if (q && !q.impassable && q.owner !== tag && ctx.game.tags[q.owner]) nbTags.add(q.owner);
      }
    }
  }
  for (const nb of nbTags) {
    if (nb === 'REB') continue;
    const et = ctx.game.tags[nb];
    if (!et || !et.alive || num(et.aggression) < 20) continue;
    let theirRegs = 0;
    for (const a of armiesOf(ctx, nb)) theirRegs += regCount(a);
    desired = Math.max(desired, Math.ceil(theirRegs * 0.7));
  }
  // Modern deterrence: once a bookmark opens a rearmament phase, countries
  // with threatRearm size their establishment partly against hostile armies,
  // bounded by a scenario-specific ceiling. This prevents rich postwar states
  // from banking thousands while their army target remains frozen forever.
  if (hints && hints.threatRearm && ctx.game.flags && ctx.game.flags.postwarRearmament) {
    let hostileRegs = 0;
    for (const other of Object.keys(ctx.game.tags)) {
      if (other === tag || other === 'REB') continue;
      const ot = ctx.game.tags[other];
      if (!ot || !ot.alive) continue;
      if (num(t.opinion && t.opinion[other]) > -75) continue;
      for (const a of armiesOf(ctx, other)) hostileRegs += regCount(a);
    }
    const escalation = ctx.game.flags.armsRaceEscalated ? 1.15 : 1;
    const threatTarget = Math.ceil(hostileRegs * num(hints.threatShare, 0.75) * escalation);
    desired = Math.max(desired, Math.min(num(hints.maxThreatRegiments, desired * 1.75), threatTarget));
  }
  // Never past what the land itself can sustain — the AI does not pay the
  // overlimit surcharge the player may choose to.
  desired = Math.min(desired, forceLimitOf(ctx, tag));
  const target = Math.ceil(Math.min(desired, affordable) * (fraction || 1));
  let cur = 0;
  for (const a of armiesOf(ctx, tag)) cur += regCount(a);
  cur += queuedUnitsOf(ctx, tag, ['inf', 'cav']);
  let guard = 0;
  while (cur < target && num(t.treasury) > 50 && num(t.manpower) >= B(ctx, 'regSize', 1000) && guard++ < 5) {
    const pid = pickRecruitProv(ctx, tag, hints);
    if (!pid) break;
    // A cavalry arm rides with the foot: every fourth regiment raised is
    // horse when the treasury can bear its price (2.5× an infantryman's).
    const type = cur % 4 === 3 && num(t.treasury) > 150 ? 'cav' : 'inf';
    const res = recruitRegiment(ctx, tag, pid, type);
    if (!res.ok) break;
    cur++;
  }
}

// A realm drowning in debt at peace pays off its soldiers: one regiment a
// month from the smallest army until the books balance. Wartime armies fight
// on — debt is cheaper than conquest.
function aiShedUnaffordable(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  if (!t) return;
  if (num(t.income) >= num(t.expenses)) return;
  const atWar = (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
  // At peace, shed before the debt starts; at war, only when deep in it
  // (deserters) — a war chest running dry is normal, a collapse is not.
  if (num(t.treasury) > (atWar ? -150 : 25)) return;
  const armies = armiesOf(ctx, tag).filter((a) => regCount(a) > 0 && !a.inBattle);
  if (!armies.length) return;
  // Desertion scales with the hole in the treasury: one regiment a month,
  // plus one more per hundred talents of debt (cap 3) — a deep-broke army
  // melts fast enough to matter.
  const shed = Math.min(3, 1 + Math.max(0, Math.floor(-num(t.treasury) / 100)));
  const regSize = B(ctx, 'regSize', 1000);
  for (let k = 0; k < shed; k++) {
    armies.sort((a, b) => a.men - b.men);
    const a = armies[0];
    if (!a) break;
    const regs = a.regiments || {};
    if ((regs.cav | 0) > 0) regs.cav--;
    else if ((regs.inf | 0) > 0) regs.inf--;
    a.men = Math.max(0, num(a.men) - regSize);
    t.manpower = num(t.manpower) + Math.round(regSize * 0.5); // half go home to the rolls
    if (regCount(a) <= 0 || a.men <= 0) {
      delete g.armies[a.id];
      armies.shift();
    }
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
  const shy = 1.4 / Math.max(0.5, num(personality(ctx, army.tag).caution, 1));
  for (const nb of nbs) {
    const enemy = stackStrengthAt(ctx, nb, (a) => isHostile(ctx, army.tag, a.tag));
    if (enemy > own * shy) return true;
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
  // Integration (SPEC §56): with governance to spare, the AI runs the
  // program in its most valuable restless province — the only tool it has
  // where missionary conversion is era-gated off.
  if (num(t.points.gov) >= 150) {
    let best = null;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.owner !== tag || p.controller !== tag) continue;
      if (p.integrating || num(p.integration) >= 1) continue;
      const tension = popTotal(p) > 0 ? popTension(ctx, p, t) : null;
      if (!tension || (tension.minority + tension.foreignCulture) < 0.15) continue;
      if (!best || devTotal(p) > devTotal(best)) best = p;
    }
    if (best) {
      t.points.gov -= 25;
      best.integrating = { by: tag, monthsLeft: 12 };
      best.modifiers = (best.modifiers || []).filter((m) => m && m.id !== 'reforms_resented');
      best.modifiers.push({ id: 'reforms_resented', name: 'Reforms Resented', months: 12, effects: { unrest: 1 } });
    }
  }
  if (num(t.points.infl) >= 100 && t.religion && mechanicOn(ctx, 'conversion')) {
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
  const hints = (ctx.bookmark && ctx.bookmark.aiHints && ctx.bookmark.aiHints[tag]) || {};
  // Peace keeps half the wartime establishment under arms — no nation stands
  // naked just because nobody has attacked it yet (v2.1 harness finding).
  const rearmingAtPeace = !enemies.length && hints.threatRearm
    && g.flags && g.flags.postwarRearmament;
  aiRecruit(ctx, tag, hints, enemies.length || rearmingAtPeace ? 1 : 0.5);
  aiShedUnaffordable(ctx, tag);
  if (!enemies.length) return; // non-warring AI holds its garrisons and waits
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
  if (hasTagEffect(ctx, tag, 'noOpportunisticWars')) return;
  if ((t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive)) return;
  // Wars of opportunity want a settled court (stability >= 1); a war on the
  // era's standing rival (SPEC §73) is the one adventure a merely-unshaken
  // court (>= 0) will still ride out for.
  if (num(t.warExhaustion) > 5 || num(t.stability) < 0) return;
  if (num(t.aggression) > 40) return; // the world is watching: digest first
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
    const rival = areRivals(ctx, tag, tgt);
    if (!rival && num(t.stability) < 1) continue; // only the old enmity moves an unsettled court
    const busyElsewhere = (e.atWarWith || []).some((x) => g.tags[x] && g.tags[x].alive);
    const enemyMen = strength(tgt);
    const ratio = enemyMen > 0 ? myMen / enemyMen : 99;
    const pers = personality(ctx, tag);
    // A ponderous empire moves only for a sure thing; a firebrand jumps early
    // — and against the era's standing rival the bar drops a notch: these are
    // the wars both courts have been drilling for.
    const needed = (pers.ponderous ? 1.9 : 1.6) * (0.7 + 0.3 * num(pers.caution, 1))
      * (rival ? num(B(ctx, 'rivalRatioMult', 0.85)) : 1);
    if (!(ratio >= needed || (busyElsewhere && ratio >= needed * 0.75))) continue;
    if (!ctx.rng.chance(0.08 * num(pers.aggression, 1))) continue;
    const cb = casusBelli(ctx, tag, tgt);
    t.stability = clamp(num(t.stability) - (cb ? (cb.type === 'claim' ? 0 : 1) : 2), -3, 3);
    declareWar(ctx, tag, tgt, null, cb || 'conquest');
    return; // at most one declaration a month, per power
  }
}

// The yoke thrown off (SPEC §61). An AI client that despises its overlord
// (opinion <= revoltOpinion), with the strength to dare — its own host plus
// every fellow client angry enough to seize the moment — severs the bond and
// declares its war of independence. The severing is immediate: they ARE free
// unless the overlord wins the war and puts the yoke back on at the table
// (the subjugation clause). Works against AI and human overlords alike.
function vassalIndependence(ctx) {
  const g = ctx.game;
  const V = ctx.DEFINES.VASSALS || {};
  const strength = (k) => armiesOf(ctx, k).reduce((s, a) => s + num(a.men), 0) + num(g.tags[k].manpower) * 0.5;
  for (const k of Object.keys(g.tags)) {
    const t = g.tags[k];
    if (!t || !t.alive || !t.ai || !t.overlord) continue;
    const lordTag = t.overlord;
    const lord = g.tags[lordTag];
    if (!lord || !lord.alive) continue;
    if (opinionOf(ctx, k, lordTag) > num(V.revoltOpinion, -75)) continue;
    if ((t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive)) continue;
    if (truceActive(ctx, k, lordTag)) continue;
    // Fellow clients angry enough to rise with them.
    const coRebels = vassalsOf(ctx, lordTag).filter((v) => {
      if (v === k) return false;
      const vt = g.tags[v];
      return vt && vt.ai && opinionOf(ctx, v, lordTag) < num(V.loyalOpinion, -25)
        && !(vt.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
    });
    let ours = strength(k);
    for (const v of coRebels) ours += strength(v);
    if (ours < strength(lordTag) * num(V.revoltStrength, 0.4)) continue;
    if (!ctx.rng.chance(num(V.revoltChance, 0.04))) continue;
    // The bond breaks first — free courts declare, clients cannot.
    t.overlord = null;
    for (const v of coRebels) g.tags[v].overlord = null;
    const war = declareWar(ctx, k, lordTag,
      (t.name || k) + '’s War of Independence', 'independence');
    if (war) {
      for (const v of coRebels) {
        if (war.attackers.indexOf(v) >= 0 || war.defenders.indexOf(v) >= 0) continue;
        war.attackers.push(v);
        for (const d of war.defenders) {
          const vt = g.tags[v], dt = g.tags[d];
          if (vt && vt.atWarWith.indexOf(d) < 0) vt.atWarWith.push(d);
          if (dt && dt.atWarWith.indexOf(v) < 0) dt.atWarWith.push(v);
        }
      }
      if (lordTag === g.playerTag) {
        ctx.bus.emit('notify', {
          title: 'The clients rise!',
          text: (t.name || k) + (coRebels.length ? ' and ' + coRebels.map((v) => (g.tags[v] && g.tags[v].name) || v).join(', ') : '')
            + ' cast off our yoke and declare independence. Win this war and the subjugation clause at the table can bind them again.',
          type: 'war',
        });
      }
      return; // one rising a month is plenty
    }
    // The declaration failed (a truce surfaced): restore the bond.
    t.overlord = lordTag;
    for (const v of coRebels) g.tags[v].overlord = lordTag;
  }
}

// The coalition marches (SPEC §21 extended). Against a HUMAN conqueror whose
// infamy has leagued the world together, the coalition does not wait to be
// attacked: once its combined strength clearly overmatches the expander, it
// declares a punitive war of its own. AI expanders keep the old
// defensive-only coalition — their conquests are the scripted arcs' business,
// and all-AI harness runs must not unmake history.
function coalitionPunitiveWars(ctx) {
  const g = ctx.game;
  const bal = ctx.DEFINES.BALANCE || {};
  const humans = (Array.isArray(g.humanTags) && g.humanTags.length ? g.humanTags : [g.playerTag])
    .filter((k) => g.tags[k] && g.tags[k].alive && !g.tags[k].ai);
  const strength = (k) => armiesOf(ctx, k).reduce((s, a) => s + num(a.men), 0) + num(g.tags[k].manpower) * 0.5;
  for (const target of humans) {
    const t = g.tags[target];
    if (num(t.aggression) < num(bal.coalitionInfamy, 30)) continue;
    const free = coalitionAgainst(ctx, target).filter((k) => {
      const m = g.tags[k];
      if (!m || !m.alive || m.overlord) return false;
      if (truceActive(ctx, k, target)) return false;
      if ((m.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive)) return false; // busy courts sit out
      return true;
    });
    if (free.length < 2) continue; // a league of one is just a war
    let ours = 0, leader = free[0];
    for (const m of free) {
      const s = strength(m);
      ours += s;
      if (s > strength(leader)) leader = m;
    }
    if (ours < strength(target) * num(bal.coalitionStrength, 1.2)) continue;
    if (!ctx.rng.chance(num(bal.coalitionChance, 0.1))) continue;
    const war = declareWar(ctx, leader, target,
      'The Coalition against ' + (t.name || target), 'coalition');
    if (war) return; // one league a month is plenty
  }
}

// Great-power containment (SPEC §21 extended). The era's ponderous empires
// watch the HUMAN player's share of the settled world's development. Past
// containDevShare their courts sour month by month; past containWarShare a
// watching power that is not hopelessly outmatched may open a war of
// containment — the ratio gates that protect ordinary neighbors do not
// protect a hegemon-in-the-making. This is the answer to "beat the scripted
// enemy, then snowball unopposed."
function hegemonContainment(ctx) {
  const g = ctx.game;
  const bal = ctx.DEFINES.BALANCE || {};
  const player = g.playerTag;
  const pt = g.tags[player];
  if (!pt || !pt.alive || pt.ai) return; // aimed at humans only; all-AI histories stand
  let mine = 0, world = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    const o = g.tags[p && p.owner];
    if (!p || p.impassable || !o) continue;
    const d = devTotal(p);
    world += d;
    if (p.owner === player || o.overlord === player) mine += d; // the player's bloc, clients included
  }
  if (!(world > 0)) return;
  if (!g.flags) g.flags = {};
  const share = mine / world;
  if (share < num(bal.containDevShare, 0.25)) {
    delete g.flags.containmentWatch;
    return;
  }
  const P = ctx.DEFINES.PERSONALITIES || {};
  const watchers = [];
  for (const k of Object.keys(g.tags)) {
    if (k === player || k === 'REB') continue;
    const o = g.tags[k];
    if (!o || !o.alive || !o.ai) continue;
    if (!(P[k] && P[k].ponderous)) continue;
    if (o.overlord === player || pt.overlord === k) continue;
    if ((pt.allies || []).indexOf(k) >= 0) continue;
    watchers.push(k);
  }
  if (!watchers.length) return;
  if (!g.flags.containmentWatch) {
    g.flags.containmentWatch = true;
    ctx.bus.emit('notify', {
      title: 'The powers take notice',
      text: 'Our realm now spans ' + Math.round(share * 100) + '% of the settled world. '
        + 'In the courts of the great powers they have begun to speak of containment.',
      type: 'bad',
    });
  }
  for (const k of watchers) addOpinion(ctx, k, player, -num(bal.containOpinionDrift, 2));
  if (share < num(bal.containWarShare, 0.32)) return;
  const strength = (k) => armiesOf(ctx, k).reduce((s, a) => s + num(a.men), 0) + num(g.tags[k].manpower) * 0.5;
  for (const k of watchers) {
    const o = g.tags[k];
    if ((o.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive)) continue;
    if (truceActive(ctx, k, player)) continue;
    if (num(o.stability) < 0 || num(o.warExhaustion) > 8) continue;
    if (strength(k) < strength(player) * 0.7) continue; // not suicidal, merely resolved
    if (!ctx.rng.chance(num(bal.containChance, 0.06) * num(personality(ctx, k).aggression, 1))) continue;
    declareWar(ctx, k, player, (o.name || k) + '’s War of Containment', 'containment');
    return; // one hegemon war a month
  }
}

function blankAiDeal(enemyTag) {
  const deal = {
    provinces: [], gold: 0, humiliate: false, subjugate: false,
    reparations: false, release: [], transferVassals: [],
  };
  if (enemyTag) deal.enemy = enemyTag;
  return deal;
}

function copyAiDeal(deal) {
  return {
    ...deal,
    provinces: (deal.provinces || []).slice(),
    release: (deal.release || []).slice(),
    transferVassals: (deal.transferVassals || []).slice(),
  };
}

// Test one additional clause through the same validator the player's table
// uses. A planner never gets a private discount, ignores the dismemberment
// cap, or submits a term the scoped congress does not own.
function legalAiCandidate(ctx, war, winner, budget, candidate, kept) {
  const ev = evaluatePeaceDeal(ctx, war, winner, candidate);
  if (!ev.acceptable || ev.cost > budget || (kept && !kept(ev))) return null;
  return { deal: candidate, ev };
}

function provincePreference(a, b) {
  const rank = (row) => row.goalAligned ? 0
    : row.discount === 'claim' ? 1 : row.discount === 'faith' ? 2 : row.goalReason ? 4 : 3;
  return rank(a) - rank(b)
    || (b.dev / Math.max(1, b.cost)) - (a.dev / Math.max(1, a.cost))
    || b.dev - a.dev
    || a.name.localeCompare(b.name);
}

function releasePreference(a, b) {
  const rank = (row) => row.kind === 'restore' ? 0 : row.kind === 'return' ? 1 : 2;
  return rank(a) - rank(b)
    || (b.dev / Math.max(1, b.cost)) - (a.dev / Math.max(1, a.cost))
    || a.cost - b.cost
    || a.name.localeCompare(b.name);
}

// One treaty mind for every AI peace path (SPEC §77). The court's temperament
// determines what victory means:
//   * a claimant or firebrand takes land;
//   * a wary/ponderous power dismantles rivals and containment targets;
//   * an overlord wins an independence war by restoring the yoke;
//   * spare score buys prestige, reparations and an indemnity.
// Every attempted addition is re-priced live, so mixed clauses share the
// ordinary war-score and development budgets.
export function buildAiPeaceDeal(ctx, war, winner, enemyTag, opts) {
  const info = peaceDealInfo(ctx, war, winner, enemyTag);
  const options = opts || {};
  const budget = Math.max(0, Math.min(num(info.myWs), num(options.budget, info.myWs)));
  let deal = blankAiDeal(enemyTag);
  if (budget <= 0) return deal;

  const pers = personality(ctx, winner);
  const rival = !!info.enemyLeader && areRivals(ctx, winner, info.enemyLeader);
  const cb = war.cb || '';
  const dismantle = !info.separate && !info.exit && (
    cb === 'containment' || cb === 'coalition'
    || (rival && (!!pers.ponderous || num(pers.caution, 1) >= num(pers.aggression, 1)))
  );

  const accept = (candidate, kept) => {
    const tested = legalAiCandidate(ctx, war, winner, budget, candidate, kept);
    if (!tested) return false;
    deal = tested.deal;
    return true;
  };
  const addProvince = (row) => {
    const candidate = copyAiDeal(deal);
    candidate.provinces.push(row.id);
    return accept(candidate, (ev) => ev.provinces.includes(row.id));
  };
  const addRelease = (row) => {
    const candidate = copyAiDeal(deal);
    candidate.release.push(row.tag);
    return accept(candidate, (ev) => ev.release.includes(row.tag));
  };
  const addTransfer = (row) => {
    const candidate = copyAiDeal(deal);
    candidate.transferVassals.push(row.tag);
    return accept(candidate, (ev) => ev.transferVassals.includes(row.tag));
  };

  // An independence war has a political objective more exact than annexation.
  // Very aggressive courts also prefer a manageable client to many restive
  // provinces, but only when the yoke is cheap enough to be a plausible prize.
  const onDefendingSide = war.defenders.indexOf(winner) >= 0;
  const restoreYoke = cb === 'independence' && onDefendingSide && info.canSubjugate;
  const pressSuccession = cb === 'succession' && !onDefendingSide && info.canSubjugate;
  const seekSmallClient = !info.separate && !info.exit && info.canSubjugate
    && cb !== 'independence' && cb !== 'containment' && cb !== 'coalition'
    && cb !== 'holy' && cb !== 'liberation'
    && num(pers.aggression, 1) >= 1.25 && info.subjugateCost <= 60
    && budget >= info.subjugateCost + 10;
  if (restoreYoke || pressSuccession || seekSmallClient) {
    const candidate = copyAiDeal(deal);
    candidate.subjugate = true;
    accept(candidate, (ev) => ev.subjugate);
  }

  if (!deal.subjugate) {
    const provinces = (info.provinces || []).slice().sort(provincePreference);
    const releases = (info.releasable || []).slice().sort(releasePreference);
    const transfers = (info.transferableVassals || []).slice()
      .sort((a, b) => (b.dev / Math.max(1, b.cost)) - (a.dev / Math.max(1, a.cost))
        || a.cost - b.cost || a.name.localeCompare(b.name));

    if (dismantle) {
      // Restoration is legitimate statecraft; newly invented partition states
      // are reserved for explicit containment/coalition wars.
      const eligible = releases.filter((row) => row.kind !== 'create'
        || cb === 'containment' || cb === 'coalition');
      let freed = 0;
      for (const row of eligible) {
        if (addRelease(row) && ++freed >= (cb === 'containment' || cb === 'coalition' ? 2 : 1)) break;
      }
      if (transfers.length) addTransfer(transfers[0]);
      // A wary victor still presses clear claims and welcomes co-religionists;
      // it does not automatically swallow every alien occupation.
      const preferred = provinces.filter((row) => row.discount === 'claim' || row.discount === 'faith');
      for (const row of preferred) addProvince(row);
    } else {
      // A conqueror first takes the land its soldiers actually hold.
      for (const row of provinces) addProvince(row);
      if (transfers.length) addTransfer(transfers[0]);
      // With no cession available, an old court's restoration is a useful
      // lesser victory. Ordinary wars do not manufacture arbitrary new states.
      if (!deal.provinces.length && !deal.transferVassals.length) {
        const historic = releases.find((row) => row.kind !== 'create');
        if (historic) addRelease(historic);
      }
    }
  }

  // Cautious courts demand reliable income; bellicose courts demand public
  // submission. Rivals are humiliated whenever the remaining score permits.
  const tryReparations = () => {
    if (deal.reparations) return;
    const candidate = copyAiDeal(deal);
    candidate.reparations = true;
    accept(candidate, (ev) => ev.reparations);
  };
  const tryHumiliation = () => {
    if (deal.humiliate) return;
    const candidate = copyAiDeal(deal);
    candidate.humiliate = true;
    accept(candidate, (ev) => ev.humiliate);
  };
  if (num(pers.caution, 1) >= num(pers.aggression, 1)) tryReparations();
  if (rival || num(pers.aggression, 1) > 1.1) tryHumiliation();
  if (!deal.reparations) tryReparations();

  // Fill the last affordable part of the score with a rounded indemnity.
  if (info.maxGold >= info.goldStep) {
    const current = evaluatePeaceDeal(ctx, war, winner, deal);
    const spare = Math.max(0, budget - current.cost);
    let gold = Math.min(info.maxGold,
      Math.floor((spare * 100 / Math.max(1, info.goldCostPer100)) / info.goldStep) * info.goldStep);
    while (gold >= info.goldStep) {
      const candidate = copyAiDeal(deal);
      candidate.gold = gold;
      if (accept(candidate, (ev) => ev.gold > 0)) break;
      gold -= info.goldStep;
    }
  }
  return deal;
}

export function describeAiPeaceDeal(ctx, war, winner, deal) {
  const info = peaceDealInfo(ctx, war, winner, deal && deal.enemy);
  const ev = evaluatePeaceDeal(ctx, war, winner, deal);
  const clauses = [];
  if (ev.subjugate) clauses.push('submission as a client kingdom');
  if (ev.provinces.length) {
    clauses.push('the cession of ' + ev.provinces.map((id) => {
      const p = ctx.byId(id);
      return (p && p.name) || ('#' + id);
    }).join(', '));
  }
  for (const row of ev.releaseRows || []) {
    if (row.kind === 'return') clauses.push(row.name + '’s old lands returned');
    else if (row.kind === 'create') clauses.push('recognition of ' + row.name);
    else clauses.push('the restoration of ' + row.name);
  }
  for (const row of ev.transferRows || []) clauses.push('the fealty of ' + row.name);
  if (ev.reparations) clauses.push('two years of reparations');
  if (ev.humiliate) clauses.push('a public humiliation');
  if (ev.gold > 0) clauses.push(ev.gold + ' talents');
  return {
    info, ev,
    text: clauses.length ? clauses.join('; ') : 'a return to the old borders',
  };
}

// A rejected maximal demand can produce a real counteroffer rather than a
// red toast. The loser only pares back clauses the player actually proposed,
// preferring money and prestige costs to permanent losses of sovereignty.
export function buildAiCounteroffer(ctx, war, byTag, submitted) {
  const asked = submitted || {};
  const info = peaceDealInfo(ctx, war, byTag, asked.enemy);
  const budget = Math.max(0, num(info.myWs));
  if (budget <= 0) return null;
  let deal = blankAiDeal(asked.enemy);
  const accept = (candidate, kept) => {
    const tested = legalAiCandidate(ctx, war, byTag, budget, candidate, kept);
    if (!tested) return false;
    deal = tested.deal;
    return true;
  };

  // Gold is the least politically damaging concession, so a solvent loser
  // offers as much of the requested indemnity as the victor's score supports.
  let gold = Math.min(info.maxGold, Math.max(0, num(asked.gold)));
  gold = Math.floor(gold / info.goldStep) * info.goldStep;
  while (gold >= info.goldStep) {
    const candidate = copyAiDeal(deal);
    candidate.gold = gold;
    if (accept(candidate, (ev) => ev.gold > 0)) break;
    gold -= info.goldStep;
  }
  if (asked.reparations) {
    const candidate = copyAiDeal(deal);
    candidate.reparations = true;
    accept(candidate, (ev) => ev.reparations);
  }
  if (asked.humiliate) {
    const candidate = copyAiDeal(deal);
    candidate.humiliate = true;
    accept(candidate, (ev) => ev.humiliate);
  }

  const provinceRows = (info.provinces || []).filter((row) => (asked.provinces || []).includes(row.id))
    .sort((a, b) => a.cost - b.cost || a.dev - b.dev || a.name.localeCompare(b.name));
  for (const row of provinceRows) {
    const candidate = copyAiDeal(deal);
    candidate.provinces.push(row.id);
    accept(candidate, (ev) => ev.provinces.includes(row.id));
  }
  const releaseRows = (info.releasable || []).filter((row) => (asked.release || []).includes(row.tag))
    .sort((a, b) => a.cost - b.cost || a.dev - b.dev || a.name.localeCompare(b.name));
  for (const row of releaseRows) {
    const candidate = copyAiDeal(deal);
    candidate.release.push(row.tag);
    accept(candidate, (ev) => ev.release.includes(row.tag));
  }
  const transferRows = (info.transferableVassals || [])
    .filter((row) => (asked.transferVassals || []).includes(row.tag))
    .sort((a, b) => a.cost - b.cost || a.dev - b.dev || a.name.localeCompare(b.name));
  for (const row of transferRows) {
    const candidate = copyAiDeal(deal);
    candidate.transferVassals.push(row.tag);
    accept(candidate, (ev) => ev.transferVassals.includes(row.tag));
  }
  if (asked.subjugate) {
    const candidate = copyAiDeal(deal);
    candidate.subjugate = true;
    accept(candidate, (ev) => ev.subjugate);
  }

  const ev = evaluatePeaceDeal(ctx, war, byTag, deal);
  return ev.acceptable && ev.cost > 0 ? deal : null;
}

export function sendAiCounteroffer(ctx, war, byTag, submitted) {
  if (!ctx.dynEvents || !war) return false;
  const deal = buildAiCounteroffer(ctx, war, byTag, submitted);
  if (!deal) return false;
  const summary = describeAiPeaceDeal(ctx, war, byTag, deal);
  const enemy = summary.info.enemyName || 'The enemy';
  const g = ctx.game;
  g.flags._dynEvN = num(g.flags._dynEvN, 0) + 1;
  const ev = {
    id: 'dyn_peace_counter_' + g.flags._dynEvN,
    title: 'Counteroffer from ' + enemy,
    desc: 'Their envoys refuse the full demand, but do not leave the hall. They offer '
      + summary.text + ' instead. This is the most our present position can compel.',
    forTag: g.playerTag,
    major: true,
    aiOption: 1,
    options: [
      {
        label: 'Accept the counteroffer',
        tooltip: 'The treaty is signed for ' + summary.text + '.',
        effects: () => {
          const live = g.wars.find((w) => w && w.id === war.id);
          if (!live) return;
          const priced = evaluatePeaceDeal(ctx, live, byTag, deal);
          if (priced.acceptable) executePeaceDeal(ctx, live, byTag, deal);
          else ctx.bus.emit('notify', {
            title: 'The offer has lapsed',
            text: 'The front changed before the seals were set. The envoys withdraw.',
            type: 'bad',
          });
        },
      },
      {
        label: 'Refuse — our full terms stand',
        tooltip: 'The war continues. Their court will not receive another mission for six months.',
        effects: () => {},
      },
    ],
  };
  ctx.dynEvents.set(ev.id, ev);
  fireEvent(ctx, ev);
  return true;
}

function separatePeaceThreshold(ctx, tag) {
  return clamp(Math.round(45 / Math.max(0.6, num(personality(ctx, tag).caution, 1))), 20, 60);
}

// A coalition member whose own fields are lost may knock at the victor's door
// without waiting for the player to discover the separate-peace chip.
function sendSeparatePeaceOffer(ctx, war, player) {
  const g = ctx.game;
  const congress = peaceDealInfo(ctx, war, player);
  if (congress.exit || congress.separateTargets.length < 2 || !ctx.dynEvents) return false;
  const rows = congress.separateTargets.slice().sort((a, b) => b.ws - a.ws);
  for (const row of rows) {
    const t = g.tags[row.tag];
    if (!t || !t.alive || !t.ai) continue;
    const weary = num(t.warExhaustion);
    if (row.ws < separatePeaceThreshold(ctx, row.tag) && !(weary >= 15 && row.ws >= 0)) continue;
    const last = war._separateOfferCd && war._separateOfferCd[row.tag];
    if (last && monthsBetween(last, g.date) < 8) continue;
    const deal = buildAiPeaceDeal(ctx, war, player, row.tag);
    const summary = describeAiPeaceDeal(ctx, war, player, deal);
    if (!summary.ev.acceptable) continue;
    if (!war._separateOfferCd) war._separateOfferCd = {};
    war._separateOfferCd[row.tag] = { ...g.date };
    g.flags._dynEvN = num(g.flags._dynEvN, 0) + 1;
    const ev = {
      id: 'dyn_separate_peace_' + g.flags._dynEvN,
      title: (t.name || row.tag) + ' seeks a separate peace',
      desc: 'Its allies may fight on, but this court has had enough. Its envoy offers '
        + summary.text + ' and a five-year truce in exchange for leaving ' + war.name + '.',
      forTag: player,
      major: true,
      aiOption: 1,
      options: [
        {
          label: 'Let them leave the war',
          tooltip: 'Accept ' + summary.text + '; the rest of the coalition fights on.',
          effects: () => {
            const live = g.wars.find((w) => w && w.id === war.id);
            if (!live) return;
            const priced = evaluatePeaceDeal(ctx, live, player, deal);
            if (priced.acceptable) executePeaceDeal(ctx, live, player, deal);
            else ctx.bus.emit('notify', {
              title: 'The corridor closes',
              text: 'The battlefield changed before the separate treaty could be sealed.',
              type: 'bad',
            });
          },
        },
        {
          label: 'No — they answer with their allies',
          tooltip: 'The war continues against the whole coalition.',
          effects: () => {},
        },
      ],
    };
    ctx.dynEvents.set(ev.id, ev);
    fireEvent(ctx, ev);
    return true;
  }
  return false;
}

// In wars without a human belligerent, coalition members use the same
// bilateral ledger and treaty planner. One corridor may close per month.
function settleAiSeparatePeace(ctx, war) {
  const g = ctx.game;
  const leaders = [
    war.attackers.find((t) => g.tags[t] && g.tags[t].alive),
    war.defenders.find((t) => g.tags[t] && g.tags[t].alive),
  ].filter(Boolean);
  for (const winner of leaders) {
    const info = peaceDealInfo(ctx, war, winner);
    if (info.exit || info.separateTargets.length < 2) continue;
    const targets = info.separateTargets.slice().sort((a, b) => b.ws - a.ws);
    for (const row of targets) {
      const t = g.tags[row.tag];
      if (!t || !t.alive || !t.ai) continue;
      if (row.ws < separatePeaceThreshold(ctx, row.tag)
          && !(num(t.warExhaustion) >= 15 && row.ws >= 0)) continue;
      const last = war._aiSeparateCd && war._aiSeparateCd[row.tag];
      if (last && monthsBetween(last, g.date) < 8) continue;
      if (!war._aiSeparateCd) war._aiSeparateCd = {};
      war._aiSeparateCd[row.tag] = { ...g.date };
      const deal = buildAiPeaceDeal(ctx, war, winner, row.tag);
      const ev = evaluatePeaceDeal(ctx, war, winner, deal);
      if (!ev.acceptable) continue;
      executePeaceDeal(ctx, war, winner, deal);
      return true;
    }
  }
  return false;
}

// Peace feelers (monthly). A losing AI leader sues the player for peace — a
// nudge to open the dove dialog and dictate terms. Wars between two AI powers
// resolve themselves once one side clearly prevails or both sides tire.
// A winning enemy dictates (SPEC §33/§77): a dynamic event card carrying a
// personality-aware, fully priced package. Accept and the deal executes as if
// we had signed it at the table; refuse and the war goes on.
function sendUltimatum(ctx, w, leader, ws) {
  const g = ctx.game;
  if (!ctx.dynEvents) return;
  const lt = g.tags[leader];
  const deal = buildAiPeaceDeal(ctx, w, leader);
  const priced = describeAiPeaceDeal(ctx, w, leader, deal);
  if (!priced.ev.acceptable) return;
  const demandTxt = priced.text;
  g.flags._dynEvN = num(g.flags._dynEvN, 0) + 1;
  const ev = {
    id: 'dyn_ultimatum_' + g.flags._dynEvN,
    title: 'Terms from ' + (lt.name || leader),
    desc: 'Their herald reads the terms without looking up: ' + demandTxt + '. '
      + 'The war stands at ' + Math.round(ws) + '% against us. We may take these terms '
      + 'and end it — or send the herald home and trust the next campaign to answer him.',
    forTag: g.playerTag,
    major: true,
    options: [
      {
        label: 'Accept their terms',
        tooltip: 'The war ends on their terms: ' + demandTxt + '.',
        effects: () => {
          try { executePeaceDeal(ctx, w, leader, deal); } catch (e) { warnOnce('ultimatum-accept', 'ultimatum accept failed', e); }
        },
      },
      {
        label: 'Send the herald home',
        tooltip: 'The war goes on. They will not ask again soon.',
        effects: () => {},
      },
    ],
  };
  ctx.dynEvents.set(ev.id, ev);
  try { fireEvent(ctx, ev); } catch (e) { warnOnce('ultimatum', 'ultimatum card failed', e); }
}

function monthlyWarDiplomacy(ctx) {
  const g = ctx.game;
  const player = g.playerTag;
  for (const w of (g.wars || []).slice()) {
    if (!w || w.noNegotiation) continue;
    // Only a HUMAN holds up auto-settlement — if the player tag is
    // AI-driven (balance autoruns, an abandoned multiplayer realm), its wars
    // settle like anyone else's. ANY human belligerent counts (v5.8 fix):
    // a multiplayer guest's war must not settle behind their back either.
    const humans = (Array.isArray(g.humanTags) && g.humanTags.length ? g.humanTags : [player])
      .filter((t) => g.tags[t] && !g.tags[t].ai);
    const humanIn = humans.some((t) => w.attackers.indexOf(t) >= 0 || w.defenders.indexOf(t) >= 0);
    const playerIn = humanIn && (w.attackers.indexOf(player) >= 0 || w.defenders.indexOf(player) >= 0)
      && g.tags[player] && !g.tags[player].ai;
    if (humanIn && !playerIn) continue; // a guest's war: no auto-deal, their own cards come via MP
    if (playerIn) {
      const theirSide = w.attackers.indexOf(player) >= 0 ? w.defenders : w.attackers;
      const leader = theirSide.find((t) => g.tags[t] && g.tags[t].alive);
      if (!leader) continue;
      const lt = g.tags[leader];
      const ws = num(w.warscore && w.warscore[leader]);
      // The enemy is WINNING (SPEC §33): every eight months they send an
      // ultimatum card — accept their demands (they take what they hold, up
      // to their score) or fight on. Losing wars now have an exit the enemy
      // opens, not just the one the player begs for.
      if (ws >= 40) {
        if (w._demandCd && monthsBetween(w._demandCd, g.date) < 8) continue;
        w._demandCd = { ...g.date };
        sendUltimatum(ctx, w, leader, ws);
        continue;
      }
      // The enemy leader may still believe in the coalition while one of its
      // members has lost its own war. That member now comes to us directly.
      if (sendSeparatePeaceOffer(ctx, w, player)) continue;
      const sueAt = 15 / Math.max(0.5, num(personality(ctx, leader).caution, 1));
      if (ws > -40 && !(ws <= -10 && num(lt.warExhaustion) >= sueAt)) continue;
      if (w._sueCd && monthsBetween(w._sueCd, g.date) < 6) continue;
      w._sueCd = { ...g.date };
      ctx.bus.emit('notify', {
        title: (lt.name || leader) + ' sues for peace',
        text: 'Their envoys ask what terms we would set. Open the war in the outliner to dictate them.',
        type: 'good',
      });
    } else {
      // Before the two leaders settle the whole war, let an exhausted member
      // leave through its own bilateral corridor.
      if (settleAiSeparatePeace(ctx, w)) continue;
      const attLead = w.attackers.find((t) => g.tags[t] && g.tags[t].alive);
      const defLead = w.defenders.find((t) => g.tags[t] && g.tags[t].alive);
      if (!attLead || !defLead) continue;
      const wsAtt = num(w.warscore && w.warscore[attLead]);
      const months = monthsBetween(w.started, g.date);
      // A war may carry its own settlement horizon (w.settleMonths): the
      // scripted conquest campaigns (the Rashidun wars for Iraq and the
      // Levant) are generational struggles that must not white-peace out on
      // the default three-year clock while history still expects Yarmouk,
      // Qadisiyyah and the fall of Ctesiphon. A decisive score still settles
      // any war early.
      if (Math.abs(wsAtt) < 50 && months < num(w.settleMonths, 36)) continue;
      const winner = wsAtt >= 0 ? attLead : defLead;
      const deal = buildAiPeaceDeal(ctx, w, winner);
      executePeaceDeal(ctx, w, winner, deal);
    }
  }
}

// With a healthy surplus the AI enacts the next reform tier — one per month,
// keeping a buffer so it can still develop, drill and convert.
function aiReforms(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t) return;
  if (!t.reforms) t.reforms = { mil: 0, civ: 0, rel: 0 };
  for (const key of Object.keys(IDEA_TREES)) {
    const tree = IDEA_TREES[key];
    const owned = t.reforms[key] | 0;
    if (owned >= tree.tiers.length) continue;
    const cost = ideaCost(owned);
    if (num(t.points[tree.point]) < cost + 150) continue;
    t.points[tree.point] -= cost;
    t.reforms[key] = owned + 1;
    applyReformsToTag(ctx.DEFINES, t, tag);
    return; // one tier a month
  }
}

// Keep pace with the age (SPEC §22): the AI buys the cheapest affordable tech
// level each month — never racing ahead of the era (the +50%/level penalty is
// a trap for computers), always catching up when behind.
function aiTech(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t || !t.tech) return;
  const bm = ctx.bookmark;
  const eraBase = eraBaseline(num(bm && bm.techBase, 3) | 0,
    monthsBetween((bm && bm.startDate) || ctx.game.date, ctx.game.date));
  let best = null;
  for (const key of Object.keys(TECH_CATEGORIES)) {
    const level = num(t.tech[key]) | 0;
    const next = level + 1;
    if (next > TECH_MAX || next > eraBase + 1) continue; // never ahead of the age
    const cost = Math.round(techCost(next) * aheadMult(next, eraBase));
    if (num(t.points[TECH_CATEGORIES[key].point]) < cost + 100) continue;
    if (!best || cost < best.cost) best = { key, next, cost };
  }
  if (!best) return;
  t.points[TECH_CATEGORIES[best.key].point] -= best.cost;
  t.tech[best.key] = best.next;
  applyReformsToTag(ctx.DEFINES, t, tag);
}

// A crown within reach is taken (SPEC §22): the AI forms its greater nation
// the month the requirements are met. Returns true if the tag changed — the
// caller must stop touching the old tag object.
function aiFormNation(ctx, tag) {
  const g = ctx.game;
  for (const f of FORMABLES) {
    if (!f.ai) continue; // scripted arcs reference the dynasts by tag — only opted-in formables are AI-safe
    if (f.from !== tag) continue;
    if (f.bookmarks && ctx.bookmark && f.bookmarks.indexOf(ctx.bookmark.id) < 0) continue;
    if (g.tags[f.to]) continue;
    let met = true;
    for (const r of f.requires || []) {
      try { if (!r.check(ctx, tag)) { met = false; break; } } catch (e) { met = false; break; }
    }
    if (!met) continue;
    const oldName = (g.tags[tag] && g.tags[tag].name) || tag;
    if (!switchTagCore(ctx, tag, f.to)) return false;
    const nt = g.tags[f.to];
    applyReformsToTag(ctx.DEFINES, nt, f.to);
    const b = f.bonus || {};
    if (Number.isFinite(b.legitimacy)) nt.legitimacy = clamp(num(nt.legitimacy) + b.legitimacy, 0, 100);
    if (Number.isFinite(b.stability)) nt.stability = clamp(num(nt.stability) + b.stability, -3, 3);
    if (b.modifier) {
      nt.modifiers = (nt.modifiers || []).filter((m) => m && m.id !== b.modifier.id);
      nt.modifiers.push(JSON.parse(JSON.stringify(b.modifier)));
    }
    ctx.bus.emit('tagSwitched', { from: tag, to: f.to });
    ctx.bus.emit('provinceOwner', {});
    ctx.bus.emit('notify', {
      title: 'News from abroad',
      text: oldName + ' proclaims itself ' + (nt.name || f.to) + '.',
      type: 'info',
    });
    return true;
  }
  return false;
}

// Points that would otherwise hit the 999 cap go into the land (SPEC §24):
// with a fat pool the AI develops its best integrated province, capital first.
function aiDevelop(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  if (!t) return;
  const capital = (ctx.DEFINES.TAGS[tag] || {}).capital;
  for (const kind of Object.keys(DEV_KINDS)) {
    const pool = DEV_KINDS[kind];
    if (num(t.points[pool]) < 500) continue; // tech and reforms eat first
    let best = null, bestScore = -1;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.owner !== tag || p.controller !== tag || p.siege) continue;
      const score = devTotal(p) + ((p.canon || p.name) === capital ? 100 : 0) - num(p.autonomy, 0.25) * 20;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    if (best && developInfo(ctx, tag, best, kind).can) developCore(ctx, tag, best, kind);
    return; // one improvement a month
  }
}

// Air power (SPEC §29): once the age of flight arrives, a solvent AI lays a
// runway at its capital, then fills the hangars — one act a month.
function aiAirPower(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  if (!t || num(t.tech && t.tech.mar) < 19) return;
  const AIR = ctx.DEFINES.AIR || {};
  const capName = (ctx.DEFINES.TAGS[tag] || {}).capital;
  const cap = capName && ctx.prov ? ctx.prov(capName) : null;
  if (!cap || cap.owner !== tag || cap.controller !== tag) return;
  if (!hasAirfield(cap)) {
    const b = (ctx.DEFINES.BUILDINGS || {}).airfield;
    if (!b || cap.construction || num(t.treasury) < num(b.cost) + 150) return;
    t.treasury = num(t.treasury) - num(b.cost);
    cap.construction = { key: 'airfield', monthsLeft: Math.max(1, num(b.months, 1)) };
    return;
  }
  const queuedWings = queuedUnitCount(ctx, cap.id, 'wing', tag);
  if (airWingsAt(ctx, cap.id).length + queuedWings < num(AIR.wingsPerField, 2)
      && airWingsOf(ctx, tag).length + queuedUnitsOf(ctx, tag, ['wing']) < 2
      && num(t.treasury) > num(AIR.wingCost, 40) + 120) {
    raiseAirWing(ctx, tag, cap.id);
  }
  // At war, every rearmed wing flies against the richest target in reach.
  if ((t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive)) {
    for (const w of airWingsOf(ctx, tag)) {
      if ((w.raidCd | 0) > 0) continue;
      const tgts = raidTargets(ctx, w);
      if (tgts.length) airRaidCore(ctx, tag, w.id, tgts[0].id);
    }
  }
}

// Re-equip old-pattern armies (and re-rig old fleets, SPEC §31) when the
// coffers allow — cheapest first, one a month.
function aiModernize(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t || num(t.treasury) < 100) return;
  let best = null;
  for (const a of armiesOf(ctx, tag)) {
    const mi = modernizeInfo(ctx, a);
    if (!mi.can || mi.cost > num(t.treasury) - 60) continue;
    if (!best || mi.cost < best.cost) best = { a, cost: mi.cost };
  }
  if (!best) {
    for (const f of Object.values(ctx.game.fleets || {})) {
      if (!f || f.tag !== tag) continue;
      const mi = modernizeFleetInfo(ctx, f);
      if (!mi.can || mi.cost > num(t.treasury) - 60) continue;
      if (!best || mi.cost < best.cost) best = { f, cost: mi.cost };
    }
    if (best) { modernizeFleetCore(ctx, best.f); return; }
    return;
  }
  if (best) modernizeArmyCore(ctx, best.a);
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
      aiTech(ctx, tag);
      aiReforms(ctx, tag);
      aiModernize(ctx, tag);
      aiAirPower(ctx, tag);
      aiDevelop(ctx, tag);
      // Last in the sequence: if the tag forms a greater nation the old key is
      // gone and nothing may touch it again this month.
      aiFormNation(ctx, tag);
    } catch (e) { warnOnce('ai:' + tag, 'AI failed for', tag, e); }
  }
  try { vassalIndependence(ctx); } catch (e) { warnOnce('vassalWar', 'independence rising failed', e); }
  try { coalitionPunitiveWars(ctx); } catch (e) { warnOnce('coalWar', 'punitive coalition failed', e); }
  try { hegemonContainment(ctx); } catch (e) { warnOnce('contain', 'containment failed', e); }
  try { monthlyWarDiplomacy(ctx); } catch (e) { warnOnce('warDiplo', 'war diplomacy failed', e); }
}
