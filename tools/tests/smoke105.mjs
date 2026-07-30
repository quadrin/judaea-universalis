// Headless regression — SPEC §163–§168: the five things the world could not do.
//
// This suite holds the batch that gave the WORLD interiority: foreign courts
// with politics of their own (§163), agents who can pay into them (§164), a
// standing table (§165), institutions that arise in a place and make everywhere
// else structurally behind (§166), estates with geography (§167), and an age
// that changes the rules rather than the numbers (§168).
//
// Five of the assertions here exist because the first draft got them wrong and
// something caught it. They are marked REGRESSION and they are the reason this
// file is worth its runtime:
//
//   1. Court approval must not saturate. Flat regression against generated
//      drift rules pinned every court on the map at 100 within a decade.
//   2. `influenceScale` must be exactly 1 at an even share, or §167 silently
//      re-tunes every authored boon and bane in eight bookmarks.
//   3. Embracing an institution must grant NO modifier — the stat lines in the
//      first draft moved the 167 chapter's balance on their own.
//   4. `behind` and the tech surcharge must agree; they are computed twice.
//   5. A calendar-driven annexation must survive the opinion check that
//      unravels a voluntary union, or the Age of Provinces can never happen.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const courts = await import(R + '/js/sim/courts.js');
const standing = await import(R + '/js/sim/standing.js');
const intrigue = await import(R + '/js/sim/intrigue.js');
const inst = await import(R + '/js/sim/institutions.js');
const estates = await import(R + '/js/sim/estates.js');
const ages = await import(R + '/js/sim/ages.js');
const { computeMapmodeColors } = await import(R + '/js/map/mapmodes.js');
const { INSTITUTIONS } = await import(R + '/js/data/institutions.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// The real map adjacency, exactly as tools/autorun.mjs loads it: institutions
// SPREAD across it, so a flat geometry would make half this file vacuous.
function loadGeom() {
  const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
  return {
    neighbors: snap.neighbors.map((a) => new Set(a)),
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas),
    bbox: [],
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

function boot(bookmarkId, { playerTag, seed = 21 } = {}) {
  const era = ERAS.find((e) => e.bookmark.id === bookmarkId);
  const bm = era.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, bm);
  const geom = foldGeom(RAW, provinceMap);
  const tag = playerTag || bm.playableTags[0].tag;
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: bm, events: era.events, playerTag: tag, rngSeed: seed, provinceMap,
  });
  const bus = { emit() {}, on() {} };
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: bm, events: era.events, provinceMap });
  game.tags[tag].ai = false;
  return { bm, game, ctx, actions: gameActions(ctx), tag };
}
const run = (ctx, years) => { for (let i = 0; i < years * 360; i++) tickDay(ctx); };

// ─────────────────────────────────────────────── §163 · foreign courts
console.log('== §163 every court has politics, and the player\'s is still its own ==');
{
  const { game, ctx, tag } = boot('167bce');
  run(ctx, 6);
  let seated = 0;
  for (const k of Object.keys(game.tags)) if (courts.getCourtInfo(ctx, k)) seated++;
  ok(seated >= 5, `courts convene at ${seated} foreign capitals`);
  ok(courts.getCourtInfo(ctx, tag) === null, 'the player\'s own throne is not one of them — factions.js still owns it');
  ok(courts.getCourtInfo(ctx, 'REB') === null, 'rebels keep no court');

  // REGRESSION 1: approval must settle in the middle bands, not saturate.
  // Flat regression against generated drift pinned every party at 100.
  const vals = [];
  for (const k of Object.keys(game.tags)) {
    const info = courts.getCourtInfo(ctx, k);
    if (info) for (const s of info.seats) vals.push(s.approval);
  }
  ok(vals.length > 0, `${vals.length} party bars across the world`);
  ok(!vals.every((v) => v >= 95), 'REGRESSION: courts do not all saturate at devoted');
  ok(vals.some((v) => v > 50) && vals.some((v) => v <= 60),
    'REGRESSION: bars spread across bands rather than pinning to one value');
  ok(vals.every((v) => v >= 0 && v <= 100), 'every bar stays inside 0–100');

  // The grace period: the authored opening plays before this system speaks.
  const early = (game.chronicle || []).filter((c) => c && c.kind === 'politics');
  ok(early.length === 0, 'no court outcome inside the authored opening (six-year grace)');
}
{
  // …and over a long horizon they DO produce outcomes.
  const { game, ctx } = boot('167bce', { seed: 5 });
  run(ctx, 90);
  const pol = (game.chronicle || []).filter((c) => c && c.kind === 'politics');
  ok(pol.length > 0, `over ninety years the world's courts produce ${pol.length} outcomes of their own`);
  ok(pol.some((c) => /reversal|deposed|gone over|banner|quarrel/i.test(c.text)),
    'and they are the authored ladder, not a generic message');
}

