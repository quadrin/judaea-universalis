// Headless regression — the religion batch (SPEC §104):
//   the ambient faith drift and the god-fearer pool; the era windows the
//   132 chain now carries; the world spine that runs to 425; the affinity a
//   change of dynasty annuls; and the Sasanian foreign-patron rule and its
//   schism.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_132 } = await import(R + '/js/data/bookmark_132ce.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { monthlyFaithDrift } = await import(R + '/js/sim/realm.js');
const { shareOf, largestMinorityFaith, popTotal } = await import(R + '/js/sim/population.js');
const { haveAffinity, affinityPair } = await import(R + '/js/sim/military.js');
const { nextWorldEvent, checkDateEvents, checkTriggeredEvents } = await import(R + '/js/sim/events.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const eventsFor = (id) => (ERAS.find((e) => e.bookmark.id === id) || {}).events || [];

// Real adjacency: the drift walks borders as well as sea lanes, so a fake
// geometry would only ever exercise half the mechanic.
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
function rawGeom() {
  return {
    neighbors: snap.neighbors.map((a) => new Set(a)),
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas),
    bbox: [],
  };
}
function foldGeom(raw, mapping) {
  const N = raw.neighbors.length - 1;
  const to = (id) => (mapping && mapping[id]) || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    for (const nb of raw.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  return { ...raw, neighbors };
}
function boot(bookmark, events, playerTag, seed = 11) {
  const bus = { emit() {}, on() { return () => {}; } };
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const geom = foldGeom(rawGeom(), provinceMap);
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events, provinceMap });
  return { game, ctx, actions: gameActions(ctx) };
}
// Years of drift, and nothing else: the mechanic under test in isolation.
function drift(ctx, years) {
  for (let y = 0; y < years; y++) {
    for (let m = 0; m < 12; m++) monthlyFaithDrift(ctx);
    ctx.game.date.y += 1;
  }
}

console.log('== §104: the ambient drift ==');
{
  const { ctx } = boot(BOOKMARK_132, eventsFor('132ce'), 'JUD');
  const antioch = ctx.prov('Antioch');
  const sepphoris = ctx.prov('Sepphoris');
  ok(shareOf(antioch, 'christianity') === 0 && antioch.religion === 'hellenism',
    'in April 132 there is no Christianity anywhere on the map');
  ok(shareOf(antioch, 'godfearers') > 0.05,
    'the god-fearers are seeded in the synagogue cities of the Greek east');

  drift(ctx, 20);
  ok(shareOf(antioch, 'christianity') > 0
    && shareOf(antioch, 'christianity') < 0.05,
    'a seed city has a congregation within a generation, and only a congregation ('
    + Math.round(shareOf(antioch, 'christianity') * 1000) / 10 + '%)');
  ok(antioch.religion === 'hellenism',
    'the province label does not move when the shares do');

  drift(ctx, 250); // to ~402 CE
  const chr = shareOf(antioch, 'christianity');
  ok(chr > 0.4, 'by the fifth century Antioch has turned (' + Math.round(chr * 100) + '%)');
  ok(antioch.religion === 'christianity',
    'and only THEN does the majority community rename the province');
  ok(shareOf(antioch, 'judaism') > 0.05,
    'the Jewish quarter of a Christianized city is still there (' + Math.round(shareOf(antioch, 'judaism') * 100) + '%)');
  ok(shareOf(sepphoris, 'judaism') > 0.9 && sepphoris.religion === 'judaism',
    'the Galilee is still Jewish after two hundred and seventy years — resistance is the whole point');
  ok(shareOf(ctx.prov('Alexandria'), 'christianity') > 0.4
    && shareOf(ctx.prov('Tyre'), 'christianity') > 0.3,
    'the faith reaches cities it was never seeded in, by road and by sea lane');
  ok(shareOf(ctx.prov('Neapolis'), 'samaritanism') > 0.85,
    'Gerizim resists harder than the Galilee does, and holds');
}

