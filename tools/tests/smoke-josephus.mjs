// Exercise the added source-based choices through the real event engine.
import assert from 'node:assert/strict';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { EVENTS_66_JOSEPHUS as cards } from '../../js/data/events_66ce_josephus.js';
import { initGame, makeCtx } from '../../js/sim/init.js';
import { checkDateEvents, resolveEventOption } from '../../js/sim/events.js';
import { bus } from '../../js/core/bus.js';
const era = ERAS.find(e => e.bookmark.id === '66ce');
const N = MAP_DATA.provinces.length;
const geom = { neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map(p => { const [x,y] = MAP_DATA.project(p.lon,p.lat); return {x,y}; })],
  areas: new Int32Array(N + 1), bbox: [] };
function setup(ev, playerTag = 'JUD') {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: [ev], playerTag, rngSeed: 42 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: [ev], bus });
  game.date = { ...ev.date, d: 1 };
  for (const name of ['Gischala', 'Tarichaea', 'Joppa']) ctx.prov(name).controller = 'JUD';
  ctx.prov('Antioch').controller = 'ROM';
  game.flags.templeBurned = true;
  return ctx;
}
for (const ev of cards) {
  assert.equal(era.events.filter(e => e.id === ev.id).length, 1);
  for (let choice = 0; choice < ev.options.length; choice++) {
    const ctx = setup(ev);
    assert.ok(ev.when(ctx), `${ev.id} eligible in its historical setting`);
    checkDateEvents(ctx);
    const pending = ctx.game.pendingEvents.find(p => p.eventId === ev.id);
    assert.ok(pending, `${ev.id} queued`);
    const before = JSON.stringify([ctx.game.tags.JUD.treasury, ctx.game.tags.JUD.points]);
    resolveEventOption(ctx, pending.instanceId, choice);
    assert.notEqual(JSON.stringify([ctx.game.tags.JUD.treasury, ctx.game.tags.JUD.points]), before, `${ev.id}:${choice} applies its choice`);
    assert.equal(ctx.game.pendingEvents.length, 0);
    checkDateEvents(ctx);
    assert.equal(ctx.game.pendingEvents.length, 0, 'one-shot event does not repeat');
  }
}
// Local choices retire after peace; queued choices must not apply after peace.
for (const ev of cards.slice(0, 3)) {
  const ctx = setup(ev);
  ctx.game.wars = [];
  assert.equal(ev.when(ctx), false);
  checkDateEvents(ctx);
  assert.equal(ctx.game.pendingEvents.length, 0);
  const queued = setup(ev);
  checkDateEvents(queued);
  const p = queued.game.pendingEvents[0];
  queued.game.wars = [];
  const before = queued.game.tags.JUD.treasury;
  resolveEventOption(queued, p.instanceId, 1);
  assert.equal(queued.game.tags.JUD.treasury, before, 'peace blocks stale war choice');
}
const baggage = setup(cards[1]);
baggage.prov('Tarichaea').controller = 'ROM';
assert.equal(cards[1].when(baggage), false, 'baggage needs rebel Tarichaea');
const oil = setup(cards[0]);
oil.prov('Gischala').controller = 'ROM';
assert.equal(cards[0].when(oil), false, 'oil needs rebel Gischala');
const joppa = setup(cards[2]);
joppa.prov('Joppa').controller = 'ROM';
assert.equal(cards[2].when(joppa), false, 'flotilla needs rebel Joppa');
const charters = setup(cards[3], 'AGR');
charters.game.flags.templeBurned = false;
assert.equal(cards[3].when(charters), false, 'no destroyed-homeland premise on Temple survival branch');
charters.game.flags.templeBurned = true;
checkDateEvents(charters);
const beforeAgr = charters.game.tags.AGR.treasury;
const beforeJud = charters.game.tags.JUD.treasury;
resolveEventOption(charters, charters.game.pendingEvents[0].instanceId, 0);
assert.equal(charters.game.tags.AGR.treasury, beforeAgr - 25, 'charter advocacy paid by the player court');
assert.equal(charters.game.tags.JUD.treasury, beforeJud, 'other court is not charged');
const repairs = setup(cards[1]);
cards[1].options[0].effects(repairs);
assert.ok(repairs.prov('Tarichaea').modifiers.some(m => m.id === 'ev66j_baggage_defences' && m.effects.unrest === -1));
for (const e of ERAS) assert.equal(new Set(e.events.map(ev => ev.id)).size, e.events.length, `unique IDs in ${e.bookmark.id}`);
console.log('ALL PASS — Josephus choices, ownership and war gates, peace after queuing, player court, registry');
