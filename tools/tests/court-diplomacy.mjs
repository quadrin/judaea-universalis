import assert from 'node:assert/strict';
import { monthlyCourtDiplomacy, courtOffers, resolveCourtOffer, courtIndependenceSupport, honorCourtIndependence } from '../../js/sim/court_diplomacy.js';
import { militaryPassage } from '../../js/sim/military.js';

function fixture(human = true) {
  const tags = Object.fromEntries(['A', 'B', 'C'].map(tag => [tag, { alive: true, ai: true, name: tag,
    treasury: 300, manpower: tag === 'C' ? 20000 : tag === 'B' ? 8000 : 2000,
    maxManpower: 20000, points: { infl: 100 }, opinion: {}, allies: [], guarantees: [], atWarWith: [], modifiers: [] }]));
  tags.A.opinion = { B: 40, C: -100 }; tags.B.opinion = { A: 40, C: -100 };
  tags.B.ai = !human;
  const provinces = [null, ...['A', 'B', 'C'].map((owner, i) => ({ id: i + 1, owner, controller: owner, name: owner, dev: { tax: 1, prod: 1, mp: 1 } }))];
  const game = { date: { y: -167, m: 1 }, tags, provinces, playerTag: 'B', humanTags: ['B'], armies: {}, wars: [], flags: {}, truces: {} };
  return { game, DEFINES: { TAGS: {}, BASE: {} }, bookmark: { mechanics: { diploCapacity: false } },
    geom: { neighbors: [new Set(), new Set([2, 3]), new Set([1, 3]), new Set([1, 2])] },
    byId: id => provinces[id], bus: { emit() {} } };
}
function next(ctx) { ctx.game.date.m++; if (ctx.game.date.m > 12) { ctx.game.date.m = 1; ctx.game.date.y++; } }
function awaitOffer(ctx) { for (let i = 0; i < 3; i++) { monthlyCourtDiplomacy(ctx); if (courtOffers(ctx).length) break; next(ctx); } return courtOffers(ctx)[0]; }

