// js/ui/saves.js — the shelf (SPEC §93). Every campaign this player has, in
// one list, loadable with a click. Reachable from the title screen and from
// the quill's neighbour in the topbar, so "load a save" no longer means
// "the newest one, and only the newest one".
//
// Campaigns live in this browser's own database: free, nothing to set up, and
// never a file to download or hunt for again. If a cloud is configured they
// are copied there too and follow the player between devices — the per-row
// badge says which, and the foot of the panel says where they are and how
// safe they are there.
import { esc, warnOnce } from './format.js';
import { icon, flagChip } from './icons.js';

export function createSavesPanel({ DEFINES, saveTools }) {
  let el = null;
  let busy = false;
  let showKey = false;

  function ensureEl() {
    if (el) return el;
    el = document.createElement('div');
    el.id = 'saves-panel';
    el.classList.add('hidden');
    document.body.appendChild(el);
    return el;
  }

  function close() { if (el) el.classList.add('hidden'); }

  function shell(inner) {
    return `
      <div class="modal-scrim"></div>
      <div class="ev-card peace-card sv-card">
        <h2 class="peace-title">${icon('amphora', 'icon-sm')} Saved campaigns</h2>
        ${inner}
      </div>`;
  }

  function rowHtml(s) {
    const tagDef = (DEFINES.TAGS && DEFINES.TAGS[s.tag]) || {};
    const where = s.source === 'cloud'
      ? '<span class="sv-where sv-cloud" data-tt="Saved on another device and found through your cloud copy — loading it brings it here">☁ elsewhere</span>'
      : '<span class="sv-where sv-local" data-tt="Saved in this browser — loads with no network and no downloads">▢ here</span>'
        + (s.alsoCloud ? '<span class="sv-where sv-cloud" data-tt="A copy is in your cloud too, so it reaches your other devices">☁ copied</span>' : '');
    const kind = s.kind === 'auto' ? '<span class="sv-kind">autosave</span>' : '';
    return `
      <div class="sv-row" data-id="${esc(s.id)}">
        <span class="sv-flag">${flagChip(s.tag, DEFINES, 22)}</span>
        <span class="sv-main">
          <span class="sv-name">${esc(s.nationName || tagDef.name || s.tag)} — ${esc(s.dateLabel)}</span>
          <span class="sv-sub">${esc(s.chapterName)} ${kind} ${where}</span>
        </span>
        <button class="btn sv-load" data-load="${esc(s.id)}">Load</button>
        <button class="btn sv-del" data-del="${esc(s.id)}"
          data-tt="Delete this campaign — from this device, and from your cloud copy if you have one"
          aria-label="Delete this campaign">Delete</button>
      </div>`;
  }

  function keyBlockHtml() {
    if (!saveTools.cloudOn()) return '';
    const code = saveTools.playerCode();
    return `
      <div class="peace-sec">Your player code</div>
      <div class="mp-hint">This code is your shelf. Type it into the game on another
        device and these campaigns follow you there. Anyone who has it can read and
        overwrite your saves — treat it like a password.</div>
      <div class="sv-keyrow">
        <input class="mp-code sv-key" data-ref="key" ${showKey ? '' : 'type="password"'} value="${esc(code)}" readonly>
        <button class="btn sv-small" data-ref="reveal">${showKey ? 'Hide' : 'Show'}</button>
        <button class="btn sv-small" data-ref="copykey">Copy</button>
      </div>
      <button class="btn sv-small sv-wide" data-ref="usekey">Use a code from another device…</button>
      <div class="sv-keyform hidden" data-ref="keyform">
        <input class="mp-code" data-ref="keyin" placeholder="ABCDE-FGHJK-MNPQR-STUVW">
        <button class="btn sv-small" data-ref="keygo">Switch to this shelf</button>
      </div>`;
  }

  // A `?cloud=` link can point the lobby at somebody's server for a fifteen
  // minute handshake without asking — nothing personal goes there. Saves are
  // different: they travel under the player code, so the offer is a question,
  // never a default. See the trust note in js/net/cloud.js.
  function offerHtml() {
    const offered = saveTools.offered ? saveTools.offered() : '';
    if (!offered) return '';
    return `
      <div class="sv-offer">
        <b>A link pointed this game at a cloud:</b>
        <code>${esc(offered)}</code>
        <span>It is being used for the multiplayer handshake only. Keeping your
          saves there sends your campaigns, under your player code, to whoever runs
          it — accept only if it is yours or a friend's.</span>
        <button class="btn sv-small" data-ref="accept">Keep my saves there too</button>
      </div>`;
  }

  async function render() {
    ensureEl().innerHTML = shell(`
      ${offerHtml()}
      <div class="sv-status" data-ref="status">Reading the shelf…</div>
      <div class="sv-list" data-ref="list"></div>
      ${keyBlockHtml()}
      <div class="sv-cloudline" data-ref="cloudline"></div>
      <button class="btn peace-cancel" data-ref="close">Close</button>`);
    el.classList.remove('hidden');
    wire();
    await refreshList();
    refreshCloudLine();
  }

  function wire() {
    el.querySelector('.modal-scrim').addEventListener('click', close);
    el.querySelector('[data-ref="close"]').addEventListener('click', close);

    const accept = el.querySelector('[data-ref="accept"]');
    if (accept) {
      accept.addEventListener('click', async () => {
        saveTools.acceptOffered();
        await render();
      });
    }
    const reveal = el.querySelector('[data-ref="reveal"]');
    if (reveal) {
      reveal.addEventListener('click', () => {
        showKey = !showKey;
        const input = el.querySelector('[data-ref="key"]');
        if (input) input.type = showKey ? 'text' : 'password';
        reveal.textContent = showKey ? 'Hide' : 'Show';
      });
    }
    const copy = el.querySelector('[data-ref="copykey"]');
    if (copy) {
      copy.addEventListener('click', () => {
        const input = el.querySelector('[data-ref="key"]');
        if (!input) return;
        const wasHidden = input.type === 'password';
        if (wasHidden) input.type = 'text'; // select() will not take on a password field
        input.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { /* clipboard API next */ }
        if (!ok && navigator.clipboard) navigator.clipboard.writeText(input.value).catch(() => {});
        if (wasHidden) input.type = 'password';
        copy.textContent = 'Copied ✓';
        setTimeout(() => { copy.textContent = 'Copy'; }, 1400);
      });
    }
    const useKey = el.querySelector('[data-ref="usekey"]');
    if (useKey) {
      useKey.addEventListener('click', () => {
        const form = el.querySelector('[data-ref="keyform"]');
        if (form) form.classList.toggle('hidden');
      });
    }
    const keyGo = el.querySelector('[data-ref="keygo"]');
    if (keyGo) {
      keyGo.addEventListener('click', async () => {
        const input = el.querySelector('[data-ref="keyin"]');
        if (!input) return;
        if (!saveTools.setPlayerCode(input.value)) {
          status('That is not a player code — it is twenty letters and numbers.', true);
          return;
        }
        showKey = false;
        await render();
      });
    }

    el.querySelector('[data-ref="list"]').addEventListener('click', async (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target || busy) return;
      const loadBtn = target.closest('[data-load]');
      if (loadBtn) { await doLoad(loadBtn.dataset.load, loadBtn); return; }
      const delBtn = target.closest('[data-del]');
      if (delBtn) await doDelete(delBtn.dataset.del, delBtn);
    });
  }

  function status(text, bad) {
    const d = el && el.querySelector('[data-ref="status"]');
    if (!d) return;
    d.textContent = text;
    d.classList.toggle('bad', !!bad);
  }

  const mb = (n) => (n >= 1024 * 1024 * 1024
    ? (n / 1024 / 1024 / 1024).toFixed(1) + ' GB'
    : Math.round(n / 1024 / 1024) + ' MB');

  // The foot of the panel. Saving in this browser is the whole feature and is
  // stated as such — a cloud, if one is set up, is an extra line underneath,
  // never a prerequisite the player is missing.
  async function refreshCloudLine() {
    const line = el && el.querySelector('[data-ref="cloudline"]');
    if (!line) return;
    let store = null;
    try { store = await saveTools.storage(); } catch (e) { warnOnce('storage', e); }

    const room = store && store.quota
      ? ` About ${esc(mb(store.quota - (store.usage || 0)))} free — room for hundreds of campaigns.`
      : '';
    const kept = store && store.persisted
      ? 'Your browser has marked these as worth keeping, so they survive a storage clear-out.'
      : 'Clearing this site\'s data in your browser settings would remove them.';
    const where = store && store.fallback
      ? 'Saved in this browser. (This browser would not open its database, so the game is using '
        + 'the smaller fallback store — a very long campaign may not fit.)'
      : 'Saved in this browser, in its own database.';
    let html = `<span class="sv-ok">▢ ${esc(where)}</span> <span class="sv-off">${esc(kept)}${room}</span>`;

    if (!saveTools.cloudOn()) {
      html += `<span class="sv-off"> Nothing to set up, and nothing to download.
        A cloud copy that follows you between devices is optional — see server/README.md.</span>`;
      line.innerHTML = html;
      return;
    }
    line.innerHTML = html + '<span class="sv-off"> Checking the cloud copy…</span>';
    let health = { ok: false };
    try { health = await saveTools.status(); } catch (e) { warnOnce('cloudstatus', e); }
    line.innerHTML = html + (health.ok
      ? `<span class="sv-ok"> ☁ Also copied to ${esc(saveTools.endpoint())}</span>`
      : `<span class="sv-off"> ☁ The cloud copy is not reachable (${esc(health.error || 'no reply')}).
         Your campaigns are safe here regardless.</span>`);
  }

  async function refreshList() {
    let saves = [];
    try {
      saves = await saveTools.list();
    } catch (e) {
      warnOnce('savelist', e);
      status('Could not read the shelf: ' + (e.message || e), true);
      return;
    }
    const list = el.querySelector('[data-ref="list"]');
    if (!list) return;
    if (!saves.length) {
      list.innerHTML = '<div class="sv-empty">No saved campaigns yet. The game writes one every '
        + 'January, and the quill in the topbar writes one whenever you ask. They appear here, '
        + 'and load with a click.</div>';
      status('');
      return;
    }
    list.innerHTML = saves.map(rowHtml).join('');
    status(saves.length === 1 ? '1 campaign on the shelf' : saves.length + ' campaigns on the shelf');
  }

  async function doLoad(id, btn) {
    busy = true;
    btn.textContent = 'Loading…';
    btn.disabled = true;
    try {
      const ok = await saveTools.load(id);
      if (ok) { close(); return; } // the game takes the screen from here
      status('That save could not be opened — it may be from an older version of the game.', true);
    } catch (e) {
      warnOnce('saveload', e);
      status('That save could not be opened: ' + (e.message || e), true);
    }
    btn.textContent = 'Load';
    btn.disabled = false;
    busy = false;
  }

  // Two taps, not a confirm dialog: the first arms the button and says what
  // will happen, the second does it, and walking away disarms it on its own.
  // A campaign is not something to lose to a mis-tap on a phone.
  async function doDelete(id, btn) {
    if (btn.dataset.sure !== '1') {
      btn.dataset.sure = '1';
      btn.textContent = 'Delete for good?';
      btn.classList.add('sv-sure');
      setTimeout(() => {
        if (!btn.isConnected) return;
        delete btn.dataset.sure;
        btn.textContent = 'Delete';
        btn.classList.remove('sv-sure');
      }, 4000);
      return;
    }
    busy = true;
    btn.textContent = 'Deleting…';
    try {
      await saveTools.remove(id);
      await refreshList();
      status('Campaign deleted.');
    } catch (e) {
      warnOnce('savedel', e);
      status('Could not delete that campaign: ' + (e.message || e), true);
      btn.textContent = 'Delete';
      btn.classList.remove('sv-sure');
      delete btn.dataset.sure;
    }
    busy = false;
  }

  return {
    open() { busy = false; render(); },
    close,
  };
}
