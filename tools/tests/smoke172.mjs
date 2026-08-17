// Headless regression — SPEC §252: the world's own verdict, and the chrome
// that must not give it away.
//
// §251 put ten civil wars on the map and then decided every one of them the
// same way in every campaign that ever ran: the record won, on the date the
// record won, for ever. A century whose every pivot is pinned is a diorama.
// What this section adds is a WEIGHTED draw — the record is the likelier road
// and never the only one, the war the campaign actually fought bends the odds,
// and the player is told none of it.
//
// Six contracts:
//
//   1. THE DRAW IS WEIGHTED, SEEDED AND REMEMBERED. Base 1 always holds, base
//      0 never does, 0.5 is a coin, the same seed draws the same verdict, and
//      asking twice never draws twice — a `when` gate may ask on every tick.
//   2. THE CAMPAIGN BENDS IT. A claimant who has actually beaten the
//      government in the field is likelier to keep what he took; nothing is
//      ever certain in either direction.
//   3. EXACTLY ONE ROAD FIRES. Every arc's two cards are complementary: one
//      settles the war, the other settles it differently, and never both.
//   4. EITHER ROAD LEAVES A WORLD THAT WORKS — one banner, no war left being
//      fought by a country that does not exist, and no claimant standing
//      where the chapter needs the banner back.
//   5. NOTHING TELEGRAPHS. The road not taken never reaches the divergence
//      ledger; the Compendium prints no odds, no "the world rolls" badge and
//      no "recorded course"; and no card tooltip in the game quotes a
//      percentage chance at the player.
//   6. THE WEIGHT IS A NUMBER A CARD MAY SET. `roll: 0.5` is an honest
//      tossup and `roll: true` still means the chapter default.
import { readFileSync, readdirSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, simHelpers } = await import(R + '/js/sim/init.js');
const { rollWeight } = await import(R + '/js/sim/events.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

function boot(eraId, tag, seed) {
  const era = ERAS.find((e) => e.bookmark.id === eraId);
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({
    DEFINES, MAP_DATA, geom: null, bookmark: era.bookmark, events: era.events,
    playerTag: tag, rngSeed: seed || 252, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: null, bus,
    bookmark: era.bookmark, events: era.events, provinceMap,
  });
  return { game, ctx, era };
}
const card = (w, id) => w.era.events.find((e) => e && e.id === id);
const owned = (game, tag) => game.provinces.filter((p) => p && !p.impassable && p.owner === tag).length;
const play = (w, id, opt) => {
  const c = card(w, id);
  if (!c || !c.options[opt || 0]) return false;
  c.options[opt || 0].effects(w.ctx);
  return true;
};
const gate = (w, id) => {
  const c = card(w, id);
  if (!c || typeof c.when !== 'function') return true;
  return !!c.when(w.ctx);
};
function grant(w, tag, names) {
  const t = w.game.tags[tag];
  if (t) t.alive = true;
  for (const n of names) {
    const p = w.ctx.prov(n);
    if (!p || p.impassable) continue;
    p.owner = tag;
    p.controller = tag;
  }
}

// ---------------------------------------------------------------------------
console.log('== 1 · the draw is weighted, seeded and remembered ==');
{
  const w = boot('66ce', 'JUD');
  ok(simHelpers.verdict(w.ctx, 'always', 1) === true, 'a weight of 1 always holds');
  ok(simHelpers.verdict(w.ctx, 'never', 0) === false, 'a weight of 0 never does');
  // …and each answer is remembered: the same key never draws twice, which is
  // what lets a `when` gate ask on every tick of every month.
  const first = simHelpers.verdict(w.ctx, 'sticky', 0.5);
  let same = true;
  for (let i = 0; i < 50; i++) if (simHelpers.verdict(w.ctx, 'sticky', 0.5) !== first) same = false;
  ok(same, 'asking a hundred times answers the same way');
  ok(w.game.flags._verdicts && typeof w.game.flags._verdicts.sticky === 'boolean',
    'and the answer rides the flags, so it saves and relays like any world fact');

  // The distribution: 0.5 is a coin, 0.8 is a strong lean, and neither is a
  // certainty. One boot per seed, because a verdict is answered once.
  const share = (base) => {
    let held = 0;
    for (let s = 0; s < 400; s++) {
      const ww = boot('66ce', 'JUD', 9000 + s);
      if (simHelpers.verdict(ww.ctx, 'k', base)) held++;
    }
    return held / 400;
  };
  const coin = share(0.5);
  const lean = share(0.8);
  ok(coin > 0.4 && coin < 0.6, `an honest tossup lands near half (${coin.toFixed(2)})`);
  ok(lean > 0.7 && lean < 0.9, `a strong lean lands near four in five (${lean.toFixed(2)})`);
  ok(lean < 1 && coin > 0, 'and neither is a promise');
}

// ---------------------------------------------------------------------------
console.log('== 2 · the campaign bends the record ==');
{
  // Same seed, same base, opposite wars: the side that has actually been
  // winning is likelier to be the side that wins.
  const run = (score) => {
    let held = 0;
    for (let s = 0; s < 300; s++) {
      const w = boot('66ce', 'JUD', 4000 + s);
      w.game.wars.push({
        id: 'w', attackers: ['ROM'], defenders: ['USR'], warscore: { ROM: score, USR: -score },
      });
      if (simHelpers.verdict(w.ctx, 'k', 0.6, { recorded: 'ROM', war: ['ROM', 'USR'], sway: 0.35 })) held++;
    }
    return held / 300;
  };
  const winning = run(100);
  const losing = run(-100);
  ok(winning > losing + 0.2, `a war going the record's way lifts it (${winning.toFixed(2)} vs ${losing.toFixed(2)})`);
  ok(losing > 0.05 && winning < 0.98, 'and neither end of the field is a certainty');
}

// ---------------------------------------------------------------------------
console.log('== 3 · exactly one road fires, and either leaves a world that works ==');
// Each arc: the pair of cards, the verdict key, the parent, and the ground the
// parent needs before the war can be fought over it.
const ARCS = [
  {
    era: '614ce', player: 'JUD', parent: 'RSH', key: 'firstFitna',
    rise: 'ev_p_uthman_slain', roads: ['ev_p_ali_falls', 'ev_p_ali_survives'],
    grantTo: ['Damascus', 'Emesa', 'Antioch', 'Bostra', 'Chalcis'],
  },
  {
    era: '614ce', player: 'JUD', parent: 'RSH', key: 'secondFitna',
    rise: 'ev_p_second_fitna', roads: ['ev_p_zubayr_falls', 'ev_p_mecca_holds'],
    grantTo: ['Macoraba', 'Yamama', 'Najran', 'Uruk', 'Babylon', 'Yathrib', 'Damascus'],
  },
  {
    era: '167bce', player: 'HAS', parent: 'ROM', key: 'socialWar',
    rise: 'ev_rw_social_war', roads: ['ev_rw_italia_enrolled', 'ev_rw_italia_dictates'],
  },
  {
    era: '167bce', player: 'HAS', parent: 'ROM', key: 'sullasWar',
    rise: 'ev_rw_sulla_returns', roads: ['ev_rw_proscriptions', 'ev_rw_colline_gate_holds'],
  },
  {
    era: '66ce', player: 'JUD', parent: 'ROM', key: 'batavianRising',
    rise: 'ev_fw_civilis', roads: ['ev_fw_civilis_ends', 'ev_fw_gauls_stand'],
    // The Gallic road deliberately leaves a country standing: that is the arc.
    claimantMayStand: true,
  },
  {
    era: '132ce', player: 'JUD', parent: 'ROM', key: 'gallicEmpire',
    rise: 'ev2_eu_postumus', roads: ['ev2_eu_chalons', 'ev2_eu_gaul_holds'],
    // The Gallic road, like the Batavian one, ends in a country.
    claimantMayStand: true, banner: 'USV',
  },
  {
    era: '66ce', player: 'JUD', parent: 'ROM', key: 'saturninus',
    rise: 'ev_fw_saturninus', roads: ['ev_fw_saturninus_ends', 'ev_fw_saturninus_holds'],
  },
  {
    era: '351ce', player: 'JUD', parent: 'ROM', key: 'maximusWar',
    // The chapter BOOTS with a claimant on the banner — Magnentius, raised at
    // the first tick — so the arc thirty years later needs it given back
    // first, which is the whole reason §239 made the banner singular.
    pre: ['ev351w_magnentius_falls'],
    rise: 'ev351w_magnus_maximus', roads: ['ev351w_aquileia', 'ev351w_maximus_holds'],
    claimantMayStand: true,
  },
  {
    era: '351ce', player: 'JUD', parent: 'ROM', key: 'frigidus',
    pre: ['ev351w_magnentius_falls'],
    rise: 'ev351w_eugenius', roads: ['ev351w_frigidus', 'ev351w_frigidus_still'],
    claimantMayStand: true,
  },
  {
    era: '1948ce', player: 'ISR', parent: 'YEM', key: 'yemenWar',
    rise: 'ev_s48_sanaa_officers', roads: ['ev_s48_yemen_compromise', 'ev_s48_yemen_imamate'],
  },
];

for (const arc of ARCS) {
  for (const held of [true, false]) {
    const w = boot(arc.era, arc.player);
    if (arc.grantTo) grant(w, arc.parent, arc.grantTo);
    const banner = arc.banner || 'USR';
    for (const id of arc.pre || []) play(w, id, 0);
    const whole = owned(w.game, arc.parent);
    const before = owned(w.game, arc.parent);
    play(w, arc.rise, 0);
    ok(!!w.game.tags[banner] && owned(w.game, banner) > 0 && owned(w.game, arc.parent) < before,
      `${arc.key} (${held ? 'record' : 'the other road'}): the claim is on the map`);
    // Pin the verdict the way a seed would have, then ask the gates.
    w.game.flags._verdicts = { ...(w.game.flags._verdicts || {}), [arc.key]: held };
    const open = arc.roads.filter((id) => gate(w, id));
    ok(open.length === 1, `  exactly one road is open (${open.join(', ') || 'none'})`);
    ok(play(w, open[0], 0), `  ${open[0]} plays`);
    const stands = !!w.game.tags[banner];
    if (!arc.claimantMayStand || held) {
      ok(!stands, '  and the banner is free again');
      ok(owned(w.game, arc.parent) === whole,
        `  every province is back under one banner (${owned(w.game, arc.parent)}/${whole})`);
    } else {
      ok(stands, '  the claimant is left standing, which is what that road IS');
      ok(owned(w.game, banner) + owned(w.game, arc.parent) === whole, '  and the two of them hold the whole of it');
    }
    const stillFighting = w.game.wars.some((x) => x
      && ((x.attackers || []).concat(x.defenders || [])).indexOf(banner) >= 0
      && ((x.attackers || []).concat(x.defenders || [])).indexOf(arc.parent) >= 0);
    ok(!stillFighting, '  with no civil war left running');
  }
}

// ---------------------------------------------------------------------------
console.log('== 4 · the road not taken never reaches the ledger ==');
{
  const w = boot('614ce', 'JUD');
  grant(w, 'RSH', ['Damascus', 'Emesa', 'Antioch', 'Bostra', 'Chalcis']);
  const { skipEventForTest } = {};
  // Retire the road the world did not take, exactly as checkDateEvents does.
  const div = await import(R + '/js/sim/divergence.js');
  for (const id of ['ev_p_ali_survives', 'ev_p_mecca_holds', 'ev_fw_gauls_stand',
    'ev2_eu_gaul_holds', 'ev_fw_saturninus_holds', 'ev351w_maximus_holds', 'ev351w_frigidus_still']) {
    const c = ERAS.flatMap((e) => e.events).find((e) => e && e.id === id);
    ok(!!c && c.verdict, `${id} declares which verdict it is a road of`);
    div.noteRetired(w.ctx, c, 'the world it needed no longer exists');
  }
  ok((w.game.retiredChapters || []).length === 0,
    'and none of them is listed under "Chapters that never came"');
  // …while an ordinary retired chapter still is, because that list is real.
  const ordinary = { id: 'ev_test_ordinary', title: 'An Ordinary Retirement', major: true };
  div.noteRetired(w.ctx, ordinary, 'the world it needed no longer exists');
  ok((w.game.retiredChapters || []).length === 1, 'an ordinary retirement is still recorded');
}

// ---------------------------------------------------------------------------
console.log('== 5 · nothing in the chrome names the dice ==');
{
  const wiki = readFileSync(R + '/js/ui/wiki.js', 'utf8');
  ok(!/world rolls/.test(wiki), 'the Compendium has no "the world rolls" badge');
  ok(!/recorded course/.test(wiki), 'and no "the recorded course" label');
  ok(!/%\/month/.test(wiki), 'and prints no monthly odds for a triggered card');
  ok(!/ev\.roll/.test(wiki), 'and does not read a card\'s roll at all');
  const css = readFileSync(R + '/js/../styles.css', 'utf8');
  ok(!/wiki-badge-roll/.test(css), 'the badge\'s style went with it');

  // …and the world clock never announces a verdict's road: two of them share
  // one month by construction, so a forecast would either name a card that is
  // not going to fire or announce the outcome of a war before it is decided.
  const { nextWorldEvent } = await import(R + '/js/sim/events.js');
  const w2 = boot('614ce', 'JUD');
  grant(w2, 'RSH', ['Macoraba', 'Yamama', 'Uruk', 'Damascus']);
  w2.game.date = { y: 692, m: 1, d: 1 };
  const roads = new Set(['ev_p_zubayr_falls', 'ev_p_mecca_holds', 'ev_p_ali_falls', 'ev_p_ali_survives']);
  let sawRoad = false;
  for (let i = 0; i < 24; i++) {
    const nx = nextWorldEvent(w2.ctx);
    if (nx && roads.has(nx.id)) sawRoad = true;
    w2.game.date.m += 1;
    if (w2.game.date.m > 12) { w2.game.date.m = 1; w2.game.date.y += 1; }
  }
  ok(!sawRoad, 'the world clock never forecasts either road of a verdict');

  // No card anywhere quotes its own odds at the player.
  const dir = R + '/js/data';
  const bad = [];
  for (const f of readdirSync(dir).filter((x) => x.startsWith('events_'))) {
    const src = readFileSync(dir + '/' + f, 'utf8');
    const re = /(tooltip|label|desc):[^\n]*?(\d{1,3}% chance|chance of \d|% chance|coin-?flip|a dice roll|\bdice\b)/gi;
    let m;
    while ((m = re.exec(src))) bad.push(f + ': ' + m[0].slice(0, 70));
  }
  ok(bad.length === 0, 'no card text quotes a percentage chance' + (bad.length ? ' — ' + bad.join(' | ') : ''));
}

// ---------------------------------------------------------------------------
console.log('== 5b · two purples at once, for the century that had three ==');
{
  // SPEC §253: the third century is the one case where a single banner cannot
  // tell the truth. Palmyra and the Gallic empire overlap by four years, and
  // both have to be on the map at once.
  const w = boot('132ce', 'JUD');
  const whole = owned(w.game, 'ROM');
  play(w, 'ev2_eu_postumus', 0);
  ok(!!w.game.tags.USV && owned(w.game, 'USV') > 0, 'the Gallic empire flies the second banner');
  play(w, 'ev2_palmyra_rises', 0);
  ok(!!w.game.tags.USR && owned(w.game, 'USR') > 0, 'and Palmyra flies the first, in the same decade');
  ok(owned(w.game, 'USR') + owned(w.game, 'USV') + owned(w.game, 'ROM') === whole,
    'three Roman governments, and between them the whole of Rome');
  play(w, 'ev2_aurelian_palmyra', 0);
  ok(!w.game.tags.USR && !!w.game.tags.USV, 'Aurelian takes the east back and the west is still gone');
  w.game.flags._verdicts = { gallicEmpire: true };
  play(w, 'ev2_eu_chalons', 0);
  ok(!w.game.tags.USV, '…and then Châlons takes the west back too');
  ok(owned(w.game, 'ROM') === whole, `with the empire whole again (${owned(w.game, 'ROM')}/${whole})`);
  // The banners are distinct courts, not two names for one.
  ok(DEFINES.TAGS.USV && DEFINES.TAGS.USV.name !== DEFINES.TAGS.USR.name,
    'the second banner is its own court with its own name');
}

// ---------------------------------------------------------------------------
console.log('== 6 · a card may set its own weight ==');
{
  const w = boot('66ce', 'JUD');
  ok(rollWeight(w.ctx, { roll: true }) === DEFINES.EVENT_ROLL_RECORDED,
    'roll: true takes the chapter default');
  ok(rollWeight(w.ctx, { roll: 0.5 }) === 0.5, 'roll: 0.5 is an honest tossup');
  ok(rollWeight(w.ctx, { roll: 0.9 }) === 0.9, 'roll: 0.9 is a lean');
  ok(rollWeight(w.ctx, {}) === null, 'and a card that asks for no roll draws no numbers');
  ok(rollWeight(w.ctx, { roll: 4 }) === 1 && rollWeight(w.ctx, { roll: -2 }) === 0,
    'a weight outside the unit interval is clamped rather than trusted');
}

console.log(failures ? failures + ' FAILURES' : 'smoke172: ALL PASS');
process.exit(failures ? 1 : 0);