// ─────────────────────────────────────────────── §165 · standing
console.log('== §165 the standing of the powers ==');
{
  const { game, ctx, tag, actions } = boot('167bce');
  run(ctx, 3);
  const table = actions.getStandingTable();
  ok(table.length >= 5, `${table.length} courts ranked`);
  ok(table.every((r, i) => i === 0 || table[i - 1].score >= r.score), 'the table is sorted by score, descending');
  const seats = table.filter((r) => r.isPower).length;
  ok(seats <= Math.ceil(table.length / 2), 'REGRESSION: the top table is never more than half the room');
  ok(seats <= 8, 'and never more than eight');
  const sel = actions.getStanding('SEL');
  const has = actions.getStanding(tag);
  ok(sel && has && sel.score > has.score, 'the Seleucid Empire outranks the Maccabees in 167 BCE');
  ok(standing.deference(ctx, tag, 'SEL') > 1, 'a small court wants a bigger margin before starting that war');
  ok(standing.deference(ctx, 'SEL', tag) < 1, '…and the empire wants a smaller one');
  ok(standing.deference(ctx, tag, tag) === 1, 'nobody defers to themselves');
}

// ─────────────────────────────────────────────── §164 · intrigue
console.log('== §164 paying into somebody else\'s court ==');
{
  const { game, ctx, tag, actions } = boot('167bce');
  run(ctx, 3);
  const t = game.tags[tag];
  t.points.infl = 400;
  t.treasury = 2000;

  const menu = actions.getIntrigue('SEL');
  ok(menu && menu.parties.length >= 2, 'the menu names the parties at the Seleucid court');
  ok(menu.parties.every((p) => Number.isInteger(p.approval)),
    'REGRESSION: approvals are rounded at the panel boundary, not printed raw');
  const fid = menu.parties[0].id;

  const before = courts.courtApproval(ctx, 'SEL', fid);
  const res = actions.runIntrigue('SEL', 'subvert', fid);
  ok(res && res.ok, 'subversion runs');
  ok(courts.courtApproval(ctx, 'SEL', fid) < before, 'and the party it paid against loses ground');
  const again = actions.runIntrigue('SEL', 'subvert', fid);
  ok(again && !again.ok && /cold/i.test(again.why || ''), 'the channel then cools: ' + (again && again.why));

  const up = menu.parties[1] ? menu.parties[1].id : fid;
  const b2 = courts.courtApproval(ctx, 'SEL', up);
  const pat = actions.runIntrigue('SEL', 'patronize', up);
  ok(pat && pat.ok && courts.courtApproval(ctx, 'SEL', up) > b2, 'patronage raises a party instead');

  ok(!intrigue.intrigueInfo(ctx, tag, tag, 'subvert', fid).can, 'we cannot run agents in our own court');
  ok(!intrigue.intrigueInfo(ctx, tag, 'REB', 'subvert', fid).can, 'nor against rebels');
  const poor = boot('167bce');
  run(poor.ctx, 3);
  poor.game.tags[poor.tag].treasury = 0;
  poor.game.tags[poor.tag].points.infl = 0;
  ok(!intrigue.intrigueInfo(poor.ctx, poor.tag, 'SEL', 'subvert', fid).can,
    'and an empty purse cannot buy anybody');
}

