// Judaea Universalis — marginalia (SPEC §223). The notes in the chronicle's
// margin: cards that belong to no chapter and to no band, gated on something
// the world happens to still HAVE rather than on the year, the crown or the
// size of the realm. Content package: zero imports; all effects run through
// ctx.helpers.
//
// One card so far, and it is bounded the way §217's robbers' court is bounded:
// one town, one decade, once a campaign, nothing it hands over large enough to
// be a strategy, and not one number taken out of the seeded stream (see
// `freeDraw`). Where it differs from that easter egg is that this one always
// arrives — on a month of its own per campaign, but it arrives (see
// `ikusOdds`). Its recorded course is that nothing happened — which is also
// what happened — so an all-AI harness run answers it with an empty option and
// `tools/autorun.mjs 8` comes back byte identical.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[data/marginalia]', key, e);
}
// Effects run inside the sim's tick. A content package that throws there takes
// the campaign with it, so every option is wrapped exactly once, here.
function guard(key, fn) {
  return (ctx) => { try { fn(ctx); } catch (e) { warnOnce(key, e); } };
}

function T(ctx) { return ctx.game.tags[ctx.game.playerTag]; }

// The town, if this age still calls it that (SPEC §24). Seven of the eight
// chapters have a Tingis; the 1948 map renames the cell to Tangier, and a card
// about the purple-dyers' town does not belong to a chapter that has no such
// town. The test is deliberately the LABEL rather than the canonical name —
// `ctx.prov('Tingis')` would answer with Tangier, because a renamed province
// keeps answering to the name the map shipped with, and the question here is
// the one a player would ask looking at their own map. A chapter that folds
// the cell away entirely (map_profile's merges leave a null in its place)
// answers no for free.
function tingis(ctx) {
  const provs = (ctx.game && ctx.game.provinces) || [];
  for (let i = 1; i < provs.length; i++) {
    const p = provs[i];
    if (p && !p.impassable && p.name === 'Tingis') return p;
  }
  return null;
}

// Which month of the chapter this is, or −1 outside its first ten years.
// `chapterYears` is the shared packages' own clock (SPEC §148): a card that
// plays in every chapter may not read `ctx.bookmark` for itself, and this one
// does not know which century it is in until it is asked.
const WINDOW_MONTHS = 120;
function monthOfChapter(ctx) {
  let y = 0;
  try { y = ctx.helpers.chapterYears(ctx); } catch (e) { return -1; }
  if (!(y >= 0) || y >= 10) return -1;
  const m = Math.round(y * 12);
  return m >= 0 && m < WINDOW_MONTHS ? m : -1;
}

