// Headless regression — SPEC §219: the collar struck off. A client kingdom may
// be let go, which is the one exit from the vassal loop that was never the
// lord's to choose: before this, a collar came off only when the lord died,
// when the lord ate them, or when they rose and won.
//
// The section's whole claim is that NOTHING moves except the fealty, so most
// of this suite is an inventory taken before and after: the same provinces,
// the same regiments, the same ruler, the same treasury, in the same hands.
// The rest is the four things that do change (the tribute, the chancery seat,
// their regard, and the decade they will not kneel again), the one refusal,
// and the fact that no AI court can reach any of it.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions, reviveGame, reconcileGameProvinces } = await import(R + '/js/sim/init.js');
const {
  freeClientInfo, freeClientCore, releaseClientCore, clientOfferInfo, incorporateCore,
  vassalsOf, diploLoad, clientStrain, armiesOf, devOfTag, freedCollarMonthsLeft, dissolveWar,
} = await import(R + '/js/sim/military.js');
const { incomeBreakdown } = await import(R + '/js/sim/economy.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
function boot(bookmark, playerTag, seed = 219) {
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const N = snap.neighbors.length - 1;
  const to = (id) => provinceMap[id] || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    for (const nb of snap.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  const geom = {
    neighbors,
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas), bbox: [],
  };
  const events = (ERAS.find((e) => e.bookmark.id === bookmark.id) || {}).events || [];
  const notes = [];
  const bus = { emit(ev, p) { if (ev === 'notify') notes.push(p); }, on() { return () => {}; } };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events, provinceMap });
  return { game, ctx, geom, events, bus, notes, provinceMap };
}
function peace(ctx) {
  for (const w of (ctx.game.wars || []).slice()) dissolveWar(ctx, w);
  for (const k of Object.keys(ctx.game.tags)) {
    const t = ctx.game.tags[k];
    if (t) t.atWarWith = [];
  }
}
function seize(ctx, name, tag) {
  const p = ctx.prov(name);
  if (!p) throw new Error('no province ' + name);
  p.owner = tag; p.controller = tag; p.autonomy = 0.6; p.integration = 0;
  return p;
}
function takeTheFaith(ctx, tag) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner === tag || p.religion !== 'judaism') continue;
    p.owner = tag; p.controller = tag; p.autonomy = 0.25;
  }
}
// A crown with a client kingdom of its own, made the §218 way.
function withClient(seed = 219) {
  const w = boot(BOOKMARK_167, 'HAS', seed);
  peace(w.ctx);
  w.game.tags.HAS.points.infl = 900;
  takeTheFaith(w.ctx, 'HAS');
  for (const n of ['Ptolemais', 'Tyre', 'Sidon', 'Dora']) seize(w.ctx, n, 'HAS');
  const res = releaseClientCore(w.ctx, 'HAS', w.ctx.prov('Ptolemais').id);
  if (!res.ok) throw new Error('setup failed: ' + res.why);
  return { ...w, client: res.tag, res };
}
// Everything about a court that striking its collar must not touch.
function inventory(ctx, tag) {
  const g = ctx.game;
  const provs = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === tag) provs.push(p.id + ':' + p.controller + ':' + p.autonomy);
  }
  const t = g.tags[tag];
  return JSON.stringify({
    provs,
    armies: armiesOf(ctx, tag).map((a) => a.name + ':' + a.men + ':' + a.prov).sort(),
    ruler: t.ruler, treasury: t.treasury, manpower: t.manpower,
    tech: t.tech, reforms: t.reforms, govType: t.govType, name: t.name, alive: t.alive,
  });
}

