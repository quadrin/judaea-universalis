// Judaea Universalis — sandbox chapters (SPEC §83). DOM-free.
//
// Winning the bookmark closes the historical chapter without closing the
// campaign (SPEC §32) — this module writes the second act. A few months
// after the verdict the game generates a CHAPTER: three world-aware
// objectives (one territorial, one internal, one diplomatic or economic),
// drawn from the sandbox families — hegemony, holy sites, trade dominance,
// dynastic survival, federation, imperial defense — and sized to the realm
// as it actually stands, never to a script. Completing a chapter grants a
// permanent but restrained reward and opens a harder successor; an objective
// that lapses costs a little legitimacy and is REPLACED — there is no second
// game-over screen in the sandbox. Player-only, human-only (the same rule as
// estates): the AI's ambitions stay offstage.
//
// Everything stored on game.chapters is plain data (objectives carry typed
// params, never functions), so saves resume mid-chapter.

import { num, clamp, devTotal, liveGrudge, reconciled, thawProgress } from './military.js';
import { factionDefs } from './factions.js';
import { isCoastal, merchantShipsOf } from './navy.js';
import { lean, axisOf, doctrineEpithet } from './doctrine.js';

const warned = new Set();
function warnOnce(key, ...msg) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[sim/chapters]', ...msg);
}

function C(ctx, key, fallback) {
  const c = ctx.DEFINES && ctx.DEFINES.CHAPTERS;
  return c && Number.isFinite(c[key]) ? c[key] : fallback;
}

// ---------------------------------------------------------------- world reads
function controlledCount(ctx, tag) {
  const g = ctx.game;
  let n = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.controller === tag) n++;
  }
  return n;
}
function coastalControlled(ctx, tag) {
  const g = ctx.game;
  let n = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.controller === tag && isCoastal(ctx, i)) n++;
  }
  return n;
}
function totalDevOf(ctx, tag) {
  const g = ctx.game;
  let d = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === tag) d += devTotal(p);
  }
  return d;
}
function holyProvinces(ctx) {
  const g = ctx.game;
  const out = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && (p.holy || p.wonder === 'temple')) out.push(i);
  }
  return out;
}
function capitalId(ctx, tag) {
  const name = ctx.DEFINES.TAGS && ctx.DEFINES.TAGS[tag] ? ctx.DEFINES.TAGS[tag].capital : null;
  return name ? ctx.provId(name) : 0;
}
function foreignCapitalsByDistance(ctx, tag) {
  const g = ctx.game;
  const own = capitalId(ctx, tag);
  const c0 = own && ctx.geom.centroids ? ctx.geom.centroids[own] : null;
  const out = [];
  for (const k of Object.keys(g.tags)) {
    if (k === tag || k === 'REB') continue;
    const t = g.tags[k];
    if (!t || !t.alive) continue;
    const pid = capitalId(ctx, k);
    const p = pid ? ctx.byId(pid) : null;
    if (!p || p.impassable || p.controller === tag) continue;
    const c = ctx.geom.centroids ? ctx.geom.centroids[pid] : null;
    const d = c0 && c ? Math.hypot(c.x - c0.x, c.y - c0.y) : 1e9;
    out.push({ pid, tag: k, d });
  }
  out.sort((a, b) => a.d - b.d);
  return out;
}
function strongestRival(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  let best = null, bestDev = -1;
  for (const k of Object.keys(g.tags)) {
    if (k === tag || k === 'REB') continue;
    const e = g.tags[k];
    if (!e || !e.alive || e.overlord === tag) continue;
    if (t && (t.allies || []).indexOf(k) >= 0) continue;
    const d = totalDevOf(ctx, k);
    if (d > bestDev) { bestDev = d; best = k; }
  }
  return best;
}
function livingEnemies(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  return ((t && t.atWarWith) || []).filter((e) => g.tags[e] && g.tags[e].alive);
}

