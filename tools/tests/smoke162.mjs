// Headless regression — SPEC §241: the other side of the line.
//
// Nine more packages, ninety-seven dated cards, about the courts a courier can
// reach in three days. Structurally this is §240's sibling and it inherits
// §240's failure modes, so smoke161's shape is repeated here — plus the two
// that only appear once a second section exists over the same chapters:
//
//   1. Modifier-id collision. `addTagModifier` REPLACES by id. Two packages in
//      the same chapter that pick the same id do not conflict at load time,
//      do not warn, and do not throw — the second card silently overwrites the
//      first card's modifier, including a permanent one. Auditing for this is
//      how §241 found that §240's calendar card had been overwriting §235's
//      standing `the_reckoning_published`. Checked across every package each
//      chapter actually plays, not just the new ones.
//   2. The decade claim. §241 says its placement is arithmetic: every decade
//      with real room inside a chapter's playable window — five years or more
//      of it — carries at least two dated cards, and none is empty. That is
//      the section's stated reason for putting seventeen cards in 132 and ten
//      everywhere else, and it is one loop to verify and impossible to
//      eyeball. The edge decades are exempt from the count and not from the
//      emptiness check: a decade with one legal year in it cannot reasonably
//      be asked for two cards, and the rule would be a lie if it pretended
//      otherwise.
//
// Everything else is §240's contract applied to the new files: registration,
// ordering, windows, unique ids, the recorded course, the two-chair trap in
// the Keepers' chapter, and the seeded stream.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { GENERIC_EVENTS } = await import(R + '/js/data/events_generic.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const fs = await import('fs');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// chapter → [module, export, id prefix, last year the package may reach]
const PACKAGES = [
  ['167bce', 'events_167bce_neighbours.js', 'EVENTS_167_NEIGHBOURS', 'ev167n_', -60],
  ['67bce', 'events_67bce_neighbours.js', 'EVENTS_67_NEIGHBOURS', 'ev67n_', -25],
  ['40bce', 'events_40bce_neighbours.js', 'EVENTS_40_NEIGHBOURS', 'ev40n_', 66],
  ['66ce', 'events_66ce_neighbours.js', 'EVENTS_66_NEIGHBOURS', 'ev66n_', 132],
  ['132ce', 'events_132ce_neighbours.js', 'EVENTS_132_NEIGHBOURS', 'ev132n_', 435],
  ['351ce', 'events_351ce_neighbours.js', 'EVENTS_351_NEIGHBOURS', 'ev351n_', 439],
  ['529ce', 'events_529ce_neighbours.js', 'EVENTS_529_NEIGHBOURS', 'ev529n_', 614],
  ['614ce', 'events_614ce_neighbours.js', 'EVENTS_614_NEIGHBOURS', 'ev614n_', 700],
  ['1948ce', 'events_1948_neighbours.js', 'EVENTS_1948_NEIGHBOURS', 'ev48n_', 2005],
];

// Every package each chapter plays, for the modifier-id audit.
const CHAPTER_FILES = {
  '167bce': ['events_167bce', 'events_167bce_kings', 'events_167bce_hellenizers', 'events_167bce_world',
    'events_167bce_republic', 'events_167bce_provinces', 'events_167bce_conquest',
    'events_167bce_after', 'events_167bce_empire',
    'events_167bce_years',
    'events_167bce_neighbours'],
  '67bce': ['events_67bce', 'events_67bce_world', 'events_67bce_after', 'events_67bce_years',
    'events_67bce_neighbours'],
  '40bce': ['events_40bce', 'events_40bce_world', 'events_40bce_alternates', 'events_40bce_bridge',
    'events_40bce_years', 'events_40bce_neighbours'],
  '66ce': ['events_66ce', 'events_66ce_world', 'events_66ce_after', 'events_66ce_nation',
    'events_66ce_settlement', 'events_66ce_years', 'events_66ce_neighbours'],
  '132ce': ['events_132ce', 'events_132ce_faith', 'events_132ce_world', 'events_132ce_west',
    'events_132ce_galilee', 'events_132ce_redemption', 'events_132ce_endure', 'events_132ce_house',
    'events_132ce_kosiba', 'events_132ce_years', 'events_132ce_neighbours'],
  '351ce': ['events_351ce', 'events_351ce_world', 'events_351ce_collapse', 'events_351ce_years',
    'events_351ce_neighbours'],
  '529ce': ['events_529ce', 'events_529ce_world', 'events_529ce_roads', 'events_529ce_years',
    'events_529ce_neighbours'],
  '614ce': ['events_614ce', 'events_614ce_persia', 'events_614ce_west', 'events_614ce_third',
    'events_614ce_power', 'events_614ce_david', 'events_614ce_years', 'events_614ce_neighbours'],
  '1948ce': ['events_1948', 'events_1948_region', 'events_1948_coldwar', 'events_1948_absorption',
    'events_1948_levant', 'events_1948_question', 'events_1948_gulf', 'events_1948_years',
    'events_1948_neighbours'],
};

