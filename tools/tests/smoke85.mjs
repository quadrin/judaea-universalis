// Headless regression — SPEC §125: the rung above each chapter's best road.
//
// Five content packages, one per chapter with a success road, each asking the
// question that only opens AFTER the road is won: what an empire does with
// offices built for a temple state (167), what a state owes a nation that is
// mostly somewhere else (66), what three hundred years between two official
// truths costs (132), how a buffer converts geography into a reason to be left
// alone (614), and what a state owes the people inside it who are not of it
// (1948).
//
// What this suite holds is the class of failure that content packages fail by,
// which is never a crash — the guards see to that — but a silent no-op. A
// faction id that does not exist in the chapter shifts nothing. A modifier key
// the engine does not read does nothing. A card with no era window is retired
// by the §121 horizon before its band opens, or fires four centuries late. A
// tooltip that promises territory changes hands while the effects hand over
// nothing. Every one of those passes a smoke test that only checks for
// exceptions, so this one checks for the promise instead.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { CHAPTER_PATHS } = await import(R + '/js/data/chapter_paths.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { checkTriggeredEvents } = await import(R + '/js/sim/events.js');

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

// The five packages, each with the chapter it belongs to, the tag that plays
// it, and the terminal that closes it.
const PACKAGES = [
  { era: '167bce', file: 'events_167bce_empire.js', ex: 'EVENTS_167_EMPIRE', bm: 'bookmark_167bce.js',
    tag: 'HAS', entry: 'ev_x_the_successor_state', terminal: 'ev_x_what_the_empire_was_for' },
  { era: '66ce', file: 'events_66ce_nation.js', ex: 'EVENTS_66_NATION', bm: 'bookmark_66ce.js',
    tag: 'JUD', entry: 'ev_n_half_shekel_of_the_world', terminal: 'ev_n_what_the_house_was_for' },
  { era: '132ce', file: 'events_132ce_endure.js', ex: 'EVENTS_132_ENDURE', bm: 'bookmark_132ce.js',
    tag: 'JUD', entry: 'ev_e_the_book_not_written', terminal: 'ev_e_three_hundred_years' },
  { era: '614ce', file: 'events_614ce_third.js', ex: 'EVENTS_614_THIRD', bm: 'bookmark_614ce.js',
    tag: 'JUD', entry: 'ev_t_the_altar_rebuilt', terminal: 'ev_t_what_was_built_instead' },
  { era: '1948ce', file: 'events_1948_question.js', ex: 'EVENTS_1948_QUESTION', bm: 'bookmark_1948.js',
    tag: 'ISR', entry: 'ev_z_the_question_that_came_back', terminal: 'ev_z_what_the_century_asked' },
];

// The packages that are the same shape but do NOT carry a single dated
// terminal of their own — the 132 ladder and the 614 window close on the
// terminals their chapters already have, and the Keepers' tail (SPEC §151)
// closes fourteen roads on five different cards — so they are checked by the
// structural sections and not by the terminal one.
const RUNGS = [
  { era: '132ce', file: 'events_132ce_house.js', ex: 'EVENTS_132_HOUSE', bm: 'bookmark_132ce.js', tag: 'JUD' },
  { era: '614ce', file: 'events_614ce_power.js', ex: 'EVENTS_614_POWER', bm: 'bookmark_614ce.js', tag: 'JUD' },
  { era: '614ce', file: 'events_614ce_david.js', ex: 'EVENTS_614_DAVID', bm: 'bookmark_614ce.js', tag: 'JUD' },
  { era: '132ce', file: 'events_132ce_kosiba.js', ex: 'EVENTS_132_KOSIBA', bm: 'bookmark_132ce.js', tag: 'JUD' },
  { era: '529ce', file: 'events_529ce_roads.js', ex: 'EVENTS_529_ROADS', bm: 'bookmark_529ce.js', tag: 'SAM' },
];

