// Headless smoke test §266: Rome makes a province of what it holds when the
// Temple burns, and Masada closes the war.
//
// The Ninth of Av burned the House and moved no ground; the Nine Hundred and
// Sixty fell and the war ran on. Now a card follows the fire — Iudaea, a
// Province of the Roman People — and Rome enters every Judaean province the
// legions hold in the census, mid-war; and the fall of Masada takes what Rome
// holds, closes the Great Revolt by the sword, and stands down a Judaea that
// has nothing left.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { GENERIC_EVENTS } = await import(R + '/js/data/events_generic.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { fireEvent, resolveEventOption, findEventById } = await import(R + '/js/sim/events.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};
const N = MAP_DATA.provinces.length;
const ev = EVENTS_66.concat(GENERIC_EVENTS);
function boot(playerTag) {
  const geom = {
    neighbors: Array.from({ length: N + 1 }, () => new Set()),
    centroids: [null, ...MAP_DATA.provinces.map((p) => { const [x, y] = MAP_DATA.project(p.lon, p.lat); return { x, y }; })],
    areas: new Int32Array(N + 1), bbox: [],
  };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: ev, playerTag, rngSeed: 11 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: ev });
  return { game, ctx, actions: gameActions(ctx) };
}
const revolt = (g) => (g.wars || []).find((w) => w.name === 'The Great Revolt');
const fire = (ctx, id, opt) => {
  const card = findEventById(ctx, id);
  fireEvent(ctx, card);
  const pe = ctx.game.pendingEvents.find((p) => p.eventId === id);
  if (pe) resolveEventOption(ctx, pe.instanceId, opt);
  return !!pe;
};
const hasMod = (p, id) => (p.modifiers || []).some((m) => m && m.id === id);

// ---------------------------------------------------------------------------
console.log('== the province follows the fire ==');
{
  const { game, ctx } = boot('JUD');
  const card = findEventById(ctx, 'ev_provincia_iudaea');
  ok(!!card && card.decider === 'ROM' && card.forTag === 'both', 'the card exists, and Rome decides it');
  const jer = ctx.prov('Jerusalem'), jer2 = ctx.prov('Jericho'), emm = ctx.prov('Emmaus'), gad = ctx.prov('Gadora');
  // A province still under the standard: any Judaean-owned, Judaean-held one that this suite does not touch.
  const heb = game.provinces.find((p) => p && !p.impassable && p.owner === 'JUD' && p.controller === 'JUD'
    && ['Jerusalem', 'Jericho', 'Emmaus', 'Gadora'].indexOf(p.name) < 0);
  ok(!card.trigger(ctx), 'it does not fire while the House stands');
  jer.controller = 'ROM'; jer2.controller = 'ROM'; emm.controller = 'ROM'; gad.controller = 'AGR';
  ok(!card.trigger(ctx), '  nor with Rome in Jerusalem but the Temple unburned');
  game.flags.templeBurned = true;
  ok(card.trigger(ctx), '  it fires once the Temple has burned and Rome holds the city');
  const notes = [];
  bus.on('notify', (n) => notes.push(n));
  ok(fire(ctx, 'ev_provincia_iudaea', 0), 'the card lands');
  ok(jer.owner === 'ROM' && jer2.owner === 'ROM' && emm.owner === 'ROM', 'the ground the legions hold is Roman ground now');
  ok(hasMod(jer, 'recent_conquest') && jer.autonomy >= 0.6, '  as a conquest is — recent, and autonomous');
  ok(gad.owner === 'JUD', '  what Agrippa\'s horse holds is not Rome\'s to enter');
  ok(heb.owner === 'JUD' && heb.controller === 'JUD', '  and what still flies the standard is still Judaea\'s');
  ok(!!revolt(game), 'the war goes on over the rest');
  ok((game.tags.ROM.modifiers || []).some((m) => m && m.id === 'fiscus_iudaicus'), 'Rome collects the fiscus Iudaicus');
  ok(notes.some((n) => /Roman province/.test(n.title) && /Jerusalem/.test(n.text)), '  and the notice names the ground: '
    + ((notes.find((n) => /Roman province/.test(n.title)) || {}).text || '').slice(0, 90));
  ok(!card.trigger(ctx) || game.firedEvents.ev_provincia_iudaea === true, '  it fires once');
}

// ---------------------------------------------------------------------------
console.log('== a Rome that waits ==');
{
  const { game, ctx } = boot('ROM');
  const jer = ctx.prov('Jerusalem');
  jer.controller = 'ROM';
  game.flags.templeBurned = true;
  ok(fire(ctx, 'ev_provincia_iudaea', 1), 'Rome may hold it as occupied ground');
  ok(jer.owner === 'JUD' && jer.controller === 'ROM', '  and nothing changes hands yet');
}

// ---------------------------------------------------------------------------
console.log('== Masada closes the war ==');
{
  const { game, ctx } = boot('JUD');
  game.date.y = 73; game.date.m = 4;
  game.flags.templeBurned = true;
  const mas = ctx.prov('Masada'), jer = ctx.prov('Jerusalem'), cae = ctx.prov('Caesarea Maritima') || ctx.prov('Caesarea');
  const heb = game.provinces.find((p) => p && !p.impassable && p.owner === 'JUD' && p.controller === 'JUD'
    && ['Jerusalem', 'Masada'].indexOf(p.name) < 0);
  jer.controller = 'ROM'; mas.controller = 'ROM';
  if (cae) cae.controller = 'JUD'; // a Roman town under the standard
  const card = findEventById(ctx, 'ev_masada_falls');
  ok(card.trigger(ctx), 'the Nine Hundred and Sixty fires with Rome on the rock after the fire');
  ok(fire(ctx, 'ev_masada_falls', 0), '  and lands');
  ok(mas.owner === 'ROM' && jer.owner === 'ROM', 'what Rome holds is Rome\'s — Masada and the city');
  ok(!revolt(game), 'the Great Revolt is closed by the sword');
  ok(heb.owner === 'JUD' && heb.controller === 'JUD', '  a Judaea of the hills keeps what it still held');
  if (cae) ok(cae.owner === 'ROM' && cae.controller === 'ROM', '  and the Roman town under the standard goes home');
  ok(game.tags.JUD.alive !== false, '  and Judaea still stands, at peace with the province beside it');
}

// ---------------------------------------------------------------------------
console.log('== a Judaea with nothing left stands down ==');
{
  const { game, ctx } = boot('ROM');
  game.date.y = 73; game.date.m = 4;
  game.flags.templeBurned = true;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'JUD') p.controller = 'ROM';
    if (p && !p.impassable && p.controller === 'JUD') p.controller = p.owner;
  }
  const before = Object.values(game.armies).filter((a) => a.tag === 'JUD').length;
  ok(before > 0, 'Judaea has ' + before + ' armies in the field');
  ok(fire(ctx, 'ev_masada_falls', 1), 'Masada falls with every Judaean province in Roman hands');
  const left = game.provinces.filter((p) => p && !p.impassable && (p.owner === 'JUD' || p.controller === 'JUD')).length;
  ok(left === 0, '  no Judaea is left on the census');
  ok(Object.values(game.armies).filter((a) => a.tag === 'JUD').length === 0, '  and its last men are stood down');
  ok(!revolt(game), '  the war is over');
  ok(game.chronicle.some((c) => /IVDAEA CAPTA/.test(c.text)), '  IVDAEA CAPTA');
}

console.log(failures ? `smoke182: ${failures} FAIL` : 'smoke182: ALL PASS');
process.exit(failures ? 1 : 0);
