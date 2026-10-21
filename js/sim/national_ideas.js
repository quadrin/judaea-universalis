import { NATIONAL_IDEAS, NATIONAL_ACTIONS, nationalIdeaCost, nationalIdeaLevel, nationalIdeaSlots } from '../data/national_ideas.js';
import { num, clamp, devTotal, opinionOf, addOpinion, isHostile, sameSide, armiesOf, capitalProvince,
  isHumanChair, mechanicOn, govHas, clientForeignPolicyBar, truceActive, recognized, ceasefireHolds,
  declareWar, evaluatePeaceDeal, executePeaceDeal, clientOfferInfo, offerClientshipCore,
  spawnArmy, rollGeneral, tagGen, engageIfNeeded, changeOwnerCore, changeControllerCore, chronicle } from './military.js';
import { isCoastal, blockadedBy, navalGen } from './navy.js';
import { queueUnitRecruitment } from './recruitment.js';
import { rollCourtier } from './realm.js';
import { fireRevolt } from './unrest.js';
import { settlementInfo, settlementStart, expeditionInfo, expeditionStart, annexInfo, annexCore, habLevel } from './economy.js';

const month = d => (d.y > 0 ? d.y - 1 : d.y) * 12 + d.m - 1;
const now = ctx => month(ctx.game.date);
const fresh = () => ({ ports: {}, claimants: {}, colonies: {}, networks: {}, cities: {}, cooldowns: {}, log: [], counterspyUntil: -1 });
const read = t => ({ ...fresh(), ...(t?.nationalStrategy || {}) });
function book(t) {
  t.nationalStrategy ||= fresh();
  for (const [k, v] of Object.entries(fresh())) if (t.nationalStrategy[k] === undefined) t.nationalStrategy[k] = v;
  return t.nationalStrategy;
}
const ownProvinces = (ctx, tag) => ctx.game.provinces.filter(p => p && !p.impassable && p.owner === tag);
const own = (p, tag) => p && !p.impassable && p.owner === tag && p.controller === tag && !p.siege;
const devOf = (ctx, tag) => ownProvinces(ctx, tag).reduce((n, p) => n + devTotal(p), 0);
const foreign = (ctx, tag, other) => other && other !== tag && !['REB', 'WASTE'].includes(other)
  && ctx.game.tags[other]?.alive;
const homePort = (ctx, tag) => ownProvinces(ctx, tag).find(p => own(p, tag) && isCoastal(ctx, p.id) && !blockadedBy(ctx, p.id));
function reach(ctx, tag, other) {
  if (ctx.game.tags[tag]?.allies?.includes(other) || isHostile(ctx, tag, other)) return true;
  const ports = homePort(ctx, tag) && ownProvinces(ctx, other).some(p => isCoastal(ctx, p.id));
  return !!ports || ownProvinces(ctx, tag).some(p => [...(ctx.geom.neighbors[p.id] || [])].some(id => ctx.byId(id)?.owner === other));
}
function note(ctx, tag, text, bad = false) {
  const s = book(ctx.game.tags[tag]);
  s.log.unshift(text); s.log.length = Math.min(8, s.log.length);
  chronicle(ctx, 'politics', (ctx.game.tags[tag].name || tag) + ': ' + text);
  if (tag === ctx.game.playerTag) ctx.bus?.emit('notify', { title: 'National ideas', text, type: bad ? 'bad' : 'info' });
}
function costWhy(t, cost) {
  if (num(t.treasury) < num(cost.gold)) return `Requires ${cost.gold} talents.`;
  if (num(t.manpower) < num(cost.manpower)) return `Requires ${cost.manpower} manpower.`;
  for (const k of ['gov', 'infl', 'mar']) if (num(t.points?.[k]) < num(cost[k])) return `Requires ${cost[k]} ${k} points.`;
  return '';
}
function pay(t, cost) {
  t.treasury = num(t.treasury) - num(cost.gold); t.manpower = num(t.manpower) - num(cost.manpower);
  t.points ||= {};
  for (const k of ['gov', 'infl', 'mar']) t.points[k] = num(t.points[k]) - num(cost[k]);
}
function hereditary(ctx, tag) {
  return mechanicOn(ctx, 'clientKingdoms') && !govHas(ctx, tag, 'elects') && !govHas(ctx, tag, 'drawn') && govHas(ctx, tag, 'regency');
}
function siegeByUs(ctx, p, tag) {
  return !!p?.siege && isHostile(ctx, tag, p.owner)
    && armiesOf(ctx, tag).some(a => a.prov === p.id && !a.retreating && !a.inBattle && a.men > 0);
}
const happyForRising = (ctx, p) => num(p?.unrest) >= 2 || num(ctx.game.tags[p?.owner]?.legitimacy, 100) < 50;
function governorReady(ctx, p, tag) {
  return !!p && isHostile(ctx, tag, p.owner) && own(p, p.owner) && num(p.autonomy) >= .4
    && happyForRising(ctx, p) && p.id !== capitalProvince(ctx, p.owner)?.id && num(p.fort) <= 1 && devTotal(p) <= 15
    && ownProvinces(ctx, p.owner).length > 1
    && [...(ctx.geom.neighbors[p.id] || [])].some(id => ctx.byId(id)?.owner === tag);
}
const claimantWar = (ctx, tag, c) => (ctx.game.wars || []).find(w => w.id === c?.warId && w.attackers?.includes(tag));

