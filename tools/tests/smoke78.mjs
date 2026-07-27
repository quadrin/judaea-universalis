// Headless regression — SPEC §110 (the pen widens, and the crown gets one of
// its own) and SPEC §111 (the 167 chapter stops being a century in which only
// Judaea happens).
//
// Two bugs are pinned here. The first is quiet: a Jewish state whose culture is
// judean could only sign a province Hebrew where the population was *judean*
// too, so a Herodian or an Adiabenian crown — Idumean and Assyrian courts of
// the same faith — could reach the condition on three provinces between them
// and never wrote a Hebrew signpost anywhere. The second is loud: an
// over-successful Judaea kept Judah Maccabee in the seat until he was fifty-six
// and then handed the realm to his great-nephew, while Rome sat on eleven
// provinces in Italy for a hundred years.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { JEWISH_INTEGRATED_NAMES, TAG_INTEGRATED_NAMES } = await import(R + '/js/data/integrated_names.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { monthlyIntegration } = await import(R + '/js/sim/realm.js');
const { changeOwnerCore, switchTagCore } = await import(R + '/js/sim/military.js');
const { tickDay } = await import(R + '/js/sim/tick.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const EV = (ERAS.find((e) => e.bookmark.id === '167bce') || {}).events || [];
const byId = (id) => EV.find((e) => e && e.id === id);
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));

function realGeom(bookmark) {
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const N = snap.neighbors.length - 1;
  const to = (id) => provinceMap[id] || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    for (const nb of snap.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  return {
    provinceMap,
    geom: {
      neighbors,
      centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
      coastal: snap.coastal.map(Boolean),
      offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
      areas: Int32Array.from(snap.areas), bbox: [],
    },
  };
}

function boot(bookmark, playerTag, events, seed = 11) {
  const { provinceMap, geom } = realGeom(bookmark);
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events, provinceMap });
  return { game, ctx, geom, actions: gameActions(ctx) };
}

const provByCanon = (g, canon) => {
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && p.canon === canon) return p;
  }
  return null;
};

// Three completed Integrate programs plus a community of the crown's own faith
// planted in the province — the two halves SPEC §95 asks for.
function integrateFully(ctx, g, p, tag, culture) {
  if (p.owner !== tag) { changeOwnerCore(ctx, p, tag); p.controller = tag; }
  const t = g.tags[tag];
  if (t && t.religion === 'judaism') {
    ctx.helpers.addPopulation(ctx, p.name, { r: 'judaism', c: culture || t.culture, n: 4000 });
  }
  for (let round = 0; round < 3; round++) {
    p.integrating = { by: tag, monthsLeft: 1 };
    monthlyIntegration(ctx);
  }
}

console.log('== §110: the pen reaches the places it had left blank ==');
{
  // Each of these is a town the register named and the file did not. They are
  // asserted by table rather than by gameplay because the point of the entry is
  // that it EXISTS — the gameplay path is exercised below.
  const WANT = {
    Masada: 'Metzada', Tarichaea: 'Migdal', Rafah: 'Rafiah', Jenin: 'Ein Ganim',
    Ramallah: 'Ramah', Rhinocolura: 'Nahal Mitzrayim', Petra: 'Rekem',
    Bostra: 'Botzrah', 'Caesarea Philippi': 'Panias', Yathrib: 'Yatrib',
    Khaybar: 'Heivar', Berytus: 'Berotai', Tripolis: 'Trablus', Emesa: 'Hims',
    Laodicea: 'Ludkia', Apamea: 'Afamia', Roma: 'Romi',
  };
  const missing = Object.keys(WANT).filter((k) => JEWISH_INTEGRATED_NAMES[k] !== WANT[k]);
  ok(!missing.length, 'all seventeen new entries are in the shared pen'
    + (missing.length ? ' (missing/wrong: ' + missing.join(', ') + ')' : ''));

  // The file's own rule, restated as a test: it is a conservative pen, not a
  // Hebrew-name generator. These five have no defensible attestation and must
  // stay unsigned however tempting the gap looks.
  const LEAVE = ['Khan Yunis', 'Qalqilya', 'Tulkarm', 'Gadora', 'Hatra'];
  const invented = LEAVE.filter((k) => JEWISH_INTEGRATED_NAMES[k]);
  ok(!invented.length, 'and the five with no attestation are still left alone'
    + (invented.length ? ' (invented: ' + invented.join(', ') + ')' : ''));

  // Transliteration house style: unpointed ASCII, no combining diacritics.
  const pointed = Object.values(JEWISH_INTEGRATED_NAMES)
    .filter((v) => typeof v === 'string' && /[^\x00-\x7F]/.test(v.normalize('NFD').replace(/[’‘]/g, "'")));
  ok(!pointed.length, 'the whole table is unpointed ASCII'
    + (pointed.length ? ' (pointed: ' + pointed.join(', ') + ')' : ''));
}

