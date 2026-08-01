// Headless smoke test §179: the rungs have names, and the ladders unlock the
// age's own ideas. Pins the data contract (every bookmark's groups are
// reachable, priced in the ladder that opens them, and speak only effects the
// sim consumes), the unlock gate (no rung, no sale), the purchase path
// (points down, tier up, effects folded into t.ideas), the institutions
// surcharge, the AI's symmetric buying, the save round-trip, and the §179
// curriculum missions completing off tech and era-idea state.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { GENERIC_EVENTS } = await import(R + '/js/data/events_generic.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const realm = await import(R + '/js/sim/realm.js');
const {
  ERA_IDEA_GROUPS, ERA_IDEAS_BY_BOOKMARK, ERA_IDEA_TIERS,
  eraIdeaGroupsFor, eraIdeaUnlocked, eraIdeaCost, computeEraIdeaEffects, eraIdeaTiersOwned,
} = await import(R + '/js/data/era_ideas.js');
const { techLevelName, techCeiling } = await import(R + '/js/data/tech.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// Every effects key the sim actually consumes (resolveTagMult/resolveTagAdd
// call sites) — a tier speaking any other key would be a silent no-op.
const CONSUMED = new Set([
  'incomeMult', 'tradeMult', 'manpowerMult', 'milPowerMult', 'disciplineMult',
  'moraleMult', 'siegeMult', 'navalMult', 'growthMult', 'reinforceMult',
  'maintMult', 'adminMult', 'forceLimitMult', 'convertMult', 'integrateMult',
  'unrestAll', 'legitimacyAdd', 'siegeBonus', 'hillDefBonus',
]);

console.log('== the data contract: every chapter\'s curriculum is honest ==');
{
  const BOOKMARKS = await Promise.all([
    ['bookmark_167bce', 'BOOKMARK_167'], ['bookmark_67bce', 'BOOKMARK_67'],
    ['bookmark_40bce', 'BOOKMARK_40'], ['bookmark_66ce', 'BOOKMARK_66'],
    ['bookmark_132ce', 'BOOKMARK_132'], ['bookmark_529ce', 'BOOKMARK_529'],
    ['bookmark_614ce', 'BOOKMARK_614'], ['bookmark_1948', 'BOOKMARK_1948'],
  ].map(async ([f, ex]) => (await import(R + '/js/data/' + f + '.js'))[ex]));
  ok(BOOKMARKS.every((b) => b && ERA_IDEAS_BY_BOOKMARK[b.id]),
    'every bookmark has a curriculum table');
  // Group keys are globally unique by construction (one flat object) — what
  // needs checking is that every LISTED key exists and no group is orphaned.
  const listed = new Set();
  for (const table of Object.values(ERA_IDEAS_BY_BOOKMARK)) {
    for (const keys of Object.values(table)) for (const k of keys) listed.add(k);
  }
  ok([...listed].every((k) => ERA_IDEA_GROUPS[k]), 'every listed group exists');
  ok(Object.keys(ERA_IDEA_GROUPS).every((k) => listed.has(k)), 'no group is orphaned');
  let unlockOk = true, pointOk = true, tiersOk = true, fxOk = true, namedOk = true, playPlacesOk = true;
  for (const b of BOOKMARKS) {
    const table = ERA_IDEAS_BY_BOOKMARK[b.id];
    const base = b.techBase | 0, ceil = techCeiling(b);
    for (const tag of Object.keys(table)) {
      for (const gd of eraIdeaGroupsFor(b, tag === 'default' ? '__none__' : tag)) {
        if (gd.unlock.ladder !== gd.point) pointOk = false;
        if (gd.unlock.level < base || gd.unlock.level > ceil) { unlockOk = false; console.error('    unreachable:', b.id, gd.key, gd.unlock.level); }
        if (gd.tiers.length !== ERA_IDEA_TIERS) tiersOk = false;
        for (const ti of gd.tiers) {
          for (const k of Object.keys(ti.effects || {})) if (!CONSUMED.has(k)) { fxOk = false; console.error('    dead key:', gd.key, k); }
        }
        if (/^Level \d+$/.test(techLevelName(b, gd.unlock.ladder, gd.unlock.level))) { namedOk = false; console.error('    unnamed rung:', b.id, gd.key); }
      }
    }
    // Every playable side has a curriculum of its own (the second sides too),
    // and at least one group of it is open at that side's STARTING levels —
    // the EU4 screen's shape: first slot open, the rest waiting on the rungs.
    for (const p of b.playableTags || []) {
      const groups = eraIdeaGroupsFor(b, p.tag);
      if (!groups.length) { playPlacesOk = false; console.error('    playable without ideas:', b.id, p.tag); continue; }
      const tw = (b.techTweaks || {})[p.tag] || {};
      const startT = { tech: { gov: base + (tw.gov | 0), infl: base + (tw.infl | 0), mar: base + (tw.mar | 0) } };
      if (!groups.some((gd) => eraIdeaUnlocked(startT, gd))) {
        playPlacesOk = false; console.error('    nothing open at start:', b.id, p.tag);
      }
    }
  }
  ok(unlockOk, 'every unlock sits inside its chapter\'s base..ceiling window');
  ok(pointOk, 'the ladder that opens a group is the ladder that pays for it');
  ok(tiersOk, 'every group sells exactly ' + ERA_IDEA_TIERS + ' tiers');
  ok(fxOk, 'every effects key is one the sim consumes');
  ok(namedOk, 'every unlock rung has an era name (no "Level N" cards)');
  ok(playPlacesOk, 'every playable side has a curriculum with one group open at start');
}

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
function boot(playerTag, seed) {
  const events = EVENTS_66.concat(GENERIC_EVENTS);
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events, playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events });
  return { game, ctx, actions: gameActions(ctx) };
}

