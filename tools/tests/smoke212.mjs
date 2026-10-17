// Six historical turning points: decisions, ownership, scarce resources,
// bilateral consent, delivery accounting and persistent province investments.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { initGame, makeCtx, gameActions, reviveGame, reconcileGameProvinces } from '../../js/sim/init.js';
import { politicalCrisisInfo as info, choosePoliticalCrisis as choose, monthlyPoliticalCrises, reparationsInvestmentInfo } from '../../js/sim/political_turning_points.js';
import { chooseHistoricalCrisis } from '../../js/sim/historical_crises.js';
import { incomeBreakdown, runMonthlyEconomy, hoardBleed } from '../../js/sim/economy.js';
import { checkTriggeredEvents, resolveEventOption } from '../../js/sim/events.js';
import { tickDay } from '../../js/sim/tick.js';
import * as mil from '../../js/sim/military.js';
import { ICONS, flagChip } from '../../js/ui/icons.js';
const snap = JSON.parse(readFileSync(new URL('../geom-snapshot.json', import.meta.url)));
function scene(id, player) {
  const era = ERAS.find(e => e.bookmark.id === id), tag = player || era.bookmark.playableTags[0].tag;
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark), to = id => provinceMap?.[id] || id;
  const neighbors = snap.neighbors.map(() => new Set());
  for (let id = 1; id < neighbors.length; id++) for (const nb of snap.neighbors[id]) if (to(id) !== to(nb)) { neighbors[to(id)].add(to(nb)); neighbors[to(nb)].add(to(id)); }
  const geom = { neighbors, coastal: snap.coastal.map(Boolean), centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), areas: Int32Array.from(snap.areas), bbox: [] };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: [], playerTag: tag, rngSeed: 22, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events, provinceMap,
    bus: { emit() {}, on() { return () => {}; } } });
  game.pendingEvents = []; game.wars = []; game.truces = {}; game.recognitions = {}; game.battles = [];
  for (const t of Object.values(game.tags)) { t.atWarWith = []; t.ai = false; t.treasury = 3000; t.manpower = 10000; t.opinion = {}; t.allies = []; t.points = { gov: 999, infl: 999, mar: 999 }; }
  for (const p of game.provinces) if (p) { p.controller = p.owner; p.siege = null; }
  return { ctx, game, tag, era, actions: gameActions(ctx) };
}
const own = (s, names, tag) => names.forEach(n => { assert(s.ctx.prov(n), n); s.ctx.helpers.changeOwner(s.ctx, n, tag); });
const enact = (s, key, choice, actor) => { const result = choose(s.ctx, key, choice, actor); assert(result.ok, `${key}/${choice}: ${result.why}`); return result; };
function months(s, n, economy = false) {
  for (let k = 0; k < n; k++) {
    const d = s.game.date; if (++d.m > 12) { d.m = 1; d.y++; if (!d.y) d.y = 1; } d.d = 1;
    monthlyPoliticalCrises(s.ctx); if (economy) runMonthlyEconomy(s.ctx);
  }
}
function egypt() {
  const s = scene('167bce'); s.game.date = { y: -152, m: 6, d: 1 };
  own(s, ['Ptolemais', 'Antioch'], 'SEL');
  s.ctx.helpers.setRuler(s.ctx, 'SEL', { name: 'Demetrius I Soter', age: 35 });
  assert(chooseHistoricalCrisis(s.ctx, 'balas', 'fund').ok);
  own(s, ['Antioch'], 'BAL'); s.ctx.helpers.endWar(s.ctx, 'BAL', 'SEL', null);
  s.game.tags.SEL.alive = false; s.game.date = { y: -145, m: 3, d: 1 };
  s.ctx.helpers.setRuler(s.ctx, 'PTO', { name: 'Ptolemy VI Philometor', age: 40 }); return s;
}
function tryphon() {
  const s = scene('167bce'); s.game.date = { y: -143, m: 9, d: 1 };
  s.ctx.helpers.setRuler(s.ctx, 'HAS', { name: 'Jonathan Apphus', title: 'High Priest', age: 45 });
  own(s, ['Ptolemais'], 'SEL'); return s;
}
function imperial(key) {
  const s = scene(key === 'arabia' ? '66ce' : '529ce');
  s.game.date = { y: key === 'arabia' ? 106 : 602, m: 3, d: 1 };
  if (key === 'lakhmid') s.game.tags.LKH.overlord = 'SAS'; return s;
}
function peace() {
  const s = scene('614ce'); s.game.date = { y: 628, m: 3, d: 1 };
  s.ctx.helpers.setRuler(s.ctx, 'SAS', { name: 'Khosrow II', age: 58 });
  own(s, ['Damascus', 'Antioch', 'Jericho'], 'SAS'); own(s, ['Jerusalem', 'Tiberias'], 'JUD');
  s.ctx.helpers.declareWar(s.ctx, 'SAS', 'BYZ', 'The Last Great War');
  s.game.firedEvents.ev_p_nineveh = true; return s;
}
function reparations(priority = 'industry') {
  const s = scene('1948ce'); s.game.date = { y: 1952, m: 9, d: 1 };
  own(s, ['Joppa', 'Jerusalem', 'Caesarea Maritima'], 'ISR');
  s.game.tags.GER.overlord = null;
  enact(s, 'reparations', priority); return s;
}
const warnings = [], warn = console.warn; console.warn = (...xs) => warnings.push(xs.join(' '));
try {
  for (const era of ERAS) {
    const s = scene(era.bookmark.id), before = JSON.stringify(s.game);
    for (const key of ['egypt', 'tryphon', 'arabia', 'lakhmid', 'peace628', 'reparations']) info(s.ctx, key);
    assert.equal(JSON.stringify(s.game), before, 'political queries are read only');
    assert.equal(era.events.length, new Set(era.events.map(e => e.id)).size, era.bookmark.id);
    for (const e of era.events) for (const o of e.options || []) for (const v of o.stakes || []) assert(ICONS[v.icon], v.icon);
    assert.match(flagChip('LKH', DEFINES), /<svg/);
  }
  console.log('PASS unique event registry, valid icon stakes and flags, pure queries across every bookmark');
  {
    const s = egypt(); assert(info(s.ctx, 'egypt').canSwitch);
    const cash = Object.values(s.game.tags).reduce((n, t) => n + t.treasury, 0);
    enact(s, 'egypt', 'switch'); assert(s.game.tags.DMT);
    assert.equal(Object.values(s.game.tags).reduce((n, t) => n + t.treasury, 0), cash);
    assert(s.game.wars.some(w => w.attackers.includes('PTO') && w.attackers.includes('DMT') && w.defenders.includes('BAL')));
    assert(!s.game.tags.HAS.atWarWith.includes('PTO'));
    enact(s, 'egypt', 'align'); assert(!s.game.flags.highPriesthood);
    const port = s.ctx.prov('Pelusium'); assert(mil.canEnter(s.ctx, 'HAS', port.id)); assert(!mil.sameSide(s.ctx, 'HAS', 'PTO'));
    months(s, 36); assert(!mil.militaryPassage(s.ctx, 'HAS', 'PTO'));
    const defended = egypt(); enact(defended, 'egypt', 'switch'); enact(defended, 'egypt', 'defend'); assert(defended.game.tags.HAS.atWarWith.includes('PTO'));
    const neutral = egypt(); enact(neutral, 'egypt', 'switch'); enact(neutral, 'egypt', 'neutral');
    assert(!mil.militaryPassage(neutral.ctx, 'HAS', 'PTO')); enact(neutral, 'egypt', 'permit'); assert(mil.militaryPassage(neutral.ctx, 'HAS', 'PTO'));
    const loyal = egypt(); enact(loyal, 'egypt', 'loyal'); assert(!loyal.game.tags.DMT);
    console.log('PASS Egyptian allegiance, resource-conserving rival court, actual coalitions, defections, passage and neutrality consent');
  }
  {
    const s = tryphon(), manpower = s.game.tags.HAS.manpower;
    enact(s, 'tryphon', 'attend'); assert.equal(s.game.tags.HAS.manpower, manpower - 1000);
    assert.equal(s.game.tags.HAS.ruler.name, 'Jonathan Apphus'); enact(s, 'tryphon', 'ambush');
    assert.equal(s.game.tags.HAS.ruler.name, 'Simon Thassi'); assert(s.game.flags.jonathanTaken);
    const money = s.game.tags.HAS.treasury, captor = s.game.tags.SEL.treasury;
    enact(s, 'tryphon', 'ransom'); assert.equal(s.game.tags.HAS.treasury, money - 100); assert.equal(s.game.tags.SEL.treasury, captor + 100);
    enact(s, 'tryphon', 'betray'); assert.equal(info(s.ctx, 'tryphon').record.status, 'dead');
    const escaped = tryphon(); enact(escaped, 'tryphon', 'escort'); enact(escaped, 'tryphon', 'ambush');
    assert.equal(escaped.game.tags.HAS.ruler.name, 'Jonathan Apphus'); assert(!escaped.game.flags.jonathanTaken);
    assert(Object.values(escaped.game.armies).some(a => a.name === 'Jonathan’s Returning Escort' && a.men === 2000));
    const released = tryphon(); enact(released, 'tryphon', 'attend'); enact(released, 'tryphon', 'ambush'); enact(released, 'tryphon', 'ransom'); enact(released, 'tryphon', 'release');
    assert.equal(released.game.tags.HAS.ruler.name, 'Jonathan Apphus'); assert(!released.game.flags.jonathanTaken);
    const refused = tryphon(); enact(refused, 'tryphon', 'refuse'); enact(refused, 'tryphon', 'invade'); assert(refused.game.tags.HAS.atWarWith.includes('SEL'));
    const honest = tryphon(); enact(honest, 'tryphon', 'attend'); enact(honest, 'tryphon', 'honour'); assert.equal(honest.game.tags.HAS.manpower, manpower);
    console.log('PASS invitation before capture, reserved escorts, actual survivors, acting succession, finite ransom and alternative release');
  }
  for (const key of ['arabia', 'lakhmid']) {
    const s = imperial(key), i = info(s.ctx, key); assert(i.exists, key);
    if (key === 'lakhmid') { assert.equal(s.ctx.prov('Najaf').name, 'al-Hira'); assert.equal(s.ctx.prov('Najaf').owner, 'LKH'); assert.notEqual(s.ctx.prov('Najaf').id, s.ctx.prov('Babylon').id); }
    enact(s, key, 'demand'); assert(s.game.tags[i.court]);
    const owned = s.game.provinces.filter(p => p?.owner === i.court).map(p => p.id);
    const fortune = s.game.tags[i.empire].treasury + s.game.tags[i.court].treasury;
    enact(s, key, 'accept'); assert(owned.every(id => s.ctx.byId(id).owner === i.empire));
    assert.equal(s.game.tags[i.empire].treasury, fortune);
    enact(s, key, 'shelter', s.tag); assert(owned.some(id => s.game.tags[s.tag].claims.includes(id)));
    assert(!choose(s.ctx, key, 'shelter', s.tag).ok);
    const negotiated = imperial(key); enact(negotiated, key, 'demand'); enact(negotiated, key, 'negotiate'); enact(negotiated, key, 'approve');
    const n = info(negotiated.ctx, key); assert.equal(negotiated.game.tags[n.court].overlord, n.empire);
    const bd = incomeBreakdown(negotiated.ctx, n.court); assert(Math.abs(bd.tributeOut - bd.income * .1) < 1e-8);
    const resistant = imperial(key); enact(resistant, key, 'demand'); enact(resistant, key, 'resist');
    const j = info(resistant.ctx, key); assert(resistant.game.tags[j.court].atWarWith.includes(j.empire));
    const oldMoney = resistant.game.tags[j.court].treasury;
    enact(resistant, key, 'support', resistant.tag); assert.equal(resistant.game.tags[j.court].treasury, oldMoney + 100);
    console.log(`PASS ${key}: real annexation, exile claims, negotiated tribute and funded resistance`);
  }
  {
    const s = imperial('arabia'); s.game.humanTags = ['NAB', 'ROM']; enact(s, 'arabia', 'demand');
    const before = JSON.stringify(s.game); assert(!choose(s.ctx, 'arabia', 'accept').ok); assert.equal(JSON.stringify(s.game), before);
    const stale = imperial('lakhmid'); enact(stale, 'lakhmid', 'demand'); stale.ctx.prov('Najaf').controller = 'SAM';
    assert(!choose(stale.ctx, 'lakhmid', 'accept').ok);
    const failed = imperial('arabia'); enact(failed, 'arabia', 'demand'); enact(failed, 'arabia', 'negotiate'); enact(failed, 'arabia', 'reject'); enact(failed, 'arabia', 'resist');
    assert.equal(info(failed.ctx, 'arabia').record.status, 'resisting');
    console.log('PASS human-chair separation, occupied province guards and resistance after a failed embassy');
  }
  {
    const s = peace(); enact(s, 'peace628', 'offer'); assert(s.game.wars.some(w => w.attackers.includes('SAS')));
    enact(s, 'peace628', 'restore'); assert.equal(s.ctx.prov('Damascus').owner, 'BYZ'); assert.equal(s.ctx.prov('Jerusalem').owner, 'JUD');
    assert(!s.game.tags.SAS.atWarWith.includes('BYZ'));
    enact(s, 'peace628', 'petition'); assert.equal(s.game.tags.JUD.treasury, 2925);
    enact(s, 'peace628', 'recognize'); assert(mil.recognized(s.ctx, 'JUD', 'BYZ')); assert(s.game.tags.BYZ.guarantees.includes('JUD'));
    months(s, 120); assert(!s.game.tags.BYZ.guarantees.includes('JUD'));
    const client = peace(); enact(client, 'peace628', 'offer'); enact(client, 'peace628', 'armistice'); enact(client, 'peace628', 'submit');
    assert.equal(client.game.tags.JUD.overlord, 'BYZ'); assert.equal(client.ctx.prov('Jerusalem').owner, 'JUD');
    const resistance = peace(); enact(resistance, 'peace628', 'offer'); enact(resistance, 'peace628', 'restore'); enact(resistance, 'peace628', 'resist'); enact(resistance, 'peace628', 'enforce');
    assert(resistance.game.tags.JUD.atWarWith.includes('BYZ'));
    const continued = peace(); enact(continued, 'peace628', 'continue'); assert(continued.game.tags.SAS.atWarWith.includes('BYZ'));
    const plague = continued.ctx.events.find(e => e.id === 'ev_p_plague'); continued.game.date = { y: 628, m: 10, d: 1 }; continued.game.firedEvents.ev_p_khosrow_falls = true;
    assert(!plague.trigger(continued.ctx));
    console.log('PASS imperial consent, real restoration without third-party theft, recognition, expiring guarantee and alternative wars');
  }
  for (const priority of ['shipping', 'industry', 'housing']) {
    const s = reparations(priority); assert.equal(s.game.tags.ISR.treasury, 3000); assert(!info(s.ctx, 'reparations').record.goods);
    enact(s, 'reparations', 'sign'); assert.equal(s.game.tags.ISR.treasury, 3000, 'no free cash windfall');
    s.game.date = { y: 1953, m: 2, d: 1 }; months(s, 1);
    const r = info(s.ctx, 'reparations').record; assert.equal(r.goods, 8);
    const bd = incomeBreakdown(s.ctx, 'GER'); assert.equal(bd.politicalOut, 8);
    const before = s.game.tags.GER.treasury;
    s.game.tags.GER.treasury += bd.net; const bleed = hoardBleed(s.ctx, 'GER', bd); s.game.tags.GER.treasury = before;
    runMonthlyEconomy(s.ctx); assert(Math.abs(s.game.tags.GER.treasury - before - bd.net + bleed) < 1e-7);
    const snapshot = JSON.stringify(s.game); monthlyPoliticalCrises(s.ctx); assert.equal(JSON.stringify(s.game), snapshot, 'monthly deliveries cannot run twice');
    months(s, 11); assert.equal(r.goods, 96);
    const p = s.ctx.prov(priority === 'shipping' ? 'Joppa' : 'Jerusalem'), dev = { ...p.dev };
    assert(reparationsInvestmentInfo(s.ctx, p.id).ok); assert(s.actions.investReparations(p.id).ok); assert.equal(r.goods, 0);
    if (priority === 'housing') { assert.equal(p.dev.mp, dev.mp + 1); assert.equal(p.dev.tax, dev.tax + 1); }
    else { assert(p.buildings.includes(priority === 'shipping' ? 'shipyard' : 'market')); assert.equal(p.dev.prod, dev.prod + 1); }
    assert(!s.actions.investReparations(p.id).ok);
    assert.equal(reviveGame(JSON.parse(JSON.stringify(s.game))).flags.historicalCrises.reparations.projects[0].province, p.id);
    assert(mil.switchTagCore(s.ctx, 'ISR', 'MLI')); assert.equal(info(s.ctx, 'reparations').actor, 'MLI');
    console.log(`PASS ${priority}: funded goods, actual ledger expense, no double delivery, permanent chosen-province investment and saves`);
  }
  {
    const s = reparations(); enact(s, 'reparations', 'sign'); s.game.date = { y: 1953, m: 2, d: 1 };
    s.game.embargoes['GER>ISR'] = true; months(s, 1); assert.equal(info(s.ctx, 'reparations').record.goods, 0);
    delete s.game.embargoes['GER>ISR']; s.game.tags.GER.treasury = 0; months(s, 1); assert.equal(info(s.ctx, 'reparations').record.goods, 0);
    s.game.tags.GER.treasury = 3000; months(s, 6); assert.equal(info(s.ctx, 'reparations').record.goods, 48);
    assert(s.actions.compromiseReparations().ok); assert.equal(info(s.ctx, 'reparations').record.goods, 0);
    assert(!s.game.tags.ISR.modifiers.some(m => m.id === 'zion_square')); assert(!s.actions.compromiseReparations().ok);
    const declined = scene('1948ce'); declined.game.date = { y: 1952, m: 9, d: 1 }; enact(declined, 'reparations', 'decline'); assert(declined.game.flags.reparationsRefused);
    const rejected = reparations(); enact(rejected, 'reparations', 'reject'); months(rejected, 8); assert(!info(rejected.ctx, 'reparations').record.goods);
    console.log('PASS unfunded and embargoed deliveries, real political compromise, rejection and refusal');
  }
  {
    const s = reparations(); s.game.humanTags = ['ISR', 'GER'];
    checkTriggeredEvents(s.ctx); const p = s.game.pendingEvents.find(v => v.eventId === 'ev1952_german_signature'); assert(p && p.forTag === 'GER');
    resolveEventOption(s.ctx, p.instanceId, 0); assert.equal(info(s.ctx, 'reparations').record.status, 'active');
    for (const e of s.ctx.events) s.game.firedEvents[e.id] = true;
    s.game.pendingEvents = []; s.game.date = { y: 1953, m: 2, d: 28 };
    for (let day = 0; day < 35; day++) { s.game.paused = false; tickDay(s.ctx); }
    assert(info(s.ctx, 'reparations').record.goods >= 8);
    assert(Object.values(s.game.tags).every(t => Number.isFinite(t.treasury)));
    console.log('PASS actual multiplayer decider queue and real monthly simulation after entry into force');
  }
  {
    const s = egypt(); enact(s, 'egypt', 'switch'); enact(s, 'egypt', 'align');
    const frozen = JSON.stringify(s.game); assert(!choose(s.ctx, 'egypt', 'align').ok); assert(!choose(s.ctx, 'egypt', 'neutral').ok);
    assert.equal(JSON.stringify(s.game), frozen);
    const t = imperial('arabia'); enact(t, 'arabia', 'demand'); t.game.tags.NAB.overlord = 'PAR';
    assert(!choose(t.ctx, 'arabia', 'accept').ok); assert(!choose(t.ctx, 'arabia', 'negotiate').ok);
    const p = peace(); enact(p, 'peace628', 'offer'); enact(p, 'peace628', 'restore'); enact(p, 'peace628', 'petition');
    assert(!choose(p.ctx, 'peace628', 'petition').ok);
    p.game.tags.JUD.overlord = 'AXM'; assert(!choose(p.ctx, 'peace628', 'recognize').ok);
    const old = scene('529ce'), id = old.ctx.prov('Najaf').id;
    old.game.provinces[id] = null; delete old.game.tags.LKH;
    old.ctx.prov('Babylon').owner = 'SAM'; old.ctx.prov('Babylon').controller = 'SAS';
    reconcileGameProvinces({ game: old.game, DEFINES, MAP_DATA, geom: old.ctx.geom, bookmark: old.era.bookmark, provinceMap: old.ctx.provinceMap });
    assert.equal(old.game.provinces[id].owner, 'SAM'); assert.equal(old.game.provinces[id].controller, 'SAS'); assert(!old.game.tags.LKH);
    const restored = peace(); enact(restored, 'peace628', 'offer'); enact(restored, 'peace628', 'restore');
    const reprisal = restored.ctx.events.find(e => e.id === 'ev614y_the_oath_and_the_fast');
    own(restored, ['Tiberias'], 'BYZ'); assert(!reprisal.trigger(restored.ctx), 'local answer must precede reprisals');
    enact(restored, 'peace628', 'petition'); enact(restored, 'peace628', 'recognize');
    assert(!reprisal.trigger(restored.ctx), 'recognition protects the local state');
    restored.game.flags.historicalCrises.peace628.local = 'client'; assert(reprisal.trigger(restored.ctx));
    console.log('PASS one-time choices, stale sovereignty guards, old saves and the dependent reprisals sequence');
  }
  {
    const s = reparations(); enact(s, 'reparations', 'sign'); s.game.date = { y: 1953, m: 2, d: 1 };
    for (const p of s.game.provinces) if (p?.owner === 'ISR') p.controller = 'EGY';
    months(s, 1); assert.equal(info(s.ctx, 'reparations').record.goods, 0); assert.match(info(s.ctx, 'reparations').record.why, /port/);
    const duration = reparations('housing'); enact(duration, 'reparations', 'sign'); duration.game.date = { y: 1953, m: 2, d: 1 };
    months(duration, 145); const r = info(duration.ctx, 'reparations').record;
    assert.equal(r.status, 'completed'); assert.equal(r.delivered, 1152);
    assert(duration.actions.investReparations(duration.ctx.prov('Jerusalem').id).ok, 'stored goods survive expiry');
    const n = imperial('arabia'); enact(n, 'arabia', 'demand'); enact(n, 'arabia', 'accept'); n.game.tags.JUD.treasury = 0;
    const response = n.ctx.events.find(e => e.id === 'ev_arabia_response_JUD');
    assert(response.options.filter(o => !o.when || o.when(n.ctx)).length === 1, 'unaffordable diplomatic responses are filtered');
    const ai = reparations(); enact(ai, 'reparations', 'sign'); ai.game.tags.ISR.ai = true; ai.game.date = { y: 1953, m: 2, d: 1 };
    months(ai, 12); assert.equal(info(ai.ctx, 'reparations').record.projects.length, 1); assert.equal(ai.game.playerTag, 'ISR');
    assert.equal(info(ai.ctx, 'reparations').record.goods, 0);
    console.log('PASS obstructed ports, twelve-year expiry, post-agreement investments, affordable diplomacy and AI investments');
  }
  {
    const s = reparations(); delete s.game.flags.historicalCrises.reparations; s.game.date = { y: 1952, m: 1, d: 1 };
    const vote = s.ctx.events.find(e => e.id === 'ev_i_the_shilumim'); assert(vote.when(s.ctx));
    const money = s.game.tags.ISR.treasury; vote.options[0].effects(s.ctx);
    assert.equal(s.game.tags.ISR.treasury, money); assert(s.game.flags.shilumimNegotiations); assert(!s.game.flags.shilumimSigned);
    assert(!s.game.tags.ISR.modifiers.some(m => m.id === 'the_shilumim'));
    s.game.date.m = 9; enact(s, 'reparations', 'industry'); enact(s, 'reparations', 'sign');
    assert(s.game.flags.shilumimSigned);
    const epilogue = s.ctx.events.find(e => e.id === 'ev_i_what_the_shilumim_built'); assert(!epilogue.trigger(s.ctx));
    const eshkol = s.ctx.events.find(e => e.id === 'ev_i_eshkol'); eshkol.options[0].effects(s.ctx);
    assert(!s.game.tags.ISR.modifiers.some(m => m.id === 'reparations_boom'), 'no boom from undelivered goods');
    const refused = reparations(); delete refused.game.flags.historicalCrises.reparations; refused.game.date.m = 1;
    vote.options[1].effects(refused.ctx); assert(refused.game.flags.shilumimRefused); assert(!info(refused.ctx, 'reparations').exists);
    const legacy = reparations(); delete legacy.game.flags.historicalCrises.reparations; legacy.game.flags.shilumimSigned = true;
    assert(!info(legacy.ctx, 'reparations').exists); assert(epilogue.trigger(legacy.ctx));
    console.log('PASS January vote before September signature, refusal and legacy saves, without duplicate reparations windfalls');
  }
  assert.deepEqual(warnings, [], 'no swallowed simulation exceptions');
  console.log('ALL PASS');
} finally { console.warn = warn; }
