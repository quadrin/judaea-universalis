// Judaea Universalis — military: armies, movement, battles, sieges, wars.
// DOM-free leaf module: imports nothing from other sim files (they import us).

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/military]', ...args);
}

export function num(v, d = 0) { return Number.isFinite(v) ? v : d; }
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function B(ctx, key, fallback) {
  const base = ctx && ctx.DEFINES && ctx.DEFINES.BASE;
  const v = base ? base[key] : undefined;
  return Number.isFinite(v) ? v : fallback;
}
export function devTotal(p) {
  if (!p || !p.dev) return 0;
  return num(p.dev.tax) + num(p.dev.prod) + num(p.dev.mp);
}
// Buildings only work for their owner: an occupied province yields nothing
// from its market, granary or shrine (walls' fort bump is one-time, physical).
export function hasBuilding(p, key) {
  return !!(p && Array.isArray(p.buildings) && p.buildings.indexOf(key) >= 0);
}
export function buildingWorks(p, key) {
  return hasBuilding(p, key) && p.owner === p.controller;
}

// ---------------------------------------------------------------- modifiers
export function resolveTagMult(ctx, tag, key) {
  const t = ctx.game.tags[tag];
  if (!t) return 1;
  let m = num(t.ideas && t.ideas[key], 1);
  if (!(m > 0)) m = 1;
  for (const mod of t.modifiers || []) {
    const e = mod && mod.effects ? mod.effects[key] : undefined;
    if (Number.isFinite(e) && e > 0) m *= e;
  }
  return m;
}
export function resolveTagAdd(ctx, tag, key) {
  const t = ctx.game.tags[tag];
  if (!t) return 0;
  let s = num(t.ideas && t.ideas[key], 0);
  for (const mod of t.modifiers || []) {
    const e = mod && mod.effects ? mod.effects[key] : undefined;
    if (Number.isFinite(e)) s += e;
  }
  return s;
}
export function disciplineOf(ctx, tag) {
  return clamp(resolveTagMult(ctx, tag, 'disciplineMult'), 0.5, 2);
}
export function maxMoraleOf(ctx, tag) {
  const t = ctx.game.tags[tag];
  let m = B(ctx, 'moraleBase', 3.0) * resolveTagMult(ctx, tag, 'moraleMult');
  if (t && num(t.treasury) < 0) m *= 0.9; // indebted crown, wavering men
  return clamp(m, 0.5, 8);
}

// ---------------------------------------------------------------- queries
export function armiesOf(ctx, tag) {
  const out = [];
  for (const id in ctx.game.armies) {
    const a = ctx.game.armies[id];
    if (a && a.tag === tag) out.push(a);
  }
  return out;
}
export function armiesInProv(ctx, provId) {
  const out = [];
  for (const id in ctx.game.armies) {
    const a = ctx.game.armies[id];
    if (a && a.prov === provId) out.push(a);
  }
  return out;
}
export function regCount(a) {
  if (!a || !a.regiments) return 0;
  return num(a.regiments.inf) + num(a.regiments.cav);
}

// ---------------------------------------------------------------- diplomacy
export function isHostile(ctx, a, b) {
  if (!a || !b || a === b) return false;
  if (a === 'REB' || b === 'REB') return true;
  const t = ctx.game.tags[a];
  return !!(t && t.atWarWith && t.atWarWith.indexOf(b) >= 0);
}
export function sameSide(ctx, a, b) {
  if (a === b) return true;
  if (a === 'REB' || b === 'REB') return false;
  const ta = ctx.game.tags[a], tb = ctx.game.tags[b];
  if (!ta || !tb) return false;
  if ((ta.allies && ta.allies.indexOf(b) >= 0) || (tb.allies && tb.allies.indexOf(a) >= 0)) return true;
  for (const w of ctx.game.wars) {
    if ((w.attackers.indexOf(a) >= 0 && w.attackers.indexOf(b) >= 0) ||
        (w.defenders.indexOf(a) >= 0 && w.defenders.indexOf(b) >= 0)) return true;
  }
  return false;
}
export function canEnter(ctx, tag, provId) {
  const p = ctx.byId(provId);
  if (!p || p.impassable) return false;
  if (tag === 'REB') return true;
  if (p.owner === tag) return true;
  if (isHostile(ctx, tag, p.owner)) return true;
  if (sameSide(ctx, tag, p.owner)) return true;
  return false;
}

// ---------------------------------------------------------------- pathfinding
function bfs(ctx, fromId, pass, isGoal, maxDepth) {
  const nbs = ctx.geom && ctx.geom.neighbors;
  if (!nbs || !fromId) return null;
  const prev = new Map();
  prev.set(fromId, 0);
  let frontier = [fromId];
  let depth = 0;
  while (frontier.length && depth < (maxDepth || 64)) {
    depth++;
    const next = [];
    for (const cur of frontier) {
      const set = nbs[cur];
      if (!set) continue;
      for (const nb of set) {
        if (prev.has(nb) || !pass(nb)) continue;
        prev.set(nb, cur);
        if (isGoal(nb)) {
          const path = [nb];
          let at = cur;
          while (at !== fromId && at !== 0) { path.unshift(at); at = prev.get(at); }
          return path;
        }
        next.push(nb);
      }
    }
    frontier = next;
  }
  return null;
}
export function bfsDistances(ctx, fromId, pass, maxDepth) {
  const dist = new Map();
  const nbs = ctx.geom && ctx.geom.neighbors;
  if (!nbs || !fromId) return dist;
  dist.set(fromId, 0);
  let frontier = [fromId];
  let d = 0;
  while (frontier.length && d < (maxDepth || 32)) {
    d++;
    const next = [];
    for (const cur of frontier) {
      const set = nbs[cur];
      if (!set) continue;
      for (const nb of set) {
        if (dist.has(nb) || !pass(nb)) continue;
        dist.set(nb, d);
        next.push(nb);
      }
    }
    frontier = next;
  }
  return dist;
}
export function findPath(ctx, tag, fromId, toId) {
  if (!fromId || !toId) return null;
  if (fromId === toId) return [];
  if (!canEnter(ctx, tag, toId)) return null;
  return bfs(ctx, fromId, (id) => canEnter(ctx, tag, id), (id) => id === toId, 64);
}
export function hopDays(ctx, fromId, destId) {
  const cs = ctx.geom && ctx.geom.centroids;
  const a = cs && cs[fromId], b = cs && cs[destId];
  let dist = 60;
  if (a && b && Number.isFinite(a.x) && Number.isFinite(b.x)) {
    dist = Math.hypot(b.x - a.x, b.y - a.y);
  }
  const p = ctx.byId(destId);
  const terr = p && ctx.DEFINES.TERRAINS ? ctx.DEFINES.TERRAINS[p.terrain] : null;
  const mc = terr ? num(terr.moveCost, 1.2) : 1.2;
  return clamp(Math.round((4 + dist / 24) * mc), 3, 40);
}
export function issueMove(ctx, army, targetId) {
  if (!army || army.inBattle) return false;
  if (army.prov === targetId) { army.path = []; army.moveDaysLeft = 0; return true; }
  const path = findPath(ctx, army.tag, army.prov, targetId);
  if (!path || !path.length) return false;
  army.path = path;
  army.moveDaysLeft = 0; // first leg cost set on next day's tick
  army.retreating = false;
  return true;
}

