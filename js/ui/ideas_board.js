// js/ui/ideas_board.js — the Ideas tab, laid out like EU4's idea screen.
//
// Three columns, one for each kind of point: Government, Influence and
// Martial. Every idea group is one compact card: an emblem, a name banner, a
// row of idea icons and one control on the right. The three sources of ideas
// share the same card:
//   - reforms (IDEA_TREES): open to every realm, five ideas;
//   - national paths (NATIONAL_IDEAS): the first idea takes a path slot;
//   - ideas of the age (era_ideas.js): open at a named technology level.
// Selecting an idea icon shows its full text inside the card; hovering shows
// the same text as a tooltip. The data-idea / data-eraidea / data-ni-buy
// controls are answered by the nation panel's delegated click handler.
import { esc } from './format.js';
import { icon } from './icons.js';
import { IDEA_TREES } from '../data/ideas.js';
import { eraIdeaGroupsFor } from '../data/era_ideas.js';
import { NATIONAL_IDEAS, nationalIdeaLevel } from '../data/national_ideas.js';

export const IDEA_POINTS = {
  gov: { name: 'Government', icon: 'scroll', points: 'government points' },
  infl: { name: 'Influence', icon: 'dove', points: 'influence points' },
  mar: { name: 'Martial', icon: 'swords', points: 'martial points' },
};
const KIND_ORDER = { reform: 0, path: 1, era: 2 };
const KIND_LABEL = { reform: 'Reform', path: 'Path', era: 'Age' };
const KIND_ABOUT = {
  reform: 'Reform: open to every realm, without a slot.',
  path: 'National path: the first idea takes one of your national path slots.',
  era: 'Idea of the age: ',
};
const EFFECT_ICONS = {
  disciplineMult: 'swords', manpowerMult: 'spears', siegeMult: 'tower', moraleMult: 'shield',
  hillDefBonus: 'mountain', incomeMult: 'coins', unrestAll: 'scales', legitimacyAdd: 'laurel',
  convertMult: 'altar', adminMult: 'scroll', diploSeats: 'dove', tradeMult: 'amphora',
  growthMult: 'grain', milPowerMult: 'swords', forceLimitMult: 'spears', fortDefBonus: 'walls',
  navalMult: 'ship', navyLimitMult: 'ship',
};

export function ideaTierIcon(tier, fallback = 'book') {
  return tier?.icon || EFFECT_ICONS[Object.keys(tier?.effects || {}).find(k => EFFECT_ICONS[k])] || fallback;
}

// One list for the whole board. The player's own court asks the sim for live
// prices and reasons; a foreign court is read from its saved state.
export function collectIdeaGroups({ ctx, actions, t, tag, self, warn = () => {} }) {
  const out = [];
  let reforms = null, eras = null, paths = null;
  if (self) {
    try { reforms = actions?.getIdeas?.(); } catch (e) { warn('np-getIdeas', e); }
    try { eras = actions?.getEraIdeas?.(); } catch (e) { warn('np-getEraIdeas', e); }
    try { paths = actions?.getNationalIdeas?.(); } catch (e) { warn('np-getNationalIdeas', e); }
  }
  reforms ||= Object.entries(IDEA_TREES).map(([key, tree]) => ({ ...tree, key, owned: (t.reforms || {})[key] | 0 }));
  for (const tr of reforms) {
    const def = IDEA_TREES[tr.key];
    if (!def) continue;
    out.push({ ...tr, kind: 'reform', icon: def.icon, point: def.point,
      tiers: def.tiers.map((ti, i) => ({ name: ti.name, desc: ti.desc, icon: ideaTierIcon(ti, def.icon), owned: i < (tr.owned | 0) })) });
  }
  const pathInfo = paths || { groups: Object.entries(NATIONAL_IDEAS).map(([key, d]) => ({ ...d, key, owned: nationalIdeaLevel(t, key) })) };
  for (const group of pathInfo.groups || []) {
    if (!self && !group.owned) continue;
    out.push({ ...group, kind: 'path', tiers: group.tiers.map(ti => ({ ...ti, icon: ideaTierIcon(ti, group.icon) })) });
  }
  const defs = ctx ? eraIdeaGroupsFor(ctx.bookmark, tag, t) : [];
  eras ||= defs.filter(gd => ((t.eraIdeas || {})[gd.key] | 0) > 0).map(gd => ({ ...gd, owned: (t.eraIdeas || {})[gd.key] | 0 }));
  for (const group of eras) {
    const def = defs.find(gd => gd.key === group.key);
    out.push({ ...group, kind: 'era', icon: group.icon || def?.icon || 'lamp',
      tiers: group.tiers.map((ti, i) => ({ name: ti.name, desc: ti.desc, icon: ideaTierIcon(def?.tiers[i] || ti, group.icon || def?.icon) })) });
  }
  return {
    groups: out,
    slots: pathInfo.slots, used: pathInfo.used, nextSlotTech: pathInfo.nextSlotTech,
  };
}

