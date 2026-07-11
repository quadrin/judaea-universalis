// Judaea Universalis — sim entry: initGame / makeCtx / gameActions / simHelpers
// (SPEC §6.1, §6.2, §6.4, §6.6). DOM-free; imports only core/rng + sim siblings.

import { createRng } from '../core/rng.js';
import {
  num, clamp, B, armiesOf, spawnArmy, removeArmy, changeOwnerCore, changeControllerCore,
  declareWar, issueMove, mergeInto, recruitRegiment, canEnter,
  makePeace, aiWillAccept, PEACE_TERMS,
} from './military.js';
import { maxManpowerOf, explainIncome } from './economy.js';
import { explainUnrest } from './unrest.js';
import { resolveEventOption } from './events.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/init]', ...args);
}

// ------------------------------------------------------------------ initGame
export function initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed }) {
  const start = (bookmark && bookmark.startDate) || { y: 66, m: 6, d: 1 };
  const game = {
    bookmarkId: (bookmark && bookmark.id) || '66ce',
    playerTag,
    over: false, result: null,
    date: { y: start.y, m: start.m, d: start.d },
    speed: 2, paused: true,
    tags: {},
    provinces: [null],
    armies: {}, nextArmyId: 1, nextEventInstance: 1,
    battles: [], wars: [], truces: {},
    pendingEvents: [], firedEvents: {}, flags: {},
    rngSeed,
    ui: { selectedProv: 0, selectedArmy: null },
  };

  const srcProvs = (MAP_DATA && MAP_DATA.provinces) || [];
  for (let i = 0; i < srcProvs.length; i++) {
    const s = srcProvs[i] || {};
    const id = i + 1;
    let x = 0, y = 0;
    const c = geom && geom.centroids && geom.centroids[id];
    if (c && Number.isFinite(c.x) && Number.isFinite(c.y)) {
      x = c.x; y = c.y;
    } else if (MAP_DATA && typeof MAP_DATA.project === 'function') {
      const xy = MAP_DATA.project(num(s.lon), num(s.lat));
      x = num(xy && xy[0]); y = num(xy && xy[1]);
    }
    const terr = DEFINES.TERRAINS ? DEFINES.TERRAINS[s.terrain] : null;
    const impassable = !!(s.impassable || (terr && terr.impassable));
    const fort = Math.max(0, s.fort | 0);
    const maxGarrison = fort * B({ DEFINES }, 'fortGarrisonPerLevel', 1000);
    game.provinces.push({
      id, name: s.name || ('Province ' + id), x, y,
      terrain: s.terrain, good: s.good, religion: s.religion, culture: s.culture,
      dev: {
        tax: num(s.dev && s.dev.tax),
        prod: num(s.dev && s.dev.prod),
        mp: num(s.dev && s.dev.mp),
      },
      owner: s.owner || 'WASTE', controller: s.owner || 'WASTE',
      autonomy: 0.25, unrest: 0, revoltProgress: 0,
      fort, garrison: maxGarrison, maxGarrison,
      siege: null, modifiers: [],
      holy: s.holy || null, wonder: s.wonder || null,
      impassable,
    });
  }

  const tagDefs = DEFINES.TAGS || {};
  for (const key of Object.keys(tagDefs)) {
    if (key === 'WASTE') continue;
    const d = tagDefs[key] || {};
    game.tags[key] = {
      tag: key,
      name: d.name || key,
      color: Array.isArray(d.color) ? d.color.slice() : [128, 128, 128],
      religion: d.religion, culture: d.culture,
      alive: true,
      ai: key !== playerTag,
      treasury: 0, income: 0, expenses: 0,
      manpower: 0, maxManpower: 0,
      stability: 0, legitimacy: 50, warExhaustion: 0,
      points: { gov: 0, infl: 0, mar: 0 },
      ideas: { ...(d.ideas || {}) },
      modifiers: [],
      atWarWith: [], allies: [], opinion: {},
      aiState: {},
    };
  }

  // starting manpower pools from owned development
  const tmpCtx = {
    game, DEFINES,
    byId: (id) => game.provinces[id] || null,
  };
  for (const key of Object.keys(game.tags)) {
    const t = game.tags[key];
    t.maxManpower = maxManpowerOf(tmpCtx, key);
    t.manpower = t.maxManpower;
  }
  return game;
}