console.log('== the unlock gate: no rung, no sale ==');
const { game, ctx, actions } = boot('JUD', 42);
{
  const t = game.tags.JUD;
  const view = actions.getEraIdeas();
  ok(Array.isArray(view) && view.length === 4, 'JUD is offered its four groups: ' + (view || []).length);
  const open = view.filter((v) => v.unlocked).map((v) => v.key);
  ok(open.join(',') === 'fourth_philosophy', 'at mar 5 only the first is open: ' + open.join(','));
  const locked = view.find((v) => v.key === 'walls_of_jerusalem');
  ok(locked.unlockText === 'Unlocked at The Third Wall (8)',
    'the locked card names the rung: "' + locked.unlockText + '"');
  t.points.gov = 999;
  actions.buyEraIdea('walls_of_jerusalem');
  ok(!((t.eraIdeas || {}).walls_of_jerusalem | 0), 'a locked group refuses the purchase');
  // The panel's tech row wears the same names.
  const tech = actions.getTech();
  ok(tech.rows.every((r) => r.levelName && !/^Level /.test(r.levelName)), 'every ladder names its rung');
  ok(tech.rows.find((r) => r.key === 'mar').levelName === 'The Zealots\' Fire',
    'JUD mar 5 is The Zealots\' Fire');
}

console.log('== the purchase: points down, tier up, effects folded ==');
{
  const t = game.tags.JUD;
  t.points.mar = 500;
  const before = t.ideas.moraleMult || 1;
  actions.buyEraIdea('fourth_philosophy');
  ok(t.eraIdeas.fourth_philosophy === 1, 'first tier bought');
  ok(t.points.mar === 500 - Math.round(60 * (1 + 0)) || t.points.mar < 500, 'the tier was paid for: ' + t.points.mar);
  ok((t.ideas.moraleMult || 1) > before, 'No King but God folds +10% morale into t.ideas');
  ok(eraIdeaTiersOwned(t) === 1, 'eraIdeaTiersOwned counts it');
  // Tier costs rise 60/90/120 (times the institutions surcharge).
  const v2 = actions.getEraIdeas().find((v) => v.key === 'fourth_philosophy');
  ok(v2.cost >= 90, 'the second tier costs more: ' + v2.cost);
  ok(Number.isFinite(v2.instPct), 'the surcharge is reported: +' + v2.instPct + '%');
}

