// Headless regression — SPEC §201: the chancery has only so many envoys.
//
// A standing bond used to be a purchase: pay once, keep forever, and the
// optimal number of alliances, guarantees, marriages and subsidies was "all of
// them". Worse, the client kingdom's road — ally, collar, incorporate — could
// be farmed off the peace table: free four states out of a beaten enemy (no
// infamy, §174), collar them with the gratitude the liberation itself paid
// for, and eat them one after another at half a conquest's odium.
//
// The contract:
//   1. every court has an ESTABLISHMENT of seats, and every living bond takes
//      one — but a guarantee somebody extends to US, a reparation, a donor's
//      aid, and our own collar are not seats we staff;
//   2. the chancery's own verbs need a free seat (ours AND theirs, where the
//      bond binds both), and the peace table never asks — a treaty is force;
//   3. past the establishment: influence a month, and every court that owes us
//      nothing thinks less of us every month;
//   4. the collars chafe — clients past the free allowance, or clients that
//      weigh too much of the realm, sour toward a floor, which is the number
//      the §61 union runs on;
//   5. a court we freed at our own table does not kneel to us for a decade;
//   6. the world as every bookmark seeds it fits inside its own establishment,
//      so none of this is felt by a campaign nobody has gone shopping in;
//   7. 1948 switches the whole section off (`mechanics.diploCapacity`).
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');

const BOOKS = {
  '167 BCE': (await import(R + '/js/data/bookmark_167bce.js')).BOOKMARK_167,
  '67 BCE': (await import(R + '/js/data/bookmark_67bce.js')).BOOKMARK_67,
  '40 BCE': (await import(R + '/js/data/bookmark_40bce.js')).BOOKMARK_40,
  '66 CE': BOOKMARK_66,
  '132 CE': (await import(R + '/js/data/bookmark_132ce.js')).BOOKMARK_132,
  '529 CE': (await import(R + '/js/data/bookmark_529ce.js')).BOOKMARK_529,
  '614 CE': (await import(R + '/js/data/bookmark_614ce.js')).BOOKMARK_614,
  '1948': (await import(R + '/js/data/bookmark_1948.js')).BOOKMARK_1948,
};

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const notices = [];
const bus = { emit(k, p) { if (k === 'notify') notices.push(p); }, on() { return () => {}; } };
function geom() {
  return {
    neighbors: Array.from({ length: N + 1 }, () => new Set()),
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      return { x, y };
    })],
    areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
  };
}
function boot(bookmark, seed) {
  const gm = geom();
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const game = initGame({
    DEFINES, MAP_DATA, geom: gm, bookmark, events: [],
    playerTag: 'JUD', rngSeed: seed || 199, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: gm, bus, bookmark, events: [], provinceMap,
  });
  return { game, ctx };
}
// A quiet 66 CE: no wars, no truces, nobody's client, the player solvent.
function quiet(seed) {
  const { game, ctx } = boot(BOOKMARK_66, seed);
  game.wars = [];
  game.truces = {};
  game.subsidies = [];
  for (const k of Object.keys(game.tags)) {
    const t = game.tags[k];
    if (!t) continue;
    t.atWarWith = [];
    t.overlord = null;
    t.allies = [];
    t.guarantees = [];
    t.marriages = [];
  }
  game.tags.JUD.points.infl = 999;
  game.tags.JUD.treasury = 999;
  return { game, ctx, actions: gameActions(ctx) };
}
function setOpinion(game, whose, of, v) {
  const t = game.tags[whose];
  if (!t.opinion) t.opinion = {};
  t.opinion[of] = v;
}
// Fill a court's chancery with alliances to courts it will otherwise never
// meet in these tests — the cheapest way to spend seats.
function fillSeats(ctx, tag, upTo) {
  const g = ctx.game;
  const t = g.tags[tag];
  const spare = ['REB', 'JUD', 'ROM', 'NAB', 'AGR', 'PAR'];
  const others = Object.keys(g.tags).filter((k) => k !== tag && g.tags[k] && g.tags[k].alive
    && spare.indexOf(k) < 0);
  let i = 0;
  while (mil.diploLoad(ctx, tag).seats < upTo && i < others.length) {
    const other = others[i++];
    t.allies = (t.allies || []).concat([other]);
    g.tags[other].allies = (g.tags[other].allies || []).concat([tag]);
  }
  return mil.diploLoad(ctx, tag);
}
// Make a court big enough that a neighbour of ordinary size is a small client.
function enlarge(ctx, tag, provinces) {
  const g = ctx.game;
  let moved = 0;
  for (let i = 1; i < g.provinces.length && moved < provinces; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || !p.owner || p.owner === tag) continue;
    if (g.tags[p.owner] && g.tags[p.owner].overlord === tag) continue; // leave the clients theirs
    if (p.owner === 'AGR' || p.owner === 'NAB') continue;
    mil.changeOwnerCore(ctx, p, tag);
    moved++;
  }
  return moved;
}

