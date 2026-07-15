// Timed military recruitment. Every province owns one FIFO queue shared by
// land regiments, warships, and air wings, so repeated clicks never conjure a
// stack of units on the same date. The main clock is the only caller of the
// monthly advance; pausing therefore freezes every muster and fitting-out.

function num(v, d = 0) { return Number.isFinite(v) ? v : d; }

export function unitRecruitMonths(ctx, type) {
  const times = ctx && ctx.DEFINES && ctx.DEFINES.BASE && ctx.DEFINES.BASE.unitRecruitMonths;
  const fallback = { inf: 2, cav: 3, ship: 6, wing: 4 };
  return Math.max(1, Math.round(num(times && times[type], fallback[type] || 2)));
}

export function queueUnitRecruitment(ctx, tag, provId, type, details = {}) {
  const g = ctx.game;
  const p = ctx.byId(provId);
  if (!p) return null;
  if (!Array.isArray(p.unitQueue)) p.unitQueue = [];
  if (!Number.isFinite(g.nextRecruitId)) g.nextRecruitId = 1;
  const months = unitRecruitMonths(ctx, type);
  const order = {
    id: g.nextRecruitId++, tag, type,
    monthsLeft: months, totalMonths: months,
    cost: Math.max(0, num(details.cost)),
    manpower: Math.max(0, num(details.manpower)),
    gen: Math.max(0, num(details.gen) | 0),
    stalled: '',
  };
  p.unitQueue.push(order);
  if (ctx.bus) ctx.bus.emit('recruitmentQueued', { provId, order: { ...order }, position: p.unitQueue.length });
  return order;
}

export function queuedUnitCount(ctx, provId, type, tag) {
  const p = ctx.byId(provId);
  const q = p && Array.isArray(p.unitQueue) ? p.unitQueue : [];
  return q.reduce((n, row) => n + (row && (!type || row.type === type) && (!tag || row.tag === tag) ? 1 : 0), 0);
}

export function queuedUnitsOf(ctx, tag, types) {
  const wanted = Array.isArray(types) ? new Set(types) : null;
  let n = 0;
  for (let i = 1; i < ctx.game.provinces.length; i++) {
    const p = ctx.game.provinces[i];
    const q = p && Array.isArray(p.unitQueue) ? p.unitQueue : [];
    for (const row of q) {
      if (row && row.tag === tag && (!wanted || wanted.has(row.type))) n++;
    }
  }
  return n;
}

function hasBuilding(p, key) {
  return !!(p && Array.isArray(p.buildings) && p.buildings.indexOf(key) >= 0);
}

function completeLand(ctx, p, order) {
  const g = ctx.game;
  const regSize = Math.max(1, num(ctx.DEFINES && ctx.DEFINES.BASE && ctx.DEFINES.BASE.regSize, 1000));
  const host = Object.values(g.armies || {}).find((a) => a && a.tag === order.tag && a.prov === p.id
    && !a.retreating && !a.inBattle && !a.aboard && num(a.gen) === num(order.gen));
  if (host) {
    if (!host.regiments) host.regiments = { inf: 0, cav: 0 };
    host.regiments[order.type] = num(host.regiments[order.type]) + 1;
    host.men = num(host.men) + regSize;
    return { ok: true, name: host.name || 'The local army' };
  }
  const id = ctx.helpers && typeof ctx.helpers.spawnArmy === 'function'
    ? ctx.helpers.spawnArmy(ctx, order.tag, p.name, {
      inf: order.type === 'inf' ? 1 : 0,
      cav: order.type === 'cav' ? 1 : 0,
      gen: order.gen,
      name: 'Levy of ' + p.name,
    }) : 0;
  const army = id && g.armies ? g.armies[id] : null;
  return id ? { ok: true, name: (army && army.name) || ('Levy of ' + p.name) }
    : { ok: false, why: 'the regiment could not assemble' };
}

