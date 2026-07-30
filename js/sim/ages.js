// Judaea Universalis — the character of the age (SPEC §168). DOM-free.
//
// WHY THIS FILE EXISTS. The 167 BCE chapter runs a hundred and seventy-three
// years, to 6 CE. Faction windowing (SPEC §127) already knew that the people in
// the room change over that span — the Hasideans leave and the Pharisees and
// Sadducees arrive. But the WORLD did not change over it. A campaign in 160 BCE
// and the same campaign in 1 BCE played by identical rules: client kingship
// worked the same, annexation cost the same, the peace table offered the same
// menu. The only difference was which people were alive.
//
// That is the one structural thing separating this from a game where 1444 and
// 1750 feel like different centuries. And for THIS map the change is not a
// matter of taste, it is the actual subject: the eastern Mediterranean went
// from a world of Hellenistic kingdoms — where a client king was a durable
// legal status a dynasty could hold for two centuries — to a world of Roman
// provinces, where being a client meant being in a waiting room. Herod died a
// king; his son was deposed and the country became a prefecture ten years
// later. Nobody's stats changed. The rules did.
//
// WHAT AN AGE DOES. Very little, deliberately, and all of it to ONE thing:
// what happens to a client kingdom over time.
//
//   THE AGE OF KINGDOMS   a client is a client. Nothing erodes.
//   THE AGE OF PROVINCES  a client accumulates absorption pressure every month
//                         it stays a client, and when the pressure fills, its
//                         overlord annexes it — through the ordinary §61
//                         incorporation machinery, so the client's land, court
//                         and army are handled exactly as any union handles
//                         them. A client that is strong, popular or useful
//                         resists; a small dependent one does not.
//   THE AGE OF THE FAITHS the pressure eases: the caliphates and the empire
//                         ruled through tributary princes again, and a client
//                         that pays and prays is left alone.
//   THE AGE OF NATIONS    it returns, and harder. A protectorate in 1948 is a
//                         thing with a date on it.
//
// The player is never annexed by this clock without a say: an absorption that
// would swallow the PLAYER's realm arrives as pressure the player can see and
// answer, and the player's own clients give the player the choice. It is the
// AI-to-AI case that resolves silently, which is where most of the world is.
//
// WHY IT IS NOT A MODIFIER PACK. It would have been easy to give each age a
// list of stat effects. That is exactly the mistake §166 made and had to undo:
// eight chapters were balanced without this file, and an age that quietly
// hands every court +6% income has rewritten all of them. An age changes a
// RULE, not a number.

import { num, clamp, chronicle, livingTag, opinionOf } from './military.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/ages]', ...args);
}

// Boundaries are years, BCE negative. They are the dates the RULE changed, not
// the dates a textbook opens a chapter: −63 is Pompey's settlement of the East,
// the year the region acquired a power that annexed clients as policy; 640 is
// the conquest, after which it did not for four centuries; 1878 is Berlin,
// after which a protectorate is a stage rather than a station.
export const AGES = [
  {
    id: 'kingdoms',
    name: 'The Age of Kingdoms',
    until: -63,
    blurb: 'Client kingship is a status a house can hold for two centuries. Nobody annexes what already pays.',
    absorbPerMonth: 0,
  },
  {
    id: 'provinces',
    name: 'The Age of Provinces',
    until: 640,
    blurb: 'A client kingdom is a waiting room. The empire prefers a governor, and every year makes that preference cheaper to act on.',
    absorbPerMonth: 1,
  },
  {
    id: 'faiths',
    name: 'The Age of the Faiths',
    until: 1878,
    blurb: 'Empires rule through princes again. A tributary that pays and prays is left where it is.',
    absorbPerMonth: 0.25,
  },
  {
    id: 'nations',
    name: 'The Age of Nations',
    until: null,
    blurb: 'A protectorate is a stage, not a station — and it has a date on it.',
    absorbPerMonth: 1.4,
  },
];