// ---------------------------------------------------------------- generation
// Each maker returns a plain objective:
// { id, slot, kind, name, desc, params, need, needMonths, have, holdMonths,
//   monthsLeft, done }
function obj(slot, kind, name, desc, params, need, needMonths, deadline) {
  return {
    id: slot + ':' + kind, slot, kind, name, desc, params: params || {},
    need: Math.max(1, need | 0), needMonths: Math.max(1, needMonths | 0),
    have: 0, holdMonths: 0, monthsLeft: deadline, done: false,
  };
}

// ------------------------------------------------------- the realm's own arc
// A generated chapter that asks every realm the same four questions is a
// checklist. The doctrine axes (SPEC §85) already know what KIND of realm
// won this bookmark, so the second act asks it about itself: a zealous crown
// is set to purifying the land, an accommodating one to keeping the
// communities quiet, a court that faces east to keeping the covenant it
// chose. Each doctrine objective is offered once (usedKinds), then the
// generic ladder resumes — the arc bends toward the campaign without ever
// running out of chapters.
function fresh(ctx, kind) {
  return usedKinds(ctx).indexOf(kind) < 0;
}
function faithProvinces(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  const out = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.controller !== tag) continue;
    if (t && p.religion === t.religion) out.push(i);
  }
  return out;
}
function foreignFaithProvinces(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  const out = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag) continue;
    if (t && p.religion && p.religion !== t.religion) out.push(i);
  }
  return out;
}
// Courts that hold a grudge against us — the wounds §86 says can be closed.
function woundedCourts(ctx, tag) {
  const g = ctx.game;
  const out = [];
  for (const k of Object.keys(g.tags)) {
    const e = g.tags[k];
    if (!e || !e.alive || k === tag || k === 'REB') continue;
    if (liveGrudge(ctx, k, tag)) out.push(k);
  }
  return out;
}

function makeTerritorial(ctx, tag, seq, deadline) {
  // Zealous: the land itself must answer to one altar.
  if (lean(ctx, 'zeal', 1) && fresh(ctx, 'purified')) {
    const have = faithProvinces(ctx, tag).length;
    const need = have + 2 + seq;
    return obj('territorial', 'purified',
      'The Purified Land',
      'Bring the land under one altar: hold ' + need + ' provinces that keep the realm\'s own faith.',
      {}, need, 3, deadline);
  }
  // Martial: measured in ground that was not ours when the chapter opened.
  if (lean(ctx, 'conquest', 1) && fresh(ctx, 'swordMeasure')) {
    const need = 3 + seq;
    const baseline = [];
    for (let i = 1; i < ctx.game.provinces.length; i++) {
      const p = ctx.game.provinces[i];
      if (p && !p.impassable && p.controller === tag) baseline.push(i);
    }
    return obj('territorial', 'swordMeasure',
      'The Sword\'s Own Measure',
      'Take ' + need + ' provinces that are not ours today, and hold them half a year.',
      { baseline }, need, 6, deadline);
  }
  const holy = holyProvinces(ctx);
  const usedHoly = usedKinds(ctx).indexOf('holyPlaces') >= 0;
  if (holy.length && !usedHoly) {
    const names = holy.map((id) => ctx.byId(id).name).join(', ');
    return obj('territorial', 'holyPlaces',
      'The Holy Places',
      'Control and keep the great sanctuaries — ' + names + ' — for a year of peace under our watch.',
      { list: holy }, holy.length, 12, deadline);
  }
  if (seq % 2 === 1) {
    const caps = foreignCapitalsByDistance(ctx, tag).slice(0, 4 + seq);
    const k = Math.min(caps.length, 2 + seq);
    if (k >= 2) {
      const names = caps.map((c) => ctx.byId(c.pid).name).join(', ');
      return obj('territorial', 'capitals',
        'The Circle of Thrones',
        'Take and hold ' + k + ' of the region\'s seats of power (' + names + ') for six months.',
        { list: caps.map((c) => c.pid) }, k, 6, deadline);
    }
  }
  const rival = strongestRival(ctx, tag);
  if (rival && seq % 3 === 2) {
    const pid = capitalId(ctx, rival);
    if (pid) {
      const rname = (ctx.game.tags[rival] && ctx.game.tags[rival].name) || rival;
      return obj('territorial', 'rivalCapital',
        'The Strongest Bows',
        'Defeat ' + rname + ', the strongest power of the age: hold its capital, '
          + ctx.byId(pid).name + ', or see its banners cast down.',
        { prov: pid, rival }, 1, 3, deadline);
    }
  }
  const need = controlledCount(ctx, tag) + 3 + 2 * seq;
  return obj('territorial', 'provCount',
    'The Broad Land',
    'Extend the realm\'s writ to ' + need + ' provinces under our control.',
    {}, need, 1, deadline);
}

