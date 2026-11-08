// Allied coordination on the World tab: ask an ally to defend, relieve or
// join an offensive. Requests use the allies' trust and favors.
import { esc } from './format.js';
import { icon } from './icons.js';

export function createAlliedOrdersPanel(el, getActions, onChange = () => {}) {
  const selected = {};
  let lastHtml = '', enabled = false, feedback = '';
  function refresh(self = true, ally = null) {
    enabled = self;
    const report = getActions()?.getAlliedOrders?.(ally);
    if (!report || !self || !(report.allies?.length || report.requests?.length)) { el.innerHTML = ''; lastHtml = ''; return false; }
    const names = { defend: 'Defend province', relieve: 'Relieve siege', offensive: 'Joint offensive' };
    const rows = report.allies.map(a => {
      const options = a.options || [], choice = options.find(o => `${o.kind}|${o.province}` === selected[a.tag]) || options.find(o => o.can) || options[0];
      selected[a.tag] = choice ? `${choice.kind}|${choice.province}` : '';
      return `<article class="allied-order"><h4>${esc(a.name)}</h4><p>Trust ${esc(a.trust)} · ${esc(a.favors)} favors${choice ? ' · willingness ' + esc(choice.willingness) + (choice.favorCost ? ' · ' + esc(choice.favorCost) + ' favors on acceptance' : '') : ''}</p><p class="allied-order-reason">${esc((a.reasons || []).join(' · '))}</p>`
        + `<div class="allied-order-controls"><select data-allied-target="${esc(a.tag)}" aria-label="Orders requested from ${esc(a.name)}">${options.length ? options.map(o => `<option value="${esc(o.kind + '|' + o.province)}"${o === choice ? ' selected' : ''}>${esc((names[o.kind] || o.kind) + ': ' + o.name)}</option>`).join('') : '<option value="">No eligible shared objectives</option>'}</select>`
        + `<button class="pp-build-btn" data-allied-request="${esc(a.tag)}"${choice?.can ? '' : ' disabled'} title="${esc(choice?.why || 'Request allied support')}">${icon('dove', 'icon-sm')}Request support</button></div>`
        + (choice?.why ? `<p class="allied-order-reason">${esc(choice.why)}</p>` : '') + '</article>';
    }).join('');
    const requests = (report.requests || []).map(r => `<div class="allied-order-request"><span>${esc(report.allies.find(a => a.tag === r.ally)?.name || r.ally)} · ${esc(names[r.kind] || r.kind)}${r.provinceName ? ' · ' + esc(r.provinceName) : ''} · ${esc(r.status)}${r.reason ? ' · ' + esc(r.reason) : ''}</span>${['pending','accepted','marching','holding','suspended'].includes(r.status) ? `<button class="pp-dip" data-allied-cancel="${esc(r.id)}">Cancel request</button>` : ''}</div>`).join('');
    const html = rows + requests + `<p class="allied-order-reason" role="status" aria-live="polite">${esc(feedback)}</p>`;
    if (html !== lastHtml) { el.innerHTML = html; lastHtml = html; }
    return true;
  }
  el.addEventListener('change', e => { if (e.target.dataset.alliedTarget) { selected[e.target.dataset.alliedTarget] = e.target.value; refresh(enabled); } });
  el.addEventListener('click', e => {
    if (!enabled) return;
    const request = e.target.closest('[data-allied-request]'), cancel = e.target.closest('[data-allied-cancel]');
    if (request && !request.disabled) {
      const [kind, province] = (selected[request.dataset.alliedRequest] || '').split('|');
      const result = getActions().requestAlliedOrder(request.dataset.alliedRequest, kind, Number(province));
      feedback = result?.ok === false ? result.why : result?.ok ? (result.why || 'The allied court accepted the request.') : 'Request sent.';
    } else if (cancel) {
      const result = getActions().cancelAlliedOrder(cancel.dataset.alliedCancel);
      feedback = result?.ok === false ? result.why : result?.ok ? 'Allied request cancelled.' : 'Cancellation sent.';
    }
    else return;
    refresh(enabled); onChange();
  });
  return { refresh };
}
