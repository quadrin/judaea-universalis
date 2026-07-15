// Seeded RNG (mulberry32). Sim must use this, never Math.random, for reproducibility.
// onState keeps the cursor in plain game data so saves and multiplayer snapshots
// resume the stream instead of starting it over from the campaign seed.
export function createRng(seed, onState) {
  let a = seed >>> 0;
  const writeState = typeof onState === 'function' ? onState : null;
  function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    if (writeState) writeState(a >>> 0);
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    int: (n) => Math.floor(next() * n),          // 0..n-1
    range: (lo, hi) => lo + next() * (hi - lo),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    state: () => a >>> 0,
  };
}