function makeInternal(ctx, tag, seq, deadline) {
  // Accommodating: the proof is not conversion but quiet — every province
  // that keeps another god, kept calm.
  if (lean(ctx, 'zeal', -1) && fresh(ctx, 'communities') && foreignFaithProvinces(ctx, tag).length) {
    return obj('internal', 'communities',
      'The Peace of the Communities',
      'Keep every province of another faith below 3 unrest for ' + (8 + 2 * seq) + ' months together.',
      { max: 3 }, 1, 8 + 2 * seq, deadline);
  }
  // Crowned: one head, undoubted — full legitimacy, an heir seated, and no
  // claimant anywhere in the field (SPEC §87).
  if (lean(ctx, 'authority', 1) && fresh(ctx, 'undoubted')) {
    return obj('internal', 'undoubted',
      'The Undoubted Crown',
      'Leave no question about the throne: legitimacy 90+, an heir seated, and no pretender '
        + 'in the field, for ' + (8 + 2 * seq) + ' months.',
      { legit: 90 }, 1, 8 + 2 * seq, deadline);
  }
  // Conciliar: a realm that seats its sovereignty in a chamber proves itself
  // by governing, not by winning — years of peace with the country steady.
  if (lean(ctx, 'authority', -1) && fresh(ctx, 'chamber')) {
    return obj('internal', 'chamber',
      'The Chamber Sits',
      'Govern rather than fight: ' + (12 + 3 * seq) + ' unbroken months at peace with every '
        + 'court, stability at +1 or better.',
      { stab: 1 }, 1, 12 + 3 * seq, deadline);
  }
  if (factionDefs(ctx, tag)) {
    return obj('internal', 'estates',
      'A House United',
      'Keep every estate of the realm at 60+ approval for ' + (6 + 2 * seq) + ' months together.',
      { min: 60 }, 1, 6 + 2 * seq, deadline);
  }
  if (livingEnemies(ctx, tag).length >= 2) {
    return obj('internal', 'survive',
      'The Unbroken Wall',
      'Weather the coalition ranged against us: end its war with the capital still in our hands.',
      { seen: false }, 1, 1, deadline);
  }
  if (seq % 2 === 0) {
    return obj('internal', 'stability',
      'The Long Peace',
      'Hold the realm steady — stability +2 and legitimacy 70+ — for ' + (8 + 2 * seq) + ' months.',
      { stab: 2, legit: 70 }, 1, 8 + 2 * seq, deadline);
  }
  const add = 6 + 3 * seq;
  return obj('internal', 'devGain',
    'The Builders',
    'Raise the land itself: add ' + add + ' points of development to the realm.',
    { baseline: totalDevOf(ctx, tag) }, add, 1, deadline);
}