// ---------------------------------------------------------------- spawn/remove
export function spawnArmy(ctx, tag, provName, opts) {
  const g = ctx.game;
  const o = opts || {};
  const pid = ctx.provId(provName);
  if (!pid) { warnOnce('spawnp:' + provName, 'spawnArmy: unknown province', provName); return 0; }
  if (!g.tags[tag]) { warnOnce('spawnt:' + tag, 'spawnArmy: unknown tag', tag); return 0; }
  let inf = Math.max(0, Math.round(num(o.inf, 0)));
  const cav = Math.max(0, Math.round(num(o.cav, 0)));
  if (inf + cav <= 0) inf = 1;
  const regSize = B(ctx, 'regSize', 1000);
  const id = g.nextArmyId++;
  const mm = maxMoraleOf(ctx, tag);
  const gen = o.general ? {
    name: String(o.general.name || 'General'),
    fire: clamp(Math.round(num(o.general.fire, 0)), 0, 5),
    shock: clamp(Math.round(num(o.general.shock, 0)), 0, 5),
    maneuver: clamp(Math.round(num(o.general.maneuver, 0)), 0, 5),
  } : null;
  const army = {
    id, tag,
    name: o.name || ((g.tags[tag].name || tag) + ' Army'),
    prov: pid, path: [], moveDaysLeft: 0,
    regiments: { inf, cav },
    men: (inf + cav) * regSize,
    morale: mm, maxMorale: mm,
    general: gen,
    inBattle: false, retreating: false,
  };
  g.armies[id] = army;
  engageIfNeeded(ctx, army);
  return id;
}
export function removeArmy(ctx, armyId) {
  const g = ctx.game;
  const a = g.armies[armyId];
  if (!a) return;
  delete g.armies[armyId];
  if (g.ui && g.ui.selectedArmy === armyId) g.ui.selectedArmy = null;
  for (const b of g.battles.slice()) {
    let i = b.atk.indexOf(a.id);
    if (i >= 0) b.atk.splice(i, 1);
    i = b.def.indexOf(a.id);
    if (i >= 0) b.def.splice(i, 1);
    if (!b.atk.length || !b.def.length) {
      endBattle(ctx, b, b.atk.length ? 'atk' : 'def');
    }
  }
}