export function nationalIdeasInfo(ctx, tag = ctx.game.playerTag) {
  const t = ctx.game.tags[tag]; if (!t) return null;
  const slots = nationalIdeaSlots(t, ctx.bookmark);
  const used = Object.keys(NATIONAL_IDEAS).filter(k => nationalIdeaLevel(t, k)).length;
  return { slots, used, nextSlotTech: (ctx.bookmark?.techBase || 0) + 3,
    groups: Object.entries(NATIONAL_IDEAS).map(([key, d]) => {
      const owned = nationalIdeaLevel(t, key), cost = nationalIdeaCost(owned);
      const whyNot = owned >= 3 ? 'Group complete.' : key === 'dynasty' && !mechanicOn(ctx, 'clientKingdoms')
        ? 'This age has no client crowns.' : !owned && used >= slots ? 'All national path slots are occupied.'
          : costWhy(t, { [d.point]: cost });
      return { ...d, key, owned, cost, canBuy: !whyNot, whyNot };
    }) };
}
export function buyNationalIdea(ctx, tag, key) {
  const group = nationalIdeasInfo(ctx, tag)?.groups.find(v => v.key === key);
  if (!group?.canBuy) return { ok: false, why: group?.whyNot || 'Unknown idea group.' };
  const t = ctx.game.tags[tag]; pay(t, { [group.point]: group.cost });
  t.nationalIdeas ||= {}; t.nationalIdeas[key] = group.owned + 1;
  book(t); note(ctx, tag, group.tiers[group.owned].name + ' adopted.');
  return { ok: true };
}