function ideaState(group, i) {
  const n = group.owned | 0;
  if (i < n) return 'Adopted';
  if (group.unlocked === false) return 'Technology locked';
  return i === n ? 'Next idea' : 'Requires the earlier ideas';
}

function buyAttr(group) {
  if (group.kind === 'reform') return `data-idea="${esc(group.key)}"`;
  if (group.kind === 'era') return `data-eraidea="${esc(group.key)}"`;
  return `data-ni-buy="${esc(group.key)}"`;
}

// The control on the right edge of a card: EU4's lock button.
function control(group, self) {
  const total = group.tiers.length, n = Math.min(total, group.owned | 0);
  if (n >= total) return `<span class="ib-control ib-complete" role="img" aria-label="All ideas adopted" data-tt="All ${total} ideas adopted.">✓</span>`;
  if (!self) return '';
  if (group.unlocked === false) {
    return `<span class="ib-control ib-locked" role="img" aria-label="${esc(group.unlockText || 'Technology locked')}" data-tt="${esc((group.unlockText || 'Technology locked') + (group.unlockDetail ? '\n' + group.unlockDetail : ''))}">${icon('lock', 'icon-sm')}</span>`;
  }
  const next = group.tiers[n], point = IDEA_POINTS[group.point] || { points: group.point + ' points', icon: 'book' };
  const slotLocked = group.kind === 'path' && !n && /slot/i.test(group.whyNot || '');
  const terms = `Adopt ${next.name} — ${group.cost} ${point.points}\n${next.desc}`;
  const tip = group.canBuy ? terms + (group.whyNot ? '\n' + group.whyNot : '') : `${group.whyNot || 'Not available.'}\n――――――\n${terms}`;
  // A class, not the attribute: a disabled control must still show its reason on hover.
  return `<button type="button" class="ib-control ib-adopt${group.canBuy ? '' : ' disabled'}" ${buyAttr(group)}${group.canBuy ? '' : ' aria-disabled="true"'}`
    + ` aria-label="${esc(`Adopt ${next.name} for ${group.cost} ${point.points}`)}" data-tt="${esc(tip)}">`
    + `${icon(slotLocked ? 'lock' : 'plus', 'icon-sm')}<span class="ib-cost">${esc(group.cost)}</span></button>`;
}

function detail(group, index, self) {
  const tier = group.tiers[index];
  if (!tier) return '';
  const about = KIND_ABOUT[group.kind] + (group.kind === 'era' ? (group.unlockDetail || group.unlockText || 'opens with technology.') : '');
  const n = group.owned | 0;
  const reason = self && n < group.tiers.length && !group.canBuy && group.whyNot ? `<p class="ib-reason">${esc(group.whyNot)}</p>` : '';
  return `<div class="ib-detail" aria-live="polite">`
    + `<div class="ib-detail-head">${icon(tier.icon || group.icon || 'book', 'icon-sm')}<b>${esc(tier.name)}</b><span class="ib-state">${esc(ideaState(group, index))}</span></div>`
    + `<p>${esc(tier.desc)}</p>`
    + `<p class="ib-about">${esc(about)}${group.desc ? ' ' + esc(group.desc) : ''}</p>${reason}</div>`;
}

