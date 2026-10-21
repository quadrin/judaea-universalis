import { generalRating, GENERAL_STAR_PATH, GENERAL_STAR_THRESHOLDS } from '../data/general_rating.js';
import { esc } from './format.js';

export function generalDescription(general) {
  if (!general) return 'No general';
  const stars = generalRating(general);
  const { two, three } = GENERAL_STAR_THRESHOLDS;
  const traits = Array.isArray(general.traits) && general.traits.length
    ? '\nTraits: ' + general.traits.join(', ') : '';
  const role = general.royalRole === 'ruler' ? '\nRuler in personal command — death triggers succession.'
    : general.royalRole === 'heir' ? '\nHeir in personal command — death removes the designated heir.' : '';
  return `${general.name || 'General'} — ${stars}-star general${role}\nFire ${general.fire || 0} · Shock ${general.shock || 0} · Maneuver ${general.maneuver || 0}${traits}\nRating by total skill: ★ 0–${two - 1} · ★★ ${two}–${three - 1} · ★★★ ${three}+.`;
}

export function generalStarsHtml(general) {
  const stars = generalRating(general);
  if (!stars) return '';
  const label = esc(generalDescription(general));
  const star = `<svg viewBox="-6 -6 12 12" aria-hidden="true"><path d="${GENERAL_STAR_PATH}"/></svg>`;
  return `<span class="general-stars" role="img" aria-label="${label}" title="${label}" data-tt="${label}">${star.repeat(stars)}</span>`;
}
