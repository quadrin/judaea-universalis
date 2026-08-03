// Headless regression — SPEC §218: release a client state. A crown may let go
// of a piece of its OWN realm on purpose, seat a crown on it, and keep the
// tribute — the road to a client kingdom that never ran through somebody
// else's country.
//
// Every assertion here has the shape the section needs. What CANNOT be
// released is as much of the contract as what can (the capital, our own
// people, a living court's homeland, occupied ground), a grant is one piece of
// connected land, the bond it makes is an ordinary client kingdom from the
// first day — and not one roll of the dice happens anywhere in it, so a
// campaign where nobody ever grants a crown draws exactly the world it drew
// before. That is the only reason this can ship without moving the balance
// harness.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions, reviveGame, reconcileGameProvinces } = await import(R + '/js/sim/init.js');
const {
  releasableClients, releaseClientInfo, releaseClientCore,
  vassalsOf, diploLoad, incorporateInfo, armiesOf, removeArmy, updateTagLife, eraOwnerOf,
  dissolveWar,
} = await import(R + '/js/sim/military.js');
const { incomeBreakdown } = await import(R + '/js/sim/economy.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// The real map's adjacency, folded per bookmark the way smoke77 taught: the
// contiguity half of this section is invisible on a stub geometry.
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
function boot(bookmark, playerTag, seed = 218) {
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

// Every chapter opens with its war running; a crown grants a throne in peace.
function peace(ctx) {
  for (const w of (ctx.game.wars || []).slice()) dissolveWar(ctx, w);
  for (const k of Object.keys(ctx.game.tags)) {
    const t = ctx.game.tags[k];
    if (t) t.atWarWith = [];
  }
}

// Hand a province over exactly as a conquest leaves it: restive, unintegrated,
// and carrying the conqueror's mark.
function seize(ctx, name, tag, opts = {}) {
  const p = ctx.prov(name);
  if (!p) throw new Error('no province ' + name);
  p.owner = tag;
  p.controller = opts.controller || tag;
  p.autonomy = opts.autonomy !== undefined ? opts.autonomy : 0.6;
  p.integration = 0;
  p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== 'recent_conquest');
  if (opts.conquest !== false) {
    p.modifiers.push({ id: 'recent_conquest', name: 'Recent Conquest', months: 24, effects: { unrest: 3 } });
  }
  return p;
}
// The Hasmonean state at its height: everything of the faith answers to us.
function takeTheFaith(ctx, tag) {
  const g = ctx.game;
  const out = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner === tag || p.religion !== 'judaism') continue;
    seize(ctx, p.name, tag, { conquest: false, autonomy: 0.25 });
    out.push(p);
  }
  return out;
}
function conquer(ctx, fromTag, toTag) {
  const g = ctx.game;
  const took = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== fromTag) continue;
    seize(ctx, p.name, toTag);
    took.push(p);
  }
  for (const a of armiesOf(ctx, fromTag)) removeArmy(ctx, a.id);
  updateTagLife(ctx); // the court falls the way any conquered court falls
  return took;
}
const GREEK_COAST = ['Ptolemais', 'Tyre', 'Sidon', 'Dora', 'Scythopolis', 'Gadara', 'Pella'];
const rowFor = (rows, tag) => rows.find((r) => r.tag === tag) || null;
const rowWith = (rows, id) => rows.find((r) => r.provIds.indexOf(id) >= 0) || null;