// ---------------------------------------------------------------- battles
function battleSideArmies(ctx, b, key) {
  const out = [];
  for (const id of b[key]) {
    const a = ctx.game.armies[id];
    if (a && a.men > 0) out.push(a);
  }
  return out;
}
function startBattle(ctx, provId, atkArmies, defArmies) {
  const g = ctx.game;
  g.flags._nextBattleId = num(g.flags._nextBattleId, 0) + 1;
  const b = {
    id: 'b' + g.flags._nextBattleId, prov: provId,
    atk: atkArmies.map((a) => a.id), def: defArmies.map((a) => a.id), day: 0,
  };
  for (const a of atkArmies) a.inBattle = true;
  for (const a of defArmies) a.inBattle = true;
  g.battles.push(b);
  ctx.bus.emit('battleStart', { prov: provId });
}
function endBattle(ctx, b, winKey) {
  const g = ctx.game;
  const i = g.battles.indexOf(b);
  if (i >= 0) g.battles.splice(i, 1);
  const winners = battleSideArmies(ctx, b, winKey);
  for (const a of winners) a.inBattle = false;
  const winnerTag = winners.length ? winners[0].tag : null;
  ctx.bus.emit('battleEnd', { prov: b.prov, winnerTag });
  return winnerTag;
}
export function warBetween(ctx, a, b) {
  for (const w of ctx.game.wars) {
    const aA = w.attackers.indexOf(a) >= 0, aD = w.defenders.indexOf(a) >= 0;
    const bA = w.attackers.indexOf(b) >= 0, bD = w.defenders.indexOf(b) >= 0;
    if ((aA && bD) || (aD && bA)) return w;
  }
  return null;
}
function awardBattleScore(ctx, winnerTag, loserTag) {
  const w = warBetween(ctx, winnerTag, loserTag);
  if (!w) return;
  if (!w._bs) w._bs = { att: 0, def: 0 };
  const key = w.attackers.indexOf(winnerTag) >= 0 ? 'att' : 'def';
  w._bs[key] = Math.min(40, num(w._bs[key]) + 2);
}
export function addWarExhaustion(ctx, tag, amt) {
  const t = ctx.game.tags[tag];
  if (!t) return;
  t.warExhaustion = clamp(num(t.warExhaustion) + amt, 0, B(ctx, 'warExhaustionMax', 20));
}
export function engageIfNeeded(ctx, army) {
  try {
    const g = ctx.game;
    if (!army || !g.armies[army.id] || army.retreating || num(army.shatteredDays) > 0) return;
    const pid = army.prov;
    let b = null;
    for (const bb of g.battles) if (bb.prov === pid) { b = bb; break; }
    if (b) {
      if (b.atk.indexOf(army.id) >= 0 || b.def.indexOf(army.id) >= 0) return;
      const defTags = battleSideArmies(ctx, b, 'def').map((a) => a.tag);
      const atkTags = battleSideArmies(ctx, b, 'atk').map((a) => a.tag);
      const hostileToDef = defTags.some((t) => isHostile(ctx, army.tag, t));
      const hostileToAtk = atkTags.some((t) => isHostile(ctx, army.tag, t));
      // Join a side only when unambiguous; hostile to both (e.g. rebels) stands
      // off and engages the survivor once the battle resolves.
      if (hostileToDef && !hostileToAtk) { b.atk.push(army.id); army.inBattle = true; }
      else if (hostileToAtk && !hostileToDef) { b.def.push(army.id); army.inBattle = true; }
      return;
    }
    const here = armiesInProv(ctx, pid);
    const hostiles = here.filter((o) => o.id !== army.id && !o.retreating && num(o.shatteredDays) <= 0 && o.men > 0 && isHostile(ctx, army.tag, o.tag));
    if (hostiles.length) {
      const friends = here.filter((o) => !o.retreating && !o.inBattle && num(o.shatteredDays) <= 0 && o.men > 0 &&
        (o.id === army.id || sameSide(ctx, army.tag, o.tag)));
      startBattle(ctx, pid, friends.length ? friends : [army], hostiles);
      return;
    }
    const p = ctx.byId(pid);
    if (p && isHostile(ctx, army.tag, p.controller)) ensureSiege(ctx, p, army.tag);
  } catch (e) {
    warnOnce('engage', 'engageIfNeeded failed', e);
  }
}
function casualtiesInflicted(X, Y, rollX, rollY) {
  if (Y.men <= 0 || X.men <= 0) return 0;
  const edge = Math.max(0, rollX - rollY);
  const cas = X.men * 0.010 * (1 + 0.12 * edge) * (X.disc / Math.max(0.5, Y.disc));
  return Math.min(Math.floor(cas), Math.floor(Y.men * 0.12));
}
function moraleDamage(X, Y, rollX, rollY) {
  if (Y.men <= 0) return 0;
  const edge = Math.max(0, rollX - rollY);
  const ratio = clamp(X.men / Math.max(1, Y.men), 0.05, 2.5); // tiny remnants can't break a legion's will
  return (0.16 + 0.045 * edge) * ratio * X.disc;
}
function sideStats(ctx, armies, phase) {
  let men = 0, moraleW = 0, discW = 0, pip = 0, hill = 0;
  const tags = new Set();
  for (const a of armies) {
    men += a.men;
    moraleW += num(a.morale) * a.men;
    discW += disciplineOf(ctx, a.tag) * a.men;
    if (a.general) pip = Math.max(pip, num(a.general[phase], 0));
    tags.add(a.tag);
  }
  for (const t of tags) hill = Math.max(hill, resolveTagAdd(ctx, t, 'hillDefBonus'));
  return {
    men,
    morale: men > 0 ? moraleW / men : 0,
    disc: men > 0 ? discW / men : 1,
    pip, hill,
  };
}
function applySideDamage(armies, sideMen, cas, moraleDmg) {
  for (const a of armies) {
    const share = sideMen > 0 ? a.men / sideMen : 0;
    a.men = Math.max(0, a.men - Math.round(cas * share));
    a.morale = Math.max(0, num(a.morale) - moraleDmg);
  }
}
function sideMoraleAvg(armies) {
  let men = 0, mw = 0;
  for (const a of armies) { men += a.men; mw += num(a.morale) * a.men; }
  return men > 0 ? mw / men : 0;
}
function isFriendlyControlled(ctx, tag, p) {
  return p.controller === tag || sameSide(ctx, tag, p.controller);
}
function routArmy(ctx, army) {
  army.inBattle = false;
  army.morale = 0.3 * num(army.maxMorale, 1);
  army.shatteredDays = 30; // no engagement either way until recovered (EU4 shattered retreat)
  const safeGoal = (id) => {
    const p = ctx.byId(id);
    if (!p || id === army.prov || !isFriendlyControlled(ctx, army.tag, p)) return false;
    return !armiesInProv(ctx, id).some((o) => o.men > 0 && isHostile(ctx, army.tag, o.tag));
  };
  let path = bfs(ctx, army.prov,
    (id) => { const p = ctx.byId(id); return !!p && !p.impassable; },
    safeGoal, 16);
  if (!path || !path.length) {
    // fall back to any friendly province, even contested
    path = bfs(ctx, army.prov,
      (id) => { const p = ctx.byId(id); return !!p && !p.impassable; },
      (id) => { const p = ctx.byId(id); return !!p && id !== army.prov && isFriendlyControlled(ctx, army.tag, p); },
      16);
  }
  if (!path || !path.length) {
    if (army.tag === ctx.game.playerTag) {
      ctx.bus.emit('notify', { title: 'Army destroyed', text: army.name + ' was wiped out with no line of retreat.', type: 'bad' });
    }
    removeArmy(ctx, army.id);
    return;
  }
  army.path = path;
  army.moveDaysLeft = 0;
  army.retreating = true;
}
function battleRound(ctx, b) {
  const g = ctx.game;
  b.day++;
  let atk = battleSideArmies(ctx, b, 'atk');
  let def = battleSideArmies(ctx, b, 'def');
  if (!atk.length && !def.length) {
    const i = g.battles.indexOf(b);
    if (i >= 0) g.battles.splice(i, 1);
    return;
  }
  if (!atk.length || !def.length) { endBattle(ctx, b, atk.length ? 'atk' : 'def'); return; }
  const p = ctx.byId(b.prov);
  const terr = p && ctx.DEFINES.TERRAINS ? ctx.DEFINES.TERRAINS[p.terrain] : null;
  const defBonus = terr ? num(terr.defBonus, 0) : 0;
  const hilly = !!p && (p.terrain === 'hills' || p.terrain === 'mountains');
  const phase = Math.floor((b.day - 1) / 3) % 2 === 0 ? 'fire' : 'shock';
  const A = sideStats(ctx, atk, phase);
  const D = sideStats(ctx, def, phase);
  const rollA = ctx.rng.int(10) + A.pip + (hilly ? A.hill : 0);
  const rollD = ctx.rng.int(10) + D.pip + defBonus + (hilly ? D.hill : 0);
  const casOnAtk = casualtiesInflicted(D, A, rollD, rollA);
  const casOnDef = casualtiesInflicted(A, D, rollA, rollD);
  const mdOnAtk = moraleDamage(D, A, rollD, rollA);
  const mdOnDef = moraleDamage(A, D, rollA, rollD);
  applySideDamage(atk, A.men, casOnAtk, mdOnAtk);
  applySideDamage(def, D.men, casOnDef, mdOnDef);
  for (const a of atk.concat(def)) if (a.men <= 0) removeArmy(ctx, a.id);
  if (g.battles.indexOf(b) < 0) return; // resolved via removals
  atk = battleSideArmies(ctx, b, 'atk');
  def = battleSideArmies(ctx, b, 'def');
  if (!atk.length || !def.length) {
    if (atk.length || def.length) endBattle(ctx, b, atk.length ? 'atk' : 'def');
    else { const i = g.battles.indexOf(b); if (i >= 0) g.battles.splice(i, 1); }
    return;
  }
  const atkBroke = sideMoraleAvg(atk) <= 0.05;
  const defBroke = sideMoraleAvg(def) <= 0.05;
  if (!atkBroke && !defBroke) return;
  const winKey = atkBroke ? 'def' : 'atk'; // attacker yields the field on a mutual break
  const losers = atkBroke ? atk : def;
  const winners = winKey === 'atk' ? atk : def;
  const winnerTag = winners[0].tag;
  const loserTag = losers[0].tag;
  endBattle(ctx, b, winKey); // remove battle first so routing can't double-resolve it
  const winnersMen = winners.reduce((s, a) => s + num(a.men), 0);
  const losersMen = losers.reduce((s, a) => s + num(a.men), 0);
  if (winnersMen >= 10 * Math.max(1, losersMen) || losersMen < 300) {
    // Stackwipe: an overwhelming victory annihilates the remnant instead of
    // letting it rout, recover, and re-engage forever.
    for (const a of losers.slice()) {
      if (a.tag === g.playerTag) {
        ctx.bus.emit('notify', { title: 'Army annihilated', text: a.name + ' was destroyed to the last man at ' + (p ? p.name : 'the field') + '.', type: 'bad', provName: p ? p.name : undefined });
      }
      removeArmy(ctx, a.id);
    }
  } else {
    for (const a of losers.slice()) routArmy(ctx, a);
  }
  awardBattleScore(ctx, winnerTag, loserTag);
  addWarExhaustion(ctx, loserTag, 1);
  const player = g.playerTag;
  if (winnerTag === player || loserTag === player) {
    const won = winnerTag === player;
    ctx.bus.emit('notify', {
      title: 'Battle of ' + (p ? p.name : 'the field'),
      text: (g.tags[winnerTag] ? g.tags[winnerTag].name : winnerTag) + ' holds the field after ' + b.day + ' days of fighting.',
      type: won ? 'good' : 'bad',
      provName: p ? p.name : undefined,
    });
  }
}
export function tickBattles(ctx) {
  for (const b of ctx.game.battles.slice()) {
    try { battleRound(ctx, b); } catch (e) { warnOnce('battle', 'battle round failed', e); }
  }
}

