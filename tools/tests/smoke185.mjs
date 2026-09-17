// Headless regression — SPEC §268: the three Iron Age chapters' years
// packages, and the trap a two-chair chapter sets for them.
//
// §240 and §241 wrote a dated section for each of the nine chapters that
// already existed. §268 adds three chapters in front of all of them, and the
// decade rule applies to those three exactly as it applies to the rest — so
// they get the same kind of package and the same contract. This suite is that
// contract, plus the one failure mode these three have that none of the nine
// had in the same shape:
//
//   A card is answered by the court it is ADDRESSED to, not by the chair the
//   player is sitting in (SPEC §216). 931 and 732 both seat Israel AND Judah,
//   so a `forTag: 'JDH'` card fires in an Israelite campaign as well — it
//   resolves silently, on its recorded course, with `game.playerTag` still
//   reading ISL. An effect body that reaches for the player would therefore
//   hang Judah's fortified towns, Judah's treaty with Damascus and Judah's
//   tribute schedule on Israel's ledger, in every northern campaign, with no
//   warning and no throw. The four files that carry tag-addressed cards bind
//   the audience for the length of one answer; this suite proves the binding
//   is there and that it lands.
//
// Everything else is §240's contract applied to the new files: registration,
// ordering, windows, unique ids, a recorded course, and no draw on the seed.
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
  ['931bce', 'events_931bce_years.js', 'EVENTS_931_YEARS', 'ev931y_', -750],
  ['732bce', 'events_732bce_years.js', 'EVENTS_732_YEARS', 'ev732y_', -640],
  ['597bce', 'events_597bce_years.js', 'EVENTS_597_YEARS', 'ev597y_', -500],
];

// Every package each Iron Age chapter plays, for the modifier-id audit.
const CHAPTER_FILES = {
  '931bce': ['events_931bce', 'events_931bce_world', 'events_931bce_years'],
  '732bce': ['events_732bce', 'events_732bce_world', 'events_732bce_years'],
  '597bce': ['events_597bce', 'events_597bce_world', 'events_597bce_years'],
};

// The files that carry cards addressed to a court other than the player's.
const TWO_CHAIR = ['events_931bce', 'events_931bce_years', 'events_732bce', 'events_732bce_years'];

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
    playerTag, rngSeed: 185, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: null,
    bus: { emit() {}, on() { return () => {}; } },
    bookmark: era.bookmark, events: era.events, provinceMap,
  });
  return { game, ctx, era, playerTag };
}

// ---------------------------------------------------------------------------
console.log('== three packages, each registered once, in its own chapter ==');
{
  let total = 0;
  for (const [id, , exp, prefix] of PACKAGES) {
    const pack = loaded.get(id);
    const era = ERAS.find((e) => e.bookmark.id === id);
    ok(Array.isArray(pack) && pack.length >= 4, exp + ': ' + (pack ? pack.length : 0) + ' cards');
    total += pack.length;
    const ids = era.events.filter(Boolean).map((c) => c.id);
    const missing = pack.filter((c) => ids.filter((i) => i === c.id).length !== 1);
    ok(!missing.length, '  every card is in ' + id + ' exactly once'
      + (missing.length ? ' (' + missing.slice(0, 3).map((c) => c.id).join(', ') + ')' : ''));
    const elsewhere = ERAS.filter((e) => e.bookmark.id !== id)
      .filter((e) => e.events.some((c) => c && typeof c.id === 'string' && c.id.startsWith(prefix)));
    ok(!elsewhere.length, '  and in no other chapter'
      + (elsewhere.length ? ' (' + elsewhere.map((e) => e.bookmark.id).join(', ') + ')' : ''));
  }
  ok(total === 33, 'thirty-three cards across the three (' + total + ')');
}

