// js/ui/nation_panel.js — the realm panel, opened by clicking the topbar flag.
// Ruler & skills, government, economy, military, diplomacy at a glance, the
// central levers (reserves, stability, loans) and the national decisions.
// The same panel also serves as the window into FOREIGN courts: open(tag)
// renders any nation read-only — their ruler, purse, armies, diplomacy, tech
// and reforms, plus how they feel about us — with every lever hidden.
import { esc, rgb, fmtMoney, fmtMen, fmtYear, signed, warnOnce, titleCase } from './format.js';
import { icon, flagChip } from './icons.js';
import { unlockedGen, cappedGen, genName, doctrinesFor, techLevelName } from '../data/tech.js';
import { forceLimitOf, regCount } from '../sim/military.js';
import { IDEA_TREES } from '../data/ideas.js';
import { eraIdeaGroupsFor } from '../data/era_ideas.js';

// The tabs (SPEC §175).
//
// This panel accumulated twenty top-level sections over sixty-odd SPEC entries
// — estates, institutions, the ages, the sacred offices, the powers beyond the
// map, doctrines, crises, technology, reforms — and every one of them was
// correct to add and made the panel worse. A player looking for the treasury
// scrolled past the High Priesthood to find it.
//
// A tab is a `data-tab` attribute on a section wrapper and one on the panel
// root; the CSS hides every section whose tab is not the active one
// (styles.css, `#nation-panel[data-tab=…]`). That is deliberately NOT the
// `.hidden` class the refresh already toggles per section, because the two
// must not fight: a section shows when the sim says it has something to say
// AND its tab is open, and neither has to know about the other.
//
// The panel is never re-templated. `refs` is harvested exactly once in build()
// and a tab switch only flips an attribute, so nothing goes stale and no click
// is ever detached mid-press (SPEC §132).
//
// `term` is the key in the chapter's `uiTerms` (SPEC §52) — 1948 says Cabinet
// where antiquity says Court, and Defence where this says Host.
//
// A tab that would be empty does not appear: `tabHasContent` asks the DOM,
// after the refresh has set every section's `hidden`, whether this tab has
// anything left to show. Most are anchored to a section that exists in every
// chapter (Decisions, Technology, Armies, Diplomacy) and so never vanish;
// Faith may, because the Temple does not stand in most of these centuries and
// a tab that is empty six times out of eight is worse than no tab at all, and
// Missions (SPEC §177) holds the mission tree and steps aside at a foreign
// court, after the verdict, and in a chapter whose tag has no chain.
//
// Ideas ride with the ladders, not with the crown (SPEC §186). The reform
// trees and the chapter's Ideas of the Age are bought with monarch points and
// unlocked by named technology rungs, so they sit under the Technology block
// on Coin in every bookmark — the EU4 window, where the ladders and what they
// sell are one screen. Crown keeps what it is: the realm's own facts.
const TABS = [
  { id: 'crown', label: 'Crown', term: 'tabCrown', tt: 'The realm itself: faith, tongue, capital, the throne’s standing at home, and what this chapter asks of you.' },
  { id: 'missions', label: 'Missions', term: 'tabMissions', tt: 'The mission tree: what history offers this realm, branch by branch, and what each accomplishment pays.' },
  { id: 'court', label: 'Court', term: 'tabCourt', tt: 'Who is at the table: the estates, the advisors, what is brewing, and the decisions in your gift.' },
  { id: 'coin', label: 'Coin', term: 'tabCoin', tt: 'The purse and the ledger: treasury, debt, the technologies silver buys — and the ideas those ladders sell.' },
  { id: 'war', label: 'Host', term: 'tabWar', tt: 'The army: manpower, regiments, exhaustion, and the character your wars have given the realm.' },
  { id: 'faith', label: 'Faith', term: 'tabFaith', tt: 'The Temple and its offices — the expectation, the High Priesthood, the pilgrim roads.' },
  { id: 'world', label: 'World', term: 'tabWorld', tt: 'Everyone else: your rank among the powers, what they think of you, your treaties, and the age the world is in.' },
];
const DEFAULT_TAB = 'crown';

