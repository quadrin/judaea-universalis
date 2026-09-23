// Headless regression (SPEC §276): Judah may end the split.
//
// The Iron Age chapters gave Judah two hundred years of being the smaller half
// and no way to stop being it. A player who took the north — which in 931 means
// beating a kingdom with three quarters of the people and all the good ground —
// had a bigger Judah and nothing else. `AIS`, All Israel, is what there is to
// show for it, and it is NOT `MLI`: that crown is the Second Temple endgame,
// Judaism and the Law for a charter, four centuries downstream. A chapter that
// can reach one must not offer both.
//
// This suite boots a real 931 BCE game, stages the board the way a player who
// won would have left it, and proclaims the kingdom through the same action the
// panel calls — because the interesting half of this feature is what happens on
// the day it fires, not what the requirement list says.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const fs = await import('node:fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { FORMABLES } = await import(R + '/js/data/formables.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { FLAGS, icon } = await import(R + '/js/ui/icons.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(fs.readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const notes = [];
const bus = { emit(k, v) { if (k === 'notify') notes.push((v && v.title) || ''); }, on() { return () => {}; } };

function boot(id, tag) {
  const entry = ERAS.find((e) => e.bookmark.id === id);
  const bookmark = entry.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const N = MAP_DATA.provinces.length;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let i = 1; i <= N; i++) {
    const a = provinceMap[i];
    for (const j of snap.neighbors[i] || []) {
      const b = provinceMap[j];
      if (a && b && a !== b) { neighbors[a].add(b); neighbors[b].add(a); }
    }
  }
  const geom = {
    neighbors,
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: snap.areas,
  };
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark, events: entry.events,
    playerTag: tag, rngSeed: 276, provinceMap, difficulty: 'normal',
  });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: entry.events, provinceMap });
  return { ctx, game, actions: gameActions(ctx) };
}

const ENTRY = FORMABLES.find((f) => f.id === 'form_ais_jdh');

// ---------------------------------------------------------------------------
console.log('== the crown exists, and is told apart from the one downstream ==');
{
  const def = (DEFINES.NATIONS || DEFINES.TAGS || {}).AIS;
  ok(!!def, 'AIS is in the catalog');
  ok(def.religion === 'yahwism',
    'and keeps the age\'s own faith, not Judaism (' + def.religion + ')');
  ok(def.culture === 'judean',
    'its culture is judean, so Judah\'s own cells do not stop being its own on the day '
      + 'it is proclaimed (' + def.culture + ')');
  ok(def.capital === 'Jerusalem', 'seated at Jerusalem');
  ok((DEFINES.GOV_OF || {}).AIS === 'monarchy', 'and it is a monarchy');
  ok(!!(DEFINES.PERSONALITY || {}).AIS || !!(DEFINES.AI_PERSONALITY || {}).AIS
    || JSON.stringify(DEFINES).indexOf('"AIS"') >= 0, 'it has a temper on file');
  ok(!!FLAGS.AIS, 'and an emblem of its own');
  ok(FLAGS.AIS !== FLAGS.MLI && FLAGS.AIS !== FLAGS.ISL && FLAGS.AIS !== FLAGS.JDH,
    '  told apart from Israel, Judah and the Kingdom of Israel at a glance');
  ok(!/hexagram/.test(String(FLAGS.AIS)),
    '  and it is not the hexagram, which is MLI\'s');
}

