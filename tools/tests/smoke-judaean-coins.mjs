import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { initGame, makeCtx } from '../../js/sim/init.js';
import { switchTagCore } from '../../js/sim/military.js';
import { FLAT_FLAGS } from '../../js/ui/flag_art.js';
import { flagChip, flagInfo } from '../../js/ui/icons.js';
import { JUDAEAN_COIN_SOURCES } from '../../js/ui/judaean_standards.js';

// User constraint: the entire Hasmonean master, including its palette,
// transforms and note, must remain identical to the approved version.
assert.equal(createHash('sha256').update(JSON.stringify(FLAT_FLAGS.HAS)).digest('hex'),
  '138f3495b36c20741c3eb6c643b6604490af5a46bd272ed2c64a71989724fec0');

for (const [tag, emblem] of Object.entries({
  HER: 'herodian-helmet', ATG: 'antigonus-coin-menorah',
  HPA: 'antipas-reed-wreath', HPH: 'philip-coin-temple', AGR: 'agrippa-neronian-wreath',
  HYR: 'hasmonean-cornucopias-wreath', ARI: 'hasmonean-cornucopias-beads',
  JUD_REVOLT: 'first-revolt-chalice', JUD_BK: 'bar-kokhba-lulav-zuz',
})) {
  const art = FLAT_FLAGS[tag];
  assert.equal(art.emblem, emblem);
  assert(art.detailed && art.note.length > 60);
  assert(Object.values(JUDAEAN_COIN_SOURCES).includes(art.source));
  assert(!/<text\b|<image\b|<filter\b|<script\b/i.test(art.body), tag + ': complete local paths');
  const drawings = [14, 24, 34, 52, 160, 320].map(size =>
    flagChip(tag, DEFINES, size).match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1]);
  assert.equal(new Set(drawings).size, 1, tag + ': every size uses the complete master');
}
assert.match(FLAT_FLAGS.HYR.note, /not an attribution/);
assert.match(FLAT_FLAGS.ARI.note, /not an attribution of an Aristobulus I coin/);
assert.match(FLAT_FLAGS.AGR.note, /Neronian/);
assert.match(FLAT_FLAGS.JUD_BK.note, /standalone lulav/);
assert(!FLAT_FLAGS.JUD_BK.body.includes('temple'), 'BK uses the requested lulav zuz');
assert.equal(FLAT_FLAGS.JUD.emblem, 'menorah', 'the general Judaean banner remains available');

const bus = { emit() {}, on() { return () => {}; } };
const geom = { neighbors: [], centroids: [], areas: [], coastal: [], offshore: [] };
function boot(id) {
  const { bookmark, events } = ERAS.find(e => e.bookmark.id === id);
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag: 'JUD', rngSeed: 216 });
  return { game, ctx: makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark, events, bus }), bookmark, events };
}

for (const [era, expected] of [['66ce', 'JUD_REVOLT'], ['132ce', 'JUD_BK'],
  ['351ce', 'GAL'], ['529ce', 'GAL'], ['614ce', 'JUD']]) {
  const w = boot(era);
  assert.match(flagChip('JUD', DEFINES, 34, false, null, w.bookmark.tagTweaks?.JUD),
    new RegExp(`data-flag-key="${expected}"`), era + ': start screen');
  assert.match(flagChip('JUD', DEFINES, 34, false, w.game),
    new RegExp(`data-flag-key="${expected}"`), era + ': live court');
  assert.equal(flagInfo('JUD', DEFINES, w.game).note, FLAT_FLAGS[expected].note);
  if (era === '66ce' || era === '132ce') {
    // Old saves with no stored flag pick up the same chapter identity.
    delete w.game.tags.JUD.flag;
    makeCtx({ game: w.game, DEFINES, MAP_DATA, geom, bookmark: w.bookmark, events: w.events, bus });
    assert.equal(w.game.tags.JUD.flag, expected);
  }
}

for (const [era, targets] of [['132ce', ['EPJ', 'KGJ']], ['614ce', ['KGJ']]]) {
  for (const tag of targets) {
    const w = boot(era);
    assert(switchTagCore(w.ctx, 'JUD', tag));
    const expected = era === '132ce' ? `${tag}_BK` : tag;
    assert.equal(flagInfo(tag, DEFINES, w.game).key, expected);
    const base = era === '132ce' ? FLAT_FLAGS.JUD_BK : FLAT_FLAGS.JUD;
    assert(FLAT_FLAGS[expected].body.includes(base.body.slice(base.body.indexOf('<g data-emblem='))),
      tag + ': inherits the full founding device');
    assert.equal(flagInfo(tag, DEFINES, w.game).source, base.source || null);
    assert(switchTagCore(w.ctx, tag, 'MLI'));
    assert.equal(flagInfo('MLI', DEFINES, w.game).key, 'MLI', 'Israel takes its own banner');
  }
}
const w = boot('132ce');
w.game.tags.JUD.flag = 'ISR';
assert.equal(flagInfo('JUD', DEFINES, w.game).key, 'ISR', 'saved rebrands retain precedence');
assert.equal(flagInfo('JUD', DEFINES, w.game).note, FLAT_FLAGS.ISR.note);
console.log('PASS unchanged Hasmonean master, nine coin devices, chapter and save identities, founding motifs and formation transitions');
