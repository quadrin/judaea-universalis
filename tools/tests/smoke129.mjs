// Headless regression — SPEC §200: the trees grow to their chapters' size,
// and the clients get their own wars.
//
// §196 finished the last pass with the principals at 13–18 nodes and the
// client chairs at 11–14, which is a mission tree the size of a tutorial in
// chapters that run for centuries. This section is the growth pass: every
// playable side out to 18–23 nodes, five new forks with real cards behind
// them, and — the thing the roster never offered — two wars of independence
// a player can actually declare.
//
// Four contracts:
//
//   SCALE — every playable side carries at least eighteen nodes and at least
//   two roads not taken, the objective columns stay 0–2 and the roads 3–4,
//   and no tree seats two medallions in one cell on ANY playable side.
//
//   FORKS — the five new forks are charted, both roads of each are written
//   by a live card, both terminals exist, and each entry deals two options
//   that set different markers.
//
//   THE CLIENTS' WARS — the independence cards do what the §61 vassal rule
//   does: sever the bond FIRST, then declare with the independence casus
//   belli, so the overlord can only restore the yoke at the table. The
//   loyalty road pays instead, and neither road is reachable twice.
//
//   PAY — every §200 objective completes when its world is built by hand,
//   and none of them completes at boot.
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { CHAPTER_PATHS } from '../../js/data/chapter_paths.js';
import { ERAS } from '../../js/data/compendium.js';
import { bus } from '../../js/core/bus.js';
import { initGame, makeCtx, gameActions } from '../../js/sim/init.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { resolveEventOption } from '../../js/sim/events.js';
import * as realm from '../../js/sim/realm.js';

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const era = (id) => ERAS.find((e) => e.bookmark.id === id);
function boot(id, playerTag) {
  const e = era(id);
  const provinceMap = buildProvinceMapping(MAP_DATA, e.bookmark);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: e.bookmark, events: e.events, playerTag, rngSeed: 19, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: e.bookmark, events: e.events, provinceMap,
  });
  return { game, ctx, actions: gameActions(ctx) };
}
function deal(w, cardId, optIdx) {
  w.ctx.helpers.fireEvent(w.ctx, cardId);
  const pe = w.game.pendingEvents[w.game.pendingEvents.length - 1];
  if (!pe) return false;
  resolveEventOption(w.ctx, pe.instanceId, optIdx);
  return true;
}
const done = (t) => new Set(t.missionsDone || []);
// The §207 drumbeat: one completion a pass, then the chain rests — a forced
// world is paid off over a run of pumped months, not a handful of passes.
const pump = (ctx, n) => { for (let i = 0; i < n; i++) realm.checkMissions(ctx); };

// The five §200 forks: chapter, fork id, the entry that deals it, the two
// markers its options set, and the terminal that reads them back.
const FORKS = [
  { ch: '167bce', fk: 'the_diadem', tag: 'HAS', entry: 'ev_h_the_diadem',
    markers: ['diademTaken', 'priesthoodAlone'], terminal: 'ev_h_what_the_crown_became' },
  { ch: '40bce', fk: 'the_testament', tag: 'HER', entry: 'ev5_the_testament',
    markers: ['kingdomWhole', 'kingdomDivided'], terminal: 'ev5_what_the_will_produced' },
  { ch: '66ce', fk: 'the_clients_war', tag: 'AGR', entry: 'ev_ag_the_clients_war',
    markers: ['agrippaRose', 'agrippaKeptFaith'], terminal: 'ev_ag_what_the_flavians_found' },
  { ch: '66ce', fk: 'the_tigris_crown', tag: 'ADI', entry: 'ev_dm_the_tigris_crown',
    markers: ['tigrisFree', 'tigrisKept'], terminal: 'ev_dm_what_the_road_paid' },
  { ch: '132ce', fk: 'the_apostates_offer', tag: 'JUD', entry: 'ev_j_the_apostates_offer',
    markers: ['julianTemple', 'julianRefused'], terminal: 'ev_j_what_julian_left' },
];

