// js/ui/province_panel.js — province inspector (SPEC §8.2).
import { esc, rgb, fmtInt, fmtMen, ttLines, titleCase, warnOnce } from './format.js';

export function createProvincePanel(el, { DEFINES, onClose }) {
  let ctx = null;
  let actions = null;
  let provId = 0;
  const refs = {};

  function setText(node, s) {
    if (node && node.textContent !== s) node.textContent = s;
  }

  function bind(c, a) {
    ctx = c;
    actions = a;
    build();
  }

  function build() {
    el.innerHTML = `
      <div class="pp-head">
        <h2 class="pp-name" data-ref="name"></h2>
        <button class="pp-close" data-ref="close" data-tt="Close (Esc)">✕</button>
      </div>
      <div class="pp-owner">
        <span class="flag-chip" data-ref="ownerChip"></span>
        <span class="pp-owner-name" data-ref="ownerName"></span>
      </div>
      <div class="pp-occupied hidden" data-ref="occupied"></div>
      <div class="pp-grid">
        <div class="pp-row" data-ref="terrainRow"><span class="pp-k">Terrain</span><span class="pp-v" data-ref="terrain"></span></div>
        <div class="pp-row" data-ref="goodRow"><span class="pp-k">Trade good</span><span class="pp-v" data-ref="good"></span></div>
        <div class="pp-row"><span class="pp-k">Religion</span><span class="pp-v"><span class="dot" data-ref="religionDot"></span><span data-ref="religion"></span></span></div>
        <div class="pp-row"><span class="pp-k">Culture</span><span class="pp-v"><span class="dot" data-ref="cultureDot"></span><span data-ref="culture"></span></span></div>
        <div class="pp-row" data-tt="Tax / Production / Manpower development"><span class="pp-k">Development</span><span class="pp-v" data-ref="dev"></span></div>
        <div class="pp-row hidden" data-ref="devBtnsRow"><span class="pp-k">Develop</span><span class="pp-v pp-devbtns">
          <button class="pp-dev" data-dev="tax" data-tt="+1 tax development (50 governance points)">+T</button>
          <button class="pp-dev" data-dev="prod" data-tt="+1 production development (50 influence points)">+P</button>
          <button class="pp-dev" data-dev="mp" data-tt="+1 manpower development (50 martial points)">+M</button>
        </span></div>
        <div class="pp-row"><span class="pp-k">Autonomy</span><span class="pp-v" data-ref="autonomy"></span></div>
        <div class="pp-row hidden" data-ref="siteRow"><span class="pp-k">Sites</span><span class="pp-v pp-gold" data-ref="site"></span></div>
      </div>
      <div class="pp-unrest" data-ref="unrestRow">
        <span class="pp-k">Unrest</span><span class="pp-v" data-ref="unrest"></span>
      </div>
      <div class="pp-block hidden" data-ref="revoltBlock">
        <div class="pp-bar-label"><span>⚑ Revolt brewing</span><span data-ref="revoltPct"></span></div>
        <div class="bar bar-revolt"><div class="bar-fill" data-ref="revoltFill"></div></div>
      </div>
      <div class="pp-block hidden" data-ref="fortBlock">
        <div class="pp-bar-label"><span data-ref="fortLabel"></span><span data-ref="garrisonText"></span></div>
        <div class="bar bar-garrison"><div class="bar-fill" data-ref="garrisonFill"></div></div>
      </div>
      <div class="pp-block pp-siege hidden" data-ref="siegeBlock">
        <div class="pp-bar-label"><span data-ref="siegeLabel"></span><span data-ref="siegePct"></span></div>
        <div class="bar bar-siege"><div class="bar-fill" data-ref="siegeFill"></div></div>
        <div class="pp-breach" data-ref="breach"></div>
      </div>
      <div class="pp-recruit">
        <button class="btn pp-recruit-btn" data-ref="recruitInf"></button>
        <button class="btn pp-recruit-btn" data-ref="recruitCav"></button>
      </div>`;
    el.querySelectorAll('[data-ref]').forEach((n) => { refs[n.dataset.ref] = n; });

    refs.close.addEventListener('click', () => { if (onClose) onClose(); else close(); });
    refs.recruitInf.addEventListener('click', () => tryRecruit('inf', refs.recruitInf));
    refs.recruitCav.addEventListener('click', () => tryRecruit('cav', refs.recruitCav));
    refs.devBtnsRow.addEventListener('click', (e) => {
      const b = e.target instanceof Element ? e.target.closest('[data-dev]') : null;
      if (!b || !actions) return;
      try { actions.devProvince(provId, b.dataset.dev); } catch (err) { warnOnce('dev', err); }
      refresh();
    });
  }

  function tryRecruit(type, btn) {
    if (!ctx || !actions || btn.classList.contains('disabled')) return;
    try { actions.recruit(provId, type); } catch (e) { warnOnce('recruit', e); }
    refresh();
  }

  function open(id) {
    provId = id | 0;
    if (!provId) { close(); return; }
    el.classList.remove('hidden');
    refresh();
  }

  function close() {
    provId = 0;
    el.classList.add('hidden');
  }

  function refresh() {
    if (!provId || !ctx || el.classList.contains('hidden')) return;
    const g = ctx.game;
    const p = g.provinces && g.provinces[provId];
    if (!p) { close(); return; }
    const TAGS = DEFINES.TAGS || {};

    setText(refs.name, p.name || ('Province ' + provId));

    // Owner / occupation
    const ownerDef = TAGS[p.owner] || {};
    refs.ownerChip.style.background = rgb(ownerDef.color);
    setText(refs.ownerChip, p.owner || '—');
    setText(refs.ownerName, ownerDef.name || p.owner || 'Unowned');
    if (p.controller && p.controller !== p.owner) {
      const cDef = TAGS[p.controller] || {};
      setText(refs.occupied, '⚑ Occupied by ' + (cDef.name || p.controller));
      refs.occupied.classList.remove('hidden');
    } else {
      refs.occupied.classList.add('hidden');
    }

    // Terrain (with combat tooltip), good, religion, culture
    const terr = (DEFINES.TERRAINS || {})[p.terrain];
    setText(refs.terrain, (terr && terr.name) || titleCase(p.terrain));
    refs.terrainRow.dataset.tt = terr
      ? `Move cost ×${terr.moveCost != null ? terr.moveCost : 1} · Defence +${terr.defBonus || 0} · Attrition ${terr.attrition || 0}`
      : titleCase(p.terrain);
    const good = (DEFINES.GOODS || {})[p.good];
    setText(refs.good, (good && good.name) || titleCase(p.good) || '—');
    refs.goodRow.dataset.tt = good ? `Base price: ${good.price} talents` : 'Trade good';
    const rel = (DEFINES.RELIGIONS || {})[p.religion];
    setText(refs.religion, (rel && rel.name) || titleCase(p.religion));
    refs.religionDot.style.background = rgb(rel && rel.color);
    const cul = (DEFINES.CULTURES || {})[p.culture];
    setText(refs.culture, (cul && cul.name) || titleCase(p.culture));
    refs.cultureDot.style.background = rgb(cul && cul.color);

    // Dev, autonomy, sites
    const dev = p.dev || {};
    setText(refs.dev, `${dev.tax || 0} / ${dev.prod || 0} / ${dev.mp || 0}`);
    const mine = p.owner === g.playerTag && p.controller === g.playerTag;
    refs.devBtnsRow.classList.toggle('hidden', !mine);
    if (mine) {
      const pts = (g.tags[g.playerTag] && g.tags[g.playerTag].points) || {};
      const pool = { tax: pts.gov, prod: pts.infl, mp: pts.mar };
      refs.devBtnsRow.querySelectorAll('[data-dev]').forEach((b) => {
        const k = b.dataset.dev;
        b.classList.toggle('afford', (pool[k] || 0) >= 50 && (dev[k] || 0) < 15);
      });
    }
    setText(refs.autonomy, Math.round((p.autonomy || 0) * 100) + '%');
    const sites = [];
    if (p.wonder) sites.push('✦ ' + titleCase(p.wonder));
    if (p.holy) sites.push('✧ ' + titleCase(p.holy));
    refs.siteRow.classList.toggle('hidden', sites.length === 0);
    setText(refs.site, sites.join('  '));

    // Unrest (red + ⚠ above threshold) with breakdown tooltip
    const u = Math.round((p.unrest || 0) * 10) / 10;
    const danger = u > 5;
    setText(refs.unrest, (danger ? '⚠ ' : '') + u.toFixed(1));
    refs.unrestRow.classList.toggle('danger', danger);
    let utt = 'Unrest: ' + u.toFixed(1);
    try {
      const rows = actions && actions.explainUnrest ? actions.explainUnrest(provId) : null;
      if (Array.isArray(rows) && rows.length) utt += '\n――――――\n' + ttLines(rows);
    } catch (e) { warnOnce('explainUnrest', e); }
    refs.unrestRow.dataset.tt = utt;

    // Revolt progress
    const fireAt = (DEFINES.BASE && DEFINES.BASE.revoltFireAt) || 100;
    const rp = Math.max(0, p.revoltProgress || 0);
    refs.revoltBlock.classList.toggle('hidden', rp <= 0);
    if (rp > 0) {
      const pct = Math.min(100, (rp / fireAt) * 100);
      setText(refs.revoltPct, Math.round(pct) + '%');
      refs.revoltFill.style.width = pct + '%';
    }

    // Fort & garrison
    const hasFort = (p.fort || 0) > 0 || (p.maxGarrison || 0) > 0;
    refs.fortBlock.classList.toggle('hidden', !hasFort);
    if (hasFort) {
      setText(refs.fortLabel, (p.fort || 0) > 0 ? 'Fort ' + '▣'.repeat(Math.min(5, p.fort)) : 'Garrison');
      const maxG = Math.max(1, p.maxGarrison || 0);
      setText(refs.garrisonText, `${fmtMen(p.garrison)} / ${fmtMen(p.maxGarrison)}`);
      refs.garrisonFill.style.width = Math.max(0, Math.min(100, ((p.garrison || 0) / maxG) * 100)) + '%';
    }

    // Siege
    refs.siegeBlock.classList.toggle('hidden', !p.siege);
    if (p.siege) {
      const byDef = TAGS[p.siege.by] || {};
      setText(refs.siegeLabel, '⚔ Under siege by ' + (byDef.name || p.siege.by || '?'));
      const sp = Math.max(0, Math.min(100, p.siege.progress || 0));
      setText(refs.siegePct, Math.round(sp) + '%');
      refs.siegeFill.style.width = sp + '%';
      const br = Math.max(0, Math.min(3, p.siege.breach || 0));
      setText(refs.breach, 'Breach  ' + '●'.repeat(br) + '○'.repeat(3 - br));
    }

    // Recruit buttons
    const base = DEFINES.BASE || {};
    const costs = base.regCost || { inf: 10, cav: 25 };
    updateRecruit(refs.recruitInf, 'inf', costs.inf, p, g, base);
    updateRecruit(refs.recruitCav, 'cav', costs.cav, p, g, base);
  }

  function updateRecruit(btn, type, cost, p, g, base) {
    const label = type === 'inf' ? 'Infantry' : 'Cavalry';
    const glyph = type === 'inf' ? '⚔' : '♞';
    setText(btn, `${glyph} ${label} — ${cost}🪙`);
    const t = g.tags && g.tags[g.playerTag];
    let reason = null;
    if (!t) reason = 'No nation to recruit for';
    else if (p.impassable) reason = 'Impassable wasteland';
    else if (p.owner !== g.playerTag) reason = 'You do not own this province';
    else if (p.controller !== g.playerTag) reason = 'Province is under enemy occupation';
    else if ((t.treasury || 0) < cost) reason = `Not enough talents (${cost} needed)`;
    btn.classList.toggle('disabled', !!reason);
    btn.dataset.tt = reason
      || `Recruit ${fmtInt(base.regSize || 1000)} ${label.toLowerCase()} for ${cost} talents`;
  }

  return {
    bind, open, close, refresh,
    get provId() { return provId; },
  };
}