console.log('== nothing moves except the fealty ==');
{
  const { ctx, game, client } = withClient();
  const before = inventory(ctx, client);
  const lordBefore = { dev: devOfTag(ctx, 'HAS'), infl: game.tags.HAS.points.infl, aggression: game.tags.HAS.aggression };
  const seatsBefore = diploLoad(ctx, 'HAS').seats;
  const info = freeClientInfo(ctx, 'HAS', client);
  ok(!!info && info.can, 'a client kingdom at peace can be let go');
  ok(info.provinces > 0 && info.dev > 0 && info.armies > 0,
    'and the panel is told what walks out: ' + info.provinces + ' provinces, '
    + info.dev + ' dev, ' + info.armies + ' army');

  const res = freeClientCore(ctx, 'HAS', client);
  ok(res.ok, 'the collar is struck: ' + (res.name || res.why));
  ok(game.tags[client].overlord === null, 'they answer to nobody');
  ok(inventory(ctx, client) === before,
    'and every province, regiment, ruler, coin and institution is exactly where it was');
  ok(devOfTag(ctx, 'HAS') === lordBefore.dev, 'the lord loses no development of its own');
  ok(game.tags.HAS.points.infl === lordBefore.infl, 'and spends no influence: the price is the client');
  ok(game.tags.HAS.aggression === lordBefore.aggression, 'the world counts no infamy for letting go');
  ok(vassalsOf(ctx, 'HAS').length === 0, 'we keep no clients');
  ok(diploLoad(ctx, 'HAS').seats === seatsBefore - 1, 'and the chancery seat comes back');
  ok(incomeBreakdown(ctx, 'HAS').tributeIn === 0 && incomeBreakdown(ctx, client).tributeOut === 0,
    'the tribute stops in both ledgers');
  ok((game.tags[client].opinion || {}).HAS === DEFINES.VASSALS.releaseGratitude + DEFINES.VASSALS.freeGratitude,
    'they remember it: ' + (game.tags[client].opinion || {}).HAS + ' toward the hand that struck it');
  ok(/strikes the collar/.test((game.chronicle[game.chronicle.length - 1] || {}).text || ''),
    'the chronicle records it');
  ok(freeClientInfo(ctx, 'HAS', client) === null, 'and there is no collar left to strike twice');
}

console.log('== the freed do not kneel again (SPEC §202) ==');
{
  const { ctx, game, client } = withClient();
  freeClientCore(ctx, 'HAS', client);
  const months = freedCollarMonthsLeft(ctx, client, 'HAS');
  ok(months === DEFINES.DIPLOMACY.freedCollarMonths,
    'the freed mark is set for the full decade (' + months + ' months)');
  // …so the collar cannot be offered back the same afternoon.
  const them = game.tags[client];
  them.allies = ['HAS']; game.tags.HAS.allies = [client];
  them.opinion.HAS = 200;
  const offer = clientOfferInfo(ctx, 'HAS', client);
  ok(offer && !offer.can && /freed them/.test(offer.why),
    'and §92 refuses the collar to a court we let go: ' + (offer && offer.why));
}

console.log('== the one refusal ==');
{
  const { ctx, game, client } = withClient();
  game.tags.HAS.atWarWith = ['SEL'];
  const war = freeClientInfo(ctx, 'HAS', client);
  ok(war && !war.can && /deserted/.test(war.why), 'not in wartime: ' + (war && war.why));
  const res = freeClientCore(ctx, 'HAS', client);
  ok(!res.ok && game.tags[client].overlord === 'HAS', 'and the core refuses rather than half-applying');
  game.tags.HAS.atWarWith = [];
  // Their own war counts too — a client left alone in one has not been freed.
  game.tags[client].atWarWith = ['NAB'];
  ok(!freeClientInfo(ctx, 'HAS', client).can, 'nor while THEY are at war');
  game.tags[client].atWarWith = [];
  ok(freeClientInfo(ctx, 'HAS', client).can, 'peace on both sides, and it can be done');

  // It is not ours to strike if it is not ours.
  ok(freeClientInfo(ctx, 'HAS', 'SEL') === null, 'a sovereign court has no collar of ours');
  ok(freeClientInfo(ctx, 'SEL', client) === null, 'and somebody else\'s lord cannot strike it either');
  ok(freeClientInfo(ctx, 'HAS', 'HAS') === null, 'nor can a crown free itself');
}

console.log('== a union half-woven dies with the bond ==');
{
  const { ctx, game, client } = withClient();
  game.tags[client].opinion.HAS = 100; // devoted enough to begin
  game.tags.HAS.points.infl = 900;
  const begun = incorporateCore(ctx, 'HAS', client);
  ok(begun.ok && game.tags[client].incorporating, 'the weaving is begun (' + begun.months + ' months)');
  const info = freeClientInfo(ctx, 'HAS', client);
  ok(info.incorporating > 0, 'and the panel warns that it is running: ' + info.incorporating + ' months');
  const res = freeClientCore(ctx, 'HAS', client);
  ok(res.ok && res.lostWeaving === info.incorporating, 'striking the collar reports what it cancels');
  ok(!game.tags[client].incorporating, 'the union is void');
}