// ---------------------------------------------------------------- scale
console.log('== §200 static: every playable side is the size of its chapter ==');
for (const e of ERAS) {
  const b = e.bookmark;
  for (const p of (b.playableTags || [])) {
    const list = b.missions && b.missions[p.tag];
    if (!Array.isArray(list)) continue;
    const hypos = list.filter((m) => m.hypothetical);
    ok(list.length >= 11 && hypos.length >= 1,
      b.id + '/' + p.tag + ': ' + list.length + ' nodes, ' + hypos.length + ' roads not taken');
    ok(list.every((m) => !m.hypothetical || (m.col >= 3 && m.col <= 4)),
      b.id + '/' + p.tag + ': every road not taken keeps the spare columns');
    ok(list.every((m) => m.col >= 0 && m.col <= 4),
      b.id + '/' + p.tag + ': and nothing is seated past EU4\'s five columns');
  }
}
// The principals — the sides the chapter is named for — carry the full growth.
// These counts include the §210 civil band (six nodes on every principal).
const PRINCIPALS = [
  ['167bce', 'HAS', 29], ['67bce', 'HYR', 29], ['67bce', 'ARI', 29],
  ['40bce', 'HER', 26], ['40bce', 'ATG', 25], ['66ce', 'JUD', 27],
  ['66ce', 'AGR', 25], ['132ce', 'JUD', 28], ['529ce', 'SAM', 24],
  ['614ce', 'JUD', 29], ['1948ce', 'ISR', 26],
];
for (const [id, tag, n] of PRINCIPALS) {
  const list = era(id).bookmark.missions[tag];
  ok(list.length === n, id + '/' + tag + ' stands at ' + n + ' nodes (' + list.length + ')');
}

console.log('== §200 static: one node per cell, on every playable side ==');
for (const e of ERAS) {
  const b = e.bookmark;
  for (const p of (b.playableTags || [])) {
    const list = b.missions && b.missions[p.tag];
    if (!Array.isArray(list) || !list.length) continue;
    const ids = list.map((m, i) => realm.missionId(m, i));
    const row = [];
    const seats = new Set();
    let collide = null;
    list.forEach((m, i) => {
      const col = Math.max(0, Math.min(4, (m.col || 0) | 0));
      let r = Number.isFinite(m.row) ? Math.max(0, m.row | 0) : null;
      if (r === null) {
        if (Array.isArray(m.requires) && m.requires.length) {
          r = 0;
          for (const rid of m.requires) {
            const pi = ids.indexOf(String(rid));
            if (pi >= 0 && pi < i && Number.isFinite(row[pi])) r = Math.max(r, row[pi] + 1);
          }
        } else r = 0;
      }
      row[i] = r;
      const key = col + ':' + r;
      if (seats.has(key)) collide = ids[i] + ' @ ' + key;
      seats.add(key);
    });
    ok(!collide, b.id + '/' + p.tag + ' seats every node in its own cell'
      + (collide ? ' (' + collide + ')' : ''));
  }
}

console.log('== §200 static: no content package has a hole in it ==');
{
  // A stray comma before a closing bracket is an ELISION, not a syntax error:
  // `[a, b,,]` has a hole where nothing lives. `filter` and `map` skip holes
  // silently — so the usual "any undefined cards?" check reports a clean array
  // — while `find` walks straight into one and hands `undefined` to its
  // predicate. That is how one misplaced comma takes out five suites at once
  // with a stack trace pointing at innocent code, which is exactly what it did
  // while §200 was being written.
  for (const e of ERAS) {
    const chain = e.events || [];
    const holes = [];
    for (let i = 0; i < chain.length; i++) if (!(i in chain)) holes.push(i);
    ok(!holes.length, e.bookmark.id + ': the ' + chain.length + '-card chain is dense ('
      + (holes.length ? 'holes at ' + holes.join(', ') : 'no holes') + ')');
    ok(chain.every((c) => c && typeof c.id === 'string' && c.id),
      '  and every card in it has an id');
  }
}

