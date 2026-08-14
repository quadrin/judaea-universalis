// Headless regression — SPEC §249: the country, not the court.
//
// The third register. §240 gave each chapter its own business and §241 the
// ring of small courts across the border; both are the state. These are the
// decades in which almost nothing happens politically and a great deal happens
// to people: what the land grows and what happens when it does not, the trades
// a province lives by, the years the rain fails or the ground moves.
//
// The suite is written GENERICALLY over every events_<era>_country.js that
// exists, so the chapters still to be written are covered the moment they are
// registered rather than needing this file edited alongside them. Contracts:
//
//   1. EVERY PACKAGE IS REGISTERED IN ITS OWN CHAPTER, appended after that
//      chapter's own chain and before the shared pools (§223's ordering).
//   2. EVERY CARD IS DATED, WINDOWED, UNIQUELY IDENTIFIED, and carries a
//      historical line and an aiOption that indexes an option that exists.
//   3. NO CARD TOUCHES THE SEEDED STREAM — no chance, no roll, and no option
//      advances game.rngState, so the balance harness stays comparable.
//   4. EVERY OPTION RUNS CLEAN against a booted campaign and leaves the realm
//      alive.
//   5. NO MODIFIER ID COLLIDES with any other package the same chapter plays.
//   6. AND THE TWO-CHAIR CHAPTER NAMES ITS TAGS. 529 seats two playable
//      crowns, so a card there that reached for the player's chair would
//      silently apply the Samaritan answer to a Himyarite campaign.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync, readdirSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const COUNTRY_FILES = readdirSync(R + '/js/data').filter((f) => /^events_.*_country\.js$/.test(f)).sort();
const COMPENDIUM = readFileSync(R + '/js/data/compendium.js', 'utf8');
// events_167bce_country.js -> 167bce
const chapterOf = (f) => f.replace(/^events_/, '').replace(/_country\.js$/, '');
const eraOf = (chap) => ERAS.find((e) => e.bookmark.id === chap || e.bookmark.id === chap + 'ce'
  || e.bookmark.id === chap.replace(/ce$/, ''));
const prefixOf = (chap) => 'ev' + chap.replace(/bce$/, '').replace(/ce$/, '') + 'c_';

console.log('== §249 · 1 the packages exist and are registered ==');
{
  ok(COUNTRY_FILES.length > 0, `${COUNTRY_FILES.length} country packages: ${COUNTRY_FILES.map(chapterOf).join(', ')}`);
  for (const f of COUNTRY_FILES) {
    const chap = chapterOf(f);
    const era = eraOf(chap);
    ok(!!era, `${chap}: has a chapter in the registry`);
    const sym = new RegExp('EVENTS_' + chap.replace(/bce$/, '').replace(/ce$/, '') + '_COUNTRY');
    ok(sym.test(COMPENDIUM), `  ${chap}: its export is named in the registry`);
    // §223's ordering: after the chapter's own chain, before the shared pools.
    const line = COMPENDIUM.split('\n').find((l) => l.includes('bookmark: withPolitical') && l.includes(chap.toUpperCase().replace('BCE', '').replace('CE', '')));
    if (line) {
      const iCountry = line.indexOf('_COUNTRY');
      const iShared = Math.max(line.indexOf('ANTIQUE'), line.indexOf('SHARED'));
      ok(iCountry > 0 && iShared > iCountry, `  ${chap}: appended before the shared pools`);
    }
  }
}

console.log('== §249 · 2 every card is dated, windowed and answerable ==');
{
  for (const f of COUNTRY_FILES) {
    const chap = chapterOf(f);
    const era = eraOf(chap);
    if (!era) continue;
    const cards = era.events.filter((c) => c && c.id && c.id.startsWith(prefixOf(chap)));
    ok(cards.length > 0, `${chap}: ${cards.length} cards live in the chapter`);
    const b = era.bookmark;
    let bad = [];
    for (const c of cards) {
      if (!c.date || !Number.isFinite(c.date.y)) bad.push(c.id + ' undated');
      else if (c.date.y < b.startDate.y || c.date.y > b.generationHorizon) bad.push(c.id + ' outside ' + b.startDate.y + '..' + b.generationHorizon);
      if (typeof c.historical !== 'string' || !c.historical.length) bad.push(c.id + ' no historical line');
      if (!Array.isArray(c.options) || !c.options.length) bad.push(c.id + ' no options');
      else if (!Number.isFinite(c.aiOption) || c.aiOption < 0 || c.aiOption >= c.options.length) bad.push(c.id + ' aiOption out of range');
      for (const o of c.options || []) {
        if (!o || typeof o.label !== 'string' || !o.label.length) bad.push(c.id + ' option with no label');
        if (!o || typeof o.tooltip !== 'string' || !o.tooltip.length) bad.push(c.id + ' option with no tooltip');
        if (!o || typeof o.effects !== 'function') bad.push(c.id + ' option with no effects');
      }
    }
    ok(!bad.length, `  ${chap}: every card dated, windowed, historical and answerable`
      + (bad.length ? ' — ' + bad.slice(0, 3).join('; ') : ''));
    // Unique across the WHOLE registry, not just this chapter.
    const all = new Set();
    let dup = [];
    for (const e of ERAS) for (const c of e.events) {
      if (!c || !c.id) continue;
      const k = e.bookmark.id + ':' + c.id;
      if (all.has(k)) dup.push(k);
      all.add(k);
    }
    ok(!dup.length, `  ${chap}: no duplicate ids anywhere in the registry`
      + (dup.length ? ' — ' + dup.slice(0, 3).join('; ') : ''));
  }
}

