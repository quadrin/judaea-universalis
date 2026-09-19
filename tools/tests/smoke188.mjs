// Headless regression — SPEC §272: the year has weather, and the world has a
// voice.
//
// Three systems land together and each makes a claim this suite holds.
//
//   THE SEASON. Four Levantine seasons with distinct mechanical fingerprints,
//   read from the month alone. The rains cost a host in the open, shut the
//   sea and slow a siege camp; the heat costs whoever is in the desert and
//   SPEEDS a siege, because the cisterns are what decide a siege in Av; the
//   harvest feeds a column off the country; spring costs nothing, which is
//   why it is the campaign season. All of it scales down toward 1948 and
//   none of it to zero.
//
//   THE WEATHER CARDS. Twenty decision cards about this sky and this rift,
//   era-banded on the §52 convention and seasonally gated, registered into
//   every chapter's pool.
//
//   THE DATELINE. Fifty-nine murmurs that resolve themselves, dealt at most
//   one a month, and — the load-bearing claim — dealt WITHOUT drawing from
//   the seeded stream, so the whole ambient layer costs the balance harness
//   nothing and the only balance change §272 makes is the season it means to
//   make.
import { readFileSync } from 'fs';
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { bus } = await import(R + '/js/core/bus.js');
const S = await import(R + '/js/sim/seasons.js');
const { monthlyAmbient, AMBIENT, murmurLog } = await import(R + '/js/sim/ambient.js');
const { AMBIENT_MURMURS } = await import(R + '/js/data/ambient.js');
const { WEATHER_EVENTS } = await import(R + '/js/data/events_weather.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const era = (id) => ERAS.find((e) => e.bookmark.id === id).bookmark;
const at = (y, m) => ({ game: { date: { y, m, d: 1 } } });

console.log('== 1. the four seasons ==');
{
  const byMonth = [];
  for (let m = 1; m <= 12; m++) byMonth.push(S.seasonKeyOf({ y: -931, m }));
  ok(byMonth.filter((k) => k === 'rains').length === 4, 'four months of rains (Nov–Feb)');
  ok(byMonth.filter((k) => k === 'spring').length === 3, 'three months of the campaign season (Mar–May)');
  ok(byMonth.filter((k) => k === 'heat').length === 4, 'four months of heat (Jun–Sep)');
  ok(byMonth.filter((k) => k === 'harvest').length === 1, 'one month of harvest (Oct)');
  ok(new Set(byMonth).size === 4, 'every month belongs to one of exactly four seasons');
  ok(S.seasonKeyOf({ y: 0, m: 1 }) === 'rains' && S.seasonKeyOf({ y: 0, m: 4 }) === 'spring'
    && S.seasonKeyOf({ y: 0, m: 8 }) === 'heat' && S.seasonKeyOf({ y: 0, m: 10 }) === 'harvest',
    'January is rains, April spring, August heat, October harvest');
  // A malformed or absent date must never take the campaign down.
  ok(S.seasonOf(null) === S.SEASONS.spring && S.seasonOf({}) === S.SEASONS.spring,
    'a missing date falls back to the season that costs nothing');
}

console.log('== 2. what the season costs ==');
{
  const winter = at(-931, 1);
  const spring = at(-931, 4);
  const summer = at(-931, 8);
  const harvest = at(-931, 10);
  const farm = { terrain: 'farmland' };
  const desert = { terrain: 'desert' };
  const marsh = { terrain: 'marsh' };
  const hills = { terrain: 'hills' };

  ok(S.seasonAttrition(winter, farm, true) > 1.5, 'the rains bleed a host in the open on grain country');
  ok(S.seasonAttrition(winter, farm, false) === 0, '…and cost a garrison at home nothing');
  ok(S.seasonAttrition(winter, marsh, true) > S.seasonAttrition(winter, farm, true),
    '…and the marsh in the rains is worse than the field');
  ok(S.seasonAttrition(winter, desert, true) < S.seasonAttrition(winter, farm, true),
    'the winter is the one season the desert is a mercy');
  ok(S.seasonAttrition(summer, desert, false) > 2,
    'the heat takes from whoever is in the desert, flag or no flag');
  ok(S.seasonAttrition(summer, farm, true) === 0, '…and asks nothing of the grain country');
  ok(S.seasonAttrition(harvest, farm, true) < 0, 'the harvest feeds a column off the country it stands in');
  ok(S.seasonAttrition(spring, farm, true) === 0 && S.seasonAttrition(spring, desert, true) === 0,
    'the campaign season costs nothing anywhere — which is what makes it the campaign season');

  ok(S.seasonMoveFactor(winter, farm) > 1.2, 'the rains put the Sharon under a column');
  ok(S.seasonMoveFactor(winter, marsh) > S.seasonMoveFactor(winter, farm), '…the Huleh worse still');
  ok(S.seasonMoveFactor(winter, hills) < S.seasonMoveFactor(winter, farm),
    '…and limestone least of all, which is why the ridge road is the winter road');
  ok(S.seasonMoveFactor(winter, desert) === 1, 'the desert does not turn to mud');
  ok(S.seasonMoveFactor(spring, farm) === 1 && S.seasonMoveFactor(summer, farm) === 1
    && S.seasonMoveFactor(harvest, farm) === 1, 'no other season slows a march at all');

  ok(S.seasonSiegeFactor(winter) < 1, 'a camp in the rains digs slower');
  ok(S.seasonSiegeFactor(summer) > 1, '…and a camp in Av is watching the cisterns, so it digs faster');
  ok(S.seasonSiegeFactor(spring) === 1 && S.seasonSiegeFactor(harvest) === 1, 'spring and harvest leave a siege alone');

  ok(S.seasonSeaFactor(winter) > 2 && S.seaShut(winter), 'mare clausum: the ancient winter sea is shut');
  ok(S.seasonSeaFactor(spring) === 1 && !S.seaShut(spring), '…and open from the latter rain');
}

console.log('== 3. modernity blunts it and never abolishes it ==');
{
  const ancient = at(-931, 1);
  const modern = at(1948, 1);
  ok(S.modernity(ancient) === 0 && S.modernity(at(1948, 1)) === 1 && S.modernity(at(1850, 1)) === 0.5,
    'modernity is 0 before 1800, 1 from 1900, and interpolates between');
  const a = S.seasonAttrition(ancient, { terrain: 'farmland' }, true);
  const m = S.seasonAttrition(modern, { terrain: 'farmland' }, true);
  ok(m > 0 && m < a, 'the 1948 winter still bleeds a column, and bleeds it less');
  ok(Math.abs(m / a - 0.35) < 0.01, '…at the measured floor of 35%');
  ok(S.seasonMoveFactor(modern, { terrain: 'farmland' }) > 1, 'the 1948 mud is still mud');
  ok(S.seasonSeaFactor(modern) === 1 && !S.seaShut(modern),
    'but steam opens the winter sea outright — a motor ship is a different thing, not a hardier galley');
}

console.log('== 4. the season is legible ==');
{
  for (let m = 1; m <= 12; m++) {
    const r = S.seasonReport(at(-66, m));
    if (!r) { ok(false, 'month ' + m + ' reports'); continue; }
    ok(!!r.name && !!r.blurb && r.months >= 1 && r.months <= 4 && !!r.nextName,
      'month ' + m + ': ' + r.name + ', ' + r.months + ' to run, then ' + r.nextName);
  }
  const rains = S.seasonReport(at(-66, 1));
  ok(rains.effects.length >= 4, 'the rains list every cost they are imposing (' + rains.effects.length + ')');
  ok(rains.effects.some((l) => /sea is shut/.test(l)), '…including the shut sea');
  ok(S.seasonReport(at(-66, 4)).effects.length === 0, 'the campaign season honestly reports costing nothing');
  ok(S.seasonReport(at(1948, 1)).modern === true && !S.seasonReport(at(-66, 1)).modern,
    'a modern chapter says so, so the player knows why the number is smaller');
}

console.log('== 5. the weather cards ==');
{
  const ids = WEATHER_EVENTS.map((e) => e.id);
  ok(new Set(ids).size === ids.length, ids.length + ' weather cards, every id unique');
  ok(WEATHER_EVENTS.every((e) => e.id.startsWith('wx_')), 'every one is namespaced wx_');
  ok(WEATHER_EVENTS.every((e) => Number.isFinite(e.maxYear) || Number.isFinite(e.minYear)),
    'every one is era-banded — nothing here is timeless');
  ok(WEATHER_EVENTS.every((e) => e.once === false && Number.isFinite(e.cooldownMonths) && Number.isFinite(e.chance)),
    'every one is repeatable with a cooldown and a monthly chance');
  ok(WEATHER_EVENTS.every((e) => typeof e.trigger === 'function'
    && Array.isArray(e.options) && e.options.length >= 1
    && e.options.every((o) => typeof o.effects === 'function' && o.label)),
    'every one has a trigger and at least one labelled, working option');
  ok(WEATHER_EVENTS.every((e) => Number.isFinite(e.aiOption) && e.aiOption < e.options.length),
    'every one names a recorded course the harness can answer with');
  const antique = WEATHER_EVENTS.filter((e) => e.maxYear === 1799).length;
  const modern = WEATHER_EVENTS.filter((e) => e.minYear === 1900).length;
  ok(antique >= 15 && modern >= 4, antique + ' antique cards and ' + modern + ' modern');
  // Registered into every chapter, and gated so each hears only its own voice.
  for (const e of ERAS) {
    const mine = e.events.filter((ev) => ev && typeof ev.id === 'string' && ev.id.startsWith('wx_'));
    ok(mine.length === WEATHER_EVENTS.length, e.bookmark.id + ' carries the whole weather pool');
  }
  // …and the id space does not collide with anything already registered.
  const others = new Set();
  for (const e of ERAS) for (const ev of e.events) if (ev && ev.id && !ev.id.startsWith('wx_')) others.add(ev.id);
  ok(!ids.some((i) => others.has(i)), 'no weather id collides with an existing card');
}

console.log('== 6. the dateline ==');
{
  const ids = AMBIENT_MURMURS.map((m) => m.id);
  ok(new Set(ids).size === ids.length, ids.length + ' murmurs, every id unique');
  ok(AMBIENT_MURMURS.every((m) => typeof m.text === 'function'), 'every murmur writes a line');
  ok(AMBIENT_MURMURS.every((m) => !m.options), 'no murmur has options — a murmur with a choice is a card');
  ok(AMBIENT_MURMURS.every((m) => Number.isFinite(m.minYear) || Number.isFinite(m.maxYear)),
    'every murmur is era-banded');
  const modern = AMBIENT_MURMURS.filter((m) => m.minYear === 1900).length;
  const antique = AMBIENT_MURMURS.filter((m) => m.maxYear === 1799).length;
  ok(antique >= 30 && modern >= 18, antique + ' antique murmurs and ' + modern + ' modern — neither band runs dry');
  ok(AMBIENT_MURMURS.every((m) => !m.season || ['rains', 'spring', 'heat', 'harvest'].includes(m.season)),
    'a seasonal murmur names a season that exists');
}

// A real campaign, with a human chair, for the rest of the suite.
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
function boot(id, years) {
  const entry = ERAS.find((e) => e.bookmark.id === id);
  const bookmark = entry.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const N = MAP_DATA.provinces.length;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let i = 1; i <= N; i++) {
    const a = provinceMap[i];
    for (const j of snap.neighbors[i] || []) {
      const b = provinceMap[j];
      if (a && b && a !== b) { neighbors[a].add(b); neighbors[b].add(a); }
    }
  }
  const geom = {
    neighbors,
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: snap.areas,
  };
  const tag = bookmark.playableTags[0].tag;
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark, events: entry.events,
    playerTag: tag, rngSeed: 1234567, provinceMap, difficulty: 'normal',
  });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: entry.events, provinceMap });
  return { ctx, game, tag, years };
}

