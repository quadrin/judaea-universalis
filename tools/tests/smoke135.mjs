// Headless smoke test §208: Idumea has its own gods until somebody gives it
// the Law.
//
// `ev_idumea_policy` is the 167 chapter's cleanest fork — the covenant or the
// road — and before this section it converted nothing: the base atlas draws
// Adora and Hebron Jewish, because that is what they were by 66 CE, so the
// card that made them Jewish arrived at a map which had already agreed with
// it. §208 seats the old cult of Qos in the 167 chapter only, which turns the
// fork into a trade: the covenant buys off a standing heathen charge, the
// tribute pays it forever. This suite pins the whole chain — the faith, where
// it is seated, where it is NOT, what it costs, what each road does to the
// people (not the paint), and the two knock-ons that fall out of a south
// country that is no longer of the faith.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { computeUnrestBreakdown } = await import(R + '/js/sim/unrest.js');
const { communityLabel, shareOf } = await import(R + '/js/sim/population.js');

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
function boot(bookmarkId, seed = 208) {
  const era = ERAS.find((e) => e.bookmark.id === bookmarkId);
  const bm = era.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, bm);
  const geom = foldGeom(RAW, provinceMap);
  const tag = bm.playableTags[0].tag;
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: bm, events: era.events, playerTag: tag, rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus: { emit() {}, on() {} }, bookmark: bm, events: era.events, provinceMap,
  });
  game.tags[tag].ai = false;
  return { bm, game, ctx, era, tag, actions: gameActions(ctx) };
}
const evOf = (w, id) => (w.era.events || []).find((e) => e && e.id === id);
const rowsOf = (w, name) => computeUnrestBreakdown(w.ctx, w.ctx.prov(name)).rows;
const rowValue = (rows, label) => {
  const r = rows.find((x) => String(x.label).startsWith(label));
  return r ? r.value : null;
};
const IDUMEA = ['Hebron', 'Adora'];

console.log('== the faith exists, and it is a heathen one ==');
{
  const rel = DEFINES.RELIGIONS.idumean;
  ok(!!rel, 'DEFINES.RELIGIONS.idumean is declared');
  ok(rel.name === 'Idumean Cults', 'it is displayed as Idumean Cults: ' + rel.name);
  // The group is the whole of the claim: Judaism is `judaic`, so an Idumean
  // province under a Jewish crown must read HEATHEN and not heretic — the
  // Samaritan quarrel is the heretic case and this is emphatically not it.
  ok(rel.group === 'pagan', 'grouped pagan, so a Jewish crown reads it heathen: ' + rel.group);
  ok(Array.isArray(rel.color) && rel.color.length === 3, 'it has a mapmode colour: ' + rel.color);
  // Distinct enough to read on the map beside every faith it actually borders.
  const near = ['judaism', 'samaritanism', 'hellenism', 'nabataean', 'egyptian'];
  const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  ok(near.every((k) => dist(rel.color, DEFINES.RELIGIONS[k].color) >= 90),
    'and it is distinct from every faith on its borders: '
    + near.map((k) => k + ' ' + dist(rel.color, DEFINES.RELIGIONS[k].color)).join(', '));
  ok(communityLabel(DEFINES, 'idumean', 'idumean') === 'Idumeans',
    'the makeup reads them as a people: ' + communityLabel(DEFINES, 'idumean', 'idumean'));
}

console.log('== 167 seats the old cult; every later chapter is already Jewish ==');
{
  const w = boot('167bce');
  for (const n of IDUMEA) {
    const p = w.ctx.prov(n);
    ok(p.religion === 'idumean', '167: ' + n + ' follows Qos, not the Temple: ' + p.religion);
    ok(p.culture === 'idumean', '167: ' + n + ' is Idumean ground: ' + p.culture);
    ok(shareOf(p, 'idumean') === 1, '167: ' + n + ' is wholly Idumean in the makeup');
  }
  // The base atlas is drawn for 66 CE and MUST NOT move — the conversion is a
  // fact by every later chapter's start date, and a §208 that reached into
  // map_data would have unconverted Idumea for the other seven campaigns.
  const base = MAP_DATA.provinces.filter((p) => IDUMEA.includes(p.name));
  ok(base.length === 2 && base.every((p) => p.religion === 'judaism'),
    'the base atlas still draws Idumea Jewish: ' + base.map((p) => p.name + '=' + p.religion).join(', '));
  for (const id of ['67bce', '40bce', '66ce', '132ce']) {
    const x = boot(id);
    ok(IDUMEA.every((n) => x.ctx.prov(n).religion === 'judaism'),
      id + ': Idumea opens Jewish, a century and a half after the covenant');
  }
}

