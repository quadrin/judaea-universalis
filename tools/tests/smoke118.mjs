// Headless regression — SPEC §186: the quarrel of the two schools.
//
// The assertions this file exists for are the GATE and the TRADE. The gate:
// the quarrel must arrive when the two houses arrive and not before, which in
// the 167 chapter means 140 BCE (§127 hands the court over on that year) and
// in six other chapters means never. The trade: a ruling must cost one house
// exactly what it pays the other, because a system where the crown can rule
// six times and keep both constituencies is not a quarrel, it is a menu.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const { incomeBreakdown } = await import(R + '/js/sim/economy.js');
const schools = await import(R + '/js/sim/schools.js');
const sacred = await import(R + '/js/sim/sacred.js');
const { RULINGS, COURT_STATES, READING, BREACH_CRISES } = await import(R + '/js/data/schools.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

function loadGeom() {
  const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
  return {
    neighbors: snap.neighbors.map((a) => new Set(a)),
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas), bbox: [],
  };
}
function foldGeom(raw, mapping) {
  const N = raw.neighbors.length - 1;
  const to = (id) => (mapping && mapping[id]) || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  const areas = new Int32Array(N + 1);
  const coastal = new Array(N + 1).fill(false);
  const centroids = raw.centroids.slice();
  const offshore = raw.offshore.slice();
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    areas[t] += raw.areas[id];
    if (raw.coastal[id]) coastal[t] = true;
    if (!offshore[t] && raw.offshore[id]) offshore[t] = raw.offshore[id];
    for (const nb of raw.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  for (let id = 1; id <= N; id++) {
    if (to(id) !== id) { centroids[id] = centroids[to(id)]; offshore[id] = offshore[to(id)]; }
  }
  return { neighbors, centroids, areas, coastal, offshore, bbox: [] };
}
const RAW = loadGeom();
function boot(bookmarkId, { seed = 13, tag: want = null } = {}) {
  const era = ERAS.find((e) => e.bookmark.id === bookmarkId);
  const bm = era.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, bm);
  const geom = foldGeom(RAW, provinceMap);
  const tag = want || bm.playableTags[0].tag;
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: bm, events: era.events, playerTag: tag, rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus: { emit() {}, on() {} }, bookmark: bm, events: era.events, provinceMap,
  });
  game.tags[tag].ai = false;
  return { bm, game, ctx, actions: gameActions(ctx), tag };
}
const run = (ctx, years) => { for (let i = 0; i < years * 360; i++) tickDay(ctx); };
const modOf = (t, id) => (t.modifiers || []).find((m) => m && m.id === id);
// Points enough to rule on anything, and a clean cooldown.
function readyToRule(game, ctx, tag) {
  const t = game.tags[tag];
  t.points.gov = 400; t.points.infl = 400; t.points.mar = 400;
  t.treasury = 900;
  if (game.schools) game.schools.lastRulingAt = -Infinity;
}
// Hold a court at a given pair of approvals for N months and answer the estate
// demands as they arrive, which is what a player does — the breach card and the
// estate demands share the one-card-at-a-time guard, so a headless run that
// never clears a demand would never see the breach card and the test would be
// measuring the harness. Stops the moment a schools card is dealt.
function holdCourt(ctx, game, tag, oral, written, months) {
  const t = game.tags[tag];
  for (let m = 0; m < months; m++) {
    t.factions.pharisees = oral;
    t.factions.sadducees = written;
    game.pendingEvents = (game.pendingEvents || [])
      .filter((pe) => !String(pe.eventId).startsWith('dyn_faction_'));
    for (let d = 0; d < 30; d++) tickDay(ctx);
    if ((game.pendingEvents || []).some((pe) => String(pe.eventId).startsWith('dyn_schools_'))) break;
  }
  return (game.pendingEvents || []).find((pe) => String(pe.eventId).startsWith('dyn_schools_'));
}

