// National paths change the real economy, armies and court even before an
// optional contextual action is executed. Restored tiers have the same effects.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFINES} from '../../js/data/defines.js';
import {MAP_DATA} from '../../js/data/map_data.js';
import {ERAS} from '../../js/data/compendium.js';
import {buildProvinceMapping} from '../../js/data/map_profile.js';
import {NATIONAL_IDEAS,NATIONAL_ACTIONS,nationalIdeaEffects} from '../../js/data/national_ideas.js';
import {initGame,makeCtx,reviveGame} from '../../js/sim/init.js';
import {buyNationalIdea,monthlyNationalIdeas,nationalStrategyView,nationalActionInfo,runNationalAction} from '../../js/sim/national_ideas.js';
import {incomeBreakdown,maxManpowerOf,monthlyManpower} from '../../js/sim/economy.js';
import {tradeIncomeOf} from '../../js/sim/trade.js';
import {fleetPowerOf} from '../../js/sim/navy.js';
import {monthlyIntegration} from '../../js/sim/realm.js';
import {computeUnrestBreakdown} from '../../js/sim/unrest.js';
import {spawnArmy,forceLimitOf,diploCapacity,monthlyReinforce,tickSieges,resolveTagMult,resolveTagAdd} from '../../js/sim/military.js';
const snap=JSON.parse(readFileSync(new URL('../geom-snapshot.json',import.meta.url)));
function scene(){
 const bookmark=ERAS.find(e=>e.bookmark.id==='66ce').bookmark,tag=bookmark.playableTags[0].tag;
 const provinceMap=buildProvinceMapping(MAP_DATA,bookmark),to=id=>provinceMap?.[id]||id,neighbors=snap.neighbors.map(()=>new Set());
 for(let id=1;id<neighbors.length;id++)for(const nb of snap.neighbors[id])if(to(id)!==to(nb)){neighbors[to(id)].add(to(nb));neighbors[to(nb)].add(to(id));}
 const geom={neighbors,coastal:snap.coastal.map(Boolean),centroids:snap.centroids.map(c=>c?{x:c[0],y:c[1]}:null),areas:Int32Array.from(snap.areas),bbox:[]};
 const game=initGame({DEFINES,MAP_DATA,geom,bookmark,events:[],playerTag:tag,rngSeed:7,provinceMap});
 const ctx=makeCtx({game,DEFINES,MAP_DATA,geom,bookmark,events:[],provinceMap,bus:{emit(){},on(){return()=>{};}}});
 game.armies={};game.fleets={};game.battles=[];game.wars=[];game.truces={};game.recognitions={};game.ceasefire=null;
 for(const t of Object.values(game.tags)){t.ai=false;t.allies=[];t.atWarWith=[];t.overlord=null;t.treasury=3000;t.manpower=30000;t.points={gov:999,infl:999,mar:999};}
 const t=game.tags[tag];t.nationalIdeas={};t.nationalPathLegacySlots=5;t.legitimacy=50;
 const homes=['Jerusalem','Emmaus','Jericho','Joppa'].map(name=>ctx.prov(name));
 for(const p of homes){p.owner=p.controller=tag;p.siege=null;p.dev={tax:12,prod:12,mp:12};p.modifiers=[];}
 return{ctx,game,tag,t,homes};
}
const adopt=(s,key)=>{const r=buyNationalIdea(s.ctx,s.tag,key);assert(r.ok,`${key}: ${r.why}`);};
const close=(actual,expected,msg)=>assert(Math.abs(actual-expected)<1e-8,`${msg}: ${actual} versus ${expected}`);
{
 const s=scene(),trade=tradeIncomeOf(s.ctx,s.tag),fleet={tag:s.tag,gen:0,ships:2},naval=fleetPowerOf(s.ctx,fleet);
 assert(trade>0);adopt(s,'maritime');close(tradeIncomeOf(s.ctx,s.tag),trade*1.15,'factors improve actual trade receipts');
 adopt(s,'maritime');close(fleetPowerOf(s.ctx,fleet),naval*1.1,'harbor institutions improve actual fleet strength');
 adopt(s,'maritime');close(tradeIncomeOf(s.ctx,s.tag),trade*1.15*1.15,'league adds trade efficiency');close(fleetPowerOf(s.ctx,fleet),naval*1.1*1.1,'league fleet strength compounds once per tier');
 console.log('PASS every Maritime tier changes actual trade income or naval combat strength without placing a warehouse');
}
{
 const s=scene(),capacity=diploCapacity(s.ctx,s.tag);
 monthlyIntegration(s.ctx);const baseline=s.t.legitimacy;s.t.legitimacy=50;
 adopt(s,'dynasty');monthlyIntegration(s.ctx);close(s.t.legitimacy-baseline,.15,'exile court improves monthly legitimacy');
 adopt(s,'dynasty');assert.equal(diploCapacity(s.ctx,s.tag),capacity+1,'compact tier supports another actual diplomatic relationship');
 adopt(s,'dynasty');assert.equal(diploCapacity(s.ctx,s.tag),capacity+2);s.t.legitimacy=50;monthlyIntegration(s.ctx);close(s.t.legitimacy-baseline,.3,'full dynasty path supports the ruling house monthly');
 console.log('PASS every Dynastic tier changes actual monthly legitimacy or diplomatic capacity without a claimant');
}
{
 const s=scene(),mp=maxManpowerOf(s.ctx,s.tag);s.t.manpower=0;monthlyManpower(s.ctx);const gain=s.t.manpower;
 adopt(s,'colonies');assert(Math.abs(maxManpowerOf(s.ctx,s.tag)-mp*1.15)<=2);s.t.manpower=0;monthlyManpower(s.ctx);assert(s.t.manpower>gain,'veterans increase actual monthly manpower recovery');
 const id=spawnArmy(s.ctx,s.tag,s.homes[0].name,{inf:10}),a=s.game.armies[id];a.men=8000;s.t.manpower=30000;
 monthlyReinforce(s.ctx);const reinforced=a.men-8000;a.men=8000;s.t.manpower=30000;adopt(s,'colonies');monthlyReinforce(s.ctx);assert(Math.abs((a.men-8000)-reinforced*1.2)<=1,'districts reinforce an actual army faster');
 const upkeep=incomeBreakdown(s.ctx,s.tag).maint,limit=forceLimitOf(s.ctx,s.tag);adopt(s,'colonies');close(incomeBreakdown(s.ctx,s.tag).maint,upkeep*.85,'common command cuts paid army upkeep');assert(forceLimitOf(s.ctx,s.tag)>limit);
 console.log('PASS every Military Colonies tier changes real manpower, reinforcement, upkeep or force limits without founding a colony');
}
{
 const s=scene();s.game.date.m=8;const p=s.ctx.prov('Lydda');p.owner=p.controller='ROM';p.fort=1;p.garrison=p.maxGarrison=1000;
 spawnArmy(s.ctx,s.tag,p.name,{inf:3});s.t.atWarWith=['ROM'];s.game.tags.ROM.atWarWith=[s.tag];
 const progress=()=>{p.siege={by:s.tag,days:0,progress:0,breach:0};p.garrison=1000;tickSieges(s.ctx);return p.siege.progress;};
 const before=progress();assert(before>0);adopt(s,'subversion');close(progress(),before*1.1,'contacts accelerate a real siege');
 adopt(s,'subversion');const second=progress();assert(second>before*1.1,'political organization improves siegecraft');
 adopt(s,'subversion');close(progress(),second*1.15,'collaboration tier accelerates siege progress again');
 assert.equal(resolveTagAdd(s.ctx,s.tag,'siegeBonus'),1);
 // Monthly advantages support an existing funded network; guards and empty
 // treasuries still impose their ordinary consequences.
 const host=s.game.tags.ROM;host.stability=0;host.treasury=0;
 s.t.nationalStrategy.networks[p.id]={host:'ROM',strength:0,exposure:0,op:{kind:'gates',left:3,total:3}};
 s.game.date.m=9;monthlyNationalIdeas(s.ctx);const network=s.t.nationalStrategy.networks[p.id];assert.equal(network.strength,6);assert.equal(network.exposure,6,'mature contacts reduce operation exposure without making it free');
 s.game.tags.ROM.nationalStrategy={counterspyUntil:999999};s.game.date.m=10;monthlyNationalIdeas(s.ctx);assert.equal(network.strength,7);assert.equal(network.exposure,18,'funded counterintelligence retains its full effect');
 s.t.treasury=0;s.game.date.m=11;monthlyNationalIdeas(s.ctx);assert.equal(network.strength,0);assert.equal(network.exposure,28,'unpaid networks still deteriorate');
 console.log('PASS every Subversion tier changes real siege progress and funded network development while counterplay remains effective');
}
{
 const s=scene(),p=s.homes[1],ledger=incomeBreakdown(s.ctx,s.tag),income=ledger.income,domestic=ledger.base*ledger.mult,unrest=computeUnrestBreakdown(s.ctx,p).total;
 adopt(s,'federation');close(incomeBreakdown(s.ctx,s.tag).income,income+domestic*.1,'charter institutions raise actual provincial revenue');
 adopt(s,'federation');close(computeUnrestBreakdown(s.ctx,p).total,unrest-.75,'federal council lowers real provincial unrest');
 p.integrating={by:s.tag,monthsLeft:10};monthlyIntegration(s.ctx);const baseline=10-p.integrating.monthsLeft;p.integrating.monthsLeft=10;
 adopt(s,'federation');close(incomeBreakdown(s.ctx,s.tag).income,income+domestic*(1.1*1.1-1),'commonwealth adds revenue');monthlyIntegration(s.ctx);close(10-p.integrating.monthsLeft,baseline*1.25,'commonwealth accelerates an actual integration project');
 console.log('PASS every Federated Rule tier changes actual income, unrest or integration speed without granting a city charter');
}
{
 const s=scene(),before=JSON.stringify(s.game);const report=nationalStrategyView(s.ctx);
 assert.equal(report.actions.length,Object.keys(NATIONAL_ACTIONS).length,'all contextual actions visible before adoption');
 assert.equal(JSON.stringify(s.game),before,'rendering locked options must be pure');
 for(const a of report.actions){assert.equal(a.unlocked,false);assert.match(a.info.why,new RegExp(`tier ${a.tier}`));assert(['trade','world','defense','court'].includes(a.context));assert(a.requirement.includes(NATIONAL_IDEAS[a.group].tiers[a.tier-1].name));}
 const colony=report.actions.find(a=>a.key==='colony');assert(colony.options.length>0,'locked actions still offer real target choices');
 const args=colony.options.find(o=>o.args.province===s.homes[1].id).args;
 const failed=runNationalAction(s.ctx,s.tag,'colony',args);assert(!failed.ok);assert.match(failed.why,/Veterans on the Land.*tier 1/);assert.equal(JSON.stringify(s.game),before,'locked execution spends and changes nothing');
 adopt(s,'colonies');assert(nationalActionInfo(s.ctx,s.tag,'colony',args).ok);assert(!nationalActionInfo(s.ctx,s.tag,'district',args).ok,'adopting one tier cannot unlock later actions');
 console.log('PASS all actions and choices remain discoverable while exact tier gates prevent premature execution');
}
{
 const s=scene();s.t.nationalIdeas={maritime:3,dynasty:3,colonies:3,subversion:3,federation:3};delete s.t.nationalStrategy;
 assert.deepEqual(nationalIdeaEffects({nationalIdeas:{unknown:3,constructor:3}}),{},'unknown saved paths cannot introduce effects or throw');
 const expected=nationalIdeaEffects(s.t),before=JSON.stringify(s.t);nationalIdeaEffects(s.t);assert.equal(JSON.stringify(s.t),before,'saved tiers gain effects through a pure reader');
 const saved=reviveGame(JSON.parse(JSON.stringify(s.game))),ctx=makeCtx({...s.ctx,game:saved}),t=saved.tags[s.tag];
 assert.deepEqual(nationalIdeaEffects(t),expected,'legacy adopted ideas gain passives without migration or re-adoption');
 const modifiers=JSON.stringify(t.modifiers),income=incomeBreakdown(ctx,s.tag).income;
 monthlyNationalIdeas(ctx);monthlyNationalIdeas(ctx);assert.deepEqual(nationalIdeaEffects(t),expected);assert.equal(JSON.stringify(t.modifiers),modifiers,'monthly processing never stores duplicate passive modifiers');close(incomeBreakdown(ctx,s.tag).income,income,'monthly callbacks never compound income bonuses');
 for(const[key,value]of Object.entries(expected)){if(key.endsWith('Mult'))assert(resolveTagMult(ctx,s.tag,key)>=0,'real resolver accepts every passive key');else assert(Number.isFinite(resolveTagAdd(ctx,s.tag,key)));}
 console.log('PASS legacy saves, save restoration and repeated monthly processing retain exactly one set of passive effects');
}
console.log('national-idea-impact: ALL PASS');
