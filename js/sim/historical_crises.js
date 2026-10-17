// Historically situated political crises. State is plain save data; queries
// never create it. Event effects recheck the live map before spending anything.
import { livingTag, truceActive, clientForeignPolicyBar, independenceInfo,
  breakAllianceCore, recognized, truceKey, withdrawFromWar } from './military.js';
import { eventMonthIndex } from './events.js';
import { applyReformsToTag } from '../data/ideas.js';

export { month, live, state, war, land, held, note, remember, regard, subject, split };

const month = ctx => eventMonthIndex(ctx.game.date.y, ctx.game.date.m);
const live = (ctx, tag) => {
  const key = livingTag(ctx, tag), t = ctx.game.tags[key];
  return t && t.alive !== false ? key : null;
};
const state = ctx => ctx.game.flags.historicalCrises || {};
const war = (ctx, a, b) => (ctx.game.wars || []).find(w =>
  (w.attackers.includes(a) && w.defenders.includes(b)) ||
  (w.attackers.includes(b) && w.defenders.includes(a)));
const land = (ctx, tag) => ctx.game.provinces.filter(p => p && !p.impassable && p.owner === tag);
const held = (ctx, tag, names) => names.map(n => ctx.prov(n))
  .filter(p => p && p.owner === tag && p.controller === tag && !p.siege && !p.impassable
    && !(ctx.game.battles || []).some(b => b.prov === p.id));
const note = (ctx, text) => ctx.helpers.chronicle(ctx, 'diplomacy', text);
function remember(ctx, key, value) {
  ctx.game.flags.historicalCrises ||= {};
  ctx.game.flags.historicalCrises[key] = value;
}
function regard(ctx, a, b, amount) {
  const t = ctx.game.tags[a]; if (!t || !b || a === b) return;
  t.opinion ||= {}; t.opinion[b] = Math.max(-200, Math.min(200, (t.opinion[b] || 0) + amount));
}
function subject(ctx, tag, lord, rate = .15) {
  const t = ctx.game.tags[tag];
  for (const ally of (t.allies || []).slice()) breakAllianceCore(ctx, tag, ally);
  t.guarantees = []; t.overlord = lord; t.incorporating = null;
  // Use the economy's existing negotiated-pact ledger, on both ends of the
  // transfer. A display-only tribute rate would still charge the default 15%.
  t.chapterStrategy ||= {};
  Object.assign(t.chapterStrategy, { rights: 0, service: 0, standing: 0, monthlyIn: 0, monthlyOut: 0,
    patron: { tag: lord, rate, manpower: 0, until: month(ctx) + 120, arrears: 0 } });
}
function split(ctx, parent, tag, names, ruler, name, color, share) {
  const sites = held(ctx, parent, names);
  if (!sites.length || ctx.game.tags[tag] || land(ctx, parent).length <= sites.length) return null;
  const total = Math.max(1, land(ctx, parent).length);
  const child = ctx.helpers.secedeTag(ctx, parent, tag, {
    provinces: sites.map(p => p.name), share: share ?? Math.min(.35, sites.length / total),
    ruler, name, color, stability: 0, legitimacy: 55, opinion: 25,
    chronicle: `${name} establishes a separate court in ${sites.map(p => p.name).join(', ')}.`,
  });
  if (child) {
    child.govType = 'monarchy'; child.capital = sites[0].name;
    child.dynamicCapital = sites[0].canon || sites[0].name;
    // A rival dynasty is a new court, not the parent's forwarding address.
    child.lineage = []; child.formedFrom = null;
    applyReformsToTag(ctx.DEFINES, child, tag);
    for (const p of sites) for (const order of p.unitQueue || []) if (order.tag === parent) {
      order.tag = tag; delete order.rallyProv; delete order.templateId;
    }
    note(ctx, `${name} is established at ${child.capital}: ${sites.map(p => p.name).join(', ')}.`);
  }
  return child;
}

export const ANTIPAS_LANDS = ['Sepphoris', 'Jotapata', 'Tiberias', 'Tarichaea', 'Gischala', 'Machaerus', 'Gadora'];
export const PHILIP_LANDS = ['Caesarea Philippi', 'Batanea', 'Gamala'];