const loaded = new Map();
for (const [id, mod, exp] of PACKAGES) {
  const ns = await import(R + '/js/data/' + mod);
  loaded.set(id, ns[exp]);
}

function boot(id, tag) {
  const era = ERAS.find((e) => e.bookmark.id === id);
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const playerTag = tag || era.bookmark.playableTags[0].tag;
  const game = initGame({
    DEFINES, MAP_DATA, geom: null, bookmark: era.bookmark, events: era.events,
    playerTag, rngSeed: 162, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: null,
    bus: { emit() {}, on() { return () => {}; } },
    bookmark: era.bookmark, events: era.events, provinceMap,
  });
  return { game, ctx, era, playerTag };
}

// ---------------------------------------------------------------------------
console.log('== nine packages, each registered once, in its own chapter ==');
{
  let total = 0;
  for (const [id, , exp, prefix] of PACKAGES) {
    const pack = loaded.get(id);
    const era = ERAS.find((e) => e.bookmark.id === id);
    ok(Array.isArray(pack) && pack.length >= 10, exp + ': ' + (pack ? pack.length : 0) + ' cards');
    total += pack.length;
    const ids = era.events.filter(Boolean).map((c) => c.id);
    const missing = pack.filter((c) => ids.filter((i) => i === c.id).length !== 1);
    ok(!missing.length, '  every card is in ' + id + ' exactly once'
      + (missing.length ? ' (' + missing.slice(0, 3).map((c) => c.id).join(', ') + ')' : ''));
    const elsewhere = ERAS.filter((e) => e.bookmark.id !== id)
      .filter((e) => e.events.some((c) => c && typeof c.id === 'string' && c.id.startsWith(prefix)));
    ok(!elsewhere.length, '  and in no other chapter');
  }
  ok(total === 97, 'ninety-seven cards across the nine (' + total + ')');
}

// ---------------------------------------------------------------------------
console.log('== after the years package and before the shared pools ==');
{
  const sharedIds = new Set(GENERIC_EVENTS.map((c) => c && c.id).filter(Boolean));
  for (const [id, , , prefix] of PACKAGES) {
    const list = ERAS.find((e) => e.bookmark.id === id).events;
    const mine = [];
    const years = [];
    let firstShared = Infinity;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (!c || !c.id) continue;
      if (c.id.startsWith(prefix)) mine.push(i);
      else if (/^ev\d*y_|^ev48y_/.test(c.id)) years.push(i);
      else if (sharedIds.has(c.id) && i < firstShared) firstShared = i;
    }
    ok(years.length && Math.min(...mine) > Math.max(...years),
      id + ': the neighbours package follows the years package');
    ok(Math.max(...mine) < firstShared, '  and precedes the shared pool');
  }
}

