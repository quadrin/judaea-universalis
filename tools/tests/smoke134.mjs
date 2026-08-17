// Headless smoke test §207/§254: the drumbeat of accomplishment, and its end.
//
// §207 slowed a volley to a drum: at most ONE mission completed per tag per
// monthly pass, and after each completion the chain rested MISSION_PACE_MONTHS
// before the next could land. §254 retired the drum entirely — a metronome
// standing in where a difficulty curve belongs — and gave the tree a measured
// ladder instead, so what spaces a chapter's accomplishments across its years
// is that the things further down are harder.
//
// The suite outlives the rule it was written for, because what §207 was really
// protecting is still a contract and is now stated positively:
//
//   NO VOLLEY OF THE UNEARNED. A branch banks when its terms are met and not
//   before — a parent's completion may unlock a child in the same month, but
//   only a child whose own check is already true.
//   EVERYTHING EARNED, THE MONTH IT IS EARNED. Where the drum paid one and
//   rested two, an AI chain now banks the lot in one pass, re-running while
//   anything lands so an already-met child does not wait a month either.
//   TIES GO TO TABLE ORDER, which is the authors' order and the only order a
//   chain has when two things land together.
//   A HUNGRY MONTH CHARGES NOTHING, and a hand-moved missionIdx keeps its old
//   meaning — both unchanged from §207, and both still worth pinning.
//
// §229 moved the PLAYER off the calendar entirely — a player's chain is
// claimed by hand and smoke154 pins that half. What is left here is the AI's
// half, which is §102's symmetry: a court with no panel to click banks exactly
// what a player could claim in the same month. So the suite plays Rome and
// watches Judaea.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const realm = await import(R + '/js/sim/realm.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1),
  bbox: [],
};
// Rome plays; Judaea is the AI whose drum this suite counts (SPEC §229).
function boot(bookmark, seed) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: EVENTS_66, playerTag: 'ROM', rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: EVENTS_66 });
  return { game, ctx, actions: gameActions(ctx) };
}
const doneList = (t) => (t.missionsDone || []).slice();

console.log('== the drum is retired and answers zero (SPEC §254) ==');
ok(realm.missionPaceMonths() === 0, 'missionPaceMonths reads zero whatever a chapter declares');
ok(realm.missionPaceMonths({ bookmark: { missionPaceMonths: 9 }, DEFINES }) === 0,
  'even for a bookmark that still declares one — the field is read here and means nothing');

// The root is satisfiable by the starting host (26k men over the 20k ask);
// forcing the coast and the diaspora arms both of its children too — three
// objectives a realm has GENUINELY met, which is the case §254 says should
// pay in one month rather than across a year of rests.
function forceBranches(w) {
  // §229 raised the root's muster to 28,000 over the 26,000 the chapter deals.
  for (const a of Object.values(w.game.armies)) if (a && a.tag === 'JUD') a.men += 4000;
  w.ctx.helpers.changeOwner(w.ctx, 'Caesarea Maritima', 'JUD');
  w.game.tags.PAR.opinion = { ...(w.game.tags.PAR.opinion || {}), JUD: 90 };
}

console.log('== everything earned, the month it is earned, in table order ==');
const { game, ctx, actions } = boot(BOOKMARK_66, 42);
{
  forceBranches({ game, ctx });
  realm.checkMissions(ctx);
  ok(doneList(game.tags.JUD).join(',') === 'jm_arm_the_nation,jm_coastal_road,jm_diaspora',
    'one pass banks all three the realm has actually met: ' + doneList(game.tags.JUD));
  ok((game.tags.JUD.missionRest | 0) === 0,
    'and the chain owes no rest afterwards: ' + game.tags.JUD.missionRest);
  const p = actions.getMissionPace();
  ok(p && p.pace === 0 && p.rest === 0, 'getMissionPace reports no drum at all: ' + JSON.stringify(p));
}

