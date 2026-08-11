// Headless regression — the Rashidun century actually happens (SPEC §235).
// The chapter used to narrate Yarmouk, Ctesiphon and the southern gate of
// Jerusalem over a map on which the Caliphate never took a city: pinned at
// exactly sixteen regiments by a force limit of fifteen, manpower at zero from
// 638, and no campaign scripted after 634. This suite locks the six repairs:
//  1. The diwan raises the force limit PAST the army the campaign cards
//     muster, so the mustered host does not desert itself back down to a
//     desert-oasis ceiling and charge the treasury on the way out.
//  2. The manpower pool is deep enough to refill the columns it fields.
//  3. The four missing campaigns exist (Qadisiyyah, Egypt, Nahavand, the
//     capitulation of Alexandria) and read the LIVE map for their targets.
//  4. pressCampaign writes the generational horizon onto a war it did not
//     declare — the empires usually declare first, and the old code only set
//     settleMonths on the path where the card opened the war itself.
//  5. The futuh pays warscore only while the columns hold enemy ground, and
//     nothing at all once they are driven off it.
//  6. The claims of the futuh cover the imperial theatre and NOT Judaea's
//     hill country — the player's homeland is never discounted out from
//     under them.
import { readFileSync } from 'node:fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { EVENTS_614 } = await import(R + '/js/data/events_614ce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { forceLimitOf, regCount, hasClaim, declareWar } = await import(R + '/js/sim/military.js');
const eco = await import(R + '/js/sim/economy.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const N = MAP_DATA.provinces.length;
function foldGeom(mapping) {
  const to = (id) => (mapping && mapping[id]) || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let id = 1; id <= N; id++) {
    for (const nb of snap.neighbors[id] || []) {
      const t = to(id), tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  return {
    neighbors,
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      return { x, y };
    })],
    areas: new Int32Array(N + 1), bbox: [], coastal: snap.coastal || [], offshore: [],
  };
}
const bus = { emit() {}, on() { return () => {}; } };

function boot614(playerTag) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_614);
  const geom = foldGeom(provinceMap);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_614, events: EVENTS_614,
    playerTag, rngSeed: 15858, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_614,
    events: EVENTS_614, provinceMap,
  });
  return { game, ctx };
}

function effect(id, ctx, idx) {
  const ev = EVENTS_614.find((e) => e && e.id === id);
  if (!ev) throw new Error('missing event ' + id);
  ev.options[idx == null ? (ev.aiOption || 0) : idx].effects(ctx);
  return ev;
}
const card = (id) => EVENTS_614.find((e) => e && e.id === id);
const regsOf = (game, tag) => Object.values(game.armies)
  .filter((a) => a && a.tag === tag).reduce((s, a) => s + regCount(a), 0);
const warOf = (game, a, b) => (game.wars || []).find((w) => {
  const all = (w.attackers || []).concat(w.defenders || []);
  return all.indexOf(a) >= 0 && all.indexOf(b) >= 0;
});