// ---------------------------------------------------------------- movement
export function moveArmiesDaily(ctx) {
  const g = ctx.game;
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a || a.inBattle) continue;
    if (num(a.shatteredDays) > 0) {
      a.shatteredDays--;
      // Recovery is an engagement trigger: without this, co-located hostiles
      // coexist forever once the arrival-driven engage has been skipped.
      if (a.shatteredDays <= 0) engageIfNeeded(ctx, a);
    }
    if (!a.path || !a.path.length) {
      if (a.retreating) a.retreating = false;
      continue;
    }
    if (a.moveDaysLeft <= 0) a.moveDaysLeft = hopDays(ctx, a.prov, a.path[0]);
    a.moveDaysLeft--;
    if (a.moveDaysLeft > 0) continue;
    const next = a.path[0];
    if (!a.retreating && !canEnter(ctx, a.tag, next)) { a.path = []; a.moveDaysLeft = 0; continue; }
    a.path.shift();
    a.prov = next;
    a.moveDaysLeft = 0;
    if (a.retreating && !a.path.length) a.retreating = false;
    engageIfNeeded(ctx, a);
  }
}

// ---------------------------------------------------------------- sieges
// A famine ends when its siege does — otherwise Jerusalem starves forever and
// the penalty even turns against a later garrison of the other side.
function clearFamine(ctx, p) {
  if (!p || p.name !== 'Jerusalem') return;
  if (ctx.game.flags) delete ctx.game.flags.faminePenalty;
  if (Array.isArray(p.modifiers)) p.modifiers = p.modifiers.filter((m) => m && m.id !== 'famine');
}
function playerConcerned(ctx, p, byTag) {
  const pt = ctx.game.playerTag;
  return byTag === pt || p.owner === pt || p.controller === pt;
}
// Armies in the province able to press the siege led by byTag.
export function besiegersOf(ctx, p, byTag) {
  return armiesInProv(ctx, p.id).filter((a) => !a.retreating && !a.inBattle && num(a.shatteredDays) <= 0 && a.men > 0 &&
    (a.tag === byTag || sameSide(ctx, a.tag, byTag)));
}
export function ensureSiege(ctx, p, byTag) {
  if (!p || p.impassable || p.siege) return;
  if (!isHostile(ctx, byTag, p.controller)) return;
  const besiegers = besiegersOf(ctx, p, byTag);
  if (!besiegers.length) return;
  const regs = besiegers.reduce((s, a) => s + regCount(a), 0);
  const need = Math.max(1, Math.ceil(num(p.garrison) / 1000));
  if ((p.fort | 0) > 0 && regs < need) return;
  p.siege = { by: byTag, progress: 0, breach: 0, days: 0 };
  ctx.bus.emit('siegeStart', { provId: p.id, by: byTag });
  if (playerConcerned(ctx, p, byTag)) {
    const bt = ctx.game.tags[byTag];
    ctx.bus.emit('notify', {
      title: 'Siege of ' + p.name,
      text: (bt ? bt.name : byTag) + ' invests ' + p.name + '.',
      type: 'war', provName: p.name,
    });
  }
}
// The one true fall path (progress 100 or a successful storm): controller
// flips, garrison resets to 20%, 'siegeEnd' + notify stay consistent.
export function siegeFall(ctx, p) {
  const g = ctx.game;
  if (!p || !p.siege) return;
  const prev = p.controller;
  const by = p.siege.by;
  p.siege = null;
  clearFamine(ctx, p);
  changeControllerCore(ctx, p, by);
  p.garrison = Math.round(num(p.maxGarrison) * 0.2);
  addWarExhaustion(ctx, prev, 0.5);
  ctx.bus.emit('siegeEnd', { provId: p.id, by });
  if (playerConcerned(ctx, p, by)) {
    ctx.bus.emit('notify', {
      title: p.name + ' has fallen',
      text: (g.tags[by] ? g.tags[by].name : by) + ' takes ' + p.name + '.',
      type: by === g.playerTag ? 'good' : 'bad', provName: p.name,
    });
  }
}
function siegeDay(ctx, p) {
  const g = ctx.game;
  const s = p.siege;
  const besiegers = besiegersOf(ctx, p, s.by);
  if (!besiegers.length) { // siege abandoned
    const by = s.by;
    p.siege = null;
    clearFamine(ctx, p);
    ctx.bus.emit('siegeEnd', { provId: p.id, by });
    return;
  }
  if (g.battles.some((b) => b.prov === p.id)) return; // battle rages; siege pauses
  s.days++;
  const fort = p.fort | 0;
  const regs = besiegers.reduce((sum, a) => sum + regCount(a), 0);
  const bonus = resolveTagAdd(ctx, s.by, 'siegeBonus');
  if (fort <= 0) {
    s.progress += 10; // unwalled town: occupied after ~10 days of unopposed presence
  } else {
    const need = Math.max(1, Math.ceil(num(p.garrison) / 1000));
    if (regs >= need) {
      if (s.days % 14 === 0) {
        const roll = ctx.rng.int(14) + 1;
        if (roll + bonus >= 12 && s.breach < 3) {
          s.breach++;
          if (playerConcerned(ctx, p, s.by)) {
            ctx.bus.emit('notify', { title: 'Walls breached', text: 'A breach opens in the walls of ' + p.name + '.', type: 'war', provName: p.name });
          }
        } else if (roll === 1) {
          for (const a of besiegers) a.men = Math.max(0, a.men - Math.max(1, Math.floor(a.men * 0.02)));
        }
      }
      s.progress += (1.2 + 0.6 * s.breach + 0.03 * clamp(regs - need, 0, 20) + 0.4 * Math.max(0, bonus)) / fort;
      if (p.garrison <= 0) s.progress += 3;
    }
    let decay = 0.0015;
    if (g.flags.faminePenalty && p.name === 'Jerusalem') decay = 0.01;
    if (p.garrison > 0) p.garrison = Math.max(0, p.garrison - Math.max(1, Math.floor(p.garrison * decay)));
  }
  if (s.progress >= 100) siegeFall(ctx, p);
}

