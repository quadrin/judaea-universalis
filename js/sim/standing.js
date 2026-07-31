// Judaea Universalis — the standing of the powers (SPEC §165). DOM-free.
//
// WHY THIS FILE EXISTS. There was a ledger (L) that listed every nation with
// its numbers, and there were up to two rivals a player could name. There was
// no answer anywhere to "am I winning" that did not require reading a table and
// doing the arithmetic yourself — and, more to the point, no answer the WORLD
// had. Nothing in the sim knew that Rome was the biggest thing on the map and
// Characene was not. Every court weighed every other court by the only number
// it had: how many men are in the field this month.
//
// That is a real omission and not a cosmetic one. A hierarchy the AI can see
// is what makes a small power behave like a small power — hesitating in front
// of an empire it could technically out-muster this season, because the empire
// is an empire and will still be there next season. Without it, a border
// kingdom with a lucky levy treats Parthia as a fair fight.
//
// WHAT IT IS. One score per living court, refreshed quarterly (nothing here
// moves fast enough to be worth a monthly pass over every province), and one
// ordered list. Eight seats at the top, because eight is the number that makes
// a top table feel like a table rather than a list. Three uses:
//
//   1. LEGIBILITY. The realm panel and the ledger can print "4th of 19" and
//      the player knows what kind of game they are in.
//   2. DEFERENCE. `deference()` returns the extra margin a court wants before
//      it will start a war with someone above it. Wired into the one place in
//      `ai.js` that decides an opportunistic declaration, as a multiplier on
//      the ratio it already computes — so it tunes an existing decision rather
//      than adding a new one.
//   3. REACH. Everyone has heard of the courts at the top table, which is what
//      lets §164's agents operate in a capital they do not border.
//
// WHAT IT IS NOT. It is not score. Nobody wins by being first; the bookmarks
// keep their own victory contracts and this number appears in none of them.

import { num, clamp, armiesOf, tagDef } from './military.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/standing]', ...args);
}

export const STANDING = {
  // How many courts sit at the top table — at most eight, and never more than
  // half the room. A chapter with nine courts in it has no "top eight": the
  // first run of this file cheerfully told a sixth-of-nine Judaea that it was
  // one of the powers of the age, which is exactly the flattery a standing
  // table exists to refuse.
  powers: 8,
  powersShare: 0.5,
  // Recomputed this often. A quarter is faster than any of these numbers
  // actually move and cheap enough not to matter.
  refreshMonths: 3,
  // Weights. Development is the spine — it is the one number that means the
  // same thing in 167 BCE and 1948 — and everything else is a modifier on how
  // much that development is currently worth.
  wDev: 1,
  wIncome: 4,
  wArmy: 0.02,
  wTech: 6,
  wClient: 8,
  // The deference band: how much extra margin a court wants per unit of
  // score ratio, and the most it can ever want.
  deferPerRatio: 0.18,
  deferMax: 0.55,
  // …and the discount a genuinely larger power gets for the same reason.
  boldMin: 0.85,
};

function monthIndex(d) { return d.y * 12 + (d.m - 1); }

function devTotal(p) {
  return p && p.dev ? num(p.dev.tax) + num(p.dev.prod) + num(p.dev.mp) : 0;
}

// One court's weight in the world. Everything read here is already kept by
// the engine; nothing is stored for this function's benefit.
export function standingScore(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  if (!t || !t.alive || tag === 'REB' || tag === 'WASTE') return 0;
  let dev = 0;
  let clients = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag) continue;
    // Land somebody else's army is standing on counts for less, because it
    // is paying somebody else this month (SPEC §146: ruling and standing on
    // are different verbs, and the score has to know the difference).
    dev += devTotal(p) * (p.controller && p.controller !== tag ? 0.35 : 1);
  }
  // An off-map seat (SPEC §178) owns no cell; its weight is its def's own
  // number — which is how the United States outweighs every court of 1948,
  // and how §164's reach rule knows everyone has heard of it.
  const om = tagDef(ctx, tag).offmap;
  if (om) dev += num(om.dev, 0);
  for (const k of Object.keys(g.tags)) {
    const o = g.tags[k];
    if (o && o.alive && o.overlord === tag) clients++;
  }
  const men = armiesOf(ctx, tag).reduce((n, a) => n + num(a.men), 0);
  const tech = t.tech ? num(t.tech.gov) + num(t.tech.infl) + num(t.tech.mar) : 0;
  return Math.max(0,
    dev * STANDING.wDev
    + Math.max(0, num(t.income)) * STANDING.wIncome
    + men * STANDING.wArmy
    + tech * STANDING.wTech
    + clients * STANDING.wClient);
}

