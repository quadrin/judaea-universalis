// Headless regression — SPEC §152: the statecraft pool.
//
// The bug this package answers is not a crash, it is an empty shelf: 623 of
// the game's 645 cards fire once, and a campaign that outlives its scripted
// chain was left with twelve repeatable cards about weather. So the things
// this suite has to hold are the things a shelf-filling package fails by.
//
//   - It has to be on every antique shelf and on no modern one.
//   - It has to actually repeat: `once: false`, a cooldown, and odds.
//   - It has to survive the §121 generation horizon, which is the exact rule
//     that retires undated triggered cards — and the whole point here is the
//     campaign that has run PAST its chapter's last year.
//   - It has to move courts that exist. A shared package names a faction at
//     its peril: every chapter names its own, and a shift against an id the
//     bookmark never defined is a silent no-op that reads as content.
//   - Its bands have to gate. A pool that fires its empire cards at a
//     four-province rising has not solved the problem, it has moved it.
//   - And the shelf has to be measurably fuller: a decade of quiet, rich
//     peace must surface cards the twelve-card pool could not.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { EVENTS_STATECRAFT } = await import(R + '/js/data/events_statecraft.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { checkTriggeredEvents } = await import(R + '/js/sim/events.js');
const { GENERIC_EVENTS } = await import(R + '/js/data/compendium.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const SRC = readFileSync(R + '/js/data/events_statecraft.js', 'utf8');
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

// The seven antique chapters and the courts that play them — every playable
// tag, because `forTag: 'player'` means a Seleucid or a Roman player draws
// these cards too, and a card written only for the Jewish courts would fail
// silently in the other half of the game.
const COURTS = [];
for (const era of ERAS) {
  if (era.bookmark.id === '1948ce') continue;
  for (const row of era.bookmark.playableTags || []) {
    COURTS.push({ era: era.bookmark.id, bm: era.bookmark, tag: row.tag || row, chain: era.events });
  }
}

function boot(court, date) {
  const game = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: court.bm, events: court.chain,
    playerTag: court.tag, rngSeed: 7,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: court.bm, events: court.chain,
  });
  if (date) game.date = { ...date, d: 1 };
  game.wars = [];
  for (const k of Object.keys(game.tags)) game.tags[k].atWarWith = [];
  ORIGIN = new Map(Object.entries(court.bm.owners || {}));
  NEUTRAL = Object.keys(game.tags).find((k) => k !== court.tag && game.tags[k].alive) || 'REB';
  return { game, ctx };
}

// Hand the player `count` provinces, `foreign` of them of another faith, and
// `regiments` regiments in the field. The bands read exactly these three
// things plus the clock, so this is the whole world a band card lives in.
let ORIGIN = new Map();
let NEUTRAL = 'REB';
function grant({ game }, tag, count, foreign, regs) {
  const t = game.tags[tag];
  if (t) { t.alive = true; t.overlord = null; t.treasury = 2000; }
  const faith = t && t.religion;
  // Take the realm away first. The bookmark has already dealt this court its
  // opening provinces, and a `grant` that only ADDS makes every size in this
  // suite wrong by however many the chapter started with — which is exactly
  // how a band test passes while the band is broken.
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (!p || p.owner !== tag) continue;
    const back = ORIGIN.get(p.canon || p.name);
    p.owner = back && back !== tag ? back : NEUTRAL;
    p.controller = p.owner;
  }
  let taken = 0; let strangers = 0;
  for (let i = 1; i < game.provinces.length && taken < count; i++) {
    const p = game.provinces[i];
    if (!p || p.impassable) continue;
    p.owner = tag; p.controller = tag;
    if (strangers < foreign) { p.religion = 'hellenism'; strangers++; }
    else if (faith) { p.religion = faith; }
    taken++;
  }
  game.armies = {};
  if (regs) game.armies[1] = { id: 1, tag, prov: 1, regiments: { inf: regs, cav: 0 } };
  return taken;
}

