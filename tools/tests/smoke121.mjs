// Headless regression — SPEC §190 and §191: the religious quarrels.
//
// The assertions this file exists for are the GATE and the TRADE. The gate:
// a quarrel must arrive when its two sides arrive and not before, which in the
// 167 chapter means 140 BCE (§127 hands the court over on that year) and at a
// court whose bookmark declares none means never. The trade: a ruling must
// cost one side exactly what it pays the other, because a system where the
// crown can rule six times and keep both constituencies is not a quarrel, it
// is a menu.
//
// §191 made the system every chapter's, so the last section walks all eight
// bookmarks: the declared quarrel is seated, both its sides are real seats of
// that court, every ruling is a documented fork, and both poles are reachable.
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
const { QUARRELS, COURT_EFFECTS, COURT_TEXT, DEFAULT_QUARREL } = await import(R + '/js/data/schools.js');
const HASMONEAN = QUARRELS[DEFAULT_QUARREL];
const RULINGS = HASMONEAN.rulings;

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
function holdCourt(ctx, game, tag, hi, lo, months) {
  const t = game.tags[tag];
  for (let m = 0; m < months; m++) {
    t.factions.pharisees = hi;
    t.factions.sadducees = lo;
    game.pendingEvents = (game.pendingEvents || [])
      .filter((pe) => !String(pe.eventId).startsWith('dyn_faction_'));
    for (let d = 0; d < 30; d++) tickDay(ctx);
    if ((game.pendingEvents || []).some((pe) => String(pe.eventId).startsWith('dyn_schools_'))) break;
  }
  return (game.pendingEvents || []).find((pe) => String(pe.eventId).startsWith('dyn_schools_'));
}

console.log('== the gate: the quarrel arrives when the houses do ==');
{
  // The Hasmonean pair specifically: silent wherever they are not the two
  // seats arguing, which after §191 means every chapter that has a quarrel of
  // its own — and 167 for its first twenty-seven years, until §127 hands the
  // court over. Each chapter's OWN quarrel is walked in the §191 section below.
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
    const hasmonean = !!rep && rep.quarrel === 'sages_and_houses';
    ok(hasmonean === EXPECT[id],
      `${id}: the Hasmonean quarrel ${EXPECT[id] ? 'convenes' : 'does not'}`
      + (rep && !hasmonean ? ` (this court is arguing about ${rep.quarrel})` : ''));
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
  const before = { hi: t.factions.pharisees, lo: t.factions.sadducees, gov: t.points.gov };
  const res = actions.issueRuling('chamber', 'hi');
  ok(res.ok, 'the court can rule on the Chamber of Hewn Stone');
  ok(t.points.gov === before.gov - 45, `and it costs the authored price (${before.gov} → ${t.points.gov} governance)`);
  ok(t.factions.pharisees === before.hi + schools.SCHOOLS.rulingSwing, 'the house that won gains the swing');
  ok(t.factions.sadducees === before.lo - schools.SCHOOLS.rulingSwing,
    'REGRESSION: and the house that lost pays exactly the same — no ruling is free');
  ok(schools.readingScore(ctx) === 3, `the reading moves to the schools (${schools.readingScore(ctx)})`);
  const mod = modOf(t, 'ruling_chamber');
  ok(!!mod && mod.effects.integrateMult > 1, 'the ruling grants its authored modifier');
  ok(!Number.isFinite(mod.months), 'and it carries no month count: a ruling of the court does not wear off');
  run(ctx, 3);
  ok(!!modOf(t, 'ruling_chamber'), 'three years later it is still in force');
  ok(schools.rulingsGiven(ctx).chamber === 'hi', 'and the stored side, not the modifier, is the record');

  const again = actions.issueRuling('chamber', 'lo');
  ok(!again.ok && /already ruled/i.test(again.why || ''), 'the court does not rule twice: ' + (again.why || ''));
  ok(schools.readingScore(ctx) === 3, 'and a refused ruling moves nothing');
}
{
  // The cooldown, and the four cost gates — one blocker, one answer.
  const { game, ctx, actions, tag } = boot('67bce');
  run(ctx, 1);
  readyToRule(game, ctx, tag);
  ok(actions.issueRuling('omer', 'lo').ok, 'a first ruling goes through');
  const soon = actions.issueRuling('decrees', 'lo');
  ok(!soon.ok && /too recently/i.test(soon.why || ''), 'a second the same month does not: ' + (soon.why || ''));
  game.schools.lastRulingAt = -Infinity;
  game.tags[tag].points.gov = 5;
  const poor = actions.issueRuling('decrees', 'lo');
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
  const rite = actions.issueRuling('libation', 'hi');
  ok(!rite.ok && /House standing/i.test(rite.why || ''), 'and the rite cannot be ruled on: ' + (rite.why || ''));
}