export const AGE = {
  // Pressure needed before an overlord moves. At 1 point a month that is
  // twenty-five years of unbroken clientage in the Age of Provinces — Herod
  // reigned thirty-three and his son lasted ten, so the shape is about right.
  absorbAt: 300,
  // What holds it off. Each is a fraction of the monthly pressure removed.
  resistLarge: 0.5, // a client that is at least half its lord's size
  resistLoved: 0.35, // …or genuinely devoted to it
  resistAtWar: 1, // …or fighting the lord's war right now
  // …and what hurries it.
  hurryTiny: 0.5, // a client under a quarter of its lord's size
};

function yearsAt(y) { return y < 0 ? y + 1 : y; }

export function ageAt(year) {
  const y = yearsAt(num(year));
  for (const a of AGES) {
    if (a.until === null) return a;
    if (y < yearsAt(a.until)) return a;
  }
  return AGES[AGES.length - 1];
}

export function currentAge(ctx) {
  return ageAt(ctx.game.date.y);
}

// The panel's read.
export function ageReport(ctx) {
  try {
    const a = currentAge(ctx);
    const i = AGES.indexOf(a);
    const next = i >= 0 && i + 1 < AGES.length ? AGES[i + 1] : null;
    return {
      id: a.id,
      name: a.name,
      blurb: a.blurb,
      annexes: a.absorbPerMonth > 0,
      turnsAt: a.until,
      nextName: next ? next.name : null,
    };
  } catch (e) { warnOnce('report', 'ageReport failed', e); return null; }
}

function devOf(ctx, tag) {
  const g = ctx.game;
  let d = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag) continue;
    d += p.dev ? num(p.dev.tax) + num(p.dev.prod) + num(p.dev.mp) : 0;
  }
  return d;
}

// How fast this particular client is being digested, 0 upward.
export function absorbRate(ctx, clientTag) {
  const g = ctx.game;
  const t = g.tags[clientTag];
  if (!t || !t.alive || !t.overlord) return 0;
  const lord = g.tags[t.overlord];
  if (!lord || !lord.alive) return 0;
  let rate = num(currentAge(ctx).absorbPerMonth);
  if (rate <= 0) return 0;
  // A client already being woven into a union by the ordinary §61 machinery is
  // not ALSO being digested by the calendar.
  if (t.incorporating || lord.incorporating) return 0;
  const mine = devOf(ctx, clientTag);
  const theirs = Math.max(1, devOf(ctx, t.overlord));
  const share = mine / theirs;
  if (share >= 0.5) rate *= 1 - AGE.resistLarge;
  else if (share <= 0.25) rate *= 1 + AGE.hurryTiny;
  if (opinionOf(ctx, clientTag, t.overlord) >= 100) rate *= 1 - AGE.resistLoved;
  const lordAtWar = (lord.atWarWith || []).some((k) => g.tags[k] && g.tags[k].alive);
  const clientAtWar = (t.atWarWith || []).some((k) => g.tags[k] && g.tags[k].alive);
  if (lordAtWar && clientAtWar) rate *= 1 - AGE.resistAtWar; // useful right now
  return Math.max(0, rate);
}

// What the client and the lord can both see: how far along this is.
export function absorbReport(ctx, clientTag) {
  try {
    const t = ctx.game.tags[livingTag(ctx, clientTag)];
    if (!t || !t.overlord) return null;
    const rate = absorbRate(ctx, t.tag);
    const at = num(t.absorbPressure);
    const lord = ctx.game.tags[t.overlord];
    return {
      tag: t.tag,
      overlord: t.overlord,
      overlordName: (lord && lord.name) || t.overlord,
      pressure: Math.round(at),
      of: AGE.absorbAt,
      rate: Math.round(rate * 100) / 100,
      monthsLeft: rate > 0 ? Math.max(0, Math.ceil((AGE.absorbAt - at) / rate)) : null,
      age: currentAge(ctx).name,
    };
  } catch (e) { warnOnce('absorb', 'absorbReport failed', e); return null; }
}

