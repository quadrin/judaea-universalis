// Judaea Universalis — unrest, revolt progression, rebel spawning, war exhaustion.
// DOM-free.

import {
  num, clamp, B, resolveTagAdd, isHostile, spawnArmy, changeControllerCore, buildingWorks,
  liveGrudge, grudgeCeiling, areRivals,
} from './military.js';
import { popTension, popTotal } from './population.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/unrest]', ...args);
}

function U(ctx, key, fallback) {
  const u = ctx.DEFINES && ctx.DEFINES.UNREST;
  const v = u ? u[key] : undefined;
  return Number.isFinite(v) ? v : fallback;
}

// Ancient Judaean states may receive a rising inside the map's canonical
// Judaea region even after losing every bordering province. This deliberately
// excludes diaspora kingdoms (ADI) and modern Israel (ISR): outside the ancient
// revolt bookmarks, ordinary risings still have to touch the country's border.
const JUDAEAN_HOMELAND_TAGS = new Set(['JUD', 'HAS', 'HYR', 'ARI', 'HER', 'ATG', 'MLI']);

function bordersTag(ctx, p, tag) {
  const neighbors = ctx.geom && ctx.geom.neighbors && ctx.geom.neighbors[p.id];
  if (!neighbors) return false;
  for (const id of neighbors) {
    const q = ctx.game.provinces[id];
    if (q && !q.impassable && (q.owner === tag || q.controller === tag)) return true;
  }
  return false;
}

function isJudaeanHomeland(ctx, p, tag) {
  if (!JUDAEAN_HOMELAND_TAGS.has(tag)) return false;
  // MAP_DATA is immutable scenario geography. Its JUD-owned province group is
  // the project's existing Judaea/Galilee heartland, independent of bookmark
  // ownership changes during setup or play.
  const base = ctx.MAP_DATA && ctx.MAP_DATA.provinces && ctx.MAP_DATA.provinces[p.id - 1];
  return !!base && base.owner === 'JUD';
}

function canRevoltJoin(ctx, p, tag) {
  return bordersTag(ctx, p, tag) || isJudaeanHomeland(ctx, p, tag);
}
function religionGroup(ctx, rel) {
  const r = ctx.DEFINES.RELIGIONS ? ctx.DEFINES.RELIGIONS[rel] : null;
  return r ? r.group : null;
}
function cultureGroup(ctx, cul) {
  const c = ctx.DEFINES.CULTURES ? ctx.DEFINES.CULTURES[cul] : null;
  return c ? c.group : null;
}

const r2 = (v) => Math.round(v * 100) / 100;

// Full labeled breakdown; also returns total (raw, may be negative).
export function computeUnrestBreakdown(ctx, prov) {
  const rows = [];
  const g = ctx.game;
  const owner = g.tags[prov.owner];
  if (!owner) return { total: 0, rows };
  // Communal tension (SPEC §56): where a makeup exists, unrest is the
  // UNINTEGRATED minority share, weighted by how foreign each community is —
  // a 12% minority frets, it does not convulse; integration calms it toward
  // zero. A homogeneous conquest (share 1.0) reproduces the old binary
  // numbers exactly. Provinces without a makeup keep the classic rows.
  const tension = popTotal(prov) > 0 ? popTension(ctx, prov, owner) : null;
  if (tension) {
    const integ = 1 - clamp(num(prov.integration), 0, 1);
    const heathen = tension.heathen * U(ctx, 'heathen', 3) * integ;
    const heretic = tension.heretic * U(ctx, 'sameGroupHeretic', 1.5) * integ;
    const culture = tension.foreignCulture * U(ctx, 'wrongCultureGroup', 1) * integ;
    if (heathen > 0.01) rows.push({ label: 'Heathen communities (' + Math.round(tension.heathen * 100) + '%)', value: r2(heathen) });
    if (heretic > 0.01) rows.push({ label: 'Heretic communities (' + Math.round(tension.heretic * 100) + '%)', value: r2(heretic) });
    if (culture > 0.01) rows.push({ label: 'Foreign culture (' + Math.round(tension.foreignCulture * 100) + '%)', value: r2(culture) });
  } else {
    if (prov.religion && owner.religion && prov.religion !== owner.religion) {
      const gp = religionGroup(ctx, prov.religion);
      const go = religionGroup(ctx, owner.religion);
      if (gp && go && gp === go) rows.push({ label: 'Heretic faith', value: U(ctx, 'sameGroupHeretic', 1.5) });
      else rows.push({ label: 'Heathen faith', value: U(ctx, 'heathen', 3) });
    }
    if (prov.culture && owner.culture && cultureGroup(ctx, prov.culture) !== cultureGroup(ctx, owner.culture)) {
      rows.push({ label: 'Foreign culture', value: U(ctx, 'wrongCultureGroup', 1) });
    }
  }
  if (prov.controller !== prov.owner) {
    rows.push({ label: 'Enemy occupation', value: U(ctx, 'occupied', 3) });
  }
  const we = num(owner.warExhaustion) * U(ctx, 'perWarExhaustion', 0.25);
  if (we > 0.001) rows.push({ label: 'War exhaustion', value: r2(we) });
  const stab = num(owner.stability);
  if (stab < 0) rows.push({ label: 'Instability', value: r2(-stab * U(ctx, 'perNegativeStability', 1)) });
  else if (stab > 0) rows.push({ label: 'Stability', value: r2(stab * U(ctx, 'perPositiveStability', -0.75)) });
  // Shrine soothes the province, but not under an occupier (buildingWorks
  // requires owner === controller — no building benefits during occupation).
  if (buildingWorks(prov, 'shrine')) rows.push({ label: 'Shrine', value: -1.5 });
  for (const mod of prov.modifiers || []) {
    const e = mod && mod.effects ? mod.effects.unrest : undefined;
    if (Number.isFinite(e) && e !== 0) rows.push({ label: mod.name || mod.id || 'Modifier', value: e });
  }
  // Overextension: unintegrated conquests (autonomy >= 0.6) strain the whole
  // realm in proportion to how much of it they are (anti-snowball, SPEC §21).
  {
    const g2 = ctx.game;
    let hot = 0, all = 0;
    for (let i = 1; i < g2.provinces.length; i++) {
      const q = g2.provinces[i];
      if (!q || q.impassable || q.owner !== prov.owner) continue;
      const d = (q.dev ? (q.dev.tax || 0) + (q.dev.prod || 0) + (q.dev.mp || 0) : 0);
      all += d;
      if (num(q.autonomy, 0.25) >= 0.6) hot += d;
    }
    const over = all > 0 ? hot / all : 0;
    if (over > 0.15) rows.push({ label: 'Overextension', value: r2(over * 3) });
  }
  const nat = resolveTagAdd(ctx, prov.owner, 'unrestAll');
  if (Math.abs(nat) > 0.001) rows.push({ label: 'National unrest', value: r2(nat) });
  if (num(prov.garrison) > 0) rows.push({ label: 'Garrison', value: -1 });
  let total = 0;
  for (const r of rows) total += num(r.value);
  return { total: r2(total), rows };
}

