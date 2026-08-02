// Judaea Universalis — event engine (SPEC §6.5). Event objects come from the
// content package via ctx.events; effects run through ctx.helpers. DOM-free.

import { noteEventChoice, noteRetired } from './divergence.js';
import { livingTag } from './military.js';

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
function skipEvent(ctx, ev, why) {
  if (ev && ev.id && ev.once !== false) ctx.game.firedEvents[ev.id] = true;
  // A page of the record that never got written (SPEC §89).
  try { noteRetired(ctx, ev, why); } catch (e) { warnOnce('retire:' + (ev && ev.id), e); }
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
  // SPEC §121 — the generation horizon. A chapter may declare the year after
  // which its own undated cards stop belonging to anybody. Without it, a
  // triggered card with no window is timeless in the literal sense: a 167 game
  // played forward was seen firing `ev_rededication`, `ev_akra_falls` and
  // `ev_bronze_tablets` — the rededication of the Temple, the fall of the Akra
  // and the tablets on Mount Zion — in 49 BCE, a hundred and eighteen years
  // after the revolt they belong to, because their conditions were finally
  // satisfied by some later war. Thirty-two of the 167 chain's forty-four
  // triggered cards carry no window at all, so windowing them one at a time was
  // thirty-two judgement calls; this is the one that covers them.
  //
  // Dated cards are exempt: a date IS a window. So is any card that declares
  // its own maxYear, which is how a chapter says "this one legitimately runs
  // late" — the 132 chapter's fourth-century arcs do exactly that.
  if (!ev.date && !Number.isFinite(ev.maxYear)) {
    const horizon = ctx.bookmark && ctx.bookmark.generationHorizon;
    if (Number.isFinite(horizon) && g.date.y > horizon) return false;
  }
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

// The answers a card offers in THIS world (SPEC §128). Returns the original
// indices of the options whose `when(ctx)` holds — every index when no option
// declares one, which is every card the game shipped before this.
export function allowedOptions(ctx, ev) {
  const opts = (ev && ev.options) || [];
  let gated = false;
  for (const o of opts) if (o && typeof o.when === 'function') { gated = true; break; }
  if (!gated) return null;
  const out = [];
  for (let i = 0; i < opts.length; i++) {
    const o = opts[i];
    if (!o) continue;
    if (typeof o.when !== 'function') { out.push(i); continue; }
    let open = false;
    try { open = !!o.when(ctx); } catch (e) { warnOnce('optwhen:' + ev.id + ':' + i, 'option when() threw', e); }
    if (open) out.push(i);
  }
  // A card nobody can answer would hold the pause open forever.
  if (!out.length) { warnOnce('optnone:' + ev.id, 'every option closed for', ev.id); return null; }
  return out.length === opts.length ? null : out;
}

// Snap an index onto the mask: the AI's pick, a notice's fixed course and a
// player's click all go through here, so none of them can take a road the
// world does not offer.
function maskIdx(allowed, idx, count) {
  const i = Math.max(0, Math.min(count - 1, idx | 0));
  if (!allowed || !allowed.length) return i;
  return allowed.indexOf(i) >= 0 ? i : allowed[0];
}

// The recorded course: the option `aiOption` names (an index, or a function of
// the world), snapped onto the mask.
function recordedCourse(ctx, ev, allowed) {
  let idx = 0;
  try {
    idx = typeof ev.aiOption === 'function' ? (ev.aiOption(ctx) | 0) : (ev.aiOption | 0);
  } catch (e) { warnOnce('aiopt:' + ev.id, 'aiOption threw for', ev.id, e); }
  return maskIdx(allowed, idx, ev.options.length);
}

// The course a card takes when nobody at this table decides it (SPEC §211).
// A `roll: true` card is a foreign court's own question whose answers differ
// in cost and flavour rather than in what happens, so the campaign's own
// seeded stream answers it: the recorded course carries `EVENT_ROLL_RECORDED`
// of the weight and the roads the chronicles did not take split the rest. The
// stream is only touched for a card that asks for it, so every existing save,
// replay and multiplayer relay draws exactly the numbers it drew before.
function courseFor(ctx, ev, allowed) {
  const rec = recordedCourse(ctx, ev, allowed);
  if (ev.roll !== true || !ctx.rng) return rec;
  const pool = (allowed && allowed.length ? allowed.slice() : ev.options.map((_, i) => i))
    .filter((i) => ev.options[i]);
  const others = pool.filter((i) => i !== rec);
  if (!others.length) return rec;
  const w = Number(ctx.DEFINES && ctx.DEFINES.EVENT_ROLL_RECORDED);
  const weight = Number.isFinite(w) ? Math.max(0, Math.min(1, w)) : 0.667;
  if (ctx.rng.chance(weight)) return rec;
  return others[ctx.rng.int(others.length)];
}

// Fire an event now (popup for the player, silent auto-pick for the AI).
export function fireEvent(ctx, ev) {
  const g = ctx.game;
  if (!ev || !ev.id) return;
  if (!requiredWarActive(ctx, ev)) {
    if (requiredWarSettled(ctx, ev)) skipEvent(ctx, ev, 'the war it belonged to was already settled');
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
  // A card is addressed to a court, not to three letters (SPEC §135). A realm
  // that has taken a greater crown is still the court the chapter was written
  // for — the Hasmonean kingdom restored out of Hyrcanus is who `forTag: 'HYR'`
  // means — so the audience is resolved through the forwarding address before
  // it is compared to the chair the player is sitting in.
  const audience = (ev.forTag === 'both' || ev.forTag === 'player')
    ? player : livingTag(ctx, ev.forTag);
  const playerSees = audience === player;
  // Which answers this world actually offers (SPEC §128). An option may
  // declare `when(ctx)`, and a card whose answers depend on the state is a
  // different card from one that lists every answer and prices the impossible
  // ones out: the accession of a house with no Davidic marriage available
  // should not show marrying into David greyed out, it should not show it. The
  // mask is computed ONCE, here, at the moment the card fires — an option that
  // was open when the question was asked stays open while the player thinks
  // about it, which is the same rule `decider` already follows.
  //
  // Indices are the originals throughout. The modal renders a subset and keeps
  // the numbering, resolveEventOption refuses anything outside the mask, and a
  // card whose every option is closed falls back to offering all of them,
  // because an unanswerable card would hang the pause.
  const allowed = allowedOptions(ctx, ev);
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
    // A court whose NAME depends on how the century went (SPEC §105) may
    // declare its decider as a function of the world: Damascus answers to the
    // mandate republic, to the republic that left the union, or to the union
    // itself, and the card is a notice either way. A static string still
    // works exactly as before.
    //
    // SPEC §211 adds the second half of the same thought: a card marked
    // `roll: true` is a foreign question this table cannot answer at all, so
    // it is a notice even where an erased court would have handed the choice
    // back — a Caliphate rewritten out of the world does not make the
    // standardizing of the Qur'an the player's decision. The course is drawn
    // rather than pinned; the modal is the same single button either way.
    let decider = ev.decider;
    if (typeof decider === 'function') {
      try { decider = decider(ctx); } catch (e) { warnOnce('decid:' + ev.id, 'decider() threw for', ev.id, e); decider = null; }
    }
    if (decider) decider = livingTag(ctx, decider);
    if (decider && decider !== player && (g.tags[decider] || ev.roll === true)) {
      pe.notice = true;
      pe.optIdx = courseFor(ctx, ev, allowed);
      // A court the world no longer knows names nobody; the modal says "another
      // court" rather than three letters out of the era's roster.
      if (g.tags[decider]) pe.decider = decider;
    }
    if (allowed) pe.allowed = allowed.slice();
    g.pendingEvents.push(pe);
    if (!g.paused) { g.paused = true; ctx.bus.emit('pause', true); }
    ctx.bus.emit('event', {
      instanceId, event: ev, forTag: audience,
      notice: !!pe.notice, optIdx: pe.optIdx, decider: pe.decider,
      allowed: pe.allowed,
    });
    return;
  }
  // AI resolves silently — on its recorded course, or on the roll (SPEC §211)
  // where the card says the answer was never anybody's to script.
  const opt = ev.options[courseFor(ctx, ev, allowed)] || ev.options[0];
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
      if (!requiredWarActive(ctx, ev)) { skipEvent(ctx, ev, 'the war it belonged to was already settled'); continue; }
      // A dated chapter may also declare the WORLD it requires (`when`,
      // SPEC §75): if its month arrives in a different world — a court
      // vassalized instead of rival, a dynasty already settled — it retires
      // silently rather than forcing the old rails onto the new map.
      if (typeof ev.when === 'function') {
        let fits = false;
        try { fits = !!ev.when(ctx); } catch (e) { warnOnce('when:' + ev.id, 'when() threw for', ev.id, e); }
        if (!fits) { skipEvent(ctx, ev, 'the world it needed no longer exists'); continue; }
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
        if (requiredWarSettled(ctx, ev)) skipEvent(ctx, ev, 'the war it belonged to was already settled');
        continue;
      }
      let ok = false;
      try { ok = !!ev.trigger(ctx); } catch (e) { warnOnce('trig:' + ev.id, 'trigger threw for', ev.id, e); }
      if (!ok) continue;
      // The years bend the odds (SPEC §170). An event may declare `weather:
      // 'good' | 'bad'` and its monthly chance is multiplied by where the
      // climate cycle currently sits — a wet decade makes bountiful harvests
      // likelier and failed rains rarer, and a dry one does the reverse. An
      // event with no `weather` key is unaffected, which is all but four of
      // them, so this costs one property read on the hot path.
      if (Number.isFinite(ev.chance)) {
        let odds = ev.chance;
        if (ev.weather && ctx.helpers && typeof ctx.helpers.climate === 'function') {
          try { odds *= ctx.helpers.climate(ctx, ev.weather); } catch (e) { /* the years say nothing */ }
        }
        if (!ctx.rng.chance(odds)) continue;
      }
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
    idx = maskIdx(pe.allowed, idx, ev.options.length);
    const opt = ev.options[idx] || ev.options[0];
    try {
      // A battle card may already have been queued behind another modal when
      // peace was signed. It can close harmlessly, but it may not resurrect
      // the concluded campaign through its option effects.
      if (requiredWarActive(ctx, ev) && opt && typeof opt.effects === 'function') opt.effects(ctx);
    } catch (e) { warnOnce('rfx:' + pe.eventId, 'event effects threw for', pe.eventId, e); }
    // The road not taken (SPEC §89): a spine event resolved with anything
    // other than its historical course is a departure from the record, and
    // both halves of it are already on the card. A notice (§70) is not a
    // choice, so it never counts as one.
    if (!pe.notice) {
      try { noteEventChoice(ctx, ev, ev.options[idx] ? idx : 0); }
      catch (e) { warnOnce('div:' + pe.eventId, 'divergence note failed', e); }
    }
  } else {
    warnOnce('miss:' + pe.eventId, 'resolveEventOption: unknown event', pe.eventId);
  }
  ctx.bus.emit('eventResolved', { instanceId });
}