console.log('== the establishment: what a court can staff ==');
{
  const { game, ctx } = quiet(1);
  const jud = game.tags.JUD;
  const D = DEFINES.DIPLOMACY;
  jud.tech.infl = 0;
  jud.ruler.infl = 0;
  ok(mil.diploCapacity(ctx, 'JUD') === D.capacityBase,
    `a court with nothing seats the base ${D.capacityBase}`);
  jud.tech.infl = D.capacityPerTech;
  ok(mil.diploCapacity(ctx, 'JUD') === D.capacityBase + 1,
    'influence technology staffs another seat');
  jud.tech.infl = D.capacityPerTech * (D.capacityTechMax + 4);
  ok(mil.diploCapacity(ctx, 'JUD') === D.capacityBase + D.capacityTechMax,
    `and no more than ${D.capacityTechMax} from technology, however far it runs`);
  jud.tech.infl = 0;
  jud.ruler.infl = D.capacityRulerSkill;
  ok(mil.diploCapacity(ctx, 'JUD') === D.capacityBase + 1,
    'a ruler who is good at this is worth a seat');
  jud.ruler.infl = D.capacityRulerSkill - 1;
  ok(mil.diploCapacity(ctx, 'JUD') === D.capacityBase, '…and one who is not, is not');
  jud.modifiers = [{ id: 't', name: 'A Standing Embassy', months: 12, effects: { diploSeats: 2 } }];
  ok(mil.diploCapacity(ctx, 'JUD') === D.capacityBase + 2,
    'a modifier can grant seats through the ordinary pipe (diploSeats)');
  jud.modifiers = [];
}

console.log('== the load: one seat per standing bond, and what is not a bond ==');
{
  const { game, ctx } = quiet(2);
  const jud = game.tags.JUD;
  ok(mil.diploLoad(ctx, 'JUD').seats === 0, 'a court with no bonds spends nothing');
  jud.allies = ['NAB'];
  game.tags.NAB.allies = ['JUD'];
  jud.guarantees = ['AGR'];
  jud.marriages = ['PAR'];
  game.tags.PAR.marriages = ['JUD'];
  game.subsidies = [{ from: 'JUD', to: 'ROM', amount: 10, monthsLeft: 12 }];
  const kinds = mil.diploBonds(ctx, 'JUD').map((b) => b.kind).sort();
  ok(kinds.join(',') === 'ally,guarantee,marriage,subsidy',
    'alliance, guarantee, royal marriage and subsidy each take a seat');
  // What is NOT ours to staff.
  game.tags.ROM.guarantees = ['JUD'];               // their word, their seat
  game.subsidies.push({ from: 'JUD', to: 'NAB', amount: 20, monthsLeft: 60, reparation: true });
  game.subsidies.push({ from: 'JUD', to: 'AGR', amount: 20, monthsLeft: 60, aid: true });
  game.tags.AGR.overlord = 'ROM';                   // somebody else's client
  ok(mil.diploLoad(ctx, 'JUD').seats === 4,
    'a guarantee extended to US, reparations and aid are none of our establishment');
  ok(mil.diploLoad(ctx, 'ROM').bonds.some((b) => b.kind === 'guarantee' && b.tag === 'JUD'),
    'the guarantor is the one who pays for the guarantee');
  ok(mil.diploLoad(ctx, 'ROM').bonds.some((b) => b.kind === 'client' && b.tag === 'AGR'),
    'a client kingdom is a seat the LORD staffs…');
  ok(!mil.diploLoad(ctx, 'AGR').bonds.some((b) => b.kind === 'client'),
    '…and never one the collared crown is billed for');
  // A dead court is not a relationship.
  game.tags.NAB.alive = false;
  ok(mil.diploLoad(ctx, 'JUD').seats === 3, 'a fallen house frees its seat');
}

