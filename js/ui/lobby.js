// js/ui/lobby.js — multiplayer lobby (SPEC §18, §93, §216). The host runs the
// world; everyone who joins takes a Jewish throne of their own out of the
// chapter's own list of standards — the same table with the brothers on
// opposite sides of it — or, seated beside the host, rules the host's nation
// at their side: one realm, many hands on the tiller. A chapter with one
// standard can only do the second.
//
// Joining used to mean copying a three-kilobyte offer blob into a chat window
// and copying an equally long reply back. Now the host mints a six-character
// invite code (`KFR-2M9`): the offer is parked in a cloud room, the guest
// fetches it by code and posts its answer to the same room, and the host picks
// that up on its own. One code, one direction, no reply to send back.
//
// With no cloud configured (see server/README.md) the lobby renders the
// original hand-carried flow instead — the game is still a static site and
// still plays peer-to-peer with nothing behind it.
import { esc, warnOnce } from './format.js';
import { icon, flagChip } from './icons.js';
import { createPeer } from '../net/rtc.js';
import { chapterChairs, resolveSeat, defaultSeat, SHARED } from '../net/mp_state.js';
import {
  isRoomCloudOn, roomEndpoint, roomCreate, roomFetch, roomAnswer, prettyRoom, normalizeRoom,
} from '../net/cloud.js';

const MAX_GUESTS = 3;
// Bumped whenever the multiplayer protocol or lobby flow changes. A host and a
// guest on different builds (one tab loaded before a deploy) otherwise glitch
// silently — with this they get told to reload instead.
const MP_PROTO = 3;
const BUILD = 'v1.10.0';
const POLL_MS = 1500;       // how often the host asks the room for an answer
const POLL_GIVE_UP_MS = 900000; // the room's own lifetime; stop asking after it

