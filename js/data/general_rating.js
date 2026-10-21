// A display rating derived from the existing skills; never stored in saves.
// With the recruitment rolls, these thresholds give about 85% one-star,
// 13% two-star and 2% three-star generals. Earned skill gains count too.
export const GENERAL_STAR_THRESHOLDS = Object.freeze({ two: 9, three: 11 });

export function generalRating(general) {
  if (!general) return 0;
  const total = ['fire', 'shock', 'maneuver'].reduce((sum, key) => {
    const value = Number(general[key]);
    return sum + (Number.isFinite(value) ? Math.max(0, Math.min(6, Math.floor(value))) : 0);
  }, 0);
  return total >= GENERAL_STAR_THRESHOLDS.three ? 3 : total >= GENERAL_STAR_THRESHOLDS.two ? 2 : 1;
}

// Shared by the canvas counters and inline SVG badges.
export const GENERAL_STAR_PATH = 'M0 -5 L1.18 -1.62 4.76 -1.55 1.9 .62 2.94 4.05 0 2 -2.94 4.05 -1.9 .62 -4.76 -1.55 -1.18 -1.62 Z';
