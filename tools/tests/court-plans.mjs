import assert from 'node:assert/strict';
import { monthlyCourtPlans, courtBudget, courtWarPlan, courtIntentions, courtAttitude, rememberCourtEvent } from '../../js/sim/court_plans.js';
function fixture() {
  const tag = (name, extra={}) => ({name,alive:true,ai:true,treasury:200,income:10,expenses:4,stability:1,manpower:5000,maxManpower:6000,claims:[],allies:[],guarantees:[],opinion:{},atWarWith:[],ruler:{name:`${name} I`,gov:2,infl:2,mar:4},...extra});
  const p = (id,owner,coastal=false) => ({id,owner,controller:owner,name:`Province ${id}`,dev:{tax:3,prod:2,mp:1},coastal});
  const provinces = [null,p(1,'A'),p(2,'B',true),p(3,'C'),p(4,'D')];
  const ctx = {game:{date:{y:1,m:1},playerTag:'D',humanTags:['D'],tags:{A:tag('Alpha',{claims:[2]}),B:tag('Beta',{opinion:{A:-50}}),C:tag('Gamma'),D:tag('Delta',{ai:false})},provinces,armies:{a:{tag:'A',men:6000},b:{tag:'B',men:2000},c:{tag:'C',men:5000}},truces:{},wars:[]},geom:{neighbors:[new Set(),new Set([2]),new Set([1,3]),new Set([2]),new Set()],coastal:[false,false,true,false,false]},DEFINES:{PERSONALITIES:{}},bookmark:{id:'test',factions:{}},byId:id=>provinces[id]};
  return ctx;
}
const advance = (ctx,count=1) => { for(let i=0;i<count;i++) { if(++ctx.game.date.m>12) {ctx.game.date.m=1;ctx.game.date.y++;} monthlyCourtPlans(ctx); } };
{
 const c=fixture();c.game.tags.A.claims=[];
 c.game.tags.A.grudges={B:{provs:[2,3],y:1,m:1,thaw:0}};
 monthlyCourtPlans(c);
 const goal=c.game.tags.A.courtPlan.goals.find(g=>g.kind==='recover');
 assert(goal,'lost patrimony creates a recovery ambition without an explicit claim');
 assert.equal(goal.target,'B');assert.equal(goal.province,2,'only land still owned by the taker is eligible');assert.match(goal.reason,/lost province/);
 advance(c,6);assert.equal(courtWarPlan(c,'A','B').ready,true,'lost-land ambition prepares an actual campaign');
 c.game.provinces[2].owner='C';c.game.provinces[2].controller='C';advance(c);
 assert(!c.game.tags.A.courtPlan.goals.some(g=>g.kind==='recover'),'a stale grudge cannot target land transferred to a third party');
 const returned=fixture();returned.game.tags.A.claims=[];returned.game.tags.A.grudges={B:{provs:[2],y:1,m:1}};monthlyCourtPlans(returned);
 delete returned.game.tags.A.grudges.B;advance(returned);assert(!returned.game.tags.A.courtPlan.goals.some(g=>g.kind==='recover'),'reconciliation extinguishes a grudge-only objective');
 console.log('PASS recorded lost lands create recovery ambitions with live ownership and reconciliation checks');
}
{
 const c=fixture();monthlyCourtPlans(c);
 assert.equal(c.game.tags.D.courtPlan,undefined,'human policy untouched');
 assert.equal(c.game.tags.A.courtPlan.goals[0].kind,'recover');
 assert.equal(courtBudget(c,'A').priority,'military');
 assert.equal(courtWarPlan(c,'A','B').ready,false,'campaign needs preparation');
 const start=c.game.tags.A.courtPlan.goals[0].started; advance(c,6);
 assert.equal(c.game.tags.A.courtPlan.goals[0].started,start,'goal persists');
 assert.equal(courtWarPlan(c,'A','B').ready,true,'preparation yields a viable campaign');
 c.game.tags.B.allies=['C'];assert.equal(courtWarPlan(c,'A','B').ready,false,'enemy coalition counted');
 c.game.tags.B.allies=[];c.game.truces['A|B']={y:2,m:1};assert.equal(courtWarPlan(c,'A','B').ready,false,'truce blocks campaign');
 delete c.game.truces['A|B'];c.game.tags.A.treasury=1;assert.equal(courtWarPlan(c,'A','B').ready,false,'reserve funded with real treasury');
 c.game.tags.A.treasury=200;c.game.tags.A.modifiers=[{effects:{aiPassive:true}}];assert.equal(courtWarPlan(c,'A','B').ready,false,'scripted lull respected');
 delete c.game.tags.A.modifiers;c.game.provinces[2].owner='A';c.game.provinces[2].controller='A';advance(c);
 assert(!c.game.tags.A.courtPlan.goals.some(g=>g.kind==='recover'),'completed claim invalidates immediately');
 console.log('PASS persistent goals, preparations, reserves, coalitions, truces, scripted lulls and completed conquests');
}
{
 const c=fixture();c.game.armies.a.men=500;c.game.tags.A.manpower=100;c.game.tags.A.maxManpower=100;c.game.tags.A.claims=[];
 monthlyCourtPlans(c);assert.equal(c.game.tags.A.courtPlan.goals[0].kind,'survive');assert.equal(courtBudget(c,'A').priority,'defense');assert.equal(courtBudget(c,'A').targetProvince,1);
 c.game.tags.A.overlord='B';c.game.tags.A.opinion.B=-100;advance(c);assert(c.game.tags.A.courtPlan.goals.some(g=>g.kind==='independence'));
 assert.equal(courtWarPlan(c,'A','B').ready,false,'subject cannot start ordinary conquest');
 console.log('PASS small courts seek security and client courts pursue leverage without unauthorized wars');
}
{
 const c=fixture();monthlyCourtPlans(c);rememberCourtEvent(c,'A','B','broken_promise',{text:'Broke the promise of land'});rememberCourtEvent(c,'A','B','broken_promise');
 assert.equal(c.game.tags.A.courtPlan.memories.length,1,'same treaty cannot stack');
 c.game.tags.A.allies=[];c.game.tags.A.courtPlan.goals=[];assert.equal(courtAttitude(c,'A','B').kind,'distrustful');
 for(let i=0;i<30;i++){advance(c);rememberCourtEvent(c,'A','B','aid');}assert(c.game.tags.A.courtPlan.memories.length<=24);
 advance(c,241);assert.equal(c.game.tags.A.courtPlan.memories.length,0,'memories expire');
 console.log('PASS diplomacy memories are bounded, persistent and expire');
}
{
 const c=fixture();c.bookmark.factions.A=[{id:'merchants',name:'Merchants',start:70,boon:{effects:{tradeMult:1.2}}}];monthlyCourtPlans(c);
 assert.equal(c.game.tags.A.courtPlan.domestic.pressure,'prosperity');
 c.game.tags.A.factions={merchants:10};advance(c);assert.equal(c.game.tags.A.courtPlan.goals[0].kind,'rebuild');
 advance(c,6);assert(c.game.tags.A.courtPlan.goals.some(g=>g.kind==='recover'),'recovery retains the secondary territorial ambition');
 assert.equal(courtWarPlan(c,'A','B').ready,false,'domestic rebuilding prevents a prepared secondary offensive despite a rich, stable court');
 assert.equal(courtWarPlan(c,'A','B').reason,'Domestic recovery takes priority');
 c.game.tags.A.ruler={name:'Alpha II',gov:6,infl:2,mar:1};advance(c);assert.equal(c.game.tags.A.courtPlan.ruler.inclination,'administrative');assert(c.game.tags.A.courtPlan.history.some(h=>h.kind==='succession'));
 const restored=JSON.parse(JSON.stringify(c.game));c.game=restored;const before=JSON.stringify(c.game);courtIntentions(c,'A','B');courtBudget(c,'A');courtAttitude(c,'A','B');courtWarPlan(c,'A','B');assert.equal(JSON.stringify(c.game),before,'readers pure after restore');
 const distant=courtIntentions(c,'A','D');assert.equal(distant.visible,false);assert.deepEqual(distant.goals,[]);
 const visible=courtIntentions(c,'A','B');assert.equal(visible.visible,true);assert(!('reserve' in visible.preparation));assert(!('score' in visible.goals[0]));assert(!('signature' in visible.ruler));
 console.log('PASS domestic factions, succession, JSON persistence, pure readers and intelligence limits');
}
{
 const c=fixture();c.game.date={y:-1,m:12};monthlyCourtPlans(c);const at=c.game.tags.A.courtPlan.lastMonth;c.game.date={y:1,m:1};monthlyCourtPlans(c);assert.equal(c.game.tags.A.courtPlan.lastMonth-at,1,'no year zero in planning clock');
 console.log('PASS BCE/CE transition uses continuous monthly clock');
}
// Real bookmark courts must obtain reproducible policies without requiring a
// browser, historical event, or a particular playable faction to activate them.
{
 const [{DEFINES},{MAP_DATA},{ERAS},{buildProvinceMapping},{initGame,makeCtx},{readFileSync}] = await Promise.all([
   import('../../js/data/defines.js'),import('../../js/data/map_data.js'),import('../../js/data/compendium.js'),import('../../js/data/map_profile.js'),import('../../js/sim/init.js'),import('node:fs')]);
 const snap=JSON.parse(readFileSync(new URL('../geom-snapshot.json',import.meta.url)));
 let courts=0;
 for(const era of ERAS) {
   const bookmark=era.bookmark, playerTag=bookmark.playableTags[0].tag, provinceMap=buildProvinceMapping(MAP_DATA,bookmark), to=id=>provinceMap?.[id]||id;
   const neighbors=snap.neighbors.map(()=>new Set());for(let id=1;id<neighbors.length;id++)for(const nb of snap.neighbors[id])if(to(id)!==to(nb)){neighbors[to(id)].add(to(nb));neighbors[to(nb)].add(to(id));}
   const geom={neighbors,coastal:snap.coastal.map(Boolean),centroids:snap.centroids.map(c=>c?{x:c[0],y:c[1]}:null),areas:Int32Array.from(snap.areas),bbox:[]};
   const game=initGame({DEFINES,MAP_DATA,geom,bookmark,events:[],playerTag,rngSeed:17,provinceMap});
   const ctx=makeCtx({game,DEFINES,MAP_DATA,geom,bookmark,events:[],provinceMap,bus:{emit(){},on(){return()=>{};}}});
   const playerBefore=JSON.stringify(game.tags[playerTag]);monthlyCourtPlans(ctx);
   assert.equal(JSON.stringify(game.tags[playerTag]),playerBefore,'human chair preserved in '+bookmark.id);
   const relevant=Object.entries(game.tags).filter(([tag,t])=>tag!=='REB'&&t.alive&&t.ai);
   assert(relevant.length>0);
   for(const[tag,t]of relevant){assert(t.courtPlan,`${bookmark.id}/${tag} receives policy`);assert(t.courtPlan.goals.length<=2);assert(Number.isFinite(t.courtPlan.reserve));courts++;}
   const before=JSON.stringify(game);monthlyCourtPlans(ctx);assert.equal(JSON.stringify(game),before,'same-month idempotence '+bookmark.id);
 }
 console.log(`PASS ${ERAS.length} bookmark registries and ${courts} AI courts receive serializable, idempotent plans while human policies remain intact`);
}

console.log('court-plans: ALL PASS');
