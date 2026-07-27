// Headless regression — the region's own quarrels (SPEC §105):
//   the Suez crisis as a crisis; the union breaking up into Egypt and Syria
//   with SAR as a new tag; Eli Cohen; the Islamist rising and Hama; Tehran in
//   1979; and the northern border it produced, from the Beqaa to the Blue Line.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { secedeTagCore } = await import(R + '/js/sim/military.js');
const { fireEvent, resolveEventOption, checkDateEvents } = await import(R + '/js/sim/events.js');
const { FLAGS } = await import(R + '/js/ui/icons.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const EV = (ERAS.find((e) => e.bookmark.id === '1948ce') || {}).events || [];
const byId = (id) => EV.find((e) => e && e.id === id);

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
function geomFor(mapping) {
  const N = snap.neighbors.length - 1;
  const to = (id) => (mapping && mapping[id]) || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    for (const nb of snap.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  return {
    neighbors,
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas), bbox: [],
  };
}
function boot(playerTag = 'ISR', seed = 17) {
  const bus = { emit() {}, on() { return () => {}; } };
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
  const geom = geomFor(provinceMap);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: EV,
    playerTag, rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948, events: EV, provinceMap });
  return { game, ctx, actions: gameActions(ctx) };
}
const pick = (ctx, ev, idx) => ev.options[idx].effects(ctx);
// The 1948 war is still running at boot; the cards below belong to the long
// armistice, and several of them (the union above all) test for peace.
function pacify(game) {
  game.wars = [];
  for (const t of Object.values(game.tags)) if (t) t.atWarWith = [];
}
const provsOf = (game, tag) => {
  let n = 0;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === tag) n++;
  }
  return n;
};

console.log('== §105: the new tag exists as a state, not a rename ==');
{
  ok(!!DEFINES.TAGS.SAR && DEFINES.TAGS.SAR.capital === 'Damascus',
    'SAR is a first-class tag with a capital of its own');
  ok(DEFINES.GOV_OF.SAR === 'republic' && !!DEFINES.PERSONALITIES.SAR,
    'and a constitution and a temperament');
  ok(!!FLAGS.SAR && !!FLAGS.IRN_IR, 'both new banners have art');
  ok((BOOKMARK_1948.activeTags || []).indexOf('SAR') < 0,
    'and it is NOT in the opening roster — it does not exist until 1961');
}

console.log('== §105: the union breaks up into Egypt and Syria ==');
{
  const { game, ctx } = boot('ISR');
  pacify(game);
  // Form the union first, exactly as the 1958 card does.
  pick(ctx, byId('ev_i_uar_union'), 0);
  ok(!!game.tags.UAR && !game.tags.SYR && !game.tags.EGY,
    'the 1958 union leaves one tag where there were two');
  const unionProvs = provsOf(game, 'UAR');
  const unionTreasury = game.tags.UAR.treasury;
  ok(unionProvs > 0, 'and it holds both countries (' + unionProvs + ' provinces)');

  pick(ctx, byId('ev_i_secession'), 0);
  ok(!!game.tags.SAR && !!game.tags.EGY && !game.tags.UAR,
    'the 1961 card breaks it into exactly two states: Egypt and Syria');
  ok(game.tags.SAR.name === 'Syrian Arab Republic' && game.tags.SAR.flag === 'SAR',
    'Syria comes out under its own name and banner');
  ok(game.tags.EGY.flag === 'EGY_REP',
    'and Egypt goes back to the Free Officers\' republic it was');
  const syrP = provsOf(game, 'SAR');
  const egyP = provsOf(game, 'EGY');
  ok(syrP > 0 && egyP > 0 && syrP + egyP === unionProvs,
    'every province of the union went to one half or the other ('
    + egyP + ' + ' + syrP + ' = ' + unionProvs + ')');
  ok(!!ctx.prov('Damascus') && ctx.prov('Damascus').owner === 'SAR'
    && ctx.prov('Memphis').owner === 'EGY',
    'Damascus is Syrian and Cairo is Egyptian');
  ok(game.tags.SAR.treasury > 0 && game.tags.EGY.treasury > 0
    && Math.abs((game.tags.SAR.treasury + game.tags.EGY.treasury) - unionTreasury) <= 1,
    'the treasury is divided, not duplicated');
  ok(game.tags.SAR.opinion.EGY <= -50 && game.tags.EGY.opinion.SAR <= -50,
    'and the two halves think about each other for a long time');
  ok(!(game.tags.SAR.atWarWith || []).length,
    'a seceding state inherits no wars — walking out is the point');
}