// ------------------------------------------------------------------ makeCtx
export function makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events }) {
  const nameToId = new Map();
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p) nameToId.set(p.name, i);
  }
  const ctx = {
    game, DEFINES, MAP_DATA, geom, bus, bookmark, events,
    rng: createRng((num(game.rngSeed, 1)) >>> 0),
    helpers: simHelpers,
    prov(name) {
      const id = nameToId.get(name);
      if (!id) { warnOnce('prov:' + name, 'unknown province name:', name); return null; }
      return game.provinces[id] || null;
    },
    provId(name) {
      const id = nameToId.get(name);
      if (!id) { warnOnce('provId:' + name, 'unknown province name:', name); return 0; }
      return id;
    },
    byId(id) { return game.provinces[id] || null; },
  };
  if (!game.flags._setupDone) {
    game.flags._setupDone = true;
    try {
      if (bookmark && typeof bookmark.setup === 'function') bookmark.setup(ctx);
    } catch (e) { console.warn('[sim/init] bookmark.setup failed:', e); }
  }
  return ctx;
}

// ------------------------------------------------------------------ simHelpers (§6.4, frozen)
export const simHelpers = {
  spawnArmy(ctx, tag, provName, opts) {
    return spawnArmy(ctx, tag, provName, opts);
  },
  removeArmy(ctx, armyId) {
    removeArmy(ctx, armyId);
  },
  changeOwner(ctx, provName, tag, opts) {
    const p = ctx.prov(provName);
    if (!p || !ctx.game.tags[tag]) return;
    changeOwnerCore(ctx, p, tag);
    if (!opts || opts.alsoController !== false) changeControllerCore(ctx, p, tag);
  },
  changeController(ctx, provName, tag) {
    const p = ctx.prov(provName);
    if (!p || !(ctx.game.tags[tag] || tag === 'REB')) return;
    changeControllerCore(ctx, p, tag);
  },
  addProvinceModifier(ctx, provName, mod) {
    const p = ctx.prov(provName);
    if (!p || !mod || !mod.id) return;
    p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== mod.id);
    p.modifiers.push({
      id: mod.id, name: mod.name || mod.id,
      months: Number.isFinite(mod.months) ? mod.months : -1,
      effects: { ...(mod.effects || {}) },
    });
  },
  addTagModifier(ctx, tag, mod) {
    const t = ctx.game.tags[tag];
    if (!t || !mod || !mod.id) return;
    t.modifiers = (t.modifiers || []).filter((m) => m && m.id !== mod.id);
    t.modifiers.push({
      id: mod.id, name: mod.name || mod.id,
      months: Number.isFinite(mod.months) ? mod.months : -1,
      effects: { ...(mod.effects || {}) },
    });
  },
  removeModifier(ctx, scope, id) {
    const t = ctx.game.tags[scope];
    if (t) { t.modifiers = (t.modifiers || []).filter((m) => m && m.id !== id); return; }
    const p = ctx.prov(scope);
    if (p) p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== id);
  },
  adjust(ctx, tag, d) {
    const t = ctx.game.tags[tag];
    if (!t || !d) return;
    if (Number.isFinite(d.treasury)) t.treasury = num(t.treasury) + d.treasury;
    if (Number.isFinite(d.manpower)) t.manpower = clamp(num(t.manpower) + d.manpower, 0, Math.max(num(t.maxManpower), num(t.manpower) + d.manpower));
    if (Number.isFinite(d.stability)) t.stability = clamp(num(t.stability) + d.stability, -3, 3);
    if (Number.isFinite(d.legitimacy)) t.legitimacy = clamp(num(t.legitimacy) + d.legitimacy, 0, 100);
    if (Number.isFinite(d.warExhaustion)) t.warExhaustion = clamp(num(t.warExhaustion) + d.warExhaustion, 0, B(ctx, 'warExhaustionMax', 20));
    if (Number.isFinite(d.gov)) t.points.gov = clamp(num(t.points.gov) + d.gov, 0, 999);
    if (Number.isFinite(d.infl)) t.points.infl = clamp(num(t.points.infl) + d.infl, 0, 999);
    if (Number.isFinite(d.mar)) t.points.mar = clamp(num(t.points.mar) + d.mar, 0, 999);
  },
  declareWar(ctx, atk, def, name) {
    return declareWar(ctx, atk, def, name);
  },
  setFlag(ctx, key, val) {
    ctx.game.flags[key] = val;
  },
  getFlag(ctx, key) {
    return ctx.game.flags[key];
  },
  notify(ctx, { title, text, type, provName } = {}) {
    ctx.bus.emit('notify', { title: title || '', text: text || '', type: type || 'info', provName });
  },
  endGame(ctx, { result, title, text, score } = {}) {
    const g = ctx.game;
    if (g.result) return; // already decided
    g.result = result || 'loss';
    g.over = true;
    g.paused = true;
    ctx.bus.emit('pause', true);
    ctx.bus.emit('gameover', { result: g.result, title: title || '', text: text || '', score: num(score, 0) });
  },
  killGeneral(ctx, tag, generalName) {
    for (const a of armiesOf(ctx, tag)) {
      if (a.general && a.general.name === generalName) a.general = null;
    }
  },
  armiesOf(ctx, tag) {
    return armiesOf(ctx, tag);
  },
  controls(ctx, tag, provName) {
    const p = ctx.prov(provName);
    return !!p && p.controller === tag;
  },
  countControlled(ctx, tag, opts) {
    const g = ctx.game;
    let n = 0;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.controller !== tag) continue;
      if (opts && opts.religion && p.religion !== opts.religion) continue;
      n++;
    }
    return n;
  },
};