console.log('== the gates: the chancery refuses, the peace table does not ==');
{
  const { game, ctx, actions } = quiet(3);
  const cap = mil.diploCapacity(ctx, 'JUD');
  setOpinion(game, 'NAB', 'JUD', 150);
  setOpinion(game, 'JUD', 'NAB', 150);
  let d = actions.getDiplomacy('NAB');
  ok(d.canAlly, 'with seats to spare, an alliance is possible');
  ok(d.chancery && d.chancery.capacity === cap && d.chancery.seats === 0,
    'the panel is told how full the chancery is');
  const load = fillSeats(ctx, 'JUD', cap);
  ok(load.seats === cap && load.over === 0, `the chancery fills to its ${cap} seats exactly`);
  d = actions.getDiplomacy('NAB');
  ok(!d.canAlly && /chancery is full/.test(d.whyNotAlly), 'a full chancery swears nothing: ' + d.whyNotAlly);
  ok(!d.canGuarantee && /chancery is full/.test(d.whyNotGuarantee), 'no guarantee either');
  ok(!d.canSubsidize && /chancery is full/.test(d.whyNotSubsidize), 'and no subsidy');
  const mi = mil.royalMarriageInfo(ctx, 'JUD', 'NAB');
  ok(!mi.can && /chancery is full/.test(mi.why), 'and no match');
  // Recognition is a peace, not an establishment: it asks nobody for a seat.
  const ri = mil.recognitionInfo(ctx, 'JUD', 'NAB');
  ok(!ri.offered || !/chancery/.test(ri.why || ''),
    'recognition is not a standing bond — a full chancery can still sign a peace');
  // And their side of the table counts too.
  const back = quiet(4);
  setOpinion(back.game, 'NAB', 'JUD', 150);
  fillSeats(back.ctx, 'NAB', mil.diploCapacity(back.ctx, 'NAB'));
  const d2 = back.actions.getDiplomacy('NAB');
  ok(!d2.canAlly && /chancery of/.test(d2.whyNotAlly),
    'a court whose own chancery is full has no envoy to spare for us: ' + d2.whyNotAlly);
}

console.log('== every seat has a way out, including the one that never had one ==');
{
  const { game, ctx, actions } = quiet(12);
  setOpinion(game, 'NAB', 'JUD', 150);
  const res = mil.royalMarriageCore(ctx, 'JUD', 'NAB');
  ok(res.ok && mil.diploLoad(ctx, 'JUD').seats === 1, 'a match takes a seat');
  const d = actions.getDiplomacy('NAB');
  ok(d.marriage && d.marriage.married && Number.isFinite(d.marriage.breakOpinion),
    'and the panel is told what sending it home would cost');
  const before = mil.opinionOf(ctx, 'NAB', 'JUD');
  const annul = mil.annulMarriageCore(ctx, 'JUD', 'NAB');
  ok(annul.ok && mil.diploLoad(ctx, 'JUD').seats === 0, 'annulment frees the seat');
  ok(!mil.marriedTo(ctx, 'JUD', 'NAB') && !mil.marriedTo(ctx, 'NAB', 'JUD'),
    'and unjoins both houses, not only ours');
  ok(mil.opinionOf(ctx, 'NAB', 'JUD') === before + mil.DIPLO.marryBreakOpinion,
    `at a price their court remembers (${mil.DIPLO.marryBreakOpinion})`);
  ok(!mil.annulMarriageCore(ctx, 'JUD', 'NAB').ok, 'and there is nothing left to annul twice');
}

