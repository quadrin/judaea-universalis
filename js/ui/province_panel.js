// js/ui/province_panel.js — province inspector (SPEC §8.2).
import { esc, rgb, fmtInt, fmtMen, fmtYear, signed, ttLines, titleCase, warnOnce } from './format.js';
import { icon, flagChip } from './icons.js';
import { unlockedGen, genName, navalGenName } from '../data/tech.js';
import { communityLabel } from '../sim/population.js';

// Building key -> icon name (falls back to 'bricks' for unknown keys).
const BUILD_ICON = { market: 'market', granary: 'granary', walls: 'walls', shrine: 'shrine', shipyard: 'shipyard', airfield: 'plane' };

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
        <div class="pp-row" data-ref="habitationRow"><span class="pp-k">${icon('bricks', 'icon-k')}Habitation</span><span class="pp-v" data-ref="habitation"></span></div>
        <div class="pp-row" data-ref="goodRow"><span class="pp-k">${icon('grain', 'icon-k')}Trade good</span><span class="pp-v" data-ref="good"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('altar', 'icon-k')}Religion</span><span class="pp-v"><span class="dot" data-ref="religionDot"></span><span data-ref="religion"></span></span></div>
        <div class="pp-row"><span class="pp-k">${icon('amphora', 'icon-k')}Culture</span><span class="pp-v"><span class="dot" data-ref="cultureDot"></span><span data-ref="culture"></span></span></div>
        <div class="pp-row hidden" data-ref="popRow"><span class="pp-k">${icon('helmet', 'icon-k')}Population</span><span class="pp-v" data-ref="population"></span></div>
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
      <div class="pp-build hidden" data-ref="integBlock">
        <div class="pp-build-title">Integration</div>
        <div class="pp-constr hidden" data-ref="convRow"></div>
        <div class="pp-constr hidden" data-ref="settleRow"></div>
        <div class="pp-constr hidden" data-ref="integProgRow"></div>
        <div class="pp-build-grid">
          <button class="pp-build-btn" data-integ="rule" data-ref="integRule">${icon('scales')}<span>Establish Rule</span></button>
          <button class="pp-build-btn" data-integ="convert" data-ref="integConv">${icon('altar')}<span>Convert Faith</span></button>
          <button class="pp-build-btn" data-integ="integrate" data-ref="integInteg">${icon('scroll')}<span>Integrate</span></button>
          <button class="pp-build-btn hidden" data-integ="settle" data-ref="integSettle">${icon('bricks')}<span>Settle the Land</span></button>
        </div>
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
        <button class="btn pp-recruit-btn hidden" data-ref="buildShip"></button>
        <button class="btn pp-recruit-btn hidden" data-ref="recruitWing"></button>
      </div>
      <div class="pp-recruit-queue hidden" data-ref="recruitQueue"></div>
      <div class="pp-merchant hidden" data-ref="merchantBlock">
        <div class="pp-build-title">${icon('ship', 'icon-sm')} Merchant Marine</div>
        <div class="pp-merchant-status" data-ref="merchantStatus"></div>
        <button class="btn pp-recruit-btn" data-ref="merchantShip"></button>
        <div class="pp-merchant-send" data-ref="merchantSend"></div>
        <div class="pp-merchant-send" data-ref="merchantTrade"></div>
      </div>
      <div class="pp-air hidden" data-ref="airBlock">
        <div class="pp-build-title">${icon('plane', 'icon-sm')} The Airfield</div>
        <div data-ref="airWings"></div>
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
          <button class="pp-dip" data-dip="marry" data-ref="dipMarry">Royal Marriage</button>
          <button class="pp-dip" data-dip="break" data-ref="dipBreak">Break Alliance</button>
          <button class="pp-dip" data-dip="guarantee" data-ref="dipGuarantee">Guarantee</button>
          <button class="pp-dip" data-dip="subsidize" data-ref="dipSubsidize">Send Subsidy</button>
          <button class="pp-dip" data-dip="incorporate" data-ref="dipIncorporate">Incorporate</button>
          <button class="pp-dip" data-dip="claim" data-ref="dipClaim">Fabricate Claim</button>
          <button class="pp-dip pp-dip-war" data-dip="war" data-ref="dipWar">Declare War</button>
        </div>
      </div>`;
    el.querySelectorAll('[data-ref]').forEach((n) => { refs[n.dataset.ref] = n; });

    refs.close.addEventListener('click', () => { if (onClose) onClose(); else close(); });
    refs.dipBtns.addEventListener('click', (e) => {
      const b = e.target instanceof Element ? e.target.closest('[data-dip]') : null;
      if (!b || !actions || !dipTag || b.classList.contains('disabled')) return;
      if (b.dataset.dip === 'claim') {
        // Claims act on the province, not the tag.
        try { if (typeof actions.fabricateClaim === 'function') actions.fabricateClaim(provId); }
        catch (err) { warnOnce('diplo-claim', err); }
        refresh();
        return;
      }
      const fn = {
        improve: 'improveRelations', gift: 'sendGift', ally: 'offerAlliance', break: 'breakAlliance',
        war: 'declareWarOn', incorporate: 'incorporateVassal', marry: 'royalMarriage',
        guarantee: b.classList.contains('pp-dip-on') ? 'revokeGuarantee' : 'guaranteeNation',
        subsidize: b.classList.contains('pp-dip-on') ? 'cancelSubsidy' : 'sendSubsidy',
      }[b.dataset.dip];
      try { if (fn && typeof actions[fn] === 'function') actions[fn](dipTag); }
      catch (err) { warnOnce('diplo-' + b.dataset.dip, err); }
      refresh();
    });
    refs.integBlock.addEventListener('click', (e) => {
      const b = e.target instanceof Element ? e.target.closest('[data-integ]') : null;
      if (!b || b.classList.contains('disabled') || !actions) return;
      const fn = b.dataset.integ === 'rule' ? 'establishRule'
        : b.dataset.integ === 'settle' ? 'settleProvince'
          : b.dataset.integ === 'integrate' ? 'integrateProvince' : 'convertProvince';
      try { if (typeof actions[fn] === 'function') actions[fn](provId); }
      catch (err) { warnOnce('integ-' + b.dataset.integ, err); }
      refresh();
    });
    refs.buildShip.addEventListener('click', () => {
      if (!actions || typeof actions.buildShip !== 'function' || refs.buildShip.classList.contains('disabled')) return;
      try { actions.buildShip(provId); } catch (e) { warnOnce('buildShip', e); }
      refresh();
    });
    refs.merchantShip.addEventListener('click', () => {
      if (!actions || typeof actions.commissionMerchantShip !== 'function'
          || refs.merchantShip.classList.contains('disabled')) return;
      try { actions.commissionMerchantShip(provId); } catch (e) { warnOnce('merchantShip', e); }
      refresh();
    });
    refs.merchantSend.addEventListener('click', (e) => {
      const b = e.target instanceof Element ? e.target.closest('[data-send-to]') : null;
      if (!b || b.classList.contains('disabled') || !actions
          || typeof actions.sendMerchantShip !== 'function') return;
      try { actions.sendMerchantShip(provId, b.dataset.sendTo | 0); } catch (err) { warnOnce('merchantSend', err); }
      refresh();
    });
    refs.merchantTrade.addEventListener('click', (e) => {
      const b = e.target instanceof Element ? e.target.closest('[data-trade-to]') : null;
      if (!b || b.classList.contains('disabled') || !actions
          || typeof actions.sendTradeRun !== 'function') return;
      try { actions.sendTradeRun(provId, b.dataset.tradeTo | 0); } catch (err) { warnOnce('merchantTrade', err); }
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
    refs.recruitWing.addEventListener('click', () => {
      if (refs.recruitWing.classList.contains('disabled')) return;
      if (!actions || typeof actions.recruitAirWing !== 'function') return;
      try { actions.recruitAirWing(provId); } catch (err) { warnOnce('recruitAirWing', err); }
      refresh();
    });
    refs.airWings.addEventListener('click', (e) => {
      if (!(e.target instanceof Element) || !actions) return;
      const raid = e.target.closest('[data-raid-wing]');
      if (raid && typeof actions.raidProvince === 'function') {
        try { actions.raidProvince(Number(raid.dataset.raidWing), Number(raid.dataset.raidDest)); } catch (err) { warnOnce('raidProvince', err); }
        refresh();
        return;
      }
      const b = e.target.closest('[data-wing]');
      if (!b || typeof actions.moveAirWing !== 'function') return;
      try { actions.moveAirWing(Number(b.dataset.wing), Number(b.dataset.dest)); } catch (err) { warnOnce('moveAirWing', err); }
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
    setHtml(refs.ownerChip, flagChip(p.owner, DEFINES, 20, true));
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
    const hab = (DEFINES.HABITATION || {})[p.habitation];
    setText(refs.habitation, (hab && hab.name) || titleCase(p.habitation) || 'Rural');
    refs.habitationRow.dataset.tt = p.habitation === 'uninhabited'
      ? (p.settleable ? 'Empty land that may be claimed and settled by a future regional project.' : 'Land with no permanent settlement.')
      : 'Settlement tier, independent of terrain and sovereign ownership.';
    const good = (DEFINES.GOODS || {})[p.good];
    setText(refs.good, (good && good.name) || titleCase(p.good) || '—');
    refs.goodRow.dataset.tt = good ? `Base price: ${good.price} talents` : 'Trade good';
    const rel = (DEFINES.RELIGIONS || {})[p.religion];
    setText(refs.religion, (rel && rel.name) || titleCase(p.religion));
    refs.religionDot.style.background = rgb(rel && rel.color);
    const cul = (DEFINES.CULTURES || {})[p.culture];
    setText(refs.culture, (cul && cul.name) || titleCase(p.culture));
    refs.cultureDot.style.background = rgb(cul && cul.color);
    // The population makeup (SPEC §56): who actually lives here — visible on
    // any province, ours or theirs. Hidden on pre-population saves.
    const pop = Array.isArray(p.pop) ? p.pop.filter((e) => e && e.n > 0) : [];
    refs.popRow.classList.toggle('hidden', !pop.length);
    if (pop.length) {
      const parts = pop.slice(0, 3).map((e) => `${fmtMen(e.n)} ${communityLabel(DEFINES, e.r, e.c)}`);
      setText(refs.population, parts.join(' · ') + (pop.length > 3 ? ' …' : ''));
      refs.popRow.dataset.tt = pop.map((e) => `${fmtMen(e.n)} ${communityLabel(DEFINES, e.r, e.c)}`).join('\n')
        + `\nIntegration: ${Math.round(Math.max(0, Math.min(1, p.integration || 0)) * 100)}%`
        + ' — unintegrated minorities drive unrest.';
    }

    // Dev, autonomy, sites
    const dev = p.dev || {};
    setText(refs.dev, `${dev.tax || 0} / ${dev.prod || 0} / ${dev.mp || 0}`);
    const mine = p.owner === g.playerTag && p.controller === g.playerTag;
    refs.devBtnsRow.classList.toggle('hidden', !mine);
    if (mine) {
      // Scaled costs (SPEC §24): 50 + 5×dev, live from the sim when it offers them.
      let di = null;
      if (actions && typeof actions.getDevelopInfo === 'function') {
        try { di = actions.getDevelopInfo(provId); } catch (e) { warnOnce('devInfo', e); }
      }
      const poolName = { tax: 'governance', prod: 'influence', mp: 'martial' };
      const kindName = { tax: 'tax', prod: 'production', mp: 'manpower' };
      refs.devBtnsRow.querySelectorAll('[data-dev]').forEach((b) => {
        const k = b.dataset.dev;
        const info = di && di[k];
        b.classList.toggle('afford', !!(info && info.can));
        b.dataset.tt = info
          ? `+1 ${kindName[k]} development (${info.cost} ${poolName[k]} points)` + (info.can ? '' : `\n${info.why}`)
          : b.dataset.tt;
      });
    }
    setText(refs.autonomy, Math.round((p.autonomy || 0) * 100) + '%');
    const sites = [];
    const WONDER_TT = {
      temple: '+1 governance point and +0.2 legitimacy a month to its keeper',
      library: '+1 influence point a month to its keeper',
      petra: '+2 talents a month to its keeper',
    };
    if (p.wonder) sites.push(icon('star8', 'icon-sm') + ' ' + esc(titleCase(p.wonder)));
    if (p.holy) sites.push(icon('star4', 'icon-sm') + ' ' + esc(titleCase(p.holy)));
    refs.siteRow.classList.toggle('hidden', sites.length === 0);
    const siteTT = [];
    if (p.holy) siteTT.push('Holy site: a controller of the faith gains +1 of every monarch point and legitimacy each month; the faithful suffer while heathens hold it.');
    if (p.wonder && WONDER_TT[p.wonder]) siteTT.push('Wonder: ' + WONDER_TT[p.wonder] + '.');
    refs.siteRow.dataset.tt = siteTT.join('\n') || 'Sites';
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
    refreshRecruitmentQueue(g);

    // Warships recruit alongside the army, once a completed shipyard opens.
    const coastal = !!(ctx.geom && Array.isArray(ctx.geom.coastal) && ctx.geom.coastal[provId]);
    const myPort = p.owner === g.playerTag && p.controller === g.playerTag;
    const hasShipyard = Array.isArray(p.buildings) && p.buildings.indexOf('shipyard') >= 0;
    refs.buildShip.classList.toggle('hidden', !(coastal && myPort && hasShipyard
      && actions && typeof actions.buildShip === 'function'));
    if (coastal && myPort && hasShipyard) {
      // Hulls speak the age too (SPEC §31): Penteconters through Destroyers.
      const t = g.tags[g.playerTag];
      const shipPattern = navalGenName(unlockedGen(((t && t.tech && t.tech.mar) | 0)));
      const months = (base.unitRecruitMonths && base.unitRecruitMonths.ship) || 6;
      refs.buildShip.textContent = `Lay down ${shipPattern} — 30t · ${months}m`;
      refs.buildShip.dataset.tt = `Lay down a hull of ${shipPattern}: 30 talents and ${months} months in this province's unit queue. Upkeep is 0.5 a month after launch; carries 1,000 men. Ships gather into the fleet riding off this port; older fleets can be re-rigged from the outliner.`;
      refs.buildShip.classList.toggle('disabled', !t || (t.treasury || 0) < 30);
    }

    // Buildings (v1.3; gated on the sim providing getBuildInfo)
    refreshBuildings();

    // A completed coastal shipyard opens the civilian fitting-out yard.
    refreshMerchant();

    // Air power (SPEC §29): the airfield's wings
    refreshAir(p, g);

    // Integration (v1.5): autonomy & conversion for owned provinces
    refreshIntegration();

    // Diplomacy with the owner (re-queried every refresh; fail-soft)
    refreshDiplomacy(p, g);
  }

  // Establish Rule / Convert Faith for own provinces; conversion progress row.
  function refreshIntegration() {
    let info = null;
    if (actions && typeof actions.getIntegration === 'function') {
      try { info = actions.getIntegration(provId); } catch (e) { warnOnce('getIntegration', e); info = null; }
    }
    refs.integBlock.classList.toggle('hidden', !info);
    if (!info) return;
    const ruleTerms = 'Establish Rule — 25 governance points\n−15% autonomy (more of the province\'s taxes reach the crown); +2 unrest for 6 months while the locals adjust.';
    refs.integRule.classList.toggle('disabled', !info.canEstablish);
    refs.integRule.dataset.tt = info.canEstablish ? ruleTerms : `${info.whyNotEstablish}\n――――――\n${ruleTerms}`;
    // Integrate (SPEC §56): schools, land and the civil service.
    const integTerms = 'Integrate the Province — 25 governance points\nA year of schools, land titles and civil service: +34% integration; +1 unrest while old hands grumble.';
    refs.integInteg.classList.toggle('disabled', !info.canIntegrate);
    refs.integInteg.dataset.tt = info.canIntegrate ? integTerms : `${info.whyNotIntegrate}\n――――――\n${integTerms}`;
    refs.integProgRow.classList.toggle('hidden', !info.integrating);
    if (info.integrating) {
      const m = Math.max(0, info.integrating.monthsLeft | 0);
      setHtml(refs.integProgRow,
        `${icon('scroll')}<span class="pp-constr-name">Integration under way</span>` +
        `<span class="pp-constr-left">${m} month${m === 1 ? '' : 's'} left</span>`);
    }
    // Eras without state conversion (SPEC §52) drop the control entirely —
    // absent, not greyed. Old getIntegration results (no showConvert) show it.
    const showConvert = info.showConvert !== false;
    refs.integConv.classList.toggle('hidden', !showConvert);
    const convTerms = 'Convert the Faith — 50 influence points\nAfter 12 months the province adopts the state religion; +3 unrest while the old gods are put away.';
    refs.integConv.classList.toggle('disabled', !info.canConvert);
    refs.integConv.dataset.tt = info.canConvert ? convTerms : `${info.whyNotConvert}\n――――――\n${convTerms}`;
    refs.convRow.classList.toggle('hidden', !info.converting);
    if (info.converting) {
      const m = Math.max(0, info.converting.monthsLeft | 0);
      setHtml(refs.convRow,
        `${icon('altar')}<span class="pp-constr-name">Conversion under way</span>` +
        `<span class="pp-constr-left">${m} month${m === 1 ? '' : 's'} left</span>`);
    }
    // Settlement (SPEC §43): raise this province one habitation tier.
    const showSettle = !!info.showSettle && !info.settling;
    refs.integSettle.classList.toggle('hidden', !showSettle);
    if (showSettle) {
      const settleTerms = `Settle the Land — ${info.settleCost} influence points\n`
        + `Over a few months the province grows into a ${(info.settleToName || 'settlement').toLowerCase()}, `
        + 'gaining development; newly claimed land becomes developable. A little unrest while the newcomers settle in.';
      refs.integSettle.classList.toggle('disabled', !info.canSettle);
      refs.integSettle.dataset.tt = info.canSettle
        ? settleTerms : `${info.whyNotSettle}\n――――――\n${settleTerms}`;
    }
    refs.settleRow.classList.toggle('hidden', !info.settling);
    if (info.settling) {
      const m = Math.max(0, info.settling.monthsLeft | 0);
      setHtml(refs.settleRow,
        `${icon('bricks')}<span class="pp-constr-name">Settlers arriving</span>` +
        `<span class="pp-constr-left">${m} month${m === 1 ? '' : 's'} left</span>`);
    }
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

  function refreshMerchant() {
    let info = null;
    if (actions && typeof actions.getMerchantShipInfo === 'function') {
      try { info = actions.getMerchantShipInfo(provId); } catch (e) { warnOnce('merchantInfo', e); info = null; }
    }
    refs.merchantBlock.classList.toggle('hidden', !info || !info.visible);
    if (!info || !info.visible) return;
    const activeIncome = (info.count * info.incomeEach).toFixed(2).replace(/\.00$/, '');
    const inbound = info.inbound ? ' · ' + info.inbound + ' inbound' : '';
    setText(refs.merchantStatus, info.count + ' / ' + info.cap + ' merchant ships' + inbound + ' · +' + activeIncome + ' trade/month');
    setHtml(refs.merchantShip, `${icon('ship')} Commission merchantman — ${info.cost} ${icon('coins', 'icon-xs')}`);
    refs.merchantShip.classList.toggle('disabled', !info.can);
    refs.merchantShip.dataset.tt = info.can
      ? `Commission a civilian merchant ship. Each earns ${info.incomeEach} talents a month while this harbor is controlled, unsieged and unblocked.`
      : (info.why || 'No merchantman can be fitted out now.');
    // Send a hull to another of our shipyard harbors (SPEC §58).
    let dests = [];
    if (info.count > 0 && actions && typeof actions.getMerchantDestinations === 'function') {
      try { dests = actions.getMerchantDestinations(provId) || []; } catch (e) { warnOnce('merchantDest', e); dests = []; }
    }
    refs.merchantSend.classList.toggle('hidden', !dests.length);
    setHtml(refs.merchantSend, dests.map((d) => {
      const full = d.free <= 0;
      const tt = full
        ? `Every berth at ${esc(d.provName)} is claimed (${d.count} docked${d.inbound ? ', ' + d.inbound + ' inbound' : ''}).`
        : `Send one merchantman to ${esc(d.provName)} — about ${d.days} days at sea, earning nothing until she docks (${d.count + d.inbound} / ${d.cap} berths claimed).`;
      return `<button class="pp-build-btn${full ? ' disabled' : ''}" data-send-to="${d.prov}" data-tt="${esc(tt)}">` +
        `${icon('ship', 'icon-sm')}<span>Send to ${esc(d.provName)} · ${d.days}d</span></button>`;
    }).join(''));
    // Trade runs abroad (v6.1): the foreign markets, open or not — the closed
    // ones stay visible so the opinion gate is learnable.
    let trades = [];
    if (info.count > 0 && actions && typeof actions.getTradeRunDestinations === 'function') {
      try { trades = actions.getTradeRunDestinations(provId) || []; } catch (e) { warnOnce('tradeDest', e); trades = []; }
    }
    refs.merchantTrade.classList.toggle('hidden', !trades.length);
    setHtml(refs.merchantTrade, trades.map((d) => {
      const tt = d.can
        ? `A round trip to ${esc(d.provName)} (${esc(d.hostName)}, opinion ${d.opinion >= 0 ? '+' : ''}${d.opinion}): `
          + `about ${d.days} days out and back, a month trading in their market, and ~${d.payout} talents landed when she ties up at home. `
          + `War with ${esc(d.hostName)} while she trades would see ship and cargo seized.`
        : d.why;
      return `<button class="pp-build-btn${d.can ? '' : ' disabled'}" data-trade-to="${d.prov}" data-tt="${esc(tt)}">` +
        `${icon('coins', 'icon-sm')}<span>Trade run: ${esc(d.provName)} · ${d.days}d · ~${d.payout} ${icon('coins', 'icon-xs')}</span></button>`;
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

    setHtml(refs.dipChip, flagChip(d.tag, DEFINES, 20, true));
    setText(refs.dipName, d.name || d.tag);

    const op = Math.round(d.opinionOfUs || 0);
    setText(refs.dipOpinion, signed(op));
    refs.dipOpinion.classList.toggle('pos', op > 0);
    refs.dipOpinion.classList.toggle('neg', op < 0);
    refs.dipOpinion.dataset.tt = `Their opinion of us: ${signed(op)}\nOur opinion of them: ${signed(Math.round(d.ourOpinion || 0))}`;

    let status = '—';
    let cls = '';
    if (d.atWarWithUs) { status = 'At war'; cls = 'neg'; }
    else if (d.ourClient) { status = 'Our client kingdom'; cls = 'pos'; }
    else if (d.ourOverlord) { status = 'Our overlord'; }
    else if (d.allied) { status = 'Allied'; cls = 'pos'; }
    else if (d.truceUntil) {
      const mn = (DEFINES.MONTH_NAMES || [])[d.truceUntil.m - 1] || ('M' + d.truceUntil.m);
      status = `Truce until ${mn} ${fmtYear(d.truceUntil.y)}`;
    } else if (d.theirOverlord) {
      status = `Client of ${d.theirOverlordName || d.theirOverlord}`;
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
    // Royal marriage (SPEC §62): hidden entirely in the ages without it.
    refs.dipMarry.classList.toggle('hidden', !d.marriage);
    if (d.marriage) {
      if (d.marriage.married) {
        setText(refs.dipMarry, 'Houses Joined');
        refs.dipMarry.classList.add('disabled');
        refs.dipMarry.dataset.tt = 'Our houses are joined in marriage: the dynasty is likelier to be blessed with an heir. War between us would annul it — and not be forgiven.';
      } else {
        setText(refs.dipMarry, 'Royal Marriage');
        setDipBtn(refs.dipMarry, d.marriage.can, d.marriage.why,
          `Arrange a royal marriage: ${d.marriage.cost} influence points → +25 opinion both ways, `
          + 'and each living marriage raises the chance of an heir appearing (capped at ×3). '
          + 'War between married houses annuls the match at a heavy cost in opinion.');
      }
    }
    // No alliance, nothing to break: hide rather than explain.
    refs.dipBreak.classList.toggle('hidden', !d.canBreak);
    if (d.canBreak) {
      refs.dipBreak.classList.remove('disabled');
      refs.dipBreak.dataset.tt = 'Break the alliance — their opinion of us falls by 50';
    }
    // Guarantees & subsidies (SPEC §24): the same button extends or withdraws.
    refs.dipGuarantee.classList.toggle('pp-dip-on', !!d.weGuarantee);
    setText(refs.dipGuarantee, d.weGuarantee ? 'Withdraw Guarantee' : 'Guarantee');
    if (d.weGuarantee) {
      refs.dipGuarantee.classList.remove('disabled');
      refs.dipGuarantee.dataset.tt = 'Our word protects them: attack them and the attacker fights us too.\nWithdrawing costs 20 opinion.'
        + (d.theyGuarantee ? '\nThey guarantee us in turn.' : '');
    } else {
      setDipBtn(refs.dipGuarantee, d.canGuarantee, d.whyNotGuarantee,
        'Guarantee their independence: 50 influence points → +15 opinion, and any attacker on them fights us too.'
        + (d.theyGuarantee ? '\nThey guarantee us.' : ''));
    }
    refs.dipSubsidize.classList.toggle('pp-dip-on', !!d.subsidyOut);
    setText(refs.dipSubsidize, d.subsidyOut ? 'End Subsidy' : 'Send Subsidy');
    if (d.subsidyOut) {
      const s = d.subsidyOut;
      if (s.reparation) {
        refs.dipSubsidize.classList.add('disabled');
        refs.dipSubsidize.dataset.tt = `We pay them reparations: ${s.amount} talents/month for ${s.monthsLeft} more months. A debt of defeat cannot be cancelled.`;
      } else {
        refs.dipSubsidize.classList.remove('disabled');
        refs.dipSubsidize.dataset.tt = `Our subsidy: ${s.amount} talents/month, ${s.monthsLeft} months left.\nEnding it early costs 10 opinion.`;
      }
    } else {
      setDipBtn(refs.dipSubsidize, d.canSubsidize, d.whyNotSubsidize,
        'Subsidize their court: 10 talents a month for a year → +20 opinion.'
        + (d.subsidyIn ? `\nThey pay US ${d.subsidyIn.amount}/month (${d.subsidyIn.monthsLeft} months${d.subsidyIn.reparation ? ', reparations' : ''}).` : ''));
    }
    // Incorporation (SPEC §61): only shown for our own client kingdoms.
    refs.dipIncorporate.classList.toggle('hidden', !d.incorporate);
    if (d.incorporate) {
      const inc = d.incorporate;
      setText(refs.dipIncorporate, inc.inProgress > 0 ? `Incorporating… ${inc.inProgress}m` : 'Incorporate');
      setDipBtn(refs.dipIncorporate, inc.can, inc.why,
        `Begin incorporating the client kingdom: ${inc.cost} influence points now, then ${inc.months} months of union `
        + `(${inc.dev} development).\nTheir court must be nearly devoted — opinion ${inc.opinion >= 0 ? '+' : ''}${inc.opinion} of ${inc.needOpinion}+ needed — and both at peace the whole way: `
        + `war or cooling affection unravels the work and the influence is lost.\n`
        + `On completion their lands, treasury and people join the realm; the world counts absorption at half a conquest's infamy.`);
    }
    // Fabricate claim: per-province, priced in influence.
    let ci = null;
    if (actions && typeof actions.getClaimInfo === 'function') {
      try { ci = actions.getClaimInfo(provId); } catch (e) { warnOnce('getClaimInfo', e); ci = null; }
    }
    refs.dipClaim.classList.toggle('hidden', !ci);
    if (ci) {
      setText(refs.dipClaim, ci.hasClaim ? 'Claim Held' : 'Fabricate Claim');
      const terms = 'Fabricate a claim on this province — 30 influence points\nA war for a claim costs no stability, and the province is 30% cheaper at the peace table. Their opinion of us falls by 20.';
      if (ci.hasClaim) {
        refs.dipClaim.classList.add('disabled');
        refs.dipClaim.dataset.tt = 'We hold a claim here: a war for it costs no stability, and it is 30% cheaper to demand in a peace.';
      } else {
        setDipBtn(refs.dipClaim, ci.canFabricate, ci.whyNot, terms);
      }
    }
    // Declare war: hidden while already at war (the status row says so);
    // the tooltip names the casus belli and its price.
    refs.dipWar.classList.toggle('hidden', !!d.atWarWithUs);
    if (!d.atWarWithUs) {
      const warCost = d.cb
        ? (d.cb.type === 'claim' ? d.cb.label + ': no stability cost' : d.cb.label + ': costs 1 stability')
        : 'no casus belli: costs 2 stability and 5 legitimacy';
      setDipBtn(refs.dipWar, d.canWar, d.whyNotWar,
        `Declare war (${warCost}); their allies and overlord will answer the call`);
    }
  }

  function setDipBtn(btn, can, whyNot, costLine) {
    btn.classList.remove('hidden');
    btn.classList.toggle('disabled', !can);
    btn.dataset.tt = can ? costLine : (whyNot ? whyNot + '\n' + costLine : costLine);
  }

  function updateRecruit(btn, type, cost, p, g, base) {
    // The button speaks the age (SPEC §29): a 1948 barracks raises Rifle
    // Brigades and Armored Corps, not "infantry" and "cavalry".
    const t = g.tags && g.tags[g.playerTag];
    const gen = unlockedGen((t && t.tech && t.tech.mar) | 0);
    const label = genName(gen, type) || (type === 'inf' ? 'Infantry' : 'Cavalry');
    const glyph = icon(type === 'inf' ? 'shield' : 'horseshoe');
    const months = (base.unitRecruitMonths && base.unitRecruitMonths[type]) || (type === 'cav' ? 3 : 2);
    setHtml(btn, `${glyph} ${label} — ${cost} ${icon('coins', 'icon-xs')} · ${months}m`);
    let reason = null;
    if (!t) reason = 'No nation to recruit for';
    else if (p.impassable) reason = 'Impassable wasteland';
    else if (p.owner !== g.playerTag) reason = 'You do not own this province';
    else if (p.controller !== g.playerTag) reason = 'Province is under enemy occupation';
    else if ((t.treasury || 0) < cost) reason = `Not enough talents (${cost} needed)`;
    btn.classList.toggle('disabled', !!reason);
    btn.dataset.tt = reason
      || `Recruit ${fmtInt(base.regSize || 1000)} men — a regiment of ${label} — for ${cost} talents. Muster takes ${months} months; this province trains one queued unit at a time.`;
  }

  function refreshRecruitmentQueue(g) {
    let info = null;
    if (actions && typeof actions.getRecruitmentQueue === 'function') {
      try { info = actions.getRecruitmentQueue(provId); } catch (e) { warnOnce('getRecruitmentQueue', e); }
    }
    const rows = info && Array.isArray(info.rows) ? info.rows : [];
    refs.recruitQueue.classList.toggle('hidden', !rows.length);
    if (!rows.length) return;
    setHtml(refs.recruitQueue, rows.map((row, i) => {
      const glyph = icon(row.type === 'ship' ? 'ship' : row.type === 'wing' ? 'plane'
        : row.type === 'cav' ? 'horseshoe' : 'shield');
      let state = '';
      if (row.stalled) state = esc(row.stalled);
      else if (info.paused) state = `${row.monthsLeft}m left · paused`;
      else if (i > 0) state = `${row.monthsLeft}m · waiting`;
      else state = `${row.monthsLeft}m left`;
      return `<div class="pp-recruit-order">${glyph}`
        + `<span><b>${esc(row.name)}</b><small>${state}</small></span>`
        + `<em>#${i + 1}</em></div>`;
    }).join(''));
  }

  // The airfield block (SPEC §29): wings based here, a recruit button, and a
  // rebase button per other friendly field. Hidden without an airfield.
  function refreshAir(p, g) {
    let info = null;
    if (actions && typeof actions.getAirInfo === 'function') {
      try { info = actions.getAirInfo(provId); } catch (e) { warnOnce('getAirInfo', e); }
    }
    refs.recruitWing.classList.toggle('hidden', !info);
    refs.airBlock.classList.toggle('hidden', !info);
    if (!info) return;
    const rows = info.wings.map((w) => {
      const moves = info.targets.filter((tg) => tg.room > 0).slice(0, 3).map((tg) =>
        `<button class="pp-dip pp-air-move" data-wing="${w.id}" data-dest="${tg.id}"
          data-tt="Fly ${esc(w.name)} to the airfield of ${esc(tg.name)}">&rarr; ${esc(tg.name)}</button>`).join('');
      // Bombing raids (SPEC §30): one button per target in range, or the
      // rearming countdown while the armorers hang fresh bombs.
      let raids = '';
      if (w.raidCd > 0) {
        raids = ` <span class="pp-air-cd" data-tt="The wing is rearming: ready in ${w.raidCd} day${w.raidCd === 1 ? '' : 's'}">rearming ${w.raidCd}d</span>`;
      } else {
        raids = (w.raids || []).map((r) => {
          const what = r.men ? fmtMen(r.men) + ' hostile men' : r.siege ? 'the walls we besiege' : 'the garrison';
          const ordered = w.pendingRaid === r.id;
          return `<button class="pp-dip pp-air-raid${ordered ? ' pp-air-ordered' : ''}" data-raid-wing="${w.id}" data-raid-dest="${r.id}"
            data-tt="${ordered ? `Strike ordered — flies the moment time moves. Click again to call it off.\n` : ''}Bomb ${esc(r.name)} — ${esc(what)}.${r.men ? ' Kills ~3% (40–350 men) and shakes morale.' : r.siege ? ' +4 siege progress.' : ' Cracks the garrison by a tenth.'}\nEnemy air cover may drive the raid off — or down it.">✈ ${esc(r.name)}${ordered ? ' ·ordered' : ''}</button>`;
        }).join('');
      }
      return `<div class="pp-air-wing">${icon('plane', 'icon-row')} <b>${esc(w.name)}</b>${raids}${moves
        || (w.raidCd > 0 || (w.raids || []).length ? '' : ' <span class="peace-dim">(no other field to fly to)</span>')}</div>`;
    }).join('');
    setHtml(refs.airWings, rows || '<div class="peace-dim">The hangars stand empty.</div>');
    setHtml(refs.recruitWing, `${icon('plane')} Raise Air Wing — ${info.cost} ${icon('coins', 'icon-xs')} · ${info.months}m`);
    refs.recruitWing.classList.toggle('disabled', !info.canRecruit);
    refs.recruitWing.dataset.tt = info.canRecruit
      ? `Raise a fighter squadron: ${info.cost} talents, ${info.months} months in this province's unit queue, ${info.upkeep}/month upkeep after completion. `
        + `Covers battles within ${info.range} provinces of its field (+1 to the fire die); `
        + `${info.cap} wings fit on one field. Lost if the field falls.`
      : info.whyNot;
  }

  return {
    bind, open, close, refresh,
    get provId() { return provId; },
  };
}
