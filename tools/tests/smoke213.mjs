// Complete flag identities: catalogue, releases, formations and old saves.
import assert from 'node:assert/strict';
import { DEFINES } from '../../js/data/defines.js';
import { REVIVALS } from '../../js/data/revivals.js';
import { FORMABLES } from '../../js/data/formables.js';
import { ERAS } from '../../js/data/compendium.js';
import { FLAGS, flagChip } from '../../js/ui/icons.js';
import { LEGACY_BORROWED_FLAGS, FLAT_FLAGS } from '../../js/ui/flag_art.js';
const body = a => typeof a === 'string' ? a : a.body;
const courts = new Set([...Object.keys(DEFINES.TAGS), ...REVIVALS.map(r => r.tag)]); courts.delete('WASTE');
assert.equal(courts.size, 205);
for (const tag of courts) {
  assert(Object.hasOwn(FLAGS, tag), tag + ' needs its own artwork');
  const html = flagChip(tag, DEFINES, 24);
  assert(!html.includes('fchip-abbr'), tag + ' must never render as a text stub');
  assert.match(html, new RegExp('data-flag-key="' + tag + '"'));
  assert(!/<filter\b|<linearGradient\b|<radialGradient\b|<script\b|\bonload=|url\(https?:/i.test(html), tag + ' must be self-contained local artwork');
}
for (const f of FORMABLES) if (f.to) assert(FLAGS[f.to], 'formation: ' + f.to);
let lenses = 0;
for (const era of ERAS) for (const [tag, def] of Object.entries(era.bookmark.tagTweaks || {})) {
  if (def.flag) { lenses++; assert(FLAGS[def.flag], era.bookmark.id + ': ' + tag + ' era flag'); }
}
assert(lenses >= 2, 'exercise the chapter flag overrides');
console.log('PASS all 205 catalogue/releasable courts, formation targets and era identities have flat vector flags');
const artwork = [...courts].map(t => body(FLAGS[t])); assert.equal(new Set(artwork).size, courts.size);
assert.notEqual(body(FLAGS.HPA), body(FLAGS.HPH)); assert.notEqual(body(FLAGS.HPA), body(FLAGS.HER));
assert.notEqual(body(FLAGS.HPH), body(FLAGS.AGR));
assert.equal(FLAGS.ISL.emblem, 'horned-altar', 'ancient Israel keeps its earlier altar emblem');
assert.equal(FLAGS.MLI.emblem, 'magen-david', 'the later Kingdom of Israel keeps the Star of David');
assert.notEqual(body(FLAGS.ISL), body(FLAGS.MLI));
for (const [tag, old] of Object.entries(LEGACY_BORROWED_FLAGS)) {
  const game = { tags: { [tag]: { flag: old, name: tag, color: [100, 80, 90] } } }, before = JSON.stringify(game);
  assert.match(flagChip(tag, DEFINES, 24, false, game), new RegExp('data-flag-key="' + tag + '"'));
  assert.equal(JSON.stringify(game), before);
}
console.log('PASS distinct tetrarchies and rival claimants, and old borrowed-flag saves upgrade without mutation');
const galilee = flagChip('JUD', DEFINES, 24, false, { tags: { JUD: { flag: 'GAL' } } });
assert.match(galilee, /data-flag-key="GAL"/);
const lens = ERAS.find(e => e.bookmark.id === '351ce').bookmark.tagTweaks.JUD;
assert.match(flagChip('JUD', DEFINES, 34, false, null, lens), /data-flag-key="GAL"/);
for (const variant of ['EGY_REP','SYR_BAATH','SYR_FAR','IRQ_REP','IRQ_BAATH','IRN_IR','GRC_MOD']) {
  const html = flagChip('JUD', DEFINES, 24, false, { tags: { JUD: { flag: variant } } });
  assert.match(html, new RegExp('data-flag-key="' + variant + '"'));
}
const live = { tags: { F123: { name: 'An old saved court', color: [80,100,120], releaseIdentity: 'greek|hellenism' } } };
const a = flagChip('F123', DEFINES, 24, true, live);
assert(!a.includes('fchip-abbr')); assert.match(a, /data-open-tag="F123"/);
assert.equal(a, flagChip('F123', DEFINES, 24, true, live));
live.tags.F123.releaseIdentity = 'arab|islam'; assert.notEqual(a, flagChip('F123', DEFINES, 24, true, live));
const malicious = { tags: { HPA: { flag: '__proto__', name: '<img onerror="x">', color: [90,100,110] } } };
assert.match(flagChip('HPA', DEFINES, 24, false, malicious), /data-flag-key="HPA"/);
assert(!flagChip('HPA', DEFINES, 24, false, malicious).includes('<img'));
assert(FLAT_FLAGS.HPA.flatBanner && FLAT_FLAGS.HPH.flatBanner);
console.log('PASS runtime rebrands, the Galilee lens, deterministic legacy courts, link targets and untrusted save values');
console.log('ALL PASS');