console.log('== 7. the murmur costs the seeded stream nothing ==');
{
  const { ctx, game } = boot('66ce');
  // Run the ambient pass alone, over two centuries of months, and prove the
  // stream never moves. This is the property the whole design rests on: it is
  // why `node tools/autorun.mjs` draws the same world with the dateline in
  // place as it drew without it.
  let moved = 0;
  let said = 0;
  for (let i = 0; i < 2400; i++) {
    const before = game.rngState;
    monthlyAmbient(ctx);
    if (game.rngState !== before) moved++;
    game.date.m++;
    if (game.date.m > 12) { game.date.m = 1; game.date.y++; }
    // Nudge the stream the way a real campaign would, so the hash's input
    // actually varies and the pool does not answer the same month forever.
    game.rngState = (Math.imul(game.rngState, 1103515245) + 12345) >>> 0;
  }
  said = murmurLog(ctx).length;
  ok(moved === 0, 'two hundred years of ambient passes advanced the seeded stream zero times');
  ok(said > 0, '…and still said something (' + said + ' lines kept)');
  ok(said <= AMBIENT.logCap, 'the dateline is a ring — it never grows past ' + AMBIENT.logCap + ' lines');
  ok(Array.isArray(game.chronicle) && game.chronicle.length < 400,
    'the chronicle is a separate book and the dateline did not flood it');
}