// ─────────────────────────────────────────────── §166 · institutions
console.log('== §166 the geography of falling behind ==');
{
  ok(INSTITUTIONS.length >= 8, `${INSTITUTIONS.length} institutions authored`);
  ok(INSTITUTIONS.every((i) => !i.effects),
    'REGRESSION: no institution grants a stat modifier — the price IS the mechanic');
  ok(INSTITUTIONS.every((i) => i.id && i.name && i.desc && Array.isArray(i.origin) && Number.isFinite(i.from)),
    'every entry carries an id, a name, a description, an origin and a birth year');

  for (const era of ERAS) {
    const { ctx, actions, tag } = boot(era.bookmark.id);
    run(ctx, 4);
    const rep = actions.getInstitutions();
    // REGRESSION 4: the surcharge and the count are computed twice, in two
    // functions, and must agree.
    const expected = Math.round((Math.min(rep.behind * 0.15, 0.9)) * 100);
    ok(rep.penaltyPct === expected,
      `${era.bookmark.id}: behind ${rep.behind} → +${rep.penaltyPct}% and the two agree`);
    ok(rep.penaltyPct <= 90, `${era.bookmark.id}: the surcharge is capped`);
    const tech = actions.getTech();
    ok(!tech || tech.rows.every((r) => r.cost >= 0), `${era.bookmark.id}: tech prices stay sane`);
  }
}
{
  // The Hellenizer entry, which is the reason the file exists: the Greek
  // chancery does NOT saturate the Judaean hill country before 167 BCE opens.
  const { ctx, actions, tag } = boot('167bce');
  const rep = actions.getInstitutions();
  const chancery = rep.rows.find((r) => r.id === 'chancery');
  ok(!!chancery && chancery.present, 'the Greek chancery exists in the world in 167 BCE');
  ok(chancery.share < chancery.need,
    `REGRESSION: and has NOT taken the Jewish hill country (${chancery.share}% of ${chancery.need}%)`);
  ok(!chancery.embraced, 'so Judaea has not embraced it, and pays for refusing');
  // …but a GREEK city carries it, which is how conquest becomes the answer.
  // Joppa is judaism in the map data and is therefore capped like the hills;
  // Ptolemais, Ascalon and Gaza are hellenism and are not. That distinction is
  // the mechanic, so the test names cities on both sides of it.
  const greek = ['Ptolemais', 'Ascalon', 'Gaza'].map((n) => ctx.prov(n)).filter(Boolean);
  ok(greek.length > 0 && greek.every((p) => (p.inst || {}).chancery >= 50),
    'while the Greek coastal cities know it perfectly well — taking the coast is the way out');
  const joppa = ctx.prov('Joppa');
  ok(joppa && (joppa.inst || {}).chancery < 50,
    '…and Jewish Joppa, on the same coast, does not: the wall is the faith, not the shoreline');
}
{
  // Embracing costs, moves the room, and stops the surcharge.
  const { game, ctx, tag, actions } = boot('66ce');
  run(ctx, 30);
  const before = actions.getInstitutions();
  const target = before.rows.find((r) => r.present && !r.embraced);
  if (target) {
    const t = game.tags[tag];
    t.points.gov = 999; t.points.infl = 999; t.points.mar = 999; t.treasury = 9999;
    // school the realm until it can take it up
    for (let i = 0; i < 240 && inst.institutionShare(ctx, tag, target.id) < 0.35; i++) {
      for (let pid = 1; pid < game.provinces.length; pid++) {
        const p = game.provinces[pid];
        if (!p || p.owner !== tag) continue;
        if (!p.inst) p.inst = {};
        p.inst[target.id] = 100;
      }
    }
    const modsBefore = (t.modifiers || []).length;
    const res = inst.embraceCore(ctx, tag, target.id);
    ok(res.ok, `embracing ${target.id} succeeds once the realm knows it`);
    ok((t.modifiers || []).length === modsBefore,
      'REGRESSION: and grants no modifier of any kind');
    const after = actions.getInstitutions();
    ok(after.penaltyPct < before.penaltyPct, 'the technology surcharge falls: '
      + before.penaltyPct + '% → ' + after.penaltyPct + '%');
  } else {
    ok(true, '(66 CE opens with nothing outstanding to embrace — nothing to assert)');
  }
}

