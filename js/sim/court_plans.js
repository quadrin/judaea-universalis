// Persistent strategic councils. State is plain JSON; all public readers are pure.
const n = (x, d = 0) => Number.isFinite(x) ? x : d;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const month = ctx => { const d = ctx.game.date || { y: 1, m: 1 }; return (d.y > 0 ? d.y - 1 : d.y) * 12 + d.m - 1; };
const human = (ctx, tag) => !ctx.game.tags[tag]?.ai && (tag === ctx.game.playerTag || (ctx.game.humanTags || []).includes(tag));
const living = (ctx, tag) => tag !== 'REB' && !!ctx.game.tags[tag]?.alive;
const blocked = (t, effect) => (t?.modifiers || []).some(m => m?.effects?.[effect]);
const own = (ctx, tag) => (ctx.game.provinces || []).filter(p => p && !p.impassable && p.owner === tag);
const army = (ctx, tag) => Object.values(ctx.game.armies || {}).filter(a => a.tag === tag).reduce((s, a) => s + n(a.men), 0);
const power = (ctx, tag) => army(ctx, tag) + n(ctx.game.tags[tag]?.manpower) * .35;
const hostile = (ctx, a, b) => (ctx.game.tags[a]?.atWarWith || []).includes(b);
const opinion = (ctx, a, b) => n(ctx.game.tags[a]?.opinion?.[b]);
const coast = (ctx, p) => !!ctx.geom?.coastal?.[p.id] || !!p.coastal;
const development = p => n(p.dev?.tax) + n(p.dev?.prod) + n(p.dev?.mp);
const title = (ctx, tag) => ctx.game.tags[tag]?.name || tag;
const provincial = (ctx, id) => ctx.byId?.(id) || ctx.game.provinces.find(p => p?.id === id);
function neighbors(ctx, tag) {
  const result = new Set();
  for (const p of own(ctx, tag)) for (const id of ctx.geom?.neighbors?.[p.id] || []) {
    const q = provincial(ctx, id); if (q && q.owner !== tag && living(ctx, q.owner)) result.add(q.owner);
  }
  return [...result].sort();
}
function truce(ctx, a, b) {
  const d = ctx.game.truces?.[[a, b].sort().join('|')];
  return d && (ctx.game.date.y < d.y || ctx.game.date.y === d.y && ctx.game.date.m < d.m);
}
function commitment(ctx, a, b) {
  const t = ctx.game.tags[a], other = ctx.game.tags[b];
  return (t?.allies || []).includes(b) || (t?.guarantees || []).includes(b) || t?.overlord === b || other?.overlord === a;
}
function rulerProfile(ctx, tag) {
  const t = ctx.game.tags[tag], r = t.ruler || {}, base = ctx.DEFINES?.PERSONALITIES?.[tag] || {};
  const mar = n(r.mar, 2), gov = n(r.gov, 2), infl = n(r.infl, 2);
  const inclination = mar > Math.max(gov, infl) ? 'military' : infl > Math.max(gov, mar) ? 'diplomatic' : 'administrative';
  return { name: r.name || 'Ruling council', inclination,
    aggression: clamp(n(base.aggression, 1) + (mar - gov) * .055, .35, 1.8),
    caution: clamp(n(base.caution, 1) + (gov - mar) * .055, .5, 1.8),
    signature: [r.name || '', mar, gov, infl].join('|') };
}
function domesticProfile(ctx, tag) {
  const t = ctx.game.tags[tag], defs = ctx.bookmark?.factions?.[tag] || [];
  const y = ctx.game.date.y;
  const list = defs.filter(d => (!Number.isFinite(d.fromYear) || y >= d.fromYear) && (!Number.isFinite(d.untilYear) || y < d.untilYear));
  // Authored boons define interests without guessing from faction names.
  const factions = list.map(d => {
    const effects = d.boon?.effects || {}, approval = n(t.factions?.[d.id], n(d.start, 50));
    const military = Math.max(0, n(effects.moraleMult, 1) - 1) + Math.max(0, n(effects.manpowerMult, 1) - 1);
    const commercial = Math.max(0, n(effects.incomeMult, 1) - 1) + Math.max(0, n(effects.tradeMult, 1) - 1);
    return { id: d.id, name: d.name || d.id, approval, interest: military > commercial ? 'security' : commercial > 0 ? 'prosperity' : 'stability' };
  });
  const discontent = factions.filter(f => f.approval < 40);
  return { factions, pressure: discontent.length ? 'stability' : factions.some(f => f.interest === 'prosperity') ? 'prosperity' : 'security',
    reason: discontent.length ? `${discontent.map(f => f.name).join(', ')} demand a period of recovery.` : factions.length ? `${factions.map(f => f.name).join(', ')} influence the council's priorities.` : 'Revenue, provincial control and army losses shape the council’s priorities.' };
}
function memoryWeight(ctx, tag, other) {
  return (ctx.game.tags[tag]?.courtPlan?.memories || []).filter(m => m.other === other && m.expires > month(ctx)).reduce((s, m) => s + n(m.weight), 0);
}
export function rememberCourtEvent(ctx, observer, other, kind, detail = {}) {
  const t = ctx.game.tags[observer]; if (!t || observer === other || !ctx.game.tags[other]) return;
  t.courtPlan ||= { version: 1, goals: [], history: [], memories: [] };
  const weights = { promise_kept: 15, promise_broken: -30, alliance_broken: -20, rescued: 15, abandoned: -25, humiliation: -20, aid: 12, refused: -6, honored: 12, betrayal: -30, peace: 5, attacked: -15, territorial_loss: -20, guarantee_honored: 18, humiliated: -25, abandoned_ally: -25, kept_promise: 15, broken_promise: -30 };
  const at = month(ctx), memories = t.courtPlan.memories ||= [];
  // Multiple hooks for one treaty must not stack the same memory in one month.
  if (memories.some(m => m.other === other && m.kind === kind && m.at === at)) return;
  memories.unshift({ other, kind, at, expires: at + clamp(n(detail.duration, 120), 1, 240), weight: clamp(n(detail.weight, weights[kind] || 0), -40, 25), text: String(detail.text || detail.reason || kind.replaceAll('_', ' ')).slice(0, 180) });
  memories.splice(24);
}
export function courtAttitude(ctx, tag, other) {
  const t = ctx.game.tags[tag], e = ctx.game.tags[other];
  if (!t || !e || tag === other) return { kind: 'neutral', reasons: [] };
  const reasons = [], memory = memoryWeight(ctx, tag, other), relative = power(ctx, other) / Math.max(1000, power(ctx, tag));
  const adjacent = neighbors(ctx, tag).includes(other), goal = t.courtPlan?.goals?.find(g => g.target === other);
  let kind = 'neutral';
  if (hostile(ctx, tag, other)) { kind = 'hostile'; reasons.push('At war'); }
  else if (t.overlord === other) { kind = opinion(ctx, tag, other) + memory < -30 ? 'resentful subject' : 'dependent'; reasons.push('Controls our foreign policy'); }
  else if ((t.allies || []).includes(other)) { kind = goal && ['recover', 'port'].includes(goal.kind) ? 'conflicted ally' : 'friendly'; reasons.push('Treaty partner'); }
  else if (memory <= -15) { kind = 'distrustful'; reasons.push('Previous commitments were broken'); }
  else if (goal && ['recover', 'port'].includes(goal.kind)) { kind = 'rival'; reasons.push('Controls territory this court seeks'); }
  else if (adjacent && relative > 1.6 && opinion(ctx, tag, other) < 25) { kind = 'threatened'; reasons.push('A stronger neighboring power'); }
  else if ((t.courtPlan?.goals || []).some(g => g.kind === 'survive') && relative > 1.4 && opinion(ctx, tag, other) >= 0) { kind = 'prospective protector'; reasons.push('Could deter our stronger neighbors'); }
  else if ((t.guarantees || []).includes(other) || e.overlord === tag) { kind = 'protective'; reasons.push('Responsible for their security'); }
  else if (opinion(ctx, tag, other) + memory >= 40) { kind = 'friendly'; reasons.push('Good relations and reliable dealings'); }
  if (memory > 0) reasons.push('Remembers assistance or honored commitments');
  return { kind, reasons };
}
function candidates(ctx, tag, domestic, ruler) {
  const t = ctx.game.tags[tag], land = own(ctx, tag), borders = neighbors(ctx, tag), at = month(ctx), result = [];
  const add = (kind, score, reason, target = null, province = null) => result.push({ kind, score, reason, target, province, started: at, reviewAt: at + 24, phase: 'preparing' });
  const lost = land.filter(p => p.controller !== tag);
  const net = n(t.income) - n(t.expenses), weak = n(t.maxManpower) > 0 && n(t.manpower) < t.maxManpower * .3;
  if (lost.length || n(t.warExhaustion) > 4 || n(t.stability) < 0 || net < -1 || weak || domestic.pressure === 'stability')
    add('rebuild', 100 + lost.length * 5, lost.length ? 'Restore control of occupied provinces and replenish the army.' : 'Repair finances, manpower and domestic confidence.', null, lost[0]?.id || land[0]?.id || null);
  if (t.overlord) add('independence', opinion(ctx, tag, t.overlord) + memoryWeight(ctx, tag, t.overlord) < -30 ? 82 : 20, 'Seek leverage, partners and greater autonomy from the overlord.', t.overlord);
  const threats = borders.filter(b => !commitment(ctx, tag, b) && power(ctx, b) > Math.max(1000, power(ctx, tag)) * 1.6 && opinion(ctx, b, tag) < 25);
  if (threats.length) add('survive', 90, 'Find protection and fortify the frontier against a stronger neighbor.', threats.sort((a,b) => power(ctx,b)-power(ctx,a) || a.localeCompare(b))[0], land.find(p => [...(ctx.geom?.neighbors?.[p.id] || [])].some(id => threats.includes(provincial(ctx,id)?.owner)))?.id || null);
  for (const client of [...new Set([...(t.guarantees || []), ...Object.keys(ctx.game.tags).filter(k => ctx.game.tags[k]?.overlord === tag)])].sort()) {
    if (living(ctx, client) && (ctx.game.tags[client].atWarWith || []).length) add('protect', 85, 'Honor the security commitment to an endangered partner.', client, land.find(p => [...(ctx.geom?.neighbors?.[p.id] || [])].some(id => provincial(ctx,id)?.owner === client))?.id || land[0]?.id || null);
  }
  if (!blocked(t, 'noOpportunisticWars') && !t.overlord) {
    const claimIds = new Set((t.claims || []).map(Number));
    for (const other of borders) {
      if (commitment(ctx, tag, other)) continue;
      // recordGrudge stores actual lost land under its current taker. A
      // patrimony remains an ambition even when no fabricated claim exists;
      // transferred or returned land cannot create a claim against the old taker.
      const lostIds = new Set(Array.isArray(t.grudges?.[other]?.provs) ? t.grudges[other].provs.map(Number) : []);
      const lands = own(ctx, other).filter(p => [...(ctx.geom?.neighbors?.[p.id] || [])].some(id => provincial(ctx, id)?.owner === tag));
      const claim = lands.filter(p => claimIds.has(p.id) || lostIds.has(p.id)).sort((a,b) => development(b)-development(a) || a.id-b.id)[0];
      if (claim) add('recover', 58 + ruler.aggression * 12, `Recover the ${lostIds.has(claim.id) ? 'lost' : 'claimed'} province of ${claim.name}.`, other, claim.id);
      const port = !land.some(p => coast(ctx,p)) && lands.filter(p => coast(ctx,p)).sort((a,b) => development(b)-development(a) || a.id-b.id)[0];
      if (port && opinion(ctx, tag, other) < 25) add('port', 43 + (domestic.pressure === 'prosperity' ? 15 : 0), `Secure access to the sea through ${port.name}.`, other, port.id);
    }
  }
  const best = [...land].sort((a,b) => Number(coast(ctx,b))-Number(coast(ctx,a)) || development(b)-development(a) || a.id-b.id)[0];
  if (best) add(domestic.pressure === 'prosperity' || land.some(p => coast(ctx,p)) ? 'trade' : 'consolidate', 30 + (ruler.inclination === 'administrative' ? 8 : 0), domestic.pressure === 'prosperity' ? 'Improve revenues and secure the court’s trade routes.' : 'Develop the realm and strengthen provincial administration.', null, best.id);
  return result.sort((a,b) => b.score-a.score || a.kind.localeCompare(b.kind) || String(a.target).localeCompare(String(b.target)) || n(a.province)-n(b.province));
}
function validGoal(ctx, tag, g) {
  if (g.target && !living(ctx,g.target)) return false;
  if (g.kind === 'independence') return ctx.game.tags[tag].overlord === g.target;
  if (['recover','port'].includes(g.kind)) {
    if (g.kind === 'recover' && !(ctx.game.tags[tag].claims || []).map(Number).includes(g.province)
      && !(Array.isArray(ctx.game.tags[tag].grudges?.[g.target]?.provs) && ctx.game.tags[tag].grudges[g.target].provs.map(Number).includes(g.province))) return false;
    return provincial(ctx,g.province)?.owner === g.target && neighbors(ctx,tag).includes(g.target) && !commitment(ctx,tag,g.target);
  }
  if (g.province && provincial(ctx,g.province)?.owner !== tag) return false;
  return true;
}
export function courtBudget(ctx, tag) {
  const t = ctx.game.tags[tag]; if (!t) return { reserve: 0, priority: 'internal', targetProvince: null };
  const goal = t.courtPlan?.goals?.[0];
  const objective = goal?.province ? provincial(ctx,goal.province) : null;
  const targetProvince = objective?.owner === tag ? objective.id : objective
    ? [...(ctx.geom?.neighbors?.[objective.id] || [])].map(id=>provincial(ctx,id)).filter(p=>p?.owner===tag && p.controller===tag).sort((a,b)=>development(b)-development(a) || a.id-b.id)[0]?.id || null
    : null;
  return { reserve: n(t.courtPlan?.reserve), priority: t.courtPlan?.priority || 'internal', targetProvince };
}
export function courtWarPlan(ctx, tag, target) {
  const t = ctx.game.tags[tag], e = ctx.game.tags[target], g = t?.courtPlan?.goals?.find(g => ['recover','port'].includes(g.kind) && g.target === target);
  const reserve = courtBudget(ctx,tag).reserve;
  const fail = reason => ({ wanted: !!g, ready: false, reason, reserve });
  if (!g || !e?.alive) return fail('No territorial objective against this court');
  if (human(ctx,tag) || t.overlord || blocked(t,'aiPassive') || blocked(t,'noOpportunisticWars')) return fail('Foreign policy is constrained');
  if ((t.atWarWith || []).length || truce(ctx,tag,target) || commitment(ctx,tag,target)) return fail('An existing war or treaty prevents an offensive');
  if (t.courtPlan?.goals?.[0]?.kind === 'rebuild' || n(t.stability) < 0 || n(t.warExhaustion) > 4) return fail('Domestic recovery takes priority');
  if (n(t.treasury) < reserve) return fail('Building a campaign reserve');
  if (month(ctx)-g.started < 6) return fail('Gathering intelligence and preparing the campaign');
  if (n(t.maxManpower) && n(t.manpower) < t.maxManpower*.3) return fail('Replenishing manpower');
  const defenders = new Set([target, ...(e.allies || []), ...Object.keys(ctx.game.tags).filter(k => (ctx.game.tags[k]?.guarantees || []).includes(target)), ...(e.overlord ? [e.overlord] : [])]);
  const enemy = [...defenders].filter(k => living(ctx,k)).reduce((s,k) => s+power(ctx,k),0);
  const friends = (t.allies || []).filter(k => living(ctx,k) && !defenders.has(k) && !ctx.game.tags[k].overlord && !(ctx.game.tags[k].atWarWith || []).length && opinion(ctx,k,tag) >= 25);
  const available = power(ctx,tag) + friends.reduce((s,k) => s+power(ctx,k)*.5,0);
  if (army(ctx,tag) < 500 || available < Math.max(1000,enemy)*(1.2*n(t.courtPlan?.ruler?.caution,1))) return fail('Enemy alliances or reserves make the campaign too risky');
  return { wanted: true, ready: true, reason: `Prepared to pursue ${provincial(ctx,g.province)?.name || 'the territorial objective'}`, reserve };
}
export function monthlyCourtPlans(ctx) {
  const at = month(ctx);
  for (const tag of Object.keys(ctx.game.tags).sort()) {
    const t = ctx.game.tags[tag]; if (!living(ctx,tag) || !t.ai || human(ctx,tag)) continue;
    const s = t.courtPlan ||= { version: 1, goals: [], history: [], memories: [] };
    if (s.lastMonth === at) continue;
    s.version = 1; s.goals ||= []; s.history ||= []; s.memories ||= [];
    s.memories = s.memories.filter(m => m.expires > at && living(ctx,m.other)).slice(0,24);
    const ruler = rulerProfile(ctx,tag), domestic = domesticProfile(ctx,tag), changed = s.ruler?.signature !== ruler.signature;
    if (s.ruler && changed) s.history.unshift({ at, kind: 'succession', text: `${ruler.name} reviews the court’s ambitions.` });
    s.ruler = ruler; s.domestic = domestic;
    const options = candidates(ctx,tag,domestic,ruler), best = options[0];
    // Persist objectives through ordinary fluctuations; emergencies or a ruler's
    // review can replace a plan. Completed claims never survive a settlement.
    const old = s.goals.filter(g => validGoal(ctx,tag,g) && (!['survive','protect','rebuild'].includes(g.kind) || options.some(o=>o.kind===g.kind && o.target===g.target)));
    if (old.length !== s.goals.length) s.history.unshift({ at, kind:'resolved', text:'A territorial or diplomatic change resolved an objective.' });
    const emergency = best && ['rebuild','survive','protect'].includes(best.kind) && !old.some(g=>g.kind===best.kind && g.target===best.target);
    if (!old.length || emergency || changed || at >= n(old[0]?.reviewAt,at)) {
      const picked = options.slice(0,2).map(g => {
        const previous = old.find(o=>o.kind===g.kind && o.target===g.target && o.province===g.province);
        return previous ? { ...g, started:previous.started, reviewAt:at+24 } : g;
      });
      if (JSON.stringify(picked.map(g=>[g.kind,g.target,g.province])) !== JSON.stringify(old.map(g=>[g.kind,g.target,g.province])))
        s.history.unshift({ at, kind:'council', text:picked[0]?.reason || 'The court has no viable objective.' });
      s.goals = picked;
    } else s.goals = old;
    const primary = s.goals[0]?.kind;
    s.priority = ['recover','port','independence'].includes(primary) ? 'military' : ['survive','protect'].includes(primary) ? 'defense' : primary === 'rebuild' ? 'recovery' : primary === 'trade' ? 'trade' : 'internal';
    const campaign = s.goals.some(g=>['recover','port','independence','survive','protect'].includes(g.kind));
    s.reserve = Math.round(clamp(Math.max(15,n(t.income)* (campaign ? 8 : 3)) + (campaign ? own(ctx,tag).length*2 : 0),15,450));
    if (s.priority === 'recovery') s.reserve = Math.round(clamp(n(t.income)*6,15,300));
    for (const g of s.goals) g.phase = blocked(t,'aiPassive') ? 'constrained' : ['recover','port'].includes(g.kind) ? (courtWarPlan(ctx,tag,g.target).ready ? 'ready' : 'preparing') : 'pursuing';
    s.attitudes = Object.fromEntries(neighbors(ctx,tag).map(other=>[other,courtAttitude(ctx,tag,other)]));
    s.history.splice(16); s.lastMonth = at;
  }
}
export function courtIntentions(ctx, tag, viewer = ctx.game.playerTag) {
  const t = ctx.game.tags[tag], s = t?.courtPlan;
  if (!t?.alive || !s) return { available:false, visible:false, summary:'The council’s intentions are not yet known.', goals:[], memories:[] };
  const contact = tag === viewer || commitment(ctx,tag,viewer) || commitment(ctx,viewer,tag) || hostile(ctx,tag,viewer) || neighbors(ctx,viewer).includes(tag);
  if (!contact) return { available:true, visible:false, summary:'Establish diplomatic contact to learn this court’s intentions.', goals:[], memories:[] };
  const labels = { recover:'Recover claimed territory', port:'Secure a port', trade:'Develop trade', protect:'Protect a partner', independence:'Seek greater autonomy', survive:'Seek protection', rebuild:'Rebuild the realm', consolidate:'Consolidate the realm' };
  const goals = (s.goals || []).map(g=>({ kind:g.kind, phase:g.phase, reason:g.reason, label:labels[g.kind] || 'Review court policy', detail:g.reason, targetName:g.target ? title(ctx,g.target) : null, provinceName:g.province ? provincial(ctx,g.province)?.name || null : null }));
  return { available:true, visible:true, summary:goals[0]?.reason || 'The court is considering its next policy.', goals,
    attitude:courtAttitude(ctx,tag,viewer), preparation:{ phase:goals[0]?.phase || 'pursuing', label: goals[0]?.phase === 'ready' ? 'Preparations complete' : goals[0]?.phase === 'constrained' ? 'Policy constrained by an existing settlement' : 'Preparing resources and diplomatic support' },
    domestic:s.domestic ? {...s.domestic,summary:s.domestic.reason} : null, ruler:s.ruler ? {name:s.ruler.name,inclination:s.ruler.inclination,label:`${s.ruler.name}: ${s.ruler.inclination} priorities`} : null, memories:(s.memories || []).filter(m=>m.other===viewer && m.expires>month(ctx)).map(m=>({kind:m.kind,label:m.text,text:m.text})),
    history:tag === viewer ? (s.history || []).slice(0,5).map(h=>({...h})) : [] };
}