// ------------------------------------------------------------------ gameActions (§6.6, frozen)
export function gameActions(ctx) {
  const g = ctx.game;
  const say = (title, text, type) => ctx.bus.emit('notify', { title, text, type: type || 'info' });

  return {
    setSpeed(n) {
      g.speed = clamp(Math.round(num(n, 2)), 1, 5);
      ctx.bus.emit('speed', g.speed);
    },
    togglePause() {
      g.paused = !g.paused;
      ctx.bus.emit('pause', g.paused);
    },
    recruit(provId, type) {
      try {
        const p = ctx.byId(provId);
        if (!p || p.impassable) return;
        if (p.owner !== g.playerTag || p.controller !== g.playerTag) {
          say('Cannot recruit', 'You must own and control the province.', 'bad');
          return;
        }
        const res = recruitRegiment(ctx, g.playerTag, provId, type);
        if (!res.ok) say('Cannot recruit', 'Recruitment failed: ' + res.why + '.', 'bad');
      } catch (e) { warnOnce('recruit', 'recruit failed', e); }
    },
    moveArmy(armyId, provId) {
      try {
        const a = g.armies[armyId];
        if (!a) return;
        if (a.tag !== g.playerTag) return;
        if (a.inBattle) { say('Orders refused', a.name + ' is locked in battle.', 'bad'); return; }
        if (a.retreating) { say('Orders refused', a.name + ' is retreating and will not rally yet.', 'bad'); return; }
        if ((a.shatteredDays || 0) > 0) { say('Orders refused', a.name + ' is shattered and must reform (' + a.shatteredDays + ' days).', 'bad'); return; }
        const p = ctx.byId(provId);
        if (!p || p.impassable) return;
        if (!canEnter(ctx, a.tag, provId)) {
          say('Orders refused', 'We are not at war with the rulers of ' + p.name + '.', 'bad');
          return;
        }
        if (!issueMove(ctx, a, provId)) {
          say('Orders refused', 'No route to ' + p.name + '.', 'bad');
        }
      } catch (e) { warnOnce('moveArmy', 'moveArmy failed', e); }
    },
    mergeArmies(fromId, intoId) {
      try {
        const f = g.armies[fromId];
        if (!f || f.tag !== g.playerTag) return;
        if (!mergeInto(ctx, fromId, intoId)) {
          say('Cannot merge', 'Armies must share a province and be free to maneuver.', 'bad');
        }
      } catch (e) { warnOnce('merge', 'mergeArmies failed', e); }
    },
    chooseEventOption(instanceId, idx) {
      try { resolveEventOption(ctx, instanceId, idx); }
      catch (e) { warnOnce('choose', 'chooseEventOption failed', e); }
    },
    requestParthianAid() {
      try {
        if (g.playerTag !== 'JUD') return;
        const t = g.tags.JUD;
        if (!t) return;
        if (g.flags.parthianSympathy) {
          say('Parthia', 'The court at Ctesiphon is already sympathetic to our cause.', 'info');
          return;
        }
        if (num(t.points.infl) < 50) {
          say('Parthia', 'Our envoys need more influence at foreign courts (50 required).', 'bad');
          return;
        }
        t.points.infl -= 50;
        const par = g.tags.PAR;
        const opinion = par && par.opinion ? num(par.opinion.JUD) : 0;
        const p = clamp(0.3 + opinion / 400, 0.05, 0.85);
        if (ctx.rng.chance(p)) {
          g.flags.parthianSympathy = true;
          t.treasury = num(t.treasury) + 150;
          t.manpower = num(t.manpower) + 4000;
          say('Word from Ctesiphon', 'Parthia sends silver and volunteers across the Euphrates — and watches Rome with new interest.', 'good');
        } else {
          if (par) par.opinion.JUD = clamp(opinion + 10, -200, 200);
          say('Word from Ctesiphon', 'The King of Kings receives our envoys kindly, and promises nothing.', 'bad');
        }
      } catch (e) { warnOnce('parthia', 'requestParthianAid failed', e); }
    },
    explainUnrest(provId) {
      return explainUnrest(ctx, provId);
    },
    explainIncome(tag) {
      return explainIncome(ctx, tag);
    },

    // ---- monarch-point sinks (v1.1) --------------------------------------
    // EU4 mapping: tax dev = Governance, prod dev = Influence, mp dev = Martial.
    devProvince(provId, kind) {
      try {
        const p = ctx.byId(provId);
        const t = g.tags[g.playerTag];
        const pool = { tax: 'gov', prod: 'infl', mp: 'mar' }[kind];
        if (!p || !t || !pool) return;
        if (p.owner !== g.playerTag || p.controller !== g.playerTag) {
          say('Development', 'We must own and control ' + p.name + ' to develop it.', 'bad'); return;
        }
        if (num(p.dev[kind]) >= 15) { say('Development', p.name + ' can grow no further.', 'info'); return; }
        if (num(t.points[pool]) < 50) { say('Development', 'Not enough ' + pool + ' points (50 required).', 'bad'); return; }
        t.points[pool] -= 50;
        p.dev[kind] = num(p.dev[kind]) + 1;
        ctx.bus.emit('provinceDev', { provId: p.id, kind });
        say('Development', p.name + ' grows: +1 ' + kind + ' development.', 'good');
      } catch (e) { warnOnce('dev', 'devProvince failed', e); }
    },
    buyStability() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return;
        if (t.stability >= 3) { say('Stability', 'The realm is as steady as it will ever be.', 'info'); return; }
        if (num(t.points.gov) < 75) { say('Stability', 'Not enough governance points (75 required).', 'bad'); return; }
        t.points.gov -= 75;
        t.stability = clamp(t.stability + 1, -3, 3);
        say('Stability', 'Order is restored a measure (+1 stability).', 'good');
      } catch (e) { warnOnce('stab', 'buyStability failed', e); }
    },
    callReserves() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return;
        if (num(t.points.mar) < 50) { say('Reserves', 'Not enough martial points (50 required).', 'bad'); return; }
        if (num(t.manpower) >= num(t.maxManpower)) { say('Reserves', 'Every fighting man is already mustered.', 'info'); return; }
        t.points.mar -= 50;
        t.manpower = Math.min(num(t.maxManpower), num(t.manpower) + 2000);
        say('Reserves', 'The villages send their sons: +2,000 manpower.', 'good');
      } catch (e) { warnOnce('reserves', 'callReserves failed', e); }
    },

    // ---- peace (v1.1) ------------------------------------------------------
    peaceTerms() { return PEACE_TERMS; },
    offerPeace(warId, level) {
      try {
        const war = g.wars.find((w) => w && w.id === warId);
        const me = g.playerTag;
        if (!war || !PEACE_TERMS[level]) return;
        if (war.attackers.indexOf(me) < 0 && war.defenders.indexOf(me) < 0) return;
        if (war.noNegotiation) {
          say('No terms', 'This war ends by the sword, or by events larger than treaties.', 'bad'); return;
        }
        const cd = war._peaceCooldown;
        if (cd && (g.date.y < cd.y || (g.date.y === cd.y && g.date.m < cd.m))) {
          say('Envoys rebuffed', 'The enemy will not receive our envoys again yet.', 'bad'); return;
        }
        if (aiWillAccept(ctx, war, me, level)) {
          makePeace(ctx, war, me, level);
        } else {
          war._peaceCooldown = { y: g.date.y + (g.date.m >= 7 ? 1 : 0), m: ((g.date.m + 5) % 12) + 1 };
          say('Terms refused', 'The enemy rejects ' + PEACE_TERMS[level].label.toLowerCase() + '. Six months until they will listen again.', 'bad');
        }
      } catch (e) { warnOnce('peace', 'offerPeace failed', e); }
    },
  };
}

// ------------------------------------------------------------------ save/load
// The game object is plain data by construction (SPEC §6.2); reviveGame merges
// schema defaults so saves from older versions load after fields are added.
export const SAVE_VERSION = 1;
export function reviveGame(saved) {
  if (!saved || typeof saved !== 'object' || !saved.tags || !saved.provinces) return null;
  if (!saved.truces) saved.truces = {};
  if (!saved.flags) saved.flags = {};
  if (!saved.pendingEvents) saved.pendingEvents = [];
  if (!saved.firedEvents) saved.firedEvents = {};
  if (!saved.battles) saved.battles = [];
  if (!saved.wars) saved.wars = [];
  if (!saved.ui) saved.ui = { selectedProv: 0, selectedArmy: null };
  saved.paused = true; // always resume paused
  return saved;
}
