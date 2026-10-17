import { esc } from './format.js';
import { icon } from './icons.js';
const costText = c => Object.entries(c).filter(([, v]) => v).map(([k, v]) => `${v} ${k === 'gold' ? 'talents' : k === 'manpower' ? 'manpower' : k + ' points'}`).join(' · ') || 'No upfront cost';

export function createChapterStrategyPanel(el, getActions) {
  const choices = {}, suppliers = {};
  let binding = null;
  function refresh() {
    const actions = getActions(), report = actions?.getChapterStrategy?.();
    if (!report) { el.innerHTML = ''; return false; }
    if (binding !== actions) { for (const key of Object.keys(choices)) delete choices[key]; binding = actions; }
    const rows = report.actions.map(a => {
      const option = a.options.find(v => v.id === choices[a.key]) || a.options.find(v => v.ok) || a.options[0];
      if (option) choices[a.key] = option.id;
      const supplier = report.suppliers.find(v => v.id === suppliers[a.key]) || report.suppliers[0];
      if (supplier) suppliers[a.key] = supplier.id;
      const args = { ...option?.args, ...(a.key === 'order_arms' ? { partner: supplier?.id } : {}) };
      const check = actions.getChapterDecision(a.key, args);
      return `<article class="chapter-action"><h4>${icon(a.icon, 'icon-sm')}${esc(a.name)}</h4>
        <p>${esc(a.desc)}</p><div class="chapter-cost">${esc(costText(a.cost))}</div>
        ${a.target !== 'none' ? `<label>Choose ${a.target === 'estate' ? 'estate' : a.target === 'patron' || a.target === 'partner' ? 'court' : 'province'}
          <select data-cs-target="${a.key}" aria-label="${esc(a.name)} location or court">${a.options.length ? a.options.map(v => `<option value="${esc(v.id)}"${v.id === option?.id ? ' selected' : ''}>${esc(v.name)}</option>`).join('') : '<option value="">None available</option>'}</select></label>` : ''}
        ${a.key === 'order_arms' ? `<label>Supplier<select data-cs-supplier="${a.key}" aria-label="Arms shipment supplier">${report.suppliers.map(v => `<option value="${esc(v.id)}"${v.id === supplier?.id ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>` : ''}
        <button class="pp-build-btn" type="button" data-cs-act="${a.key}"${check.ok ? '' : ' disabled'}>${esc(a.months ? 'Begin project' : 'Enact')}</button>
        ${check.ok ? '' : `<div class="chapter-reason">${esc(check.why)}</div>`}</article>`;
    }).join('');
    const html = `<h3>${esc(report.title)}</h3><p>${esc(report.summary)}</p>
      <p class="chapter-status">${esc(report.phase)}${report.actions.some(a => a.key === 'regulars') ? ' · ' + report.reforms + '/3 army reforms' : ''}${report.mobilization ? ' · Mobilization ' + report.mobilization : ''}${report.equipment ? ' · ' + report.equipment + ' equipment sets' : ''}</p>
      ${report.patron ? `<div class="chapter-agreement"><b>${esc(report.patron.name)}</b> · ${report.patron.months} months remaining<br>${Math.round(report.patron.rate * 1000) / 10}% revenue · ${report.patron.manpower} manpower/month<br>${report.service} fulfilled months · ${report.rights}/2 autonomy guarantees · standing ${report.standing}/100${report.patron.arrears ? '<br>Missed service: ' + report.patron.arrears + '/3 months' : ''}</div>` : ''}
      ${report.monthlyOut || report.monthlyIn ? `<p>Monthly commitments: ${report.monthlyOut.toFixed(1)} talents out · ${report.monthlyIn.toFixed(1)} in</p>` : ''}
      ${report.commitments.map(c => `<div class="chapter-agreement"><b>${esc(c.name)}</b>: ${esc(c.pressure)}<br>${c.fieldMen.toLocaleString()} troops · ${c.otherWars} other wars${c.wars.length ? '<br>' + esc(c.wars.join(', ')) : ''}</div>`).join('')}
      ${report.projects.map(p => `<div class="chapter-progress"><b>${esc(p.name)}</b> · ${esc(p.provinceName)}<progress value="${p.total - p.left}" max="${p.total}" aria-label="${esc(p.name)} progress"></progress>${p.left} months remaining${p.stalled ? ' · ' + esc(p.stalled) : ''}</div>`).join('')}
      ${report.sites.map(s => `<div class="chapter-agreement">${esc(s.name)} · ${esc(s.kind)}<br>${s.strength}% organization · ${s.stock} supply stocks · ${s.reserves} stored recruits</div>`).join('')}
      ${report.charters.map(c => `<div class="chapter-agreement">${esc(c.name)} · ${esc(c.title)}${c.kind.endsWith('_administration') ? '' : '<br>Loyalty ' + c.loyalty + '/100'}</div>`).join('')}
      ${report.pledges.map(p => `<div class="chapter-agreement">${esc(p.name)} pledges support · ${p.months} months remaining</div>`).join('')}
      ${report.shipments.map(s => `<div class="chapter-agreement">Shipment to ${esc(s.name)} · ${s.left} delivery months${s.why ? '<br>' + esc(s.why) + ' · ' + s.stalled + '/6 stalled months' : ''}</div>`).join('')}
      <div class="chapter-actions">${rows}</div>
      ${report.log.length ? `<details><summary>Recent chapter decisions</summary>${report.log.slice(0, 6).map(v => `<p>${Math.abs(v.y)} ${v.y < 0 ? 'BCE' : 'CE'} · ${esc(v.text)}</p>`).join('')}</details>` : ''}`;
    if (html !== el.innerHTML) {
      const active = el.contains(document.activeElement) ? document.activeElement : null;
      const attrs = active ? [...active.attributes].filter(a => a.name.startsWith('data-cs-')) : [];
      const panel = el.closest('#nation-panel'), scroll = panel?.scrollTop;
      el.innerHTML = html;
      if (attrs.length) {
        const next = [...el.querySelectorAll('button,select')].find(v => attrs.every(a => v.getAttribute(a.name) === a.value));
        if (next && !next.disabled) next.focus({ preventScroll: true });
      }
      if (panel) panel.scrollTop = scroll;
    }
    return true;
  }
  el.addEventListener('change', e => {
    if (e.target.dataset.csTarget) choices[e.target.dataset.csTarget] = e.target.value;
    if (e.target.dataset.csSupplier) suppliers[e.target.dataset.csSupplier] = e.target.value;
    refresh();
  });
  el.addEventListener('click', e => {
    const button = e.target.closest('[data-cs-act]'); if (!button || button.disabled) return;
    const actions = getActions(), report = actions.getChapterStrategy(), key = button.dataset.csAct;
    const action = report.actions.find(a => a.key === key), option = action?.options.find(v => v.id === choices[key]);
    actions.runChapterStrategy(key, { ...option?.args, ...(key === 'order_arms' ? { partner: suppliers[key] } : {}) });
    refresh();
  });
  el.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') e.stopPropagation(); });
  return { refresh };
}