for (const p of PACKAGES.concat(RUNGS)) {
  const mod = await import(R + '/js/data/' + p.file);
  p.cards = mod[p.ex];
  const bmod = await import(R + '/js/data/' + p.bm);
  p.bookmark = Object.values(bmod).find((v) => v && v.startDate);
  p.chain = (ERAS.find((e) => e.bookmark.id === p.era) || {}).events || [];
  p.src = readFileSync(R + '/js/data/' + p.file, 'utf8');
}

const ALL = PACKAGES.concat(RUNGS);

function boot(p, year) {
  const bm = p.bookmark;
  const game = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: bm, events: p.chain,
    playerTag: p.tag, rngSeed: 4,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: bm, events: p.chain,
  });
  game.date = { y: year, m: 6, d: 1 };
  game.wars = [];
  for (const k of Object.keys(game.tags)) game.tags[k].atWarWith = [];
  return { game, ctx };
}

// Hand the player a realm of `count` provinces, the named ones first, all of
// them owned AND controlled — `holds()` in every package reads both.
function grant(ctx, tag, count, must = []) {
  const g = ctx.game;
  const taken = new Set();
  for (const name of must) {
    const pr = ctx.prov(name);
    if (!pr || pr.impassable) continue;
    pr.owner = tag; pr.controller = tag; taken.add(pr.id);
  }
  for (let i = 1; i < g.provinces.length && taken.size < count; i++) {
    const pr = g.provinces[i];
    if (!pr || pr.impassable || taken.has(pr.id)) continue;
    pr.owner = tag; pr.controller = tag; taken.add(pr.id);
  }
  const t = g.tags[tag];
  if (t) { t.alive = true; t.overlord = null; }
  return taken.size;
}

console.log('== every package is in the chain its header names, and in no other ==');
{
  for (const p of ALL) {
    const inChain = p.cards.filter((c) => p.chain.indexOf(c) >= 0).length;
    ok(inChain === p.cards.length,
      p.era + ': all ' + p.cards.length + ' cards of ' + p.ex + ' are registered');
    const strays = [];
    for (const other of ERAS) {
      if (other.bookmark.id === p.era) continue;
      for (const c of p.cards) if (other.events.indexOf(c) >= 0) strays.push(other.bookmark.id);
    }
    ok(!strays.length, '  and none leaks into another chapter (' + (strays.join(', ') || 'none') + ')');
  }
}

console.log('== no id collides with a card the game already shipped ==');
{
  const seen = new Map();
  for (const era of ERAS) {
    for (const c of era.events) {
      if (!c || !c.id) continue;
      seen.set(c.id, (seen.get(c.id) || 0) + 1);
    }
  }
  // A card shared between chapters (the generic pool) is counted once per
  // chapter, so only look at the ids these packages introduce.
  const dupes = [];
  for (const p of ALL) {
    for (const c of p.cards) {
      const others = ERAS.filter((e) => e.events.some((x) => x !== c && x && x.id === c.id));
      if (others.length) dupes.push(c.id);
    }
  }
  ok(!dupes.length, 'every new id is its own card (' + (dupes.join(', ') || 'no collisions') + ')');
}