// ---------------------------------------------------------------------------
console.log('== every cell and icon the crown names is real ==');
{
  const names = new Set(MAP_DATA.provinces.map((p) => p.name));
  const src = fs.readFileSync(R + '/js/data/formables.js', 'utf8');
  const start = src.indexOf('const ALL_ISRAEL_CELLS');
  const block = src.slice(start, src.indexOf('];', start))
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  const cells = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const unknown = cells.filter((c) => !names.has(c));
  ok(cells.length >= 7 && !unknown.length,
    cells.length + ' named cells all exist on the map'
      + (unknown.length ? ' — UNKNOWN: ' + unknown.join(', ') : ''));
  const blank = (ENTRY.missions || []).filter((m) => m && m.icon && !icon(m.icon));
  ok(!blank.length, 'every mission icon renders'
    + (blank.length ? ' — blank: ' + blank.map((m) => m.icon).join(', ') : ''));
  const ids = (ENTRY.missions || []).map((m) => m.id);
  ok(new Set(ids).size === ids.length, 'mission ids are unique (' + ids.length + ')');
  const known = new Set(ids);
  const dangling = (ENTRY.missions || []).flatMap((m) => (m.requires || []))
    .filter((r) => !known.has(r));
  ok(!dangling.length, 'every prerequisite names a mission in the chain'
    + (dangling.length ? ' — ' + dangling.join(', ') : ''));
}

// ---------------------------------------------------------------------------
console.log('== it is offered to Judah in the Iron Age and nowhere else ==');
{
  ok(ENTRY && ENTRY.from === 'JDH' && ENTRY.to === 'AIS', 'the road runs JDH → AIS');
  ok(JSON.stringify(ENTRY.bookmarks) === JSON.stringify(['931bce', '732bce', '597bce']),
    'in exactly the three Iron Age chapters');
  ok(!ENTRY.ai, 'and it is player-only, like the other restorations');
  // No other chapter's list changed: MLI is still what the later chapters offer.
  const mli = FORMABLES.filter((f) => f.to === 'MLI');
  ok(mli.length >= 5, 'the MLI roads are untouched (' + mli.length + ')');
  ok(!mli.some((f) => (f.bookmarks || []).some((b) => /^(931|732|597)bce$/.test(b))),
    'and none of them reaches into the Iron Age');
  ok(!FORMABLES.some((f) => f !== ENTRY && f.to === 'AIS'),
    'AIS has exactly one road to it');
}

// ---------------------------------------------------------------------------
console.log('== at the opening it is offered and refused ==');
{
  const { actions } = boot('931bce', 'JDH');
  // Formables ride the decisions surface (SPEC §22): one entry per crown,
  // keyed by the formable's id, with the requirement checklist in its desc.
  const list = actions.getDecisions();
  ok(Array.isArray(list) && list.length, 'the panel can list Judah\'s decisions');
  const row = list.find((r) => r.key === 'form_ais_jdh');
  ok(!!row, 'and All Israel is on it from the first month — the road is visible');
  ok(row && !row.canEnact, 'but not enactable in 931 with the north standing');
  const unmet = row ? row.desc.split('\n').filter((l) => l.indexOf('\u2717') === 0) : [];
  ok(unmet.some((l) => /northern kingdom is finished/.test(l)),
    '  the north still being a kingdom is one of the reasons');
  ok(unmet.some((l) => /Sebaste/.test(l)),
    '  and Samaria not being ours is another');
  const ticks = row ? row.desc.split('\n').filter((l) => /^[\u2713\u2717]/.test(l)) : [];
  ok(ticks.length === 8, '  all eight rows are shown, ticked or not (' + ticks.length + ')');
}

