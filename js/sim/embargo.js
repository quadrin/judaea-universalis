// Judaea Universalis — the pressure short of war (SPEC §100). DOM-free.
//
// Not every age answers a state it dislikes with an army. The modern
// bookmark's Western powers never marched on the Levant over a border war;
// they cut the credit, closed the markets, and put destroyers across the
// approaches — and a small state that lives on imported fuel, spare parts and
// customs revenue can be brought to its knees by a signature.
//
// Two instruments, both of them public acts:
//   EMBARGO   — the court closes its markets to yours. Trade income falls,
//               and each embargo bites again. Cheap, reversible, and the one
//               every court can afford.
//   BLOCKADE  — a naval power stops your shipping. Every coastal province
//               earns a fraction of its ordinary revenue: the customs house,
//               the market, the shipyard's hulls, the routes through the
//               harbor. This is the one that empties a treasury.
//
// Both ride `game.embargoes` — a flat map of '<from>><to>' entries, so the
// book survives saves and multiplayer snapshots like any other diplomacy.

import { num, clamp, chronicle, opinionOf, addOpinion, mechanicOn } from './military.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/embargo]', ...args);
}

export const EMBARGO = {
  // The first closed market hurts; the tenth is somebody else's paperwork.
  tradeBite: 0.25,          // the first embargo's share of trade income…
  tradeBiteEach: 0.1,       // …and each additional court's, on top
  tradeFloor: 0.3,          // never below this share of the original
  blockadeTradeMult: 0.6,   // a blockade halves what is left again
  blockadeIncomeMult: 0.5,  // what a blockaded port earns of its ordinary revenue
  declareOpinion: -40,      // the target's regard for the court that signs it
  liftOpinion: 20,          // …and what lifting it buys back
  minOpinionToDeclare: -80, // an AI court embargoes only what it truly detests
  blockadeOpinion: -140,    // …and blockades only at the bottom of the scale
  aiChance: 0.06,           // monthly chance an eligible AI court acts
  aiMaxOutgoing: 2,         // …and how many markets one court will close at once
};

export function embargoKey(from, to) { return from + '>' + to; }

export function embargoActive(ctx, from, to) {
  const g = ctx && ctx.game;
  const e = g && g.embargoes ? g.embargoes[embargoKey(from, to)] : null;
  return e || null;
}

// Every living court currently embargoing this one.
export function embargoesOn(ctx, tag) {
  const g = ctx.game;
  const out = [];
  if (!g.embargoes) return out;
  for (const key of Object.keys(g.embargoes)) {
    const at = key.indexOf('>');
    if (at < 0 || key.slice(at + 1) !== tag) continue;
    const from = key.slice(0, at);
    const t = g.tags[from];
    if (!t || !t.alive) continue;
    out.push({ from, ...g.embargoes[key] });
  }
  return out;
}

// Is anybody's navy (or signature) closing this realm's harbors?
export function blockadedState(ctx, tag) {
  return embargoesOn(ctx, tag).some((e) => e && e.blockade);
}

// The multiplier an embargoed realm's TRADE income carries.
export function embargoTradeMult(ctx, tag) {
  const list = embargoesOn(ctx, tag);
  if (!list.length) return 1;
  const bite = clamp(num(EMBARGO.tradeBite, 0.25)
    + num(EMBARGO.tradeBiteEach, 0.1) * (list.length - 1), 0, 1);
  let mult = 1 - bite;
  if (list.some((e) => e && e.blockade)) mult *= num(EMBARGO.blockadeTradeMult, 0.6);
  return Math.max(EMBARGO.tradeFloor, mult);
}

// The multiplier a blockaded realm's COASTAL provinces carry on tax and
// production alike — the customs house and the market both sit on the quay.
export function blockadeIncomeMult(ctx, tag) {
  return blockadedState(ctx, tag) ? clamp(num(EMBARGO.blockadeIncomeMult, 0.35), 0, 1) : 1;
}

// ---------------------------------------------------------------- the actions
export function embargoInfo(ctx, me, other) {
  const g = ctx.game;
  const mine = g.tags[me], them = g.tags[other];
  const out = {
    offered: mechanicOn(ctx, 'embargo') && !!(ctx.bookmark && ctx.bookmark.diplomacy
      && ctx.bookmark.diplomacy.embargo),
    active: !!embargoActive(ctx, me, other),
    blockade: !!(embargoActive(ctx, me, other) || {}).blockade,
    canBlockade: false, why: '', whyBlockade: '',
    name: (them && them.name) || other,
  };
  if (!out.offered || !mine || !them || !them.alive || me === other) {
    out.why = 'This age does not close its markets by decree.';
    return out;
  }
  if (mine.overlord === other || them.overlord === me) {
    out.why = 'We do not embargo our own house.';
    return out;
  }
  // A blockade needs hulls: a court with no navy is writing a letter, not
  // stopping a ship.
  const fleets = Object.values(g.fleets || {}).filter((f) => f && f.tag === me && num(f.ships) > 0);
  out.canBlockade = out.active && fleets.length > 0;
  if (!out.active) out.whyBlockade = 'Close the markets first.';
  else if (!fleets.length) out.whyBlockade = 'A blockade takes hulls, and we have none at sea.';
  return out;
}