console.log('== what the realm may let go of, and what it may not ==');
{
  const { ctx, game } = boot(BOOKMARK_167, 'HAS');
  const me = game.tags.HAS;
  peace(ctx);
  me.points.infl = 900;
  takeTheFaith(ctx, 'HAS');
  for (const n of GREEK_COAST) seize(ctx, n, 'HAS');
  const idumea = seize(ctx, 'Hebron', 'HAS');
  seize(ctx, 'Adora', 'HAS');
  const occupied = seize(ctx, 'Gaza', 'HAS', { controller: 'SEL' });

  const rows = releasableClients(ctx, 'HAS');
  ok(rows.length > 0, 'a realm holding foreign ground has states it could seat');

  // A realm may dismember itself; it may not behead itself.
  const capital = ctx.prov('Jerusalem');
  ok(capital.owner === 'HAS' && !rowWith(rows, capital.id), 'the capital is in no grant');

  // Our own people are not a state waiting to happen — that is a secession
  // (SPEC §105), and secessions are suffered rather than granted.
  const home = ctx.prov('Jericho');
  ok(home.owner === 'HAS' && !rowWith(rows, home.id),
    'no grant is carved out of our own faith and kind (Jericho)');
  let ownFolk = false;
  for (const r of rows) {
    for (const id of r.provIds) {
      const p = ctx.byId(id);
      if (p && p.religion === 'judaism' && p.culture === 'judean') ownFolk = true;
    }
  }
  ok(!ownFolk, 'and no row anywhere contains a province of our own faith and kind');

  // Occupied ground is not ours to give, whatever the map says about owners.
  ok(occupied.owner === 'HAS' && occupied.controller === 'SEL' && !rowWith(rows, occupied.id),
    'a province an enemy is standing in is in no grant');

  // A living court's old homeland is a cession, not a release.
  ok(game.tags.SEL && game.tags.SEL.alive, 'the Seleucids are alive in 167');
  ok(!rowFor(rows, 'SEL'), 'no row hands the Seleucids their own towns back');
  const coast = rowWith(rows, ctx.prov('Ptolemais').id);
  ok(!!coast && coast.origin === 'cultural' && coast.kind === 'create',
    'their coast is offered as a new state of its own people instead: ' + (coast && coast.name));

  // Idumea has its own gods (SPEC §210), and therefore its own state.
  const qos = rowWith(rows, idumea.id);
  ok(!!qos && qos.religion === 'idumean' && qos.provIds.length === 2,
    'the south country under Qos is offered as an Idumean state: ' + (qos && qos.name));
  ok(!!qos && qos.tag !== coast.tag, 'culture and faith divide the grants, not the border');

  // Every grant is ours, controlled, capital-free, priced and peopled.
  let sane = true;
  for (const r of rows) {
    for (const id of r.provIds) {
      const p = ctx.byId(id);
      if (!p || p.owner !== 'HAS' || p.controller !== 'HAS' || p.id === capital.id) sane = false;
    }
    if (!r.provIds.length || !r.dev || !r.cost || !r.name) sane = false;
  }
  ok(sane, 'every row is ours, controlled, capital-free, priced and named');
  const priced = rows.every((r) => r.cost === Math.round(DEFINES.VASSALS.releaseBase
    + r.dev * DEFINES.VASSALS.releasePerDev));
  ok(priced, 'the price is the establishment plus the development that walks out');

  ok(!!releaseClientInfo(ctx, 'HAS', ctx.prov('Ptolemais').id), 'the panel gets an answer for a releasable town');
  ok(releaseClientInfo(ctx, 'HAS', capital.id) === null, 'and none at all for the capital');
  ok(releaseClientInfo(ctx, 'HAS', occupied.id) === null, 'nor for occupied ground');
  ok(releaseClientInfo(ctx, 'HAS', home.id) === null, 'nor for a province of our own people');
}

