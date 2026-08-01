// Headless regression — SPEC §196: the chairs take their turn.
//
// §185 seated five client chairs (Adiabene in 67 BCE, 40 BCE, 66 CE and
// 132 CE, Agrippa II in 66 CE) with the minimum kit; §187 and §192 then
// thickened every principal tree and left the chairs at six objectives
// apiece. §196 is the third pass: each chair grows an expansion branch
// over ground the tag does not start with, court branches from the
// house's own documented history, and roads not taken riding forks its
// chapter already charts. This suite holds that growth from four sides:
//
//   SHAPE — the five chains carry their grown counts, every §196 node is
//   fully dressed with a declared seat, and the append contract holds
//   from both ends (objectives before the first hypothetical, requires
//   resolving inside the chain, objectives never waiting on roads).
//
//   SEATS — one node per cell on EVERY playable side of every bookmark,
//   not just the first-booted player. Twice (§187, §183) a collision hid
//   in a second-playable tree exactly because the live check never looks
//   there; this is the check that looks there.
//
//   GROUND — booted cold, every conquest target of the new branches is
//   genuinely foreign, and no new node is accomplished on day one.
//
//   PAY — when the forced world arrives (treasuries, musters, regard,
//   rungs, provinces), every new branch completes and its permanent
//   modifiers seat; and the off-record rule holds — a §196 road does NOT
//   pay when only history's own marker is set, because the medallion
//   sells the page the chronicles do not have.
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { bus } from '../../js/core/bus.js';
import { initGame, makeCtx } from '../../js/sim/init.js';
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
  areas: new Int32Array(N + 1),
  bbox: [],
};

const era = (id) => ERAS.find((e) => e.bookmark.id === id);
function boot(id, playerTag) {
  const e = era(id);
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: e.bookmark, events: e.events, playerTag, rngSeed: 7 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: e.bookmark, events: e.events });
  return { game, ctx };
}
const doneIds = (t) => new Set(t.missionsDone || []);

// The pass, chair by chair: chain size, objective/road split, the §196
// ids, and the conquest ground each expansion branch reaches for.
const GROWTH = [
  {
    id: '67bce', tag: 'ADI', nodes: 11, hypos: 2,
    added: ['t4_bones_of_armenia', 't4_elder_client_house', 't4_peace_of_the_altars', 'hy_doors_stayed_shut'],
    ground: ['Tigranocerta', 'Amida', 'Edessa', 'Carrhae'],
  },
  {
    id: '40bce', tag: 'ADI', nodes: 11, hypos: 2,
    added: ['t5_kingmakers_house', 't5_queens_vow', 't5_island_the_tide_missed', 'hy_house_unpolluted'],
    ground: ['Tyre'],
  },
  {
    id: '66ce', tag: 'ADI', nodes: 13, hypos: 4,
    added: ['dm_riders_of_two_rivers', 'dm_treasure_house', 'dm_tombs_of_kings', 'hy_city_never_starved'],
    ground: ['Nehardea'], // Nisibis is the house's own; the mission is hold-both
  },
  {
    id: '66ce', tag: 'AGR', nodes: 19, hypos: 5,
    added: ['am_queens_estates', 'am_first_crown', 'am_emperors_ear', 'hy_other_royal_robes', 'hy_king_of_which_jews'],
    ground: ['Chalcis'],
  },
  {
    id: '132ce', tag: 'ADI', nodes: 12, hypos: 3,
    added: ['b2_fortress_that_refused', 'b2_court_of_captivity', 'b2_houses_of_study', 'hy_letters_reach_east'],
    ground: ['Hatra', 'Singara', 'Nehardea'],
  },
];

