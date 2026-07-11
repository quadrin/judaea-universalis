// js/ui/topbar.js — top resource/date/speed bar (SPEC §8.2).
import { esc, rgb, fmtMoney, fmtMen, fmtDate, signed, ttLines, warnOnce } from './format.js';

export function createTopbar(el, { DEFINES }) {
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
      <div class="tb-flag" style="background:${rgb(def.color)}" data-tt="${esc(def.name || tag)}">${esc(tag)}</div>
      <div class="tb-item" data-ref="treasuryWrap">
        <span class="tb-ico">🪙</span><span class="tb-v" data-ref="treasury">0</span>
        <span class="tb-sub" data-ref="income"></span>
      </div>
      <div class="tb-item" data-ref="manpowerWrap">
        <span class="tb-ico">⚔</span><span class="tb-v" data-ref="manpower">0</span>
      </div>
      <div class="tb-item" data-ref="stabilityWrap">
        <span class="tb-ico">⚖</span><span class="tb-v" data-ref="stability">0</span>
      </div>
      <div class="tb-item" data-ref="legitimacyWrap" data-tt="Legitimacy">
        <span class="tb-ico">♛</span><span class="tb-v" data-ref="legitimacy">0</span>
      </div>
      <div class="tb-points">
        <span class="tb-pt" data-tt="Government points"><b>G</b><span data-ref="gov">0</span></span>
        <span class="tb-pt" data-tt="Influence points"><b>I</b><span data-ref="infl">0</span></span>
        <span class="tb-pt" data-tt="Martial points"><b>M</b><span data-ref="mar">0</span></span>
      </div>
      <div class="tb-spacer"></div>
      <div class="tb-date" data-ref="date"></div>
      <div class="tb-speed">
        <button class="tb-pause" data-ref="pause" data-tt="Pause / resume (Space)">▶</button>
        <span class="tb-pips" data-ref="pips"></span>
      </div>`;
    el.querySelectorAll('[data-ref]').forEach((n) => { refs[n.dataset.ref] = n; });

    let pips = '';
    for (let i = 1; i <= 5; i++) {
      pips += `<button class="tb-pip" data-speed="${i}" data-tt="Speed ${i} (key ${i})"></button>`;
    }
    refs.pips.innerHTML = pips;

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

    // Date, pause, speed pips
    setText(refs.date, fmtDate(g.date, DEFINES.MONTH_NAMES));
    refs.date.classList.toggle('paused', !!g.paused);
    setText(refs.pause, g.paused ? '▶' : '❚❚');
    refs.pause.classList.toggle('paused', !!g.paused);
    refs.pips.querySelectorAll('.tb-pip').forEach((b) => {
      b.classList.toggle('on', Number(b.dataset.speed) <= (g.speed || 1));
    });
  }

  return { bind, refresh };
}