console.log('== §110: an Idumean court of the Jewish faith can sign a signpost ==');
{
  // The bug: `ownersCommunity` demanded the province hold a community of the
  // crown's EXACT culture. Herod's court is idumean; a judean community in
  // Jerusalem did not count, so the Herodian kingdom — a Jewish state by every
  // other measure in the game — never wrote a Hebrew name anywhere.
  const { game, ctx } = boot(BOOKMARK_614, 'JUD', []);
  const her = game.tags.HER || game.tags.JUD;
  const t = game.tags.JUD;
  t.culture = 'idumean';
  t.religion = 'judaism';
  ok(!!her, 'a court is on the board to test with');
  const p = provByCanon(game, 'Jericho');
  // A judean community — a DIFFERENT culture from the idumean crown, same group.
  integrateFully(ctx, game, p, 'JUD', 'judean');
  ok(p.name === 'Yeriho',
    'an idumean crown with a judean congregation writes Yeriho (got "' + p.name + '")');

  // The relaxation is to the culture GROUP, not to anything at all: a Greek
  // community of the same faith is not the same kind of people.
  const { game: g2, ctx: c2 } = boot(BOOKMARK_614, 'JUD', []);
  g2.tags.JUD.culture = 'idumean';
  const q = provByCanon(g2, 'Jericho');
  changeOwnerCore(c2, q, 'JUD'); q.controller = 'JUD';
  c2.helpers.addPopulation(c2, q.name, { r: 'judaism', c: 'greek', n: 9000 });
  for (const e of (q.pop || [])) if (e && e.c !== 'greek') e.n = 0;
  for (let round = 0; round < 3; round++) {
    q.integrating = { by: 'JUD', monthsLeft: 1 };
    monthlyIntegration(c2);
  }
  ok(q.name !== 'Yeriho',
    'but a hellenized congregation alone does not (got "' + q.name + '")');
}

console.log('== §110: the Kingdom of Israel keeps a register of its own ==');
{
  const { game, ctx } = boot(BOOKMARK_614, 'JUD', []);
  ok(!!TAG_INTEGRATED_NAMES.MLI, 'MLI has a crown pen');
  ok(Object.keys(TAG_INTEGRATED_NAMES.MLI).length === 12,
    'with twelve entries, one per allotment (got '
    + Object.keys(TAG_INTEGRATED_NAMES.MLI).length + ')');
  // Every key is a province the map actually has — a crown pen that names
  // towns nobody can own is a typo, not a register.
  const canon = new Set(MAP_DATA.provinces.filter(Boolean).map((p) => p.name));
  const unknown = Object.keys(TAG_INTEGRATED_NAMES.MLI).filter((k) => !canon.has(k));
  ok(!unknown.length, 'and every allotment names a real province'
    + (unknown.length ? ' (unknown: ' + unknown.join(', ') + ')' : ''));
  ok(switchTagCore(ctx, 'JUD', 'MLI'), 'Judaea proclaims the Kingdom of Israel');
  const bat = provByCanon(game, 'Batanea');
  integrateFully(ctx, game, bat, 'MLI');
  ok(bat.name === 'Bashan', 'Batanea is signed Bashan by the crown pen (got "' + bat.name + '")');
  const seb = provByCanon(game, 'Sebaste');
  integrateFully(ctx, game, seb, 'MLI');
  ok(seb.name === 'Har Ephraim', 'Sebaste becomes Har Ephraim (got "' + seb.name + '")');
  // Precedence: the crown pen outranks the shared one where both speak.
  ok(TAG_INTEGRATED_NAMES.MLI['Caesarea Philippi'] === 'Dan'
    && JEWISH_INTEGRATED_NAMES['Caesarea Philippi'] === 'Panias',
    'Caesarea Philippi is Panias to everyone and Dan to the Kingdom of Israel');
  const cp = provByCanon(game, 'Caesarea Philippi');
  if (cp) {
    integrateFully(ctx, game, cp, 'MLI');
    ok(cp.name === 'Dan', 'and the crown wins the contest (got "' + cp.name + '")');
  } else ok(true, '(Caesarea Philippi is off this bookmark; table precedence checked above)');
}

