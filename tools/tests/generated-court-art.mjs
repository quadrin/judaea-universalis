import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DEFINES} from '../../js/data/defines.js';
import {BOOKMARK_1948} from '../../js/data/bookmark_1948.js';
import {FLAGS,courtChip,courtInfo,flagChip} from '../../js/ui/icons.js';
import {GENERATED_COURT_ASSETS} from '../../js/ui/generated_standards.js';

const manifest=JSON.parse(await fs.readFile(new URL('../../icons/court-generated/manifest.json',import.meta.url),'utf8'));
const sources=new Map(manifest.assets.map(a=>[a.id,a]));
assert.equal(Object.keys(GENERATED_COURT_ASSETS).length,123);
for(const [tag,id] of Object.entries(GENERATED_COURT_ASSETS)) {
  const original=FLAGS[tag];
  assert.equal(original.imageAsset,id);
  const expected=sources.get(id);
  assert(expected?.tags.includes(tag),tag+': explicit subject assignment');
  const previews=[14,24,34,52,160,320].map(size=>courtChip(tag,DEFINES,size));
  const bodies=previews.map(html=>html.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)[1]);
  assert.equal(new Set(bodies).size,1,tag+': identical complete image at every size');
  const image=bodies[0].match(/<image\b[^>]*href="data:image\/webp;base64,([A-Za-z0-9+/=]+)"/);
  assert(image,tag+': embedded WebP');
  const bytes=Buffer.from(image[1],'base64');
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.sha256,tag+': checked source image');
  assert(!/<script|foreignObject|\bonload=|href="https?:/i.test(bodies[0]));
  assert.equal(courtInfo(tag,DEFINES).key,tag);
}
for(const tag of ['JDH','JUD','SAM','HAS','HPA','HPH','HER','AGR','HYR','ARI','ATG','JUD_REVOLT','JUD_BK','EPJ_BK','KGJ_BK']) {
  assert(!FLAGS[tag].imageAsset,tag+': approved original preserved');
}
const body=html=>html.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)[1].replaceAll('court-','flag-').replaceAll('fcourt','fflag');
for(const tag of ['USA','UK','YEM','YUG','TUR','ISR','EGY','GRC','OMA']) {
  const lens=BOOKMARK_1948.tagTweaks[tag];
  assert.equal(body(courtChip(tag,DEFINES,52,false,null,lens)),body(flagChip(tag,DEFINES,52,false,null,lens)),tag+': national flag');
}
console.log('PASS 123 generated ancient court entries, checked source images, six sizes, protected approved artwork and modern national flags');