export function nationalActionInfo(ctx, tag, key, args = {}) {
  const d = NATIONAL_ACTIONS[key], t = ctx.game.tags[tag];
  if (!d || !t?.alive) return { ok: false, why: 'Unavailable action.', cost: {} };
  if (['expedition', 'settle', 'annex_frontier'].includes(key)) {
    const probe = (key === 'expedition' ? expeditionInfo : key === 'settle' ? settlementInfo : annexInfo)(ctx, tag, Number(args.province));
    const cost = key === 'expedition' ? { gold: probe.cost, manpower: probe.men }
      : { [key === 'settle' ? 'infl' : 'gov']: probe.cost };
    const why = nationalIdeaLevel(t, 'colonies') < 1 ? 'Requires Veterans on the Land.'
      : probe.can ? '' : probe.why || 'Choose an eligible frontier province.';
    return { ok: !why, why, cost };
  }
  const s = read(t), p = ctx.byId(Number(args.province)), target = String(args.target || p?.owner || '');
  const other = ctx.game.tags[target], port = s.ports[p?.id], colony = s.colonies[p?.id], city = s.cities[p?.id], network = s.networks[p?.id], c = s.claimants[target];
  const cost = key === 'protect_heir' ? { infl: clientOfferInfo(ctx, tag, target)?.cost || 100 } : { ...d.cost };
  let why = nationalIdeaLevel(t, d.group) < d.tier ? `Requires ${NATIONAL_IDEAS[d.group].tiers[d.tier - 1].name}.` : costWhy(t, cost);
  const fail = text => { if (!why) why = text; };
  const foreignAct = ['foreign_port', 'rival_port', 'crown', 'claimant', 'foreign_province', 'network', 'warehouse'].includes(d.target);
  if (foreignAct && !['dismiss_claimant', 'recall_contact', 'close_warehouse'].includes(key) && clientForeignPolicyBar(ctx, tag)) fail('A client court needs an independent foreign policy to undertake this action.');
  if (foreignAct && !['dismiss_claimant', 'recall_contact', 'close_warehouse'].includes(key) && !foreign(ctx, tag, target)) fail('Choose a foreign court.');
  if (foreignAct && isHumanChair(ctx.game, target)) {
    if (!['contact', 'rising', 'gates', 'governor', 'recall_contact', 'close_warehouse', 'dismiss_claimant'].includes(key)) fail('This agreement requires an AI-controlled court.');
    else if (['contact', 'rising', 'gates', 'governor'].includes(key) && !isHostile(ctx, tag, target)) fail('Networks against human courts require an active war.');
  }
  if (['own_province', 'colony', 'city'].includes(d.target) && !own(p, tag)) fail('Choose an owned, controlled province without a siege.');
  if (['foreign_port', 'foreign_province', 'rival_port', 'crown'].includes(d.target)) {
    if (!foreign(ctx, tag, target) || !reach(ctx, tag, target)) fail('Choose a reachable foreign court.');
    if (p && (!own(p, target))) fail('The host must control this province without a siege.');
  }
  if (['foreign_port', 'rival_port', 'warehouse'].includes(d.target) && key !== 'close_warehouse') {
    if (!p || !isCoastal(ctx, p.id) || !homePort(ctx, tag)) fail('An open home port and a foreign coastal province are required.');
    if (!foreign(ctx, tag, p?.owner) || isHostile(ctx, tag, p?.owner) || !own(p, p?.owner) || blockadedBy(ctx, p?.id)) fail('The foreign port must be friendly, controlled by its host and free of blockade.');
  }
  if (d.target === 'warehouse' && (!port || port.host !== p?.owner)) fail('Choose one of your existing foreign warehouses.');
  if (d.target === 'claimant' && !c) fail('Shelter a claimant to this court first.');
  if (d.target === 'colony' && (!colony || colony.left > 0)) fail('Choose a completed military colony.');
  if (d.target === 'city' && !city) fail('Choose a chartered city.');
  if (d.target === 'network' && (!network || network.host !== p?.owner || !foreign(ctx, tag, p?.owner))) fail('Choose a live network in a foreign province.');
  const cd = `${key}:${p?.id || target}`;
  if (num(s.cooldowns[cd], -1) > now(ctx)) fail(`Available again in ${s.cooldowns[cd] - now(ctx)} months.`);
  if (key === 'warehouse' || key === 'contest_port') {
    if (Object.keys(s.ports).length >= 4 || port) fail('At most four warehouses; this port cannot already have yours.');
    if (opinionOf(ctx, target, tag) < (key === 'warehouse' ? 0 : 60)) fail(`Requires ${key === 'warehouse' ? 0 : 60} host opinion.`);
  }
  if (key === 'harbor' && (port?.level >= 2 || opinionOf(ctx, target, tag) < 25)) fail('Requires an unupgraded warehouse and 25 host opinion.');
  if (key === 'league') {
    if (port?.level < 2 || port?.league) fail('Requires a harbor concession outside your league.');
    if (other?.overlord || devOf(ctx, target) > devOf(ctx, tag) || opinionOf(ctx, target, tag) < 60) fail('An independent court no larger than yours and 60 host opinion are required.');
    if (Object.values(s.ports).some(v => v.host === target && v.league)) fail('This court already belongs to your league.');
  }
  if (key === 'league_ships' && (!port?.league || port.loyalty < 60 || port.shipProject || num(other?.treasury) < 60 || num(other?.manpower) < 500)) fail('Requires a loyal league member with 60 talents and 500 manpower, and no fleet already fitting out.');
  if (key === 'contest_port') {
    const rival = Object.entries(ctx.game.tags).find(([r, v]) => r !== tag && read(v).ports[p?.id]?.league);
    if (!rival || read(rival[1]).ports[p?.id].loyalty >= 50 || opinionOf(ctx, target, tag) < opinionOf(ctx, target, rival[0]) + 30) fail('A rival league must have less than 50 loyalty here, and the host must prefer you by 30 opinion.');
  }
  if (key === 'claimant') {
    if (!hereditary(ctx, target) || other?.overlord || !other?.ruler || !capitalProvince(ctx, target)) fail('Choose an independent hereditary court in an age with client crowns.');
    if (c || Object.keys(s.claimants).length >= 2) fail('At most two claimants, one per court.');
  }
  if (key === 'compact') {
    if (!hereditary(ctx, target) || other?.overlord || other?.heir || c?.installed || c?.compact || isHostile(ctx, tag, target)) fail('Requires a peaceful independent heirless crown and an uncrowned claimant.');
    if (opinionOf(ctx, target, tag) < 100 || devOf(ctx, target) >= devOf(ctx, tag) || !t.allies?.includes(target)) fail('Requires an existing alliance, 100 opinion and a smaller target realm.');
  }
  if (key === 'press_claim') {
    if (!hereditary(ctx, target) || c?.installed || other?.overlord || t.overlord || c?.warId || isHostile(ctx, tag, target)) fail('Requires an uncrowned claimant and independent courts at peace with each other.');
    if (truceActive(ctx, tag, target) || recognized(ctx, tag, target) || t.allies?.includes(target) || ceasefireHolds(ctx)) fail('An alliance, recognition, truce or ceasefire prevents this war.');
  }
  if (key === 'install_claimant') {
    const w = claimantWar(ctx, tag, c);
    if (!w || c?.installed) fail('The claimant must have an active succession war.');
    else {
      const peace = evaluatePeaceDeal(ctx, w, tag, { enemy: target, subjugate: true });
      if (!peace.acceptable || !peace.subjugate) fail(peace.reason || 'The target will not accept a client settlement.');
    }
  }
  if (key === 'protect_heir') {
    const offer = clientOfferInfo(ctx, tag, target);
    if (!c?.accession || !offer?.can || !offer.willAccept) fail(offer?.why || 'Requires peaceful accession and acceptance of a normal clientship offer.');
  }
  if (key === 'colony' || key === 'charter') {
    if (p?.id === capitalProvince(ctx, tag)?.id || colony || city || t.chapterStrategy?.charters?.[p?.id]) fail('Choose a non-capital province without an existing charter or military settlement.');
    if (key === 'colony' && Object.keys(s.colonies).length >= 4) fail('At most four military colonies.');
    if (key === 'charter' && Object.keys(s.cities).length >= 5) fail('At most five chartered cities.');
    if (key === 'colony' && (p?.habitation === 'uninhabited' || p?.settlement)) fail('Develop the settlement before stationing veterans.');
  }
  if (key === 'colony_muster' && colony?.reserves < 1000) fail('Requires 1,000 local recruits.');
  if (key === 'district' && colony?.district && colony.commander) fail('This district already has a commander.');
  if (key === 'district_army' && (!colony?.district || !colony.commander || colony.reserves < 2000 || colony.loyalty < 60)) fail('Requires a district commander, 60 loyalty and 2,000 stored recruits.');
  if (key === 'integrate_district' && (!colony?.district || colony.loyalty < 70)) fail('Requires a district with 70 loyalty.');
  if (key === 'contact') {
    if (network || Object.keys(s.networks).length >= 3) fail('At most three networks, one per province.');
  }
  if (key === 'rising' || key === 'gates' || key === 'governor') {
    const strength = key === 'rising' ? 40 : key === 'gates' ? 70 : 80;
    if (network?.op || num(network?.strength) < strength) fail(`Requires ${strength} network strength and no operation underway.`);
    if (key === 'rising' && (!own(p, target) || !happyForRising(ctx, p) || num(p?.revoltCooldownMonths) > 0)) fail('The host must control this province, with 2 unrest or less than 50 legitimacy, and no recent rising.');
    if (key === 'gates' && !siegeByUs(ctx, p, tag)) fail('Your army must be actively besieging this enemy province.');
    if (key === 'governor' && !governorReady(ctx, p, tag)) fail('Requires a disaffected enemy frontier province: not a capital, 40% autonomy, at most 15 development and fort level one, with another province remaining in its realm.');
  }
  if (key === 'counterspy' && s.counterspyUntil > now(ctx)) fail('Counterintelligence is already active.');
  if (key === 'charter') {
    if (!['fiscal', 'levy', 'naval'].includes(args.service)) fail('Choose fiscal, levy or naval service.');
    if (args.service === 'naval' && !isCoastal(ctx, p?.id)) fail('A naval charter needs a coastal city.');
  }
  if (key === 'city_service') {
    if (city?.loyalty < 60 || city?.integrating) fail('The city needs 60 loyalty and must not be negotiating integration.');
    if (city?.service === 'fiscal' && city.funds < 20) fail('The city needs 20 saved talents.');
    if (city?.service === 'levy' && city.reserves < 1000) fail('The city needs 1,000 stored recruits.');
    if (city?.service === 'naval' && (city.funds < 60 || city.reserves < 500 || !p?.buildings?.includes('shipyard'))) fail('Naval service needs a shipyard, 60 saved talents and 500 recruits.');
  }
  if (key === 'council_muster') {
    const contributors = Object.entries(s.cities).filter(([id, v]) => own(ctx.byId(Number(id)), tag) && v.loyalty >= 60 && !v.integrating);
    if (contributors.length < 2 || contributors.reduce((n, [, v]) => n + v.reserves, 0) < 1000 || city?.loyalty < 60) fail('At least two loyal cities and 1,000 pooled recruits are required.');
  }
  if (key === 'centralize_city' && (Object.keys(s.cities).length < 2 || city?.integrating || city?.loyalty < 70)) fail('Requires at least two chartered cities, 70 loyalty and no integration underway here.');
  if (key === 'renew_charter' && !city?.integrating) fail('This city is not negotiating integration.');
  return { ok: !why, why, cost };
}