console.log('== 8. an all-AI table hears nothing ==');
{
  // Which is what keeps the balance harness comparable, and is also simply
  // correct: a murmur is addressed to somebody who is reading it.
  const { ctx, game } = boot('167bce');
  game.tags[game.playerTag].ai = true;
  for (let i = 0; i < 240; i++) {
    monthlyAmbient(ctx);
    game.date.m++;
    if (game.date.m > 12) { game.date.m = 1; game.date.y++; }
  }
  ok(murmurLog(ctx).length === 0, 'twenty years of an all-AI table produced no dateline at all');
}

console.log('== 9. a campaign actually hears the world ==');
{
  const { tickDay } = await import(R + '/js/sim/tick.js');
  const { findEventById, resolveEventOption } = await import(R + '/js/sim/events.js');
  const results = [];
  for (const id of ['931bce', '66ce', '1948ce']) {
    const { ctx, game, tag } = boot(id);
    const fired = [];
    for (let d = 0; d < 10 * 12 * 30; d++) {
      tickDay(ctx);
      let guard = 0;
      while (game.pendingEvents.length && guard++ < 40) {
        const pe = game.pendingEvents[0];
        const ev = findEventById(ctx, pe.eventId);
        fired.push(pe.eventId);
        resolveEventOption(ctx, pe.instanceId, Number.isFinite(ev && ev.aiOption) ? ev.aiOption : 0);
      }
      if (game.over) break;
    }
    const wx = new Set(fired.filter((f) => String(f).startsWith('wx_')));
    const murmurs = murmurLog(ctx).length;
    results.push({ id, wx: wx.size, murmurs, alive: !!game.tags[tag].alive });
    ok(wx.size >= 3, id + ': ' + wx.size + ' distinct weather cards in ten years');
    ok(murmurs >= 25, id + ': ' + murmurs + ' lines of dateline in ten years');
    // The era bands hold on the live board, not just in the table.
    const modernFired = [...wx].filter((k) => k.startsWith('wx_modern_'));
    if (id === '1948ce') ok(modernFired.length === wx.size, '1948 hears only the modern weather');
    else ok(modernFired.length === 0, id + ' hears no modern weather');
  }
  console.table(results);
}