// ---------------------------------------------------------------- assaults
// Read-only feasibility + odds for storming a breached wall. byTag must lead
// the siege or share its side; a raging field battle pauses everything.
export function assaultInfo(ctx, p, byTag) {
  const out = {
    can: false, why: '', chancePct: 0, expectedLossesPct: 0,
    chance: 0, lossMen: 0, besiegers: [], besiegerMen: 0,
  };
  const g = ctx.game;
  if (!p || p.impassable || !p.siege) { out.why = 'No siege is under way here.'; return out; }
  const s = p.siege;
  if (s.by !== byTag && !sameSide(ctx, byTag, s.by)) { out.why = 'We do not lead this siege.'; return out; }
  if (g.battles.some((b) => b.prov === p.id)) { out.why = 'A battle rages outside the walls.'; return out; }
  if (num(s.breach) < 1) { out.why = 'The walls stand unbreached.'; return out; }
  const besiegers = besiegersOf(ctx, p, s.by);
  if (!besiegers.length) { out.why = 'No army is fit to storm the walls.'; return out; }
  const men = besiegers.reduce((sum, a) => sum + num(a.men), 0);
  if (men <= 0) { out.why = 'No army is fit to storm the walls.'; return out; }
  const garrison = Math.max(0, num(p.garrison));
  const fort = Math.max(0, p.fort | 0);
  out.can = true;
  out.chance = clamp(0.15 + 0.25 * num(s.breach) + 0.15 * (men / Math.max(1, garrison) - 1), 0.05, 0.9);
  out.chancePct = Math.round(out.chance * 100);
  out.lossMen = Math.round((0.5 + 0.5 * fort) * garrison); // attackers ALWAYS bleed
  out.expectedLossesPct = Math.min(100, Math.round((out.lossMen / men) * 100));
  out.besiegers = besiegers;
  out.besiegerMen = men;
  return out;
}
export function doAssault(ctx, p, byTag) {
  const g = ctx.game;
  const info = assaultInfo(ctx, p, byTag);
  if (!info.can) return { success: false, blocked: true, why: info.why };
  const s = p.siege;
  // Blood price first, win or lose, spread over the besieging armies.
  const total = Math.max(1, info.besiegerMen);
  for (const a of info.besiegers.slice()) {
    const loss = Math.min(a.men, Math.round(info.lossMen * a.men / total));
    a.men = Math.max(0, a.men - loss);
    if (a.men <= 0) {
      if (a.tag === g.playerTag) {
        ctx.bus.emit('notify', { title: 'Army destroyed', text: a.name + ' is consumed storming the walls of ' + p.name + '.', type: 'bad', provName: p.name });
      }
      removeArmy(ctx, a.id);
    }
  }
  const success = ctx.rng.chance(info.chance);
  if (success) {
    if (p.siege) siegeFall(ctx, p); // the existing fall path: flip, 20% garrison, siegeEnd, notify
  } else {
    s.progress = Math.max(0, num(s.progress) - 10);
    for (const a of besiegersOf(ctx, p, s.by)) a.morale = Math.max(0, num(a.morale) - 1.0);
    if (playerConcerned(ctx, p, byTag)) {
      ctx.bus.emit('notify', {
        title: 'Assault repulsed',
        text: 'The garrison of ' + p.name + ' throws the stormers back from the breach.',
        type: byTag === g.playerTag ? 'bad' : 'good', provName: p.name,
      });
    }
  }
  return { success };
}
export function tickSieges(ctx) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || !p.siege) continue;
    try { siegeDay(ctx, p); } catch (e) { warnOnce('siege', 'siege tick failed', e); }
  }
  // Idle armies re-check their province daily: engage recovered hostiles first,
  // fall through to starting a siege (engageIfNeeded does both, in that order).
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a || a.inBattle || a.retreating || num(a.shatteredDays) > 0 || (a.path && a.path.length)) continue;
    engageIfNeeded(ctx, a);
  }
}

// ---------------------------------------------------------------- control/owner
export function changeControllerCore(ctx, p, tag) {
  if (!p || !tag || p.controller === tag) return;
  const from = p.controller;
  p.controller = tag;
  if (p.siege) { // a controller flip voids any active siege — close it loudly (SPEC §7 pairing)
    const by = p.siege.by;
    p.siege = null;
    clearFamine(ctx, p);
    ctx.bus.emit('siegeEnd', { provId: p.id, by });
  }
  ctx.bus.emit('provinceController', { provId: p.id, from, to: tag });
}
export function changeOwnerCore(ctx, p, tag) {
  if (!p || !tag || p.owner === tag) return;
  const from = p.owner;
  p.owner = tag;
  ctx.bus.emit('provinceOwner', { provId: p.id, from, to: tag });
}

// ---------------------------------------------------------------- monthly upkeep
export function monthlyReinforce(ctx) {
  const g = ctx.game;
  const regSize = B(ctx, 'regSize', 1000);
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a || a.inBattle || a.retreating || a.tag === 'REB') continue;
    // Consolidate badly hollowed armies: ghost regiments cost maintenance and
    // support-limit headroom without adding men (post-battle death-spiral guard).
    const effective = Math.max(1, Math.ceil(a.men / regSize));
    if (regCount(a) > effective + 2) {
      let drop = regCount(a) - (effective + 1);
      const dropInf = Math.min(a.regiments.inf, Math.ceil(drop * a.regiments.inf / Math.max(1, regCount(a))));
      a.regiments.inf -= dropInf; drop -= dropInf;
      a.regiments.cav = Math.max(0, a.regiments.cav - Math.max(0, drop));
      if (regCount(a) < 1) a.regiments.inf = 1;
    }
    const t = g.tags[a.tag];
    if (!t) continue;
    const target = regCount(a) * regSize;
    const missing = target - a.men;
    if (missing <= 0) continue;
    let rate = target * 0.10 * resolveTagMult(ctx, a.tag, 'reinforceMult');
    const p = ctx.byId(a.prov);
    if (p && isHostile(ctx, a.tag, p.controller)) rate *= 0.5;
    const add = Math.floor(Math.min(missing, rate, Math.max(0, num(t.manpower))));
    if (add <= 0) continue;
    t.manpower = Math.max(0, num(t.manpower) - add);
    a.men += add;
  }
}
export function monthlyMoraleRecovery(ctx) {
  const g = ctx.game;
  const rec = B(ctx, 'moraleRecoveryPerMonth', 0.6);
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a) continue;
    a.maxMorale = maxMoraleOf(ctx, a.tag);
    if (!a.inBattle) a.morale = Math.min(a.maxMorale, num(a.morale) + rec);
    a.morale = clamp(num(a.morale), 0, a.maxMorale);
  }
}
export function monthlyAttrition(ctx) {
  const g = ctx.game;
  const regsByProv = new Map();
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (a) regsByProv.set(a.prov, (regsByProv.get(a.prov) || 0) + regCount(a));
  }
  const slBase = B(ctx, 'supportLimitBase', 8);
  const slDev = B(ctx, 'supportLimitPerDev', 0.8);
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a) continue;
    const p = ctx.byId(a.prov);
    if (!p) continue;
    const terr = ctx.DEFINES.TERRAINS ? ctx.DEFINES.TERRAINS[p.terrain] : null;
    let attr = terr ? num(terr.attrition, 0) : 0;
    const granary = buildingWorks(p, 'granary'); // +3 support limit, -1 attrition
    const limit = slBase + devTotal(p) * slDev + (granary ? 3 : 0);
    attr += Math.min(6, Math.max(0, (regsByProv.get(a.prov) || 0) - limit));
    if (isHostile(ctx, a.tag, p.controller)) attr += 1;
    if (granary) attr -= 1;
    attr = clamp(attr, 0, 12);
    // Supply lines: an organized siege camp caps attrition (Rome fed Masada's
    // besiegers by road and ramp; so do we).
    if (p.siege && (p.siege.by === a.tag || sameSide(ctx, a.tag, p.siege.by))) attr = Math.min(attr, 5);
    if (a.tag === 'REB' && a.men < 100) { removeArmy(ctx, a.id); continue; } // starving bands scatter
    if (attr <= 0) continue;
    const loss = Math.floor(a.men * attr / 100);
    if (loss <= 0) continue;
    a.men = Math.max(0, a.men - loss);
    if (a.men <= 0) {
      if (a.tag === g.playerTag) {
        ctx.bus.emit('notify', { title: 'Army lost', text: a.name + ' has melted away to attrition.', type: 'bad' });
      }
      removeArmy(ctx, a.id);
    }
  }
}
export function monthlyGarrisons(ctx) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.siege || !(p.maxGarrison > 0)) continue;
    if (p.garrison < p.maxGarrison) {
      p.garrison = Math.min(p.maxGarrison, Math.round(p.garrison + Math.max(10, p.maxGarrison * 0.05)));
    }
  }
}
export function updateTagLife(ctx) {
  const g = ctx.game;
  const owned = {};
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable) owned[p.owner] = (owned[p.owner] || 0) + 1;
  }
  for (const k of Object.keys(g.tags)) {
    if (k === 'REB') continue; // REB always alive
    g.tags[k].alive = !!(owned[k] || armiesOf(ctx, k).length);
  }
}