// ---------------------------------------------------------------------------
console.log('== dated, windowed, historical, and answerable ==');
{
  const everyId = new Map();
  for (const era of ERAS) {
    for (const c of era.events) {
      if (!c || !c.id) continue;
      if (!everyId.has(c.id)) everyId.set(c.id, new Set());
      everyId.get(c.id).add(era.bookmark.id);
    }
  }
  for (const [id, , , prefix, lastYear] of PACKAGES) {
    const pack = loaded.get(id);
    const start = ERAS.find((e) => e.bookmark.id === id).bookmark.startDate.y;
    const bad = [];
    for (const c of pack) {
      if (!c.date || !Number.isFinite(c.date.y) || !(c.date.m >= 1 && c.date.m <= 12)) bad.push(c.id + ':date');
      else if (c.date.y < start || c.date.y > lastYear) bad.push(c.id + ':' + c.date.y);
      if (typeof c.trigger === 'function') bad.push(c.id + ':trigger');
      if (typeof c.historical !== 'string' || c.historical.length < 20) bad.push(c.id + ':historical');
      if (!Array.isArray(c.options) || c.options.length < 2) bad.push(c.id + ':options');
      const ai = c.aiOption | 0;
      if (!Number.isFinite(c.aiOption) || ai < 0 || ai >= (c.options || []).length) bad.push(c.id + ':aiOption');
      for (const o of c.options || []) {
        if (!o || typeof o.effects !== 'function' || !o.label || !o.tooltip) bad.push(c.id + ':opt');
      }
      if (!c.id.startsWith(prefix)) bad.push(c.id + ':prefix');
    }
    ok(!bad.length, id + ': every card dated inside ' + start + '–' + lastYear
      + ', with a recorded course that exists' + (bad.length ? ' (' + bad.slice(0, 4).join(', ') + ')' : ''));
    const shared = pack.filter((c) => (everyId.get(c.id) || new Set()).size !== 1);
    ok(!shared.length, '  and no id shared with any other chapter');
  }
}

