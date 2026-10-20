// Detailed art and its interpretation must follow the same court identity.
import assert from 'node:assert/strict';
import { DEFINES } from '../../js/data/defines.js';
import { FLAGS, flagChip, flagInfo } from '../../js/ui/icons.js';
import { FLAT_FLAGS } from '../../js/ui/flag_art.js';
import { STANDARD_SOURCES } from '../../js/ui/court_standards.js';
import { JUDAEAN_COIN_SOURCES } from '../../js/ui/judaean_standards.js';

const detailed = Object.entries(FLAT_FLAGS).filter(([, a]) => a.detailed);
assert.equal(detailed.length, 114);
for (const [tag, a] of detailed) {
  assert(a.note.length > 40, tag + ': explain the motif and its interpretation');
  const drawings = [14, 24, 34, 52, 160, 320].map(size => {
    const html = flagChip(tag, DEFINES, size);
    assert.match(html, new RegExp(`width:${size}px;height:${size}px`));
    return html.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)[1];
  });
  assert.equal(new Set(drawings).size, 1, tag + ': complete source at every size');
  assert.equal(flagInfo(tag, DEFINES).note, a.note);
  if (a.source) {
    assert(Object.values({ ...STANDARD_SOURCES, ...JUDAEAN_COIN_SOURCES }).includes(a.source));
    const url = new URL(a.source[1]);
    assert.equal(url.protocol, 'https:');
  }
}

for (const [tag, emblem] of Object.entries({
  TYR: 'murex-shell', COR: 'corinthian-pegasus', CYR: 'cyrene-silphium',
  DAC: 'dacian-draco', GBA: 'bactrian-elephant', SEQ: 'boar-headed-carnyx',
  AES: 'baltic-amber', ETR: 'etruscan-gorgoneion', AXM: 'aksum-palace-stele',
})) assert.equal(FLAGS[tag].emblem, emblem, tag + ': preserve the specific subject');

// Related courts must differ in the drawing itself, beyond a palette swap.
function drawing(tag) {
  const a = FLAGS[tag];
  return a.body.slice(a.body.indexOf('<g data-emblem='))
    .replace(/data-emblem="[^"]*"/g, '')
    .replace(/#[\da-f]{3,8}\b|hsl\([^)]*\)|rgb\([^)]*\)/gi, 'INK');
}
for (const group of [
  ['MAS','ARO','SCN','CHX','OMA','VAN','TRT','BIT'],
  ['AMO','DRD','DLM','CHO','LKH','SRD'],
  ['PAR','QDR','ITU','SCY','NOB'], ['AED','GLT'], ['BOI','CIM','SAB'],
  ['OST','GEP','HMT','HMY'],
]) assert.equal(new Set(group.map(drawing)).size, group.length, group.join('/') + ': distinct constructions');

const game = { tags: { TYR: { flag: 'GAL', name: 'A changed court', color: [30,70,90] } } };
assert.equal(flagInfo('TYR', DEFINES, game).key, 'GAL');
assert.equal(flagInfo('TYR', DEFINES, game).note, FLAGS.GAL.note);
assert.equal(flagInfo('TYR', DEFINES, game).source, null);
assert.equal(flagInfo('TYR', DEFINES, null, { flag: 'GBA' }).source, FLAGS.GBA.source);
game.tags.TYR.flag = 'ISR';
assert.equal(flagInfo('TYR', DEFINES, game).note, FLAGS.ISR.note);
assert.equal(flagInfo('TYR', DEFINES, game).detailed, false);
game.tags.TYR.flag = '__proto__';
assert.equal(flagInfo('TYR', DEFINES, game).note, FLAGS.TYR.note);
const oldSave = { tags: { HPA: { flag: 'HER' } } };
assert.equal(flagInfo('HPA', DEFINES, oldSave).key, 'HPA');
assert.equal(flagInfo('missing', DEFINES).note, '');
console.log('PASS 114 interpreted court drawings and variants, complete SVG source at six sizes, distinct regional constructions and identity-aware notes');
console.log('ALL PASS');