console.log('== before the card, the south costs what a foreign altar costs ==');
{
  const w = boot('167bce');
  // Idumea opens Seleucid, which is heathen ground under a Greek crown too —
  // the change §208 makes is what happens when a JEWISH crown takes it.
  for (const n of IDUMEA.concat(['Jerusalem'])) w.ctx.helpers.changeOwner(w.ctx, n, 'HAS');
  for (const n of IDUMEA) {
    const rows = rowsOf(w, n);
    ok(rowValue(rows, 'Heathen communities') === 3,
      n + ' under the Hasmoneans carries the full heathen charge: '
      + JSON.stringify(rows.map((r) => r.label + ' ' + r.value)));
    ok(rowValue(rows, 'Heretic') === null, n + ': not a heresy — a different god');
  }
  // The same crown's own hills are unmoved: this is a charge on Idumea, not a
  // charge on holding provinces.
  ok(rowValue(rowsOf(w, 'Jerusalem'), 'Heathen communities') === null,
    'Jerusalem under the same crown pays nothing of the kind');
}
{
  // The other end of the same rule, and the reason the seeded harness moved:
  // under the SELEUCID king — where these two cells actually open — a pagan
  // cult is a same-group heretic (1.5) where the Law was a heathenism (3).
  // Antiochus' quarrel is with Jerusalem, and the map now says so.
  const w = boot('167bce');
  for (const n of IDUMEA) {
    ok(w.ctx.prov(n).owner === 'SEL', n + ' opens the chapter Seleucid');
    const rows = rowsOf(w, n);
    ok(rowValue(rows, 'Heretic communities') === 1.5,
      n + ' is a heresy to the Greeks, not a heathenism: '
      + JSON.stringify(rows.map((r) => r.label + ' ' + r.value)));
  }
  ok(rowValue(rowsOf(w, 'Jerusalem'), 'Heathen communities') === 3,
    'while Jerusalem under the same king still pays the full heathen charge');
}

console.log('== the covenant moves people, not paint ==');
{
  const w = boot('167bce');
  for (const n of IDUMEA) w.ctx.helpers.changeOwner(w.ctx, n, 'HAS');
  const ev = evOf(w, 'ev_idumea_policy');
  ok(!!ev && ev.options.length === 2, 'the fork is still two roads');
  ev.options[0].effects(w.ctx);
  for (const n of IDUMEA) {
    const p = w.ctx.prov(n);
    ok(p.religion === 'judaism', n + ' passes to the faith of Jerusalem: ' + p.religion);
    // The MAKEUP, not the label. A paint-only flip would be written straight
    // back by the next `normalizePop` — an immigration card, an ambient-drift
    // tick — and communal unrest reads the makeup in the meantime regardless.
    ok(shareOf(p, 'judaism') === 1, n + ': every soul in the makeup took the covenant');
    ok(p.culture === 'idumean', n + ' is still Idumean stock, which is the point: ' + p.culture);
    const rows = rowsOf(w, n);
    ok(rowValue(rows, 'Heathen communities') === null, n + ': the heathen charge is gone');
    ok(rowValue(rows, 'Idumea Under the Law') === 1,
      n + ' chafes at 1 where the old gods cost 3');
  }
  ok(w.game.flags.idumeaConverted === true, 'the §101 doctrine flag is set');
}

console.log('== the tribute pays the charge instead of buying it off ==');
{
  const w = boot('167bce');
  for (const n of IDUMEA) w.ctx.helpers.changeOwner(w.ctx, n, 'HAS');
  evOf(w, 'ev_idumea_policy').options[1].effects(w.ctx);
  for (const n of IDUMEA) {
    const p = w.ctx.prov(n);
    ok(p.religion === 'idumean', n + ' keeps Qos: ' + p.religion);
    const rows = rowsOf(w, n);
    ok(rowValue(rows, 'Heathen communities') === 3,
      n + ' goes on paying the heathen charge for as long as it is held');
    ok(rowValue(rows, 'Idumean Tribute') === null, 'the tribute is tax, not quiet');
  }
  ok(w.game.flags.idumeaTributary === true, 'the tributary flag is set');
}

