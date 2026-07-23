// Judaea Universalis — supply lines (SPEC §82). DOM-free.
//
// Every army traces its bread monthly: back through a connected chain of
// friendly or self-occupied provinces to CONTROLLED HOME TERRITORY, or to an
// unblockaded friendly port and thence — provided the side keeps a warship
// afloat and an open home harbor — across the water. A severed chain (a
// captured chokepoint, a hostile squadron off the landing beach) puts the
// army OUT OF SUPPLY: no reinforcements, morale mends at a crawl, attrition
// mounts month over month, and after a few months the isolated host starts to
// break. Rebels are exempt (banditry IS their supply), as is a nation with no
// land left at all — the guerrilla phase of 167 BCE lives off the hills by
// design, and the sim must not starve a loss condition the bookmark owns.
//
// The trace is also a UI contract: traceSupply returns the route, the point
// where it is broken, and why — the overlay draws it, the outliner and unit
// inspector print it. Uses only ctx.game / ctx.geom / ctx.byId, so the map
// overlay may call it with a mini-ctx.

import { num, isHostile, sameSide } from './military.js';
import { isCoastal } from './navy.js';

function S(ctx, key, fallback) {
  const sup = ctx.DEFINES && ctx.DEFINES.SUPPLY;
  return sup && Number.isFinite(sup[key]) ? sup[key] : fallback;
}

// A province the chain may run through: not impassable, and controlled by the
// army's own side — its own realm, a co-belligerent, or its occupation troops.
function chainPass(ctx, tag, id) {
  const p = ctx.byId(id);
  if (!p || p.impassable) return false;
  return p.controller === tag || sameSide(ctx, tag, p.controller);
}
// Controlled home territory: the army's own land, in its own hands.
function isHomeSource(ctx, tag, id) {
  const p = ctx.byId(id);
  return !!p && !p.impassable && p.owner === tag && p.controller === tag;
}
// A hostile squadron riding off the shore closes the harbor mouth to US
// (navy.blockadedBy asks about the port's controller; supply asks for the army).
export function seaLaneCut(ctx, tag, provId) {
  for (const f of Object.values(ctx.game.fleets || {})) {
    if (f && f.ships > 0 && f.prov === provId && isHostile(ctx, tag, f.tag)) return true;
  }
  return false;
}
// A port the chain may embark from: side-controlled coast with no hostile
// fleet off it. (A land siege does not close the sea gate — Sidon fed by ship
// while the ram worked — only the fall of the town or a blockade does.)
function embarkPort(ctx, tag, id) {
  return chainPass(ctx, tag, id) && isCoastal(ctx, id) && !seaLaneCut(ctx, tag, id);
}
// The far end of the lane: an open harbor in controlled home territory.
function homePortOf(ctx, tag) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    if (isHomeSource(ctx, tag, i) && isCoastal(ctx, i) && !seaLaneCut(ctx, tag, i)) return i;
  }
  return 0;
}
// A warship afloat somewhere on the side keeps the lane held open.
function sideFleetAfloat(ctx, tag) {
  for (const f of Object.values(ctx.game.fleets || {})) {
    if (f && f.ships > 0 && (f.tag === tag || sameSide(ctx, tag, f.tag))) return true;
  }
  return false;
}

function ownsAnyProvince(ctx, tag) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === tag) return true;
  }
  return false;
}

// Armies outside the supply contract: rebels (banditry feeds them), cargo
// aboard a fleet (the hulls carry their bread and their risk), and the armies
// of a nation with no land at all — the state in exile IS its army.
export function supplyExempt(ctx, army) {
  if (!army || army.tag === 'REB' || army.aboard) return true;
  return !ownsAnyProvince(ctx, army.tag);
}