// Quarterly. Writes `g.standing = { order, score, month }` — plain data, so a
// save carries it and a save from before this existed simply rebuilds it on
// the first tick after loading.
export function refreshStanding(ctx, force) {
  const g = ctx.game;
  if (!g || !g.tags) return null;
  const now = monthIndex(g.date);
  if (!g.standing || typeof g.standing !== 'object') g.standing = { order: [], score: {}, month: -9999 };
  if (!force && Number.isFinite(g.standing.month) && now - g.standing.month < STANDING.refreshMonths) return g.standing;
  const score = {};
  const order = [];
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive || tag === 'REB' || tag === 'WASTE') continue;
    score[tag] = Math.round(standingScore(ctx, tag));
    order.push(tag);
  }
  // Ties break by tag so the order is stable between refreshes — a ranking
  // that reshuffles equal courts every quarter reads as noise in the panel.
  order.sort((a, b) => (score[b] - score[a]) || (a < b ? -1 : a > b ? 1 : 0));
  g.standing = { order, score, month: now };
  return g.standing;
}

// How many seats the top table has in THIS room.
export function powerSeats(ctx) {
  const st = ctx.game && ctx.game.standing;
  const n = st && Array.isArray(st.order) ? st.order.length : 0;
  return Math.max(1, Math.min(STANDING.powers, Math.ceil(n * STANDING.powersShare)));
}

function tierAt(rank, seats) {
  if (rank >= seats) return 'minor';
  if (rank < Math.max(1, Math.round(seats * 0.25))) return 'great power';
  if (rank < Math.max(2, Math.round(seats * 0.625))) return 'power';
  return 'regional power';
}

export function standingOf(ctx, tag) {
  try {
    const st = refreshStanding(ctx);
    if (!st) return null;
    const rank = st.order.indexOf(tag);
    if (rank < 0) return null;
    const seats = powerSeats(ctx);
    return {
      tag,
      rank: rank + 1,
      of: st.order.length,
      score: num(st.score[tag]),
      seats,
      isPower: rank < seats,
      tier: tierAt(rank, seats),
    };
  } catch (e) { warnOnce('of:' + tag, 'standingOf failed', e); return null; }
}

// The extra margin `a` wants before starting a war with `b`. Above 1 means
// "wants more men than it otherwise would"; below 1 means "will move on less".
// Clamped both ways so this can only ever tune the AI's existing judgement,
// never overrule it.
export function deference(ctx, a, b) {
  try {
    const st = refreshStanding(ctx);
    if (!st) return 1;
    const sa = Math.max(1, num(st.score[a]));
    const sb = Math.max(1, num(st.score[b]));
    if (sb > sa) return clamp(1 + (sb / sa - 1) * STANDING.deferPerRatio, 1, 1 + STANDING.deferMax);
    return clamp(1 - (sa / sb - 1) * STANDING.deferPerRatio * 0.5, STANDING.boldMin, 1);
  } catch (e) { warnOnce('defer', 'deference failed', e); return 1; }
}

// The ledger's read: the top table, then everyone else, with the numbers that
// produced the order so a player can see WHY Rome is first.
export function standingTable(ctx) {
  try {
    const st = refreshStanding(ctx);
    if (!st) return [];
    const g = ctx.game;
    const seats = powerSeats(ctx);
    return st.order.map((tag, i) => {
      const t = g.tags[tag];
      return {
        tag,
        name: (t && t.name) || tag,
        rank: i + 1,
        score: num(st.score[tag]),
        isPower: i < seats,
        tier: tierAt(i, seats),
      };
    });
  } catch (e) { warnOnce('table', 'standingTable failed', e); return []; }
}

export function monthlyStanding(ctx) {
  try { refreshStanding(ctx); } catch (e) { warnOnce('monthly', 'refresh failed', e); }
}
