// Small, DOM-free multiplayer state transitions. Keeping these outside main.js
// makes chair changes testable without standing up two browsers and a data channel.

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
