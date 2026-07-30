// Headless regression — the modern batch (SPEC §95, §96, §97):
//   §95  a Hebrew name waits for the schoolhouse AND the community, and the
//        absorption event is the in-campaign road to the second half.
//   §96  recognition instead of alliance: the 1948 bar on an Israeli–Arab
//        pact, the letters that end a war and forbid the next one, the
//        renunciation that costs, and the treaties that sign them.
//   §97  the arcs after the armistice: the Ba'ath in Damascus and Baghdad,
//        the fedayeen years and Black September, the Lebanese war, the
//        uprisings — and the modern Greek banner over 1948.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { EVENTS_1948 } = await import(R + '/js/data/events_1948.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const {
  declareWar, recognized, recognizeCore, renounceRecognitionCore, recognitionInfo,
  allianceBarred, warBetween, endWarBySword, resolveDisplayName,
} = await import(R + '/js/sim/military.js');
const { monthlyIntegration } = await import(R + '/js/sim/realm.js');
const { FLAGS } = await import(R + '/js/ui/icons.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const pm1948 = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
function boot(playerTag = 'ISR') {
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: EVENTS_1948,
    playerTag, rngSeed: 11, provinceMap: pm1948,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948,
    events: EVENTS_1948, provinceMap: pm1948,
  });
  if (typeof BOOKMARK_1948.setup === 'function') BOOKMARK_1948.setup(ctx);
  return { game, ctx };
}
// The opening coalition war is the bookmark's whole point; most of these
// contracts belong to the long armistice that follows it.
function peaceOut(ctx) {
  const g = ctx.game;
  for (const w of (g.wars || []).slice()) endWarBySword(ctx, w, null);
  g.wars.length = 0;
  for (const t of Object.values(g.tags)) if (t) t.atWarWith = [];
  g.truces = {};
}
const ev = (id) => EVENTS_1948.find((e) => e && e.id === id);

console.log('== §96: the pact that is never signed ==');
{
  const { ctx } = boot();
  const a = gameActions(ctx);
  ok(!!allianceBarred(ctx, 'ISR', 'EGY') && !!allianceBarred(ctx, 'EGY', 'ISR'),
    'the bar runs in both directions between Israel and an Arab capital');
  ok(!allianceBarred(ctx, 'EGY', 'JOR') && !allianceBarred(ctx, 'ISR', 'UK'),
    'it bars nothing else: Arab–Arab and Israel–Britain pacts are untouched');
  ok(!!allianceBarred(ctx, 'MLI', 'SYR'),
    'the formables are covered too — a proclaimed Kingdom of Israel signs no pact either');
  const d = a.getDiplomacy('EGY');
  ok(d && !d.canAlly && /No Arab state/.test(d.whyNotAlly),
    'the panel refuses the alliance in the bookmark\'s own words');
  const before = (ctx.game.tags.ISR.allies || []).slice();
  a.offerAlliance('EGY');
  ok((ctx.game.tags.ISR.allies || []).length === before.length,
    'the action itself refuses, not merely the button');
}

console.log('== §96: recognition is era-gated ==');
{
  const { ctx } = boot();
  ok(recognitionInfo(ctx, 'ISR', 'EGY').offered, '1948 exchanges recognitions');
  const ancient = {
    bookmark: BOOKMARK_167, game: { tags: { HAS: {}, SEL: {} }, date: { y: -167, m: 1 } },
    bus: { emit() {} },
  };
  ok(!recognitionInfo(ancient, 'HAS', 'SEL').offered,
    'the ancient bookmarks do not — no button appears in 167 BCE');
}