export function historicalCrisisInfo(ctx, key) {
  const g = ctx.game, s = state(ctx);
  if (key === 'balas') {
    const sponsor = live(ctx, 'HAS'), incumbent = live(ctx, 'SEL'), claimant = live(ctx, 'BAL');
    const coast = held(ctx, incumbent, ['Ptolemais']);
    const exists = !!(sponsor && incumbent && sponsor !== incumbent && !s.balas
      && g.date.y >= -152 && g.date.y <= -150
      && /Demetrius I(?:\s|$)/.test(g.tags[incumbent].ruler?.name || '')
      && !g.tags.BAL && !g.tags[incumbent].overlord && coast.length && land(ctx, incumbent).length > 1);
    const t = g.tags[sponsor];
    const rec = s.balas, antioch = ctx.prov('Antioch');
    const winner = rec && !war(ctx, claimant, incumbent) && antioch?.owner === antioch?.controller
      && [claimant, incumbent].filter(Boolean).includes(antioch?.owner) ? antioch.owner : null;
    const supported = rec?.support === 'fund' ? live(ctx, rec.claimant) : rec?.support === 'king' ? live(ctx, rec.incumbent) : null;
    return { exists, sponsor, incumbent, claimant, canFund: exists && t.treasury >= 100 && t.manpower >= 1000,
      canBackKing: exists && !war(ctx, sponsor, incumbent), record: rec, winner,
      canHonour: !!(winner && winner === supported && sponsor && !war(ctx, sponsor, winner)) };
  }
  if (key === 'brothers') {
    const elder = live(ctx, 'HYR'), younger = live(ctx, 'ARI');
    const a = g.tags[elder], b = g.tags[younger];
    const exists = !!(elder && younger && elder !== younger && !s.brothers
      && g.date.y >= -67 && g.date.y <= -66 && !a.overlord && !b.overlord
      && /Hyrcanus/.test(a.ruler?.name || '') && /Aristobulus/.test(b.ruler?.name || '')
      && war(ctx, elder, younger) && held(ctx, elder, ['Jerusalem']).length);
    return { exists, elder, younger, record: s.brothers,
      canRise: !!(s.brothers?.status === 'accord' && a?.overlord === younger && independenceInfo(ctx, elder)?.can),
      canAccept: !!(s.brothers?.status === 'offered' && elder && younger && elder !== younger
        && !a.overlord && !b.overlord && war(ctx, elder, younger) && held(ctx, elder, ['Jerusalem']).length
        && land(ctx, elder).length > 1) };
  }
  if (key === 'herod') {
    const r = s.herod;
    const parent = r ? live(ctx, r.parent) : ['HER', 'HYR', 'ARI'].map(t => live(ctx, t))
      .find(t => t && /^Herod(?: the Great)?$/.test(g.tags[t].ruler?.name || '')
        && held(ctx, t, ['Jerusalem']).length);
    const romanCourt = live(ctx, 'ROM');
    const rome = romanCourt && !g.tags[romanCourt].overlord ? romanCourt : null, t = g.tags[parent];
    const antipas = held(ctx, parent, ANTIPAS_LANDS).map(p => p.name);
    const philip = held(ctx, parent, PHILIP_LANDS).map(p => p.name);
    const exists = !!(parent && !r && g.date.y >= -4 && g.date.y <= -3 && t.govType !== 'republic'
      && (!t.overlord || t.overlord === rome)
      && /^Herod(?: the Great)?$/.test(t.ruler?.name || '') && held(ctx, parent, ['Jerusalem']).length);
    return { exists, parent, rome, antipas, philip, record: r,
      canPetition: !!(parent && rome && parent !== rome && (!t.overlord || t.overlord === rome)
        && !war(ctx, parent, rome) && t.treasury >= 100),
      canRatify: !!(parent && rome && parent !== rome && ['petition', 'defied'].includes(r?.status)
        && t.ruler?.name === 'Herod Antipas' && (!t.overlord || t.overlord === rome)
        && !war(ctx, parent, rome)),
      canDivide: !!(parent && held(ctx, parent, ['Jerusalem']).length && !g.tags.HPA && !g.tags.HPH
        && (antipas.length || philip.length)) };
  }
  return {};
}