// ---------------------------------------------------------------------------
console.log('== on a won board it fires, and the north is written in ==');
{
  const { ctx, game, actions } = boot('931bce', 'JDH');
  // Stage the board a player who won would have left: Judah holds the north.
  for (const p of game.provinces) {
    if (!p || p.impassable) continue;
    if (p.owner === 'ISL' || p.controller === 'ISL') { p.owner = 'JDH'; p.controller = 'JDH'; }
  }
  game.tags.ISL.alive = false;
  const jdh = game.tags.JDH;
  jdh.stability = 2;
  jdh.legitimacy = 85;
  jdh.atWarWith = [];
  for (const w of game.wars || []) { w.attackers = []; w.defenders = []; }

  const northBefore = game.provinces.filter((p) => p && !p.impassable
    && p.owner === 'JDH' && p.culture === 'israelite');
  ok(northBefore.length >= 10,
    northBefore.length + ' Israelite districts are now Judah\'s by conquest');
  ok(northBefore.every((p) => !(p.integration >= 1)),
    '  and none of them is entered in its rolls — they are held, not owned');

  const row = actions.getDecisions().find((r) => r.key === 'form_ais_jdh');
  ok(row && row.canEnact, 'every requirement is met'
    + (row && !row.canEnact
      ? ' — unmet: ' + row.desc.split('\n').filter((l) => l.indexOf('\u2717') === 0).join('; ')
      : ''));

  const treasuryBefore = jdh.treasury;
  actions.enactDecision('form_ais_jdh');

  const ais = game.tags.AIS;
  ok(!!ais && !game.tags.JDH, 'Judah is no more and All Israel stands');
  ok(ais.name === 'United Kingdom of Israel', 'it wears its own name (' + (ais && ais.name) + ')');
  ok(game.playerTag === 'JDH' || game.tagAliases.JDH === 'AIS',
    'and the chapter\'s cards can still find it by the name they were written with');
  ok(ais.ruler && /King of Israel/.test(String(ais.ruler.title || '')),
    'the man who proclaimed it is styled by it (' + (ais.ruler && ais.ruler.title) + ')');
  ok((ais.modifiers || []).some((m) => m.id === 'ais_the_two_sticks')
    && (ais.modifiers || []).some((m) => m.id === 'ais_the_house_of_david'),
  'both of the crown\'s permanent modifiers are on');
  ok(ais.treasury >= treasuryBefore + 200, 'the crown paid its grant');
  ok(ais.missionIdx === 0 && Array.isArray(ais.missionsDone) && !ais.missionsDone.length,
    'and its own mission chain starts fresh');

  // The whole point of the decision.
  const north = game.provinces.filter((p) => p && !p.impassable
    && p.owner === 'AIS' && p.culture === 'israelite');
  ok(north.length === northBefore.length, 'the north is still all there');
  ok(north.every((p) => p.integration >= 1),
    'AND EVERY ISRAELITE DISTRICT IS WRITTEN INTO THE ROLLS — '
      + north.filter((p) => p.integration >= 1).length + ' of ' + north.length);
  // Judah's own cells did not quietly stop being Judah's.
  const judean = game.provinces.filter((p) => p && !p.impassable
    && p.owner === 'AIS' && p.culture === 'judean');
  ok(judean.length >= 8 && judean.every((p) => p.culture === (DEFINES.NATIONS || DEFINES.TAGS).AIS.culture),
    'and Judah\'s own ' + judean.length + ' cells are still the crown\'s own culture');
}

// ---------------------------------------------------------------------------
console.log('== the hook is a real hook, not a comment ==');
{
  // The onForm hook is guarded at both call sites, which means a broken one
  // fails SILENTLY. Fire it directly against a board it should change, and
  // then against one it should not, so a no-op cannot pass as a success.
  const said = [];
  const provs = [null,
    { name: 'A', owner: 'AIS', controller: 'AIS', culture: 'israelite' },
    { name: 'B', owner: 'AIS', controller: 'AIS', culture: 'israelite', integration: 1 },
    { name: 'C', owner: 'AIS', controller: 'AIS', culture: 'judean' },
    { name: 'D', owner: 'OTH', controller: 'OTH', culture: 'israelite' }];
  const ctx = {
    game: { provinces: provs, tags: {}, flags: {} },
    prov: (n) => provs.find((p) => p && p.name === n) || null,
    helpers: { chronicle: (c, k, t) => said.push(t) },
  };
  ENTRY.bonus.onForm(ctx, 'AIS');
  ok(provs[1].integration >= 1, 'an unentered Israelite district of ours is entered');
  ok(provs[3].integration === undefined, 'a judean one is left alone — it was never foreign');
  ok(provs[4].integration === undefined, 'and somebody else\'s district is not ours to enter');
  ok(said.length === 1 && /written into the rolls/.test(said[0]),
    'the chronicle says what happened: ' + (said[0] || '(nothing)').slice(0, 70));
  ok(/1 district\b/.test(said[0]), '  and counts in the singular when there is one');
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