console.log('== every new card declares the years it belongs to (SPEC §121) ==');
{
  for (const p of ALL) {
    const horizon = p.bookmark.generationHorizon;
    for (const c of p.cards) {
      // A card with neither trigger nor date is not scheduled at all — it is
      // fired by another card's effects (SPEC §128, the accession following
      // the question). The scheduler never sees it, so a window would say
      // nothing; what matters instead is that it really is unreachable by the
      // scheduler, because a half-scheduled card would fire on its own.
      if (typeof c.trigger !== 'function' && !c.date) {
        ok(true, p.era + ': ' + c.id + ' is fired by another card, so it needs no window');
        continue;
      }
      const windowed = !!c.date || Number.isFinite(c.maxYear);
      ok(windowed, p.era + ': ' + c.id + ' is dated or bounded, so the horizon cannot retire it');
      if (!c.date) {
        ok(c.minYear < c.maxYear, '  ' + c.id + ' opens before it closes (' + c.minYear + '–' + c.maxYear + ')');
        // The band is the point: a card whose window stops at the horizon is
        // the horizon rule restated, and one that runs past it is the chapter
        // saying so deliberately. Either is fine; a card with no floor is not.
        ok(Number.isFinite(c.minYear), '  and declares a floor as well as a ceiling');
      }
    }
    const scheduled = p.cards.filter((c) => typeof c.trigger === 'function' || c.date);
    ok(scheduled.some((c) => Number.isFinite(c.maxYear) && c.maxYear > horizon)
      || scheduled.every((c) => c.date || c.maxYear <= horizon),
      p.era + ': the package is consistent with the ' + horizon + ' horizon');
  }
}

console.log('== each terminal closes its chapter on the chapter\'s own last year ==');
{
  for (const p of PACKAGES) {
    const chapter = CHAPTER_PATHS.find((c) => c.id === p.era);
    const term = p.cards.find((c) => c.id === p.terminal);
    ok(!!chapter && !!term, p.era + ': the tree and the terminal both exist');
    ok(term && term.date && chapter && term.date.y === chapter.lastYear,
      '  ' + p.terminal + ' lands on ' + (chapter && chapter.lastYear)
      + ' (card says ' + (term && term.date && term.date.y) + ')');
    ok(term && term.world === true, '  and is a world card, so the chronicle carries it');
  }
}