// ---------------------------------------------------------------- recruiting & merging
export function recruitRegiment(ctx, tag, provId, type) {
  const g = ctx.game;
  const t = g.tags[tag];
  const p = ctx.byId(provId);
  if (!t || !p) return { ok: false, why: 'invalid province or tag' };
  if (type !== 'inf' && type !== 'cav') return { ok: false, why: 'unknown unit type' };
  const costs = (ctx.DEFINES.BASE && ctx.DEFINES.BASE.regCost) || {};
  const cost = num(costs[type], type === 'cav' ? 25 : 10);
  const regSize = B(ctx, 'regSize', 1000);
  if (num(t.treasury) <= -100) return { ok: false, why: 'the treasury is exhausted' };
  if (num(t.manpower) < regSize) return { ok: false, why: 'not enough manpower' };
  t.treasury = num(t.treasury) - cost;
  t.manpower = num(t.manpower) - regSize;
  let host = null;
  for (const a of armiesInProv(ctx, provId)) {
    if (a.tag === tag && !a.retreating && !a.inBattle) { host = a; break; }
  }
  if (host) {
    host.regiments[type] = num(host.regiments[type]) + 1;
    host.men += regSize;
  } else {
    spawnArmy(ctx, tag, p.name, { inf: type === 'inf' ? 1 : 0, cav: type === 'cav' ? 1 : 0, name: 'Levy of ' + p.name });
  }
  return { ok: true };
}
// Detach floor(half) the regiments (mix kept proportional) with a matching
// share of men into a fresh, general-less army in the same province. The
// detachment is a perfectly ordinary army — the AI merge pass, battles and
// attrition treat it like any other. Returns the new army id, or 0.
export function splitArmyCore(ctx, army) {
  const g = ctx.game;
  if (!army || !g.armies[army.id]) return 0;
  const R = regCount(army);
  if (R < 2) return 0;
  const newRegs = Math.floor(R / 2);
  const inf = num(army.regiments.inf), cav = num(army.regiments.cav);
  let newInf = Math.round(inf * newRegs / R);
  newInf = clamp(newInf, Math.max(0, newRegs - cav), Math.min(inf, newRegs));
  const newCav = newRegs - newInf;
  const newMen = Math.floor(num(army.men) * newRegs / R);
  if (newMen < 1) return 0; // too hollowed out to divide
  army.regiments.inf = inf - newInf;
  army.regiments.cav = cav - newCav;
  army.men = Math.max(0, num(army.men) - newMen);
  const id = g.nextArmyId++;
  const det = {
    id, tag: army.tag,
    name: (army.name || 'Army') + ' — Detachment',
    prov: army.prov, path: [], moveDaysLeft: 0,
    regiments: { inf: newInf, cav: newCav },
    men: newMen,
    morale: num(army.morale), maxMorale: num(army.maxMorale, 3),
    general: null,
    inBattle: false, retreating: false,
  };
  g.armies[id] = det;
  engageIfNeeded(ctx, det);
  return id;
}
export function mergeInto(ctx, fromId, intoId) {
  const g = ctx.game;
  const f = g.armies[fromId];
  const into = g.armies[intoId];
  if (!f || !into || f === into) return false;
  if (f.tag !== into.tag || f.prov !== into.prov) return false;
  if (f.inBattle || into.inBattle || f.retreating || into.retreating) return false;
  const totalMen = f.men + into.men;
  into.morale = totalMen > 0 ? (num(f.morale) * f.men + num(into.morale) * into.men) / totalMen : into.morale;
  into.regiments.inf = num(into.regiments.inf) + num(f.regiments.inf);
  into.regiments.cav = num(into.regiments.cav) + num(f.regiments.cav);
  into.men = totalMen;
  if (!into.general && f.general) into.general = f.general;
  removeArmy(ctx, fromId);
  return true;
}

// ---------------------------------------------------------------- generals
// Period name pools keyed by DEFINES.CULTURES group (a hired general speaks
// the recruiting court's tongue). ~8 names per group.
export const GENERAL_NAMES = {
  israelite: ['Eleazar ben Yair', 'Simon ben Cathlas', 'Yohanan ben Levi', 'Judah ben Ari', 'Niger of Perea', 'Silas the Babylonian', 'Joseph ben Simon', 'Jesus ben Sapphias'],
  hellenic:  ['Nikanor', 'Apollonios', 'Demetrios', 'Lysias', 'Antigonos', 'Philon', 'Kallistratos', 'Herakleides'],
  latin:     ['Sextus Vettulenus', 'Aulus Larcius', 'Marcus Ulpius', 'Gaius Cetronius', 'Lucius Annius', 'Quintus Petillius', 'Titus Frigius', 'Gnaeus Pompeius Collega'],
  iranian:   ['Vologases', 'Pacorus', 'Mithridates', 'Artabanus', 'Phraates', 'Gotarzes', 'Sanatruces', 'Osroes'],
  arab:      ['Malichus', 'Obodas', 'Aretas', 'Rabbel', 'Syllaeus', 'Wahballat', 'Hareth', 'Amru'],
  syrian:    ['Sohaemus', 'Azizus', 'Sampsiceramus', 'Abgar', 'Mannus', 'Iamblichus', 'Monimus', 'Bargates'],
  egyptian:  ['Petosiris', 'Ammonios', 'Harpocras', 'Chaeremon', 'Apion', 'Onnophris', 'Psammis', 'Nechutes'],
  armenian:  ['Tiridates', 'Artavasdes', 'Tigranes', 'Sanatruk', 'Mithrobarzanes', 'Vardanes', 'Zariadres', 'Orontes'],
};
function weightedIndex(rng, weights) {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}
// Pips weighted toward 1-3: fire/shock 0-4, maneuver 0-5.
export function rollGeneral(ctx, tag) {
  const t = ctx.game.tags[tag];
  const cul = t && ctx.DEFINES.CULTURES ? ctx.DEFINES.CULTURES[t.culture] : null;
  const pool = (cul && GENERAL_NAMES[cul.group]) || GENERAL_NAMES.hellenic;
  return {
    name: ctx.rng.pick(pool),
    fire: weightedIndex(ctx.rng, [2, 5, 6, 5, 2]),
    shock: weightedIndex(ctx.rng, [2, 5, 6, 5, 2]),
    maneuver: weightedIndex(ctx.rng, [2, 4, 5, 5, 3, 1]),
  };
}