function provinceModifier(p, id, tag, effects) {
  p.modifiers ||= [];
  p.modifiers = p.modifiers.filter(m => m.id !== id);
  p.modifiers.push({ id, name: id === 'national_city' ? 'City charter' : 'Military settlement', months: -1, chapterOwner: tag, effects });
}
function clearModifier(p, id, tag) { if (p) p.modifiers = (p.modifiers || []).filter(m => m.id !== id || m.chapterOwner !== tag); }
function queueLocal(ctx, tag, p, type) {
  return queueUnitRecruitment(ctx, tag, p.id, type, { cost: 0, gen: type === 'ship' ? navalGen(ctx, tag) : tagGen(ctx, tag) });
}
// One-time upgrade of the old, parallel institutions. Existing investment is
// retained without charging again, duplicating monthly income, or rerolling RNG.
export function consolidateNationalPaths(ctx) {
  if (ctx.game.flags.nationalPathsConsolidated) return;
  const grant = (t, key, tier) => {
    t.nationalIdeas ||= {};
    t.nationalIdeas[key] = Math.max(nationalIdeaLevel(t, key), tier);
  };
  for (const [tag, t] of Object.entries(ctx.game.tags)) {
    for (const [id, v] of Object.entries(t.chapterStrategy?.charters || {})) {
      if (!['levy_charter', 'tax_charter', 'municipal_charter', 'regional_command'].includes(v.kind)) continue;
      const p = ctx.byId(Number(id));
      if (p?.owner === tag) {
        const s = book(t);
        if (s.cities[id]) grant(t, 'federation', 1);
        else if (s.colonies[id]) grant(t, 'colonies', s.colonies[id].district ? 2 : 1);
        else if (v.kind === 'regional_command') {
          grant(t, 'colonies', 2);
          s.colonies[id] = { left: 0, total: 6, reserves: 0, loyalty: num(v.loyalty, 70), district: true,
            commander: { name: 'Commander of ' + p.name, fire: 1, shock: 2, maneuver: 1 } };
          p.autonomy = Math.max(.4, num(p.autonomy));
        } else {
          grant(t, 'federation', 1);
          s.cities[id] = { service: v.kind === 'levy_charter' ? 'levy' : 'fiscal', funds: 0, reserves: 0,
            loyalty: num(v.loyalty, 70), integrating: 0 };
          p.autonomy = Math.max(.45, num(p.autonomy));
          provinceModifier(p, 'national_city', tag, { prodMult: .8 });
        }
      }
      if (p) p.modifiers = (p.modifiers || []).filter(m => m.id !== 'chapter_charter' || m.chapterOwner && m.chapterOwner !== tag);
      delete t.chapterStrategy.charters[id];
    }
  }
  for (const p of ctx.game.provinces) {
    const by = p?.settlement?.by || p?.expedition?.by;
    if (ctx.game.tags[by]) grant(ctx.game.tags[by], 'colonies', 1);
  }
  // Grandfather existing investments even if their combination exceeds today's
  // slot allowance. No path is erased and no new path bypasses the usual limit.
  for (const t of Object.values(ctx.game.tags)) {
    const used = Object.keys(NATIONAL_IDEAS).filter(k => nationalIdeaLevel(t, k)).length;
    if (used > nationalIdeaSlots(t, ctx.bookmark)) t.nationalPathLegacySlots = used;
  }
  ctx.game.flags.nationalPathsConsolidated = true;
}
function installed(ctx, tag, target, c) {
  const o = ctx.game.tags[target];
  o.ruler = { ...c.candidate, title: o.ruler?.title || 'Ruler' }; o.heir = null; o.regency = false;
  o.legitimacy = Math.max(45, num(o.legitimacy)); c.installed = true; c.loyalty = 80;
  c.oldRuler = o.ruler.name; c.compact = false;
  addOpinion(ctx, target, tag, 60);
  note(ctx, tag, `${c.candidate.name} takes the throne of ${o.name || target} under our protection.`);
}
export function runNationalAction(ctx, tag, key, args = {}) {
  const check = nationalActionInfo(ctx, tag, key, args); if (!check.ok) return check;
  if (['expedition', 'settle', 'annex_frontier'].includes(key)) {
    const result = (key === 'expedition' ? expeditionStart : key === 'settle' ? settlementStart : annexCore)(ctx, tag, Number(args.province));
    if (result.ok) note(ctx, tag, NATIONAL_ACTIONS[key].name + ': ' + ctx.byId(Number(args.province)).name + '.');
    return result;
  }
  const t = ctx.game.tags[tag], s = book(t), p = ctx.byId(Number(args.province));
  const target = String(args.target || p?.owner || ''), o = ctx.game.tags[target], c = s.claimants[target];
  const cd = `${key}:${p?.id || target}`, time = now(ctx);
  if (key === 'press_claim') {
    const w = declareWar(ctx, tag, target, `The claim of ${c.candidate.name}`, 'succession');
    if (!w) return { ok: false, why: 'The succession war could not be declared.' };
    pay(t, check.cost); c.warId = w.id; c.compact = false;
    if (o.heir?.nationalSponsor === tag) o.heir = null;
  } else if (key === 'install_claimant') {
    const w = claimantWar(ctx, tag, c); executePeaceDeal(ctx, w, tag, { enemy: target, subjugate: true });
    if (o.overlord !== tag) return { ok: false, why: 'The client settlement did not take effect.' };
    installed(ctx, tag, target, c);
  } else if (key === 'protect_heir') {
    const result = offerClientshipCore(ctx, tag, target);
    if (!result.ok || !result.accepted) return { ok: false, why: result.why || 'Protection was refused.' };
    c.installed = true; c.loyalty = 80;
  } else {
    pay(t, check.cost);
    if (key === 'warehouse') s.ports[p.id] = { host: target, level: 1, loyalty: 70, league: false, active: true };
    if (key === 'harbor') s.ports[p.id].level = 2;
    if (key === 'league') { s.ports[p.id].league = true; s.ports[p.id].loyalty = 80; }
    if (key === 'league_ships') {
      o.treasury -= 60; o.manpower -= 500;
      s.ports[p.id].shipProject = 6; s.ports[p.id].loyalty -= 10; s.cooldowns[cd] = time + 24;
    }
    if (key === 'contest_port') {
      for (const [r, v] of Object.entries(ctx.game.tags)) if (r !== tag && v.nationalStrategy?.ports?.[p.id]?.league) {
        delete v.nationalStrategy.ports[p.id]; note(ctx, r, `Our concession at ${p.name} has passed to a rival league.`, true);
      }
      s.ports[p.id] = { host: target, level: 2, loyalty: 70, league: true, active: true };
    }
    if (key === 'close_warehouse') delete s.ports[p.id];
    if (key === 'claimant') {
      const candidate = rollCourtier(ctx, target);
      if ([o.ruler.name, o.heir?.name].includes(candidate.name)) candidate.name += ' the Claimant';
      s.claimants[target] = { candidate, oldRuler: o.ruler.name, compact: false, installed: false, loyalty: 70 };
    }
    if (key === 'compact') {
      c.compact = true; c.until = time + 120; c.oldRuler = o.ruler.name;
      o.heir = { ...c.candidate, nationalSponsor: tag }; addOpinion(ctx, target, tag, 10);
    }
    if (key === 'dismiss_claimant') {
      if (o?.heir?.nationalSponsor === tag) o.heir = null;
      delete s.claimants[target];
    }
    if (key === 'colony') {
      s.colonies[p.id] = { left: 6, total: 6, reserves: 0, loyalty: 80, district: false, commander: null };
      p.autonomy = Math.max(.4, num(p.autonomy));
    }
    if (key === 'colony_muster') {
      queueLocal(ctx, tag, p, 'inf'); s.colonies[p.id].reserves -= 1000;
    }
    if (key === 'district') {
      const v = s.colonies[p.id]; v.district = true; v.commander = rollGeneral(ctx, tag); v.loyalty -= 10;
    }
    if (key === 'district_army') {
      const v = s.colonies[p.id];
      spawnArmy(ctx, tag, p.name, { inf: 2, name: 'District host of ' + p.name, general: v.commander });
      v.commander = null; v.reserves -= 2000; v.loyalty -= 10; s.cooldowns[cd] = time + 24;
    }
    if (key === 'integrate_district') {
      t.manpower += s.colonies[p.id].reserves; delete s.colonies[p.id]; p.autonomy = .15;
    }
    if (key === 'support_colony') { s.colonies[p.id].loyalty = Math.min(100, s.colonies[p.id].loyalty + 20); s.cooldowns[cd] = time + 6; }
    if (key === 'contact') s.networks[p.id] = { host: target, strength: 0, exposure: 0, op: null };
    if (key === 'rising' || key === 'gates' || key === 'governor') {
      s.networks[p.id].op = { kind: key, left: key === 'gates' ? 3 : 6, total: key === 'gates' ? 3 : 6 };
    }
    if (key === 'counterspy') s.counterspyUntil = time + 12;
    if (key === 'recall_contact') delete s.networks[p.id];
    if (key === 'charter') {
      s.cities[p.id] = { service: args.service, funds: 0, reserves: 0, loyalty: 80, integrating: 0 };
      p.autonomy = Math.max(.45, num(p.autonomy));
      provinceModifier(p, 'national_city', tag, { prodMult: .8 });
    }
    if (key === 'city_service') {
      const v = s.cities[p.id];
      if (v.service === 'fiscal') { const gold = Math.min(40, v.funds); v.funds -= gold; t.treasury += gold; }
      else if (v.service === 'levy') { v.reserves -= 1000; queueLocal(ctx, tag, p, 'inf'); }
      else { v.funds -= 60; v.reserves -= 500; queueLocal(ctx, tag, p, 'ship'); }
      v.loyalty -= 5;
    }
    if (key === 'council_muster') {
      const contributors = Object.entries(s.cities).filter(([id, v]) => own(ctx.byId(Number(id)), tag) && v.loyalty >= 60 && !v.integrating);
      let need = Math.min(4000, Math.floor(contributors.reduce((n, [, v]) => n + v.reserves, 0) / 1000) * 1000), raised = need;
      for (const [, v] of contributors) { const use = Math.min(need, v.reserves); need -= use; v.reserves -= use; if (use) v.loyalty -= 5; }
      spawnArmy(ctx, tag, p.name, { inf: raised / 1000, name: 'Federal host of ' + p.name });
      s.cooldowns[cd] = time + 12;
    }
    if (key === 'centralize_city') { s.cities[p.id].integrating = 12; s.cities[p.id].loyalty -= 25; }
    if (key === 'renew_charter') { s.cities[p.id].integrating = 0; s.cities[p.id].loyalty = Math.min(100, s.cities[p.id].loyalty + 20); }
    if (key === 'support_city') { s.cities[p.id].loyalty = Math.min(100, s.cities[p.id].loyalty + 20); s.cooldowns[cd] = time + 6; }
  }
  ctx.game.tradeRev = num(ctx.game.tradeRev) + 1;
  note(ctx, tag, NATIONAL_ACTIONS[key].name + (p ? ': ' + p.name : target ? ': ' + (o?.name || target) : '') + '.');
  return { ok: true };
}