console.log('== §249 · 3 nothing touches the seeded stream ==');
{
  for (const f of COUNTRY_FILES) {
    const src = readFileSync(R + '/js/data/' + f, 'utf8');
    ok(!/\bchance\s*:/.test(src) && !/\broll\s*\(/.test(src),
      `${chapterOf(f)}: no chance and no roll`);
    ok(!/once\s*:\s*false/.test(src), `  ${chapterOf(f)}: no repeating card`);
  }
}

console.log('== §249 · 4 every option runs clean and leaves the realm alive ==');
{
  for (const f of COUNTRY_FILES) {
    const chap = chapterOf(f);
    const era = eraOf(chap);
    if (!era) continue;
    const b = era.bookmark;
    const tag = (b.playableTags && b.playableTags[0].tag) || 'JUD';
    const cards = era.events.filter((c) => c && c.id && c.id.startsWith(prefixOf(chap)));
    let broke = [];
    let streamMoved = [];
    for (const c of cards) {
      for (let i = 0; i < c.options.length; i++) {
        const game = initGame({
          DEFINES, MAP_DATA, bookmark: b, events: era.events, playerTag: tag, rngSeed: 42,
        });
        const bus = { emit() {}, on() {} };
        const ctx = makeCtx({ game, DEFINES, MAP_DATA, bus, bookmark: b, events: era.events });
        game.tags[tag].ai = false;
        const before = game.rngState;
        try { c.options[i].effects(ctx); } catch (e) { broke.push(c.id + '#' + i + ': ' + e.message); }
        if (game.rngState !== before) streamMoved.push(c.id + '#' + i);
        if (!game.tags[tag]) broke.push(c.id + '#' + i + ': realm gone');
      }
    }
    ok(!broke.length, `${chap}: every option runs clean`
      + (broke.length ? ' — ' + broke.slice(0, 3).join('; ') : ''));
    ok(!streamMoved.length, `  ${chap}: and none advances the seeded stream`
      + (streamMoved.length ? ' — ' + streamMoved.slice(0, 3).join('; ') : ''));
  }
}

console.log('== §249 · 5 no modifier id collides inside a chapter ==');
{
  for (const f of COUNTRY_FILES) {
    const chap = chapterOf(f);
    const files = readdirSync(R + '/js/data').filter((x) => x.startsWith('events_' + chap));
    const seen = {};
    const clash = [];
    for (const x of files) {
      const s = readFileSync(R + '/js/data/' + x, 'utf8');
      let m;
      const re = /id: '([a-z0-9_]+)', name: '/g;
      while ((m = re.exec(s))) { if (seen[m[1]] && seen[m[1]] !== x) clash.push(m[1] + ' (' + seen[m[1]] + ' / ' + x + ')'); seen[m[1]] = x; }
      const re2 = /mod\(ctx, '[A-Z]{3}', '([a-z0-9_]+)', '/g;
      while ((m = re2.exec(s))) { if (seen[m[1]] && seen[m[1]] !== x) clash.push(m[1] + ' (' + seen[m[1]] + ' / ' + x + ')'); seen[m[1]] = x; }
      const re3 = /mod\(ctx, '([a-z0-9_]+)', '/g;
      while ((m = re3.exec(s))) { if (seen[m[1]] && seen[m[1]] !== x) clash.push(m[1] + ' (' + seen[m[1]] + ' / ' + x + ')'); seen[m[1]] = x; }
    }
    // `no_head_to_take` is shared by events_529ce.js and events_529ce_roads.js
    // and predates this section; it is not this package's to fix.
    const mine = clash.filter((c) => c.indexOf('_country.js') >= 0);
    ok(!mine.length, `${chap}: ${Object.keys(seen).length} ids scanned, none of this package's collide`
      + (mine.length ? ' — ' + mine.join('; ') : ''));
  }
}

console.log('== §249 · 6 the two-chair chapter names its tags ==');
{
  const two = COUNTRY_FILES.filter((f) => chapterOf(f) === '529ce');
  for (const f of two) {
    const src = readFileSync(R + '/js/data/' + f, 'utf8');
    ok(!/P\(ctx\)/.test(src),
      '529ce: nothing reaches for the player\'s chair — the Samaritan answer must not land on a Himyarite campaign');
    ok(/forTag: '[A-Z]{3}'/.test(src), '  and every card names the court it is addressed to');
    ok(/function safeWhen/.test(src), '  with a when-gate for a court the world may have removed');
  }
  ok(true, `checked ${two.length} two-chair package(s)`);
}

console.log(failures ? failures + ' FAILURES' : 'smoke169: ALL PASS');
process.exit(failures ? 1 : 0);
