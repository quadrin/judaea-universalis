// Headless regression — the victors' pens across every era (SPEC §66).
// integratedNames went from a 1948-only table to a per-bookmark one; this
// guards the data contract for all of them: every pen belongs to a tag that
// exists in its bookmark, every entry keys a real canonical province, and
// every entry actually changes the label (a rename that reproduces the era
// name would be dead weight the resolver can never surface).
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');

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
    ok(tags.has(tag), tag + ' is an active tag of ' + bm.id);
    ok(table && typeof table === 'object' && Object.keys(table).length > 0,
      tag + ' pen is a non-empty table');
    for (const [prov, name] of Object.entries(table || {})) {
      ok(canon.has(prov), tag + ' keys a real canonical province: ' + prov);
      ok(typeof name === 'string' && name.length > 0,
        tag + ' writes a non-empty name on ' + prov);
      const shown = Object.prototype.hasOwnProperty.call(era, prov) ? era[prov] : prov;
      ok(name !== shown, tag + ' actually changes the label of ' + prov
        + ' (era shows "' + shown + '")');
    }
  }
}

if (failures) {
  console.error('\nsmoke44: ' + failures + ' failure(s)');
  process.exit(1);
}
console.log('\nsmoke44: all pens write real names on real provinces.');