export function explainUnrest(ctx, provId) {
  try {
    const p = ctx.byId(provId);
    if (!p || p.impassable) return [];
    const { rows } = computeUnrestBreakdown(ctx, p);
    return rows;
  } catch (e) {
    warnOnce('explainUnrest', 'explainUnrest failed', e);
    return [];
  }
}

function fireRevolt(ctx, p) {
  const g = ctx.game;
  const size = Math.max(1, Math.round(num(p.dev && p.dev.mp) * B(ctx, 'rebelSizePerDev', 0.4)));
  // A local rising may join a neighboring co-religionist power fighting its
  // ruler (JUD in 66 CE, HAS in 167 BCE). Remote diaspora revolts remain REB;
  // the ancient Judaean heartland is the exception when the rising is landless.
  let rebelTag = 'REB';
  for (const key of Object.keys(g.tags)) {
    const t = g.tags[key];
    if (t && t.alive && key !== 'REB' && key !== p.owner &&
        t.religion === p.religion && isHostile(ctx, key, p.owner) &&
        canRevoltJoin(ctx, p, key)) {
      rebelTag = key;
      break;
    }
  }
  // Throttle the tide: at most 8 rebel bands under arms at once, and a province
  // that has risen cannot rise again for 30 months.
  if (rebelTag === 'REB') {
    let rebCount = 0;
    for (const id of Object.keys(g.armies)) { const a = g.armies[id]; if (a && a.tag === 'REB' && a.men > 0) rebCount++; }
    if (rebCount >= 8) { p.revoltProgress = 0; p.revoltCooldownMonths = 6; return; }
  }
  const name = rebelTag !== 'REB' ? 'Zealots of ' + p.name : 'Rebels of ' + p.name;
  spawnArmy(ctx, rebelTag, p.name, { inf: size, name });
  if (num(p.garrison) <= 0) changeControllerCore(ctx, p, rebelTag);
  p.revoltProgress = 0;
  p.revoltCooldownMonths = 30;
  p.unrest = Math.max(0, num(p.unrest) - 4); // steam vented
  ctx.bus.emit('notify', {
    title: 'Revolt in ' + p.name,
    text: (rebelTag !== 'REB' ? 'The province rises for ' + ((g.tags[rebelTag] && g.tags[rebelTag].name) || rebelTag) + ' — ' : 'Rebels take up arms — ') + size + ',000 men in the streets.',
    type: 'war', provName: p.name,
  });
}