console.log('== §105: ...and it happens without the union too ==');
{
  const { game, ctx } = boot('ISR');
  pacify(game);
  pick(ctx, byId('ev_i_secession'), 0);
  ok(!!game.tags.SAR && !game.tags.SYR,
    'with no union to leave, Syria takes the new name in place');
  ok(provsOf(game, 'SAR') > 0 && !!game.tags.EGY,
    'and Egypt is untouched — there was nothing to give back');
}

console.log('== §105: the Syrian arc still answers after the rename ==');
{
  const { game, ctx } = boot('ISR');
  pacify(game);
  pick(ctx, byId('ev_i_secession'), 0);
  ok(!!game.tags.SAR, 'Syria is SAR');
  const baath = byId('ev_i_baath_damascus');
  ok(baath.when(ctx), 'the 1963 Ba\'ath card still fits the world (it gated on SYR before)');
  ok(typeof baath.decider === 'function' && baath.decider(ctx) === 'SAR',
    'and its decider resolves to whoever Damascus actually is');
  pick(ctx, baath, 0);
  ok(game.tags.SAR.flag === 'SYR_BAATH' && !!game.flags.baathDamascus,
    'the party takes Damascus under the new tag');
  const assad = byId('ev_i_corrective_movement');
  ok(assad.when(ctx), 'and 1970 finds a Damascus to take');
  pick(ctx, assad, 0);
  ok(game.tags.SAR.flag === 'SYR_FAR' && !!game.flags.assadDamascus,
    'Assad takes it too — the arc that used to vanish with the union');
}
{
  // The regression this is really guarding: before §105 a campaign that saw
  // the union form lost the whole Syrian chain, because the 1958 merge deleted
  // SYR and nothing ever brought a Syria back. The secession is what restores
  // it — and in the one world where the player refuses the secession and holds
  // the union by force, the Ba'ath card SHOULD retire, because the March coup
  // was made by officers of a Syrian republic that in that world does not
  // exist. That is coherent divergence rather than a hole.
  const { game, ctx } = boot('ISR');
  pacify(game);
  pick(ctx, byId('ev_i_uar_union'), 0);
  const baath = byId('ev_i_baath_damascus');
  ok(!baath.when(ctx),
    'a union held to 1963 has no Syrian republic for the party to take');
  pick(ctx, byId('ev_i_secession'), 1); // hold the union by force
  ok(!!game.flags.unionHeldByForce && !!game.tags.UAR && !game.tags.SAR,
    'holding it by force keeps one state and produces no Syria');
  ok((ctx.prov('Damascus').modifiers || []).some((m) => m.id === 'union_by_force_p'),
    'and the Syrian provinces carry the occupation that holding it means');
  ok(!baath.when(ctx) && !byId('ev_i_brotherhood_uprising').when(ctx),
    'the whole Syrian arc retires with the republic it belonged to');
}
{
  // ...and the ordinary path restores it, which is the point of the batch.
  const { game, ctx } = boot('ISR');
  pacify(game);
  pick(ctx, byId('ev_i_uar_union'), 0);
  pick(ctx, byId('ev_i_secession'), 0);
  ok(byId('ev_i_baath_damascus').when(ctx) && byId('ev_i_corrective_movement').when(ctx)
    && byId('ev_i_brotherhood_uprising').when(ctx),
    'a union that came apart hands the Syrian arc back in full');
}

