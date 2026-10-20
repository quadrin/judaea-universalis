// A display rating derived from the existing skills; never stored in saves.
// Six pips earns two stars; ten earns three. Earned skill gains count too.
export function generalRating(general) {
  if (!general) return 0;
  const total = ['fire', 'shock', 'maneuver'].reduce((sum, key) => {
    const value = Number(general[key]);
    return sum + (Number.isFinite(value) ? Math.max(0, Math.min(6, Math.floor(value))) : 0);
  }, 0);
  return total >= 10 ? 3 : total >= 6 ? 2 : 1;
}

// Shared by the canvas counters and inline SVG badges.
export const GENERAL_STAR_PATH = 'M0 -5 L1.18 -1.62 4.76 -1.55 1.9 .62 2.94 4.05 0 2 -2.94 4.05 -1.9 .62 -4.76 -1.55 -1.18 -1.62 Z';