console.log('== §96: the letters end one war and forbid the next ==');
{
  const { game, ctx } = boot();
  peaceOut(ctx);
  declareWar(ctx, 'EGY', 'ISR', 'A Second Round');
  ok(!!warBetween(ctx, 'ISR', 'EGY'), 'a bilateral war stands between them');
  const res = recognizeCore(ctx, 'ISR', 'EGY');
  ok(res.ok && res.endedWar && !warBetween(ctx, 'ISR', 'EGY'),
    'recognition ends the bilateral war where it stands');
  ok(recognized(ctx, 'ISR', 'EGY') && recognized(ctx, 'EGY', 'ISR'),
    'recognition is mutual however it is asked');
  ok(game.tags.ISR.opinion.EGY >= 40 && game.tags.EGY.opinion.ISR >= 40,
    'neither court may sit below the floor of a state it has recognized');
  ok(!!game.retiredRivalries && !!game.retiredRivalries['EGY|ISR'],
    'the era rivalry retires with the signature');
  ok(declareWar(ctx, 'ISR', 'EGY', 'A Third Round') === null
    && declareWar(ctx, 'EGY', 'ISR', 'A Third Round') === null,
  'neither state can declare war on the other while the papers hold');
  ok(!recognizeCore(ctx, 'ISR', 'EGY').ok, 'it cannot be signed twice');
  const legitWas = game.tags.ISR.legitimacy;
  const out = renounceRecognitionCore(ctx, 'ISR', 'EGY');
  ok(out.ok && !recognized(ctx, 'ISR', 'EGY'),
    'renouncing it takes it off the books');
  ok(game.tags.EGY.opinion.ISR < 40 && game.tags.ISR.legitimacy < legitWas,
    'and costs opinion abroad and public mandate at home');
  // The white peace that recognition imposed also left an ordinary truce;
  // it is the truce that speaks next, not the torn-up recognition.
  ok(declareWar(ctx, 'ISR', 'EGY', 'The War After the Papers') === null,
    'the truce from the white peace still holds the guns after the renunciation');
  game.truces = {};
  ok(!!declareWar(ctx, 'ISR', 'EGY', 'The War After the Papers'),
    'and once the truce runs out the war is possible again');
}

console.log('== §96: a coalition war is settled at its own table first ==');
{
  const { ctx } = boot();
  const info = recognitionInfo(ctx, 'ISR', 'EGY');
  ok(!info.can && /wider war/.test(info.why),
    'the opening coalition war blocks the letters until it is settled');
  ok(!recognizeCore(ctx, 'ISR', 'EGY').ok, 'the core refuses it too');
}

console.log('== §96: the player action, refusal, and the AI\'s peace ==');
{
  const { game, ctx } = boot();
  const a = gameActions(ctx);
  peaceOut(ctx);
  game.tags.ISR.points.infl = 400;
  game.tags.EGY.opinion = { ISR: -30 };
  a.recognizeState('EGY');
  ok(!recognized(ctx, 'ISR', 'EGY'),
    'a court that thinks too little of us returns the letters');
  ok(!recognitionInfo(ctx, 'ISR', 'EGY').can,
    '...and will not hear another approach for two years');
  game.diploCooldowns = {};
  game.tags.EGY.opinion = { ISR: 25 };
  a.recognizeState('EGY');
  ok(recognized(ctx, 'ISR', 'EGY'), 'a warmer court signs');
  const d = a.getDiplomacy('EGY');
  ok(d && !d.canWar && /recogni/i.test(d.whyNotWar),
    'the panel refuses the declaration and says why');
  ok(d.recognition && d.recognition.recognized,
    'the panel offers the withdrawal instead');
}

console.log('== §96: the treaties sign real recognitions ==');
{
  const { game, ctx } = boot();
  peaceOut(ctx);
  game.flags.campDavid = true;
  ev('ev_i_treaty_washington').options[0].effects(ctx);
  ok(recognized(ctx, 'ISR', 'EGY'), 'Washington 1979 recognizes Egypt and Israel to each other');
  game.flags.oslo = true;
  ev('ev_i_wadi_araba').options[0].effects(ctx);
  ok(recognized(ctx, 'ISR', 'JOR'), 'the Arava treaty recognizes Israel and Jordan');
  ok(declareWar(ctx, 'ISR', 'JOR', 'The War That Cannot Be') === null,
    'and the border they can drive across is a border neither can cross under arms');
}

console.log('== §95: the absorption supplies the pen\'s other half ==');
{
  const { game, ctx } = boot();
  peaceOut(ctx);
  const p = ctx.prov('Beersheba');
  p.owner = 'ISR'; p.controller = 'ISR';
  resolveDisplayName(ctx, p);
  for (let i = 0; i < 3; i++) { p.integrating = { by: 'ISR', monthsLeft: 1 }; monthlyIntegration(ctx); }
  ok(p.name === 'Bir Saba', 'integration alone leaves the town its 15-May name');
  game.tags.ISR.treasury = 400;
  ev('ev_i_development_towns').options[0].effects(ctx);
  ok(p.name === 'Be\'er Sheva',
    'the absorption plants the community and the signposts go up the same month');
  ok(!!game.flags.developmentTowns, 'the campaign remembers where the newcomers went');
}

