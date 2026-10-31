// Distant reserves must reach a legal, supplied front through real orders.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFINES} from '../../js/data/defines.js';
import {MAP_DATA} from '../../js/data/map_data.js';
import {ERAS} from '../../js/data/compendium.js';
import {buildProvinceMapping} from '../../js/data/map_profile.js';
import {initGame,makeCtx} from '../../js/sim/init.js';
import {declareWar,spawnArmy,hopDays,isHostile,regCount,devTotal} from '../../js/sim/military.js';
import {landRoutes} from '../../js/sim/fort_control.js';
import {traceSupply} from '../../js/sim/supply.js';
import {planWar} from '../../js/sim/ai_war.js';
import {tickDay} from '../../js/sim/tick.js';

const snap=JSON.parse(readFileSync(new URL('../geom-snapshot.json',import.meta.url)));
function boot(id){
 const {bookmark,events}=ERAS.find(e=>e.bookmark.id===id);
 const provinceMap=buildProvinceMapping(MAP_DATA,bookmark),to=id=>provinceMap?.[id]||id;
 const neighbors=snap.neighbors.map(()=>new Set());
 for(let id=1;id<neighbors.length;id++)for(const nb of snap.neighbors[id])if(to(id)!==to(nb)){
  neighbors[to(id)].add(to(nb));neighbors[to(nb)].add(to(id));
 }
 const centroids=snap.centroids.map(c=>c?{x:c[0],y:c[1]}:null);
 for(let id=1;id<neighbors.length;id++)if(to(id)!==id)centroids[id]=centroids[to(id)];
 const geom={neighbors,centroids,coastal:snap.coastal.map(Boolean),offshore:snap.offshore.map(c=>c?{x:c[0],y:c[1]}:null),areas:Int32Array.from(snap.areas),bbox:[]};
 const game=initGame({DEFINES,MAP_DATA,geom,bookmark,events,provinceMap,playerTag:'JUD',rngSeed:1337});
 const ctx=makeCtx({game,DEFINES,MAP_DATA,geom,bookmark,events,provinceMap,bus:{emit(){},on(){return()=>{};}}});
 return {game,ctx,geom};
}
const destination=a=>a.path?.at(-1)||a.prov;
function cost(ctx,a){let from=a.prov,total=0;for(const to of a.path||[]){total+=hopDays(ctx,from,to,a);from=to;}return total;}

for(const [era,tag] of [['66ce','PAR'],['614ce','SAS']]){
 const {game,ctx}=boot(era);
 if(tag==='PAR'){
  game.tags.PAR.allies.push('JUD');game.tags.JUD.allies.push('PAR');
  declareWar(ctx,'PAR','ROM','The eastern front');
 }
 const reserve=Object.values(game.armies).find(a=>a.tag===tag&&a.prov===ctx.provId('Seleucia-Ctesiphon'));
 const origin=reserve.prov;
 const long=landRoutes(ctx,reserve,{maxCost:365,cost:(a,b)=>hopDays(ctx,a,b,reserve)});
 const enemyDays=Math.min(...[...long.dist].filter(([id])=>isHostile(ctx,tag,ctx.byId(id).controller)).map(([,d])=>d));
 assert(enemyDays>45,era+': regression begins beyond tactical reach');
 const log=[];planWar(ctx,tag,{log});
 assert(reserve.path.length,era+': reserve receives a march from Ctesiphon');
 assert(log.some(p=>p.kind==='deploy'&&p.armies.includes(reserve.id)),era+': reserve deployment is distinct from combat');
 assert(cost(ctx,reserve)<=45,era+': first march stays within tactical reach');
 assert(reserve.path.every(id=>!isHostile(ctx,tag,ctx.byId(id).controller)),era+': deployment never orders an invasion');
 assert(traceSupply(ctx,{...reserve,prov:destination(reserve)}).ok,era+': destination has a supply line');
 let departed=false,participated=false;
 for(let day=0;day<180;day++){
  tickDay(ctx);
  const army=game.armies[reserve.id];
  if(army&&army.prov!==origin)departed=true;
  if(army?.inBattle||game.provinces.some(p=>p?.controller===tag&&p.owner!==tag))participated=true;
 }
 assert(departed,era+': reserve makes real movement on the live daily tick');
 if(tag==='PAR')assert(participated,era+': Parthia actually reaches the war within six months');
 console.log(`PASS ${era}: reserve marches from Ctesiphon toward a supplied front and advances on the real daily tick`);
}