console.log('== the two knock-ons of a south country not of the faith ==');
{
  // The Terms from Antioch keep "the provinces of the faith it holds" and
  // return the rest. Unconverted Idumea is now the rest, which is the tooltip
  // finally being true — and a reason to refuse the decree.
  const w = boot('167bce');
  const h = w.ctx.helpers;
  h.declareWar(w.ctx, 'HAS', 'SEL', 'The Maccabean War');
  for (const n of IDUMEA.concat(['Jerusalem'])) h.changeController(w.ctx, n, 'HAS');
  evOf(w, 'ev_terms_antioch').options[0].effects(w.ctx);
  ok(w.ctx.prov('Jerusalem').owner === 'HAS', 'the decree leaves Jerusalem Jewish and Hasmonean');
  ok(IDUMEA.every((n) => w.ctx.prov(n).owner === 'SEL'),
    'and hands back an Idumea that never took the Law: '
    + IDUMEA.map((n) => n + '=' + w.ctx.prov(n).owner).join(', '));

  // ...and the road round it: the player's own missionaries, twelve months and
  // 100 influence, get there before 126 BCE does.
  const w2 = boot('167bce', 209);
  const h2 = w2.ctx.helpers;
  h2.declareWar(w2.ctx, 'HAS', 'SEL', 'The Maccabean War');
  for (const n of IDUMEA.concat(['Jerusalem'])) h2.changeController(w2.ctx, n, 'HAS');
  for (const n of IDUMEA) h2.changeFaith(w2.ctx, n, 'judaism');
  evOf(w2, 'ev_terms_antioch').options[0].effects(w2.ctx);
  ok(IDUMEA.every((n) => w2.ctx.prov(n).owner === 'HAS'),
    'a south country converted BEFORE the peace stays at the peace: '
    + IDUMEA.map((n) => n + '=' + w2.ctx.prov(n).owner).join(', '));
}

console.log('== the chapter is still winnable without Idumea in the count ==');
{
  // Both 167 win conditions count provinces of the faith (6 for the Heirs of
  // David medallion, 5 for the timed independence of 140). Taking two cells
  // out of the Jewish column must not put either out of reach.
  const w = boot('167bce');
  let jewish = 0;
  for (const p of w.game.provinces) if (p && !p.impassable && p.religion === 'judaism') jewish++;
  ok(jewish >= 12, 'the 167 map still holds ' + jewish + ' provinces of the faith');
  ok(IDUMEA.every((n) => w.ctx.prov(n).religion !== 'judaism'),
    'and none of them is Idumea');
  // The mission's own check is control, not faith — it must still bank.
  const mission = (w.bm.missions.HAS || []).find((m) => m && m.id === 'hm_idumea');
  ok(!!mission, 'Idumea Under the Covenant is still on the tree');
  for (const n of IDUMEA) w.ctx.helpers.changeOwner(w.ctx, n, 'HAS');
  ok(mission.check(w.ctx) === true, 'and it banks on holding the ground, converted or not');
}

console.log('== changeFaith is the card\'s hand, and it is idempotent ==');
{
  const w = boot('167bce');
  const h = w.ctx.helpers;
  h.changeFaith(w.ctx, 'Adora', 'judaism');
  h.changeFaith(w.ctx, 'Adora', 'judaism');
  ok(w.ctx.prov('Adora').religion === 'judaism' && w.ctx.prov('Adora').pop.length === 1,
    'converting twice leaves one community, not two: ' + JSON.stringify(w.ctx.prov('Adora').pop));
  h.changeFaith(w.ctx, 'Adora', null);
  ok(w.ctx.prov('Adora').religion === 'judaism', 'a missing faith is a no-op, not a wipe');
  h.changeFaith(w.ctx, 'Nowhere-at-all', 'judaism');
  ok(true, 'and an unknown province does not throw');
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