console.log('== a court we put out can be put back: the restoration ==');
{
  const { ctx, game } = boot(BOOKMARK_167, 'HAS');
  peace(ctx);
  game.tags.HAS.points.infl = 900;
  takeTheFaith(ctx, 'HAS');
  for (const n of GREEK_COAST) seize(ctx, n, 'HAS');
  const took = conquer(ctx, 'NAB', 'HAS');
  ok(took.length > 3 && !game.tags.NAB.alive, 'Nabataea is conquered whole and falls');

  const rows = releasableClients(ctx, 'HAS');
  const nab = rowFor(rows, 'NAB');
  ok(!!nab && nab.kind === 'restore', 'its own homeland is offered back to it as a restoration');
  ok(!!nab && nab.provIds.every((id) => eraOwnerOf(ctx, ctx.byId(id)) === 'NAB'),
    'and only its own homeland is in it');

  const info = releaseClientInfo(ctx, 'HAS', nab.provIds[0]);
  ok(!!info && info.can, 'the crown can afford to seat it: ' + (info && (info.why || 'yes')));
  const res = releaseClientCore(ctx, 'HAS', nab.provIds[0]);
  ok(res.ok && game.tags.NAB.alive && game.tags.NAB.overlord === 'HAS',
    'Petra rises again as our client kingdom');
  ok(game.tags.NAB.name === (DEFINES.TAGS.NAB || {}).name,
    'under its own name, not an invented one (' + game.tags.NAB.name + ')');
  ok(res.provNames.every((n) => ctx.prov(n).owner === 'NAB'), 'holding its own towns');
}

console.log('== the refusals, in words ==');
{
  const { ctx, game } = boot(BOOKMARK_167, 'HAS');
  const me = game.tags.HAS;
  peace(ctx);
  takeTheFaith(ctx, 'HAS');
  for (const n of GREEK_COAST) seize(ctx, n, 'HAS');
  const town = ctx.prov('Ptolemais').id;
  me.points.infl = 900;
  ok(releaseClientInfo(ctx, 'HAS', town).can, 'a rich crown at peace may grant');

  me.points.infl = 0;
  const poor = releaseClientInfo(ctx, 'HAS', town);
  ok(!poor.can && /influence/.test(poor.why), 'a crown with no influence cannot seat one: ' + poor.why);
  me.points.infl = 900;

  me.atWarWith = ['SEL'];
  const war = releaseClientInfo(ctx, 'HAS', town);
  ok(!war.can && /wartime/.test(war.why), 'not with an enemy in the field: ' + war.why);
  me.atWarWith = [];

  me.overlord = 'SEL';
  const client = releaseClientInfo(ctx, 'HAS', town);
  ok(!client.can && /client kingdom does not keep/.test(client.why),
    'a collared crown keeps no collars: ' + client.why);
  me.overlord = null;

  // The chancery (SPEC §202): a client is a standing bond and needs a seat.
  const capacity = diploLoad(ctx, 'HAS').capacity;
  me.allies = [];
  me.guarantees = Object.keys(game.tags)
    .filter((k) => k !== 'HAS' && k !== 'REB' && game.tags[k] && game.tags[k].alive)
    .slice(0, capacity);
  const full = releaseClientInfo(ctx, 'HAS', town);
  ok(!full.can && /chancery is full/.test(full.why), 'a full chancery has no envoy for it: ' + full.why);
  me.guarantees = [];

  // Half the realm is the most that may walk out at once.
  ok(releaseClientInfo(ctx, 'HAS', town).can, 'one coastal state is well inside the cap');
  for (let i = 1; i < game.provinces.length; i++) {
    const q = game.provinces[i];
    if (q && !q.impassable && q.owner === 'HAS' && q.religion === 'judaism') { q.owner = 'SEL'; q.controller = 'SEL'; }
  }
  const cap = releaseClientInfo(ctx, 'HAS', town);
  ok(!!cap && !cap.can && /more of the realm/.test(cap.why),
    'a grant may not pass half the realm: ' + (cap && cap.why));
}

console.log('== the age decides whether there is such a thing (SPEC §142) ==');
{
  const { ctx, game } = boot(BOOKMARK_1948, 'ISR');
  peace(ctx);
  game.tags.ISR.points.infl = 900;
  const rows = releasableClients(ctx, 'ISR');
  ok(rows.length === 0, '1948 keeps no client kingdoms, so it offers no grants');
  let anyPanel = false;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'ISR' && releaseClientInfo(ctx, 'ISR', p.id)) anyPanel = true;
  }
  ok(!anyPanel, 'and the control disappears rather than sitting there refused');
}

