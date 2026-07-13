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
  casusBelli, hasClaim,
  sideComponents, monthsBetween, armiesInProv, devTotal, battleInfo, endWarBySword, GENERAL_NAMES,
} from './military.js';
import { IDEA_TREES, ideaCost, applyReformsToTag } from '../data/ideas.js';
import { maxManpowerOf, explainIncome, incomeBreakdown, LOAN_SIZE, LOAN_INTEREST_PER_MONTH, MAX_LOANS } from './economy.js';
import { explainUnrest } from './unrest.js';
import { rulerDies } from './realm.js';
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
    humanTags: [playerTag], // multiplayer adds guest tags; every human tag has ai:false
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
      conversion: null, // {by, monthsLeft} while converting to the state faith
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
      reforms: { mil: 0, civ: 0, rel: 0 },
      advisors: { gov: null, infl: null, mar: null },
      courtCand: {},
      modifiers: [],
      atWarWith: [], allies: [], opinion: {},
      claims: [], overlord: null,
      heir: null, regency: false, missionIdx: 0,
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
    dynEvents: new Map(), // runtime-synthesized events (succession cards); never saved
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
  // monthly monarch-point gain (tick.js) and the nation panel. Bookmark ruler
  // entries may carry `age` and an `heir: {name, gov, infl, mar, age}`.
  try {
    const rulers = (bookmark && bookmark.rulers) || {};
    const person = (src, fallbackName, fallbackAge) => ({
      name: String((src && src.name) || fallbackName),
      gov: clamp(Math.round(num(src && src.gov, 2)), 0, 6),
      infl: clamp(Math.round(num(src && src.infl, 2)), 0, 6),
      mar: clamp(Math.round(num(src && src.mar, 2)), 0, 6),
      age: Math.max(0, Math.round(num(src && src.age, fallbackAge))),
    });
    for (const key of Object.keys(game.tags)) {
      if (key === 'REB') continue;
      const t = game.tags[key];
      if (t.ruler) {
        if (!Number.isFinite(t.ruler.age)) t.ruler.age = 45; // pre-age saves
        continue;
      }
      const src = rulers[key];
      t.ruler = src
        ? { ...person(src, 'Ruler', 45), title: String(src.title || 'Ruler') }
        : { name: (t.name || key) + ' Council', title: 'Ruling Council', gov: 2, infl: 2, mar: 2, age: 45 };
      if (src && src.heir && !t.heir) t.heir = person(src.heir, 'Heir', 20);
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
    // The verdict closes the player's wars: a win keeps what the sword holds,
    // a loss concedes it — either way the world is at peace afterwards.
    try {
      for (const w of (g.wars || []).slice()) {
        const onAtt = w.attackers.indexOf(g.playerTag) >= 0;
        if (!onAtt && w.defenders.indexOf(g.playerTag) < 0) continue;
        const myKey = onAtt ? 'att' : 'def';
        const theirKey = onAtt ? 'def' : 'att';
        const winners = g.result === 'win' ? myKey : g.result === 'loss' ? theirKey : null;
        endWarBySword(ctx, w, winners, { silent: true });
      }
    } catch (e) { warnOnce('endGameWars', 'closing wars on game end failed', e); }
    g.paused = true;
    ctx.bus.emit('pause', true);
    // The full VICTORIA/DEFEAT card is reserved for actual elimination — a
    // chapter verdict while the nation still stands is chronicled as a great
    // moment and the campaign simply continues (checkElimination owns the
    // true game-over).
    const t = g.tags[g.playerTag];
    if (!t || t.alive === false) {
      g.over = true;
      ctx.bus.emit('gameover', { result: g.result, title: title || '', text: text || '', score: num(score, 0) });
    } else {
      ctx.bus.emit('notify', {
        title: title || (g.result === 'win' ? 'Victory' : 'Defeat'),
        text: (text ? text + ' ' : '') + 'The chronicle records this moment — the campaign continues.',
        type: g.result === 'win' ? 'good' : 'bad',
      });
    }
  },
  killGeneral(ctx, tag, generalName) {
    for (const a of armiesOf(ctx, tag)) {
      if (a.general && a.general.name === generalName) a.general = null;
    }
  },
  // Scripted courts (content package): install a ruler / heir outright, or run
  // a death through the ordinary succession machinery (heir, regency, usurper).
  setRuler(ctx, tag, r) {
    const t = ctx.game.tags[tag];
    if (!t || !r) return;
    t.ruler = {
      name: String(r.name || 'Ruler'),
      title: String(r.title || (t.ruler && t.ruler.title) || 'Ruler'),
      gov: clamp(Math.round(num(r.gov, 2)), 0, 6),
      infl: clamp(Math.round(num(r.infl, 2)), 0, 6),
      mar: clamp(Math.round(num(r.mar, 2)), 0, 6),
      age: Math.max(0, Math.round(num(r.age, 45))),
    };
    t.regency = false;
    t.regencyTitle = null;
  },
  setHeir(ctx, tag, h) {
    const t = ctx.game.tags[tag];
    if (!t) return;
    t.heir = h ? {
      name: String(h.name || 'Heir'),
      gov: clamp(Math.round(num(h.gov, 2)), 0, 6),
      infl: clamp(Math.round(num(h.infl, 2)), 0, 6),
      mar: clamp(Math.round(num(h.mar, 2)), 0, 6),
      age: Math.max(0, Math.round(num(h.age, 20))),
    } : null;
  },
  rulerDies(ctx, tag, causeText) {
    rulerDies(ctx, tag, causeText);
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
      const ourClient = them.overlord === me;
      const ourOverlord = mine.overlord === tag;
      const theirOverlord = them.overlord && !ourClient ? them.overlord : null;
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
      else if (ourClient) whyNotAlly = 'They are already our client kingdom.';
      else if (ourOverlord) whyNotAlly = 'They are our overlord.';
      else if (opinionOfUs < DIPLO.allyMinOpinion) whyNotAlly = 'They think too little of us (' + DIPLO.allyMinOpinion + ' opinion required).';
      else if (diploCdActive(ctx, dipKey(tag, 'ally'))) whyNotAlly = 'Our last offer still stings (' + diploCdMonthsLeft(ctx, dipKey(tag, 'ally')) + ' months).';
      const cb = casusBelli(ctx, me, tag);
      let whyNotWar = '';
      if (atWarWithUs) whyNotWar = 'We are already at war with them.';
      else if (ourClient) whyNotWar = 'They are our client kingdom.';
      else if (ourOverlord) whyNotWar = 'They are our overlord.';
      else if (allied) whyNotWar = 'We are allied — break the alliance first.';
      else if (truceUntil) whyNotWar = 'The ink on the truce is still wet.';
      return {
        tag, name: them.name || tag,
        color: Array.isArray(them.color) ? them.color.slice() : [128, 128, 128],
        opinionOfUs, ourOpinion, allied, atWarWithUs, truceUntil,
        ourClient, ourOverlord, theirOverlord,
        theirOverlordName: theirOverlord && g.tags[theirOverlord] ? (g.tags[theirOverlord].name || theirOverlord) : '',
        cb,
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

    // ---- war overview --------------------------------------------------------
    // Everything the war panel shows: sides, the player's score broken into
    // battles / occupation / events (net of the enemy's same components),
    // who occupies what, duration, CB, and whether the dove can fly.
    getWarInfo(warId) {
      try {
        const war = g.wars.find((w) => w && w.id === warId);
        const me = g.playerTag;
        if (!war) return null;
        const onAtt = war.attackers.indexOf(me) >= 0;
        if (!onAtt && war.defenders.indexOf(me) < 0) return null;
        const myKey = onAtt ? 'att' : 'def';
        const theirKey = onAtt ? 'def' : 'att';
        const mine = sideComponents(ctx, war, myKey);
        const theirs = sideComponents(ctx, war, theirKey);
        const mySide = onAtt ? war.attackers : war.defenders;
        const theirSide = onAtt ? war.defenders : war.attackers;
        const sideRow = (tag) => ({
          tag,
          name: (g.tags[tag] && g.tags[tag].name) || tag,
          alive: !!(g.tags[tag] && g.tags[tag].alive),
        });
        const weHold = [];
        const theyHold = [];
        for (let i = 1; i < g.provinces.length; i++) {
          const p = g.provinces[i];
          if (!p || p.impassable || p.owner === p.controller) continue;
          if (theirSide.indexOf(p.owner) >= 0 && mySide.indexOf(p.controller) >= 0) {
            weHold.push({ id: i, name: p.name, dev: devTotal(p) });
          } else if (mySide.indexOf(p.owner) >= 0 && theirSide.indexOf(p.controller) >= 0) {
            theyHold.push({ id: i, name: p.name, dev: devTotal(p) });
          }
        }
        weHold.sort((a, b) => b.dev - a.dev);
        theyHold.sort((a, b) => b.dev - a.dev);
        return {
          warId: war.id, warName: war.name,
          cb: war.cb || null,
          started: { ...war.started },
          months: Math.max(0, monthsBetween(war.started, g.date)),
          mySide: mySide.map(sideRow), theirSide: theirSide.map(sideRow),
          myWs: Math.round(num(war.warscore && war.warscore[me])),
          breakdown: {
            battles: Math.round(mine.battles - theirs.battles),
            occupation: Math.round(mine.occupation - theirs.occupation),
            events: Math.round(mine.events - theirs.events),
          },
          weHold, theyHold,
          noNegotiation: !!war.noNegotiation,
          envoyMonthsLeft: diploCdMonthsLeft(ctx, 'peace:' + war.id),
        };
      } catch (e) { warnOnce('warInfo', 'getWarInfo failed', e); return null; }
    },

    // ---- the court (advisors) ------------------------------------------------------
    // Each pool can seat one advisor: +skill (1-3) to that pool's monthly gain,
    // wage skill*2 talents a month (tick.js). Two candidates per empty seat,
    // rerolled after every hire or dismissal.
    getCourt() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return null;
        if (!t.advisors) t.advisors = { gov: null, infl: null, mar: null };
        if (!t.courtCand) t.courtCand = {};
        const cul = ctx.DEFINES.CULTURES ? ctx.DEFINES.CULTURES[t.culture] : null;
        const pool = (cul && GENERAL_NAMES[cul.group]) || GENERAL_NAMES.hellenic;
        const out = {};
        for (const k of ['gov', 'infl', 'mar']) {
          if (!t.advisors[k] && (!Array.isArray(t.courtCand[k]) || !t.courtCand[k].length)) {
            t.courtCand[k] = [0, 1].map(() => {
              const skill = 1 + ctx.rng.int(3);
              return { name: ctx.rng.pick(pool), skill, cost: skill * 30, wage: skill * 2 };
            });
          }
          out[k] = { seated: t.advisors[k], candidates: t.advisors[k] ? [] : t.courtCand[k] };
        }
        return out;
      } catch (e) { warnOnce('getCourt', 'getCourt failed', e); return null; }
    },
    hireAdvisor(kind, idx) {
      try {
        const t = g.tags[g.playerTag];
        if (!t || ['gov', 'infl', 'mar'].indexOf(kind) < 0 || t.advisors[kind]) return;
        const cand = t.courtCand && t.courtCand[kind] && t.courtCand[kind][idx | 0];
        if (!cand) return;
        if (num(t.treasury) < cand.cost) { say('The purse is light', 'Hiring ' + cand.name + ' costs ' + cand.cost + ' talents.', 'bad'); return; }
        t.treasury = num(t.treasury) - cand.cost;
        t.advisors[kind] = { name: cand.name, skill: cand.skill, wage: cand.wage };
        t.courtCand[kind] = [];
        say('An advisor takes their seat', cand.name + ' joins the court (+' + cand.skill + ' ' + kind + ' a month, ' + cand.wage + ' talents wage).', 'good');
      } catch (e) { warnOnce('hireAdvisor', 'hireAdvisor failed', e); }
    },
    dismissAdvisor(kind) {
      try {
        const t = g.tags[g.playerTag];
        if (!t || !t.advisors || !t.advisors[kind]) return;
        say('Dismissed', t.advisors[kind].name + ' leaves the court.', 'info');
        t.advisors[kind] = null;
        if (t.courtCand) t.courtCand[kind] = [];
      } catch (e) { warnOnce('dismissAdvisor', 'dismissAdvisor failed', e); }
    },

    // ---- reforms (idea trees) ----------------------------------------------------
    getIdeas() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return null;
        const reforms = t.reforms || { mil: 0, civ: 0, rel: 0 };
        return Object.keys(IDEA_TREES).map((key) => {
          const tree = IDEA_TREES[key];
          const owned = reforms[key] | 0;
          const next = owned < tree.tiers.length ? tree.tiers[owned] : null;
          const cost = next ? ideaCost(owned) : 0;
          const have = num(t.points[tree.point]);
          return {
            key, name: tree.name, point: tree.point, owned, cost,
            tiers: tree.tiers.map((ti, i) => ({ name: ti.name, desc: ti.desc, owned: i < owned })),
            canBuy: !!next && have >= cost,
            whyNot: !next ? 'Every reform in this tree is enacted.'
              : have < cost ? `Needs ${cost} ${tree.point === 'mar' ? 'martial' : tree.point === 'gov' ? 'government' : 'influence'} points.` : '',
          };
        });
      } catch (e) { warnOnce('getIdeas', 'getIdeas failed', e); return null; }
    },
    buyIdea(treeKey) {
      try {
        const t = g.tags[g.playerTag];
        const tree = IDEA_TREES[treeKey];
        if (!t || !tree) return;
        if (!t.reforms) t.reforms = { mil: 0, civ: 0, rel: 0 };
        const owned = t.reforms[treeKey] | 0;
        if (owned >= tree.tiers.length) return;
        const cost = ideaCost(owned);
        if (num(t.points[tree.point]) < cost) {
          say('The realm is not ready', 'This reform needs ' + cost + ' points.', 'bad');
          return;
        }
        t.points[tree.point] = num(t.points[tree.point]) - cost;
        t.reforms[treeKey] = owned + 1;
        applyReformsToTag(ctx.DEFINES, t, g.playerTag);
        say('Reform enacted', tree.tiers[owned].name + ' — ' + tree.tiers[owned].desc, 'good');
      } catch (e) { warnOnce('buyIdea', 'buyIdea failed', e); }
    },

    // ---- battle window ---------------------------------------------------------
    getBattleInfo(provId) {
      try { return battleInfo(ctx, provId | 0); } catch (e) { warnOnce('battleInfo', 'getBattleInfo failed', e); return null; }
    },

    // ---- ledger ----------------------------------------------------------------
    getLedger() {
      try {
        const rows = [];
        for (const tag of Object.keys(g.tags)) {
          if (tag === 'REB') continue;
          const t = g.tags[tag];
          if (!t || !t.alive) continue;
          let provs = 0, dev = 0;
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.owner !== tag) continue;
            provs++;
            dev += devTotal(p);
          }
          let troops = 0;
          for (const a of armiesOf(ctx, tag)) troops += num(a.men);
          const bd = incomeBreakdown(ctx, tag);
          rows.push({
            tag,
            name: t.name || tag,
            isPlayer: tag === g.playerTag,
            overlord: t.overlord || null,
            provs, dev,
            income: Math.round(bd.net * 10) / 10,
            treasury: Math.round(num(t.treasury)),
            troops,
            manpower: Math.round(num(t.manpower)),
            warExhaustion: Math.round(num(t.warExhaustion) * 10) / 10,
          });
        }
        rows.sort((a, b) => b.dev - a.dev);
        return rows;
      } catch (e) { warnOnce('ledger', 'getLedger failed', e); return []; }
    },

    // ---- merge all -------------------------------------------------------------
    mergeAllInto(armyId) {
      try {
        const a = g.armies[armyId];
        if (!a || a.tag !== g.playerTag) return;
        let merged = 0;
        for (const other of armiesInProv(ctx, a.prov)) {
          if (other.id === a.id || other.tag !== g.playerTag) continue;
          if (mergeInto(ctx, other.id, a.id)) merged++;
        }
        if (merged) say('Armies merged', merged + (merged === 1 ? ' army joins ' : ' armies join ') + a.name + '.', 'info');
        else say('Nothing to merge', 'No other army of ours stands in this province (or they are locked in battle).', 'info');
      } catch (e) { warnOnce('mergeAll', 'mergeAllInto failed', e); }
    },

    // ---- declaring war (a casus belli softens the cost) ---------------------
    // no CB: -2 stability, -5 legitimacy · holy war: -1 stability · claim: free
    declareWarOn(tag) {
      try {
        const d = getDip(tag);
        if (!d) return;
        if (!d.canWar) { say('Declare war', d.whyNotWar || 'We cannot declare war on ' + d.name + '.', 'bad'); return; }
        const mine = g.tags[g.playerTag];
        const cb = d.cb;
        if (!cb) {
          mine.stability = clamp(num(mine.stability) - 2, -3, 3);
          mine.legitimacy = clamp(num(mine.legitimacy) - 5, 0, 100);
        } else if (cb.type === 'holy') {
          mine.stability = clamp(num(mine.stability) - 1, -3, 3);
        }
        addOpinion(ctx, tag, g.playerTag, -100);
        declareWar(ctx, g.playerTag, tag, null, cb ? cb.type : null);
      } catch (e) { warnOnce('declareWarOn', 'declareWarOn failed', e); }
    },

    // ---- claims --------------------------------------------------------------
    getClaimInfo(provId) {
      try {
        const p = ctx.byId(provId);
        const mine = g.tags[g.playerTag];
        if (!p || p.impassable || !mine) return null;
        if (p.owner === g.playerTag || !g.tags[p.owner] || p.owner === 'REB') return null;
        if (hasClaim(ctx, g.playerTag, provId)) return { hasClaim: true, canFabricate: false, whyNot: 'We already hold a claim here.' };
        let whyNot = '';
        const cdKey = 'claim:' + p.owner;
        if (diploCdActive(ctx, cdKey)) {
          whyNot = 'Our forgers need time (' + diploCdMonthsLeft(ctx, cdKey) + ' months before another claim on ' + ((g.tags[p.owner] && g.tags[p.owner].name) || p.owner) + ').';
        } else if (num(mine.points.infl) < 30) {
          whyNot = 'Not enough influence points (30 required).';
        }
        return { hasClaim: false, canFabricate: !whyNot, whyNot };
      } catch (e) { warnOnce('claimInfo', 'getClaimInfo failed', e); return null; }
    },
    fabricateClaim(provId) {
      try {
        const p = ctx.byId(provId);
        const mine = g.tags[g.playerTag];
        if (!p || p.impassable || !mine) return;
        if (p.owner === g.playerTag || !g.tags[p.owner] || p.owner === 'REB') return;
        if (hasClaim(ctx, g.playerTag, provId)) { say('Claim', 'We already hold a claim on ' + p.name + '.', 'info'); return; }
        const cdKey = 'claim:' + p.owner;
        if (diploCdActive(ctx, cdKey)) {
          say('Claim', 'Our forgers need ' + diploCdMonthsLeft(ctx, cdKey) + ' more months before another claim on '
            + ((g.tags[p.owner] && g.tags[p.owner].name) || p.owner) + '.', 'bad');
          return;
        }
        if (num(mine.points.infl) < 30) { say('Claim', 'Not enough influence points (30 required).', 'bad'); return; }
        mine.points.infl = num(mine.points.infl) - 30;
        if (!Array.isArray(mine.claims)) mine.claims = [];
        mine.claims.push(provId | 0);
        addOpinion(ctx, p.owner, g.playerTag, -20);
        setDiploCd(ctx, cdKey, 12);
        say('A claim is fabricated', 'Genealogies, old treaties, convenient testimony: we now hold a claim on '
          + p.name + '. A war for it costs no stability, and taking it at the peace table costs less.', 'good');
      } catch (e) { warnOnce('fabricateClaim', 'fabricateClaim failed', e); }
    },

    // ---- post-conquest integration ------------------------------------------
    getIntegration(provId) {
      try {
        const p = ctx.byId(provId);
        const t = g.tags[g.playerTag];
        if (!p || p.impassable || !t) return null;
        if (p.owner !== g.playerTag || p.controller !== g.playerTag) return null;
        const autonomy = clamp(num(p.autonomy, 0.25), 0, 0.9);
        let whyNotEstablish = '';
        if (autonomy <= 0.001) whyNotEstablish = 'The province already answers directly to the crown.';
        else if (num(t.points.gov) < 25) whyNotEstablish = 'Not enough governance points (25 required).';
        const foreign = t.religion && p.religion !== t.religion;
        let whyNotConvert = '';
        if (!foreign) whyNotConvert = 'The province already follows the state faith.';
        else if (p.conversion) whyNotConvert = 'The missionaries are already at work.';
        else if (num(t.points.infl) < 50) whyNotConvert = 'Not enough influence points (50 required).';
        return {
          autonomy,
          canEstablish: !whyNotEstablish, whyNotEstablish,
          canConvert: !whyNotConvert, whyNotConvert,
          converting: p.conversion ? { monthsLeft: Math.max(0, num(p.conversion.monthsLeft) | 0) } : null,
        };
      } catch (e) { warnOnce('integration', 'getIntegration failed', e); return null; }
    },
    establishRule(provId) {
      try {
        const p = ctx.byId(provId);
        const t = g.tags[g.playerTag];
        if (!p || !t || p.owner !== g.playerTag || p.controller !== g.playerTag) return;
        if (clamp(num(p.autonomy, 0.25), 0, 0.9) <= 0.001) { say('Establish rule', p.name + ' already answers directly to the crown.', 'info'); return; }
        if (num(t.points.gov) < 25) { say('Establish rule', 'Not enough governance points (25 required).', 'bad'); return; }
        t.points.gov = num(t.points.gov) - 25;
        p.autonomy = Math.max(0, clamp(num(p.autonomy, 0.25), 0, 0.9) - 0.15);
        p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== 'tightened_grip');
        p.modifiers.push({ id: 'tightened_grip', name: 'Tightened Grip', months: 6, effects: { unrest: 2 } });
        say('Rule established', 'Our magistrates take ' + p.name + ' in hand: autonomy falls to '
          + Math.round(p.autonomy * 100) + '%. The locals grumble for a season.', 'good');
      } catch (e) { warnOnce('establishRule', 'establishRule failed', e); }
    },
    convertProvince(provId) {
      try {
        const p = ctx.byId(provId);
        const t = g.tags[g.playerTag];
        if (!p || !t || p.owner !== g.playerTag || p.controller !== g.playerTag) return;
        if (!t.religion || p.religion === t.religion) { say('Conversion', p.name + ' already follows the state faith.', 'info'); return; }
        if (p.conversion) { say('Conversion', 'The missionaries are already at work in ' + p.name + '.', 'info'); return; }
        if (num(t.points.infl) < 50) { say('Conversion', 'Not enough influence points (50 required).', 'bad'); return; }
        t.points.infl = num(t.points.infl) - 50;
        p.conversion = { by: g.playerTag, monthsLeft: 12 };
        p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== 'religious_tension');
        p.modifiers.push({ id: 'religious_tension', name: 'Religious Tension', months: 12, effects: { unrest: 3 } });
        say('Conversion begun', 'Priests and teachers go out to ' + p.name + '; in a year it will follow the state faith. Expect unrest while the old gods are put away.', 'good');
      } catch (e) { warnOnce('convertProvince', 'convertProvince failed', e); }
    },

    // ---- missions (nation panel) ---------------------------------------------
    getMissions() {
      try {
        const list = ctx.bookmark && ctx.bookmark.missions && ctx.bookmark.missions[g.playerTag];
        const t = g.tags[g.playerTag];
        if (!Array.isArray(list) || !t) return [];
        const idx = Math.max(0, num(t.missionIdx, 0) | 0);
        return list.map((m, i) => ({
          name: m.name || m.id,
          desc: m.desc || '',
          rewardText: m.rewardText || '',
          status: i < idx ? 'done' : i === idx ? 'current' : 'locked',
        }));
      } catch (e) { warnOnce('getMissions', 'getMissions failed', e); return []; }
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
  // Runtime-synthesized events don't survive a reload — drop stale pendings.
  saved.pendingEvents = saved.pendingEvents.filter((pe) => !(pe && String(pe.eventId).startsWith('dyn_')));
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
    if (!t) continue;
    if (!Number.isFinite(t.loans)) t.loans = 0;
    // v1.5 realm fields (rulers themselves are re-crowned in makeCtx)
    if (!Array.isArray(t.claims)) t.claims = [];
    if (t.overlord === undefined) t.overlord = null;
    if (t.heir === undefined) t.heir = null;
    if (t.regency === undefined) t.regency = false;
    if (!Number.isFinite(t.missionIdx)) t.missionIdx = 0;
    if (!t.reforms) t.reforms = { mil: 0, civ: 0, rel: 0 }; // pre-reform saves
    if (!t.advisors) t.advisors = { gov: null, infl: null, mar: null };
    if (!t.courtCand) t.courtCand = {};
    // A save written mid-multiplayer leaves guest nations human (ai:false).
    // Loading is always a solo continuation: everyone but the player is AI again.
    t.ai = k !== saved.playerTag;
  }
  saved.humanTags = [saved.playerTag]; // multiplayer roster never survives a reload
  for (let i = 1; i < saved.provinces.length; i++) {
    const p = saved.provinces[i];
    if (p && p.conversion === undefined) p.conversion = null;
  }
  saved.paused = true; // always resume paused
  return saved;
}
