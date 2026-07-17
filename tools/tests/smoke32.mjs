// Headless regression — SPEC §52: every era plays by its own rules.
// Era-gated mechanics (conversion off in 1948), buildings that wear the face
// of their age (Walls → Fortified Line), the era-windowed generic event pool,
// pattern-scaled army upkeep, the oil good + fuel line, and the scaling
// administration expense.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { GENERIC_EVENTS } = await import(R + '/js/data/events_generic.js');
const { initGame, makeCtx, gameActions, reconcileGameProvinces } = await import(R + '/js/sim/init.js');
const { checkTriggeredEvents } = await import(R + '/js/sim/events.js');
const { incomeBreakdown, adminExpense, fuelExpense, controlsOilProvince } = await import(R + '/js/sim/economy.js');
const { monthlyNavy } = await import(R + '/js/sim/navy.js');
const { mechanicOn, regCount, armiesOf, resolveTagMult, devTotal, buildingFace } = await import(R + '/js/sim/military.js');
const { genUpkeepMult, unlockedGen } = await import(R + '/js/data/tech.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

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

function boot(bookmark, events, playerTag, seed = 52) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events });
  return { game, ctx, actions: gameActions(ctx) };
}

console.log('== the conversion gate ==');
{
  const m = boot(BOOKMARK_1948, [], 'ISR');
  const a = boot(BOOKMARK_66, [], 'JUD');
  ok(mechanicOn(a.ctx, 'conversion') && !mechanicOn(m.ctx, 'conversion'),
    'conversion is on in 66 CE and declared off by the 1948 bookmark');
  // An Israeli-owned province of another faith: the control must be gone.
  const target = m.game.provinces.find((p) => p && p.owner === 'ISR' && p.controller === 'ISR');
  target.religion = 'islam'; // stage a foreign-faith district
  ok(!!target, '1948 Israel owns a stageable province');
  m.game.tags.ISR.points.infl = 200;
  const integ = m.actions.getIntegration(target.id);
  ok(integ && integ.showConvert === false && integ.canConvert === false,
    '1948 getIntegration hides and disables Convert Faith');
  m.actions.convertProvince(target.id);
  ok(!target.conversion && m.game.tags.ISR.points.infl === 200,
    '1948 convertProvince refuses and spends nothing');
  // The ancient chapters keep the tool.
  const heathen = a.game.provinces.find((p) => p && p.owner === 'JUD' && p.controller === 'JUD');
  heathen.religion = 'hellenism'; // stage a foreign-faith district
  a.game.tags.JUD.points.infl = 200;
  const ai2 = a.actions.getIntegration(heathen.id);
  ok(ai2 && ai2.showConvert !== false, '66 CE still shows the Convert Faith control');
  a.actions.convertProvince(heathen.id);
  ok(!!heathen.conversion, '66 CE conversion still starts the missionaries');
}

console.log('== buildings wear the face of their age ==');
{
  const m = boot(BOOKMARK_1948, [], 'ISR');
  const a = boot(BOOKMARK_66, [], 'JUD');
  const wallsDef = DEFINES.BUILDINGS.walls;
  ok(buildingFace(wallsDef, 19).name === 'Fortified Line'
      && buildingFace(wallsDef, 5).name === 'Walls',
    'walls resolve to Fortified Line at tech 19 and Walls at tech 5');
  const mProv = m.game.provinces.find((p) => p && p.owner === 'ISR' && p.controller === 'ISR' && (p.fort | 0) < 3);
  const mInfo = m.actions.getBuildInfo(mProv.id);
  const mWalls = mInfo.options.find((o) => o.key === 'walls');
  const mShrine = mInfo.options.find((o) => o.key === 'shrine');
  ok(mWalls && mWalls.name === 'Fortified Line' && mWalls.months === 12,
    '1948 build menu offers a 12-month Fortified Line, not Walls');
  ok(mShrine && mShrine.name === 'House of Worship',
    '1948 build menu raises a House of Worship, not a Shrine');
  const aProv = a.game.provinces.find((p) => p && p.owner === 'JUD' && p.controller === 'JUD' && (p.fort | 0) < 3);
  const aInfo = a.actions.getBuildInfo(aProv.id);
  const aWalls = aInfo.options.find((o) => o.key === 'walls');
  ok(aWalls && aWalls.name === 'Walls' && aWalls.months === 18,
    '66 CE build menu still raises 18-month Walls');
}