console.log('== §105: Suez is a crisis, not a headline ==');
{
  const { game, ctx } = boot('ISR');
  pacify(game);
  for (const id of ['ev_i_sevres', 'ev_i_kadesh', 'ev_i_port_said', 'ev_i_suez_ultimatum']) {
    ok(!!byId(id), 'the chain carries ' + id);
  }
  pick(ctx, byId('ev_i_sevres'), 0);
  ok(!!game.flags.sevresProtocol, 'the protocol is signed');
  ok(byId('ev_i_kadesh').when(ctx), 'which is what opens the campaign');
  pick(ctx, byId('ev_i_kadesh'), 0);
  ok(!!game.flags.sinaiCampaign
    && (game.wars || []).some((w) => w && [].concat(w.attackers, w.defenders).includes('ISR')
      && [].concat(w.attackers, w.defenders).includes('EGY')),
    'the Sinai campaign opens a real war');
  pick(ctx, byId('ev_i_suez_ultimatum'), 0);
  ok(!!game.flags.unefDeployed && !!game.flags.straitsOpen,
    'and the American ultimatum ends it in a UN force and an open Straits');
  ok(!(game.wars || []).some((w) => w && [].concat(w.attackers, w.defenders).includes('ISR')
    && [].concat(w.attackers, w.defenders).includes('EGY')),
    'the war is over when the withdrawal is signed');
  // Refusing at Sèvres retires the campaign rather than stranding it.
  const b = boot('ISR');
  pacify(b.game);
  pick(b.ctx, byId('ev_i_sevres'), 1);
  ok(!byId('ev_i_kadesh').when(b.ctx),
    'and a refusal at Sèvres means no Sinai campaign at all');
}

console.log('== §105: Eli Cohen ==');
{
  const { game, ctx } = boot('ISR');
  pacify(game);
  const rise = byId('ev_i_kamel_amin_thaabet');
  game.date.y = 1963;
  ok(rise.trigger(ctx), 'the Damascus source reaches the establishment');
  pick(ctx, rise, 0);
  ok(!!game.flags.eliCohen
    && (game.tags.ISR.modifiers || []).some((m) => m.id === 'damascus_file'),
    'and running him produces the Damascus file');
  const hang = byId('ev_i_marjeh_square');
  ok(hang.when(ctx), 'which ends in Marjeh Square');
  pick(ctx, hang, 0);
  ok(!!game.flags.cohenHanged
    && (game.tags.ISR.modifiers || []).some((m) => m.id === 'damascus_file'),
    'the network goes dark and the file keeps running — what he sent was already sent');
  // Pulling him out closes the second card for good.
  const b = boot('ISR');
  pacify(b.game);
  b.game.date.y = 1963;
  pick(b.ctx, rise, 1);
  ok(!!b.game.flags.eliCohenExtracted && !hang.when(b.ctx),
    'and extracting him means the hanging card never fits any world');
}

console.log('== §105: the republic of officers comes apart in its turn ==');
{
  const { game, ctx } = boot('ISR');
  pacify(game);
  pick(ctx, byId('ev_i_secession'), 0);
  const rising = byId('ev_i_brotherhood_uprising');
  ok(rising.when(ctx), 'the artillery school opens the insurgency');
  pick(ctx, rising, 0);
  ok(!!game.flags.syrianUprising, 'and the Defence Companies answer it');
  const hama = byId('ev_i_hama');
  ok(hama.when(ctx), 'which ends at Hama');
  pick(ctx, hama, 1); // the branch where the state does NOT hold
  ok(!!game.flags.syrianCollapse
    && (game.tags.SAR.modifiers || []).some((m) => m.id === 'the_country_comes_apart'),
    'and the second option is the one where SAR itself breaks apart');
  const b = boot('ISR');
  pacify(b.game);
  pick(b.ctx, byId('ev_i_secession'), 0);
  pick(b.ctx, rising, 0);
  pick(b.ctx, hama, 0);
  ok(!!b.game.flags.hama && !b.game.flags.syrianCollapse,
    'and the first is the one where it holds, and pays for holding');
}

