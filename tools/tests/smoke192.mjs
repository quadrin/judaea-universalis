// Headless regression (SPEC §277): when a world card says an empire fell, the
// map says so too.
//
// Reported from play: "Babylon falls" did not make Babylon fall. It did not.
// The card applied a −65% modifier to the dead empire and a +25% one to the
// live one, and Babylon kept all fifty-one of its provinces and went on
// governing them — a stat line where an event should be. Damascus was worse:
// its own chronicle line says the city "becomes three Assyrian provinces" and
// the three of them stayed Aramaean for ever.
//
// The mechanism was never missing. SPEC §111 and `events_167bce_provinces.js`
// have had the convention for a long time — a world card rearranges what
// history rearranged and never confiscates what the player took. The Iron Age
// world spines simply never adopted it.
//
// This suite fires each card on a real board and checks the ground moved. It
// also stages a player conquest in front of every one of them, because the
// interesting failure is not "nothing happened", it is "the card helpfully
// handed Persia the province you bled for".
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const fs = await import('node:fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(fs.readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const bus = { emit() {}, on() { return () => {}; } };

function boot(id, tag) {
  const entry = ERAS.find((e) => e.bookmark.id === id);
  const b = entry.bookmark;
  const pm = buildProvinceMapping(MAP_DATA, b);
  const N = MAP_DATA.provinces.length;
  const nb = Array.from({ length: N + 1 }, () => new Set());
  for (let i = 1; i <= N; i++) {
    const a = pm[i];
    for (const j of snap.neighbors[i] || []) {
      const c = pm[j];
      if (a && c && a !== c) { nb[a].add(c); nb[c].add(a); }
    }
  }
  const geom = {
    neighbors: nb,
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: snap.areas,
  };
  const g = initGame({
    DEFINES, MAP_DATA, geom, bookmark: b, events: entry.events,
    playerTag: tag, rngSeed: 277, provinceMap: pm, difficulty: 'normal',
  });
  const ctx = makeCtx({ game: g, DEFINES, MAP_DATA, geom, bus, bookmark: b, events: entry.events, provinceMap: pm });
  const count = (t) => g.provinces.filter((p) => p && !p.impassable && p.owner === t).length;
  const fire = (cardId) => {
    const c = entry.events.find((e) => e && e.id === cardId);
    if (!c) throw new Error('no card ' + cardId);
    c.options[0].effects(ctx);
  };
  const alive = (t) => !!(g.tags[t] && g.tags[t].alive !== false);
  return { g, ctx, count, fire, alive };
}

// Take one province off the doomed court, so every card below has to prove it
// does not hand the player's own conquest to the victor.
function seize(o, from, to) {
  const p = o.g.provinces.find((q) => q && !q.impassable && q.owner === from);
  if (p) { p.owner = to; p.controller = to; }
  return p;
}

// ---------------------------------------------------------------------------
console.log('== 931: Damascus becomes three Assyrian provinces ==');
{
  const o = boot('931bce', 'JDH');
  const before = o.count('DMS');
  const asr = o.count('ASR');
  ok(before === 3, 'Aram holds its three provinces (' + before + ')');
  o.fire('ev931w_damascus_falls');
  ok(o.count('DMS') === 0, 'and holds none afterwards (' + o.count('DMS') + ')');
  ok(o.count('ASR') === asr + 3, 'Assyria holds three more (' + asr + ' → ' + o.count('ASR') + ')');
  ok(!o.alive('DMS'), 'and the kingdom of Aram has ended');
}

// ---------------------------------------------------------------------------
console.log('== 732: Nineveh divides Mesopotamia, Carchemish ends the rump ==');
{
  const o = boot('732bce', 'JDH');
  const mine = seize(o, 'ASR', 'JDH');
  const asr0 = o.count('ASR');
  const bbl0 = o.count('BBL');
  const mda0 = o.count('MDA');
  ok(asr0 > 25, 'Assyria opens holding ' + asr0 + ' provinces');

  o.fire('ev732w_nineveh_falls');
  ok(o.count('MDA') > mda0, 'Media takes the north and the Zagros side ('
    + mda0 + ' → ' + o.count('MDA') + ')');
  ok(o.count('BBL') > bbl0, 'Babylon takes the rest of Mesopotamia ('
    + bbl0 + ' → ' + o.count('BBL') + ')');
  ok(o.count('ASR') < asr0, 'Assyria is smaller (' + asr0 + ' → ' + o.count('ASR') + ')');
  ok(o.alive('ASR'),
    '  but 612 did NOT end it — the Harran rump held the west until 605, which is why '
      + 'Egypt marched north in 609');

  const rump = o.count('ASR');
  o.fire('ev732w_carchemish');
  ok(o.count('ASR') === 0, 'and at Carchemish it holds nothing (' + o.count('ASR') + ')');
  ok(!o.alive('ASR'), 'the last Assyrian government has ended');
  ok(o.count('BBL') >= rump, 'everything it held answers to Babylon');
  ok(mine && mine.owner === 'JDH',
    'AND THE PROVINCE THE PLAYER TOOK IS STILL THE PLAYER\'S, through both cards');
  ok((o.g.tagAliases || {}).ASR === 'BBL',
    'the forwarding address is kept, so cards written against Assyria still find a court');
}

// ---------------------------------------------------------------------------
console.log('== 597: Lydia, Babylon, and Egypt made a satrapy ==');
{
  const o = boot('597bce', 'JDH');
  const lyd0 = o.count('LYD');
  ok(lyd0 > 0, 'Lydia opens holding ' + lyd0 + ' provinces');
  o.fire('ev597w_croesus_crosses_the_halys');
  ok(o.count('LYD') === 0 && !o.alive('LYD'),
    'after Sardis the kingdom of Lydia is finished, as its own tooltip always said');

  const mine = seize(o, 'BBL', 'JDH');
  const bbl0 = o.count('BBL');
  const pas0 = o.count('PAS');
  ok(bbl0 > 40, 'Babylon holds ' + bbl0 + ' provinces on the eve of 539');
  o.fire('ev597w_babylon_falls');
  ok(o.count('BBL') === 0, 'and none afterwards (' + o.count('BBL') + ')');
  ok(!o.alive('BBL'), 'the empire has ended');
  ok(o.count('PAS') >= pas0 + bbl0, 'Persia holds them all ('
    + pas0 + ' → ' + o.count('PAS') + ')');
  ok(mine && mine.owner === 'JDH', 'and the player kept what it took off Babylon');
  ok((o.g.tagAliases || {}).BBL === 'PAS', 'with the forwarding address kept');

  // Egypt is a SATRAPY, not a deletion: it revolts again in 463 under Inaros,
  // in this chapter's own Persian package.
  const miz0 = o.count('MIZ');
  o.fire('ev597w_cambyses_takes_egypt');
  ok(o.alive('MIZ') && o.count('MIZ') === miz0,
    'Egypt keeps its name and its land — it is made a satrapy, not deleted');
  ok(o.g.tags.MIZ.overlord === 'PAS',
    '  and answers to Persia, which is what "becomes a satrapy" means on this map');
  const inaros = ERAS.find((e) => e.bookmark.id === '597bce').events
    .find((e) => e && e.id === 'ev597p_the_lord_of_the_marshes');
  ok(!!inaros, '  and the revolt that needs Egypt to still exist is still in the chapter');
}

// ---------------------------------------------------------------------------
console.log('== the rule: a card never confiscates a living third party ==');
{
  // The §111 guarantee, stated as a property rather than a spot check: after
  // Babylon falls, no province that belonged to somebody ELSE changed hands.
  const o = boot('597bce', 'JDH');
  const before = new Map();
  for (const p of o.g.provinces) {
    if (p && !p.impassable && p.owner && p.owner !== 'BBL') before.set(p.name, p.owner);
  }
  o.fire('ev597w_babylon_falls');
  const moved = [];
  for (const p of o.g.provinces) {
    if (!p || p.impassable || !before.has(p.name)) continue;
    if (before.get(p.name) !== p.owner) moved.push(p.name + ': ' + before.get(p.name) + ' → ' + p.owner);
  }
  ok(!moved.length, before.size + ' provinces belonging to other courts were left alone'
    + (moved.length ? ' — MOVED: ' + moved.slice(0, 5).join('; ') : ''));
}

// ---------------------------------------------------------------------------
console.log('== a fall never deletes the player\'s own chair ==');
{
  // dissolveTagCore would MOVE a human out of a court it deletes, which is
  // correct engine behaviour and the wrong thing for a piece of world news to
  // do unasked. Every helper here refuses instead.
  const o = boot('597bce', 'JDH');
  o.g.playerTag = 'BBL';               // as if a chapter seated the player there
  const held = o.count('BBL');
  o.fire('ev597w_babylon_falls');
  ok(o.g.playerTag === 'BBL', 'the player is still sitting in their own court');
  ok(o.alive('BBL') && o.count('BBL') === held,
    '  and it still holds its ' + o.count('BBL') + ' provinces — the card stood down');
}

// ---------------------------------------------------------------------------
console.log('== the later chapters: the Ptolemies and the Goths ==');
{
  const o = boot('40bce', 'HER');
  const pto0 = o.count('PTO');
  ok(pto0 > 10, 'the Ptolemaic kingdom holds ' + pto0 + ' provinces');
  // The card's own condition for the end: Rome at Alexandria.
  const alex = o.g.provinces.find((p) => p && p.name === 'Alexandria');
  if (alex) alex.controller = 'ROM';
  o.fire('ev5_alexandria');
  ok(o.count('PTO') === 0 && !o.alive('PTO'),
    'with Rome in Alexandria the court reaches its end on the live map, as it always claimed');
  ok(o.count('ROM') >= pto0, 'and the provinces enter the Roman census');
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