console.log('== the era-windowed murmur ==');
{
  const antique = GENERIC_EVENTS.filter((e) => Number.isFinite(e.maxYear) && e.maxYear <= 1799);
  const modern = GENERIC_EVENTS.filter((e) => Number.isFinite(e.minYear) && e.minYear >= 1900);
  const timeless = GENERIC_EVENTS.filter((e) => !Number.isFinite(e.maxYear) && !Number.isFinite(e.minYear));
  ok(antique.length === 10 && modern.length === 10 && timeless.length === 2,
    'the pool splits 10 antique / 10 modern / 2 timeless events');
  ok(timeless.every((e) => ['gen_corruption', 'gen_old_debts'].includes(e.id)),
    'only embezzlement and creditors are timeless');
  // A certain-fire pair proves the engine honors the window in both directions.
  const mkEv = (id, bounds) => ({
    id, title: id, desc: id, forTag: 'player', once: false, chance: 1,
    trigger: () => true, aiOption: 0, options: [{ label: 'x', effects: () => {} }],
    ...bounds,
  });
  const probes = [mkEv('probe_antique', { maxYear: 1799 }), mkEv('probe_modern', { minYear: 1900 })];
  const m = boot(BOOKMARK_1948, probes, 'ISR');
  checkTriggeredEvents(m.ctx);
  const mq = m.game.pendingEvents.map((pe) => pe.eventId);
  ok(mq.includes('probe_modern') && !mq.includes('probe_antique'),
    'in 1948 only the modern probe fires');
  const a = boot(BOOKMARK_66, probes, 'JUD');
  checkTriggeredEvents(a.ctx);
  const aq = a.game.pendingEvents.map((pe) => pe.eventId);
  ok(aq.includes('probe_antique') && !aq.includes('probe_modern'),
    'in 66 CE only the antique probe fires');
}

console.log('== upkeep grows with the age ==');
{
  const m = boot(BOOKMARK_1948, [], 'ISR');
  const a = boot(BOOKMARK_66, [], 'JUD');
  ok(near(genUpkeepMult(0), 1) && near(genUpkeepMult(5), 2.4),
    'pattern upkeep runs 1.0 (levies) to 2.4 (rifles and armor)');
  // 1948 Israel: gen-5 regiments must bill 2.4x the flat rate, plus fuel.
  const t = m.game.tags.ISR;
  ok(unlockedGen(t.tech.mar) === 5, '1948 Israel fields the gen-5 patterns');
  let regs = 0;
  for (const army of armiesOf(m.ctx, 'ISR')) regs += regCount(army);
  ok(regs > 0, '1948 Israel starts with a standing army');
  const bd = incomeBreakdown(m.ctx, 'ISR');
  // v5.9 (SPEC §58): 101 Squadron flies from day one — count the real wings.
  const wings = Object.values(m.game.airwings).filter((w) => w && w.tag === 'ISR').length;
  ok(wings === 1, '1948 Israel starts with one squadron');
  const wingUpkeep = (DEFINES.AIR && DEFINES.AIR.wingUpkeep) || 1;
  const expectMaint = regs * DEFINES.BASE.maintPerReg * 2.4 * resolveTagMult(m.ctx, 'ISR', 'maintMult')
    + wings * wingUpkeep;
  ok(near(bd.maint, expectMaint, 0.01),
    `Israeli maintenance is pattern-scaled (${bd.maint.toFixed(2)} for ${regs} regiments)`);
  ok(!controlsOilProvince(m.ctx, 'ISR'), 'Israel controls no oil province');
  const expectFuel = (regs * DEFINES.FUEL.perReg + wings * DEFINES.FUEL.perWing) * DEFINES.FUEL.importMult;
  ok(bd.fuel > 0 && near(bd.fuel, expectFuel, 0.01),
    `Israel pays the imported-fuel line (${bd.fuel.toFixed(2)}/month)`);
  ok(controlsOilProvince(m.ctx, 'IRQ') && controlsOilProvince(m.ctx, 'IRN') && controlsOilProvince(m.ctx, 'SAU'),
    'Iraq, Iran and Saudi Arabia pump their own oil in 1948');
  const bdIrq = incomeBreakdown(m.ctx, 'IRQ');
  let irqRegs = 0;
  for (const army of armiesOf(m.ctx, 'IRQ')) irqRegs += regCount(army);
  const irqWings = Object.values(m.game.airwings).filter((w) => w && w.tag === 'IRQ').length;
  ok(irqRegs === 0 || near(bdIrq.fuel, irqRegs * DEFINES.FUEL.perReg + irqWings * DEFINES.FUEL.perWing, 0.01),
    'an oil state pays the domestic fuel rate');
  // The ancient chapters: no fuel, milder pattern multiplier.
  const bdJud = incomeBreakdown(a.ctx, 'JUD');
  ok(bdJud.fuel === 0, '66 CE Judaea burns no oil');
  let judRegs = 0;
  for (const army of armiesOf(a.ctx, 'JUD')) judRegs += regCount(army);
  const expectJud = judRegs * DEFINES.BASE.maintPerReg * genUpkeepMult(unlockedGen(a.game.tags.JUD.tech.mar))
    * resolveTagMult(a.ctx, 'JUD', 'maintMult');
  ok(near(bdJud.maint, expectJud, 0.01), '66 CE maintenance uses the era pattern rate');
}

