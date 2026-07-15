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
