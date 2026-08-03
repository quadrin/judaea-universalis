// Small, DOM-free multiplayer state transitions. Keeping these outside main.js
// makes chair changes testable without standing up two browsers and a data channel.

// Run a guest's order under that guest's crown, and let NOTHING out until the
// crown is back where it belongs (SPEC §216).
//
// This is the shape of the bug a real table reported as "my friend spent money
// and it spent my money", and it was never the money: the order already ran on
// the guest's realm, and smoke143 proves that action by action. It was the
// SCREEN. Every action ends by emitting `actionTaken`; `ui.js` answers that by
// refreshing the topbar, the realm panel, the outliner and the nation panel,
// and all four draw whichever realm `game.playerTag` names. Fired from inside
// the swap, they drew the GUEST's — so the host watched their own treasury and
// their own monarch points turn into somebody else's every time their friend
// did anything at all.
//
// So the swap holds the bus. `notify` is the guest's own news and goes back to
// them; everything else waits in `replay()`, which the caller runs once it is
// sitting down again. Nothing on this bus feeds an answer back into the action,
// so the delay changes nothing except who the screen believes it is.
export function runUnderChair({ game, bus, chair, run, onError }) {
  const notify = [];
  const queued = [];
  const origEmit = bus.emit.bind(bus);
  const prev = game.playerTag;
  bus.emit = (ev, payload) => {
    if (ev === 'notify') { notify.push(payload || {}); return undefined; }
    queued.push([ev, payload]);
    return undefined;
  };
  game.playerTag = chair;
  try {
    run();
  } catch (e) {
    if (onError) onError(e);
  } finally {
    // A formable may replace the commanded tag while the order runs. Restore
    // the old chair only if it still exists; `tagSwitched` remaps the guest.
    const back = restoreHostChair(game, prev, chair);
    if (back) game.playerTag = back;
    bus.emit = origEmit;
  }
  return {
    notify,
    replay() {
      for (const [ev, payload] of queued) {
        try { origEmit(ev, payload); } catch (e) { if (onError) onError(e); }
      }
      return queued.length;
    },
  };
}

export function restoreHostChair(game, previousTag, commandedTag) {
  if (!game || !game.tags) return null;
  if (previousTag && game.tags[previousTag]) return previousTag;
  if (commandedTag && game.tags[commandedTag]) return commandedTag;
  return game.playerTag && game.tags[game.playerTag] ? game.playerTag : null;
}

export function remapGuestChairs(guests, from, to) {
  if (!Array.isArray(guests) || typeof from !== 'string' || typeof to !== 'string') return 0;
  let changed = 0;
  for (const guest of guests) {
    if (!guest || guest.tag !== from) continue;
    guest.tag = to;
    if (guest.peer && typeof guest.peer.send === 'function') {
      guest.peer.send({ t: 'chair', from, tag: to });
    }
    changed++;
  }
  return changed;
}

export function resolveSnapshotChair(tags, assignedTag, snapshotTag) {
  if (!tags || typeof tags !== 'object') return null;
  if (assignedTag && tags[assignedTag]) return assignedTag;
  if (snapshotTag && tags[snapshotTag]) return snapshotTag;
  return null;
}

// ---------------------------------------------------------------- the chairs --
// SPEC §216. A chapter's `playableTags` is its list of Jewish standards, and
// any of them may be taken by a guest instead of sharing the host's. The
// lobby asks these two questions and nothing else does, which is what makes
// the answers testable without two browsers and a data channel.

// Which thrones this campaign can seat, as tags. A campaign lifted off the
// shelf (`tags` given) can only seat the ones its world still has standing:
// a chapter's second brother may have been annexed six years before the save
// was written, and a chair nobody can sit in must not be on the menu.
export function chapterChairs(bookmark, tags) {
  const list = (bookmark && bookmark.playableTags) || [];
  const out = [];
  for (const row of list) {
    const tag = row && (typeof row === 'string' ? row : row.tag);
    if (!tag || out.indexOf(tag) >= 0) continue;
    if (tags && !(tags[tag] && tags[tag].alive !== false)) continue;
    out.push(tag);
  }
  return out;
}

// The chair a guest actually takes. `seat` is what the host picked for them,
// and `'shared'` is the explicit pick that puts them beside the host on the
// host's own throne — the co-op table v1.8 shipped. Anything the campaign
// cannot seat falls back there too.
export function resolveSeat(seat, hostTag, chairs) {
  if (!seat || seat === SHARED || seat === hostTag) return hostTag;
  if (Array.isArray(chairs) && chairs.indexOf(seat) < 0) return hostTag;
  return seat;
}
export const SHARED = 'shared';

// Where a guest sits before anybody touches the picker. A chapter that seats
// more than one Jewish standard gives them one of their own — the first the
// chapter offers that the host is not on, and the next one for each guest
// after that, so a table fills up with the brothers on opposite sides of it
// rather than three hands on one tiller. A one-standard chapter has nothing
// to offer and everybody rules it together.
//
// (This is the second default. The first was `shared`, and it was wrong: the
// picker is one line in a lobby people scroll past, so the table people
// actually got was the one they were trying to leave.)
export function defaultSeat(hostTag, chairs, taken) {
  const free = (Array.isArray(chairs) ? chairs : []).filter((t) => t && t !== hostTag);
  if (!free.length) return SHARED;
  const used = Array.isArray(taken) ? taken : [];
  return free.find((t) => used.indexOf(t) < 0) || free[free.length - 1];
}