export function monthlyUnrest(ctx) {
  const g = ctx.game;
  const threshold = B(ctx, 'unrestRevoltThreshold', 5);
  const fireAt = B(ctx, 'revoltFireAt', 100);
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    try {
      if (!g.tags[p.owner]) { p.unrest = 0; continue; }
      const { total } = computeUnrestBreakdown(ctx, p);
      p.unrest = Math.max(0, total);
      if (num(p.revoltCooldownMonths) > 0) {
        // The province spent its fury; a fresh rising takes years to gather.
        p.revoltCooldownMonths--;
        p.revoltProgress = 0;
        continue;
      }
      if (p.unrest > threshold) {
        p.revoltProgress = Math.min(fireAt, num(p.revoltProgress) + (p.unrest - threshold) * 2);
      } else {
        p.revoltProgress = Math.max(0, num(p.revoltProgress) - 10);
      }
      if (p.revoltProgress >= fireAt) fireRevolt(ctx, p);
    } catch (e) { warnOnce('unrest:' + i, 'unrest failed for province', i, e); }
  }
}

// Opinions cool toward neutral by 1 point a month; between allies, friendship
// settles warm at +60 instead of fading to indifference.
export function monthlyOpinionDrift(ctx) {
  const g = ctx.game;
  // Infamy: decays monthly — a point at peace, a quarter-point while the
  // conqueror is still at war (the sword stays in view) — and while it lasts
  // every court in the world thinks a little less of them (anti-snowball).
  const BALd = ctx.DEFINES.BALANCE || {};
  const infamous = [];
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t) continue;
    if (num(t.aggression) > 0) {
      const atWar = (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
      const decay = atWar ? num(BALd.infamyDecayWar, 0.25) : num(BALd.infamyDecayPeace, 1);
      t.aggression = Math.max(0, num(t.aggression) - decay);
      if (t.aggression >= 20) infamous.push(tag);
    }
  }
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t) continue;
    // The lost lands are remembered (SPEC §67): prune grudge entries whose
    // land the taker no longer owns (returned, retaken, or a fallen house) —
    // from then on the old wound heals at ordinary drift speed below. While
    // a grudge is live, opinion above the ceiling is pulled down toward it.
    const grudged = [];
    if (t.grudges) {
      for (const taker of Object.keys(t.grudges)) {
        if (!liveGrudge(ctx, tag, taker)) { delete t.grudges[taker]; continue; }
        grudged.push(taker);
        const cap = grudgeCeiling(ctx, tag, taker);
        if (!t.opinion) t.opinion = {};
        const v = Math.round(num(t.opinion[taker]));
        if (v > cap) {
          t.opinion[taker] = clamp(Math.max(cap, v - num(BALd.grudgeBite, 4)), -200, 200);
        }
      }
      if (!Object.keys(t.grudges).length) delete t.grudges;
    }
    if (!t.opinion) continue;
    for (const bad of infamous) {
      if (bad === tag || t.overlord === bad || (g.tags[bad].allies || []).indexOf(tag) >= 0) continue;
      t.opinion[bad] = clamp(num(t.opinion[bad], 0) - Math.ceil(num(g.tags[bad].aggression) / 15), -200, 200);
    }
    for (const other of Object.keys(t.opinion)) {
      if (other === tag) continue;
      if (infamous.indexOf(other) >= 0 && num(t.opinion[other]) < 0) continue; // grudges against conquerors don't fade yet
      if (grudged.indexOf(other) >= 0) continue; // occupied patrimony does not warm toward neutral
      // Old hatreds cool to the old climate (SPEC §73): allies warm to +60,
      // the era's standing rivals settle at the cold baseline, everyone else
      // mellows to neutral. An alliance, if the players ever forge one across
      // a rivalry, outranks the old enmity. And while an overlord is weaving
      // this court into the realm (SPEC §75), the weavers tend it: the pair
      // drifts toward the union's own threshold instead of cooling to
      // indifference mid-incorporation.
      const V = ctx.DEFINES.VASSALS || {};
      const weaving = t.incorporating && t.incorporating.by === other;
      const allied = (t.allies || []).indexOf(other) >= 0;
      const target = allied ? 60
        : weaving ? num(V.incorporateOpinion, 80)
          : (areRivals(ctx, tag, other) ? num(B(ctx, 'rivalOpinion', -60)) : 0);
      const v = Math.round(num(t.opinion[other]));
      t.opinion[other] = v === target ? v : clamp(v > target ? v - 1 : v + 1, -200, 200);
    }
  }
}

// +0.05/month at war, decays at peace; battle/siege bumps applied in military.js.
export function monthlyWarExhaustion(ctx) {
  const g = ctx.game;
  const max = B(ctx, 'warExhaustionMax', 20);
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive) continue;
    const atWar = (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
    t.warExhaustion = clamp(num(t.warExhaustion) + (atWar ? 0.05 : -0.25), 0, max);
  }
}

// Decrement timed tag & province modifiers; drop expired (months === -1 is permanent).
export function tickModifiers(ctx) {
  const g = ctx.game;
  const sweep = (arr) => {
    if (!Array.isArray(arr)) return arr;
    return arr.filter((mod) => {
      if (!mod) return false;
      if (!Number.isFinite(mod.months) || mod.months < 0) return true;
      mod.months -= 1;
      return mod.months > 0;
    });
  };
  for (const tag of Object.keys(g.tags)) {
    g.tags[tag].modifiers = sweep(g.tags[tag].modifiers);
  }
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p) p.modifiers = sweep(p.modifiers);
  }
}
