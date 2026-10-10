// tools/render_songs.mjs — render the score's songs to audio files (SPEC §289).
//
//   JU_PW_DIR=/opt/node22/lib node tools/render_songs.mjs [outDir] [songId ...]
//
// The war versions (SPEC §295) render too, as `<id>-war`: name one to render
// it alone (`well-war`), or every song and every war version is rendered.
//
// The songs are notes and voices, not recordings: the game plays them live.
// This renders each one through the same engine (js/ui/song_engine.js) into
// an OfflineAudioContext in Chromium, faster than real time, and writes a
// 44.1 kHz stereo WAV per song — and an MP3 beside it when ffmpeg is on the
// PATH. It serves the repository itself on a free port; nothing else needs
// to be running. Nothing it writes is part of the game.
import { createRequire } from 'module';
import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { spawnSync } from 'child_process';
import { extname, join, resolve } from 'path';

const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const R = new URL('..', import.meta.url).pathname;
const outDir = resolve(process.argv[2] || 'songs-out');
const only = process.argv.slice(3);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><title>songs</title>');
    return;
  }
  try {
    const body = await readFile(join(R, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch (e) { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = 'http://127.0.0.1:' + server.address().port;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto(base + '/');
const ids = await page.evaluate(async () => {
  const m = await import('/js/data/songs.js');
  const out = [];
  for (const s of m.SONGS) {
    out.push(s.id);
    const w = m.warVersionOf(s);
    if (w && w !== s) out.push(w.id);
  }
  return out;
});

for (const id of ids) {
  if (only.length && !only.includes(id)) continue;
  const t0 = Date.now();
  const out = await page.evaluate(async (songId) => {
    const { SONGS, warVersionOf } = await import('/js/data/songs.js');
    const eng = await import('/js/ui/song_engine.js');
    const song = SONGS.find((s) => s.id === songId)
      || SONGS.map((s) => warVersionOf(s)).find((s) => s.id === songId);
    const tl = eng.buildTimeline(song);
    const sr = 44100;
    const ac = new OfflineAudioContext(2, Math.ceil((tl.duration + 1) * sr), sr);
    // the live chain, minus the game: the score's level, a gentle limiter
    const master = ac.createGain();
    master.gain.value = 0.22 * 0.55 * 4.5;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 4;
    master.connect(comp);
    comp.connect(ac.destination);
    const verb = eng.makeReverb(ac, master);
    const play = eng.createSongVoices(ac, master, verb, eng.makeNoise(ac));
    for (const ev of tl.events) play(ev, ev.t + 0.2);
    const buf = await ac.startRendering();
    // 16-bit PCM WAV
    const n = buf.length;
    const L = buf.getChannelData(0);
    const Rc = buf.getChannelData(1);
    const bytes = new DataView(new ArrayBuffer(44 + n * 4));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) bytes.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); bytes.setUint32(4, 36 + n * 4, true); str(8, 'WAVE');
    str(12, 'fmt '); bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, 2, true);
    bytes.setUint32(24, sr, true); bytes.setUint32(28, sr * 4, true); bytes.setUint16(32, 4, true); bytes.setUint16(34, 16, true);
    str(36, 'data'); bytes.setUint32(40, n * 4, true);
    let peak = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const a = Math.max(-1, Math.min(1, L[i]));
      const b = Math.max(-1, Math.min(1, Rc[i]));
      peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rc[i]));
      sumSq += a * a;
      bytes.setInt16(44 + i * 4, a * 32767, true);
      bytes.setInt16(46 + i * 4, b * 32767, true);
    }
    let bin = '';
    const u8 = new Uint8Array(bytes.buffer);
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return { title: song.title, seconds: n / sr, peak, rms: Math.sqrt(sumSq / n), b64: btoa(bin) };
  }, id);
  const wav = join(outDir, id + '.wav');
  await writeFile(wav, Buffer.from(out.b64, 'base64'));
  let mp3 = '';
  // The MP3 is brought to a listening level (EBU R128, -16 LUFS); the WAV
  // keeps the game's own level, which sits well under the effects.
  const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100',
    '-codec:a', 'libmp3lame', '-q:a', '2',
    '-metadata', 'title=' + out.title, '-metadata', 'artist=Judaea Universalis', '-metadata', 'album=Judaea Universalis — the score',
    join(outDir, id + '.mp3')]);
  if (ff.status === 0) mp3 = ' + mp3';
  console.log(`${id.padEnd(11)} ${out.title.padEnd(26)} ${out.seconds.toFixed(1)}s  peak ${out.peak.toFixed(2)}  rms ${out.rms.toFixed(3)}  (${((Date.now() - t0) / 1000).toFixed(1)}s)${mp3}`);
}

await browser.close();
server.close();