console.log('== §97: the Ba\'ath takes Damascus and Baghdad ==');
{
  const { game, ctx } = boot();
  peaceOut(ctx);
  ev('ev_i_baath_damascus').options[0].effects(ctx);
  ok(game.tags.SYR.flag === 'SYR_BAATH' && /Syrian Arab Republic/.test(game.tags.SYR.name),
    'the eighth of March rebrands Syria in place');
  ev('ev_i_corrective_movement').options[0].effects(ctx);
  ok(game.tags.SYR.ruler.name === 'Hafez al-Assad' && game.tags.SYR.flag === 'SYR_FAR',
    'the Corrective Movement seats Assad under the hawk of the federation');
  ev('ev_i_baath_baghdad').options[0].effects(ctx);
  ok(game.tags.IRQ.flag === 'IRQ_BAATH' && game.tags.IRQ.ruler.name === 'Ahmed Hassan al-Bakr',
    'the seventeenth of July rebrands Iraq and seats al-Bakr');
  ev('ev_i_saddam_ascends').options[0].effects(ctx);
  ok(game.tags.IRQ.ruler.name === 'Saddam Hussein' && !!game.flags.saddamIraq,
    'and the hall in Baghdad seats the man who was standing behind the chair');
  ok(['SYR_BAATH', 'SYR_FAR', 'IRQ_BAATH', 'GRC_MOD'].every((k) => typeof FLAGS[k] === 'string' && FLAGS[k].length > 40),
    'every new banner has real artwork');
}

console.log('== §97: Black September is a war, and Ajloun ends it ==');
{
  const { game, ctx } = boot();
  peaceOut(ctx);
  ev('ev_i_karameh').options[0].effects(ctx);
  ok(!!game.flags.karameh, 'Karameh makes the organizations a fact');
  ev('ev_i_black_september').options[0].effects(ctx);
  const rebels = ctx.helpers.armiesOf(ctx, 'REB').filter((r) => /Fedayeen/.test(r.name || ''));
  ok(rebels.length === 1 && game.tags.JOR.ruler,
    'the Legion faces a real host in the kingdom, not a modifier');
  ok(!!game.flags.jordanCivilWar, 'the campaign knows a civil war is running');
  ev('ev_i_ajloun').options[0].effects(ctx);
  ok(ctx.helpers.armiesOf(ctx, 'REB').filter((r) => /Fedayeen/.test(r.name || '')).length === 0,
    'Ajloun clears the woods');
  ok(!!game.flags.ploInLebanon,
    'and hands the organizations to Lebanon, where the next arc starts');
}

console.log('== §97: the Lebanese war, from the bus to the security zone ==');
{
  const { game, ctx } = boot('LEB');
  peaceOut(ctx);
  ev('ev_i_cairo_agreement').options[0].effects(ctx);
  ok(!!game.flags.cairoAgreement, 'the Cairo Agreement licenses the south');
  ev('ev_i_lebanon_civil_war').options[0].effects(ctx);
  ok(ctx.helpers.armiesOf(ctx, 'REB').some((r) => /Militias of Beirut/.test(r.name || '')),
    'the militias take the field in April 1975');
  const leb = ctx.prov('Berytus');
  ok((leb.modifiers || []).some((m) => m.id === 'the_green_line'),
    'the green line is drawn through the capital');
  ev('ev_i_syrian_intervention').options[0].effects(ctx);
  ok(ctx.prov('Chalcis').owner === 'SYR' && ctx.prov('Tripolis').owner === 'SYR',
    'the Deterrent Force takes the Beqaa and the north on the map');
  ev('ev_i_litani').options[0].effects(ctx);
  ok(!!game.flags.securityBelt, 'Litani leaves a belt along the border');
  ev('ev_i_peace_for_galilee').options[0].effects(ctx);
  ok(!!warBetween(ctx, 'ISR', 'LEB'), '1982 is a war, declared on the map');
  ok(ctx.helpers.armiesOf(ctx, 'ISR').some((r) => /Northern Command/.test(r.name || '')),
    'and the columns are real formations on the northern border');
  ok(!!warBetween(ctx, 'ISR', 'SYR'),
    'Syria in the Beqaa is drawn into it, as it was');
  ok(!!game.flags.ploToTunis, 'the organizations sail for Tunis');
  ev('ev_i_sabra_shatila').options[0].effects(ctx);
  ok(!!game.flags.kahanCommission, 'the commission of judges sits');
  ev('ev_i_the_mire').options[0].effects(ctx);
  ok(!warBetween(ctx, 'ISR', 'LEB') && !warBetween(ctx, 'ISR', 'SYR'),
    'the withdrawal ends the wars it started');
  ok(!!game.flags.lebanonWithdrawal, 'and the security zone is what is left of the plan');
}

