import assert from 'node:assert/strict';
import {DEFINES} from '../../js/data/defines.js';
import {MAP_DATA} from '../../js/data/map_data.js';
import {ERAS} from '../../js/data/compendium.js';
import {initGame,makeCtx,gameActions} from '../../js/sim/init.js';
import {evaluatePeaceDeal,executePeaceDeal,updateTagLife} from '../../js/sim/military.js';
import {renderPeaceWarScore,renderPeaceStrategy,peaceTermsSummary,renderPeaceClientTransfers} from '../../js/ui/peace_strategy.js';

function scene(id='67bce',player='ARI'){
 const {bookmark,events}=ERAS.find(e=>e.bookmark.id===id);
 const geom={neighbors:[],centroids:[],areas:[],coastal:[],offshore:[]};
 const game=initGame({DEFINES,MAP_DATA,geom,bookmark,events,playerTag:player,rngSeed:73});
 const ctx=makeCtx({game,DEFINES,MAP_DATA,geom,bookmark,events,bus:{emit(){},on(){return()=>{};}}});
 const war=game.wars.find(w=>w.attackers.includes(player)||w.defenders.includes(player));
 return {game,ctx,war,actions:gameActions(ctx)};
}
{
 const {game,ctx,war,actions}=scene();
 war.warscore.ARI=66;war.warscore.HYR=-66;
 for(const p of game.provinces)if(p?.owner==='HYR')p.controller='ARI';
 game.tags.HYR.warExhaustion=40;
 const before=JSON.stringify(game),ordinary=actions.getWarScore(war.id);
 assert.equal(ordinary.warScore,82.5,'reproduce the screenshot war score');
 const ev=evaluatePeaceDeal(ctx,war,'ARI',{unifyCrown:true});
 assert(ev.unifyCrown);assert.equal(ev.cost,80);assert.equal(ev.militaryWarScore,66);
 assert.equal(ev.acceptable,false,'the crown still requires its military threshold');
 assert(!ev.expansion.some(r=>r.tag==='HYR'),'the eliminated claimant cannot appear as a future coalition member');
 assert(ev.expansion.some(r=>r.tag==='SEL'),'surviving neighboring courts still react');
 assert.equal(JSON.stringify(game),before,'preview is read-only');
 assert.deepEqual(evaluatePeaceDeal(ctx,war,'ARI',{unifyCrown:true}),ev,'preview is deterministic');
 const partial=evaluatePeaceDeal(ctx,war,'ARI',{provinces:[game.provinces.find(p=>p?.owner==='HYR').id]});
 assert(partial.expansion.some(r=>r.tag==='HYR'),'a surviving rival remains in the ordinary territorial preview');
 assert.match(renderPeaceWarScore(ev),/Military score/);
 assert.match(renderPeaceStrategy(ev),/Required/);
 assert(!renderPeaceStrategy(ev).includes('25%'),'crown settlements do not advertise an inapplicable enthusiasm cap');
 assert.equal(peaceTermsSummary(ev,{myWs:66}),'Taking the whole kingdom requires 80 military score; we have 66.');
 assert.match(ev.reason,/80 military score; we have 66/,'the refusal names the actual threshold');
 assert.match(peaceTermsSummary(partial,{myWs:66}),/we have 82\.5/,'ordinary terms retain their enthusiasm bonus');
 assert.equal(evaluatePeaceDeal(ctx,war,'ARI',{unifyCrown:true},{consequences:false}).expansion.length,0,'AI fast path skips consequence forecasting');
 console.log('PASS screenshot reproduction: 82.5 ordinary score, 66 military score, explicit crown requirement, and no eliminated claimant');
 war.warscore.ARI=80;war.warscore.HYR=-80;
 const accepted=evaluatePeaceDeal(ctx,war,'ARI',{unifyCrown:true});assert(accepted.acceptable);
 const oldConcern=JSON.stringify(game.tags.HYR.expansionConcern);
 executePeaceDeal(ctx,war,'ARI',{unifyCrown:true});
 assert.equal(game.tags.HYR.alive,false);
 assert(!Object.values(game.armies).some(a=>a.tag==='HYR'));
 assert.equal(JSON.stringify(game.tags.HYR.expansionConcern),oldConcern,'execution also excludes the eliminated claimant');
 for(const r of accepted.expansion)assert.equal(game.tags[r.tag].expansionConcern.ARI,r.after,'applied concern matches preview');
 console.log('PASS accepted crown settlement eliminates the rival and applies exactly the surviving courts’ preview');
}
for(const keepArmy of [false,true]){
 const {game,ctx,war}=scene('66ce','JUD');
 war.warscore.JUD=100;
 const ids=game.provinces.filter(p=>p&&!p.impassable&&p.owner==='AGR').map(p=>p.id);
 for(const id of ids)game.provinces[id].controller='JUD';
 if(!keepArmy)for(const [id,a] of Object.entries(game.armies))if(a.tag==='AGR')delete game.armies[id];
 const ev=evaluatePeaceDeal(ctx,war,'JUD',{provinces:ids});
 assert(ev.acceptable);
 assert.equal(ev.expansion.some(r=>r.tag==='AGR'),keepArmy,'ordinary annexation follows whether the court survives');
 executePeaceDeal(ctx,war,'JUD',{provinces:ids});updateTagLife(ctx);
 assert.equal(game.tags.AGR.alive,keepArmy,'forecast agrees with the real post-treaty court');
}
console.log('PASS ordinary annexation excludes eliminated courts and retains courts with surviving armies');
assert.equal(renderPeaceClientTransfers({transferableVassals:[]}),'' ,'an empty transfer section is hidden');
const clients=renderPeaceClientTransfers({transferableVassals:[{tag:'NAB',name:'Nabataea',fromName:'Hyrcanus',provIds:[10],dev:20,cost:30}]});
assert.match(clients,/Take over their client kingdoms/);assert.match(clients,/data-transfer-vassal="NAB"/);
assert.match(clients,/Transfer Nabataea to us/,'available client transfers remain selectable');
assert.match(peaceTermsSummary({},{exit:false},true),/white peace/);
assert.match(peaceTermsSummary({},{exit:true},true),/withdrawal/);
assert.match(peaceTermsSummary({net:-12,offered:12},{myWs:-12}),/We offer 12/);
console.log('PASS visible crown pricing, ordinary and concession summaries, and conditional client-transfer controls');
