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

function requiredWarPairs(ev) {
  const req = ev && ev.requiresWar;
  if (!Array.isArray(req) || !req.length) return [];
  if (req.length === 2 && typeof req[0] === 'string' && typeof req[1] === 'string') return [req];
  return req.filter((p) => Array.isArray(p) && p.length === 2
    && typeof p[0] === 'string' && typeof p[1] === 'string');
}
function warPairKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
function pairAtWar(g, a, b) {
  return (g.wars || []).some((w) => w && (
    ((w.attackers || []).includes(a) && (w.defenders || []).includes(b))
    || ((w.attackers || []).includes(b) && (w.defenders || []).includes(a))));
}
function requiredWarActive(ctx, ev) {
  const pairs = requiredWarPairs(ev);
  return !pairs.length || pairs.some(([a, b]) => pairAtWar(ctx.game, a, b));
}
function requiredWarSettled(ctx, ev) {
  const book = ctx.game.flags && ctx.game.flags._settledWars;
  return !!book && requiredWarPairs(ev).some(([a, b]) => !!book[warPairKey(a, b)]);
}
function skipEvent(ctx, ev) {
  if (ev && ev.id && ev.once !== false) ctx.game.firedEvents[ev.id] = true;
}

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
    if (!requiredWarActive(ctx, ev) && requiredWarSettled(ctx, ev)) continue;
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
  // Era window (SPEC §52): an event may declare the years it belongs to
  // (BCE years are negative). Ancient omens stop stalking 1948, and modern
  // incidents never haunt the Hasmoneans. Events without bounds are timeless.
  if (Number.isFinite(ev.minYear) && g.date.y < ev.minYear) return false;
  if (Number.isFinite(ev.maxYear) && g.date.y > ev.maxYear) return false;
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
  if (!requiredWarActive(ctx, ev)) {
    if (requiredWarSettled(ctx, ev)) skipEvent(ctx, ev);
    return;
  }
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
    const pe = { instanceId, eventId: ev.id, forTag: audience };
    // A foreign court's decision is not ours to make (SPEC §70): when the
    // event declares a `decider` and the player is not that court, the card
    // arrives as a NOTICE — the decider's own (historical, aiOption) course
    // is fixed now and stored on the pending entry, and the modal shows one
    // acknowledging button instead of a choice. If the decider tag has left
    // the world (a formable rewrote it), the choice falls back to the player —
    // whoever inherited that throne is the closest thing it has to a court.
    if (ev.decider && ev.decider !== player && g.tags[ev.decider]) {
      let idx = 0;
      try {
        idx = typeof ev.aiOption === 'function' ? (ev.aiOption(ctx) | 0) : (ev.aiOption | 0);
      } catch (e) { warnOnce('decider:' + ev.id, 'aiOption threw for', ev.id, e); }
      pe.notice = true;
      pe.optIdx = Math.max(0, Math.min(ev.options.length - 1, idx));
      pe.decider = ev.decider;
    }
    g.pendingEvents.push(pe);
    if (!g.paused) { g.paused = true; ctx.bus.emit('pause', true); }
    ctx.bus.emit('event', {
      instanceId, event: ev, forTag: audience,
      notice: !!pe.notice, optIdx: pe.optIdx, decider: pe.decider,
    });
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
      // A dated battlefield chapter is a deadline, not a command to undo a
      // treaty. Once its month arrives without the required war, retire it.
      if (!requiredWarActive(ctx, ev)) { skipEvent(ctx, ev); continue; }
      // A dated chapter may also declare the WORLD it requires (`when`,
      // SPEC §75): if its month arrives in a different world — a court
      // vassalized instead of rival, a dynasty already settled — it retires
      // silently rather than forcing the old rails onto the new map.
      if (typeof ev.when === 'function') {
        let fits = false;
        try { fits = !!ev.when(ctx); } catch (e) { warnOnce('when:' + ev.id, 'when() threw for', ev.id, e); }
        if (!fits) { skipEvent(ctx, ev); continue; }
      }
      fireEvent(ctx, ev);
    } catch (e) { warnOnce('date:' + (ev && ev.id), 'date event check failed', e); }
  }
}

// Trigger-based events: checked monthly, gated by optional `chance`.
export function checkTriggeredEvents(ctx) {
  for (const ev of eventList(ctx)) {
    try {
      if (!ev || typeof ev.trigger !== 'function' || ev.date || !canFire(ctx, ev)) continue;
      if (!requiredWarActive(ctx, ev)) {
        // Triggered battle phases may wait for the front to develop, but a
        // recorded settlement permanently cancels the stale canonical phase.
        if (requiredWarSettled(ctx, ev)) skipEvent(ctx, ev);
        continue;
      }
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
    // A notice card (foreign decider, SPEC §70) applies the course fixed at
    // fire time no matter which button the UI reports — acknowledging is not
    // choosing.
    if (pe.notice) idx = Number.isFinite(pe.optIdx) ? pe.optIdx : 0;
    const opt = ev.options[idx] || ev.options[0];
    try {
      // A battle card may already have been queued behind another modal when
      // peace was signed. It can close harmlessly, but it may not resurrect
      // the concluded campaign through its option effects.
      if (requiredWarActive(ctx, ev) && opt && typeof opt.effects === 'function') opt.effects(ctx);
    } catch (e) { warnOnce('rfx:' + pe.eventId, 'event effects threw for', pe.eventId, e); }
  } else {
    warnOnce('miss:' + pe.eventId, 'resolveEventOption: unknown event', pe.eventId);
  }
  ctx.bus.emit('eventResolved', { instanceId });
}
