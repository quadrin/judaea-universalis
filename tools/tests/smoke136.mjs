// Headless regression — SPEC §209: Beta Israel, Lod, Lag BaOmer, and Himyar.
//
// §206 gave the §205 ground its world spine; this section gives it the
// threads the user's own history runs on: the Beta Israel as a dispersion
// community at Tana (window 345 → 1991, opened by the 132 chapter's own
// withdrawal card and closed by Operation Solomon), the Ethiopian modern arc
// that carries the window's closing (Derg → Moses → Solomon), the Lod
// airport massacre in the 1948 chapter's terror decade, Lag BaOmer as a
// player-facing card inside Bar Kokhba's own war, and Himyar's turn to the
// God of Israel — the card that makes the 529 chapter's "Jewish king of
// Himyar" premise a thing a long 132 campaign actually watches happen.
//
// What this suite holds, that a crash test cannot: the WINDOW arithmetic
// (open for the Keepers and the 1948 chapter, not yet for Bar Kokhba, shut
// from 1991 on), the POPULATION moves (real judaism/cushitic people appear
// at Tana in 345 and land in Israel's towns in 1984/1991), the ARC plumbing
// (Moses leaves "The Ones Left Behind" on Tana and Solomon lifts it), and
// the CROSS-CHAPTER premise (the 384 conversion writes toward exactly the
// aftermath the 529 political map opens with).
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { POLITICAL_MAPS } = await import(R + '/js/data/political_maps.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const { DIASPORA, communityOf, openAt, shutBy, communitiesAt } =
  await import(R + '/js/data/diaspora.js');
const { shareOf, popTotal } = await import(R + '/js/sim/population.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const fakeGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const bus = { emit() {}, on() { return () => {}; } };

function world(eraId, playerTag) {
  const era = ERAS.find((e) => e.bookmark.id === eraId);
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const game = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: era.bookmark, events: era.events,
    playerTag, rngSeed: 7, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: era.bookmark,
    events: era.events, provinceMap,
  });
  return { game, ctx, actions: gameActions(ctx), events: era.events };
}

// Fire a card by id through the real scheduler surface and take an answer.
function fireOpt(w, id, opt) {
  const ev = w.events.find((e) => e && e.id === id);
  if (!ev) return false;
  if (typeof ev.when === 'function' && !ev.when(w.ctx)) return false;
  w.ctx.helpers.fireEvent(w.ctx, id);
  const pe = w.game.pendingEvents.find((p) => p.eventId === id);
  if (!pe) return false;
  w.actions.chooseEventOption(pe.instanceId, Number.isFinite(opt) ? opt : (ev.aiOption || 0));
  return true;
}

function hasMod(list, id) {
  return (list || []).some((m) => m && m.id === id);
}

// ---------------------------------------------------------------------------
console.log('== the window at the spring of the Nile ==');
{
  const d = communityOf('Tana');
  ok(!!d && d.name === 'The Beta Israel' && d.size === 2,
    'the Beta Israel sit at Tana, size 2 — nobody outranks the great nodes');
  ok(d.from === 345 && d.until === 1991,
    'the window runs 345 (the withdrawal card\'s own year) to 1991 (Operation Solomon)');
  ok(d.start <= 50, 'devotion has to be earned here like everywhere else (start ' + d.start + ')');
  ok(!openAt(d, 132) && !shutBy(d, 132),
    'Bar Kokhba\'s chapter opens before the window does — not-yet, which is not shut');
  ok(openAt(d, 529) && openAt(d, 614) && openAt(d, 1948) && openAt(d, 1985),
    'the Keepers, the 614 chapter and the 1948 chapter can all write to the mountains');
  ok(!openAt(d, 1991) && shutBy(d, 1992),
    'and from Operation Solomon on, there is no one left to write to');
  ok(communitiesAt(1985).some((c) => c.prov === 'Tana')
    && !communitiesAt(1992).some((c) => c.prov === 'Tana'),
    'the era ledger agrees on both sides of the airlift');
}