// BFS over the friendly chain from the army's own square (the origin is
// always granted — an army standing in an enemy province draws from the
// chain beside it). Returns { prev, order } so callers can rebuild routes.
function chainFlood(ctx, tag, fromId, maxDepth) {
  const nbs = ctx.geom && ctx.geom.neighbors;
  const prev = new Map();
  prev.set(fromId, 0);
  if (!nbs) return prev;
  let frontier = [fromId];
  let depth = 0;
  while (frontier.length && depth < (maxDepth || 64)) {
    depth++;
    const next = [];
    for (const cur of frontier) {
      const set = nbs[cur];
      if (!set) continue;
      for (const nb of set) {
        if (prev.has(nb) || !chainPass(ctx, tag, nb)) continue;
        prev.set(nb, cur);
        next.push(nb);
      }
    }
    frontier = next;
  }
  return prev;
}
function routeTo(prev, fromId, goal) {
  const path = [goal];
  let at = prev.get(goal);
  while (at && at !== 0 && at !== fromId) { path.unshift(at); at = prev.get(at); }
  if (goal !== fromId) path.unshift(fromId);
  return path;
}

// The full trace. Returns:
//   { ok, via: 'home'|'port'|'exempt'|null, route: [provIds army→source],
//     homePort, breakAt, reason: ''|'corridor'|'blockade'|'noFleet'|'noHomePort'|'noRoute' }
// When broken, `route` is the corridor that WOULD supply the army (nearest
// home source over passable ground, control ignored) and `breakAt` the first
// province on it in hostile or neutral hands — the point to show on the map.
export function traceSupply(ctx, army) {
  const tag = army.tag;
  if (supplyExempt(ctx, army)) return { ok: true, via: 'exempt', route: [], homePort: 0, breakAt: 0, reason: '' };
  const prev = chainFlood(ctx, tag, army.prov, 64);
  // 1) the chain reaches controlled home territory
  let bestHome = 0, bestLen = Infinity;
  for (const id of prev.keys()) {
    if (!isHomeSource(ctx, tag, id)) continue;
    const len = routeTo(prev, army.prov, id).length;
    if (len < bestLen) { bestLen = len; bestHome = id; }
  }
  if (bestHome) {
    return { ok: true, via: 'home', route: routeTo(prev, army.prov, bestHome), homePort: 0, breakAt: 0, reason: '' };
  }
  // 2) the chain reaches a friendly port, and the lane home is held. The
  // origin province is part of the CHAIN even in enemy hands (the army
  // stands there), but it only counts as a PORT once actually held — a host
  // besieging the beach town it landed at starves until the gates open.
  let port = 0, portLen = Infinity, sawCoast = 0;
  for (const id of prev.keys()) {
    if (!isCoastal(ctx, id) || !chainPass(ctx, tag, id)) continue;
    sawCoast = sawCoast || id;
    if (seaLaneCut(ctx, tag, id)) continue;
    const len = routeTo(prev, army.prov, id).length;
    if (len < portLen) { portLen = len; port = id; }
  }
  if (port) {
    const homePort = homePortOf(ctx, tag);
    if (!homePort) {
      return { ok: false, via: null, route: routeTo(prev, army.prov, port), homePort: 0, breakAt: port, reason: 'noHomePort' };
    }
    if (!sideFleetAfloat(ctx, tag)) {
      return { ok: false, via: null, route: routeTo(prev, army.prov, port), homePort, breakAt: port, reason: 'noFleet' };
    }
    return { ok: true, via: 'port', route: routeTo(prev, army.prov, port), homePort, breakAt: 0, reason: '' };
  }
  if (sawCoast) {
    // Every reachable harbor has a hostile squadron off it: the army holds
    // its landing province and starves anyway — the blockade is the break.
    return { ok: false, via: null, route: routeTo(prev, army.prov, sawCoast), homePort: 0, breakAt: sawCoast, reason: 'blockade' };
  }
  // 3) broken. Find the corridor that WOULD reach home and where it dies.
  const nbs = ctx.geom && ctx.geom.neighbors;
  const anyPrev = new Map();
  anyPrev.set(army.prov, 0);
  let frontier = [army.prov];
  let goal = 0, depth = 0;
  while (frontier.length && !goal && depth < 64) {
    depth++;
    const next = [];
    for (const cur of frontier) {
      const set = nbs && nbs[cur];
      if (!set) continue;
      for (const nb of set) {
        const p = ctx.byId(nb);
        if (anyPrev.has(nb) || !p || p.impassable) continue;
        anyPrev.set(nb, cur);
        if (isHomeSource(ctx, tag, nb)) { goal = nb; break; }
        next.push(nb);
      }
      if (goal) break;
    }
    frontier = next;
  }
  if (!goal) return { ok: false, via: null, route: [], homePort: 0, breakAt: 0, reason: 'noRoute' };
  const corridor = routeTo(anyPrev, army.prov, goal);
  let breakAt = 0;
  for (const id of corridor) {
    if (id === army.prov) continue;
    if (!chainPass(ctx, tag, id)) { breakAt = id; break; }
  }
  return { ok: false, via: null, route: corridor, homePort: 0, breakAt, reason: 'corridor' };
}