console.log('== §200 live: every province a mission names is seated in its own chapter ==');
{
  // Chapters fold the map differently — Masada and Machaerus merge away before
  // Jannaeus builds them, Tiberias is founded in 20 CE, Caesarea is Herod's to
  // build — so a target that reads fine in the table can be a province the
  // chapter never seats. That mission is then uncompletable for ever, silently.
  // This is the check that hears it, for every mission of every playable side.
  const NAME = /controls\(\s*ctx\s*,\s*'[A-Z]{3}'\s*,\s*'([^']+)'\s*\)|'([^']+)'\s*\]\s*\.every/g;
  for (const e of ERAS) {
    const b = e.bookmark;
    for (const p of (b.playableTags || [])) {
      const list = b.missions && b.missions[p.tag];
      if (!Array.isArray(list)) continue;
      const w = boot(b.id, p.tag);
      // Resolve exactly the way controls() does — through ctx.prov, which
      // honours the §25 era renames and the p.canon aliases — so a province
      // the chapter merely CALLS something else is not reported as missing.
      const live = (n) => !!w.ctx.prov(n);
      const dead = [];
      for (const m of list) {
        const src = String(m.check || '');
        // Every quoted string the check compares against a province lookup.
        const names = new Set();
        for (const mm of src.matchAll(/controls\(\s*ctx\s*,\s*'[^']+'\s*,\s*'([^']+)'\s*\)/g)) names.add(mm[1]);
        for (const mm of src.matchAll(/\[([^\]]*)\]\s*\.every\(\(n\)/g)) {
          for (const q of mm[1].matchAll(/'([^']+)'/g)) names.add(q[1]);
        }
        for (const n of names) if (!live(n)) dead.push(m.id + ' → ' + n);
      }
      ok(!dead.length, b.id + '/' + p.tag + ': every named province is on this chapter\'s map ('
        + (dead.join(', ') || 'all seated') + ')');
    }
  }
}

// ---------------------------------------------------------------- forks
console.log('== §200 static: the five new forks are charted and cabled ==');
for (const f of FORKS) {
  const chapter = CHAPTER_PATHS.find((c) => c.id === f.ch);
  const fork = chapter && chapter.forks.find((x) => x.id === f.fk);
  ok(!!fork, f.ch + '/' + f.fk + ' is on the path tree');
  if (!fork) continue;
  ok(typeof fork.question === 'string' && fork.question.length > 20,
    '  it asks a question: ' + fork.question.slice(0, 60) + '…');
  const markers = fork.roads.map((r) => r.marker).sort();
  ok(markers.join(',') === f.markers.slice().sort().join(','),
    '  its roads are marked ' + markers.join(' / '));
  ok(fork.roads.every((r) => r.entry === f.entry && r.terminal === f.terminal),
    '  both roads share the entry and the terminal that answers it');
  ok(fork.roads.some((r) => r.historical) || f.fk === 'the_diadem' || f.fk === 'the_apostates_offer',
    '  the record is marked where the chronicles have one');
  const cards = era(f.ch).events;
  const entry = cards.find((c) => c && c.id === f.entry);
  const term = cards.find((c) => c && c.id === f.terminal);
  ok(!!entry && !!term, '  entry and terminal are cards the engine plays');
  if (!entry || !term) continue;
  ok(entry.options.length >= 2 && term.options.length >= 2,
    '  and both deal at least two answers (v6.1)');
  ok(Number.isFinite(entry.aiOption), '  the entry pins an aiOption for the AI and the harness');
}

console.log('== §200 live: each entry sets one marker per option, and only once ==');
for (const f of FORKS) {
  for (let opt = 0; opt < 2; opt++) {
    const w = boot(f.ch, f.tag);
    ok(deal(w, f.entry, opt), f.ch + '/' + f.entry + ' deals (option ' + opt + ')');
    const set = f.markers.filter((m) => !!w.game.flags[m]);
    ok(set.length === 1 && set[0] === f.markers[opt],
      '  option ' + opt + ' writes ' + f.markers[opt] + ' and nothing else (' + (set.join(',') || 'none') + ')');
    // The terminal reads the road back and settles it.
    ok(deal(w, f.terminal, 0), '  the terminal is dealt on that road');
    ok((w.game.tags[f.tag].modifiers || []).length > 0, '  and seats what the road earned');
  }
}

// ------------------------------------------------------- the clients' wars
console.log('== §200 live: a client can declare, and the bond breaks first ==');
{
  const w = boot('66ce', 'AGR');
  w.game.tags.AGR.overlord = 'ROM';
  deal(w, 'ev_ag_the_clients_war', 0);
  const t = w.game.tags.AGR;
  ok(t.overlord === null, 'Agrippa: the bond is severed before the war is declared');
  const war = (w.game.wars || []).find((x) => (x.attackers || []).includes('AGR')
    && (x.defenders || []).includes('ROM'));
  ok(!!war, 'and the war exists: ' + (war ? war.name : 'none'));
  ok(war && war.cb === 'independence',
    'under the independence casus belli, so the yoke can only go back on at the table');
  ok((t.atWarWith || []).includes('ROM'), 'the king is at war with Rome on the ledger');
  ok(((w.game.tags.ROM.opinion || {}).AGR || 0) < 0, 'and Rome\'s regard has collapsed');
  // Not twice: the card retires behind its own answered flag.
  ok(!!w.ctx.helpers.getFlag(w.ctx, 'clientsWarAnswered'), 'the question is closed once answered');
  const card = era('66ce').events.filter(Boolean).find((c) => c.id === 'ev_ag_the_clients_war');
  ok(!!card && !card.trigger(w.ctx), 'and the trigger refuses to deal it again');
}
{
  const w = boot('66ce', 'AGR');
  w.game.tags.AGR.overlord = 'ROM';
  deal(w, 'ev_ag_the_clients_war', 1);
  ok(w.game.tags.AGR.overlord === 'ROM', 'the loyal road leaves the bond exactly where it was');
  ok(!(w.game.wars || []).some((x) => (x.attackers || []).includes('AGR')
    && (x.defenders || []).includes('ROM')), 'and declares no war');
  ok(((w.game.tags.ROM.opinion || {}).AGR || 0) >= 180, 'Rome pays for the letter in regard');
  ok((w.game.tags.AGR.modifiers || []).some((m) => m.id === 'the_confirmed_client'),
    'and the client is confirmed in what it holds');
}
{
  const w = boot('66ce', 'ADI');
  deal(w, 'ev_dm_the_tigris_crown', 0);
  const war = (w.game.wars || []).find((x) => (x.attackers || []).includes('ADI')
    && (x.defenders || []).includes('PAR'));
  ok(w.game.tags.ADI.overlord === null && !!war && war.cb === 'independence',
    'Adiabene: the same rule between the rivers — bond first, then the war');
}

// ------------------------------------------------------------------- pay
console.log('== §200 live: the new objectives are unearned at boot and paid when earned ==');
const NEW_OBJECTIVES = {
  '167bce/HAS': ['hm_akra', 'hm_senate_letter', 'hm_gerizim', 'hm_idumea', 'hm_galilee',
    'hm_own_port', 'hm_desert_keys', 'hm_hired_ranks', 'hm_queens_peace'],
  '67bce/HYR': ['h4_customs_houses', 'h4_desert_rocks', 'h4_the_lake_country', 'h4_the_sea_gates',
    'h4_the_council', 'h4_the_useful_brother', 'h4_house_restored'],
  '67bce/ARI': ['a4_war_chest', 'a4_rocks_held', 'a4_the_north', 'a4_sea_gates',
    'a4_too_solid_to_refile', 'a4_rome_prefers_to_deal', 'a4_the_crown_kept'],
  '40bce/HER': ['h5_caesarea', 'h5_the_temple', 'h5_famine_year', 'h5_the_fortress_ring',
    'h5_the_friend_of_caesar', 'h5_a_dynasty_not_a_reign'],
  '40bce/ATG': ['a5_the_mint', 'a5_the_rocks', 'a5_the_north_restored',
    'a5_the_priest_king_settled', 'a5_terms_with_the_eagle'],
  '66ce/JUD': ['jm_the_third_wall', 'jm_the_desert_forts', 'jm_the_harbour',
    'jm_the_treasury_of_the_house', 'jm_a_navy_at_joppa', 'jm_the_commonwealth'],
  '66ce/AGR': ['am_the_northern_march', 'am_a_royal_capital', 'am_the_kings_own_army',
    'am_the_dynasty_continues'],
  '132ce/JUD': ['j2_the_mint', 'j2_the_academies', 'j2_the_whole_land',
    'j2_the_patriarchs_house', 'j2_the_calendar', 'j2_the_sea_and_the_road'],
  '529ce/SAM': ['s_the_treasury', 's_the_high_priest', 's_the_lowland_towns', 's_the_drilled_host',
    's_the_jordan_line', 's_a_people_the_census_counts', 's_the_statutes_repealed'],
  '614ce/JUD': ['p_the_mint_of_the_return', 'p_the_desert_frontier',
    'p_a_state_that_outlives_its_patron', 'p_the_army_of_the_return', 'p_the_gathering'],
  '1948ce/ISR': ['i_the_ingathering', 'i_the_water', 'i_the_deterrent_frontier',
    'i_the_second_decade', 'i_a_treaty_with_a_neighbour', 'i_the_state_at_fifty'],
};
for (const [key, ids] of Object.entries(NEW_OBJECTIVES)) {
  const [id, tag] = key.split('/');
  const list = era(id).bookmark.missions[tag];
  const missing = ids.filter((x) => !list.find((m) => m.id === x));
  ok(!missing.length, key + ': every §200 objective is in the table ('
    + (missing.join(', ') || ids.length + ' present') + ')');
  const loose = ids.map((x) => list.find((m) => m.id === x)).filter(Boolean)
    .filter((m) => !Number.isFinite(m.col) || !Number.isFinite(m.row));
  ok(!loose.length, key + ': and every one declares col AND row rather than deriving it ('
    + (loose.map((m) => m.id).join(', ') || 'all declared') + ')');
}
{
  // No free lunch, across every chapter and every playable side at once.
  const free = [];
  for (const [key, ids] of Object.entries(NEW_OBJECTIVES)) {
    const [id, tag] = key.split('/');
    const w = boot(id, tag);
    // Pump past the §207 rests so a free node cannot hide behind an era
    // objective that absorbs the first pass.
    pump(w.ctx, 16);
    const d = done(w.game.tags[tag]);
    for (const x of ids) if (d.has(x)) free.push(key + '/' + x);
  }
  ok(!free.length, 'nothing §200 added is accomplished on day one ('
    + (free.join(', ') || 'none') + ')');
}
{
  // And the whole of one chapter's growth pays when the world arrives. 167 is
  // the deepest tree and the one whose objectives span the widest arithmetic:
  // provinces, treasury, a rung, regard, stability and legitimacy together.
  const w = boot('167bce', 'HAS');
  const t = w.game.tags.HAS;
  t.overlord = null;
  // The first two rungs are the war itself (a war score against the Seleucids
  // this harness does not fight); seed them the §177 way — missionIdx is the
  // done PREFIX, so the branches below them unlock on the ordinary rule.
  t.missionIdx = 2;
  t.treasury = 600; t.stability = 3; t.legitimacy = 85;
  t.tech = { ...(t.tech || {}), mar: 7, gov: 7, infl: 7 };
  t.eraIdeas = { forced: 3 };
  w.ctx.helpers.spawnArmy(w.ctx, 'HAS', 'Jerusalem', { inf: 12, name: 'The Host' });
  w.game.tags.ROM.opinion = { ...(w.game.tags.ROM.opinion || {}), HAS: 60 };
  for (const n of ['Jerusalem', 'Scythopolis', 'Hebron', 'Adora', 'Sepphoris', 'Gischala',
    'Joppa', 'Jamnia', 'Engaddi', 'Gadora']) w.ctx.helpers.changeOwner(w.ctx, n, 'HAS');
  pump(w.ctx, 60); // nine objectives and their §207 rests
  const d = done(t);
  const unpaid = NEW_OBJECTIVES['167bce/HAS'].filter((x) => !d.has(x));
  ok(!unpaid.length, '167bce HAS: the whole §200 branch pays ('
    + (unpaid.join(', ') || 'all nine') + ')');
  ok((t.modifiers || []).some((m) => m.id === 'idumean_levies')
    && (t.modifiers || []).some((m) => m.id === 'the_nine_quiet_years'),
    'and its permanent modifiers seat: the Idumean levies and the nine quiet years');
}

console.log(failures ? `smoke129: ${failures} FAIL` : 'smoke129: ALL PASS');
process.exit(failures ? 1 : 0);
