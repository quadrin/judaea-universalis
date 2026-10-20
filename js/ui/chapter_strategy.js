import { esc } from './format.js';
import { icon } from './icons.js';
const RESOURCES = { goods: ['amphora', 'goods'], gold: ['coins', 'talents'], manpower: ['spears', 'manpower'], gov: ['scroll', 'government points'], infl: ['dove', 'influence points'], mar: ['swords', 'martial points'] };
const SHORT_NAMES = {
  levy_charter: 'Levy charter', tax_charter: 'Tax charter', direct_rule: 'Royal governor', capital: 'Royal capital',
  tribute_cash: 'Cash tribute', tribute_troops: 'Military service', earn_rights: 'Autonomy petition', pledge: 'Independence pledge', rise: 'Pledged uprising',
  restore_farms: 'Restore farms', restore_towns: 'Rebuild administration', resettle: 'Returning households', network: 'Support network', regulars: 'Army reform',
  court_house: 'House backing', patron_silver: 'Patron funding', patron_troops: 'Patron recruits', patron_recognition: 'Crown recognition', end_patron: 'End patron agreement',
  regional_command: 'Regional commander', requisition: 'Requisition stores', council_tax: 'War tax', unified_command: 'Unified command', depot: 'Hidden depot', draw_reserves: 'Release reserves',
  municipal_charter: 'Municipal charter', tolerance: 'Local worship', religious_uniformity: 'Religious law', local_administration: 'Local administrators', imperial_administration: 'Imperial administrators',
  mobilize_limited: 'Limited mobilization', mobilize_full: 'Full mobilization', demobilize: 'Demobilize', order_arms: 'Arms shipment',
};
const shortName = key => SHORT_NAMES[key] || key.replaceAll('_', ' ');
const amount = n => Math.abs(Number(n)) >= 1000 ? `${Number((Number(n) / 1000).toFixed(1))}k` : String(n);
const costText = c => Object.entries(c).filter(([, v]) => v).map(([k, v]) => `${v} ${RESOURCES[k]?.[1] || k}`).join(' · ') || 'No upfront cost';
const stat = (ico, value, label) => `<span class="chapter-stat" title="${esc(label)}" data-tt="${esc(label)}" aria-label="${esc(label)}">${icon(ico, 'icon-sm')}<b>${esc(value)}</b></span>`;
const costs = c => Object.entries(c).filter(([, v]) => v).map(([k, v]) => stat(RESOURCES[k]?.[0] || 'book', amount(v), `${v} ${RESOURCES[k]?.[1] || k}`)).join('') || stat('coins', '0', 'No upfront cost');
const record = (ico, name, metrics, tip) => `<div class="chapter-agreement" title="${esc(tip)}" data-tt="${esc(tip)}"><span class="chapter-record-name">${icon(ico, 'icon-sm')}${esc(name)}</span><span class="chapter-stats">${metrics}</span></div>`;

