import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {DEFINES} from '../../js/data/defines.js';
import {FLAT_FLAGS} from '../../js/ui/flag_art.js';
import {courtChip} from '../../js/ui/icons.js';
import {FLAT_GENERATED_IMAGES,FLAT_GENERATED_COURTS} from '../../js/ui/flat_generated_images.js';

const manifest=JSON.parse(await fs.readFile(new URL('../../icons/court-flat/manifest.json',import.meta.url),'utf8'));
assert.equal(manifest.assets.length,143,'complete individually generated master set');
assert.equal(Object.keys(FLAT_GENERATED_IMAGES).length,143);
assert.equal(Object.keys(FLAT_GENERATED_COURTS).length,160);
for(const asset of manifest.assets){
 const uri=FLAT_GENERATED_IMAGES[asset.id];
 assert.match(uri,/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/);
 const data=Buffer.from(uri.split(',')[1],'base64');
 assert.equal(data.subarray(0,4).toString(),'RIFF');
 assert.equal(data.subarray(8,12).toString(),'WEBP');
 assert.equal(createHash('sha256').update(data).digest('hex'),asset.sha256,asset.id+': embedded master matches reviewed asset');
 assert.equal(data.length,asset.bytes);
 assert(asset.bytes>4000&&asset.transparent&&Math.max(asset.width,asset.height)===640,asset.id+': complete transparent artwork');
 assert(asset.prompt.length>100&&asset.source_sha256.length===64,asset.id+': generation provenance');
 for(const tag of asset.tags){
  assert.equal(FLAT_GENERATED_COURTS[tag],asset.id);
  assert.equal(FLAT_FLAGS[tag].imageAsset,asset.id);
  assert(FLAT_FLAGS[tag].body.includes(uri),tag+': uses its assigned generated master');
 }
}
const detailed=Object.entries(FLAT_FLAGS).filter(([,art])=>art.detailed);
assert.equal(detailed.length,165);
assert.equal(detailed.filter(([,a])=>a.artworkStyle==='detailed-flat-generated').length,164);
for(const [tag,art] of detailed){
 const bodies=[14,24,34,52,160,320].map(size=>courtChip(tag,DEFINES,size).match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)[1]);
 assert.equal(new Set(bodies).size,1,tag+': every game size uses the same complete master');
 const markup=bodies[0].replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g,'embedded');
 assert(!/<(?:filter|linearGradient|radialGradient|pattern|script|foreignObject)\b|\bon\w+=|(?:href|src)="(?:https?:|javascript:)/i.test(markup),tag+': passive self-contained artwork');
 assert(!/NaN|undefined|Infinity/.test(markup),tag+': valid drawing');
}
const visited=new Set();
async function visit(url){
 if(visited.has(url.href))return;
 visited.add(url.href);
 assert(!/\/(?:generated_standards|generated_court_assets_\d+)\.js$/.test(url.pathname),'archived gold artwork must stay out of active imports');
 const source=await fs.readFile(url,'utf8');
 for(const match of source.matchAll(/(?:^|\n)\s*import\s+(?:[^;\n]*?\s+from\s+)?['"]([^'"]+)['"]/g))if(match[1].startsWith('.'))await visit(new URL(match[1],url));
}
await visit(new URL('../../main.js',import.meta.url));
assert([...visited].some(s=>s.endsWith('/flat_generated_standards.js')));
for(let n=0;n<24;n++)assert([...visited].some(s=>s.endsWith(`/flat_generated_assets_${String(n).padStart(2,'0')}.js`)));
console.log('PASS 143 generated masters for 164 court identities, provenance and image hashes, six display sizes, and active import coverage');
