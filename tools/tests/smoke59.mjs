// Headless regression — the client at the peace table & the gated conquest strand.
//  1. Overlord leads (SPEC §61/§74 extension): a war declared ON a vassal is
//     the overlord's to settle — the lord gets the full congress, the client
//     the junior's withdrawal, and the promotion works on the enemy side too.
//  2. Directed spoils: the leader may cede a demanded province straight to
//     its own client in the war; recipients are validated, grudges land on
//     the actual taker, and the pen-holder keeps the infamy.
//  3. The conquest-era Caliphate cannot be broken to a client kingdom at the
//     table (No Dominion but God's), an AI-imposed yoke is thrown off by
//     event (never a human's), and the tribal levies refill mauled columns.
//  4. Rise-of-Islam world cards retire silently in a diverged world (yoked or
//     dead Caliphate, no target to declare on) instead of narrating wars
//     nobody is declaring — and still fire, war and all, on the live rails.
import { readFileSync } from 'node:fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { EVENTS_614 } = await import(R + '/js/data/events_614ce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const {
  declareWar, warBetween, truceActive, sideLeaderOf,
  peaceDealInfo, evaluatePeaceDeal, executePeaceDeal, armiesOf,
} = await import(R + '/js/sim/military.js');
const { checkDateEvents, resolveEventOption } = await import(R + '/js/sim/events.js');

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

function boot(playerTag, seed) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_614);
  const geom = foldGeom(provinceMap);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_614, events: EVENTS_614,
    playerTag, rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_614, events: EVENTS_614, provinceMap,
  });
  return { game, ctx };
}
const EV = (id) => EVENTS_614.find((e) => e && e.id === id);
// The great war and the JUD–SAS alliance tangle every 614 court; clear the
// stage so a synthetic client war can be declared cleanly.
function clearStage(ctx, g) {
  ctx.helpers.endWar(ctx, 'SAS', 'BYZ', null);
  g.tags.JUD.allies = (g.tags.JUD.allies || []).filter((t) => t !== 'SAS');
  g.tags.SAS.allies = (g.tags.SAS.allies || []).filter((t) => t !== 'JUD');
}
function firstOwnedProv(g, tag) {
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === tag) return p;
  }
  return null;
}