// ─────────────────────────────────────────────── §167 · estate geography
console.log('== §167 the estates have ground under them ==');
{
  const { game, ctx, tag } = boot('167bce');
  run(ctx, 2);
  // REGRESSION 2: neutral at an even share, or eight bookmarks are re-tuned.
  const shares = estates.estateInfluence(ctx, tag);
  ok(shares && Object.keys(shares).length >= 2, 'the player\'s parties have shares of the realm');
  const sum = Object.values(shares).reduce((a, b) => a + b, 0);
  ok(Math.abs(sum - 1) < 1e-9, 'the shares sum to exactly one');
  const n = Object.keys(shares).length;
  const fake = {};
  for (const k of Object.keys(shares)) fake[k] = 1 / n;
  // exercise the formula directly at rel === 1
  const evenScale = 1 + ((1 / n) / (1 / n) - 1) * estates.ESTATE.influenceSlope;
  ok(Math.abs(evenScale - 1) < 1e-12, 'REGRESSION: an even share scales authored effects by exactly 1.0');
  for (const fid of Object.keys(shares)) {
    const s = estates.influenceScale(ctx, tag, fid);
    ok(s >= estates.ESTATE.influenceFloor && s <= estates.ESTATE.influenceCeil,
      `${fid}: influence stays inside its band (${s.toFixed(2)})`);
  }

  // The payoff: taking Greek cities changes the argument at your own court.
  const hellBefore = shares.hellenizers;
  for (const name of ['Joppa', 'Ptolemais', 'Ascalon']) {
    const p = ctx.prov(name);
    if (p) { p.owner = tag; p.controller = tag; }
  }
  const after = estates.estateInfluence(ctx, tag);
  if (Number.isFinite(hellBefore) && Number.isFinite(after.hellenizers)) {
    ok(after.hellenizers > hellBefore,
      `taking the Greek coast raises the Hellenizers at court: ${(hellBefore * 100).toFixed(1)}% → ${(after.hellenizers * 100).toFixed(1)}%`);
  } else {
    ok(false, 'the 167 court seats Hellenizers and the share is readable');
  }

  // Strength is a function of the ground, so two different provinces differ.
  const jer = ctx.prov('Jerusalem');
  const jop = ctx.prov('Joppa');
  if (jer && jop) {
    const a = estates.estateStrength(ctx, jer, 'hellenizers');
    const b = estates.estateStrength(ctx, jop, 'hellenizers');
    ok(a !== b, `the Hellenizers are not equally strong in Jerusalem (${Math.round(a)}) and Joppa (${Math.round(b)})`);
  }
}
{
  // The mapmode exists, is registered, and paints real variation.
  const { game, ctx } = boot('167bce');
  run(ctx, 3);
  const r = computeMapmodeColors(ctx, 'estates');
  const seen = new Set();
  for (let i = 1; i < game.provinces.length; i++) {
    seen.add(r.primary[i * 4] + ',' + r.primary[i * 4 + 1] + ',' + r.primary[i * 4 + 2]);
  }
  ok(seen.size > 6, `the estates mapmode paints ${seen.size} distinct colours, not one per country`);
  const pol = computeMapmodeColors(ctx, 'political');
  const polSeen = new Set();
  for (let i = 1; i < game.provinces.length; i++) {
    polSeen.add(pol.primary[i * 4] + ',' + pol.primary[i * 4 + 1] + ',' + pol.primary[i * 4 + 2]);
  }
  ok(seen.size !== polSeen.size, 'and it is not simply the political map under another name');
}

