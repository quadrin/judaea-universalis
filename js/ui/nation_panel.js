// js/ui/nation_panel.js — the realm panel, opened by clicking the topbar flag.
// Ruler & skills, government, economy, military, diplomacy at a glance, the
// central levers (reserves, stability, loans) and the national decisions.
import { esc, rgb, fmtMoney, fmtMen, fmtYear, signed, warnOnce, titleCase } from './format.js';
import { icon, flagChip } from './icons.js';

export function createNationPanel(el, { DEFINES, onClose, onPeaceClick, onWarClick }) {
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
      <div class="np-heir" data-ref="heirRow"></div>
      <div class="pp-grid">
        <div class="pp-row"><span class="pp-k">${icon('altar', 'icon-k')}Religion</span><span class="pp-v"><span class="dot" data-ref="religionDot"></span><span data-ref="religion"></span></span></div>
        <div class="pp-row"><span class="pp-k">${icon('amphora', 'icon-k')}Culture</span><span class="pp-v"><span class="dot" data-ref="cultureDot"></span><span data-ref="culture"></span></span></div>
        <div class="pp-row"><span class="pp-k">${icon('temple', 'icon-k')}Capital</span><span class="pp-v" data-ref="capital"></span></div>
        <div class="pp-row" data-ref="provRow" data-tt="Provinces owned · total development"><span class="pp-k">${icon('bricks', 'icon-k')}Realm</span><span class="pp-v" data-ref="realm"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('scales', 'icon-k')}Stability</span><span class="pp-v" data-ref="stability"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('laurel', 'icon-k')}Legitimacy</span><span class="pp-v" data-ref="legitimacy"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('flame', 'icon-k')}War exhaustion</span><span class="pp-v" data-ref="warExh"></span></div>
        <div class="pp-row hidden" data-ref="infamyRow" data-tt="Conquest is remembered: courts abroad turn against you (opinion falls monthly), and at 30+ the fearful league into a defensive coalition. Decays one point a month.">
          <span class="pp-k">${icon('alert', 'icon-k')}Infamy</span><span class="pp-v neg" data-ref="infamy"></span></div>
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
        <button class="pp-build-btn hidden" data-act="requestParthianAid" data-ref="actParthia" data-tt="Send envoys to the King of Kings: 50 influence points for a chance at silver, volunteers, and Parthian sympathy">${icon('dove')}<span>Envoys to Parthia</span></button>
      </div>
      <div class="pp-build">
        <div class="pp-build-title">Missions</div>
        <div class="np-missions" data-ref="missions"></div>
      </div>
      <div class="pp-diplo">
        <div class="pp-diplo-title">Diplomacy</div>
        <div data-ref="diploBody"></div>
      </div>
      <div class="pp-build">
        <div class="pp-build-title">Decisions</div>
        <div class="np-decisions" data-ref="decisions"></div>
      </div>
      <div class="pp-build">
        <div class="pp-build-title">The Court</div>
        <div class="np-court" data-ref="court"></div>
      </div>
      <div class="pp-build">
        <div class="pp-build-title">Technology</div>
        <div class="np-reforms" data-ref="tech"></div>
      </div>
      <div class="pp-build">
        <div class="pp-build-title">Reforms</div>
        <div class="np-reforms" data-ref="reforms"></div>
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
      const hire = e.target.closest('[data-hire-adv]');
      if (hire) {
        if (!hire.classList.contains('disabled') && actions && actions.hireAdvisor) {
          try { actions.hireAdvisor(hire.dataset.hireAdv, Number(hire.dataset.cand)); } catch (err) { warnOnce('np-hireAdv', err); }
        }
        refresh();
        return;
      }
      const dis = e.target.closest('[data-dismiss-adv]');
      if (dis) {
        if (actions && actions.dismissAdvisor) {
          try { actions.dismissAdvisor(dis.dataset.dismissAdv); } catch (err) { warnOnce('np-dismissAdv', err); }
        }
        refresh();
        return;
      }
      const idea = e.target.closest('[data-idea]');
      if (idea) {
        if (idea.classList.contains('disabled') || !actions || typeof actions.buyIdea !== 'function') return;
        try { actions.buyIdea(idea.dataset.idea); } catch (err) { warnOnce('np-idea', err); }
        refresh();
        return;
      }
      const tech = e.target.closest('[data-tech]');
      if (tech) {
        if (tech.classList.contains('disabled') || !actions || typeof actions.buyTech !== 'function') return;
        try { actions.buyTech(tech.dataset.tech); } catch (err) { warnOnce('np-tech', err); }
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
      if (pc && onPeaceClick) { onPeaceClick(pc.dataset.peace); return; }
      const wr = e.target.closest('[data-war]');
      if (wr && onWarClick) onWarClick(wr.dataset.war);
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
    setText(refs.rulerTitle, (r.title || 'Ruler')
      + (t.regency ? '' : (Number.isFinite(r.age) ? ' · age ' + r.age : '')));
    const sk = (k) => Math.max(0, Math.min(6, Number.isFinite(r[k]) ? r[k] : 2));
    setHtml(refs.rulerPips,
      `<span class="tb-pt" data-tt="Governance skill ${sk('gov')} — +${2 + sk('gov')} governance points a month"><b>G</b>${sk('gov')}</span>` +
      `<span class="tb-pt" data-tt="Influence skill ${sk('infl')} — +${2 + sk('infl')} influence points a month"><b>I</b>${sk('infl')}</span>` +
      `<span class="tb-pt" data-tt="Martial skill ${sk('mar')} — +${2 + sk('mar')} martial points a month"><b>M</b>${sk('mar')}</span>`);
    // Heir line: the succession, or the lack of one.
    const h = t.heir;
    if (h) {
      const minor = (h.age || 0) < 16;
      setHtml(refs.heirRow, `Heir: <b>${esc(h.name || '—')}</b> (${h.gov | 0}/${h.infl | 0}/${h.mar | 0}, age ${h.age | 0})`
        + (t.regency ? ' — <span class="np-lost">a council rules until they come of age</span>'
          : (minor ? ' — <span class="np-dim2">a minor; their succession would mean a regency</span>' : '')));
      refs.heirRow.classList.remove('hidden');
    } else {
      setHtml(refs.heirRow, '<span class="np-lost">No designated heir</span> — a sudden death would shake the realm.');
      refs.heirRow.classList.remove('hidden');
    }

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
    const inf = Math.round(t.aggression || 0);
    refs.infamyRow.classList.toggle('hidden', inf <= 0);
    if (inf > 0) setText(refs.infamy, String(inf) + (inf >= 30 ? ' (coalition!)' : ''));
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

    refreshActions(t, g);
    refreshMissions();
    refreshDiplomacy(g, t);
    refreshDecisions();
    refreshTech();
    refreshReforms();
    refreshCourt();
  }

  function setAct(btn, can, tt) {
    btn.classList.toggle('disabled', !can);
    btn.dataset.tt = tt;
  }

  function refreshActions(t, g) {
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
    // Parthian envoys: a Judaean lever, hidden everywhere else.
    const showParthia = g.playerTag === 'JUD' && g.tags.PAR && g.tags.PAR.alive
      && !(g.flags && g.flags.parthianSympathy)
      && actions && typeof actions.requestParthianAid === 'function';
    refs.actParthia.classList.toggle('hidden', !showParthia);
    if (showParthia) {
      refs.actParthia.classList.toggle('disabled', ((t.points && t.points.infl) || 0) < 50);
    }
  }

  function refreshMissions() {
    let list = [];
    if (actions && typeof actions.getMissions === 'function') {
      try { list = actions.getMissions() || []; } catch (e) { warnOnce('np-getMissions', e); }
    }
    setHtml(refs.missions, list.length ? list.map((m) => {
      const tt = m.desc + (m.rewardText ? '\nReward: ' + m.rewardText : '');
      const mark = m.status === 'done' ? icon('laurel', 'icon-row')
        : m.status === 'current' ? icon('quill', 'icon-row') : '';
      return `<div class="np-mission np-m-${m.status}" data-tt="${esc(tt)}">`
        + `<span class="np-m-mark">${mark}</span><span class="np-m-name">${esc(m.name)}</span></div>`;
    }).join('') : '<div class="np-dip-none">No missions for this realm</div>');
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

    // Client kingdoms and overlord (tribute flows along these rows).
    const clients = Object.keys(g.tags).filter((k) => g.tags[k] && g.tags[k].alive && g.tags[k].overlord === g.playerTag);
    if (clients.length) {
      html += `<div class="np-dip-sec">Client kingdoms</div>`;
      for (const c of clients) {
        html += `<div class="np-dip-row" data-tt="A client kingdom: pays us 15% of its income and follows us to war">`
          + `${chip(c)}<span class="np-dip-name">${nameOf(c)}</span><span class="np-dip-ws">tributary</span></div>`;
      }
    }
    if (t.overlord && g.tags[t.overlord] && g.tags[t.overlord].alive) {
      html += `<div class="np-dip-sec">Overlord</div>`;
      html += `<div class="np-dip-row" data-tt="We are their client kingdom: 15% of our income flows to their court, and their wars are ours">`
        + `${chip(t.overlord)}<span class="np-dip-name">${nameOf(t.overlord)}</span><span class="np-dip-ws">we pay tribute</span></div>`;
    }

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
        html += `<div class="np-dip-row np-war" data-war="${esc(w.id)}" data-tt="${esc(w.name || 'War')}\nWar score: ${signed(ws)}%\nClick for the war overview${w.noNegotiation ? '\nThis war ends by the sword, or by events.' : ''}">`
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

  // Advisor seats: one per monarch-point pool. Seated advisors show their
  // wage and a dismiss button; empty seats offer two candidates.
  function refreshCourt() {
    if (!refs.court) return;
    let court = null;
    if (actions && typeof actions.getCourt === 'function') {
      try { court = actions.getCourt(); } catch (e) { warnOnce('np-getCourt', e); }
    }
    if (!court) { refs.court.innerHTML = ''; return; }
    const label = { gov: 'Government', infl: 'Influence', mar: 'Martial' };
    refs.court.innerHTML = ['gov', 'infl', 'mar'].map((k) => {
      const seat = court[k];
      if (seat.seated) {
        const a = seat.seated;
        return `<div class="np-adv"><span class="np-adv-name">${esc(label[k])}: <b>${esc(a.name)}</b> (+${a.skill}/mo)</span>
          <button class="pp-build-btn np-adv-btn" data-dismiss-adv="${k}" data-tt="Wage ${a.wage} talents a month. Click to dismiss.">Dismiss</button></div>`;
      }
      const cands = (seat.candidates || []).map((c, i) =>
        `<button class="pp-build-btn np-adv-btn" data-hire-adv="${k}" data-cand="${i}"
          data-tt="Hire for ${c.cost} talents; wage ${c.wage} talents a month; +${c.skill} ${esc(label[k].toLowerCase())} points monthly.">${esc(c.name)} (${c.skill})</button>`).join('');
      return `<div class="np-adv"><span class="np-adv-name">${esc(label[k])}: <i>empty seat</i></span>${cands}</div>`;
    }).join('');
  }

  // Technology ladders (SPEC §22): level, next price (with the ahead-of-age
  // markup), and the pattern of soldier the military ladder has unlocked.
  function refreshTech() {
    if (!refs.tech) return;
    let info = null;
    if (actions && typeof actions.getTech === 'function') {
      try { info = actions.getTech(); } catch (e) { warnOnce('np-getTech', e); }
    }
    if (!info) { refs.tech.innerHTML = ''; return; }
    const rows = info.rows.map((r) => {
      const tt = `${r.desc}\nThe age expects level ${r.eraBase}.` + (r.whyNot ? '\n' + r.whyNot : '');
      return `
        <div class="np-reform">
          <div class="np-reform-head"><b>${esc(r.name)}</b><span class="np-tech-lvl">${r.level}</span></div>
          <button class="pp-build-btn np-reform-btn${r.canBuy ? '' : ' disabled'}" data-tech="${esc(r.key)}" data-tt="${esc(tt)}">
            Advance to ${r.level + 1}${r.ahead ? ' ⚠' : ''} <span class="np-reform-cost">${r.cost} ${esc(r.point)}</span>
          </button>
        </div>`;
    }).join('');
    const u = info.unit;
    const unitLine = u ? `<div class="np-tech-unit" data-tt="${esc('The pattern our armies are raised to. '
      + (u.nextAt != null ? 'Military tech ' + u.nextAt + ' unlocks ' + u.nextInf + '.' : 'No newer pattern exists.'))}">`
      + `Armies muster as <b>${esc(u.inf)}</b> &amp; <b>${esc(u.cav)}</b></div>` : '';
    refs.tech.innerHTML = rows + unitLine;
  }

  // Three reform trees: tier pips, the next reform's name and price, one
  // buy button per tree. Renders nothing on sims without getIdeas.
  function refreshReforms() {
    if (!refs.reforms) return;
    let trees = null;
    if (actions && typeof actions.getIdeas === 'function') {
      try { trees = actions.getIdeas(); } catch (e) { warnOnce('np-getIdeas', e); }
    }
    if (!trees) { refs.reforms.innerHTML = ''; return; }
    const ptName = { mar: 'martial', gov: 'government', infl: 'influence' };
    refs.reforms.innerHTML = trees.map((tr) => {
      const pips = tr.tiers.map((ti) =>
        `<span class="np-pip${ti.owned ? ' on' : ''}" data-tt="${esc(ti.name + ' — ' + ti.desc)}"></span>`).join('');
      const next = tr.tiers[tr.owned];
      const tt = next
        ? `${next.name} — ${next.desc}\nCosts ${tr.cost} ${ptName[tr.point] || tr.point} points.${tr.canBuy ? '' : '\n' + tr.whyNot}`
        : tr.whyNot;
      return `
        <div class="np-reform">
          <div class="np-reform-head"><b>${esc(tr.name)}</b><span class="np-pips">${pips}</span></div>
          <button class="pp-build-btn np-reform-btn${tr.canBuy ? '' : ' disabled'}" data-idea="${esc(tr.key)}" data-tt="${esc(tt)}">
            ${next ? `${esc(next.name)} <span class="np-reform-cost">${tr.cost} ${esc(tr.point)}</span>` : 'Complete'}
          </button>
        </div>`;
    }).join('');
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
