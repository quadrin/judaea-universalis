// js/sim/ambient.js — the world murmurs (SPEC §272). DOM-free.
//
// A card interrupts. That is what a card is FOR, and it is why there can only
// ever be so many of them: every modal is a claim on the player's attention,
// and a game that makes twenty claims a year about nothing teaches the player
// to dismiss the twenty-first without reading it.
//
// But the complaint that a chapter is quiet is rarely a complaint that too
// little is DECIDED. It is a complaint that too little is HAPPENING — that
// between the Seleucid ultimatum and the battle at Beth-Zur there are four
// years in which the country appears to contain nobody but the player's own
// armies. The fix for that is not more decisions. It is a world that is
// audible when nothing is being decided.
//
// So: the murmur. A murmur has no options, no modal and no button. It writes
// one line — the grain price at Ptolemais, a caravan in from Tayma, a bishop
// deposed in a city three weeks' ride away, the first swallows over the
// lake — and, where it earns one, a small effect. It costs nothing to read
// and nothing to ignore, and the campaign accumulates a dateline the player
// can scroll.
//
// THE MURMUR COSTS THE SEEDED STREAM NOTHING. This is the load-bearing
// property and the reason this file has a hash function in it. §223 found the
// rule the hard way: a card that rolls `ev.chance` every month moves the
// shared stream's position for everything drawn after it, so a pool that
// mostly does not fire still changes every battle, every AI settlement and
// every harvest in every campaign of every chapter — and the balance harness
// comes back with a different world merely because the pool exists. What this
// reads instead is where the stream currently STANDS, mixed with the month:
// a number that already varies with everything that has happened, whose
// reading advances nothing. `node tools/autorun.mjs` therefore draws the same
// world with the whole ambient layer in place as it drew without it, and the
// only balance change §272 makes is the one it means to make — the season.
//
// A murmur that moves a number is still free of the stream, because its
// effect is a function of what it already knows (the province it names, the
// month, the realm's own ledger) rather than of a draw. Where a murmur wants
// a choice of subject it takes it from the same hash.

import { chronicle, num } from './military.js';
import { AMBIENT_MURMURS } from '../data/ambient.js';
import { seasonKeyOf } from './seasons.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/ambient]', ...args);
}

export const AMBIENT = {
  // How often the world says something. Not every month: a dateline with an
  // entry in all twelve months of every year reads as wallpaper, and the
  // silence between murmurs is what makes the next one land.
  chancePerMonth: 0.55,
  // A murmur may not repeat inside this many months. Six years: long enough
  // that the pool does not visibly cycle, short enough that the smaller of
  // the two era bands does not run dry and leave a decade silent. Measured —
  // at 96 months the 1948 dateline fell to seventeen lines in ten years
  // because only the modern band was eligible and it was all on cooldown.
  cooldownMonths: 72,
  // How many lines the dateline keeps. Deliberately its OWN ring rather than
  // the chronicle's: the chronicle caps at 400 entries and holds the things
  // that actually happened, and a murmur every other month for three hundred
  // years would flush the fall of the Temple out of it to make room for the
  // price of barley. They are different books and they are kept apart.
  logCap: 80,
};

function monthIndex(d) {
  const year = d.y > 0 ? d.y - 1 : d.y;
  return year * 12 + (d.m - 1);
}