console.log('== §111: the chapter has a world outside Judaea ==');
{
  const world = EV.filter((e) => e && /^ev_w_/.test(e.id));
  ok(world.length >= 8, 'the 167 chain carries ' + world.length + ' spine cards');
  const notices = world.filter((e) => e.world === true);
  ok(notices.length >= 6, 'of which ' + notices.length + ' are world notices — before this '
    + 'file the chapter had exactly none');
  const years = notices.map((e) => e.date && e.date.y).filter((y) => typeof y === 'number');
  ok(Math.min(...years) <= -146 && Math.max(...years) >= -64,
    'and they span ' + Math.min(...years) + ' to ' + Math.max(...years)
    + ', from Carthage to Pompey');
  const dup = world.filter((e, i) => EV.findIndex((x) => x.id === e.id) !== EV.indexOf(e) || world.findIndex((x) => x.id === e.id) !== i);
  ok(!dup.length, 'no id collides with the chain it was added to');
  ok(world.every((e) => !(e.date && e.trigger)),
    'and none of them is both a date and a trigger');
}

console.log('== §111: the house of Mattathias is mortal ==');
{
  const ev = byId('ev_w_generation_passes');
  ok(!!ev, 'the succession backstop exists');
  ok(ev.options.length === 2, 'and offers a real choice (' + ev.options.length + ' options)');
  ok(ev.once === false && ev.cooldownMonths > 0,
    'it is repeatable, because there are three brothers to bury');

  // A Judah still in the seat well past his year — the exact state the reported
  // game was in.
  const { game, ctx } = boot(BOOKMARK_167, 'HAS', EV);
  game.tags.HAS.ruler = { name: 'Judah Maccabee', title: 'Captain of Israel', gov: 3, infl: 4, mar: 6, age: 52 };
  game.date.y = -150;
  ok(ev.trigger(ctx), 'an overdue Judah trips the trigger');
  ev.options[0].effects(ctx);
  ok(game.tags.HAS.ruler.name === 'Jonathan Apphus',
    'and Jonathan takes up the command (got "' + game.tags.HAS.ruler.name + '")');
  ok(game.tags.HAS.heir && game.tags.HAS.heir.name === 'Simon Thassi',
    'with Simon named after him');
  ok(game.flags.judahFallen === true, 'the chronicle knows Judah is gone');
  ok(!ev.trigger(ctx), 'and the card does not fire again on the man it just seated');

  // Second and third steps of the sequence, on the assembly branch.
  game.date.y = -138;
  game.tags.HAS.ruler.age = 60;
  ok(ev.trigger(ctx), 'Jonathan in turn becomes overdue');
  const before = game.tags.HAS.legitimacy;
  ev.options[1].effects(ctx);
  ok(game.tags.HAS.ruler.name === 'Simon Thassi',
    'the great assembly confirms Simon (got "' + game.tags.HAS.ruler.name + '")');
  ok(game.tags.HAS.legitimacy > before,
    'and confirmation by the nation pays in legitimacy, unlike succession by right');
  game.date.y = -126;
  ok(ev.trigger(ctx), 'Simon too is mortal');
  ev.options[0].effects(ctx);
  ok(game.tags.HAS.ruler.name === 'John Hyrcanus',
    'and the son inherits (got "' + game.tags.HAS.ruler.name + '")');
  ok(!ev.trigger(ctx), 'after which the backstop has nobody left to bury');
}

console.log('== §111: the Seleucid empire is eaten in the order it was eaten ==');
{
  // The first draft of this spine handed Tigranes every Seleucid province on
  // the board, which turned Armenia into a 56-province empire that never
  // existed. The century has two bites and they do not overlap: Parthia takes
  // the East in 141 and keeps it, Armenia takes Syria in 83 and loses it to
  // Rome in 64.
  const { game, ctx } = boot(BOOKMARK_167, 'HAS', EV);
  const held = (tag) => {
    let n = 0;
    for (let i = 1; i < game.provinces.length; i++) {
      const p = game.provinces[i];
      if (p && !p.impassable && p.owner === tag) n++;
    }
    return n;
  };
  const sel0 = held('SEL');
  ok(sel0 > 60, 'the empire opens at ' + sel0 + ' provinces');

  byId('ev_w_parthia_takes_babylon').options[0].effects(ctx);
  const parGain = held('PAR');
  ok(parGain >= 14, 'Parthia takes the East: ' + parGain + ' provinces');
  ok(held('SEL') < sel0 - 12, 'and the empire is down to ' + held('SEL'));
  const babylon = provByCanon(game, 'Babylon');
  ok(babylon && babylon.owner === 'PAR', 'Babylon is Arsacid');
  const antioch = provByCanon(game, 'Antioch');
  ok(antioch && antioch.owner === 'SEL', 'Antioch is not — the Euphrates is the line');

  const selMid = held('SEL');
  byId('ev_w_tigranes_antioch').options[0].effects(ctx);
  const arm = held('ARM');
  ok(arm < 32, 'Tigranes takes Syria and no more: Armenia at ' + arm + ' provinces');
  ok(antioch.owner === 'ARM', 'Antioch strikes coin with his tiara on it');
  ok(babylon.owner === 'PAR', 'and he does not get Babylonia back off Parthia');
  ok(held('SEL') > 0 && held('SEL') < selMid,
    'a Seleucid rump survives in the south (' + held('SEL') + ' provinces) rather than the map going blank');

  byId('ev_w_pompey_organizes').options[0].effects(ctx);
  ok(antioch.owner === 'ROM', 'Pompey takes Antioch off Tigranes');
  ok(held('ARM') < arm, 'Armenia is reduced to Armenia (' + arm + ' → ' + held('ARM') + ')');
  ok(babylon.owner === 'PAR', 'and Rome stops at the Euphrates, as the treaty said');
  const samosata = provByCanon(game, 'Samosata');
  ok(!samosata || samosata.owner !== 'ROM',
    'Commagene stays a client kingdom rather than a province');
}

