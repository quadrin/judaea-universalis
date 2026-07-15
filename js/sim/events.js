// Judaea Universalis — event engine (SPEC §6.5). Event objects come from the
// content package via ctx.events; effects run through ctx.helpers. DOM-free.

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/events]', ...args);
}

function eventList(ctx) {
  return Array.isArray(ctx.events) ? ctx.events : [];
}
export function findEventById(ctx, id) {
  // Runtime-synthesized events (succession cards) live in ctx.dynEvents.
  if (ctx.dynEvents && ctx.dynEvents.has(id)) return ctx.dynEvents.get(id);
  for (const ev of eventList(ctx)) if (ev && ev.id === id) return ev;
  return null;
}
// Calendar month index with no year zero. Keeping this shared by the scheduler
// and the "world keeps moving" clock prevents a BCE/CE crossing from gaining a
// phantom year.
export function eventMonthIndex(y, m) {
  const year = y > 0 ? y - 1 : y;
  return year * 12 + (m - 1);
}
function monthIndex(y, m) { return eventMonthIndex(y, m); }

// The next dated development that belongs to world history rather than the
// bookmark's local script. `world: true` is intentionally metadata only: the
// event still goes through the ordinary deterministic scheduler, save state,
// modal queue and multiplayer replication.
export function nextWorldEvent(ctx) {
  const g = ctx && ctx.game;
  if (!g) return null;
  const now = monthIndex(g.date.y, g.date.m);
  let best = null;
  for (const ev of eventList(ctx)) {
    if (!ev || ev.world !== true || !ev.date || (g.firedEvents && g.firedEvents[ev.id])) continue;
    const at = monthIndex(ev.date.y, ev.date.m);
    if (at < now || (best && best.at <= at)) continue;
    best = { ev, at };
  }
  if (!best) return null;
  return {
    id: best.ev.id,
    label: best.ev.worldLabel || best.ev.title || best.ev.id,
    date: { ...best.ev.date },
    months: best.at - now,
  };
}
function canFire(ctx, ev) {
  const g = ctx.game;
  if (!ev || !ev.id || !Array.isArray(ev.options) || !ev.options.length) return false;
  if (ev.once !== false && g.firedEvents[ev.id]) return false;
  // Repeatable events honor a per-event cooldown (stored as the first month
  // index at which they may fire again).
  if (ev.once === false && Number.isFinite(ev.cooldownMonths)) {
    const until = g.flags._evCd && g.flags._evCd[ev.id];
    if (Number.isFinite(until) && monthIndex(g.date.y, g.date.m) < until) return false;
  }
  // never double-queue the same event
  for (const pe of g.pendingEvents) if (pe.eventId === ev.id) return false;
  return true;
}

// Fire an event now (popup for the player, silent auto-pick for the AI).
export function fireEvent(ctx, ev) {
  const g = ctx.game;
  if (!ev || !ev.id) return;
  if (ev.once !== false) g.firedEvents[ev.id] = true;
  else {
    g.firedEvents[ev.id] = (g.firedEvents[ev.id] || 0) + 1;
    if (Number.isFinite(ev.cooldownMonths)) {
      if (!g.flags._evCd) g.flags._evCd = {};
      g.flags._evCd[ev.id] = monthIndex(g.date.y, g.date.m) + Math.max(1, ev.cooldownMonths | 0);
    }
  }
  const player = g.playerTag;
  const audience = (ev.forTag === 'both' || ev.forTag === 'player') ? player : ev.forTag;
  const playerSees = audience === player;
  if (playerSees) {
    const instanceId = g.nextEventInstance++;
    g.pendingEvents.push({ instanceId, eventId: ev.id, forTag: audience });
    if (!g.paused) { g.paused = true; ctx.bus.emit('pause', true); }
    ctx.bus.emit('event', { instanceId, event: ev, forTag: audience });
    return;
  }
  // AI resolves silently
  let idx = 0;
  try {
    idx = typeof ev.aiOption === 'function' ? (ev.aiOption(ctx) | 0) : (ev.aiOption | 0);
  } catch (e) { warnOnce('aiopt:' + ev.id, 'aiOption threw for', ev.id, e); }
  const opt = ev.options[idx] || ev.options[0];
  try {
    if (opt && typeof opt.effects === 'function') opt.effects(ctx);
  } catch (e) { warnOnce('fx:' + ev.id, 'event effects threw for', ev.id, e); }
  if (ev.major) {
    ctx.bus.emit('notify', {
      title: ev.title || ev.id,
      text: opt && opt.label ? opt.label : String(ev.desc || '').slice(0, 160),
      type: 'info',
    });
  }
}

// Dated events: fire once their month arrives (catches up if a month was skipped).
export function checkDateEvents(ctx) {
  const g = ctx.game;
  const now = monthIndex(g.date.y, g.date.m);
  for (const ev of eventList(ctx)) {
    try {
      if (!ev || !ev.date || !canFire(ctx, ev)) continue;
      if (monthIndex(ev.date.y, ev.date.m) > now) continue;
      fireEvent(ctx, ev);
    } catch (e) { warnOnce('date:' + (ev && ev.id), 'date event check failed', e); }
  }
}

// Trigger-based events: checked monthly, gated by optional `chance`.
export function checkTriggeredEvents(ctx) {
  for (const ev of eventList(ctx)) {
    try {
      if (!ev || typeof ev.trigger !== 'function' || ev.date || !canFire(ctx, ev)) continue;
      let ok = false;
      try { ok = !!ev.trigger(ctx); } catch (e) { warnOnce('trig:' + ev.id, 'trigger threw for', ev.id, e); }
      if (!ok) continue;
      if (Number.isFinite(ev.chance) && !ctx.rng.chance(ev.chance)) continue;
      fireEvent(ctx, ev);
    } catch (e) { warnOnce('trigloop:' + (ev && ev.id), 'trigger event check failed', e); }
  }
}

// Player picked an option in the modal.
export function resolveEventOption(ctx, instanceId, idx) {
  const g = ctx.game;
  const i = g.pendingEvents.findIndex((pe) => pe.instanceId === instanceId);
  if (i < 0) return;
  const pe = g.pendingEvents[i];
  g.pendingEvents.splice(i, 1);
  const ev = findEventById(ctx, pe.eventId);
  if (ev) {
    const opt = ev.options[idx] || ev.options[0];
    try {
      if (opt && typeof opt.effects === 'function') opt.effects(ctx);
    } catch (e) { warnOnce('rfx:' + pe.eventId, 'event effects threw for', pe.eventId, e); }
  } else {
    warnOnce('miss:' + pe.eventId, 'resolveEventOption: unknown event', pe.eventId);
  }
  ctx.bus.emit('eventResolved', { instanceId });
}
