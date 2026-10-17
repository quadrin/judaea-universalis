import { recruitRegiment, tagGen, armsGate, issueMove, mergeInto } from './military.js';
import { unitRecruitMonths } from './recruitment.js';

const n = (v, d = 0) => Number.isFinite(v) ? v : d;
const ARMS = ['inf', 'cav', 'art'];

function safeRoute(ctx, tag, from, to) {
  if (from === to) return [];
  const seen = new Set([from]), queue = [from], parent = new Map();
  for (let i = 0; i < queue.length; i++) {
    for (const id of ctx.geom?.neighbors?.[queue[i]] || []) {
      if (seen.has(id)) continue;
      const p = ctx.byId(id);
      if (!p || p.impassable || p.owner !== tag || p.controller !== tag || p.siege) continue;
      parent.set(id, queue[i]);
      if (id === to) {
        const route = []; let step = to;
        while (step !== from) { route.unshift(step); step = parent.get(step); }
        return route;
      }
      seen.add(id); queue.push(id);
    }
  }
  return false;
}

export function armyTemplatePlan(ctx, tag, counts = {}, rallyProv) {
  const t = ctx.game.tags[tag], rally = ctx.byId(Number(rallyProv));
  const fail = why => ({ ok: false, why, orders: [] });
  if (!t?.alive || !rally || rally.owner !== tag || rally.controller !== tag || rally.impassable || rally.siege)
    return fail('Choose a rally province that we own and control, free of siege.');
  if (ARMS.some(k => !Number.isInteger(counts[k] ?? 0) || (counts[k] ?? 0) < 0 || (counts[k] ?? 0) > 100))
    return fail('Each arm must contain a whole number from 0 to 100.');
  const total = ARMS.reduce((s, k) => s + (counts[k] || 0), 0);
  if (total < 1 || total > 100) return fail('A template must contain 1–100 regiments.');
  const armor = tagGen(ctx, tag) >= n(ctx.DEFINES.ARMOR?.minGen, 5);
  if (armor && counts.cav && armsGate(ctx, tag, 'armor')) return fail(armsGate(ctx, tag, 'armor'));
  const costs = ctx.DEFINES.BASE?.regCost || {};
  const costOf = k => armor && k === 'cav' ? n(ctx.DEFINES.ARMOR?.cost, 50) : n(costs[k], k === 'inf' ? 10 : k === 'cav' ? 25 : 18);
  const monthsOf = k => armor && k === 'cav' ? n(ctx.DEFINES.ARMOR?.months, 4) : unitRecruitMonths(ctx, k);
  const cost = ARMS.reduce((s, k) => s + costOf(k) * (counts[k] || 0), 0);
  const manpower = total * n(ctx.DEFINES.BASE?.regSize, 1000);
  const sites = ctx.game.provinces.filter(p => p && !p.impassable && p.owner === tag && p.controller === tag && !p.siege
    && safeRoute(ctx, tag, p.id, rally.id)).map(p => ({ id: p.id, name: p.name,
    wait: (p.unitQueue || []).reduce((s, q) => s + n(q.monthsLeft, 1), 0) }));
  const orders = [];
  for (const type of ARMS) for (let i = 0; i < (counts[type] || 0); i++) {
    sites.sort((a, b) => a.wait - b.wait || a.id - b.id);
    const site = sites[0];
    site.wait += monthsOf(type);
    orders.push({ provId: site.id, name: site.name, type, readyMonth: site.wait });
  }
  const why = n(t.treasury) < cost ? `${cost} talents required; ${Math.floor(n(t.treasury))} available.`
    : n(t.manpower) < manpower ? `${manpower} manpower required; ${Math.floor(n(t.manpower))} available.` : '';
  return { ok: !why, why, orders, cost, manpower, total, rallyProv: rally.id,
    months: Math.max(...orders.map(o => o.readyMonth)), gen: tagGen(ctx, tag) };
}

export function recruitTemplate(ctx, tag, counts, rallyProv) {
  const plan = armyTemplatePlan(ctx, tag, counts, rallyProv);
  if (!plan.ok) return plan;
  const id = ctx.game.nextTemplateId = n(ctx.game.nextTemplateId) + 1;
  for (const order of plan.orders) {
    const result = recruitRegiment(ctx, tag, order.provId, order.type);
    if (!result.ok) throw new Error('Validated muster failed: ' + result.why);
    result.queued.rallyProv = plan.rallyProv;
    result.queued.templateId = id;
  }
  return { ...plan, templateId: id };
}

export function advanceRallies(ctx) {
  const g = ctx.game;
  for (const a of Object.values(g.armies || {})) {
    if (!g.armies[a.id] || !a.rallyProv || a.inBattle || a.retreating || a.aboard || a.path?.length) continue;
    const p = ctx.byId(a.rallyProv);
    if (!p || p.owner !== a.tag || p.controller !== a.tag || p.siege) {
      delete a.rallyProv; delete a.templateId;
      if (a.tag === g.playerTag) ctx.bus.emit('notify', { title: 'Rally interrupted', type: 'bad',
        text: `${a.name}: the rally province is no longer safe.`, category: 'recruitment' });
      continue;
    }
    if (a.prov === p.id) {
      const host = Object.values(g.armies).find(b => b.id !== a.id && b.tag === a.tag && b.templateId === a.templateId
        && b.prov === p.id && !b.inBattle && !b.retreating && !b.path?.length);
      if (host) mergeInto(ctx, a.id, host.id);
    } else {
      const route = safeRoute(ctx, a.tag, a.prov, p.id);
      if (route && issueMove(ctx, a, p.id)) a.path = route;
    }
  }
}