// ---------------------------------------------------------------------------
console.log('== the §209 cards are dated cards in their own chapters ==');
{
  const WANT = {
    '132ce': ['ev2_takkaze_refusers', 'ev2_himyar_rahmanan', 'ev2_lag_baomer'],
    '1948ce': ['ev_i_lod_airport', 'ev_s48_derg', 'ev_s48_operation_moses',
      'ev_s48_operation_solomon'],
  };
  for (const [eraId, ids] of Object.entries(WANT)) {
    const era = ERAS.find((e) => e.bookmark.id === eraId);
    const have = new Map((era.events || []).map((e) => [e && e.id, e]));
    for (const id of ids) {
      const ev = have.get(id);
      ok(!!ev && !!ev.date && Number.isFinite(ev.date.y), eraId + ' carries ' + id + ' dated');
    }
  }
  // Lag BaOmer is the set's one player-facing card: the court answers it, so
  // it must offer two real answers (smoke39's rule) and pin its AI course.
  const era132 = ERAS.find((e) => e.bookmark.id === '132ce');
  const lag = era132.events.find((e) => e && e.id === 'ev2_lag_baomer');
  ok(!lag.world && lag.forTag === 'JUD' && lag.options.length === 2 && lag.aiOption === 0,
    'Lag BaOmer: player card, two answers, aiOption pinned');
  ok(lag.date.y === 133 && lag.date.m === 5, 'and it falls in the omer weeks of 133');
  // Everything else is a world notice: other courts\' choices, dealt as news.
  for (const id of ['ev2_takkaze_refusers', 'ev2_himyar_rahmanan']) {
    const ev = era132.events.find((e) => e && e.id === id);
    ok(ev.world === true && typeof ev.when === 'function', id + ' is a gated world card');
  }
}

// ---------------------------------------------------------------------------
console.log('== 345: those who refuse the Cross withdraw into the Semien ==');
{
  const w = world('132ce', 'ROM');
  const tana = w.ctx.prov('Tana');
  ok(!!tana && shareOf(tana, 'judaism') === 0,
    'at the chapter\'s open the lake country has no Jewish community yet');
  // The withdrawal needs a Cross to refuse: the card is gated on Ezana's.
  ok(!fireOpt(w, 'ev2_takkaze_refusers', 0),
    'the withdrawal card will not fire before Ezana strikes the Cross');
  ok(fireOpt(w, 'ev2_ezana_cross', 0), 'Ezana takes the Cross (340)');
  ok(fireOpt(w, 'ev2_takkaze_refusers', 0), 'and now the refusers withdraw (345)');
  ok(shareOf(tana, 'judaism') > 0.15 && shareOf(tana, 'judaism') < 0.4,
    'a quarter of Tana\'s people now keep the older covenant ('
    + Math.round(shareOf(tana, 'judaism') * 100) + '%)');
  ok((tana.pop || []).some((e) => e && e.r === 'judaism' && e.c === 'cushitic' && e.n > 0),
    'and they are real people on the cell, Agaw-speaking and counted');
  ok(hasMod(tana.modifiers, 'house_of_israel'),
    'the ambas carry "The House of Israel in the Mountains"');
  ok(!!w.game.flags.betaIsraelWithdrawn, 'the flag is set for anything downstream');
}

// ---------------------------------------------------------------------------
console.log('== a funded mission cannot take the ambas to the last household ==');
{
  // The ambient drift always had the clause ("a community has a core that
  // does not go"); the ACTIVE program's completion used to convert every
  // community wholesale — one 12-month mission emptied what the drift engine
  // promised three centuries could not. §209 makes the completion respect
  // the age's own resistedBy table, because the Beta Israel surviving
  // fifteen centuries of crowns pressing them IS the community's story —
  // and a Jewish Galilee under a Roman program was told the same lie.
  const w = world('132ce', 'ROM');
  ok(fireOpt(w, 'ev2_ezana_cross', 0) && fireOpt(w, 'ev2_takkaze_refusers', 0),
    'the Cross is struck and the refusers withdraw');
  const tana = w.ctx.prov('Tana');
  const before = shareOf(tana, 'judaism');
  tana.conversion = { by: tana.owner, monthsLeft: 1 };
  const dpm = DEFINES.DAYS_PER_MONTH || 30;
  for (let d = 0; d < dpm * 2 + 5; d++) {
    tickDay(w.ctx);
    while (w.game.pendingEvents.length) {
      const pe = w.game.pendingEvents[0];
      const ev = w.events.find((e) => e && e.id === pe.eventId);
      try { w.actions.chooseEventOption(pe.instanceId, (ev && ev.aiOption) || 0); }
      catch (e) { w.game.pendingEvents.shift(); }
    }
    w.game.paused = false;
  }
  ok(!tana.conversion, 'the program completes');
  ok(tana.religion === 'christianity', 'and the province label follows the new majority');
  const after = shareOf(tana, 'judaism');
  ok(after > 0.05 && after < before,
    'but the resisting community keeps its resistance\'s share ('
    + Math.round(before * 100) + '% -> ' + Math.round(after * 100) + '%)');
  ok(shareOf(tana, 'south_arabian') === 0,
    'while the unresisting majority converts entire — the mercy is §104\'s table, not a blanket');
}