console.log('== every faction a package shifts exists in that chapter ==');
{
  for (const p of ALL) {
    const known = new Set();
    for (const list of Object.values(p.bookmark.factions || {})) {
      for (const f of list) known.add(f.id);
    }
    const used = new Set();
    for (const m of p.src.matchAll(/factionShift\(ctx,\s*[^,]+,\s*'([a-z]+)'/g)) used.add(m[1]);
    ok(used.size > 0, p.era + ': the package moves the court at all (' + [...used].join(', ') + ')');
    const unknown = [...used].filter((f) => !known.has(f));
    ok(!unknown.length, '  and every id is one the bookmark defines ('
      + (unknown.join(', ') || 'all known') + ')');
  }
}

console.log('== every modifier key a package sets is one the engine reads ==');
{
  // The keys the engine actually looks up, READ OUT OF THE ENGINE rather than
  // listed here. A hand-written list is the same bug one level up: this check
  // shipped with `aiPassive` missing from it and duly reported a live key as
  // dead, which is worse than not checking, because it argues for deleting
  // working content. Anything the sim resolves by name is legitimate; anything
  // else is a promise the tooltip makes and the engine ignores.
  const TAG_KEYS = new Set(['unrest']); // the province-scope key, read as effects.unrest
  for (const f of ['military', 'economy', 'unrest', 'ai', 'realm', 'invasion', 'navy',
    'recruitment', 'supply', 'population', 'tick']) {
    let src = '';
    try { src = readFileSync(R + '/js/sim/' + f + '.js', 'utf8'); } catch (e) { continue; }
    for (const m of src.matchAll(/resolveTag(?:Mult|Add)\(\s*ctx\s*,[^,]+,\s*'([a-zA-Z]+)'/g)) TAG_KEYS.add(m[1]);
    for (const m of src.matchAll(/effects\.([a-zA-Z]+)/g)) TAG_KEYS.add(m[1]);
  }
  ok(TAG_KEYS.size > 15, 'the engine\'s modifier vocabulary was read from the sim ('
    + TAG_KEYS.size + ' keys)');
  // Scope is the second half of the check and the half that bites. `taxMult`
  // is read by provMult() in sim/economy, which walks a PROVINCE's modifiers
  // and is never handed a tag's — so `taxMult` on a tag modifier is a key that
  // exists, spelled correctly, doing nothing. Seven of them shipped that way
  // before this check could see scope, every one of them a cost or a reward a
  // tooltip had already promised. `unrest` is the same shape.
  const PROV_ONLY = new Set(['taxMult', 'unrest']);
  for (const p of ALL) {
    const bad = [];
    for (const m of p.src.matchAll(/effects:\s*\{([^}]*)\}/g)) {
      for (const k of m[1].matchAll(/([a-zA-Z]+)\s*:/g)) {
        if (!TAG_KEYS.has(k[1])) bad.push(k[1]);
      }
    }
    ok(!bad.length, p.era + ': no dead modifier keys (' + ([...new Set(bad)].join(', ') || 'clean') + ')');

    const misscoped = [];
    for (const m of p.src.matchAll(/addTagModifier\(ctx,[^;]*?effects:\s*\{([^}]*)\}/g)) {
      for (const k of m[1].matchAll(/([a-zA-Z]+)\s*:/g)) {
        if (PROV_ONLY.has(k[1])) misscoped.push(k[1]);
      }
    }
    ok(!misscoped.length, '  and none of them is a province key on a tag modifier ('
      + ([...new Set(misscoped)].join(', ') || 'clean') + ')');
  }
}

console.log('== every option resolves clean and records that it was taken ==');
{
  const realWarn = console.warn;
  for (const p of ALL) {
    for (const card of p.cards) {
      const marks = [];
      for (let i = 0; i < card.options.length; i++) {
        const { game, ctx } = boot(p, card.date ? card.date.y : card.minYear);
        grant(ctx, p.tag, 24, ['Jerusalem']);
        const before = new Set(Object.keys(game.flags));
        const warned = [];
        console.warn = (...a) => { warned.push(a.map(String).join(' ')); };
        let threw = null;
        try { card.options[i].effects(ctx); } catch (e) { threw = e; }
        console.warn = realWarn;
        ok(!threw, p.era + ': ' + card.id + ' #' + i + ' resolves'
          + (threw ? ' — ' + threw.message : ''));
        ok(!warned.length, '  without a guarded failure (' + (warned[0] || 'silent') + ')');
        const set = Object.keys(game.flags).filter((k) => !before.has(k) && game.flags[k]);
        ok(set.length > 0, '  and leaves something in the record (' + (set.join(', ') || 'nothing') + ')');
        marks.push(set.sort().join(','));
      }
      // Two answers to one card must not leave the same mark, or nothing
      // downstream — chronicle, terminal, path tree — can tell them apart.
      ok(new Set(marks).size === marks.length,
        '  ' + card.id + ': each answer leaves its own mark (' + marks.join(' | ') + ')');
    }
  }
}

console.log('== the entry card fires when its road was won, and not otherwise ==');
{
  // Each package's opening card, and the world it needs. The counts are the
  // tiers the packages themselves re-derive (imperial/reach/endurance/standing).
  const ENTRIES = {
    '167bce': (ctx) => {
      grant(ctx, 'HAS', 20, ['Jerusalem', 'Antioch', 'Damascus', 'Apamea']);
      ctx.game.flags.diademInDust = true;
    },
    '66ce': (ctx) => { grant(ctx, 'JUD', 12, ['Jerusalem']); ctx.game.flags.secondKingdom = true; },
    '132ce': (ctx) => {
      grant(ctx, 'JUD', 10, ['Jerusalem']);
      ctx.game.flags.redemptionEra = true;
      ctx.game.tags.JUD.ruler = { name: 'Test', title: 'King', gov: 5, infl: 3, mar: 3, age: 50 };
    },
    '614ce': (ctx) => { grant(ctx, 'JUD', 8, ['Jerusalem']); ctx.game.flags.charterDavidic = true; },
    '1948ce': (ctx) => {
      grant(ctx, 'ISR', 20, ['Jerusalem']);
      ctx.game.tags.ISR.ruler = { name: 'Test', title: 'Prime Minister', gov: 5, infl: 5, mar: 3, age: 60 };
      // The card asks about the people the state governs who are not of it:
      // a realm that is Jewish everywhere has not reached the question.
      let flipped = 0;
      for (let i = 1; i < ctx.game.provinces.length && flipped < 8; i++) {
        const pr = ctx.game.provinces[i];
        if (!pr || pr.impassable || pr.controller !== 'ISR' || pr.religion !== 'judaism') continue;
        pr.religion = 'sunni'; flipped++;
      }
    },
  };
  for (const p of PACKAGES) {
    const card = p.cards.find((c) => c.id === p.entry);
    const { game, ctx } = boot(p, card.minYear + 1);
    ENTRIES[p.era](ctx);
    checkTriggeredEvents(ctx);
    const queued = game.pendingEvents.map((e) => e.eventId);
    ok(queued.indexOf(p.entry) >= 0,
      p.era + ': ' + p.entry + ' is asked of a realm that won the road (queued: '
      + (queued.join(', ') || 'nothing') + ')');

    // The same realm, one year before the band opens: too early is not "later".
    const early = boot(p, card.minYear - 5);
    ENTRIES[p.era](early.ctx);
    checkTriggeredEvents(early.ctx);
    ok(early.game.pendingEvents.every((e) => e.eventId !== p.entry),
      '  and is not asked before ' + card.minYear);

    // A realm that never won the road is never asked at all. What "lost" means
    // is the chapter's own success condition inverted: for the four historical
    // chapters that is the road flag and the capital, and for 1948 — which has
    // no victory flag, because the state does not win its existence in this
    // chapter, it starts with it — it is a state that never grew into the
    // question.
    const lost = boot(p, card.minYear + 1);
    ENTRIES[p.era](lost.ctx);
    for (const k of ['diademInDust', 'yokeReversed', 'secondKingdom', 'redemptionEra',
      'charterDavidic', 'kingdomApart']) lost.game.flags[k] = false;
    const jer = lost.ctx.prov('Jerusalem');
    if (jer) { jer.owner = 'REB'; jer.controller = 'REB'; }
    for (const pr of lost.game.provinces) {
      if (pr && pr.controller === p.tag && pr.id % 3) { pr.owner = 'REB'; pr.controller = 'REB'; }
    }
    checkTriggeredEvents(lost.ctx);
    ok(lost.game.pendingEvents.every((e) => e.eventId !== p.entry),
      '  and never asked of a realm that lost it');
  }
}

console.log('== the terminal knows the world it belongs to ==');
{
  const ROADS = {
    '167bce': (ctx) => {
      grant(ctx, 'HAS', 20, ['Jerusalem', 'Antioch', 'Damascus', 'Apamea']);
      ctx.game.flags.seleucidSuccessor = true;
    },
    '66ce': (ctx) => { grant(ctx, 'JUD', 12, ['Jerusalem']); ctx.game.flags.secondKingdom = true; },
    '132ce': (ctx) => { grant(ctx, 'JUD', 10, ['Jerusalem']); ctx.game.flags.redemptionEra = true; },
    '614ce': (ctx) => { grant(ctx, 'JUD', 8, ['Jerusalem']); ctx.game.flags.kingdomApart = true; },
    '1948ce': (ctx) => { grant(ctx, 'ISR', 20, ['Jerusalem']); },
  };
  for (const p of PACKAGES) {
    const card = p.cards.find((c) => c.id === p.terminal);
    ok(typeof card.when === 'function', p.era + ': ' + p.terminal + ' guards its own world');
    const won = boot(p, card.date.y);
    ROADS[p.era](won.ctx);
    ok(card.when(won.ctx) === true, '  and accepts the campaign that reached it');
    const lost = boot(p, card.date.y);
    for (const pr of lost.game.provinces) {
      if (pr && pr.controller === p.tag) { pr.owner = 'REB'; pr.controller = 'REB'; }
    }
    ok(card.when(lost.ctx) === false,
      '  and is retired from one that did not, rather than firing into it');
  }
}

console.log('== the march for the diaspora declares a war anyone can name ==');
{
  // The regression: declareWar takes the war's NAME as its fourth argument,
  // and an object there put "[object Object] begins" in the chronicle.
  const p = PACKAGES.find((x) => x.era === '66ce');
  const card = p.cards.find((c) => c.id === 'ev_n_the_east_is_burning');
  const { game, ctx } = boot(p, 116);
  grant(ctx, 'JUD', 12, ['Jerusalem']);
  game.flags.secondKingdom = true;
  card.options[0].effects(ctx);
  const war = (game.wars || []).find((w) => (w.attackers || []).indexOf('JUD') >= 0);
  ok(!!war, 'the kingdom marches (a war exists)');
  ok(war && typeof war.name === 'string' && war.name.indexOf('object') < 0,
    '  and the war has a readable name (' + (war && String(war.name)) + ')');
}

console.log('== the settled line actually moves the line ==');
{
  const p = PACKAGES.find((x) => x.era === '1948ce');
  const card = p.cards.find((c) => c.id === 'ev_z_the_question_that_came_back');
  const { game, ctx } = boot(p, 1975);
  // Israel holds the ground beyond the armistice lines, and the two states
  // that administered it before are alive to take it back.
  grant(ctx, 'ISR', 40, ['Jerusalem', 'Hebron', 'Jericho', 'Ramallah', 'Gaza', 'Rafah',
    'Lydda', 'Emmaus', 'Beit Shemesh', 'Eilat', 'Mitzpe Ramon', 'Beersheba', 'Dimona']);
  for (const tag of ['JOR', 'EGY']) if (game.tags[tag]) game.tags[tag].alive = true;
  const beyond = ['Hebron', 'Jericho', 'Ramallah', 'Gaza', 'Rafah'];
  const inside = ['Lydda', 'Emmaus', 'Beit Shemesh', 'Eilat', 'Mitzpe Ramon', 'Beersheba', 'Dimona'];
  const held = beyond.filter((n) => { const pr = ctx.prov(n); return pr && pr.owner === 'ISR'; });
  ok(held.length >= 4, 'the state holds the ground the card is about (' + held.length + ' districts)');
  card.options[1].effects(ctx);
  const stillHeld = held.filter((n) => { const pr = ctx.prov(n); return pr && pr.owner === 'ISR'; });
  ok(!stillHeld.length, '  and the withdrawal hands back everything beyond the line ('
    + (stillHeld.join(', ') || 'nothing kept') + ')');
  // SPEC §131: and NOTHING inside it. The corridor is why Jerusalem is not an
  // island, and the Negev to Eilat was never anybody's idea of a concession.
  const lost = inside.filter((n) => { const pr = ctx.prov(n); return pr && pr.owner !== 'ISR'; });
  ok(!lost.length, '  and keeps the corridor and the Negev to Eilat ('
    + (lost.join(', ') || 'all kept') + ')');
  ok(ctx.prov('Jerusalem').owner === 'ISR', '  and does not hand over the one cell it cannot divide');
  const recognised = ['JOR', 'EGY'].filter((t) => game.tags[t] && ctx.helpers.areRecognized(ctx, 'ISR', t));
  ok(recognised.length > 0, '  and buys the recognition it was traded for ('
    + (recognised.join(', ') || 'none') + ')');
  ok(game.flags.theSettledLine === true, '  and the road is marked');

  // The other two answers keep the ground: an option that is not a withdrawal
  // must not quietly perform one.
  for (const idx of [0, 2]) {
    const alt = boot(p, 1975);
    grant(alt.ctx, 'ISR', 24, ['Jerusalem', 'Hebron', 'Jericho', 'Ramallah', 'Gaza', 'Rafah']);
    card.options[idx].effects(alt.ctx);
    const kept = ['Hebron', 'Jericho', 'Ramallah', 'Gaza', 'Rafah']
      .every((n) => { const pr = alt.ctx.prov(n); return !pr || pr.owner === 'ISR'; });
    ok(kept, '  answer #' + idx + ' changes no border');
  }
}

console.log('== the annexation pool travels with every antique chapter and none other ==');
{
  // SPEC §126. This one is not a chapter's package — it is keyed on the player
  // tag like the omens, so the registry decides where it plays and the cards
  // decide when. Both halves are checked, because either alone is a bug: in
  // 1948 without a window it would ask a modern cabinet to rule on
  // circumcision or the road, and windowed but unregistered it would ask
  // nobody anything.
  const { EVENTS_ANNEX } = await import(R + '/js/data/events_annexation.js');
  const ANTIQUE_ERAS = ['167bce', '67bce', '40bce', '66ce', '132ce', '614ce'];
  for (const id of ANTIQUE_ERAS) {
    const era = ERAS.find((e) => e.bookmark.id === id);
    const has = EVENTS_ANNEX.every((c) => era && era.events.indexOf(c) >= 0);
    ok(has, id + ' plays the annexation question');
  }
  const modern = ERAS.find((e) => e.bookmark.id === '1948ce');
  ok(EVENTS_ANNEX.every((c) => modern.events.indexOf(c) < 0),
    '1948 does not, because a modern cabinet does not rule on circumcision or the road');
  ok(EVENTS_ANNEX.every((c) => Number.isFinite(c.maxYear) && c.maxYear < 1948),
    '  and every card is windowed shut before 1948 regardless of the registry');
  ok(EVENTS_ANNEX.every((c) => c.forTag === 'player'),
    '  and every card is addressed to whoever is playing, not to a fixed crown');

  // The policies claim to change how fast a conquered province stops being
  // foreign. Integration answers to `integrateMult` (added for this), so a
  // policy that names only `convertMult` changes the religion and not the
  // allegiance — which is half of what all four options say they do.
  const asrc = readFileSync(R + '/js/data/events_annexation.js', 'utf8');
  const rsrc = readFileSync(R + '/js/sim/realm.js', 'utf8');
  ok(/integrating\.monthsLeft[\s\S]{0,120}resolveTagMult\(ctx, p\.owner, 'integrateMult'\)/.test(rsrc),
    'the integration tick reads a realm-wide multiplier at all');
  const convertPolicies = (asrc.match(/convertMult/g) || []).length;
  const integratePolicies = (asrc.match(/integrateMult/g) || []).length;
  ok(convertPolicies === integratePolicies,
    '  and every policy that changes conversion changes integration with it ('
    + convertPolicies + ' vs ' + integratePolicies + ')');
}

console.log('== each card says what actually happened ==');
{
  for (const p of PACKAGES) {
    const withRecord = p.cards.filter((c) => typeof c.historical === 'string' && c.historical.length > 40);
    ok(withRecord.length >= 1,
      p.era + ': ' + withRecord.length + ' of ' + p.cards.length + ' cards carry the record');
    const entry = p.cards.find((c) => c.id === p.entry);
    ok(typeof entry.historical === 'string' && entry.historical.length > 40,
      '  including the one that opens the rung, which is the one that needs it');
    ok(p.cards.every((c) => c.major === true),
      '  and every one is major, so the §89 ledger sees it');
    ok(p.cards.every((c) => c.options.every((o) => typeof o.tooltip === 'string' && o.tooltip.length > 40)),
      '  and every answer prices itself before it is taken');
  }
}

console.log(failures ? `smoke85: ${failures} FAIL` : 'smoke85: ALL PASS');
process.exit(failures ? 1 : 0);