// A draw that costs the campaign nothing — §217's rule for an easter egg, kept
// here: not one number out of the shared stream.
//
// `ev.chance` would have been the idiomatic way to write this, and it is what
// the generic pool uses. It is also wrong for a card nobody is waiting for: a
// roll every month for ten years, in every campaign of every chapter, moves
// the seeded stream's position for everything drawn after it — every battle,
// every AI settlement, every omen — so the balance harness comes back with a
// different world merely because a card that mostly does not fire exists.
//
// What this reads instead is where the stream currently STANDS, which is a
// number that already varies with everything that has happened in this
// campaign, and reading it advances nothing. Mixed with the month (murmur3's
// finalizer) it gives the card a month of its own per campaign, deterministic
// across a save, a replay and a multiplayer relay because `rngState` is part
// of the saved game — and `node tools/autorun.mjs 8` draws exactly the world
// it drew before.
function freeDraw(ctx, month) {
  let h = ((ctx.game.rngState >>> 0) ^ Math.imul(month + 1, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// The gate, apart from the draw — the month of the chapter in which this card
// MAY be dealt, or −1. Exported because the gate and the schedule are two
// separate claims and `smoke148` holds them apart: a suite that could only see
// the two multiplied together would have to roll a hundred times to test a
// window.
export function ikusWindow(ctx) {
  const m = monthOfChapter(ctx);
  if (m < 0 || !T(ctx) || !tingis(ctx)) return -1;
  return m;
}

// EVERY campaign, once, on a month of its own. The threshold is not a constant
// — at month m of the window it is 1/(120 − m), which is the schedule that
// makes the arrival month uniform across the ten years AND makes it certain:
// one chance in 120 in the opening month, one in two with two months to go,
// and one in one in the last. A card that has not come up yet grows likelier
// precisely as fast as the window shrinks.
//
// A constant 0.5% was the first tuning and it was wrong for this card. It
// dealt the letter to about two campaigns in five, which is the classic
// easter-egg density and also means most players never meet Ikus at all —
// wasted content, and reported as a bug the first time somebody played ten
// years of the Maccabean chapter without seeing it.
//
// The obvious alternative — pick the month from the campaign seed — does not
// work here, and the reason is worth writing down: `main.js` boots every
// single-player campaign with the SAME hardcoded seed (20260711), so a
// seed-derived month would be the identical month in every 167 BCE game
// anybody ever plays. The schedule below draws against `freeDraw` instead,
// which reads where the stream STANDS rather than the seed it started from,
// and that has moved differently by the second month of any two campaigns
// played differently.
export function ikusOdds(month) {
  const left = WINDOW_MONTHS - month;
  return left > 0 ? 1 / left : 1;
}

export const EVENTS_MARGINALIA = [
  {
    id: 'ev_mg_ikus_of_tingis',
    title: 'A Theorem Out of Tingis',
    desc: 'The letter comes up from the west by way of three ports and arrives four months '
      + 'stale. In Tingis, where the purple is boiled, there is a Jew named Ikus who teaches '
      + 'boys their numbers for a fee nobody envies him. He has proved something — the '
      + 'writer calls it a theorem and admits at once that he cannot restate it — and since '
      + 'proving it he has not lost a wager. Not seldom: never. He took the '
      + 'dice-players first, then the men who lend against cargoes, and then the men who are '
      + 'accustomed to standing on the profitable side of that arrangement. The town did not '
      + 'conclude that he could reckon better than it could. The town concluded Jewish '
      + 'magic, and tied him to a post in the market and flogged him there, and the letter '
      + 'closes by asking whether the court has any view on the matter.',
    forTag: 'player',
    // Once a campaign, and only while all three facts hold: a court to hear
    // it, the chapter's first ten years, and a town of that name on the map.
    // No era window on the card, because the province IS the window — this one
    // asks the map what century it is in.
    //
    // Given those three, the letter always comes: `ikusOdds` is the deadline
    // schedule that spreads the arrival uniformly over the decade and still
    // guarantees it. The odds are carried in the trigger rather than in
    // `ev.chance` so that the campaign's own stream is never touched (see
    // `freeDraw`). After the tenth year the whole card is one subtraction a
    // month: `ikusWindow` gives up on the clock before it walks the map.
    trigger: (ctx) => {
      const m = ikusWindow(ctx);
      return m >= 0 && freeDraw(ctx, m) < ikusOdds(m);
    },
    // The recorded course: nothing. No court of this period sent anybody to
    // Mauretania over an arithmetician, and an option that moves no number is
    // also why the balance harness cannot see this card.
    aiOption: 3,
    options: [
      {
        label: 'Send for the man',
        tooltip: '−40 talents for his passage and the fine the town laid on him. '
          + '"Ikus of Tingis" sits down with the assessors: +5% income for eight years.',
        effects: guard('ikus:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -40 });
          h.addTagModifier(ctx, ctx.game.playerTag, {
            id: 'ikus_of_tingis', name: 'Ikus of Tingis', months: 96,
            effects: { incomeMult: 1.05 },
          });
          h.chronicle(ctx, 'era', 'Ikus of Tingis is brought east and seated among the '
            + 'assessors of the revenue. The revenue improves. Nobody at court uses the word theorem.');
        }),
      },
      {
        label: 'Send for the theorem, and never mind the man',
        tooltip: 'A fair copy of the proof, carried east by a clerk who does not understand '
          + 'a line of it: +15 governance points. Ikus stays in Tingis.',
        effects: guard('ikus:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { gov: 15 });
          h.chronicle(ctx, 'era', 'A clerk carries the proof of Ikus of Tingis east and the '
            + 'man himself is left where he was found.');
        }),
      },
      {
        label: 'A letter under our seal, and a purse for his back',
        tooltip: '−25 talents for the man and a protest to whoever governs Tingis: '
          + '+5 legitimacy. A crown that answers for one Jew in a town it will never see is '
          + 'a crown the rest of them can write to.',
        effects: guard('ikus:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, ctx.game.playerTag, { treasury: -25, legitimacy: 5 });
          h.chronicle(ctx, 'era', 'A letter under the seal goes west to Tingis, with a purse '
            + 'for the man they flogged in the market.');
        }),
      },
      {
        label: 'Tingis is a long way from here',
        tooltip: 'The letter is filed. Nothing changes.',
        effects: () => {},
      },
    ],
  },
];
