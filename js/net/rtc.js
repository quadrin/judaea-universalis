// js/net/rtc.js — WebRTC peer with manual signaling (SPEC §18). Zero backend:
// the game is static-hosted, so there is no lobby server. Invite and reply are
// self-contained base64 codes the players exchange over any channel they like
// (chat, email, a shouted phone screen). One RTCPeerConnection + one ordered
// DataChannel per guest; JSON messages, chunked so full-game snapshots fit.

const CODE_PREFIX = 'JU1.';
const CHUNK = 48 * 1024;          // DataChannel-safe message size
const GATHER_TIMEOUT_MS = 3500;   // don't wait forever for STUN when offline

const warned = new Set();
function warnOnce(key, ...msg) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[net/rtc]', ...msg);
}

// base64 with unicode safety
function enc(obj) {
  return CODE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}
function dec(code) {
  const s = String(code || '').trim();
  if (!s.startsWith(CODE_PREFIX)) throw new Error('That is not a Judaea Universalis code.');
  return JSON.parse(decodeURIComponent(escape(atob(s.slice(CODE_PREFIX.length)))));
}

function waitIceComplete(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', check); resolve(); };
    const check = () => { if (pc.iceGatheringState === 'complete') done(); };
    const timer = setTimeout(done, GATHER_TIMEOUT_MS); // partial candidates still work on LAN/localhost
    pc.addEventListener('icegatheringstatechange', check);
  });
}

// createPeer({initiator, onMessage(obj), onOpen(), onClose()})
// Initiator flow: makeInvite() -> code A -> (other side) acceptCode(A) -> code B
//                 -> (initiator) acceptCode(B) -> channel opens.
export function createPeer({ initiator, onMessage, onOpen, onClose }) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
  });
  // Handlers live in a mutable slot: the lobby wires them first, then main.js
  // takes the peer over for the game phase via setHandlers().
  const handlers = { onMessage, onOpen, onClose };
  let dc = null;
  let closed = false;
  const rx = new Map(); // chunk reassembly: id -> {n, got, parts[]}
  let txId = 0;

  function fireClose() {
    if (closed) return;
    closed = true;
    try { if (handlers.onClose) handlers.onClose(); } catch (e) { warnOnce('onclose', e); }
  }

  function wire(channel) {
    dc = channel;
    dc.onopen = () => { try { if (handlers.onOpen) handlers.onOpen(); } catch (e) { warnOnce('onopen', e); } };
    dc.onclose = fireClose;
    dc.onerror = () => {}; // close follows; avoid console spam
    dc.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m && m._c) { // chunk envelope {_c: id, i, n, s}
          let slot = rx.get(m._c);
          if (!slot) { slot = { n: m.n, got: 0, parts: new Array(m.n) }; rx.set(m._c, slot); }
          if (slot.parts[m.i] === undefined) { slot.parts[m.i] = m.s; slot.got++; }
          if (slot.got === slot.n) {
            rx.delete(m._c);
            if (handlers.onMessage) handlers.onMessage(JSON.parse(slot.parts.join('')));
          }
          return;
        }
        if (handlers.onMessage) handlers.onMessage(m);
      } catch (err) {
        warnOnce('badmsg', 'unparseable message dropped', err);
      }
    };
  }

  if (initiator) wire(pc.createDataChannel('ju', { ordered: true }));
  else pc.ondatachannel = (e) => wire(e.channel);
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed'
      || pc.connectionState === 'disconnected') fireClose();
  };

  return {
    // Host side: produce the invite code.
    async makeInvite() {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitIceComplete(pc);
      return enc(pc.localDescription);
    },
    // Both sides: consume the other side's code. Guests get their reply code back.
    async acceptCode(code) {
      const desc = dec(code);
      await pc.setRemoteDescription(desc);
      if (desc.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitIceComplete(pc);
        return enc(pc.localDescription);
      }
      return null;
    },
    send(obj) {
      if (!dc || dc.readyState !== 'open') return false;
      try {
        const s = JSON.stringify(obj);
        if (s.length <= CHUNK) { dc.send(s); return true; }
        const id = ++txId;
        const n = Math.ceil(s.length / CHUNK);
        for (let i = 0; i < n; i++) {
          dc.send(JSON.stringify({ _c: id, i, n, s: s.slice(i * CHUNK, (i + 1) * CHUNK) }));
        }
        return true;
      } catch (e) {
        warnOnce('send', 'send failed', e);
        return false;
      }
    },
    isOpen() { return !!dc && dc.readyState === 'open'; },
    setHandlers(next) { Object.assign(handlers, next || {}); },
    close() {
      try { if (dc) dc.close(); } catch (e) { /* already down */ }
      try { pc.close(); } catch (e) { /* already down */ }
      fireClose();
    },
  };
}