// ---------------------------------------------------------------------------
console.log('== 384: the inscriptions change their god ==');
{
  const w = world('132ce', 'ROM');
  const hmy = w.game.tags.HMY;
  const axm = w.game.tags.AXM;
  ok(!!hmy && hmy.religion !== 'judaism', 'Himyar opens under the old gods');
  hmy.legitimacy = 50;
  const axmBefore = (axm.opinion && axm.opinion.HMY) || 0;
  ok(fireOpt(w, 'ev2_himyar_rahmanan', 0), 'the dedications turn to Rahmanan');
  ok(hmy.religion === 'judaism', 'the crown of Himyar now keeps the covenant');
  const zafar = w.ctx.prov('Zafar');
  ok(!!zafar && zafar.religion === 'judaism', 'Zafar\'s own cell converts with it');
  ok(hasMod(hmy.modifiers, 'rahmanan'), 'and carries "Rahmanan, Lord of Heaven"');
  ok(hmy.legitimacy === 55, 'the covenant steadies the crown (+5 legitimacy)');
  ok(((axm.opinion && axm.opinion.HMY) || 0) === Math.max(-200, axmBefore - 20),
    'the strait becomes a confessional border: Aksum cools 20');
  ok(!!w.game.flags.himyarJudaism, 'the flag is set');
  // The premise this card writes toward: the 529 chapter opens AFTER Kaleb's
  // answer — the Jewish kingdom fallen and the client court seated in its
  // place under the Aksumite yoke (§208), with the Najran of the martyrs
  // already Christian and Zafar itself still keeping the covenant the 384
  // card gave it. If any of that drifts, two chapters disagree about the
  // same century, and this is the suite that says so.
  const m529 = POLITICAL_MAPS['529ce'];
  ok(!!m529 && m529.owners.Zafar === 'HMY' && m529.owners.Marib === 'HMY',
    '529 opens with the client court seated at Zafar under the yoke (§208)');
  ok(m529.religions && m529.religions.Najran === 'christianity',
    'the Najran of the martyrs of 523 is Christian ground');
  ok(m529.religions.Zafar === 'judaism' && m529.religions.Marib === 'judaism',
    'and the Jewish kings\' own capital still keeps the covenant of 384');
  const m614 = POLITICAL_MAPS['614ce'];
  ok(!!m614 && m614.owners.Zafar === 'SAS',
    '614 keeps the sequel: Wahriz\'s conquest holds Zafar for the King of Kings');
}

// ---------------------------------------------------------------------------
console.log('== 133: the thirty-third day of the count ==');
{
  // The festival answer.
  const w = world('132ce', 'JUD');
  const jud = w.game.tags.JUD;
  jud.legitimacy = 50;
  ok(fireOpt(w, 'ev2_lag_baomer', 0), 'the card fires for the Nasi\'s court');
  ok(jud.legitimacy === 55, 'the fires are lit: +5 legitimacy');
  ok(hasMod(jud.modifiers, 'thirty_third_day'), 'and "The Thirty-Third Day" lifts morale');
}
{
  // The mourning answer.
  const w = world('132ce', 'JUD');
  const jud = w.game.tags.JUD;
  jud.stability = 0;
  ok(fireOpt(w, 'ev2_lag_baomer', 1), 'the stricter reading is a real answer too');
  ok(jud.stability === 1, 'the count kept in mourning steadies the house (+1 stability)');
  ok(hasMod(jud.modifiers, 'count_is_kept'), 'and "The Count Is Kept" strengthens the Law');
}

