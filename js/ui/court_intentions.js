// View-only court intelligence and offers. Mutations go through gameActions.
import { esc, fmtYear } from './format.js';
import { courtChip } from './icons.js';

const words = value => typeof value === 'string' ? value : '';
const textOf = row => words(row) || words(row?.label) || words(row?.summary) || words(row?.text) || words(row?.reason) || words(row?.name) || words(row?.kind);
const line = (text, cls = '') => text ? `<p class="np-court-line ${cls}">${esc(text)}</p>` : '';

export function renderCourtIntentions(info) {
  if (!info) return '';
  if (info.visible === false || info.available === false) {
    return line(words(info.summary) || 'Our envoys have too little contact to assess this court.', 'np-dim2');
  }
  const attitude = typeof info.attitude === 'string' ? info.attitude : info.attitude?.kind;
  const reasons = Array.isArray(info.attitude?.reasons) ? info.attitude.reasons : [];
  const goals = Array.isArray(info.goals) ? info.goals.slice(0, 2) : [];
  const memory = Array.isArray(info.memories) ? info.memories.slice(-2) : [];
  const summary = words(info.summary);
  const repeatedSummary = goals.some(g => (words(g?.detail) || words(g?.reason)) === summary);
  return line(repeatedSummary ? '' : summary)
    + (attitude ? line(`Toward us: ${attitude}.`, 'np-court-attitude') : '')
    + (reasons.length ? line(reasons.map(textOf).filter(Boolean).join(' · '), 'np-dim2') : '')
    + (goals.length ? `<ul class="np-court-goals">${goals.map(g => `<li><strong>${esc(textOf(g))}</strong>`
      + (words(g?.detail) ? `<span>${esc(g.detail)}</span>` : '') + '</li>').join('')}</ul>` : '')
    + line(textOf(info.preparation), 'np-dim2')
    + line(textOf(info.domestic), 'np-dim2')
    + line(info.ruler?.inclination ? `${words(info.ruler.name) || 'The ruler'} favors ${info.ruler.inclination} policy.` : textOf(info.ruler), 'np-dim2')
    + (memory.length ? line('Remembered: ' + memory.map(textOf).filter(Boolean).join(' · '), 'np-dim2') : '');
}

export function renderCourtOffers(offers, game, defines, actionable = true) {
  if (!offers.length) return line('No diplomatic offers await your response.', 'np-dim2');
  return offers.map(o => {
    const name = game.tags[o.from]?.name || defines.TAGS?.[o.from]?.name || o.from;
    const at = (game.date.y > 0 ? game.date.y - 1 : game.date.y) * 12 + game.date.m - 1;
    const left = Number.isFinite(o.expires) ? Math.max(0, o.expires - at) : null;
    const expiry = left !== null ? `Available for ${left} more month${left === 1 ? '' : 's'}.`
      : o.expires && typeof o.expires === 'object' && Number.isFinite(o.expires.y)
        ? `Available until month ${o.expires.m}, ${fmtYear(o.expires.y)}.` : '';
    const disabled = !actionable || o.canAccept === false;
    return `<article class="np-court-offer" data-court-offer-card="${esc(o.id)}">`
      + `<div class="np-court-offer-head">${courtChip(o.from, defines, 24, true, game)}<strong>${esc(o.title || 'An offer from ' + name)}</strong></div>`
      + line(words(o.description)) + line(words(o.reason), 'np-dim2') + line(expiry, 'np-dim2')
      + (o.canAccept === false ? line(words(o.why) || 'The terms cannot currently be accepted.', 'neg') : '')
      + `<div class="np-court-offer-actions"><button class="pp-dip" data-court-offer="${esc(o.id)}" data-court-accept="true"`
      + `${disabled ? ' disabled' : ''} aria-label="Accept ${esc(o.title || 'offer')} from ${esc(name)}">Accept</button>`
      + `<button class="pp-dip" data-court-offer="${esc(o.id)}" data-court-accept="false"${!actionable ? ' disabled' : ''}`
      + ` aria-label="Decline ${esc(o.title || 'offer')} from ${esc(name)}">Decline</button></div></article>`;
  }).join('');
}
