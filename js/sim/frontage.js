// Shared by real battles, their forecasts, and the battle window.
const n = (v, d = 0) => Number.isFinite(v) ? v : d;
const TERRAIN_WIDTH = { mountains: 8, hills: 12, marsh: 10, forest: 12, desert: 16, coast: 18, farmland: 22, steppe: 24 };

export function combatFrontage(ctx, provId) {
  const p = ctx.byId(provId);
  const rules = ctx.DEFINES.COMBAT || {};
  const regSize = n(ctx.DEFINES.BASE && ctx.DEFINES.BASE.regSize, 1000);
  const width = Math.max(1, n((rules.terrainWidth || {})[p && p.terrain], TERRAIN_WIDTH[p && p.terrain] || 20));
  return { width, capacity: width * regSize, terrain: (p && p.terrain) || 'open ground' };
}

export function fieldStrength(men, capacity) {
  const total = Math.max(0, n(men));
  const engaged = Math.min(total, capacity);
  // Reserves replace casualties each day. They suffer a tenth of the morale
  // shock of the line; this fraction is also used by the expected-dice model.
  return { total, engaged, reserves: total - engaged,
    moraleShare: total > 0 ? (engaged + (total - engaged) * 0.1) / total : 1 };
}
