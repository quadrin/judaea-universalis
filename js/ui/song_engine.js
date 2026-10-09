// js/ui/song_engine.js — plays the score's songs (SPEC §289).
//
// Two halves. `buildTimeline(song)` turns the notation of js/data/songs.js
// into a flat list of timed events (DOM-free: smoke200 runs it in Node).
// `createSongVoices(ac, out, send, noiseBuf)` is the band — every instrument
// is oscillators, filtered noise and envelopes, like the rest of the game's
// sound (SPEC §27). It takes any BaseAudioContext, so the live score
// (sound.js) and an OfflineAudioContext (tools/render_songs.mjs) play the
// same notes through the same voices.
import { MODES } from '../data/songs.js';

export const VOICES = ['kinnor', 'flute', 'reed', 'oud', 'horn', 'strings', 'choir', 'shofar'];
const DRUM_KEYS = 'DTkSB';

// ------------------------------------------------------------- notation --
function tokens(str) {
  return String(str || '').split(/\s+/).filter(Boolean);
}

// A melody line -> [{beat, len, deg, acc, rest}] plus each bar's length.
export function parseMelody(str) {
  const notes = [];
  const bars = [];
  let beat = 0;
  let bar = 0;
  for (const tok of tokens(str)) {
    if (tok === '|') { bars.push(bar); bar = 0; continue; }
    const m = /^(r|-?\d+)([#b]?)(?::(\d*\.?\d+))?$/.exec(tok);
    if (!m) throw new Error('bad melody token "' + tok + '"');
    const len = m[3] !== undefined ? Number(m[3]) : 1;
    if (m[1] !== 'r') {
      notes.push({ beat, len, deg: Number(m[1]), acc: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0 });
    }
    beat += len;
    bar += len;
  }
  bars.push(bar);
  return { notes, bars, beats: beat };
}

// A harmony line -> [{beat, len, off, kind}] (kind: 'M' major, 'm' minor, 'p' open fifth).
export function parseChords(str) {
  const chords = [];
  const bars = [];
  let beat = 0;
  let bar = 0;
  for (const tok of tokens(str)) {
    if (tok === '|') { bars.push(bar); bar = 0; continue; }
    const m = /^(-?\d+)([mp]?)(?::(\d*\.?\d+))?$/.exec(tok);
    if (!m) throw new Error('bad chord token "' + tok + '"');
    const len = m[3] !== undefined ? Number(m[3]) : 4;
    chords.push({ beat, len, off: Number(m[1]), kind: m[2] || 'M' });
    beat += len;
    bar += len;
  }
  bars.push(bar);
  return { chords, bars, beats: beat };
}

export function degreeHz(key, mode, deg, acc) {
  const scale = MODES[mode] || MODES.dorian;
  const n = scale.length;
  const oct = Math.floor(deg / n);
  const semi = scale[((deg % n) + n) % n] + (acc || 0);
  return key * Math.pow(2, oct + semi / 12);
}

// Everything that would make a song play wrong, as readable strings.
export function validateSong(song) {
  const errs = [];
  const say = (s) => errs.push(song.id + ': ' + s);
  if (!MODES[song.mode]) say('unknown mode ' + song.mode);
  if (!(song.bpm > 0) || !(song.meter > 0) || !(song.key > 0)) say('needs key, bpm and meter');
  const parts = song.parts || {};
  for (const [name, p] of Object.entries(parts)) {
    for (const [what, parse] of [['m', parseMelody], ['c', parseChords]]) {
      if (!p[what]) continue;
      let r;
      try { r = parse(p[what]); } catch (e) { say(name + '.' + what + ': ' + e.message); continue; }
      r.bars.forEach((b, i) => {
        if (Math.abs(b - song.meter) > 1e-6) say(`${name}.${what} bar ${i + 1} holds ${b} beats, not ${song.meter}`);
      });
    }
  }
  for (const [k, pat] of Object.entries(song.drums || {})) {
    if (!pat.length || [...pat].some((ch) => ch !== '.' && !DRUM_KEYS.includes(ch))) say('drum pattern ' + k + ' is not D T k S B .');
  }
  (song.form || []).forEach((sec, i) => {
    const where = 'form[' + i + ']';
    const cp = parts[sec.c];
    if (!cp || !cp.c) { say(where + ' has no harmony part ' + sec.c); return; }
    const L = parseChords(cp.c).beats;
    for (const line of sec.m || []) {
      const [pn, voice] = line;
      if (!parts[pn] || !parts[pn].m) { say(where + ' plays a missing melody ' + pn); continue; }
      if (!VOICES.includes(voice)) say(where + ' has no voice ' + voice);
      const ml = parseMelody(parts[pn].m).beats;
      if (Math.abs(ml - L) > 1e-6) say(`${where}: melody ${pn} is ${ml} beats, the harmony ${sec.c} is ${L}`);
    }
    if (sec.drum && !(song.drums || {})[sec.drum]) say(where + ' plays a missing drum pattern ' + sec.drum);
  });
  return errs;
}

// The song as timed events, seconds from its first beat.
//   {t, kind:'note', voice, hz, dur, gain}
//   {t, kind:'chord', hz:[...], dur, level}        (the strings pad)
//   {t, kind:'drum', drum}
export function buildTimeline(song) {
  const spb = 60 / song.bpm;
  const events = [];
  let beat0 = 0;
  const bassOf = (off) => {
    let hz = (song.key / 2) * Math.pow(2, (((off % 12) + 12) % 12) / 12);
    if (hz > song.key * 0.75) hz /= 2;
    return hz;
  };
  for (const sec of song.form) {
    const { chords, beats } = parseChords(song.parts[sec.c].c);
    const level = sec.pad !== undefined ? sec.pad : 0.04;
    for (const ch of chords) {
      const root = bassOf(ch.off) * 2;
      const third = ch.kind === 'm' ? 3 : 4;
      const tones = ch.kind === 'p' ? [root, root * Math.pow(2, 7 / 12), root * 2]
        : [root, root * Math.pow(2, 7 / 12), root * Math.pow(2, (12 + third) / 12)];
      events.push({ t: (beat0 + ch.beat) * spb, kind: 'chord', hz: tones, dur: ch.len * spb, level });
      if (sec.bass) {
        const hits = song.meter === 4 ? [0, 2] : [0];
        for (let b = 0; b < ch.len; b++) {
          const inBar = (beat0 + ch.beat + b) % song.meter;
          if (!hits.includes(inBar)) continue;
          events.push({ t: (beat0 + ch.beat + b) * spb, kind: 'note', voice: 'bass', hz: bassOf(ch.off), dur: Math.min(2, ch.len - b) * spb, gain: 0.085 });
        }
      }
      if (sec.harp) {
        // The harp walks the chord tones, one a beat, rising and falling.
        const walk = ch.kind === 'p' ? [0, 7, 12, 19, 12, 7] : [0, third, 7, 12, third + 12, 7];
        for (let b = 0; b < ch.len; b++) {
          const k = Math.round(beat0 + ch.beat + b);
          const semi = walk[k % walk.length];
          events.push({ t: (beat0 + ch.beat + b) * spb, kind: 'note', voice: sec.harp === 'oud' ? 'oudArp' : 'harp',
            hz: root * Math.pow(2, semi / 12), dur: 1.2 * spb, gain: 0.04 });
        }
      }
    }
    if (sec.drum) {
      const pat = song.drums[sec.drum];
      const step = song.meter / pat.length;
      for (let bar = 0; bar * song.meter < beats; bar++) {
        for (let s = 0; s < pat.length; s++) {
          if (pat[s] === '.') continue;
          events.push({ t: (beat0 + bar * song.meter + s * step) * spb, kind: 'drum', drum: pat[s] });
        }
      }
    }
    for (const [pn, voice, oct, lvl] of sec.m || []) {
      const { notes } = parseMelody(song.parts[pn].m);
      const shift = Math.pow(2, oct || 0);
      for (const n of notes) {
        events.push({ t: (beat0 + n.beat) * spb, kind: 'note', voice,
          hz: degreeHz(song.key, song.mode, n.deg, n.acc) * shift, dur: n.len * spb, gain: 0.09 * (lvl === undefined ? 1 : lvl) });
      }
    }
    beat0 += beats;
  }
  events.sort((a, b) => a.t - b.t);
  // The last chord rings a little past the bar line.
  return { events, duration: beat0 * spb + 2.5 };
}

// ---------------------------------------------------------------- the band --
// `out` is the song's own bus, `send` the reverb send, `noiseBuf` a second of
// white noise. Returns play(event, when).
export function createSongVoices(ac, out, send, noiseBuf) {
  // One oscillator with an envelope. env: 'pluck' decays over dur; 'hold'
  // swells to the peak, holds while the note lasts, and releases.
  function osc(o) {
    const t0 = o.t;
    const g = ac.createGain();
    const attack = o.attack || 0.005;
    const peak = Math.max(0.0002, o.gain);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    let end;
    if (o.env === 'hold') {
      const rel = o.release || 0.25;
      const holdEnd = Math.max(t0 + attack + 0.01, t0 + o.dur);
      g.gain.setTargetAtTime(peak * 0.8, t0 + attack, 0.15);
      g.gain.setValueAtTime(peak * 0.8, holdEnd);
      g.gain.exponentialRampToValueAtTime(0.0001, holdEnd + rel);
      end = holdEnd + rel;
    } else {
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + o.dur);
      end = t0 + attack + o.dur;
    }
    let tail = g;
    for (const f of o.filters || (o.lpf ? [{ type: 'lowpass', freq: o.lpf, q: o.q }] : [])) {
      const bq = ac.createBiquadFilter();
      bq.type = f.type;
      bq.frequency.value = f.freq;
      if (f.q !== undefined) bq.Q.value = f.q;
      tail.connect(bq);
      tail = bq;
    }
    tail.connect(out);
    if (o.send) {
      const s = ac.createGain();
      s.gain.value = o.send;
      tail.connect(s);
      s.connect(send);
    }
    const v = ac.createOscillator();
    v.type = o.type || 'triangle';
    v.frequency.setValueAtTime(o.glideFrom || o.hz, t0);
    if (o.glideFrom) v.frequency.exponentialRampToValueAtTime(o.hz, t0 + (o.glideDur || 0.15));
    if (o.glideTo) v.frequency.exponentialRampToValueAtTime(Math.max(1, o.glideTo), t0 + (o.glideDur || o.dur));
    if (o.detune) v.detune.value = o.detune;
    if (o.vibrato) {
      const lfo = ac.createOscillator();
      lfo.frequency.value = o.vibrato[0];
      const vg = ac.createGain();
      // the vibrato arrives after the note has spoken, as a player's does
      vg.gain.setValueAtTime(0, t0);
      vg.gain.linearRampToValueAtTime(o.vibrato[1], t0 + Math.min(0.35, o.dur * 0.6 + 0.05));
      lfo.connect(vg);
      vg.connect(v.detune);
      lfo.start(t0);
      lfo.stop(end + 0.05);
    }
    v.connect(g);
    v.start(t0);
    v.stop(end + 0.05);
  }

  function hiss(o) {
    const t0 = o.t;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.value = o.freq || 2000;
    f.Q.value = o.q !== undefined ? o.q : 1;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(o.gain, t0 + (o.attack || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (o.attack || 0.003) + o.dur);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    if (o.send) {
      const s = ac.createGain();
      s.gain.value = o.send;
      g.connect(s);
      s.connect(send);
    }
    src.start(t0);
    src.stop(t0 + (o.attack || 0.003) + o.dur + 0.05);
  }

  const voice = {
    kinnor(t, hz, dur, g) {
      const ring = Math.max(0.7, dur * 1.3);
      osc({ t, hz, dur: ring, gain: g, type: 'triangle', lpf: 2600, send: 0.5, detune: 3 });
      osc({ t, hz: hz * 2, dur: 0.35, gain: g * 0.2, type: 'sine', send: 0.4 });
    },
    harp(t, hz, dur, g) {
      osc({ t, hz, dur: Math.max(0.9, dur), gain: g, type: 'triangle', lpf: 2600, send: 0.6 });
    },
    oudArp(t, hz, dur, g) { voice.oud(t, hz, Math.min(dur, 0.5), g * 0.9); },
    oud(t, hz, dur, g) {
      const ring = Math.min(dur * 1.1, 0.9) + 0.2;
      osc({ t, hz, dur: ring, gain: g * 0.55, type: 'sawtooth', lpf: 1500, send: 0.35, detune: -4 });
      osc({ t, hz, dur: ring * 0.8, gain: g * 0.6, type: 'triangle', lpf: 2400, send: 0.3, detune: 4 });
      hiss({ t, dur: 0.02, gain: g * 0.25, type: 'highpass', freq: 3000, q: 0.7 });
    },
    flute(t, hz, dur, g) {
      osc({ t, hz, dur, gain: g, type: 'sine', env: 'hold', attack: 0.07, release: 0.18, send: 0.55, vibrato: [5, 10] });
      osc({ t, hz, dur, gain: g * 0.22, type: 'triangle', env: 'hold', attack: 0.07, release: 0.18, lpf: 2000 });
      hiss({ t, dur: 0.12, attack: 0.03, gain: g * 0.12, type: 'bandpass', freq: Math.min(hz * 2.2, 6000), q: 2.2 });
    },
    reed(t, hz, dur, g) {
      osc({ t, hz, dur, gain: g * 0.42, type: 'square', env: 'hold', attack: 0.04, release: 0.14, lpf: 1600, q: 0.8, send: 0.45, vibrato: [5.2, 9] });
      osc({ t, hz, dur, gain: g * 0.6, type: 'triangle', env: 'hold', attack: 0.04, release: 0.14, send: 0.4 });
      osc({ t, hz: hz / 2, dur, gain: g * 0.25, type: 'sine', env: 'hold', attack: 0.05, release: 0.14 });
    },
    horn(t, hz, dur, g) {
      osc({ t, hz, dur, gain: g * 0.55, type: 'sawtooth', env: 'hold', attack: 0.06, release: 0.2, lpf: 1500, send: 0.5, detune: -5, vibrato: [4.8, 7] });
      osc({ t, hz, dur, gain: g * 0.55, type: 'sawtooth', env: 'hold', attack: 0.07, release: 0.2, lpf: 1500, send: 0.5, detune: 5 });
      osc({ t, hz: hz / 2, dur, gain: g * 0.35, type: 'sine', env: 'hold', attack: 0.06, release: 0.2, send: 0.3 });
    },
    strings(t, hz, dur, g) {
      const attack = Math.min(0.28, dur * 0.4);
      for (const d of [-8, 0, 8]) {
        osc({ t, hz, dur, gain: g * 0.38, type: 'sawtooth', env: 'hold', attack, release: 0.4, lpf: 1700, send: 0.6, detune: d, vibrato: d === 0 ? [5, 6] : null });
      }
    },
    choir(t, hz, dur, g) {
      // an "ah": a sawtooth through the two formants of the open vowel
      const attack = Math.min(0.2, dur * 0.4);
      for (const d of [-6, 6]) {
        osc({ t, hz, dur, gain: g * 1.6, type: 'sawtooth', env: 'hold', attack, release: 0.45, detune: d, send: 0.7,
          vibrato: [4.6, 12], filters: [{ type: 'bandpass', freq: 730, q: 4 }, { type: 'lowpass', freq: 2600 }] });
        osc({ t, hz, dur, gain: g * 1.0, type: 'sawtooth', env: 'hold', attack, release: 0.45, detune: -d, send: 0.7,
          filters: [{ type: 'bandpass', freq: 1090, q: 6 }] });
      }
      osc({ t, hz, dur, gain: g * 0.3, type: 'sine', env: 'hold', attack, release: 0.45 });
    },
    shofar(t, hz, dur, g) {
      // the ram's horn: a blown sawtooth that sags in from below and wavers
      osc({ t, hz, dur, gain: g * 1.1, type: 'sawtooth', env: 'hold', attack: 0.09, release: 0.25, glideFrom: hz * 0.84, glideDur: 0.18,
        filters: [{ type: 'lowpass', freq: 1400, q: 2.5 }], send: 0.65, vibrato: [6.2, 16] });
      osc({ t, hz: hz * 2, dur, gain: g * 0.18, type: 'square', env: 'hold', attack: 0.12, release: 0.2, glideFrom: hz * 1.68, glideDur: 0.18, lpf: 2200, send: 0.5 });
    },
    bass(t, hz, dur, g) {
      osc({ t, hz, dur: Math.max(0.35, dur * 0.9), gain: g, type: 'triangle', lpf: 900 });
      osc({ t, hz: hz * 2, dur: 0.25, gain: g * 0.25, type: 'sine' });
    },
  };

  const drum = {
    D(t) { // doum
      osc({ t, hz: 50, glideFrom: 115, glideDur: 0.12, dur: 0.28, gain: 0.2, type: 'sine' });
      hiss({ t, dur: 0.05, gain: 0.05, type: 'lowpass', freq: 400, q: 0.7 });
    },
    T(t) { // tek
      hiss({ t, dur: 0.07, gain: 0.08, type: 'bandpass', freq: 2200, q: 1.4, send: 0.2 });
      osc({ t, hz: 520, dur: 0.05, gain: 0.03, type: 'sine' });
    },
    k(t) { hiss({ t, dur: 0.05, gain: 0.04, type: 'bandpass', freq: 2600, q: 1.6 }); },
    S(t) { // snare
      hiss({ t, dur: 0.12, gain: 0.085, type: 'bandpass', freq: 1800, q: 0.9, send: 0.25 });
      osc({ t, hz: 190, dur: 0.06, gain: 0.04, type: 'triangle' });
    },
    B(t) { // the big drum
      osc({ t, hz: 36, glideFrom: 82, glideDur: 0.3, dur: 0.6, gain: 0.3, type: 'sine' });
      hiss({ t, dur: 0.5, gain: 0.1, type: 'lowpass', freq: 160, q: 0.6, send: 0.3 });
    },
  };

  // The strings pad under a chord: three sawtooth voices through a soft
  // lowpass, overlapping the next chord so the change is a swell, not a cut.
  function pad(t, hzs, dur, level) {
    if (!(level > 0)) return;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 760;
    f.Q.value = 0.5;
    const g = ac.createGain();
    const end = t + dur + 0.6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + Math.min(0.6, dur * 0.5));
    g.gain.setValueAtTime(level, Math.max(t + 0.61, t + dur - 0.1));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    f.connect(g);
    g.connect(out);
    const s = ac.createGain();
    s.gain.value = 0.35;
    g.connect(s);
    s.connect(send);
    hzs.forEach((hz, i) => {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz;
      o.detune.value = (i - 1) * 5;
      const og = ac.createGain();
      og.gain.value = i === 0 ? 0.5 : 0.36;
      o.connect(og);
      og.connect(f);
      o.start(t);
      o.stop(end + 0.05);
    });
  }

  return function play(ev, t) {
    if (ev.kind === 'note') {
      const fn = voice[ev.voice];
      if (fn) fn(t, ev.hz, ev.dur, ev.gain);
    } else if (ev.kind === 'drum') {
      const fn = drum[ev.drum];
      if (fn) fn(t);
    } else if (ev.kind === 'chord') {
      pad(t, ev.hz, ev.dur, ev.level);
    }
  };
}

// A feedback-delay reverb like sound.js's own, for a context that has none
// (the offline renderer). Returns its input node; the wet goes to `dest`.
export function makeReverb(ac, dest) {
  const input = ac.createGain();
  const delay = ac.createDelay(0.5);
  delay.delayTime.value = 0.17;
  const fb = ac.createGain();
  fb.gain.value = 0.34;
  const damp = ac.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 2400;
  const wet = ac.createGain();
  wet.gain.value = 0.5;
  input.connect(delay);
  delay.connect(damp);
  damp.connect(fb);
  fb.connect(delay);
  damp.connect(wet);
  wet.connect(dest);
  return input;
}

export function makeNoise(ac) {
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = buf.getChannelData(0);
  // a fixed seed: the same song renders the same bytes
  let x = 0x2545f491;
  for (let i = 0; i < d.length; i++) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    d[i] = ((x >>> 0) / 4294967296) * 2 - 1;
  }
  return buf;
}