console.log('== 10. the season reaches the board ==');
{
  // The wiring, not the table: a march through the Sharon in Tevet must
  // actually take longer than the same march in Nisan, through the sim's own
  // hopDays, and a fleet must actually take longer to cross in winter.
  const { hopDays } = await import(R + '/js/sim/military.js');
  const { seaHopDays } = await import(R + '/js/sim/navy.js');
  const { ctx, game } = boot('66ce');
  const farm = game.provinces.find((p) => p && p.terrain === 'farmland' && !p.impassable);
  const other = game.provinces.find((p) => p && p !== farm && !p.impassable);
  ok(!!farm && !!other, 'the board has grain country to march through');
  game.date.m = 4;
  const spring = hopDays(ctx, other.id, farm.id, null);
  game.date.m = 1;
  const winter = hopDays(ctx, other.id, farm.id, null);
  ok(winter > spring, 'the same march takes ' + winter + ' days in Tevet against ' + spring + ' in Nisan');

  // A SHORT crossing, deliberately: both the open and the shut figure have to
  // sit under seaHopDays' 60-day ceiling or the winter is invisible because
  // the clamp ate it. Two ports a few days apart is the case that tests the
  // season rather than the clamp.
  const ports = game.provinces.filter((p) => p && ctx.geom.coastal[p.id] && ctx.geom.offshore[p.id]);
  let pair = null;
  for (let i = 0; i < ports.length && !pair; i++) {
    for (let j = i + 1; j < ports.length; j++) {
      const a = ctx.geom.offshore[ports[i].id];
      const b = ctx.geom.offshore[ports[j].id];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d > 150 && d < 400) { pair = [ports[i].id, ports[j].id]; break; }
    }
  }
  if (pair) {
    game.date.m = 4;
    const openSea = seaHopDays(ctx, pair[0], pair[1]);
    game.date.m = 1;
    const shutSea = seaHopDays(ctx, pair[0], pair[1]);
    ok(shutSea > openSea, 'the same crossing takes ' + shutSea + ' days in Tevet against ' + openSea + ' in Nisan');
  } else {
    ok(false, 'the board has two ports a short sail apart');
  }

  // And the helpers content gates on.
  game.date.m = 8;
  ok(ctx.helpers.season(ctx) === 'heat' && ctx.helpers.seaShut(ctx) === false,
    'content can ask the month and get the truth about it');
  game.date.m = 12;
  ok(ctx.helpers.season(ctx) === 'rains' && ctx.helpers.seaShut(ctx) === true,
    '…in both directions');
}

