// Headless regression — SPEC §223: the chronicle's margins, and the one card
// in them. A Jew of Tingis proves something about numbers, stops losing
// wagers, and is flogged for it by a town that has decided what that must be.
//
// The section's claims, and this suite in order: the card is registered in
// every chapter and appended last, so every other card is offered its month in
// the order it always was; the gate is the TOWN and not the century, which is
// why 1948 (where the cell is Tangier) never deals it and why renaming that
// cell back opens it again; the window is the chapter's own first ten years,
// whichever century that is and whichever side of the year-zero line; a decade
// of monthly checks takes not one number out of the seeded stream and answers
// the same way twice; walked month by month through the real scheduler it
// arrives inside the window, once, and never after it; each of the four
// answers does exactly what its tooltip says; and the recorded course is the
// empty one, which is why the balance harness cannot see any of this.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { ERAS, GENERIC_EVENTS } = await import(R + '/js/data/compendium.js');
const { EVENTS_MARGINALIA, ikusWindow, IKUS_ODDS } = await import(R + '/js/data/events_marginalia.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { checkTriggeredEvents } = await import(R + '/js/sim/events.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const makeGeom = () => ({
  neighbors: Array.from({ length: N + 1 }, (_, i) => {
    const s = new Set();
    if (i > 1) s.add(i - 1);
    if (i >= 1 && i < N) s.add(i + 1);
    return s;
  }),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [],
});

const CARD = EVENTS_MARGINALIA.find((e) => e && e.id === 'ev_mg_ikus_of_tingis');
const eraOf = (id) => ERAS.find((e) => e.bookmark.id === id);
const firstPlayable = (bookmark) => {
  const row = (bookmark.playableTags || [])[0];
  return (row && (row.tag || row)) || bookmark.playerTag;
};

// A campaign of the given chapter, carrying ONLY this card, so the scheduler's
// monthly walk below is measuring the margins and nothing else.
function boot(eraId, events = EVENTS_MARGINALIA, seed = 223) {
  const era = eraOf(eraId);
  const geom = makeGeom();
  const bookmark = era.bookmark;
  const playerTag = firstPlayable(bookmark);
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events });
  return { game, ctx, bookmark, playerTag, actions: gameActions(ctx) };
}
// Where the chapter's clock is at a given offset in years and months.
function setAge(w, years, months = 0) {
  const s = w.bookmark.startDate;
  const t = (s.m - 1) + (years * 12) + months;
  w.game.date = { y: s.y + Math.floor(t / 12), m: (t % 12) + 1, d: 1 };
}

console.log('== the card is in the margins of every chapter ==');
{
  ok(!!CARD && CARD.options.length === 4 && CARD.aiOption === 3,
    'one card, four answers, and the recorded course is the fourth');
  ok(typeof CARD.trigger === 'function' && !CARD.date && CARD.once !== false,
    'triggered, undated, and once a campaign');
  ok(!Number.isFinite(CARD.minYear) && !Number.isFinite(CARD.maxYear),
    'and carries no era window of its own — the province is the window');
  ok(!Number.isFinite(CARD.chance) && IKUS_ODDS === 0.005,
    'and no `chance` either: the odds are in the trigger, where they cost the stream nothing');
  for (const era of ERAS) {
    const chain = era.events;
    ok(chain.indexOf(CARD) >= 0, era.bookmark.id + ': the margins are registered');
    ok(chain[chain.length - 1] === CARD,
      '  and appended last, so every other card is offered its month in the order it always was');
  }
  ok(GENERIC_EVENTS.indexOf(CARD) < 0,
    'it is NOT in the generic pool — that pool\'s 10/10/2 era banding is its own invariant');
}