console.log('== §105: Tehran, and the border it reaches ==');
{
  const { game, ctx } = boot('ISR');
  pacify(game);
  const rev = byId('ev_i_iranian_revolution');
  ok(!!rev && rev.date.y === 1979 && rev.date.m === 2, 'the revolution is on the calendar for February 1979');
  ok(rev.when(ctx), 'and it fits a world with an Iran in it');
  pick(ctx, rev, 0);
  ok(!!game.flags.iranianRevolution && game.tags.IRN.govType === 'theocracy'
    && game.tags.IRN.flag === 'IRN_IR',
    'the monarchy becomes the Islamic Republic');
  ok(game.tags.IRN.opinion.ISR <= -150,
    'and the most reliably aligned capital in the region reverses (' + game.tags.IRN.opinion.ISR + ')');
  ok(byId('ev_i_hostage_crisis').when(ctx), 'the embassy card follows from it');

  // Hezbollah needs BOTH the revolution and the 1982 war — it is the junction.
  const hez = byId('ev_i_hezbollah');
  ok(!hez.when(ctx), 'Hezbollah does not appear from the revolution alone');
  game.flags.lebanonWar82 = true;
  ok(hez.when(ctx), 'it needs the occupation as well — that is the whole causal claim');
  pick(ctx, hez, 0);
  ok(!!game.flags.hezbollah
    && (ctx.prov('Chalcis').modifiers || []).some((m) => m.id === 'party_of_god')
    && (game.tags.ISR.modifiers || []).some((m) => m.id === 'attrition_in_the_south'),
    'and it stands in the Beqaa with a bill attached to the occupation');
  ok(byId('ev_i_barracks').when(ctx), 'the barracks follow');
  ok(byId('ev_i_accountability').when(ctx) && byId('ev_i_grapes_of_wrath').when(ctx),
    'and so do the rounds of the nineties');

  // ...and a crushed revolution closes the whole northern arc.
  const b = boot('ISR');
  pacify(b.game);
  pick(b.ctx, rev, 1);
  b.game.flags.lebanonWar82 = true;
  ok(!!b.game.flags.iranianRevolutionCrushed && !byId('ev_i_hezbollah').when(b.ctx),
    'no revolution, no Guard in the Beqaa, no Party of God');
}

console.log('== §105: the Blue Line closes the northern arc ==');
{
  const { game, ctx } = boot('ISR');
  pacify(game);
  const blue = byId('ev_i_blue_line');
  ok(!blue.when(ctx), 'there is nothing to withdraw from without a security zone');
  game.flags.securityBelt = true;
  game.flags.lebanonWar82 = true;
  game.flags.iranianRevolution = true;
  pick(ctx, byId('ev_i_hezbollah'), 0);
  ctx.helpers.addTagModifier(ctx, 'ISR', {
    id: 'the_zone_bleeds', name: 'The Zone Bleeds', months: 180, effects: { incomeMult: 0.96 },
  });
  ok(blue.when(ctx), 'with one, May 2000 fits');
  pick(ctx, blue, 0);
  ok(!!game.flags.blueLine
    && !(game.tags.ISR.modifiers || []).some((m) => m.id === 'the_zone_bleeds')
    && !(game.tags.ISR.modifiers || []).some((m) => m.id === 'attrition_in_the_south'),
    'and the withdrawal lifts every modifier the occupation was carrying');
  ok((game.tags.ISR.modifiers || []).some((m) => m.id === 'the_north_is_quiet'),
    'the north is quiet for the first time since the sixties');
  ok(!byId('ev_i_accountability').when(ctx) && !byId('ev_i_grapes_of_wrath').when(ctx),
    'and the rounds that belong to the zone retire with it');
}

console.log('== §105: the secession primitive itself ==');
{
  const { game, ctx } = boot('ISR');
  pacify(game);
  ok(secedeTagCore(ctx, 'EGY', 'SAR', { provinces: [] }) === null,
    'a secession with no province behind it is a proclamation, and is refused');
  ok(secedeTagCore(ctx, 'EGY', 'NOPE', { provinces: ['Memphis'] }) === null,
    'and so is one under a banner the world does not define');
  const before = provsOf(game, 'EGY');
  const t = secedeTagCore(ctx, 'EGY', 'SAR', { provinces: ['Memphis', 'Alexandria'], share: 0.5 });
  ok(!!t && provsOf(game, 'SAR') === 2 && provsOf(game, 'EGY') === before - 2,
    'a good one moves exactly the named ground');
  ok(game.tags.EGY.alive !== false, 'and the parent survives it');
  ok(Array.isArray(t.lineage) && t.lineage[0] === 'EGY',
    'the child remembers what it was, so content addressed to the parent still answers');
}