// ---------------------------------------------------------------------------
console.log('== no modifier id collides inside a chapter ==');
{
  // The one failure mode that is invisible everywhere else: addTagModifier
  // replaces by id, so a duplicate silently overwrites — including a permanent
  // modifier from the chapter's own chain. Both new sections are audited
  // against every package their chapter plays.
  const clashes = [];
  let scanned = 0;
  for (const [ch, files] of Object.entries(CHAPTER_FILES)) {
    const seen = new Map();
    for (const f of files) {
      const src = fs.readFileSync(R + '/js/data/' + f + '.js', 'utf8');
      const add = (key) => { if (!seen.has(key)) seen.set(key, new Set()); seen.get(key).add(f); scanned++; };
      for (const m of src.matchAll(/\bid: '([a-z0-9_]+)', name: '/g)) add(m[1]);
      for (const m of src.matchAll(/mod\(ctx, (?:'[A-Z]{3}', )?'([a-z0-9_]+)', '/g)) add(m[1]);
    }
    for (const [modId, inFiles] of seen) {
      if (inFiles.size < 2) continue;
      if (![...inFiles].some((f) => /_years$|_neighbours$/.test(f))) continue;
      clashes.push(ch + '/' + modId + ' (' + [...inFiles].join(' + ') + ')');
    }
  }
  ok(!clashes.length, scanned + ' modifier ids scanned, none reused across packages in one chapter'
    + (clashes.length ? ' (' + clashes.slice(0, 3).join('; ') + ')' : ''));
  // …and the specific one this section fixed stays fixed.
  const y351 = fs.readFileSync(R + '/js/data/events_351ce_years.js', 'utf8');
  ok(!/mod\(ctx, 'the_reckoning_published'/.test(y351) && /'the_calendar_table'/.test(y351),
    '  §240\'s calendar card no longer reuses §235\'s permanent modifier id');
}

// ---------------------------------------------------------------------------
console.log('== the decade claim: every decade with room carries two ==');
{
  for (const era of ERAS) {
    const b = era.bookmark;
    const first = b.startDate.y;
    const last = b.generationHorizon;
    const lo = Math.floor(first / 10) * 10;
    const hi = Math.floor(last / 10) * 10;
    const bucket = {};
    for (const c of era.events) {
      if (!c || !c.date) continue;
      const d = Math.floor(c.date.y / 10) * 10;
      bucket[d] = (bucket[d] || 0) + 1;
    }
    const thin = [];
    const empty = [];
    let roomy = 0;
    for (let d = lo; d <= hi; d += 10) {
      // How much of this decade is actually inside the playable window?
      const years = Math.min(d + 9, last) - Math.max(d, first) + 1;
      const n = bucket[d] || 0;
      if (years >= 5) { roomy++; if (n < 2) thin.push(d + ':' + n); }
      else if (n === 0) empty.push(d + ' (' + years + 'y)');
    }
    ok(!thin.length, b.id + ': all ' + roomy + ' roomy decades carry two or more'
      + (thin.length ? ' (' + thin.join(', ') + ')' : ''));
    ok(empty.length <= 2, '  and at most two short edge decades are empty'
      + (empty.length ? ' (' + empty.join(', ') + ')' : ''));
  }
}

// ---------------------------------------------------------------------------
console.log('== nothing in the section draws from the seeded stream ==');
{
  const declared = [];
  for (const [id] of PACKAGES) {
    for (const c of loaded.get(id)) {
      if (Number.isFinite(c.chance) || c.roll === true || c.once === false) declared.push(c.id);
    }
  }
  ok(!declared.length, 'no card declares a chance, a roll or a repeat');

  const moved = [];
  for (const [id] of PACKAGES) {
    const w = boot(id);
    for (const c of loaded.get(id)) {
      for (const o of c.options) {
        const before = w.game.rngState;
        try { o.effects(w.ctx); } catch (e) { /* the run check below owns this */ }
        if (w.game.rngState !== before) { moved.push(c.id); break; }
      }
    }
  }
  ok(!moved.length, 'and no option advances the stream'
    + (moved.length ? ' (' + moved.slice(0, 4).join(', ') + ')' : ''));
}

// ---------------------------------------------------------------------------
console.log('== every option of every card runs clean and leaves a realm ==');
{
  for (const [id] of PACKAGES) {
    let ran = 0;
    const threw = [];
    for (const c of loaded.get(id)) {
      for (let i = 0; i < c.options.length; i++) {
        const w = boot(id);
        try { c.options[i].effects(w.ctx); ran++; }
        catch (e) { threw.push(c.id + '#' + i + ': ' + (e && e.message)); }
        const t = w.game.tags[w.playerTag];
        if (!t || t.alive === false) threw.push(c.id + '#' + i + ': the realm is gone');
      }
    }
    ok(!threw.length, id + ': ' + ran + ' options run clean'
      + (threw.length ? ' (' + threw.slice(0, 3).join(' | ') + ')' : ''));
  }
}

// ---------------------------------------------------------------------------
console.log('== the Keepers\' package names its own tags, not the player\'s chair ==');
{
  const pack = loaded.get('529ce');
  const audiences = new Set(pack.map((c) => c.forTag));
  ok(!audiences.has('player') && !audiences.has('both'),
    'every card names SAM or HMY (' + [...audiences].sort().join(', ') + ')');
  ok(pack.some((c) => c.forTag === 'HMY') && pack.some((c) => c.forTag === 'SAM'),
    '  and both chairs are addressed');
  const src = fs.readFileSync(R + '/js/data/events_529ce_neighbours.js', 'utf8');
  ok(!/P\(ctx\)/.test(src), '  and the file never reaches for playerTag at all');

  const w = boot('529ce', 'HMY');
  const hmy = w.game.tags.HMY;
  const sam = w.game.tags.SAM;
  const before = { t: hmy.treasury, mods: (hmy.modifiers || []).length };
  const samBefore = (sam.modifiers || []).length;
  for (const c of pack.filter((x) => x.forTag === 'SAM')) c.options[0].effects(w.ctx);
  ok(hmy.treasury === before.t && (hmy.modifiers || []).length === before.mods,
    '  a mountain card answered in a Himyar campaign leaves Himyar\'s ledger alone');
  ok((sam.modifiers || []).length > samBefore, '  and lands on the mountain');
}

console.log(failures ? failures + ' FAILURES' : 'smoke162: ALL PASS');
