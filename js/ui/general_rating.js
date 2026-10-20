import { generalRating, GENERAL_STAR_PATH } from '../data/general_rating.js';
import { esc } from './format.js';

export function generalDescription(general) {
  if (!general) return 'No general';
  const stars = generalRating(general);
  const traits = Array.isArray(general.traits) && general.traits.length
    ? '\nTraits: ' + general.traits.join(', ') : '';
  return `${general.name || 'General'} — ${stars}-star general\nFire ${general.fire || 0} · Shock ${general.shock || 0} · Maneuver ${general.maneuver || 0}${traits}\nRating by total skill: ★ 0–5 · ★★ 6–9 · ★★★ 10+.`;
}

export function generalStarsHtml(general) {
  const stars = generalRating(general);
  if (!stars) return '';
  const label = esc(generalDescription(general));
  const star = `<svg viewBox="-6 -6 12 12" aria-hidden="true"><path d="${GENERAL_STAR_PATH}"/></svg>`;
  return `<span class="general-stars" role="img" aria-label="${label}" title="${label}" data-tt="${label}">${star.repeat(stars)}</span>`;
}