// ---------------------------------------------------------------- wars & warscore
export function truceKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
export function truceActive(ctx, a, b) {
  const g = ctx.game;
  const t = g.truces && g.truces[truceKey(a, b)];
  if (!t) return false;
  return g.date.y < t.y || (g.date.y === t.y && g.date.m < t.m);
}
export function declareWar(ctx, atk, def, name) {
  const g = ctx.game;
  const A = g.tags[atk], D = g.tags[def];
  if (!A || !D) { warnOnce('dw:' + atk + ':' + def, 'declareWar: unknown tag', atk, def); return null; }
  if (truceActive(ctx, atk, def)) return null; // the ink on the treaty is still wet
  const existing = warBetween(ctx, atk, def);
  if (existing) return existing;
  const attackers = [atk];
  const defenders = [def];
  for (const al of A.allies || []) {
    if (g.tags[al] && g.tags[al].alive && al !== def && (D.allies || []).indexOf(al) < 0) attackers.push(al);
  }
  for (const al of D.allies || []) {
    if (g.tags[al] && g.tags[al].alive && al !== atk && attackers.indexOf(al) < 0) defenders.push(al);
  }
  const war = {
    id: 'war' + (g.wars.length + 1),
    name: name || ((A.name || atk) + '–' + (D.name || def) + ' War'),
    attackers, defenders, warscore: {}, started: { ...g.date }, _bs: { att: 0, def: 0 },
  };
  g.wars.push(war);
  for (const a of attackers) {
    for (const d of defenders) {
      const ta = g.tags[a], td = g.tags[d];
      if (ta && ta.atWarWith.indexOf(d) < 0) ta.atWarWith.push(d);
      if (td && td.atWarWith.indexOf(a) < 0) td.atWarWith.push(a);
    }
  }
  ctx.bus.emit('war', { id: war.id, name: war.name, attackers: attackers.slice(), defenders: defenders.slice() });
  ctx.bus.emit('notify', { title: 'War!', text: war.name + ' has begun.', type: 'war' });
  return war;
}

// ---------------------------------------------------------------- opinion & alliances
// Costs, gains and cooldowns for the player-facing diplomacy actions (init.js
// gameActions) and the AI reciprocity pass (ai.js). Frozen action contract.
export const DIPLO = {
  improveCost: 25, improveGain: 15, improveCdMonths: 4,
  giftCost: 75, giftGain: 20, giftCdMonths: 6,
  allyMinOpinion: 60, allyAcceptOpinion: 110, allyRefuseOpinion: -5, allyCdMonths: 6,
  breakOpinion: -50,
};
export function opinionOf(ctx, whose, of) {
  const t = ctx.game.tags[whose];
  return t && t.opinion ? clamp(Math.round(num(t.opinion[of])), -200, 200) : 0;
}
export function addOpinion(ctx, whose, of, delta) {
  const t = ctx.game.tags[whose];
  if (!t || !of || whose === of) return;
  if (!t.opinion) t.opinion = {};
  t.opinion[of] = clamp(Math.round(num(t.opinion[of]) + num(delta)), -200, 200);
}
// Cooldowns live in game.diploCooldowns['<me>><them>:<kind>'] = {y, m} — the
// first month the action is available again. Created lazily; older saves lack
// the map entirely (reviveGame supplies the default).
export function diploCdActive(ctx, key) {
  const g = ctx.game;
  const cd = g.diploCooldowns ? g.diploCooldowns[key] : null;
  if (!cd) return false;
  return g.date.y < cd.y || (g.date.y === cd.y && g.date.m < cd.m);
}
export function diploCdMonthsLeft(ctx, key) {
  const g = ctx.game;
  const cd = g.diploCooldowns ? g.diploCooldowns[key] : null;
  if (!cd) return 0;
  let months = (cd.y - g.date.y) * 12 + (cd.m - g.date.m);
  if (g.date.y < 0 && cd.y > 0) months -= 12; // no year zero
  return Math.max(0, months);
}
export function setDiploCd(ctx, key, months) {
  const g = ctx.game;
  if (!g.diploCooldowns) g.diploCooldowns = {};
  const total = g.date.m - 1 + Math.max(0, months | 0);
  let y = g.date.y + Math.floor(total / 12);
  if (g.date.y < 0 && y >= 0) y += 1; // no year zero: -1 rolls straight to 1
  g.diploCooldowns[key] = { y, m: (total % 12) + 1 };
}
// 'Shared common enemy' = some third tag alive that both have in atWarWith.
export function sharedWarEnemy(ctx, a, b) {
  const g = ctx.game;
  const ta = g.tags[a], tb = g.tags[b];
  if (!ta || !tb) return false;
  for (const e of ta.atWarWith || []) {
    if (e === a || e === b) continue;
    if (!g.tags[e] || !g.tags[e].alive) continue;
    if ((tb.atWarWith || []).indexOf(e) >= 0) return true;
  }
  return false;
}
// Mutual removal from both allies arrays; the jilted party's opinion of the
// breaker drops. Returns true only when an alliance actually existed.
export function breakAllianceCore(ctx, breaker, other) {
  const g = ctx.game;
  const a = g.tags[breaker], b = g.tags[other];
  if (!a || !b) return false;
  const had = (a.allies || []).indexOf(other) >= 0 || (b.allies || []).indexOf(breaker) >= 0;
  if (!had) return false;
  a.allies = (a.allies || []).filter((x) => x !== other);
  b.allies = (b.allies || []).filter((x) => x !== breaker);
  addOpinion(ctx, other, breaker, DIPLO.breakOpinion);
  return true;
}

