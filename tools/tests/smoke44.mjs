// Headless regression — the victors' pens across every era (SPEC §66, §68,
// §94). Bookmark pens carry local, period-specific choices; Jewish states
// also inherit one shared table, so Adiabene, formables, and future bookmarks
// do not need copies of the same sixty names. This guards both data contracts.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { JEWISH_INTEGRATED_NAMES } = await import(R + '/js/data/integrated_names.js');
const { resolveDisplayName } = await import(R + '/js/sim/military.js');

const BOOKS = [
  ['bookmark_167bce.js', 'BOOKMARK_167'],
  ['bookmark_67bce.js', 'BOOKMARK_67'],
  ['bookmark_40bce.js', 'BOOKMARK_40'],
  ['bookmark_66ce.js', 'BOOKMARK_66'],
  ['bookmark_132ce.js', 'BOOKMARK_132'],
  ['bookmark_614ce.js', 'BOOKMARK_614'],
  ['bookmark_1948.js', 'BOOKMARK_1948'],
];

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const canon = new Set(MAP_DATA.provinces.map((p) => p.name));

console.log('== the shared Jewish pen ==');
{
  const entries = Object.entries(JEWISH_INTEGRATED_NAMES);
  ok(entries.length >= 60, 'covers at least sixty canonical provinces');
  for (const [prov, name] of entries) {
    ok(canon.has(prov), 'shared pen keys a real canonical province: ' + prov);
    ok(typeof name === 'string' && name.length > 0,
      'shared pen writes a non-empty name on ' + prov);
    ok(name !== prov, 'shared pen changes the canonical label of ' + prov);
  }
  const beyondIsrael = [
    'Tyre', 'Sidon', 'Byblos', 'Aradus', 'Damascus', 'Beroea', 'Palmyra',
    'Alexandria', 'Pelusium', 'Leontopolis', 'Memphis', 'Thebes', 'Syene',
    'Nisibis', 'Seleucia-Ctesiphon', 'Babylon', 'Charax', 'Ecbatana', 'Susa',
    'Gazaca', 'Gabae', 'Assur', 'Uruk', 'Thessalonica', 'Byzantion',
  ];
  ok(beyondIsrael.every((prov) => JEWISH_INTEGRATED_NAMES[prov]),
    'the pen reaches Syria, Egypt, Mesopotamia, Persia, and the Mediterranean diaspora');
}