function endCompact(ctx, tag, target, c) {
  const o = ctx.game.tags[target];
  if (o?.heir?.nationalSponsor === tag) o.heir = null;
  c.compact = false;
}
function mutiny(ctx, tag, p, commander, label) {
  const id = spawnArmy(ctx, 'REB', p.name, { inf: 2, name: label + ' of ' + p.name, general: commander || null });
  if (ctx.game.armies[id]) engageIfNeeded(ctx, ctx.game.armies[id]);
  p.unrest = num(p.unrest) + 3;
  note(ctx, tag, `${p.name} has risen against us after local loyalty collapsed.`, true);
}

// Plain records live on tags and survive ordinary saves and formed nations.
// A per-month stamp makes refreshes and repeated monthly calls idempotent.
export function monthlyNationalIdeas(ctx) {
  const time = now(ctx), g = ctx.game;
  for (const [tag, t] of Object.entries(g.tags)) {
    if (!t?.alive || !t.nationalStrategy) continue;
    const s = book(t); if (s.lastMonth === time) continue; s.lastMonth = time;
    s.monthlyOut = 0;
    for (const [id, v] of Object.entries(s.ports)) {
      const p = ctx.byId(Number(id)), host = g.tags[v.host];
      if (!p || p.owner !== v.host || !host?.alive || isHostile(ctx, tag, v.host) || opinionOf(ctx, v.host, tag) < -25) {
        delete s.ports[id]; note(ctx, tag, `Our concession at ${p?.name || id} has been revoked.`, true); continue;
      }
      const fee = v.level >= 2 ? 3 : 2, paid = num(t.treasury) >= fee;
      const blocked = !own(p, v.host) || !!blockadedBy(ctx, p.id);
      if (paid) {
        t.treasury -= fee; host.treasury = num(host.treasury) + fee; s.monthlyOut += fee;
        host.opinion ||= {}; if (num(host.opinion[tag]) < 70) host.opinion[tag] = Math.min(70, num(host.opinion[tag]) + .5);
      }
      v.active = paid && !blocked;
      v.loyalty = clamp(v.loyalty + (!paid ? -8 : blocked ? -5 : opinionOf(ctx, v.host, tag) < 20 ? -2 : 1), 0, 100);
      if (v.league && v.loyalty < 20) { v.league = false; note(ctx, tag, `${host.name || v.host} withdraws from our maritime league.`, true); }
      if (v.shipProject && v.active && v.league) {
        v.shipProject--;
        if (!v.shipProject) { ctx.helpers.spawnFleet(ctx, tag, p.name, 2, { name: 'League squadron of ' + p.name }); note(ctx, tag, 'The league squadron at ' + p.name + ' is ready.'); }
      }
    }
    for (const [target, c] of Object.entries(s.claimants)) {
      const o = g.tags[target];
      if (!o?.alive || isHumanChair(g, target)) { endCompact(ctx, tag, target, c); delete s.claimants[target]; continue; }
      if (c.compact && o.ruler?.name === c.candidate.name) {
        c.compact = false; c.accession = true; addOpinion(ctx, target, tag, 60);
        note(ctx, tag, `${c.candidate.name} has inherited ${o.name || target}. A protection offer can now be negotiated.`);
      }
      if (c.compact && (time >= c.until || isHostile(ctx, tag, target) || opinionOf(ctx, target, tag) < 0 || o.overlord || o.heir?.nationalSponsor !== tag)) {
        endCompact(ctx, tag, target, c); note(ctx, tag, `The succession compact with ${o.name || target} has lapsed.`, true);
      }
      if (c.warId && !claimantWar(ctx, tag, c)) {
        if (o.overlord === tag && !c.installed) installed(ctx, tag, target, c);
        c.warId = null;
      }
      if (c.installed && (o.overlord !== tag || o.ruler?.name !== c.candidate.name)) { delete s.claimants[target]; continue; }
      if (!c.installed && !c.accession) {
        if (num(t.treasury) >= 2) { t.treasury -= 2; s.monthlyOut += 2; c.arrears = 0; }
        else if ((c.arrears = num(c.arrears) + 1) >= 3) { endCompact(ctx, tag, target, c); delete s.claimants[target]; note(ctx, tag, 'An unpaid claimant has left our court.', true); }
      }
      if (c.installed) {
        const strong = devOf(ctx, target) > devOf(ctx, tag) * .5;
        c.loyalty = clamp(c.loyalty + (strong || opinionOf(ctx, target, tag) < 0 ? -2 : 1), 0, 100);
        if (c.loyalty < 30) addOpinion(ctx, target, tag, -5); // existing client loyalty/independence systems respond
      }
    }
    for (const [id, v] of Object.entries(s.colonies)) {
      const p = ctx.byId(Number(id));
      if (!p || p.owner !== tag) { delete s.colonies[id]; continue; }
      p.autonomy = Math.max(.4, num(p.autonomy));
      if (!own(p, tag)) continue;
      if (v.left > 0) { if (--v.left === 0) note(ctx, tag, 'The military colony at ' + p.name + ' is ready.'); continue; }
      let paid = true;
      if (v.district) { paid = num(t.treasury) >= 2; if (paid) { t.treasury -= 2; s.monthlyOut += 2; } }
      v.loyalty = clamp(v.loyalty + (!paid ? -8 : num(p.unrest) >= 4 || num(t.warExhaustion) > 8 ? -2 : .5), 0, 100);
      if (paid) v.reserves = Math.min(v.district ? 4000 : 2000, v.reserves + (v.district ? 200 : 100));
      if (v.loyalty <= 20) { mutiny(ctx, tag, p, v.commander, 'Military mutiny'); delete s.colonies[id]; }
    }
    for (const [id, v] of Object.entries(s.networks)) {
      const p = ctx.byId(Number(id)), host = g.tags[v.host];
      if (!p || p.owner !== v.host || !foreign(ctx, tag, v.host) || (isHumanChair(g, v.host) && !isHostile(ctx, tag, v.host))) { delete s.networks[id]; continue; }
      const guarded = read(host).counterspyUntil > time, paid = num(t.treasury) >= 2;
      if (paid) { t.treasury -= 2; s.monthlyOut += 2; }
      v.strength = clamp(v.strength + (paid ? guarded ? 1 : num(host.stability) >= 2 ? 3 : 5 : -10), 0, 100);
      v.exposure = clamp(v.exposure + (!paid ? 10 : guarded ? 12 : v.op ? 8 : -3), 0, 100);
      if (isHumanChair(g, v.host) && v.strength >= 20 && !v.warned) {
        v.warned = true; note(ctx, v.host, `Foreign agents are recruiting at ${p.name}. Counterintelligence can expose the network.`, true);
      }
      // AI counterplay is funded and reacts to an exposed network; it never
      // invents an invisible operation against a human court.
      if (v.exposure >= 60 && !isHumanChair(g, v.host) && num(host.treasury) >= 30) { host.treasury -= 30; v.exposure = Math.min(100, v.exposure + 25); }
      if (v.exposure >= 100) {
        addOpinion(ctx, v.host, tag, -40); t.aggression = num(t.aggression) + 3; delete s.networks[id];
        note(ctx, tag, `The government at ${p.name} has uncovered and purged our network.`, true); continue;
      }
      const op = v.op;
      if (!op || !paid) continue;
      if (op.kind === 'gates' && !siegeByUs(ctx, p, tag)) { v.op = null; note(ctx, tag, 'The operation at ' + p.name + ' was abandoned when the siege ended.', true); continue; }
      if (op.kind === 'governor' && !governorReady(ctx, p, tag)) { v.op = null; note(ctx, tag, 'The governor at ' + p.name + ' has ended negotiations as conditions changed.', true); continue; }
      if (--op.left > 0) continue;
      if (op.kind === 'rising' && own(p, v.host) && happyForRising(ctx, p) && !num(p.revoltCooldownMonths)) {
        fireRevolt(ctx, p); note(ctx, tag, 'Our supporters have raised a rebellion at ' + p.name + '.');
      } else if (op.kind === 'gates' && siegeByUs(ctx, p, tag)) {
        p.garrison = Math.max(0, Math.floor(num(p.garrison) * .25)); p.siege.progress = Math.min(99, num(p.siege.progress) + 25);
        note(ctx, tag, 'Collaborators have opened the defenses of ' + p.name + '.');
      } else if (op.kind === 'governor' && governorReady(ctx, p, tag)) {
        const host = p.owner;
        t.aggression = num(t.aggression) + devTotal(p); addOpinion(ctx, host, tag, -50);
        changeOwnerCore(ctx, p, tag); changeControllerCore(ctx, p, tag); p.autonomy = .55; p.garrison = 0; p.siege = null;
        note(ctx, tag, 'The governor at ' + p.name + ' has brought the province into our realm.');
      } else note(ctx, tag, 'The conditions for a rising at ' + p.name + ' have passed; the operation ends.', true);
      v.strength = Math.max(0, v.strength - (op.kind === 'rising' ? 40 : op.kind === 'gates' ? 70 : 80)); v.exposure = Math.min(100, v.exposure + 15); v.op = null;
    }
    for (const [id, v] of Object.entries(s.cities)) {
      const p = ctx.byId(Number(id));
      if (!p || p.owner !== tag) { clearModifier(p, 'national_city', tag); delete s.cities[id]; continue; }
      p.autonomy = Math.max(.45, num(p.autonomy));
      if (!own(p, tag)) continue;
      v.funds = Math.min(120, v.funds + Math.max(1, num(p.dev?.prod) * (v.service === 'fiscal' ? 1 : .5)));
      v.reserves = Math.min(3000, v.reserves + (v.service === 'levy' ? 150 : 75));
      v.loyalty = clamp(v.loyalty + (v.integrating ? -2 : .5) - (num(p.unrest) >= 3 || num(t.warExhaustion) > 6 ? 2 : 0), 0, 100);
      if (v.loyalty <= 20) { clearModifier(p, 'national_city', tag); mutiny(ctx, tag, p, null, 'City revolt'); delete s.cities[id]; continue; }
      if (v.integrating && --v.integrating === 0) {
        p.autonomy = .1; clearModifier(p, 'national_city', tag); t.treasury += v.funds; t.manpower += v.reserves;
        delete s.cities[id]; note(ctx, tag, p.name + ' has accepted a common administration.');
      }
    }
  }
  aiNationalIdeas(ctx, time);
  g.tradeRev = num(g.tradeRev) + 1;
}

