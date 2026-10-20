import { NATIONAL_IDEAS, nationalIdeaLevel } from '../data/national_ideas.js';
import { esc, warnOnce } from './format.js';
import { icon } from './icons.js';

const resources = { gold: ['coins', 'talents'], manpower: ['spears', 'manpower'], gov: ['scroll', 'government points'], infl: ['dove', 'influence points'], mar: ['swords', 'martial points'] };
const compact = n => Number(n) >= 1000 ? `${Number((Number(n) / 1000).toFixed(1))}k` : String(n);
const stat = (ico, value, tip) => `<span class="ni-stat" title="${esc(tip)}" data-tt="${esc(tip)}" aria-label="${esc(tip)}">${icon(ico, 'icon-sm')}<b>${esc(compact(value))}</b></span>`;
const price = cost => Object.entries(cost || {}).filter(([, n]) => n).map(([k, n]) => stat(resources[k]?.[0] || 'book', n, `${n} ${resources[k]?.[1] || k}`)).join('');
const metricName = { laurel: 'Loyalty', coins: 'Treasury / rent', spears: 'Stored recruits', hourglass: 'Months remaining', quill: 'Network strength', alert: 'Exposure' };

export function createNationalIdeasPanel(el, getActions) {
  const picks = {}, tiers = {}, services = {};
  let self = false, binding = null, lastHtml = '', lastTag = null;
  el.addEventListener('change', e => {
    if (!self) return;
    if (e.target.matches('[data-ni-target]')) picks[e.target.dataset.niTarget] = e.target.value;
    if (e.target.matches('[data-ni-service]')) services[e.target.dataset.niService] = e.target.value;
    refresh(lastTag, true);
  });
  el.addEventListener('click', e => {
    const inspect = e.target.closest('[data-ni-inspect]');
    if (inspect) { tiers[inspect.dataset.niInspect] = Number(inspect.dataset.tier); refresh(lastTag, self); return; }
    if (!self) return;
    const buy = e.target.closest('[data-ni-buy]'), act = e.target.closest('[data-ni-act]');
    if (!buy && !act) return;
    const button = buy || act; if (button.disabled) return;
    const actions = getActions();
    try {
      if (buy) actions.buyNationalIdea(buy.dataset.niBuy);
      else {
        const report = actions.getNationalStrategy();
        const item = report.actions.find(a => a.key === act.dataset.niAct);
        const choice = item?.options.find(v => v.id === picks[item.key]) || item?.options.find(v => v.ok) || item?.options[0];
        actions.runNationalAction(item.key, { ...choice?.args, ...(item.key === 'charter' ? { service: services.charter || 'fiscal' } : {}) });
      }
    } catch (err) { warnOnce('national-ideas-action', err); }
    refresh(lastTag, self);
  });

  function refresh(tag, isSelf) {
    const actions = getActions();
    if (binding !== actions || lastTag?.tag !== tag?.tag || self !== isSelf) {
      binding = actions; lastHtml = ''; for (const k of Object.keys(picks)) delete picks[k];
      for (const k of Object.keys(tiers)) delete tiers[k];
    }
    lastTag = tag; self = isSelf;
    if (!tag) return;
    const open = new Map([...el.querySelectorAll('details[data-ni-open]')].map(d => [d.dataset.niOpen, d.open]));
    const active = document.activeElement, focus = active && el.contains(active) ? [...active.attributes].filter(a => a.name.startsWith('data-ni-') || a.name === 'data-tier').map(a => [a.name, a.value]) : null;
    let report;
    if (self) report = actions?.getNationalStrategy?.();
    else report = { groups: Object.entries(NATIONAL_IDEAS).filter(([key]) => nationalIdeaLevel(tag, key)).map(([key, d]) => ({ ...d, key, owned: nationalIdeaLevel(tag, key) })), records: [], actions: [] };
    if (!report) { el.innerHTML = ''; return; }
    const expanded = (id, fallback) => (open.has(id) ? open.get(id) : fallback) ? ' open' : '';
    const header = self ? `<div class="ni-slots" title="Two starting paths; a third opens at government technology ${report.nextSlotTech}. Existing reforms and era ideas keep their own progression.">${stat('book', `${report.used}/${report.slots}`, 'National path slots used')}${report.slots < 3 ? stat('lock', report.nextSlotTech, 'Third path: government technology ' + report.nextSlotTech) : ''}${report.monthlyOut ? stat('coins', report.monthlyOut + '/m', 'Last month’s national-path expenses') : ''}${report.incoming ? stat('alert', report.incoming, 'Detected hostile networks') : ''}${report.counterspy ? stat('shield', report.counterspy + 'm', 'Counterintelligence remaining') : ''}</div>` : '';
    const html = header + report.groups.map(group => {
      const { key, owned, tiers: ideas } = group;
      const selected = Math.max(0, Math.min(2, tiers[key] ?? Math.min(owned, 2))), idea = ideas[selected];
      const records = report.records.filter(r => r.group === key).map(r => `<div class="ni-record" title="${esc(r.tip)}" data-tt="${esc(r.tip)}"><span>${icon(r.icon, 'icon-sm')}${esc(r.name)}</span><span class="ni-stats">${r.stats.map(([ico, val]) => stat(ico, val, (metricName[ico] || ico) + ': ' + val)).join('')}</span>${r.progress ? `<progress max="${r.progress.total}" value="${r.progress.done}" aria-label="${esc(r.name + ' progress')}"></progress>` : ''}</div>`).join('');
      const operations = report.actions.filter(a => a.group === key).map(a => {
        const choice = a.options.find(o => o.id === picks[a.key]) || a.options.find(o => o.ok) || a.options[0];
        picks[a.key] = choice?.id || '';
        const args = { ...choice?.args, ...(a.key === 'charter' ? { service: services.charter || 'fiscal' } : {}) };
        const check = actions.getNationalActionInfo(a.key, args);
        const tip = a.desc + (check.why ? '\n' + check.why : '');
        return `<details class="ni-action" data-ni-open="action:${a.key}"${expanded('action:' + a.key, false)}><summary data-ni-summary="action:${a.key}" title="${esc(tip)}">${icon(a.icon, 'icon-sm')}<span>${esc(a.name)}</span><span class="ni-stats">${price(check.cost)}</span>${!check.ok ? icon('lock', 'icon-xs') : ''}</summary><div class="ni-action-body"><div class="ni-controls">${a.target !== 'none' ? `<select data-ni-target="${a.key}" aria-label="${esc(a.name + ' target')}">${a.options.length ? a.options.map(o => `<option value="${esc(o.id)}"${o.id === choice?.id ? ' selected' : ''}>${esc(o.name)}</option>`).join('') : '<option value="">No eligible targets</option>'}</select>` : ''}${a.key === 'charter' ? `<select data-ni-service="charter" aria-label="City charter service">${['fiscal', 'levy', 'naval'].map(v => `<option value="${v}"${(services.charter || 'fiscal') === v ? ' selected' : ''}>${v === 'fiscal' ? 'Fiscal' : v === 'levy' ? 'Levy' : 'Naval'}</option>`).join('')}</select>` : ''}<button type="button" data-ni-act="${a.key}"${check.ok ? '' : ' disabled'} title="${esc(tip)}" aria-label="${esc(a.name)}">${icon('play', 'icon-sm')}</button></div><p>${esc(a.desc)}</p>${check.why ? `<span class="ni-reason">${esc(check.why)}</span>` : ''}</div></details>`;
      }).join('');
      return `<details class="ni-path${owned ? ' adopted' : ''}" data-ni-open="path:${key}"${expanded('path:' + key, owned > 0)}><summary data-ni-summary="path:${key}"><span class="ni-emblem">${icon(group.icon)}</span><b>${esc(group.name)}</b><span class="ni-pips" aria-label="${owned} of 3 ideas">${[1, 2, 3].map(n => `<i class="${n <= owned ? 'filled' : ''}"></i>`).join('')}</span></summary><div class="ni-path-body"><div class="ni-tiers">${ideas.map((d, i) => `<button type="button" data-ni-inspect="${key}" data-tier="${i}" class="${i < owned ? 'owned' : ''}" aria-pressed="${i === selected}" aria-label="${esc(d.name + ': ' + d.desc)}" title="${esc(d.desc)}">${icon(d.icon)}<span>${i < owned ? '✓' : i + 1}</span></button>`).join('')}${self && owned < 3 ? `<button type="button" class="ni-adopt" data-ni-buy="${key}"${group.canBuy ? '' : ' disabled'} title="${esc(group.whyNot || ideas[owned].desc)}" aria-label="${esc('Adopt ' + ideas[owned].name)}">${icon('plus', 'icon-sm')}${price({ [group.point]: group.cost })}</button>` : ''}</div><div class="ni-idea-detail"><b>${esc(idea.name)}</b><p>${esc(idea.desc)}</p></div>${self && !group.canBuy && owned < 3 ? `<span class="ni-reason">${esc(group.whyNot)}</span>` : ''}${records ? `<div class="ni-records">${records}</div>` : ''}${operations}</div></details>`;
    }).join('') + (self && report.log.length ? `<details class="ni-log" data-ni-open="log"${expanded('log', false)}><summary>${icon('scroll', 'icon-sm')} Recent developments</summary>${report.log.map(s => `<p>${esc(s)}</p>`).join('')}</details>` : '');
    if (html === lastHtml) return;
    const panel = el.closest('#nation-panel'), scroll = panel?.scrollTop;
    lastHtml = html; el.innerHTML = html;
    if (focus?.length) for (const control of el.querySelectorAll('button, select, summary')) {
      if (focus.every(([k, v]) => control.getAttribute(k) === v)) { control.focus({ preventScroll: true }); break; }
    }
    if (panel) panel.scrollTop = scroll;
  }
  return { refresh };
}