console.log('== the reading pays, and charges, and pulls ==');
{
  const { game, ctx, actions, tag } = boot('67bce');
  run(ctx, 1);
  const t = game.tags[tag];
  ok(!modOf(t, 'schools_reading'), 'an unruled crown carries no reading modifier');
  // Rule the schools' way, hard, across the cooldown.
  for (const [id, side] of [['chamber', 'hi'], ['heifer', 'hi'], ['omer', 'hi'], ['resurrection', 'hi']]) {
    readyToRule(game, ctx, tag);
    ok(actions.issueRuling(id, side).ok, `ruled ${id} for the schools`);
  }
  run(ctx, 0.2);
  ok(schools.readingScore(ctx) === 10, `four rulings one way reach the pole (${schools.readingScore(ctx)})`);
  ok(schools.readingBand(schools.readingScore(ctx)) === 'hi', 'and the band says so');
  const mod = modOf(t, 'schools_reading');
  ok(!!mod && mod.name === HASMONEAN.hi.name, 'the reading rides the ordinary modifier stream');
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
    actions.issueRuling(id, 'lo');
  }
  run(ctx, 0.2);
  ok(schools.readingScore(ctx) <= -8, `the houses' Law reaches ${schools.readingScore(ctx)}`);
  const mod = modOf(t, 'schools_reading');
  ok(!!mod && mod.name === HASMONEAN.lo.name, 'and it is the other pole\'s modifier');
  ok(mod.effects.incomeMult > 1 && mod.effects.legitimacyAdd > 0, 'paying the treasury and the throne');
  ok(mod.effects.unrestAll > 0 && mod.effects.manpowerMult < 1, '…and charging the country for it');
}