console.log('== the missions read the same state ==');
{
  const t = game.tags.JUD;
  const list = realm.missionsFor(ctx, 'JUD');
  ok(list.length === 21, 'the chain grew to twenty-one (§179 curriculum, §183 hypotheticals, §192/§197 expansion): ' + list.length);
  const arts = list.find((m) => m.id === 'jm_roman_manner');
  const mind = list.find((m) => m.id === 'jm_mind_of_the_nation');
  ok(!!arts && !!mind, 'the curriculum missions exist');
  ok(!arts.check(ctx), 'The Roman Manner waits on mar 7');
  t.tech.mar = 7;
  ok(arts.check(ctx), 'and completes at mar 7');
  ok(!mind.check(ctx), 'The Mind of the Nation waits on three tiers');
  t.eraIdeas.fourth_philosophy = 3;
  ok(mind.check(ctx), 'and completes at three');
  t.tech.mar = 5;
  t.eraIdeas.fourth_philosophy = 1;
}

console.log('== the AI buys what its ladders opened, one tier a month ==');
{
  const rom = game.tags.ROM;
  rom.reforms = { mil: 5, civ: 5, rel: 5 }; // universal trees done — the era queue is next
  rom.points = { gov: 900, infl: 900, mar: 900 };
  const { aiReforms } = await import(R + '/js/sim/ai.js');
  aiReforms(ctx, 'ROM');
  ok(eraIdeaTiersOwned(rom) === 1, 'one tier after one month: ' + eraIdeaTiersOwned(rom));
  const bought = Object.keys(rom.eraIdeas).filter((k) => rom.eraIdeas[k] > 0);
  ok(bought.every((k) => (ERA_IDEAS_BY_BOOKMARK['66ce'].ROM || []).includes(k)),
    'Rome bought from Rome\'s curriculum: ' + bought.join(','));
  ok(bought.every((k) => eraIdeaUnlocked(rom, { ...ERA_IDEA_GROUPS[bought[0]], key: bought[0] })),
    'and only what its ladders had opened');
  aiReforms(ctx, 'ROM');
  ok(eraIdeaTiersOwned(rom) === 2, 'two after two');
}

console.log('== the save round-trip ==');
{
  const raw = JSON.parse(JSON.stringify(game));
  const revived = reviveGame(raw);
  ok(revived.tags.JUD.eraIdeas.fourth_philosophy === 1, 'tiers ride the save');
  ok((revived.tags.ROM.eraIdeas && eraIdeaTiersOwned(revived.tags.ROM)) === 2, 'the AI\'s too');
  // A pre-§179 save has no eraIdeas at all — it joins with none, not with undefined.
  delete raw.tags.JUD.eraIdeas;
  const revived2 = reviveGame(JSON.parse(JSON.stringify(raw)));
  ok(revived2.tags.JUD.eraIdeas && typeof revived2.tags.JUD.eraIdeas === 'object'
    && eraIdeaTiersOwned(revived2.tags.JUD) === 0, 'a pre-§179 save joins the age with none');
  // The effects fold is pure and total: a key the registry no longer knows is skipped.
  const fx = computeEraIdeaEffects({ fourth_philosophy: 2, ghost_group: 3 });
  ok((fx.moraleMult || 1) > 1 && (fx.unrestAll || 0) < 0 && Object.keys(fx).length === 2,
    'unknown keys fold to nothing, known tiers to their effects');
}

console.log('== the cost arithmetic ==');
{
  ok(eraIdeaCost(0) === 60 && eraIdeaCost(1) === 90 && eraIdeaCost(2) === 120,
    'tiers price at 60/90/120');
  ok(techLevelName(BOOKMARK_66, 'gov', 7) === 'The Provisioned City', 'gov 7 named');
  ok(techLevelName(BOOKMARK_66, 'gov', 2) === 'Level 2', 'outside the window the number stands in');
  ok(techLevelName(null, 'gov', 5) === 'Level 5', 'no bookmark, no crash');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