console.log('== §104: what the drift will not do ==');
{
  const { ctx } = boot(BOOKMARK_132, eventsFor('132ce'), 'JUD');
  drift(ctx, 200);
  const p = ctx.prov('Corinth');
  const before = shareOf(p, 'christianity');
  ok(before > 0.02, 'Corinth has a congregation to take away');
  // The state's own missionaries: convertProvince's machinery, applied whole.
  for (const e of p.pop) if (e.r === 'christianity') e.r = 'hellenism';
  const { normalizePop } = await import(R + '/js/sim/population.js');
  normalizePop(p);
  ok(shareOf(p, 'christianity') === 0, 'a state can reclaim a province outright');
  drift(ctx, 15);
  ok(shareOf(p, 'christianity') > 0,
    'and the drift resumes the following month — no player action reverses it');
}
{
  const off = { ...BOOKMARK_132, mechanics: { ...(BOOKMARK_132.mechanics || {}), faithDrift: false } };
  const { ctx } = boot(off, eventsFor('132ce'), 'JUD');
  drift(ctx, 200);
  ok(shareOf(ctx.prov('Antioch'), 'christianity') === 0,
    'mechanics.faithDrift:false switches the whole pass off');
  const { ctx: ctx66 } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  drift(ctx66, 100);
  ok(shareOf(ctx66.prov('Antioch'), 'christianity') === 0,
    'a bookmark with no drift table is untouched (66 CE keeps its own religions)');
}

console.log('== §104: the god-fearers ==');
{
  const open = boot(BOOKMARK_132, eventsFor('132ce'), 'JUD');
  const barred = boot(BOOKMARK_132, eventsFor('132ce'), 'JUD');
  barred.game.flags.missionBarred = true;
  const p0 = shareOf(open.ctx.prov('Antioch'), 'godfearers');
  drift(open.ctx, 60);
  drift(barred.ctx, 60);
  const openJews = shareOf(open.ctx.prov('Antioch'), 'judaism');
  const barredJews = shareOf(barred.ctx.prov('Antioch'), 'judaism');
  const barredPool = shareOf(barred.ctx.prov('Antioch'), 'godfearers');
  ok(p0 > 0 && shareOf(open.ctx.prov('Antioch'), 'godfearers') < p0,
    'the pool is drawn down when both missions are in the field');
  ok(openJews > barredJews + 0.02,
    'an open Jewish mission grows the community out of the pool ('
    + Math.round(openJews * 100) + '% vs ' + Math.round(barredJews * 100) + '%)');
  ok(barredPool > 0.05,
    'a barred mission leaves the pool standing for the other claimant to take later');
  // Permanence: the flag is never cleared by anything downstream.
  drift(barred.ctx, 60);
  ok(shareOf(barred.ctx.prov('Antioch'), 'judaism') <= barredJews + 0.005,
    'and the bar does not lift with time — the rescript is the one permanent card in the set');
}

console.log('== §104: the era windows ==');
{
  const evs = eventsFor('132ce');
  const scripted = evs.filter((e) => e && /^ev2_|^ev132_/.test(e.id));
  const triggered = scripted.filter((e) => typeof e.trigger === 'function' && !e.date);
  const unbounded = triggered.filter((e) => !Number.isFinite(e.minYear) || !Number.isFinite(e.maxYear))
    .map((e) => e.id);
  // The two victory cards are fired by name from checkVictory, which bypasses
  // canFire entirely; bounds on them would be decoration.
  const allowed = ['ev132_terms', 'ev132_endurance_terms'];
  ok(unbounded.every((id) => allowed.indexOf(id) >= 0),
    'every triggered card in the 132 chain carries an era window (unbounded: '
    + (unbounded.join(', ') || 'none') + ')');
  ok(triggered.length >= 34, 'and there are ' + triggered.length + ' of them to bound');
  const both = evs.filter((e) => e && e.date && typeof e.trigger === 'function').map((e) => e.id);
  ok(!both.length,
    'no card carries both a date and a trigger — the engine would silently ignore the trigger ('
    + (both.join(', ') || 'none') + ')');
  // The chain's own cards stop when their generation does. (The shared
  // modern pool that rides every bookmark carries minYear 1900 and is not
  // this chain's business.)
  // SPEC §114's third outcome (`ev2_g_*`) is deliberately NOT a
  // revolt-generation arc: it is the three centuries of a Jewish state that
  // survived in the Galilee, and its cards run from 140 to 425 on purpose. The
  // rule keeps its teeth for everything it was written for.
  const late = scripted.filter((e) => typeof e.trigger === 'function'
    && !/^ev2_g_/.test(e.id)
    && Number.isFinite(e.maxYear) && e.maxYear > 260);
  ok(!late.length, 'no revolt-generation card can be answered in the fourth century ('
    + (late.map((e) => e.id).join(', ') || 'none') + ')');
  const third = scripted.filter((e) => /^ev2_g_/.test(e.id));
  ok(third.length >= 6, 'and the third outcome is a separate arc of '
    + third.length + ' cards with its own windows');
}

