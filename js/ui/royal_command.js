import { esc } from './format.js';
import { icon } from './icons.js';
import { generalStarsHtml } from './general_rating.js';

export function createRoyalCommandPanel(el, getActions) {
  const choices = {};
  let lastHtml = '', binding = null;
  el.addEventListener('change', e => {
    if (e.target.matches('[data-royal-army]')) choices[e.target.dataset.royalArmy] = e.target.value;
  });
  el.addEventListener('click', e => {
    const button = e.target.closest('[data-royal-commission], [data-royal-recall]');
    if (!button || button.disabled) return;
    const actions = getActions();
    if (button.dataset.royalRecall) actions.recallRoyalGeneral(button.dataset.royalRecall);
    else {
      const role = button.dataset.royalCommission;
      const select = el.querySelector(`[data-royal-army="${role}"]`);
      actions.commissionRoyalGeneral(role, Number(select?.value));
    }
    refresh();
  });
  el.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') e.stopPropagation(); });
  function refresh() {
    const actions = getActions();
    if (binding !== actions) { binding = actions; lastHtml = ''; for (const k of Object.keys(choices)) delete choices[k]; }
    const rows = actions?.getRoyalCommands?.() || [];
    const html = rows.map(r => {
      const choice = r.armies.find(a => String(a.id) === choices[r.role]) || r.armies[0];
      if (choice) choices[r.role] = String(choice.id);
      const why = r.why || (!r.armies.length ? 'No stationary army with an empty command in controlled home territory.' : '');
      return `<article class="royal-command" data-royal-role="${r.role}">
        <div class="royal-command-head">${icon(r.role === 'ruler' ? 'laurel' : 'helmet', 'icon-sm')}<b>${esc(r.name)}</b>${generalStarsHtml(r.profile)}</div>
        <div class="royal-command-status">${r.role === 'ruler' ? 'Ruler' : 'Heir'}${r.age !== undefined ? ' · ' + r.age : ''}${r.assigned ? ' · ' + esc(r.assigned.name) : r.profile ? ' · At court' : ''}</div>
        <div class="royal-command-controls">${r.assigned
          ? `<button type="button" class="pp-build-btn" data-royal-recall="${r.role}"${r.canRecall ? '' : ' disabled'} data-tt="${esc(r.canRecall ? 'Recall to court; command skills are retained.' : 'Return to controlled home territory and halt the army before recalling its commander.')}">${icon('retreat', 'icon-sm')}Recall</button>`
          : `<select data-royal-army="${r.role}" aria-label="${r.role === 'ruler' ? 'Ruler' : 'Heir'} command army"${r.why || !r.armies.length ? ' disabled' : ''}>${r.armies.length ? r.armies.map(a => `<option value="${a.id}"${a.id === choice?.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('') : '<option>No eligible army</option>'}</select><button type="button" class="pp-build-btn" data-royal-commission="${r.role}"${why ? ' disabled' : ''} data-tt="${esc(why || r.warning)}">${icon('helmet', 'icon-sm')}Command</button>`}</div>
        ${!r.assigned && why ? `<span class="royal-command-reason">${esc(why)}</span>` : ''}
        <details><summary data-royal-risk="${r.role}">${icon('alert', 'icon-sm')} Risks and succession</summary><p>${esc(r.warning)}</p></details>
      </article>`;
    }).join('');
    if (html === lastHtml) return;
    const open = [...el.querySelectorAll('details[open]')].map(d => d.closest('[data-royal-role]')?.dataset.royalRole);
    const active = el.contains(document.activeElement) ? document.activeElement : null;
    const attrs = active ? [...active.attributes].filter(a => a.name.startsWith('data-royal-')) : [];
    const panel = el.closest('#nation-panel'), scroll = panel?.scrollTop;
    lastHtml = html; el.innerHTML = html;
    for (const role of open) el.querySelector(`[data-royal-role="${role}"] details`)?.setAttribute('open', '');
    if (attrs.length) [...el.querySelectorAll('button,select,summary')].find(v => attrs.every(a => v.getAttribute(a.name) === a.value))?.focus({ preventScroll: true });
    if (panel) panel.scrollTop = scroll;
  }
  return { refresh };
}