console.log('== the age gates making clients, not unmaking them (SPEC §142) ==');
{
  // 66 CE seats Rome's client kings by script. Play Rome and let one go.
  const { ctx, game } = boot(BOOKMARK_66, 'ROM');
  peace(ctx);
  const clients = vassalsOf(ctx, 'ROM');
  ok(clients.length > 0, 'Rome opens the Great Revolt with clients of its own: ' + clients.join(', '));
  const one = clients[0];
  const before = inventory(ctx, one);
  const info = freeClientInfo(ctx, 'ROM', one);
  ok(!!info && info.can, 'and any of them can be let go');
  const res = freeClientCore(ctx, 'ROM', one);
  ok(res.ok && game.tags[one].overlord === null, res.name + ' is released by Rome');
  ok(inventory(ctx, one) === before, 'with everything it had');
  ok(vassalsOf(ctx, 'ROM').indexOf(one) < 0 && vassalsOf(ctx, 'ROM').length === clients.length - 1,
    'and Rome keeps the rest');
}

console.log('== the collars that remain chafe less ==');
{
  const { ctx, game } = withClient();
  // Past DIPLOMACY.freeClients is where the collars begin to chafe.
  const extra = [];
  const want = DEFINES.DIPLOMACY.freeClients + 1;
  for (const tag of Object.keys(game.tags)) {
    if (vassalsOf(ctx, 'HAS').length >= want) break;
    const t = game.tags[tag];
    if (!t || !t.alive || t.overlord || tag === 'HAS' || tag === 'REB') continue;
    t.overlord = 'HAS';
    extra.push(tag);
  }
  const many = clientStrain(ctx, 'HAS');
  ok(many.clients > DEFINES.DIPLOMACY.freeClients && many.strain > 0,
    many.clients + ' collars chafe at ' + many.strain + ' a month');
  freeClientCore(ctx, 'HAS', extra[0]);
  const fewer = clientStrain(ctx, 'HAS');
  ok(fewer.clients === many.clients - 1 && fewer.strain < many.strain,
    'and one released eases it to ' + fewer.strain);
}

console.log('== it survives the save, and no AI hand reaches it ==');
{
  const { ctx, game, client, geom, provinceMap } = withClient();
  freeClientCore(ctx, 'HAS', client);
  const revived = reviveGame(JSON.parse(JSON.stringify(game)));
  reconcileGameProvinces({ game: revived, DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_167, provinceMap });
  ok(revived.tags[client] && revived.tags[client].alive && revived.tags[client].overlord === null,
    'the freed court loads free');
  ok(revived.tags[client].freedBy && revived.tags[client].freedBy.by === 'HAS',
    'and still remembers whose hand did it');

  const sources = ['ai', 'tick', 'revolt', 'chapters', 'events', 'crisis', 'courts', 'invasion', 'outlaws'];
  let called = '';
  for (const f of sources) {
    if (/freeClient(Core|Info)/.test(readFileSync(R + '/js/sim/' + f + '.js', 'utf8'))) called = f;
  }
  ok(!called, 'nothing on the AI half of the sim strikes a collar' + (called ? ' (js/sim/' + called + '.js does)' : ''));
  ok(/freeClientCore\(ctx, g\.playerTag/.test(readFileSync(R + '/js/sim/init.js', 'utf8')),
    'the one call site is the player\'s own action');
}

console.log('== the action, as the panel presses it ==');
{
  const { ctx, game, client, notes } = withClient();
  const actions = gameActions(ctx);
  const before = notes.length;
  const dip = actions.getDiplomacy(client);
  ok(dip && dip.ourClient && dip.freedom && dip.freedom.can,
    'the diplomacy block carries the verb beside Incorporate');
  ok(dip.freedom.provinces === 4 && dip.freedom.gratitude === DEFINES.VASSALS.freeGratitude,
    'with what it costs us and what it earns: ' + dip.freedom.provinces + ' provinces, +'
    + dip.freedom.gratitude + ' opinion');
  actions.freeClientState(client);
  ok(game.tags[client].overlord === null, 'pressing it strikes the collar');
  ok(notes.slice(before).some((n) => /crown released/i.test(n.title || '')),
    'and says so: ' + notes.slice(before).map((n) => n.title).join(' / '));
  const again = notes.length;
  actions.freeClientState(client);
  ok(notes.slice(again).some((n) => /collar stays on/i.test(n.title || '')),
    'a second press is refused in words');
  ok(actions.getDiplomacy(client).freedom === null, 'and the verb is gone from the block');
}

console.log(failures ? '\n' + failures + ' FAIL' : '\nALL PASS');
process.exit(failures ? 1 : 0);
