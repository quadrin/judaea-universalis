// Autonomous negotiations. Offers are saved facts; readers never spend or roll.
import { isHumanChair, isHostile, isOffmapTag, allianceBarred, clientForeignPolicyBar,
  chanceryFullWhy, liveGrudge, reconciled, addOpinion, chronicle, joinWar,
  truceActive, recognized, allyAnswersCall, evaluatePeaceDeal, executePeaceDeal } from './military.js';
import { courtAttitude, rememberCourtEvent, courtBudget } from './court_plans.js';
import { offensiveCall, commitAllyCall, strategicInterests } from './strategy.js';

const n = v => Number.isFinite(v) ? v : 0;
const snapshots = new WeakMap();
const month = ctx => (ctx.game.date.y > 0 ? ctx.game.date.y - 1 : ctx.game.date.y) * 12 + ctx.game.date.m - 1;
const strength = (ctx, tag) => snapshots.get(ctx)?.power.get(tag) ?? Object.values(ctx.game.armies || {}).filter(a => a.tag === tag)
  .reduce((s, a) => s + n(a.men), 0) + n(ctx.game.tags[tag]?.manpower) * .35;
const opinion = (ctx, a, b) => n(ctx.game.tags[a]?.opinion?.[b]);
const autonomous = (ctx, tag) => ctx.game.tags[tag]?.alive && ctx.game.tags[tag].ai && !isHumanChair(ctx.game, tag);
const passive = t => (t.modifiers || []).some(m => m?.effects?.aiPassive);
const ledger = ctx => { const s = ctx.game.courtDiplomacy ||= {}; s.nextId ||= 1; s.offers ||= []; s.cooldowns ||= {}; s.history ||= []; s.support ||= []; return s; };
const pair = (a, b) => [a, b].sort().join('>');
const name = (ctx, tag) => ctx.game.tags[tag]?.name || tag;
function bordering(ctx, a, b) {
  if (snapshots.has(ctx)) return snapshots.get(ctx).neighbors.get(a)?.has(b) || false;
  return ctx.game.provinces.some(p => p?.owner === a && [...(ctx.geom?.neighbors?.[p.id] || [])]
    .some(id => ctx.byId(id)?.owner === b));
}
function commonThreat(ctx, a, b) {
  return Object.keys(ctx.game.tags).filter(k => k !== a && k !== b && k !== 'REB' && ctx.game.tags[k]?.alive)
    .find(k => ((ctx.game.tags[a].atWarWith || []).includes(k) || bordering(ctx, a, k))
      && ((ctx.game.tags[b].atWarWith || []).includes(k) || bordering(ctx, b, k))
      && (opinion(ctx, a, k) < -25 || opinion(ctx, b, k) < -25)
      && strength(ctx, k) > Math.min(strength(ctx, a), strength(ctx, b)) * 1.2);
}
function baseGate(ctx, offer) {
  const { from, to } = offer, a = ctx.game.tags[from], b = ctx.game.tags[to];
  if (!a?.alive || !b?.alive || from === to || from === 'REB' || to === 'REB') return 'A participating court no longer exists.';
  if (offer.kind !== 'peace' && (isHostile(ctx, from, to) || isHostile(ctx, to, from))) return 'The courts are now at war.';
  if (isOffmapTag(ctx, from) || isOffmapTag(ctx, to)) return 'A participating court is beyond the map.';
  if (a.overlord === to || b.overlord === from) return 'Fealty already governs this relationship.';
  if ((offer.kind !== 'independence_support' && clientForeignPolicyBar(ctx, from)) || clientForeignPolicyBar(ctx, to)) return 'A client cannot pledge an independent foreign policy.';
  return '';
}
function gate(ctx, offer) {
  const base = baseGate(ctx, offer); if (base) return base;
  const { from, to, kind } = offer, a = ctx.game.tags[from], b = ctx.game.tags[to];
  if (offer.expires <= month(ctx)) return 'The offer has expired.';
  if (kind === 'independence_support') {
    if (!a.overlord || !ctx.game.tags[a.overlord]?.alive) return 'The requesting court no longer has a living overlord.';
    if (b.overlord || (b.allies || []).includes(a.overlord) || truceActive(ctx, to, a.overlord)
      || recognized(ctx, to, a.overlord) || isHostile(ctx, to, a.overlord)) return 'The sponsor’s existing treaties or war prevent this pledge.';
    if (n(b.treasury) < 50 || n(b.points?.infl) < 25) return 'The sponsor needs 50 talents and 25 influence.';
    if ((ctx.game.courtDiplomacy?.support || []).some(p => p.client === from && p.sponsor === to && p.until > month(ctx))) return 'This sponsor has already pledged support.';
    return '';
  }
  if (kind === 'war_support') {
    const w = ctx.game.wars.find(w => w.id === offer.warId);
    if (!w || ![w.attackers[0], w.defenders[0]].includes(from)) return 'The requesting court no longer leads this war.';
    if (w.attackers.includes(to) || w.defenders.includes(to)) return 'The invited court is already in this war.';
    const foes = w.attackers.includes(from) ? w.defenders : w.attackers;
    if (!foes.includes(offer.enemy)) return 'The war’s opposing court has changed.';
    if (foes.some(k => truceActive(ctx, to, k) || recognized(ctx, to, k) || b.overlord === k
      || ctx.game.tags[k]?.overlord === to || (b.allies || []).includes(k)
      || (b.atWarWith || []).includes(k))) return 'Existing treaties or another war prevent joining.';
    const answer = offensiveCall(ctx, to, from, offer.enemy, { province: offer.province }, allyAnswersCall(ctx, to, from));
    return answer.ok ? '' : answer.reasons.join('; ');
  }
  if (kind === 'peace') {
    const w = ctx.game.wars.find(w => w.id === offer.warId);
    if (!w || w.attackers.length !== 1 || w.defenders.length !== 1
      || ![w.attackers[0], w.defenders[0]].includes(from) || ![w.attackers[0], w.defenders[0]].includes(to)) return 'The bilateral war has changed.';
    if (n(a.treasury) < offer.cost) return 'The offering court can no longer pay these terms.';
    const ev = evaluatePeaceDeal(ctx, w, to, { enemy: from, gold: offer.cost });
    return ev.acceptable && ev.gold === offer.cost ? '' : ev.reason || 'These peace terms are no longer available.';
  }
  if (kind === 'alliance') {
    if ((a.allies || []).includes(to) || (b.allies || []).includes(from)) return 'The courts are already allied.';
    const bar = allianceBarred(ctx, from, to); if (bar) return bar;
    if ((liveGrudge(ctx, from, to) && !reconciled(ctx, from, to))
      || (liveGrudge(ctx, to, from) && !reconciled(ctx, to, from))) return 'Unsettled territorial grievances prevent an alliance.';
    return chanceryFullWhy(ctx, from, true) || chanceryFullWhy(ctx, to, false);
  }
  if (kind === 'protection') {
    if ((b.guarantees || []).includes(from)) return 'Protection has already been promised.';
    if (n(b.points?.infl) < 50) return 'The protector needs 50 influence.';
    return chanceryFullWhy(ctx, to, true);
  }
  if (kind === 'subsidy' && n(a.treasury) < offer.cost) return 'The offering court can no longer afford the payment.';
  if (kind === 'reconciliation' && n(a.treasury) < offer.cost) return 'The offering court can no longer afford the gift.';
  if (!['alliance', 'protection', 'subsidy', 'reconciliation'].includes(kind)) return 'Unknown diplomatic terms.';
  return '';
}
function passage(ctx, owner, grantee) {
  ctx.game.flags ||= {}; ctx.game.flags.politicalCrises ||= {};
  const f = ctx.game.flags.politicalCrises; f.access ||= [];
  const old = f.access.find(v => v.owner === owner && v.grantee === grantee);
  if (old) old.until = Math.max(old.until, month(ctx) + 36);
  else f.access.push({ owner, grantee, until: month(ctx) + 36 });
}
function text(ctx, o) {
  if (o.kind === 'independence_support') return { title: 'Independence support requested', description: `${name(ctx, o.from)} asks for 50 talents and 25 influence to prepare independence from ${name(ctx, ctx.game.tags[o.from]?.overlord)}. Accepting commits our armies to its independence war if it rises within 36 months and our treaties still permit joining.` };
  if (o.kind === 'peace') return { title: 'Payment offered for peace', description: `${name(ctx, o.from)} offers ${o.cost} talents to end its bilateral war with us under the ordinary peace terms and truce.` };
  if (o.kind === 'war_support') return { title: 'An ally requests military support', description: `${name(ctx, o.from)} asks us to join its war against ${name(ctx, o.enemy)}${o.province ? `, promising us ${ctx.byId(o.province)?.name || 'a province'} in a victorious settlement` : ''}. Accepting enters the existing war.` };
  if (o.kind === 'alliance') return { title: 'Alliance proposed', description: `${name(ctx, o.from)} proposes a mutual alliance. Each court can call the other into future wars.` };
  if (o.kind === 'protection') return { title: 'Protection requested', description: `${name(ctx, o.from)} asks us to guarantee its independence (50 influence). In exchange, our armies receive military passage through its land for 36 months.` };
  if (o.kind === 'subsidy') return { title: 'Support in exchange for passage', description: `${name(ctx, o.from)} offers ${o.cost} talents now in exchange for 36 months of military passage through our land.` };
  return { title: 'An embassy bearing gifts', description: `${name(ctx, o.from)} offers ${o.cost} talents to improve relations. Accepting creates no military obligation.` };
}
export function courtOffers(ctx, viewer = ctx.game.playerTag) {
  return (ctx.game.courtDiplomacy?.offers || []).filter(o => o.status === 'pending' && o.to === viewer && o.expires > month(ctx))
    .map(o => { const why = gate(ctx, o); return { ...o, ...text(ctx, o), canAccept: !why, why }; });
}
function close(ctx, o, status) {
  o.status = status; o.closed = month(ctx);
  const s = ledger(ctx); s.history.push({ id: o.id, from: o.from, to: o.to, kind: o.kind, status, month: month(ctx) });
  s.history = s.history.slice(-80);
}
export function resolveCourtOffer(ctx, id, accept, actor = ctx.game.playerTag) {
  const o = ctx.game.courtDiplomacy?.offers?.find(v => v.id === id && v.status === 'pending');
  if (!o || o.to !== actor) return { ok: false, why: 'This offer is not addressed to this court.' };
  if (o.expires <= month(ctx)) { close(ctx, o, 'expired'); return { ok: false, why: 'The offer has expired.' }; }
  if (!accept) {
    close(ctx, o, 'declined'); rememberCourtEvent(ctx, o.from, o.to, 'refused', { text: `Declined our ${o.kind} proposal` });
    return { ok: true, why: 'The offer was declined.' };
  }
  const why = gate(ctx, o); if (why) return { ok: false, why };
  const a = ctx.game.tags[o.from], b = ctx.game.tags[o.to];
  if (o.kind === 'independence_support') {
    b.treasury -= 50; b.points.infl -= 25; a.treasury = n(a.treasury) + 50;
    ledger(ctx).support.push({ client: o.from, sponsor: o.to, lord: a.overlord, until: month(ctx) + 36 });
  } else if (o.kind === 'peace') {
    const w = ctx.game.wars.find(w => w.id === o.warId);
    executePeaceDeal(ctx, w, o.to, { enemy: o.from, gold: o.cost });
  } else if (o.kind === 'war_support') {
    const w = ctx.game.wars.find(w => w.id === o.warId);
    const answer = offensiveCall(ctx, o.to, o.from, o.enemy, { province: o.province }, allyAnswersCall(ctx, o.to, o.from));
    if (!joinWar(ctx, w, o.to, w.attackers.includes(o.from) ? 'att' : 'def')) return { ok: false, why: 'The court cannot enter this war.' };
    commitAllyCall(ctx, w, o.to, o.from, { province: o.province }, answer);
  } else if (o.kind === 'alliance') {
    a.allies ||= []; b.allies ||= []; a.allies.push(o.to); b.allies.push(o.from);
  } else if (o.kind === 'protection') {
    b.points.infl -= 50; b.guarantees ||= []; b.guarantees.push(o.from); passage(ctx, o.from, o.to);
  } else {
    a.treasury -= o.cost; b.treasury = n(b.treasury) + o.cost;
    if (o.kind === 'subsidy') passage(ctx, o.to, o.from);
  }
  addOpinion(ctx, o.from, o.to, 10); addOpinion(ctx, o.to, o.from, o.kind === 'reconciliation' ? 20 : 10);
  if (o.kind === 'protection') {
    rememberCourtEvent(ctx, o.from, o.to, 'honored', { text: 'Pledged protection of our independence' });
    rememberCourtEvent(ctx, o.to, o.from, 'aid', { text: 'Granted our armies military passage in exchange for protection' });
  } else if (o.kind === 'independence_support') {
    rememberCourtEvent(ctx, o.from, o.to, 'aid', { text: 'Funded our preparations for independence and pledged military support' });
    rememberCourtEvent(ctx, o.to, o.from, 'honored', { text: 'Concluded an independence support agreement with our court' });
  } else {
    rememberCourtEvent(ctx, o.from, o.to, 'honored', { text: `Accepted our ${o.kind} proposal` });
    rememberCourtEvent(ctx, o.to, o.from, o.kind === 'peace' ? 'peace' : o.kind === 'alliance' || o.kind === 'war_support' ? 'honored' : 'aid', { text: `${o.kind} agreement concluded` });
  }
  close(ctx, o, 'accepted');
  chronicle(ctx, 'diplomacy', `${name(ctx, o.to)} accepted ${name(ctx, o.from)}’s ${o.kind} proposal.`);
  ctx.bus?.emit('actionTaken', {});
  return { ok: true, why: 'The agreement is in force.' };
}
function aiAccepts(ctx, o) {
  if (gate(ctx, o) || passive(ctx.game.tags[o.to])) return false;
  if (o.kind === 'peace' || o.kind === 'war_support') return true;
  if (o.kind === 'reconciliation') return true;
  if (o.kind === 'independence_support') return opinion(ctx, o.to, ctx.game.tags[o.from].overlord) < -25
    && n(ctx.game.tags[o.to].treasury) >= courtBudget(ctx, o.to).reserve + 50;
  const a = courtAttitude(ctx, o.to, o.from);
  if (['rival', 'hostile', 'threat'].includes(a.kind)) return false;
  const regard = opinion(ctx, o.to, o.from);
  if (o.kind === 'alliance') return regard >= 110 || regard >= 25 && !!commonThreat(ctx, o.to, o.from);
  if (o.kind === 'protection') return n(ctx.game.tags[o.to].points?.infl) >= 75 && regard >= 0
    && strength(ctx, o.to) > strength(ctx, o.from) * 1.3 && !!commonThreat(ctx, o.to, o.from);
  return regard >= 0 && !(ctx.game.tags[o.to].atWarWith || []).some(k => (ctx.game.tags[o.from].allies || []).includes(k));
}
function propose(ctx, from, to, kind, reason, cost = 0, terms = {}) {
  const s = ledger(ctx), key = pair(from, to), now = month(ctx);
  if (Number.isFinite(s.cooldowns[key]) && s.cooldowns[key] > now || s.offers.some(o => o.status === 'pending' && pair(o.from, o.to) === key)) return false;
  const o = { ...terms, id: `court-${s.nextId++}`, from, to, kind, reason, cost, created: now, expires: now + 6, status: 'pending' };
  if (gate(ctx, o)) return false;
  s.offers.push(o); s.cooldowns[key] = now + 36;
  if (isHumanChair(ctx.game, to)) {
    ctx.bus?.emit('notify', { title: text(ctx, o).title, text: `${text(ctx, o).description} Respond in Court → World.`, type: 'info' });
  } else if (autonomous(ctx, to)) resolveCourtOffer(ctx, o.id, aiAccepts(ctx, o), to);
  return true;
}
export function monthlyCourtDiplomacy(ctx) {
  const s = ledger(ctx), now = month(ctx);
  if (s.lastMonth === now) return;
  s.lastMonth = now;
  const power = new Map(Object.entries(ctx.game.tags).map(([tag, t]) => [tag, n(t.manpower) * .35]));
  for (const a of Object.values(ctx.game.armies || {})) power.set(a.tag, (power.get(a.tag) || 0) + n(a.men));
  const neighbors = new Map();
  for (const p of ctx.game.provinces) if (p && !p.impassable) {
    if (!neighbors.has(p.owner)) neighbors.set(p.owner, new Set());
    for (const id of ctx.geom?.neighbors?.[p.id] || []) { const q = ctx.byId(id); if (q && !q.impassable && q.owner !== p.owner) neighbors.get(p.owner).add(q.owner); }
  }
  snapshots.set(ctx, { power, neighbors });
  try {
  s.support = s.support.filter(p => p.until > now && ctx.game.tags[p.client]?.alive && ctx.game.tags[p.sponsor]?.alive && ctx.game.tags[p.lord]?.alive);
  for (const w of ctx.game.wars || []) if (w.cb === 'independence') honorCourtIndependence(ctx, w.attackers[0], w);
  for (const o of s.offers) if (o.status === 'pending' && (o.expires <= now || baseGate(ctx, o))) close(ctx, o, 'expired');
  s.offers = s.offers.filter(o => o.status === 'pending' || n(o.closed) > now - 12).slice(-160);
  for (const key of Object.keys(s.cooldowns)) if (s.cooldowns[key] <= now) delete s.cooldowns[key];
  // Stagger councils across months. Every court gets a quarterly diplomatic turn.
  const tags = Object.keys(ctx.game.tags).sort();
  for (let i = 0; i < tags.length; i++) {
    const from = tags[i], t = ctx.game.tags[from];
    if (!autonomous(ctx, from) || from === 'REB' || passive(t) || (now + i) % 3) continue;
    if (t.overlord) {
      if (opinion(ctx, from, t.overlord) <= -50 || t.courtPlan?.goals?.some(g => g.kind === 'independence')) {
        for (const to of tags) if (to !== from && to !== t.overlord && ctx.game.tags[to]?.alive
          && !clientForeignPolicyBar(ctx, to) && opinion(ctx, to, t.overlord) < -25
          && (bordering(ctx, to, from) || bordering(ctx, to, t.overlord))
          && propose(ctx, from, to, 'independence_support', 'The court seeks foreign funding and a military partner for independence.')) break;
      }
      continue;
    }
    if (clientForeignPolicyBar(ctx, from)) continue;
    let sent = false;
    for (const w of ctx.game.wars || []) {
      const side = w.attackers[0] === from ? w.attackers : w.defenders[0] === from ? w.defenders : null;
      if (!side) continue;
      const foes = side === w.attackers ? w.defenders : w.attackers, enemy = foes[0];
      if (side.length === 1 && foes.length === 1 && n(t.warExhaustion) >= 6 && n(t.treasury) >= 30
        && propose(ctx, from, enemy, 'peace', 'The court seeks to preserve its army and end an exhausting war.', Math.min(100, Math.floor(t.treasury / 3)), { warId: w.id })) { sent = true; break; }
      for (const to of t.allies || []) {
        const province = strategicInterests(ctx, to, enemy).find(p => p.score >= 50)?.id || 0;
        if (propose(ctx, from, to, 'war_support', 'The court seeks allied help in its current war.', 0, { warId: w.id, enemy, province })) { sent = true; break; }
      }
      if (sent) break;
    }
    if (sent) continue;
    const candidates = tags.filter(to => to !== from && to !== 'REB' && ctx.game.tags[to]?.alive
      && !baseGate(ctx, { from, to }) && (bordering(ctx, from, to) || commonThreat(ctx, from, to)))
      .sort((a, b) => opinion(ctx, from, b) - opinion(ctx, from, a) || a.localeCompare(b));
    for (const to of candidates) {
      const threat = commonThreat(ctx, from, to), regard = opinion(ctx, from, to), attitude = courtAttitude(ctx, from, to);
      if (['rival', 'hostile', 'threat'].includes(attitude.kind) || regard < -25) continue;
      const reason = threat ? `Both courts are concerned by ${name(ctx, threat)}.` : 'A stable frontier would support the court’s plans.';
      if (threat && strength(ctx, to) > strength(ctx, from) * 1.5 && !(t.allies || []).includes(to)
        && propose(ctx, from, to, 'protection', reason)) break;
      if ((threat || regard >= 100) && !(t.allies || []).includes(to)
        && propose(ctx, from, to, 'alliance', reason)) break;
      if (threat && n(t.treasury) > Math.max(150, courtBudget(ctx, from).reserve + 50) && strength(ctx, from) > strength(ctx, to) * 1.3
        && propose(ctx, from, to, 'subsidy', reason, 50)) break;
      if (regard >= 0 && regard < 60 && n(t.treasury) > Math.max(150, courtBudget(ctx, from).reserve + 50)
        && n(t.treasury) >= courtBudget(ctx, from).reserve + 75
        && propose(ctx, from, to, 'reconciliation', reason, 75)) break;
    }
  }
  } finally { snapshots.delete(ctx); }
}