export function createChapterStrategyPanel(el, getActions) {
  const choices = {}, suppliers = {};
  let investment = '';
  let binding = null, lastHtml = '';
  function refresh() {
    const actions = getActions(), report = actions?.getChapterStrategy?.();
    if (!report) { el.innerHTML = ''; lastHtml = ''; return false; }
    const actionIcons = Object.fromEntries(report.actions.map(a => [a.key, a.icon]));
    const expanded = new Set([...el.querySelectorAll('details[data-cs-info][open]')].map(d => d.dataset.csInfo));
    if (binding !== actions) { for (const key of Object.keys(choices)) delete choices[key]; investment = ''; binding = actions; expanded.clear(); }
    const rows = report.actions.map(a => {
      const option = a.options.find(v => v.id === choices[a.key]) || a.options.find(v => v.ok) || a.options[0];
      if (option) choices[a.key] = option.id;
      const supplier = report.suppliers.find(v => v.id === suppliers[a.key]) || report.suppliers[0];
      if (supplier) suppliers[a.key] = supplier.id;
      const args = { ...option?.args, ...(a.key === 'order_arms' ? { partner: supplier?.id } : {}) };
      const check = actions.getChapterDecision(a.key, args);
      const tip = [a.name, a.desc, 'Cost: ' + costText(a.cost), check.ok ? '' : check.why].filter(Boolean).join('\n');
      return `<article class="chapter-action${check.ok ? '' : ' chapter-action-locked'}">
        <div class="chapter-action-head"><span class="chapter-emblem" title="${esc(tip)}" data-tt="${esc(tip)}">${icon(a.icon)}${check.ok ? '' : icon('lock', 'chapter-lock')}</span>
          <div><h4 title="${esc(a.name)}">${esc(SHORT_NAMES[a.key] || a.name)}</h4><div class="chapter-cost chapter-stats">${costs(a.cost)}${a.months ? stat('hourglass', a.months + 'm', a.months + ' months to complete') : ''}${a.upkeep ? stat('coins', a.upkeep + '/m', a.upkeep + ' talents monthly upkeep') : ''}</div></div></div>
        <div class="chapter-controls">
          ${a.target !== 'none' ? `<label class="chapter-target" title="${esc(a.target === 'estate' ? 'Estate' : a.target === 'patron' || a.target === 'partner' ? 'Court' : 'Province')}">${icon(a.target === 'estate' ? 'scales' : a.target === 'patron' || a.target === 'partner' ? 'dove' : 'flag', 'icon-sm')}
            <select data-cs-target="${a.key}" aria-label="${esc(a.name)} location or court">${a.options.length ? a.options.map(v => `<option value="${esc(v.id)}"${v.id === option?.id ? ' selected' : ''}>${esc(v.name)}</option>`).join('') : '<option value="">None available</option>'}</select></label>` : '<span class="chapter-realm" title="Applies to the realm">' + icon('flag', 'icon-sm') + 'Realm</span>'}
          ${a.key === 'order_arms' ? `<label class="chapter-target" title="Supplier">${icon('ship', 'icon-sm')}<select data-cs-supplier="${a.key}" aria-label="Arms shipment supplier">${report.suppliers.map(v => `<option value="${esc(v.id)}"${v.id === supplier?.id ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>` : ''}
          <button class="pp-build-btn chapter-enact" type="button" data-cs-act="${a.key}" aria-label="${esc((a.months ? 'Begin project: ' : 'Enact: ') + a.name)}" title="${esc(tip)}" data-tt="${esc(tip)}"${check.ok ? '' : ' disabled'}>${icon(a.months ? 'play' : 'plus', 'icon-sm')}</button>
        </div>
        <details class="chapter-action-info" data-cs-info="${a.key}"${expanded.has(a.key) ? ' open' : ''}><summary data-cs-detail="${a.key}" aria-label="Details: ${esc(a.name)}" title="Details: ${esc(a.name)}">${icon('book', 'icon-sm')}</summary>
          <div class="chapter-action-description"><b>${esc(a.name)}</b><p>${esc(a.desc)}</p><p>${esc(costText(a.cost))}</p>${check.ok ? '' : `<p class="chapter-reason">${icon('lock', 'icon-sm')}${esc(check.why)}</p>`}</div>
        </details></article>`;
    }).join('');
    const political = report.political;
    const site = political?.provinces.find(p => p.id === investment) || political?.provinces.find(p => p.ok) || political?.provinces[0];
    if (site) investment = site.id;
    const investments = political ? `<article class="chapter-action political-investments">
      <h4 title="Reparations goods · ${esc(political.priority)}">${icon('ship', 'icon-sm')}Reparations · ${esc(political.priority)}</h4>
      <div class="chapter-stats">${stat('amphora', political.goods, political.goods + ' goods available')}${stat('ship', political.delivered, political.delivered + ' goods delivered')}${stat('bricks', political.projects, political.projects + ' projects completed')}${stat('hourglass', political.months + 'm', political.months + ' delivery months remaining')}</div>
      <progress value="${Math.max(0, 144 - political.months)}" max="144" aria-label="Reparations delivery period"></progress>
      <div class="chapter-controls"><label class="chapter-target" title="Investment province">${icon('flag', 'icon-sm')}<select data-cs-invest-site aria-label="Reparations investment province">${political.provinces.map(p => `<option value="${esc(p.id)}"${p.id === site?.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        <button type="button" class="pp-build-btn chapter-invest" data-cs-invest aria-label="Invest 96 reparations goods" title="${esc(site?.why || 'Invest 96 reparations goods')}"${site?.ok ? '' : ' disabled'}>${icon('bricks', 'icon-sm')}96</button></div>
      <button type="button" class="pp-build-btn chapter-compromise" data-cs-compromise title="${esc(political.compromise.why || 'Domestic compromise: 48 goods and 30 influence')}"${political.compromise.ok ? '' : ' disabled'}>${icon('dove', 'icon-sm')}Compromise ${costs({ goods: 48, infl: 30 })}</button>
      ${site?.why || political.why || political.compromise.why ? `<details class="chapter-investment-info" data-cs-info="reparations"${expanded.has('reparations') ? ' open' : ''}><summary>Details</summary><p>${esc([political.why, site?.why, political.compromise.why].filter(Boolean).join(' · '))}</p></details>` : ''}
    </article>` : '';
    const html = `<details class="chapter-overview" data-cs-info="overview"${expanded.has('overview') ? ' open' : ''}><summary>${esc(report.title)}</summary><p>${esc(report.summary)}</p></details>
      <div class="chapter-status chapter-stats">${stat(report.phase.startsWith('War') ? 'swords' : 'dove', report.phase.startsWith('War') ? 'War' : 'Peace', report.phase)}${report.actions.some(a => a.key === 'regulars') ? stat('helmet', report.reforms + '/3', report.reforms + ' of 3 army reforms completed') : ''}${report.mobilization ? stat('spears', report.mobilization, 'Mobilization level: ' + report.mobilization) : ''}${report.equipment ? stat('bricks', report.equipment, report.equipment + ' equipment sets') : ''}</div>
      ${investments}
      ${report.patron ? record('laurel', report.patron.name, stat('hourglass', report.patron.months + 'm', report.patron.months + ' patron agreement months remaining') + stat('coins', Math.round(report.patron.rate * 1000) / 10 + '%', Math.round(report.patron.rate * 1000) / 10 + '% of revenue paid to the patron') + stat('spears', report.patron.manpower + '/m', report.patron.manpower + ' manpower supplied monthly') + stat('scroll', report.rights + '/2', report.rights + '/2 autonomy guarantees') + stat('laurel', report.standing, report.standing + '/100 patron standing'), `${report.service} fulfilled months · ${report.rights}/2 autonomy guarantees · standing ${report.standing}/100 · missed service ${report.patron.arrears || 0}/3 months`) : ''}
      ${report.monthlyOut || report.monthlyIn ? `<div class="chapter-stats chapter-commitments">${stat('coins', '−' + report.monthlyOut.toFixed(1) + '/m', report.monthlyOut.toFixed(1) + ' talents paid monthly')}${stat('coins', '+' + report.monthlyIn.toFixed(1) + '/m', report.monthlyIn.toFixed(1) + ' talents received monthly')}</div>` : ''}
      ${report.commitments.map(c => record('swords', c.name, stat('spears', amount(c.fieldMen), c.fieldMen + ' troops') + stat('swords', c.otherWars, c.otherWars + ' other wars'), c.pressure + (c.wars.length ? '\n' + c.wars.join(', ') : ''))).join('')}
      ${report.projects.map(p => `<div class="chapter-progress"><div class="chapter-progress-head"><b title="${esc(p.name)}">${icon(actionIcons[p.key] || 'bricks', 'icon-sm')}${esc(shortName(p.key))}</b>${stat('hourglass', p.left + 'm', p.left + ' months remaining')}</div><span class="chapter-project-site">${esc(p.provinceName)}</span><progress value="${p.total - p.left}" max="${p.total}" aria-label="${esc(p.name)} progress"></progress>${p.stalled ? `<span class="chapter-reason" title="${esc(p.stalled)}">${icon('lock', 'icon-sm')}${esc(p.stalled)}</span>` : ''}</div>`).join('')}
      ${report.sites.map(s => record(s.kind === 'depot' ? 'granary' : 'flag', s.name, stat('shield', s.strength + '%', s.strength + '% organization') + stat('amphora', s.stock, s.stock + ' supply stocks') + stat('spears', amount(s.reserves), s.reserves + ' stored recruits'), s.kind.replaceAll('_', ' '))).join('')}
      ${report.charters.map(c => record(actionIcons[c.kind] || 'scroll', c.name, c.kind.endsWith('_administration') ? '' : stat('laurel', c.loyalty + '%', 'Charter loyalty: ' + c.loyalty + '/100'), c.title)).join('')}
      ${report.pledges.map(p => record('dove', p.name, stat('hourglass', p.months + 'm', 'Pledge months remaining'), 'Pledges support for independence')).join('')}
      ${report.shipments.map(s => record('ship', s.name, stat('hourglass', s.left + 'm', 'Delivery months remaining') + (s.why ? stat('lock', s.stalled + '/6', s.why) : ''), s.why || 'Arms shipment in transit')).join('')}
      <div class="chapter-actions">${rows}</div>
      ${report.log.length ? `<details class="chapter-log" data-cs-info="log"${expanded.has('log') ? ' open' : ''}><summary>Recent decisions</summary>${report.log.slice(0, 6).map(v => `<p>${Math.abs(v.y)} ${v.y < 0 ? 'BCE' : 'CE'} · ${esc(v.text)}</p>`).join('')}</details>` : ''}`;
    if (html !== lastHtml) {
      const active = el.contains(document.activeElement) ? document.activeElement : null;
      const attrs = active ? [...active.attributes].filter(a => a.name.startsWith('data-cs-')) : [];
      const panel = el.closest('#nation-panel'), scroll = panel?.scrollTop;
      el.innerHTML = html;
      lastHtml = html;
      if (attrs.length) {
        const next = [...el.querySelectorAll('button,select,summary')].find(v => attrs.every(a => v.getAttribute(a.name) === a.value));
        if (next && !next.disabled) next.focus({ preventScroll: true });
      }
      if (panel) panel.scrollTop = scroll;
    }
    return true;
  }
  el.addEventListener('change', e => {
    if (e.target.hasAttribute('data-cs-invest-site')) investment = e.target.value;
    if (e.target.dataset.csTarget) choices[e.target.dataset.csTarget] = e.target.value;
    if (e.target.dataset.csSupplier) suppliers[e.target.dataset.csSupplier] = e.target.value;
    refresh();
  });
  el.addEventListener('click', e => {
    const invest = e.target.closest('[data-cs-invest]'), compromise = e.target.closest('[data-cs-compromise]');
    if (invest || compromise) {
      const button = invest || compromise; if (button.disabled) return;
      if (invest) getActions().investReparations(Number(investment)); else getActions().compromiseReparations();
      refresh(); return;
    }
    const button = e.target.closest('[data-cs-act]'); if (!button || button.disabled) return;
    const actions = getActions(), report = actions.getChapterStrategy(), key = button.dataset.csAct;
    const action = report.actions.find(a => a.key === key), option = action?.options.find(v => v.id === choices[key]);
    actions.runChapterStrategy(key, { ...option?.args, ...(key === 'order_arms' ? { partner: suppliers[key] } : {}) });
    refresh();
  });
  el.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') e.stopPropagation(); });
  return { refresh };
}
