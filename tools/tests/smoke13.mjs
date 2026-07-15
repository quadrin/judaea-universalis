// Headless smoke test — v2.5: government types (republics vote, theocracies
// never crown a child, Rome is a republic until the emperors, formables bring
// their constitution) and era units (motorized march, modern siege firepower).
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_67 } = await import(R + '/js/data/bookmark_67bce.js');
const { EVENTS_67 } = await import(R + '/js/data/events_67bce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { EVENTS_1948 } = await import(R + '/js/data/events_1948.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const realm = await import(R + '/js/sim/realm.js');
const mil = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const makeGeom = () => ({
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [],
});

// ---- 67 BCE: republican Rome, theocratic Hyrcanus ------------------------------
const geom = makeGeom();
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_67, events: EVENTS_67, playerTag: 'HYR', rngSeed: 30 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_67, events: EVENTS_67 });
gameActions(ctx);

console.log('== constitutions of 67 BCE ==');
ok(game.tags.ROM.govType === 'republic', 'Rome is a republic: ' + game.tags.ROM.govType);
ok(game.tags.HYR.govType === 'theocracy', 'Hyrcanus rules a theocracy: ' + game.tags.HYR.govType);
ok(game.tags.ARI.govType === 'monarchy', 'Aristobulus a monarchy: ' + game.tags.ARI.govType);
ok(game.tags.ROM.ideas.incomeMult > game.tags.ARI.ideas.incomeMult, 'the republic\'s civic economy shows in the ideas');

console.log('== the republic votes ==');
const rom = game.tags.ROM;
const oldConsul = rom.ruler.name;
rom.electionIn = 1;
realm.monthlySuccession(ctx);
ok(rom.electionIn === 48, 'the election resets the clock: ' + rom.electionIn);
ok(!rom.heir && !rom.regency, 'republics know no heirs');
ok(game.chronicle.some((e) => e.kind === 'ruler' && /election|returned to office/.test(e.text)),
  'the vote is chronicled: ' + game.chronicle.filter((e) => /office|election/.test(e.text)).slice(-1).map((e) => e.text));

console.log('== a president dies in office ==');
rom.ruler.age = 80;
const before = rom.ruler.name;
realm.rulerDies(ctx, 'ROM', 'has died suddenly');
ok(rom.ruler.name !== before && !rom.regency, 'an emergency election, never a regency: ' + rom.ruler.name);

console.log('== the elders will not anoint a child ==');
const hyr = game.tags.HYR;
hyr.heir = { name: 'A Child Heir', gov: 2, infl: 2, mar: 2, age: 5 };
realm.rulerDies(ctx, 'HYR', 'has died');
ok(!hyr.regency, 'no regency in a theocracy');
ok(hyr.ruler.name !== 'Regency Council' && hyr.ruler.age >= 50, 'an elder takes the office: '
  + hyr.ruler.name + ', age ' + hyr.ruler.age);
ok(hyr.heir && hyr.heir.name === 'A Child Heir', 'the young heir still waits their turn');

console.log('== era units: march and firepower ==');
const a1 = { gen: 0 }, a5 = { gen: 5 };
const from = ctx.provId('Jerusalem'), to = ctx.provId('Jericho');
const slow = mil.hopDays(ctx, from, to, a1);
const fast = mil.hopDays(ctx, from, to, a5);
ok(fast < slow, 'trucks beat sandals: ' + slow + ' days vs ' + fast);
ok(mil.genSpeed(2) === 1 && mil.genSpeed(5) === 1.5, 'antiquity marches as it always did');

// ---- 1948: republics + formables carry the constitution -----------------------
console.log('== 1948 constitutions ==');
const geom2 = makeGeom();
const g48 = initGame({ DEFINES, MAP_DATA, geom: geom2, bookmark: BOOKMARK_1948, events: EVENTS_1948, playerTag: 'JOR', rngSeed: 31 });
const ctx48 = makeCtx({ game: g48, DEFINES, MAP_DATA, geom: geom2, bus, bookmark: BOOKMARK_1948, events: EVENTS_1948 });
const actions48 = gameActions(ctx48);
ok(g48.tags.ISR.govType === 'republic', 'Israel is a republic');
ok(g48.tags.JOR.govType === 'monarchy', 'Transjordan a monarchy');
ok(g48.tags.SYR.govType === 'republic' && g48.tags.EGY.govType === 'monarchy', 'Syria votes, Farouk reigns');

console.log('== a proclaimed republic votes ==');
for (let i = 1; i < g48.provinces.length; i++) {
  const p = g48.provinces[i];
  if (!p || p.impassable) continue;
  if (p.owner === 'ISR' && p.canon !== 'Masada' && p.canon !== 'Engaddi') { p.owner = 'JOR'; p.controller = 'JOR'; }
  if (p.owner === 'JOR') p.controller = 'JOR';
}
actions48.enactDecision('form_uar_jor');
ok(g48.tags.UAR && g48.tags.UAR.govType === 'republic', 'the UAR takes its constitution: ' + g48.tags.UAR.govType);
ok(!g48.tags.UAR.heir && !g48.tags.UAR.regency, 'the king\'s heirs do not survive the proclamation');

console.log('== saves heal ==');
const old = JSON.parse(JSON.stringify(game));
for (const k of Object.keys(old.tags)) { delete old.tags[k].govType; delete old.tags[k].electionIn; }
const revived = reviveGame(old);
const ctxR = makeCtx({ game: revived, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_67, events: EVENTS_67 });
ok(ctxR.game.tags.ROM.govType === 'republic', 'pre-government saves heal to the bookmark\'s constitutions');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