function divideHerod(ctx, info) {
  const { parent, rome } = info, t = ctx.game.tags[parent];
  const lord = t.overlord === rome ? rome : null;
  const sons = [];
  const antipas = split(ctx, parent, 'HPA', ANTIPAS_LANDS,
    { name: 'Herod Antipas', title: 'Tetrarch', gov: 2, infl: 3, mar: 2, age: 17 },
    'Galilee and Peraea', [154, 100, 65]);
  const philip = split(ctx, parent, 'HPH', PHILIP_LANDS,
    { name: 'Philip', title: 'Tetrarch', gov: 3, infl: 2, mar: 1, age: 22 },
    "Philip's Tetrarchy", [112, 116, 166]);
  for (const child of [antipas, philip]) if (child) {
    child.overlord = lord; sons.push(child.tag);
  }
  ctx.helpers.setRuler(ctx, parent, { name: 'Archelaus', title: rome ? 'Ethnarch' : 'King of Judaea', gov: 1, infl: 2, mar: 1, age: 19 });
  ctx.helpers.setHeir(ctx, parent, null);
  t.modifiers = (t.modifiers || []).filter(m => !['the_undivided_realm', 'the_tetrarchies', 'divided_testament', 'an_unsettled_house'].includes(m.id));
  ctx.helpers.setFlag(ctx, 'kingdomWhole', false);
  ctx.helpers.setFlag(ctx, 'kingdomDivided', true);
  ctx.helpers.setFlag(ctx, 'testamentAnswered', true);
  const record = { ...(info.record || {}), parent, status: 'divided', sons, at: month(ctx) };
  remember(ctx, 'herod', record);
  note(ctx, 'Herod’s succession is divided on the current map. Archelaus retains Judaea; the tetrarchs govern their own lands. Foreign and occupied territory is untouched.');
  ctx.bus.emit('provinceOwner', {});
  return { ok: true };
}