{
  const ctx = fixture(), o = awaitOffer(ctx);
  assert(o && o.kind === 'protection', 'a threatened small court proactively asks a stronger neighbor for protection, even in BCE');
  assert.deepEqual(ctx.game.tags.B.guarantees, [], 'human recipient has not automatically agreed');
  const before = JSON.stringify(ctx.game); courtOffers(ctx); courtOffers(ctx); assert.equal(JSON.stringify(ctx.game), before, 'offer readers are pure');
  assert.equal(resolveCourtOffer(ctx, o.id, true, 'C').ok, false, 'wrong court cannot accept');
  assert.equal(resolveCourtOffer(ctx, o.id, true).ok, true);
  assert.equal(ctx.game.tags.B.points.infl, 50); assert(ctx.game.tags.B.guarantees.includes('A'));
  assert(militaryPassage(ctx, 'B', 'A'), 'accepted terms grant actual traversable passage');
  assert.equal(resolveCourtOffer(ctx, o.id, true).ok, false, 'an offer cannot be executed twice');
  assert(ctx.game.tags.A.courtPlan.memories.some(m => m.other === 'B' && m.weight > 0));
  assert(ctx.game.tags.A.courtPlan.memories.some(m => m.other === 'B' && /Pledged protection/.test(m.text)), 'requester remembers who protected it');
  assert(ctx.game.tags.B.courtPlan.memories.some(m => m.other === 'A' && /military passage/.test(m.text)), 'protector remembers the actual reciprocal aid');
  assert(!ctx.game.tags.B.courtPlan.memories.some(m => m.kind === 'guarantee_honored'), 'granting passage does not count as honoring a military guarantee');
  const restored = JSON.parse(JSON.stringify(ctx.game)); assert(restored.courtDiplomacy.history.some(h => h.status === 'accepted'));
  console.log('PASS explicit human consent, pure reads, real guarantee/access/cost, authorization, memory and serialization');
}
{
  const ctx = fixture(), o = awaitOffer(ctx); ctx.game.tags.B.points.infl = 0;
  assert.equal(resolveCourtOffer(ctx, o.id, true).ok, false, 'resource availability revalidated at acceptance');
  assert.deepEqual(ctx.game.tags.B.guarantees, []);
  assert(resolveCourtOffer(ctx, o.id, false).ok);
  const count = ctx.game.courtDiplomacy.offers.length;
  for (let i = 0; i < 6; i++) { next(ctx); monthlyCourtDiplomacy(ctx); }
  assert.equal(ctx.game.courtDiplomacy.offers.filter(v => v.from === o.from && v.to === o.to).length, 1, 'declined pair cannot spam offers');
  assert(ctx.game.courtDiplomacy.offers.length >= count);
  console.log('PASS stale resource rejection and bilateral cooldown');
}
{
  const ctx = fixture(false); ctx.game.tags.B.points.infl = 150;
  awaitOffer(ctx);
  assert(ctx.game.tags.B.guarantees.includes('A'), 'AI courts conclude real agreements with each other');
  console.log('PASS autonomous AI-to-AI protection agreement');
}
{
  const ctx = fixture(), o = awaitOffer(ctx); ctx.game.tags.A.atWarWith = ['B']; ctx.game.tags.B.atWarWith = ['A'];
  assert.equal(resolveCourtOffer(ctx, o.id, true).ok, false, 'new hostility invalidates old diplomacy');
  next(ctx); monthlyCourtDiplomacy(ctx); assert.equal(courtOffers(ctx).length, 0);
  console.log('PASS war invalidates pending peacetime offers');
}
{
  const ctx = fixture(); ctx.game.tags.A.overlord = 'C'; ctx.game.tags.A.opinion.C = -100;
  const o = awaitOffer(ctx);
  assert.equal(o.kind, 'independence_support');
  assert.deepEqual(courtIndependenceSupport(ctx, 'A'), [], 'a request alone commits no armies');
  assert(resolveCourtOffer(ctx, o.id, true).ok);
  assert.equal(ctx.game.tags.A.treasury, 350); assert.equal(ctx.game.tags.B.treasury, 250); assert.equal(ctx.game.tags.B.points.infl, 75);
  assert.deepEqual(courtIndependenceSupport(ctx, 'A'), ['B']);
  ctx.game.tags.A.overlord = null; ctx.game.tags.A.atWarWith = ['C']; ctx.game.tags.C.atWarWith = ['A'];
  ctx.game.tags.D = { ...ctx.game.tags.C, name: 'Different overlord', atWarWith: ['A'] };
  const unrelated = { id: 'other-independence', cb: 'independence', attackers: ['A'], defenders: ['D'] }; ctx.game.wars.push(unrelated);
  honorCourtIndependence(ctx, 'A', unrelated);
  assert(!unrelated.attackers.includes('B'), 'a pledge against C cannot enroll the sponsor in independence from a different lord');
  ctx.game.wars = [];
  const war = { id: 'ind', cb: 'independence', attackers: ['A'], defenders: ['C'] }; ctx.game.wars.push(war);
  honorCourtIndependence(ctx, 'A', war);
  assert(war.attackers.includes('B')); assert(ctx.game.tags.B.atWarWith.includes('C'));
  console.log('PASS funded independence pledge grants real support and joins the ensuing war');
}
{
  const ctx = fixture(); ctx.game.tags.A.allies = ['B']; ctx.game.tags.B.allies = ['A'];
  ctx.game.tags.A.atWarWith = ['C']; ctx.game.tags.C.atWarWith = ['A'];
  const war = { id: 'help', cb: 'conquest', attackers: ['A'], defenders: ['C'] }; ctx.game.wars.push(war);
  const o = awaitOffer(ctx); assert.equal(o.kind, 'war_support'); assert.equal(o.province, 3);
  assert(resolveCourtOffer(ctx, o.id, true).ok); assert(war.attackers.includes('B'));
  assert(war.promises.some(p => p.caller === 'A' && p.ally === 'B' && p.province === 3));
  console.log('PASS ally recruitment joins the actual war and records an enforceable land promise');
}
{
  const ctx = fixture(); ctx.bookmark.diplomacy = { noAlliance: [{ between: ['A'], and: ['B'], why: 'Bookmark treaty bar' }] };
  ctx.game.tags.A.manpower = 8000; ctx.game.tags.A.opinion.B = 120; ctx.game.tags.B.opinion.A = 120;
  for (let i = 0; i < 3; i++) { monthlyCourtDiplomacy(ctx); next(ctx); }
  assert(!ctx.game.courtDiplomacy.offers.some(o => o.kind === 'alliance' && o.from === 'A' && o.to === 'B'));
  console.log('PASS bookmark alliance bars remain binding');
}
{
  const { readFileSync } = await import('node:fs');
  const { DEFINES } = await import('../../js/data/defines.js');
  const { MAP_DATA } = await import('../../js/data/map_data.js');
  const { ERAS } = await import('../../js/data/compendium.js');
  const { buildProvinceMapping } = await import('../../js/data/map_profile.js');
  const { initGame, makeCtx } = await import('../../js/sim/init.js');
  const { declareWar, truceActive } = await import('../../js/sim/military.js');
  const era = ERAS.find(e => e.bookmark.id === '167bce'), provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const snap = JSON.parse(readFileSync(new URL('../geom-snapshot.json', import.meta.url)));
  const geom = { neighbors: snap.neighbors.map(a => new Set(a)), coastal: snap.coastal,
    centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), areas: Int32Array.from(snap.areas), bbox: [] };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: [], playerTag: 'HAS', rngSeed: 1, provinceMap });
  const ctx = makeCtx({ DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: [], game, provinceMap, bus: { emit() {}, on() { return () => {}; } } });
  game.wars = []; game.truces = {};
  for (const t of Object.values(game.tags)) { t.atWarWith = []; t.allies = []; t.guarantees = []; t.overlord = null; t.treasury = 300; }
  const war = declareWar(ctx, 'SEL', 'HAS', 'Negotiated peace test', 'conquest');
  war.attackers = ['SEL']; war.defenders = ['HAS']; war.warscore = { HAS: 30, SEL: -30 };
  const current = game.date.y * 12 + game.date.m - 1;
  game.courtDiplomacy = { offers: [{ id: 'peace', from: 'SEL', to: 'HAS', kind: 'peace', cost: 50, warId: war.id, status: 'pending', expires: current + 6 }] };
  assert(courtOffers(ctx)[0].canAccept); assert(resolveCourtOffer(ctx, 'peace', true).ok);
  assert.equal(game.wars.length, 0); assert.equal(game.tags.HAS.treasury, 350); assert.equal(game.tags.SEL.treasury, 250);
  assert(truceActive(ctx, 'HAS', 'SEL'));
  console.log('PASS actual bookmark payment peace transfers gold, ends war and writes the ordinary truce');
}
{
  const ctx = fixture();
  // A and B both border C, but C spans the intervening land and grants no passage.
  ctx.geom.neighbors[1] = new Set([3]); ctx.geom.neighbors[2] = new Set([3]);
  for (let i = 0; i < 12; i++) { monthlyCourtDiplomacy(ctx); next(ctx); }
  assert(!ctx.game.courtDiplomacy.offers.some(o => o.from === 'A' && o.to === 'B'),
    'opposite ends of the same empire do not generate protection or replacement alliance requests');
  console.log('PASS distant courts sharing an imperial neighbor cannot solicit an unreachable protector');
}
{
  const ctx = fixture(), o = awaitOffer(ctx);
  ctx.geom.neighbors[2] = new Set();
  const snapshot = JSON.stringify(ctx.game);
  assert.equal(courtOffers(ctx).length, 0, 'old geographically invalid petitions disappear immediately');
  assert.equal(JSON.stringify(ctx.game), snapshot, 'filtering old offers is a pure read');
  assert(!resolveCourtOffer(ctx, o.id, true).ok, 'an old offer cannot bypass the new reach check');
  next(ctx); monthlyCourtDiplomacy(ctx);
  assert.equal(ctx.game.courtDiplomacy.offers.find(row => row.id === o.id).status, 'expired');
  console.log('PASS existing saved petitions are hidden and retired when the protector cannot reach them');
}
{
  const ctx = fixture();
  ctx.game.tags.D = { ...ctx.game.tags.A, name:'D', opinion:{ B:40, C:-100 }, allies:[], guarantees:[] };
  ctx.game.provinces.push({ id:4, name:'D', owner:'D', controller:'D', dev:{tax:1,prod:1,mp:1} });
  ctx.geom.neighbors[4] = new Set([2,3]); ctx.geom.neighbors[2].add(4); ctx.geom.neighbors[3].add(4);
  let count = 0;
  for (let i = 0; i < 12; i++) {
    monthlyCourtDiplomacy(ctx);
    for (const o of courtOffers(ctx).filter(o => o.kind === 'protection')) {
      count++; assert(resolveCourtOffer(ctx, o.id, false).ok);
      const current = (ctx.game.date.y > 0 ? ctx.game.date.y - 1 : ctx.game.date.y) * 12 + ctx.game.date.m - 1;
      assert.equal(ctx.game.courtDiplomacy.cooldowns[[o.from,o.to].sort().join('>')], current + 72);
    }
    next(ctx);
  }
  assert.equal(count, 1, 'multiple neighboring petitioners share one annual recipient budget');
  const cooldown = JSON.parse(JSON.stringify(ctx.game.courtDiplomacy)).protectionRequests.B;
  assert(Number.isFinite(cooldown), 'recipient suppression survives save serialization');
  for (let i = 0; i < 3; i++) { monthlyCourtDiplomacy(ctx); next(ctx); }
  assert(courtOffers(ctx).some(o => o.kind === 'protection'), 'a different viable petitioner may ask after the annual interval');
  console.log('PASS annual recipient limit, six-year refusal cooldown and saved suppression across multiple petitioners');
}
console.log('court-diplomacy: ALL PASS');
