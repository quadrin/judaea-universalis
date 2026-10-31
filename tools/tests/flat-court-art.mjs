import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {DEFINES} from '../../js/data/defines.js';
import {FLAT_FLAGS} from '../../js/ui/flag_art.js';
import {courtChip} from '../../js/ui/icons.js';

const detailed=Object.entries(FLAT_FLAGS).filter(([,art])=>art.detailed);
assert.equal(detailed.length,164,'retain the complete detailed vector roster');
for(const [tag,art] of detailed) {
  const bodies=[14,24,34,52,160,320].map(size=>courtChip(tag,DEFINES,size).match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)[1]);
  assert.equal(new Set(bodies).size,1,tag+': every game size retains the same complete master');
  assert(!/<(?:image|filter|linearGradient|radialGradient|pattern|script|foreignObject)\b|\bon\w+=|(?:href|src)="https?:/i.test(bodies[0]),tag+': flat, local vector artwork');
  assert(!/NaN|undefined|Infinity/.test(bodies[0]),tag+': valid drawing');
}
for(const [tag,expected] of Object.entries({
  HAS:'4231d76629d90f8ea501ff3c1cd5bbf6ad315c12525d2d65c3754cabd656fe0d',
  JDH:'d5b0bb3ad2c514979088b8b3e493a019893480a72ebcc530d87b0f3cb56290df',
  JUD:'67004b95b7b0a0fd4135d52f288a5dd9518cecb169a59713e9c4432aab70f518',
})) {
  const geometry=FLAT_FLAGS[tag].body.replace(/\s(?:fill|stroke)="[^"]*"/g,'');
  assert.equal(createHash('sha256').update(geometry).digest('hex'),expected,tag+': approved contours survive recolouring');
}
const visited=new Set();
async function visit(url) {
  if(visited.has(url.href))return;
  visited.add(url.href);
  assert(!/generated_(?:standards|court_assets_)/.test(url.pathname),'metallic bitmap modules must not enter the game graph');
  const source=await fs.readFile(url,'utf8');
  for(const match of source.matchAll(/(?:^|\n)\s*import\s+(?:[^;\n]*?\s+from\s+)?['"]([^'"]+)['"]/g)) {
    if(match[1].startsWith('.'))await visit(new URL(match[1],url));
  }
}
await visit(new URL('../../main.js',import.meta.url));
console.log('PASS 164 flat vector standards at six sizes, preserved approved contours, and no metallic bitmap imports');