// The penalties, spelled once for every surface that prints them.
export function supplyPenaltyText(ctx, army) {
  const months = Math.max(1, num(army && army.oosMonths, 1) | 0);
  const base = S(ctx, 'attritionBase', 2);
  const ramp = Math.min(S(ctx, 'attritionRampCap', 6), (months - 1) * S(ctx, 'attritionPerMonth', 1));
  const weakAt = S(ctx, 'weakenAtMonths', 3);
  let txt = 'No reinforcements; morale recovers at a quarter pace; +'
    + (base + ramp) + '%/month attrition (mounting).';
  if (months >= weakAt) {
    txt += ' The men are breaking: morale capped at '
      + Math.round(S(ctx, 'weakMoraleCap', 0.5) * 100) + '%.';
  }
  return txt;
}

export function supplyReasonText(ctx, res) {
  if (!res || res.ok) return '';
  if (res.reason === 'blockade') return 'A hostile fleet blockades every harbor the army can reach.';
  if (res.reason === 'noFleet') return 'The sea lane home needs a warship afloat to hold it.';
  if (res.reason === 'noHomePort') return 'No open home harbor remains to ship supply from.';
  if (res.reason === 'corridor') {
    const p = res.breakAt ? ctx.byId(res.breakAt) : null;
    return 'The land corridor home is cut' + (p ? ' at ' + p.name : '') + '.';
  }
  return 'No road, chain of friends, or sea lane reaches this army.';
}

// Monthly: every army checks its line. Runs BEFORE reinforcement/morale/
// attrition in the monthly block so this month's penalties read this month's
// truth. Player armies toast on the transition, never on every tick.
export function monthlySupply(ctx) {
  const g = ctx.game;
  const weakAt = S(ctx, 'weakenAtMonths', 3);
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a) continue;
    if (supplyExempt(ctx, a)) {
      a.oosMonths = 0;
      a.supplyVia = 'exempt';
      continue;
    }
    const res = traceSupply(ctx, a);
    if (res.ok) {
      if (num(a.oosMonths) > 0 && a.tag === g.playerTag) {
        ctx.bus.emit('notify', {
          title: 'Supply restored',
          text: a.name + ' is back on its line — the wagons '
            + (res.via === 'port' ? 'and grain ships ' : '') + 'come through again.',
          type: 'good',
        });
      }
      a.oosMonths = 0;
      a.supplyVia = res.via;
      continue;
    }
    a.oosMonths = (a.oosMonths | 0) + 1;
    a.supplyVia = null;
    if (a.tag === g.playerTag) {
      if (a.oosMonths === 1) {
        ctx.bus.emit('notify', {
          title: 'Out of supply',
          text: a.name + ' can trace no line home. ' + supplyReasonText(ctx, res)
            + ' No reinforcements will reach it, and attrition will mount.',
          type: 'bad',
        });
      } else if (a.oosMonths === weakAt) {
        ctx.bus.emit('notify', {
          title: 'An army starves',
          text: a.name + ' has been cut off for ' + a.oosMonths
            + ' months — the ranks thin, and the men who remain are breaking.',
          type: 'bad',
        });
      }
    }
  }
}