// ── 1/2. The diwan pays for an army the state is allowed to have ───────────
console.log('\n§235.1 — the force limit carries the mustered army');
{
  const { game, ctx } = boot614('JUD');
  game.date = { y: 632, m: 6, d: 1 };

  const flBefore = forceLimitOf(ctx, 'RSH');
  const poolBefore = eco.maxManpowerOf(ctx, 'RSH');
  effect('ev_p_rashidun', ctx);           // the awakening
  const flAfter = forceLimitOf(ctx, 'RSH');
  ok(flAfter > flBefore * 2,
    `the diwan multiplies the force limit (${flBefore} → ${flAfter} regiments)`);

  // The awakening's own host is the standing army between campaigns, and it
  // must pay for itself: this is the state the old numbers could not reach at
  // all, because sixteen regiments was already over a limit of fifteen.
  {
    const bd = eco.incomeBreakdown(ctx, 'RSH');
    ok(!(bd.overLimit > 0), 'the Army of the Ridda sits inside the force limit');
    ok(bd.net > 0,
      `and pays for itself between campaigns (net ${Math.round(bd.net * 10) / 10}/month)`);
  }

  // The hijra to the amsar: the muster rolls are not the oases' farmland.
  const poolAfter = eco.maxManpowerOf(ctx, 'RSH');
  ok(poolAfter > poolBefore * 4,
    `the diwan deepens the manpower pool (${Math.round(poolBefore)} → ${Math.round(poolAfter)})`);
  ok(poolAfter >= 15000,
    `and leaves a reserve a conquest can actually draw on (${Math.round(poolAfter)})`);

  // The standing conquest army — the awakening's host plus one open front,
  // which is what the Caliphate actually carries between campaigns. (Firing
  // every campaign card on one day is not a state the calendar can produce;
  // the transient double-muster of 633–634 is allowed to run hot.)
  effect('ev_p_levant_campaign', ctx);
  const regs = regsOf(game, 'RSH');
  const fl = forceLimitOf(ctx, 'RSH');
  ok(fl >= regs,
    `the standing conquest army fits inside the force limit (${regs} regiments, limit ${fl})`);
  ok(fl >= 30,
    `and the limit is a conquest army's, not an oasis confederation's (${fl} regiments)`);

  // The old failure: over the limit, the surcharge swamped income, the
  // treasury went negative and the surplus columns deserted back down to the
  // ceiling — the Caliphate sat pinned at exactly sixteen regiments for
  // twenty-five years. With the ceiling raised there is no surcharge at all,
  // and an opened front is carried by the war chest rather than by desertion.
  const bd = eco.incomeBreakdown(ctx, 'RSH');
  ok(!(bd.overLimit > 0),
    'an opened front still carries no over-force-limit surcharge');
  ok(game.tags.RSH.treasury > 0,
    `and the war chest carries the campaign's opening months (${Math.round(game.tags.RSH.treasury)} talents)`);
}

