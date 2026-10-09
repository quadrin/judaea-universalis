// Headless regression — SPEC §58: pre-existing works & starting forces per
// bookmark; and (SPEC §292, which replaced the merchant marine of §58) the
// merchant cap, merchants that travel and serve where they arrive, and a
// merchant whose home port falls.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const trade = await import(R + '/js/sim/trade.js');
const { capitalProvince } = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

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

function boot(bookmark, playerTag, seed = 58) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: [] });
  return { game, ctx, actions: gameActions(ctx) };
}

console.log('== the built world precedes the first order (buildings overlay) ==');
{
  const { ctx } = boot(BOOKMARK_1948, 'ISR');
  ok(ctx.prov('Dora').buildings.includes('shipyard'), 'Haifa harbor is a working shipyard in 1948');
  ok(ctx.prov('Joppa').buildings.includes('airfield'), 'Tel Aviv has its airstrip');
  ok(ctx.prov('Salamis').buildings.includes('shipyard')
      && ctx.prov('Salamis').buildings.includes('airfield'), 'British Cyprus has docks and a runway');
  ok(!ctx.prov('Jerusalem').buildings.includes('airfield'), 'no phantom works elsewhere');
  const { ctx: c66 } = boot(BOOKMARK_66, 'JUD');
  ok(c66.prov('Caesarea Maritima').buildings.includes('shipyard'), "Herod's Sebastos stands in 66 CE");
  ok(c66.prov('Alexandria').buildings.includes('granary'), 'the Alexandrian grain machine is built');
}

console.log('== the starting establishments are afloat and aloft ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  const fleets = Object.values(game.fleets).filter(Boolean);
  const isr = fleets.find((f) => f.tag === 'ISR');
  ok(!!isr && isr.ships === 3 && isr.prov === ctx.prov('Dora').id,
    'the Sea Corps rides at Haifa with 3 hulls');
  ok(Number.isFinite(isr.gen) && Array.isArray(isr.path) && isr.admiral === null,
    'the seeded fleet wears the full fleet shape (gen/path/admiral)');
  const wings = Object.values(game.airwings).filter(Boolean);
  ok(wings.some((w) => w.tag === 'ISR' && w.name === '101 Squadron'), '101 Squadron stands at Tel Aviv');
  ok(wings.filter((w) => w.tag === 'EGY').length === 2, 'Egypt fields two squadrons at Cairo');
  ok(wings.some((w) => w.tag === 'UK'), 'the RAF keeps a squadron on Cyprus');
  const { game: g66 } = boot(BOOKMARK_66, 'JUD');
  const rom = Object.values(g66.fleets).filter((f) => f && f.tag === 'ROM');
  ok(rom.length === 2 && rom.reduce((s, f) => s + f.ships, 0) === 14,
    'Rome opens 66 CE with the Alexandrian and Syrian classes at sea');
}

console.log('== the merchant cap: two, and one for every three markets and shipyards ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  const dora = ctx.prov('Dora');
  game.tags.ISR.treasury = 900;
  const cap = trade.merchantCap(ctx, 'ISR');
  ok(cap >= trade.TRADE.capBase && cap <= trade.TRADE.capMax, 'Israel may keep ' + cap + ' merchants');
  for (let i = 0; i < cap; i++) ok(trade.buildMerchantCore(ctx, 'ISR', dora.id, 'ship').ok, 'merchant ' + (i + 1) + ' fits out at Haifa');
  const over = trade.buildMerchantCore(ctx, 'ISR', dora.id, 'ship');
  ok(!over.ok && /no more/.test(over.why), 'one over the cap is refused: ' + over.why);
  const inland = ctx.prov('Jerusalem');
  ok(!trade.buildMerchantInfo(ctx, 'ISR', inland.id, 'ship').can, 'no merchant ship is fitted out inland');
}