// ---------------------------------------------------------------------------
console.log('== 1972: the arrivals hall at Lod ==');
{
  const w = world('1948ce', 'ISR');
  const isr = w.game.tags.ISR;
  const before = isr.treasury;
  ok(fireOpt(w, 'ev_i_lod_airport', 0), 'the massacre card fires');
  ok(Math.round(before - isr.treasury) === 60, 'hardening every gate costs 60 talents');
  ok(hasMod(w.ctx.prov('Lydda').modifiers, 'the_hardened_gates'),
    'and Lydda carries "The Hardened Gates" from then on');
  ok(!!w.game.flags.airportDoctrine, 'the doctrine flag is set');
}
{
  const w = world('1948ce', 'ISR');
  const isr = w.game.tags.ISR;
  isr.legitimacy = 50;
  ok(fireOpt(w, 'ev_i_lod_airport', 1), 'the reprisal is the other answer');
  ok(isr.legitimacy === 45, 'and it lands wrong somewhere: −5 legitimacy');
  ok(hasMod(w.ctx.prov('Tyre').modifiers, 'the_answer_north'),
    'the camps in the north feel the answer');
}

// ---------------------------------------------------------------------------
console.log('== the Ethiopian arc: Derg, Moses, Solomon ==');
{
  const w = world('1948ce', 'JOR');
  const eth = w.game.tags.ETH;
  ok(!!eth && !!eth.ruler && String(eth.ruler.name).indexOf('Selassie') >= 0,
    'the chapter opens with the Elect of God on his throne');
  eth.legitimacy = 50;
  ok(fireOpt(w, 'ev_s48_derg', 0), 'the creeping coup reads its deposition order (1974)');
  ok(String(eth.ruler.name).indexOf('Mengistu') >= 0,
    'a committee with a firing range replaces him');
  ok(eth.legitimacy === 30 && hasMod(eth.modifiers, 'the_derg'),
    'the Solomonic legitimacy is gone (−20) and "The Derg" governs');
  ok(!!w.game.flags.dergTakesAddis, 'the flag is set');
  ok((eth.opinion && eth.opinion.SOV) === 60 && (eth.opinion && eth.opinion.USA) === -40,
    'the realignment is written both ways: Moscow 60, Washington −40');

  // Moses: real people land in Israel's towns, and Tana holds the rest.
  const towns = ['Lydda', 'Joppa', 'Jerusalem', 'Beersheba'];
  const sumTowns = () => towns.reduce((s, t) => s + popTotal(w.ctx.prov(t)), 0);
  const isr = w.game.tags.ISR;
  isr.legitimacy = 50;
  const popBefore = sumTowns();
  ok(fireOpt(w, 'ev_s48_operation_moses', 0), 'Operation Moses flies (1984)');
  const delta = sumTowns() - popBefore;
  ok(delta >= 7998 && delta <= 8002,
    'eight thousand of the Beta Israel land in the arrival towns (' + delta + ')');
  ok(towns.some((t) => (w.ctx.prov(t).pop || [])
    .some((e) => e && e.r === 'judaism' && e.c === 'cushitic' && e.n > 0)),
    'and they are counted as their own community, not dissolved on the gangway');
  ok(isr.legitimacy === 58, 'a state that flies Jews out of a famine: +8 legitimacy');
  const tana = w.ctx.prov('Tana');
  ok(hasMod(tana.modifiers, 'the_ones_left_behind'),
    'the leak cuts the operation in half: Tana carries "The Ones Left Behind"');

  // Solomon: the window closes from the inside.
  const mpBefore = isr.manpower;
  const popBefore2 = sumTowns();
  ok(fireOpt(w, 'ev_s48_operation_solomon', 0), 'Operation Solomon flies (1991)');
  const delta2 = sumTowns() - popBefore2;
  ok(delta2 >= 13998 && delta2 <= 14002,
    'fourteen thousand more in thirty-six hours (' + delta2 + ')');
  ok(Math.round(isr.manpower - mpBefore) === 500, 'and +500 reserves');
  ok(!hasMod(tana.modifiers, 'the_ones_left_behind'),
    '"The Ones Left Behind" lifts from Tana — there is no one left behind');
  ok(hasMod(isr.modifiers, 'absorption_of_the_highlands'),
    'the absorption strain rides the ordinary modifier stream');
  ok(!!w.game.flags.operationSolomon, 'the flag is set');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
