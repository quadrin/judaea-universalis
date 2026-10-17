import { esc } from './format.js';
import { icon, flagChip } from './icons.js';
const FACTORS = {
  'War exhaustion': 'flame', 'Occupied provinces': 'flag', 'Manpower depleted': 'spears',
  'Capital occupied': 'temple', 'Length of war': 'hourglass', 'Forces still in the field': 'helmet',
};
const signed = v => (v >= 0 ? '+' : '') + Number(v).toFixed(1);
export function renderPeaceStrategy(ev, ctx) {
  const math = ev.enthusiasm ? `Willingness ${signed(ev.enthusiasm.willingness)} after base reluctance 4. Applied adjustment ${signed(ev.acceptanceAdjustment)}. Positive adjustment is capped at 25% of war score; total victory permits demands up to 100.` : '';
  return (ev.enthusiasm ? `<details open class="peace-factors"><summary>
    <span>${icon('dove', 'icon-sm')}Enemy war enthusiasm: ${esc(ev.enthusiasm.level)}</span>
    <span class="peace-stat" title="Maximum demand cost the enemy will accept, after war score and enthusiasm adjustments">${icon('scales', 'icon-sm')}Limit ${Math.round(ev.acceptanceBudget)}</span></summary>
    <div class="peace-stats" title="${esc(math)}" data-tt="${esc(math)}">
      <span>${icon('dove', 'icon-sm')}Willingness <b>${signed(ev.enthusiasm.willingness)}</b></span>
      <span>${icon('scales', 'icon-sm')}Applied <b>${signed(ev.acceptanceAdjustment)}</b></span>
      <span>${icon('alert', 'icon-sm')}Cap <b>25%</b></span></div>
    <div class="peace-factor-grid">${ev.enthusiasm.factors.map(r => `<div class="peace-factor" title="${esc(r.label)} contributes ${signed(r.value)} to willingness to settle">
      ${icon(FACTORS[r.label] || 'scales', 'icon-sm')}<span>${esc(r.label)}</span><b class="${r.value >= 0 ? 'pos' : 'neg'}">${signed(r.value)}</b></div>`).join('')}</div></details>` : '')
    + (ev.expansion?.length ? `<details open class="peace-concern"><summary>${icon('alert', 'icon-sm')}Regional concern after this treaty <span class="peace-stat">${ev.expansion.filter(r => r.coalition).length} at risk</span></summary>
      <div class="campaign-table"><table><thead><tr><th>${icon('flag', 'icon-sm')}Court</th><th title="Concern added by this treaty">${icon('flame', 'icon-sm')}Added</th><th title="Total regional concern after the treaty">${icon('scales', 'icon-sm')}Total</th><th>Coalition</th></tr></thead><tbody>${ev.expansion.map(r => {
      const risk = r.newlyAlarmed ? 'New' : r.coalition ? 'Eligible' : 'Clear';
      const tip = r.newlyAlarmed ? 'This treaty makes the court newly eligible to join a coalition.' : r.coalition ? 'Regional concern and relations permit this court to join a coalition.' : 'Below the concern threshold, or relations prevent coalition membership.';
      return `<tr><td><span class="peace-court">${ctx ? flagChip(r.tag, ctx.DEFINES, 18, false, ctx.game) : icon('flag', 'icon-sm')}${esc(r.name)}</span></td><td>+${r.gain.toFixed(1)}</td><td>${r.after.toFixed(1)}</td><td><span class="peace-risk ${r.coalition ? 'neg' : 'pos'}" title="${esc(tip)}" data-tt="${esc(tip)}">${icon(r.newlyAlarmed ? 'flame' : r.coalition ? 'alert' : 'shield', 'icon-sm')}${risk}</span></td></tr>`;
    }).join('')}</tbody></table></div></details>` : '');
}