function makeDiplomatic(ctx, tag, seq, deadline) {
  const g = ctx.game;
  const t = g.tags[tag];
  // The mended quarrel (SPEC §86): a court whose land we hold, brought all
  // the way back. This is the hardest diplomatic objective in the game and
  // the only one that cannot be bought — it can only be waited out, and only
  // if the realm stops choosing that court for an enemy.
  const wounded = woundedCourts(ctx, tag);
  if (wounded.length && fresh(ctx, 'mended')) {
    const names = wounded.map((k) => (g.tags[k] && g.tags[k].name) || k).slice(0, 3).join(', ');
    return obj('diplomatic', 'mended',
      'The Mended Quarrel',
      'Close an old wound without giving the land back: bring one court that lost provinces to '
        + 'us (' + names + ') all the way to reconciliation.',
      { list: wounded.slice() }, 1, 1, deadline);
  }
  // The horizon the realm chose, kept: a warm alliance with a court on that
  // side of the world, held a year.
  if (fresh(ctx, 'covenant') && (lean(ctx, 'alignment', 1) || lean(ctx, 'alignment', -1))) {
    const east = axisOf(ctx, 'alignment') < 0;
    return obj('diplomatic', 'covenant',
      east ? 'The Covenant of the King of Kings' : 'The Friendship of the West',
      'Keep the horizon we chose: hold a warm alliance (their opinion of us 50+) with a court of '
        + (east ? 'the east' : 'the west') + ' for a year together.',
      { east, minOpinion: 50 }, 1, 12, deadline);
  }
  // Mercantile: the ledgers, kept in peace — the purse's own proof.
  if (lean(ctx, 'conquest', -1) && fresh(ctx, 'ledgers')) {
    const income = Math.max(Math.round(num(t.income) * 1.3), Math.round(num(t.income)) + 8);
    return obj('diplomatic', 'ledgers',
      'The Ledgers of the Age',
      'Prove the purse: ' + income + ' talents a month with no war anywhere, held a year.',
      { income }, 1, 12, deadline);
  }
  const hasCoast = coastalControlled(ctx, tag) > 0;
  const hasClients = Object.values(g.tags).some((e) => e && e.alive && e.overlord === tag);
  if (hasCoast && seq % 2 === 0) {
    const hulls = Math.min(6, 2 + seq);
    const income = Math.max(Math.round(num(t.income) * (1.2 + 0.1 * seq)), Math.round(num(t.income)) + 5);
    return obj('diplomatic', 'trade',
      'Mistress of the Sea',
      'Keep ' + hulls + ' merchant hulls in the water and lift the realm\'s income to '
        + income + ' talents a month, held half a year.',
      { hulls, income }, 1, 6, deadline);
  }
  if (hasClients || seq >= 2) {
    const k = Math.min(3, 1 + seq);
    return obj('diplomatic', 'clients',
      'The League of Crowns',
      'Maintain ' + k + ' loyal client kingdom' + (k === 1 ? '' : 's') + ' (opinion 25+) for a year together.',
      { minOpinion: 25 }, k, 12, deadline);
  }
  const k = Math.min(3, 2 + Math.floor(seq / 2));
  return obj('diplomatic', 'allies',
    'The Bound Standards',
    'Hold ' + k + ' warm alliances (their opinion of us 50+) for a year together.',
    { minOpinion: 50 }, k, 12, deadline);
}