export function chooseHistoricalCrisis(ctx, key, choice) {
  const g = ctx.game, h = ctx.helpers, info = historicalCrisisInfo(ctx, key), r = info.record;
  const no = why => ({ ok: false, why });
  if (key === 'balas') {
    if (['fund', 'king', 'neutral'].includes(choice)) {
      if (!info.exists) return no('The Seleucid succession no longer fits this offer.');
      if (choice === 'fund' && !info.canFund) return no('Support requires 100 talents and 1,000 manpower.');
      if (choice === 'king' && !info.canBackKing) return no('We are still at war with Demetrius.');
      const child = split(ctx, info.incumbent, 'BAL', ['Ptolemais'],
        { name: 'Alexander Balas', title: 'Basileus', gov: 2, infl: 3, mar: 2, age: 25 },
        'Alexander Balas’s Claim', [160, 74, 112], .22);
      if (!child) return no('The claimant has no safe landing place.');
      // No scripted peace, occupation or king is imposed on the incumbent.
      const w = h.declareWar(ctx, 'BAL', info.incumbent, 'The War of Alexander Balas', 'conquest');
      if (!w) { h.dissolveTag(ctx, 'BAL', info.incumbent); return no('The claimant cannot open his war.'); }
      const target = choice === 'king' ? info.incumbent : 'BAL';
      if (choice !== 'neutral') {
        if (choice === 'fund') {
          g.tags[info.sponsor].treasury -= 100; g.tags[info.sponsor].manpower -= 1000;
          child.treasury += 100; child.manpower += 1000;
        }
        regard(ctx, target, info.sponsor, 60);
        regard(ctx, info.sponsor, target, 40);
        regard(ctx, choice === 'king' ? 'BAL' : info.incumbent, info.sponsor, -60);
      }
      if (choice === 'fund') {
        h.adjust(ctx, info.sponsor, { legitimacy: 10 });
        h.addTagModifier(ctx, info.sponsor, { id: 'high_priesthood', name: 'Jonathan’s High Priesthood', months: 36, effects: { unrestAll: -1 } });
        h.setFlag(ctx, 'highPriesthood', true);
      }
      // The landing army is mustered from the new court's own share of the rolls.
      const inf = Math.min(4, Math.floor(child.manpower / 1000));
      if (inf) { child.manpower -= inf * 1000; h.spawnArmy(ctx, 'BAL', child.capital, { inf, name: 'Army of Alexander Balas' }); }
      remember(ctx, 'balas', { sponsor: info.sponsor, incumbent: info.incumbent, claimant: 'BAL',
        support: choice, status: 'war', at: month(ctx) });
      note(ctx, `Alexander Balas lands at Ptolemais and fights for the Seleucid crown. Jonathan chooses ${choice === 'fund' ? 'to supply the claimant' : choice === 'king' ? 'Demetrius’s offer' : 'neutrality'}.`);
      return { ok: true };
    }
    if (!r || r.status !== 'war') return no('This succession has already been settled.');
    const sponsor = live(ctx, r.sponsor), claimant = live(ctx, r.claimant), incumbent = live(ctx, r.incumbent);
    const winner = info.winner;
    if (!winner || !sponsor) return no('The struggle for Antioch is still unresolved.');
    if (choice === 'honour') {
      const supported = r.support === 'fund' ? live(ctx, r.claimant) : r.support === 'king' ? live(ctx, r.incumbent) : null;
      if (winner !== supported || war(ctx, sponsor, winner)) return no('Our candidate has not secured a peaceful throne.');
      if (winner === claimant) {
        h.adjust(ctx, sponsor, { legitimacy: 10, gov: 20 });
        h.addTagModifier(ctx, sponsor, { id: 'high_priesthood', name: 'Jonathan’s High Priesthood', months: -1, effects: { unrestAll: -1 } });
        h.setFlag(ctx, 'highPriesthood', true);
      } else {
        h.addTagModifier(ctx, sponsor, { id: 'demetrius_concessions', name: 'The Royal Tax Concessions', months: 120, effects: { incomeMult: 1.1 } });
      }
      regard(ctx, winner, sponsor, 40);
    } else if (choice === 'settle') {
      regard(ctx, winner, sponsor, -20); h.adjust(ctx, sponsor, { legitimacy: -5 });
    } else return no('Unknown settlement.');
    remember(ctx, 'balas', { ...r, status: 'settled', winner, outcome: choice });
    note(ctx, 'The struggle for Antioch ends; the surviving court’s promises to Jonathan are resolved. The result follows the war, not the calendar.');
    return { ok: true };
  }
  if (key === 'brothers') {
    if (choice === 'offer') {
      if (!info.exists || land(ctx, info.elder).length < 2) return no('The brothers can no longer make this agreement.');
      remember(ctx, 'brothers', { status: 'offered', elder: info.elder, younger: info.younger, at: month(ctx) });
      return { ok: true };
    }
    if (choice === 'fight') {
      if (!info.exists) return no('The original succession war is over.');
      remember(ctx, 'brothers', { status: 'refused', at: month(ctx) }); return { ok: true };
    }
    if (choice === 'accept') {
      if (!info.canAccept) return no('Jerusalem or the brothers’ independence has changed.');
      h.endWar(ctx, info.elder, info.younger, null);
      const d = g.date, n = d.m - 1 + 6;
      let y = d.y + Math.floor(n / 12); if (d.y < 0 && y >= 0) y++;
      g.truces[truceKey(info.elder, info.younger)] = { y, m: n % 12 + 1 };
      h.changeOwner(ctx, 'Jerusalem', info.younger);
      const seat = land(ctx, info.elder).find(p => p.controller === info.elder) || land(ctx, info.elder)[0];
      if (seat) {
        g.tags[info.elder].capital = seat.name;
        g.tags[info.elder].dynamicCapital = seat.canon || seat.name;
      }
      subject(ctx, info.elder, info.younger, .05);
      h.adjust(ctx, info.elder, { stability: 1, legitimacy: -10 });
      h.adjust(ctx, info.younger, { legitimacy: 15 });
      h.reconcileRivalry(ctx, info.elder, info.younger);
      remember(ctx, 'brothers', { ...r, status: 'accord', at: month(ctx) });
      note(ctx, 'Hyrcanus recognizes Aristobulus’s crown and yields Jerusalem. His remaining administration answers to his brother; the civil war ends.');
      return { ok: true };
    }
    if (choice === 'reject') {
      if (r?.status !== 'offered') return no('No agreement is awaiting an answer.');
      remember(ctx, 'brothers', { ...r, status: 'rejected' }); return { ok: true };
    }
    if (choice === 'rise') {
      if (!info.canRise) return no('The accord’s truce or another war still binds us.');
      const result = h.declareIndependence(ctx, info.elder);
      if (!result.ok) return result;
      remember(ctx, 'brothers', { ...r, status: 'broken' });
      note(ctx, 'Hyrcanus reopens his claim at Antipater’s urging. The oath is broken and the brothers return to war.');
      return { ok: true };
    }
    if (choice === 'keep') {
      if (r?.status !== 'accord') return no('The accord no longer binds these courts.');
      remember(ctx, 'brothers', { ...r, status: 'kept' });
      h.adjust(ctx, info.elder, { stability: 1 }); return { ok: true };
    }
  }
  if (key === 'herod') {
    if (['divide', 'petition', 'defy'].includes(choice)) {
      if (!info.exists) return no('Herod’s historical succession no longer applies to this throne.');
      if (choice === 'divide') {
        if (!info.canDivide) return no('No uncontested tetrarchy can be separated from this realm.');
        return divideHerod(ctx, info);
      }
      if (choice === 'petition' && !info.canPetition) return no('An embassy requires peace with Rome and 100 talents.');
      h.setRuler(ctx, info.parent, { name: 'Herod Antipas', title: 'Claimant to the Kingdom', gov: 2, infl: 3, mar: 2, age: 17 });
      h.setHeir(ctx, info.parent, null);
      if (choice === 'petition') {
        g.tags[info.parent].treasury -= 100; g.tags[info.rome].treasury += 100;
      } else h.adjust(ctx, info.parent, { legitimacy: -20, stability: -1 });
      remember(ctx, 'herod', { parent: info.parent, status: info.rome ? (choice === 'petition' ? 'petition' : 'defied') : 'whole', at: month(ctx) });
      h.setFlag(ctx, 'testamentAnswered', true);
      if (!info.rome) {
        g.tags[info.parent].ruler.title = 'King of Judaea';
        h.setFlag(ctx, 'kingdomWhole', true); h.setFlag(ctx, 'kingdomDivided', false);
      }
      note(ctx, 'Antipas presses his claim under an earlier will. An undivided crown is a disputed alternative to the final testament.');
      return { ok: true };
    }
    if (!r || !info.parent) return no('The successor court no longer exists.');
    if (choice === 'ratify') {
      if (!info.canRatify) return no('Rome cannot ratify this settlement now.');
      const t = g.tags[info.parent];
      if (t.overlord && t.overlord !== info.rome) return no('The claimant now answers to another patron.');
      subject(ctx, info.parent, info.rome); t.ruler.title = 'King of Judaea';
      h.setFlag(ctx, 'kingdomWhole', true); h.setFlag(ctx, 'successionSettled', true);
      h.setFlag(ctx, 'kingdomDivided', false);
      remember(ctx, 'herod', { ...r, status: 'whole' });
      note(ctx, 'Rome confirms Antipas over an undivided client kingdom. Tribute and control of foreign policy are the price of the crown.');
      return { ok: true };
    }
    if (choice === 'refuse') {
      if (!['petition', 'defied'].includes(r.status)) return no('Rome has already answered.');
      remember(ctx, 'herod', { ...r, status: 'rejected' }); return { ok: true };
    }
    if (choice === 'accept_division') {
      if (r.status !== 'rejected' || !info.canDivide) return no('The proposed division no longer matches the map.');
      return divideHerod(ctx, info);
    }
    if (choice === 'resist') {
      if (r.status !== 'rejected') return no('No imperial verdict is awaiting an answer.');
      const t = g.tags[info.parent];
      if (t.overlord && t.overlord !== info.rome) return no('Another patron now controls this court.');
      // Leave the old patron's fronts before a possible intervention opens:
      // no state may fight Rome while still standing beside it elsewhere.
      for (const w of (g.wars || []).slice()) {
        const same = [w.attackers, w.defenders].some(side => side.includes(info.parent) && side.includes(info.rome));
        if (same) withdrawFromWar(ctx, w, info.parent);
      }
      if (info.rome) breakAllianceCore(ctx, info.parent, info.rome);
      if (t.overlord === info.rome) t.overlord = null;
      if (t.chapterStrategy?.patron?.tag === info.rome) t.chapterStrategy.patron = null;
      h.adjust(ctx, info.parent, { legitimacy: -15 });
      regard(ctx, info.rome, info.parent, -80);
      remember(ctx, 'herod', { ...r, status: 'resisting' }); return { ok: true };
    }
    if (choice === 'enforce') {
      if (r.status !== 'resisting' || !info.rome || truceActive(ctx, info.rome, info.parent)
        || recognized(ctx, info.rome, info.parent) || clientForeignPolicyBar(ctx, info.rome)) return no('Rome is still bound by its diplomatic commitments.');
      const w = war(ctx, info.rome, info.parent) || h.declareWar(ctx, info.rome, info.parent, 'The Disputed Herodian Succession', 'conquest');
      if (!w) return no('Rome cannot intervene.');
      remember(ctx, 'herod', { ...r, status: 'intervention' }); return { ok: true };
    }
    if (choice === 'leave') {
      if (r.status !== 'resisting') return no('There is no outstanding intervention.');
      g.tags[info.parent].ruler.title = 'King of Judaea';
      h.setFlag(ctx, 'kingdomWhole', true); h.setFlag(ctx, 'kingdomDivided', false);
      remember(ctx, 'herod', { ...r, status: 'independent' }); return { ok: true };
    }
  }
  return no('This course is no longer available.');
}

// Antipater's follow-up waits until the accord's explicit six-month truce ends.
export function canImperialIntervention(ctx) {
  const i = historicalCrisisInfo(ctx, 'herod');
  return !!(i.record?.status === 'resisting' && i.parent && i.rome
    && !truceActive(ctx, i.rome, i.parent) && !recognized(ctx, i.rome, i.parent)
    && !clientForeignPolicyBar(ctx, i.rome));
}