function completeShip(ctx, p, order) {
  const g = ctx.game;
  if (!hasBuilding(p, 'shipyard')) return { ok: false, stall: true, why: 'the shipyard is unavailable' };
  let fleet = Object.values(g.fleets || {}).find((f) => f && f.tag === order.tag && f.prov === p.id
    && !(f.path && f.path.length) && num(f.gen) === num(order.gen));
  if (!fleet) {
    if (!g.fleets) g.fleets = {};
    if (!Number.isFinite(g.nextFleetId)) g.nextFleetId = 1;
    fleet = {
      id: g.nextFleetId++, tag: order.tag, prov: p.id, ships: 0,
      path: [], moveDaysLeft: 0, hopTotal: 0,
      name: 'Fleet of ' + p.name,
      gen: order.gen, admiral: null,
    };
    g.fleets[fleet.id] = fleet;
  }
  fleet.ships = num(fleet.ships) + 1;
  return { ok: true, name: fleet.name };
}

function completeWing(ctx, p, order) {
  const g = ctx.game;
  if (!hasBuilding(p, 'airfield')) return { ok: false, stall: true, why: 'the airfield is unavailable' };
  const cap = Math.max(1, num(ctx.DEFINES && ctx.DEFINES.AIR && ctx.DEFINES.AIR.wingsPerField, 2));
  const here = Object.values(g.airwings || {}).filter((w) => w && w.prov === p.id).length;
  if (here >= cap) return { ok: false, stall: true, why: 'the hangars are full' };
  if (!g.airwings) g.airwings = {};
  if (!Number.isFinite(g.nextWingId)) g.nextWingId = 1;
  const id = g.nextWingId++;
  const nth = Object.values(g.airwings).filter((w) => w && w.tag === order.tag).length + 1;
  const wing = { id, tag: order.tag, prov: p.id, name: 'No. ' + nth + ' Squadron' };
  g.airwings[id] = wing;
  return { ok: true, name: wing.name };
}

function completionText(type, name, place) {
  if (type === 'ship') return (name || 'A fleet') + ' receives a new warship at ' + place + '.';
  if (type === 'wing') return (name || 'A squadron') + ' is ready for operations from ' + place + '.';
  return (name || 'A local army') + ' receives its new regiment at ' + place + '.';
}

// One order per province advances each month. Later entries do not count down
// until every order ahead of them has finished.
export function monthlyRecruitment(ctx) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || !Array.isArray(p.unitQueue) || !p.unitQueue.length) continue;
    const order = p.unitQueue[0];
    const t = order && g.tags[order.tag];
    if (!order || !t || !t.alive || p.owner !== order.tag) {
      p.unitQueue.shift();
      continue;
    }
    if (p.controller !== order.tag || p.siege) {
      order.stalled = p.siege ? 'Under siege' : 'Enemy occupation';
      continue;
    }
    if (order.type === 'ship' && !hasBuilding(p, 'shipyard')) {
      order.stalled = 'Shipyard unavailable';
      continue;
    }
    if (order.type === 'wing' && !hasBuilding(p, 'airfield')) {
      order.stalled = 'Airfield unavailable';
      continue;
    }
    order.stalled = '';
    order.monthsLeft = Math.max(0, num(order.monthsLeft, 1) - 1);
    if (order.monthsLeft > 0) continue;
    let result = null;
    if (order.type === 'inf' || order.type === 'cav') result = completeLand(ctx, p, order);
    else if (order.type === 'ship') result = completeShip(ctx, p, order);
    else if (order.type === 'wing') result = completeWing(ctx, p, order);
    else result = { ok: false, why: 'unknown unit pattern' };
    if (!result.ok && result.stall) {
      order.stalled = result.why || 'Waiting';
      continue;
    }
    p.unitQueue.shift();
    if (!result.ok) continue;
    if (ctx.bus) {
      ctx.bus.emit('recruitmentComplete', { provId: p.id, order: { ...order }, name: result.name || '' });
      if (order.tag === g.playerTag) {
        ctx.bus.emit('notify', {
          title: 'Recruitment complete',
          text: completionText(order.type, result.name, p.name),
          type: 'good', provName: p.name,
        });
      }
    }
  }
}
