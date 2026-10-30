import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {AUTHENTIC_NATIONAL_FLAGS as sourced, NATIONAL_FLAG_CREDITS, FLAG_ICONS_LICENSE} from '../../js/ui/authentic_national_flags.js';
import {FLAGS, flagChip, courtChip} from '../../js/ui/icons.js';
import {DEFINES} from '../../js/data/defines.js';

assert.equal(Object.keys(sourced).length,25);
assert.equal(NATIONAL_FLAG_CREDITS.length,25);
assert.match(FLAG_ICONS_LICENSE,/Copyright \(c\) 2013 Panayiotis Lipiridis/);
for (const [tag,art] of Object.entries(sourced)) {
  const source=await fs.readFile(new URL(`../../icons/source/national-flags/${tag}.svg`,import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'),art.sourceSHA256,tag+': traceable source');
  assert.equal(FLAGS[tag],art,tag+': authoritative rendering override');
  const game={tags:{[tag]:{flag:tag}}};
  const rendered=[14,24,34,52,160,320].map(size=>courtChip(tag,DEFINES,size,false,game));
  const bodies=rendered.map(html=>html.slice(html.indexOf('<svg'),html.lastIndexOf('</svg>')+6));
  assert.equal(new Set(bodies).size,1,tag+': complete flag at every size');
  for (const html of rendered) assert.match(html,/background-color:transparent/,tag+': no fictional field in letterboxing');
  assert.equal(courtChip(tag,DEFINES,52,false,game).replaceAll('data-art-kind="court"','data-art-kind="flag"').replaceAll('fcourt','fflag'),flagChip(tag,DEFINES,52,false,game));
  assert(!/<(?:script|foreignObject|text|filter|image)\b|\bon\w+=|(?:href|src)="(?!#)|url\([\'"]?(?!#)/i.test(art.body),tag+': passive vector only');
  const html=bodies[0],ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for (const match of html.matchAll(/(?:href="#|url\(#)([^"\)]+)/g)) assert(ids.has(match[1]),tag+': scoped reference resolves '+match[1]);
}
assert.equal((sourced.YEM.body.match(/href="#star"/g)||[]).length,5,'Yemen has five stars');
assert.match(sourced.YEM.note,/sword/);
assert.match(sourced.IRN.note,/Lion and Sun/);
assert.match(sourced.AFG.note,/mosque/);
assert.match(sourced.ETH.note,/Lion of Judah/);
assert.match(sourced.IRN_IR.note,/border inscription/);
assert.match(sourced.GER.note,/not a national flag/);
console.log('PASS 25 attributed flag sources, source hashes, full artwork at six sizes, passive SVGs, scoped references, dated devices and court/flag parity');