const TITLES = {
  holyPlaces: ['The Second Kingdom', 'The Guarded Sanctuary', 'The Crown and the Altar'],
  capitals: ['The Circle of Thrones', 'The Neighbors Bow', 'The Wide Dominion'],
  rivalCapital: ['The Strongest Bows', 'The Contest of Ages', 'The Last Rival'],
  provCount: ['The Broad Land', 'From Strength to Strength', 'The Long Border'],
  purified: ['The One Altar', 'The Land Made Clean', 'A Kingdom Apart'],
  swordMeasure: ['The Sword\'s Own Measure', 'What the Spear Wins', 'The Marching Border'],
};
// The seal of a chapter. Ten of them, and the sequence walks the list rather
// than cycling five — a long sandbox stopped repeating itself at chapter six.
const REWARDS = [
  { name: 'The Weights and Measures', desc: 'The realm\'s scales are trusted in every market: +5% income, forever.', effects: { incomeMult: 1.05 } },
  { name: 'The Rolls of the Willing', desc: 'The villages remember the victories: +5% manpower, forever.', effects: { manpowerMult: 1.05 } },
  { name: 'The Old Standards', desc: 'The banners carry their story into every line: +3% morale, forever.', effects: { moraleMult: 1.03 } },
  { name: 'The King\'s Roads', desc: 'The roads that fed the wars now feed the ranks: +10% reinforcement, forever.', effects: { reinforceMult: 1.1 } },
  { name: 'The Great Seal', desc: 'The dynasty\'s word outlives its bearers: legitimacy accrues monthly, forever.', effects: { legitimacyAdd: 0.1 } },
  { name: 'The Quiet Provinces', desc: 'The assessors are met with complaints rather than stones: −0.5 unrest everywhere, forever.', effects: { unrestAll: -0.5 } },
  { name: 'The Granaries of the Age', desc: 'Full stores behind every march: +8% income and +3% manpower, forever.', effects: { incomeMult: 1.08, manpowerMult: 1.03 } },
  { name: 'The Drillfields', desc: 'A generation raised to the standard: +5% morale, forever.', effects: { moraleMult: 1.05 } },
  { name: 'The Long Memory', desc: 'What this court promises, it is believed to mean: legitimacy accrues faster, forever.', effects: { legitimacyAdd: 0.2 } },
  { name: 'The Made Peace', desc: 'A court that knows how a war is ended keeps its armies cheaper: −8% maintenance, forever.', effects: { maintMult: 0.92 } },
];

function usedKinds(ctx) {
  const ch = ctx.game.chapters;
  return (ch && ch.usedKinds) || [];
}

function generateChapter(ctx, tag) {
  const g = ctx.game;
  const ch = g.chapters;
  const n = ch.seq + 1;
  const seq = ch.seq; // 0-based difficulty
  const deadline = C(ctx, 'deadlineMonths', 96);
  const objectives = [
    makeTerritorial(ctx, tag, seq, deadline),
    makeInternal(ctx, tag, seq, deadline),
    makeDiplomatic(ctx, tag, seq, deadline),
  ];
  const lead = objectives[0].kind;
  const titles = TITLES[lead] || TITLES.provCount;
  const title = titles[seq % titles.length];
  // Ten seals now, so a realm sees ten chapters before one repeats.
  const reward = REWARDS[seq % REWARDS.length];
  // The epigraph names the realm the chapter is actually being asked of
  // (SPEC §85) — a second act addressed to this campaign, not to any winner.
  const epithet = doctrineEpithet(ctx);
  ch.active = {
    n, title,
    epigraph: epithet
      ? 'The chronicle turns a page. What the war won, the age must keep — and it will be kept '
        + 'by the realm this war made: ' + epithet.toLowerCase() + '.'
      : 'The chronicle turns a page: what the war won, the age must keep.',
    started: { y: g.date.y, m: g.date.m },
    objectives,
    reward: { id: 'chapter_reward_' + n, name: reward.name, desc: reward.desc, effects: { ...reward.effects } },
  };
  for (const o of objectives) {
    if (ch.usedKinds.indexOf(o.kind) < 0) ch.usedKinds.push(o.kind);
  }
  ctx.bus.emit('notify', {
    title: 'A new chapter — ' + title,
    text: 'Chapter ' + n + ' of the sandbox opens: ' + objectives.map((o) => o.name).join('; ')
      + '. Its seal, when complete: ' + ch.active.reward.name + '. (Realm panel → The Chapters.)',
    type: 'good',
  });
  ctx.helpers.chronicle(ctx, 'chapter', 'Chapter ' + n + ' opens — ' + title + ': '
    + objectives.map((o) => o.name).join('; ') + '.');
}