// ---------------------------------------------------------------------------
console.log('== appended after the chapter\'s chain and before the shared pools ==');
{
  const sharedIds = new Set(GENERIC_EVENTS.map((c) => c && c.id).filter(Boolean));
  for (const [id, , , prefix] of PACKAGES) {
    const list = ERAS.find((e) => e.bookmark.id === id).events;
    const mine = [];
    let firstShared = Infinity;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (!c || !c.id) continue;
      if (c.id.startsWith(prefix)) mine.push(i);
      else if (sharedIds.has(c.id) && i < firstShared) firstShared = i;
    }
    const chainEnd = Math.min(...mine);
    const ownChain = list.slice(0, chainEnd).filter((c) => c && c.id && !sharedIds.has(c.id)).length;
    ok(ownChain === chainEnd, id + ': the chapter\'s own chain comes first (' + chainEnd + ' cards)');
    ok(Math.max(...mine) < firstShared, '  and the years package is before the shared pool');
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
    ok(!shared.length, '  and no id shared with any other chapter'
      + (shared.length ? ' (' + shared.map((c) => c.id).join(', ') + ')' : ''));
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
  ok(!declared.length, 'no card declares a chance, a roll or a repeat'
    + (declared.length ? ' (' + declared.slice(0, 4).join(', ') + ')' : ''));

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
console.log('== every option of every card runs clean, from every chair ==');
{
  for (const [id] of PACKAGES) {
    const pack = loaded.get(id);
    const chairs = ERAS.find((e) => e.bookmark.id === id).bookmark.playableTags.map((p) => p.tag);
    let ran = 0;
    const threw = [];
    for (const chair of chairs) {
      for (const c of pack) {
        for (let i = 0; i < c.options.length; i++) {
          const w = boot(id, chair);
          try { c.options[i].effects(w.ctx); ran++; } catch (e) { threw.push(c.id + '#' + i + '@' + chair + ': ' + (e && e.message)); }
          const t = w.game.tags[w.playerTag];
          if (!t || t.alive === false) threw.push(c.id + '#' + i + '@' + chair + ': the realm is gone');
        }
      }
    }
    ok(!threw.length, id + ': ' + ran + ' options run clean across ' + chairs.join('/')
      + (threw.length ? ' (' + threw.slice(0, 3).join(' | ') + ')' : ''));
  }
}

// ---------------------------------------------------------------------------
console.log('== a card addressed to Judah is answered by Judah ==');
{
  // The §216 trap, checked where it actually bites: an Israelite campaign in
  // which Judah's cards resolve silently. Judah's ledger must move and
  // Israel's must not — and then the mirror, so the binding cannot be a
  // constant that happens to name JDH.
  for (const file of TWO_CHAIR) {
    const src = fs.readFileSync(R + '/js/data/' + file + '.js', 'utf8');
    ok(/bindAudience\(_c\.forTag, _o\.effects\)/.test(src) && /let AUDIENCE = null;/.test(src),
      file + ' binds each card to the court it is addressed to');
    ok(/const t = AUDIENCE && ctx\.game\.tags && ctx\.game\.tags\[AUDIENCE\];/.test(src),
      '  and its P() hands that court back');
  }

  const pairs = [
    ['931bce', 'EVENTS_931_YEARS', 'events_931bce_years.js'],
    ['931bce', 'EVENTS_931', 'events_931bce.js'],
    ['732bce', 'EVENTS_732_YEARS', 'events_732bce_years.js'],
    ['732bce', 'EVENTS_732', 'events_732bce.js'],
  ];
  for (const [chapter, exp, file] of pairs) {
    const pack = (await import(R + '/js/data/' + file))[exp];
    for (const [seat, other] of [['ISL', 'JDH'], ['JDH', 'ISL']]) {
      const cards = pack.filter((c) => c.forTag === other);
      if (!cards.length) continue;
      const w = boot(chapter, seat);
      const mine = w.game.tags[seat];
      const theirs = w.game.tags[other];
      if (!mine || !theirs) continue;
      const before = { mine: (mine.modifiers || []).length, theirs: (theirs.modifiers || []).length };
      for (const c of cards) { try { c.options[0].effects(w.ctx); } catch (e) { /* run check owns it */ } }
      const after = { mine: (mine.modifiers || []).length, theirs: (theirs.modifiers || []).length };
      ok(after.mine === before.mine, exp + ': ' + cards.length + ' ' + other
        + ' cards answered in a ' + seat + ' campaign leave ' + seat + '\'s ledger alone ('
        + before.mine + ' → ' + after.mine + ')');
      ok(after.theirs > before.theirs, '  and land on ' + other
        + ' (' + before.theirs + ' → ' + after.theirs + ')');
    }
  }
}

// ---------------------------------------------------------------------------
console.log('== no modifier id is reused across packages in one chapter ==');
{
  // §241's own finding, applied forward: addTagModifier REPLACES by id, so a
  // duplicate across two packages of the same chapter silently overwrites —
  // including a permanent modifier from the chapter's chain. No warning, no
  // throw, and nothing else in the battery would see it.
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
      clashes.push(ch + '/' + modId + ' (' + [...inFiles].join(' + ') + ')');
    }
  }
  ok(!clashes.length, scanned + ' modifier ids scanned, none reused'
    + (clashes.length ? ' (' + clashes.slice(0, 3).join('; ') + ')' : ''));
  // The years packages carry their own prefix so the question cannot come up
  // again the next time somebody adds a card to one of these chapters.
  for (const [, file, , ] of PACKAGES.map((p) => [p[0], p[1], p[2], p[3]])) {
    const src = fs.readFileSync(R + '/js/data/' + file, 'utf8');
    const ids = [...src.matchAll(/mod\(ctx, '([a-z0-9_]+)', '/g)].map((m) => m[1]);
    const stem = 'y' + file.replace(/^events_/, '').replace(/bce?_years\.js$/, '');
    const stray = ids.filter((i) => !i.startsWith(stem + '_'));
    ok(ids.length > 0 && !stray.length, file + ': all ' + ids.length
      + ' modifier ids carry the ' + stem + '_ prefix'
      + (stray.length ? ' (' + stray.slice(0, 3).join(', ') + ')' : ''));
  }
}

// ---------------------------------------------------------------------------
console.log('== the decade claim, on the three chapters this section is for ==');
{
  // The reason these files exist at all. Stated here in §268's own terms so
  // that deleting a card from one of them fails the suite that asked for it.
  for (const [id] of PACKAGES) {
    const b = ERAS.find((e) => e.bookmark.id === id).bookmark;
    const events = ERAS.find((e) => e.bookmark.id === id).events;
    const first = b.startDate.y;
    const last = b.generationHorizon;
    const bucket = {};
    for (const c of events) {
      if (!c || !c.date) continue;
      const d = Math.floor(c.date.y / 10) * 10;
      bucket[d] = (bucket[d] || 0) + 1;
    }
    const thin = [];
    let roomy = 0;
    for (let d = Math.floor(first / 10) * 10; d <= Math.floor(last / 10) * 10; d += 10) {
      const years = Math.min(d + 9, last) - Math.max(d, first) + 1;
      if (years < 5) continue;
      roomy++;
      const n = bucket[d] || 0;
      if (n < 2) thin.push(d + ':' + n);
    }
    ok(!thin.length, id + ': all ' + roomy + ' roomy decades between ' + first
      + ' and ' + last + ' carry two or more' + (thin.length ? ' (' + thin.join(', ') + ')' : ''));
  }
}

console.log(failures ? failures + ' FAILURES' : 'smoke185: ALL PASS');