export function createLobby({ DEFINES, bookmarks, onHostStart, onGuestStart, saveTools }) {
  const TAGS = (DEFINES && DEFINES.TAGS) || {};
  let el = null;
  // host state
  let hostPeers = [];        // [{id, peer, seat, tag, open}] — `seat` is the pick,
                             // `tag` the chair it resolves to at Begin
  let guestSeq = 0;          // stable ids, so a re-render keeps each pick where it is
  let pendingPeer = null;    // invite created, waiting for the guest
  let hostBookmark = 0;
  let hostTag = '';
  // A campaign in progress can be opened to friends: pick it off the shelf and
  // the world the guests receive is the saved one, mid-war and all. The save
  // dictates both the chapter and the throne, so those selects step aside.
  let hostMode = 'new';      // 'new' | 'save'
  let hostSaveRows = null;   // cached shelf listing for the picker
  let hostSaveId = '';
  let hostSave = null;       // resolved {game, entry}
  let hostSaveError = '';
  let inviteCode = '';       // short room code, cloud flow
  let manualCode = '';       // long JU1. blob, hand-carried flow
  let pollTimer = null;
  let pollStartedAt = 0;
  // A cloud that is configured but unreachable falls back for the rest of the
  // session rather than failing an invite at a time.
  let manualMode = !isRoomCloudOn();
  // guest state
  let guestPeer = null;
  let guestLobby = null;     // last {t:'lobby'} payload from the host
  let started = false;

  function ensureEl() {
    if (el) return el;
    el = document.createElement('div');
    el.id = 'mp-lobby';
    el.classList.add('hidden');
    document.body.appendChild(el);
    return el;
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function close() {
    if (el) el.classList.add('hidden');
    stopPolling();
    if (started) return; // peers now belong to the running game
    for (const g of hostPeers) { try { g.peer.close(); } catch (e) { /* down */ } }
    hostPeers = [];
    if (pendingPeer) { try { pendingPeer.close(); } catch (e) { /* down */ } pendingPeer = null; }
    if (guestPeer) { try { guestPeer.close(); } catch (e) { /* down */ } guestPeer = null; }
    guestLobby = null;
    inviteCode = '';
    manualCode = '';
  }

  function shellHtml(inner) {
    return `
      <div class="modal-scrim"></div>
      <div class="ev-card peace-card mp-card">
        <h2 class="peace-title">${icon('spears', 'icon-sm')} Multiplayer</h2>
        ${inner}
        <div class="mp-build">build ${esc(BUILD)} — all players should be on the same build (reload the page to update)</div>
      </div>`;
  }

  function copyBtn(refName) {
    return `<button class="btn mp-copy" data-copy="${refName}">Copy</button>`;
  }

  function copyText(text, btn) {
    let ok = false;
    const scratch = document.createElement('textarea');
    scratch.value = text;
    scratch.setAttribute('readonly', '');
    scratch.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(scratch);
    scratch.select();
    try { ok = document.execCommand('copy'); } catch (e) { /* clipboard API next */ }
    document.body.removeChild(scratch);
    if (!ok && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    if (btn) {
      btn.textContent = 'Copied ✓';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1400);
    }
  }

  function wireCommon() {
    el.querySelector('.modal-scrim').addEventListener('click', close);
    const back = el.querySelector('[data-ref="close"]');
    if (back) back.addEventListener('click', close);
    el.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
      const src = el.querySelector(`[data-ref="${b.dataset.copy}"]`);
      if (!src) return;
      copyText('value' in src ? src.value : src.textContent, b);
    }));
  }

  // ------------------------------------------------------------------ menu --
  function renderMenu() {
    ensureEl().innerHTML = shellHtml(`
      <div class="peace-body">Play with friends over a direct browser-to-browser link —
        no accounts, no servers running the world. One of you hosts and runs it; everyone
        who joins rules the host's nation at their side: one realm, many hands on the tiller.</div>
      <button class="btn peace-opt" data-ref="host"><b>Host a campaign</b>
        <span class="peace-hint">Pick the chapter and your nation, ${manualMode ? 'mint invite codes' : 'share a six-letter invite code'}, begin when your friends are in.</span></button>
      <button class="btn peace-opt" data-ref="join"><b>Join a campaign</b>
        <span class="peace-hint">${manualMode ? "Paste the host's invite code and send back your reply code." : "Type the host's invite code. That is the whole handshake."}</span></button>
      <button class="btn peace-cancel" data-ref="close">Close</button>`);
    el.classList.remove('hidden');
    wireCommon();
    el.querySelector('[data-ref="host"]').addEventListener('click', renderHost);
    el.querySelector('[data-ref="join"]').addEventListener('click', renderJoin);
  }

  // ------------------------------------------------------------------ host --
  // Continuing a save? The save is the campaign — its chapter, its throne, its
  // date. Otherwise the two selects decide.
  const hostEntry = () => (hostSave ? hostSave.entry : bookmarks[hostBookmark]);
  const usingSave = () => hostMode === 'save' && !!hostSave;
  // The thrones this campaign can seat. A save can only seat the ones its
  // world still has standing (SPEC §216).
  const chairs = () => chapterChairs(hostEntry().bookmark, usingSave() ? hostSave.game.tags : null);
  // What a guest's pick resolves to. An empty pick — the default — is the
  // host's own throne, which is the co-op table exactly as it was.
  const seatOf = (guest) => resolveSeat(guest && guest.seat, hostTag, chairs());
  // A realm's name: the living one when a save is open (a crown may have been
  // renamed or proclaimed since), the era's otherwise.
  function chairName(tag) {
    const live = usingSave() && hostSave.game.tags && hostSave.game.tags[tag];
    return (live && live.name) || (TAGS[tag] && TAGS[tag].name) || tag;
  }
  const sharedChair = () => hostPeers.every((g) => seatOf(g) === hostTag);
  // The campaign changed under the seating — a different chapter, a different
  // throne for the host, a save whose world has fewer standards left. A guest
  // who asked to sit beside the host stays there; anybody else takes a fresh
  // throne rather than being silently folded into the host's (SPEC §216).
  function reseatGuests() {
    const seats = chairs();
    for (const guest of hostPeers) {
      if (guest.seat === SHARED) continue;
      if (guest.seat !== hostTag && seats.indexOf(guest.seat) >= 0) continue;
      guest.seat = defaultSeat(hostTag, seats,
        hostPeers.filter((o) => o !== guest).map((o) => seatOf(o)));
    }
  }

  // One payload per guest: the roster is the same for everybody, but which
  // chair is YOURS is not.
  function hostLobbyPayload(guest) {
    const b = hostEntry().bookmark;
    const mine = guest ? seatOf(guest) : hostTag;
    return {
      t: 'lobby',
      v: MP_PROTO,
      bookmarkId: b.id,
      bookmarkName: b.name,
      // A campaign in progress is not at its chapter's start date, and the
      // realm may have been renamed since — say where the guests are landing.
      resumed: usingSave() ? (hostSave.meta && hostSave.meta.dateLabel) || '' : '',
      tag: mine,
      nationName: chairName(mine),
      shared: mine === hostTag, // beside the host, or a throne of your own
      hostTag,
      hostName: chairName(hostTag),
      players: [{ who: 'Host', tag: hostTag, name: chairName(hostTag) }]
        .concat(hostPeers.map((g, i) => {
          const tag = seatOf(g);
          return { who: 'Guest ' + (i + 1), tag, name: chairName(tag), you: g === guest };
        })),
    };
  }
  function hostBroadcastLobby() {
    for (const g of hostPeers) g.peer.send(hostLobbyPayload(g));
  }

  // The invite block is the one part of the host screen that differs between
  // the cloud flow and the hand-carried one.
  function inviteHtml(canInvite) {
    if (manualMode) {
      return `
        ${canInvite ? '<button class="btn" data-ref="invite">Create an invite code</button>' : ''}
        ${pendingPeer ? `
          <div class="mp-hint">Send this code to your friend, then paste their reply below.</div>
          <textarea class="mp-code" data-ref="invcode" readonly></textarea>
          ${copyBtn('invcode')}
          <textarea class="mp-code" data-ref="reply" placeholder="Paste their reply code here"></textarea>
          <button class="btn" data-ref="accept">Accept reply</button>` : ''}`;
    }
    return `
      ${canInvite ? '<button class="btn" data-ref="invite">Create an invite code</button>' : ''}
      ${pendingPeer && inviteCode ? `
        <div class="mp-hint">Give your friend this code. They type it in and they are in —
          there is nothing to send back.</div>
        <div class="mp-roomcode" data-ref="room">${esc(prettyRoom(inviteCode))}</div>
        <div class="mp-codebtns">
          ${copyBtn('room')}
          <button class="btn mp-copy" data-ref="copylink">Copy a link instead</button>
        </div>
        <div class="mp-hint mp-waiting">Waiting for them to join…</div>` : ''}
      ${pendingPeer && !inviteCode ? '<div class="mp-hint">Minting the code…</div>' : ''}
      ${canInvite ? '<button class="mp-adv" data-ref="manual">The cloud is down, or we are on the same LAN — use hand-carried codes</button>' : ''}`;
  }

  // The chapter/nation pair, or the chosen save standing in for both.
  function campaignHtml() {
    if (hostMode !== 'save') {
      const playable = (bookmarks[hostBookmark].bookmark.playableTags || []).map((p) => p.tag);
      const bmOpts = bookmarks.map((e, i) =>
        `<option value="${i}"${i === hostBookmark ? ' selected' : ''}>${esc(e.bookmark.name)}</option>`).join('');
      const tagOpts = playable.map((t) =>
        `<option value="${esc(t)}"${t === hostTag ? ' selected' : ''}>${esc((TAGS[t] && TAGS[t].name) || t)}</option>`).join('');
      return `
        <div class="mp-row"><label>Chapter</label><select data-ref="bm">${bmOpts}</select></div>
        <div class="mp-row"><label>Your nation</label><select data-ref="tag">${tagOpts}</select></div>
        <div class="mp-hint">${playable.length > 1
    ? 'Everyone who joins takes another of this chapter\'s standards — seat them beside you below to share this one instead.'
    : 'Everyone who joins rules this nation with you — this chapter has one standard.'}</div>`;
    }
    if (hostSaveRows === null) return '<div class="mp-hint">Reading the shelf…</div>';
    if (!hostSaveRows.length) {
      return `<div class="mp-hint">There are no saved campaigns yet. Play one and save it —
        the quill in the topbar — and it will be here to open up to your friends.</div>`;
    }
    const opts = hostSaveRows.map((s) => `<option value="${esc(s.id)}"${s.id === hostSaveId ? ' selected' : ''}>`
      + `${esc(s.nationName || s.tag)} — ${esc(s.dateLabel)} · ${esc(s.chapterName)}</option>`).join('');
    return `
      <div class="mp-row"><label>The save</label><select data-ref="save">${opts}</select></div>
      ${hostSaveError ? `<div class="mp-status">${esc(hostSaveError)}</div>` : ''}
      ${hostSave ? `<div class="mp-hint">Your friends join this campaign exactly where it stands —
        ${esc((hostSave.meta && hostSave.meta.dateLabel) || '')} — beside you, or on another of the
        chapter's thrones as that world left it.</div>`
      : '<div class="mp-hint">Opening the save…</div>'}`;
  }

  // The Players block. Each guest gets a seat picker: beside the host, or any
  // other standard the chapter offers (SPEC §216). One throne in the chapter
  // means no picker at all — there is nothing to choose between.
  function playersHtml(seats) {
    const rows = [`
      <div class="mp-player">${flagChip(hostTag, DEFINES, 16)}
        <b>Host</b> — ${esc(chairName(hostTag))}</div>`];
    hostPeers.forEach((g, i) => {
      const seat = seatOf(g);
      const picker = seats.length > 1 ? `
        <select class="mp-seat" data-seat="${g.id}">
          <option value="${SHARED}"${seat === hostTag ? ' selected' : ''}>Beside you — ${esc(chairName(hostTag))}</option>
          ${seats.filter((t) => t !== hostTag).map((t) =>
    `<option value="${esc(t)}"${t === seat ? ' selected' : ''}>${esc(chairName(t))}</option>`).join('')}
        </select>` : '';
      rows.push(`
        <div class="mp-player">${flagChip(seat, DEFINES, 16)}
          <b>Guest ${i + 1}</b> — ${picker || esc(chairName(seat))}</div>`);
    });
    return rows.join('');
  }

  function renderHost() {
    if (hostMode === 'save' && hostSaveRows === null) loadShelf();
    if (hostMode !== 'save') {
      const playable = (bookmarks[hostBookmark].bookmark.playableTags || []).map((p) => p.tag);
      if (!playable.includes(hostTag)) hostTag = playable[0] || '';
    }
    const seats = chairs();
    const canInvite = hostPeers.length < MAX_GUESTS && !pendingPeer;
    ensureEl().innerHTML = shellHtml(`
      <div class="peace-sec">The campaign</div>
      ${saveTools ? `<div class="mp-modes">
        <button class="mp-mode${hostMode === 'new' ? ' on' : ''}" data-hostmode="new">Start a new one</button>
        <button class="mp-mode${hostMode === 'save' ? ' on' : ''}" data-hostmode="save">Continue a save</button>
      </div>` : ''}
      ${campaignHtml()}
      <div class="peace-sec">Players</div>
      ${playersHtml(seats)}
      ${hostPeers.length && seats.length > 1 ? `<div class="mp-hint">${sharedChair()
    ? 'One realm, many hands on the tiller. Give a guest another standard and they rule it themselves — allies, or rivals, as the chapter has it.'
    : 'Separate thrones: each of you rules your own realm, and the chapter decides whether that makes you allies.'}</div>` : ''}
      <div class="peace-sec">Invite</div>
      ${inviteHtml(canInvite)}
      <div class="mp-status" data-ref="status"></div>
      <button class="btn peace-send" data-ref="begin"${hostPeers.some((g) => g.open) && !(hostMode === 'save' && !hostSave) ? '' : ' disabled'}>
        ${icon('spears', 'icon-sm')} Begin the campaign</button>
      <button class="btn peace-cancel" data-ref="close">Cancel</button>`);
    el.classList.remove('hidden');
    wireCommon();
    // A re-render (a guest connecting, the chapter changing) must not lose the
    // code already on screen.
    const manualTa = el.querySelector('[data-ref="invcode"]');
    if (manualTa && manualCode) manualTa.value = manualCode;

    const status = (s) => { const d = el.querySelector('[data-ref="status"]'); if (d) d.textContent = s; };
    el.querySelectorAll('[data-hostmode]').forEach((b) => b.addEventListener('click', () => {
      const next = b.dataset.hostmode;
      if (next === hostMode) return;
      hostMode = next;
      // Leaving the save behind restores the picked chapter's own throne.
      if (hostMode === 'new') { hostSave = null; hostSaveError = ''; }
      renderHost();
      hostBroadcastLobby();
    }));
    const bmSel = el.querySelector('[data-ref="bm"]');
    if (bmSel) {
      bmSel.addEventListener('change', (e) => {
        hostBookmark = Number(e.target.value) || 0;
        // Render first: it is the pass that moves the throne onto the new
        // chapter's list, and a payload sent before it would name the old one.
        renderHost();
        reseatGuests();
        renderHost();
        hostBroadcastLobby();
      });
    }
    const tagSel = el.querySelector('[data-ref="tag"]');
    if (tagSel) {
      tagSel.addEventListener('change', (e) => {
        hostTag = String(e.target.value);
        // A guest sitting on the throne the host just took is beside them now,
        // not on a chair that no longer exists to be taken twice.
        reseatGuests();
        renderHost();
        hostBroadcastLobby();
      });
    }
    el.querySelectorAll('[data-seat]').forEach((sel) => sel.addEventListener('change', (e) => {
      const guest = hostPeers.find((g) => String(g.id) === sel.dataset.seat);
      if (!guest) return;
      guest.seat = String(e.target.value || '');
      renderHost();
      hostBroadcastLobby();
    }));
    const saveSel = el.querySelector('[data-ref="save"]');
    if (saveSel) saveSel.addEventListener('change', (e) => pickSave(String(e.target.value)));
    const manualBtn = el.querySelector('[data-ref="manual"]');
    if (manualBtn) {
      manualBtn.addEventListener('click', () => { manualMode = true; renderHost(); });
    }
    const linkBtn = el.querySelector('[data-ref="copylink"]');
    if (linkBtn) linkBtn.addEventListener('click', () => copyText(joinLink(inviteCode), linkBtn));
    const invBtn = el.querySelector('[data-ref="invite"]');
    if (invBtn) invBtn.addEventListener('click', () => hostMintInvite(invBtn, status));
    const acceptBtn = el.querySelector('[data-ref="accept"]');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', async () => {
        const ta = el.querySelector('[data-ref="reply"]');
        if (!ta || !ta.value.trim() || !pendingPeer) return;
        try {
          status('Connecting…');
          await pendingPeer.acceptCode(ta.value);
        } catch (e) {
          warnOnce('accept', e);
          status('That reply code did not take. Ask your friend to try again.');
        }
      });
    }
    el.querySelector('[data-ref="begin"]').addEventListener('click', () => {
      const ready = hostPeers.filter((g) => g.open);
      if (!ready.length) return;
      if (hostMode === 'save' && !hostSave) { status('Pick a saved campaign first.'); return; }
      // The picks become chairs here and nowhere else: an unpicked guest sits
      // beside the host, exactly as every v1.8 table did.
      for (const g of ready) g.tag = seatOf(g);
      started = true;
      stopPolling();
      el.classList.add('hidden');
      onHostStart(hostEntry(), hostTag, ready, usingSave() ? hostSave : null);
    });
  }

  // Reading the shelf and opening a save both happen off the render path: the
  // lobby draws immediately and fills in when the answer lands.
  async function loadShelf() {
    hostSaveRows = [];
    try {
      hostSaveRows = await saveTools.list();
    } catch (e) {
      warnOnce('mpshelf', e);
      hostSaveError = 'The shelf could not be read.';
    }
    if (hostMode !== 'save') return;
    if (hostSaveRows.length && !hostSaveId) { await pickSave(hostSaveRows[0].id); return; }
    renderHost();
  }

  async function pickSave(id) {
    hostSaveId = id;
    hostSave = null;
    hostSaveError = '';
    renderHost();
    let resolved = null;
    try {
      resolved = await saveTools.resolve(id);
    } catch (e) {
      warnOnce('mpresolve', e);
    }
    if (hostSaveId !== id) return; // the player moved on while we were reading
    if (!resolved) {
      hostSaveError = 'That save could not be opened.';
      renderHost();
      return;
    }
    hostSave = resolved;
    // The save owns the host's throne: whoever the campaign was being played
    // as is who the host continues as. The guests take whichever of the
    // chapter's other standards that world still has standing.
    hostTag = resolved.game.playerTag;
    reseatGuests();
    renderHost();
    hostBroadcastLobby();
  }

  // A one-click version of the same invite. The endpoint rides along so a
  // friend who has never configured anything can still reach the room — and
  // it reaches ONLY the room: cloud.js will not let a link-provided endpoint
  // near their saves or their player key without them saying so.
  function joinLink(code) {
    const base = window.location.origin + window.location.pathname;
    const q = new URLSearchParams();
    const ep = roomEndpoint();
    if (ep) q.set('cloud', ep);
    q.set('join', code);
    return base + '?' + q.toString();
  }

  function newGuestSlot() {
    guestSeq += 1;
    const guest = { id: guestSeq, peer: null, seat: '', tag: '', open: false };
    // Seated before they are shown: their own standard where the chapter
    // has one to give, beside the host where it does not (SPEC §216).
    guest.seat = defaultSeat(hostTag, chairs(), hostPeers.map((o) => seatOf(o)));
    guest.peer = createPeer({
      initiator: true,
      onMessage: (m) => hostOnGuestMessage(guest, m),
      onOpen: () => {
        guest.open = true;
        pendingPeer = null;
        inviteCode = '';
        manualCode = '';
        stopPolling();
        hostPeers.push(guest);
        guest.peer.send(hostLobbyPayload(guest));
        renderHost();
      },
      onClose: () => {
        const i = hostPeers.indexOf(guest);
        if (i >= 0) hostPeers.splice(i, 1);
        if (!started) { hostBroadcastLobby(); renderHost(); }
      },
    });
    return guest;
  }

  async function hostMintInvite(invBtn, status) {
    invBtn.disabled = true;
    status('Minting the invite code…');
    let guest = null;
    let offer = '';
    try {
      guest = newGuestSlot();
      pendingPeer = guest.peer;
      offer = await guest.peer.makeInvite();
    } catch (e) {
      warnOnce('invite', e);
      if (guest && guest.peer) { try { guest.peer.close(); } catch (err) { /* down */ } }
      pendingPeer = null;
      renderHost();
      const d = el.querySelector('[data-ref="status"]');
      if (d) d.textContent = 'Could not create an invite (does this browser support WebRTC?).';
      return;
    }
    manualCode = offer;
    if (manualMode) {
      renderHost();
      const ta = el.querySelector('[data-ref="invcode"]');
      if (ta) ta.value = offer;
      return;
    }
    // Cloud flow: park the offer and show the short code instead.
    renderHost(); // "Minting the code…" while the round trip runs
    try {
      inviteCode = await roomCreate(offer);
    } catch (e) {
      warnOnce('room', e);
      // One failure is enough: hand-carried codes for the rest of the session.
      manualMode = true;
      renderHost();
      const ta = el.querySelector('[data-ref="invcode"]');
      if (ta) ta.value = offer;
      const d = el.querySelector('[data-ref="status"]');
      if (d) d.textContent = 'The cloud did not answer, so this invite travels the old way — send the code below.';
      return;
    }
    renderHost();
    startPolling();
  }

  // The guest's answer lands in the room; the host collects it. Polling beats a
  // socket here: it is three lines, survives a sleeping laptop, and the whole
  // exchange is over in seconds.
  function startPolling() {
    stopPolling();
    pollStartedAt = Date.now();
    const code = inviteCode;
    pollTimer = setInterval(async () => {
      if (!pendingPeer || inviteCode !== code) { stopPolling(); return; }
      if (Date.now() - pollStartedAt > POLL_GIVE_UP_MS) {
        stopPolling();
        const d = el && el.querySelector('[data-ref="status"]');
        if (d) d.textContent = 'That invite has expired. Create a fresh one.';
        return;
      }
      let room = null;
      try {
        room = await roomFetch(code);
      } catch (e) {
        return; // a blip; the next tick tries again
      }
      if (!room || !room.answer) return;
      stopPolling();
      try {
        await pendingPeer.acceptCode(room.answer);
      } catch (e) {
        warnOnce('roomanswer', e);
        const d = el && el.querySelector('[data-ref="status"]');
        if (d) d.textContent = 'A player tried to join but the link did not take. Create a fresh invite.';
      }
    }, POLL_MS);
  }

  function hostOnGuestMessage(guest, m) {
    // Lobby guests mostly listen; in-game messages are handled by main.js once
    // started. The hello lets us catch a guest running a different build.
    if (m && m.t === 'hello' && m.v !== MP_PROTO && el) {
      const d = el.querySelector('[data-ref="status"]');
      if (d) d.textContent = 'A joining player is running a different version of the game — ask them to reload the page and rejoin with a fresh invite.';
    }
  }

  // ------------------------------------------------------------------ join --
  function renderJoin() {
    const body = manualMode ? `
      <div class="mp-hint">Paste the host's invite code:</div>
      <textarea class="mp-code" data-ref="invite" placeholder="JU1.…"></textarea>
      <button class="btn" data-ref="answer">Generate my reply code</button>
      <div data-ref="replywrap"></div>` : `
      <div class="mp-hint">Type the six-character code the host gave you:</div>
      <input class="mp-roomin" data-ref="room" placeholder="KFR-2M9" autocomplete="off"
             autocapitalize="characters" spellcheck="false" maxlength="9">
      <button class="btn" data-ref="joingo">Join</button>
      <button class="mp-adv" data-ref="manual">The host sent me a long code instead</button>`;
    ensureEl().innerHTML = shellHtml(`
      ${body}
      <div class="mp-status" data-ref="status"></div>
      <div data-ref="pickwrap"></div>
      <button class="btn peace-cancel" data-ref="close">Cancel</button>`);
    el.classList.remove('hidden');
    wireCommon();
    const status = (s) => { const d = el.querySelector('[data-ref="status"]'); if (d) d.textContent = s; };
    const manualBtn = el.querySelector('[data-ref="manual"]');
    if (manualBtn) manualBtn.addEventListener('click', () => { manualMode = true; renderJoin(); });

    const joinBtn = el.querySelector('[data-ref="joingo"]');
    if (joinBtn) {
      const input = el.querySelector('[data-ref="room"]');
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinBtn.click(); });
      joinBtn.addEventListener('click', () => guestJoinByRoom(input.value, joinBtn, status));
    }
    const answerBtn = el.querySelector('[data-ref="answer"]');
    if (answerBtn) {
      answerBtn.addEventListener('click', async () => {
        const ta = el.querySelector('[data-ref="invite"]');
        if (!ta || !ta.value.trim()) return;
        try {
          const reply = await guestAnswer(ta.value, status);
          const wrap = el.querySelector('[data-ref="replywrap"]');
          wrap.innerHTML = `
            <div class="mp-hint">Send this reply code back to the host:</div>
            <textarea class="mp-code" data-ref="reply" readonly></textarea>
            ${copyBtn('reply')}`;
          wrap.querySelector('[data-ref="reply"]').value = reply;
          wireCommon();
          status('Waiting for the host to accept your reply…');
        } catch (e) {
          warnOnce('join', e);
          status('That invite code did not take — check you copied all of it.');
        }
      });
    }
  }

  // Builds the peer and answers an offer. Shared by both join flows: the only
  // difference is where the offer came from and where the answer goes.
  async function guestAnswer(offer, status) {
    if (guestPeer) { try { guestPeer.close(); } catch (e) { /* down */ } }
    guestPeer = createPeer({
      initiator: false,
      onMessage: guestOnHostMessage,
      onOpen: () => {
        guestPeer.send({ t: 'hello', v: MP_PROTO });
        status('Connected. Waiting for the lobby…');
      },
      onClose: () => { if (!started) status('The connection closed.'); },
    });
    status('Building the reply…');
    return guestPeer.acceptCode(offer);
  }

  async function guestJoinByRoom(raw, btn, status) {
    const code = normalizeRoom(raw);
    if (!code) { status('An invite code is six letters and numbers, like KFR-2M9.'); return; }
    btn.disabled = true;
    status('Looking up the invite…');
    let room = null;
    try {
      room = await roomFetch(code);
    } catch (e) {
      warnOnce('roomfetch', e);
      status(e.message || 'That invite could not be found.');
      btn.disabled = false;
      return;
    }
    if (!room || !room.offer) {
      status('That invite has expired. Ask the host for a fresh code.');
      btn.disabled = false;
      return;
    }
    if (room.answer) {
      status('Someone has already used that invite. Ask the host for a fresh code.');
      btn.disabled = false;
      return;
    }
    let reply = '';
    try {
      reply = await guestAnswer(room.offer, status);
    } catch (e) {
      warnOnce('joinroom', e);
      status('The game could not answer that invite (does this browser support WebRTC?).');
      btn.disabled = false;
      return;
    }
    try {
      await roomAnswer(code, reply);
    } catch (e) {
      warnOnce('roomanswer-post', e);
      status(e.message || 'The cloud would not take the reply. Ask the host for a fresh code.');
      btn.disabled = false;
      return;
    }
    status('Joining the host…');
  }

  function renderGuestInfo() {
    const wrap = el && el.querySelector('[data-ref="pickwrap"]');
    if (!wrap || !guestLobby) return;
    const stat = el.querySelector('[data-ref="status"]');
    if (stat) stat.textContent = ''; // the handshake chatter is over
    // The host holds the pen on who sits where (SPEC §216) — this says which
    // chair is yours, and re-says it whenever the host moves anyone.
    const shared = guestLobby.shared !== false;
    const seat = shared
      ? 'you will rule it together with the host.'
      : 'your own throne, beside the host\'s ' + esc(guestLobby.hostName || guestLobby.hostTag || '') + '.';
    const others = (guestLobby.players || []).filter((p) => !p.you).map((p) => `
      <div class="mp-player mp-other">${flagChip(p.tag, DEFINES, 14)}
        ${esc(p.who)} — ${esc(p.name || p.tag)}</div>`).join('');
    wrap.innerHTML = `
      <div class="peace-sec">${esc(guestLobby.bookmarkName)}</div>
      <div class="mp-player">${flagChip(guestLobby.tag, DEFINES, 18)}
        <b>${esc(guestLobby.nationName)}</b> — ${seat}</div>
      ${others}
      ${guestLobby.resumed ? `<div class="mp-hint">A campaign already under way — you are joining it
        as it stands, in ${esc(guestLobby.resumed)}.</div>` : ''}
      <div class="mp-hint">Waiting for the host to begin…</div>`;
  }

  function guestOnHostMessage(m) {
    if (!m) return;
    if (m.t === 'lobby') {
      if (m.v !== MP_PROTO) {
        const d = el && el.querySelector('[data-ref="status"]');
        if (d) d.textContent = 'You and the host are running different versions of the game — both of you reload the page, then try a fresh invite.';
        return;
      }
      guestLobby = m;
      renderGuestInfo();
      return;
    }
    if (m.t === 'start') {
      started = true;
      stopPolling();
      if (el) el.classList.add('hidden');
      const entry = bookmarks.find((e) => e.bookmark.id === m.bookmarkId) || bookmarks[0];
      onGuestStart(entry, m.yourTag, m.game, guestPeer);
    }
    // snap/toast after start are handled by main.js (it takes over onMessage)
  }

  return {
    open() { started = false; manualMode = manualMode || !isRoomCloudOn(); renderMenu(); },
    // Arriving on a `?join=CODE` link: straight to the join screen with the
    // code already in the box, and the join already under way.
    openJoin(code) {
      const c = normalizeRoom(code);
      if (!c || !isRoomCloudOn()) { this.open(); return; }
      started = false;
      manualMode = false;
      renderJoin();
      const input = el.querySelector('[data-ref="room"]');
      const btn = el.querySelector('[data-ref="joingo"]');
      if (!input || !btn) return;
      input.value = prettyRoom(c);
      btn.click();
    },
    // main.js re-points a guest peer's message stream once the game begins
    _guestHandoff() { return guestPeer; },
  };
}
