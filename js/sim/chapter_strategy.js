import { CHAPTER_ACTIONS, chapterStrategyProfile } from '../data/chapter_strategy.js';
import { num, clamp, armiesOf, opinionOf, isHostile, sameSide, declareIndependenceCore,
  independenceInfo, joinWar, tagGen, chronicle, isOffmapTag, isHumanChair } from './military.js';
import { incomeBreakdown } from './economy.js';
import { isCoastal } from './navy.js';
import { queueUnitRecruitment } from './recruitment.js';
import { shiftFaction, factionDefs } from './factions.js';
import { blockadedState } from './embargo.js';
import { dominantEstate } from './estates.js';

export const chapterMonth = d => (d.y > 0 ? d.y - 1 : d.y) * 12 + d.m - 1;
const now = ctx => chapterMonth(ctx.game.date);
const fresh = () => ({ sites: {}, charters: {}, projects: [], pledges: {}, houses: {}, cooldowns: {},
  completed: {},
  reforms: 0, mobilization: 0, rights: 0, service: 0, standing: 0, equipment: 0,
  monthlyOut: 0, monthlyIn: 0, shipments: [], log: [] });
const read = t => ({ ...fresh(), ...(t.chapterStrategy || {}) });
const book = t => {
  t.chapterStrategy ||= fresh();
  for (const [key, value] of Object.entries(fresh())) if (t.chapterStrategy[key] === undefined) t.chapterStrategy[key] = value;
  return t.chapterStrategy;
};
const alive = (ctx, tag) => !!ctx.game.tags[tag]?.alive;
const controlled = (ctx, tag) => ctx.game.provinces.filter(p => p && !p.impassable && p.owner === tag && p.controller === tag);
const definitions = (ctx, tag) => factionDefs(ctx, tag) || [];
const hostile = (ctx, a, b) => isHostile(ctx, a, b);
function note(ctx, tag, text) {
  const s = book(ctx.game.tags[tag]); s.log.unshift({ ...ctx.game.date, text }); s.log.length = Math.min(12, s.log.length);
  if (tag === ctx.game.playerTag) chronicle(ctx, 'era', text);
}
function modifier(list, id, name, effects, months = -1) {
  const old = list.find(m => m.id === id);
  if (old) Object.assign(old, { name, effects, months }); else list.push({ id, name, effects, months });
}
function estateShift(ctx, tag, p, amount) {
  const defs = definitions(ctx, tag);
  const id = dominantEstate(ctx, p, defs)?.id || defs[0]?.id;
  if (id) shiftFaction(ctx, tag, id, amount);
}
function costWhy(t, cost) {
  if (num(t.treasury) < num(cost.gold)) return `Requires ${cost.gold} talents.`;
  if (num(t.manpower) < num(cost.manpower)) return `Requires ${cost.manpower} available manpower.`;
  for (const k of ['gov', 'infl', 'mar']) if (num(t.points?.[k]) < num(cost[k])) return `Requires ${cost[k]} ${k} points.`;
  return '';
}
function pay(t, cost) {
  t.treasury -= num(cost.gold); t.manpower -= num(cost.manpower);
  for (const k of ['gov', 'infl', 'mar']) if (cost[k]) t.points[k] -= cost[k];
}
function patronCandidates(ctx, tag) {
  const t = ctx.game.tags[tag], counts = {};
  for (const p of ctx.game.provinces) if (p?.owner) counts[p.owner] = (counts[p.owner] || 0) + 1;
  const size = counts[tag] || 0;
  return Object.entries(ctx.game.tags).filter(([key, v]) => key !== tag && v.alive && key !== 'REB'
    && !isHumanChair(ctx.game, key)
    && !v.overlord && !hostile(ctx, tag, key) && (!t.overlord || t.overlord === key)
    && (key === t.overlord || (counts[key] || 0) >= Math.max(3, size * 1.2)))
    .map(([id, v]) => ({ id, name: v.name || id }));
}
function pledgeWilling(ctx, tag, partner, lord) {
  const p = ctx.game.tags[partner];
  return !!p?.alive && !isHumanChair(ctx.game, partner) && partner !== lord && partner !== tag && !hostile(ctx, tag, partner)
    && (p.overlord === lord || hostile(ctx, partner, lord) || num(p.opinion?.[lord]) < -20)
    && opinionOf(ctx, partner, tag) >= 0 && num(p.manpower) + armiesOf(ctx, partner).reduce((a, b) => a + num(b.men), 0) >= 2000;
}
function effectiveCost(ctx, tag, key) {
  const cost = { ...CHAPTER_ACTIONS[key].cost }, s = read(ctx.game.tags[tag]);
  if (key === 'regulars') { cost.gold *= s.reforms + 1; cost.mar += s.reforms * 20; }
  if (key === 'regional_command') cost.manpower = 1000;
  return cost;
}
export function chapterActionInfo(ctx, tag, key, args = {}) {
  const profile = chapterStrategyProfile(ctx.bookmark?.id), t = ctx.game.tags[tag], def = CHAPTER_ACTIONS[key];
  if (!profile?.actions.includes(key) || !t?.alive || !def) return { ok: false, why: 'This decision is unavailable in this chapter.' };
  const s = read(t), p = ctx.byId(Number(args.province)), partner = String(args.partner || '');
  const cost = effectiveCost(ctx, tag, key);
  let why = costWhy(t, cost);
  if (!why && ['levy_charter', 'tax_charter', 'municipal_charter', 'regional_command', 'direct_rule'].includes(key)
      && (t.nationalStrategy?.colonies?.[p?.id] || t.nationalStrategy?.cities?.[p?.id])) why = 'Integrate the existing national-path charter through Ideas first.';
  if (!why && ['province', 'port'].includes(def.target) && (!p || p.impassable || p.owner !== tag || p.controller !== tag || p.siege)) why = 'Choose an owned, controlled province without a siege.';
  if (!why && def.target === 'occupation' && (!p || p.impassable || p.controller !== tag || p.owner === tag || !hostile(ctx, tag, p.owner))) why = 'Choose occupied enemy territory.';
  if (!why && def.target === 'estate' && !definitions(ctx, tag).some(d => d.id === args.estate)) why = 'Choose one of this court’s estates.';
  if (!why && def.target === 'patron' && !patronCandidates(ctx, tag).some(v => v.id === partner)) why = 'Choose a stronger, independent patron at peace with us.';
  if (!why && def.target === 'patron' && opinionOf(ctx, partner, tag) < -20) why = 'The proposed patron is too hostile to accept.';
  if (!why && def.target === 'patron' && s.patron) why = 'An existing patron agreement must expire or be renounced first.';
  if (!why && def.target === 'patron' && Number.isFinite(s.cooldowns['patron:' + partner]) && s.cooldowns['patron:' + partner] > now(ctx)) why = 'That patron will not sign again for three years after a broken agreement.';
  if (!why && key === 'patron_silver' && num(ctx.game.tags[partner]?.treasury) < 180) why = 'The patron cannot spare 180 talents.';
  if (!why && key.startsWith('tribute_') && num(ctx.game.tags[partner]?.treasury) < 100) why = 'The patron cannot spare 100 talents.';
  if (!why && key === 'patron_troops' && num(ctx.game.tags[partner]?.manpower) < 2000) why = 'The patron cannot spare 2,000 manpower.';
  if (!why && key === 'earn_rights' && (!s.patron || s.service < (s.rights + 1) * 12 || s.rights >= 2)) why = 'Requires an active agreement and another 12 fulfilled months; at most two autonomy guarantees.';
  if (!why && key === 'earn_rights' && s.standing < 30 + s.rights * 10) why = `Requires ${30 + s.rights * 10} patron standing; fulfilling service and imperial administration improve it.`;
  if (!why && key === 'end_patron' && !s.patron) why = 'There is no patron agreement to renounce.';
  if (!why && key === 'pledge' && (!t.overlord || !pledgeWilling(ctx, tag, partner, t.overlord))) why = 'A willing fellow subject or rival of our overlord is required.';
  if (!why && key === 'pledge' && s.pledges[partner]?.until > now(ctx)) why = 'That pledge is already active.';
  if (!why && key === 'rise') why = independenceInfo(ctx, tag)?.why || (!t.overlord ? 'There is no overlord to rise against.' : '');
  if (!why && key === 'rise' && !Object.values(s.pledges).some(v => v.until > now(ctx))) why = 'Secure at least one live pledge first.';
  if (!why && def.months && s.projects.some(v => v.key === key && (def.target === 'none' || v.province === p?.id))) why = 'That project is already underway.';
  if (!why && ['restore_farms', 'restore_towns', 'resettle'].includes(key) && s.completed?.[key + ':' + p?.id]) why = 'This province has already completed that reconstruction project.';
  if (!why && ['network', 'depot'].includes(key) && s.sites[p?.id]) why = 'A support network or depot already occupies this site.';
  if (!why && key === 'capital' && (s.projects.some(v => v.key === key) || t.capital === p?.name || s.capital === p?.id)) why = 'Choose a new capital; only one capital project may run at a time.';
  if (!why && key === 'regulars' && s.reforms >= 3) why = 'All three army reforms are complete.';
  if (!why && key === 'court_house' && s.houses[args.estate]) why = 'This house is already bound by an agreement.';
  if (!why && ['levy_charter', 'tax_charter', 'municipal_charter', 'regional_command'].includes(key) && s.charters[p?.id]) why = 'Revoke the existing charter through a royal governor first.';
  if (!why && key === 'direct_rule' && !s.charters[p?.id] && num(p?.autonomy) <= 0) why = 'This province already has direct royal administration.';
  if (!why && key === 'unified_command' && (s.unified || !Object.values(s.charters).some(v => v.kind === 'regional_command'))) why = 'Requires regional commands; command can only be unified once.';
  if (!why && key === 'council_tax' && !t.atWarWith?.length) why = 'Emergency taxation requires a war.';
  if (!why && key === 'draw_reserves' && (!s.sites[p?.id] || num(s.sites[p?.id].reserves) < 1)) why = 'No stored recruits are available here.';
  if (!why && ['local_administration', 'imperial_administration'].includes(key) && !s.patron) why = 'Negotiate a patron agreement first.';
  if (!why && ['tolerance', 'religious_uniformity', 'local_administration', 'imperial_administration'].includes(key) && p?.modifiers?.some(m => m.id === 'chapter_local_policy' && m.name === def.name)) why = 'This policy already applies here.';
  if (!why && key.startsWith('mobilize_') && s.mobilization === (key === 'mobilize_full' ? 2 : 1)) why = 'This mobilization level is already in force.';
  if (!why && key === 'demobilize' && !s.mobilization) why = 'The reserves are already demobilized.';
  if (!why && key === 'order_arms') {
    if (!isCoastal(ctx, p.id)) why = 'Deliveries need a controlled coastal province.';
    else if (!alive(ctx, partner) || partner === tag || isHumanChair(ctx.game, partner) || hostile(ctx, tag, partner) || ctx.game.tags[partner].overlord
      || opinionOf(ctx, partner, tag) < 0 || ctx.game.embargoes?.[partner + '>' + tag]) why = 'Choose a willing independent supplier without war or an embargo.';
    else if (!isOffmapTag(ctx, partner) && num(ctx.game.tags[partner].tech?.mar) < num(t.tech?.mar)) why = 'The supplier needs military technology at least equal to ours.';
    else if (s.shipments.length >= 2 || s.equipment >= 8) why = 'At most two shipments or eight stored equipment sets.';
  }
  const cd = key.startsWith('mobilize_') || key === 'demobilize' ? 'mobilization' : key + ':' + (p?.id || args.estate || 'realm');
  if (!why && Number.isFinite(s.cooldowns[cd]) && s.cooldowns[cd] > now(ctx)) why = `Available again in ${s.cooldowns[cd] - now(ctx)} months.`;
  return { ok: !why, why, cost, key, cd };
}
function applyNational(t) {
  const s = read(t), effects = { disciplineMult: 1 + s.reforms * .03 + (s.unified ? .05 : 0),
    reinforceMult: 1 + s.reforms * .1, maintMult: (1 + s.reforms * .12) * (s.mobilization === 2 ? 1.25 : s.mobilization === 1 ? 1.1 : 1),
    manpowerMult: 1 + s.mobilization * .25, incomeMult: s.mobilization === 2 ? .75 : s.mobilization === 1 ? .9 : 1,
    adminMult: s.capital ? .9 : 1 };
  t.modifiers ||= []; modifier(t.modifiers, 'chapter_strategy', 'Chapter institutions', effects);
}
export function runChapterAction(ctx, tag, key, args = {}) {
  const check = chapterActionInfo(ctx, tag, key, args); if (!check.ok) return check;
  const t = ctx.game.tags[tag], s = book(t), def = CHAPTER_ACTIONS[key], p = ctx.byId(Number(args.province));
  const partner = args.partner, other = ctx.game.tags[partner];
  if (key === 'rise') {
    const lord = t.overlord, result = declareIndependenceCore(ctx, tag); if (!result.ok) return result;
    pay(t, check.cost);
    const war = ctx.game.wars.find(w => w.id === result.warId);
    for (const [ally, pledge] of Object.entries(s.pledges)) {
      if (pledge.until <= now(ctx) || !pledgeWilling(ctx, tag, ally, lord)) continue;
      if (ctx.game.tags[ally].overlord === lord) {
        const rebel = declareIndependenceCore(ctx, ally);
        // A simultaneous revolt may have its own front; it still forces the lord to divide its army.
        if (!rebel.ok) continue;
      } else if (war && !war.attackers.includes(ally) && !war.defenders.includes(ally)) joinWar(ctx, war, ally, war.attackers.includes(tag) ? 'att' : 'def');
    }
    s.pledges = {}; note(ctx, tag, 'The pledged uprising begins; each supporter answers on its own current circumstances.');
    return result;
  }
  pay(t, check.cost);
  if (def.months) {
    s.projects.push({ key, province: p?.id || 0, left: def.months, total: def.months, stalled: '' });
  } else if (def.target === 'patron') {
    const grant = key === 'patron_silver' ? 180 : key.startsWith('tribute_') ? 100 : 0;
    if (grant) { other.treasury -= grant; t.treasury += grant; }
    if (key === 'patron_troops') { other.manpower -= 2000; t.manpower += 2000; }
    if (key === 'patron_recognition') t.legitimacy = clamp(num(t.legitimacy) + 10, 0, 100);
    s.patron = { tag: partner, until: now(ctx) + 36, rate: key === 'tribute_troops' ? .05 : .1,
      manpower: key === 'tribute_troops' ? 150 : 0, arrears: 0 };
    s.service = 0; s.rights = 0; s.standing = 20;
    other.opinion ||= {}; other.opinion[tag] = clamp(num(other.opinion[tag]) + 15, -200, 200);
  } else if (key === 'earn_rights') {
    s.rights++; s.patron.rate = Math.max(.02, s.patron.rate - .025);
    s.patron.until = Math.max(s.patron.until, now(ctx) + 18);
  } else if (key === 'end_patron') {
    const patron = ctx.game.tags[s.patron.tag];
    if (s.patron.until > now(ctx)) {
      s.cooldowns['patron:' + s.patron.tag] = now(ctx) + 36;
      t.legitimacy = clamp(num(t.legitimacy) - 15, 0, 100);
      if (patron) { patron.opinion ||= {}; patron.opinion[tag] = clamp(num(patron.opinion[tag]) - 40, -200, 200); }
    }
    s.patron = null; s.rights = 0; s.standing = 0;
  } else if (key === 'pledge') {
    s.pledges[partner] = { until: now(ctx) + 24, lord: t.overlord };
  } else if (key === 'court_house') {
    s.houses[args.estate] = { until: now(ctx) + 60, arrears: 0 };
    shiftFaction(ctx, tag, args.estate, 15); t.manpower += 1000;
  } else if (['levy_charter', 'regional_command', 'tax_charter', 'municipal_charter'].includes(key)) {
    s.charters[p.id] = { kind: key, age: 0, loyalty: 70 };
    p.autonomy = Math.max(num(p.autonomy), .4); p.modifiers ||= [];
    modifier(p.modifiers, 'chapter_charter', def.name, { prodMult: ['tax_charter', 'municipal_charter'].includes(key) ? 1.25 : 1, unrest: -1 });
    estateShift(ctx, tag, p, 8);
    if (key === 'municipal_charter') t.treasury += 50;
    if (key === 'regional_command') queueUnitRecruitment(ctx, tag, p.id, 'inf', { manpower: 1000, gen: tagGen(ctx, tag) });
  } else if (key === 'direct_rule' || key === 'unified_command') {
    const places = key === 'direct_rule' ? [p] : Object.keys(s.charters).map(id => ctx.byId(Number(id))).filter(q => q?.owner === tag && q.controller === tag);
    for (const q of places) {
      if (s.charters[q.id]) { estateShift(ctx, tag, q, -12); modifier(q.modifiers ||= [], 'chapter_revocation', 'Revoked provincial privileges', { unrest: 3 }, 24); }
      delete s.charters[q.id]; q.modifiers = (q.modifiers || []).filter(m => m.id !== 'chapter_charter');
      q.autonomy = Math.max(0, num(q.autonomy) - .15);
    }
    if (key === 'unified_command') s.unified = true;
  } else if (key === 'requisition') {
    t.treasury += 35; t.manpower += 500;
    modifier(p.modifiers ||= [], 'chapter_requisition', 'Requisitioned stores', { taxMult: .75, prodMult: .75, unrest: 3 }, 24);
    estateShift(ctx, tag, p, -8); s.cooldowns[check.cd] = now(ctx) + 24;
  } else if (key === 'council_tax') {
    t.treasury += 80; t.legitimacy = clamp(num(t.legitimacy) - 8, 0, 100);
    modifier(t.modifiers ||= [], 'chapter_war_tax', 'Emergency war taxation', { unrestAll: 1.5 }, 18);
    s.cooldowns[check.cd] = now(ctx) + 18;
  } else if (key === 'draw_reserves') {
    t.manpower += s.sites[p.id].reserves; s.sites[p.id].reserves = 0;
  } else if (key === 'tolerance' || key === 'religious_uniformity') {
    modifier(p.modifiers ||= [], 'chapter_local_policy', def.name, key === 'tolerance' ? { unrest: -2, taxMult: .8, prodMult: 1.1 } : { unrest: 2, taxMult: 1.15 });
    estateShift(ctx, tag, p, key === 'tolerance' ? 8 : -8);
    if (key === 'tolerance') {
      const defs = definitions(ctx, tag), local = dominantEstate(ctx, p, defs)?.id;
      for (const def of defs) if (def.id !== local) shiftFaction(ctx, tag, def.id, -4);
    }
    s.cooldowns[check.cd] = now(ctx) + 12;
  } else if (key.endsWith('_administration')) {
    s.charters[p.id] = { kind: key, age: 0, loyalty: 70 };
    modifier(p.modifiers ||= [], 'chapter_local_policy', def.name, { unrest: key === 'local_administration' ? -1 : 0 });
  } else if (key.startsWith('mobilize_') || key === 'demobilize') {
    s.mobilization = key === 'demobilize' ? 0 : key === 'mobilize_full' ? 2 : 1;
    s.cooldowns.mobilization = now(ctx) + 6;
  } else if (key === 'order_arms') {
    other.treasury += 100; s.shipments.push({ partner, province: p.id, left: 3, stalled: 0, why: '' });
  }
  if (p) for (const mod of p.modifiers || []) if (['chapter_charter', 'chapter_local_policy'].includes(mod.id)) mod.chapterOwner = tag;
  applyNational(t);
  note(ctx, tag, `${def.name}${p ? ' — ' + p.name : other ? ' — ' + other.name : ''}.`);
  return { ok: true };
}
function finishProject(ctx, tag, v) {
  const t = ctx.game.tags[tag], s = book(t), p = ctx.byId(v.province);
  if (v.key === 'regulars') {
    s.reforms++; for (const def of definitions(ctx, tag)) shiftFaction(ctx, tag, def.id, -4);
  } else if (v.key === 'capital') { s.capital = p.id; t.capital = p.name; }
  else if (v.key === 'network' || v.key === 'depot') s.sites[p.id] = { kind: v.key, strength: 100, reserves: v.key === 'depot' ? 1000 : 0, stock: 6 };
  else if (v.key === 'restore_farms') p.dev.prod++;
  else if (v.key === 'restore_towns') { p.dev.tax++; p.autonomy = Math.max(0, num(p.autonomy) - .1); }
  else if (v.key === 'resettle') { p.dev.mp++; modifier(p.modifiers ||= [], 'chapter_return', 'Returning households', { unrest: -1 }, 60); }
  s.completed ||= {}; s.completed[v.key + ':' + v.province] = true;
  note(ctx, tag, `${CHAPTER_ACTIONS[v.key].name} completed${p ? ' in ' + p.name : ''}.`);
}
function enemyCommitments(ctx, tag) {
  const rows = [];
  for (const enemy of ctx.game.tags[tag]?.atWarWith || []) {
    const wars = ctx.game.wars.filter(w => w.attackers.includes(enemy) || w.defenders.includes(enemy));
    const others = wars.filter(w => !w.attackers.includes(tag) && !w.defenders.includes(tag));
    rows.push({ tag: enemy, name: ctx.game.tags[enemy]?.name || enemy, otherWars: others.length,
      fieldMen: armiesOf(ctx, enemy).reduce((sum, a) => sum + num(a.men), 0),
      pressure: others.length >= 2 ? 'Divided between several wars' : others.length ? 'Committed on another front' : 'Free to concentrate',
      wars: others.map(w => w.name) });
  }
  return rows;
}
export function monthlyChapterStrategies(ctx) {
  if (!chapterStrategyProfile(ctx.bookmark?.id)) return;
  const current = now(ctx);
  if (ctx.game.chapterStrategyMonth === current) return;
  ctx.game.chapterStrategyMonth = current;
  if (ctx.bookmark.id === '351ce' && ctx.game.tags.ROM?.alive) {
    const wars = ctx.game.wars.filter(w => w.attackers.includes('ROM') || w.defenders.includes('ROM'));
    const fronts = Math.max(0, wars.length - 1);
    modifier(ctx.game.tags.ROM.modifiers ||= [], 'chapter_imperial_commitments', 'Imperial military commitments', { reinforceMult: 1 / (1 + fronts * .2), maintMult: 1 + fronts * .05 });
  }
  for (const t of Object.values(ctx.game.tags)) if (t?.chapterStrategy) { t.chapterStrategy.monthlyOut = 0; t.chapterStrategy.monthlyIn = 0; }
  for (const [tag, t] of Object.entries(ctx.game.tags)) {
    if (!t.alive || tag === 'REB' || !t.chapterStrategy) continue;
    const s = book(t); if (s.lastMonth === current) continue; s.lastMonth = current;
    const fund = amount => { if (num(t.treasury) - s.monthlyOut < amount) return false; s.monthlyOut += amount; return true; };
    const keep = [];
    for (const v of s.projects) {
      const p = ctx.byId(v.province), def = CHAPTER_ACTIONS[v.key];
      if (v.province && (!p || p.owner !== tag)) { note(ctx, tag, `${def.name} abandoned after the site was lost.`); continue; }
      v.stalled = v.province && (p.controller !== tag || p.siege) ? 'Enemy occupation' : !fund(def.upkeep) ? 'Insufficient project funding' : '';
      if (!v.stalled) v.left--;
      if (v.left <= 0) finishProject(ctx, tag, v); else keep.push(v);
    }
    s.projects = keep;
    for (const [id, site] of Object.entries(s.sites)) {
      const p = ctx.byId(Number(id)); if (!p || p.owner !== tag) { delete s.sites[id]; continue; }
      if (p.controller !== tag) {
        site.strength -= site.kind === 'network' ? 10 : 25;
        if (site.strength <= 0) { note(ctx, tag, `${p.name}: the occupied ${site.kind} was dismantled.`); delete s.sites[id]; continue; }
      } else if (fund(site.kind === 'depot' ? 2 : 1)) {
        site.strength = Math.min(100, site.strength + 5); site.stock = Math.min(6, site.stock + 1);
        const gain = Math.min(100, Math.max(0, num(t.manpower)), 2000 - site.reserves);
        site.reserves += gain; t.manpower -= gain;
      }
    }
    for (const [id, charter] of Object.entries(s.charters)) {
      const p = ctx.byId(Number(id));
      if (!p || (p.owner !== tag && p.controller !== tag)) {
        if (p) p.modifiers = (p.modifiers || []).filter(m => m.chapterOwner !== tag);
        delete s.charters[id]; continue;
      }
      if (p.controller !== tag) continue;
      charter.age++;
      if (charter.kind.endsWith('_administration')) {
        if (!s.patron) { delete s.charters[id]; continue; }
        if (p.owner === tag) continue; // ceded territory is no longer occupied foreign revenue
        if (charter.kind === 'imperial_administration') s.standing = Math.min(100, s.standing + 1);
        else {
          s.standing = Math.max(0, s.standing - 1);
          const owner = ctx.game.tags[p.owner], due = p.owner !== tag ? Math.min(2, Math.max(0, num(owner?.treasury))) : 0;
          if (due && owner) { book(owner).monthlyOut += due; s.monthlyIn += due; }
        }
      } else {
        const autonomy = Math.max(num(p.autonomy), .4); p.autonomy = autonomy;
        charter.loyalty = clamp(charter.loyalty + (num(t.legitimacy) >= 40 ? 1 : -3), 0, 100);
        if (charter.age % 12 === 0 && ['levy_charter', 'regional_command'].includes(charter.kind) && charter.loyalty >= 40) t.manpower += 500;
      }
    }
    for (const [estate, pact] of Object.entries(s.houses)) {
      if (pact.until <= current) { delete s.houses[estate]; continue; }
      if (!fund(1)) { pact.arrears++; shiftFaction(ctx, tag, estate, -3); t.legitimacy = Math.max(0, num(t.legitimacy) - 1); }
      else pact.arrears = 0;
      if (pact.arrears >= 3) { delete s.houses[estate]; note(ctx, tag, 'An unpaid house withdraws its backing.'); }
    }
    if (s.patron) {
      const pact = s.patron, patron = ctx.game.tags[pact.tag];
      if (!patron?.alive || pact.until <= current || hostile(ctx, tag, pact.tag) || (t.overlord && t.overlord !== pact.tag)) {
        s.patron = null; s.rights = 0; s.standing = 0; note(ctx, tag, 'The patron agreement ends.');
      } else {
        const due = t.overlord === pact.tag ? 0 : Math.max(0, incomeBreakdown(ctx, tag).income) * pact.rate;
        if (num(t.manpower) >= pact.manpower && fund(due)) {
          t.manpower -= pact.manpower; patron.manpower = num(patron.manpower) + pact.manpower;
          book(patron).monthlyIn += due; s.service++; s.standing = Math.min(100, s.standing + 1); pact.arrears = 0;
        } else { pact.arrears++; s.standing = Math.max(0, s.standing - 5); }
        if (pact.arrears >= 3) {
          s.cooldowns['patron:' + pact.tag] = current + 36;
          patron.opinion ||= {}; patron.opinion[tag] = clamp(num(patron.opinion[tag]) - 30, -200, 200);
          s.patron = null; s.rights = 0; t.legitimacy = Math.max(0, num(t.legitimacy) - 10); note(ctx, tag, 'Three months of broken service end the patron agreement.');
        }
      }
    }
    for (const [ally, pledge] of Object.entries(s.pledges)) if (pledge.until <= current || !alive(ctx, ally) || pledge.lord !== t.overlord) delete s.pledges[ally];
    s.shipments = s.shipments.filter(v => {
      const port = ctx.byId(v.province), supplier = ctx.game.tags[v.partner];
      const blockade = blockadedState(ctx, tag) || Object.values(ctx.game.fleets || {}).some(f => f.prov === v.province && f.ships > 0 && hostile(ctx, tag, f.tag));
      v.why = !supplier?.alive ? 'Supplier no longer exists' : !port || port.owner !== tag || port.controller !== tag ? 'Delivery port lost'
        : port.siege ? 'Port under siege' : hostile(ctx, tag, v.partner) ? 'War with supplier' : ctx.game.embargoes?.[v.partner + '>' + tag] ? 'Supplier embargo' : blockade ? 'Port blockaded' : '';
      if (v.why) v.stalled++; else v.left--;
      if (v.stalled >= 6) { t.treasury += 50; if (supplier) supplier.treasury -= 50; note(ctx, tag, 'An interrupted arms shipment is cancelled; 50 talents refunded.'); return false; }
      if (v.left <= 0) { s.equipment += 4; note(ctx, tag, `Equipment for four regiments arrives at ${port.name}.`); return false; }
      return true;
    });
    applyNational(t);
  }
  // AI uses the same live validation and pays the same costs. Restrict decisions
  // to authored playable courts and one quarterly order, preserving its war chest.
  if (ctx.game.date.m % 3 === 0) for (const choice of ctx.bookmark.playableTags || []) {
    const tag = choice.tag, t = ctx.game.tags[tag]; if (!t?.alive || !t.ai || isHumanChair(ctx.game, tag) || num(t.treasury) < 250) continue;
    const s = read(t); if (s.lastAI === current) continue;
    const profile = chapterStrategyProfile(ctx.bookmark.id);
    for (const key of profile.actions) {
      if (key === 'capital' && s.capital) continue;
      if (['end_patron', 'rise', 'requisition', 'council_tax', 'religious_uniformity', 'direct_rule', 'demobilize'].includes(key)) continue;
      const args = targetOptions(ctx, tag, key).map(v => v.args);
      const chosen = args.find(v => chapterActionInfo(ctx, tag, key, v).ok);
      if (chosen) { runChapterAction(ctx, tag, key, chosen); book(t).lastAI = current; break; }
    }
  }
}
function targetOptions(ctx, tag, key) {
  const def = CHAPTER_ACTIONS[key], g = ctx.game, t = g.tags[tag];
  if (def.target === 'none') return [{ id: 'realm', name: 'The realm', args: {} }];
  if (def.target === 'estate') return definitions(ctx, tag).map(d => ({ id: d.id, name: d.name, args: { estate: d.id } }));
  if (def.target === 'patron') return patronCandidates(ctx, tag).map(v => ({ ...v, args: { partner: v.id } }));
  if (def.target === 'partner') return Object.keys(g.tags).filter(v => pledgeWilling(ctx, tag, v, t.overlord)).map(id => ({ id, name: g.tags[id].name, args: { partner: id } }));
  const provinces = def.target === 'occupation' ? g.provinces.filter(p => p && p.controller === tag && p.owner !== tag && hostile(ctx, tag, p.owner)) : controlled(ctx, tag);
  return provinces.filter(p => def.target !== 'port' || isCoastal(ctx, p.id)).map(p => ({ id: String(p.id), name: p.name, args: { province: p.id } }));
}
export function chapterStrategyView(ctx, tag = ctx.game.playerTag) {
  const profile = chapterStrategyProfile(ctx.bookmark?.id), t = ctx.game.tags[tag]; if (!profile || !t?.alive) return null;
  const s = read(t), current = now(ctx);
  const suppliers = Object.entries(ctx.game.tags).filter(([id, v]) => id !== tag && v.alive && !v.overlord && !hostile(ctx, tag, id) && opinionOf(ctx, id, tag) >= 0).map(([id, v]) => ({ id, name: v.name || id }));
  return { ...profile, phase: t.atWarWith?.length ? 'War and contested authority' : 'Consolidation and government',
    actions: profile.actions.map(key => ({ ...CHAPTER_ACTIONS[key], key, cost: effectiveCost(ctx, tag, key),
      options: targetOptions(ctx, tag, key).map(v => ({ ...v, ...chapterActionInfo(ctx, tag, key, { ...v.args, ...(key === 'order_arms' ? { partner: suppliers[0]?.id } : {}) }) })) })),
    suppliers, patron: s.patron ? { ...s.patron, name: ctx.game.tags[s.patron.tag]?.name || s.patron.tag, months: Math.max(0, s.patron.until - current) } : null,
    service: s.service, rights: s.rights, standing: s.standing, reforms: s.reforms, mobilization: s.mobilization,
    equipment: s.equipment, monthlyOut: s.monthlyOut, monthlyIn: s.monthlyIn,
    projects: s.projects.map(v => ({ ...v, name: CHAPTER_ACTIONS[v.key].name, provinceName: ctx.byId(v.province)?.name || 'National reform' })),
    sites: Object.entries(s.sites).map(([id, v]) => ({ ...v, id, name: ctx.byId(Number(id))?.name || id })),
    charters: Object.entries(s.charters).map(([id, v]) => ({ ...v, id, name: ctx.byId(Number(id))?.name || id, title: CHAPTER_ACTIONS[v.kind]?.name })),
    pledges: Object.entries(s.pledges).map(([id, v]) => ({ ...v, name: ctx.game.tags[id]?.name || id, months: Math.max(0, v.until - current) })),
    shipments: s.shipments.map(v => ({ ...v, name: ctx.byId(v.province)?.name || 'Lost port' })),
    commitments: ctx.bookmark.id === '351ce' ? enemyCommitments(ctx, tag) : [], log: s.log,
  };
}
