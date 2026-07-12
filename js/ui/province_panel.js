// js/ui/province_panel.js — province inspector (SPEC §8.2).
import { esc, rgb, fmtInt, fmtMen, fmtYear, signed, ttLines, titleCase, warnOnce } from './format.js';
import { icon, flagChip } from './icons.js';

// Building key -> icon name (falls back to 'bricks' for unknown keys).
const BUILD_ICON = { market: 'market', granary: 'granary', walls: 'walls', shrine: 'shrine' };

export function createProvincePanel(el, { DEFINES, onClose }) {
  let ctx = null;
  let actions = null;
  let provId = 0;
  let dipTag = ''; // owner tag the diplomacy buttons currently act on
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
        <h2 class="pp-name" data-ref="name"></h2>
        <button class="pp-close" data-ref="close" data-tt="Close (Esc)">${icon('xmark')}</button>
      </div>
      <div class="pp-owner">
        <span class="flag-chip" data-ref="ownerChip"></span>
        <span class="pp-owner-name" data-ref="ownerName"></span>
      </div>
      <div class="pp-occupied hidden" data-ref="occupied"></div>
      <div class="pp-grid">
        <div class="pp-row" data-ref="terrainRow"><span class="pp-k">${icon('mountain', 'icon-k')}Terrain</span><span class="pp-v" data-ref="terrain"></span></div>
        <div class="pp-row" data-ref="goodRow"><span class="pp-k">${icon('grain', 'icon-k')}Trade good</span><span class="pp-v" data-ref="good"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('altar', 'icon-k')}Religion</span><span class="pp-v"><span class="dot" data-ref="religionDot"></span><span data-ref="religion"></span></span></div>
        <div class="pp-row"><span class="pp-k">${icon('amphora', 'icon-k')}Culture</span><span class="pp-v"><span class="dot" data-ref="cultureDot"></span><span data-ref="culture"></span></span></div>
        <div class="pp-row" data-tt="Tax / Production / Manpower development"><span class="pp-k">${icon('bricks', 'icon-k')}Development</span><span class="pp-v" data-ref="dev"></span></div>
        <div class="pp-row hidden" data-ref="devBtnsRow"><span class="pp-k">Develop</span><span class="pp-v pp-devbtns">
          <button class="pp-dev" data-dev="tax" data-tt="+1 tax development (50 governance points)">${icon('plus', 'icon-plus')}T</button>
          <button class="pp-dev" data-dev="prod" data-tt="+1 production development (50 influence points)">${icon('plus', 'icon-plus')}P</button>
          <button class="pp-dev" data-dev="mp" data-tt="+1 manpower development (50 martial points)">${icon('plus', 'icon-plus')}M</button>
        </span></div>
        <div class="pp-row"><span class="pp-k">Autonomy</span><span class="pp-v" data-ref="autonomy"></span></div>
        <div class="pp-row hidden" data-ref="siteRow"><span class="pp-k">Sites</span><span class="pp-v pp-gold" data-ref="site"></span></div>
      </div>
      <div class="pp-build hidden" data-ref="buildBlock">
        <div class="pp-build-title">Buildings</div>
        <div class="pp-built" data-ref="builtRow"></div>
        <div class="pp-constr hidden" data-ref="constrRow"></div>
        <div class="pp-build-grid" data-ref="buildBtns"></div>
      </div>
      <div class="pp-unrest" data-ref="unrestRow">
        <span class="pp-k">Unrest</span><span class="pp-v" data-ref="unrest"></span>
      </div>
      <div class="pp-block hidden" data-ref="revoltBlock">
        <div class="pp-bar-label"><span>${icon('flag', 'icon-sm')} Revolt brewing</span><span data-ref="revoltPct"></span></div>
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
        <button class="btn pp-assault hidden" data-ref="assault"></button>
      </div>
      <div class="pp-recruit">
        <button class="btn pp-recruit-btn" data-ref="recruitInf"></button>
        <button class="btn pp-recruit-btn" data-ref="recruitCav"></button>
      </div>
      <div class="pp-diplo hidden" data-ref="diploBlock">
        <div class="pp-diplo-title">Diplomacy</div>
        <div class="pp-diplo-head">
          <span class="pp-diplo-chip" data-ref="dipChip"></span>
          <span class="pp-diplo-name" data-ref="dipName"></span>
        </div>
        <div class="pp-row"><span class="pp-k">Their opinion of us</span><span class="pp-v" data-ref="dipOpinion"></span></div>
        <div class="pp-row"><span class="pp-k">Status</span><span class="pp-v" data-ref="dipStatus"></span></div>
        <div class="pp-diplo-btns" data-ref="dipBtns">
          <button class="pp-dip" data-dip="improve" data-ref="dipImprove">Improve Relations</button>
          <button class="pp-dip" data-dip="gift" data-ref="dipGift">Send Gift</button>
          <button class="pp-dip" data-dip="ally" data-ref="dipAlly">Offer Alliance</button>
          <button class="pp-dip" data-dip="break" data-ref="dipBreak">Break Alliance</button>
        </div>
      </div>`;
    el.querySelectorAll('[data-ref]').forEach((n) => { refs[n.dataset.ref] = n; });

    refs.close.addEventListener('click', () => { if (onClose) onClose(); else close(); });
    refs.dipBtns.addEventListener('click', (e) => {
      const b = e.target instanceof Element ? e.target.closest('[data-dip]') : null;
      if (!b || !actions || !dipTag || b.classList.contains('disabled')) return;
      const fn = { improve: 'improveRelations', gift: 'sendGift', ally: 'offerAlliance', break: 'breakAlliance' }[b.dataset.dip];
      try { if (fn && typeof actions[fn] === 'function') actions[fn](dipTag); }
      catch (err) { warnOnce('diplo-' + b.dataset.dip, err); }
      refresh();
    });
    refs.recruitInf.addEventListener('click', () => tryRecruit('inf', refs.recruitInf));
    refs.recruitCav.addEventListener('click', () => tryRecruit('cav', refs.recruitCav));
    refs.devBtnsRow.addEventListener('click', (e) => {
      const b = e.target instanceof Element ? e.target.closest('[data-dev]') : null;
      if (!b || !actions) return;
      try { actions.devProvince(provId, b.dataset.dev); } catch (err) { warnOnce('dev', err); }
      refresh();
    });
    refs.buildBtns.addEventListener('click', (e) => {
      const b = e.target instanceof Element ? e.target.closest('[data-build]') : null;
      if (!b || b.classList.contains('disabled')) return;
      if (!actions || typeof actions.buildBuilding !== 'function') return;
      try { actions.buildBuilding(provId, b.dataset.build); } catch (err) { warnOnce('buildBuilding', err); }
      refresh();
    });
    refs.assault.addEventListener('click', () => {
      if (refs.assault.classList.contains('disabled')) return;
      if (!actions || typeof actions.assaultSiege !== 'function') return;
      try { actions.assaultSiege(provId); } catch (err) { warnOnce('assaultSiege', err); }
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
    setHtml(refs.ownerChip, flagChip(p.owner, DEFINES, 20));
    setText(refs.ownerName, ownerDef.name || p.owner || 'Unowned');
    if (p.controller && p.controller !== p.owner) {
      const cDef = TAGS[p.controller] || {};
      setHtml(refs.occupied, icon('flag', 'icon-sm') + ' Occupied by ' + esc(cDef.name || p.controller));
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
    if (p.wonder) sites.push(icon('star8', 'icon-sm') + ' ' + esc(titleCase(p.wonder)));
    if (p.holy) sites.push(icon('star4', 'icon-sm') + ' ' + esc(titleCase(p.holy)));
    refs.siteRow.classList.toggle('hidden', sites.length === 0);
    setHtml(refs.site, sites.join('&nbsp; '));

    // Unrest (red + warning icon above threshold) with breakdown tooltip
    const u = Math.round((p.unrest || 0) * 10) / 10;
    const danger = u > 5;
    setHtml(refs.unrest, (danger ? icon('alert', 'icon-sm') + ' ' : '') + u.toFixed(1));
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
      setHtml(refs.fortLabel, (p.fort || 0) > 0
        ? 'Fort ' + icon('tower', 'icon-pip').repeat(Math.min(5, p.fort))
        : 'Garrison');
      const maxG = Math.max(1, p.maxGarrison || 0);
      setText(refs.garrisonText, `${fmtMen(p.garrison)} / ${fmtMen(p.maxGarrison)}`);
      refs.garrisonFill.style.width = Math.max(0, Math.min(100, ((p.garrison || 0) / maxG) * 100)) + '%';
    }

    // Siege
    refs.siegeBlock.classList.toggle('hidden', !p.siege);
    if (p.siege) {
      const byDef = TAGS[p.siege.by] || {};
      setHtml(refs.siegeLabel, icon('swords', 'icon-sm') + ' Under siege by ' + esc(byDef.name || p.siege.by || '?'));
      const sp = Math.max(0, Math.min(100, p.siege.progress || 0));
      setText(refs.siegePct, Math.round(sp) + '%');
      refs.siegeFill.style.width = sp + '%';
      const br = Math.max(0, Math.min(3, p.siege.breach || 0));
      setText(refs.breach, 'Breach  ' + '●'.repeat(br) + '○'.repeat(3 - br));
    }
    refreshAssault(p, g);

    // Recruit buttons
    const base = DEFINES.BASE || {};
    const costs = base.regCost || { inf: 10, cav: 25 };
    updateRecruit(refs.recruitInf, 'inf', costs.inf, p, g, base);
    updateRecruit(refs.recruitCav, 'cav', costs.cav, p, g, base);

    // Buildings (v1.3; gated on the sim providing getBuildInfo)
    refreshBuildings();

    // Diplomacy with the owner (re-queried every refresh; fail-soft)
    refreshDiplomacy(p, g);
  }

  // 'Assault the walls' — shown while our side besieges; enabled when the sim
  // says an assault can go in (breach open). Renders nothing without the action.
  function refreshAssault(p, g) {
    let as = null;
    if (p.siege && actions && typeof actions.canAssault === 'function') {
      try { as = actions.canAssault(provId); } catch (e) { warnOnce('canAssault', e); as = null; }
    }
    const show = !!(as && (as.can || p.siege.by === g.playerTag));
    refs.assault.classList.toggle('hidden', !show);
    if (!show) return;
    setHtml(refs.assault, icon('swords', 'icon-sm') + ' Assault the walls');
    refs.assault.classList.toggle('disabled', !as.can);
    const odds = `Chance of success: ${Math.round(as.chancePct || 0)}%\nExpected losses: ~${Math.round(as.expectedLossesPct || 0)}% of the assaulting force`;
    refs.assault.dataset.tt = as.can
      ? 'Storm the breach — the ladders go up at dawn.\n' + odds
      : (as.why || 'The walls still stand unbroken.') + (as.chancePct != null ? '\n' + odds : '');
  }

  // Built chips, active construction, and the 2x2 build grid.
  function refreshBuildings() {
    let info = null;
    if (actions && typeof actions.getBuildInfo === 'function') {
      try { info = actions.getBuildInfo(provId); } catch (e) { warnOnce('getBuildInfo', e); info = null; }
    }
    refs.buildBlock.classList.toggle('hidden', !info);
    if (!info) return;
    const DEFS = DEFINES.BUILDINGS || {};

    const built = Array.isArray(info.built) ? info.built : [];
    setHtml(refs.builtRow, built.length
      ? built.map((k) => {
        const d = DEFS[k] || {};
        const name = d.name || titleCase(k);
        return `<span class="pp-bchip" data-tt="${esc(d.desc ? name + '\n' + d.desc : name)}">${icon(BUILD_ICON[k] || 'bricks')}</span>`;
      }).join('')
      : '<span class="pp-build-none">Nothing yet built</span>');

    const c = info.constructing;
    refs.constrRow.classList.toggle('hidden', !c);
    if (c) {
      const m = Math.max(0, c.monthsLeft | 0);
      setHtml(refs.constrRow,
        `${icon(BUILD_ICON[c.key] || 'bricks')}<span class="pp-constr-name">${esc(c.name || titleCase(c.key))}</span>` +
        `<span class="pp-constr-left">${m} month${m === 1 ? '' : 's'} left</span>`);
    }

    const opts = Array.isArray(info.options) ? info.options : [];
    refs.buildBtns.classList.toggle('hidden', !opts.length);
    setHtml(refs.buildBtns, opts.map((o) => {
      const name = o.name || titleCase(o.key);
      const terms = `${name} — ${o.cost} talents, ${o.months} months\n${o.desc || ''}`;
      const tt = o.canBuild ? terms : `${o.whyNot || 'Unavailable'}\n――――――\n${terms}`;
      return `<button class="pp-build-btn${o.canBuild ? '' : ' disabled'}" data-build="${esc(o.key)}" data-tt="${esc(tt)}">` +
        `${icon(BUILD_ICON[o.key] || 'bricks')}<span>${esc(name)}</span></button>`;
    }).join(''));
  }

  function refreshDiplomacy(p, g) {
    let d = null;
    const owner = p.owner;
    if (actions && typeof actions.getDiplomacy === 'function' && !p.impassable
        && owner && owner !== g.playerTag && owner !== 'REB' && owner !== 'WASTE') {
      try { d = actions.getDiplomacy(owner); } catch (e) { warnOnce('getDiplomacy', e); d = null; }
    }
    dipTag = d ? d.tag : '';
    refs.diploBlock.classList.toggle('hidden', !d);
    if (!d) return;

    setHtml(refs.dipChip, flagChip(d.tag, DEFINES, 20));
    setText(refs.dipName, d.name || d.tag);

    const op = Math.round(d.opinionOfUs || 0);
    setText(refs.dipOpinion, signed(op));
    refs.dipOpinion.classList.toggle('pos', op > 0);
    refs.dipOpinion.classList.toggle('neg', op < 0);
    refs.dipOpinion.dataset.tt = `Their opinion of us: ${signed(op)}\nOur opinion of them: ${signed(Math.round(d.ourOpinion || 0))}`;

    let status = '—';
    let cls = '';
    if (d.atWarWithUs) { status = 'At war'; cls = 'neg'; }
    else if (d.allied) { status = 'Allied'; cls = 'pos'; }
    else if (d.truceUntil) {
      const mn = (DEFINES.MONTH_NAMES || [])[d.truceUntil.m - 1] || ('M' + d.truceUntil.m);
      status = `Truce until ${mn} ${fmtYear(d.truceUntil.y)}`;
    }
    setText(refs.dipStatus, status);
    refs.dipStatus.classList.toggle('pos', cls === 'pos');
    refs.dipStatus.classList.toggle('neg', cls === 'neg');

    setDipBtn(refs.dipImprove, d.canImprove, d.whyNotImprove,
      `Improve relations: ${d.improveCost} influence points → +15 opinion`);
    setDipBtn(refs.dipGift, d.canGift, d.whyNotGift,
      `Send a gift: ${d.giftCost} talents from the treasury → +20 opinion`);
    setDipBtn(refs.dipAlly, d.canAlly, d.whyNotAlly,
      'Offer a formal alliance — a refusal sours relations for six months');
    // No alliance, nothing to break: hide rather than explain.
    refs.dipBreak.classList.toggle('hidden', !d.canBreak);
    if (d.canBreak) {
      refs.dipBreak.classList.remove('disabled');
      refs.dipBreak.dataset.tt = 'Break the alliance — their opinion of us falls by 50';
    }
  }

  function setDipBtn(btn, can, whyNot, costLine) {
    btn.classList.remove('hidden');
    btn.classList.toggle('disabled', !can);
    btn.dataset.tt = can ? costLine : (whyNot ? whyNot + '\n' + costLine : costLine);
  }

  function updateRecruit(btn, type, cost, p, g, base) {
    const label = type === 'inf' ? 'Infantry' : 'Cavalry';
    const glyph = icon(type === 'inf' ? 'shield' : 'horseshoe');
    setHtml(btn, `${glyph} ${label} — ${cost} ${icon('coins', 'icon-xs')}`);
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