console.log('== the grant itself ==');
{
  const { ctx, game, notes } = boot(BOOKMARK_167, 'HAS');
  const me = game.tags.HAS;
  peace(ctx);
  me.points.infl = 900;
  me.aggression = 7;
  takeTheFaith(ctx, 'HAS');
  for (const n of GREEK_COAST) seize(ctx, n, 'HAS');
  const before = {
    infl: me.points.infl, aggression: me.aggression,
    seats: diploLoad(ctx, 'HAS').seats, notes: notes.length,
  };
  const town = ctx.prov('Ptolemais');
  const info = releaseClientInfo(ctx, 'HAS', town.id);
  ok(!!info && info.can, 'the Phoenician coast can carry a crown of its own');
  const chronicleBefore = game.chronicle.length;

  const res = releaseClientCore(ctx, 'HAS', town.id);
  ok(res.ok, 'the grant is made: ' + (res.name || res.why));
  const t = game.tags[res.tag];
  ok(!!t && t.alive, 'the court is on the map');
  ok(t.overlord === 'HAS', 'and it is our client kingdom from the first day');
  ok(town.owner === res.tag && town.controller === res.tag, 'the town answers to it');
  ok(town.autonomy <= 0.25, 'at its own autonomy — it governs itself now (' + town.autonomy + ')');
  ok(!(town.modifiers || []).some((m) => m && m.id === 'recent_conquest'),
    'the conqueror\'s mark comes off: nobody conquered anybody');
  ok(town.integration === 0 && !town.integrating, 'and the integration ledger starts over');
  ok(me.points.infl === before.infl - info.cost, 'the influence is spent (' + info.cost + ')');
  ok(me.aggression === before.aggression, 'no infamy: giving land away is not conquest');
  ok(t.ruler && t.ruler.title === 'Ethnarch' && !!t.ruler.name,
    'an ethnarch is seated: ' + (t.ruler && t.ruler.name));
  ok(t.treasury >= 25 && t.maxManpower > 0 && t.manpower > 0, 'with a purse and muster rolls');
  ok(t.tech && t.tech.mar === game.tags.HAS.tech.mar,
    'and the age\'s institutions rather than an empty century');
  const host = armiesOf(ctx, res.tag);
  ok(host.length === 1 && host[0].prov === ctx.prov(res.seat).id,
    'and a guard standing at its own seat (' + res.seat + ')');
  ok((t.opinion || {}).HAS === DEFINES.VASSALS.releaseGratitude,
    'it thinks well of the hand that crowned it (' + (t.opinion || {}).HAS + ')');
  ok((me.opinion || {})[res.tag] === DEFINES.VASSALS.releaseRegard, 'and we of it');
  ok(vassalsOf(ctx, 'HAS').indexOf(res.tag) >= 0, 'it is counted among our clients');
  ok(diploLoad(ctx, 'HAS').seats === before.seats + 1, 'and it takes a chancery seat (SPEC §202)');
  const written = game.chronicle.slice(chronicleBefore);
  ok(written.some((e) => /client kingdom/.test(e.text || '')),
    'the chronicle records it: ' + (written.map((e) => e.text).join(' ').slice(0, 90) || 'nothing'));

  // The bond is an ordinary one: tribute flows, and the union §61 already
  // knows how to weave is the way home.
  const mine = incomeBreakdown(ctx, 'HAS');
  const theirs = incomeBreakdown(ctx, res.tag);
  ok(mine.tributeIn > 0 && theirs.tributeOut > 0, 'the tribute runs from the day it is made');
  const inc = incorporateInfo(ctx, 'HAS', res.tag);
  ok(!inc.can && /devoted/.test(inc.why) && inc.needOpinion === 80,
    'and it can be woven back in once it is devoted enough: ' + inc.why);
  ok(notes.length === before.notes, 'the sim core toasts nothing on its own — that is the action\'s job');
}