// ---------------------------------------------------------------- shape
console.log('== §196 static: the grown chains, dressed and appended ==');
for (const gw of GROWTH) {
  const b = era(gw.id).bookmark;
  const list = b.missions[gw.tag];
  const hypos = list.filter((m) => m.hypothetical);
  ok(list.length === gw.nodes && hypos.length === gw.hypos,
    gw.id + '/' + gw.tag + ' grew to ' + gw.nodes + ' nodes, ' + gw.hypos + ' of them roads ('
    + list.length + ', ' + hypos.length + ')');
  const ids = new Set(list.map((m) => m.id));
  const hyIds = new Set(hypos.map((m) => m.id));
  const firstHy = list.findIndex((m) => m.hypothetical);
  const lastBase = list.reduce((last, m, i) => (m.hypothetical ? last : i), -1);
  ok(firstHy > lastBase, gw.id + '/' + gw.tag + ' appends every road after every objective');
  for (const id of gw.added) {
    const m = list.find((x) => x.id === id);
    ok(!!m, id + ' exists in the chain');
    if (!m) continue;
    ok(!!m.icon && typeof m.desc === 'string' && m.desc.length > 60 && !!m.rewardText
      && typeof m.check === 'function' && typeof m.reward === 'function'
      && Number.isFinite(m.col) && Number.isFinite(m.row),
      id + ' is fully dressed and declares its own seat (col ' + m.col + ', row ' + m.row + ')');
    for (const rid of (m.requires || [])) {
      ok(ids.has(rid), id + ' waits only inside its own chain (' + rid + ')');
      if (!m.hypothetical) {
        ok(!hyIds.has(rid), id + ' is an objective and waits on no road not taken');
      }
    }
  }
}

// ---------------------------------------------------------------- seats
// The derived-row arithmetic of getMissions, run over EVERY playable side
// of every bookmark — the panel only ever draws the player's own tree, so
// the live no-collision check (smoke116) sees one side per chapter and a
// collision in a second-playable tree stays invisible until someone plays
// it. §187 and §183 each found one exactly there, by hand.
console.log('== §196 static: one node per cell on every playable side ==');
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

// ---------------------------------------------------------------- ground
console.log('== §196 live: the ground is foreign and the day-one table is bare ==');
const cold = new Map();
for (const gw of GROWTH) {
  const key = gw.id + '/' + gw.tag;
  const w = cold.get(gw.id) || boot(gw.id, gw.tag);
  cold.set(gw.id, w);
  for (const name of gw.ground) {
    const p = w.game.provinces.find((x) => x && x.name === name);
    ok(!!p && p.owner !== gw.tag,
      key + ': ' + name + ' is not the chair\'s at the start (' + (p && p.owner) + ')');
  }
  realm.checkMissions(w.ctx);
  const done = doneIds(w.game.tags[gw.tag]);
  const free = gw.added.filter((id) => done.has(id));
  ok(!free.length, key + ': no §196 node is accomplished at boot ('
    + (free.join(', ') || 'none') + ')');
}

// ------------------------------------------------------------------- pay
// Force each chair's whole world by hand — the parents' thresholds too,
// because a branch pays only down an unlocked chain — then let the
// ordinary monthly pass settle it in waves.
console.log('== §196 live: every new branch pays when its world arrives ==');
function force(w, tag, opts) {
  const g = w.game;
  const t = g.tags[tag];
  if (opts.treasury !== undefined) t.treasury = opts.treasury;
  if (opts.stability !== undefined) t.stability = opts.stability;
  if (opts.legitimacy !== undefined) t.legitimacy = opts.legitimacy;
  if (opts.tech) t.tech = { ...(t.tech || {}), ...opts.tech };
  if (opts.tiers) t.eraIdeas = { forced_curriculum: opts.tiers };
  if (opts.men) w.ctx.helpers.spawnArmy(w.ctx, tag, opts.at, { inf: opts.men / 1000, name: 'Forced Muster' });
  for (const [other, val] of Object.entries(opts.regard || {})) {
    const o = g.tags[other];
    if (o) o.opinion = { ...(o.opinion || {}), [tag]: val };
  }
  for (const name of opts.grant || []) w.ctx.helpers.changeOwner(w.ctx, name, tag);
}
function expectPaid(w, tag, ids, label) {
  realm.checkMissions(w.ctx);
  realm.checkMissions(w.ctx);
  const done = doneIds(w.game.tags[tag]);
  const missing = ids.filter((id) => !id.startsWith('hy_') && !done.has(id));
  ok(!missing.length, label + ': every new objective paid ('
    + (missing.length ? 'missing ' + missing.join(', ') : 'all done') + ')');
}
const seated = (t, id) => (t.modifiers || []).some((m) => m.id === id);