console.log('== the gate: the quarrel arrives when the houses do ==');
{
  // REGRESSION: the whole system must be silent in every chapter that does not
  // seat both schools — which is six of the eight, and 167 for its first
  // twenty-seven years.
  const EXPECT = {
    '167bce': false, // the Hasideans and the Hellenizers hold this court until 140
    '67bce': true, // both brothers seat both houses from the first month
    '40bce': false, '66ce': false, '132ce': false, '529ce': false, '614ce': false, '1948ce': false,
  };
  for (const era of ERAS) {
    const id = era.bookmark.id;
    const { ctx, actions } = boot(id);
    run(ctx, 1);
    const rep = actions.getSchools();
    ok(!!rep === EXPECT[id], `${id}: the block ${EXPECT[id] ? 'appears' : 'stays hidden'}`);
  }
}
{
  const { ctx, actions, game } = boot('167bce');
  run(ctx, 1);
  ok(!actions.getSchools(), '167 BCE opens with no quarrel: the Hasideans hold the pious seat');
  ok(schools.leanOfLaw(ctx) === 0, 'and nothing can lean the Law before there is a Law to lean');
  // §127 hands the court over on 140. Jump the calendar rather than tick 27
  // years: the handover is a year test, and this suite is not testing time.
  game.date.y = -135;
  const rep = actions.getSchools();
  ok(!!rep, 'and by 135 BCE the Pharisees and the Sadducees are arguing');
  ok(rep.houses.length === 2 && /Pharisees/.test(rep.houses[0].name) && /Sadducees/.test(rep.houses[1].name),
    `both houses are on the panel (${rep.houses.map((h) => h.name).join(' vs ')})`);
  ok(rep.reading.score === 0 && rep.reading.band === 'mid', 'the reading opens unruled');
  ok(rep.rulings.length === RULINGS.length, `${rep.rulings.length} disputes are before the court`);
}

console.log('== a ruling: permanent, priced, and paid for by the other house ==');
{
  const { game, ctx, actions, tag } = boot('67bce');
  run(ctx, 1);
  const t = game.tags[tag];
  readyToRule(game, ctx, tag);
  const before = { oral: t.factions.pharisees, written: t.factions.sadducees, gov: t.points.gov };
  const res = actions.issueRuling('chamber', 'oral');
  ok(res.ok, 'the court can rule on the Chamber of Hewn Stone');
  ok(t.points.gov === before.gov - 45, `and it costs the authored price (${before.gov} → ${t.points.gov} governance)`);
  ok(t.factions.pharisees === before.oral + schools.SCHOOLS.rulingSwing, 'the house that won gains the swing');
  ok(t.factions.sadducees === before.written - schools.SCHOOLS.rulingSwing,
    'REGRESSION: and the house that lost pays exactly the same — no ruling is free');
  ok(schools.readingScore(ctx) === 3, `the reading moves to the schools (${schools.readingScore(ctx)})`);
  const mod = modOf(t, 'ruling_chamber');
  ok(!!mod && mod.effects.integrateMult > 1, 'the ruling grants its authored modifier');
  ok(!Number.isFinite(mod.months), 'and it carries no month count: a ruling of the court does not wear off');
  run(ctx, 3);
  ok(!!modOf(t, 'ruling_chamber'), 'three years later it is still in force');
  ok(schools.rulingsGiven(ctx).chamber === 'oral', 'and the stored side, not the modifier, is the record');

  const again = actions.issueRuling('chamber', 'written');
  ok(!again.ok && /already ruled/i.test(again.why || ''), 'the court does not rule twice: ' + (again.why || ''));
  ok(schools.readingScore(ctx) === 3, 'and a refused ruling moves nothing');
}
{
  // The cooldown, and the four cost gates — one blocker, one answer.
  const { game, ctx, actions, tag } = boot('67bce');
  run(ctx, 1);
  readyToRule(game, ctx, tag);
  ok(actions.issueRuling('omer', 'written').ok, 'a first ruling goes through');
  const soon = actions.issueRuling('decrees', 'written');
  ok(!soon.ok && /too recently/i.test(soon.why || ''), 'a second the same month does not: ' + (soon.why || ''));
  game.schools.lastRulingAt = -Infinity;
  game.tags[tag].points.gov = 5;
  const poor = actions.issueRuling('decrees', 'written');
  ok(!poor.ok && /governance/i.test(poor.why || ''), 'and neither does one the crown cannot pay for: ' + (poor.why || ''));
  const rep = actions.getSchools();
  const row = rep.rulings.find((r) => r.id === 'decrees');
  ok(!row.can && row.whyNot === poor.why,
    'REGRESSION: the panel\'s disabled reason is the click path\'s reason, from the one blocker');
}
{
  // The two rites need a House standing. 67 BCE has one; the gate is the
  // §169 Temple test, not a year.
  const { game, ctx, actions, tag } = boot('67bce');
  run(ctx, 1);
  readyToRule(game, ctx, tag);
  const withHouse = actions.getSchools().rulings.filter((r) => r.can).length;
  game.flags.templeBurned = true;
  const without = actions.getSchools().rulings.filter((r) => r.can).length;
  ok(without === withHouse - 2, `the two rite disputes close when the House does (${withHouse} → ${without} open)`);
  const rite = actions.issueRuling('libation', 'oral');
  ok(!rite.ok && /House standing/i.test(rite.why || ''), 'and the rite cannot be ruled on: ' + (rite.why || ''));
}

