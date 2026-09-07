// Campaign measurement, tribute conservation and crowded-map readability.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseOptions, experiments, summarize } from '../balance/options.mjs';
import { layoutProvinceLabels } from '../../js/map/label_layout.js';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { initGame, makeCtx } from '../../js/sim/init.js';
import { incomeBreakdown, TRIBUTE_SHARE } from '../../js/sim/economy.js';

const books = ERAS.map(e => [e.bookmark.id, e.bookmark, e.events]);
const opts = parseOptions(['8', '--factions=all', '--seeds=3', '--profiles=historical,cautious,bold']);
const cases = experiments(books, opts);
assert.equal(cases.length, ERAS.reduce((n, e) => n + e.bookmark.playableTags.length, 0) * 9);
assert.equal(new Set(cases.map(c => [c.entry[0], c.tag, c.profile, c.seed].join('/'))).size, cases.length);
for (const args of [['--seeds=0'], ['--seed=4294967295', '--seeds=2'], ['--profiles=wat'], ['8.5'], ['--unknown']])
  assert.throws(() => parseOptions(args));
assert.throws(() => experiments(books, parseOptions(['8', 'missing'])));
assert.throws(() => experiments(books, parseOptions(['8', '66ce', '--factions=HAS'])));
const meta = { id: '66ce', tag: 'JUD', profile: 'historical', difficulty: 'normal' };
const summary = summarize([
  { ...meta, metrics: { result: null, aliveAtEnd: true, firstBankruptcyDay: null, firstDebtSpiralDay: null } },
  { ...meta, error: 'crash' },
  { ...meta, metrics: { result: 'loss', aliveAtEnd: false, firstBankruptcyDay: 100, firstDebtSpiralDay: 20 } },
])[0];
assert.deepEqual([summary.runs, summary.completed, summary.crashes, summary.wins, summary.losses,
  summary.unresolved, summary.survived, summary.bankruptcies], [3, 2, 1, 0, 1, 1, 1, 1]);

const banner = { x: 60, y: 55, w: 80, h: 28 };
const candidates = [
  { id: 2, text: 'Nearby village', x: 102, y: 90, w: 100, h: 12, priority: 1 },
  { id: 1, text: 'Jerusalem', x: 100, y: 90, w: 72, h: 12, priority: 900 },
];
const labels = layoutProvinceLabels(candidates, [banner], { w: 300, h: 200 });
assert.equal(labels[0].text, 'Jerusalem');
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
assert(labels.every(l => !overlap(l.box, banner)));
assert(labels.length < 2 || !overlap(labels[0].box, labels[1].box));
assert.deepEqual(labels, layoutProvinceLabels(candidates.reverse(), [banner], { w: 300, h: 200 }));
assert.equal(layoutProvinceLabels([{ ...candidates[0], x: -100 }], [], { w: 300, h: 200 }).length, 0);

const snap = JSON.parse(readFileSync(new URL('../geom-snapshot.json', import.meta.url), 'utf8'));
let payingTradeClients = 0;
for (const { bookmark, events } of ERAS) {
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const geom = { neighbors: snap.neighbors.map(n => new Set(n)),
    centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null),
    coastal: snap.coastal, areas: Int32Array.from(snap.areas), bbox: [] };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, provinceMap,
    playerTag: bookmark.playableTags[0].tag, rngSeed: 1234567 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events, provinceMap,
    bus: { emit() {}, on() { return () => {}; } } });
  const alive = Object.keys(game.tags).filter(tag => game.tags[tag].alive && tag !== 'REB');
  const rows = new Map(alive.map(tag => [tag, incomeBreakdown(ctx, tag)]));
  let paid = 0, received = 0;
  for (const [tag, row] of rows) {
    paid += row.tributeOut; received += row.tributeIn;
    const clients = alive.filter(k => game.tags[k].overlord === tag);
    const due = clients.reduce((n, k) => n + rows.get(k).tributeOut, 0);
    assert(Math.abs(row.tributeIn - due) < 1e-8, bookmark.id + ': tribute reaches ' + tag);
    if (row.tributeOut > 0 && row.trade > 0) {
      payingTradeClients++;
      assert(Math.abs(row.tributeOut - row.income * TRIBUTE_SHARE) < 1e-8);
    }
  }
  assert(Math.abs(paid - received) < 1e-8, bookmark.id + ': no tribute disappears');
}
assert(payingTradeClients > 0, 'the fixture exercises trade-paying clients');
console.log('ALL PASS: matrix selection, honest denominators, label collisions, and tribute across all bookmarks');