console.log('== the gate is the town, not the century ==');
{
  const has = (w) => {
    for (let i = 1; i < w.game.provinces.length; i++) {
      const p = w.game.provinces[i];
      if (p && p.name === 'Tingis') return true;
    }
    return false;
  };
  for (const era of ERAS) {
    const w = boot(era.bookmark.id);
    const town = has(w);
    const wants = era.bookmark.id !== '1948ce';
    ok(town === wants, era.bookmark.id + ': the map ' + (town ? 'has' : 'has no') + ' Tingis');
    setAge(w, 0, 1);
    ok((ikusWindow(w.ctx) >= 0) === wants,
      '  and the card ' + (wants ? 'may' : 'may not') + ' be dealt');
  }
  // The control that makes the claim mean something: 1948 is shut because the
  // cell is called Tangier, not because it is 1948. Give the town its name
  // back and the same card, in the same chapter, opens.
  const m = boot('1948ce');
  const tangier = m.ctx.prov('Tingis'); // the canonical name still finds the cell (SPEC §24)
  ok(!!tangier && tangier.name === 'Tangier', '1948 knows the cell as Tangier');
  setAge(m, 0, 1);
  ok(ikusWindow(m.ctx) < 0, '  and is shut while it does');
  tangier.name = 'Tingis';
  ok(ikusWindow(m.ctx) === 1, '  and opens the moment the map says Tingis again');
}

console.log('== the window is the chapter\'s own first ten years ==');
{
  // Both sides of the year-zero line, because the chapters live on both.
  for (const [eraId, label] of [['66ce', '66 CE'], ['167bce', '167 BCE']]) {
    const w = boot(eraId);
    setAge(w, 0, 0);
    ok(ikusWindow(w.ctx) === 0, label + ': open in the opening month');
    setAge(w, 9, 11);
    ok(ikusWindow(w.ctx) === 119, '  still open one month short of ten years');
    setAge(w, 10, 0);
    ok(ikusWindow(w.ctx) === -1, '  shut on the tenth anniversary to the month');
    setAge(w, 40, 0);
    ok(ikusWindow(w.ctx) === -1, '  and stays shut for the rest of the campaign');
  }
}

console.log('== the draw costs the campaign nothing ==');
{
  // The whole reason the odds are in the trigger instead of `ev.chance`: a
  // decade of monthly checks must leave the seeded stream exactly where it
  // found it, or the balance harness comes back with a different world.
  const w = boot('66ce');
  const before = w.game.rngState;
  let dealt = 0;
  for (let k = 0; k < 120; k++) {
    setAge(w, 0, k);
    if (CARD.trigger(w.ctx)) dealt++;
  }
  ok(w.game.rngState === before,
    'a hundred and twenty monthly checks and the stream has not moved a number');
  ok(dealt > 0, '  and the card is still dealt (' + dealt + ' of 120 months answer yes)');
  // Deterministic: the same state and the same month always answer the same,
  // which is what a save, a replay and a multiplayer relay all depend on.
  const again = boot('66ce');
  let same = true;
  for (let k = 0; k < 120; k++) {
    setAge(w, 0, k); setAge(again, 0, k);
    if (CARD.trigger(w.ctx) !== CARD.trigger(again.ctx)) same = false;
  }
  ok(same, '  and answers the same way twice, month for month');
}

console.log('== walked through the real scheduler, it arrives inside the decade ==');
{
  // Twenty seeded campaigns of 66 CE, twenty years each, answering nothing:
  // every arrival must fall inside the first 120 months, some campaigns must
  // see it, and not every campaign may.
  const months = [];
  for (let seed = 1; seed <= 20; seed++) {
    const w = boot('66ce', EVENTS_MARGINALIA, seed);
    let at = -1;
    for (let k = 0; k < 240; k++) {
      setAge(w, 0, k);
      checkTriggeredEvents(w.ctx);
      if (w.game.pendingEvents.length) {
        if (at < 0) at = k;
        // Answer it the way the harness does and keep walking, so a second
        // arrival would be caught rather than hidden behind the first.
        for (const pe of w.game.pendingEvents.slice()) {
          w.actions.chooseEventOption(pe.instanceId, CARD.aiOption);
        }
      }
    }
    ok((w.game.firedEvents[CARD.id] === true) === (at >= 0),
      'seed ' + seed + ': ' + (at >= 0 ? 'dealt in month ' + at : 'never dealt')
      + ', and the ledger agrees');
    if (at >= 0) months.push(at);
  }
  ok(months.length > 0 && months.length < 20,
    months.length + ' of 20 campaigns are dealt it — found often enough, never guaranteed');
  ok(months.every((k) => k >= 0 && k < 120),
    'and every arrival falls inside the first ten years (latest: month ' + Math.max(...months) + ')');
}

