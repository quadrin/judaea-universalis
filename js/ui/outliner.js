// js/ui/outliner.js — right-side outliner: armies, battles, sieges, wars (SPEC §8.2).
import { esc, fmtMen, signed, warnOnce } from './format.js';
import { icon, flagChip } from './icons.js';

export function createOutliner(el, { onArmyClick, onFocusProv, onPeaceClick, onWarClick, onBattleClick }) {
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
    const da = e.target.closest('[data-disband]');
    if (da) {
      if (da.classList.contains('disabled')) return;
      const row = da.closest('[data-army]');
      const name = row && row.querySelector('.ol-name') ? row.querySelector('.ol-name').textContent.trim() : 'this army';
      if (typeof globalThis.confirm === 'function'
          && !globalThis.confirm('Stand down ' + name + '? This permanently removes the army and ends its maintenance cost.')) return;
      runArmyAction('disbandArmy', Number(da.dataset.disband));
      return;
    }
    const mz = e.target.closest('[data-modernize]');
    if (mz) {
      if (!mz.classList.contains('disabled')) runArmyAction('modernizeArmy', Number(mz.dataset.modernize));
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
    const fe = e.target.closest('[data-fleet-embark]');
    if (fe) { runArmyAction('embarkFleet', Number(fe.dataset.fleetEmbark)); return; }
    const fd = e.target.closest('[data-fleet-disembark]');
    if (fd) { runArmyAction('disembarkFleet', Number(fd.dataset.fleetDisembark)); return; }
    const fa = e.target.closest('[data-fleet-admiral]');
    if (fa) {
      if (!fa.classList.contains('disabled')) runArmyAction('hireAdmiral', Number(fa.dataset.fleetAdmiral));
      return;
    }
    const fm = e.target.closest('[data-fleet-modernize]');
    if (fm) {
      if (!fm.classList.contains('disabled')) runArmyAction('modernizeFleet', Number(fm.dataset.fleetModernize));
      return;
    }
    const wl = e.target.closest('[data-wing-leader]');
    if (wl) {
      if (!wl.classList.contains('disabled')) runArmyAction('hireWingLeader', Number(wl.dataset.wingLeader));
      return;
    }
    const wg = e.target.closest('[data-wing]');
    if (wg && onFocusProv) { onFocusProv(Number(wg.dataset.wing)); return; }
    const fl = e.target.closest('[data-fleet]');
    if (fl) {
      const g = ctx && ctx.game;
      if (g && g.ui) {
        g.ui.selectedFleet = g.ui.selectedFleet === Number(fl.dataset.fleet) ? null : Number(fl.dataset.fleet);
        if (g.ui.selectedFleet != null) { g.ui.selectedArmy = null; g.ui.selectedArmies = []; }
      }
      refresh(true);
      return;
    }
    const bt = e.target.closest('[data-battle]');
    if (bt) {
      if (onBattleClick) onBattleClick(Number(bt.dataset.battle));
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
    const modTT = aa.canModernize
      ? `Modernize: re-equip ${aa.genName || 'the old pattern'} as ${aa.newGenName || 'the new pattern'} (${aa.modernizeCost} talents)`
      : (aa.genName ? `${aa.genName} — ` + (aa.whyModernize || 'nothing newer to re-equip to') : (aa.whyModernize || ''));
    const disbandTT = aa.canDisband
      ? `Stand down this army and end its upkeep${aa.disbandReturn ? `; ${fmtMen(aa.disbandReturn)} men return to manpower here` : '; no manpower returns outside controlled home territory'}`
      : (aa.whyDisband || 'This army cannot stand down now');
    return `<span class="ol-acts">` +
      `<button class="ol-act${aa.canSplit ? '' : ' disabled'}" data-split="${a.id}" data-tt="${esc(splitTT)}">${icon('split')}</button>` +
      `<button class="ol-act${aa.canHire ? '' : ' disabled'}" data-hire="${a.id}" data-tt="${esc(hireTT)}">${icon('helmet')}</button>` +
      `<button class="ol-act" data-mergeall="${a.id}" data-tt="Merge every other army of ours in this province into this one">${icon('shield')}</button>` +
      `<button class="ol-act${aa.canModernize ? '' : ' disabled'}" data-modernize="${a.id}" data-tt="${esc(modTT)}">${icon('bricks')}</button>` +
      `<button class="ol-act ol-disband${aa.canDisband ? '' : ' disabled'}" data-disband="${a.id}" data-tt="${esc(disbandTT)}">${icon('xmark')}</button>` +
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

    // The campaign contract stays visible beside the armies: what this
    // bookmark is about, what can end it, and which historical pressure comes
    // next. The full mission chain remains in the realm panel.
    if (actions && typeof actions.getCampaignGuidance === 'function') {
      let guide = null;
      try { guide = actions.getCampaignGuidance(); } catch (e) { warnOnce('campaignGuide', e); }
      if (guide) {
        const next = guide.next;
        const world = guide.worldNext;
        const when = next ? (next.months === 0 ? 'this month' : `in ${next.months} month${next.months === 1 ? '' : 's'}`) : '';
        const worldWhen = world ? (world.months === 0 ? 'this month' : `in ${world.months} month${world.months === 1 ? '' : 's'}`) : '';
        const goals = (guide.objectives || []).slice(0, 3).map((line) => {
          const cls = /^Win:/.test(line) ? 'pos' : /^Lose:/.test(line) ? 'neg' : '';
          return `<div class="ol-goal ${cls}">${esc(line)}</div>`;
        }).join('');
        html += `<div class="ol-campaign">
          <div class="ol-campaign-title">${icon('star4', 'icon-row')} ${esc(guide.system || 'Campaign')}</div>
          ${next ? `<div class="ol-clock">${icon('alert', 'icon-row')} <b>${esc(next.label)}</b> ${esc(when)}</div>` : ''}
          ${world ? `<div class="ol-clock ol-world-clock">${icon('scroll', 'icon-row')} <span>World:</span> <b>${esc(world.label)}</b> ${esc(worldWhen)}</div>` : ''}
          <div class="ol-goals">${goals}</div>
        </div>`;
      }
    }

    // Armies
    const armies = Object.values(g.armies || {}).filter((a) => a && a.tag === player);
    html += `<div class="ol-sec">Armies <span class="ol-count">${armies.length}</span></div>`;
    if (!armies.length) html += `<div class="ol-empty">No armies in the field</div>`;
    for (const a of armies) {
      const sel = g.ui && (g.ui.selectedArmy === a.id
        || (Array.isArray(g.ui.selectedArmies) && g.ui.selectedArmies.indexOf(a.id) >= 0));
      const moralePct = Math.max(0, Math.min(100, ((a.morale || 0) / Math.max(0.01, a.maxMorale || 1)) * 100));
      const regs = a.regiments || {};
      const gtr = a.general && Array.isArray(a.general.traits) && a.general.traits.length ? ', ' + a.general.traits.join(', ') : '';
      const gen = a.general ? `\nGeneral: ${a.general.name} (${a.general.fire || 0}/${a.general.shock || 0}/${a.general.maneuver || 0}${gtr})` : '';
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

    // Fleets
    let navy = null;
    if (actions && typeof actions.getNavy === 'function') {
      try { navy = actions.getNavy(); } catch (e) { warnOnce('getNavy', e); }
    }
    const fleets = (navy && navy.fleets) || [];
    if (fleets.length) {
      html += `<div class="ol-sec">Fleets <span class="ol-count">${fleets.length}</span></div>`;
      for (const f of fleets) {
        const sel = g.ui && g.ui.selectedFleet === f.id;
        const adm = f.admiral ? `\nAdmiral: ${f.admiral.name} (seamanship ${f.admiral.maneuver})` : '';
        const tt = `${f.name} — ${f.ships} ships of ${f.genName || 'the old pattern'} (${fmtMen(f.capacity)} capacity)${adm}\n`
          + (f.sailing ? 'Under sail' : 'Riding at ' + f.provName)
          + (f.aboardMen ? `\nCarrying ${fmtMen(f.aboardMen)} men` : '')
          + '\nSelect, then right-click a coastal province to sail.';
        const admTT = f.canHireAdmiral
          ? 'Hire an admiral for this fleet (50 martial points) — seamanship rides the battle die'
          : (f.admiral ? `${f.admiral.name} commands` : 'An admiral costs 50 martial points');
        const modTT = f.canModernize
          ? `Re-rig ${f.genName} as ${f.newGenName} (${f.modernizeCost} talents)`
          : (f.whyModernize || 'Nothing newer to re-rig to');
        html += `
          <div class="ol-row ol-fleet${sel ? ' sel' : ''}" data-fleet="${f.id}" data-tt="${esc(tt)}">
            <span class="ol-name">⛵ ${f.admiral ? icon('helmet', 'icon-row') + ' ' : ''}${esc(f.provName)}</span>
            <span class="ol-men">${f.ships}</span>
            ${sel ? `<span class="ol-acts">`
    + (f.canEmbark ? `<button class="ol-act" data-fleet-embark="${f.id}" data-tt="Embark our armies at this port">${icon('shield')}</button>` : '')
    + (f.canDisembark ? `<button class="ol-act" data-fleet-disembark="${f.id}" data-tt="Put the carried armies ashore here">${icon('retreat')}</button>` : '')
    + `<button class="ol-act${f.canHireAdmiral ? '' : ' disabled'}" data-fleet-admiral="${f.id}" data-tt="${esc(admTT)}">${icon('helmet')}</button>`
    + `<button class="ol-act${f.canModernize ? '' : ' disabled'}" data-fleet-modernize="${f.id}" data-tt="${esc(modTT)}">${icon('bricks')}</button>`
    + `</span>` : (f.aboardMen ? `<span class="ol-sub">${fmtMen(f.aboardMen)}</span>` : '')}
          </div>`;
      }
    }
    if (navy && navy.merchantCount > 0) {
      const inactive = Math.max(0, navy.merchantCount - (navy.merchantActive || 0));
      const tt = `${navy.merchantCount} civilian ship${navy.merchantCount === 1 ? '' : 's'} in the merchant marine`
        + (inactive ? `\n${inactive} idle under occupation, siege or blockade` : '\nEvery home port is trading');
      html += `<div class="ol-sec">Merchant Marine <span class="ol-count">${navy.merchantCount}</span></div>
        <div class="ol-row ol-merchant" data-tt="${esc(tt)}">
          <span class="ol-name">${icon('ship', 'icon-row')} Civilian shipping</span>
          <span class="ol-sub">${navy.merchantActive || 0} active</span>
        </div>`;
    }

    // Air wings (SPEC §31): squadrons at their fields, like armies in theirs
    let wings = [];
    if (actions && typeof actions.getAirWings === 'function') {
      try { wings = actions.getAirWings() || []; } catch (e) { warnOnce('getAirWings', e); }
    }
    if (wings.length) {
      html += `<div class="ol-sec">Air Wings <span class="ol-count">${wings.length}</span></div>`;
      for (const w of wings) {
        const lead = w.leader ? `\nCommander: ${w.leader.name} (bombing ${w.leader.fire}, evasion ${w.leader.maneuver})` : '';
        const tt = `${w.name} — based at ${w.provName}${lead}\n`
          + (w.raidCd > 0 ? `Rearming: ready in ${w.raidCd} day${w.raidCd === 1 ? '' : 's'}` : 'Bombed up and ready')
          + '\nRaid and rebase from the base province’s panel.';
        const leadTT = w.canHireLeader
          ? 'Hire a squadron commander (50 martial points) — bombing pips sharpen raids, evasion slips interception'
          : (w.leader ? `${w.leader.name} leads` : 'A commander costs 50 martial points');
        html += `
          <div class="ol-row ol-wing" data-wing="${w.prov}" data-tt="${esc(tt)}">
            <span class="ol-name">✈ ${w.leader ? icon('helmet', 'icon-row') + ' ' : ''}${esc(w.name)}</span>
            <span class="ol-sub">${w.raidCd > 0 ? w.raidCd + 'd' : 'ready'}</span>
            <button class="ol-act${w.canHireLeader ? '' : ' disabled'}" data-wing-leader="${w.id}" data-tt="${esc(leadTT)}">${icon('helmet')}</button>
          </div>`;
      }
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
          <div class="ol-row ol-battle" data-battle="${b.prov}" data-tt="Click to open the battle window">
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
        const peaceBtn = `<button class="ol-peace" data-peace="${esc(w.id)}" data-tt="Negotiate peace${w.noNegotiation ? ' — a fight to the death, but envoys may still be sent' : ''}">${icon('dove')}</button>`;
        // Lead enemy's flag before the war name (falls back to the flame glyph).
        const opp = (w.attackers || []).includes(player) ? (w.defenders || [])[0] : (w.attackers || [])[0];
        const lead = opp ? flagChip(opp, ctx.DEFINES, 14, true) : icon('flame', 'icon-row');
        html += `
          <div class="ol-row ol-war" data-war="${esc(w.id)}" data-tt="${esc(w.name || 'War')}\nWarscore: ${signed(ws)}%\nClick for the war overview">
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
