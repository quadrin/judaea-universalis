// Judaea Universalis — monthly AI (SPEC §6.3). Gathers stacks, marches on the
// enemy, sieges, retreats from bad odds, recruits toward aiHints.targetRegiments.
// DOM-free.

import {
  num, clamp, B, devTotal, regCount, armiesOf, armiesInProv, isHostile, sameSide,
  canEnter, issueMove, mergeInto, recruitRegiment, bfsDistances, disciplineOf,
  breakAllianceCore,
} from './military.js';

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

function aiSpendPoints(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t || !t.points) return;
  if (t.stability < 1 && num(t.points.gov) >= 100) { t.points.gov -= 75; t.stability = clamp(t.stability + 1, -3, 3); }
  if (num(t.manpower) < num(t.maxManpower) * 0.2 && num(t.points.mar) >= 100) {
    t.points.mar -= 50;
    t.manpower = Math.min(num(t.maxManpower), num(t.manpower) + 2000);
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
  const enemies = (t.atWarWith || []).filter((e) => g.tags[e] && g.tags[e].alive);
  if (!enemies.length) return; // non-warring AI idles
  const hints = (ctx.bookmark && ctx.bookmark.aiHints && ctx.bookmark.aiHints[tag]) || {};
  aiRecruit(ctx, tag, hints);
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

export function runMonthlyAI(ctx) {
  const g = ctx.game;
  for (const tag of Object.keys(g.tags)) {
    try {
      const t = g.tags[tag];
      if (!t || !t.alive || !t.ai) continue;
      if (tag === 'REB') { runRebelAI(ctx); continue; }
      aiDiploReciprocity(ctx, tag);
      runTagAI(ctx, tag);
    } catch (e) { warnOnce('ai:' + tag, 'AI failed for', tag, e); }
  }
}