console.log('== §104: the world keeps happening ==');
{
  const evs = eventsFor('132ce');
  const world = evs.filter((e) => e && e.world === true && e.date);
  ok(world.length >= 20, 'the bookmark has ' + world.length + ' dated world events (it had four)');
  const last = world.reduce((a, e) => Math.max(a, e.date.y), 0);
  ok(last >= 425, 'and the last of them is in ' + last + ', not 166');
  // No decade-long silences between 166 and 425.
  const years = world.map((e) => e.date.y).filter((y) => y >= 166).sort((a, b) => a - b);
  let worst = 0;
  for (let i = 1; i < years.length; i++) worst = Math.max(worst, years[i] - years[i - 1]);
  ok(worst <= 45, 'the longest silence in the spine is ' + worst + ' years');

  const { game, ctx } = boot(BOOKMARK_132, evs, 'JUD');
  game.date.y = 200; game.date.m = 1;
  const nxt = nextWorldEvent(ctx);
  ok(nxt && nxt.date.y === 212,
    'the world clock in a 200 CE campaign points at the next thing that happens ('
    + (nxt ? nxt.date.y : 'nothing') + ')');
  game.date.y = 370;
  // The next thing that happens after 370 is Adrianople (events_132ce_west.js,
  // 378) — the pin moved when the western spine landed, exactly as it should.
  ok(nextWorldEvent(ctx) && nextWorldEvent(ctx).date.y === 378,
    'and still does in 370');
}

console.log('== §104: the world the card needed ==');
{
  // ev2_patriarchate_ends is the marker card: it happens in the world where
  // Rome won and cannot happen in the world where it did not.
  const evs = eventsFor('132ce');
  const ev = evs.find((e) => e.id === 'ev2_patriarchate_ends');
  ok(!!ev && typeof ev.when === 'function', 'the patriarchate card is `when`-gated');
  const { game, ctx } = boot(BOOKMARK_132, evs, 'JUD');
  // A world where the Nasi's state stands: Judaea holds Jerusalem, no war.
  game.wars = [];
  const jer = ctx.prov('Jerusalem');
  jer.owner = 'JUD'; jer.controller = 'JUD';
  ok(!ev.when(ctx), 'and it does not fit a world in which Judaea kept the city');
  game.date.y = 425; game.date.m = 5;
  checkDateEvents(ctx);
  ok(!!game.firedEvents.ev2_patriarchate_ends
    && !game.pendingEvents.some((pe) => pe.eventId === 'ev2_patriarchate_ends'),
    'so its month retires it instead of firing it');
  ok((game.retiredChapters || []).some((r) => r && r.id === 'ev2_patriarchate_ends'),
    'and the ledger records the page that never got written');
  // The same card in the world it WAS written for.
  const rome = boot(BOOKMARK_132, evs, 'JUD');
  rome.game.date.y = 425; rome.game.date.m = 5;
  rome.game.wars = [];
  for (let i = 1; i < rome.game.provinces.length; i++) {
    const p = rome.game.provinces[i];
    if (p && p.owner === 'JUD') { p.owner = 'ROM'; p.controller = 'ROM'; }
  }
  ok(ev.when(rome.ctx), 'and it does fit the world in which Rome kept it');
}