console.log('== the peace table is force, not diplomacy ==');
{
  const { game, ctx } = boot(BOOKMARK_66, 5);
  const war = game.wars.find((w) => {
    const all = w.attackers.concat(w.defenders);
    return all.includes('JUD') && all.includes('ROM');
  });
  war.warscore.JUD = 100;
  war.warscore.ROM = -100;
  fillSeats(ctx, 'JUD', mil.diploCapacity(ctx, 'JUD'));
  const before = mil.diploLoad(ctx, 'JUD');
  ok(before.seats >= before.capacity && before.over === 0, 'we go to the table with every seat spoken for');
  const info = mil.peaceDealInfo(ctx, war, 'JUD');
  const row = (info.transferableVassals || []).find((r) => r.tag === 'AGR');
  ok(!!row, 'Rome\'s client is on the table');
  mil.executePeaceDeal(ctx, war, 'JUD', { transferVassals: ['AGR'] });
  const after = mil.diploLoad(ctx, 'JUD');
  ok(game.tags.AGR.overlord === 'JUD', 'the treaty hands the client over regardless');
  ok(after.over === 1, 'and the winner is simply over its own establishment: ' + after.seats + '/' + after.capacity);
}

console.log('== over the establishment: influence, and what the world thinks ==');
{
  const { game, ctx } = quiet(6);
  const D = DEFINES.DIPLOMACY;
  const cap = mil.diploCapacity(ctx, 'JUD');
  fillSeats(ctx, 'JUD', cap + 2);
  const load = mil.diploLoad(ctx, 'JUD');
  ok(load.over === 2, 'two bonds past the establishment');
  const ally = load.bonds[0].tag;
  game.tags.JUD.points.infl = 50;
  setOpinion(game, 'ROM', 'JUD', 0);
  setOpinion(game, ally, 'JUD', 0);
  notices.length = 0;
  mil.monthlyChancery(ctx);
  ok(game.tags.JUD.points.infl === 50 - 2 * D.overInfl,
    `the envoys past the establishment are paid monthly (${2 * D.overInfl} influence)`);
  ok(mil.opinionOf(ctx, 'ROM', 'JUD') === -2 * D.overOpinion,
    'a court that owes us nothing thinks less of us every month');
  ok(mil.opinionOf(ctx, ally, 'JUD') === 0,
    'the courts we are actually serving do not resent being served');
  ok(notices.some((n) => /chancery is overstretched/i.test(n.title)),
    'the player is told, once, when the crossing happens');
  notices.length = 0;
  mil.monthlyChancery(ctx);
  ok(!notices.length, 'and not told again every month');
  // Back inside the establishment: the bill stops.
  game.tags.JUD.allies = game.tags.JUD.allies.slice(0, cap);
  const inflBefore = game.tags.JUD.points.infl;
  notices.length = 0;
  mil.monthlyChancery(ctx);
  ok(game.tags.JUD.points.infl === inflBefore, 'inside the establishment, nothing is owed');
  ok(notices.some((n) => /chancery is in order/i.test(n.title)), 'and the court is told that too');
}

