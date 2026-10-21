// Chapter mechanics: real resource transfers, location, time, war and persistence.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS, PLAYABLE_ERAS } from '../../js/data/compendium.js';
import { CHAPTER_ACTIONS } from '../../js/data/chapter_strategy.js';
import { buildProvinceMapping } from '../../js/data/map_profile.js';
import { initGame, makeCtx, gameActions, reviveGame } from '../../js/sim/init.js';
import { chapterActionInfo, runChapterAction, monthlyChapterStrategies } from '../../js/sim/chapter_strategy.js';
import { incomeBreakdown, runMonthlyEconomy, maxManpowerOf } from '../../js/sim/economy.js';
import { traceSupply, monthlySupply } from '../../js/sim/supply.js';
import { queueUnitRecruitment } from '../../js/sim/recruitment.js';
import { tickDay } from '../../js/sim/tick.js';
import * as mil from '../../js/sim/military.js';
const snap = JSON.parse(readFileSync(new URL('../geom-snapshot.json', import.meta.url)));
function scene(id) {
  const era = ERAS.find(e => e.bookmark.id === id), tag = era.bookmark.playableTags[0].tag;
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark), to = id => provinceMap?.[id] || id;
  const neighbors = snap.neighbors.map(() => new Set());
  for (let id = 1; id < neighbors.length; id++) for (const nb of snap.neighbors[id]) if (to(id) !== to(nb)) { neighbors[to(id)].add(to(nb)); neighbors[to(nb)].add(to(id)); }
  const geom = { neighbors, coastal: snap.coastal.map(Boolean), centroids: snap.centroids.map(c => c ? { x: c[0], y: c[1] } : null), areas: Int32Array.from(snap.areas), bbox: [] };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: [], playerTag: tag, rngSeed: 7, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: [], provinceMap, bus: { emit() {}, on() { return () => {}; } } });
  game.wars = []; game.truces = {}; game.recognitions = {}; game.battles = [];
  for (const t of Object.values(game.tags)) { t.atWarWith = []; t.ai = false; t.treasury = 3000; t.manpower = 30000; t.opinion ||= {}; }
  const t = game.tags[tag]; t.treasury = 10000; t.points = { gov: 999, infl: 999, mar: 999 };
  const places = game.provinces.filter(p => p && !p.impassable && p.owner === tag);
  for (const p of places) { p.controller = tag; p.siege = null; p.construction = null; }
  return { ctx, game, tag, t, places, actions: gameActions(ctx) };
}
function months(ctx, n, economy = false) {
  for (let i = 0; i < n; i++) {
    const d = ctx.game.date; d.m++; d.d = 1;
    if (d.m > 12) { d.m = 1; d.y++; if (!d.y) d.y = 1; }
    monthlyChapterStrategies(ctx); if (economy) runMonthlyEconomy(ctx);
  }
}
const enact = (s, key, args = {}) => { const r = s.actions.runChapterStrategy(key, args); assert(r.ok, `${key}: ${r.why}`); return r; };
assert.equal(PLAYABLE_ERAS.length, 11);
assert(!PLAYABLE_ERAS.some(e => e.bookmark.id === '40bce'));
assert(ERAS.find(e => e.bookmark.id === '40bce').legacy);
assert.match(ERAS.find(e => e.bookmark.id === '67bce').bookmark.name, /Struggle/);
for (const era of ERAS) {
  const s = scene(era.bookmark.id), before = JSON.stringify(s.game), report = s.actions.getChapterStrategy();
  assert(report?.actions.length >= 2, era.bookmark.id);
  for (const action of report.actions) assert(CHAPTER_ACTIONS[action.key]);
  assert.equal(JSON.stringify(s.game), before, 'chapter queries must not mutate saves');
  assert(!s.actions.runChapterStrategy('made_up', {}).ok);
}
console.log('PASS eleven visible bookmarks, legacy 40 BCE, complete menus and read-only queries');
{
  const s = scene('931bce'), p = s.places[0];
  assert(!s.actions.runChapterStrategy('levy_charter', { province: p.id }).ok);
  assert(!s.actions.runChapterStrategy('tax_charter', { province: p.id }).ok);
  const capital = s.places.find(v => v.name !== s.t.capital);
  enact(s, 'capital', { province: capital.id });
  capital.controller = 'REB'; months(s.ctx, 2); assert.equal(s.t.chapterStrategy.projects[0].left, 18);
  capital.controller = s.tag; months(s.ctx, 18);
  assert.equal(s.t.capital, capital.name); assert(mil.resolveTagMult(s.ctx, s.tag, 'adminMult') < 1);
  const snapshot = JSON.stringify(s.game); monthlyChapterStrategies(s.ctx); assert.equal(JSON.stringify(s.game), snapshot, 'monthly consequences are idempotent');
  console.log('PASS retired charter decisions, interrupted capital construction and completion');
}
{
  const s = scene('732bce');
  const target = s.actions.getChapterStrategy().actions.find(a => a.key === 'tribute_troops').options[0];
  assert(target);
  const patron = s.game.tags[target.args.partner], old = patron.treasury;
  enact(s, 'tribute_troops', target.args); assert.equal(patron.treasury, old - 100);
  assert(mil.clientForeignPolicyBar(s.ctx, s.tag));
  months(s.ctx, 12, true); enact(s, 'earn_rights');
  assert.equal(s.t.chapterStrategy.rights, 1);
  const saved = reviveGame(JSON.parse(JSON.stringify(s.game)));
  assert.equal(saved.tags[s.tag].chapterStrategy.service, 12);
  months(s.ctx, 12, true); enact(s, 'earn_rights'); assert.equal(mil.clientForeignPolicyBar(s.ctx, s.tag), '');
  // Two fellow subjects coordinate a real independence war, not a flat bonus.
  const lord = target.args.partner, ally = Object.keys(s.game.tags).find(k => s.game.tags[k].alive && k !== s.tag && k !== lord && k !== 'REB');
  s.t.overlord = lord; s.game.tags[ally].overlord = lord;
  s.game.tags[ally].opinion[s.tag] = 100; s.game.tags[ally].opinion[lord] = -100;
  enact(s, 'pledge', { partner: ally }); enact(s, 'rise');
  assert.equal(s.t.overlord, null); assert(s.game.wars.some(w => w.attackers.includes(s.tag) && w.defenders.includes(lord)));
  assert.equal(s.game.tags[ally].overlord, null);
  const cash = scene('732bce'), cashTarget = cash.actions.getChapterStrategy().actions.find(a => a.key === 'tribute_cash').options.find(v => v.ok);
  enact(cash, 'tribute_cash', cashTarget.args);
  cash.t.treasury = -100; months(cash.ctx, 3); assert.equal(cash.t.chapterStrategy.patron, null);
  console.log('PASS paid service, resource conservation, autonomy rights, save round trip and pledged independence');
}
{
  const s = scene('597bce'), p = s.places[0], prod = p.dev.prod;
  enact(s, 'restore_farms', { province: p.id }); months(s.ctx, 6);
  assert.equal(p.dev.prod, prod + 1); assert(!s.actions.getChapterDecision('restore_farms', { province: p.id }).ok);
  const bank = s.t.treasury;
  assert(!s.actions.runChapterStrategy('restore_towns', { province: s.ctx.prov('Babylon')?.id || -1 }).ok);
  assert.equal(s.t.treasury, bank);
  const tax = p.dev.tax, mp = p.dev.mp;
  enact(s, 'restore_towns', { province: p.id }); enact(s, 'resettle', { province: p.id }); months(s.ctx, 12);
  assert.equal(p.dev.tax, tax + 1); assert.equal(p.dev.mp, mp + 1);
  console.log('PASS province reconstruction, anti-repeat guard and foreign-site rejection');
}
{
  const s = scene('167bce');
  if (!s.places.length) { const p = s.game.provinces.find(p => p && !p.impassable && p.owner === 'SEL'); p.owner = s.tag; p.controller = s.tag; s.places.push(p); }
  const p = s.places[0]; enact(s, 'network', { province: p.id }); months(s.ctx, 3);
  const id = mil.spawnArmy(s.ctx, s.tag, p.name, { inf: 1 });
  // Keep another home cell, but remove the corridor to it.
  const home = s.game.provinces.find(q => q && !q.impassable && q.id !== p.id); home.owner = s.tag; home.controller = s.tag;
  s.ctx.geom.neighbors[p.id] = new Set(); p.controller = 'SEL';
  assert.equal(traceSupply(s.ctx, s.game.armies[id]).via, 'depot');
  const stock = s.t.chapterStrategy.sites[p.id].stock; monthlySupply(s.ctx);
  assert(s.t.chapterStrategy.sites[p.id].stock < stock);
  months(s.ctx, 10); assert(!s.t.chapterStrategy.sites[p.id]);
  enact(s, 'regulars'); months(s.ctx, 12); assert.equal(s.t.chapterStrategy.reforms, 1);
  console.log('PASS prepared networks, finite army supply, suppression and professional army completion');
}
{
  const s = scene('67bce'), estate = s.ctx.bookmark.factions[s.tag][0].id;
  enact(s, 'court_house', { estate }); assert(s.t.chapterStrategy.houses[estate]);
  const patron = s.actions.getChapterStrategy().actions.find(a => a.key === 'patron_troops').options.find(v => v.ok);
  const other = s.game.tags[patron.args.partner], old = other.manpower;
  enact(s, 'patron_troops', patron.args); assert.equal(other.manpower, old - 2000);
  assert(!s.actions.getChapterDecision('patron_silver', patron.args).ok);
  const legitimacy = s.t.legitimacy; enact(s, 'end_patron'); assert.equal(s.t.legitimacy, Math.max(0, legitimacy - 15));
  enact(s, 'capital', { province: s.places.find(p => p.name !== s.t.capital).id });
  const project = s.t.chapterStrategy.projects[0];
  assert(mil.switchTagCore(s.ctx, s.tag, 'HAS'));
  assert.equal(s.game.tags.HAS.chapterStrategy.projects[0].province, project.province);
  assert(s.actions.getChapterStrategy().actions.find(a => a.key === 'court_house').options.some(v => v.id === estate));
  const recognized = scene('67bce'), support = recognized.actions.getChapterStrategy().actions.find(a => a.key === 'patron_recognition').options.find(v => v.ok);
  recognized.t.legitimacy = 50; enact(recognized, 'patron_recognition', support.args); assert.equal(recognized.t.legitimacy, 60);
  console.log('PASS house backing, real patron troops, exclusive contracts and breach consequences');
}
{
  const s = scene('66ce'), p = s.places[0], before = s.t.manpower;
  assert(!s.actions.runChapterStrategy('regional_command', { province: p.id }).ok);
  assert(!s.actions.runChapterStrategy('unified_command', {}).ok);
  assert.equal(s.t.manpower, before);
  s.t.atWarWith = ['ROM']; enact(s, 'council_tax'); assert(!s.actions.getChapterDecision('council_tax', {}).ok);
  enact(s, 'requisition', { province: p.id }); assert(!s.actions.getChapterDecision('requisition', { province: p.id }).ok);
  console.log('PASS regional commands consolidated into Ideas and non-repeatable emergency powers');
}
{
  const s = scene('132ce'), p = s.places[0], original = s.t.manpower;
  enact(s, 'depot', { province: p.id }); assert.equal(s.t.manpower, original - 1000);
  months(s.ctx, 6); assert(s.t.chapterStrategy.sites[p.id].reserves >= 1000);
  const stored = s.t.chapterStrategy.sites[p.id].reserves, before = s.t.manpower;
  enact(s, 'draw_reserves', { province: p.id }); assert.equal(s.t.manpower, before + stored);
  assert(!s.actions.getChapterDecision('draw_reserves', { province: p.id }).ok);
  console.log('PASS depots reserve actual manpower and cannot be drawn twice');
}
for (const settlement of ['local_government', 'recognition', 'independence']) {
  const s = scene('351ce'); s.t.overlord = null;
  const war = mil.declareWar(s.ctx, s.tag, 'ROM', 'The Rising', 'conquest'); assert(war);
  war.warscore[s.tag] = 10; war.warscore.ROM = -10;
  assert(!mil.evaluatePeaceDeal(s.ctx, war, s.tag, { chapterSettlement: settlement }).acceptable);
  war.warscore[s.tag] = 90; war.warscore.ROM = -90;
  assert(mil.evaluatePeaceDeal(s.ctx, war, s.tag, { chapterSettlement: settlement }).acceptable);
  const own = s.places[0];
  assert(!mil.evaluatePeaceDeal(s.ctx, war, s.tag, { chapterSettlement: settlement, concessions: [own.id] }).acceptable);
  mil.executePeaceDeal(s.ctx, war, s.tag, { chapterSettlement: settlement });
  assert.equal(s.t.chapterStrategy.settlement, settlement);
  assert(!s.game.wars.includes(war));
  if (settlement === 'local_government') { assert.equal(s.t.overlord, 'ROM'); assert.equal(incomeBreakdown(s.ctx, s.tag).tributeOut, incomeBreakdown(s.ctx, s.tag).income * .05); months(s.ctx, 1); }
  if (settlement === 'recognition') assert(mil.recognized(s.ctx, s.tag, 'ROM'));
}
console.log('PASS distinct political settlements with real war-score costs and no province credit');
{
  const s = scene('529ce'), p = s.places[0], faith = p.religion;
  assert(!s.actions.runChapterStrategy('municipal_charter', { province: p.id }).ok); enact(s, 'tolerance', { province: p.id });
  assert.equal(p.religion, faith); assert(p.modifiers.some(m => m.effects?.taxMult === .8));
  enact(s, 'religious_uniformity', { province: p.id }); assert.equal(p.modifiers.filter(m => m.id === 'chapter_local_policy').length, 1);
  console.log('PASS retired municipal shortcut and mutually replacing local religious policies');
}
{
  const s = scene('614ce');
  const patron = s.actions.getChapterStrategy().actions.find(a => a.key === 'patron_silver').options.find(v => v.ok);
  assert(patron); enact(s, 'patron_silver', patron.args);
  const p = s.game.provinces.find(p => p && !p.impassable && p.owner === 'BYZ');
  p.controller = s.tag; s.t.atWarWith = ['BYZ']; s.game.tags.BYZ.atWarWith = [s.tag];
  enact(s, 'local_administration', { province: p.id }); months(s.ctx, 1);
  assert(s.t.chapterStrategy.monthlyIn > 0); assert.equal(p.owner, 'BYZ');
  enact(s, 'imperial_administration', { province: p.id }); const standing = s.t.chapterStrategy.standing;
  months(s.ctx, 1); assert(s.t.chapterStrategy.standing > standing);
  console.log('PASS occupation revenue and imperial service without a free province cession');
}
{
  const s = scene('1948ce'), cap = maxManpowerOf(s.ctx, s.tag), income = incomeBreakdown(s.ctx, s.tag).income;
  enact(s, 'mobilize_full'); assert(maxManpowerOf(s.ctx, s.tag) > cap); assert(incomeBreakdown(s.ctx, s.tag).income < income);
  assert(!s.actions.getChapterDecision('demobilize', {}).ok); months(s.ctx, 6); enact(s, 'demobilize');
  const view = s.actions.getChapterStrategy(), ports = view.actions.find(a => a.key === 'order_arms').options;
  const pair = ports.flatMap(p => view.suppliers.map(supplier => ({ province: p.args.province, partner: supplier.id }))).find(args => s.actions.getChapterDecision('order_arms', args).ok);
  assert(pair, 'a real delivery port and willing supplier exist');
  const other = s.game.tags[pair.partner], old = other.treasury;
  enact(s, 'order_arms', pair); assert.equal(other.treasury, old + 100);
  s.game.embargoes ||= {}; s.game.embargoes[pair.partner + '>' + s.tag] = {};
  months(s.ctx, 2); assert.equal(s.t.chapterStrategy.shipments[0].left, 3);
  delete s.game.embargoes[pair.partner + '>' + s.tag]; months(s.ctx, 3);
  assert.equal(s.t.chapterStrategy.equipment, 4);
  const q = queueUnitRecruitment(s.ctx, s.tag, pair.province, 'inf', { months: 4 });
  assert.equal(q.monthsLeft, 3); assert.equal(s.t.chapterStrategy.equipment, 3);
  enact(s, 'order_arms', pair); s.game.embargoes[pair.partner + '>' + s.tag] = {};
  const bank = s.t.treasury; months(s.ctx, 6); assert.equal(s.t.chapterStrategy.shipments.length, 0); assert.equal(s.t.treasury, bank + 50);
  console.log('PASS mobilization tradeoffs, cooldown, paid shipments, interruptions, equipment use and refunds');
}
{
  const warnings = [], original = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    for (const era of PLAYABLE_ERAS) {
      const s = scene(era.bookmark.id);
      for (const choice of era.bookmark.playableTags) if (choice.tag !== s.tag) {
        s.game.tags[choice.tag].ai = true;
        s.game.tags[choice.tag].points = { gov: 150, infl: 150, mar: 150 };
      }
      s.game.date.m = 2; s.game.date.d = 30;
      tickDay(s.ctx);
      for (const t of Object.values(s.game.tags)) if (t.alive) {
        assert(Number.isFinite(t.treasury), era.bookmark.id + ': finite treasury');
        assert(Number.isFinite(t.manpower), era.bookmark.id + ': finite manpower');
      }
      assert.equal(reviveGame(JSON.parse(JSON.stringify(s.game))).bookmarkId, era.bookmark.id);
      assert(!Object.values(s.game.tags).some(t => Object.values(t.chapterStrategy?.charters || {}).some(c => ['levy_charter', 'tax_charter', 'municipal_charter', 'regional_command'].includes(c.kind))), 'AI cannot recreate retired charters');
    }
  } finally { console.warn = original; }
  assert.deepEqual(warnings, [], 'all chapter systems must run through the real monthly clock without swallowed exceptions');
  console.log('PASS real monthly orchestration, AI chapter decisions, finite resources and saves across all eleven chapters');
}
console.log('ALL PASS');
