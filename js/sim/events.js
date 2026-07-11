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
  for (const ev of eventList(ctx)) if (ev && ev.id === id) return ev;
  return null;
}
function canFire(ctx, ev) {
  if (!ev || !ev.id || !Array.isArray(ev.options) || !ev.options.length) return false;
  if (ev.once !== false && ctx.game.firedEvents[ev.id]) return false;
  // never double-queue the same event
  for (const pe of ctx.game.pendingEvents) if (pe.eventId === ev.id) return false;
  return true;
}
function monthIndex(y, m) { return y * 12 + (m - 1); }

// Fire an event now (popup for the player, silent auto-pick for the AI).
export function fireEvent(ctx, ev) {
  const g = ctx.game;
  if (!ev || !ev.id) return;
  if (ev.once !== false) g.firedEvents[ev.id] = true;
  else g.firedEvents[ev.id] = (g.firedEvents[ev.id] || 0) + 1;
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