console.log('== the chamber: what the two houses come to together ==');
{
  const { game, ctx, actions, tag } = boot('67bce');
  run(ctx, 1);
  const t = game.tags[tag];
  const set = (hi, lo) => {
    t.factions.pharisees = hi; t.factions.sadducees = lo;
    run(ctx, 0.1);
    return actions.getSchools().court;
  };
  ok(set(75, 75).key === 'concord', 'both houses at the bench is concord');
  ok(modOf(t, 'schools_court').effects.legitimacyAdd > 0, 'and it pays');
  ok(set(15, 70).key === 'breachHi', 'the schools on the floor while the houses hold the crown is a breach');
  ok(modOf(t, 'schools_court').effects.unrestAll > 0, 'and the country is the one that pays for it');
  ok(set(70, 15).key === 'breachLo', '…and the mirror of it is the other breach');
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
  ok(actions.issueRuling('libation', 'hi').ok, 'the water is poured on the altar');
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
  for (const id of ['chamber', 'omer']) { readyToRule(game, ctx, tag); actions.issueRuling(id, 'hi'); }
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
  ok(ev && ev.title === HASMONEAN.crises.hi.title, `and it is the right one (${ev && ev.title})`);
  ok(ev && ev.options.length === 3, 'with three answers, one of them the historical one');
  const before = { legit: t.legitimacy, hi: t.factions.pharisees, reading: schools.readingScore(ctx) };
  ev.options[0].effects();
  ok(t.legitimacy < before.legit, 'clearing the court costs legitimacy');
  ok(t.factions.pharisees <= before.hi, '…and what was left of the schools');
  ok(schools.readingScore(ctx) < before.reading, '…and swings the Law to the houses');
  ok(game.flags.waterGateCleared === true, 'and the campaign remembers it happened');
}
{
  const { game, ctx, tag } = boot('67bce');
  run(ctx, 1);
  const t = game.tags[tag];
  const card = holdCourt(ctx, game, tag, 80, 5, 40);
  const ev = card && ctx.dynEvents.get(card.eventId);
  ok(ev && ev.title === HASMONEAN.crises.lo.title, `the other breach deals the other card (${ev && ev.title})`);
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
  ok(!actions.issueRuling('omer', 'hi').ok, 'and no ruling can be given');
  ok(schools.leanOfLaw(ctx) === 0, 'and the Law leans nowhere');
}
console.log('== §191: every chapter has its own quarrel, and every quarrel is real ==');
{
  // Which court is having which argument, and where. This is the map the rest
  // of the section checks against the actual bookmarks — if a bookmark stops
  // declaring one, or names a seat it does not seat, the walk below says so.
  const EXPECT = {
    '167bce': { tag: 'HAS', quarrel: null }, // the Hasidean court until 140 BCE
    '67bce': { tag: 'HYR', quarrel: 'sages_and_houses' },
    '40bce': { tag: 'HER', quarrel: 'fence_and_gate' },
    '66ce': { tag: 'JUD', quarrel: 'sacrifice_for_caesar' },
    '132ce': { tag: 'JUD', quarrel: 'star_and_schools' },
    '529ce': { tag: 'SAM', quarrel: 'mountain_and_book' },
    '614ce': { tag: 'JUD', quarrel: 'altar_and_academy' },
    '1948ce': { tag: 'ISR', quarrel: 'status_quo' },
  };
  for (const era of ERAS) {
    const id = era.bookmark.id;
    const want = EXPECT[id];
    const { ctx, actions } = boot(id, { tag: want.tag });
    run(ctx, 1);
    const rep = actions.getSchools();
    if (!want.quarrel) { ok(!rep, `${id}: opens with no quarrel seated`); continue; }
    ok(rep && rep.quarrel === want.quarrel, `${id}/${want.tag}: ${rep ? rep.quarrel : 'nothing'} — "${rep ? rep.title : ''}"`);
    if (!rep) continue;
    ok(rep.houses.length === 2 && rep.houses.every((h) => h.name && Number.isFinite(h.approval)),
      `  both sides seated and read: ${rep.houses.map((h) => h.name).join(' vs ')}`);
    ok(!!rep.reading.hiPole && !!rep.reading.loPole && rep.reading.hiPole !== rep.reading.loPole,
      `  the needle is labelled at both ends: ${rep.reading.loPole} ←→ ${rep.reading.hiPole}`);
    ok(rep.reading.band === 'mid' && /Unruled/i.test(rep.reading.label),
      '  and every chapter opens unruled rather than pre-committed');
    ok(rep.rulings.length >= 4, `  ${rep.rulings.length} disputes before the court`);
  }
}
{
  // The bookmarks and the quarrel table have to agree about which seats exist.
  // A quarrel naming a seat its court does not seat is silently dead — the
  // whole block just never appears — which is the one failure mode of a
  // content table keyed by id, and the only way to catch it is to look.
  for (const era of ERAS) {
    const bm = era.bookmark;
    const table = bm.schools || {};
    for (const tag of Object.keys(table)) {
      const q = QUARRELS[table[tag]];
      ok(!!q, `${bm.id}: ${tag} names a quarrel that exists (${table[tag]})`);
      if (!q) continue;
      const seated = ((bm.factions || {})[tag] || []).map((d) => d && d.id);
      ok(seated.includes(q.hi.seat) && seated.includes(q.lo.seat),
        `  …and ${bm.id}:${tag} actually seats ${q.hi.seat} and ${q.lo.seat}`);
    }
  }
}
{
  // Every authored entry, in every quarrel: both sides, both push, the pushes
  // oppose, both grant something, and the whole set can reach the pole.
  for (const key of Object.keys(QUARRELS)) {
    const q = QUARRELS[key];
    const bad = [];
    if (!q.title || !q.mid) bad.push('no title or no unruled line');
    for (const side of ['hi', 'lo']) {
      const p = q[side];
      if (!p || !p.seat || !p.name || !p.text || !p.blurb) bad.push(`pole ${side} is incomplete`);
      if (!p || !p.effects || !Object.keys(p.effects).length) bad.push(`pole ${side} pays nothing`);
    }
    for (const st of ['concord', 'breachHi', 'breachLo', 'schism']) {
      const w = q.states && q.states[st];
      if (!w || !w.name || !w.blurb) bad.push(`${st} has no name or no reason`);
    }
    for (const c of ['hi', 'lo']) {
      const card = q.crises && q.crises[c];
      if (!card || !card.title || !card.text) bad.push(`no ${c} breach card`);
      else if (!Array.isArray(card.options) || card.options.length < 2) bad.push(`${c} card is not a fork`);
      else if (card.options.some((o) => !o.label || !o.tooltip)) bad.push(`${c} card has an unlabelled answer`);
    }
    ok(!bad.length, `${key} is a complete quarrel` + (bad.length ? ' — ' + bad.join('; ') : ''));

    const rbad = [];
    for (const r of q.rulings) {
      for (const side of ['hi', 'lo']) {
        const o = r[side];
        if (!o || !o.label || !o.name || !o.text || !o.blurb) rbad.push(`${r.id}.${side} incomplete`);
        if (!Number.isFinite(o && o.push) || !o.push) rbad.push(`${r.id}.${side} pushes nothing`);
        if (!o || !o.effects || !Object.keys(o.effects).length) rbad.push(`${r.id}.${side} grants nothing`);
      }
      if (r.hi && r.lo && Math.sign(r.hi.push) === Math.sign(r.lo.push)) rbad.push(`${r.id} pushes one way twice`);
      if (!r.question || !r.source) rbad.push(`${r.id} undocumented`);
      if (!r.cost || !Object.keys(r.cost).length) rbad.push(`${r.id} is free`);
    }
    ok(!rbad.length, `  ${q.rulings.length} rulings, each a documented fork` + (rbad.length ? ' — ' + rbad.join('; ') : ''));

    for (const side of ['hi', 'lo']) {
      const reach = Math.abs(q.rulings.reduce((sum, r) => sum + r[side].push, 0));
      ok(reach >= schools.SCHOOLS.max,
        `  ruling every dispute ${side} reaches the pole (${reach} against ${schools.SCHOOLS.max})`);
    }
  }
  // Ids are unique across quarrels — the stored side is keyed by ruling id
  // alone, so a collision would let one chapter's dispute answer another's.
  const seen = new Map();
  let clash = 0;
  for (const key of Object.keys(QUARRELS)) {
    for (const r of QUARRELS[key].rulings) {
      if (seen.has(r.id)) { clash++; console.error('  clash:', r.id, seen.get(r.id), key); }
      seen.set(r.id, key);
    }
  }
  ok(clash === 0, `${seen.size} ruling ids across ${Object.keys(QUARRELS).length} quarrels, none colliding`);
  // …and the one thing every chapter shares is the chamber's arithmetic.
  for (const st of ['concord', 'breachHi', 'breachLo', 'schism']) {
    ok(COURT_EFFECTS[st] && COURT_TEXT[st], `the shared ${st} arithmetic has effects and a printed line`);
  }
}
{
  // 1948 has no Temple, no ascents and no High Priest, and must not be charged
  // for any of them. REGRESSION in advance: the shared breach line docks
  // `pilgrimMult`, and the office branch docks legitimacy for a vacant
  // priesthood — both would be nonsense in a chapter with no altar, and the
  // second is exactly the anachronism §169's own gate exists to catch.
  const { game, ctx, actions, tag } = boot('1948ce', { tag: 'ISR' });
  run(ctx, 1);
  const t = game.tags[tag];
  ok(!!actions.getSchools(), '1948 seats the status quo quarrel');
  ok(!sacred.templeStands(ctx), '…in a chapter with no House standing');
  readyToRule(game, ctx, tag);
  ok(actions.issueRuling('statusQuoLetter', 'lo').ok, 'the four undertakings can be given');
  readyToRule(game, ctx, tag);
  ok(actions.issueRuling('marriageCourts', 'lo').ok, '…and the courts of personal status with them');
  run(ctx, 0.2);
  ok(schools.readingScore(ctx) <= -5, `the reading commits to the Rabbinate (${schools.readingScore(ctx)})`);
  ok(!modOf(t, 'schools_office'),
    'REGRESSION: and no cabinet is docked legitimacy for failing to appoint a High Priest');
  t.factions.kibbutzim = 70; t.factions.rabbinate = 10;
  run(ctx, 0.2);
  const breach = modOf(t, 'schools_court');
  ok(breach && !('pilgrimMult' in breach.effects),
    'REGRESSION: and the breach charges nothing against ascents this chapter does not have');
  ok(breach && breach.effects.growthMult < 1, '…it charges growth instead, which 1948 does have');
  ok(!/ascents/i.test(actions.getSchools().court.text), 'and the panel line says so too');
}
{
  // The two seats §191 had to add, and what they are worth.
  const her = boot('40bce', { tag: 'HER' });
  run(her.ctx, 1);
  const seats = (her.bm.factions.HER || []).map((d) => d.id);
  ok(seats.includes('boethusians'), `Herod's court now seats the priesthood he imported (${seats.join(', ')})`);
  const cands = her.actions.getSacred().priesthood.candidates.map((c) => c.id);
  ok(cands.includes('boethusians'), 'and they are candidates for the office that was invented for them');
  ok(!cands.includes('kin') && !cands.includes('swords'),
    `…while the Idumean family and the hired swords are not (${cands.join(', ')})`);
  const isr = boot('1948ce', { tag: 'ISR' });
  run(isr.ctx, 1);
  const iseats = (isr.bm.factions.ISR || []).map((d) => d.id);
  ok(iseats.includes('rabbinate'), `1948 now seats the parties that signed the letter of June (${iseats.join(', ')})`);
  ok(isr.actions.getSacred() === null, '…in a chapter that still has no High Priesthood to offer them');
}
{
  // Ground for both new ids, so neither falls back to the flat default.
  const { ESTATE_GROUND } = await import(R + '/js/data/estate_ground.js');
  ok(!!ESTATE_GROUND.boethusians, 'the Boethusians have geography');
  ok(!!ESTATE_GROUND.rabbinate, 'and so does the religious bloc');
  ok(ESTATE_GROUND.boethusians.rural < 0, '…an imported priesthood with nothing in the villages, which was the point');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