console.log('== one piece of connected land (SPEC §109) ==');
{
  const { ctx, game, geom } = boot(BOOKMARK_167, 'HAS');
  peace(ctx);
  game.tags.HAS.points.infl = 900;
  takeTheFaith(ctx, 'HAS');
  // Two pockets of the same people, at opposite ends of the world: the Greek
  // towns of the Decapolis, and Greece itself.
  const near = ['Scythopolis', 'Gadara', 'Pella'].map((n) => seize(ctx, n, 'HAS'));
  const far = ['Athens', 'Corinth', 'Sparta'].map((n) => seize(ctx, n, 'HAS'));
  const identity = (p) => p.culture + '|' + p.religion;
  ok(near.concat(far).every((p) => identity(p) === identity(near[0])),
    'six towns, one culture and one faith between them');

  const rows = releasableClients(ctx, 'HAS');
  const greek = rows.filter((r) => r.provIds.some((id) => near.concat(far).some((p) => p.id === id)));
  ok(greek.length === 1, 'the identity is offered once, not once per pocket');
  const connected = (ids) => {
    const pool = new Set(ids);
    const seen = new Set([ids[0]]);
    const stack = [ids[0]];
    while (stack.length) {
      const cur = stack.pop();
      for (const n of (geom.neighbors[cur] || [])) if (pool.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); }
    }
    return seen.size === pool.size;
  };
  ok(greek[0] && connected(greek[0].provIds), 'and what it offers is one connected piece');
  const hasNear = greek[0].provIds.some((id) => near.some((p) => p.id === id));
  const hasFar = greek[0].provIds.some((id) => far.some((p) => p.id === id));
  ok(hasNear !== hasFar, 'never both pockets at once — a state across a sea it cannot march is the same bug in a boat');
}

console.log('== the second grant enlarges the client the first one made ==');
{
  const { ctx, game } = boot(BOOKMARK_167, 'HAS');
  const me = game.tags.HAS;
  peace(ctx);
  me.points.infl = 900;
  takeTheFaith(ctx, 'HAS');
  const first = seize(ctx, 'Ptolemais', 'HAS');
  seize(ctx, 'Dora', 'HAS');
  const res = releaseClientCore(ctx, 'HAS', first.id);
  ok(res.ok, 'a Phoenician coastal state is seated: ' + (res.name || res.why));
  const seats = diploLoad(ctx, 'HAS').seats;
  // …and now a town of the same people, taken later.
  const second = seize(ctx, 'Tyre', 'HAS');
  const info = releaseClientInfo(ctx, 'HAS', second.id);
  ok(!!info && info.tag === res.tag && info.kind === 'enlarge',
    'the same identity is offered to the client that already carries it');
  const grow = releaseClientCore(ctx, 'HAS', second.id);
  ok(grow.ok && second.owner === res.tag, 'the town joins it rather than founding a rival');
  ok(diploLoad(ctx, 'HAS').seats === seats, 'and no second chancery seat is spent on the same bond');
  ok(vassalsOf(ctx, 'HAS').length === 1, 'one client, larger');
}