console.log('== the reading pays, and charges, and pulls ==');
{
  const { game, ctx, actions, tag } = boot('67bce');
  run(ctx, 1);
  const t = game.tags[tag];
  ok(!modOf(t, 'schools_reading'), 'an unruled crown carries no reading modifier');
  // Rule the schools' way, hard, across the cooldown.
  for (const [id, side] of [['chamber', 'oral'], ['heifer', 'oral'], ['omer', 'oral'], ['resurrection', 'oral']]) {
    readyToRule(game, ctx, tag);
    ok(actions.issueRuling(id, side).ok, `ruled ${id} for the schools`);
  }
  run(ctx, 0.2);
  ok(schools.readingScore(ctx) === 10, `four rulings one way reach the pole (${schools.readingScore(ctx)})`);
  ok(schools.readingBand(schools.readingScore(ctx)) === 'schools', 'and the band says so');
  const mod = modOf(t, 'schools_reading');
  ok(!!mod && mod.name === READING.oral.name, 'the reading rides the ordinary modifier stream');
  ok(mod.effects.unrestAll < 0 && mod.effects.manpowerMult > 1, 'paying the country: less unrest, more men');
  ok(mod.effects.incomeMult < 1, '…and charging the treasury for it — neither pole buys both');

  // …and the pull: the house being administered warms, the other cools. Start
  // both from the middle — four rulings one way have already pinned one house
  // at the ceiling and the other at the floor, which is the point, but a
  // clamped value cannot show a drift.
  t.factions.pharisees = 50; t.factions.sadducees = 50;
  run(ctx, 2);
  ok(t.factions.pharisees > 50, `the school whose Law is administered goes on warming (${Math.round(t.factions.pharisees)})`);
  ok(t.factions.sadducees < 50, `and the one that is not goes on cooling (${Math.round(t.factions.sadducees)})`);
}
{
  // The other pole is a different bargain, not a worse one.
  const { game, ctx, actions, tag } = boot('67bce');
  run(ctx, 1);
  const t = game.tags[tag];
  for (const id of ['chamber', 'heifer', 'omer']) {
    readyToRule(game, ctx, tag);
    actions.issueRuling(id, 'written');
  }
  run(ctx, 0.2);
  ok(schools.readingScore(ctx) <= -8, `the houses' Law reaches ${schools.readingScore(ctx)}`);
  const mod = modOf(t, 'schools_reading');
  ok(!!mod && mod.name === READING.written.name, 'and it is the other pole\'s modifier');
  ok(mod.effects.incomeMult > 1 && mod.effects.legitimacyAdd > 0, 'paying the treasury and the throne');
  ok(mod.effects.unrestAll > 0 && mod.effects.manpowerMult < 1, '…and charging the country for it');
}

