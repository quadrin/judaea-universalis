import { esc } from './format.js';
import { icon } from './icons.js';

const POINTS = { gov: { name: 'government', icon: 'scroll' }, infl: { name: 'influence', icon: 'dove' }, mar: { name: 'martial', icon: 'swords' } };
const EFFECT_ICONS = {
  disciplineMult: 'swords', manpowerMult: 'spears', siegeMult: 'tower', moraleMult: 'shield',
  hillDefBonus: 'mountain', incomeMult: 'coins', unrestAll: 'scales', legitimacyAdd: 'laurel',
  convertMult: 'altar', adminMult: 'scroll', diploSeats: 'dove', tradeMult: 'amphora',
  growthMult: 'grain', milPowerMult: 'swords', forceLimitMult: 'spears', fortDefBonus: 'walls',
  navalMult: 'ship', navyLimitMult: 'ship',
};

export function ideaTierIcon(tier, fallback = 'book') {
  return tier.icon || EFFECT_ICONS[Object.keys(tier.effects || {}).find(k => EFFECT_ICONS[k])] || fallback;
}

export function ideaWallet(points) {
  return Object.entries(POINTS).map(([key, p]) =>
    `<span>${icon(p.icon, 'icon-sm')}<b>${Math.floor(points?.[key] || 0)}</b> ${p.name}</span>`).join('');
}

// Inspection and adoption are separate controls: browsing a future idea is free.
export function ideaCard(group, { kind, self, selected }) {
  const { tiers } = group;
  const n = Math.max(0, Math.min(tiers.length, group.owned | 0));
  const unlocked = group.unlocked !== false;
  const index = Number.isInteger(selected) && selected >= 0 && selected < tiers.length
    ? selected : Math.min(n, tiers.length - 1);
  const point = POINTS[group.point] || { name: group.point, icon: 'book' };
  const state = i => i < n ? 'Completed' : !unlocked ? 'Technology locked' : i === n ? 'Next idea' : 'Requires earlier ideas';
  const chosen = tiers[index];
  const prefix = kind + ':' + group.key;
  const description = chosen ? `<div class="np-idea-detail" aria-live="polite">
    <b>${icon(chosen.icon || group.icon || 'book', 'icon-sm')}${esc(chosen.name)}</b>
    <p>${esc(chosen.desc)}</p><span class="np-idea-state">${state(index)}</span></div>` : '';
  const next = tiers[n];
  const canBuy = unlocked && !!next && group.canBuy;
  const purchase = self ? `<button type="button" class="pp-build-btn np-reform-btn${canBuy ? '' : ' disabled'}"
    data-${kind === 'era' ? 'eraidea' : 'idea'}="${esc(group.key)}" ${canBuy ? '' : 'disabled'}
    title="${esc(group.whyNot || next?.desc || 'Group complete')}">
    <span>${icon(next?.icon || group.icon || 'book', 'icon-sm')}${!unlocked ? 'Technology required' : next ? 'Adopt ' + esc(next.name) : 'Group complete'}</span>
    ${unlocked && next ? `<span class="np-reform-cost" aria-label="${group.cost} ${point.name} points">${group.cost} ${icon(point.icon, 'icon-xs')}</span>` : ''}
    </button>` : '';
  return `<article class="np-reform np-idea-group${!unlocked ? ' np-idea-locked' : ''}" data-idea-group="${esc(prefix)}">
    <div class="np-reform-head"><span class="np-idea-emblem">${icon(group.icon || 'book')}</span><b>${esc(group.name)}</b>
    <span class="np-idea-count" aria-label="${n} of ${tiers.length} ideas completed">${n}/${tiers.length}</span></div>
    ${group.desc ? `<p class="np-idea-blurb">${esc(group.desc)}</p>` : ''}
    ${!unlocked ? `<div class="np-idea-unlock">${icon('lock', 'icon-sm')}${esc(group.unlockText)}<span>${esc(group.unlockDetail || '')}</span></div>` : ''}
    <ol class="np-idea-track">${tiers.map((tier, i) => `<li><button type="button"
      class="np-idea-step${i < n ? ' owned' : i === n && unlocked ? ' next' : ''}"
      data-idea-inspect="${esc(prefix)}" data-tier="${i}" aria-pressed="${i === index}"
      aria-label="${esc(tier.name + ' — ' + state(i) + '. ' + tier.desc)}" title="${esc(tier.name + ' — ' + tier.desc)}">
      ${icon(tier.icon || group.icon || 'book')}<span class="np-idea-number" aria-hidden="true">${i < n ? '✓' : i + 1}</span>
    </button></li>`).join('')}</ol>
    ${description}${purchase}
    ${self && next && unlocked && !canBuy && group.whyNot ? `<div class="np-idea-reason">${esc(group.whyNot)}</div>` : ''}
    </article>`;
}