console.log('== §111: Rome reacts to a Judaea that has outgrown the revolt ==');
{
  const ev = byId('ev_w_senate_asks');
  ok(!!ev, 'the Senate has something to say about a great Judaea');
  ok(!!ev.trigger && !ev.date, 'and says it on a condition, not on a date');
  const { game, ctx } = boot(BOOKMARK_167, 'HAS', EV);
  game.date.y = -130;
  ok(!ev.trigger(ctx), 'a Judaea the size of the revolt does not summon it');
  let taken = 0;
  for (let i = 1; i < game.provinces.length && taken < 20; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'SEL') { p.owner = 'HAS'; p.controller = 'HAS'; taken++; }
  }
  ok(ev.trigger(ctx), 'a Judaea holding the Levant does');
}

console.log('== §111: a century of play buries the brothers and moves Rome ==');
{
  // The reported bug end to end: an over-successful Judaea, run forward by the
  // AI on the historical option throughout.
  const { game, ctx, actions } = boot(BOOKMARK_167, 'HAS', EV);
  game.tags.HAS.ai = true;
  game.paused = false;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'SEL'
      && ['judean', 'galilean', 'samaritan', 'idumean'].includes(p.culture)) {
      p.owner = 'HAS'; p.controller = 'HAS';
    }
  }
  ctx.helpers.adjust(ctx, 'HAS', { manpower: 40000, treasury: 2000 });
  const romeAt = (y) => {
    let n = 0;
    for (let i = 1; i < game.provinces.length; i++) {
      const p = game.provinces[i];
      if (p && !p.impassable && p.owner === 'ROM') n++;
    }
    return n;
  };
  const romeStart = romeAt();
  const rulers = [];
  const worldFired = new Set();
  for (let y = 0; y < 100; y++) {
    for (let d = 0; d < 360; d++) {
      tickDay(ctx);
      while (game.pendingEvents.length) {
        const pe = game.pendingEvents[0];
        const e = EV.find((x) => x.id === pe.eventId);
        if (/^ev_w_/.test(pe.eventId)) worldFired.add(pe.eventId);
        try { actions.chooseEventOption(pe.instanceId, (e && e.aiOption) || 0); }
        catch (err) { game.pendingEvents.shift(); }
        game.paused = false;
      }
      if (game.paused) game.paused = false;
      if (game.over) game.over = false;
    }
    const r = game.tags.HAS && game.tags.HAS.ruler;
    const nm = r ? r.name : '(none)';
    if (rulers[rulers.length - 1] !== nm) rulers.push(nm);
  }
  const seat = (n) => rulers.indexOf(n);
  ok(seat('Judah Maccabee') === 0, 'the century opens with Judah');
  ok(seat('Jonathan Apphus') > 0, 'Jonathan reaches the seat (order: ' + rulers.join(' → ') + ')');
  ok(seat('Simon Thassi') > seat('Jonathan Apphus'), 'then Simon');
  ok(seat('John Hyrcanus') > seat('Simon Thassi'),
    'and only then Hyrcanus — never straight from Judah, which was the bug');
  const judah = rulers.indexOf('Judah Maccabee');
  ok(judah === 0 && rulers.length >= 5,
    'no Maccabee outlives the chapter: ' + rulers.length + ' rulers in a hundred years');
  ok(romeAt() > romeStart,
    'and Rome does not sit still: ' + romeStart + ' provinces → ' + romeAt());
  ok(worldFired.size >= 6,
    worldFired.size + ' spine cards fired in a single playthrough');
}

console.log(failures ? `smoke78: ${failures} FAIL` : 'smoke78: ALL PASS');
process.exit(failures ? 1 : 0);