console.log('== the chamber: what the two houses come to together ==');
{
  const { game, ctx, actions, tag } = boot('67bce');
  run(ctx, 1);
  const t = game.tags[tag];
  const set = (oral, written) => {
    t.factions.pharisees = oral; t.factions.sadducees = written;
    run(ctx, 0.1);
    return actions.getSchools().court;
  };
  ok(set(75, 75).key === 'concord', 'both houses at the bench is concord');
  ok(modOf(t, 'schools_court').effects.legitimacyAdd > 0, 'and it pays');
  ok(set(15, 70).key === 'breachOral', 'the schools on the floor while the houses hold the crown is a breach');
  ok(modOf(t, 'schools_court').effects.unrestAll > 0, 'and the country is the one that pays for it');
  ok(set(70, 15).key === 'breachWritten', '…and the mirror of it is the other breach');
  ok(modOf(t, 'schools_court').effects.incomeMult < 1, 'which the treasury pays for');
  ok(set(20, 20).key === 'schism', 'both on the floor is the schism');
  const schism = modOf(t, 'schools_court');
  ok(schism.effects.unrestAll > 0 && schism.effects.legitimacyAdd < 0 && schism.effects.incomeMult < 1,
    'REGRESSION: and it is worse than either breach on every axis — two hostile houses is not "balanced"');
  ok(set(50, 50).key === '' && !modOf(t, 'schools_court'), 'and coexistence costs and pays nothing');
}

console.log('== the ascents feel it ==');
{
  const { game, ctx, actions, tag } = boot('67bce');
  run(ctx, 1);
  const t = game.tags[tag];
  const jer = ctx.prov('Jerusalem');
  jer.owner = tag; jer.controller = tag;
  t.atWarWith = [];
  run(ctx, 0.1);
  const base = incomeBreakdown(ctx, tag).pilgrims;
  ok(base > 0, `the festivals pay ${base.toFixed(2)} a month`);
  readyToRule(game, ctx, tag);
  ok(actions.issueRuling('libation', 'oral').ok, 'the water is poured on the altar');
  run(ctx, 0.1);
  ok(incomeBreakdown(ctx, tag).pilgrims > base,
    'and the greatest week of the year draws more (a doctrinal ruling lands on a number the player watches)');
  // …and a breach with the priestly houses closes the strongroom.
  t.factions.pharisees = 70; t.factions.sadducees = 10;
  run(ctx, 0.1);
  ok(incomeBreakdown(ctx, tag).pilgrims < base, 'breaking with the houses cuts the ascents below where they started');
}

console.log('== the priest and the reading ==');
{
  const { game, ctx, actions, tag } = boot('67bce');
  run(ctx, 1);
  const t = game.tags[tag];
  for (const id of ['chamber', 'omer']) { readyToRule(game, ctx, tag); actions.issueRuling(id, 'oral'); }
  ok(sacred.seatHighPriest(ctx, 'sadducees').ok, 'a Sadducean High Priest is anointed');
  run(ctx, 0.1);
  const at = modOf(t, 'schools_office');
  ok(at && at.effects.legitimacyAdd < 0,
    'under the schools\' Law he performs rites the crown has ruled against, and it costs');
  ok(sacred.seatHighPriest(ctx, 'pharisees').ok, 'seat one of the crown\'s own reading instead');
  run(ctx, 0.1);
  const with_ = modOf(t, 'schools_office');
  ok(with_ && with_.effects.legitimacyAdd > 0, 'and the office pays again');
  ok(actions.getSchools().office.aligned === true, 'and the panel says which it is');
}
{
  // REGRESSION: the office was offered to every seat at court, which put hill
  // captains and an Idumean house on the list of candidates for the altar.
  const { ctx, actions, game } = boot('167bce');
  run(ctx, 1);
  const cands = actions.getSacred().priesthood.candidates.map((c) => c.id);
  ok(!cands.includes('warparty'), `the Brothers' Captains cannot be High Priest (${cands.join(', ')})`);
  ok(cands.includes('hasideans') && cands.includes('hellenizers'),
    'and the two that historically bought and fought for it still can');
  ok(!sacred.seatHighPriest(ctx, 'warparty').ok, 'and the click path refuses them too');
  const h = boot('67bce', { tag: 'HYR' });
  run(h.ctx, 1);
  const hc = h.actions.getSacred().priesthood.candidates.map((c) => c.id);
  ok(!hc.includes('antipater'), `the House of Antipater is not a candidate either (${hc.join(', ')})`);
  ok(hc.length >= 2, 'and every court still offers a real choice');
}