console.log('== the four answers do what they say ==');
{
  const deal = (idx) => {
    const w = boot('66ce');
    setAge(w, 1, 0);
    const t = w.game.tags[w.playerTag];
    t.treasury = 500; t.points.gov = 0; t.legitimacy = 50;
    // The chapter seats modifiers of its own on the crown, so what is measured
    // is the DELTA rather than an empty list.
    const before = {
      treasury: t.treasury, gov: t.points.gov, legitimacy: t.legitimacy,
      mods: (t.modifiers || []).length, note: (w.game.chronicle || []).length,
    };
    CARD.options[idx].effects(w.ctx);
    return { w, t, before };
  };

  const a = deal(0);
  ok(a.t.treasury === a.before.treasury - 40, 'send for the man: 40 talents for passage and fine');
  const mod = (a.t.modifiers || []).find((m) => m.id === 'ikus_of_tingis');
  ok(!!mod && mod.months === 96 && mod.effects.incomeMult === 1.05,
    '  and Ikus sits with the assessors: +5% income for eight years');

  const b = deal(1);
  ok(b.t.points.gov === b.before.gov + 15 && b.t.treasury === b.before.treasury,
    'send for the theorem: 15 governance points and not a talent spent');
  ok(!(b.t.modifiers || []).some((m) => m.id === 'ikus_of_tingis'),
    '  and the man himself is left where he was found');

  const c = deal(2);
  ok(c.t.treasury === c.before.treasury - 25 && c.t.legitimacy === c.before.legitimacy + 5,
    'a letter under our seal: 25 talents for his back, +5 legitimacy');

  const d = deal(3);
  ok(d.t.treasury === d.before.treasury && d.t.points.gov === d.before.gov
    && d.t.legitimacy === d.before.legitimacy
    && (d.t.modifiers || []).length === d.before.mods,
    'and the recorded course moves nothing at all — which is why the harness cannot see it');

  ok(a.w.game.chronicle.some((e) => /Ikus of Tingis/.test(e.text))
    && (d.w.game.chronicle || []).length === d.before.note,
    'the three answers that do something are written down; the one that does nothing is not');
}

console.log('== once a campaign ==');
{
  // A seed the walk above showed IS dealt the card (month 53), run twenty
  // years past its arrival and answered every time: it must arrive once.
  const w = boot('66ce', EVENTS_MARGINALIA, 1);
  const t = w.game.tags[w.playerTag];
  t.treasury = 500;
  let arrivals = 0;
  for (let k = 0; k < 240; k++) {
    setAge(w, 0, k);
    checkTriggeredEvents(w.ctx);
    // Answered through the real action, which takes the card off the queue
    // itself — hence the copy rather than a splice.
    for (const pe of w.game.pendingEvents.slice()) {
      arrivals++;
      w.actions.chooseEventOption(pe.instanceId, 0); // send for the man
    }
  }
  ok(arrivals === 1, 'twenty years of monthly checks deal it exactly once');
  ok(t.treasury === 460, '  and one passage from Tingis is paid for, once');
  ok((t.modifiers || []).filter((m) => m.id === 'ikus_of_tingis').length === 1,
    '  and there is exactly one Ikus at court');
}

console.log(failures ? '\n' + failures + ' FAIL' : '\nALL PASS');
process.exit(failures ? 1 : 0);