// The overlord takes the crown off the client and rules the land directly.
// Everything about HOW is the §61 union's business; this only starts it, so
// there is one path by which a client stops being a client.
function absorb(ctx, clientTag) {
  const g = ctx.game;
  const t = g.tags[clientTag];
  const lordTag = t.overlord;
  const lord = g.tags[lordTag];
  if (!lord || !lord.alive) return false;
  t.absorbPressure = 0;
  // The ordinary union, started by the calendar rather than by a purse. Its
  // own monthly clock finishes it, unravels it if the client's court turns,
  // and hands over land, treasury and army on completion.
  const V = ctx.DEFINES.VASSALS || {};
  let dev = devOf(ctx, clientTag);
  const months = Math.max(1, Math.round(num(V.incorporateMonthsBase, 12) + dev * num(V.incorporateMonthsPerDev, 0.5)));
  t.incorporating = { by: lordTag, monthsLeft: months, byCalendar: true };
  chronicle(ctx, 'politics',
    (lord.name || lordTag) + ' begins to rule ' + (t.name || clientTag)
    + ' directly: in ' + currentAge(ctx).name.toLowerCase() + ', a client kingdom is a waiting room.');
  try {
    if (ctx.bus && (lordTag === g.playerTag || clientTag === g.playerTag)) {
      ctx.bus.emit('notify', {
        title: clientTag === g.playerTag ? 'The crown is being taken off us' : 'A kingdom becomes a province',
        text: clientTag === g.playerTag
          ? (lord.name || lordTag) + ' has begun to absorb this kingdom outright. Grow, be useful, or be devoted — or stop being a client.'
          : (t.name || clientTag) + ' is being taken into direct rule.',
        type: clientTag === g.playerTag ? 'bad' : 'info',
      });
    } else if (ctx.bus) {
      ctx.bus.emit('notify', {
        title: 'News from abroad',
        text: (t.name || clientTag) + ' is being taken into direct rule by ' + (lord.name || lordTag) + '.',
        type: 'info',
      });
    }
  } catch (e) { warnOnce('notify', 'absorb notice failed', e); }
  return true;
}

let _lastAge = null;
export function monthlyAges(ctx) {
  const g = ctx.game;
  if (!g || !g.tags) return;
  try {
    const age = currentAge(ctx);
    if (g.flags._age !== age.id) {
      const was = g.flags._age;
      g.flags._age = age.id;
      // Not on the first month of a campaign — a chapter opening in an age has
      // not just entered it.
      if (was) {
        chronicle(ctx, 'world', age.name + ' begins. ' + age.blurb);
        try {
          if (ctx.bus) ctx.bus.emit('notify', { title: age.name, text: age.blurb, type: 'info' });
        } catch (e) { warnOnce('agenotify', 'age notice failed', e); }
      }
    }
    _lastAge = age.id;
  } catch (e) { warnOnce('age', 'age roll failed', e); }

  for (const tag of Object.keys(g.tags)) {
    try {
      const t = g.tags[tag];
      if (!t || !t.alive || !t.overlord || tag === 'REB') continue;
      const rate = absorbRate(ctx, tag);
      if (rate <= 0) {
        // Pressure bleeds off in an age that does not digest clients, so a
        // kingdom that survives into the Age of the Faiths is not still
        // carrying two centuries of Roman appetite.
        t.absorbPressure = Math.max(0, num(t.absorbPressure) - 1);
        continue;
      }
      t.absorbPressure = num(t.absorbPressure) + rate;
      if (t.absorbPressure >= AGE.absorbAt) absorb(ctx, tag);
    } catch (e) { warnOnce('tick:' + tag, 'absorb tick failed', e); }
  }
}