console.log('== §104: the dynasty that annuls a friendship ==');
{
  const evs = eventsFor('132ce');
  const { game, ctx } = boot(BOOKMARK_132, evs, 'JUD');
  ok(!!affinityPair(ctx, 'JUD', 'PAR'), 'the bookmark seeds a Judaean-Arsacid affinity');
  const ard = evs.find((e) => e.id === 'ev2_ardashir');
  ok(!!ard && ard.date.y === 224, 'Ardashir is on the calendar for 224');
  ard.options[0].effects(ctx);
  ok(game.tags.PAR.name === 'Sasanian Empire', 'the tag is rebranded, not replaced');
  ok(!affinityPair(ctx, 'JUD', 'PAR') && !haveAffinity(ctx, 'JUD', 'PAR'),
    'and the Arsacid bond is retired with the Arsacids');
  ok(!!game.retiredAffinities, 'the annulment is plain data on the game, so a save carries it');
}

console.log('== §104: the mapmode shows the drift before the flip ==');
{
  const { ctx } = boot(BOOKMARK_132, eventsFor('132ce'), 'JUD');
  const antioch = ctx.prov('Antioch');
  ok(largestMinorityFaith(antioch).r === 'judaism',
    'a mixed city stripes its largest minority (' + largestMinorityFaith(antioch).r + ')');
  drift(ctx, 260);
  const minor = largestMinorityFaith(antioch);
  ok(antioch.religion === 'christianity' && minor && minor.r === 'judaism' && minor.share > 0.05,
    'and after the flip the stripe is the community that did not convert');
  const fresh = boot(BOOKMARK_132, eventsFor('132ce'), 'JUD');
  ok(largestMinorityFaith(fresh.ctx.prov('Hebron')) === null,
    'a homogeneous province has no stripe at all');
}

console.log('== §104: Persia, the fire and the protected peoples ==');
{
  const evs = eventsFor('614ce');
  for (const id of ['ev_p_apostate_noble', 'ev_p_vacant_throne', 'ev_p_not_romes_church',
    'ev_p_forced_baptism', 'ev_p_jizya_gradient']) {
    ok(evs.some((e) => e && e.id === id), 'the 614 chain carries ' + id);
  }
  const zoro = evs.filter((e) => e && /fire|Zoroastr|mobad|apostat/i.test(
    String(e.desc || '') + String(e.title || ''))).length;
  ok(zoro >= 3, 'and coercion by the fire is now on ' + zoro + ' cards, not none');

  const { game, ctx } = boot(BOOKMARK_614, evs, 'JUD');
  const ctesiphon = ctx.prov('Seleucia-Ctesiphon');
  // A Christian community in the Persian heartland, in an empire at war with
  // the Christian empire — which is the war the bookmark opens with.
  ctesiphon.pop = [
    { r: 'zoroastrianism', c: 'persian', n: 6000 },
    { r: 'christianity', c: 'aramean', n: 4000 },
  ];
  const nehardea = ctx.prov('Nehardea');
  nehardea.pop = [{ r: 'judaism', c: 'judean', n: 5000 }];
  nehardea.owner = 'SAS'; nehardea.controller = 'SAS';
  monthlyFaithDrift(ctx);
  const suspect = (p) => (p.modifiers || []).some((m) => m && m.id === 'foreign_patron_christianity');
  ok(suspect(ctesiphon),
    'a large Christian community under a crown at war with Byzantium is suspected');
  ok(!suspect(nehardea) && !(nehardea.modifiers || []).length,
    'and the Jews of Babylonia are not — they have no emperor over the border');

  const synod = evs.find((e) => e.id === 'ev_p_not_romes_church');
  synod.options[0].effects(ctx);
  ok(!!game.flags.churchOfTheEastFree && !suspect(ctesiphon),
    'the synod at Ctesiphon clears the charge');
  monthlyFaithDrift(ctx);
  ok(!suspect(ctesiphon), 'and it does not come back the following month');
}

