// Allied councils submit objectives to the ordinary war planner. Acceptance
// reserves diplomatic credit, never commandeers a human or bypasses combat odds.
import { isHumanChair, isHostile, sameSide, armiesOf, capitalProvince, chronicle } from './military.js';
import { landRoutes } from './fort_control.js';
import { diplomaticCredit } from './strategy.js';
import { rememberCourtEvent } from './court_plans.js';
import { reservedForNavalOp } from './invasion.js';

const n = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
const month = ctx => (ctx.game.date.y > 0 ? ctx.game.date.y - 1 : ctx.game.date.y) * 12 + ctx.game.date.m - 1;
const active = r => ['accepted', 'marching', 'holding', 'suspended'].includes(r.status);
const name = (ctx, tag) => ctx.game.tags[tag]?.name || tag;
const rows = ctx => ctx.game.alliedOrders?.requests || [];
const ledger = ctx => { const s = ctx.game.alliedOrders ||= {}; s.nextId ||= 1; s.requests ||= []; s.cooldowns ||= {}; return s; };
const standing = (ctx, tag) => armiesOf(ctx, tag).filter(a => n(a.men) > 0 && !a.retreating && !a.aboard
  && n(a.shatteredDays) <= 0 && !reservedForNavalOp(ctx.game.tags[tag], a.id));