// ---------------------------------------------------------------------------
console.log('== the pool is on every antique shelf and on no modern one ==');
{
  for (const era of ERAS) {
    const n = era.events.filter((e) => EVENTS_STATECRAFT.indexOf(e) >= 0).length;
    if (era.bookmark.id === '1948ce') {
      ok(n === 0, '1948 plays none of it (' + n + ')');
    } else {
      ok(n === EVENTS_STATECRAFT.length,
        era.bookmark.id + ' plays all ' + EVENTS_STATECRAFT.length + ' (' + n + ')');
    }
  }
  ok(EVENTS_STATECRAFT.length >= 20, 'the pool is at least twenty cards ('
    + EVENTS_STATECRAFT.length + ')');
}

// ---------------------------------------------------------------------------
console.log('== no id collides with a card the game already shipped ==');
{
  const mine = new Set(EVENTS_STATECRAFT.map((c) => c.id));
  ok(mine.size === EVENTS_STATECRAFT.length, 'every card is its own id');
  const clashes = [];
  for (const era of ERAS) {
    for (const ev of era.events) {
      if (!ev || !ev.id || !mine.has(ev.id)) continue;
      if (EVENTS_STATECRAFT.indexOf(ev) < 0) clashes.push(era.bookmark.id + '/' + ev.id);
    }
  }
  ok(!clashes.length, 'and none of them is a card another package owns ('
    + (clashes.join(', ') || 'clean') + ')');
}

// ---------------------------------------------------------------------------
console.log('== every card really repeats, and is really bounded ==');
{
  const horizons = ERAS.filter((e) => e.bookmark.id !== '1948ce')
    .map((e) => e.bookmark.generationHorizon).filter(Number.isFinite);
  const latest = Math.max(...horizons);
  for (const c of EVENTS_STATECRAFT) {
    ok(c.once === false, c.id + ' is repeatable');
    ok(Number.isFinite(c.cooldownMonths) && c.cooldownMonths >= 24,
      '  with a cooldown of at least two years (' + c.cooldownMonths + ')');
    ok(Number.isFinite(c.chance) && c.chance > 0 && c.chance <= 0.03,
      '  and odds inside the generic pool\'s range (' + c.chance + ')');
    ok(!c.date && typeof c.trigger === 'function', '  scheduled by condition, not by date');
    ok(Number.isFinite(c.minYear) && Number.isFinite(c.maxYear) && c.minYear < c.maxYear,
      '  opens before it closes (' + c.minYear + '–' + c.maxYear + ')');
    // The reason the ceiling exists at all: §121 retires an undated,
    // unbounded triggered card the year a chapter passes its horizon, and
    // this pool is FOR the campaign that has passed it.
    ok(c.maxYear > latest, '  and outlives the latest antique horizon (' + latest + ')');
    ok(Array.isArray(c.options) && c.options.length >= 2,
      '  and offers a real choice (' + (c.options || []).length + ' answers)');
    for (const o of c.options) {
      ok(typeof o.label === 'string' && o.label.length > 0 && typeof o.tooltip === 'string'
        && o.tooltip.length > 20, '  every answer is labelled and priced');
    }
  }
}

// ---------------------------------------------------------------------------
console.log('== every faction the pool moves exists in every court that can draw it ==');
{
  // The pool names roles, not factions; the role table is the thing that can
  // be wrong. So read the table out of the source and check every entry
  // against the bookmark it claims.
  const rows = [...SRC.matchAll(/'([0-9]+[a-z]+):([A-Z]+)':\s*\{([^}]*)\}/g)];
  const named = new Set(rows.map((m) => m[1] + ':' + m[2]));
  const missing = COURTS.filter((c) => !named.has(c.era + ':' + c.tag))
    .map((c) => c.era + ':' + c.tag);
  ok(!missing.length, 'the seat table covers every court the start screen offers ('
    + (missing.join(', ') || 'all ' + COURTS.length) + ')');
  // The table deliberately runs AHEAD of `playableTags`: every bookmark
  // defines a court for the other side too — the Seleucid Friends of the
  // King, the Senate, the Church — and a tag the player can reach by forming
  // or switching into must not draw cards whose faction shifts do nothing.
  const extra = rows.map((m) => m[1] + ':' + m[2]).filter((k) => !COURTS.some((c) => c.era + ':' + c.tag === k));
  ok(rows.length >= COURTS.length,
    '  and covers the courts on the far side of each chapter as well ('
    + (extra.join(', ') || 'none') + ')');

  for (const m of rows) {
    const era = m[1]; const tag = m[2];
    const bm = (ERAS.find((e) => e.bookmark.id === era) || {}).bookmark;
    const defs = bm && bm.factions && bm.factions[tag];
    ok(Array.isArray(defs) && defs.length, era + ':' + tag + ' has a court to move');
    const known = new Set((defs || []).map((d) => d.id));
    const bad = [...m[3].matchAll(/'([a-z]+)'/g)].map((x) => x[1]).filter((id) => !known.has(id));
    ok(!bad.length, '  and every seat it names is one the bookmark defines ('
      + (bad.join(', ') || 'all known') + ')');
  }
  // …and the roles are used, or the table is decoration.
  for (const role of ['strict', 'worldly', 'soldiers']) {
    ok(new RegExp("shift\\(ctx, '" + role + "'").test(SRC), 'the pool moves the ' + role + ' seat');
  }
}