console.log('== the overlord holds the pen when its client is attacked ==');
{
  const { game: g, ctx } = boot('JUD', 5901);
  clearStage(ctx, g);
  const r = g.tags.RSH;
  r.alive = true;
  r.overlord = 'JUD';
  const war = declareWar(ctx, 'SAS', 'RSH', 'The Client War');
  ok(!!war && war.defenders.indexOf('RSH') === 0 && war.defenders.indexOf('JUD') > 0,
    'attacking the client summons the overlord to its defense');
  ok(sideLeaderOf(ctx, war, war.defenders) === 'JUD',
    'the defending side\'s pen is promoted from the client to its overlord');
  const lordTable = peaceDealInfo(ctx, war, 'JUD');
  ok(!lordTable.exit && lordTable.sideLeader === 'JUD',
    'the overlord gets the full congress table, not the junior\'s withdrawal');
  ok(lordTable.enemyLeader === 'SAS', 'the congress faces the actual attacker');
  const clientTable = peaceDealInfo(ctx, war, 'RSH');
  ok(clientTable.exit && clientTable.leaderName === (g.tags.JUD.name || 'JUD'),
    'the attacked client itself is the junior at its overlord\'s war');
  ok((clientTable.cessionRecipients || []).length === 0,
    'a junior directs no spoils');
  const attackerTable = peaceDealInfo(ctx, war, 'SAS');
  ok(attackerTable.enemyLeader === 'JUD',
    'from the attacker\'s seat the enemy congress is the overlord too');

  console.log('== directed spoils: the town goes to the client that stormed it ==');
  const prize = firstOwnedProv(g, 'SAS');
  ok(!!prize, 'Persia owns land to put on the table (' + (prize && prize.name) + ')');
  prize.controller = 'RSH'; // the client stormed the walls
  war.warscore.JUD = 80;
  const info = peaceDealInfo(ctx, war, 'JUD');
  ok((info.cessionRecipients || []).some((x) => x.tag === 'RSH'),
    'the leader\'s table offers its client in this war as a recipient');
  ok(info.provinces.some((p) => p.id === prize.id),
    'the client\'s occupation is demandable by the leader');
  const deal = {
    provinces: [prize.id], gold: 0, humiliate: false, subjugate: false, reparations: false,
    provinceTo: { [prize.id]: 'RSH', 999999: 'RSH' },
    release: [], transferVassals: [],
  };
  const ev = evaluatePeaceDeal(ctx, war, 'JUD', deal);
  ok(ev.acceptable, 'the deal prices within the leader\'s war score: ' + ev.reason);
  ok(ev.provinceTo[prize.id] === 'RSH' && Object.keys(ev.provinceTo).length === 1,
    'the recipient survives validation; junk entries are struck');
  const evBad = evaluatePeaceDeal(ctx, war, 'JUD', { ...deal, provinceTo: { [prize.id]: 'BYZ' } });
  ok(!evBad.provinceTo[prize.id],
    'a recipient outside the leader\'s client house is refused');
  const aggBefore = g.tags.JUD.aggression || 0;
  executePeaceDeal(ctx, war, 'JUD', deal);
  ok(prize.owner === 'RSH' && prize.controller === 'RSH',
    'the treaty cedes ' + prize.name + ' from Persia straight to the client');
  ok(!!(g.tags.SAS.grudges && g.tags.SAS.grudges.RSH
      && g.tags.SAS.grudges.RSH.provs.indexOf(prize.id) >= 0),
    'the loser\'s grudge lands on the actual taker (the client)');
  ok((g.tags.JUD.aggression || 0) > aggBefore,
    'the pen-holder still carries the treaty\'s infamy');
  ok(g.tags.RSH.opinion.JUD > 0, 'a town handed over warms the client toward its lord');
  ok(!warBetween(ctx, 'SAS', 'RSH') && truceActive(ctx, 'JUD', 'SAS'),
    'the war is settled and the truce binds');
}

console.log('== the conquest-era caliphate does not kneel ==');
{
  const { game: g, ctx } = boot('JUD', 5902);
  clearStage(ctx, g);
  EV('ev_p_rashidun').options[0].effects(ctx);
  const r = g.tags.RSH;
  ok(r.alive === true, 'the succession card awakens the Caliphate');
  const mods = r.modifiers || [];
  ok(mods.some((m) => m && m.id === 'no_dominion_but_gods' && m.effects && m.effects.noSubjugation),
    'the awakening carries No Dominion but God\'s (noSubjugation)');
  const ridda = mods.find((m) => m && m.id === 'armies_of_the_ridda');
  ok(!!ridda && ridda.months === 120 && ridda.effects.moraleMult === 1.15 && ridda.effects.disciplineMult === 1.08,
    'the Ridda armies\' edge is real and lasts the first conquest decade');
  const diwan = mods.find((m) => m && m.id === 'diwan_of_the_conquests');
  ok(!!diwan && diwan.effects.manpowerMult === 2,
    'the diwan\'s misr system multiplies the muster rolls');
  ok((r.manpower || 0) >= 30000, 'the awakening fills the manpower pool (' + r.manpower + ')');

  const war = declareWar(ctx, 'SAS', 'RSH', 'The Yoke War');
  war.warscore.SAS = 100;
  const info = peaceDealInfo(ctx, war, 'SAS');
  ok(info.canSubjugate === false && /kneel/.test(info.whyNotSubjugate),
    'even at +100 the table refuses the yoke: ' + info.whyNotSubjugate);
  const ev = evaluatePeaceDeal(ctx, war, 'SAS', {
    provinces: [], gold: 0, humiliate: false, subjugate: true, reparations: false,
    release: [], transferVassals: [],
  });
  ok(ev.subjugate === false, 'a submitted subjugation clause is struck from the deal');
  r.modifiers = mods.filter((m) => !(m && m.id === 'no_dominion_but_gods'));
  ok(peaceDealInfo(ctx, war, 'SAS').canSubjugate === true,
    'once the fervor generation passes, the clause returns to the table');

  console.log('== an AI-imposed yoke is thrown off; a player\'s is not ==');
  ctx.helpers.endWar(ctx, 'SAS', 'RSH', null);
  const yoke = EV('ev_p_yoke_broken');
  g.date = { y: 634, m: 6 };
  r.overlord = 'SAS';
  ok(yoke.trigger(ctx) === true, 'a quiet month under an AI overlord arms the rising');
  r.overlord = 'JUD'; // the human player's own prize
  ok(yoke.trigger(ctx) === false, 'a human overlord\'s client stays won — no scripted rising');
  r.overlord = 'SAS';
  yoke.options[0].effects(ctx);
  ok(r.overlord === null, 'the yoke is returned to its sender unworn');
  ok(r.opinion.SAS === -150 && g.tags.SAS.opinion.RSH === -150,
    'the old lord and the risen client despise one another');
  ok(armiesOf(ctx, 'RSH').some((a) => a.name === 'Army of the Rising'),
    'the rising musters a real army at the desert\'s edge');

  console.log('== the tribes answer the call while the conquests run ==');
  const levies = EV('ev_p_tribal_levies');
  for (const id of Object.keys(g.armies)) {
    if (g.armies[id] && g.armies[id].tag === 'RSH') delete g.armies[id];
  }
  r.manpower = 20000;
  ok(levies.trigger(ctx) === false, 'at peace, no summons rides');
  declareWar(ctx, 'RSH', 'BYZ', 'The Test Campaign');
  ok(levies.trigger(ctx) === true, 'at war with thinned columns and a full pool, the summons rides');
  levies.options[0].effects(ctx);
  ok(r.manpower === 15000, 'the levies are drawn from the manpower pool');
  ok(armiesOf(ctx, 'RSH').some((a) => a.name === 'Levies of the Summons'),
    'a fresh host stands at the staging oasis');
}