{ // 67 BCE — Armenia's bones, the sister house, the reconciled altars.
  const w = boot('67bce', 'ADI');
  force(w, 'ADI', {
    treasury: 400, stability: 2, tech: { mar: 6 }, tiers: 3,
    men: 8000, at: 'Arbela', regard: { PAR: 100 },
    grant: ['Tigranocerta', 'Amida', 'Edessa', 'Carrhae'],
  });
  expectPaid(w, 'ADI', GROWTH[0].added, '67bce ADI');
  const t = w.game.tags.ADI;
  ok(seated(t, 'western_fords') && seated(t, 'two_altars'),
    '67bce: the western fords and the two altars seat their permanent modifiers');
}
{ // 40 BCE — the kingmaker's muster, the vow banked, the island delivered.
  const w = boot('40bce', 'ADI');
  force(w, 'ADI', {
    treasury: 300, tech: { mar: 6 }, tiers: 3,
    men: 8000, at: 'Arbela', regard: { PAR: 100 },
    grant: ['Tyre'],
  });
  expectPaid(w, 'ADI', GROWTH[1].added, '40bce ADI');
  const t = w.game.tags.ADI;
  ok(seated(t, 'kingmakers_house') && seated(t, 'lamp_over_the_door'),
    '40bce: the kingmaker\'s house and the lamp over the door pay permanently');
}
{ // 66 CE — both chairs off one boot: the convert lances, the treasure
  // cities, the pyramids; the queen's ledgers, Chalcis, the emperor's ear.
  const w = boot('66ce', 'ADI');
  force(w, 'ADI', {
    treasury: 400, legitimacy: 85, tech: { gov: 6 }, tiers: 3,
    men: 8000, at: 'Arbela', regard: { JUD: 100, PAR: 130 },
    grant: ['Nehardea'],
  });
  force(w, 'AGR', {
    treasury: 300, tech: { infl: 6, gov: 7 }, tiers: 3,
    men: 5000, at: 'Caesarea Philippi', regard: { ROM: 200 },
    grant: ['Chalcis'],
  });
  expectPaid(w, 'ADI', GROWTH[2].added, '66ce ADI');
  expectPaid(w, 'AGR', GROWTH[3].added, '66ce AGR');
  const adi = w.game.tags.ADI;
  ok(seated(adi, 'convert_lances') && seated(adi, 'escort_of_the_ascents')
    && seated(adi, 'pyramids_north_of_the_wall'),
    '66ce: the lances, the escort and the pyramids all seat their modifiers');
  ok(seated(w.game.tags.AGR, 'stewards_ledgers'),
    '66ce: the stewards\' ledgers pay the client crown permanently');
}
{ // 132 CE — the fortress line, the captivity's ford, the sages' blessing.
  const w = boot('132ce', 'ADI');
  force(w, 'ADI', {
    treasury: 400, stability: 2, tech: { mar: 6, infl: 7 }, tiers: 3,
    regard: { JUD: 100 },
    grant: ['Hatra', 'Singara', 'Nehardea'],
  });
  expectPaid(w, 'ADI', GROWTH[4].added, '132ce ADI');
  ok(seated(w.game.tags.ADI, 'ford_of_the_captivity'),
    '132ce: the ford of the captivity pays permanently');
}

// ------------------------------------------------- the off-record rule
// A §196 road is the page the chronicles do not have. Set ONLY history's
// own marker and the medallion must stay dark: Crassus historically got
// the gold, the statue order was historically given and refused on the
// ground, the stores historically burned, the pretender was historically
// struck, and the letters east were historically never sent.
console.log('== §196 live: history\'s own road pays nothing ==');
const HISTORY = [
  { id: '67bce', tag: 'ADI', flags: { crassusRansom: true }, dark: 'hy_doors_stayed_shut' },
  { id: '40bce', tag: 'ADI', flags: { statueRefused: true, statueErected: true }, dark: 'hy_house_unpolluted' },
  { id: '66ce', tag: 'ADI', flags: { storesBurned: true }, dark: 'hy_city_never_starved' },
  { id: '66ce', tag: 'AGR', flags: { menahemStruck: true }, dark: 'hy_other_royal_robes' },
  { id: '132ce', tag: 'ADI', flags: { theLandAlone: true }, dark: 'hy_letters_reach_east' },
];
for (const h of HISTORY) {
  const w = boot(h.id, h.tag);
  Object.assign(w.game.flags, h.flags);
  realm.checkMissions(w.ctx);
  ok(!doneIds(w.game.tags[h.tag]).has(h.dark),
    h.id + '/' + h.tag + ': ' + h.dark + ' stays dark on '
    + Object.keys(h.flags).join('+'));
}

console.log(failures ? `smoke126: ${failures} FAIL` : 'smoke126: ALL PASS');
process.exit(failures ? 1 : 0);