console.log('== administration scales with the realm ==');
{
  const a = boot(BOOKMARK_66, [], 'ROM');
  let romDev = 0;
  let osrDev = 0;
  for (const p of a.game.provinces) {
    if (!p || p.impassable || p.owner !== p.controller) continue;
    if (p.owner === 'ROM') romDev += devTotal(p);
    if (p.owner === 'OSR') osrDev += devTotal(p);
  }
  const romAdmin = adminExpense(a.ctx, 'ROM');
  ok(romDev > DEFINES.BASE.adminFreeDev
      && near(romAdmin, (romDev - DEFINES.BASE.adminFreeDev) * DEFINES.BASE.adminPerDev, 0.01),
    `Rome pays administration on ${romDev} dev (${romAdmin.toFixed(2)}/month)`);
  ok(osrDev < DEFINES.BASE.adminFreeDev && adminExpense(a.ctx, 'OSR') === 0,
    'a realm under the free allowance pays nothing');
  const bd = incomeBreakdown(a.ctx, 'ROM');
  ok(near(bd.admin, romAdmin, 1e-9) && bd.net < bd.income,
    'administration rides the monthly breakdown');
  // Occupation must not bill: flip a Roman province's controller.
  const prov = a.game.provinces.find((p) => p && p.owner === 'ROM' && p.controller === 'ROM' && devTotal(p) > 0);
  prov.controller = 'PAR';
  ok(adminExpense(a.ctx, 'ROM') < romAdmin, 'occupied land drops off the administration bill');
  prov.controller = 'ROM';
}

console.log('== oil on the map, oil at sea ==');
{
  const m = boot(BOOKMARK_1948, [], 'ISR');
  const a = boot(BOOKMARK_66, [], 'JUD');
  ok(m.ctx.prov('Susa').good === 'oil' && m.ctx.prov('Gerrha').good === 'oil'
      && m.ctx.prov('Arbela').good === 'oil',
    '1948 re-goods Khuzestan, al-Hasa and Kirkuk to oil');
  ok(a.ctx.prov('Susa').good !== 'oil' && a.ctx.prov('Arbela').good !== 'oil',
    'the ancient chapters keep their base goods');
  ok(DEFINES.GOODS.oil && DEFINES.GOODS.oil.price >= 5,
    'oil is the priciest class of good');
  // Oil-fired hulls bunker at a premium: gen-5 fleet vs gen-0 fleet.
  const t = m.game.tags.ISR;
  const before = t.treasury = 1000;
  m.game.fleets = {
    f1: { id: 'f1', tag: 'ISR', ships: 2, gen: 5 },
    f2: { id: 'f2', tag: 'ISR', ships: 2, gen: 0 },
  };
  monthlyNavy(m.ctx);
  const spent = before - t.treasury;
  ok(near(spent, 2 * 0.5 * DEFINES.FUEL.shipMult + 2 * 0.5, 0.01),
    `destroyers bunker oil at ${DEFINES.FUEL.shipMult}x while rowed hulls do not (${spent.toFixed(2)})`);
}

console.log('== fuelExpense unit shape ==');
{
  const m = boot(BOOKMARK_1948, [], 'ISR');
  const isr = fuelExpense(m.ctx, 'ISR');
  ok(isr > 0, 'fuelExpense bills a mechanized establishment');
  const a = boot(BOOKMARK_66, [], 'JUD');
  ok(fuelExpense(a.ctx, 'ROM') === 0, 'fuelExpense is zero for pre-oil patterns');
}

console.log('== old saves meet the wider world (v5.4 reconcile) ==');
{
  // Simulate a pre-v5.4 1948 save: no ITA court, no oil overlay, no new cells.
  const m = boot(BOOKMARK_1948, [], 'ISR');
  const legacy = JSON.parse(JSON.stringify(m.game));
  delete legacy.tags.ITA;
  const idOf = (name) => MAP_DATA.provinces.findIndex((p) => p.name === name) + 1;
  legacy.provinces.length = 149; // the pre-v5.4 148-cell schema
  legacy.provinces[idOf('Arbela')].good = 'grain'; // pre-oil-overlay save
  reconcileGameProvinces({
    game: legacy, DEFINES, MAP_DATA, geom,
    bookmark: BOOKMARK_1948,
  });
  const ita = legacy.tags.ITA;
  ok(!!ita && ita.alive && ita.tech && ita.tech.mar === 19 && ita.maxManpower > 0,
    'a missing court is backfilled alive, at era tech, with a manpower pool');
  ok(legacy.provinces[idOf('Roma')] && legacy.provinces[idOf('Roma')].owner === 'ITA',
    'the backfilled court owns its new land');
  ok(legacy.provinces[idOf('Arbela')].good === 'oil',
    'the goods overlay reaches provinces saved before it existed');
  const mctx = makeCtx({
    game: legacy, DEFINES, MAP_DATA, geom, bus,
    bookmark: BOOKMARK_1948, events: [],
  });
  ok(!!legacy.tags.ITA.ruler, 'makeCtx crowns the backfilled court');
  ok(controlsOilProvince(mctx, 'IRQ'), 'the migrated save pumps Kirkuk again');
  // An ancient save meets Rome and Pontus the same way.
  const a = boot(BOOKMARK_66, [], 'JUD');
  const oldRome = JSON.parse(JSON.stringify(a.game));
  delete oldRome.tags.ROM;
  oldRome.provinces.length = 149;
  reconcileGameProvinces({
    game: oldRome, DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66,
  });
  ok(!!oldRome.tags.ROM && oldRome.tags.ROM.alive,
    'an owner tag the save never seated is backfilled on reconcile');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