console.log('== not one roll of the dice, and it survives the save ==');
{
  // Two identical campaigns; one grants a crown, the other does not. The
  // seeded stream must not be able to tell.
  const a = boot(BOOKMARK_167, 'HAS');
  const b = boot(BOOKMARK_167, 'HAS');
  for (const w of [a, b]) { peace(w.ctx); w.game.tags.HAS.points.infl = 900; takeTheFaith(w.ctx, 'HAS'); seize(w.ctx, 'Ptolemais', 'HAS'); }
  const town = a.ctx.prov('Ptolemais');
  const res = releaseClientCore(a.ctx, 'HAS', town.id);
  ok(res.ok, 'the grant is made in one of them');
  const drawA = [a.ctx.rng.next(), a.ctx.rng.next(), a.ctx.rng.next()];
  const drawB = [b.ctx.rng.next(), b.ctx.rng.next(), b.ctx.rng.next()];
  ok(JSON.stringify(drawA) === JSON.stringify(drawB), 'the next three draws are the same in both');

  // Deterministic identity: the same ground makes the same court, under the
  // same man, in a campaign seeded differently.
  const c = boot(BOOKMARK_167, 'HAS', 9999);
  peace(c.ctx);
  c.game.tags.HAS.points.infl = 900;
  takeTheFaith(c.ctx, 'HAS');
  const townC = seize(c.ctx, 'Ptolemais', 'HAS');
  const resC = releaseClientCore(c.ctx, 'HAS', townC.id);
  ok(resC.ok && resC.tag === res.tag && resC.ruler === res.ruler,
    'another campaign seats the same court and the same ethnarch (' + resC.ruler + ')');

  // The save: a court created at runtime rides the ordinary revive.
  const revived = reviveGame(JSON.parse(JSON.stringify(a.game)));
  reconcileGameProvinces({
    game: revived, DEFINES, MAP_DATA, geom: a.geom, bookmark: BOOKMARK_167, provinceMap: a.provinceMap,
  });
  const t = revived.tags[res.tag];
  ok(!!t && t.alive && t.overlord === 'HAS', 'the client is still there after a save and a load');
  ok(revived.provinces[town.id].owner === res.tag, 'and still holds its town');
  ok(t.ruler && t.ruler.name === res.ruler, 'with the same ethnarch in the same chair');
}

console.log('== the player\'s hand only ==');
{
  // No AI court grants a crown out of its own realm — which is why the balance
  // harness cannot see this section at all.
  const sources = ['ai', 'tick', 'revolt', 'chapters', 'events', 'crisis', 'courts', 'invasion', 'outlaws'];
  let called = '';
  for (const f of sources) {
    const text = readFileSync(R + '/js/sim/' + f + '.js', 'utf8');
    if (/releaseClient(Core|Info)|releasableClients/.test(text)) called = f;
  }
  ok(!called, 'nothing on the AI half of the sim reaches for it' + (called ? ' (js/sim/' + called + '.js does)' : ''));
  const initText = readFileSync(R + '/js/sim/init.js', 'utf8');
  ok(/releaseClientCore\(ctx, g\.playerTag/.test(initText), 'the one call site is the player\'s own action');
}

console.log('== the action, as the panel presses it ==');
{
  const { ctx, game, notes } = boot(BOOKMARK_167, 'HAS');
  peace(ctx);
  game.tags.HAS.points.infl = 900;
  takeTheFaith(ctx, 'HAS');
  for (const n of GREEK_COAST) seize(ctx, n, 'HAS');
  const actions = gameActions(ctx);
  const town = ctx.prov('Ptolemais');
  ok(typeof actions.getClientRelease === 'function' && typeof actions.releaseClientState === 'function',
    'the panel has both an answer and a verb');
  const info = actions.getClientRelease(town.id);
  ok(!!info && info.can, 'the panel is told it may');
  actions.releaseClientState(town.id);
  ok(town.owner !== 'HAS' && game.tags[town.owner] && game.tags[town.owner].overlord === 'HAS',
    'pressing it seats the crown');
  ok(notes.some((n) => /crown of its own/i.test(n.title || '')),
    'and says so: ' + (notes.map((n) => n.title).join(' / ')));
  game.tags.HAS.points.infl = 0;
  const other = ctx.prov('Scythopolis');
  const notesBefore = notes.length;
  actions.releaseClientState(other.id);
  ok(other.owner === 'HAS' && notes.slice(notesBefore).some((n) => /refused/i.test(n.title || '')),
    'and a refusal is reported rather than half-applied');
}

console.log(failures ? '\n' + failures + ' FAIL' : '\nALL PASS');
process.exit(failures ? 1 : 0);
