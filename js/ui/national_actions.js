// National ideas unlock operations where they are used. Adoption stays in Ideas.
import { NATIONAL_IDEAS } from '../data/national_ideas.js';
import { esc, warnOnce } from './format.js';
import { icon } from './icons.js';
export const NATIONAL_ACTION_TAB = { maritime: 'trade', dynasty: 'world', colonies: 'war', subversion: 'world', federation: 'court' };
const LABELS = { maritime: 'Ports and maritime leagues', dynasty: 'Dynastic diplomacy', colonies: 'Military colonies and frontiers', subversion: 'Agents and counterintelligence', federation: 'City charters and federal service' };
const resourceNames = { gold: 'talents', manpower: 'manpower', gov: 'government points', infl: 'influence', mar: 'martial points' };
const costText = cost => Object.entries(cost || {}).filter(([,v]) => v).map(([k,v]) => `${v} ${resourceNames[k] || k}`).join(' · ') || 'No upfront cost';

export function createNationalActionsPanel(el, getActions, { tab, onChange = () => {} } = {}) {
  const picks = {}, services = {}, manual = {};
  let lastHtml = '', active = false, binding = null, preferredProvince = null;
  function refresh(self = true, cachedReport) {
    active = self;
    const actions = getActions();
    if (binding !== actions) { binding = actions; lastHtml = ''; for (const k of Object.keys(picks)) delete picks[k]; }
    const report = self ? (cachedReport === undefined ? actions?.getNationalStrategy?.() : cachedReport) : null;
    if (!report) { el.innerHTML = ''; lastHtml = ''; return false; }
    const groups = Object.keys(NATIONAL_IDEAS).filter(key => NATIONAL_ACTION_TAB[key] === tab);
    const html = groups.map(group => {
      const operations = (report.actions || []).filter(a => a.group === group);
      if (!operations.length) return '';
      const rows = operations.map(a => {
        const options = a.options || [];
        if (preferredProvince && options.some(o => Number(o.args?.province) === Number(preferredProvince))) { picks[a.key] = options.find(o => Number(o.args?.province) === Number(preferredProvince)).id; manual[a.key] = true; }
        const choice = options.find(o => o.id === picks[a.key] && (manual[a.key] || o.ok)) || options.find(o => o.ok) || options.find(o => o.id === picks[a.key]) || options[0];
        picks[a.key] = choice?.id || '';
        const args = { ...choice?.args, ...(a.key === 'charter' ? { service: services.charter || 'fiscal' } : {}) };
        const check = actions.getNationalActionInfo(a.key, args);
        const required = NATIONAL_IDEAS[group].tiers[a.tier - 1]?.name;
        const tip = [a.desc, `Requires ${required}.`, costText(check.cost), check.why].filter(Boolean).join('\n');
        return `<article class="national-operation${check.ok ? '' : ' locked'}" data-national-operation="${esc(a.key)}">`
          + `<div class="national-operation-head">${icon(a.icon, 'icon-sm')}<b>${esc(a.name)}</b><span class="national-operation-cost">${esc(costText(check.cost))}</span></div>`
          + `<div class="national-operation-controls">${a.target !== 'none' ? `<select data-na-target="${esc(a.key)}" aria-label="${esc(a.name + ' target')}">${options.length ? options.map(o => `<option value="${esc(o.id)}"${o.id === choice?.id ? ' selected' : ''}>${esc(o.name)}</option>`).join('') : '<option value="">No eligible targets</option>'}</select>` : ''}`
          + (a.key === 'charter' ? `<select data-na-service="charter" aria-label="City charter service">${['fiscal','levy','naval'].map(v => `<option value="${v}"${(services.charter || 'fiscal') === v ? ' selected' : ''}>${v[0].toUpperCase() + v.slice(1)}</option>`).join('')}</select>` : '')
          + `<button class="pp-build-btn" type="button" data-ni-act="${esc(a.key)}"${check.ok ? '' : ' disabled'} title="${esc(tip)}" data-tt="${esc(tip)}" aria-label="${esc(a.name)}">${icon(check.ok ? 'play' : 'lock', 'icon-sm')}<span>${esc(a.name)}</span></button></div>`
          + (check.why ? `<p class="national-operation-reason">${esc(check.why)}</p>` : '')
          + `<details><summary>Terms and requirements</summary><p>${esc(a.desc)}</p><p>Requires ${esc(required)}.</p></details></article>`;
      }).join('');
      const records = (report.records || []).filter(r => r.group === group).map(r => `<div class="ni-record" title="${esc(r.tip)}" data-tt="${esc(r.tip)}"><span>${icon(r.icon, 'icon-sm')}${esc(r.name)}</span><span>${r.stats.map(([,value]) => esc(value)).join(' · ')}</span>${r.progress ? `<progress max="${r.progress.total}" value="${r.progress.done}" aria-label="${esc(r.name + ' progress')}"></progress>` : ''}</div>`).join('');
      return `<section class="national-operation-group" data-national-group="${group}"><h4>${icon(NATIONAL_IDEAS[group].icon, 'icon-sm')}${esc(LABELS[group])}</h4>${records}${rows}</section>`;
    }).join('');
    preferredProvince = null;
    if (html !== lastHtml) {
      const panel = el.closest('#nation-panel'), scroll = panel?.scrollTop;
      const focus = document.activeElement && el.contains(document.activeElement) ? document.activeElement : null;
      const attrs = focus ? [...focus.attributes].filter(a => a.name.startsWith('data-na-') || a.name === 'data-ni-act') : [];
      lastHtml = html; el.innerHTML = html;
      if (attrs.length) [...el.querySelectorAll('select,button')].find(n => attrs.every(a => n.getAttribute(a.name) === a.value))?.focus({ preventScroll: true });
      if (panel) panel.scrollTop = scroll;
    }
    return !!html;
  }
  el.addEventListener('change', e => {
    if (!active) return;
    if (e.target.dataset.naTarget) { picks[e.target.dataset.naTarget] = e.target.value; manual[e.target.dataset.naTarget] = true; }
    if (e.target.dataset.naService) services[e.target.dataset.naService] = e.target.value;
    refresh(true);
  });
  el.addEventListener('click', e => {
    const button = e.target.closest('[data-ni-act]');
    if (!button || !active || button.disabled) return;
    const actions = getActions(), key = button.dataset.niAct;
    const item = actions.getNationalStrategy().actions.find(a => a.key === key);
    if (!item) return;
    const choice = item.options.find(o => o.id === picks[key]) || item.options.find(o => o.ok) || item.options[0];
    try {
      const result = actions.runNationalAction(key, { ...choice?.args, ...(key === 'charter' ? { service: services.charter || 'fiscal' } : {}) });
      if (result?.ok === false) actions.notify?.({ title: 'Action unavailable', text: result.why, type: 'bad' });
    } catch (err) { warnOnce('national-operation', err); }
    refresh(true); onChange();
  });
  el.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') e.stopPropagation(); });
  function focusGroup(group, province) {
    preferredProvince = province; refresh(active);
    const section = el.querySelector(`[data-national-group="${group}"]`);
    if (section) { section.scrollIntoView({ block: 'start' }); section.querySelector('select,button')?.focus({ preventScroll: true }); }
  }
  return { refresh, focusGroup };
}

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
      return `<article class="allied-order"><h4>${esc(a.name)}</h4><p>Trust ${esc(a.trust)} · ${esc(a.favors)} favors${choice ? ' · willingness ' + esc(choice.willingness) + (choice.favorCost ? ' · ' + esc(choice.favorCost) + ' favors on acceptance' : '') : ''}</p><p class="national-operation-reason">${esc((a.reasons || []).join(' · '))}</p>`
        + `<div class="national-operation-controls"><select data-allied-target="${esc(a.tag)}" aria-label="Orders requested from ${esc(a.name)}">${options.length ? options.map(o => `<option value="${esc(o.kind + '|' + o.province)}"${o === choice ? ' selected' : ''}>${esc((names[o.kind] || o.kind) + ': ' + o.name)}</option>`).join('') : '<option value="">No eligible shared objectives</option>'}</select>`
        + `<button class="pp-build-btn" data-allied-request="${esc(a.tag)}"${choice?.can ? '' : ' disabled'} title="${esc(choice?.why || 'Request allied support')}">${icon('dove', 'icon-sm')}Request support</button></div>`
        + (choice?.why ? `<p class="national-operation-reason">${esc(choice.why)}</p>` : '') + '</article>';
    }).join('');
    const requests = (report.requests || []).map(r => `<div class="allied-order-request"><span>${esc(report.allies.find(a => a.tag === r.ally)?.name || r.ally)} · ${esc(names[r.kind] || r.kind)}${r.provinceName ? ' · ' + esc(r.provinceName) : ''} · ${esc(r.status)}${r.reason ? ' · ' + esc(r.reason) : ''}</span>${['pending','accepted','marching','holding','suspended'].includes(r.status) ? `<button class="pp-dip" data-allied-cancel="${esc(r.id)}">Cancel request</button>` : ''}</div>`).join('');
    const html = rows + requests + `<p class="national-operation-reason" role="status" aria-live="polite">${esc(feedback)}</p>`;
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
