// js/ui/nation_panel.js — the realm panel, opened by clicking the topbar flag.
// Ruler & skills, government, economy, military, diplomacy at a glance, the
// central levers (reserves, stability, loans) and the national decisions.
import { esc, rgb, fmtMoney, fmtMen, fmtYear, signed, warnOnce, titleCase } from './format.js';
import { icon, flagChip } from './icons.js';

export function createNationPanel(el, { DEFINES, onClose, onPeaceClick }) {
  let ctx = null;
  let actions = null;
  const refs = {};

  function setText(node, s) {
    if (node && node.textContent !== s) node.textContent = s;
  }
  function setHtml(node, s) {
    if (node && node.__html !== s) { node.__html = s; node.innerHTML = s; }
  }

  function bind(c, a) {
    ctx = c;
    actions = a;
    build();
  }

  function build() {
    el.innerHTML = `
      <div class="pp-head">
        <h2 class="pp-name np-title"><span data-ref="flag"></span><span data-ref="name"></span></h2>
        <button class="pp-close" data-ref="close" data-tt="Close (Esc)">${icon('xmark')}</button>
      </div>
      <div class="np-ruler">
        <div class="np-ruler-text">
          <div class="np-ruler-name" data-ref="rulerName"></div>
          <div class="np-ruler-title" data-ref="rulerTitle"></div>
        </div>
        <div class="np-pips" data-ref="rulerPips"></div>
      </div>
      <div class="pp-grid">
        <div class="pp-row"><span class="pp-k">${icon('altar', 'icon-k')}Religion</span><span class="pp-v"><span class="dot" data-ref="religionDot"></span><span data-ref="religion"></span></span></div>
        <div class="pp-row"><span class="pp-k">${icon('amphora', 'icon-k')}Culture</span><span class="pp-v"><span class="dot" data-ref="cultureDot"></span><span data-ref="culture"></span></span></div>
        <div class="pp-row"><span class="pp-k">${icon('temple', 'icon-k')}Capital</span><span class="pp-v" data-ref="capital"></span></div>
        <div class="pp-row" data-ref="provRow" data-tt="Provinces owned · total development"><span class="pp-k">${icon('bricks', 'icon-k')}Realm</span><span class="pp-v" data-ref="realm"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('scales', 'icon-k')}Stability</span><span class="pp-v" data-ref="stability"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('laurel', 'icon-k')}Legitimacy</span><span class="pp-v" data-ref="legitimacy"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('flame', 'icon-k')}War exhaustion</span><span class="pp-v" data-ref="warExh"></span></div>
        <div class="pp-row" data-ref="treasuryRow"><span class="pp-k">${icon('coins', 'icon-k')}Treasury</span><span class="pp-v" data-ref="treasury"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('borrow', 'icon-k')}Loans</span><span class="pp-v" data-ref="loans"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('spears', 'icon-k')}Manpower</span><span class="pp-v" data-ref="manpower"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('shield', 'icon-k')}Armies</span><span class="pp-v" data-ref="armies"></span></div>
      </div>
      <div class="np-acts">
        <button class="pp-build-btn" data-act="callReserves" data-ref="actReserves">${icon('spears')}<span>Call Reserves</span></button>
        <button class="pp-build-btn" data-act="buyStability" data-ref="actStability">${icon('scales')}<span>Restore Order</span></button>
        <button class="pp-build-btn" data-act="takeLoan" data-ref="actBorrow">${icon('borrow')}<span>Take Loan</span></button>
        <button class="pp-build-btn" data-act="repayLoan" data-ref="actRepay">${icon('repay')}<span>Repay Loan</span></button>
      </div>
      <div class="pp-diplo">
        <div class="pp-diplo-title">Diplomacy</div>
        <div data-ref="diploBody"></div>
      </div>
      <div class="pp-build">
        <div class="pp-build-title">Decisions</div>
        <div class="np-decisions" data-ref="decisions"></div>
      </div>`;
    el.querySelectorAll('[data-ref]').forEach((n) => { refs[n.dataset.ref] = n; });

    refs.close.addEventListener('click', () => { if (onClose) onClose(); else close(); });
    el.addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;
      const act = e.target.closest('[data-act]');
      if (act) {
        if (act.classList.contains('disabled') || !actions) return;
        const fn = actions[act.dataset.act];
        if (typeof fn === 'function') { try { fn(); } catch (err) { warnOnce('np-' + act.dataset.act, err); } }
        refresh();
        return;
      }
      const dec = e.target.closest('[data-decision]');
      if (dec) {
        if (dec.classList.contains('disabled') || !actions || typeof actions.enactDecision !== 'function') return;
        try { actions.enactDecision(dec.dataset.decision); } catch (err) { warnOnce('np-decision', err); }
        refresh();
        return;
      }
      const pc = e.target.closest('[data-peace]');
      if (pc && onPeaceClick) onPeaceClick(pc.dataset.peace);
    });
  }

  function open() {
    if (!ctx) return;
    el.classList.remove('hidden');
    refresh();
  }
  function close() { el.classList.add('hidden'); }
  function isOpen() { return !el.classList.contains('hidden'); }

  function refresh() {
    if (!ctx || !isOpen()) return;
    const g = ctx.game;
    const t = g.tags && g.tags[g.playerTag];
    if (!t) { close(); return; }
    const TAGS = DEFINES.TAGS || {};
    const def = TAGS[g.playerTag] || {};

    setHtml(refs.flag, flagChip(g.playerTag, DEFINES, 22));
    setText(refs.name, t.name || g.playerTag);

    // Ruler & skills (skills 0-6; monthly gain is base +2 per pool)
    const r = t.ruler || {};
    setText(refs.rulerName, r.name || '—');
    setText(refs.rulerTitle, r.title || 'Ruler');
    const sk = (k) => Math.max(0, Math.min(6, Number.isFinite(r[k]) ? r[k] : 2));
    setHtml(refs.rulerPips,
      `<span class="tb-pt" data-tt="Governance skill ${sk('gov')} — +${2 + sk('gov')} governance points a month"><b>G</b>${sk('gov')}</span>` +
      `<span class="tb-pt" data-tt="Influence skill ${sk('infl')} — +${2 + sk('infl')} influence points a month"><b>I</b>${sk('infl')}</span>` +
      `<span class="tb-pt" data-tt="Martial skill ${sk('mar')} — +${2 + sk('mar')} martial points a month"><b>M</b>${sk('mar')}</span>`);

    // Government block
    const rel = (DEFINES.RELIGIONS || {})[t.religion];
    setText(refs.religion, (rel && rel.name) || titleCase(t.religion));
    refs.religionDot.style.background = rgb(rel && rel.color);
    const cul = (DEFINES.CULTURES || {})[t.culture];
    setText(refs.culture, (cul && cul.name) || titleCase(t.culture));
    refs.cultureDot.style.background = rgb(cul && cul.color);
    const capName = def.capital || '';
    if (capName) {
      const cap = ctx.prov ? ctx.prov(capName) : null;
      const held = cap && cap.controller === g.playerTag;
      setHtml(refs.capital, esc(capName) + (held ? '' : ' <span class="np-lost">(lost)</span>'));
    } else {
      setText(refs.capital, '—');
    }
    let provs = 0, devSum = 0;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.owner !== g.playerTag) continue;
      provs++;
      devSum += (p.dev ? (p.dev.tax || 0) + (p.dev.prod || 0) + (p.dev.mp || 0) : 0);
    }
    setText(refs.realm, provs + ' provinces · ' + devSum + ' dev');
    const stab = Math.round(t.stability || 0);
    setHtml(refs.stability, `<span class="${stab > 0 ? 'pos' : stab < 0 ? 'neg' : ''}">${signed(stab)}</span>`);
    setText(refs.legitimacy, String(Math.round(t.legitimacy || 0)));
    setText(refs.warExh, (t.warExhaustion || 0).toFixed(1) + ' / 20');

    // Economy & military
    const net = (t.income || 0) - (t.expenses || 0);
    setHtml(refs.treasury, `${fmtMoney(t.treasury)} <span class="${net < 0 ? 'neg' : 'pos'}">(${net >= 0 ? '+' : '−'}${Math.abs(net).toFixed(1)}/mo)</span>`);
    refs.treasuryRow.dataset.tt = `Income: +${(t.income || 0).toFixed(1)} / month\nExpenses: −${(t.expenses || 0).toFixed(1)} / month`;
    setText(refs.loans, String(Math.max(0, Math.round(t.loans || 0))));
    setText(refs.manpower, fmtMen(t.manpower) + ' / ' + fmtMen(t.maxManpower));
    let armyN = 0, men = 0;
    for (const a of Object.values(g.armies || {})) {
      if (a && a.tag === g.playerTag) { armyN++; men += a.men || 0; }
    }
    setText(refs.armies, armyN + ' (' + fmtMen(men) + ' men)');

    refreshActions(t);
    refreshDiplomacy(g, t);
    refreshDecisions();
  }

  function setAct(btn, can, tt) {
    btn.classList.toggle('disabled', !can);
    btn.dataset.tt = tt;
  }

  function refreshActions(t) {
    const pts = t.points || {};
    const canRes = (pts.mar || 0) >= 50 && (t.manpower || 0) < (t.maxManpower || 0);
    setAct(refs.actReserves, canRes, canRes
      ? 'Call up reserves: +2,000 manpower (50 martial points)'
      : ((pts.mar || 0) < 50 ? 'Not enough martial points (50 required).' : 'Every fighting man is already mustered.')
        + '\nCall up reserves: +2,000 manpower (50 martial points)');
    const canStab = (pts.gov || 0) >= 75 && (t.stability || 0) < 3;
    setAct(refs.actStability, canStab, canStab
      ? 'Restore order: +1 stability (75 governance points)'
      : ((pts.gov || 0) < 75 ? 'Not enough governance points (75 required).' : 'The realm is as steady as it will ever be.')
        + '\nRestore order: +1 stability (75 governance points)');
    let loans = null;
    if (actions && typeof actions.getLoans === 'function') {
      try { loans = actions.getLoans(); } catch (e) { warnOnce('np-getLoans', e); }
    }
    const canTake = !!(loans && loans.canTake);
    const canRepay = !!(loans && loans.canRepay);
    setAct(refs.actBorrow, canTake, 'Take a loan: 150 talents now, 3 talents/month interest until repaid');
    setAct(refs.actRepay, canRepay, canRepay ? 'Repay a loan: 150 talents' : 'Repaying a loan takes 150 talents in hand — and a debt to settle.');
  }

  function refreshDiplomacy(g, t) {
    const TAGS = DEFINES.TAGS || {};
    const chip = (tag) => flagChip(tag, DEFINES, 15);
    const nameOf = (tag) => esc((g.tags[tag] && g.tags[tag].name) || (TAGS[tag] && TAGS[tag].name) || tag);
    let html = '';

    const allies = (t.allies || []).filter((a) => g.tags[a] && g.tags[a].alive);
    html += `<div class="np-dip-sec">Allies</div>`;
    html += allies.length
      ? allies.map((a) => `<div class="np-dip-row">${chip(a)}<span class="np-dip-name">${nameOf(a)}</span></div>`).join('')
      : `<div class="np-dip-none">No sworn allies</div>`;

    const wars = (g.wars || []).filter((w) => w
      && ((w.attackers || []).indexOf(g.playerTag) >= 0 || (w.defenders || []).indexOf(g.playerTag) >= 0));
    html += `<div class="np-dip-sec">Wars</div>`;
    if (wars.length) {
      for (const w of wars) {
        const ws = Math.round((w.warscore && w.warscore[g.playerTag]) || 0);
        const opp = (w.attackers || []).indexOf(g.playerTag) >= 0 ? (w.defenders || [])[0] : (w.attackers || [])[0];
        const dove = w.noNegotiation
          ? ''
          : `<button class="ol-peace np-dove" data-peace="${esc(w.id)}" data-tt="Negotiate peace">${icon('dove')}</button>`;
        html += `<div class="np-dip-row" data-tt="${esc(w.name || 'War')}\nWar score: ${signed(ws)}%${w.noNegotiation ? '\nThis war ends by the sword, or by events.' : ''}">`
          + (opp ? chip(opp) : icon('flame', 'icon-row'))
          + `<span class="np-dip-name">${esc(w.name || 'War')}</span>`
          + `<span class="np-dip-ws ${ws > 0 ? 'pos' : ws < 0 ? 'neg' : ''}">${signed(ws)}%</span>${dove}</div>`;
      }
    } else {
      html += `<div class="np-dip-none">At peace</div>`;
    }

    const truces = [];
    for (const key of Object.keys(g.truces || {})) {
      const parts = key.split('|');
      if (parts.indexOf(g.playerTag) < 0) continue;
      const other = parts[0] === g.playerTag ? parts[1] : parts[0];
      const tr = g.truces[key];
      if (!tr || !g.tags[other]) continue;
      if (g.date.y > tr.y || (g.date.y === tr.y && g.date.m >= tr.m)) continue; // expired
      truces.push({ other, tr });
    }
    if (truces.length) {
      html += `<div class="np-dip-sec">Truces</div>`;
      for (const { other, tr } of truces) {
        const mn = (DEFINES.MONTH_NAMES || [])[tr.m - 1] || ('M' + tr.m);
        html += `<div class="np-dip-row">${chip(other)}<span class="np-dip-name">${nameOf(other)}</span>`
          + `<span class="np-dip-ws">until ${esc(mn)} ${esc(fmtYear(tr.y))}</span></div>`;
      }
    }
    setHtml(refs.diploBody, html);
  }

  function refreshDecisions() {
    let list = [];
    if (actions && typeof actions.getDecisions === 'function') {
      try { list = actions.getDecisions() || []; } catch (e) { warnOnce('np-getDecisions', e); }
    }
    setHtml(refs.decisions, list.map((d) => {
      const terms = `${d.name} — ${d.costText}\n${d.desc}\nCan be repeated every ${d.cooldownMonths} months.`;
      const tt = d.canEnact ? terms : `${d.whyNot}\n――――――\n${terms}`;
      return `<button class="pp-build-btn np-dec${d.canEnact ? '' : ' disabled'}" data-decision="${esc(d.key)}" data-tt="${esc(tt)}">`
        + `${icon(d.icon || 'scroll')}<span>${esc(d.name)}</span><span class="np-dec-cost">${esc(d.costText)}</span></button>`;
    }).join('') || '<div class="np-dip-none">No decisions available</div>');
  }

  return { bind, open, close, refresh, isOpen };
}