// A controlled corridor isolates routing, protection and camp capacity.
function scene(){
 const s=boot('66ce'),{game,ctx,geom}=s;
 game.armies={};game.battles=[];game.wars=[];game.truces={};game.ceasefire=null;
 for(const t of Object.values(game.tags)){t.atWarWith=[];t.allies=[];t.overlord=null;t.ai=false;}
 for(const p of game.provinces)if(p){p.impassable=true;p.owner=p.controller='WASTE';p.siege=null;p.fort=0;}
 for(const n of geom.neighbors)n.clear();
 const road=['Seleucia-Ctesiphon','Nehardea','Hatra','Dura-Europos','Palmyra','Emesa'].map(n=>ctx.prov(n));
 for(const [i,p] of road.entries()){
  p.impassable=false;p.owner=p.controller=i<4?'PAR':'ROM';p.terrain='farmland';
  p.dev={tax:6,prod:6,mp:6};p.buildings=[];p.x=i*300;p.y=0;geom.centroids[p.id]={x:p.x,y:0};
  if(i){geom.neighbors[p.id].add(road[i-1].id);geom.neighbors[road[i-1].id].add(p.id);}
 }
 game.tags.PAR.ai=true;game.tags.PAR.atWarWith=['ROM'];game.tags.ROM.atWarWith=['PAR'];
 game.wars=[{id:'deployment',attackers:['PAR'],defenders:['ROM'],warscore:{},started:{...game.date}}];
 const army=game.armies[spawnArmy(ctx,'PAR',road[0].name,{inf:8,name:'Distant reserve'})];
 return {...s,road,army};
}
{
 const {ctx,army}=scene();planWar(ctx,'PAR',{passive:true});
 assert.equal(army.path.length,0,'scripted passivity prevents reserve deployment');
 console.log('PASS scripted passivity keeps distant reserves still');
}
{
 const {ctx,game,army}=scene();
 game.ceasefire={name:'Cease-fire',y:game.date.y,m:game.date.m};
 planWar(ctx,'PAR');
 assert.equal(army.path.length,0,'a cease-fire prevents strategic as well as tactical movement');
 console.log('PASS cease-fires prevent reserve deployment');
}
{
 const {ctx,road,army}=scene();road[2].controller='NAB';
 const log=[];planWar(ctx,'PAR',{log});
 assert(!log.some(p=>p.kind==='deploy'),'a neutral supply gap cannot become a deployment corridor');
 assert(!army.path.includes(road[2].id));
 console.log('PASS neutral-controlled gaps block strategic marches');
}
{
 const {ctx,game,road,army}=scene();
 spawnArmy(ctx,'ROM',road[2].name,{inf:80,name:'Blocking army'});
 const log=[];planWar(ctx,'PAR',{log});
 assert(!army.path.includes(road[2].id),'reserve cannot march through an overwhelming enemy');
 console.log('PASS hostile armies block reserve routes');
}
{
 const {ctx,road,army}=scene();
 const fort=road[3];fort.owner=fort.controller='ROM';fort.fort=2;fort.garrison=100000;
 const log=[];planWar(ctx,'PAR',{log});
 assert(log.some(p=>p.kind==='deploy'),'a distant fort still draws reserves toward its approach');
 assert(!army.path.includes(fort.id),'strategic deployment stops before the hostile fort');
 assert(!army.path.some(id=>road.slice(4).some(p=>p.id===id)),'reserves cannot bypass a hostile fort');
 console.log('PASS reserves approach a fortified front without crossing it');
}
{
 const {ctx,game,road,army}=scene();
 for(const p of road.slice(1,4))p.dev={tax:1,prod:1,mp:1};
 const second=game.armies[spawnArmy(ctx,'PAR',road[0].name,{inf:8,name:'Second reserve'})];
 planWar(ctx,'PAR');
 assert(army.path.length||second.path.length,'at least one reserve advances');
 const camps=new Map();
 for(const a of [army,second])camps.set(destination(a),(camps.get(destination(a))||0)+regCount(a));
 for(const [id,regs] of camps)if(id!==road[0].id)assert(regs<=DEFINES.BASE.supportLimitBase+devTotal(ctx.byId(id))*DEFINES.BASE.supportLimitPerDev,'deployment reservations prevent overloading the same camp');
 console.log('PASS reserves spread across camps within their support capacity');
}
{
 const {ctx,game,road,army}=scene();
 army.regiments.inf=50;army.men=50000;
 planWar(ctx,'PAR');
 assert(army.path.length,'a host larger than frontier camps can still march toward the war');
 assert(army.path.every(id=>road.slice(1,4).some(p=>p.id===id)),'large armies still use the friendly road');
 console.log('PASS oversized existing hosts can still reach the front');
}
console.log('war-deployment: ALL PASS');