function aiNationalIdeas(ctx, time) {
  let index = 0;
  for (const [tag, t] of Object.entries(ctx.game.tags)) {
    const turn = index++;
    if (!t?.alive || !t.ai || isHumanChair(ctx.game, tag) || tag === 'REB' || num(t.treasury) < 400
        || ((time + turn) % 12 + 12) % 12 !== 0 || t.nationalStrategy?.aiMonth === time) continue;
    const priorities = [...(homePort(ctx, tag) && !t.overlord ? ['maritime'] : []),
      ...(t.atWarWith?.length ? ['colonies'] : ['federation']), 'colonies'];
    const info = nationalIdeasInfo(ctx, tag);
    const next = priorities.map(k => info.groups.find(v => v.key === k)).find(v => v?.canBuy);
    if (next && (next.owned === 0 || time % 24 === 0)) {
      if (buyNationalIdea(ctx, tag, next.key).ok) book(t).aiMonth = time;
      continue;
    }
    // Public development and port agreements use the same prices and refusal
    // rules as the player. AI intrigue remains reactive counterintelligence.
    let done = false;
    for (const key of ['league', 'harbor', 'warehouse', 'district', 'colony', 'charter']) {
      if (nationalIdeaLevel(t, NATIONAL_ACTIONS[key].group) < NATIONAL_ACTIONS[key].tier) continue;
      for (const option of optionsFor(ctx, tag, NATIONAL_ACTIONS[key])) {
        const args = { ...option.args, service: 'levy' };
        if (nationalActionInfo(ctx, tag, key, args).ok && runNationalAction(ctx, tag, key, args).ok) { done = true; break; }
      }
      if (done) break;
    }
    if (!done && next) buyNationalIdea(ctx, tag, next.key);
    book(t).aiMonth = time;
  }
}