console.log('== the collars chafe: a wide client empire cannot be digested ==');
{
  const { game, ctx } = quiet(7);
  const D = DEFINES.DIPLOMACY;
  enlarge(ctx, 'JUD', 60); // a great power, so a small client is genuinely small
  // Two small clients: a policy, not a strain.
  game.tags.AGR.overlord = 'JUD';
  game.tags.NAB.overlord = 'JUD';
  setOpinion(game, 'AGR', 'JUD', 90);
  setOpinion(game, 'NAB', 'JUD', 90);
  const easy = mil.clientStrain(ctx, 'JUD');
  ok(easy.strain === 0 && easy.share <= D.strainFreeShare,
    `two small clients inside the free allowance sit easy (${Math.round(easy.share * 100)}% of the realm)`);
  mil.monthlyChancery(ctx);
  ok(mil.opinionOf(ctx, 'AGR', 'JUD') === 90, 'and their regard is untouched');
  // Now a farm: every small court in reach collared at once.
  const collared = [];
  for (const k of Object.keys(game.tags)) {
    const t = game.tags[k];
    if (!t || !t.alive || k === 'JUD' || k === 'REB' || t.overlord) continue;
    if (mil.devOfTag(ctx, k) <= 0 || mil.devOfTag(ctx, k) > mil.devOfTag(ctx, 'JUD') * 0.4) continue;
    t.overlord = 'JUD';
    setOpinion(game, k, 'JUD', 90);
    collared.push(k);
    if (collared.length + 2 >= D.freeClients + 4) break;
  }
  const cs = mil.clientStrain(ctx, 'JUD');
  ok(cs.clients > D.freeClients && cs.strain > 0,
    `${cs.clients} collars past the allowance of ${D.freeClients} chafe at ${cs.strain} a month`);
  ok(cs.floor < 0 && cs.floor >= -D.strainFloorMax,
    `their regard is carried toward ${cs.floor}, and no further`);
  const keep = (DEFINES.VASSALS || {}).incorporateKeepOpinion;
  for (let m = 0; m < 240; m++) mil.monthlyChancery(ctx);
  const worst = Math.min(...vassalOpinions(ctx, 'JUD'));
  ok(worst === cs.floor, `after twenty years every collar sits at the floor (${worst})`);
  ok(worst < keep, 'which is below what a union needs to hold, let alone to begin');
  const inc = mil.incorporateInfo(ctx, 'JUD', collared[0]);
  ok(!inc.can && /devoted/.test(inc.why),
    'so the wide client empire is held, not digested: ' + inc.why);
  ok(worst > (DEFINES.VASSALS || {}).revoltOpinion,
    'strain sours a client; it does not manufacture a war of independence');
}
function vassalOpinions(ctx, lord) {
  return mil.vassalsOf(ctx, lord).map((k) => mil.opinionOf(ctx, k, lord));
}

console.log('== a court freed at our table does not kneel to the hand that freed it ==');
{
  const { game, ctx } = boot(BOOKMARK_66, 8);
  const war = game.wars.find((w) => {
    const all = w.attackers.concat(w.defenders);
    return all.includes('JUD') && all.includes('ROM');
  });
  war.warscore.JUD = 100;
  war.warscore.ROM = -100;
  const info = mil.peaceDealInfo(ctx, war, 'JUD');
  let row = null;
  for (const candidate of (info.releasable || []).slice().sort((a, b) => a.dev - b.dev)) {
    if (mil.evaluatePeaceDeal(ctx, war, 'JUD', { release: [candidate.tag] }).acceptable) { row = candidate; break; }
  }
  ok(!!row, 'the table can free a state out of the enemy');
  mil.executePeaceDeal(ctx, war, 'JUD', { release: [row.tag] });
  const freed = game.tags[row.tag];
  ok(freed && freed.alive && freed.freedBy && freed.freedBy.by === 'JUD',
    'the new state remembers who freed it, and when');
  ok(mil.opinionOf(ctx, row.tag, 'JUD') >= 100, 'the gratitude of §174 is real and undiminished');
  // Everything else the collar wants is in place: sworn ally, tiny, devoted.
  for (const k of Object.keys(game.tags)) if (game.tags[k]) game.tags[k].atWarWith = [];
  game.wars = [];
  game.tags.JUD.allies = (game.tags.JUD.allies || []).concat([row.tag]);
  freed.allies = (freed.allies || []).concat(['JUD']);
  game.tags.JUD.points.infl = 999;
  const co = mil.clientOfferInfo(ctx, 'JUD', row.tag);
  ok(co && !co.can && /freed them at the peace table/.test(co.why),
    'and the hand that freed them may not collar them: ' + co.why);
  const left = mil.freedCollarMonthsLeft(ctx, row.tag, 'JUD');
  ok(left > 0 && left <= DEFINES.DIPLOMACY.freedCollarMonths, `${left} months still to run`);
  // Somebody else's hand is a different matter — this is a memory of us, not
  // a constitution.
  ok(mil.freedCollarMonthsLeft(ctx, row.tag, 'PAR') === 0,
    'the memory names one court, not every court');
  // …and it ends. A decade on, the offer can be made like any other.
  freed.freedBy = { by: 'JUD', y: game.date.y - 12, m: game.date.m };
  const later = mil.clientOfferInfo(ctx, 'JUD', row.tag);
  ok(later && !/freed them at the peace table/.test(later.why || ''),
    'a generation later the bar is gone');
}

