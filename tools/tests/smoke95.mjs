// Headless regression — SPEC §144: a war has a life before it has an exit.
//
// Reported: "the Seleucids just declared war on me... only to immediately offer
// a white peace?" They did, and it reproduced in one month.
//
// `monthlyWarDiplomacy` gave a losing AI leader two roads to sue the player:
// a ROUT (warscore <= -40) or WEARINESS (warscore <= -10 and warExhaustion past
// a caution-scaled bar). The weariness road had no clock on it, and
// `warExhaustion` is a standing quantity rather than this war's ledger — so a
// power that arrived already tired from somewhere else could open a war and ask
// to be let out of it the following month, at a score where the terms it would
// accept are nothing at all.
//
// The Seleucids are the sharpest case because their 167 wars are SCRIPTED,
// which bypasses `aiConsiderWar`'s `warExhaustion > 5` gate on declaring. They
// could enter at 18 weariness, lose one skirmish, and sue.
//
// The asymmetry is the fix: a court being routed still sues the moment the rout
// happens; a court that is merely tired must have actually fought this war.
//
//   1. The report, reproduced: weary + a small early setback = no card now.
//   2. The clock: silence before the grace, and the feeler after it.
//   3. A rout is exempt in month one, because that is a real collapse.
//   4. The same asymmetry on the separate-peace road, which fires at ws >= 0
//      and so had a standing start.
//   5. The grace is a define, not a magic number, and the AI-vs-AI settlement
//      horizon it sits beside is untouched.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { declareWar } = await import(R + '/js/sim/military.js');
const { runMonthlyAI } = await import(R + '/js/sim/ai.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const flatGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};

const GRACE = DEFINES.BALANCE.warSueGraceMonths;

// A 167 BCE world with exactly one war in it: the one the report describes.
function stage({ exhaustion, ws }) {
  const era = ERAS.find((e) => e.bookmark.id === '167bce');
  const b = era.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, b);
  const game = initGame({
    DEFINES, MAP_DATA, geom: flatGeom, bookmark: b, events: era.events,
    playerTag: 'HAS', rngSeed: 3, provinceMap,
  });
  const feelers = [];
  const bus = {
    emit(k, p) {
      if (k === 'notify' && p && /sues for peace/.test(p.title || '')) feelers.push(p.title);
      if (k === 'event' && p && p.ev && /separate peace/.test(p.ev.title || '')) feelers.push(p.ev.title);
    },
    on() { return () => {}; },
  };
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: flatGeom, bus,
    bookmark: b, events: era.events, provinceMap,
  });
  game.tags.HAS.ai = false;   // a human is in this war, or none of it applies
  game.wars = [];
  for (const t of Object.values(game.tags)) if (t) t.atWarWith = [];
  game.tags.SEL.warExhaustion = exhaustion;
  const war = declareWar(ctx, 'SEL', 'HAS', 'The Seleucid War', 'conquest');
  war.warscore = war.warscore || {};
  war.warscore.SEL = ws;
  war.warscore.HAS = -ws;
  // Run the world forward a month at a time and record when a feeler arrives.
  const run = (months) => {
    const seen = [];
    for (let m = 1; m <= months; m++) {
      game.date.m += 1;
      if (game.date.m > 12) { game.date.m = 1; game.date.y += 1; }
      feelers.length = 0;
      try { runMonthlyAI(ctx); } catch (e) { /* the feeler is the subject */ }
      // The staged ledger is the fixture; the sim may move it, so hold it.
      war.warscore.SEL = ws;
      war.warscore.HAS = -ws;
      if (feelers.length) seen.push(m);
    }
    return seen;
  };
  return { game, ctx, war, run };
}

// ---------------------------------------------------------------------------
console.log('== the report, reproduced and then refused ==');
{
  // Exhaustion 18 is above every caution-scaled bar in the game (15 / caution,
  // and SEL's caution is 0.9, so 16.7). -12 is one lost skirmish.
  const w = stage({ exhaustion: 18, ws: -12 });
  ok(w.game.tags.SEL.warExhaustion >= 15,
    'the Seleucids enter the war already weary (' + w.game.tags.SEL.warExhaustion + ')');
  ok(w.war && w.war.attackers.indexOf('SEL') >= 0,
    '  and it is THEIR war — they declared it');
  const early = w.run(Math.max(1, GRACE - 1));
  ok(early.length === 0,
    'no peace feeler in the first ' + (GRACE - 1) + ' months of a war they started'
    + (early.length ? ' (fired in month ' + early[0] + ')' : ''));
}

// ---------------------------------------------------------------------------
console.log('== …but the war can still end once it has been a war ==');
{
  const w = stage({ exhaustion: 18, ws: -12 });
  const seen = w.run(GRACE + 8);
  ok(seen.length > 0, 'the weary court does sue eventually');
  ok(seen[0] >= GRACE, '  and not before the grace runs out (first feeler in month ' + seen[0] + ')');
  ok(seen[0] <= GRACE + 1, '  and promptly once it does');
}

// ---------------------------------------------------------------------------
console.log('== a rout is not weariness, and is exempt ==');
{
  // A court being genuinely broken may sue the month it breaks — the grace is
  // only on the road that says "we are tired", never on the one that says
  // "we have lost".
  const w = stage({ exhaustion: 18, ws: -55 });
  const seen = w.run(3);
  ok(seen.length > 0 && seen[0] === 1,
    'a routed court still sues in month one (month ' + (seen[0] || '-') + ')');
}
{
  // …and a rout with no weariness at all is still a rout.
  const w = stage({ exhaustion: 0, ws: -55 });
  const seen = w.run(3);
  ok(seen.length > 0 && seen[0] === 1, '  even one that is not tired at all');
}

// ---------------------------------------------------------------------------
console.log('== a court that is neither beaten nor tired says nothing ==');
{
  const w = stage({ exhaustion: 0, ws: -12 });
  const seen = w.run(GRACE + 8);
  ok(seen.length === 0,
    'a fresh court losing narrowly does not sue at all, grace or no grace');
}

// ---------------------------------------------------------------------------
console.log('== the grace is a define, and it does not disturb its neighbours ==');
{
  ok(Number.isFinite(GRACE) && GRACE > 0,
    'BALANCE.warSueGraceMonths is a real number (' + GRACE + ')');
  const src = await import('node:fs').then((fs) =>
    fs.readFileSync(R + '/js/sim/ai.js', 'utf8'));
  ok(/warSueGraceMonths/.test(src), 'the AI reads it rather than a literal');
  // The separate-peace road fires at ws >= 0 — a standing start — so it needed
  // the same asymmetry: beaten knocks at once, weary waits.
  ok(/const beaten = row\.ws >= separatePeaceThreshold/.test(src)
    && /weary >= 15 && row\.ws >= 0 && graceMet/.test(src),
  'the separate-peace road carries the same asymmetry');
  // The AI-vs-AI settlement horizon is a different clock and stays put.
  ok(/months < num\(w\.settleMonths, 36\)/.test(src),
    'and the 36-month AI-vs-AI settlement horizon is untouched');
}

console.log(failures ? `smoke95: ${failures} FAIL` : 'smoke95: ALL PASS');
process.exit(failures ? 1 : 0);