console.log('== §105: a runtime decider still renders as a notice ==');
{
  const { game, ctx } = boot('ISR');
  pacify(game);
  pick(ctx, byId('ev_i_secession'), 0);
  const baath = byId('ev_i_baath_damascus');
  fireEvent(ctx, baath);
  const pe = game.pendingEvents.find((x) => x.eventId === 'ev_i_baath_damascus');
  ok(!!pe && pe.notice === true && pe.decider === 'SAR',
    'the card arrives as a notice naming the court that actually exists');
  const legit = game.tags.SAR.legitimacy;
  resolveEventOption(ctx, pe.instanceId, 1); // acknowledging is not choosing
  ok(game.tags.SAR.legitimacy < legit,
    'and acknowledging applies the pinned historical course, not the button pressed');
}

console.log('== §107: Transjordan becomes Jordan, when the map says so ==');
{
  const A = byId('ev_i_kingdom_of_jordan');
  const B = byId('ev_i_still_transjordan');
  ok(!!A && !!B, 'both halves of the rename are on the calendar');
  ok(A.date.y === 1949 && A.date.m === 4 && B.date.y === 1949 && B.date.m === 4,
    'and both sit on the historical month, April 1949');
  ok(!!A.when && !!B.when && !A.trigger && !B.trigger,
    'each is date + when — the idiom for "on this date, but only in this world"');

  const fresh = boot('ISR');
  ok(fresh.game.tags.JOR.name === 'Transjordan',
    'the kingdom opens 1948 under the name the mandate gave it');

  // The world where the Legion held the hills.
  const held = boot('ISR');
  pacify(held.game);
  held.game.date.y = 1949; held.game.date.m = 4;
  ok(A.when(held.ctx) && !B.when(held.ctx),
    'holding both banks fits the rename and retires its opposite');
  pick(held.ctx, A, 0);
  ok(held.game.tags.JOR.name === 'Jordan' && !!held.game.flags.kingdomOfJordan,
    'and the tag is renamed in place — Jordan, not a new state');
  ok((held.game.tags.JOR.modifiers || []).some((m) => m.id === 'the_two_banks'),
    'with the more populous half of itself attached');

  // The world where it was pushed back over the river.
  const lost = boot('ISR');
  pacify(lost.game);
  lost.game.date.y = 1949; lost.game.date.m = 4;
  for (const n of ['Neapolis', 'Sebaste', 'Jenin', 'Tulkarm', 'Qalqilya', 'Ramallah',
    'Bethlehem', 'Hebron', 'Adora', 'Jericho', 'Jerusalem', 'Beit Shemesh',
    "Modi'in Hills", 'Emmaus', 'Lydda']) {
    const p = lost.ctx.prov(n);
    if (p) { p.owner = 'ISR'; p.controller = 'ISR'; }
  }
  ok(!A.when(lost.ctx) && B.when(lost.ctx),
    'a kingdom back on the east bank fits the other card instead');
  checkDateEvents(lost.ctx);
  ok(!!lost.game.firedEvents.ev_i_kingdom_of_jordan
    && !lost.game.pendingEvents.some((pe) => pe.eventId === 'ev_i_kingdom_of_jordan'),
    'so the rename retires rather than firing');
  ok((lost.game.retiredChapters || []).some((r) => r.id === 'ev_i_kingdom_of_jordan'),
    'and the ledger keeps the page the country never got');
  while (lost.game.pendingEvents.length) {
    const pe = lost.game.pendingEvents[0];
    const ev = byId(pe.eventId);
    try { lost.actions.chooseEventOption(pe.instanceId, (ev && ev.aiOption) || 0); }
    catch (e) { lost.game.pendingEvents.shift(); }
  }
  ok(lost.game.tags.JOR.name === 'Transjordan' && !!lost.game.flags.stillTransjordan,
    'the kingdom keeps the mandate\'s name, which was always a direction');

  // The prose either side of the rename already matches the name.
  const early = EV.filter((e) => e && e.date && e.date.y <= 1948
    && /Transjordan/.test(JSON.stringify(e.options || [])));
  const late = EV.filter((e) => e && e.date && e.date.y >= 1968
    && /Transjordan:/.test(JSON.stringify(e.options || [])));
  ok(early.length > 0 && late.length === 0,
    'cards before the rename say Transjordan and cards after it do not');
}

console.log(failures ? `smoke75: ${failures} FAIL` : 'smoke75: ALL PASS');
process.exit(failures ? 1 : 0);
