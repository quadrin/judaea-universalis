// Headless regression — SPEC §269: every court a chapter seats flies its own
// emblem.
//
// The §268 chapters shipped twenty-one new courts and not one of them had a
// flag. Nothing failed, because nothing asked: `flagChip` falls back to the
// three-letter tag set in text when `FLAGS` has no entry, which is a real
// rendering path with a real stylesheet rule behind it, so a court with no
// emblem looks deliberate rather than missing. Israel and Judah went to war
// on the start screen wearing the strings "ISL" and "JDH".
//
// The two flag suites that existed checked named tags — smoke71 asks after
// CMG, CYZ and ITU; smoke152 asks after the crowns — so a whole chapter of
// new courts slipped between them. This is the coverage check neither was:
// not "do these particular tags have art" but "is there any seated court
// without it".
//
// The check is over EVERY court in the table, not just the ones a bookmark
// seats. The first cut was scoped to `activeTags` because two courts — the
// Party of God and the Host of Lukuas — are raised mid-campaign by a card and
// had never had emblems either; scoping around them would have written the
// older gap into the contract as if it were intended. They are drawn now, so
// the rule is the plain one: if a court can appear on a map, it has a flag.
// WASTE is the only exemption, and it is not a court.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { FLAGS, flagChip } = await import(R + '/js/ui/icons.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// A court flies its own art, or points at another court's with `flag`.
const emblemOf = (tag) => {
  const def = (DEFINES.TAGS || {})[tag] || {};
  const own = (k) => (typeof k === 'string'
    && Object.prototype.hasOwnProperty.call(FLAGS, k) ? FLAGS[k] : null);
  return own(def.flag) || own(tag);
};

const courts = Object.keys(DEFINES.TAGS || {}).filter((t) => t !== 'WASTE');
const seated = new Set();
for (const era of ERAS) for (const t of (era.bookmark.activeTags || [])) seated.add(t);

console.log('== every court has an emblem ==');
{
  ok(courts.length >= 155, courts.length + ' courts in the table, WASTE aside');
  const bare = courts.filter((t) => !emblemOf(t)).sort();
  ok(!bare.length, 'none of them falls back to its three letters in text ('
    + (bare.join(' ') || 'all carry art') + ')');
  // Said twice on purpose: the courts a bookmark SEATS are the ones a player
  // meets on the start screen, and that is the set §268 shipped bare.
  ok(seated.size >= 140, '  ' + seated.size + ' of them are seated by a bookmark');
  const bareSeated = [...seated].filter((t) => t !== 'WASTE' && !emblemOf(t)).sort();
  ok(!bareSeated.length, '  and every seated court carries art ('
    + (bareSeated.join(' ') || 'all of them') + ')');
  // The two that arrive only by card, which the first cut of this suite had
  // to exempt and no longer does.
  ok(!seated.has('HEZ') && !seated.has('LUK'), '  HEZ and LUK are raised by a card, not seated');
  ok(!!emblemOf('HEZ') && !!emblemOf('LUK'), '  and are drawn all the same');
}

console.log('== and it is real art, in the house hand ==');
{
  // Length is a proxy for "somebody drew this" — the shortest emblem in the
  // table before §269 was well over a hundred characters of path data.
  const thin = courts.filter((t) => {
    const art = emblemOf(t);
    return art && art.length < 100;
  }).sort();
  ok(!thin.length, 'no emblem is a placeholder stub (' + (thin.join(' ') || 'all substantial') + ')');
  // Every emblem is SVG body content, not a whole document or a bare string.
  const malformed = courts.filter((t) => {
    const art = emblemOf(t);
    return art && (/<svg|<\/svg>/.test(art) || !/<(path|circle|rect|g)\b/.test(art));
  }).sort();
  ok(!malformed.length, 'and every one is body content the chip can wrap ('
    + (malformed.join(' ') || 'all well-formed') + ')');
}

console.log('== the §268 courts each got their own, not a borrowed one ==');
{
  const IRON = ['ISL', 'JDH', 'ASR', 'BBL', 'MIZ', 'DMS', 'TYR', 'PLS', 'MOB', 'AMO', 'EDM',
    'HMT', 'QDR', 'URA', 'PHR', 'LYD', 'ELA', 'MDA', 'PAS', 'TAB', 'CRC'];
  const missing = IRON.filter((t) => !FLAGS[t]);
  ok(!missing.length, 'all twenty-one are drawn (' + (missing.join(' ') || 'complete') + ')');
  // No two courts anywhere in the table share a body. Israel's calf and
  // Judah's lion are the pair this is really about: they are on the same map,
  // at war, from the first month, and a shared emblem would make the one
  // chapter with two playable crowns unreadable.
  const byArt = new Map();
  for (const t of Object.keys(FLAGS)) {
    const a = FLAGS[t];
    if (!byArt.has(a)) byArt.set(a, []);
    byArt.get(a).push(t);
  }
  const shared = [...byArt.values()].filter((v) => v.length > 1).map((v) => v.join('='));
  ok(!shared.length, 'no two courts fly the same art (' + (shared.join(', ') || 'all distinct') + ')');
  ok(FLAGS.ISL !== FLAGS.JDH, '  and the two crowns of 931 are told apart at a glance');
}

console.log('== the chip actually renders them ==');
{
  // The end of the pipe: what the start screen and the map counters call.
  const bad = [];
  for (const t of ['ISL', 'JDH', 'ASR', 'BBL', 'MIZ', 'HEZ', 'LUK']) {
    const chip = flagChip(t, DEFINES, 22);
    if (!chip.includes('<svg')) bad.push(t + ':no-svg');
    if (chip.includes('fchip-abbr')) bad.push(t + ':fell-back-to-text');
    const col = (DEFINES.TAGS[t] || {}).color || [];
    if (col.length >= 3 && !chip.includes(col.slice(0, 3).map((n) => n | 0).join(','))) {
      bad.push(t + ':wrong-field');
    }
  }
  ok(!bad.length, 'the chip draws the emblem on the court\'s own colour ('
    + (bad.join(', ') || 'all seven sampled draw clean') + ')');
}

console.log(failures ? failures + ' FAILURES' : 'smoke186: ALL PASS');
process.exit(failures ? 1 : 0);
