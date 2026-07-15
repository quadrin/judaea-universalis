// Headless smoke test — world history advances after local verdicts, and
// background campaigns act on the live map instead of forcing old borders.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { EVENTS_167 } = await import(R + '/js/data/events_167bce.js');
const { BOOKMARK_40 } = await import(R + '/js/data/bookmark_40bce.js');
const { EVENTS_40 } = await import(R + '/js/data/events_40bce.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { EVENTS_614 } = await import(R + '/js/data/events_614ce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { EVENTS_1948 } = await import(R + '/js/data/events_1948.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { checkDateEvents } = await import(R + '/js/sim/events.js');

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

function boot(bookmark, events, playerTag, seed = 111) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events });
  return { game, ctx, actions: gameActions(ctx) };
}

function effect(events, id, ctx) {
  const ev = events.find((e) => e && e.id === id);
  if (!ev) throw new Error('missing event ' + id);
  ev.options[ev.aiOption || 0].effects(ctx);
  return ev;
}

function hasWar(game, a, b) {
  return (game.wars || []).some((w) => {
    const all = (w.attackers || []).concat(w.defenders || []);
    return all.includes(a) && all.includes(b);
  });
}

console.log('== world history survives a local verdict ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  const guide = actions.getCampaignGuidance();
  ok(guide && guide.worldNext && guide.worldNext.id === 'ev_nero_dies',
    'the outliner feed distinguishes Nero’s death as the next world development');
  game.result = 'win';
  game.date = { y: 68, m: 6, d: 1 };
  checkDateEvents(ctx);
  ok(game.firedEvents.ev_nero_dies,
    'Nero still dies after the Judaean chapter has already received a verdict');
}

console.log('== Parthian expansion creates pressure, not free provinces ==');
{
  const { game, ctx } = boot(BOOKMARK_167, EVENTS_167, 'HAS');
  const mediaOwner = ctx.prov('Ecbatana').owner;
  effect(EVENTS_167, 'ev_mithridates_rises', ctx);
  ok(ctx.prov('Ecbatana').owner === mediaOwner,
    'the Media event does not transfer Ecbatana by script');
  ok(hasWar(game, 'PAR', mediaOwner),
    'Parthia instead opens a war against Media’s live holder');
  const riverOwner = ctx.prov('Seleucia-Ctesiphon').owner;
  effect(EVENTS_167, 'ev_parthia_babylon', ctx);
  ok(ctx.prov('Seleucia-Ctesiphon').owner === riverOwner,
    'the Babylonia event also leaves ownership to the field campaign');
}

console.log('== Actium respects an Egypt that can still defend itself ==');
{
  const { game, ctx } = boot(BOOKMARK_40, EVENTS_40, 'HER');
  effect(EVENTS_40, 'ev5_actium', ctx);
  ok(hasWar(game, 'ROM', 'PTO'), 'Actium opens the Roman–Ptolemaic war');
  effect(EVENTS_40, 'ev5_alexandria', ctx);
  ok(ctx.prov('Alexandria').owner === 'PTO' && game.tags.PTO.alive,
    'a strong Ptolemaic Egypt survives the historical deadline instead of being auto-annexed');
}

console.log('== the Caliphate enters the altered 614 world ==');
{
  const { game, ctx } = boot(BOOKMARK_614, EVENTS_614, 'BYZ');
  ok(game.tags.RSH && !game.tags.RSH.alive, 'the Rashidun tag begins dormant and off-map');
  effect(EVENTS_614, 'ev_p_rashidun', ctx);
  ok(game.tags.RSH.alive && Object.values(game.armies).some((a) => a.tag === 'RSH'),
    'the succession activates a real polity and field army');
  const ctesiphonOwner = ctx.prov('Seleucia-Ctesiphon').owner;
  effect(EVENTS_614, 'ev_p_iraq_raids', ctx);
  ok(hasWar(game, 'RSH', ctesiphonOwner),
    'the Iraq campaign targets whoever actually holds the rivers');
  effect(EVENTS_614, 'ev_p_levant_campaign', ctx);
  ok(hasWar(game, 'RSH', 'BYZ'),
    'the Levantine campaign independently opens the Byzantine front');
  effect(EVENTS_614, 'ev_p_ctesiphon_pressure', ctx);
  ok(ctx.prov('Seleucia-Ctesiphon').owner === ctesiphonOwner,
    'Ctesiphon receives campaign pressure but no scripted conquest');
}

console.log('== modern background politics forms and breaks real blocs ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, EVENTS_1948, 'ISR');
  effect(EVENTS_1948, 'ev_i_armistice', ctx);
  effect(EVENTS_1948, 'ev_i_free_officers', ctx);
  ok(game.tags.EGY.govType === 'republic' && /Naguib/.test(game.tags.EGY.ruler.name),
    'the 1952 coup changes Egypt’s government and ruler');
  effect(EVENTS_1948, 'ev_i_baghdad_pact', ctx);
  ok(game.tags.IRQ.allies.includes('TUR') && game.tags.IRQ.allies.includes('UK'),
    'the Baghdad Pact creates a northern alliance rather than one monolithic Arab bloc');
  effect(EVENTS_1948, 'ev_i_uar_union', ctx);
  ok(game.tags.UAR && !game.tags.EGY && !game.tags.SYR,
    'at-peace Egypt and Syria form the UAR through background politics');
  ok(ctx.prov('Memphis').owner === 'UAR' && ctx.prov('Damascus').owner === 'UAR' && game.tags.ISR.alive,
    'the union combines its actual members without requiring Israel’s destruction');
  effect(EVENTS_1948, 'ev_i_iraqi_revolution', ctx);
  ok(game.tags.IRQ.govType === 'republic' && !game.tags.IRQ.allies.includes('UK'),
    'the 1958 Iraqi revolution breaks the monarchy and its Baghdad Pact alignment');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