console.log('== a yoked caliphate\'s world cards retire silently ==');
{
  const { game: g, ctx } = boot('JUD', 5903);
  g.tags.RSH.overlord = 'SAS'; // the diverged world: Medina broken to Ctesiphon
  g.date = { y: 633, m: 4 };
  checkDateEvents(ctx);
  const islamCards = ['ev_p_hijra', 'ev_p_mecca', 'ev_p_rashidun', 'ev_p_iraq_raids'];
  ok(islamCards.every((id) => g.firedEvents[id] === true),
    'every awakening card is marked retired when its month passes in the diverged world');
  ok(!g.pendingEvents.some((pe) => islamCards.indexOf(pe.eventId) >= 0),
    'none of them reaches the player as a popup');
  ok(!warBetween(ctx, 'RSH', 'SAS'), 'no war card, no phantom war');
  ok(g.tags.RSH.alive === false, 'the yoked tag is never script-awakened');
}

console.log('== on the live rails the same cards still fire, war and all ==');
{
  const { game: g, ctx } = boot('JUD', 5904);
  g.date = { y: 633, m: 4 };
  checkDateEvents(ctx);
  const pe = g.pendingEvents.find((x) => x.eventId === 'ev_p_iraq_raids');
  ok(!!pe, 'the free Caliphate\'s campaign card fires on its month');
  resolveEventOption(ctx, pe.instanceId, 0);
  ok(g.tags.RSH.alive === true, 'resolving the card awakens the Caliphate');
  const war = warBetween(ctx, 'RSH', 'SAS');
  ok(!!war, 'the card declares the real war it narrates');
  ok(war.settleMonths === 84, 'the conquest keeps its generational settlement horizon');
  ok(armiesOf(ctx, 'RSH').length >= 2, 'the columns exist on the map, not in prose');
  ok(EV('ev_p_ctesiphon_pressure').when(ctx) === true,
    'with the Iraq war live, the road to Ctesiphon opens');
  g.tags.RSH.overlord = 'BYZ';
  ok(EV('ev_p_ctesiphon_pressure').when(ctx) === false
    && EV('ev_p_uthman_codex').when(ctx) === false
    && EV('ev_p_karbala').when(ctx) === false,
    'yoking the Caliphate silences the rest of the strand');
  g.tags.RSH.overlord = null;
  ok(EV('ev_p_uthman_codex').when(ctx) === true, 'freedom restores the chronicle');
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
