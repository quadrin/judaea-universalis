// Headless regression — SPEC §56: the population makeup. Seeding from dev and
// the mixed-city tables, majority-derived religion/culture, proportional
// communal unrest scaled by integration, the Integrate project, conversion
// moving people, and immigration events.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { computeUnrestBreakdown } = await import(R + '/js/sim/unrest.js');
const { monthlyIntegration } = await import(R + '/js/sim/realm.js');
const { popTotal, communityLabel } = await import(R + '/js/sim/population.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};
const near = (a, b, eps = 0.02) => Math.abs(a - b) < eps;

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, (_, i) => {
    const s = new Set();
    if (i > 1) s.add(i - 1);
    if (i >= 1 && i < N) s.add(i + 1);
    return s;
  }),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [],
};

function boot(bookmark, playerTag, seed = 56) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: [] });
  return { game, ctx, actions: gameActions(ctx) };
}
const prov = (ctx, name) => ctx.prov(name);

console.log('== who lives where ==');
{
  const { ctx } = boot(BOOKMARK_1948, 'ISR');
  const jer = prov(ctx, 'Jerusalem');
  const total = popTotal(jer);
  ok(total > 80000 && total < 200000, 'Jerusalem 1948 is a real city: ' + total.toLocaleString());
  ok(jer.pop.length === 3 && jer.pop[0].r === 'judaism' && near(jer.pop[0].n / total, 0.60),
    'the mixed-city table seeds 60% Jews, and they lead the makeup');
  ok(jer.religion === 'judaism' && jer.culture === 'israeli',
    'the majority community names the province');
  const naz = prov(ctx, 'Sepphoris'); // Nazareth
  ok(naz.religion === 'christianity',
    'Nazareth\'s Christian plurality overrides the blanket overlay');
  const hebron = prov(ctx, 'Hebron');
  ok(hebron.pop.length === 1 && hebron.pop[0].r === 'islam',
    'an unlisted province seeds homogeneous behind its overlay');
  ok(communityLabel(DEFINES, 'islam', 'arab_modern') === 'Muslim Arabs'
      && communityLabel(DEFINES, 'judaism', 'israeli') === 'Jews',
    'communities read as people, not keys');
  // The ancient world is thinner.
  const a = boot(BOOKMARK_66, 'JUD');
  const cae = prov(a.ctx, 'Caesarea Maritima');
  ok(cae.pop.length === 2 && cae.pop[0].r === 'hellenism' && popTotal(cae) < popTotal(jer),
    'Caesarea 66 CE holds its Greek-Jewish knife\'s edge, at ancient density');
}

console.log('== communal unrest is proportional, integration calms it ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  const jer = prov(ctx, 'Jerusalem'); // ISR-owned in the sim? Jerusalem is JOR's at start.
  // Use Israeli-held Acre-substitute: take Jerusalem under ISR for the math.
  jer.owner = 'ISR'; jer.controller = 'ISR';
  const rows0 = computeUnrestBreakdown(ctx, jer).rows.filter((r) => /communities|culture/i.test(r.label));
  const heathenRow = rows0.find((r) => /Heathen communities/.test(r.label));
  ok(!!heathenRow && near(heathenRow.value, 0.40 * 3, 0.05),
    '40% non-Jewish communities yield 40% of the heathen penalty: ' + (heathenRow && heathenRow.value));
  jer.integration = 0.5;
  const rows1 = computeUnrestBreakdown(ctx, jer).rows.filter((r) => /Heathen communities/.test(r.label));
  ok(near(rows1[0].value, 0.40 * 3 * 0.5, 0.05),
    'integration halves the communal tension: ' + rows1[0].value);
  jer.integration = 1;
  const rows2 = computeUnrestBreakdown(ctx, jer).rows.filter((r) => /communities|Foreign culture/i.test(r.label));
  ok(rows2.length === 0, 'a fully integrated city has no communal unrest at all');
  // A homogeneous foreign conquest reproduces the old binary numbers.
  const heb = prov(ctx, 'Hebron');
  heb.owner = 'ISR'; heb.controller = 'ISR';
  const hebRow = computeUnrestBreakdown(ctx, heb).rows.find((r) => /Heathen communities/.test(r.label));
  ok(!!hebRow && near(hebRow.value, 3, 0.05),
    'a 100% foreign-faith conquest still bites for the full heathen 3');
}

console.log('== the Integrate project ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_1948, 'ISR');
  const acre = prov(ctx, 'Ptolemais');
  acre.owner = 'ISR'; acre.controller = 'ISR';
  const t = game.tags.ISR;
  t.points.gov = 100;
  const info0 = actions.getIntegration(acre.id);
  ok(info0 && info0.pop && info0.pop.total > 0 && info0.canIntegrate,
    'an Israeli Acre with a 75% minority may be integrated');
  actions.integrateProvince(acre.id);
  ok(acre.integrating && t.points.gov === 75, 'the program starts for 25 governance');
  ok((acre.modifiers || []).some((m) => m.id === 'reforms_resented'),
    'old hands grumble while it runs');
  for (let i = 0; i < 12; i++) monthlyIntegration(ctx);
  ok(!acre.integrating && near(acre.integration, 0.34, 0.001),
    'a year later the province is a third integrated');
  const info1 = actions.getIntegration(acre.id);
  ok(info1.canIntegrate, 'and the next program may begin');
  // Gate: a homogeneous own-faith province has nothing to integrate.
  const joppa = prov(ctx, 'Joppa');
  const infoJ = actions.getIntegration(joppa.id);
  ok(infoJ && !infoJ.canIntegrate === (infoJ.pop.rows.length === 1),
    'integration gates on actual minorities being present');
}

console.log('== conversion moves people (ancient chapters) ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_66, 'JUD');
  const cae = prov(ctx, 'Caesarea Maritima');
  cae.owner = 'JUD'; cae.controller = 'JUD';
  game.tags.JUD.points.infl = 100;
  actions.convertProvince(cae.id);
  ok(!!cae.conversion, 'the missionaries go out to Caesarea');
  for (let i = 0; i < 14; i++) monthlyIntegration(ctx);
  ok(!cae.conversion && cae.religion === 'judaism',
    'a year of missionaries and the city follows the Law');
  ok(cae.pop.every((e) => e.r === 'judaism') && popTotal(cae) > 0,
    'the PEOPLE converted — the makeup moved, not the map paint');
  ok(cae.pop.some((e) => e.c === 'greek'),
    'the converts keep their tongue: Greek-speaking Jews, like history\'s');
}

console.log('== immigration is people, not paperwork ==');
{
  const { ctx } = boot(BOOKMARK_1948, 'ISR');
  const joppa = prov(ctx, 'Joppa');
  const before = popTotal(joppa);
  const jews0 = joppa.pop.find((e) => e.r === 'judaism').n;
  ctx.helpers.addPopulation(ctx, 'Joppa', { r: 'judaism', c: 'israeli', n: 25000 });
  ok(popTotal(joppa) === before + 25000, 'the gangplanks add 25,000 souls');
  ok(joppa.pop.find((e) => e.r === 'judaism').n === jews0 + 25000,
    'all of them into the Jewish community');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