console.log('== the collar keeps the seat the alliance held ==');
{
  const { game, ctx } = quiet(9);
  setOpinion(game, 'AGR', 'JUD', 200);
  game.tags.JUD.allies = ['AGR'];
  game.tags.AGR.allies = ['JUD'];
  // JUD must be more than twice AGR's size for the collar to be offered.
  let moved = 0;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (!p || p.impassable) continue;
    if (p.owner !== 'JUD' && p.owner !== 'AGR' && moved < 40) { mil.changeOwnerCore(ctx, p, 'JUD'); moved++; }
  }
  const before = mil.diploLoad(ctx, 'JUD').seats;
  const res = mil.offerClientshipCore(ctx, 'JUD', 'AGR');
  ok(res.ok && res.accepted, 'the devoted little ally accepts the collar');
  const after = mil.diploLoad(ctx, 'JUD');
  ok(after.seats === before && after.bonds.some((b) => b.kind === 'client' && b.tag === 'AGR'),
    'the alliance seat becomes the client seat — a change of terms, not a new establishment');
}

console.log('== the world as it is seeded fits inside its own establishment ==');
for (const [name, bookmark] of Object.entries(BOOKS)) {
  const { game, ctx } = boot(bookmark, 10);
  if (!mil.chanceryOn(ctx)) {
    ok(name === '1948', `${name}: the age of blocs does not count its irons`);
    const jud = Object.keys(game.tags).find((k) => game.tags[k] && game.tags[k].alive);
    game.tags[jud].allies = Object.keys(game.tags).filter((k) => k !== jud && game.tags[k] && game.tags[k].alive).slice(0, 12);
    ok(mil.diploLoad(ctx, jud).over === 0 && mil.clientStrain(ctx, jud).strain === 0,
      `${name}: twelve bonds cost nothing where the section is switched off`);
    continue;
  }
  const over = [];
  const strained = [];
  for (const tag of Object.keys(game.tags)) {
    const t = game.tags[tag];
    if (!t || !t.alive) continue;
    const l = mil.diploLoad(ctx, tag);
    if (l.over > 0) over.push(tag + ' ' + l.seats + '/' + l.capacity);
    if (mil.clientStrain(ctx, tag).strain > 0) strained.push(tag);
  }
  ok(!over.length, `${name}: no seeded court is over its establishment${over.length ? ' — ' + over.join(', ') : ''}`);
  ok(!strained.length, `${name}: no seeded client system chafes${strained.length ? ' — ' + strained.join(', ') : ''}`);
}

console.log('== an old save has no chancery fields, and does not need any ==');
{
  const { game, ctx } = quiet(11);
  const jud = game.tags.JUD;
  delete jud.marriages;
  delete jud.guarantees;
  delete jud.diploStrained;
  delete jud.freedBy;
  delete game.subsidies;
  ok(mil.diploLoad(ctx, 'JUD').seats === 0, 'a pre-§201 tag reads as an empty chancery');
  ok(mil.clientStrain(ctx, 'JUD').strain === 0, 'and carries no strain');
  ok(mil.freedCollarMonthsLeft(ctx, 'JUD', 'ROM') === 0, 'and remembers no liberation');
  mil.monthlyChancery(ctx);
  ok(true, 'and the monthly pass runs over it without complaint');
}

console.log(failures ? `smoke130: ${failures} FAILURES` : 'smoke130: ALL PASS');
process.exit(failures ? 1 : 0);