// The free draw (see the header). murmur3's finalizer over the stream's
// current position and a salt: deterministic across a save, a replay and a
// multiplayer relay, because `rngState` is part of the saved game — and
// reading it advances nothing.
function freeDraw(ctx, salt) {
  let h = ((num(ctx.game.rngState) >>> 0) ^ Math.imul((salt | 0) + 1, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Which murmurs could be said this month: the era band, the season, the
// cooldown, and the murmur's own `when`.
function eligible(ctx) {
  const g = ctx.game;
  const now = monthIndex(g.date);
  const season = seasonKeyOf(g.date);
  const book = (g.flags && g.flags._ambCd) || {};
  const out = [];
  for (const m of AMBIENT_MURMURS) {
    if (!m || !m.id || typeof m.text !== 'function') continue;
    if (Number.isFinite(m.minYear) && g.date.y < m.minYear) continue;
    if (Number.isFinite(m.maxYear) && g.date.y > m.maxYear) continue;
    if (m.season && m.season !== season) continue;
    const until = book[m.id];
    if (Number.isFinite(until) && now < until) continue;
    if (typeof m.when === 'function') {
      let ok = false;
      try { ok = !!m.when(ctx); } catch (e) { warnOnce('when:' + m.id, 'murmur when() threw', m.id, e); continue; }
      if (!ok) continue;
    }
    out.push(m);
  }
  return out;
}

// Weighted pick over the free draw. Weight defaults to 1, so a pool that
// never sets one is a flat pick — the weights exist for the handful of
// murmurs that should be common (the market, the road) against the handful
// that should be rare (a king dies abroad).
function pick(list, roll) {
  let total = 0;
  for (const m of list) total += Math.max(0.01, num(m.weight, 1));
  let t = roll * total;
  for (const m of list) {
    t -= Math.max(0.01, num(m.weight, 1));
    if (t <= 0) return m;
  }
  return list[list.length - 1] || null;
}

function push(ctx, entry) {
  const g = ctx.game;
  if (!Array.isArray(g.murmurs)) g.murmurs = [];
  g.murmurs.push(entry);
  if (g.murmurs.length > AMBIENT.logCap) {
    g.murmurs.splice(0, g.murmurs.length - AMBIENT.logCap);
  }
}

export function monthlyAmbient(ctx) {
  const g = ctx && ctx.game;
  if (!g || !g.tags || g.over) return;
  try {
    // The murmur is addressed to whoever is reading, so an all-AI harness run
    // has nobody to say it to and says nothing — which is also what keeps the
    // harness's output identical with this file present and absent.
    const me = g.playerTag;
    const t = g.tags[me];
    if (!t || !t.alive || t.ai) return;

    const now = monthIndex(g.date);
    if (freeDraw(ctx, now * 2 + 1) > AMBIENT.chancePerMonth) return;

    const list = eligible(ctx);
    if (!list.length) return;
    const chosen = pick(list, freeDraw(ctx, now * 2 + 2));
    if (!chosen) return;

    let text = '';
    try { text = String(chosen.text(ctx) || ''); }
    catch (e) { warnOnce('text:' + chosen.id, 'murmur text() threw', chosen.id, e); return; }
    if (!text) return;

    // A murmur that carries an effect applies it here, inside the same guard.
    if (typeof chosen.effect === 'function') {
      try { chosen.effect(ctx); }
      catch (e) { warnOnce('effect:' + chosen.id, 'murmur effect() threw', chosen.id, e); }
    }

    if (!g.flags) g.flags = {};
    if (!g.flags._ambCd) g.flags._ambCd = {};
    g.flags._ambCd[chosen.id] = now + num(chosen.cooldownMonths, AMBIENT.cooldownMonths);

    const kind = typeof chosen.kind === 'string' ? chosen.kind : 'note';
    push(ctx, { y: g.date.y, m: g.date.m, kind, text, id: chosen.id });

    // Seen live, quietly. The toast type is its own so the chrome can style
    // it down: a murmur must never read like a notice the player has to act
    // on, or it is just a card with the buttons filed off.
    try {
      if (ctx.bus) ctx.bus.emit('notify', { title: chosen.title || 'Word reaches the court', text, type: 'murmur' });
    } catch (e) { warnOnce('toast', 'murmur toast failed', e); }

    // …and the ones that are actually history go in the real book too. A
    // murmur sets `record: true` only when it names something a chronicler a
    // century later would still have written down.
    if (chosen.record) {
      try { chronicle(ctx, kind, text); } catch (e) { warnOnce('chron', 'murmur chronicle failed', e); }
    }
  } catch (e) { warnOnce('tick', 'monthlyAmbient failed', e); }
}

export function murmurLog(ctx) {
  try {
    const g = ctx && ctx.game;
    return Array.isArray(g && g.murmurs) ? g.murmurs.slice() : [];
  } catch (e) { warnOnce('log', 'murmurLog failed', e); return []; }
}
