// Headless regression — SPEC §127: a court is not a fixed cast.
//
// The 167 chapter's court was three factions — Hasideans, Hellenizers, the
// Brothers' Captains — and it was those three in −167 and still those three in
// 6 CE, because `factionDefs` read a flat per-bookmark table with no time in
// it. That was defensible when the chapter stopped at Pompey. It stopped being
// defensible when §121 and §125 carried it to 6 CE, because the hundred and
// forty years they added are precisely the years of the quarrel between the
// two parties that replaced the Hasideans, and the chapter played all of them
// with the Hasideans still on the panel.
//
// The reported symptom was that the Pharisee/Sadducee split, which is a live
// court mechanic in the 67 BCE chapter, is invisible in 167 — and it was: the
// split existed there as three scripted cards and a pair of flags, and moved
// no faction, because there was no faction to move. `ev_pharisee_breach`, the
// card in which Hyrcanus goes over to the Sadducees, shifted `hasideans` in
// 114 BCE.
//
// What this suite holds: that the seats change hands on time, that standing
// carries across the change rather than resetting, that a card naming a
// departed faction lands on its heir instead of falling on the floor, and that
// the chapters which do NOT declare windows are completely unaffected.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { BOOKMARK_67 } = await import(R + '/js/data/bookmark_67bce.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx, simHelpers } = await import(R + '/js/sim/init.js');
const { factionDefs, ensureFactions, shiftFaction, getFactionsInfo } = await import(R + '/js/sim/factions.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const fakeGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const bus = { emit() {}, on() { return () => {}; } };
const EV167 = (ERAS.find((e) => e.bookmark.id === '167bce') || {}).events || [];

function world(bm, events, tag, y) {
  const game = initGame({ DEFINES, MAP_DATA, geom: fakeGeom, bookmark: bm, events, playerTag: tag, rngSeed: 4 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: bm, events });
  game.date = { y, m: 6, d: 1 };
  const t = game.tags[tag];
  if (t) { t.ai = false; t.alive = true; }
  return { game, ctx };
}
const ids = (ctx, tag) => (factionDefs(ctx, tag) || []).map((d) => d.id).sort();

console.log('== the court of 167 changes hands in the 140s ==');
{
  const early = world(BOOKMARK_167, EV167, 'HAS', -160);
  ok(ids(early.ctx, 'HAS').join(',') === 'hasideans,hellenizers,warparty',
    'the revolt is fought with the parties the revolt had (' + ids(early.ctx, 'HAS').join(', ') + ')');

  const late = world(BOOKMARK_167, EV167, 'HAS', -100);
  ok(ids(late.ctx, 'HAS').join(',') === 'pharisees,sadducees,warparty',
    'the royal century is governed with the parties it had (' + ids(late.ctx, 'HAS').join(', ') + ')');

  // The boundary itself, both sides of it.
  const before = world(BOOKMARK_167, EV167, 'HAS', -141);
  const after = world(BOOKMARK_167, EV167, 'HAS', -140);
  ok(ids(before.ctx, 'HAS').includes('hasideans') && !ids(before.ctx, 'HAS').includes('pharisees'),
    '  −141 is still the Hasideans');
  ok(ids(after.ctx, 'HAS').includes('pharisees') && !ids(after.ctx, 'HAS').includes('hasideans'),
    '  −140 is the Pharisees');

  // The party that belongs to neither era is untouched by any of it.
  ok(ids(early.ctx, 'HAS').includes('warparty') && ids(late.ctx, 'HAS').includes('warparty'),
    '  and a faction with no window is seated in both');
}

console.log('== a chapter that declares no windows is not affected ==');
{
  for (const [name, bm, tag, expect] of [
    ['67bce/HYR', BOOKMARK_67, 'HYR', 'antipater,pharisees,priesthood,sadducees'],
  ]) {
    const a = world(bm, [], tag, bm.startDate.y);
    const b = world(bm, [], tag, bm.startDate.y + 40);
    ok(ids(a.ctx, tag).join(',') === expect, name + ' has its full court at the start');
    ok(ids(a.ctx, tag).join(',') === ids(b.ctx, tag).join(','),
      '  and the same court forty years later');
  }
}

console.log('== standing carries across the succession ==');
{
  // A king who spent the revolt courting the pious does not meet the Pharisees
  // as strangers, and one who spent it affronting them does not get an amnesty.
  for (const [label, delta, cmp] of [['courted', 30, (v) => v > 55], ['affronted', -30, (v) => v < 45]]) {
    const early = world(BOOKMARK_167, EV167, 'HAS', -160);
    ensureFactions(early.ctx, 'HAS');
    shiftFaction(early.ctx, 'HAS', 'hasideans', delta);
    const carried = early.game.tags.HAS.factions.hasideans;
    // …the same campaign, twenty years on.
    early.game.date = { y: -139, m: 6, d: 1 };
    ensureFactions(early.ctx, 'HAS');
    const now = early.game.tags.HAS.factions.pharisees;
    ok(Number.isFinite(now), 'a crown that ' + label + ' the pious is seated with the Pharisees');
    ok(now === carried, '  at exactly the standing it had earned (' + now + ' vs ' + carried + ')');
    ok(cmp(now), '  which is on the right side of neutral');
  }
  // The Sadducees inherit from the Hellenizers on the same rule.
  const w = world(BOOKMARK_167, EV167, 'HAS', -160);
  ensureFactions(w.ctx, 'HAS');
  shiftFaction(w.ctx, 'HAS', 'hellenizers', 20);
  w.game.date = { y: -130, m: 6, d: 1 };
  ensureFactions(w.ctx, 'HAS');
  ok(w.game.tags.HAS.factions.sadducees === w.game.tags.HAS.factions.hellenizers,
    'and the great houses inherit from the gymnasium party the same way');
}

console.log('== a card that names a departed faction lands on its heir ==');
{
  // Thirteen cards of the 167 chain name the Hasideans and can fire after the
  // 140s — the eight hundred crosses, Salome's deathbed, the Law of the
  // Nations. Before the heir rule they shifted nothing.
  const late = world(BOOKMARK_167, EV167, 'HAS', -90);
  ensureFactions(late.ctx, 'HAS');
  const was = late.game.tags.HAS.factions.pharisees;
  const moved = shiftFaction(late.ctx, 'HAS', 'hasideans', -20);
  ok(moved === true, 'the shift reports that it landed');
  ok(late.game.tags.HAS.factions.pharisees === was - 20,
    '  and it landed on the Pharisees (' + was + ' → ' + late.game.tags.HAS.factions.pharisees + ')');
  ok(!Number.isFinite(late.game.tags.HAS.factions.hasideans),
    '  and not on a seat nobody occupies');

  // The rule is a succession, not a free-for-all: an id that never existed
  // still fails soft rather than landing somewhere convenient.
  const before = JSON.stringify(late.game.tags.HAS.factions);
  ok(shiftFaction(late.ctx, 'HAS', 'nosuchparty', 40) === false, 'an unknown id still moves nothing');
  ok(JSON.stringify(late.game.tags.HAS.factions) === before, '  and changes no other faction either');
}

console.log('== the breach is a court event now, not only a chronicle entry ==');
{
  const breach = EV167.find((e) => e && e.id === 'ev_pharisee_breach');
  ok(!!breach && breach.date && breach.date.y === -114, 'ev_pharisee_breach still falls in −114');
  const src = readFileSync(R + '/js/data/events_167bce.js', 'utf8');
  const i = src.indexOf("id: 'ev_pharisee_breach'");
  const seg = src.slice(i, i + 6000);
  ok(/factionShift\(ctx, 'HAS', 'sadducees', 30\)/.test(seg) && /factionShift\(ctx, 'HAS', 'pharisees', -35\)/.test(seg),
    '  and going over to the Sadducees moves both parties');
  ok(/factionShift\(ctx, 'HAS', 'pharisees', 25\)/.test(seg),
    '  as does keeping the schools');

  // And it lands, in a real campaign, at the year the card is dated to.
  for (const [idx, party, dir] of [[0, 'sadducees', 1], [1, 'pharisees', 1]]) {
    const w = world(BOOKMARK_167, EV167, 'HAS', -114);
    ensureFactions(w.ctx, 'HAS');
    const was = w.game.tags.HAS.factions[party];
    breach.options[idx].effects(w.ctx);
    const now = w.game.tags.HAS.factions[party];
    ok(dir > 0 ? now > was : now < was,
      '  answer #' + idx + ' moves the ' + party + ' (' + was + ' → ' + now + ')');
  }
}

console.log('== the panel shows the parties that are actually seated ==');
{
  // getFactionsInfo is what the nation panel renders. A court that changed
  // hands in the data and not in the panel would be the same bug wearing a
  // different hat.
  const late = world(BOOKMARK_167, EV167, 'HAS', -90);
  const info = getFactionsInfo(late.ctx) || [];
  const shown = info.map((f) => f.id).sort().join(',');
  ok(shown === 'pharisees,sadducees,warparty',
    'the 90 BCE court panel lists ' + (shown || 'nothing'));
  ok(info.every((f) => typeof f.name === 'string' && f.name.length > 2),
    '  and every seat has a name to render');
  const pharisees = info.find((f) => f.id === 'pharisees');
  ok(pharisees && pharisees.canAppease !== undefined && pharisees.appeaseLabel,
    '  and the Pharisees can be courted from the panel like any other party');
  const pdef = (factionDefs(late.ctx, 'HAS') || []).find((d) => d.id === 'pharisees');
  ok(pdef && pdef.demand && typeof pdef.demand.title === 'string' && pdef.demand.grant && pdef.demand.refuse,
    '  and they can put a demand to the crown, with both answers priced');
}

console.log('== the empire package names the parties of its own century ==');
{
  // SPEC §125's cards all fire between −130 and −6 and every one of them used
  // to shift the Hasideans. The heir rule would have covered them, but a card
  // that knows which century it is in should say so.
  const src = readFileSync(R + '/js/data/events_167bce_empire.js', 'utf8');
  ok(!/hasideans|hellenizers/.test(src),
    'no card of the empire rung still addresses a party that left in the 140s');
  ok(!/Hasidean/.test(src), '  and no tooltip promises Hasidean favour in 120 BCE');
  ok(/factionShift\(ctx, me, 'pharisees'/.test(src) && /factionShift\(ctx, me, 'sadducees'/.test(src),
    '  and it moves both of the parties that were there');
}

console.log(failures ? `smoke86: ${failures} FAIL` : 'smoke86: ALL PASS');
process.exit(failures ? 1 : 0);
