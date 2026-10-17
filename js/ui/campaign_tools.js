import { esc, fmtMen } from './format.js';
import { armGenName } from '../data/units.js';
import { buildingFace } from '../sim/military.js';

export function createCampaignTools({ getCtx, getActions, onProvince }) {
  let modal = null, tab = 'buildings', building = 'market', sort = 'income', selected = new Set();
  let counts = { inf: 4, cav: 1, art: 0 }, rally = 0, templateName = 'Field army';
  let target = '', offers = {};
  const openState = () => !!modal && !modal.classList.contains('hidden');
  const close = () => { if (modal) modal.classList.add('hidden'); };
  function shell(title, body) {
    if (!modal) {
      modal = document.createElement('div'); modal.id = 'campaign-tools'; modal.className = 'campaign-modal';
      document.getElementById('ui-root').appendChild(modal);
    }
    modal.innerHTML = `<div class="modal-scrim"></div><div class="ev-card peace-card campaign-card" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <h2>${esc(title)}</h2>${body}<button class="btn peace-cancel" data-close>Close</button></div>`;
    modal.classList.remove('hidden');
    modal.querySelector('[data-close]').addEventListener('click', close);
    modal.querySelector('.modal-scrim').addEventListener('click', close);
  }
  function render() {
    const ctx = getCtx(), actions = getActions(); if (!ctx || !actions) return;
    if (target) { renderWar(); return; }
    const g = ctx.game, mine = g.tags[g.playerTag];
    const owned = g.provinces.filter(p => p && !p.impassable && p.owner === g.playerTag && p.controller === g.playerTag);
    if (!owned.some(p => p.id === rally)) rally = owned[0]?.id || 0;
    const nav = `<div class="campaign-tabs"><button class="btn" data-tab="buildings" aria-pressed="${tab === 'buildings'}">Buildings</button>
      <button class="btn" data-tab="armies" aria-pressed="${tab === 'armies'}">Army templates</button></div>`;
    let body = '';
    if (tab === 'buildings') {
      const rows = actions.getMacrobuilder(building).sort((a, b) => sort === 'name' ? a.province.localeCompare(b.province)
        : sort === 'cost' ? a.cost - b.cost || b.income - a.income : b.income - a.income || a.id - b.id);
      selected = new Set([...selected].filter(id => rows.some(r => r.id === id && r.canBuild)));
      const total = rows.filter(r => selected.has(r.id)).reduce((s, r) => s + r.cost, 0);
      body = `<div class="campaign-controls"><label>Building <select data-building>${Object.entries(ctx.DEFINES.BUILDINGS).map(([key, def]) =>
        `<option value="${key}"${key === building ? ' selected' : ''}>${esc(buildingFace(def, mine.tech?.mar || 0).name || def.name)}</option>`).join('')}</select></label>
        <label>Sort <select data-sort><option value="income"${sort === 'income' ? ' selected' : ''}>Income gain</option><option value="name"${sort === 'name' ? ' selected' : ''}>Province</option><option value="cost"${sort === 'cost' ? ' selected' : ''}>Cost</option></select></label></div>
        <p>Income gain estimates tax and production at current autonomy and national modifiers, before tribute and trade changes. Other benefits appear in each row.</p>
        <div class="campaign-table"><table><thead><tr><th>Select</th><th>Province</th><th>Cost</th><th>Months</th><th>Income/month</th><th>Payback</th><th>Benefits / availability</th></tr></thead><tbody>${rows.map(r =>
          `<tr><td><input type="checkbox" data-select="${r.id}" aria-label="Select ${esc(r.province)}"${selected.has(r.id) ? ' checked' : ''}${r.canBuild ? '' : ' disabled'}></td>
          <td><button class="campaign-link" data-province="${r.id}">${esc(r.province)}</button></td><td>${r.cost}</td><td>${r.months}</td><td>+${r.income.toFixed(2)}</td>
          <td>${r.income > 0 ? (r.cost / r.income / 12).toFixed(1) + ' years' : '—'}</td><td>${esc(r.desc)}${r.canBuild ? '' : '<br>' + esc(r.whyNot)}</td></tr>`).join('')}</tbody></table></div>
        ${rows.length ? '' : '<p>No eligible provinces for this building in this age.</p>'}
        <button class="btn" data-build${!selected.size || total > mine.treasury ? ' disabled' : ''}>Build selected (${selected.size}) · ${total} talents</button>`;
    } else {
      const plan = actions.getArmyTemplate(counts, rally);
      const templates = (g.armyTemplates || []).filter(t => t.tag === g.playerTag);
      body = `<div class="campaign-controls">${['inf', 'cav', 'art'].map(k => `<label>${esc(armGenName(plan.gen || 0, k))}<input type="number" data-arm="${k}" min="0" max="100" step="1" value="${counts[k]}" aria-label="${k} regiments"></label>`).join('')}
        <label>Rally province<select data-rally>${owned.map(p => `<option value="${p.id}"${rally === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label></div>
        <p>Recruit across safe connected provinces. Each province trains one regiment at a time; completed units march to the rally province and merge. Travel adds to the training time.</p>
        <div class="campaign-controls"><label>Template name<input data-template-name maxlength="40" value="${esc(templateName)}"></label><button class="btn" data-save-template>Save template</button>
        <label>Saved templates<select data-load-template><option value="">Choose…</option>${templates.map((t, i) => `<option value="${i}">${esc(t.name)}</option>`).join('')}</select></label></div>
        <div data-plan>${plan.orders.length ? `${plan.total} regiments · ${plan.cost} talents · ${fmtMen(plan.manpower)} manpower · up to ${plan.months} training months` : ''}
        <p class="${plan.ok ? 'pos' : 'neg'}">${esc(plan.why || 'Ready to recruit.')}</p>
        <div class="campaign-table"><table><thead><tr><th>Province</th><th>Unit</th><th>Training ready</th></tr></thead><tbody>${plan.orders.map(o => `<tr><td>${esc(o.name)}</td><td>${esc(armGenName(plan.gen, o.type))}</td><td>Month ${o.readyMonth}</td></tr>`).join('')}</tbody></table></div></div>
        <button class="btn" data-muster${plan.ok ? '' : ' disabled'}>Recruit and assemble</button>`;
    }
    shell('Macrobuilder', nav + body);
    modal.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
    modal.querySelector('[data-building]')?.addEventListener('change', e => { building = e.target.value; selected.clear(); render(); });
    modal.querySelector('[data-sort]')?.addEventListener('change', e => { sort = e.target.value; render(); });
    modal.querySelectorAll('[data-select]').forEach(b => b.addEventListener('change', () => { const id = Number(b.dataset.select); b.checked ? selected.add(id) : selected.delete(id); render(); }));
    modal.querySelectorAll('[data-province]').forEach(b => b.addEventListener('click', () => { close(); onProvince(Number(b.dataset.province)); }));
    modal.querySelector('[data-build]')?.addEventListener('click', () => { actions.buildMacroSelection([...selected], building); selected.clear(); render(); });
    modal.querySelectorAll('[data-arm]').forEach(b => b.addEventListener('change', () => { counts[b.dataset.arm] = Number(b.value); render(); }));
    modal.querySelector('[data-rally]')?.addEventListener('change', e => { rally = Number(e.target.value); render(); });
    modal.querySelector('[data-template-name]')?.addEventListener('input', e => { templateName = e.target.value; });
    modal.querySelector('[data-save-template]')?.addEventListener('click', () => { actions.saveArmyTemplate(templateName, counts, rally); render(); });
    modal.querySelector('[data-load-template]')?.addEventListener('change', e => { const t = templates[Number(e.target.value)]; if (e.target.value !== '' && t) { counts = { ...t.counts }; templateName = t.name; render(); } });
    modal.querySelector('[data-muster]')?.addEventListener('click', () => { actions.recruitTemplate(counts, rally); render(); });
  }
  function renderWar() {
    const actions = getActions(), ctx = getCtx();
    const plan = actions.getWarPlan(target, offers); if (!plan) { close(); return; }
    shell('Declare war on ' + plan.name, `<p>Stability cost: ${plan.stabilityCost}. Allies evaluate trust, favors, and promised provinces as well as their ability to fight.</p>
      <div class="campaign-allies">${plan.allies.map(a => `<div class="campaign-ally"><strong>${esc(a.name)}</strong> · trust ${Math.round(a.trust)} · favors ${Math.floor(a.favors)}
        <label>Call to arms<select data-offer="${a.ally}"><option value="ordinary">Ordinary call</option>
        <option value="favors"${offers[a.ally]?.favors ? ' selected' : ''}>Spend 10 favors</option>${a.interests.map(p =>
          `<option value="province:${p.id}"${offers[a.ally]?.province === p.id ? ' selected' : ''}>Promise ${esc(p.name)}</option>`).join('')}</select></label>
        <p class="${a.ok ? 'pos' : 'neg'}">${a.ok ? 'Will join' : 'Will stay home'}: ${esc(a.reasons.join('; '))}</p></div>`).join('') || '<p>We have no allies to call.</p>'}</div>
      <p>Promised land can be assigned to the ally in the peace treaty. Keeping the promise earns 10 trust; a victorious settlement that breaks it costs 25 trust and 50 opinion.</p>
      <p class="neg">${esc(plan.whyNot || '')}</p><button class="btn" data-declare${plan.canWar ? '' : ' disabled'}>Declare war</button>`);
    modal.querySelectorAll('[data-offer]').forEach(b => b.addEventListener('change', () => {
      offers[b.dataset.offer] = b.value === 'favors' ? { favors: true } : b.value.startsWith('province:') ? { province: Number(b.value.split(':')[1]) } : {};
      renderWar();
    }));
    modal.querySelector('[data-declare]')?.addEventListener('click', () => { actions.declareWarOn(target, offers); close(); });
  }
  return { open() { target = ''; render(); }, openWar(tag) { target = tag; offers = {}; renderWar(); },
    close, isOpen: openState, refresh() { if (openState() && !modal.contains(document.activeElement)) render(); } };
}