export function declareEmbargoCore(ctx, from, to, opts = {}) {
  const g = ctx.game;
  if (!g.tags[from] || !g.tags[to] || from === to) return { ok: false, why: 'There is no such court.' };
  if (!g.embargoes || typeof g.embargoes !== 'object') g.embargoes = {};
  const key = embargoKey(from, to);
  const had = g.embargoes[key];
  const blockade = !!opts.blockade;
  if (had && (!blockade || had.blockade)) return { ok: false, why: 'Our markets are already closed to them.' };
  g.embargoes[key] = { y: g.date.y, m: g.date.m, blockade: blockade || !!(had && had.blockade) };
  addOpinion(ctx, to, from, EMBARGO.declareOpinion);
  const fromName = g.tags[from].name || from;
  const toName = g.tags[to].name || to;
  chronicle(ctx, 'diplomacy', blockade
    ? fromName + ' declares a blockade of ' + toName + ': the approaches are closed and the harbors stop earning.'
    : fromName + ' closes its markets to ' + toName + '.');
  if (ctx.bus) ctx.bus.emit('diplomacy', { kind: blockade ? 'blockade' : 'embargo', a: from, b: to });
  return { ok: true, blockade, name: toName };
}

export function liftEmbargoCore(ctx, from, to) {
  const g = ctx.game;
  const key = embargoKey(from, to);
  if (!g.embargoes || !g.embargoes[key]) return { ok: false, why: 'There is nothing to lift.' };
  delete g.embargoes[key];
  addOpinion(ctx, to, from, EMBARGO.liftOpinion);
  const toName = (g.tags[to] && g.tags[to].name) || to;
  chronicle(ctx, 'diplomacy', ((g.tags[from] && g.tags[from].name) || from)
    + ' reopens its markets to ' + toName + '.');
  if (ctx.bus) ctx.bus.emit('diplomacy', { kind: 'embargoEnded', a: from, b: to });
  return { ok: true, name: toName };
}

// A dead court embargoes nobody; a war supersedes the letter with the thing
// itself. Runs monthly so the book never accumulates ghosts.
export function sweepEmbargoes(ctx) {
  const g = ctx.game;
  if (!g.embargoes) return;
  for (const key of Object.keys(g.embargoes)) {
    const at = key.indexOf('>');
    if (at < 0) { delete g.embargoes[key]; continue; }
    const from = key.slice(0, at), to = key.slice(at + 1);
    const a = g.tags[from], b = g.tags[to];
    if (!a || !a.alive || !b || !b.alive) delete g.embargoes[key];
  }
}

// ---------------------------------------------------------------- the AI
// In an age without leagues, a court that detests a neighbor reaches for the
// instrument it actually has. Embargoes are cheap and reversible, so the AI
// signs them readily; a blockade is an act of state and wants both a navy and
// real hatred.
export function monthlyEmbargoAI(ctx) {
  const g = ctx.game;
  if (!(ctx.bookmark && ctx.bookmark.diplomacy && ctx.bookmark.diplomacy.embargo)) return;
  sweepEmbargoes(ctx);
  for (const from of Object.keys(g.tags)) {
    const a = g.tags[from];
    if (!a || !a.alive || from === 'REB' || a.overlord) continue;
    if (from === g.playerTag && !a.ai) continue; // the player signs their own letters
    for (const to of Object.keys(g.tags)) {
      const b = g.tags[to];
      if (!b || !b.alive || to === from || to === 'REB') continue;
      try {
        const op = opinionOf(ctx, from, to);
        const cur = embargoActive(ctx, from, to);
        const atWar = (a.atWarWith || []).indexOf(to) >= 0;
        // Warmth reopens the markets on its own — nobody keeps a blockade
        // against a state its own court has come to like. And once the guns
        // are out, the letter is redundant: the war IS the embargo.
        if (cur && (op > -20 || atWar)) { liftEmbargoCore(ctx, from, to); continue; }
        if (atWar || op > EMBARGO.minOpinionToDeclare) continue;
        // A court runs a couple of these at a time, not a trade war with the
        // whole map — the instrument is political, and politics has a budget.
        let outgoing = 0;
        for (const key of Object.keys(g.embargoes || {})) {
          if (key.indexOf(from + '>') === 0) outgoing++;
        }
        if (!cur && outgoing >= num(EMBARGO.aiMaxOutgoing, 2)) continue;
        if (!ctx.rng.chance(EMBARGO.aiChance)) continue;
        if (!cur) { declareEmbargoCore(ctx, from, to); continue; }
        if (cur.blockade || op > EMBARGO.blockadeOpinion) continue;
        const fleets = Object.values(g.fleets || {}).filter((f) => f && f.tag === from && num(f.ships) > 0);
        if (!fleets.length) continue;
        declareEmbargoCore(ctx, from, to, { blockade: true });
      } catch (e) { warnOnce('ai:' + from + '>' + to, 'embargo AI failed', e); }
    }
  }
}

// The ledger's own sentence about why the customs houses are quiet.
export function embargoSummary(ctx, tag) {
  const list = embargoesOn(ctx, tag);
  if (!list.length) return null;
  const g = ctx.game;
  const names = list.map((e) => (g.tags[e.from] && g.tags[e.from].name) || e.from);
  return {
    count: list.length,
    blockade: list.some((e) => e.blockade),
    names,
    tradeMult: embargoTradeMult(ctx, tag),
    portMult: blockadeIncomeMult(ctx, tag),
  };
}