console.log('== §104: the gradient, not the sword ==');
{
  const evs = eventsFor('614ce');
  const { game, ctx } = boot(BOOKMARK_614, evs, 'JUD');
  const yathrib = ctx.prov('Yathrib');
  drift(ctx, 40);
  ok(shareOf(yathrib, 'islam') === 0,
    'Islam does not drift before the conquest has settled into an assessment');
  game.flags.jizyaAssessed = true;
  drift(ctx, 1);
  ok(shareOf(yathrib, 'islam') > 0.1,
    'and the crown\'s own provinces are seeded the month it does');
  const emesa = ctx.prov('Emesa');
  drift(ctx, 40);
  ok(shareOf(emesa, 'islam') === 0,
    'a province nobody has conquered is not converted by a tax nobody is charging it');
  // The conquest, minimally: the Caliphate is awake and the Levant answers
  // to it. (An establishment is what makes the assessment bite — a dormant
  // tag has no governors to send.)
  game.tags.RSH.alive = true;
  for (const n of ['Emesa', 'Damascus', 'Jerusalem', 'Antioch', 'Caesarea Maritima']) {
    const p = ctx.prov(n);
    if (p) { p.owner = 'RSH'; p.controller = 'RSH'; }
  }
  drift(ctx, 1);
  ok(shareOf(emesa, 'islam') > 0 && shareOf(emesa, 'islam') < 0.3,
    'a conquered province gets a garrison, not a conversion ('
    + Math.round(shareOf(emesa, 'islam') * 100) + '%)');
  drift(ctx, 250);
  ok(shareOf(emesa, 'islam') > 0.3 && shareOf(emesa, 'christianity') > 0.15,
    'and three centuries later the Levant is genuinely mixed, not flipped ('
    + Math.round(shareOf(emesa, 'islam') * 100) + '% / '
    + Math.round(shareOf(emesa, 'christianity') * 100) + '%)');
  ok(shareOf(ctx.prov('Nehardea'), 'judaism') > 0.7,
    'and Babylonian Jewry is still there, which is the point of a resisted draw');
}

console.log('== §104: the Christian thread ==');
{
  const evs = eventsFor('132ce');
  for (const id of ['ev2_not_our_star', 'ev2_fifteenth_bishop', 'ev2_proselyte_ban',
    'ev2_marcion', 'ev2_trypho', 'ev2_quartodeciman', 'ev2_plague_charity', 'ev2_sardis_homily']) {
    ok(evs.some((e) => e && e.id === id), 'the 132 chain carries ' + id);
  }
  const christian = evs.filter((e) => e && /christ/i.test(
    String(e.desc || '') + String(e.title || '') + JSON.stringify(e.options || []))).length;
  ok(christian >= 8, 'the bookmark that had zero occurrences of Christianity now has ' + christian + ' cards touching it');

  // The rescript's second clause is the one that closes the mission.
  const { game, ctx } = boot(BOOKMARK_132, evs, 'JUD');
  const ban = evs.find((e) => e.id === 'ev2_proselyte_ban');
  ban.options[0].effects(ctx);
  ok(game.flags.missionBarred === true, 'accepting the rescript bars the mission');
  const ctx2 = boot(BOOKMARK_132, evs, 'JUD');
  ban.options[1].effects(ctx2.ctx);
  ok(ctx2.game.flags.proselytesDefended === true && !ctx2.game.flags.missionBarred,
    'refusing it keeps the field, under a capital statute');

  // The fifteenth bishop puts a church in Aelia — in the world where Rome won.
  const ctx3 = boot(BOOKMARK_132, evs, 'JUD');
  const bishop = evs.find((e) => e.id === 'ev2_fifteenth_bishop');
  ok(typeof bishop.when === 'function' && !!bishop.date, 'the bishops list is date + when, not date + trigger');
  bishop.options[0].effects(ctx3.ctx);
  ok(shareOf(ctx3.ctx.prov('Jerusalem'), 'christianity') > 0,
    'and it founds the gentile church the drift then grows');
}

console.log(failures ? `smoke74: ${failures} FAIL` : 'smoke74: ALL PASS');
process.exit(failures ? 1 : 0);
