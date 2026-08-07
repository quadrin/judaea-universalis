// Headless regression — SPEC §215: the tree stands as long as the realm does.
//
// Two ways the mission tree vanished out from under a campaign that was still
// being played, both of them reported as "the tree keeps disappearing midgame":
//
//   THE VERDICT — `getMissions` opened with `if (g.result) return []`, so the
//   whole tree left the panel the month the chapter's verdict landed. But a
//   verdict is not an ending here (SPEC §32/§83): `endGame` says so in as many
//   words, the sandbox chapters are the second act it opens, and `checkMissions`
//   never stopped working the chain — it went on banking accomplishments,
//   paying their rewards and toasting the player. A 66 CE Agrippa who won in 71
//   played on for centuries collecting "Mission complete —" for a tree no
//   surface would draw. The tree now retires with the REALM, which is the same
//   condition the monthly pass has always used.
//
//   THE CROWN — `missionsFor` read `bookmark.missions[tag]` by raw key, the one
//   bookmark table not read through §102/§135's `contentForTag`. A crown whose
//   formable carries no chain of its own — Herod's JUD in 40 BCE, Jordan's UAR
//   in 1948, Byzantium's ROM in 614 — deleted the name its chain was filed
//   under, so the tree went to zero at the moment of the proclamation. The
//   formable's OWN chain still answers first, so a JUD that becomes Israel
//   works Israel's chain rather than the one it has outgrown.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { BOOKMARK_40 } = await import(R + '/js/data/bookmark_40bce.js');
const { EVENTS_40 } = await import(R + '/js/data/events_40bce.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { EVENTS_614 } = await import(R + '/js/data/events_614ce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { EVENTS_1948 } = await import(R + '/js/data/events_1948.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { switchTagCore } = await import(R + '/js/sim/military.js');
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
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};

function boot(bookmark, events, playerTag) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: 11 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events });
  return { game, ctx, actions: gameActions(ctx) };
}
const ids = (view) => view.map((m) => m.id).join(',');

// ------------------------------------------------------- the verdict is not an ending
console.log('== §215 the verdict: the chapter is decided, the tree is not ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_66, EVENTS_66, 'AGR');
  const before = actions.getMissions();
  ok(before.length > 0, 'the last Herodian opens with a tree: ' + before.length + ' medallions');

  game.result = 'win'; // Agrippa is standing when the verdict is read (SPEC §185)
  const after = actions.getMissions();
  ok(ids(after) === ids(before), 'the winning verdict takes nothing off the tree');

  const toasts = [];
  const off = bus.on('notify', (n) => { if (n && /Mission complete/.test(n.title || '')) toasts.push(n.title); });
  game.tags.AGR.tech.infl = 6; // The Words in the Xystus asks for Influence 6
  // §227: the pass marks it ready and the claim banks it — both halves have to
  // go on working after the verdict, which is the whole point of this suite.
  realm.checkMissions(ctx);
  const nowReady = (game.tags.AGR.missionReady || []).slice();
  ok(nowReady.length === 1, 'the monthly pass still works the chain after the verdict: ' + nowReady.join());
  realm.claimMission(ctx, nowReady[0]);
  off();
  const banked = game.tags.AGR.missionsDone || [];
  ok(banked.length === 1 && toasts.length === 1,
    'and a claim still banks and still says so: ' + toasts.join());
  const drawn = actions.getMissions().filter((m) => m.status === 'done').map((m) => m.id);
  ok(drawn.length === banked.length && drawn.every((id) => banked.indexOf(id) >= 0),
    'and the panel draws exactly what the sim banked: ' + (drawn.join() || 'nothing'));
  ok(actions.getMissions().some((m) => m.status === 'current'),
    'the rest of the tree is still workable — a won chapter is not a finished era');

  const pace = actions.getMissionPace();
  ok(pace && pace.rest === pace.pace, 'the §207 drumbeat keeps its rest after the verdict');
}
{
  // A verdict that went the other way is no different: the realm stands, the
  // chain stands. Only elimination retires it, which is the monthly pass's own
  // condition (`!t.alive` in checkMissions) rather than a second rule.
  const { game, actions } = boot(BOOKMARK_66, EVENTS_66, 'AGR');
  const n = actions.getMissions().length;
  game.result = 'loss';
  ok(actions.getMissions().length === n, 'a losing verdict leaves the tree standing too');
  game.tags.AGR.alive = false;
  ok(actions.getMissions().length === 0, 'and the tree retires with the realm');
}

// ------------------------------------------------------- the crown keeps its chain
console.log('== §215 the crown: a proclamation that brings no chain keeps the old one ==');
{
  // Every formable whose own `missions` list is empty — the three crowns that
  // used to empty the panel by being taken.
  const CASES = [
    { name: '40 BCE Herod proclaims the Kingdom of Judaea', bm: BOOKMARK_40, ev: EVENTS_40, from: 'HER', to: 'JUD', head: 'h5_rome' },
    { name: '1948 Jordan joins the United Arab Republic', bm: BOOKMARK_1948, ev: EVENTS_1948, from: 'JOR', to: 'UAR', head: 'jr_latrun' },
    { name: '614 Byzantium restores the Roman name', bm: BOOKMARK_614, ev: EVENTS_614, from: 'BYZ', to: 'ROM', head: 'b_line' },
  ];
  for (const c of CASES) {
    const { game, ctx, actions } = boot(c.bm, c.ev, c.from);
    const before = actions.getMissions();
    // One accomplishment already banked, so the record has something to lose.
    game.tags[c.from].missionsDone = [c.head];
    game.tags[c.from].missionIdx = 1;
    ok(switchTagCore(ctx, c.from, c.to), c.name);
    game.playerTag = c.to;
    const after = actions.getMissions();
    ok(ids(after) === ids(before), '  the tree survives the proclamation: '
      + before.length + ' → ' + after.length);
    ok((after.find((m) => m.id === c.head) || {}).status === 'done',
      '  and what was accomplished under the old name is still accomplished under the new one');
    ok(realm.missionsFor(ctx, c.to) === realm.missionsFor(ctx, c.to),
      '  the monthly pass and the panel are handed the same array');
    realm.checkMissions(ctx);
    ok((game.tags[c.to].missionsDone || []).indexOf(c.head) >= 0,
      '  the monthly pass keeps the record under the crown\'s own name');
  }
}
{
  // The control: a crown that DOES bring a chain is not handed its ancestor's.
  // Israel's own tree answers before Judaea's — the inherited table is the last
  // lookup of three, not the first.
  const { game, ctx, actions } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  const judaean = actions.getMissions().length;
  game.wars = [];
  for (const k of Object.keys(game.tags)) if (game.tags[k]) game.tags[k].atWarWith = [];
  ok(switchTagCore(ctx, 'JUD', 'MLI'), '66 CE Judaea proclaims the Kingdom of Israel');
  game.playerTag = 'MLI';
  const view = actions.getMissions();
  // §211 deepened the crown from seven nodes to twenty-two — the claim here is
  // that it reads its OWN tree rather than inheriting the chapter side's, so
  // the number moves with that section and the inequality is the real check.
  ok(view.length === 22 && view.length !== judaean,
    '  the crown is handed its own twenty-two mission chapter tree, not Judaea\'s '
    + judaean + ' (' + view.length + ')');
  ok(view.some((m) => m.id === 'mli_the_crowning'),
    '  the crowning is on it — the formable\'s chain answers before the inherited one');
  ok(!realm.missionsFor(ctx, 'NAB'), 'and no chain is invented for a tag that never had one');
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