// ── 3. The campaigns history fought all exist, and read the live map ───────
console.log('\n§235.2 — the four missing campaigns');
{
  for (const id of ['ev_p_qadisiyyah', 'ev_p_egypt_campaign', 'ev_p_nahavand', 'ev_p_alexandria_falls']) {
    ok(!!card(id), `${id} exists`);
  }
  // No card may hand over a province: §72's rule survives §235 intact.
  const src = readFileSync(R + '/js/data/events_614ce.js', 'utf8');
  const conquestCards = src.slice(src.indexOf('ev_p_egypt_campaign'), src.indexOf('ev_p_tribal_levies'));
  ok(!/changeOwner\(/.test(conquestCards),
    'no §235 campaign card transfers a province by script (SPEC §72)');

  // The Egyptian card targets whoever actually holds the Nile — not a
  // hard-coded Byzantium.
  const { game, ctx } = boot614('JUD');
  game.date = { y: 640, m: 2, d: 1 };
  effect('ev_p_rashidun', ctx);
  for (const name of ['Memphis', 'Pelusium', 'Alexandria', 'Thebes']) {
    const p = ctx.prov(name);             // a world where Persia kept Egypt
    if (p) { p.owner = 'SAS'; p.controller = 'SAS'; }
  }
  effect('ev_p_egypt_campaign', ctx);
  ok(!!warOf(game, 'RSH', 'SAS'),
    'the column to Egypt declares on the live holder of the Nile, not on a remembered one');
  ok(!warOf(game, 'RSH', 'BYZ'),
    'and not on the Byzantium the old atlas expected to be there');
}

// ── 4. The generational horizon lands on a war the card did not declare ────
console.log('\n§235.3 — the horizon is written whoever signed first');
{
  const { game, ctx } = boot614('JUD');
  game.date = { y: 632, m: 6, d: 1 };
  effect('ev_p_rashidun', ctx);

  // The empire declares first — the ordinary case, and the one the old code
  // silently dropped the horizon on.
  game.date = { y: 633, m: 1, d: 1 };
  const pre = declareWar(ctx, 'SAS', 'RSH', 'The Frontier Muster');
  ok(!!pre, 'Persia opens the war itself');
  ok(!(pre.settleMonths > 36), 'an ordinary declaration carries no generational horizon');

  game.date = { y: 633, m: 4, d: 1 };
  effect('ev_p_iraq_raids', ctx);
  const w = warOf(game, 'RSH', 'SAS');
  ok(w === pre, 'the campaign card adopts the war already running rather than opening a second');
  ok(w.settleMonths >= 84,
    `the adopted war carries the generational horizon (settleMonths ${w.settleMonths})`);
}

// ── 5. The futuh pays only while the columns hold enemy ground ─────────────
console.log('\n§235.4 — the futuh is earned on the ground, never granted');
{
  const { game, ctx } = boot614('JUD');
  game.date = { y: 634, m: 1, d: 1 };
  effect('ev_p_rashidun', ctx);
  const w = declareWar(ctx, 'RSH', 'SAS', 'The Conquest of Iraq');
  ok(!!w, 'the conquest war stands');

  // Driven off enemy soil: the Caliphate holds nothing of Persia's.
  for (const p of game.provinces) {
    if (p && p.owner === 'SAS' && p.controller === 'RSH') p.controller = 'SAS';
  }
  const futuh = card('ev_p_the_futuh');
  ok(!!futuh, 'ev_p_the_futuh exists');
  ok(!futuh.trigger(ctx),
    'a Caliphate holding no enemy ground does not even raise the card');
  futuh.options[0].effects(ctx);
  const scoreOff = w.eventScore ? (w.eventScore.att || 0) : 0;
  ok(scoreOff === 0, 'and it is paid nothing if the card is forced');

  // Now the columns are standing in a Persian city.
  const target = game.provinces.find((p) => p && p.owner === 'SAS' && !p.impassable);
  target.controller = 'RSH';
  ok(futuh.trigger(ctx), 'with enemy ground held, the card raises');
  futuh.options[0].effects(ctx);
  const scoreOn = w.eventScore ? (w.eventScore.att || 0) : 0;
  ok(scoreOn > 0, `and the towns concede at the table (+${scoreOn} war score)`);

  // sulh and anwatan are a real choice, and the treaty road is the one that
  // moves the frontier: a town carried by storm pays the army, not the war.
  const afterSulh = w.eventScore.att;
  futuh.options[1].effects(ctx);
  const stormGain = w.eventScore.att - afterSulh;
  ok(stormGain > 0 && stormGain < scoreOn,
    `taking it by storm pays less at the table than capitulation (+${stormGain} vs +${scoreOn})`);
  ok((game.tags.RSH.modifiers || []).some((m) => m && m.id === 'taken_by_storm'),
    'and the walls still standing have learned what surrender is worth');

  // The decisive days ride the same gate.
  const w2 = warOf(game, 'RSH', 'SAS');
  const before = w2.eventScore.att;
  effect('ev_p_nahavand', ctx);
  ok(w2.eventScore.att > before, 'Nahavand swings a war the Caliphate is actually pressing');
}

// ── 6. The claim covers the imperial theatre, and stops at Judaea ──────────
console.log('\n§235.5 — the lands of the futuh, and the land that is not');
{
  const { game, ctx } = boot614('JUD');
  game.date = { y: 632, m: 6, d: 1 };
  ok((game.tags.RSH.claims || []).length === 0, 'the dormant Caliphate claims nothing');
  effect('ev_p_rashidun', ctx);

  const claimed = (name) => {
    const p = ctx.prov(name);
    return !!(p && hasClaim(ctx, 'RSH', p.id));
  };
  for (const name of ['Damascus', 'Antioch', 'Seleucia-Ctesiphon', 'Alexandria', 'Ecbatana']) {
    ok(claimed(name), `the futuh claims ${name}`);
  }
  // The player's own hill country is never on the list: the Caliphate may
  // still come for Jerusalem, but through its own war and at full price.
  for (const name of ['Jerusalem', 'Hebron', 'Sebaste']) {
    ok(!claimed(name), `the futuh does NOT claim ${name} — the player's homeland is not discounted`);
  }
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
