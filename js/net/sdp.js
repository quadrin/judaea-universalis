// js/net/sdp.js — invite codes you can actually paste (SPEC §93).
//
// A hand-carried invite used to be the whole session description, JSON'd and
// base64'd: ~830 characters. Almost all of it is boilerplate that both sides
// already know, because both sides are this game opening one ordered data
// channel. What genuinely cannot be guessed is small:
//
//   ICE ufrag      ~4 chars      chosen by the browser
//   ICE password   ~24 chars     chosen by the browser
//   DTLS fingerprint  32 bytes   a hash; irreducible
//   setup role     1 char
//   candidates     ~20 chars each
//
// So a code is those fields and nothing else, and the far side rebuilds a
// complete SDP around them. ~830 -> ~150. It cannot get near a six-character
// room code — that needs a server holding the offer (js/net/cloud.js); this is
// the best that is possible with no server at all.
//
// Everything is reversible and checked: pack() returns null if the SDP has a
// shape it does not recognise, and rtc.js falls back to the long form rather
// than mint a code that will not connect.

const PREFIX = 'JU2.';
const SEP = '~';
const CAND_SEP = ';';
const SETUP = { actpass: 'A', active: 'a', passive: 'p' };
const SETUP_BACK = { A: 'actpass', a: 'active', p: 'passive' };
const CTYPE = { host: 'h', srflx: 's', prflx: 'p', relay: 'r' };
const CTYPE_BACK = { h: 'host', s: 'srflx', p: 'prflx', r: 'relay' };

const line = (sdp, re) => { const m = re.exec(sdp); return m ? m[1] : ''; };

function hexToB64(hex) {
  const bytes = hex.split(':').map((h) => parseInt(h, 16));
  if (bytes.length !== 32 || bytes.some((b) => Number.isNaN(b))) return '';
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64ToHex(b64) {
  let s;
  // A mistyped or truncated code reaches here; atob throws on it, and that
  // must surface as "damaged code" in the lobby rather than as an exception.
  try { s = atob(String(b64 || '').replace(/-/g, '+').replace(/_/g, '/')); } catch (e) { return ''; }
  if (s.length !== 32) return '';
  const out = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i).toString(16).padStart(2, '0').toUpperCase());
  return out.join(':');
}

// ------------------------------------------------------------------ pack --

export function packSdp(desc) {
  try {
    if (!desc || (desc.type !== 'offer' && desc.type !== 'answer')) return null;
    const sdp = String(desc.sdp || '');
    const ufrag = line(sdp, /^a=ice-ufrag:(.+)$/m);
    const pwd = line(sdp, /^a=ice-pwd:(.+)$/m);
    const fp = line(sdp, /^a=fingerprint:sha-256 (.+)$/m);
    const setup = line(sdp, /^a=setup:(\S+)$/m);
    if (!ufrag || !pwd || !fp || !SETUP[setup]) return null;
    // Only a datachannel-only session can be rebuilt from this little. Audio
    // or video would need their whole m-section, so refuse rather than lie.
    if (!/^m=application \S+ UDP\/DTLS\/SCTP webrtc-datachannel/m.test(sdp)) return null;
    if ((sdp.match(/^m=/gm) || []).length !== 1) return null;
    const fp64 = hexToB64(fp);
    if (!fp64) return null;

    const cands = [];
    const re = /^a=candidate:(\S+) (\d+) (\S+) (\d+) (\S+) (\d+) typ (\S+)(?:.*?raddr (\S+) rport (\d+))?/gmi;
    let m;
    while ((m = re.exec(sdp)) !== null) {
      const [, , comp, transport, priority, ip, port, typ, raddr, rport] = m;
      // One component, UDP only: that is all a data channel ever offers, and
      // dropping the rest keeps the code short without changing what connects.
      if (comp !== '1' || String(transport).toLowerCase() !== 'udp') continue;
      const t = CTYPE[typ];
      if (!t) continue;
      let c = t + ip + ',' + port + ',' + Number(priority).toString(36);
      if (raddr && rport) c += ',' + raddr + ',' + rport;
      cands.push(c);
    }
    if (!cands.length) return null; // nothing to connect to; keep the long form

    return PREFIX + [
      desc.type === 'offer' ? 'o' : 'a',
      ufrag,
      pwd,
      fp64,
      SETUP[setup],
      cands.join(CAND_SEP),
    ].join(SEP);
  } catch (e) {
    return null; // any surprise: the caller keeps the long, literal code
  }
}

// ---------------------------------------------------------------- unpack --

export function unpackSdp(code) {
  try {
    return unpack(code);
  } catch (e) {
    return null; // a damaged code is refused, never half-read
  }
}

function unpack(code) {
  const s = String(code || '').trim();
  if (!s.startsWith(PREFIX)) return null;
  const [kind, ufrag, pwd, fp64, setup, candStr] = s.slice(PREFIX.length).split(SEP);
  if (!kind || !ufrag || !pwd || !fp64 || !SETUP_BACK[setup]) return null;
  const fp = b64ToHex(fp64);
  if (!fp) return null;

  const cands = String(candStr || '').split(CAND_SEP).filter(Boolean).map((c, i) => {
    const t = CTYPE_BACK[c[0]];
    if (!t) return '';
    const [ip, port, pri36, raddr, rport] = c.slice(1).split(',');
    if (!ip || !port) return '';
    const priority = parseInt(pri36, 36);
    // The foundation only has to be consistent within the session; ICE does
    // not care what it is, so an index is as good as the browser's own.
    let out = `a=candidate:${i + 1} 1 udp ${Number.isFinite(priority) ? priority : 2113937151} `
      + `${ip} ${port} typ ${t}`;
    if (raddr && rport) out += ` raddr ${raddr} rport ${rport}`;
    return out + ' generation 0';
  }).filter(Boolean);
  if (!cands.length) return null;

  // The boilerplate both sides already knew. `9` / `0.0.0.0` are the standard
  // placeholders for a session whose addresses come from candidates.
  const sdp = [
    'v=0',
    'o=- 1 2 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    'a=group:BUNDLE 0',
    'a=extmap-allow-mixed',
    'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
    'c=IN IP4 0.0.0.0',
    ...cands,
    'a=ice-ufrag:' + ufrag,
    'a=ice-pwd:' + pwd,
    'a=ice-options:trickle',
    'a=fingerprint:sha-256 ' + fp,
    'a=setup:' + SETUP_BACK[setup],
    'a=mid:0',
    'a=sctp-port:5000',
    'a=max-message-size:262144',
    '',
  ].join('\r\n');
  return { type: kind === 'o' ? 'offer' : 'answer', sdp };
}

export function isPacked(code) {
  return String(code || '').trim().startsWith(PREFIX);
}
