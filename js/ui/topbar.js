// js/ui/topbar.js — top resource/date/speed bar (SPEC §8.2).
import { esc, fmtMoney, fmtMen, fmtDate, signed, ttLines, warnOnce } from './format.js';
import { icon, flagChip } from './icons.js';

export function createTopbar(el, { DEFINES, onFlagClick, onLedgerClick }) {
  let ctx = null;
  let actions = null;
  const refs = {};

  function setText(node, s) {
    if (node && node.textContent !== s) node.textContent = s;
  }

  function bind(c, a) {
    ctx = c;
    actions = a;
    build();
    refresh();
  }

  function build() {
    const tag = ctx.game.playerTag;
    const def = (DEFINES.TAGS && DEFINES.TAGS[tag]) || {};
    el.innerHTML = `
      <button class="tb-flag" data-ref="flagBtn" data-tt="${esc(def.name || tag)} — the realm panel" aria-label="Open the realm panel">${flagChip(tag, DEFINES, 28)}<span class="tb-flag-tag">${esc(tag)}</span></button>
      <div class="tb-break" aria-hidden="true"></div>
      <div class="tb-item" data-ref="treasuryWrap">
        <span class="tb-ico">${icon('coins')}</span><span class="tb-v" data-ref="treasury">0</span>
        <span class="tb-sub" data-ref="income"></span>
        <button class="tb-buy tb-loan hidden" data-ref="borrow" data-tt="Take a loan: 150 talents now, 3 talents/month interest until repaid">${icon('borrow')}</button>
        <button class="tb-buy tb-loan hidden" data-ref="repay" data-tt="Repay a loan: 150 talents">${icon('repay')}</button>
      </div>
      <div class="tb-item" data-ref="manpowerWrap">
        <span class="tb-ico">${icon('spears')}</span><span class="tb-v" data-ref="manpower">0</span>
        <button class="tb-buy" data-ref="buyMp" data-tt="Call up reserves: +2,000 manpower (50 martial points)">${icon('plus')}</button>
      </div>
      <div class="tb-item" data-ref="stabilityWrap">
        <span class="tb-ico">${icon('scales')}</span><span class="tb-v" data-ref="stability">0</span>
        <button class="tb-buy" data-ref="buyStab" data-tt="Restore order: +1 stability (75 governance points)">${icon('plus')}</button>
      </div>
      <div class="tb-item" data-ref="legitimacyWrap" data-tt="Legitimacy">
        <span class="tb-ico">${icon('laurel')}</span><span class="tb-v" data-ref="legitimacy">0</span>
      </div>
      <div class="tb-points">
        <span class="tb-pt" data-tt="Government points"><b>G</b><span data-ref="gov">0</span></span>
        <span class="tb-pt" data-tt="Influence points"><b>I</b><span data-ref="infl">0</span></span>
        <span class="tb-pt" data-tt="Martial points"><b>M</b><span data-ref="mar">0</span></span>
      </div>
      <div class="tb-spacer"></div>
      <div class="tb-date" data-ref="date"></div>
      <div class="tb-speed">
        <button class="tb-save" data-ref="ledger" data-tt="The ledger of nations (L)">${icon('scroll')}</button>
        <button class="tb-save" data-ref="save" data-tt="Save the campaign">${icon('quill')}</button>
        <button class="tb-pause" data-ref="pause" data-tt="Pause / resume (Space)">${icon('play')}</button>
        <span class="tb-pips" data-ref="pips"></span>
      </div>`;
    el.querySelectorAll('[data-ref]').forEach((n) => { refs[n.dataset.ref] = n; });

    let pips = '';
    for (let i = 1; i <= 5; i++) {
      pips += `<button class="tb-pip" data-speed="${i}" data-tt="Speed ${i} (key ${i})"></button>`;
    }
    refs.pips.innerHTML = pips;

    refs.flagBtn.addEventListener('click', () => {
      if (onFlagClick) { try { onFlagClick(); } catch (e) { warnOnce('flagClick', e); } }
    });
    refs.ledger.addEventListener('click', () => {
      if (onLedgerClick) { try { onLedgerClick(); } catch (e) { warnOnce('ledgerClick', e); } }
    });
    refs.pause.addEventListener('click', () => {
      try { actions.togglePause(); } catch (e) { warnOnce('togglePause', e); }
      refresh();
    });
    refs.pips.addEventListener('click', (e) => {
      const b = e.target instanceof Element ? e.target.closest('[data-speed]') : null;
      if (!b) return;
      try { actions.setSpeed(Number(b.dataset.speed)); } catch (err) { warnOnce('setSpeed', err); }
      refresh();
    });
    refs.buyStab.addEventListener('click', () => {
      try { actions.buyStability(); } catch (e) { warnOnce('buyStab', e); }
      refresh();
    });
    refs.buyMp.addEventListener('click', () => {
      try { actions.callReserves(); } catch (e) { warnOnce('buyMp', e); }
      refresh();
    });
    refs.save.addEventListener('click', () => {
      try { ctx.bus.emit('saveRequest', {}); } catch (e) { warnOnce('save', e); }
    });
    refs.borrow.addEventListener('click', () => {
      if (refs.borrow.classList.contains('disabled')) return;
      if (!actions || typeof actions.takeLoan !== 'function') return;
      try { actions.takeLoan(); } catch (e) { warnOnce('takeLoan', e); }
      refresh();
    });
    refs.repay.addEventListener('click', () => {
      if (refs.repay.classList.contains('disabled')) return;
      if (!actions || typeof actions.repayLoan !== 'function') return;
      try { actions.repayLoan(); } catch (e) { warnOnce('repayLoan', e); }
      refresh();
    });
  }

  function refresh() {
    if (!ctx) return;
    const g = ctx.game;
    const t = g.tags && g.tags[g.playerTag];
    if (!t) return;

    // Treasury + monthly net
    setText(refs.treasury, fmtMoney(t.treasury));
    refs.treasury.classList.toggle('neg', (t.treasury || 0) < 0);
    const net = (t.income || 0) - (t.expenses || 0);
    setText(refs.income, (net >= 0 ? '+' : '−') + Math.abs(net).toFixed(1));
    refs.income.classList.toggle('neg', net < 0);
    let tt = `Treasury: ${fmtMoney(t.treasury)} talents\nIncome: +${(t.income || 0).toFixed(1)} / month\nExpenses: −${(t.expenses || 0).toFixed(1)} / month`;

    // Loans (v1.3): borrow / repay beside the treasury, count in its tooltip.
    // Renders nothing unless the sim provides getLoans.
    let loans = null;
    if (actions && typeof actions.getLoans === 'function') {
      try { loans = actions.getLoans(); } catch (e) { warnOnce('getLoans', e); loans = null; }
    }
    refs.borrow.classList.toggle('hidden', !loans);
    refs.repay.classList.toggle('hidden', !loans);
    if (loans) {
      refs.borrow.classList.toggle('afford', !!loans.canTake);
      refs.borrow.classList.toggle('disabled', !loans.canTake);
      refs.repay.classList.toggle('afford', !!loans.canRepay);
      refs.repay.classList.toggle('disabled', !loans.canRepay);
      if ((loans.loans | 0) > 0) {
        tt += `\nLoans: ${loans.loans | 0} (−${loans.interestPerMonth || 0} talents/month interest)`;
      }
    }

    try {
      const rows = actions && actions.explainIncome ? actions.explainIncome(g.playerTag) : null;
      if (Array.isArray(rows) && rows.length) tt += '\n――――――\n' + ttLines(rows);
    } catch (e) { warnOnce('explainIncome', e); }
    refs.treasuryWrap.dataset.tt = tt;

    // Manpower
    setText(refs.manpower, fmtMen(t.manpower));
    refs.manpowerWrap.dataset.tt = `Manpower: ${fmtMen(t.manpower)} / ${fmtMen(t.maxManpower)}`;

    // Stability (± colored) + war exhaustion in tooltip
    const stab = Math.round(t.stability || 0);
    setText(refs.stability, signed(stab));
    refs.stability.classList.toggle('pos', stab > 0);
    refs.stability.classList.toggle('neg', stab < 0);
    refs.stabilityWrap.dataset.tt =
      `Stability: ${signed(stab)}\nWar exhaustion: ${(t.warExhaustion || 0).toFixed(1)}`;

    // Legitimacy
    setText(refs.legitimacy, String(Math.round(t.legitimacy || 0)));

    // Monarch points
    const pts = t.points || {};
    setText(refs.gov, String(Math.floor(pts.gov || 0)));
    setText(refs.infl, String(Math.floor(pts.infl || 0)));
    setText(refs.mar, String(Math.floor(pts.mar || 0)));
    refs.buyStab.classList.toggle('afford', (pts.gov || 0) >= 75 && (t.stability || 0) < 3);
    refs.buyMp.classList.toggle('afford', (pts.mar || 0) >= 50 && (t.manpower || 0) < (t.maxManpower || 0));

    // Date, pause, speed pips
    setText(refs.date, fmtDate(g.date, DEFINES.MONTH_NAMES));
    refs.date.classList.toggle('paused', !!g.paused);
    const pauseGlyph = g.paused ? 'play' : 'pause';
    if (refs.pause.dataset.glyph !== pauseGlyph) {
      refs.pause.dataset.glyph = pauseGlyph;
      refs.pause.innerHTML = icon(pauseGlyph);
    }
    refs.pause.classList.toggle('paused', !!g.paused);
    refs.pips.querySelectorAll('.tb-pip').forEach((b) => {
      b.classList.toggle('on', Number(b.dataset.speed) <= (g.speed || 1));
    });
  }

  return { bind, refresh };
}
