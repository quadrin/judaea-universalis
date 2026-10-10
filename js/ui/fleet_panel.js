// js/ui/fleet_panel.js — the fleet panel (SPEC §294).
//
// A selected squadron of ours opens a panel in the province panel's berth:
// its name, hulls and pattern, its admiral, where it is and what it is
// doing (at anchor, under sail, laid up, signing on crews), the troops it
// carries, what it costs, and its trade mission; and every order it can
// take, each a labelled button that says why when it cannot. The outliner's
// row keeps its small buttons; this is where they are explained.
import { esc, fmtMen, warnOnce } from './format.js';
import { icon, flagChip } from './icons.js';

export function createFleetPanel(el, { DEFINES, onClose, onTradeClick }) {
  let ctx = null;
  let actions = null;
  let fleetId = null;
  const refs = {};

  function setHtml(node, s) {
    if (node && node.__html !== s) { node.__html = s; node.innerHTML = s; }
  }

  function bind(c, a) {
    ctx = c;
    actions = a;
    el.innerHTML = `
      <div class="pp-head">
        <h2 class="pp-name" data-ref="name"></h2>
        <button class="pp-close" data-ref="close" data-tt="Deselect the squadron (Esc)">${icon('xmark')}</button>
      </div>
      <div class="fp-sub" data-ref="sub"></div>
      <div class="fp-rows" data-ref="rows"></div>
      <div class="fp-acts" data-ref="acts"></div>`;
    for (const n of el.querySelectorAll('[data-ref]')) refs[n.dataset.ref] = n;
    refs.close.addEventListener('click', () => { if (onClose) onClose(); });
    refs.acts.addEventListener('click', (e) => {
      const b = e.target instanceof Element ? e.target.closest('[data-fp]') : null;
      if (!b || b.classList.contains('disabled') || fleetId == null || !actions) return;
      const act = b.dataset.fp;
      try {
        if (act === 'trade') { if (onTradeClick) onTradeClick(); return; }
        if (act === 'layup') actions.layUpFleet(fleetId, true);
        else if (act === 'recommission') actions.layUpFleet(fleetId, false);
        else if (typeof actions[act] === 'function') actions[act](fleetId);
      } catch (err) { warnOnce('fp-' + act, err); }
      refresh();
    });
  }

  function row(k, v, tt) {
    return `<div class="fp-row"${tt ? ` data-tt="${esc(tt)}"` : ''}><span class="pp-k">${esc(k)}</span><span class="pp-v">${v}</span></div>`;
  }
  function btn(act, ico, label, can, tt) {
    return `<button class="btn${can ? '' : ' disabled'}" data-fp="${act}" data-tt="${esc(tt)}">${icon(ico)}<span>${esc(label)}</span></button>`;
  }

  // Shift-click builds a group of squadrons (SPEC §299): this card shows the
  // last one picked, and says how many sail together.
  function groupRow(g) {
    const ids = (g.ui && Array.isArray(g.ui.selectedFleets) ? g.ui.selectedFleets : [])
      .filter((id) => g.fleets && g.fleets[id] && g.fleets[id].tag === g.playerTag);
    if (ids.length < 2) return '';
    const ships = ids.reduce((n, id) => n + (g.fleets[id].ships | 0), 0);
    return row('Group', `${ids.length} squadrons · ${ships} ships`,
      'Shift-click a squadron to add it to the group or drop it. A right-click, or a click on the map, sails them all; the buttons act on this one.');
  }

  function refresh() {
    if (fleetId == null || !ctx || !actions || el.classList.contains('hidden')) return;
    let navy = null;
    try { navy = actions.getNavy(); } catch (e) { warnOnce('fp-getNavy', e); }
    const f = navy && (navy.fleets || []).find((x) => x.id === fleetId);
    if (!f) { close(); if (onClose) onClose(); return; }
    const g = ctx.game;
    setHtml(refs.name, `${flagChip(g.playerTag, DEFINES, 20, false, g)} ${esc(f.name)}`);
    refs.sub.textContent = `${f.ships} ${f.ships === 1 ? 'ship' : 'ships'} of ${f.genName || 'the old pattern'}`;
    const where = f.laidUp ? `laid up in ordinary at ${esc(f.provName)}`
      : f.recommission ? `signing on crews at ${esc(f.provName)}, ${f.recommission} days`
        : f.sailing ? `under sail to ${esc(f.destName || '?')}, ${Math.max(1, f.moveDaysLeft | 0)} days`
          : `at anchor off ${esc(f.provName)}`;
    const aboard = f.aboard && f.aboard.length
      ? `${fmtMen(f.aboardMen)} <span class="peace-dim">(${f.aboard.map((a) => esc(a.name)).join(', ')})</span>`
      : `<span class="peace-dim">none · room for ${fmtMen(f.capacity)}</span>`;
    const adm = f.admiral ? `${icon('helmet', 'icon-xs')} ${esc(f.admiral.name)} <span class="peace-dim">(seamanship ${f.admiral.maneuver})</span>`
      : '<span class="peace-dim">none</span>';
    const mission = f.mission
      ? `${f.mission.kind === 'raid' ? 'raiding' : 'guarding'} ${esc(f.mission.nodeName || f.mission.node)}`
      : '<span class="peace-dim">none</span>';
    setHtml(refs.rows, [
      row('Where', where),
      row('Admiral', adm, 'An admiral\'s seamanship rides the battle die.'),
      row('Troops aboard', aboard, 'Each ship carries 1,000 men. Men aboard are out of supply reach and cannot fight until they land.'),
      row('Upkeep', `${(f.upkeep || 0).toFixed(1)} a month${f.laidUp ? ' <span class="peace-dim">(laid up)</span>' : ''}`,
        'Every ship costs its upkeep each month (Naval maintenance in the ledger). A squadron laid up in ordinary costs a quarter.'),
      row('Trade', mission, 'A squadron can guard a market\'s lanes (more trade power for us) or raid them. Set it in the Trade tab.'),
      groupRow(g),
    ].join(''));
    const idle = f.laidUp || f.recommission;
    const acts = [
      btn('mergeAllFleets', 'shield', 'Merge here', f.canMerge,
        f.canMerge ? `Bring the ${f.mergeCount} other squadron${f.mergeCount === 1 ? '' : 's'} at this anchor (${f.mergeShips} hulls) under this command.` : (f.whyMerge || 'No other squadron of ours here.')),
      btn('embarkFleet', 'embark', 'Embark troops', f.canEmbark && !idle,
        idle ? 'The squadron cannot take troops aboard now.' : f.canEmbark ? 'Take our armies at this harbor aboard.' : 'No army of ours waits at this harbor.'),
      btn('disembarkFleet', 'retreat', 'Land troops', f.canDisembark,
        f.canDisembark ? 'Put the troops ashore here.' : 'Nobody aboard, or the squadron is at sea.'),
      btn('hireAdmiral', 'helmet', f.admiral ? 'Admiral in post' : 'Hire admiral · 50', f.canHireAdmiral,
        f.admiral ? f.admiral.name + ' commands.' : f.canHireAdmiral ? 'Hire an admiral for 50 martial points.' : 'An admiral costs 50 martial points.'),
      btn('modernizeFleet', 'bricks', f.canModernize ? `Refit · ${f.modernizeCost}` : 'Refit', f.canModernize,
        f.canModernize ? `Re-rig ${f.genName} as ${f.newGenName} (${f.modernizeCost} talents).` : (f.whyModernize || 'Nothing newer to re-rig to.')),
      f.laidUp
        ? btn('recommission', 'anchor', 'Recommission', true, `Sign on crews (30 days); the full upkeep again (+${(f.layUpSave || 0).toFixed(1)} a month).`)
        : btn('layup', 'anchor', 'Lay up', f.canLayUp,
          f.canLayUp ? `Lay up in ordinary: a quarter of the upkeep (save ${(f.layUpSave || 0).toFixed(1)} a month). It cannot sail, fights at half strength, and is lost if the harbor falls.` : (f.whyLayUp || 'Not now.')),
      btn('trade', 'coins', 'Trade mission…', !idle, idle ? 'The squadron cannot take a mission now.' : 'Guard or raid a market: the Trade tab.'),
    ];
    setHtml(refs.acts, acts.join(''));
  }

  function open(id) {
    fleetId = id;
    el.classList.remove('hidden');
    refresh();
  }
  function close() {
    fleetId = null;
    el.classList.add('hidden');
  }
  return { bind, open, close, refresh, isOpen: () => fleetId != null && !el.classList.contains('hidden'), fleet: () => fleetId };
}
