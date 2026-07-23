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

import { num, clamp, devTotal } from './military.js';
import { factionDefs } from './factions.js';
import { isCoastal, merchantShipsOf } from './navy.js';

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

function makeTerritorial(ctx, tag, seq, deadline) {
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
};
const REWARDS = [
  { name: 'The Weights and Measures', desc: 'The realm\'s scales are trusted in every market: +5% income, forever.', effects: { incomeMult: 1.05 } },
  { name: 'The Rolls of the Willing', desc: 'The villages remember the victories: +5% manpower, forever.', effects: { manpowerMult: 1.05 } },
  { name: 'The Old Standards', desc: 'The banners carry their story into every line: +3% morale, forever.', effects: { moraleMult: 1.03 } },
  { name: 'The King\'s Roads', desc: 'The roads that fed the wars now feed the ranks: +10% reinforcement, forever.', effects: { reinforceMult: 1.1 } },
  { name: 'The Great Seal', desc: 'The dynasty\'s word outlives its bearers: legitimacy accrues monthly, forever.', effects: { legitimacyAdd: 0.1 } },
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
  const reward = REWARDS[seq % REWARDS.length];
  ch.active = {
    n, title,
    epigraph: 'The chronicle turns a page: what the war won, the age must keep.',
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
  const active = ch.active ? {
    n: ch.active.n,
    title: ch.active.title,
    epigraph: ch.active.epigraph || '',
    reward: { name: ch.active.reward.name, desc: ch.active.reward.desc },
    objectives: ch.active.objectives.map((o) => ({
      slot: o.slot, name: o.name, desc: o.desc, done: !!o.done,
      have: num(o.have, 0), need: o.need,
      holdMonths: o.holdMonths | 0, needMonths: o.needMonths | 0,
      monthsLeft: Math.max(0, num(o.monthsLeft, 0) | 0),
    })),
  } : null;
  return {
    seq: ch.seq,
    active,
    nextIn: !ch.active && Number.isFinite(ch.graceLeft) ? Math.max(0, ch.graceLeft) : 0,
    history: (ch.history || []).map((h) => ({ ...h })),
  };
}