console.log('== but never a medallion the realm has not earned ==');
{
  // The same chapter with nothing forced: the root is over the muster on its
  // own, and its children are not. A pass that banks the parent must not go on
  // to bank a child whose check is false.
  const w = boot(BOOKMARK_66, 42);
  for (const a of Object.values(w.game.armies)) if (a && a.tag === 'JUD') a.men += 4000;
  realm.checkMissions(w.ctx);
  ok(doneList(w.game.tags.JUD).join(',') === 'jm_arm_the_nation',
    'the parent lands alone while its children go unmet: ' + doneList(w.game.tags.JUD));
  for (let i = 0; i < 6; i++) realm.checkMissions(w.ctx);
  ok(doneList(w.game.tags.JUD).join(',') === 'jm_arm_the_nation',
    'and six more months of the same world change nothing: ' + doneList(w.game.tags.JUD));
  // …and the moment the terms are met, the child lands in THAT month — not a
  // pace later, which is the whole of §254 in one assertion.
  w.ctx.helpers.changeOwner(w.ctx, 'Caesarea Maritima', 'JUD');
  realm.checkMissions(w.ctx);
  ok(doneList(w.game.tags.JUD).join(',') === 'jm_arm_the_nation,jm_coastal_road',
    'the month the coast is taken, the coast is banked: ' + doneList(w.game.tags.JUD));
}

console.log('== an old save\'s rest is carried, and served to nobody ==');
{
  const revived = reviveGame(JSON.parse(JSON.stringify(game)));
  ok((revived.tags.JUD.missionRest | 0) === 0, 'a §254 save revives owing nothing');
  const raw = JSON.parse(JSON.stringify(game));
  raw.tags.JUD.missionRest = 3;            // a save from before the drum stopped
  raw.tags.JUD.missionsDone = [];
  raw.tags.JUD.missionIdx = 0;
  const old = reviveGame(raw);
  ok((old.tags.JUD.missionRest | 0) === 3, 'a pre-§254 save keeps the field it was written with');
  const w2 = boot(BOOKMARK_66, 42);
  w2.game.tags.JUD.missionRest = 3;
  forceBranches(w2);
  realm.checkMissions(w2.ctx);
  ok(doneList(w2.game.tags.JUD).length === 3 && (w2.game.tags.JUD.missionRest | 0) === 0,
    'and a chain loaded mid-rest banks anyway, the rest cleared rather than served: '
    + doneList(w2.game.tags.JUD).length + ' banked, rest=' + w2.game.tags.JUD.missionRest);
}

console.log('== a month whose checks fail charges no rest ==');
{
  const w = boot(BOOKMARK_66, 7);
  const mine = Object.values(w.game.armies).filter((a) => a && a.tag === 'JUD');
  for (const a of mine) a.men += 4000; // over §229's muster
  const kept = mine.map((a) => a.men);
  for (const a of mine) a.men = 100; // under 20k: the root cannot complete
  for (let i = 0; i < 5; i++) realm.checkMissions(w.ctx);
  ok(doneList(w.game.tags.JUD).length === 0, 'five hungry months bank nothing');
  ok((w.game.tags.JUD.missionRest | 0) === 0, 'and charge no rest — waiting on the world is not resting from it');
  mine.forEach((a, i) => { a.men = kept[i]; });
  realm.checkMissions(w.ctx);
  ok(doneList(w.game.tags.JUD).join(',') === 'jm_arm_the_nation',
    'the month the world answers, the mission lands at once');
}

console.log('== a chapter that still declares a pace is simply ignored ==');
{
  const w = boot({ ...BOOKMARK_66, missionPaceMonths: 4 }, 42);
  forceBranches(w);
  realm.checkMissions(w.ctx);
  ok(doneList(w.game.tags.JUD).join(',') === 'jm_arm_the_nation,jm_coastal_road,jm_diaspora',
    'a bookmark asking for a four-month drum gets none: ' + doneList(w.game.tags.JUD));
}

console.log('== a hand-moved missionIdx keeps its meaning ==');
{
  const w = boot(BOOKMARK_66, 9);
  for (const a of Object.values(w.game.armies)) if (a && a.tag === 'JUD') a.men += 4000;
  realm.checkMissions(w.ctx); // the root completes
  w.game.tags.JUD.missionIdx = 5; // an old save or a forcing test moves the cursor
  realm.checkMissions(w.ctx); // the next pass normalizes the record
  const d = doneList(w.game.tags.JUD);
  ok(d.length >= 5 && w.game.tags.JUD.missionIdx >= 5,
    'the cursor still seeds the first N as done: idx=' + w.game.tags.JUD.missionIdx
    + ', done=' + d.length);
}

console.log(failures ? `smoke134: ${failures} FAIL` : 'smoke134: ALL PASS');
process.exit(failures ? 1 : 0);