// ---------------------------------------------------------------- evaluation
function evalObjective(ctx, tag, o) {
  const g = ctx.game;
  const t = g.tags[tag];
  const P = o.params || {};
  switch (o.kind) {
    case 'holyPlaces': {
      const have = (P.list || []).filter((id) => {
        const p = ctx.byId(id);
        return p && p.controller === tag;
      }).length;
      return { have, met: have >= o.need };
    }
    case 'capitals': {
      const have = (P.list || []).filter((id) => {
        const p = ctx.byId(id);
        return p && p.controller === tag;
      }).length;
      return { have, met: have >= o.need };
    }
    case 'rivalCapital': {
      const rt = g.tags[P.rival];
      const p = ctx.byId(P.prov);
      const met = (!rt || rt.alive === false) || (!!p && p.controller === tag);
      return { have: met ? 1 : 0, met };
    }
    case 'provCount': {
      const have = controlledCount(ctx, tag);
      return { have, met: have >= o.need };
    }
    // ---- the doctrine objectives (SPEC §85, §88) ---------------------------
    case 'purified': {
      const have = faithProvinces(ctx, tag).length;
      return { have, met: have >= o.need };
    }
    case 'swordMeasure': {
      const was = new Set(P.baseline || []);
      let have = 0;
      for (let i = 1; i < g.provinces.length; i++) {
        const p = g.provinces[i];
        if (p && !p.impassable && p.controller === tag && !was.has(i)) have++;
      }
      return { have, met: have >= o.need };
    }
    case 'communities': {
      const list = foreignFaithProvinces(ctx, tag);
      // No province of another faith left is not a pass — the objective was
      // to keep them, not to be rid of them.
      if (!list.length) return { have: 0, met: false };
      const worst = list.reduce((m, id) => Math.max(m, num(ctx.byId(id).unrest)), 0);
      return { have: Math.round(worst * 10) / 10, met: worst < num(P.max, 3) };
    }
    case 'undoubted': {
      const claim = g.pretenders && g.pretenders[tag];
      const met = num(t.legitimacy) >= num(P.legit, 90) && !!t.heir && !claim && !t.regency;
      return { have: Math.round(num(t.legitimacy)), met };
    }
    case 'chamber': {
      const atWar = livingEnemies(ctx, tag).length > 0;
      const met = !atWar && num(t.stability) >= num(P.stab, 1);
      return { have: met ? 1 : 0, met };
    }
    case 'mended': {
      const have = (P.list || []).filter((k) => reconciled(ctx, k, tag)).length;
      // Progress on this one is the closest wound's maturity, so the panel
      // shows a clock rather than a stubborn zero.
      const best = (P.list || []).reduce((m, k) => Math.max(m, thawProgress(ctx, k, tag)), 0);
      return { have: have || Math.round(best * 100) / 100, met: have >= o.need };
    }
    case 'covenant': {
      const east = !!P.east;
      const have = ((t && t.allies) || []).filter((k) => {
        const e = g.tags[k];
        if (!e || !e.alive) return false;
        if (num(e.opinion && e.opinion[tag]) < num(P.minOpinion, 50)) return false;
        // "East" and "west" are read off the era's own geography: a court is
        // eastern if its capital sits east of ours, western if west. No tag
        // list to keep in sync with seven bookmarks.
        const mine = capitalId(ctx, tag);
        const theirs = capitalId(ctx, k);
        const c0 = mine && ctx.geom.centroids ? ctx.geom.centroids[mine] : null;
        const c1 = theirs && ctx.geom.centroids ? ctx.geom.centroids[theirs] : null;
        if (!c0 || !c1) return false;
        return east ? c1.x > c0.x : c1.x < c0.x;
      }).length;
      return { have, met: have >= o.need };
    }
    case 'ledgers': {
      const atWar = livingEnemies(ctx, tag).length > 0;
      const met = !atWar && num(t.income) >= num(P.income, 0);
      return { have: Math.round(num(t.income)), met };
    }
    case 'estates': {
      const defs = factionDefs(ctx, tag) || [];
      const table = (t && t.factions) || {};
      let low = 100;
      for (const d of defs) low = Math.min(low, num(table[d.id], 50));
      return { have: Math.round(low), met: defs.length > 0 && low >= num(P.min, 60) };
    }
    case 'survive': {
      const bigWar = livingEnemies(ctx, tag).length >= 2;
      if (bigWar) P.seen = true;
      const cap = capitalId(ctx, tag);
      const capHeld = cap && ctx.byId(cap) && ctx.byId(cap).controller === tag;
      if (P.seen && !bigWar) {
        return { have: capHeld ? 1 : 0, met: !!capHeld, failNow: !capHeld };
      }
      return { have: 0, met: false };
    }
    case 'stability': {
      const met = num(t.stability) >= num(P.stab, 2) && num(t.legitimacy) >= num(P.legit, 70);
      return { have: met ? 1 : 0, met };
    }
    case 'devGain': {
      const have = Math.max(0, Math.round(totalDevOf(ctx, tag) - num(P.baseline)));
      return { have, met: have >= o.need };
    }
    case 'trade': {
      const hulls = merchantShipsOf(ctx, tag).reduce((s, r) => s + r.count, 0)
        + (g.merchantVoyages || []).filter((v) => v && v.tag === tag).length;
      const met = hulls >= num(P.hulls, 1) && num(t.income) >= num(P.income, 0);
      return { have: hulls, met };
    }
    case 'clients': {
      const have = Object.values(g.tags).filter((e) => e && e.alive && e.overlord === tag
        && num(e.opinion && e.opinion[tag]) >= num(P.minOpinion, 25)).length;
      return { have, met: have >= o.need };
    }
    case 'allies': {
      const have = ((t && t.allies) || []).filter((k) => {
        const e = g.tags[k];
        return e && e.alive && num(e.opinion && e.opinion[tag]) >= num(P.minOpinion, 50);
      }).length;
      return { have, met: have >= o.need };
    }
    default:
      return { have: 0, met: false };
  }
}

