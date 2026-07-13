// js/ui/outliner.js — right-side outliner: armies, battles, sieges, wars (SPEC §8.2).
import { esc, fmtMen, signed, warnOnce } from './format.js';
import { icon, flagChip } from './icons.js';

export function createOutliner(el, { onArmyClick, onFocusProv, onPeaceClick, onWarClick }) {
  let ctx = null;
  let actions = null;
  let body = null;
  let lastHtml = '';

  function bind(c, a) {
    ctx = c;
    actions = a || null;
    lastHtml = '';
    el.innerHTML = `<div class="ol-head">Outliner</div><div class="ol-body" data-ref="body"></div>`;
    body = el.querySelector('[data-ref="body"]');
    el.addEventListener('click', onClick);
    refresh(true);
  }

  function runArmyAction(name, armyId) {
    if (!actions || typeof actions[name] !== 'function') return;
    try { actions[name](armyId); } catch (err) { warnOnce(name, err); }
    refresh(true);
  }

  function onClick(e) {
    if (!(e.target instanceof Element)) return;
    const sp = e.target.closest('[data-split]');
    if (sp) {
      if (!sp.classList.contains('disabled')) runArmyAction('splitArmy', Number(sp.dataset.split));
      return;
    }
    const hg = e.target.closest('[data-hire]');
    if (hg) {
      if (!hg.classList.contains('disabled')) runArmyAction('hireGeneral', Number(hg.dataset.hire));
      return;
    }
    const ma = e.target.closest('[data-mergeall]');
    if (ma) {
      if (!ma.classList.contains('disabled')) runArmyAction('mergeAllInto', Number(ma.dataset.mergeall));
      return;
    }
    const pc = e.target.closest('[data-peace]');
    if (pc) {
      if (onPeaceClick) onPeaceClick(pc.dataset.peace);
      return;
    }
    const wr = e.target.closest('[data-war]');
    if (wr) {
      if (onWarClick) onWarClick(wr.dataset.war);
      return;
    }
    const ar = e.target.closest('[data-army]');
    if (ar) {
      if (onArmyClick) onArmyClick(Number(ar.dataset.army), !!e.shiftKey);
      return;
    }
    const pr = e.target.closest('[data-prov]');
    if (pr && onFocusProv) onFocusProv(Number(pr.dataset.prov));
  }

  function provName(g, id) {
    const p = g.provinces && g.provinces[id];
    return (p && p.name) || ('#' + id);
  }

  // Mini split / hire-general buttons on the selected army row (v1.3).
  // Renders nothing unless the sim provides getArmyActions.
  function armyActionsHtml(a) {
    if (!actions || typeof actions.getArmyActions !== 'function') return '';
    let aa = null;
    try { aa = actions.getArmyActions(a.id); } catch (e) { warnOnce('getArmyActions', e); return ''; }
    if (!aa) return '';
    const splitTT = aa.canSplit
      ? 'Split off half the regiments into a new army'
      : (aa.whySplit || 'This army cannot be split');
    const hireCost = aa.hireCost != null ? aa.hireCost : 50;
    const hireTT = aa.canHire
      ? `Hire a general to lead this army (${hireCost} martial points)`
      : (aa.whyHire || 'No general can be hired');
    return `<span class="ol-acts">` +
      `<button class="ol-act${aa.canSplit ? '' : ' disabled'}" data-split="${a.id}" data-tt="${esc(splitTT)}">${icon('split')}</button>` +
      `<button class="ol-act${aa.canHire ? '' : ' disabled'}" data-hire="${a.id}" data-tt="${esc(hireTT)}">${icon('helmet')}</button>` +
      `<button class="ol-act" data-mergeall="${a.id}" data-tt="Merge every other army of ours in this province into this one">${icon('shield')}</button>` +
      `</span>`;
  }

  function warscoreFor(w, tag) {
    const ws = w.warscore;
    if (!ws) return 0;
    if (typeof ws[tag] === 'number') return ws[tag];
    if (typeof ws.attackers === 'number') {
      return (w.attackers || []).includes(tag) ? ws.attackers : -ws.attackers;
    }
    return 0;
  }

  function buildHtml() {
    const g = ctx.game;
    const player = g.playerTag;
    let html = '';

    // Armies
    const armies = Object.values(g.armies || {}).filter((a) => a && a.tag === player);
    html += `<div class="ol-sec">Armies <span class="ol-count">${armies.length}</span></div>`;
    if (!armies.length) html += `<div class="ol-empty">No armies in the field</div>`;
    for (const a of armies) {
      const sel = g.ui && (g.ui.selectedArmy === a.id
        || (Array.isArray(g.ui.selectedArmies) && g.ui.selectedArmies.indexOf(a.id) >= 0));
      const moralePct = Math.max(0, Math.min(100, ((a.morale || 0) / Math.max(0.01, a.maxMorale || 1)) * 100));
      const regs = a.regiments || {};
      const gen = a.general ? `\nGeneral: ${a.general.name} (${a.general.fire || 0}/${a.general.shock || 0}/${a.general.maneuver || 0})` : '';
      const flagsTxt = (a.inBattle ? '\n⚔ In battle' : '') + (a.retreating ? '\n↩ Retreating' : '');
      const tt = `${a.name || 'Army'} — at ${provName(g, a.prov)}\n${regs.inf || 0} infantry, ${regs.cav || 0} cavalry\nMorale: ${(a.morale || 0).toFixed(1)} / ${(a.maxMorale || 0).toFixed(1)}${gen}${flagsTxt}`;
      html += `
        <div class="ol-row ol-army${sel ? ' sel' : ''}" data-army="${a.id}" data-tt="${esc(tt)}">
          <span class="ol-name">${a.inBattle ? icon('swords', 'icon-row') + ' ' : a.retreating ? icon('retreat', 'icon-row') + ' ' : ''}${esc(a.name || ('Army ' + a.id))}</span>
          <span class="ol-men">${fmtMen(a.men)}</span>
          <span class="morale"><span class="morale-fill" style="width:${moralePct}%"></span></span>
          ${sel ? armyActionsHtml(a) : ''}
        </div>`;
    }

    // Battles involving player armies
    const involves = (ids) => (ids || []).some((id) => {
      const a = g.armies && g.armies[id];
      return a && a.tag === player;
    });
    const battles = (g.battles || []).filter((b) => b && (involves(b.atk) || involves(b.def)));
    if (battles.length) {
      html += `<div class="ol-sec">Battles <span class="ol-count">${battles.length}</span></div>`;
      for (const b of battles) {
        html += `
          <div class="ol-row ol-battle" data-prov="${b.prov}" data-tt="Click to view battle">
            <span class="ol-name">${icon('swords', 'icon-row')} ${esc(provName(g, b.prov))}</span>
            <span class="ol-sub">day ${b.day || 0}</span>
          </div>`;
      }
    }

    // Sieges relevant to the player
    const sieges = [];
    const provs = g.provinces || [];
    for (let i = 1; i < provs.length; i++) {
      const p = provs[i];
      if (!p || !p.siege) continue;
      if (p.siege.by === player || p.owner === player || p.controller === player) sieges.push(p);
    }
    if (sieges.length) {
      html += `<div class="ol-sec">Sieges <span class="ol-count">${sieges.length}</span></div>`;
      for (const p of sieges) {
        const pct = Math.round(Math.max(0, Math.min(100, p.siege.progress || 0)));
        const ours = p.siege.by === player;
        html += `
          <div class="ol-row ol-siege" data-prov="${p.id}" data-tt="${ours ? 'Our siege' : 'Under enemy siege'} — click to view">
            <span class="ol-name">${icon(ours ? 'tower' : 'alert', 'icon-row')} ${esc(p.name)}</span>
            <span class="ol-sub">${pct}%</span>
          </div>`;
      }
    }

    // Wars
    const wars = (g.wars || []).filter((w) => w
      && ((w.attackers || []).includes(player) || (w.defenders || []).includes(player)));
    if (wars.length) {
      html += `<div class="ol-sec">Wars <span class="ol-count">${wars.length}</span></div>`;
      for (const w of wars) {
        const ws = Math.round(warscoreFor(w, player));
        const cls = ws > 0 ? 'pos' : ws < 0 ? 'neg' : '';
        const peaceBtn = w.noNegotiation
          ? ''
          : `<button class="ol-peace" data-peace="${esc(w.id)}" data-tt="Negotiate peace">${icon('dove')}</button>`;
        // Lead enemy's flag before the war name (falls back to the flame glyph).
        const opp = (w.attackers || []).includes(player) ? (w.defenders || [])[0] : (w.attackers || [])[0];
        const lead = opp ? flagChip(opp, ctx.DEFINES, 14) : icon('flame', 'icon-row');
        html += `
          <div class="ol-row ol-war" data-war="${esc(w.id)}" data-tt="${esc(w.name || 'War')}\nWarscore: ${signed(ws)}%\nClick for the war overview${w.noNegotiation ? '\nThis war ends by the sword, or by events.' : ''}">
            <span class="ol-name">${lead} ${esc(w.name || 'War')}</span>
            <span class="ol-sub ${cls}">${signed(ws)}%</span>
            ${peaceBtn}
          </div>`;
      }
    }
    return html;
  }

  function refresh(force) {
    if (!ctx || !body) return;
    let html;
    try { html = buildHtml(); } catch (e) { warnOnce('outliner', e); return; }
    if (!force && html === lastHtml) return;
    lastHtml = html;
    body.innerHTML = html;
  }

  return { bind, refresh };
}