console.log('== 11. every weather option runs, in every season, in both eras ==');
{
  // A content package that throws inside the tick takes the campaign with it,
  // which is why every option body in the pool is wrapped in `guard`. The
  // guard means a broken card fails SILENTLY, so the only way to know the
  // pool works is to fire all of it: every card, every option, four seasons,
  // an antique board and a modern one. A warning out of the package counts as
  // a failure here even though the campaign survived it.
  const realWarn = console.warn;
  let caught = [];
  let threw = 0;
  let guarded = 0;
  let ran = 0;
  console.warn = (...a) => { caught.push(a.join(' ')); };
  try {
    for (const chapter of ['66ce', '1948ce']) {
      for (const ev of WEATHER_EVENTS) {
        for (let i = 0; i < ev.options.length; i++) {
          const { ctx, game } = boot(chapter);
          const me = game.playerTag;
          // A host in the field, so the cards that reach for one find one.
          const foreign = game.provinces.find((p) => p && !p.impassable && p.controller && p.controller !== me);
          if (foreign) ctx.helpers.spawnArmy(ctx, me, foreign.name, { men: 5000, name: 'Test Host' });
          for (const m of [1, 4, 8, 10]) {
            game.date.m = m;
            caught = [];
            ran++;
            try { ev.options[i].effects(ctx); }
            catch (e) { threw++; realWarn('    THREW', chapter, ev.id, 'opt' + i, 'month' + m, e && e.message); }
            const fromPool = caught.filter((w) => /data\/weather/.test(w));
            if (fromPool.length) { guarded++; realWarn('    GUARD CAUGHT', chapter, ev.id, 'opt' + i, 'month' + m, fromPool[0].slice(0, 160)); }
          }
        }
      }
    }
  } finally { console.warn = realWarn; }
  ok(ran > 200, ran + ' option firings exercised');
  ok(threw === 0, 'no weather option threw (' + threw + ')');
  ok(guarded === 0, 'no weather option was silently swallowed by its guard (' + guarded + ')');
}

console.log(failures ? `smoke188: ${failures} FAIL` : 'smoke188: ALL PASS');
process.exit(failures ? 1 : 0);