function remakeObjective(ctx, tag, o, seq, deadline) {
  if (o.slot === 'territorial') return makeTerritorial(ctx, tag, seq, deadline);
  if (o.slot === 'internal') return makeInternal(ctx, tag, seq, deadline);
  return makeDiplomatic(ctx, tag, seq, deadline);
}

function completeChapter(ctx, tag) {
  const g = ctx.game;
  const ch = g.chapters;
  const a = ch.active;
  const t = g.tags[tag];
  if (t) {
    t.modifiers = (t.modifiers || []).filter((m) => m && m.id !== a.reward.id);
    t.modifiers.push({ id: a.reward.id, name: a.reward.name, months: -1, effects: { ...a.reward.effects } });
    t.stability = clamp(num(t.stability) + 1, -3, 3);
    if (t.points) {
      t.points.gov = clamp(num(t.points.gov) + 25, 0, 999);
      t.points.infl = clamp(num(t.points.infl) + 25, 0, 999);
      t.points.mar = clamp(num(t.points.mar) + 25, 0, 999);
    }
  }
  ch.history.push({ n: a.n, title: a.title, y: g.date.y, m: g.date.m });
  ch.seq = a.n;
  ch.active = null;
  ch.graceLeft = C(ctx, 'betweenMonths', 6);
  ctx.bus.emit('notify', {
    title: 'Chapter complete — ' + a.title,
    text: 'All three objectives stand. ' + a.reward.name + ': ' + a.reward.desc
      + ' +1 stability, +25 to every pool. A harder chapter will open in time.',
    type: 'good',
  });
  ctx.helpers.chronicle(ctx, 'chapter', 'Chapter ' + a.n + ' — ' + a.title
    + ' — is complete. ' + a.reward.name + ' is the realm\'s forever.');
}