// ---------------------------------------------------------------- peace
// EU4-style negotiated peace: the offering side assembles a deal — occupied
// enemy provinces (warscore cost scales with development), an indemnity in
// talents, a humiliation — and the enemy accepts when the offerer's warscore
// covers the total. The bookmark's scripted war (war.noNegotiation) resolves
// only through events/victory.
export const PEACE = {
  provCostPerDev: 0.9,   // warscore per point of demanded development
  provCostMin: 4,        // floor per province
  goldCostPer100: 10,    // warscore per 100 talents demanded
  goldStep: 25,          // UI stepper granularity
  humiliateCost: 15,
  whiteEnemyWsAtMost: 5, // enemy accepts a white peace at/below this net score
  warWearyWE: 15,        // war exhaustion at which a not-quite-winning enemy takes white peace
};
export function enemySideOf(war, tag) {
  return war.attackers.indexOf(tag) >= 0 ? war.defenders : war.attackers;
}
function provDemandCost(p) {
  return Math.max(PEACE.provCostMin, Math.round(devTotal(p) * PEACE.provCostPerDev));
}
// Everything the peace dialog needs: our score, the enemy leader, which
// provinces are on the table (enemy-owned, our-side-occupied) and their costs.
export function peaceDealInfo(ctx, war, byTag) {
  const g = ctx.game;
  const mySide = war.attackers.indexOf(byTag) >= 0 ? war.attackers : war.defenders;
  const theirSide = enemySideOf(war, byTag);
  const enemyLeader = theirSide.find((t) => g.tags[t] && g.tags[t].alive) || null;
  const et = enemyLeader ? g.tags[enemyLeader] : null;
  const provinces = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (theirSide.indexOf(p.owner) < 0) continue;
    if (mySide.indexOf(p.controller) < 0) continue; // must be occupied by our side
    provinces.push({ id: i, name: p.name, dev: devTotal(p), owner: p.owner, cost: provDemandCost(p) });
  }
  provinces.sort((a, b) => b.dev - a.dev || a.name.localeCompare(b.name));
  const rawMax = et ? Math.max(0, num(et.treasury)) * 0.6 + 100 : 0;
  return {
    warId: war.id, warName: war.name,
    myWs: Math.round(num(war.warscore && war.warscore[byTag])),
    enemyLeader, enemyName: et ? (et.name || enemyLeader) : '',
    enemyWarExhaustion: et ? num(et.warExhaustion) : 0,
    provinces,
    maxGold: Math.floor(rawMax / PEACE.goldStep) * PEACE.goldStep,
    goldStep: PEACE.goldStep,
    goldCostPer100: PEACE.goldCostPer100,
    humiliateCost: PEACE.humiliateCost,
    noNegotiation: !!war.noNegotiation,
  };
}
// deal = { provinces: [provId], gold: talents, humiliate: bool }. Returns the
// warscore price, whether the enemy takes it, and a one-line reason.
export function evaluatePeaceDeal(ctx, war, byTag, deal) {
  const d = deal || {};
  const info = peaceDealInfo(ctx, war, byTag);
  const chosen = [];
  let cost = 0;
  for (const id of Array.isArray(d.provinces) ? d.provinces : []) {
    const row = info.provinces.find((r) => r.id === (id | 0));
    if (!row || chosen.indexOf(row) >= 0) continue;
    chosen.push(row);
    cost += row.cost;
  }
  const gold = clamp(Math.round(num(d.gold)), 0, info.maxGold);
  cost += Math.round(gold * PEACE.goldCostPer100 / 100);
  const humiliate = !!d.humiliate;
  if (humiliate) cost += PEACE.humiliateCost;
  const white = !chosen.length && gold <= 0 && !humiliate;
  const enemyWs = -info.myWs;
  let acceptable, reason;
  if (white) {
    acceptable = enemyWs <= PEACE.whiteEnemyWsAtMost ||
      (info.enemyWarExhaustion >= PEACE.warWearyWE && enemyWs <= 15);
    reason = acceptable
      ? 'They are ready to lay down arms.'
      : 'They believe they are winning, and will not settle for nothing.';
  } else {
    acceptable = info.myWs > 0 && cost <= info.myWs;
    reason = acceptable
      ? 'Our position compels them to accept.'
      : `Our war score does not cover such demands (${cost} asked, ${Math.max(0, info.myWs)} held).`;
  }
  return { cost, acceptable, reason, gold, humiliate, provinces: chosen.map((c) => c.id) };
}
// Applies an (already accepted) deal, then winds the war down: status quo for
// the rest, truces, atWarWith rebuild, stranded armies march home.
export function executePeaceDeal(ctx, war, byTag, deal) {
  const g = ctx.game;
  const info = peaceDealInfo(ctx, war, byTag);
  const ev = evaluatePeaceDeal(ctx, war, byTag, deal);
  const me = g.tags[byTag];
  const terms = [];
  // Cession first: demanded provinces change owner to the peacemaker.
  const cededNames = [];
  for (const id of ev.provinces) {
    const p = ctx.byId(id);
    if (!p) continue;
    cededNames.push(p.name);
    changeOwnerCore(ctx, p, byTag);
    changeControllerCore(ctx, p, byTag);
  }
  if (cededNames.length) terms.push('cedes ' + cededNames.join(', '));
  if (ev.gold > 0 && info.enemyLeader && me) {
    const et = g.tags[info.enemyLeader];
    et.treasury = num(et.treasury) - ev.gold;
    me.treasury = num(me.treasury) + ev.gold;
    terms.push('pays ' + ev.gold + ' talents');
  }
  if (ev.humiliate && info.enemyLeader && me) {
    const et = g.tags[info.enemyLeader];
    me.legitimacy = clamp(num(me.legitimacy) + 10, 0, 100);
    me.points.gov = clamp(num(me.points.gov) + 25, 0, 999);
    me.points.infl = clamp(num(me.points.infl) + 25, 0, 999);
    me.points.mar = clamp(num(me.points.mar) + 25, 0, 999);
    et.legitimacy = clamp(num(et.legitimacy) - 15, 0, 100);
    et.stability = clamp(num(et.stability) - 1, -3, 3);
    terms.push('is humiliated before the nations');
  }
  const participants = war.attackers.concat(war.defenders);
  // Status quo ante for everything still occupied, both directions.
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (participants.indexOf(p.owner) >= 0 && p.controller !== p.owner &&
        participants.indexOf(p.controller) >= 0 && g.tags[p.owner] && g.tags[p.owner].alive) {
      changeControllerCore(ctx, p, p.owner);
    }
  }
  // Dissolve the war, rebuild atWarWith from the wars that remain, set truces.
  const wi = g.wars.indexOf(war);
  if (wi >= 0) g.wars.splice(wi, 1);
  for (const t of Object.keys(g.tags)) if (g.tags[t]) g.tags[t].atWarWith = [];
  for (const w of g.wars) {
    for (const a of w.attackers) for (const d of w.defenders) {
      const ta = g.tags[a], td = g.tags[d];
      if (ta && ta.atWarWith.indexOf(d) < 0) ta.atWarWith.push(d);
      if (td && td.atWarWith.indexOf(a) < 0) td.atWarWith.push(a);
    }
  }
  if (!g.truces) g.truces = {};
  for (const a of war.attackers) for (const d of war.defenders) {
    g.truces[truceKey(a, d)] = { y: g.date.y + 5, m: g.date.m };
  }
  // March stranded armies home through now-neutral land (retreating bypasses entry rules).
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a || participants.indexOf(a.tag) < 0) continue;
    const p = ctx.byId(a.prov);
    if (!p || p.controller === a.tag || sameSide(ctx, a.tag, p.controller) || isHostile(ctx, a.tag, p.controller)) continue;
    const path = bfs(ctx, a.prov,
      (pid) => { const q = ctx.byId(pid); return !!q && !q.impassable; },
      (pid) => { const q = ctx.byId(pid); return !!q && q.controller === a.tag; },
      24);
    if (path && path.length) { a.path = path; a.moveDaysLeft = 0; a.retreating = true; a.inBattle = false; }
  }
  ctx.bus.emit('war', { id: war.id, name: war.name, ended: true });
  const summary = terms.length
    ? (info.enemyName || 'The enemy') + ' ' + terms.join('; ') + '.'
    : 'A white peace: every occupation reverts.';
  ctx.bus.emit('notify', {
    title: 'Peace of ' + (g.date.y < 0 ? (-g.date.y) + ' BCE' : g.date.y + ' CE'),
    text: war.name + ' ends. ' + summary + ' A five-year truce holds.',
    type: 'good',
  });
}
// Signed months between two game dates (BCE years are negative; no year zero).
export function monthsBetween(a, b) {
  if (!a || !b) return 0;
  let m = (b.y - a.y) * 12 + (b.m - a.m);
  if (a.y < 0 && b.y > 0) m -= 12;
  if (a.y > 0 && b.y < 0) m += 12;
  return m;
}
function sideGross(ctx, w, key) {
  const g = ctx.game;
  const mine = key === 'att' ? w.attackers : w.defenders;
  const theirs = key === 'att' ? w.defenders : w.attackers;
  let enemyDev = 0, occupied = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (theirs.indexOf(p.owner) < 0) continue;
    const d = devTotal(p);
    enemyDev += d;
    if (mine.indexOf(p.controller) >= 0) occupied += d;
  }
  const occScore = enemyDev > 0 ? Math.min(60, (occupied / enemyDev) * 60) : 0;
  const bs = w._bs ? Math.min(40, num(w._bs[key])) : 0;
  const ev = w.eventScore ? num(w.eventScore[key]) : 0; // scripted swings (Beth Horon, the Temple) persist here
  return bs + occScore + ev;
}
export function updateWarscores(ctx) {
  for (const w of ctx.game.wars) {
    const att = sideGross(ctx, w, 'att');
    const def = sideGross(ctx, w, 'def');
    for (const t of w.attackers) w.warscore[t] = Math.round(clamp(att - def, -100, 100));
    for (const t of w.defenders) w.warscore[t] = Math.round(clamp(def - att, -100, 100));
  }
}