for (const [file, key] of BOOKS) {
  const bm = (await import(R + '/js/data/' + file))[key];
  console.log('== ' + bm.id);
  const pens = bm.integratedNames;
  ok(pens && typeof pens === 'object' && Object.keys(pens).length > 0,
    'declares at least one integrated-names pen');
  if (!pens) continue;
  const tags = new Set(bm.activeTags || []);
  const era = bm.provinceNames || {};
  for (const [tag, table] of Object.entries(pens)) {
    if (typeof table === 'string') {
      // An inherited pen: the alias must belong to a defined tag (formables
      // and event identities are not active at start) and resolve, within
      // the resolver's hop budget, to a real table in this same book.
      ok(!!DEFINES.TAGS[tag], tag + ' (alias pen) is a tag DEFINES knows');
      let target = table;
      let hops = 0;
      while (typeof target === 'string' && hops++ < 4) target = pens[target];
      ok(target && typeof target === 'object' && Object.keys(target).length > 0,
        tag + ' alias resolves to a real pen (' + table + ')');
      continue;
    }
    ok(tags.has(tag), tag + ' is an active tag of ' + bm.id);
    ok(table && typeof table === 'object' && Object.keys(table).length > 0,
      tag + ' pen is a non-empty table');
    for (const [prov, name] of Object.entries(table || {})) {
      ok(canon.has(prov), tag + ' keys a real canonical province: ' + prov);
      ok(typeof name === 'string' && name.length > 0,
        tag + ' writes a non-empty name on ' + prov);
      const shown = Object.prototype.hasOwnProperty.call(era, prov) ? era[prov] : prov;
      // A Jewish bookmark may intentionally repeat its era label to block an
      // older shared name where the same canonical cell now represents a
      // different modern city (Joppa's cell is Tel Aviv-Jaffa, not just Yafo).
      const tagDef = DEFINES.TAGS[tag];
      const blocksShared = tagDef && tagDef.religion === 'judaism'
        && JEWISH_INTEGRATED_NAMES[prov]
        && name === shown
        && name !== JEWISH_INTEGRATED_NAMES[prov];
      ok(name !== shown || blocksShared, tag + ' changes the label or deliberately blocks'
        + ' an older shared name on ' + prov + ' (era shows "' + shown + '")');
    }
  }

  // Every era has at least one active Jewish state. The same integrated
  // Damascus must therefore become Damesek without a copied bookmark entry.
  const jewishTag = (bm.activeTags || []).find((tag) => {
    const d = DEFINES.TAGS[tag];
    return d && d.religion === 'judaism';
  });
  ok(!!jewishTag, bm.id + ' has an active Jewish state for the shared pen');
  if (jewishTag) {
    const era = Object.prototype.hasOwnProperty.call(bm.provinceNames || {}, 'Damascus')
      ? bm.provinceNames.Damascus : 'Damascus';
    const d = DEFINES.TAGS[jewishTag];
    const p = {
      id: 1, canon: 'Damascus', name: era, owner: jewishTag,
      integration: 1, culture: 'aramean',
    };
    resolveDisplayName({
      bookmark: bm,
      game: {
        playerTag: '__none__',
        tags: { [jewishTag]: { religion: d.religion, culture: d.culture } },
      },
      bus: { emit() {} },
    }, p);
    ok(p.name === 'Damesek',
      bm.id + ' inherits Damesek through its Jewish state (' + jewishTag + ')');
  }
}

console.log('== precedence and eligibility ==');
{
  const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
  const ctx = {
    bookmark: BOOKMARK_1948,
    game: {
      playerTag: '__none__',
      tags: {
        ISR: { religion: 'judaism', culture: 'israeli' },
        EGY: { religion: 'islam', culture: 'arab_modern' },
      },
    },
    bus: { emit() {} },
  };
  const oboda = {
    id: 1, canon: 'Oboda', name: 'al-Auja', owner: 'ISR',
    integration: 1, culture: 'arab_modern',
  };
  resolveDisplayName(ctx, oboda);
  ok(oboda.name === 'Nitzana',
    'the 1948 local pen overrides the shared Avdat');

  for (const [canonName, eraName] of [
    ['Joppa', 'Tel Aviv-Jaffa'], ['Antipatris', 'Petah Tikva'], ['Dora', 'Haifa'],
  ]) {
    const modern = {
      id: 1, canon: canonName, name: eraName, owner: 'ISR',
      integration: 1, culture: 'israeli',
    };
    resolveDisplayName(ctx, modern);
    ok(modern.name === eraName,
      eraName + ' is not replaced by the older shared site name');
  }

  const unintegrated = {
    id: 2, canon: 'Damascus', name: 'Damascus', owner: 'ISR',
    integration: 0.9, culture: 'arab_modern',
  };
  resolveDisplayName(ctx, unintegrated);
  ok(unintegrated.name === 'Damascus',
    'the shared pen still waits for integration or settlement');

  const settled = {
    id: 3, canon: 'Damascus', name: 'Damascus', owner: 'ISR',
    integration: 0, culture: 'israeli',
  };
  resolveDisplayName(ctx, settled);
  ok(settled.name === 'Damesek',
    'a province peopled by the owner earns the shared name without integration');

  const egyptian = {
    id: 4, canon: 'Damascus', name: 'Damascus', owner: 'EGY',
    integration: 1, culture: 'arab_modern',
  };
  resolveDisplayName(ctx, egyptian);
  ok(egyptian.name === 'Damascus',
    'a non-Jewish state does not inherit the Jewish pen');
}

if (failures) {
  console.error('\nsmoke44: ' + failures + ' failure(s)');
  process.exit(1);
}
console.log('\nsmoke44: all pens write real names on real provinces. ALL PASS');