console.log('== §97: the uprisings, the Gulf, and the letters ==');
{
  const { game, ctx } = boot();
  peaceOut(ctx);
  ev('ev_i_first_intifada').options[0].effects(ctx);
  ok((game.tags.ISR.modifiers || []).some((m) => m.id === 'the_uprising'),
    'December 1987 is felt by the state, not just the towns');
  ev('ev_i_jordan_disengages').options[0].effects(ctx);
  ok(!!game.flags.jordanDisengaged && !!game.retiredRivalries['ISR|JOR'],
    'the King lets go, and the quarrel with Jerusalem is settled with it');
  ev('ev_i_iran_iraq_war').options[0].effects(ctx);
  ok(!!warBetween(ctx, 'IRQ', 'IRN') && !!game.flags.iranIraqWar,
    'Baghdad crosses the Shatt al-Arab');
  // SPEC §153 — the hundred hours are no longer a number change. This card
  // used to shrink every Iraqi army to 35% of its men on the calendar; the
  // outcome now belongs to a war that is actually fought, and the aftermath
  // cards in the Gulf package ask which way it went. What the Scud card owes
  // the player is the bombardment and the choice, not the result.
  game.flags.coalitionWar = true;
  const before = ctx.helpers.armiesOf(ctx, 'IRQ').reduce((s, r) => s + r.men, 0);
  ev('ev_i_gulf_war').options[0].effects(ctx);
  const after = ctx.helpers.armiesOf(ctx, 'IRQ').reduce((s, r) => s + r.men, 0);
  ok(after === before && !!game.flags.gulfWar,
    'five weeks of air do not decide the war by fiat (army untouched: '
    + before + ' → ' + after + ')');
  ok((game.tags.IRQ.modifiers || []).some((m) => m.id === 'five_weeks_of_air'),
    'but the bombardment is real and on the books');
  ok(!warBetween(ctx, 'ISR', 'IRQ'),
    'and the sealed rooms keep Israel out of the war it was fired at');
  ev('ev_i_oslo').options[0].effects(ctx);
  ok(!(game.tags.ISR.modifiers || []).some((m) => m.id === 'the_uprising') && !!game.flags.oslo,
    'the letters of 1993 lift the uprising');
  ev('ev_i_second_intifada').options[0].effects(ctx);
  ok(!!game.flags.secondIntifada
    && (game.tags.ISR.modifiers || []).some((m) => m.id === 'second_uprising'),
  'and what they postponed arrives in September 2000');
}

console.log('== §97: the banner over Athens is the modern one ==');
{
  const { game } = boot();
  ok(game.tags.GRC.flag === 'GRC_MOD' && /Kingdom of Greece/.test(game.tags.GRC.name),
    '1948 flies the nine stripes and the cross');
  ok(!/wreath/i.test(FLAGS.GRC_MOD) && FLAGS.GRC !== FLAGS.GRC_MOD,
    'the laurel wreath stays with the ancient leagues');
}

console.log('== §96: nobody is dragged into a war against a state it recognizes ==');
{
  const { game, ctx } = boot();
  peaceOut(ctx);
  recognizeCore(ctx, 'ISR', 'EGY');
  // Egypt is Syria's ally; Syria goes to war with Israel anyway.
  game.tags.SYR.allies = ['EGY'];
  game.tags.EGY.allies = ['SYR'];
  const war = declareWar(ctx, 'SYR', 'ISR', 'A War Egypt Sits Out');
  ok(!!war, 'Syria can still declare its own war');
  ok(war.attackers.indexOf('EGY') < 0 && !(game.tags.EGY.atWarWith || []).includes('ISR'),
    'Egypt stays out of its ally\'s war against a state it has recognized');
  ok(war.attackers.indexOf('SYR') >= 0 && war.defenders.indexOf('ISR') >= 0,
    'and the war it declined to join is otherwise an ordinary war');
}

console.log('== §96: the papers ride the save ==');
{
  const { game, ctx } = boot();
  peaceOut(ctx);
  recognizeCore(ctx, 'ISR', 'EGY');
  const { reviveGame } = await import(R + '/js/sim/init.js');
  const loaded = reviveGame(JSON.parse(JSON.stringify(game)));
  const back = makeCtx({
    game: loaded, DEFINES, MAP_DATA, geom, bus: { emit() {}, on() { return () => {}; } },
    bookmark: BOOKMARK_1948, events: EVENTS_1948, provinceMap: pm1948,
  });
  ok(recognized(back, 'ISR', 'EGY'), 'a loaded campaign still knows who recognized whom');
  ok(declareWar(back, 'ISR', 'EGY', 'After the Load') === null,
    'and still refuses the war it forbids');
  const fresh = reviveGame(JSON.parse(JSON.stringify(Object.assign({}, game, { recognitions: undefined }))));
  ok(fresh && fresh.recognitions && Object.keys(fresh.recognitions).length === 0,
    'a pre-§96 save loads with an empty book rather than a crash');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