function card(group, { self, picked }) {
  const prefix = group.kind + ':' + group.key;
  const total = group.tiers.length, n = Math.max(0, Math.min(total, group.owned | 0));
  const pick = picked && picked.group === prefix && picked.tier >= 0 && picked.tier < total ? picked.tier : -1;
  const ideas = group.tiers.map((tier, i) => {
    const state = ideaState(group, i);
    const cls = i < n ? ' owned' : i === n && group.unlocked !== false ? ' next' : '';
    return `<li><button type="button" class="ib-idea${cls}" data-idea-inspect="${esc(prefix)}" data-tier="${i}" aria-pressed="${i === pick}"`
      + ` aria-label="${esc(`${tier.name} — ${state}. ${tier.desc}`)}" data-tt="${esc(`${tier.name}\n${tier.desc}\n――――――\n${state}`)}">`
      + `${icon(tier.icon || group.icon || 'book')}</button></li>`;
  }).join('');
  const cls = ['ib-card', 'ib-kind-' + group.kind];
  if (group.unlocked === false) cls.push('ib-is-locked');
  if (n >= total) cls.push('ib-is-done');
  if (n > 0 && n < total) cls.push('ib-is-started');
  if (pick >= 0) cls.push('ib-is-picked');
  return `<article class="${cls.join(' ')}" data-idea-group="${esc(prefix)}">`
    + `<span class="ib-emblem" aria-hidden="true">${icon(group.icon || 'book')}</span>`
    + `<div class="ib-main"><div class="ib-banner"><b>${esc(group.name)}</b>`
    + `<span class="ib-kind" data-tt="${esc(KIND_ABOUT[group.kind] + (group.kind === 'era' ? (group.unlockText || '') : ''))}">${KIND_LABEL[group.kind]}</span></div>`
    + `<ol class="ib-ideas" aria-label="${esc(`${group.name}: ${n} of ${total} ideas adopted`)}">${ideas}</ol></div>`
    + control(group, self)
    + (pick >= 0 ? detail(group, pick, self) : '')
    + `</article>`;
}

function slotBar(info) {
  const slots = Math.max(0, info.slots | 0);
  const used = info.groups.filter(g => g.kind === 'path' && (g.owned | 0) > 0);
  const boxes = used.map(g => `<span class="ib-slot filled" role="img" aria-label="${esc(g.name)}" data-tt="${esc(`${g.name}: ${g.owned}/${g.tiers.length} ideas`)}">${icon(g.icon || 'book', 'icon-sm')}</span>`);
  for (let i = used.length; i < slots; i++) boxes.push(`<span class="ib-slot" role="img" aria-label="Empty slot" data-tt="Empty slot: adopt the first idea of a national path to fill it."></span>`);
  if (slots < 3 && info.nextSlotTech) boxes.push(`<span class="ib-slot locked" role="img" aria-label="Opens at government technology ${esc(info.nextSlotTech)}" data-tt="${esc('A third slot opens at government technology ' + info.nextSlotTech + '.')}">${icon('lock', 'icon-xs')}<small>${esc(info.nextSlotTech)}</small></span>`);
  return `<div class="ib-slots"><span class="ib-slots-label">National path slots <b>${used.length}/${slots}</b></span><span class="ib-slot-row">${boxes.join('')}</span></div>`;
}

export function ideasBoardHtml(info, { self, points, picked }) {
  const columns = Object.entries(IDEA_POINTS).map(([key, p]) => {
    const groups = info.groups.filter(g => g.point === key)
      .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
    const pts = self ? `<b class="ib-pts" data-tt="${esc(p.name + ' points available')}">${Math.floor(Number(points?.[key]) || 0)}</b>` : '';
    return `<section class="ib-col" data-ib-point="${key}" aria-label="${esc(p.name + ' ideas')}">`
      + `<h4 class="ib-col-head">${icon(p.icon, 'icon-sm')}<span>${esc(p.name)} Ideas</span>${pts}</h4>`
      + (groups.map(g => card(g, { self, picked })).join('') || '<p class="ib-none">None adopted.</p>')
      + `</section>`;
  }).join('');
  const top = self ? slotBar(info)
    + '<p class="ib-hint">Adopt ideas in order with the points of their column. Select an idea to read it.</p>' : '';
  return `${top}<div class="ib-cols">${columns}</div>`;
}