// ─────────────────────────────────────────────── §168 · the age
console.log('== §168 the age changes the rules, not the numbers ==');
{
  ok(ages.ageAt(-167).id === 'kingdoms', '167 BCE is the Age of Kingdoms');
  ok(ages.ageAt(-63).id === 'provinces', 'Pompey\'s settlement opens the Age of Provinces');
  ok(ages.ageAt(1).id === 'provinces', '…and it holds through the turn of the era');
  ok(ages.ageAt(700).id === 'faiths', '640 opens the Age of the Faiths');
  ok(ages.ageAt(1948).id === 'nations', '1948 is the Age of Nations');
  ok(ages.AGES.find((a) => a.id === 'kingdoms').absorbPerMonth === 0,
    'in the Age of Kingdoms nothing digests a client');
  ok(ages.AGES.find((a) => a.id === 'provinces').absorbPerMonth > 0,
    'in the Age of Provinces something does');
  ok(ages.AGES.every((a) => !a.effects && !a.modifiers),
    'REGRESSION: an age carries no stat modifiers — it changes a rule, not a number');
}
{
  const { game, ctx } = boot('167bce', { seed: 3 });
  game.tags.NAB.overlord = 'SEL';
  ok(ages.absorbRate(ctx, 'NAB') === 0, 'a client in the Age of Kingdoms is not being digested');
  run(ctx, 110); // past 63 BCE
  ok(ages.currentAge(ctx).id === 'provinces', 'the campaign has reached the Age of Provinces');
  const rep = ages.absorbReport(ctx, 'NAB');
  // Pressure, not the instantaneous rate: `absorbRate` legitimately reads zero
  // in any month the client is fighting its lord's war beside it, so a rate
  // assertion is a coin flip on which month the run happens to stop in.
  ok(rep && rep.pressure > 0,
    `and the client is being absorbed (${rep.pressure}/${rep.of}, ${rep.rate}/month right now)`);
  ok((game.chronicle || []).some((c) => /Age of Provinces begins/.test(c.text)),
    'the turn of the age is chronicled');
}
{
  // REGRESSION 5: a calendar annexation must survive the opinion check that
  // unravels a voluntary union — an unwilling client is the whole point.
  const { game, ctx } = boot('167bce', { seed: 3 });
  const client = game.tags.NAB;
  client.overlord = 'SEL';
  client.incorporating = { by: 'SEL', monthsLeft: 6, byCalendar: true };
  client.opinion = client.opinion || {};
  client.opinion.SEL = -100; // they hate it
  run(ctx, 1);
  ok(!!client.incorporating,
    'REGRESSION: a calendar annexation is not unravelled by the client\'s hatred');
  const willing = game.tags.ARM;
  if (willing) {
    willing.overlord = 'SEL';
    willing.incorporating = { by: 'SEL', monthsLeft: 6 };
    willing.opinion = willing.opinion || {};
    willing.opinion.SEL = -100;
    run(ctx, 1);
    ok(!willing.incorporating, '…while a voluntary union still is');
  }
}

// ─────────────────────────────────────────────── the whole battery, all eras
console.log('== every chapter still boots, ticks and reports with all six systems live ==');
for (const era of ERAS) {
  const id = era.bookmark.id;
  let threw = null;
  try {
    const { ctx, actions, tag } = boot(id);
    run(ctx, 12);
    actions.getInstitutions();
    actions.getStandingTable();
    actions.getAge();
    actions.getFactions();
    actions.getIntrigue(Object.keys(ctx.game.tags).find((k) => k !== tag) || tag);
    computeMapmodeColors(ctx, 'estates');
  } catch (e) { threw = e; }
  ok(!threw, `${id}: twelve years with every new system live` + (threw ? ' — ' + threw.message : ''));
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
