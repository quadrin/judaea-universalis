import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DEFINES } from '../../js/data/defines.js';
import { BOOKMARK_1948 } from '../../js/data/bookmark_1948.js';
import { FLAT_FLAGS } from '../../js/ui/flag_art.js';
import { FLAGS, flagChip, flagInfo, courtChip, courtInfo } from '../../js/ui/icons.js';
import { REVISED_COURTS } from '../../js/ui/court_revisions.js';
import { MODERN_COURT_ART, MODERN_FLAG_REPAIRS } from '../../js/ui/modern_standards.js';

assert.equal(REVISED_COURTS.length,108);
const modern='HEJ KUR ALW DRZ ISR EGY JOR SYR LEB IRQ TUR GRC SAU IRN UK ITA UAR SAR HEZ FRA SPA POR NLD DEN SWE POL CZE SOV GER AUT HUN YUG ALB BUL ROU IRL SUI BEL LUX OMA ETH YEM AFG PAK LBR USA'.split(' ');
assert.equal(modern.length,46);
assert.equal(Object.keys(MODERN_COURT_ART).length,52);
const body=html=>html.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)[1];
for(const tag of REVISED_COURTS) {
  const lens=modern.includes(tag)?BOOKMARK_1948.tagTweaks[tag]:null;
  const info=courtInfo(tag,DEFINES,null,lens);
  assert(info.detailed && info.note.length>40,tag+': interpreted court artwork');
  const masters=[14,24,34,52,160,320].map(size=>body(courtChip(tag,DEFINES,size,false,null,lens)));
  assert.equal(new Set(masters).size,1,tag+': retain the same complete master');
  assert(!/<(?:script|foreignObject|text|filter|linearGradient|radialGradient|pattern)\b|\bon\w+=|(?:href|src)="(?:https?:|javascript:)/i.test(masters[0]),tag+': self-contained artwork');
  for(const m of masters[0].matchAll(/<image\b[^>]*href="([^"]+)"/g)) assert.match(m[1],/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/,tag+': embedded image only');
  assert(!/NaN|undefined|Infinity/.test(masters[0].replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g,'')),tag+': finite drawing');
}
for(const [tag,expected] of [['GRC','GRC_MOD'],['OMA','OMA_MOD']]) {
  assert.equal(courtInfo(tag,DEFINES,null,BOOKMARK_1948.tagTweaks[tag]).key,expected);
  assert.equal(courtInfo(tag,DEFINES).key,tag,'ancient identity remains separate');
}
for(const variant of ['EGY_REP','SYR_BAATH','SYR_FAR','IRN_IR','IRQ_BAATH','IRQ_REP']) {
  const tag=variant.slice(0,3),game={tags:{[tag]:{flag:variant,name:'Rebranded court'}}};
  assert.equal(courtInfo(tag,DEFINES,game).key,variant);
  assert.equal(courtInfo(tag,DEFINES,game).note,flagInfo(tag,DEFINES,game).note);
  assert.match(courtChip(tag,DEFINES,34,false,game),new RegExp(`data-flag-key="${variant}"`));
  assert.equal(flagInfo(tag,DEFINES,game).key,variant,'diplomatic flag follows the same regime');
}
assert.equal(courtInfo('OMA',DEFINES,{date:{y:1948},tags:{OMA:{}}}).key,'OMA_MOD','old Omani save upgrades its portrait');
assert.equal(courtInfo('USA',DEFINES,{tags:{USA:{flag:'__proto__'}}}).key,'USA');
assert.equal((FLAGS.USA.body.match(/<path\b/g)||[]).length,48,'the 1948 national flag has 48 individual stars');
assert.equal(Object.keys(MODERN_FLAG_REPAIRS).length,6);
for (const tag of modern) {
  const lens=BOOKMARK_1948.tagTweaks[tag];
  assert.equal(body(courtChip(tag,DEFINES,52,false,null,lens)).replaceAll('court-','flag-').replaceAll('fcourt','fflag'),body(flagChip(tag,DEFINES,52,false,null,lens)),tag+': modern court displays its national flag');
  assert.deepEqual(courtInfo(tag,DEFINES,null,lens),flagInfo(tag,DEFINES,null,lens),tag+': flag caption and source follow the same identity');
}
for (const key of Object.keys(MODERN_COURT_ART)) {
  const tag=key.slice(0,3),game={tags:{[tag]:{flag:key}}};
  assert.equal(body(courtChip(tag,DEFINES,160,false,game)).replaceAll('court-','flag-').replaceAll('fcourt','fflag'),body(flagChip(tag,DEFINES,160,false,game)),key+': national flag survives saved regime changes');
}
assert.equal(createHash('sha256').update(JSON.stringify(FLAT_FLAGS.SAM)).digest('hex'),
  'cc838c64acaae738440f1bcb2c6b84e5b4be3b9c213e8e5bdb0564bd1126941e','SAM: approved master unchanged');
assert.equal(createHash('sha256').update(FLAT_FLAGS.HAS.body.replace(/\s(?:fill|stroke)="[^"]*"/g,'')).digest('hex'),
  '4231d76629d90f8ea501ff3c1cd5bbf6ad315c12525d2d65c3754cabd656fe0d','HAS: approved contours retained with new flat inks');
console.log('PASS 154 audited courts, 52 modern masters and variants, six flag repairs, six rendering sizes, dated identities, saved rebrands and protected approved masters');