export function courtIndependenceSupport(ctx, client) {
  const t = ctx.game.tags[client], now = month(ctx);
  return [...new Set((ctx.game.courtDiplomacy?.support || []).filter(p => p.client === client && p.until > now
    && (!t?.overlord || p.lord === t.overlord) && ctx.game.tags[p.sponsor]?.alive
    && !clientForeignPolicyBar(ctx, p.sponsor) && !truceActive(ctx, p.sponsor, p.lord)
    && !recognized(ctx, p.sponsor, p.lord) && !(ctx.game.tags[p.sponsor].allies || []).includes(p.lord)
    && !isHostile(ctx, p.sponsor, p.lord)
    && !(ctx.game.tags[p.lord]?.allies || []).some(k => truceActive(ctx, p.sponsor, k)
      || recognized(ctx, p.sponsor, k) || (ctx.game.tags[p.sponsor].allies || []).includes(k))).map(p => p.sponsor))];
}
export function honorCourtIndependence(ctx, client, war) {
  if (!war || war.cb !== 'independence' || !war.attackers.includes(client)) return;
  const pledged = new Set((ctx.game.courtDiplomacy?.support || []).filter(p => p.client === client
    && p.until > month(ctx) && war.defenders.includes(p.lord)).map(p => p.sponsor));
  for (const sponsor of courtIndependenceSupport(ctx, client)) {
    if (!pledged.has(sponsor)) continue;
    if (war.attackers.includes(sponsor) || war.defenders.includes(sponsor)) continue;
    if (!war.defenders.some(k => (ctx.game.tags[sponsor].allies || []).includes(k))) joinWar(ctx, war, sponsor, 'att');
  }
}