console.log('== the breach deals its card ==');
{
  const { game, ctx, tag } = boot('67bce');
  run(ctx, 1);
  const t = game.tags[tag];
  const card = holdCourt(ctx, game, tag, 5, 80, 40);
  ok(!!card, 'a school held on the floor for two years deals the water-gate card');
  const ev = card && ctx.dynEvents.get(card.eventId);
  ok(ev && ev.title === BREACH_CRISES.oral.title, `and it is the right one (${ev && ev.title})`);
  ok(ev && ev.options.length === 3, 'with three answers, one of them the historical one');
  const before = { legit: t.legitimacy, oral: t.factions.pharisees, reading: schools.readingScore(ctx) };
  ev.options[0].effects();
  ok(t.legitimacy < before.legit, 'clearing the court costs legitimacy');
  ok(t.factions.pharisees <= before.oral, '…and what was left of the schools');
  ok(schools.readingScore(ctx) < before.reading, '…and swings the Law to the houses');
  ok(game.flags.waterGateCleared === true, 'and the campaign remembers it happened');
}
{
  const { game, ctx, tag } = boot('67bce');
  run(ctx, 1);
  const t = game.tags[tag];
  const card = holdCourt(ctx, game, tag, 80, 5, 40);
  const ev = card && ctx.dynEvents.get(card.eventId);
  ok(ev && ev.title === BREACH_CRISES.written.title, `the other breach deals the other card (${ev && ev.title})`);
  const tr = t.treasury;
  ev.options[1].effects();
  ok(t.treasury > tr, 'putting the crown\'s clerks on the ledgers opens the strongroom');
  ok(t.factions.sadducees < 5 + 1, '…and finishes the great houses');
}
{
  // A court that is merely cool deals nothing, ever: the card is for a crown
  // that has BROKEN with a house, not one both houses are unenthusiastic about.
  const { game, ctx, tag } = boot('67bce');
  run(ctx, 1);
  ok(!holdCourt(ctx, game, tag, 45, 45, 60),
    'five years of a merely lukewarm court deals no card at all');
}

console.log('== nothing here reaches an AI hand, and nothing here is authored soft ==');
{
  const { game, ctx, actions, tag } = boot('67bce');
  game.tags[tag].ai = true;
  run(ctx, 1);
  ok(actions.getSchools() === null, 'no panel under an AI hand');
  ok(!actions.issueRuling('omer', 'oral').ok, 'and no ruling can be given');
  ok(schools.leanOfLaw(ctx) === 0, 'and the Law leans nowhere');
}
{
  // Every authored entry has both sides, both push, and the pushes oppose.
  for (const r of RULINGS) {
    const bad = [];
    for (const side of ['oral', 'written']) {
      const o = r[side];
      if (!o || !o.label || !o.name || !o.text || !o.blurb) bad.push(side + ' is incomplete');
      if (!Number.isFinite(o && o.push) || !o.push) bad.push(side + ' pushes nothing');
      if (!o || !o.effects || !Object.keys(o.effects).length) bad.push(side + ' grants nothing');
    }
    if (r.oral && r.written && Math.sign(r.oral.push) === Math.sign(r.written.push)) bad.push('both sides push the same way');
    if (!r.question || !r.source) bad.push('undocumented');
    if (!r.cost || !Object.keys(r.cost).length) bad.push('free');
    ok(!bad.length, `${r.id} is a real fork` + (bad.length ? ' — ' + bad.join('; ') : ''));
  }
  const poles = Math.abs(RULINGS.reduce((s, r) => s + r.oral.push, 0));
  ok(poles >= schools.SCHOOLS.max,
    `ruling every dispute one way reaches the pole (${poles} against a max of ${schools.SCHOOLS.max})`);
  for (const key of Object.keys(COURT_STATES)) {
    const st = COURT_STATES[key];
    ok(st.name && st.text && st.blurb && st.effects && Object.keys(st.effects).length,
      `the ${key} state has a name, a stat line and a reason`);
  }
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
