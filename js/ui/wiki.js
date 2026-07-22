// js/ui/wiki.js — the Compendium (SPEC §71): the game's wiki, generated from
// the live data modules so it can never drift from the game it describes.
// Pages: home → chapters (overview / timeline / every event with its printed
// consequences) → the nations → the formable crowns → the shared event pool.
// The title screen alone opens it (📖 Compendium); in play the campaign's own
// chrome has the floor. getCtx() is consulted when a game happens to exist,
// the data modules always.
import { esc, rgb, fmtYear, titleCase, warnOnce } from './format.js';
import { icon, divider, flagChip } from './icons.js';
import { ERAS, GENERIC_EVENTS } from '../data/compendium.js';
import { FORMABLES } from '../data/formables.js';
import { CAMPAIGN_GUIDANCE } from '../data/campaign_guidance.js';
import { POWERS } from '../data/powers.js';

// Calendar month index with no year zero (mirror of sim/events.js — the wiki
// may not import the sim).
function monthIdx(y, m) {
  const year = y > 0 ? y - 1 : y;
  return year * 12 + (m - 1);
}

export function createWiki({ DEFINES, getCtx }) {
  let el = null;
  let stack = []; // [{p, a}] — page id + argument; the breadcrumb trail

  const MONTHS = (DEFINES && DEFINES.MONTH_NAMES) || [];
  const TAGS = (DEFINES && DEFINES.TAGS) || {};
  const genericIds = new Set(GENERIC_EVENTS.map((e) => e && e.id).filter(Boolean));

  const eraOf = (id) => ERAS.find((e) => e.bookmark.id === id) || null;
  const scriptedOf = (era) => era.events.filter((e) => e && !genericIds.has(e.id));
  const liveGame = () => { const c = getCtx && getCtx(); return c ? c.game : null; };
  const chip = (tag, size = 18) => flagChip(tag, DEFINES, size, false, liveGame());
  const tagName = (tag) => {
    const g = liveGame();
    return (g && g.tags[tag] && g.tags[tag].name) || (TAGS[tag] && TAGS[tag].name) || tag;
  };
  const fmtMonth = (d) => (MONTHS[(d.m | 0) - 1] || 'M' + d.m) + ' ' + fmtYear(d.y);

  // ---------------------------------------------------------------- helpers --
  function fireLabel(ev) {
    if (ev.date) return fmtMonth(ev.date);
    const bits = ['When its conditions are met'];
    if (Number.isFinite(ev.chance)) bits.push(Math.round(ev.chance * 100) + '%/month once true');
    return bits.join(' · ');
  }
  function fireDetail(ev) {
    const rows = [];
    rows.push(['Fires', fireLabel(ev)]);
    if (ev.once === false) {
      rows.push(['Recurs', Number.isFinite(ev.cooldownMonths)
        ? 'yes — at most once every ' + ev.cooldownMonths + ' months' : 'yes']);
    }
    if (Number.isFinite(ev.minYear) || Number.isFinite(ev.maxYear)) {
      const from = Number.isFinite(ev.minYear) ? fmtYear(ev.minYear) : 'the beginning';
      const to = Number.isFinite(ev.maxYear) ? fmtYear(ev.maxYear) : 'the end of days';
      rows.push(['Era window', from + ' — ' + to]);
    }
    const req = ev.requiresWar;
    if (Array.isArray(req) && req.length) {
      const pairs = (req.length === 2 && typeof req[0] === 'string') ? [req] : req;
      rows.push(['Requires the war', pairs.map(([a, b]) => tagName(a) + ' vs ' + tagName(b)).join(', or ')]);
    }
    return rows;
  }
  function audienceRows(ev) {
    const rows = [];
    if (ev.forTag === 'both' || ev.forTag === 'player') {
      rows.push(['Seen by', ev.forTag === 'both' ? 'the player, whichever standard they carry' : 'the player\'s court']);
    } else if (ev.forTag) {
      rows.push(['Seen by', tagName(ev.forTag) + ' (other courts are toasted if major)']);
    }
    if (ev.decider) {
      rows.push(['The choice belongs to', tagName(ev.decider)
        + ' — any other player is only notified of their course']);
    }
    return rows;
  }
  function optionListHtml(ev) {
    const aiIdx = typeof ev.aiOption === 'function' ? -1 : (ev.aiOption | 0);
    return (ev.options || []).map((o, i) => `
      <div class="wiki-opt">
        <div class="wiki-opt-label">${icon('star4', 'icon-xs')} ${esc(o.label || 'Continue')}
          ${i === aiIdx ? '<span class="wiki-hist" data-tt="What an AI court (and history) does.">the historical course</span>' : ''}
        </div>
        ${o.tooltip ? `<div class="wiki-opt-tip">${esc(o.tooltip)}</div>`
    : '<div class="wiki-opt-tip wiki-dim">Its consequences are written only in the chronicle.</div>'}
      </div>`).join('');
  }
  function badges(ev) {
    return (ev.world ? '<span class="wiki-badge wiki-badge-world">world history</span>' : '')
      + (ev.major ? '<span class="wiki-badge">major</span>' : '')
      + (ev.once === false ? '<span class="wiki-badge">recurring</span>' : '')
      + (ev.decider ? `<span class="wiki-badge wiki-badge-decider">${esc(tagName(ev.decider))}'s choice</span>` : '');
  }
  function kv(rows) {
    return rows.map(([k, v]) => `<div class="wiki-kv"><span class="wiki-k">${esc(k)}</span><span class="wiki-v">${esc(v)}</span></div>`).join('');
  }
  const IDEA_LABELS = {
    disciplineMult: 'discipline', moraleMult: 'morale', siegeBonus: 'siege progress',
    hillDefBonus: 'hill defense', incomeMult: 'income', manpowerMult: 'manpower',
    reinforceMult: 'reinforcement', fortDefense: 'fort defense', tradeMult: 'trade',
    navalMult: 'naval power', milPowerMult: 'army power', convertMult: 'conversion',
    legitimacyAdd: 'monthly legitimacy', unrestAll: 'unrest everywhere',
    forceLimitMult: 'force limit', growthMult: 'growth', maintMult: 'army upkeep', adminMult: 'administration',
  };
  function ideaLines(ideas) {
    if (!ideas) return [];
    return Object.keys(ideas).map((k) => {
      const v = ideas[k];
      if (!Number.isFinite(v)) return null;
      const label = IDEA_LABELS[k] || titleCase(k.replace(/(Mult|Add|Bonus)$/, ''));
      if (/Mult$/.test(k)) {
        const pct = Math.round((v - 1) * 100);
        if (!pct) return null;
        return (pct > 0 ? '+' : '−') + Math.abs(pct) + '% ' + label;
      }
      if (!v) return null;
      return (v > 0 ? '+' : '−') + Math.abs(v) + ' ' + label;
    }).filter(Boolean);
  }

  // ------------------------------------------------------------------ pages --
  function pageHome() {
    const chapters = ERAS.map((e) => {
      const b = e.bookmark;
      const scripted = scriptedOf(e);
      const dated = scripted.filter((ev) => ev && ev.date).length;
      const playable = (b.playableTags || []).map((p) => chip(p.tag, 16)).join(' ');
      return `<div class="wiki-card-row wiki-link" data-go="era:${esc(b.id)}">
        <div class="wiki-row-year">${esc(fmtYear(b.startDate.y))}</div>
        <div class="wiki-row-main">
          <div class="wiki-row-title">${esc(b.name)}</div>
          <div class="wiki-dim">${scripted.length} scripted events · ${dated} dated · playable: ${playable}</div>
        </div>
        <div class="wiki-row-go">›</div>
      </div>`;
    }).join('');
    return {
      title: 'The Compendium',
      sub: 'Everything the chronicler knows: the chapters and their timelines, every event and its consequences, the nations, and the crowns that can be formed.',
      body: `
        <div class="wiki-sec">The seven chapters</div>
        ${chapters}
        <div class="wiki-sec">The world entire</div>
        <div class="wiki-card-row wiki-link" data-go="nations:">
          <div class="wiki-row-year">${icon('flag', 'icon-sm')}</div>
          <div class="wiki-row-main"><div class="wiki-row-title">The Nations</div>
            <div class="wiki-dim">Every court of every era — faiths, capitals, temperaments, national character.</div></div>
          <div class="wiki-row-go">›</div>
        </div>
        <div class="wiki-card-row wiki-link" data-go="formables:">
          <div class="wiki-row-year">${icon('laurel', 'icon-sm')}</div>
          <div class="wiki-row-main"><div class="wiki-row-title">The Formable Crowns</div>
            <div class="wiki-dim">${FORMABLES.length} greater banners, their requirements and founding bonuses.</div></div>
          <div class="wiki-row-go">›</div>
        </div>
        <div class="wiki-card-row wiki-link" data-go="pool:">
          <div class="wiki-row-year">${icon('lamp', 'icon-sm')}</div>
          <div class="wiki-row-main"><div class="wiki-row-title">Omens &amp; Incidents</div>
            <div class="wiki-dim">The shared pool of ${GENERIC_EVENTS.length} repeatable events every chapter draws from.</div></div>
          <div class="wiki-row-go">›</div>
        </div>`,
    };
  }

  function pageEra(id) {
    const era = eraOf(id);
    if (!era) return pageHome();
    const b = era.bookmark;
    const scripted = scriptedOf(era);
    const world = scripted.filter((ev) => ev.world === true).length;
    const guide = CAMPAIGN_GUIDANCE[b.id] || {};
    const standards = (b.playableTags || []).map((p) => {
      const g = guide[p.tag];
      const objectives = (b.objectives && b.objectives[p.tag]) || [];
      const ruler = b.rulers && b.rulers[p.tag];
      return `<div class="wiki-standard">
        <div class="wiki-standard-head" data-go="nation:${esc(p.tag)}">${chip(p.tag, 22)}
          <b>${esc(tagName(p.tag))}</b>
          <span class="wiki-diff">${esc(p.difficulty || '')}</span></div>
        ${ruler ? `<div class="wiki-dim">Ruler: ${esc(ruler.name)}${ruler.heir ? ' · heir ' + esc(ruler.heir.name) : ''}</div>` : ''}
        <div class="wiki-blurb">${esc(p.blurb || '')}</div>
        ${g ? `<div class="wiki-kv"><span class="wiki-k">Signature system</span><span class="wiki-v">${esc(g.system)}</span></div>
        <ol class="wiki-moves">${(g.opening || []).map((line) => `<li>${esc(line)}</li>`).join('')}</ol>` : ''}
        ${objectives.length ? `<div class="wiki-objectives">${objectives.map((line) =>
    `<div class="${/^Lose/.test(line) ? 'neg' : 'pos'}">${esc(line)}</div>`).join('')}</div>` : ''}
        ${g && (g.clocks || []).length ? `<div class="wiki-kv"><span class="wiki-k">The danger clock</span><span class="wiki-v">${g.clocks.map((c) => esc(fmtMonth(c) + ' — ' + c.label)).join('<br>')}</span></div>` : ''}
      </div>`;
    }).join('');
    const powers = (POWERS[b.id] || []).map((p) =>
      `<div class="wiki-kv"><span class="wiki-k">${esc(p.name)}</span><span class="wiki-v">${esc(p.blurb || '')}</span></div>`).join('');
    // Standing rivalries (SPEC §73): the era's weather, straight from the data.
    const rivalries = (Array.isArray(b.rivalries) ? b.rivalries : [])
      .filter((pair) => Array.isArray(pair) && pair.length === 2)
      .map(([a, c]) => `<div class="wiki-rivalry">${chip(a, 18)} <b>${esc(tagName(a))}</b>
        <span class="wiki-dim">·</span> ${chip(c, 18)} <b>${esc(tagName(c))}</b></div>`).join('');
    return {
      title: b.name,
      sub: fmtYear(b.startDate.y) + ' — ' + (b.blurb || ''),
      body: `
        <div class="wiki-card-row wiki-link" data-go="timeline:${esc(b.id)}">
          <div class="wiki-row-year">${icon('lamp', 'icon-sm')}</div>
          <div class="wiki-row-main"><div class="wiki-row-title">The timeline</div>
            <div class="wiki-dim">Every dated development of the chapter, in order${world ? ' — ' + world + ' of them world history' : ''}.</div></div>
          <div class="wiki-row-go">›</div>
        </div>
        <div class="wiki-card-row wiki-link" data-go="events:${esc(b.id)}">
          <div class="wiki-row-year">${icon('scroll', 'icon-sm')}</div>
          <div class="wiki-row-main"><div class="wiki-row-title">All events &amp; consequences</div>
            <div class="wiki-dim">${scripted.length} scripted events — what fires, for whom, and what each choice does.</div></div>
          <div class="wiki-row-go">›</div>
        </div>
        <div class="wiki-sec">The playable standards</div>
        <div class="wiki-standards">${standards}</div>
        ${rivalries ? `<div class="wiki-sec">Standing rivalries</div>
        <div class="wiki-dim">Old hatreds that never cool to neutral — the AI treats war between these courts as the era's weather.</div>
        ${rivalries}` : ''}
        ${powers ? `<div class="wiki-sec">The powers beyond the map</div>${powers}` : ''}`,
    };
  }

  function pageTimeline(id) {
    const era = eraOf(id);
    if (!era) return pageHome();
    const b = era.bookmark;
    const scripted = scriptedOf(era);
    const dated = scripted.filter((ev) => ev.date)
      .sort((x, y2) => monthIdx(x.date.y, x.date.m) - monthIdx(y2.date.y, y2.date.m));
    const startIdx = monthIdx(b.startDate.y, b.startDate.m);
    let lastYear = null;
    let rows = '';
    for (const ev of dated) {
      if (ev.date.y !== lastYear) {
        lastYear = ev.date.y;
        rows += `<div class="chron-year">${esc(fmtYear(lastYear))}</div>`;
      }
      const pre = monthIdx(ev.date.y, ev.date.m) < startIdx;
      rows += `<div class="wiki-card-row wiki-link${ev.world ? ' wiki-world-row' : ''}" data-go="event:${esc(b.id)}|${esc(ev.id)}">
        <div class="wiki-row-year">${esc(MONTHS[(ev.date.m | 0) - 1] || 'M' + ev.date.m)}</div>
        <div class="wiki-row-main"><div class="wiki-row-title">${esc(ev.title || ev.id)}${pre ? ' <span class="wiki-dim">(before the bookmark opens)</span>' : ''}</div>
          <div class="wiki-dim">${badges(ev) || esc(String(ev.desc || '').slice(0, 96) + '…')}</div></div>
        <div class="wiki-row-go">›</div>
      </div>`;
    }
    const triggered = scripted.filter((ev) => !ev.date);
    const trigRows = triggered.map((ev) => `
      <div class="wiki-card-row wiki-link" data-go="event:${esc(b.id)}|${esc(ev.id)}">
        <div class="wiki-row-year">${icon('alert', 'icon-xs')}</div>
        <div class="wiki-row-main"><div class="wiki-row-title">${esc(ev.title || ev.id)}</div>
          <div class="wiki-dim">${esc(fireLabel(ev))}</div></div>
        <div class="wiki-row-go">›</div>
      </div>`).join('');
    return {
      title: 'The timeline — ' + b.name,
      sub: 'Dated developments fire on the first of their month; the campaign can retire, delay, or refuse them — treaties bind the script.',
      body: rows + (trigRows ? `<div class="wiki-sec">And, when their hour comes</div>${trigRows}` : ''),
    };
  }

  function pageEvents(id) {
    const era = eraOf(id);
    if (!era) return pageHome();
    const b = era.bookmark;
    const rows = scriptedOf(era).map((ev) => `
      <div class="wiki-card-row wiki-link" data-go="event:${esc(b.id)}|${esc(ev.id)}">
        <div class="wiki-row-year">${ev.date ? esc(String(Math.abs(ev.date.y)) + (ev.date.y < 0 ? ' BCE' : '')) : icon('alert', 'icon-xs')}</div>
        <div class="wiki-row-main"><div class="wiki-row-title">${esc(ev.title || ev.id)} ${badges(ev)}</div>
          <div class="wiki-dim">${esc(fireLabel(ev))} · ${(ev.options || []).length} option${(ev.options || []).length === 1 ? '' : 's'}</div></div>
        <div class="wiki-row-go">›</div>
      </div>`).join('');
    return {
      title: 'Events — ' + b.name,
      sub: 'In the order the chronicle tells them. The shared pool of omens and incidents plays in every chapter besides.',
      body: rows + `
        <div class="wiki-sec"></div>
        <div class="wiki-card-row wiki-link" data-go="pool:">
          <div class="wiki-row-year">${icon('lamp', 'icon-sm')}</div>
          <div class="wiki-row-main"><div class="wiki-row-title">Omens &amp; Incidents</div>
          <div class="wiki-dim">The ${GENERIC_EVENTS.length} shared repeatable events.</div></div>
          <div class="wiki-row-go">›</div>
        </div>`,
    };
  }

  function pageEvent(arg) {
    const [eraId, evId] = String(arg).split('|');
    const list = eraId === 'generic' ? GENERIC_EVENTS : (eraOf(eraId) ? eraOf(eraId).events : []);
    const ev = list.find((e) => e && e.id === evId);
    if (!ev) return pageHome();
    return {
      title: ev.title || ev.id,
      sub: '',
      body: `
        <div class="wiki-badges">${badges(ev)}</div>
        <div class="wiki-desc">${esc(ev.desc || '')}</div>
        ${kv(fireDetail(ev).concat(audienceRows(ev)))}
        <div class="wiki-sec">The choices &amp; their consequences</div>
        ${optionListHtml(ev)}`,
    };
  }

  function rosterTags() {
    const seen = new Map(); // tag -> first era index
    ERAS.forEach((e, i) => {
      for (const t of e.bookmark.activeTags || []) {
        if (!seen.has(t) && TAGS[t]) seen.set(t, i);
      }
    });
    for (const f of FORMABLES) if (TAGS[f.to] && !seen.has(f.to)) seen.set(f.to, 99);
    return [...seen.entries()].sort((a, b2) => a[1] - b2[1] || a[0].localeCompare(b2[0])).map((e) => e[0]);
  }

  function pageNations() {
    const rows = rosterTags().map((tag) => {
      const def = TAGS[tag] || {};
      const eras = ERAS.filter((e) => (e.bookmark.activeTags || []).includes(tag));
      const playable = ERAS.filter((e) => (e.bookmark.playableTags || []).some((p) => p.tag === tag));
      const formableOnly = !eras.length;
      return `<div class="wiki-card-row wiki-link" data-go="nation:${esc(tag)}">
        <div class="wiki-row-year">${chip(tag, 22)}</div>
        <div class="wiki-row-main"><div class="wiki-row-title">${esc(def.name || tag)}
          ${playable.length ? '<span class="wiki-badge">playable</span>' : ''}
          ${formableOnly ? '<span class="wiki-badge wiki-badge-world">formable</span>' : ''}</div>
          <div class="wiki-dim">${formableOnly ? 'A crown that exists only if someone forms it.'
    : eras.map((e) => esc(fmtYear(e.bookmark.startDate.y))).join(' · ')}</div></div>
        <div class="wiki-row-go">›</div>
      </div>`;
    }).join('');
    return {
      title: 'The Nations',
      sub: 'Every court of every chapter. Click through for temperament, national character, rulers and crowns.',
      body: rows,
    };
  }

  function pageNation(tag) {
    const def = TAGS[tag];
    if (!def) return pageNations();
    const R = (DEFINES.RELIGIONS || {})[def.religion];
    const C = (DEFINES.CULTURES || {})[def.culture];
    const pers = (DEFINES.PERSONALITIES || {})[tag];
    const meta = [];
    if (R) meta.push(['Faith', R.name || def.religion]);
    if (C) meta.push(['Culture', C.name || def.culture]);
    if (def.capital) meta.push(['Capital', def.capital]);
    if (pers) {
      const words = [];
      if (pers.ponderous) words.push('ponderous — slow to anger, relentless once roused');
      if (Number.isFinite(pers.aggression)) {
        words.push(pers.aggression >= 1.2 ? 'rapacious' : pers.aggression <= 0.7 ? 'cautious of war' : 'measured');
      }
      if (Number.isFinite(pers.caution) && pers.caution >= 1.3) words.push('careful of its armies');
      meta.push(['Temperament', words.join('; ') || 'unremarkable']);
    }
    const ideas = ideaLines(def.ideas);
    const eras = ERAS.filter((e) => (e.bookmark.activeTags || []).includes(tag));
    const eraRows = eras.map((e) => {
      const b = e.bookmark;
      const p = (b.playableTags || []).find((q) => q.tag === tag);
      const ruler = b.rulers && b.rulers[tag];
      return `<div class="wiki-card-row wiki-link" data-go="era:${esc(b.id)}">
        <div class="wiki-row-year">${esc(fmtYear(b.startDate.y))}</div>
        <div class="wiki-row-main"><div class="wiki-row-title">${esc(b.name)}
          ${p ? `<span class="wiki-badge">playable · ${esc(p.difficulty || '')}</span>` : ''}</div>
          <div class="wiki-dim">${ruler ? 'Under ' + esc(ruler.name) + (ruler.title ? ', ' + esc(ruler.title) : '') : 'A court of the era'}${p && p.blurb ? ' — ' + esc(p.blurb) : ''}</div></div>
        <div class="wiki-row-go">›</div>
      </div>`;
    }).join('');
    const from = FORMABLES.filter((f) => f.from === tag);
    const into = FORMABLES.filter((f) => f.to === tag);
    const crowns = from.concat(into).map((f) => `
      <div class="wiki-card-row wiki-link" data-go="formables:">
        <div class="wiki-row-year">${chip(f.to, 20)}</div>
        <div class="wiki-row-main"><div class="wiki-row-title">${esc(f.name)}</div>
          <div class="wiki-dim">${esc(tagName(f.from))} → ${esc(tagName(f.to))}</div></div>
        <div class="wiki-row-go">›</div>
      </div>`).join('');
    return {
      title: def.name || tag,
      sub: def.description || '',
      titleChip: chip(tag, 30),
      body: `
        ${kv(meta)}
        ${ideas.length ? `<div class="wiki-sec">National character</div><div class="wiki-ideas">${ideas.map((line) => `<span class="wiki-idea">${esc(line)}</span>`).join('')}</div>` : ''}
        ${eraRows ? `<div class="wiki-sec">Chapters</div>${eraRows}` : '<div class="wiki-dim">This banner flies only if a court forms it.</div>'}
        ${crowns ? `<div class="wiki-sec">Crowns</div>${crowns}` : ''}`,
    };
  }

  function pageFormables() {
    const eraName = (bid) => {
      const e = eraOf(bid);
      return e ? e.bookmark.name + ' (' + fmtYear(e.bookmark.startDate.y) + ')' : bid;
    };
    const bonusText = (f) => {
      const bits = [];
      if (f.bonus) {
        if (f.bonus.legitimacy) bits.push('+' + f.bonus.legitimacy + ' legitimacy');
        if (f.bonus.stability) bits.push('+' + f.bonus.stability + ' stability');
        if (f.bonus.modifier) {
          bits.push(f.bonus.modifier.name + ' (' + (ideaLines(f.bonus.modifier.effects).join(', ') || 'permanent') + ')');
        }
      }
      return bits.join(' · ');
    };
    const rows = FORMABLES.map((f) => `
      <div class="wiki-standard">
        <div class="wiki-standard-head">${chip(f.from, 20)} <span class="wiki-dim">→</span> ${chip(f.to, 24)}
          <b>${esc(f.name)}</b></div>
        <div class="wiki-blurb">${esc(f.desc || '')}</div>
        <div class="wiki-kv"><span class="wiki-k">Where</span><span class="wiki-v">${esc((f.bookmarks || []).map(eraName).join(' · ') || 'any chapter')}</span></div>
        <div class="wiki-kv"><span class="wiki-k">Requires</span><span class="wiki-v">${(f.requires || []).map((r) => esc(r.label)).join('<br>')}</span></div>
        <div class="wiki-kv"><span class="wiki-k">The founding</span><span class="wiki-v">${esc(bonusText(f))}</span></div>
      </div>`).join('');
    return {
      title: 'The Formable Crowns',
      sub: 'Fulfill a greater crown\'s requirements and the whole realm — armies, wars, treaties, your own throne — takes the new banner. Forming costs nothing but the doing (Decisions panel).',
      body: `<div class="wiki-standards">${rows}</div>`,
    };
  }

  function pagePool() {
    const rows = GENERIC_EVENTS.map((ev) => `
      <div class="wiki-card-row wiki-link" data-go="event:generic|${esc(ev.id)}">
        <div class="wiki-row-year">${Number.isFinite(ev.minYear) ? 'modern' : Number.isFinite(ev.maxYear) ? 'antique' : 'timeless'}</div>
        <div class="wiki-row-main"><div class="wiki-row-title">${esc(ev.title || ev.id)}</div>
          <div class="wiki-dim">${esc(fireLabel(ev))}</div></div>
        <div class="wiki-row-go">›</div>
      </div>`).join('');
    return {
      title: 'Omens & Incidents',
      sub: 'The shared pool: repeatable events of harvest, plague, comets, credit and strife that every chapter draws from — the antique ones stop by 1800, the modern ones begin with 1900.',
      body: rows,
    };
  }

  // ----------------------------------------------------------------- render --
  const PAGES = {
    home: pageHome,
    era: pageEra,
    timeline: pageTimeline,
    events: pageEvents,
    event: pageEvent,
    nations: pageNations,
    nation: pageNation,
    formables: pageFormables,
    pool: pagePool,
  };

  function render() {
    if (!el) {
      el = document.createElement('div');
      el.id = 'wiki-modal';
      document.getElementById('ui-root').appendChild(el);
    }
    const top = stack[stack.length - 1] || { p: 'home', a: '' };
    let page;
    try { page = (PAGES[top.p] || pageHome)(top.a); } catch (e) { warnOnce('wiki:' + top.p, e); page = pageHome(); }
    el.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card peace-card ledger-card wiki-card">
        <div class="wiki-head">
          <button class="btn wiki-nav" data-ref="home" data-tt="The Compendium's front page" ${stack.length <= 1 ? 'disabled' : ''}>⌂</button>
          <button class="btn wiki-nav" data-ref="back" data-tt="Back" ${stack.length <= 1 ? 'disabled' : ''}>‹</button>
          <h2 class="peace-title wiki-title">${page.titleChip || ''}${esc(page.title)}</h2>
        </div>
        ${page.sub ? `<div class="wiki-sub">${esc(page.sub)}</div>` : ''}
        <div class="wiki-rule">${divider()}</div>
        <div class="wiki-body">${page.body}</div>
        <button class="btn peace-cancel">Close</button>
      </div>`;
    el.classList.remove('hidden');
    el.querySelector('.peace-cancel').addEventListener('click', close);
    el.querySelector('.modal-scrim').addEventListener('click', close);
    el.querySelector('[data-ref="back"]').addEventListener('click', () => {
      if (stack.length > 1) { stack.pop(); render(); }
    });
    el.querySelector('[data-ref="home"]').addEventListener('click', () => {
      stack = [{ p: 'home', a: '' }];
      render();
    });
    el.querySelectorAll('[data-go]').forEach((row) => {
      row.addEventListener('click', () => {
        const [p, a] = String(row.dataset.go).split(/:(.*)/s);
        stack.push({ p, a: a || '' });
        render();
      });
    });
    const body = el.querySelector('.wiki-body');
    if (body) body.scrollTop = 0;
  }

  function open(page, arg) {
    if (!stack.length || page) stack = [{ p: 'home', a: '' }];
    if (page && page !== 'home') stack.push({ p: page, a: arg || '' });
    render();
  }
  function close() { if (el) el.classList.add('hidden'); }
  function isOpen() { return !!el && !el.classList.contains('hidden'); }
  function toggle() { if (isOpen()) close(); else open(); }

  return { open, close, isOpen, toggle };
}