export function createNationPanel(el, { DEFINES, onClose, onPeaceClick, onWarClick }) {
  let ctx = null;
  let actions = null;
  let viewTag = null; // null = the player's own realm; a tag = a foreign court
  // Which tab is open (SPEC §175). A closure variable and not DOM state,
  // because every lever in this panel calls refresh() the moment it fires and
  // anything derived from the DOM would be clobbered by the next rebuild.
  let tab = DEFAULT_TAB;
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
        <span class="np-home hidden" data-ref="homeChip"></span>
        <button class="pp-close" data-ref="close" data-tt="Close (Esc)">${icon('xmark')}</button>
      </div>
      <div class="np-foreign-note hidden" data-ref="foreignNote">A foreign court — what our envoys can see.</div>
      <div class="np-ruler">
        <div class="np-ruler-text">
          <div class="np-ruler-name" data-ref="rulerName"></div>
          <div class="np-ruler-title" data-ref="rulerTitle"></div>
        </div>
        <div class="np-pips" data-ref="rulerPips"></div>
      </div>
      <div class="np-heir" data-ref="heirRow"></div>
      <div class="np-vitals" data-ref="vitals"></div>
      <div class="np-acts" data-ref="acts">
        <button class="pp-build-btn" data-act="callReserves" data-ref="actReserves">${icon('spears')}<span>Call Reserves</span></button>
        <button class="pp-build-btn" data-act="buyStability" data-ref="actStability">${icon('scales')}<span>Restore Order</span></button>
        <button class="pp-build-btn" data-act="takeLoan" data-ref="actBorrow">${icon('borrow')}<span>Take Loan</span></button>
        <button class="pp-build-btn" data-act="repayLoan" data-ref="actRepay">${icon('repay')}<span>Repay Loan</span></button>
        <button class="pp-build-btn hidden" data-act="requestParthianAid" data-ref="actParthia" data-tt="Send envoys to the King of Kings: 50 influence points for a chance at silver, volunteers, and Parthian sympathy">${icon('dove')}<span>Envoys to Parthia</span></button>
      </div>
      <div class="np-tabs" data-ref="tabs" role="tablist"></div>

      <!-- ── THE CROWN ─────────────────────────────────────────────────── -->
      <div class="pp-grid" data-tab="crown">
        <div class="pp-row"><span class="pp-k">${icon('altar', 'icon-k')}Religion</span><span class="pp-v"><span class="dot" data-ref="religionDot"></span><span data-ref="religion"></span></span></div>
        <div class="pp-row"><span class="pp-k">${icon('amphora', 'icon-k')}Culture</span><span class="pp-v"><span class="dot" data-ref="cultureDot"></span><span data-ref="culture"></span></span></div>
        <div class="pp-row"><span class="pp-k">${icon('temple', 'icon-k')}Capital</span><span class="pp-v" data-ref="capital"></span></div>
        <div class="pp-row" data-ref="govRow"><span class="pp-k">${icon('scales', 'icon-k')}Government</span><span class="pp-v" data-ref="govType"></span></div>
        <div class="pp-row" data-ref="provRow" data-tt="Provinces owned · total development"><span class="pp-k">${icon('bricks', 'icon-k')}<span data-ref="realmLabel">Realm</span></span><span class="pp-v" data-ref="realm"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('scales', 'icon-k')}Stability</span><span class="pp-v" data-ref="stability"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('laurel', 'icon-k')}<span data-ref="legitimacyLabel">Legitimacy</span></span><span class="pp-v" data-ref="legitimacy"></span></div>
        <div class="pp-row hidden" data-ref="yearsRow"><span class="pp-k">${icon('grain', 'icon-k')}The years</span><span class="pp-v" data-ref="years"></span></div>
        <div class="pp-row hidden" data-ref="absorbRow"><span class="pp-k">${icon('alert', 'icon-k')}Direct rule</span><span class="pp-v neg" data-ref="absorb"></span></div>
      </div>
      <div class="pp-build hidden" data-ref="chapterBlock" data-tab="crown">
        <div class="pp-build-title" data-ref="chaptersTitle">The Chapters</div>
        <div class="np-chapter" data-ref="chapter"></div>
      </div>

      <!-- ── THE MISSIONS (SPEC §177) ──────────────────────────────────── -->
      <div class="pp-build" data-ref="missionsBlock" data-tab="missions">
        <div class="pp-build-title" data-ref="missionsTitle">Missions</div>
        <div class="np-mtree-host" data-ref="missions"></div>
      </div>

      <!-- ── THE COURT ─────────────────────────────────────────────────── -->
      <div class="pp-build hidden" data-ref="factionsBlock" data-tab="court">
        <div class="pp-build-title" data-ref="factionsTitle">Estates</div>
        <div class="np-factions" data-ref="factions"></div>
      </div>
      <div class="pp-build hidden" data-ref="foreignCourtBlock" data-tab="court">
        <div class="pp-build-title">Their Court</div>
        <div class="np-factions" data-ref="foreignCourt"></div>
      </div>
      <div class="pp-build" data-ref="courtBlock" data-tab="court">
        <div class="pp-build-title" data-ref="courtTitle">The Court</div>
        <div class="np-court" data-ref="court"></div>
      </div>
      <div class="pp-build hidden" data-ref="crisesBlock" data-tab="court">
        <div class="pp-build-title" data-ref="crisesTitle">What Is Brewing</div>
        <div class="np-factions" data-ref="crises"></div>
      </div>
      <div class="pp-build" data-ref="decisionsBlock" data-tab="court">
        <div class="pp-build-title">Decisions</div>
        <div class="np-decisions" data-ref="decisions"></div>
      </div>

      <!-- ── THE COIN ──────────────────────────────────────────────────── -->
      <div class="pp-grid" data-tab="coin">
        <div class="pp-row" data-ref="treasuryRow"><span class="pp-k">${icon('coins', 'icon-k')}Treasury</span><span class="pp-v" data-ref="treasury"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('borrow', 'icon-k')}Loans</span><span class="pp-v" data-ref="loans"></span></div>
      </div>
      <div class="pp-build hidden" data-ref="ledgerBlock" data-tab="coin">
        <div class="pp-build-title">The Ledger</div>
        <div class="np-ledger" data-ref="ledger"></div>
      </div>
      <div class="pp-build" data-tab="coin">
        <div class="pp-build-title">Technology</div>
        <div class="np-techs" data-ref="tech"></div>
      </div>
      <!-- The ideas sit UNDER the ladders that sell them (SPEC §186): the
           universal reform trees and the chapter's own Ideas of the Age, in
           every bookmark, on the same tab as the technology they unlock from. -->
      <div class="pp-build" data-tab="coin">
        <div class="pp-build-title">Ideas</div>
        <div class="np-reforms" data-ref="reforms"></div>
      </div>

      <!-- ── THE HOST ──────────────────────────────────────────────────── -->
      <div class="pp-grid" data-tab="war">
        <div class="pp-row"><span class="pp-k">${icon('spears', 'icon-k')}<span data-ref="manpowerLabel">Manpower</span></span><span class="pp-v" data-ref="manpower"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('shield', 'icon-k')}Armies</span><span class="pp-v" data-ref="armies"></span></div>
        <div class="pp-row"><span class="pp-k">${icon('flame', 'icon-k')}War exhaustion</span><span class="pp-v" data-ref="warExh"></span></div>
      </div>
      <div class="pp-build hidden" data-ref="doctrineBlock" data-tab="war">
        <div class="pp-build-title" data-ref="characterTitle">The Character of the Realm</div>
        <div class="np-doctrine" data-ref="doctrine"></div>
      </div>

      <!-- ── THE FAITH ─────────────────────────────────────────────────── -->
      <div class="pp-build hidden" data-ref="sacredBlock" data-tab="faith">
        <div class="pp-build-title">The Hope and the Office</div>
        <div class="np-factions" data-ref="sacred"></div>
      </div>

      <!-- ── THE WORLD ─────────────────────────────────────────────────── -->
      <div class="pp-grid" data-tab="world">
        <div class="pp-row hidden" data-ref="rankRow"><span class="pp-k">${icon('star8', 'icon-k')}Among the powers</span><span class="pp-v" data-ref="rank"></span></div>
        <div class="pp-row hidden" data-ref="ageRow"><span class="pp-k">${icon('scroll', 'icon-k')}The age</span><span class="pp-v" data-ref="age"></span></div>
        <div class="pp-row hidden" data-ref="infamyRow" data-tt="Conquest is remembered: courts abroad turn against you (opinion falls monthly), and at 30+ the fearful league into a defensive coalition. Decays one point a month.">
          <span class="pp-k">${icon('alert', 'icon-k')}Infamy</span><span class="pp-v neg" data-ref="infamy"></span></div>
        <div class="pp-row hidden" data-ref="eyeRow"><span class="pp-k">${icon('alert', 'icon-k')}They regard us as</span><span class="pp-v" data-ref="eye"></span></div>
        <div class="pp-row hidden" data-ref="opinionRow"><span class="pp-k">${icon('dove', 'icon-k')}Opinion of us</span><span class="pp-v" data-ref="opinion"></span></div>
        <div class="pp-row hidden" data-ref="standingRow"><span class="pp-k">${icon('scroll', 'icon-k')}Standing</span><span class="pp-v" data-ref="standing"></span></div>
      </div>
      <div class="pp-diplo" data-tab="world">
        <div class="pp-diplo-title">Diplomacy</div>
        <div data-ref="diploBody"></div>
      </div>
      <div class="pp-build hidden" data-ref="instBlock" data-tab="world">
        <div class="pp-build-title" data-ref="instTitle">The World's Way of Doing Things</div>
        <div class="np-factions" data-ref="institutions"></div>
      </div>`;
    el.querySelectorAll('[data-ref]').forEach((n) => { refs[n.dataset.ref] = n; });
    el.dataset.tab = tab;

    refs.close.addEventListener('click', () => { if (onClose) onClose(); else close(); });
    el.addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;
      // The tab strip is matched FIRST and returns immediately (SPEC §175).
      // The chain below falls through sixteen closest() probes and ends at the
      // war-overview handler, so a tab button that happened to sit inside a war
      // row's ancestry would open the war screen. It also deliberately does NOT
      // call refresh(): a tab switch changes no game state, and the sections it
      // reveals were rewritten by the last daily pass like every other section.
      const tb = e.target.closest('[data-tab-go]');
      if (tb) {
        const id = tb.dataset.tabGo;
        if (id && id !== tab) { tab = id; refreshTabs(); el.scrollTop = 0; }
        return;
      }
      const act = e.target.closest('[data-act]');
      if (act) {
        if (act.classList.contains('disabled') || !actions) return;
        const fn = actions[act.dataset.act];
        if (typeof fn === 'function') { try { fn(); } catch (err) { warnOnce('np-' + act.dataset.act, err); } }
        refresh();
        return;
      }
      const pri = e.target.closest('[data-priest]');
      if (pri) {
        if (pri.classList.contains('disabled') || !actions || typeof actions.seatHighPriest !== 'function') return;
        try { actions.seatHighPriest(pri.dataset.priest); } catch (err) { warnOnce('np-priest', err); }
        refresh();
        return;
      }
      const emb = e.target.closest('[data-embrace]');
      if (emb) {
        if (emb.classList.contains('disabled') || !actions || typeof actions.embraceInstitution !== 'function') return;
        try { actions.embraceInstitution(emb.dataset.embrace); } catch (err) { warnOnce('np-embrace', err); }
        refresh();
        return;
      }
      const intr = e.target.closest('[data-intrigue]');
      if (intr) {
        if (intr.classList.contains('disabled') || !actions || typeof actions.runIntrigue !== 'function') return;
        try { actions.runIntrigue(intr.dataset.court, intr.dataset.intrigue, intr.dataset.party || null); } catch (err) { warnOnce('np-intrigue', err); }
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
      const fac = e.target.closest('[data-appease]');
      if (fac) {
        if (!fac.classList.contains('disabled') && actions && typeof actions.appeaseFaction === 'function') {
          try { actions.appeaseFaction(fac.dataset.appease); } catch (err) { warnOnce('np-appease', err); }
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
      const eraIdea = e.target.closest('[data-eraidea]');
      if (eraIdea) {
        if (eraIdea.classList.contains('disabled') || !actions || typeof actions.buyEraIdea !== 'function') return;
        try { actions.buyEraIdea(eraIdea.dataset.eraidea); } catch (err) { warnOnce('np-eraidea', err); }
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
      // The working verbs on a foreign court's own panel (SPEC §180/§181):
      // envoys, gifts, and the weapons transfer agreement.
      const npDip = e.target.closest('[data-np-dip]');
      if (npDip && viewTag) {
        if (!npDip.classList.contains('disabled') && actions) {
          const fn = { improve: 'improveRelations', gift: 'sendGift', arms: 'signArmsDeal' }[npDip.dataset.npDip];
          try { if (fn && typeof actions[fn] === 'function') actions[fn](viewTag); }
          catch (err) { warnOnce('np-dip-' + npDip.dataset.npDip, err); }
        }
        refresh();
        return;
      }
      const pc = e.target.closest('[data-peace]');
      if (pc && onPeaceClick) { onPeaceClick(pc.dataset.peace); return; }
      const wr = e.target.closest('[data-war]');
      if (wr && onWarClick) onWarClick(wr.dataset.war);
    });
  }

  // open() shows the player's own realm; open('ROM') shows Rome's court
  // read-only. viewing() reports the foreign tag (null when it's our own).
  function open(tag) {
    if (!ctx) return;
    const g = ctx.game;
    viewTag = (tag && tag !== g.playerTag && g.tags && g.tags[tag]) ? tag : null;
    el.classList.remove('hidden');
    refresh();
    el.scrollTop = 0;
  }
  function close() { el.classList.add('hidden'); viewTag = null; }
  function isOpen() { return !el.classList.contains('hidden'); }
  function viewing() { return viewTag; }

  // Do not rebuild the panel out from under a finger (SPEC §132).
  //
  // `refresh()` runs on every simulated DAY — forty milliseconds apart at the
  // fastest speed — and several sections rewrite their own innerHTML. A click
  // is only delivered if mousedown and mouseup land on the same element, so a
  // rebuild between the two silently eats the click and the button appears to
  // need pressing two or three times. Hiring an advisor and buying a technology
  // were the worst of them because those sections rebuilt unconditionally.
  //
  // While a pointer is down inside the panel the refresh is deferred rather
  // than skipped: the day still ticks, the sim is untouched, and the moment the
  // button is released the panel catches up in one pass.
  let pointerHeld = false;
  let refreshMissed = false;
  let catchUp = 0;
  el.addEventListener('pointerdown', () => { pointerHeld = true; });
  const release = () => {
    if (!pointerHeld) return;
    pointerHeld = false;
    if (!refreshMissed || catchUp) return;
    // AFTER the click, not before it. `pointerup` is dispatched ahead of
    // `click`, so a rebuild done here would detach the very node the click is
    // about to be delivered to — the same bug moved one step later. The
    // timeout puts the catch-up behind the click in the queue; in practice
    // the click handler's own refresh usually gets there first and this one
    // finds nothing left to do.
    catchUp = setTimeout(() => {
      catchUp = 0;
      if (refreshMissed) refresh();
    }, 0);
  };
  // Bound to the window rather than the panel: a press that slides off the
  // button before release must still let the panel start updating again.
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  // Does this tab have anything to show right now? A section the sim has
  // hidden does not count, and neither does a grid whose every row is hidden —
  // which is the ordinary case for The World in a chapter with no standing
  // table and no institutions, where the container is present and renders
  // nothing. Without this a player would click a tab and get a blank panel.
  function tabHasContent(id) {
    const nodes = el.querySelectorAll('[data-tab="' + id + '"]');
    for (const n of nodes) {
      if (n.classList.contains('hidden')) continue;
      if (n.classList.contains('pp-grid')) {
        let any = false;
        for (const row of n.children) if (!row.classList.contains('hidden')) { any = true; break; }
        if (!any) continue;
      }
      return true;
    }
    return false;
  }

  // Rebuild the strip. Called from refresh() (the section gating moves as the
  // campaign does — the Temple falls, a chapter is won, a client is annexed)
  // and from the tab click itself, which is the one path that must not run a
  // full refresh.
  function refreshTabs() {
    const terms = (ctx && ctx.bookmark && ctx.bookmark.uiTerms) || {};
    const avail = TABS.filter((t) => tabHasContent(t.id));
    // The open tab can vanish under the player: Jerusalem falls and Faith goes
    // with it, or a flag chip swaps the panel to a foreign court, which hides
    // ten of the twenty sections. Fall back rather than show an empty panel.
    if (!avail.some((t) => t.id === tab)) tab = (avail[0] || { id: DEFAULT_TAB }).id;
    el.dataset.tab = tab;
    setHtml(refs.tabs, avail.map((t) =>
      `<button class="np-tab${t.id === tab ? ' active' : ''}" data-tab-go="${esc(t.id)}"`
      + ` role="tab" aria-selected="${t.id === tab}" data-tt="${esc(t.tt)}">`
      + `${esc(terms[t.term] || t.label)}</button>`).join(''));
    // One tab is not a choice — a foreign court with nothing but a Diplomacy
    // block should read as a plain panel, not as a tabbed one with no options.
    refs.tabs.classList.toggle('hidden', avail.length < 2);
  }

  function refresh() {
    if (!ctx || !isOpen()) return;
    if (pointerHeld) { refreshMissed = true; return; }
    refreshMissed = false;
    const g = ctx.game;
    if (viewTag && !(g.tags && g.tags[viewTag])) viewTag = null;
    const tag = viewTag || g.playerTag;
    const self = tag === g.playerTag;
    const t = g.tags && g.tags[tag];
    if (!t) { close(); return; }
    const TAGS = DEFINES.TAGS || {};
    // The era's reading of the court, not the tag's (SPEC §139) — the seat
    // shown under a chapter's own name has to be the seat that chapter's
    // court actually sits in.
    const def = (ctx.tagDef ? ctx.tagDef(tag) : TAGS[tag]) || {};
    const terms = (ctx.bookmark && ctx.bookmark.uiTerms) || {};
    setText(refs.realmLabel, terms.realm || 'Realm');
    setText(refs.legitimacyLabel, terms.legitimacy || 'Legitimacy');
    setText(refs.manpowerLabel, terms.manpower || 'Manpower');
    setText(refs.chaptersTitle, terms.chapters || 'The Chapters');
    setText(refs.characterTitle, terms.character || 'The Character of the Realm');
    setText(refs.missionsTitle, terms.missions || 'Missions');
    setText(refs.factionsTitle, terms.factions || 'Estates');
    setText(refs.courtTitle, terms.court || 'The Court');

    setHtml(refs.flag, flagChip(tag, DEFINES, 22, false, g));
    setText(refs.name, (t.name || tag) + (t.alive === false ? ' †' : ''));
    // Foreign dress: the note, and our own flag as the way home.
    refs.foreignNote.classList.toggle('hidden', self);
    refs.homeChip.classList.toggle('hidden', self);
    if (!self) setHtml(refs.homeChip, flagChip(g.playerTag, DEFINES, 18, true, g));

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
      if (t.govType === 'republic') {
        const months = Math.max(0, Math.round(t.electionIn || 0));
        setHtml(refs.heirRow, `Constitutional succession — the next election is in <b>${months} month${months === 1 ? '' : 's'}</b>.`);
      } else {
        setHtml(refs.heirRow, '<span class="np-lost">No designated heir</span> — a sudden death would shake the realm.');
      }
      refs.heirRow.classList.remove('hidden');
    }

    // Government block
    const rel = (DEFINES.RELIGIONS || {})[t.religion];
    setText(refs.religion, (rel && rel.name) || titleCase(t.religion));
    refs.religionDot.style.background = rgb(rel && rel.color);
    const cul = (DEFINES.CULTURES || {})[t.culture];
    setText(refs.culture, (cul && cul.name) || titleCase(t.culture));
    refs.cultureDot.style.background = rgb(cul && cul.color);
    // Government type (SPEC §25): the constitution, with elections counted down.
    const gov = (DEFINES.GOV_TYPES || {})[t.govType];
    if (gov) {
      const months = t.govType === 'republic' ? Math.max(0, Math.round(t.electionIn || 0)) : 0;
      setText(refs.govType, gov.name + (t.govType === 'republic' ? ` · vote in ${months}m` : ''));
      refs.govRow.dataset.tt = gov.desc || gov.name;
    } else {
      setText(refs.govType, titleCase(t.govType || 'monarchy'));
    }
    const capName = def.capital || '';
    if (capName) {
      const cap = ctx.prov ? ctx.prov(capName) : null;
      const held = cap && cap.controller === tag;
      setHtml(refs.capital, esc((cap && cap.name) || capName) + (held ? '' : ' <span class="np-lost">(lost)</span>'));
    } else {
      setText(refs.capital, '—');
    }
    let provs = 0, devSum = 0;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.owner !== tag) continue;
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
    // The measured movement, not the ledger's subtraction (SPEC §145).
    const ledger = (t.income || 0) - (t.expenses || 0);
    const net = Number.isFinite(t.netFlow) ? t.netFlow : ledger;
    setHtml(refs.treasury, `${fmtMoney(t.treasury)} <span class="${net < 0 ? 'neg' : 'pos'}">(${net >= 0 ? '+' : '−'}${Math.abs(net).toFixed(1)}/mo)</span>`);
    refs.treasuryRow.dataset.tt = `Income: +${(t.income || 0).toFixed(1)} / month\nExpenses: −${(t.expenses || 0).toFixed(1)} / month`
      + (Math.abs(net - ledger) > 0.05
        ? `\nOther flows: ${net - ledger >= 0 ? '+' : '−'}${Math.abs(net - ledger).toFixed(1)} / month`
          + `\n(court consumption, subsidies, reparations)` : '')
      + `\nThe treasury moves ${net >= 0 ? '+' : '−'}${Math.abs(net).toFixed(1)} a month`;
    setText(refs.loans, String(Math.max(0, Math.round(t.loans || 0))));
    setText(refs.manpower, fmtMen(t.manpower) + ' / ' + fmtMen(t.maxManpower));
    let armyN = 0, men = 0, regs = 0;
    for (const a of Object.values(g.armies || {})) {
      if (a && a.tag === tag) { armyN++; men += a.men || 0; regs += regCount(a); }
    }
    let fl = 0;
    try { fl = forceLimitOf(ctx, tag); } catch (e) { /* pre-balance saves */ }
    setText(refs.armies, armyN + ' (' + fmtMen(men) + ' men' + (fl ? `, ${regs}/${fl} regiments` : '') + ')');
    refs.armies.classList.toggle('neg', fl > 0 && regs > fl);
    if (fl) {
      refs.armies.parentElement.dataset.tt = `Force limit: the ${fl} regiments this realm's lands sustain.`
        + (regs > fl ? `\nAt ${regs} regiments the ${regs - fl} beyond the limit cost triple maintenance.` : '');
    }

    // Where this court sits among the powers (SPEC §165) — shown for whoever
    // is being viewed, since "am I winning" is a question you ask about them
    // as well as about yourself.
    {
      let st = null;
      if (actions && typeof actions.getStanding === 'function') {
        try { st = actions.getStanding(tag); } catch (e) { warnOnce('np-getStanding', e); }
      }
      refs.rankRow.classList.toggle('hidden', !st);
      if (st) {
        setHtml(refs.rank, `<span class="${st.isPower ? 'pos' : ''}">${st.rank} of ${st.of} · ${esc(st.tier)}</span>`);
        refs.rankRow.dataset.tt = 'Ranked by development, income, army, technology and the clients that answer to them.'
          + '\nThe top ' + st.seats + ' courts of this chapter are its powers; the rest are minors.'
          + '\nA court far below another hesitates longer before starting a war with it.';
      }
    }
    // The years, and whether the powers have noticed (SPEC §170).
    {
      let cl = null;
      let at = null;
      if (self && actions && typeof actions.getClimate === 'function') {
        try { cl = actions.getClimate(); } catch (e) { warnOnce('np-getClimate', e); }
      }
      if (self && actions && typeof actions.getAttention === 'function') {
        try { at = actions.getAttention(); } catch (e) { warnOnce('np-getAttention', e); }
      }
      refs.yearsRow.classList.toggle('hidden', !cl);
      if (cl) {
        const cls = cl.value >= 18 ? 'pos' : cl.value <= -18 ? 'neg' : '';
        setHtml(refs.years, `<span class="${cls}">${esc(cl.band)}</span>`);
        refs.yearsRow.dataset.tt = cl.text
          + '\nThe rains run in cycles of about a generation, and they bend the odds on harvests and droughts in both directions.'
          + '\nSame campaign, same years — this is a fact about the world, not about your luck.';
      }
      refs.eyeRow.classList.toggle('hidden', !at);
      if (at) {
        const cls = at.value >= 75 ? 'neg' : at.value >= 40 ? '' : 'pos';
        setHtml(refs.eye, `<span class="${cls}">${esc(at.band)}</span>`);
        refs.eyeRow.dataset.tt = 'What the great powers make of this realm, from what it has actually done.'
          + (at.onPowerLand ? '\nWe hold ' + at.onPowerLand + ' province' + (at.onPowerLand === 1 ? '' : 's') + ' that a power of this age used to own.' : '')
          + (at.threat > 0 ? '\nA foreign court will move against us on a margin ' + at.threat + '% thinner than it would otherwise want.' : '\nNobody is sizing an army against us for this.')
          + '\nIt cools while we are quiet.';
      }
    }

    // What kind of world it is (SPEC §168), and — if this court is somebody's
    // client — how long that is likely to last.
    {
      let age = null;
      let abs = null;
      if (actions && typeof actions.getAge === 'function') {
        try { age = actions.getAge(); } catch (e) { warnOnce('np-getAge', e); }
      }
      if (actions && typeof actions.getAbsorption === 'function') {
        try { abs = actions.getAbsorption(tag); } catch (e) { warnOnce('np-getAbsorption', e); }
      }
      refs.ageRow.classList.toggle('hidden', !age || !self);
      if (age && self) {
        setText(refs.age, age.name);
        refs.ageRow.dataset.tt = age.blurb
          + (age.turnsAt ? '\nIt turns to ' + (age.nextName || 'the next age') + ' in ' + (age.turnsAt < 0 ? (-age.turnsAt) + ' BCE' : age.turnsAt + ' CE') + '.' : '');
      }
      const showAbs = !!(abs && abs.rate > 0);
      refs.absorbRow.classList.toggle('hidden', !showAbs);
      if (showAbs) {
        setText(refs.absorb, abs.pressure + ' / ' + abs.of + (abs.monthsLeft !== null ? ' (' + abs.monthsLeft + ' mo)' : ''));
        refs.absorbRow.dataset.tt = 'In ' + abs.age.toLowerCase() + ', a client kingdom is a waiting room: '
          + esc(abs.overlordName) + ' is working toward ruling this land directly.'
          + '\nBeing large, being devoted, or fighting their war beside them slows it. Ceasing to be a client stops it.';
      }
    }

    // How the two courts stand with each other — foreign view only.
    refs.opinionRow.classList.toggle('hidden', self);
    refs.standingRow.classList.toggle('hidden', self);
    if (!self) {
      const me = g.playerTag;
      const meT = g.tags[me] || {};
      const theirs = Math.round((t.opinion && t.opinion[me]) || 0);
      const ours = Math.round((meT.opinion && meT.opinion[tag]) || 0);
      setHtml(refs.opinion, `<span class="${theirs > 0 ? 'pos' : theirs < 0 ? 'neg' : ''}">${signed(theirs)}</span>`);
      refs.opinionRow.dataset.tt = `How their court regards ours: ${signed(theirs)}\nHow we regard them: ${signed(ours)}`;
      let standing = 'No treaties bind us';
      let cls = '';
      if ((t.atWarWith || []).indexOf(me) >= 0) { standing = 'At war with us'; cls = 'neg'; }
      else if (t.overlord === me) { standing = 'Our client kingdom'; cls = 'pos'; }
      else if (meT.overlord === tag) { standing = 'Our overlord'; }
      else if ((t.allies || []).indexOf(me) >= 0) { standing = 'Allied with us'; cls = 'pos'; }
      else {
        const key = me < tag ? me + '|' + tag : tag + '|' + me;
        const tr = (g.truces || {})[key];
        if (tr && !(g.date.y > tr.y || (g.date.y === tr.y && g.date.m >= tr.m))) {
          const mn = (DEFINES.MONTH_NAMES || [])[tr.m - 1] || ('M' + tr.m);
          standing = `Truce until ${mn} ${fmtYear(tr.y)}`;
        }
      }
      setHtml(refs.standing, `<span class="${cls}">${esc(standing)}</span>`);
    }

    // The era's objectives moved out of the court panel (v5.8): the war
    // overview carries the contract where it is actually fought, and the
    // outliner keeps pinning the live pressure.

    // The levers of state belong to the player alone.
    refs.acts.classList.toggle('hidden', !self);
    refs.missionsBlock.classList.toggle('hidden', !self);
    refs.decisionsBlock.classList.toggle('hidden', !self);
    if (!self) refs.chapterBlock.classList.add('hidden');
    if (!self) refs.doctrineBlock.classList.add('hidden');
    if (self) {
      refreshActions(t, g);
      refreshChapter();
      refreshDoctrine();
      refreshMissions();
      refreshDecisions();
    }
    refreshCrises(self);
    refreshFactions(self);
    refreshInstitutions(self);
    refreshSacred(self);
    refreshForeignCourt(tag, self);
    refreshDiplomacy(g, t, tag, self);
    refreshTech(t, self);
    refreshLedger(self);
    refreshReforms(t, self);
    refreshCourt(t, self);

    // The four numbers you always want, pinned above the tabs (SPEC §175).
    // Tabs solve crowding by hiding things, which is only an improvement if
    // the handful a player checks every few seconds never moves: how big am I,
    // is the country calm, can I pay for this, and how many men are left.
    setHtml(refs.vitals,
      `<span class="np-vital" data-tt="Provinces owned · total development">`
      + `${icon('bricks', 'icon-sm')}${provs} · ${devSum}</span>`
      + `<span class="np-vital" data-tt="Stability">${icon('scales', 'icon-sm')}`
      + `<span class="${stab > 0 ? 'pos' : stab < 0 ? 'neg' : ''}">${signed(stab)}</span></span>`
      + `<span class="np-vital" data-tt="Treasury, and this month's net">`
      + `${icon('coins', 'icon-sm')}${esc(fmtMoney(t.treasury))}`
      + `<span class="${net < 0 ? 'neg' : 'pos'}">${net >= 0 ? '+' : '−'}${Math.abs(net).toFixed(1)}</span></span>`
      + `<span class="np-vital" data-tt="${esc((terms.manpower || 'Manpower') + ' in the pool')}">`
      + `${icon('spears', 'icon-sm')}${esc(fmtMen(t.manpower))}</span>`);

    // Last, because it reads the `hidden` state every section above just set.
    refreshTabs();
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

  // The sandbox chapters (SPEC §83): the generated second act after the
  // bookmark's verdict — three live objectives, their progress, the seal that
  // completing them earns. Hidden until a won campaign opens the system.
  function refreshChapter() {
    let ch = null;
    if (actions && typeof actions.getChapter === 'function') {
      try { ch = actions.getChapter(); } catch (e) { warnOnce('np-getChapter', e); }
    }
    const show = !!(ch && (ch.active || ch.seq > 0 || ch.nextIn > 0));
    refs.chapterBlock.classList.toggle('hidden', !show);
    if (!show) return;
    const terms = (ctx.bookmark && ctx.bookmark.uiTerms) || {};
    const chapter = terms.chapter || 'Chapter';
    const legacy = terms.chapter ? 'Legacy' : 'Seal';
    let html = '';
    if (ch.active) {
      const a = ch.active;
      html += `<div class="np-ch-head" data-tt="${esc(a.epigraph + '\nComplete all three objectives to seal the chapter.')}">`
        + `${icon('scroll', 'icon-row')} <b>${esc(chapter)} ${a.n} — ${esc(a.title)}</b></div>`;
      for (const o of a.objectives) {
        const held = o.needMonths > 1 ? ` · held ${o.holdMonths}/${o.needMonths} mo` : '';
        const prog = o.done ? 'done' : `${o.have}/${o.need}${held}`;
        const tt = o.desc + (o.done ? '\nAchieved.' : `\nProgress: ${prog}\nLapses in ${o.monthsLeft} months (a lapsed objective is replaced, never fatal).`);
        html += `<div class="np-mission np-m-${o.done ? 'done' : 'current'}" data-tt="${esc(tt)}">`
          + `<span class="np-m-mark">${o.done ? icon('laurel', 'icon-row') : icon('quill', 'icon-row')}</span>`
          + `<span class="np-m-name">${esc(o.name)}</span>`
          + `<span class="np-ch-prog">${esc(o.done ? '✓' : prog)}</span></div>`;
      }
      html += `<div class="np-ch-reward" data-tt="${esc(a.reward.desc)}">${legacy}: ${esc(a.reward.name)}</div>`;
    } else if (ch.nextIn > 0) {
      html += `<div class="np-dip-none">The next ${esc(chapter.toLowerCase())} opens in ${ch.nextIn} month${ch.nextIn === 1 ? '' : 's'}.</div>`;
    }
    if (ch.history && ch.history.length) {
      html += ch.history.map((h) => `<div class="np-ch-done">${icon('laurel', 'icon-row')} ${esc(chapter)} ${h.n} — ${esc(h.title)} · complete</div>`).join('');
    }
    setHtml(refs.chapter, html || '<div class="np-dip-none">No chapter yet.</div>');
  }

  // The mission tree (SPEC §177), drawn the way EU4 draws its own: a grid of
  // medallions, connectors falling from prerequisite to dependent, a check on
  // the accomplished, light on the workable, dusk on the locked. The sim
  // hands over finished layout (col/row/requires) for tree and ladder chains
  // alike, so one renderer draws both — a ladder is a tree one column wide.
  //
  // The connectors are an SVG stretched over the grid with its viewBox in
  // GRID UNITS (one cell = 1×1, preserveAspectRatio="none"), so a line lands
  // wherever its cells do without measuring a pixel; vector-effect keeps the
  // strokes from smearing under the non-uniform scale. Rows are fixed-height
  // (grid-auto-rows) for exactly this reason — fractional y must mean the
  // same thing in every row.
  function refreshMissions() {
    let list = [];
    if (actions && typeof actions.getMissions === 'function') {
      try { list = actions.getMissions() || []; } catch (e) { warnOnce('np-getMissions', e); }
    }
    refs.missionsBlock.classList.toggle('hidden', !list.length);
    if (!list.length) { setHtml(refs.missions, ''); return; }
    let cols = 1;
    let rows = 1;
    const byId = new Map();
    for (const m of list) {
      cols = Math.max(cols, (m.col | 0) + 1);
      rows = Math.max(rows, (m.row | 0) + 1);
      byId.set(m.id, m);
    }
    let lines = '';
    for (const m of list) {
      for (const rid of (m.requires || [])) {
        const p = byId.get(rid);
        if (!p) continue;
        const cls = m.status === 'done' ? 'np-ml-done' : m.status === 'current' ? 'np-ml-open' : 'np-ml-dim';
        lines += `<line class="${cls}" x1="${(p.col | 0) + 0.5}" y1="${(p.row | 0) + 0.62}"`
          + ` x2="${(m.col | 0) + 0.5}" y2="${(m.row | 0) + 0.1}"/>`;
      }
    }
    const svg = `<svg class="np-mt-lines" viewBox="0 0 ${cols} ${rows}" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>`;
    // The roads not taken (SPEC §183) are counted apart from the era's own
    // objectives: a hypothetical a campaign never reaches is not a failure,
    // so it must not sit in the denominator of "accomplished".
    const base = list.filter((m) => !m.hypothetical);
    const hypo = list.filter((m) => m.hypothetical);
    const doneN = base.filter((m) => m.status === 'done').length;
    const hypoDone = hypo.filter((m) => m.status === 'done').length;
    const cells = list.map((m) => {
      const state = m.status === 'done' ? 'Accomplished.'
        : m.status === 'current' ? 'The realm may work at this now.'
          : 'Locked — first: ' + (m.requiresNames && m.requiresNames.length
            ? m.requiresNames.join(', ') : 'the missions before it') + '.';
      const tt = m.name
        + (m.hypothetical ? '\nA road history never took — the cards exist if the realm can reach them.' : '')
        + '\n' + (m.desc || '')
        + (m.rewardText ? '\nReward: ' + m.rewardText : '')
        + '\n――――――\n' + state;
      const arrow = (m.requires || []).length ? '<i class="np-mn-arrow"></i>' : '';
      return `<div class="np-mn np-mn-${m.status}${m.hypothetical ? ' np-mn-hypo' : ''}" style="grid-column:${(m.col | 0) + 1};grid-row:${(m.row | 0) + 1}" data-tt="${esc(tt)}">`
        + arrow
        + `<span class="np-mn-medal">${icon(m.icon || 'scroll')}${m.status === 'done' ? '<i class="np-mn-tick">✓</i>' : ''}</span>`
        + `<span class="np-mn-name">${esc(m.name)}</span></div>`;
    }).join('');
    setHtml(refs.missions,
      `<div class="np-mt-sum">${doneN} of ${base.length} accomplished`
      + (hypo.length ? ` · <span class="np-mt-hypo-sum">${hypoDone} of ${hypo.length} roads history never took</span>` : '')
      + '</div>'
      + `<div class="np-mtree" style="--mt-cols:${cols}">${svg}${cells}</div>`);
  }

  // The doctrine axes (SPEC §85): four tensions of the age, each a slider
  // whose needle sits where the campaign's own decisions put it, with those
  // decisions listed in the tooltip. The realm's own character — a foreign
  // court's convictions are its business, like its estates.
  function refreshDoctrine() {
    let d = null;
    if (actions && typeof actions.getDoctrine === 'function') {
      try { d = actions.getDoctrine(); } catch (e) { warnOnce('np-getDoctrine', e); }
    }
    const show = !!(d && Array.isArray(d.axes) && d.axes.length);
    refs.doctrineBlock.classList.toggle('hidden', !show);
    if (!show) return;
    const max = d.max || 10;
    setHtml(refs.doctrine, d.axes.map((a) => {
      // The needle: 0 sits dead center, ±max at the ends.
      const pct = Math.round(50 + (a.score / max) * 50);
      const cls = a.band === 'mid' ? 'mid' : (a.score > 0 ? 'hi' : 'lo');
      const marks = a.marks.length
        ? a.marks.map((m) => '· ' + m.text).join('\n')
        : 'Nothing has yet pushed the realm either way.';
      const tt = a.question + '\n' + a.blurb + '\n――――――\n' + marks;
      return `<div class="np-dox" data-tt="${esc(tt)}">`
        + `<div class="np-dox-top"><span class="np-dox-name">${esc(a.name)}</span>`
        + `<span class="np-dox-label np-dox-${cls}">${esc(a.label)}</span></div>`
        + `<div class="np-dox-bar">`
        + `<span class="np-dox-pole">${esc(a.lo)}</span>`
        + `<span class="np-dox-track"><i class="np-dox-needle np-dox-n-${cls}" style="left:${pct}%"></i></span>`
        + `<span class="np-dox-pole">${esc(a.hi)}</span>`
        + `</div></div>`;
    }).join(''));
  }

  // Estates and court factions (SPEC §34, §81): five approval bands, the
  // graduated effect in force, and the appeasement lever. The player's own
  // politics — foreign courts keep theirs offstage.
  // What is brewing (SPEC §98): every crisis with heat on the clock, its stage,
  // and what that stage is doing to the realm. The bar is the heat; the line
  // under it is the bite.
  function refreshCrises(self) {
    let list = null;
    if (self && actions && typeof actions.getCrises === 'function') {
      try { list = actions.getCrises(); } catch (e) { warnOnce('np-getCrises', e); }
    }
    const show = Array.isArray(list) && list.length > 0;
    refs.crisesBlock.classList.toggle('hidden', !show);
    if (!show) return;
    setHtml(refs.crises, list.map((c) => {
      const cls = c.stage >= 3 ? 'neg' : c.stage >= 1 ? 'neg' : '';
      const bite = c.bite || '';
      const tt = c.stageName + (bite ? ' — ' + bite : ' — the cause is building; nothing has broken yet.')
        + (c.desc ? '\n' + c.desc : '')
        + '\nHeat ' + c.heat + '/100. It falls again on its own once the cause is fixed.';
      return `<div class="np-faction" data-tt="${esc(tt)}">`
        + `<div class="np-fac-top"><span class="np-fac-name">${esc(c.name)}</span>`
        + `<span class="np-fac-state ${cls}">${esc(c.stageName)} · ${c.heat}</span></div>`
        + `<div class="np-fac-bar"><div class="np-fac-fill np-fac-${c.stage >= 2 ? 'hostile' : 'discontent'}" style="width:${Math.max(2, Math.min(100, c.heat))}%"></div></div>`
        + `<div class="np-fac-effect ${cls}">${esc(bite || 'Brewing — no effect yet.')}</div>`
        + `</div>`;
    }).join(''));
  }

  function refreshFactions(self) {
    let list = null;
    if (self && actions && typeof actions.getFactions === 'function') {
      try { list = actions.getFactions(); } catch (e) { warnOnce('np-getFactions', e); }
    }
    const show = Array.isArray(list) && list.length > 0;
    refs.factionsBlock.classList.toggle('hidden', !show);
    if (!show) return;
    setHtml(refs.factions, list.map((f) => {
      const cls = (f.state === 'devoted' || f.state === 'loyal') ? 'pos'
        : (f.state === 'hostile' || f.state === 'discontent') ? 'neg' : '';
      const tt = f.desc
        + (f.boonText ? '\nLoyal (60–79): half benefit · Devoted (80+): ' + f.boonText : '')
        + (f.baneText ? '\nDiscontent (21–40): half penalty · Hostile (20−): ' + f.baneText : '')
        + '\n――――――\nCurrent: ' + (f.activeText || 'No estate effect.');
      const lever = f.appeaseLabel + ' — +' + (f.appeaseGain || 10) + ' approval';
      const btnTt = f.canAppease ? lever : (f.whyNot || '') + '\n' + lever;
      return `<div class="np-faction" data-tt="${esc(tt)}">`
        + `<div class="np-fac-top"><span class="np-fac-name">${esc(f.name)}</span>`
        + `<span class="np-fac-state ${cls}">${esc(f.state)} · ${f.approval}</span>`
        + `<button class="pp-build-btn np-fac-btn${f.canAppease ? '' : ' disabled'}" data-appease="${esc(f.id)}" data-tt="${esc(btnTt)}">${icon('laurel')}</button></div>`
        + `<div class="np-fac-bar"><div class="np-fac-fill np-fac-${f.state}" style="width:${Math.max(2, Math.min(100, f.approval))}%"></div></div>`
        + `<div class="np-fac-effect ${cls}">${esc(f.activeText || 'No estate effect.')}</div>`
        + `</div>`;
    }).join(''));
  }

  // The hope, the office and the ascents (SPEC §169). Player's own realm only,
  // and only in a chapter with a Temple standing in it.
  function refreshSacred(self) {
    let rep = null;
    if (self && actions && typeof actions.getSacred === 'function') {
      try { rep = actions.getSacred(); } catch (e) { warnOnce('np-getSacred', e); }
    }
    refs.sacredBlock.classList.toggle('hidden', !rep);
    if (!rep) return;
    const bandCls = rep.band === 'fevered' ? 'neg' : rep.band === 'quiet' ? '' : 'pos';
    const expTt = 'A country watching for a deliverer fields men it does not have — and cannot survive being wrong.'
      + (rep.boon ? '\nNow: ' + rep.boon : '')
      + (rep.bane ? '\nAnd: ' + rep.bane : '')
      + '\nIt cools if nothing arrives.';
    let html = `<div class="np-faction" data-tt="${esc(expTt)}">`
      + `<div class="np-fac-top"><span class="np-fac-name">The Expectation</span>`
      + `<span class="np-fac-state ${bandCls}">${esc(rep.band)} · ${rep.expectation}</span></div>`
      + `<div class="np-fac-bar"><div class="np-fac-fill np-fac-${rep.band === 'fevered' ? 'hostile' : rep.band === 'quiet' ? 'content' : 'loyal'}" style="width:${Math.max(2, Math.min(100, rep.expectation))}%"></div></div>`
      + (rep.bane ? `<div class="np-fac-effect neg">${esc(rep.bane)}</div>` : '')
      + `</div>`;
    const pr = rep.priesthood;
    if (pr) {
      const seatedTt = pr.seated
        ? 'The office is held by ' + pr.seated.name + ', of ' + (pr.candidates.find((c) => c.id === pr.seated.faction) || {}).name
          + ', since ' + (pr.seated.since < 0 ? (-pr.seated.since) + ' BCE' : pr.seated.since + ' CE')
          + '.\nWhile the office and the crown agree it pays legitimacy every month; while they do not, it costs it.'
        : 'The office stands empty, and the crown loses legitimacy every month it does.\nSeat it from one of the parties at court — they gain, and the ones who did not get it lose.';
      html += `<div class="np-faction" data-tt="${esc(seatedTt)}">`
        + `<div class="np-fac-top"><span class="np-fac-name">The High Priesthood</span>`
        + `<span class="np-fac-state ${pr.seated ? 'pos' : 'neg'}">${esc(pr.seated ? pr.seated.name : 'vacant')}</span></div>`
        // These buttons carry PARTY NAMES, not icons (SPEC §175). They wore
        // `np-fac-btn` — which is the 26px icon square the estates, institution
        // and intrigue buttons want — and `pp-build-btn` under it supplies
        // `white-space:nowrap; overflow:hidden` and centres its content, so
        // "The Priesthood" rendered as about three letters clipped at BOTH
        // ends. A text button is a different shape from an icon button and now
        // says so; the four genuine icon buttons are untouched.
        + `<div class="np-fac-effect np-seat-btns">`
        + pr.candidates.map((c) => `<button class="pp-build-btn np-seat-btn${c.isSeated ? ' disabled' : ''}" data-priest="${esc(c.id)}" data-tt="${esc('Anoint from ' + c.name + (c.isSeated ? ' — they already hold it' : ' — +10 to them, −5 to everyone else'))}"><span>${esc(c.name)}</span></button>`).join('')
        + `</div></div>`;
    }
    html += `<div class="np-faction" data-tt="${esc('Three festivals a year and the half-shekel from every community in the world. It very nearly stops while a war closes the roads, and an occupied shrine draws nobody.')}">`
      + `<div class="np-fac-top"><span class="np-fac-name">The Ascents</span>`
      + `<span class="np-fac-state ${rep.pilgrimage > 0 ? 'pos' : ''}">${rep.pilgrimage} a month</span></div>`
      + (rep.pilgrimageBlocked ? `<div class="np-fac-effect neg">The war has closed the roads — the festivals bring a quarter of what they would.</div>` : '')
      + `</div>`;
    setHtml(refs.sacred, html);
  }

  // The world's way of doing things (SPEC §166). Every institution alive in
  // this chapter, where it stands in this realm, and what refusing it costs.
  // Player's own realm only: what another court has taken up is its business.
  function refreshInstitutions(self) {
    let rep = null;
    if (self && actions && typeof actions.getInstitutions === 'function') {
      try { rep = actions.getInstitutions(); } catch (e) { warnOnce('np-getInstitutions', e); }
    }
    const rows = rep && Array.isArray(rep.rows) ? rep.rows.filter((r) => r && r.bornAt) : [];
    const show = rows.length > 0;
    refs.instBlock.classList.toggle('hidden', !show);
    if (!show) return;
    const head = rep.penaltyPct > 0
      ? `<div class="np-fac-effect neg">Behind the world in ${rep.behind} thing${rep.behind === 1 ? '' : 's'}: every level of every ladder costs +${rep.penaltyPct}%.</div>`
      : `<div class="np-fac-effect pos">We keep pace with the world. No surcharge on technology.</div>`;
    setHtml(refs.institutions, head + rows.map((r) => {
      const cost = [];
      if (r.cost && r.cost.gov) cost.push(r.cost.gov + ' gov');
      if (r.cost && r.cost.infl) cost.push(r.cost.infl + ' infl');
      if (r.cost && r.cost.mar) cost.push(r.cost.mar + ' mar');
      if (r.cost && r.cost.treasury) cost.push(r.cost.treasury + ' talents');
      const price = cost.join(' · ') || 'nothing';
      const tt = r.desc + '\n――――――\nArose at ' + r.bornAt
        + '. ' + r.share + '% of this realm knows it (' + r.need + '% needed to take it up).'
        + '\nTaking it up costs ' + price + ' and moves the estates.'
        + (r.can ? '' : '\n' + (r.whyNot || ''));
      const cls = r.embraced ? 'pos' : r.share >= r.need ? '' : 'neg';
      return `<div class="np-faction" data-tt="${esc(tt)}">`
        + `<div class="np-fac-top"><span class="np-fac-name">${esc(r.name)}</span>`
        + `<span class="np-fac-state ${cls}">${r.embraced ? 'ours' : r.share + '%'}</span>`
        + (r.embraced ? ''
          : `<button class="pp-build-btn np-fac-btn${r.can ? '' : ' disabled'}" data-embrace="${esc(r.id)}" data-tt="${esc((r.can ? 'Take it up — ' + price : (r.whyNot || '')))}">${icon('scales')}</button>`)
        + `</div>`
        + `<div class="np-fac-bar"><div class="np-fac-fill np-fac-${r.embraced ? 'devoted' : r.share >= r.need ? 'content' : 'discontent'}" style="width:${Math.max(2, Math.min(100, r.embraced ? 100 : r.share))}%"></div></div>`
        + `</div>`;
    }).join(''));
  }

  // Somebody else's politics (SPEC §163/§164): the parties at a foreign court,
  // how close it is to coming apart, and the three things our agents can do
  // about it. Foreign courts only — our own has its own block above.
  function refreshForeignCourt(who, self) {
    let court = null;
    let menu = null;
    if (!self && actions && typeof actions.getForeignCourt === 'function') {
      try { court = actions.getForeignCourt(who); } catch (e) { warnOnce('np-getForeignCourt', e); }
      try { menu = actions.getIntrigue(who); } catch (e) { warnOnce('np-getIntrigue', e); }
    }
    const show = !!(court && court.seats && court.seats.length);
    refs.foreignCourtBlock.classList.toggle('hidden', !show);
    if (!show) return;
    const near = court.nextAt
      ? `<div class="np-fac-effect">Discontent at their court: ${court.pressure}/${court.nextAt} toward ${esc(court.nextName)}.</div>`
      : `<div class="np-fac-effect neg">Their court has gone as far as it can go.</div>`;
    const quiet = court.quietFor > 0
      ? `<div class="np-fac-effect">Settled for now — nothing more for ${court.quietFor} months.</div>` : '';
    const bars = court.seats.map((f) => {
      const cls = (f.state === 'devoted' || f.state === 'loyal') ? 'pos'
        : (f.state === 'hostile' || f.state === 'discontent') ? 'neg' : '';
      const ops = (menu && menu.ops) || [];
      const pat = ops.find((o) => o.kind === 'patronize');
      const sub = ops.find((o) => o.kind === 'subvert');
      const btn = (op, glyph) => {
        if (!op) return '';
        const tt = op.name + ' — ' + op.infl + ' influence, ' + op.gold + ' talents'
          + (op.detect ? '\nRisk of discovery: ' + Math.round(op.detect * 100) + '%.' : '\nNobody minds a gift.')
          + (op.can ? '' : '\n' + (op.whyNot || ''));
        return `<button class="pp-build-btn np-fac-btn${op.can ? '' : ' disabled'}" data-intrigue="${esc(op.kind)}" data-party="${esc(f.id)}" data-court="${esc(who)}" data-tt="${esc(tt)}">${glyph}</button>`;
      };
      return `<div class="np-faction" data-tt="${esc(f.desc || f.name)}">`
        + `<div class="np-fac-top"><span class="np-fac-name">${esc(f.name)}</span>`
        + `<span class="np-fac-state ${cls}">${esc(f.state)} · ${f.approval}</span>`
        + btn(pat, icon('coins')) + btn(sub, icon('flame'))
        + `</div>`
        + `<div class="np-fac-bar"><div class="np-fac-fill np-fac-${f.state}" style="width:${Math.max(2, Math.min(100, f.approval))}%"></div></div>`
        + `</div>`;
    }).join('');
    const pre = menu && menu.ops ? menu.ops.find((o) => o.kind === 'pretender') : null;
    const preRow = pre
      ? `<div class="np-faction" data-tt="${esc(pre.name + ' — ' + pre.infl + ' influence, ' + pre.gold + ' talents. Risk of discovery: ' + Math.round(pre.detect * 100) + '%.' + (pre.can ? '' : '\n' + (pre.whyNot || '')))}">`
        + `<div class="np-fac-top"><span class="np-fac-name">Back a claimant</span>`
        + `<button class="pp-build-btn np-fac-btn${pre.can ? '' : ' disabled'}" data-intrigue="pretender" data-court="${esc(who)}" data-tt="${esc(pre.can ? 'Open the succession' : (pre.whyNot || ''))}">${icon('star8')}</button></div></div>`
      : '';
    setHtml(refs.foreignCourt, near + quiet + bars + preRow);
  }

  // Renders the viewed nation's treaties and wars. `who` is the viewed tag;
  // when it isn't the player (`self` false) the pronouns turn neutral and the
  // peace dove stays sheathed. Every chip is a link to that court.
  function refreshDiplomacy(g, t, who, self) {
    const TAGS = DEFINES.TAGS || {};
    const chip = (tag) => flagChip(tag, DEFINES, 15, true, g);
    const nameOf = (tag) => esc((g.tags[tag] && g.tags[tag].name) || (TAGS[tag] && TAGS[tag].name) || tag);
    let html = '';

    // The working verbs, on the panel itself (SPEC §180): an off-map seat has
    // no province to click, so the court a ledger chip opens must carry its
    // own envoys — and once it does, every foreign court gets the same row.
    if (!self && actions && typeof actions.getDiplomacy === 'function') {
      let d = null;
      try { d = actions.getDiplomacy(who); } catch (e) { d = null; }
      if (d) {
        const btn = (key, label, can, tt, on) =>
          `<button class="pp-dip${can ? '' : ' disabled'}${on ? ' pp-dip-on' : ''}" data-np-dip="${key}" data-tt="${esc(tt)}">${label}</button>`;
        let row = btn('improve', 'Improve Relations', d.canImprove,
          d.whyNotImprove || d.improveCost + ' influence points → their opinion of us +15.');
        row += btn('gift', 'Send Gift', d.canGift,
          d.whyNotGift || d.giftCost + ' talents → their opinion of us +20.');
        if (d.arms && (d.arms.offered || d.arms.isSupplier)) {
          const a = d.arms;
          if (a.isSupplier) {
            row += btn('', a.live ? '★ Our Arms Supplier' : '✂ The Pipeline Is Cut', false,
              a.live
                ? 'The weapons transfer agreement stands: their patterns — aircraft and armor — are ours to raise. It lives while their regard stays above ' + a.floor + ', and dies to war or embargo.'
                : (a.lapseWhy || 'The agreement is suspended.'), a.live);
          } else {
            row += btn('arms', 'Weapons Transfer Agreement', a.can,
              'Buy the right to raise their patterns — the aircraft and armor our own works cannot build.'
              + '\n――――――\nTheir regard for us: ' + a.theirRegard + ' (need ' + a.need + ') · signing fee ' + a.cost + ' talents.'
              + '\nOne supplier at a time'
              + (a.currentSupplierName ? ' — signing drops ' + a.currentSupplierName + ' (' + a.switchOpinion + ' with them).' : '.')
              + (a.whyNot ? '\n' + a.whyNot + '.' : ''));
          }
        }
        html += `<div class="np-dip-sec">Envoys</div><div class="pp-diplo-btns np-dip-verbs">${row}</div>`;
      }
    }

    const allies = (t.allies || []).filter((a) => g.tags[a] && g.tags[a].alive);
    html += `<div class="np-dip-sec">Allies</div>`;
    html += allies.length
      ? allies.map((a) => `<div class="np-dip-row">${chip(a)}<span class="np-dip-name">${nameOf(a)}</span></div>`).join('')
      : `<div class="np-dip-none">No sworn allies</div>`;

    // Client kingdoms and overlord (tribute flows along these rows).
    const clients = Object.keys(g.tags).filter((k) => g.tags[k] && g.tags[k].alive && g.tags[k].overlord === who);
    if (clients.length) {
      html += `<div class="np-dip-sec">Client kingdoms</div>`;
      for (const c of clients) {
        html += `<div class="np-dip-row" data-tt="A client kingdom: pays ${self ? 'us' : 'them'} 15% of its income and follows ${self ? 'us' : 'them'} to war">`
          + `${chip(c)}<span class="np-dip-name">${nameOf(c)}</span><span class="np-dip-ws">tributary</span></div>`;
      }
    }
    if (t.overlord && g.tags[t.overlord] && g.tags[t.overlord].alive) {
      html += `<div class="np-dip-sec">Overlord</div>`;
      html += `<div class="np-dip-row" data-tt="${self ? 'We are their client kingdom: 15% of our income flows to their court, and their wars are ours' : 'A client kingdom: 15% of its income flows to the overlord, whose wars it must join'}">`
        + `${chip(t.overlord)}<span class="np-dip-name">${nameOf(t.overlord)}</span><span class="np-dip-ws">${self ? 'we pay' : 'pays'} tribute</span></div>`;
    }

    // Guarantees & subsidies (SPEC §24)
    const ourGuarantees = (t.guarantees || []).filter((x) => g.tags[x] && g.tags[x].alive);
    const guaranteedBy = Object.keys(g.tags).filter((k) => k !== who
      && g.tags[k] && g.tags[k].alive && (g.tags[k].guarantees || []).indexOf(who) >= 0);
    if (ourGuarantees.length || guaranteedBy.length) {
      html += `<div class="np-dip-sec">Guarantees</div>`;
      for (const x of ourGuarantees) {
        html += `<div class="np-dip-row" data-tt="${self ? 'Our word protects them: their attacker fights us too' : 'Their word protects this nation: its attacker fights them too'}">`
          + `${chip(x)}<span class="np-dip-name">${nameOf(x)}</span><span class="np-dip-ws">${self ? 'our' : 'their'} word</span></div>`;
      }
      for (const x of guaranteedBy) {
        html += `<div class="np-dip-row" data-tt="${self ? 'Their word protects us: our attacker fights them too' : 'That court’s word protects this nation: an attacker fights them too'}">`
          + `${chip(x)}<span class="np-dip-name">${nameOf(x)}</span><span class="np-dip-ws pos">shields ${self ? 'us' : 'them'}</span></div>`;
      }
    }
    const flows = (g.subsidies || []).filter((s) => s && (s.from === who || s.to === who)
      && g.tags[s.from] && g.tags[s.to]);
    if (flows.length) {
      html += `<div class="np-dip-sec">Subsidies</div>`;
      for (const s of flows) {
        const out = s.from === who;
        const other = out ? s.to : s.from;
        html += `<div class="np-dip-row" data-tt="${s.reparation ? 'War reparations' : 'A subsidy'}: ${s.amount} talents a month, ${s.monthsLeft} months remaining">`
          + `${chip(other)}<span class="np-dip-name">${nameOf(other)}</span>`
          + `<span class="np-dip-ws ${out ? 'neg' : 'pos'}">${out ? '−' : '+'}${s.amount}/mo · ${s.monthsLeft}m</span></div>`;
      }
    }

    const wars = (g.wars || []).filter((w) => w
      && ((w.attackers || []).indexOf(who) >= 0 || (w.defenders || []).indexOf(who) >= 0));
    html += `<div class="np-dip-sec">Wars</div>`;
    if (wars.length) {
      for (const w of wars) {
        const ws = Math.round((w.warscore && w.warscore[who]) || 0);
        const opp = (w.attackers || []).indexOf(who) >= 0 ? (w.defenders || [])[0] : (w.attackers || [])[0];
        // The overview and the dove are the player's: shown only for wars we
        // fight in ourselves (getWarInfo answers from our side of the table).
        const mine = (w.attackers || []).indexOf(g.playerTag) >= 0 || (w.defenders || []).indexOf(g.playerTag) >= 0;
        const dove = self
          ? `<button class="ol-peace np-dove" data-peace="${esc(w.id)}" data-tt="Negotiate peace">${icon('dove')}</button>`
          : '';
        const warAttr = mine ? ` data-war="${esc(w.id)}"` : '';
        html += `<div class="np-dip-row${mine ? ' np-war' : ''}"${warAttr} data-tt="${esc(w.name || 'War')}\nWar score: ${signed(ws)}%${mine ? '\nClick for the war overview' : ''}">`
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
      if (parts.indexOf(who) < 0) continue;
      const other = parts[0] === who ? parts[1] : parts[0];
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
  // wage and a dismiss button; empty seats offer two candidates. A foreign
  // court shows who sits, and nothing more.
  function refreshCourt(t, self) {
    if (!refs.court) return;
    const label = { gov: 'Government', infl: 'Influence', mar: 'Martial' };
    if (!self) {
      const adv = t.advisors || {};
      const any = ['gov', 'infl', 'mar'].some((k) => adv[k]);
      refs.courtBlock.classList.toggle('hidden', !any);
      setHtml(refs.court, ['gov', 'infl', 'mar'].map((k) => {
        const a = adv[k];
        return `<div class="np-adv"><span class="np-adv-name">${esc(label[k])}: ${a ? `<b>${esc(a.name)}</b> (+${a.skill}/mo)` : '<i>empty seat</i>'}</span></div>`;
      }).join(''));
      return;
    }
    refs.courtBlock.classList.remove('hidden');
    let court = null;
    if (actions && typeof actions.getCourt === 'function') {
      try { court = actions.getCourt(); } catch (e) { warnOnce('np-getCourt', e); }
    }
    if (!court) { setHtml(refs.court, ''); return; }
    setHtml(refs.court, ['gov', 'infl', 'mar'].map((k) => {
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
    }).join(''));
  }

  // Technology (SPEC §22), worn like EU4's technology screen (SPEC §177):
  // the institutions surcharge as a banner across the top, then one card per
  // ladder — the level in a badge, what the ladder has already paid, a
  // progress bar filling toward the next level's price with the months to
  // affordability in its tooltip, the ahead-of-age markup in red — and under
  // the military card a milestone strip of the pattern generations with the
  // doctrine each one learns, struck through where the age itself ends.
  // Foreign courts show their levels and pattern, with no buy buttons.
  const TECH_ICONS = { gov: 'scales', infl: 'scroll', mar: 'swords' };
  function refreshTech(t, self) {
    if (!refs.tech) return;
    if (!self) {
      const th = t.tech || {};
      const names = { gov: 'Government', infl: 'Influence', mar: 'Military' };
      const rows = ['gov', 'infl', 'mar'].map((k) =>
        `<div class="np-reform"><div class="np-reform-head"><b>${names[k]}</b>`
        + `<span class="np-tech-rung">${esc(techLevelName(ctx && ctx.bookmark, k, th[k] | 0))}</span>`
        + `<span class="np-tech-lvl">${th[k] | 0}</span></div></div>`).join('');
      const gi = cappedGen(th.mar | 0, ctx && ctx.bookmark);
      const doct = doctrinesFor(gi).map((d) => `${d.name} — ${d.desc}`).join('\n');
      setHtml(refs.tech, rows
        + `<div class="np-tech-unit" data-tt="${esc('The pattern their armies are raised to.'
          + (doct ? '\nDoctrines:\n' + doct : ''))}">Armies muster as <b>${esc(genName(gi, 'inf'))}</b> &amp; <b>${esc(genName(gi, 'cav'))}</b></div>`);
      return;
    }
    let info = null;
    if (actions && typeof actions.getTech === 'function') {
      try { info = actions.getTech(); } catch (e) { warnOnce('np-getTech', e); }
    }
    if (!info) { setHtml(refs.tech, ''); return; }
    let html = '';
    if (info.instPct > 0) {
      html += `<div class="np-tech-pen" data-tt="${esc('Institutions the world has taken up and this realm has not (SPEC §166).'
        + '\nEvery level of every ladder costs +' + info.instPct + '% until they are embraced — see The World tab.')}">`
        + `${icon('alert', 'icon-row')}<span>Institutions penalty</span><b>+${info.instPct}%</b></div>`;
    }
    html += info.rows.map((r) => {
      const capped = !(r.cost > 0);
      const fill = capped ? 100 : Math.max(0, Math.min(100, Math.round(100 * r.have / Math.max(1, r.cost))));
      const head = `${r.desc}\nThis rung: ${r.levelName || 'Level ' + r.level}.`
        + (r.nextName ? `\nThe next: ${r.nextName}.` : '')
        + `\nAlready paying: ${r.nowText || '—'}\nThe age expects level ${r.eraBase}.`;
      const barTT = capped ? (r.whyNot || '')
        : `${r.have} of the ${r.cost} ${r.point} points banked`
          + (r.etaMonths > 0 ? ` — at +${r.gain} a month, affordable in ${r.etaMonths} month${r.etaMonths === 1 ? '' : 's'}.` : '.');
      const era = r.level < r.eraBase
        ? `<span class="np-tech-era np-te-behind" data-tt="${esc('The age expects level ' + r.eraBase + '; the realm is at ' + r.level + '.')}">age ${r.eraBase}</span>`
        : r.ahead
          ? `<span class="np-tech-era np-te-ahead" data-tt="${esc('Racing history: buying level ' + (r.level + 1) + ' before the age expects it costs +' + r.aheadPct + '%.')}">+${r.aheadPct}%</span>`
          : `<span class="np-tech-era" data-tt="${esc('Keeping pace: the age expects level ' + r.eraBase + '.')}">age ${r.eraBase}</span>`;
      return `<div class="np-techrow">
        <div class="np-tech-head" data-tt="${esc(head)}">${icon(TECH_ICONS[r.key] || 'scroll', 'icon-k')}<b>${esc(r.name)}</b>${era}<span class="np-tech-lvl">${r.level}</span></div>
        <div class="np-tech-rung" data-tt="${esc(head)}">${esc(r.levelName || '')}</div>
        <div class="np-tech-bar" data-tt="${esc(barTT)}"><i class="np-tech-fill${capped ? ' np-tf-cap' : ''}" style="width:${fill}%"></i><span class="np-tech-bar-num">${capped ? '—' : r.have + ' / ' + r.cost}</span></div>
        <button class="pp-build-btn np-reform-btn${r.canBuy ? '' : ' disabled'}" data-tech="${esc(r.key)}" data-tt="${esc(head + (r.whyNot ? '\n' + r.whyNot : ''))}">
          ${capped ? 'The ladder ends here' : `Advance to ${r.level + 1}${r.nextName ? ' — ' + esc(r.nextName) : ''}${r.ahead ? ' ⚠' : ''}`}${capped ? '' : ` <span class="np-reform-cost">${r.cost} ${esc(r.point)}</span>`}
        </button>
        ${r.key === 'mar' ? milestoneStrip(info) : ''}
      </div>`;
    }).join('');
    const u = info.unit;
    const selfGen = cappedGen((t.tech && t.tech.mar) | 0, ctx && ctx.bookmark);
    const selfDoct = doctrinesFor(selfGen).map((d) => `${d.name} — ${d.desc}`).join('\n');
    const unitLine = u ? `<div class="np-tech-unit" data-tt="${esc('The pattern our armies are raised to. '
      + (u.nextAt != null ? 'Military tech ' + u.nextAt + ' unlocks ' + u.nextInf + '.' : 'No newer pattern exists.')
      + (selfDoct ? '\nDoctrines:\n' + selfDoct : ''))}">`
      + `Armies muster as <b>${esc(u.inf)}</b> &amp; <b>${esc(u.cav)}</b></div>` : '';
    // The arms pipeline (SPEC §181): who feeds the arsenal, and how warmly.
    let armsLine = '';
    if (actions && typeof actions.getArmsStatus === 'function') {
      let ast = null;
      try { ast = actions.getArmsStatus(); } catch (e) { ast = null; }
      if (ast && !ast.arsenal) {
        armsLine = ast.supplier
          ? `<div class="np-tech-unit" data-tt="${esc((ast.live
            ? 'The weapons transfer agreement stands: their aircraft and armor are ours to raise. It lives while their regard stays above ' + ast.floor + '.'
            : 'The pipeline is cut: ' + (ast.why || 'the agreement is suspended') + '.')
            + '\nTheir regard for us: ' + ast.regard + '.')}">`
            + `Arms supplier: <b>${esc(ast.supplierName || ast.supplier)}</b>${ast.live ? '' : ' <span class="neg">✂ cut</span>'}</div>`
          : `<div class="np-tech-unit" data-tt="${esc('Aircraft and armor are imports, and nobody sells to us. Court an arsenal power — their regard opens the market — and sign a weapons transfer agreement at their court (open it from the ledger).')}">`
            + `Arms supplier: <span class="neg">none — the market is shut</span></div>`;
      }
    }
    setHtml(refs.tech, html + unitLine + armsLine);
  }

  // The military ladder's unlock milestones: each pattern generation as a
  // chip — lit when reached, plain while it waits, struck through where the
  // chapter's ceiling puts it beyond every century of this age.
  function milestoneStrip(info) {
    if (!Array.isArray(info.milestones) || !info.milestones.length) return '';
    return `<div class="np-tech-miles">` + info.milestones.map((ms) => {
      const cls = ms.reached ? ' np-ms-on' : ms.beyond ? ' np-ms-never' : '';
      const tt = `Military ${ms.at} — ${ms.inf} & ${ms.cav}`
        + (ms.doctrine ? `\nDoctrine: ${ms.doctrine} — ${ms.doctrineDesc}` : '')
        + (ms.beyond ? '\nBeyond this age: no century of this chapter reaches it.'
          : ms.reached ? '\nOurs.' : '');
      return `<span class="np-ms${cls}" data-tt="${esc(tt)}">${icon('helmet', 'icon-sm')}${ms.at}</span>`;
    }).join('') + `</div>`;
  }

  // The ledger (SPEC §177): the month's talents line by line, the way EU4's
  // economy screen owns up to where the money went. Player's realm only —
  // a foreign purse shows its totals up top and nothing more.
  function refreshLedger(self) {
    if (!refs.ledgerBlock) return;
    let rows = null;
    if (self && actions && typeof actions.explainIncome === 'function') {
      try { rows = actions.explainIncome(ctx.game.playerTag); } catch (e) { warnOnce('np-ledger', e); }
    }
    const show = Array.isArray(rows) && rows.length > 0;
    refs.ledgerBlock.classList.toggle('hidden', !show);
    if (!show) return;
    setHtml(refs.ledger, rows.map((r, i) => {
      const v = Number(r.value) || 0;
      return `<div class="np-led-row${i === rows.length - 1 ? ' np-led-total' : ''}">`
        + `<span class="np-led-k">${esc(r.label)}</span>`
        + `<span class="np-led-v ${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}">${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}</span></div>`;
    }).join(''));
  }

  // The ideas (SPEC §186), rendered under the Technology block on Coin in
  // every bookmark: three reform trees — tier pips, the next reform's name and
  // price, one buy button per tree — and then the chapter's Ideas of the Age,
  // which the ladders directly above them unlock. Renders nothing on sims
  // without getIdeas. Foreign courts show their pips read-only, straight from
  // t.reforms.
  function refreshReforms(t, self) {
    if (!refs.reforms) return;
    if (!self) {
      const owned = t.reforms || {};
      let html = Object.keys(IDEA_TREES).map((key) => {
        const tree = IDEA_TREES[key];
        const have = owned[key] | 0;
        const pips = tree.tiers.map((ti, i) =>
          `<span class="np-pip${i < have ? ' on' : ''}" data-tt="${esc(ti.name + ' — ' + ti.desc)}"></span>`).join('');
        return `<div class="np-reform"><div class="np-reform-head"><b>${esc(tree.name)}</b><span class="np-pips">${pips}</span></div></div>`;
      }).join('');
      // Their ideas of the age (SPEC §179), read straight off t.eraIdeas —
      // pips only, no lock cards: a foreign ladder is their business.
      const groups = eraIdeaGroupsFor(ctx && ctx.bookmark, t.tag, t);
      const taken = groups.filter((gd) => ((t.eraIdeas || {})[gd.key] | 0) > 0);
      if (taken.length) {
        html += `<div class="np-era-title">Ideas of the Age</div>` + taken.map((gd) => {
          const n = Math.max(0, Math.min(gd.tiers.length, (t.eraIdeas || {})[gd.key] | 0));
          const pips = gd.tiers.map((ti, i) =>
            `<span class="np-pip${i < n ? ' on' : ''}" data-tt="${esc(ti.name + ' — ' + ti.desc)}"></span>`).join('');
          return `<div class="np-reform"><div class="np-reform-head">${icon(gd.icon || 'lamp', 'icon-k')}<b>${esc(gd.name)}</b><span class="np-pips">${pips}</span></div></div>`;
        }).join('');
      }
      setHtml(refs.reforms, html);
      return;
    }
    let trees = null;
    if (actions && typeof actions.getIdeas === 'function') {
      try { trees = actions.getIdeas(); } catch (e) { warnOnce('np-getIdeas', e); }
    }
    if (!trees) { setHtml(refs.reforms, ''); return; }
    const ptName = { mar: 'martial', gov: 'government', infl: 'influence' };
    let html = trees.map((tr) => {
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
    // The ideas of the age (SPEC §179): the chapter's own groups, each behind
    // a named rung of its ladder. A locked group is the EU4 card — a dark
    // slab that says what opens it — and an open one sells its tiers like
    // any reform tree.
    let eras = null;
    if (actions && typeof actions.getEraIdeas === 'function') {
      try { eras = actions.getEraIdeas(); } catch (e) { warnOnce('np-getEraIdeas', e); }
    }
    if (Array.isArray(eras) && eras.length) {
      html += `<div class="np-era-title" data-tt="${esc('The ideas of this age (SPEC §179): four arts the chapter itself argued about, '
        + 'each unlocked by a rung of the matching technology ladder and bought tier by tier with its point.')}">Ideas of the Age</div>`;
      html += eras.map((er) => {
        if (!er.unlocked) {
          return `<div class="np-reform np-era-locked" data-tt="${esc(er.name + ' — ' + er.desc + '\n' + er.unlockDetail)}">
            <div class="np-era-lock-name">${icon(er.icon || 'lamp', 'icon-k')}${esc(er.name)}</div>
            <div class="np-era-lock-at">${esc(er.unlockText)}</div>
          </div>`;
        }
        const pips = er.tiers.map((ti) =>
          `<span class="np-pip${ti.owned ? ' on' : ''}" data-tt="${esc(ti.name + ' — ' + ti.desc)}"></span>`).join('');
        const next = er.tiers[er.owned];
        const tt = next
          ? `${er.desc}\n${next.name} — ${next.desc}\nCosts ${er.cost} ${ptName[er.point] || er.point} points.${er.canBuy ? '' : '\n' + er.whyNot}`
          : `${er.desc}\n${er.whyNot}`;
        return `
        <div class="np-reform">
          <div class="np-reform-head">${icon(er.icon || 'lamp', 'icon-k')}<b>${esc(er.name)}</b><span class="np-pips">${pips}</span></div>
          <button class="pp-build-btn np-reform-btn${er.canBuy ? '' : ' disabled'}" data-eraidea="${esc(er.key)}" data-tt="${esc(tt)}">
            ${next ? `${esc(next.name)} <span class="np-reform-cost">${er.cost} ${esc(er.point)}</span>` : 'Complete'}
          </button>
        </div>`;
      }).join('');
    }
    setHtml(refs.reforms, html);
  }

  function refreshDecisions() {
    let list = [];
    if (actions && typeof actions.getDecisions === 'function') {
      try { list = actions.getDecisions() || []; } catch (e) { warnOnce('np-getDecisions', e); }
    }
    setHtml(refs.decisions, list.map((d) => {
      const terms = `${d.name} — ${d.costText}\n${d.desc}`
        + (d.cooldownMonths ? `\nCan be repeated every ${d.cooldownMonths} months.` : '');
      const tt = d.canEnact ? terms : `${d.whyNot}\n――――――\n${terms}`;
      return `<button class="pp-build-btn np-dec${d.canEnact ? '' : ' disabled'}" data-decision="${esc(d.key)}" data-tt="${esc(tt)}">`
        + `${icon(d.icon || 'scroll')}<span>${esc(d.name)}</span><span class="np-dec-cost">${esc(d.costText)}</span></button>`;
    }).join('') || '<div class="np-dip-none">No decisions available</div>');
  }

  return { bind, open, close, refresh, isOpen, viewing };
}
