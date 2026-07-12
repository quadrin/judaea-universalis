// Judaea Universalis — sim entry: initGame / makeCtx / gameActions / simHelpers
// (SPEC §6.1, §6.2, §6.4, §6.6). DOM-free; imports only core/rng + sim siblings.

import { createRng } from '../core/rng.js';
import {
  num, clamp, B, armiesOf, spawnArmy, removeArmy, changeOwnerCore, changeControllerCore,
  declareWar, issueMove, mergeInto, recruitRegiment, canEnter, regCount,
  peaceDealInfo, evaluatePeaceDeal, executePeaceDeal,
  DIPLO, opinionOf, addOpinion, diploCdActive, diploCdMonthsLeft, setDiploCd,
  sharedWarEnemy, breakAllianceCore, truceKey, truceActive,
  assaultInfo, doAssault, splitArmyCore, rollGeneral,
} from './military.js';
import { maxManpowerOf, explainIncome, LOAN_SIZE, LOAN_INTEREST_PER_MONTH, MAX_LOANS } from './economy.js';
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
    battles: [], wars: [], truces: {}, diploCooldowns: {},
    pendingEvents: [], firedEvents: {}, flags: {},
    rngSeed,
    ui: { selectedProv: 0, selectedArmy: null, selectedArmies: [] },
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
      // bookmark.owners overrides the map's default (66 CE) political layer
      owner: (bookmark && bookmark.owners && bookmark.owners[s.name]) || s.owner || 'WASTE',
      controller: (bookmark && bookmark.owners && bookmark.owners[s.name]) || s.owner || 'WASTE',
      autonomy: 0.25, unrest: 0, revoltProgress: 0,
      fort, garrison: maxGarrison, maxGarrison,
      siege: null, modifiers: [],
      buildings: [], construction: null, // {key, monthsLeft} while building
      holy: s.holy || null, wonder: s.wonder || null,
      impassable,
    });
  }

  // Tags absent from a bookmark (e.g. Rome in 167 BCE) never enter play.
  const active = bookmark && Array.isArray(bookmark.activeTags) ? bookmark.activeTags : null;
  const tagDefs = DEFINES.TAGS || {};
  for (const key of Object.keys(tagDefs)) {
    if (key === 'WASTE') continue;
    if (active && key !== 'REB' && active.indexOf(key) < 0) continue;
    const d = tagDefs[key] || {};
    game.tags[key] = {
      tag: key,
      name: d.name || key,
      color: Array.isArray(d.color) ? d.color.slice() : [128, 128, 128],
      religion: d.religion, culture: d.culture,
      alive: true,
      ai: key !== playerTag,
      treasury: 0, income: 0, expenses: 0, loans: 0,
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
  // Rulers: historical courts come from the bookmark; anything else (and tags
  // in pre-ruler saves) gets a plain ruling council. Skill pips 0-6 feed the
  // monthly monarch-point gain (tick.js) and the nation panel.
  try {
    const rulers = (bookmark && bookmark.rulers) || {};
    for (const key of Object.keys(game.tags)) {
      if (key === 'REB') continue;
      const t = game.tags[key];
      if (t.ruler) continue;
      const src = rulers[key];
      t.ruler = src ? {
        name: String(src.name || 'Ruler'),
        title: String(src.title || 'Ruler'),
        gov: clamp(Math.round(num(src.gov, 2)), 0, 6),
        infl: clamp(Math.round(num(src.infl, 2)), 0, 6),
        mar: clamp(Math.round(num(src.mar, 2)), 0, 6),
      } : { name: (t.name || key) + ' Council', title: 'Ruling Council', gov: 2, infl: 2, mar: 2 };
    }
  } catch (e) { console.warn('[sim/init] ruler assignment failed:', e); }
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

// ------------------------------------------------------------------ national decisions
// Peacetime statecraft enacted from the nation panel. Each decision spends a
// resource, applies its effects through the ordinary modifier machinery, and
// goes on cooldown (stored in game.diploCooldowns under 'decision:<key>').
export const DECISIONS = {
  grand_festival: {
    name: 'Hold a Grand Festival', icon: 'laurel', cdMonths: 24, costText: '100 talents',
    desc: 'Games, feasts and processions in every city: −2 unrest across the realm for a year, +5 legitimacy.',
    can(g, t) { return num(t.treasury) >= 100 ? '' : 'Not enough treasury (100 talents).'; },
    run(ctx, t) {
      t.treasury = num(t.treasury) - 100;
      simHelpers.addTagModifier(ctx, t.tag, { id: 'festival_joy', name: 'Festival Joy', months: 12, effects: { unrestAll: -2 } });
      t.legitimacy = clamp(num(t.legitimacy) + 5, 0, 100);
      return 'The realm rejoices: −2 unrest everywhere for a year, +5 legitimacy.';
    },
  },
  great_rites: {
    name: 'Great Public Rites', icon: 'altar', cdMonths: 18, costText: '50 governance points',
    desc: 'The priesthood proclaims the ruler’s favor with heaven: +10 legitimacy, −1 unrest for a year.',
    can(g, t) { return num(t.points.gov) >= 50 ? '' : 'Not enough governance points (50 required).'; },
    run(ctx, t) {
      t.points.gov = num(t.points.gov) - 50;
      simHelpers.addTagModifier(ctx, t.tag, { id: 'pious_rule', name: 'Pious Rule', months: 12, effects: { unrestAll: -1 } });
      t.legitimacy = clamp(num(t.legitimacy) + 10, 0, 100);
      return 'The rites are performed before the people: +10 legitimacy, −1 unrest for a year.';
    },
  },
  trade_expedition: {
    name: 'Fund Trade Expeditions', icon: 'coins', cdMonths: 36, costText: '150 talents',
    desc: 'Caravans and hulls flying our colors on every road and sea lane: +20% income for two years.',
    can(g, t) { return num(t.treasury) >= 150 ? '' : 'Not enough treasury (150 talents).'; },
    run(ctx, t) {
      t.treasury = num(t.treasury) - 150;
      simHelpers.addTagModifier(ctx, t.tag, { id: 'trade_winds', name: 'Trade Winds', months: 24, effects: { incomeMult: 1.2 } });
      return 'The expeditions set out: +20% income for two years.';
    },
  },
  drill_army: {
    name: 'Drill the Army', icon: 'spears', cdMonths: 24, costText: '50 martial points',
    desc: 'A season of drill, forced marches and mock battles: +5% discipline for 18 months.',
    can(g, t) { return num(t.points.mar) >= 50 ? '' : 'Not enough martial points (50 required).'; },
    run(ctx, t) {
      t.points.mar = num(t.points.mar) - 50;
      simHelpers.addTagModifier(ctx, t.tag, { id: 'drilled_ranks', name: 'Drilled Ranks', months: 18, effects: { disciplineMult: 1.05 } });
      return 'The ranks are hardened: +5% discipline for 18 months.';
    },
  },
  resettle_land: {
    name: 'Resettle the Land', icon: 'grain', cdMonths: 24, costText: '100 talents · peacetime only',
    desc: 'Veterans and landless families take up empty fields: +3,000 manpower now, +10% manpower for a year. Only while at peace.',
    can(g, t) {
      const atWar = (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
      if (atWar) return 'The realm is at war — the fields must wait.';
      return num(t.treasury) >= 100 ? '' : 'Not enough treasury (100 talents).';
    },
    run(ctx, t) {
      t.treasury = num(t.treasury) - 100;
      t.manpower = num(t.manpower) + 3000;
      simHelpers.addTagModifier(ctx, t.tag, { id: 'settled_veterans', name: 'Settled Veterans', months: 12, effects: { manpowerMult: 1.1 } });
      return 'The land fills with willing hands: +3,000 manpower, +10% manpower for a year.';
    },
  },
};

// ------------------------------------------------------------------ gameActions (§6.6, frozen)
export function gameActions(ctx) {
  const g = ctx.game;
  const say = (title, text, type) => ctx.bus.emit('notify', { title, text, type: type || 'info' });

  // ---- diplomacy (frozen action contract) ---------------------------------
  const dipKey = (them, kind) => g.playerTag + '>' + them + ':' + kind;
  // Single source of truth for gating: the actions re-derive this instead of
  // trusting whatever state the UI captured when it rendered.
  const getDip = (tag) => {
    try {
      const me = g.playerTag;
      if (!tag || tag === me || tag === 'REB') return null;
      const them = g.tags[tag], mine = g.tags[me];
      if (!them || !mine || !them.alive) return null;
      const opinionOfUs = opinionOf(ctx, tag, me);
      const ourOpinion = opinionOf(ctx, me, tag);
      const allied = (mine.allies || []).indexOf(tag) >= 0 || (them.allies || []).indexOf(me) >= 0;
      const atWarWithUs = (mine.atWarWith || []).indexOf(tag) >= 0 || (them.atWarWith || []).indexOf(me) >= 0;
      const tr = g.truces ? g.truces[truceKey(me, tag)] : null;
      const truceUntil = tr && truceActive(ctx, me, tag) ? { y: tr.y, m: tr.m } : null;
      let whyNotImprove = '';
      if (diploCdActive(ctx, dipKey(tag, 'improve'))) {
        whyNotImprove = 'Our envoys were just received (' + diploCdMonthsLeft(ctx, dipKey(tag, 'improve')) + ' months).';
      } else if (num(mine.points && mine.points.infl) < DIPLO.improveCost) {
        whyNotImprove = 'Not enough influence (' + DIPLO.improveCost + ' required).';
      }
      let whyNotGift = '';
      if (diploCdActive(ctx, dipKey(tag, 'gift'))) {
        whyNotGift = 'A gift was sent recently (' + diploCdMonthsLeft(ctx, dipKey(tag, 'gift')) + ' months).';
      } else if (num(mine.treasury) < DIPLO.giftCost) {
        whyNotGift = 'Not enough treasury (' + DIPLO.giftCost + ' talents required).';
      }
      let whyNotAlly = '';
      if (allied) whyNotAlly = 'We are already allied.';
      else if (atWarWithUs) whyNotAlly = 'We are at war with them.';
      else if (opinionOfUs < DIPLO.allyMinOpinion) whyNotAlly = 'They think too little of us (' + DIPLO.allyMinOpinion + ' opinion required).';
      else if (diploCdActive(ctx, dipKey(tag, 'ally'))) whyNotAlly = 'Our last offer still stings (' + diploCdMonthsLeft(ctx, dipKey(tag, 'ally')) + ' months).';
      let whyNotWar = '';
      if (atWarWithUs) whyNotWar = 'We are already at war with them.';
      else if (allied) whyNotWar = 'We are allied — break the alliance first.';
      else if (truceUntil) whyNotWar = 'The ink on the truce is still wet.';
      return {
        tag, name: them.name || tag,
        color: Array.isArray(them.color) ? them.color.slice() : [128, 128, 128],
        opinionOfUs, ourOpinion, allied, atWarWithUs, truceUntil,
        canImprove: !whyNotImprove, canGift: !whyNotGift, canAlly: !whyNotAlly, canBreak: allied,
        canWar: !whyNotWar,
        whyNotImprove, whyNotGift, whyNotAlly, whyNotWar,
        improveCost: DIPLO.improveCost, giftCost: DIPLO.giftCost,
      };
    } catch (e) { warnOnce('getDiplomacy', 'getDiplomacy failed', e); return null; }
  };

  // Shared gating for the player army actions (split / hire general).
  const armyActionInfo = (armyId) => {
    const out = { canSplit: false, whySplit: '', canHire: false, whyHire: '', hireCost: 50 };
    const a = g.armies[armyId];
    if (!a || a.tag !== g.playerTag) {
      out.whySplit = out.whyHire = 'That army does not answer to us.';
      return out;
    }
    if (a.inBattle) out.whySplit = a.name + ' is locked in battle.';
    else if (a.retreating) out.whySplit = a.name + ' is retreating and cannot divide.';
    else if (num(a.shatteredDays) > 0) out.whySplit = a.name + ' is shattered and must reform.';
    else if (regCount(a) < 2) out.whySplit = 'At least two regiments are needed to split.';
    out.canSplit = !out.whySplit;
    const t = g.tags[g.playerTag];
    if (!t || num(t.points && t.points.mar) < 50) out.whyHire = 'Not enough martial points (50 required).';
    out.canHire = !out.whyHire;
    return out;
  };

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

    // ---- buildings (frozen contract) ---------------------------------------
    getBuildInfo(provId) {
      try {
        const p = ctx.byId(provId);
        if (!p || p.impassable) return null;
        if (p.owner !== g.playerTag || p.controller !== g.playerTag) return null;
        const catalog = ctx.DEFINES.BUILDINGS || {};
        const t = g.tags[g.playerTag];
        const built = Array.isArray(p.buildings) ? p.buildings.slice() : [];
        const cdef = p.construction ? catalog[p.construction.key] : null;
        const constructing = p.construction ? {
          key: p.construction.key,
          name: (cdef && cdef.name) || p.construction.key,
          monthsLeft: num(p.construction.monthsLeft),
        } : null;
        const options = [];
        for (const key of Object.keys(catalog)) {
          const b = catalog[key];
          let whyNot = '';
          if (built.indexOf(key) >= 0) whyNot = 'Already built.';
          else if (p.construction) whyNot = 'Another work is already under way.';
          else if (key === 'walls' && (p.fort | 0) >= 3) whyNot = 'The fortress can rise no higher (fort 3).';
          else if (num(t && t.treasury) < num(b.cost)) whyNot = 'Not enough treasury (' + num(b.cost) + ' talents).';
          options.push({
            key, name: b.name || key, cost: num(b.cost), months: num(b.months, 1),
            desc: b.desc || '', canBuild: !whyNot, whyNot,
          });
        }
        return { built, constructing, options };
      } catch (e) { warnOnce('buildInfo', 'getBuildInfo failed', e); return null; }
    },
    buildBuilding(provId, key) {
      try {
        const p = ctx.byId(provId);
        const t = g.tags[g.playerTag];
        const b = (ctx.DEFINES.BUILDINGS || {})[key];
        if (!p || p.impassable || !t || !b) return;
        if (p.owner !== g.playerTag || p.controller !== g.playerTag) {
          say('Cannot build', 'We must own and control ' + p.name + ' to build there.', 'bad'); return;
        }
        if (Array.isArray(p.buildings) && p.buildings.indexOf(key) >= 0) {
          say('Cannot build', p.name + ' already has a ' + (b.name || key).toLowerCase() + '.', 'bad'); return;
        }
        if (p.construction) {
          say('Cannot build', 'Another work is already under way in ' + p.name + '.', 'bad'); return;
        }
        if (key === 'walls' && (p.fort | 0) >= 3) {
          say('Cannot build', 'The fortress of ' + p.name + ' can rise no higher (fort 3).', 'bad'); return;
        }
        if (num(t.treasury) < num(b.cost)) {
          say('Cannot build', 'Not enough treasury (' + num(b.cost) + ' talents required).', 'bad'); return;
        }
        t.treasury = num(t.treasury) - num(b.cost);
        p.construction = { key, monthsLeft: Math.max(1, num(b.months, 1)) };
        say('Construction begun', 'Work begins on the ' + (b.name || key).toLowerCase() + ' of ' + p.name + ' (' + num(b.months, 1) + ' months).', 'good');
      } catch (e) { warnOnce('build', 'buildBuilding failed', e); }
    },

    // ---- loans (frozen contract) -------------------------------------------
    takeLoan() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return;
        if (num(t.loans) >= MAX_LOANS) {
          say('Loan refused', 'No moneylender will extend us a sixth loan.', 'bad'); return;
        }
        t.loans = num(t.loans) + 1;
        t.treasury = num(t.treasury) + LOAN_SIZE;
        say('Loan taken', '+' + LOAN_SIZE + ' talents borrowed at ' + LOAN_INTEREST_PER_MONTH +
          ' talents interest a month (' + t.loans + ' of ' + MAX_LOANS + ' loans).', 'info');
      } catch (e) { warnOnce('takeLoan', 'takeLoan failed', e); }
    },
    repayLoan() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return;
        if (num(t.loans) <= 0) { say('No debts', 'We owe the moneylenders nothing.', 'info'); return; }
        if (num(t.treasury) < LOAN_SIZE) {
          say('Cannot repay', 'Repaying a loan takes ' + LOAN_SIZE + ' talents in hand.', 'bad'); return;
        }
        t.treasury = num(t.treasury) - LOAN_SIZE;
        t.loans = num(t.loans) - 1;
        say('Loan repaid', 'A debt of ' + LOAN_SIZE + ' talents is settled (' + t.loans + ' remaining).', 'good');
      } catch (e) { warnOnce('repayLoan', 'repayLoan failed', e); }
    },
    getLoans() {
      try {
        const t = g.tags[g.playerTag];
        const loans = Math.max(0, Math.round(num(t && t.loans)));
        return {
          loans,
          interestPerMonth: loans * LOAN_INTEREST_PER_MONTH,
          canTake: !!t && loans < MAX_LOANS,
          canRepay: !!t && loans > 0 && num(t.treasury) >= LOAN_SIZE,
        };
      } catch (e) {
        warnOnce('getLoans', 'getLoans failed', e);
        return { loans: 0, interestPerMonth: 0, canTake: false, canRepay: false };
      }
    },

    // ---- assault & army actions (frozen contract) ---------------------------
    canAssault(provId) {
      try {
        const info = assaultInfo(ctx, ctx.byId(provId), g.playerTag);
        return { can: info.can, why: info.why, chancePct: info.chancePct, expectedLossesPct: info.expectedLossesPct };
      } catch (e) {
        warnOnce('canAssault', 'canAssault failed', e);
        return { can: false, why: 'No assault is possible.', chancePct: 0, expectedLossesPct: 0 };
      }
    },
    assaultSiege(provId) {
      try {
        const p = ctx.byId(provId);
        const info = assaultInfo(ctx, p, g.playerTag);
        if (!info.can) { say('No assault', info.why || 'The walls cannot be stormed.', 'bad'); return; }
        doAssault(ctx, p, g.playerTag); // notifies success (fall path) / repulse itself
      } catch (e) { warnOnce('assault', 'assaultSiege failed', e); }
    },
    getArmyActions(armyId) {
      try { return armyActionInfo(armyId); }
      catch (e) {
        warnOnce('armyActions', 'getArmyActions failed', e);
        return { canSplit: false, whySplit: '', canHire: false, whyHire: '', hireCost: 50 };
      }
    },
    splitArmy(armyId) {
      try {
        const a = g.armies[armyId];
        if (!a || a.tag !== g.playerTag) return 0;
        const st = armyActionInfo(armyId);
        if (!st.canSplit) { say('Cannot split', st.whySplit, 'bad'); return 0; }
        const nid = splitArmyCore(ctx, a);
        if (!nid) { say('Cannot split', a.name + ' is too depleted to divide.', 'bad'); return 0; }
        const det = g.armies[nid];
        say('Army divided', (det ? det.name : 'A detachment') + ' takes the field beside ' + a.name + '.', 'info');
        return nid;
      } catch (e) { warnOnce('split', 'splitArmy failed', e); return 0; }
    },
    hireGeneral(armyId) {
      try {
        const a = g.armies[armyId];
        const t = g.tags[g.playerTag];
        if (!a || a.tag !== g.playerTag || !t) return;
        const st = armyActionInfo(armyId);
        if (!st.canHire) { say('No general', st.whyHire, 'bad'); return; }
        t.points.mar = num(t.points.mar) - 50;
        const gen = rollGeneral(ctx, g.playerTag);
        a.general = gen;
        say('General hired', gen.name + ' takes command of ' + a.name +
          ' (fire ' + gen.fire + ', shock ' + gen.shock + ', maneuver ' + gen.maneuver + ').', 'good');
      } catch (e) { warnOnce('hire', 'hireGeneral failed', e); }
    },

    // ---- diplomacy (frozen) -----------------------------------------------
    getDiplomacy(tag) {
      return getDip(tag);
    },
    improveRelations(tag) {
      try {
        const d = getDip(tag);
        if (!d) return;
        if (!d.canImprove) { say('Improve relations', d.whyNotImprove || 'We cannot court ' + d.name + ' now.', 'bad'); return; }
        const mine = g.tags[g.playerTag];
        mine.points.infl = num(mine.points.infl) - DIPLO.improveCost;
        addOpinion(ctx, tag, g.playerTag, DIPLO.improveGain);
        setDiploCd(ctx, dipKey(tag, 'improve'), DIPLO.improveCdMonths);
        say('Improve relations', 'Our envoys are warmly received in ' + d.name + ' (+' + DIPLO.improveGain + ' opinion).', 'good');
      } catch (e) { warnOnce('improveRel', 'improveRelations failed', e); }
    },
    sendGift(tag) {
      try {
        const d = getDip(tag);
        if (!d) return;
        if (!d.canGift) { say('Send gift', d.whyNotGift || 'No gift can reach ' + d.name + ' now.', 'bad'); return; }
        const mine = g.tags[g.playerTag];
        mine.treasury = num(mine.treasury) - DIPLO.giftCost;
        addOpinion(ctx, tag, g.playerTag, DIPLO.giftGain);
        setDiploCd(ctx, dipKey(tag, 'gift'), DIPLO.giftCdMonths);
        say('Send gift', 'A caravan of gifts reaches ' + d.name + ' (+' + DIPLO.giftGain + ' opinion).', 'good');
      } catch (e) { warnOnce('sendGift', 'sendGift failed', e); }
    },
    offerAlliance(tag) {
      try {
        const d = getDip(tag);
        if (!d) return;
        if (!d.canAlly) { say('Alliance', d.whyNotAlly || 'No alliance is possible with ' + d.name + '.', 'bad'); return; }
        const me = g.playerTag;
        const mine = g.tags[me], them = g.tags[tag];
        const accept = d.opinionOfUs >= DIPLO.allyAcceptOpinion ||
          (d.opinionOfUs >= DIPLO.allyMinOpinion && sharedWarEnemy(ctx, me, tag));
        if (accept) {
          if (!mine.allies) mine.allies = [];
          if (!them.allies) them.allies = [];
          if (mine.allies.indexOf(tag) < 0) mine.allies.push(tag);
          if (them.allies.indexOf(me) < 0) them.allies.push(me);
          say('Alliance', d.name + ' binds itself to our cause. Our wars to come are theirs.', 'good');
        } else {
          addOpinion(ctx, tag, me, DIPLO.allyRefuseOpinion);
          setDiploCd(ctx, dipKey(tag, 'ally'), DIPLO.allyCdMonths);
          say('Alliance refused', d.name + ' declines our offer, and will hear no other for ' + DIPLO.allyCdMonths + ' months.', 'bad');
        }
      } catch (e) { warnOnce('offerAlliance', 'offerAlliance failed', e); }
    },
    breakAlliance(tag) {
      try {
        const d = getDip(tag);
        if (!d) return;
        if (!d.canBreak) { say('Alliance', 'We have no alliance with ' + d.name + '.', 'bad'); return; }
        if (breakAllianceCore(ctx, g.playerTag, tag)) {
          say('Alliance broken', 'We renounce our alliance with ' + d.name + '. They will not soon forget it.', 'info');
        }
      } catch (e) { warnOnce('breakAlliance', 'breakAlliance failed', e); }
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

    // ---- peace (EU4-style deal builder) ------------------------------------
    // getPeaceInfo -> what can be demanded; evaluatePeace -> live price &
    // acceptance preview; offerPeaceDeal -> send the envoys.
    getPeaceInfo(warId) {
      try {
        const war = g.wars.find((w) => w && w.id === warId);
        const me = g.playerTag;
        if (!war) return null;
        if (war.attackers.indexOf(me) < 0 && war.defenders.indexOf(me) < 0) return null;
        const info = peaceDealInfo(ctx, war, me);
        info.envoyMonthsLeft = diploCdMonthsLeft(ctx, 'peace:' + war.id);
        return info;
      } catch (e) { warnOnce('peaceInfo', 'getPeaceInfo failed', e); return null; }
    },
    evaluatePeace(warId, deal) {
      try {
        const war = g.wars.find((w) => w && w.id === warId);
        const me = g.playerTag;
        if (!war) return null;
        if (war.attackers.indexOf(me) < 0 && war.defenders.indexOf(me) < 0) return null;
        return evaluatePeaceDeal(ctx, war, me, deal);
      } catch (e) { warnOnce('peaceEval', 'evaluatePeace failed', e); return null; }
    },
    offerPeaceDeal(warId, deal) {
      try {
        const war = g.wars.find((w) => w && w.id === warId);
        const me = g.playerTag;
        if (!war) return;
        if (war.attackers.indexOf(me) < 0 && war.defenders.indexOf(me) < 0) return;
        if (war.noNegotiation) {
          say('No terms', 'This war ends by the sword, or by events larger than treaties.', 'bad'); return;
        }
        if (diploCdActive(ctx, 'peace:' + war.id)) {
          say('Envoys rebuffed', 'The enemy will not receive our envoys again yet ('
            + diploCdMonthsLeft(ctx, 'peace:' + war.id) + ' months).', 'bad');
          return;
        }
        const ev = evaluatePeaceDeal(ctx, war, me, deal);
        if (ev.acceptable) {
          executePeaceDeal(ctx, war, me, deal);
        } else {
          setDiploCd(ctx, 'peace:' + war.id, 6);
          say('Terms refused', ev.reason + ' Six months until they will listen again.', 'bad');
        }
      } catch (e) { warnOnce('peace', 'offerPeaceDeal failed', e); }
    },

    // ---- declaring war ------------------------------------------------------
    declareWarOn(tag) {
      try {
        const d = getDip(tag);
        if (!d) return;
        if (!d.canWar) { say('Declare war', d.whyNotWar || 'We cannot declare war on ' + d.name + '.', 'bad'); return; }
        const mine = g.tags[g.playerTag];
        mine.stability = clamp(num(mine.stability) - 2, -3, 3);
        mine.legitimacy = clamp(num(mine.legitimacy) - 5, 0, 100);
        addOpinion(ctx, tag, g.playerTag, -100);
        declareWar(ctx, g.playerTag, tag, null);
      } catch (e) { warnOnce('declareWarOn', 'declareWarOn failed', e); }
    },

    // ---- national decisions (nation panel) ----------------------------------
    getDecisions() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return [];
        return Object.keys(DECISIONS).map((key) => {
          const d = DECISIONS[key];
          const cdKey = 'decision:' + key;
          let whyNot = '';
          if (diploCdActive(ctx, cdKey)) {
            whyNot = 'Recently enacted — ' + diploCdMonthsLeft(ctx, cdKey) + ' months before it can be repeated.';
          } else {
            whyNot = d.can(g, t) || '';
          }
          return {
            key, name: d.name, icon: d.icon, desc: d.desc, costText: d.costText,
            cooldownMonths: d.cdMonths, canEnact: !whyNot, whyNot,
          };
        });
      } catch (e) { warnOnce('getDecisions', 'getDecisions failed', e); return []; }
    },
    enactDecision(key) {
      try {
        const t = g.tags[g.playerTag];
        const d = DECISIONS[key];
        if (!t || !d) return;
        const cdKey = 'decision:' + key;
        if (diploCdActive(ctx, cdKey)) {
          say(d.name, 'Recently enacted — ' + diploCdMonthsLeft(ctx, cdKey) + ' months before it can be repeated.', 'bad');
          return;
        }
        const why = d.can(g, t);
        if (why) { say(d.name, why, 'bad'); return; }
        const result = d.run(ctx, t);
        setDiploCd(ctx, cdKey, d.cdMonths);
        say(d.name, result || 'It is done.', 'good');
      } catch (e) { warnOnce('enactDecision', 'enactDecision failed', e); }
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
  if (!saved.diploCooldowns) saved.diploCooldowns = {}; // pre-diplomacy saves
  if (!saved.flags) saved.flags = {};
  if (!saved.pendingEvents) saved.pendingEvents = [];
  if (!saved.firedEvents) saved.firedEvents = {};
  if (!saved.battles) saved.battles = [];
  if (!saved.wars) saved.wars = [];
  if (!saved.ui) saved.ui = { selectedProv: 0, selectedArmy: null, selectedArmies: [] };
  if (!Array.isArray(saved.ui.selectedArmies)) saved.ui.selectedArmies = [];
  // pre-buildings/loans saves: default the new economy & military fields
  for (let i = 1; i < saved.provinces.length; i++) {
    const p = saved.provinces[i];
    if (!p) continue;
    if (!Array.isArray(p.buildings)) p.buildings = [];
    if (p.construction === undefined) p.construction = null;
  }
  for (const k of Object.keys(saved.tags)) {
    const t = saved.tags[k];
    if (t && !Number.isFinite(t.loans)) t.loans = 0;
  }
  saved.paused = true; // always resume paused
  return saved;
}
