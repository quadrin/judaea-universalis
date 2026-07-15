// Headless smoke test — SPEC §34: the court factions. Every bookmark defines
// factions for its victory-branch tags; approval drifts, boons and banes ride
// the modifier stream, despairing factions send demand cards, the appeasement
// lever pays and cools down, and the whole court stays offstage for AI hands
// (the harness's anomaly set must not feel it).
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const fac = await import(R + '/js/sim/factions.js');

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

console.log('== every bookmark seats a court ==');
for (const [f, ex, tags] of [
  ['bookmark_167bce', 'BOOKMARK_167', ['HAS', 'SEL']],
  ['bookmark_67bce', 'BOOKMARK_67', ['HYR', 'ARI']],
  ['bookmark_40bce', 'BOOKMARK_40', ['HER', 'ATG']],
  ['bookmark_66ce', 'BOOKMARK_66', ['JUD', 'ROM']],
  ['bookmark_115ce', 'BOOKMARK_115', ['JUD', 'ROM']],
  ['bookmark_132ce', 'BOOKMARK_132', ['JUD', 'ROM']],
  ['bookmark_614ce', 'BOOKMARK_614', ['JUD', 'BYZ']],
  ['bookmark_1948', 'BOOKMARK_1948', ['ISR', 'JOR']],
]) {
  const { [ex]: bm } = await import(R + '/js/data/' + f + '.js');
  const good = tags.every((t) => {
    const list = bm.factions && bm.factions[t];
    return Array.isArray(list) && list.length >= 3 && list.every((d) => d
      && d.id && d.name && typeof d.drift === 'function'
      && d.boon && d.boon.effects && d.bane && d.bane.effects
      && d.appease && d.appease.cost && d.demand && d.demand.title && d.demand.text);
  });
  ok(good, f.replace('bookmark_', '') + ': three full factions for ' + tags.join('+'));
}

console.log('== the court convenes for the player ==');
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag: 'JUD', rngSeed: 77 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
const actions = gameActions(ctx);
const t = game.tags.JUD;

const rows = actions.getFactions();
ok(Array.isArray(rows) && rows.length === 3, 'getFactions: three parties at the JUD court');
ok(rows.every((r) => r.approval === 50 && r.state === 'content'), 'every faction opens content at 50');
ok(rows.every((r) => r.name && r.desc && r.boonText && r.baneText && r.appeaseLabel),
  'rows carry names, descriptions, boon/bane texts and the lever');

console.log('== drift, boons and banes ==');
fac.monthlyFactions(ctx);
ok(Object.keys(t.factions).length === 3, 'approval table seeded on the tick');
t.factions.zealots = 80;
fac.monthlyFactions(ctx);
ok((t.modifiers || []).some((m) => m && m.id === 'faction_zealots_boon'), 'devoted (80): the boon modifier rides the stream');
ok(!(t.modifiers || []).some((m) => m && m.id === 'faction_zealots_bane'), 'no bane while devoted');
t.factions.zealots = 20;
game.pendingEvents.length = 0;
fac.monthlyFactions(ctx);
ok((t.modifiers || []).some((m) => m && m.id === 'faction_zealots_bane'), 'hostile (20): the bane modifier lands');
ok(!(t.modifiers || []).some((m) => m && m.id === 'faction_zealots_boon'), 'the boon is withdrawn');

console.log('== the demand card ==');
const demand = game.pendingEvents.find((pe) => pe && String(pe.eventId).startsWith('dyn_faction_'));
ok(!!demand, 'a despairing faction sends its demand');
const ev = ctx.dynEvents.get(demand.eventId);
ok(ev && ev.options.length === 2, 'the demand offers two answers: ' + (ev && ev.title));
fac.monthlyFactions(ctx);
ok(game.pendingEvents.filter((pe) => pe && String(pe.eventId).startsWith('dyn_faction_')).length === 1,
  'no second card while one is on the table');
const marBefore = t.points.mar = 200;
const appBefore = t.factions.zealots;
actions.chooseEventOption(demand.instanceId, 0);
ok(t.points.mar < marBefore, 'granting the demand pays its cost (' + (marBefore - t.points.mar) + ' martial)');
ok(t.factions.zealots > appBefore, 'granting raises approval to ' + Math.round(t.factions.zealots));
// the cooldown holds even at low approval
t.factions.zealots = 20;
fac.monthlyFactions(ctx);
ok(!game.pendingEvents.some((pe) => pe && String(pe.eventId).startsWith('dyn_faction_')),
  'the demand is not repeated inside its two-year cooldown');

console.log('== the appeasement lever ==');
t.factions.zealots = 40;
t.points.mar = 10;
let info = actions.getFactions().find((r) => r.id === 'zealots');
ok(!info.canAppease && /martial/.test(info.whyNot), 'too poor to court: ' + info.whyNot);
t.points.mar = 200;
const res = fac.appeaseFactionCore(ctx, 'JUD', 'zealots');
ok(res.ok && Math.round(t.factions.zealots) === 50, 'appeasement: +10 approval for the price');
ok(t.points.mar === 160, 'the price was 40 martial points');
const again = fac.appeaseFactionCore(ctx, 'JUD', 'zealots');
ok(!again.ok && /recently/.test(again.why), 'courted too recently: the lever cools down');

console.log('== scripted shifts fail soft ==');
ok(ctx.helpers.factionShift(ctx, 'JUD', 'notables', -15) === true, 'events can move the player\'s factions');
ok(Math.round(game.tags.JUD.factions.notables) === 35, 'the peace party drops to 35');
ok(ctx.helpers.factionShift(ctx, 'ROM', 'senate', -15) === false, 'an AI court shrugs (no-op)');
ok(ctx.helpers.factionShift(ctx, 'JUD', 'nobody', 15) === false, 'an unknown faction shrugs (no-op)');

console.log('== the AI keeps its politics offstage (harness safety) ==');
const game2 = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag: 'JUD', rngSeed: 78 });
const ctx2 = makeCtx({ game: game2, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
game2.tags.JUD.ai = true; // the harness's stance: nobody home
fac.monthlyFactions(ctx2);
ok(!game2.tags.JUD.factions, 'no approval table under an AI hand');
ok(!(game2.tags.JUD.modifiers || []).some((m) => m && String(m.id).startsWith('faction_')),
  'no faction modifiers under an AI hand');
ok(!game2.pendingEvents.some((pe) => pe && String(pe.eventId).startsWith('dyn_faction_')),
  'no demand cards under an AI hand');
const gf2 = gameActions(ctx2).getFactions();
ok(gf2 === null, 'getFactions answers null for an AI hand');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
