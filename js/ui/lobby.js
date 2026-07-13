// js/ui/lobby.js — multiplayer lobby (SPEC §18). No lobby server: the host
// mints an invite code per guest, the guest answers with a reply code, and a
// WebRTC data channel opens between the two browsers. The host then owns the
// simulation; guests mirror it. Everyone rules the HOST'S nation together —
// one realm, many hands on the tiller.
import { esc, warnOnce } from './format.js';
import { icon, flagChip } from './icons.js';
import { createPeer } from '../net/rtc.js';

const MAX_GUESTS = 3;
// Bumped whenever the multiplayer protocol or lobby flow changes. A host and a
// guest on different builds (one tab loaded before a deploy) otherwise glitch
// silently — with this they get told to reload instead.
const MP_PROTO = 2;
const BUILD = 'v1.8.1';

export function createLobby({ DEFINES, bookmarks, onHostStart, onGuestStart }) {
  const TAGS = (DEFINES && DEFINES.TAGS) || {};
  let el = null;
  // host state
  let hostPeers = [];        // [{peer, tag, open}]
  let pendingPeer = null;    // invite created, waiting for the reply code
  let hostBookmark = 0;
  let hostTag = '';
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

  function close() {
    if (el) el.classList.add('hidden');
    if (started) return; // peers now belong to the running game
    for (const g of hostPeers) { try { g.peer.close(); } catch (e) { /* down */ } }
    hostPeers = [];
    if (pendingPeer) { try { pendingPeer.close(); } catch (e) { /* down */ } pendingPeer = null; }
    if (guestPeer) { try { guestPeer.close(); } catch (e) { /* down */ } guestPeer = null; }
    guestLobby = null;
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

  function wireCommon() {
    el.querySelector('.modal-scrim').addEventListener('click', close);
    const back = el.querySelector('[data-ref="close"]');
    if (back) back.addEventListener('click', close);
    el.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
      const ta = el.querySelector(`[data-ref="${b.dataset.copy}"]`);
      if (!ta) return;
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* clipboard API next */ }
      if (!ok && navigator.clipboard) navigator.clipboard.writeText(ta.value).catch(() => {});
      b.textContent = 'Copied ✓';
      setTimeout(() => { b.textContent = 'Copy'; }, 1400);
    }));
  }

  // ------------------------------------------------------------------ menu --
  function renderMenu() {
    ensureEl().innerHTML = shellHtml(`
      <div class="peace-body">Play with friends over a direct browser-to-browser link —
        no accounts, no servers. One of you hosts and runs the world; everyone who joins
        rules the host's nation at their side: one realm, many hands on the tiller.</div>
      <button class="btn peace-opt" data-ref="host"><b>Host a campaign</b>
        <span class="peace-hint">Pick the chapter and your nation, mint invite codes, begin when your friends are in.</span></button>
      <button class="btn peace-opt" data-ref="join"><b>Join a campaign</b>
        <span class="peace-hint">Paste the host's invite code and send back your reply code.</span></button>
      <button class="btn peace-cancel" data-ref="close">Close</button>`);
    el.classList.remove('hidden');
    wireCommon();
    el.querySelector('[data-ref="host"]').addEventListener('click', renderHost);
    el.querySelector('[data-ref="join"]').addEventListener('click', renderJoin);
  }

  // ------------------------------------------------------------------ host --
  function hostLobbyPayload() {
    const b = bookmarks[hostBookmark].bookmark;
    return {
      t: 'lobby',
      v: MP_PROTO,
      bookmarkId: b.id,
      bookmarkName: b.name,
      tag: hostTag, // everyone shares the host's throne
      nationName: (TAGS[hostTag] && TAGS[hostTag].name) || hostTag,
      players: [{ who: 'Host', tag: hostTag }]
        .concat(hostPeers.map((g, i) => ({ who: 'Guest ' + (i + 1), tag: hostTag }))),
    };
  }
  function hostBroadcastLobby() {
    const payload = hostLobbyPayload();
    for (const g of hostPeers) g.peer.send(payload);
  }

  function renderHost() {
    const entry = bookmarks[hostBookmark];
    const playable = (entry.bookmark.playableTags || []).map((p) => p.tag);
    if (!playable.includes(hostTag)) hostTag = playable[0] || '';
    const bmOpts = bookmarks.map((e, i) =>
      `<option value="${i}"${i === hostBookmark ? ' selected' : ''}>${esc(e.bookmark.name)}</option>`).join('');
    const tagOpts = playable.map((t) =>
      `<option value="${esc(t)}"${t === hostTag ? ' selected' : ''}>${esc((TAGS[t] && TAGS[t].name) || t)}</option>`).join('');
    const players = hostLobbyPayload().players.map((p) => `
      <div class="mp-player">${flagChip(p.tag, DEFINES, 16)}
        <b>${esc(p.who)}</b> — ${esc((TAGS[p.tag] && TAGS[p.tag].name) || p.tag)}</div>`).join('');
    const canInvite = hostPeers.length < MAX_GUESTS && !pendingPeer;
    ensureEl().innerHTML = shellHtml(`
      <div class="peace-sec">The campaign</div>
      <div class="mp-row"><label>Chapter</label><select data-ref="bm">${bmOpts}</select></div>
      <div class="mp-row"><label>The nation</label><select data-ref="tag">${tagOpts}</select></div>
      <div class="mp-hint">Everyone who joins rules this nation with you.</div>
      <div class="peace-sec">Players</div>
      ${players}
      <div class="peace-sec">Invite</div>
      ${canInvite ? `<button class="btn" data-ref="invite">Create an invite code</button>` : ''}
      ${pendingPeer ? `
        <div class="mp-hint">Send this code to your friend, then paste their reply below.</div>
        <textarea class="mp-code" data-ref="invcode" readonly></textarea>
        ${copyBtn('invcode')}
        <textarea class="mp-code" data-ref="reply" placeholder="Paste their reply code here"></textarea>
        <button class="btn" data-ref="accept">Accept reply</button>` : ''}
      <div class="mp-status" data-ref="status"></div>
      <button class="btn peace-send" data-ref="begin"${hostPeers.some((g) => g.open) ? '' : ' disabled'}>
        ${icon('spears', 'icon-sm')} Begin the campaign</button>
      <button class="btn peace-cancel" data-ref="close">Cancel</button>`);
    el.classList.remove('hidden');
    wireCommon();
    const status = (s) => { const d = el.querySelector('[data-ref="status"]'); if (d) d.textContent = s; };
    el.querySelector('[data-ref="bm"]').addEventListener('change', (e) => {
      hostBookmark = Number(e.target.value) || 0;
      hostBroadcastLobby();
      renderHost();
    });
    el.querySelector('[data-ref="tag"]').addEventListener('change', (e) => {
      hostTag = String(e.target.value);
      hostBroadcastLobby();
    });
    const invBtn = el.querySelector('[data-ref="invite"]');
    if (invBtn) {
      invBtn.addEventListener('click', async () => {
        invBtn.disabled = true;
        status('Minting the invite code…');
        try {
          const guest = { peer: null, tag: '', open: false };
          guest.peer = createPeer({
            initiator: true,
            onMessage: (m) => hostOnGuestMessage(guest, m),
            onOpen: () => {
              guest.open = true;
              pendingPeer = null;
              hostPeers.push(guest);
              guest.peer.send(hostLobbyPayload());
              renderHost();
            },
            onClose: () => {
              const i = hostPeers.indexOf(guest);
              if (i >= 0) hostPeers.splice(i, 1);
              if (!started) { hostBroadcastLobby(); renderHost(); }
            },
          });
          pendingPeer = guest.peer;
          const code = await guest.peer.makeInvite();
          renderHost();
          const ta = el.querySelector('[data-ref="invcode"]');
          if (ta) ta.value = code;
        } catch (e) {
          warnOnce('invite', e);
          status('Could not create an invite (does this browser support WebRTC?).');
        }
      });
    }
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
      for (const g of ready) g.tag = hostTag; // one realm, shared by all
      started = true;
      el.classList.add('hidden');
      onHostStart(bookmarks[hostBookmark], hostTag, ready);
    });
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
    ensureEl().innerHTML = shellHtml(`
      <div class="mp-hint">Paste the host's invite code:</div>
      <textarea class="mp-code" data-ref="invite" placeholder="JU1.…"></textarea>
      <button class="btn" data-ref="answer">Generate my reply code</button>
      <div data-ref="replywrap"></div>
      <div class="mp-status" data-ref="status"></div>
      <div data-ref="pickwrap"></div>
      <button class="btn peace-cancel" data-ref="close">Cancel</button>`);
    el.classList.remove('hidden');
    wireCommon();
    const status = (s) => { const d = el.querySelector('[data-ref="status"]'); if (d) d.textContent = s; };
    el.querySelector('[data-ref="answer"]').addEventListener('click', async () => {
      const ta = el.querySelector('[data-ref="invite"]');
      if (!ta || !ta.value.trim()) return;
      try {
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
        const reply = await guestPeer.acceptCode(ta.value);
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

  function renderGuestInfo() {
    const wrap = el && el.querySelector('[data-ref="pickwrap"]');
    if (!wrap || !guestLobby) return;
    const stat = el.querySelector('[data-ref="status"]');
    if (stat) stat.textContent = ''; // the handshake chatter is over
    wrap.innerHTML = `
      <div class="peace-sec">${esc(guestLobby.bookmarkName)}</div>
      <div class="mp-player">${flagChip(guestLobby.tag, DEFINES, 18)}
        <b>${esc(guestLobby.nationName)}</b> — you will rule it together with the host.</div>
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
      if (el) el.classList.add('hidden');
      const entry = bookmarks.find((e) => e.bookmark.id === m.bookmarkId) || bookmarks[0];
      onGuestStart(entry, m.yourTag, m.game, guestPeer);
    }
    // snap/toast after start are handled by main.js (it takes over onMessage)
  }

  return {
    open() { started = false; renderMenu(); },
    // main.js re-points a guest peer's message stream once the game begins
    _guestHandoff() { return guestPeer; },
  };
}