console.log('== merchants travel, serve where they arrive, and come home ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  const dora = ctx.prov('Dora');
  game.tags.ISR.treasury = 500;
  const m = trade.buildMerchantCore(ctx, 'ISR', dora.id, 'ship').merchant;
  ok(m.state === 'home' && m.at === dora.id, 'she waits at Haifa');
  const res = trade.sendMerchantCore(ctx, 'ISR', m.id, 'egypt', 'collect');
  ok(res.ok && res.days > 0 && m.state === 'out', 'sent to collect at Alexandria, she sails (' + res.days + ' days)');
  const at = () => trade.tradeView(ctx, 'ISR').nodes.find((n) => n.id === 'egypt');
  ok(at().merchants === 0, 'at sea she serves nowhere');
  ok(!trade.sendMerchantCore(ctx, 'ISR', m.id, 'rome', 'collect').ok, 'and takes no new orders until she arrives');
  for (let d = 0; d < 60 && m.state === 'out'; d++) trade.merchantsDaily(ctx);
  ok(m.state === 'posted' && at().merchants === 1 && at().collecting, 'she arrives and Israel collects at Alexandria');
  // In 1948 the roads end at Suez: there is nowhere to steer from Egypt.
  const steer = trade.sendMerchantCore(ctx, 'ISR', m.id, 'egypt', 'steer', 'aegean');
  ok(!steer.ok && /roads end/.test(steer.why), 'Egypt is the end of the roads in 1948: ' + steer.why);
  ok(trade.sendMerchantCore(ctx, 'ISR', m.id, 'aegean', 'steer', 'egypt').ok, 'from the Aegean she can steer toward Suez');
  for (let d = 0; d < 60 && m.state === 'out'; d++) trade.merchantsDaily(ctx);
  const aeg = trade.tradeView(ctx, 'ISR').nodes.find((n) => n.id === 'aegean');
  ok(m.state === 'posted' && aeg.steerTo === 'egypt' && !aeg.collecting, 'posted to steer, she sends the Aegean\'s share on to Egypt');
  ok(trade.sendMerchantCore(ctx, 'ISR', m.id, 'aegean', 'collect').ok && m.order === 'collect' && m.state === 'posted',
    'a new order at her own post takes effect at once');
  ok(trade.recallMerchantCore(ctx, 'ISR', m.id).ok && m.state === 'back', 'recalled, she sails for home');
  for (let d = 0; d < 60 && m.state === 'back'; d++) trade.merchantsDaily(ctx);
  ok(m.state === 'home' && m.at === dora.id && !m.node, 'and docks at Haifa');
  const capital = capitalProvince(ctx, 'ISR');
  const car = trade.buildMerchantCore(ctx, 'ISR', capital.id, 'caravan');
  ok(car.ok, 'a caravan sets out from the capital, ' + capital.name + ': ' + (car.why || ''));
  const r = trade.merchantRoute(ctx, car.merchant, 'damascus');
  ok(r && r.days >= 3 && Array.isArray(r.path) && r.path.length >= 2, 'it has an overland road to Damascus: ' + (r && r.days) + ' days');
  ok(!trade.merchantRoute(ctx, m, 'damascus'), 'a merchant ship cannot sail to an inland market');
}

console.log('== a fallen home port: another harbor, or the ship is lost ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  const dora = ctx.prov('Dora');
  const joppa = ctx.prov('Joppa');
  joppa.buildings.push('shipyard');
  game.tags.ISR.treasury = 500;
  const m = trade.buildMerchantCore(ctx, 'ISR', dora.id, 'ship').merchant;
  trade.sendMerchantCore(ctx, 'ISR', m.id, 'egypt', 'collect');
  for (let d = 0; d < 60 && m.state === 'out'; d++) trade.merchantsDaily(ctx);
  dora.controller = 'EGY';
  ok(trade.recallMerchantCore(ctx, 'ISR', m.id).ok && m.to === joppa.id, 'Haifa has fallen: she makes for Tel Aviv');
  for (let d = 0; d < 60 && m.state === 'back'; d++) trade.merchantsDaily(ctx);
  ok(m.state === 'home' && m.home === joppa.id, 'and Tel Aviv is her home now');
  trade.sendMerchantCore(ctx, 'ISR', m.id, 'egypt', 'collect');
  for (let d = 0; d < 60 && m.state === 'out'; d++) trade.merchantsDaily(ctx);
  for (const p of game.provinces) if (p && p.owner === 'ISR') p.controller = 'EGY';
  trade.recallMerchantCore(ctx, 'ISR', m.id);
  trade.merchantsDaily(ctx);
  ok(!game.merchants.includes(m), 'with no port of ours left she is lost, not stuck');
}

console.log('== old saves: the merchant marine becomes merchants ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  const saved = JSON.parse(JSON.stringify(game));
  delete saved.merchants;
  delete saved.nextMerchantId;
  saved.provinces[ctx.prov('Dora').id].merchantShips = 2;
  saved.merchantVoyages = [{ tag: 'ISR', from: ctx.prov('Dora').id, to: ctx.prov('Joppa').id, daysLeft: 3 }];
  const revived = reviveGame(saved);
  ok(Array.isArray(revived.merchants) && revived.merchants.length === 3
    && revived.merchants.every((m) => m.tag === 'ISR' && m.kind === 'ship' && m.state === 'home'),
  'two hulls at Haifa and one at sea become three idle merchant ships');
  ok(revived.merchantVoyages.length === 0 && revived.provinces[ctx.prov('Dora').id].merchantShips === undefined,
    'the old marine is gone');
  ok(revived.nextMerchantId === 4, 'and the next merchant gets a fresh id');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