const hostilesAt = (ctx, ally, id) => Object.values(ctx.game.armies || {}).filter(a => a.prov === id && n(a.men) > 0 && isHostile(ctx, ally, a.tag));
function sharedWar(ctx, requester, ally, warId) {
  return (ctx.game.wars || []).find(w => (!warId || w.id === warId)
    && [w.attackers, w.defenders].some(side => side.includes(requester) && side.includes(ally)));
}
function ownUrgency(ctx, ally) {
  const cap = capitalProvince(ctx, ally);
  if (!cap) return '';
  if (isHostile(ctx, ally, cap.controller) || cap.siege && isHostile(ctx, ally, cap.siege.by)) return 'Their capital needs immediate relief.';
  const near = new Set([cap.id, ...(ctx.geom?.neighbors?.[cap.id] || [])]);
  const incoming = Object.values(ctx.game.armies || {}).filter(a => isHostile(ctx, ally, a.tag)
    && (near.has(a.prov) || a.path?.some(id => near.has(id)))).reduce((sum, a) => sum + n(a.men), 0);
  const ours = standing(ctx, ally).reduce((sum, a) => sum + n(a.men), 0);
  return incoming >= Math.max(1000, ours * .5) ? 'An enemy host threatens their capital; home defense comes first.' : '';
}
function temporaryGate(ctx, ally) {
  const t = ctx.game.tags[ally];
  if ((t?.modifiers || []).some(m => m?.effects?.aiPassive)) return 'Their current policy suspends new offensives.';
  if (n(t?.warExhaustion) > 15) return 'Their court is too exhausted for a new commitment.';
  if (n(t?.treasury) < -50) return 'Their treasury cannot support another operation.';
  if (!standing(ctx, ally).some(a => !a.inBattle)) return 'No field army is available for another operation.';
  return ownUrgency(ctx, ally);
}
function targetGate(ctx, requester, ally, kind, province, w) {
  const p = ctx.byId(province);
  if (!p || p.impassable) return 'Choose a passable province.';
  const ours = w.attackers.includes(requester) ? w.attackers : w.defenders;
  const foes = ours === w.attackers ? w.defenders : w.attackers;
  if (kind === 'offensive') {
    if (!foes.includes(p.owner) && !foes.includes(p.controller)) return 'An offensive objective must belong to the opposing side.';
  } else if (kind === 'defend' || kind === 'relieve') {
    if (!ours.includes(p.owner)) return 'Defense and relief objectives must belong to our side of this war.';
    if (kind === 'relieve' && !foes.includes(p.controller) && !(p.siege && foes.includes(p.siege.by))
      && !hostilesAt(ctx, ally, p.id).length) return 'This province has no enemy occupation, siege, or army to relieve.';
    if (kind === 'defend' && !ours.includes(p.controller)) return 'Use a relief request to recover an occupied province.';
  } else return 'Choose defend, relieve, or offensive.';
  return '';
}
function reach(ctx, ally) {
  const result = new Set();
  for (const a of standing(ctx, ally)) if (!a.inBattle) {
    const route = landRoutes(ctx, a, { maxCost: 24 });
    for (const id of route.dist.keys()) result.add(id);
  }
  return result;
}
function assess(ctx, requester, ally, kind, province, warId, reachable) {
  const a = ctx.game.tags[requester], t = ctx.game.tags[ally], reasons = [];
  if (!a?.alive || !t?.alive || requester === ally) reasons.push('Both participating courts must exist.');
  if (!(a?.allies || []).includes(ally) || !(t?.allies || []).includes(requester)) reasons.push('A mutual alliance is required.');
  if (!t?.ai || isHumanChair(ctx.game, ally)) reasons.push('A human ally commands its own armies.');
  const w = sharedWar(ctx, requester, ally, warId);
  if (!w) reasons.push('Both allies must fight on the same side of an active war.');
  if (reasons.length) return { can: false, reasons, why: reasons.join(' '), willingness: 0, favorCost: 0, warId: w?.id };
  const targetWhy = targetGate(ctx, requester, ally, kind, province, w);
  if (targetWhy) reasons.push(targetWhy);
  const temporary = temporaryGate(ctx, ally); if (temporary) reasons.push(temporary);
  if (!targetWhy && !temporary && !(reachable || reach(ctx, ally)).has(province)) reasons.push('Their available armies have no legal land route to this objective within 24 provinces.');
  const c = diplomaticCredit(ctx, ally, requester), favorCost = c.favors >= 5 ? 5 : 0;
  const p = ctx.byId(province), claims = t.claims || [], interest = p?.owner === ally || claims.includes(province) ? 15 : 0;
  const willingness = Math.round(15 + n(t.opinion?.[requester]) * .4 + (c.trust - 50) * .6 + (favorCost ? 20 : 0) + interest - n(t.warExhaustion) * 1.5);
  if (c.trust < 25) reasons.push('Trust is below 25.');
  if (willingness < 25) reasons.push(`Willingness ${willingness}; 25 required. Better relations, trust, favors, or a shared territorial interest would help.`);
  return { can: !reasons.length, reasons, why: reasons.join(' '), willingness, favorCost, warId: w.id,
    factors: [`Trust ${Math.round(c.trust)}`, `Opinion ${Math.round(n(t.opinion?.[requester]))}`, favorCost ? '5 favors committed on acceptance' : 'No favors required', interest ? 'The objective serves their territorial interests' : 'The objective serves our common war'] };
}
function dynamic(ctx, r) {
  if (!active(r)) return { ...r };
  if (r.expires <= month(ctx)) return { ...r, status: 'expired', reason: 'The six-month commitment has ended.' };
  const w = sharedWar(ctx, r.requester, r.ally, r.warId), p = ctx.byId(r.province);
  if (!w) return { ...r, status: 'completed', reason: 'The shared war has ended.' };
  if (!(ctx.game.tags[r.requester]?.allies || []).includes(r.ally) || !(ctx.game.tags[r.ally]?.allies || []).includes(r.requester)
    || !ctx.game.tags[r.ally]?.alive || !ctx.game.tags[r.requester]?.alive) return { ...r, status: 'cancelled', reason: 'The alliance or participating court no longer exists.' };
  if (!p || p.impassable) return { ...r, status: 'cancelled', reason: 'The objective no longer exists.' };
  const complete = completedReason(ctx, r, p);
  if (complete) return { ...r, status: 'completed', reason: complete };
  const targetWhy = targetGate(ctx, r.requester, r.ally, r.kind, r.province, w);
  if (targetWhy) return { ...r, status: 'suspended', reason: targetWhy };
  const why = temporaryGate(ctx, r.ally);
  return { ...r, status: why ? 'suspended' : r.status === 'suspended' ? 'accepted' : r.status, reason: why || r.reason };
}
function completedReason(ctx, r, p) {
  if (r.kind === 'offensive' && sameSide(ctx, r.ally, p.controller)) return 'Our side secured the offensive objective.';
  if (r.kind === 'relieve' && !isHostile(ctx, r.ally, p.controller) && !(p.siege && isHostile(ctx, r.ally, p.siege.by))
    && !hostilesAt(ctx, r.ally, p.id).length) return 'The occupation or siege has been lifted.';
  return '';
}
export function alliedOrdersView(ctx, viewer = ctx.game.playerTag) {
  const mine = ctx.game.tags[viewer];
  if (!mine?.alive) return { allies: [], requests: [] };
  const allies = (mine.allies || []).filter(tag => ctx.game.tags[tag]?.alive).map(ally => {
    const w = sharedWar(ctx, viewer, ally), options = [], reachable = w && ctx.game.tags[ally].ai ? reach(ctx, ally) : new Set();
    if (w) for (const kind of ['relieve', 'defend', 'offensive']) for (const p of ctx.game.provinces) {
      if (!p || targetGate(ctx, viewer, ally, kind, p.id, w)) continue;
      const answer = assess(ctx, viewer, ally, kind, p.id, w.id, reachable);
      options.push({ kind, province: p.id, name: p.name, ...answer });
    }
    const urgent = temporaryGate(ctx, ally), credit = diplomaticCredit(ctx, ally, viewer);
    return { tag: ally, name: name(ctx, ally), warId: w?.id || null, trust: credit.trust, favors: credit.favors,
      reasons: !ctx.game.tags[ally].ai || isHumanChair(ctx.game, ally) ? ['A human ally commands its own armies.'] : !w ? ['No shared active war.'] : urgent ? [urgent] : [],
      options: options.sort((a, b) => Number(b.can) - Number(a.can) || ['relieve', 'defend', 'offensive'].indexOf(a.kind) - ['relieve', 'defend', 'offensive'].indexOf(b.kind) || a.province - b.province) };
  });
  return { allies, requests: rows(ctx).filter(r => r.requester === viewer).slice(-24).map(r => dynamic(ctx, r)) };
}
export function requestAlliedOrder(ctx, requester, ally, kind, province) {
  province = Number(province);
  const answer = assess(ctx, requester, ally, kind, province);
  if (!answer.can) return { ok: false, why: answer.why };
  if (rows(ctx).some(r => r.ally === ally && active(r) && r.expires > month(ctx))) return { ok: false, why: 'That ally already has an active council objective. Cancel or complete it first.' };
  const s = ledger(ctx), now = month(ctx);
  if (answer.favorCost) {
    const t = ctx.game.tags[ally]; t.diplomaticCredit ||= {}; t.diplomaticCredit[requester] ||= diplomaticCredit(ctx, ally, requester);
    t.diplomaticCredit[requester].favors -= answer.favorCost;
  }
  const r = { id: `allied-${s.nextId++}`, requester, ally, kind, province, warId: answer.warId,
    created: now, expires: now + 6, status: 'accepted', reason: 'The council accepted this objective; its commanders still assess routes and battle odds.', favorCost: answer.favorCost };
  s.requests.push(r); s.requests = s.requests.filter(r => active(r) || n(r.closed) > now - 12).slice(-80);
  chronicle(ctx, 'diplomacy', `${name(ctx, ally)} accepted ${name(ctx, requester)}’s request to ${kind} ${ctx.byId(province).name}.`);
  ctx.bus?.emit('actionTaken', {});
  return { ok: true, id: r.id, why: r.reason, favorCost: answer.favorCost };
}
export function cancelAlliedOrder(ctx, requester, id) {
  const r = rows(ctx).find(r => r.id === id && r.requester === requester && active(r));
  if (!r) return { ok: false, why: 'No active objective from this court matches that request.' };
  r.status = 'cancelled'; r.closed = month(ctx); r.reason = 'The requesting court withdrew the objective.';
  ctx.bus?.emit('actionTaken', {}); return { ok: true };
}
export function alliedOrderTasks(ctx, ally) {
  if (!ctx.game.tags[ally]?.ai || isHumanChair(ctx.game, ally) || temporaryGate(ctx, ally)) return [];
  return rows(ctx).filter(r => r.ally === ally && active(r) && r.expires > month(ctx)
    && sharedWar(ctx, r.requester, ally, r.warId) && (ctx.game.tags[r.requester]?.allies || []).includes(ally)
    && (ctx.game.tags[ally]?.allies || []).includes(r.requester) && ctx.game.tags[r.requester]?.alive
    && !targetGate(ctx, r.requester, ally, r.kind, r.province, sharedWar(ctx, r.requester, ally, r.warId)))
    .map(r => ({ id: r.id, requester: r.requester, kind: r.kind, province: r.province, warId: r.warId,
      expires: r.expires, priority: r.kind === 'relieve' ? 80 : r.kind === 'defend' ? 65 : 45, reason: r.reason }));
}
export function monthlyAlliedOrders(ctx) {
  const s = ledger(ctx), now = month(ctx); if (s.lastMonth === now) return; s.lastMonth = now;
  for (const r of s.requests) {
    if (!active(r)) continue;
    const finish = (status, reason) => { r.status = status; r.reason = reason; r.closed = now; };
    const w = sharedWar(ctx, r.requester, r.ally, r.warId), p = ctx.byId(r.province);
    if (!w) { finish('completed', 'The shared war has ended.'); continue; }
    if (!(ctx.game.tags[r.requester]?.allies || []).includes(r.ally) || !(ctx.game.tags[r.ally]?.allies || []).includes(r.requester)
      || !ctx.game.tags[r.ally]?.alive || !ctx.game.tags[r.requester]?.alive) { finish('cancelled', 'The alliance or participating court no longer exists.'); continue; }
    if (r.expires <= now) { finish('expired', 'The six-month commitment has ended.'); continue; }
    if (!p || p.impassable) { finish('cancelled', 'The objective no longer exists.'); continue; }
    const complete = completedReason(ctx, r, p);
    if (complete) {
      finish('completed', complete);
      if (r.kind === 'relieve' && (r.participated || standing(ctx, r.ally).some(a => a.prov === p.id))) rememberCourtEvent(ctx, r.requester, r.ally, 'rescued', { province: p.id });
      continue;
    }
    const targetWhy = targetGate(ctx, r.requester, r.ally, r.kind, r.province, w);
    if (targetWhy) { r.status = 'suspended'; r.reason = targetWhy; delete r.arrived; continue; }
    const why = temporaryGate(ctx, r.ally);
    if (why) { r.status = 'suspended'; r.reason = why; delete r.arrived; continue; }
    const army = standing(ctx, r.ally).find(a => a.prov === r.province || a.path?.includes(r.province));
    if (army?.prov === r.province) {
      r.status = 'holding'; r.reason = 'Allied troops have reached the requested objective.'; r.arrived ??= now;
      r.participated = true;
      if (r.kind === 'defend' && now - r.arrived >= 2) finish('completed', 'Allied troops held the defensive objective for two months.');
    } else if (army) { delete r.arrived; r.status = 'marching'; r.reason = 'An allied army is marching toward the objective.'; }
    else { delete r.arrived; r.status = 'accepted'; r.reason = 'The objective remains with their commanders; safe operations and home defense take precedence.'; }
  }
  s.requests = s.requests.filter(r => active(r) || n(r.closed) > now - 12).slice(-80);
}
