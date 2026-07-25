// smoke69 — invite-code packing (SPEC §93). js/net/sdp.js is pure string work,
// so it is checked headlessly: a real Chromium offer round-trips to an SDP that
// carries every field that matters, and anything it cannot faithfully rebuild
// is refused rather than mangled.
//
//   node tools/tests/smoke69.mjs
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
// sdp.js uses btoa/atob, which Node has had globally since v16.
const { packSdp, unpackSdp, isPacked } = await import(join(HERE, '../../js/net/sdp.js'));

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

// A verbatim datachannel offer as Chromium emits it (captured from the game).
const REAL = {
  type: 'offer',
  sdp: [
    'v=0',
    'o=- 4162775211161061099 2 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    'a=group:BUNDLE 0',
    'a=extmap-allow-mixed',
    'a=msid-semantic: WMS',
    'm=application 36970 UDP/DTLS/SCTP webrtc-datachannel',
    'c=IN IP4 192.0.2.2',
    'a=candidate:3494696239 1 udp 2113937151 192.0.2.2 36970 typ host generation 0 network-cost 999',
    'a=candidate:842163049 1 udp 1677729535 203.0.113.7 36970 typ srflx raddr 192.0.2.2 rport 36970 generation 0 network-cost 999',
    'a=ice-ufrag:+41l',
    'a=ice-pwd:qoRN/2SeOjNhCvzlTAZMCfIb',
    'a=ice-options:trickle',
    'a=fingerprint:sha-256 AE:CE:FE:11:A5:BB:27:96:B0:56:1B:34:7E:F9:0C:15:1E:6D:BA:58:5C:F5:12:34:56:78:9A:BC:DE:F0:11:22',
    'a=setup:actpass',
    'a=mid:0',
    'a=sctp-port:5000',
    'a=max-message-size:262144',
    '',
  ].join('\r\n'),
};

console.log('== it actually gets shorter ==');
const packed = packSdp(REAL);
const legacy = 'JU1.' + btoa(unescape(encodeURIComponent(JSON.stringify(REAL))));
ok(!!packed, 'a real Chromium offer packs');
ok(isPacked(packed), 'and is recognisable as a packed code');
console.log('    legacy ' + legacy.length + ' chars -> packed ' + packed.length + ' chars');
ok(packed.length < legacy.length / 4,
  'at least four times shorter (' + legacy.length + ' -> ' + packed.length + ')');
ok(!/[^\x21-\x7e]/.test(packed), 'and is plain printable ASCII, safe to paste anywhere');

console.log('== nothing that matters is lost ==');
const back = unpackSdp(packed);
ok(back && back.type === 'offer', 'it unpacks as an offer');
const has = (re) => re.test(back.sdp);
ok(has(/^a=ice-ufrag:\+41l$/m), 'the ICE ufrag survives exactly');
ok(has(/^a=ice-pwd:qoRN\/2SeOjNhCvzlTAZMCfIb$/m), 'the ICE password survives exactly');
ok(has(/^a=fingerprint:sha-256 AE:CE:FE:11:A5:BB:27:96:B0:56:1B:34:7E:F9:0C:15:1E:6D:BA:58:5C:F5:12:34:56:78:9A:BC:DE:F0:11:22$/m),
  'the DTLS fingerprint survives byte for byte — a wrong one would fail the handshake');
ok(has(/^a=setup:actpass$/m), 'the setup role survives');
ok(has(/^m=application 9 UDP\/DTLS\/SCTP webrtc-datachannel$/m), 'the media line is rebuilt');
ok(has(/^a=sctp-port:5000$/m) && has(/^a=max-message-size:262144$/m), 'and the SCTP boilerplate with it');

console.log('== candidates ==');
ok(has(/typ host/) && has(/192\.0\.2\.2 36970 typ host/), 'the host candidate comes back with its address and port');
ok(has(/203\.0\.113\.7 36970 typ srflx raddr 192\.0\.2\.2 rport 36970/),
  'the reflexive candidate keeps its raddr/rport, which ICE needs');
ok((back.sdp.match(/^a=candidate:/gm) || []).length === 2, 'both candidates, and no more');
ok(has(/a=candidate:\d+ 1 udp 2113937151 /), 'priorities round-trip through base36');

console.log('== an answer packs too ==');
const ans = packSdp({ ...REAL, type: 'answer', sdp: REAL.sdp.replace('a=setup:actpass', 'a=setup:active') });
const ansBack = unpackSdp(ans);
ok(ansBack && ansBack.type === 'answer', 'an answer keeps its type');
ok(/^a=setup:active$/m.test(ansBack.sdp), 'and its setup role');

console.log('== it refuses what it cannot rebuild ==');
const strip = (re) => ({ type: 'offer', sdp: REAL.sdp.split('\r\n').filter((l) => !re.test(l)).join('\r\n') });
ok(packSdp(strip(/^a=fingerprint:/)) === null, 'no fingerprint -> refuses, rather than mint a dead code');
ok(packSdp(strip(/^a=ice-pwd:/)) === null, 'no ICE password -> refuses');
ok(packSdp(strip(/^a=candidate:/)) === null, 'no candidates -> refuses (nothing to connect to)');
ok(packSdp({ type: 'offer', sdp: REAL.sdp.replace('m=application', 'm=audio') }) === null,
  'an audio session -> refuses; only a data channel can be rebuilt from this little');
ok(packSdp({ type: 'offer', sdp: REAL.sdp + 'm=video 9 UDP/TLS/RTP/SAVPF 96\r\n' }) === null,
  'a second m-section -> refuses');
ok(packSdp(null) === null && packSdp({ type: 'pranswer', sdp: '' }) === null, 'junk in, null out');

console.log('== damaged codes are named, not misread ==');
ok(unpackSdp('JU2.o~a~b') === null, 'a truncated code is refused');
ok(unpackSdp('JU2.o~u~p~notbase64~A~h1.2.3.4,1,1') === null, 'a corrupt fingerprint is refused');
ok(unpackSdp('JU1.abc') === null && !isPacked('JU1.abc'), 'the legacy form is left for the legacy path');
ok(unpackSdp('') === null && unpackSdp('hello') === null, 'so is anything that is not a code');

console.log('== a code with only a host candidate (offline / LAN) ==');
const lanOnly = { type: 'offer', sdp: REAL.sdp.split('\r\n').filter((l) => !/typ srflx/.test(l)).join('\r\n') };
const lan = packSdp(lanOnly);
ok(!!lan && lan.length < 140, 'packs even smaller with one candidate (' + (lan || '').length + ' chars)');
ok(/typ host/.test(unpackSdp(lan).sdp), 'and still carries the address to connect to');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
