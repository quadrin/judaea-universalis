// Historical crises: real courts, territorial settlements, diplomatic consent,
// scarce resources, save persistence, and choices revalidated against the map.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { initGame, makeCtx, reviveGame } from '../../js/sim/init.js';
import { fireEvent, resolveEventOption, checkDateEvents, checkTriggeredEvents, allowedOptions } from '../../js/sim/events.js';
import { historicalCrisisInfo as info, chooseHistoricalCrisis as choose, ANTIPAS_LANDS, PHILIP_LANDS } from '../../js/sim/historical_crises.js';
import * as mil from '../../js/sim/military.js';
import { incomeBreakdown } from '../../js/sim/economy.js';
import { ICONS } from '../../js/ui/icons.js';
import { queueUnitRecruitment, monthlyRecruitment } from '../../js/sim/recruitment.js';
import { tickDay } from '../../js/sim/tick.js';
const snap = JSON.parse(readFileSync(new URL('../geom-snapshot.json', import.meta.url)));
function scene(id) {
  const era = ERAS.find(e => e.bookmark.id === id), tag = era.bookmark.playableTags[0].tag;
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark), to = id => provinceMap?.[id] || id;
  const neighbors = snap.neighbors.map(() => new Set());
  for (let id = 1; id < neighbors.length; id++) for (const nb of snap.neighbors[id]) if (to(id) !== to(nb)) { neighbors[to(id)].add(to(nb)); neighbors[to(nb)].add(to(id)); }
  const geom = { neighbors, coastal: snap.coastal.map(Boolean), centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), areas: Int32Array.from(snap.areas), bbox: [] };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: [], playerTag: tag, rngSeed: 17, provinceMap });
  const messages = [];
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events, provinceMap, bus: { emit(k, p) { messages.push([k, p]); }, on() { return () => {}; } } });
  game.pendingEvents = []; game.wars = []; game.truces = {}; game.recognitions = {}; game.battles = [];
  for (const t of Object.values(game.tags)) { t.atWarWith = []; t.ai = false; t.treasury = 3000; t.manpower = 10000; t.opinion ||= {}; }
  for (const p of game.provinces) if (p) { p.controller = p.owner; p.siege = null; }
  return { ctx, game, tag, era, messages };
}
function enact(s, key, choice) { const r = choose(s.ctx, key, choice); assert(r.ok, `${key}/${choice}: ${r.why}`); return r; }
function answer(s, id, index) {
  const ev = s.ctx.events.find(e => e.id === id); assert(ev, id);
  fireEvent(s.ctx, ev);
  const p = s.game.pendingEvents.find(p => p.eventId === id);
  if (p) resolveEventOption(s.ctx, p.instanceId, index);
}
function own(s, names, tag) { for (const name of names) { const p = s.ctx.prov(name); assert(p, name); s.ctx.helpers.changeOwner(s.ctx, name, tag); p.siege = null; } }
function balas() {
  const s = scene('167bce'); s.game.date = { y: -152, m: 6, d: 1 };
  s.ctx.helpers.setRuler(s.ctx, 'SEL', { name: 'Demetrius I Soter', age: 35 });
  own(s, ['Ptolemais', 'Antioch'], 'SEL'); return s;
}
function brothers() {
  const s = scene('67bce'); s.game.date = { y: -67, m: 6, d: 1 };
  own(s, ['Jerusalem', 'Jericho'], 'HYR');
  s.ctx.helpers.declareWar(s.ctx, 'HYR', 'ARI', 'The War of the Brothers'); return s;
}
function herod(id = '67bce') {
  const s = scene(id), tag = id === '40bce' ? 'HER' : 'HYR';
  s.game.playerTag = tag; s.game.humanTags = [tag]; s.game.date = { y: -4, m: 4, d: 1 };
  s.ctx.helpers.setRuler(s.ctx, tag, { name: 'Herod', title: 'King', age: 69 });
  own(s, ['Jerusalem', 'Jericho', ...ANTIPAS_LANDS, ...PHILIP_LANDS], tag);
  s.game.tags[tag].overlord = 'ROM'; s.game.flags.herodKing = true;
  return s;
}
const warnings = [], warn = console.warn; console.warn = (...xs) => warnings.push(xs.join(' '));
try {
  for (const era of ERAS) {
    assert.equal(era.events.length, new Set(era.events.map(e => e.id)).size, era.bookmark.id);
    for (const e of era.events) for (const o of e.options || []) for (const stake of o.stakes || []) assert(ICONS[stake.icon], stake.icon);
    const s = scene(era.bookmark.id), before = JSON.stringify(s.game);
    for (const key of ['balas', 'brothers', 'herod']) info(s.ctx, key);
    assert.equal(JSON.stringify(s.game), before, 'queries must not allocate saved state');
    assert(!['BAL', 'HPA', 'HPH'].some(t => s.game.tags[t]), 'crisis banners cannot start in unrelated bookmarks');
  }
  console.log('PASS unique event registries, valid stake icons, chapter isolation and pure queries');
  {
    const s = balas(), before = s.game.tags.HAS.treasury;
    const funds = () => Object.values(s.game.tags).reduce((n, t) => n + t.treasury, 0);
    const men = () => Object.values(s.game.tags).reduce((n, t) => n + t.manpower, 0)
      + Object.values(s.game.armies).reduce((n, a) => n + a.men, 0);
    const cash = funds(), manpower = men();
    s.game.humanTags.push('SEL');
    answer(s, 'ev_balas_vs_demetrius', 0);
    assert(s.game.tags.BAL); assert.equal(s.ctx.prov('Ptolemais').owner, 'BAL');
    assert.equal(s.game.tags.HAS.treasury, before - 100);
    assert.equal(funds(), cash); assert.equal(men(), manpower);
    assert(s.game.wars.some(w => w.attackers.includes('BAL') && w.defenders.includes('SEL')));
    assert(!s.game.wars.some(w => [...w.attackers, ...w.defenders].includes('HAS')), 'financial support is not forced belligerency');
    assert.equal(s.game.tags.SEL.ruler.name, 'Demetrius I Soter', 'a human incumbent is not deposed by the event');
    assert(s.game.flags.highPriesthood, 'Jonathan accepts the priesthood in 152 BCE, as recorded');
    assert.equal(s.game.tags.HAS.modifiers.find(m => m.id === 'high_priesthood').months, 36, 'lasting confirmation still depends on the outcome');
    const snapshot = JSON.stringify(s.game); assert(!choose(s.ctx, 'balas', 'fund').ok); assert.equal(JSON.stringify(s.game), snapshot);
    assert(!choose(s.ctx, 'balas', 'honour').ok);
    own(s, ['Antioch'], 'BAL'); s.ctx.helpers.endWar(s.ctx, 'BAL', 'SEL', null);
    checkTriggeredEvents(s.ctx);
    const p = s.game.pendingEvents.find(p => p.eventId === 'ev_balas_the_royal_promise'); assert(p);
    resolveEventOption(s.ctx, p.instanceId, 0);
    assert(s.game.flags.highPriesthood); assert.equal(info(s.ctx, 'balas').record.winner, 'BAL');
    const restored = reviveGame(JSON.parse(JSON.stringify(s.game)));
    assert.equal(restored.flags.historicalCrises.balas.status, 'settled'); assert(restored.tags.BAL);
    console.log('PASS real claimant war, exact conserved funding and troops, no forced player war, conditional reward and saves');
  }
  {
    const s = balas(); s.game.tags.HAS.treasury = 0; s.game.tags.HAS.manpower = 0;
    const ev = s.ctx.events.find(e => e.id === 'ev_balas_vs_demetrius');
    assert.deepEqual(allowedOptions(s.ctx, ev), [1, 2]);
    assert(!choose(s.ctx, 'balas', 'fund').ok); assert(!s.game.tags.BAL);
    s.ctx.prov('Ptolemais').controller = 'HAS';
    assert(!info(s.ctx, 'balas').exists); assert(!choose(s.ctx, 'balas', 'neutral').ok);
    s.ctx.prov('Ptolemais').controller = 'SEL';
    s.game.battles = [{ prov: s.ctx.prov('Ptolemais').id }];
    assert(!info(s.ctx, 'balas').exists, 'a landing cannot split an army out of an active battle');
    s.game.battles = [];
    enact(s, 'balas', 'king'); s.ctx.helpers.endWar(s.ctx, 'BAL', 'SEL', null);
    assert(info(s.ctx, 'balas').canHonour); enact(s, 'balas', 'honour');
    assert(s.game.tags.HAS.modifiers.some(m => m.id === 'demetrius_concessions')); assert(!s.game.flags.highPriesthood);
    const other = balas(); enact(other, 'balas', 'neutral');
    own(other, ['Antioch'], 'BAL'); other.ctx.helpers.endWar(other.ctx, 'BAL', 'SEL', null);
    assert(!choose(other.ctx, 'balas', 'honour').ok); enact(other, 'balas', 'settle');
    const wrongKing = balas(); wrongKing.game.tags.SEL.ruler.name = 'A Different Dynasty';
    assert(!info(wrongKing.ctx, 'balas').exists);
    console.log('PASS poverty and occupation guards, incumbent and neutral branches, no invented replacement of another dynasty');
  }
  {
    const s = brothers(); s.game.humanTags = ['HYR', 'ARI'];
    answer(s, 'ev67_the_brothers_accord', 0);
    assert.equal(s.game.tags.HYR.overlord, null); assert.equal(s.ctx.prov('Jerusalem').owner, 'HYR');
    checkTriggeredEvents(s.ctx);
    const p = s.game.pendingEvents.find(p => p.eventId === 'ev67_aristobulus_answers'); assert(p); assert.equal(p.forTag, 'ARI');
    resolveEventOption(s.ctx, p.instanceId, 0);
    assert.equal(s.game.tags.HYR.overlord, 'ARI'); assert.equal(s.game.tags.HYR.chapterStrategy.patron.rate, .05);
    assert.equal(s.ctx.prov('Jerusalem').owner, 'ARI'); assert(!s.game.tags.HYR.atWarWith.includes('ARI'));
    assert.equal(mil.capitalProvince(s.ctx, 'HYR').owner, 'HYR');
    const income = incomeBreakdown(s.ctx, 'HYR');
    assert(Math.abs(income.tributeOut - income.income * .05) < 1e-8, 'the economy charges the negotiated 5%');
    assert(!info(s.ctx, 'brothers').canRise); assert(!choose(s.ctx, 'brothers', 'rise').ok);
    s.game.date = { y: -67, m: 12, d: 1 };
    assert(info(s.ctx, 'brothers').canRise);
    enact(s, 'brothers', 'rise'); assert.equal(s.game.tags.HYR.overlord, null);
    assert(s.game.wars.some(w => w.attackers.includes('HYR') && w.defenders.includes('ARI')));
    const aretas = s.ctx.events.find(e => e.id === 'ev4_aretas_price');
    assert(aretas); assert(!s.game.flags.aretasMarches, 'outside support requires a separate choice');
    console.log('PASS bilateral human consent, province cession, real clientship, six-month truce and legal renewed war');
  }
  {
    const s = brothers(); enact(s, 'brothers', 'offer'); enact(s, 'brothers', 'reject');
    assert(s.game.wars.length); assert.equal(s.ctx.prov('Jerusalem').owner, 'HYR');
    const stale = brothers(); enact(stale, 'brothers', 'offer'); stale.ctx.prov('Jerusalem').controller = 'ROM';
    const before = JSON.stringify(stale.game); assert(!choose(stale.ctx, 'brothers', 'accept').ok); assert.equal(JSON.stringify(stale.game), before);
    const loyal = brothers(); enact(loyal, 'brothers', 'offer'); enact(loyal, 'brothers', 'accept');
    loyal.game.date = { y: -67, m: 12, d: 1 }; enact(loyal, 'brothers', 'keep');
    const canon = loyal.ctx.events.find(e => e.id === 'ev4_king_without_kingdom');
    assert(canon && !canon.when(loyal.ctx), 'a settled brotherhood blocks the forced Herodian canon');
    console.log('PASS refused and stale agreements, preserved player territory and lasting peaceful alternative');
  }
  for (const id of ['67bce', '40bce']) {
    const s = herod(id), tag = s.game.playerTag;
    const money = () => Object.values(s.game.tags).reduce((n, t) => n + t.treasury, 0);
    const manpower = () => Object.values(s.game.tags).reduce((n, t) => n + t.manpower, 0);
    own(s, ['Gamala'], 'ROM'); s.ctx.prov('Tiberias').controller = 'ROM';
    const army = s.ctx.helpers.spawnArmy(s.ctx, tag, 'Sepphoris', { inf: 2, name: 'Galilee Garrison' });
    const queued = queueUnitRecruitment(s.ctx, tag, s.ctx.prov('Sepphoris').id, 'inf', { months: 1 });
    queued.rallyProv = s.ctx.prov('Jerusalem').id;
    const before = money(), men = manpower();
    answer(s, 'ev5_herod_dies', 0);
    assert.equal(s.game.tags[tag].ruler.name, 'Archelaus');
    assert.equal(s.game.tags.HPA.ruler.name, 'Herod Antipas'); assert.equal(s.game.tags.HPH.ruler.name, 'Philip');
    assert.equal(s.game.tags.HPA.overlord, 'ROM'); assert.equal(s.game.tags.HPH.overlord, 'ROM');
    assert.equal(s.ctx.prov('Sepphoris').owner, 'HPA'); assert.equal(s.ctx.prov('Caesarea Philippi').owner, 'HPH');
    assert.equal(s.ctx.prov('Gamala').owner, 'ROM'); assert.equal(s.ctx.prov('Tiberias').owner, tag);
    assert.equal(s.game.armies[army].tag, 'HPA'); assert.equal(money(), before); assert.equal(manpower(), men);
    assert.equal(s.game.tags.HPA.govType, 'monarchy'); assert(!s.game.tags[tag].heir);
    assert.equal(queued.tag, 'HPA'); assert(!queued.rallyProv);
    monthlyRecruitment(s.ctx);
    assert(!s.ctx.prov('Sepphoris').unitQueue.length);
    assert(Object.values(s.game.armies).some(a => a.tag === 'HPA' && a.id !== army));
    assert(!choose(s.ctx, 'herod', 'divide').ok);
    assert(!s.game.flags.kingdomWhole);
    console.log(`PASS ${id} real tetrarchies, local armies, exact resource shares and no foreign/occupied province theft`);
  }
  {
    const s = herod(), tag = s.game.playerTag; s.game.humanTags.push('ROM');
    const cash = s.game.tags[tag].treasury, romanCash = s.game.tags.ROM.treasury;
    enact(s, 'herod', 'petition'); assert.equal(s.game.tags[tag].treasury, cash - 100); assert.equal(s.game.tags.ROM.treasury, romanCash + 100);
    assert.equal(info(s.ctx, 'herod').record.status, 'petition'); assert(!s.game.tags.HPA);
    checkTriggeredEvents(s.ctx);
    const p = s.game.pendingEvents.find(p => p.eventId === 'ev_herod_rome_answers'); assert(p); assert.equal(p.forTag, 'ROM');
    resolveEventOption(s.ctx, p.instanceId, 0);
    assert.equal(s.game.tags[tag].ruler.name, 'Herod Antipas'); assert.equal(s.game.tags[tag].ruler.title, 'King of Judaea');
    assert.equal(s.game.tags[tag].overlord, 'ROM'); assert.equal(s.game.tags[tag].chapterStrategy.patron.rate, .15); assert(!s.game.tags.HPA);
    assert(!s.ctx.events.find(e => e.id === 'ev4_c_the_year_the_petition_came').when(s.ctx));
    assert(!choose(s.ctx, 'herod', 'ratify').ok);
    assert(mil.switchTagCore(s.ctx, tag, 'MLI'));
    assert.equal(info(s.ctx, 'herod').parent, 'MLI', 'formed crowns retain their crisis');
    console.log('PASS funded embassy, human Roman confirmation, true client obligations, coherent later events and national formation');
  }
  {
    const s = herod();
    const romanFront = s.ctx.helpers.declareWar(s.ctx, 'ROM', 'NAB', 'Rome’s other front');
    assert(romanFront.attackers.includes('HYR'));
    enact(s, 'herod', 'defy'); enact(s, 'herod', 'refuse'); enact(s, 'herod', 'resist');
    assert(!romanFront.attackers.includes('HYR')); assert(romanFront.attackers.includes('ROM'));
    assert.equal(s.game.tags.HYR.overlord, null);
    s.game.truces[mil.truceKey('ROM', 'HYR')] = { y: -3, m: 1 };
    assert(!s.ctx.helpers.canImperialIntervention(s.ctx)); assert(!choose(s.ctx, 'herod', 'enforce').ok);
    s.game.date = { y: -3, m: 1, d: 1 };
    assert(s.ctx.helpers.canImperialIntervention(s.ctx)); enact(s, 'herod', 'enforce');
    assert(s.game.wars.some(w => w.attackers.includes('ROM') && w.defenders.includes('HYR')));
    const divided = herod(); enact(divided, 'herod', 'petition'); enact(divided, 'herod', 'refuse'); enact(divided, 'herod', 'accept_division');
    assert(divided.game.tags.HPA); assert.equal(info(divided.ctx, 'herod').record.status, 'divided');
    const left = herod(); enact(left, 'herod', 'defy'); enact(left, 'herod', 'refuse'); enact(left, 'herod', 'resist'); enact(left, 'herod', 'leave');
    assert.equal(left.game.tags.HYR.overlord, null); assert.equal(left.game.wars.length, 0);
    console.log('PASS Roman refusal, voluntary partition, refusal of authority, binding truces, actual intervention and non-intervention');
  }
  {
    const s = herod(); s.game.tags.HYR.treasury = 0;
    assert(!choose(s.ctx, 'herod', 'petition').ok);
    s.game.tags.HYR.ruler.name = 'Another Heir'; assert(!info(s.ctx, 'herod').exists);
    const imperialClient = herod(); imperialClient.game.tags.ROM.overlord = 'HYR';
    assert(!info(imperialClient.ctx, 'herod').canPetition, 'a subject Rome cannot arbitrate its own lord’s inheritance');
    assert(!choose(imperialClient.ctx, 'herod', 'petition').ok);
    const a = herod(); a.ctx.events = a.ctx.events.filter(e => e.id === 'ev5_herod_dies');
    a.game.date.m = 3; checkDateEvents(a.ctx); assert(!a.game.pendingEvents.length);
    a.game.date.m = 4; checkDateEvents(a.ctx); assert(a.game.pendingEvents.some(p => p.eventId === 'ev5_herod_dies'));
    const b = brothers(); b.ctx.events = b.ctx.events.filter(e => ['ev67_the_brothers_accord', 'ev67_aristobulus_answers'].includes(e.id));
    b.game.playerTag = 'ROM'; b.game.humanTags = ['ROM']; checkDateEvents(b.ctx); checkTriggeredEvents(b.ctx);
    assert.equal(b.game.tags.HYR.overlord, 'ARI', 'AI courts use the same real settlement');
    console.log('PASS absent funds and alternate dynasties, actual date scheduler and AI geopolitical decisions');
  }
  {
    for (const make of [balas, brothers, herod]) {
      const s = make();
      if (s.era.bookmark.id === '167bce') enact(s, 'balas', 'fund');
      else if (info(s.ctx, 'herod').exists) enact(s, 'herod', 'divide');
      else { enact(s, 'brothers', 'offer'); enact(s, 'brothers', 'accept'); }
      // Earlier events have already been answered in a real campaign. Avoid
      // replaying sixty years of past cards in this deliberately staged scene.
      for (const e of s.ctx.events) s.game.firedEvents[e.id] = true;
      s.game.pendingEvents = []; s.game.paused = false;
      for (let day = 0; day < 62; day++) { s.game.paused = false; tickDay(s.ctx); }
      assert(reviveGame(JSON.parse(JSON.stringify(s.game))));
      assert(Object.values(s.game.tags).every(t => Number.isFinite(t.treasury) && Number.isFinite(t.manpower)));
    }
    console.log('PASS real monthly economy, recruitment, diplomacy and save revival after each crisis changes the world');
  }
  assert.deepEqual(warnings, [], 'no swallowed simulation exceptions');
  console.log('ALL PASS');
} finally { console.warn = warn; }