function optionsFor(ctx, tag, d) {
  const s = read(ctx.game.tags[tag]), g = ctx.game;
  if (['frontier', 'settlement', 'expedition_camp'].includes(d.target)) {
    return g.provinces.filter(p => p && p.settleable !== false && (d.target === 'frontier'
      ? p.owner === 'WASTE' && p.impassable && !p.expedition && [...(ctx.geom.neighbors[p.id] || [])].some(id => ctx.byId(id)?.controller === tag)
      : d.target === 'expedition_camp' ? p.owner === 'WASTE' && p.expedition?.by === tag
        : (p.owner === tag && !p.impassable || p.owner === 'WASTE' && p.expedition?.by === tag)
          && habLevel(ctx, p) < (ctx.DEFINES.SETTLEMENT?.maxTier ?? 3)))
      .map(p => ({ id: String(p.id), name: p.name, args: { province: p.id } }));
  }
  if (d.target === 'none') return [{ id: '', name: 'Realm', args: {} }];
  if (d.target === 'crown' || d.target === 'claimant') return Object.entries(g.tags)
    .filter(([k]) => d.target === 'claimant' ? !!s.claimants[k] : foreign(ctx, tag, k) && hereditary(ctx, k) && !g.tags[k].overlord && reach(ctx, tag, k))
    .map(([id, t]) => ({ id, name: t.name || id, args: { target: id } }));
  const keys = { warehouse: 'ports', colony: 'colonies', network: 'networks', city: 'cities' };
  const list = keys[d.target] ? Object.keys(s[keys[d.target]]).map(id => ctx.byId(Number(id))).filter(Boolean)
    : g.provinces.filter(p => p && !p.impassable && (d.target === 'own_province' ? p.owner === tag
      : foreign(ctx, tag, p.owner) && (d.target === 'foreign_province' || isCoastal(ctx, p.id)) && reach(ctx, tag, p.owner)));
  return list.map(p => ({ id: String(p.id), name: p.name + (p.owner !== tag ? ' · ' + (g.tags[p.owner]?.name || p.owner) : ''), args: { province: p.id } }));
}
export function nationalStrategyView(ctx, tag = ctx.game.playerTag) {
  const t = ctx.game.tags[tag]; if (!t) return null;
  const s = read(t), info = nationalIdeasInfo(ctx, tag);
  const actions = Object.entries(NATIONAL_ACTIONS).filter(([, d]) => nationalIdeaLevel(t, d.group) >= d.tier).map(([key, d]) => ({
    ...d, key, options: optionsFor(ctx, tag, d).map(v => ({ ...v, ...nationalActionInfo(ctx, tag, key, { ...v.args, service: 'fiscal' }) })),
  }));
  const records = [];
  const add = (group, id, name, icon, stats, tip, progress) => records.push({ group, id, name, icon, stats, tip, progress });
  for (const p of ctx.game.provinces) if (p?.settlement?.by === tag || p?.expedition?.by === tag) {
    const left = p.settlement?.by === tag ? Math.max(0, p.settlement.monthsLeft) : null;
    const total = Math.max(left || 0, ctx.DEFINES.SETTLEMENT?.months || 6);
    add('colonies', 'frontier:' + p.id, p.name, left !== null ? 'bricks' : 'flag',
      left !== null ? [['hourglass', left + 'm']] : [['spears', p.expedition.men]],
      left !== null ? 'Settlement development underway. Loss of control cancels construction.' : 'Frontier camp. Develop a settlement, then annex it.',
      left !== null ? { done: total - left, total } : null);
  }
  for (const [id, v] of Object.entries(s.ports)) add('maritime', id, ctx.byId(Number(id))?.name || id, v.league ? 'ship' : v.level >= 2 ? 'anchor' : 'amphora',
    [['laurel', Math.floor(v.loyalty) + '%'], ['coins', (v.level >= 2 ? 3 : 2) + '/m'], ...(v.shipProject ? [['hourglass', v.shipProject + 'm']] : [])],
    `${v.league ? 'League member' : v.level >= 2 ? 'Harbor concession' : 'Warehouse'} · ${v.active ? 'Active' : 'Suspended'} · ${v.level >= 2 ? 24 : 12} trade power. Rent is paid to the host. Blockades suspend trade and supply.`);
  for (const [id, c] of Object.entries(s.claimants)) add('dynasty', id, c.candidate.name, 'laurel',
    c.installed ? [['laurel', Math.floor(c.loyalty) + '%']] : [['coins', c.accession ? 0 : '2/m']],
    `${gName(ctx, id)} · ${c.installed ? 'Installed client ruler' : c.accession ? 'Inherited crown; protection can be offered' : c.warId ? 'Claim being pressed in war' : c.compact ? 'Recognized heir' : 'Sheltered claimant'}.`);
  for (const [id, v] of Object.entries(s.colonies)) add('colonies', id, ctx.byId(Number(id))?.name || id, v.district ? 'helmet' : 'grain',
    [['spears', v.reserves], ['laurel', Math.floor(v.loyalty) + '%'], ...(v.left ? [['hourglass', v.left + 'm']] : [])],
    `${v.district ? 'Military district' : 'Military colony'} · ${v.commander?.name || 'No district commander'} · 40% autonomy floor. Below 20 loyalty risks mutiny.`, v.left ? { done: 6 - v.left, total: 6 } : null);
  for (const [id, v] of Object.entries(s.networks)) add('subversion', id, ctx.byId(Number(id))?.name || id, 'dagger',
    [['quill', v.strength + '%'], ['alert', v.exposure + '%'], ...(v.op ? [['hourglass', v.op.left + 'm']] : [])],
    `Network strength ${v.strength}/100 · Exposure ${v.exposure}/100. At 100 exposure the network is purged. ${v.op ? NATIONAL_ACTIONS[v.op.kind].name + ' underway.' : 'No operation underway.'}`,
    v.op ? { done: v.op.total - v.op.left, total: v.op.total } : null);
  for (const [id, v] of Object.entries(s.cities)) add('federation', id, ctx.byId(Number(id))?.name || id, 'bricks',
    [['laurel', Math.floor(v.loyalty) + '%'], ['coins', Math.floor(v.funds)], ['spears', v.reserves], ...(v.integrating ? [['hourglass', v.integrating + 'm']] : [])],
    `${v.service} service · 45% autonomy floor · Cities below 60 loyalty refuse service; below 20 they rebel.`,
    v.integrating ? { done: 12 - v.integrating, total: 12 } : null);
  const incoming = Object.values(ctx.game.tags).reduce((n, v) => n + Object.values(v.nationalStrategy?.networks || {}).filter(agent => agent.host === tag && agent.warned).length, 0);
  return { ...info, actions, records, log: s.log, incoming, counterspy: Math.max(0, s.counterspyUntil - now(ctx)), monthlyOut: num(s.monthlyOut) };
}
function gName(ctx, tag) { return ctx.game.tags[tag]?.name || tag; }