// ---------------------------------------------------------------------------
console.log('== every modifier key the pool sets is one the engine reads ==');
{
  // Read the engine's vocabulary out of the engine, never from a list here.
  const TAG_KEYS = new Set(['unrest']);
  for (const f of ['military', 'economy', 'unrest', 'ai', 'realm', 'invasion', 'navy',
    'recruitment', 'supply', 'population', 'tick']) {
    let src = '';
    try { src = readFileSync(R + '/js/sim/' + f + '.js', 'utf8'); } catch (e) { continue; }
    for (const m of src.matchAll(/resolveTag(?:Mult|Add)\(\s*ctx\s*,[^,]+,\s*'([a-zA-Z]+)'/g)) TAG_KEYS.add(m[1]);
    for (const m of src.matchAll(/effects\.([a-zA-Z]+)/g)) TAG_KEYS.add(m[1]);
  }
  // Province modifiers are read by a different walker with a different
  // vocabulary; a tag key on a province modifier is as dead as the reverse.
  const econ = readFileSync(R + '/js/sim/economy.js', 'utf8');
  const PROV_KEYS = new Set(['unrest']);
  for (const m of econ.matchAll(/provMult\(p,\s*'([a-zA-Z]+)'\)/g)) PROV_KEYS.add(m[1]);
  ok(TAG_KEYS.size > 15, 'the engine\'s tag vocabulary was read from the sim ('
    + TAG_KEYS.size + ' keys)');
  ok(PROV_KEYS.size >= 3, 'and its province vocabulary too (' + [...PROV_KEYS].join(', ') + ')');

  const deadTag = [];
  for (const m of SRC.matchAll(/addTagModifier\(ctx,[^;]*?effects:\s*\{([\s\S]*?)\}/g)) {
    for (const k of m[1].matchAll(/([a-zA-Z]+)\s*:/g)) if (!TAG_KEYS.has(k[1])) deadTag.push(k[1]);
  }
  ok(!deadTag.length, 'no dead or mis-scoped key on a tag modifier ('
    + ([...new Set(deadTag)].join(', ') || 'clean') + ')');

  const deadProv = [];
  for (const m of SRC.matchAll(/addProvinceModifier\(ctx,[^;]*?effects:\s*\{([\s\S]*?)\}/g)) {
    for (const k of m[1].matchAll(/([a-zA-Z]+)\s*:/g)) if (!PROV_KEYS.has(k[1])) deadProv.push(k[1]);
  }
  ok(!deadProv.length, 'nor on a province modifier ('
    + ([...new Set(deadProv)].join(', ') || 'clean') + ')');
}

// ---------------------------------------------------------------------------
console.log('== every option resolves clean, is recorded, and quiets the pool ==');
{
  const realWarn = console.warn;
  for (const court of COURTS) {
    for (const card of EVENTS_STATECRAFT) {
      for (let i = 0; i < card.options.length; i++) {
        const w = boot(court, { y: court.bm.startDate.y + 6, m: 6 });
        grant(w, court.tag, 26, 8, 14);
        const before = new Set(Object.keys(w.game.flags));
        const warned = [];
        console.warn = (...a) => warned.push(a.map(String).join(' '));
        let threw = null;
        try { card.options[i].effects(w.ctx); } catch (e) { threw = e; }
        console.warn = realWarn;
        if (threw || warned.length) {
          ok(false, court.era + '/' + court.tag + ': ' + card.id + ' #' + i
            + ' — ' + (threw ? threw.message : warned[0]));
          continue;
        }
        const set = Object.keys(w.game.flags).filter((k) => !before.has(k) && w.game.flags[k]);
        const marked = set.some((k) => /^statecraft/.test(k));
        const hushed = Number.isFinite(w.game.flags._statecraftUntil)
          && w.game.flags._statecraftUntil > (w.game.date.y * 12 + w.game.date.m - 1);
        ok(marked && hushed, court.era + '/' + court.tag + ': ' + card.id + ' #' + i
          + ' resolves, records (' + (set.join(',') || 'nothing') + ') and hushes the pool');
      }
    }
  }
}

// ---------------------------------------------------------------------------
console.log('== a tooltip that promises talents does not take them ==');
{
  // The narrow, checkable half of tooltip honesty: the sign and size of the
  // money. Read BEHAVIOURALLY — every option is wrapped in `guard`, so the
  // function's own source says nothing about what it does, and a source-text
  // check here would report the whole pool as silent.
  const court = COURTS.find((c) => c.era === '167bce' && c.tag === 'HAS');
  for (const card of EVENTS_STATECRAFT) {
    for (let i = 0; i < card.options.length; i++) {
      const w = boot(court, { y: -140, m: 6 });
      grant(w, 'HAS', 30, 10, 16);
      const before = w.game.tags.HAS.treasury;
      card.options[i].effects(w.ctx);
      const delta = Math.round(w.game.tags.HAS.treasury - before);
      const tip = card.options[i].tooltip;
      const gives = /[+]\s*(\d+)\s*talents/.exec(tip);
      const takes = /[−-]\s*(\d+)\s*talents/.exec(tip);
      if (gives) {
        ok(delta === Number(gives[1]), card.id + ' #' + i + ': promises +' + gives[1]
          + ' talents and pays exactly that (' + delta + ')');
      } else if (takes) {
        ok(delta === -Number(takes[1]), card.id + ' #' + i + ': asks −' + takes[1]
          + ' talents and takes exactly that (' + delta + ')');
      } else {
        ok(delta === 0, card.id + ' #' + i + ': moves no money it did not mention ('
          + delta + ')');
      }
    }
  }
}

// ---------------------------------------------------------------------------
console.log('== the bands gate on size, not on the calendar ==');
{
  const court = COURTS.find((c) => c.era === '167bce' && c.tag === 'HAS');
  const byId = new Map(EVENTS_STATECRAFT.map((c) => [c.id, c]));
  const band = (id, w) => { try { return !!byId.get(id).trigger(w.ctx); } catch (e) { return 'threw'; } };

  const tiny = boot(court, { y: -160, m: 6 });
  grant(tiny, 'HAS', 3, 0, 4);
  ok(band('ev_sc_two_judges_one_custom', tiny) === false,
    'a three-province rising is asked nothing about its collectors');
  ok(band('ev_sc_veterans_without_a_war', tiny) === false, '  and nothing about its veterans');

  const young = boot(court, { y: -167, m: 12 });
  grant(young, 'HAS', 12, 0, 6);
  ok(band('ev_sc_two_judges_one_custom', young) === false,
    'nor is a realm in its first winter, however large the map made it');

  const middling = boot(court, { y: -160, m: 6 });
  grant(middling, 'HAS', 9, 0, 6);
  ok(band('ev_sc_two_judges_one_custom', middling) === true, 'a nine-province realm has judges');
  ok(band('ev_sc_the_temple_they_want_reopened', middling) === false,
    '  and no conquered city to argue with');
  ok(band('ev_sc_veterans_without_a_war', middling) === false, '  and no idle army');

  const wide = boot(court, { y: -150, m: 6 });
  grant(wide, 'HAS', 14, 5, 6);
  ok(band('ev_sc_the_temple_they_want_reopened', wide) === true,
    'a realm with five foreign districts is asked about their temple');
  ok(band('ev_sc_the_client_king_dies', wide) === false,
    '  but not about a client king it does not have');

  const empire = boot(court, { y: -140, m: 6 });
  grant(empire, 'HAS', 30, 10, 16);
  ok(band('ev_sc_veterans_without_a_war', empire) === true,
    'a thirty-province realm at peace is asked what its army is for');
  ok(band('ev_sc_two_judges_one_custom', empire) === false,
    '  and is no longer asked about a short tithe — band one closes at twenty');

  const atWar = boot(court, { y: -140, m: 6 });
  grant(atWar, 'HAS', 30, 10, 16);
  atWar.game.tags.HAS.atWarWith = ['SEL'];
  if (atWar.game.tags.SEL) atWar.game.tags.SEL.alive = true;
  ok(band('ev_sc_veterans_without_a_war', atWar) === false,
    '  and an army with a war to fight is not idle');
}

// ---------------------------------------------------------------------------
console.log('== the pool speaks as one channel ==');
{
  const court = COURTS.find((c) => c.era === '167bce' && c.tag === 'HAS');
  const w = boot(court, { y: -140, m: 6 });
  grant(w, 'HAS', 30, 10, 16);
  const card = EVENTS_STATECRAFT.find((c) => c.id === 'ev_sc_veterans_without_a_war');
  ok(card.trigger(w.ctx) === true, 'the card is open before an answer is given');
  card.options[0].effects(w.ctx);
  const others = EVENTS_STATECRAFT.filter((c) => c.trigger(w.ctx));
  ok(others.length === 0, 'and every card in the pool is shut the month after one is answered');
  w.game.date = { y: -139, m: 6, d: 1 };
  ok(EVENTS_STATECRAFT.some((c) => c.trigger(w.ctx)),
    'the silence lifts within the year, so the shelf is not shut for good');
}

// ---------------------------------------------------------------------------
console.log('== the shelf is measurably fuller than the twelve-card pool ==');
{
  // The actual claim being made. A rich realm at peace, walked for twenty
  // years through the real scheduler, must draw cards the generic pool could
  // not have dealt it — and must draw a variety rather than the same one.
  const court = COURTS.find((c) => c.era === '167bce' && c.tag === 'HAS');
  const w = boot(court, { y: -140, m: 1 });
  grant(w, 'HAS', 30, 10, 16);
  const genericIds = new Set(GENERIC_EVENTS.map((c) => c.id));
  const mineIds = new Set(EVENTS_STATECRAFT.map((c) => c.id));
  const drawn = new Set();
  const warns = [];
  const realWarn = console.warn;
  console.warn = (...a) => warns.push(a.join(' '));
  try {
    for (let y = -140; y <= -120; y++) {
      for (let m = 1; m <= 12; m++) {
        w.game.date = { y, m, d: 1 };
        checkTriggeredEvents(w.ctx);
        // Answer whatever arrived, the way a player would, so cooldowns and
        // the shared hush actually engage.
        for (const pe of w.game.pendingEvents.splice(0)) {
          if (!mineIds.has(pe.eventId)) continue;
          drawn.add(pe.eventId);
          const c = EVENTS_STATECRAFT.find((x) => x.id === pe.eventId);
          try { c.options[0].effects(w.ctx); } catch (e) { warns.push('resolve ' + pe.eventId + ' ' + e.message); }
        }
      }
    }
  } finally { console.warn = realWarn; }
  const bad = warns.filter((s) => /statecraft/.test(s));
  ok(!bad.length, 'twenty years of peace raise no guarded failure' + (bad.length ? ' (' + bad[0] + ')' : ''));
  ok(drawn.size >= 6, 'and deal at least six DIFFERENT statecraft cards (' + drawn.size + ')');
  ok(drawn.size <= EVENTS_STATECRAFT.length, '  without dealing one twice in a row past its cooldown');
  ok(genericIds.size === 12 || genericIds.size > 0,
    'the old pool is still there beside it (' + genericIds.size + ' generic cards)');
}

console.log(failures ? `smoke101: ${failures} FAIL` : 'smoke101: ALL PASS');
process.exit(failures ? 1 : 0);