// Monthly. The system arms itself the month the bookmark's verdict lands as
// a WIN, waits out the grace, then runs the active chapter.
export function monthlyChapters(ctx) {
  const g = ctx.game;
  if (!g || g.over) return;
  const tag = g.playerTag;
  const t = g.tags[tag];
  if (!t || !t.alive || t.ai) return; // the sandbox second act is the human player's
  try {
    if (!g.chapters) {
      if (g.result !== 'win') return;
      g.chapters = { seq: 0, active: null, graceLeft: C(ctx, 'graceMonths', 2), history: [], usedKinds: [] };
      return;
    }
    const ch = g.chapters;
    if (!Array.isArray(ch.usedKinds)) ch.usedKinds = [];
    if (!ch.active) {
      if (Number.isFinite(ch.graceLeft) && ch.graceLeft > 0) { ch.graceLeft--; return; }
      generateChapter(ctx, tag);
      return;
    }
    const a = ch.active;
    let allDone = true;
    for (const o of a.objectives) {
      if (o.done) continue;
      const res = evalObjective(ctx, tag, o);
      o.have = num(res.have, 0);
      if (res.met) {
        o.holdMonths = (o.holdMonths | 0) + 1;
        if (o.holdMonths >= o.needMonths) {
          o.done = true;
          ctx.bus.emit('notify', {
            title: 'Objective achieved — ' + o.name,
            text: o.desc + ' It is done.',
            type: 'good',
          });
          continue;
        }
      } else {
        o.holdMonths = 0;
      }
      allDone = false;
      // the deadline: a lapsed objective is replaced, never fatal (SPEC §83)
      o.monthsLeft = num(o.monthsLeft, C(ctx, 'deadlineMonths', 96)) - 1;
      if (o.monthsLeft <= 0 || res.failNow) {
        const fresh = remakeObjective(ctx, tag, o, ch.seq, C(ctx, 'deadlineMonths', 96));
        a.objectives[a.objectives.indexOf(o)] = fresh;
        t.legitimacy = clamp(num(t.legitimacy) + C(ctx, 'failLegitimacy', -10), 0, 100);
        ctx.bus.emit('notify', {
          title: 'An objective slips away',
          text: o.name + ' has lapsed (' + Math.abs(C(ctx, 'failLegitimacy', -10))
            + ' legitimacy). In its place the age asks: ' + fresh.name + '.',
          type: 'bad',
        });
      }
    }
    if (allDone) completeChapter(ctx, tag);
  } catch (e) { warnOnce('chapters', 'monthlyChapters failed', e); }
}

// The realm panel's read (init.js getChapter): display data only.
export function chapterView(ctx) {
  const g = ctx.game;
  const ch = g.chapters;
  if (!ch) return null;
  const copy = (ctx.bookmark && ctx.bookmark.chapterText) || {};
  const titles = copy.titles || {};
  const objectives = copy.objectives || {};
  const rewards = copy.rewards || {};
  const active = ch.active ? {
    n: ch.active.n,
    title: titles[ch.active.title] || ch.active.title,
    epigraph: ch.active.epigraph || '',
    reward: {
      name: rewards[ch.active.reward.name] || ch.active.reward.name,
      desc: ch.active.reward.desc,
    },
    objectives: ch.active.objectives.map((o) => ({
      slot: o.slot, name: objectives[o.kind] || o.name, desc: o.desc, done: !!o.done,
      have: num(o.have, 0), need: o.need,
      holdMonths: o.holdMonths | 0, needMonths: o.needMonths | 0,
      monthsLeft: Math.max(0, num(o.monthsLeft, 0) | 0),
    })),
  } : null;
  return {
    seq: ch.seq,
    active,
    nextIn: !ch.active && Number.isFinite(ch.graceLeft) ? Math.max(0, ch.graceLeft) : 0,
    history: (ch.history || []).map((h) => ({ ...h, title: titles[h.title] || h.title })),
  };
}
