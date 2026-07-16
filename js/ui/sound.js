// js/ui/sound.js — synthesized Web Audio SFX + generative music (SPEC §27, §51).
// Zero assets: oscillators, filtered noise, envelopes, a light feedback-delay
// reverb — and a sweeping generative score: chord progressions on a warm
// string pad, a recurring heroic refrain (Hava Nagila takes its turn in
// 1948), harp arpeggios in the quiet stretches, drums that swell with the
// mood. Each age keeps its own lead voice — kinnor, reed, horns. All playback
// is a silent no-op until the first user gesture creates the AudioContext.

export function initSound(bus, getGame) {
  // ------------------------------------------------------------- state
  let ac = null;            // AudioContext (lazy)
  let master = null;        // master gain (~0.22)
  let muteGain = null;      // 1 or 0, after master
  let verbIn = null;        // reverb send input
  let noiseBuf = null;      // shared white-noise buffer
  let muted = false;
  let musicOn = true;
  try { muted = localStorage.getItem('ju_muted') === '1'; } catch (e) { /* ignore */ }
  try { musicOn = localStorage.getItem('ju_music') !== '0'; } catch (e) { /* ignore */ }

  let lastLoudAt = 0;                    // timestamp of last non-click cue
  const cooldowns = Object.create(null); // category -> last play time
  const COOLDOWN_MS = { click: 150, battle: 1200, siege: 1200, notify: 600, event: 500, war: 1500, fanfare: 400, save: 400, tick: 90, raid: 2000 };
  const warned = Object.create(null);
  const battleTags = new Map();          // provId -> Set of participant tags

  function warnOnce(key, e) {
    if (warned[key]) return;
    warned[key] = true;
    console.warn('[sound:' + key + ']', e);
  }

  function allow(cat) {
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const cd = COOLDOWN_MS[cat] || 0;
    if (cooldowns[cat] && t - cooldowns[cat] < cd) return false;
    cooldowns[cat] = t;
    return true;
  }

  function markLoud() {
    lastLoudAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  }

  // ------------------------------------------------------------- audio graph (lazy)
  function ensureCtx() {
    if (ac) {
      if (ac.state === 'suspended') { ac.resume().catch(() => {}); }
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.22;
    muteGain = ac.createGain();
    muteGain.gain.value = muted ? 0 : 1;
    master.connect(muteGain);
    muteGain.connect(ac.destination);

    // feedback-delay "reverb" bus: delay -> lowpass -> feedback, wet into master
    verbIn = ac.createGain();
    verbIn.gain.value = 1;
    const delay = ac.createDelay(0.5);
    delay.delayTime.value = 0.17;
    const fb = ac.createGain();
    fb.gain.value = 0.34;
    const damp = ac.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2400;
    const wet = ac.createGain();
    wet.gain.value = 0.5;
    verbIn.connect(delay);
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    damp.connect(wet);
    wet.connect(master);

    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    try { startMusic(); } catch (e) { warnOnce('music-start', e); }
    return true;
  }

  function unlock() {
    try { ensureCtx(); } catch (e) { warnOnce('unlock', e); }
  }
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });

  function ready() { return !!ac && ensureCtx(); }

  // ------------------------------------------------------------- primitives
  // Detuned oscillator pair with exponential-decay envelope.
  // opts: {freq, type, t (start), attack, dur, gain, detune (cents), glideTo, glideDur, lpf, send}
  function tone(opts) {
    const t0 = opts.t !== undefined ? opts.t : ac.currentTime;
    const type = opts.type || 'triangle';
    const attack = opts.attack !== undefined ? opts.attack : 0.005;
    const dur = opts.dur !== undefined ? opts.dur : 0.4;
    const peak = opts.gain !== undefined ? opts.gain : 0.5;
    const det = opts.detune !== undefined ? opts.detune : 4;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + dur);
    let out = g;
    if (opts.lpf) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.lpf;
      g.connect(f);
      out = f;
    }
    out.connect(master);
    if (opts.send) {
      const s = ac.createGain();
      s.gain.value = opts.send;
      out.connect(s);
      s.connect(verbIn);
    }
    const oscs = det > 0 ? [det, -det] : [0];
    for (const cents of oscs) {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(opts.freq, t0);
      if (opts.glideTo) {
        o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.glideTo), t0 + (opts.glideDur || dur));
      }
      o.detune.value = cents;
      const split = ac.createGain();
      split.gain.value = oscs.length > 1 ? 0.55 : 1;
      o.connect(split);
      split.connect(g);
      o.start(t0);
      o.stop(t0 + attack + dur + 0.1);
    }
  }

  // Filtered noise burst. opts: {t, dur, attack, gain, type ('lowpass'|'bandpass'|'highpass'),
  //   freq, freqEnd, q, send}
  function noise(opts) {
    const t0 = opts.t !== undefined ? opts.t : ac.currentTime;
    const dur = opts.dur !== undefined ? opts.dur : 0.3;
    const attack = opts.attack !== undefined ? opts.attack : 0.005;
    const peak = opts.gain !== undefined ? opts.gain : 0.3;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = opts.type || 'lowpass';
    f.frequency.setValueAtTime(opts.freq || 800, t0);
    if (opts.freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t0 + dur);
    f.Q.value = opts.q !== undefined ? opts.q : 0.8;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    if (opts.send) {
      const s = ac.createGain();
      s.gain.value = opts.send;
      g.connect(s);
      s.connect(verbIn);
    }
    src.start(t0);
    src.stop(t0 + attack + dur + 0.1);
  }

  const FIFTH = 1.4983; // just-ish perfect fifth ratio

  // ------------------------------------------------------------- sound recipes
  const sfx = {
    uiTick() {
      tone({ freq: 1800, type: 'sine', attack: 0.002, dur: 0.035, gain: 0.09, detune: 0 });
      noise({ dur: 0.02, gain: 0.03, type: 'bandpass', freq: 3000, q: 1.5 });
    },
    woodTick() {
      tone({ freq: 820, glideTo: 520, glideDur: 0.04, type: 'sine', attack: 0.002, dur: 0.06, gain: 0.28, detune: 0 });
      noise({ dur: 0.025, gain: 0.06, type: 'bandpass', freq: 1900, q: 3 });
    },
    eventCard() {
      // parchment whoosh
      noise({ dur: 0.38, attack: 0.06, gain: 0.16, type: 'lowpass', freq: 900, freqEnd: 180, q: 0.6 });
      // soft chime, two gentle partials
      const t = ac.currentTime + 0.1;
      tone({ t, freq: 880, type: 'sine', attack: 0.01, dur: 0.9, gain: 0.16, detune: 3, send: 0.5 });
      tone({ t, freq: 1318.5, type: 'sine', attack: 0.01, dur: 0.6, gain: 0.07, detune: 3, send: 0.5 });
    },
    battleStart() {
      // metallic clash: bright bandpass burst + inharmonic ringing partials
      noise({ dur: 0.22, attack: 0.003, gain: 0.4, type: 'bandpass', freq: 2600, freqEnd: 1400, q: 6, send: 0.35 });
      noise({ dur: 0.1, attack: 0.002, gain: 0.2, type: 'highpass', freq: 4000, q: 0.7 });
      const t = ac.currentTime + 0.01;
      const partials = [831, 1244, 1873, 2513];
      for (let i = 0; i < partials.length; i++) {
        tone({ t, freq: partials[i], type: 'sine', attack: 0.003, dur: 0.55 - i * 0.08, gain: 0.07, detune: 5, send: 0.4 });
      }
    },
    motif(dir) {
      // dir: 1 rising, -1 falling
      const seq = dir > 0 ? [293.66, 349.23, 440] : [440, 349.23, 293.66]; // D4 F4 A4
      for (let i = 0; i < seq.length; i++) {
        tone({
          t: ac.currentTime + i * 0.14, freq: seq[i], type: 'triangle',
          attack: 0.01, dur: 0.42, gain: 0.24, detune: 6, send: 0.35, lpf: 3200,
        });
      }
    },
    drumHit(fHi, fLo, dur, gainV) {
      tone({ freq: fHi || 130, glideTo: fLo || 48, glideDur: (dur || 0.35) * 0.7, type: 'sine', attack: 0.004, dur: dur || 0.35, gain: gainV !== undefined ? gainV : 0.7, detune: 0 });
      noise({ dur: 0.06, attack: 0.002, gain: 0.18, type: 'lowpass', freq: 400, q: 0.7 });
    },
    siegeStart() { sfx.drumHit(120, 44, 0.42, 0.75); },
    siegeEnd() {
      // low boom + rumble tail
      tone({ freq: 70, glideTo: 34, glideDur: 0.8, type: 'sine', attack: 0.005, dur: 1.3, gain: 0.8, detune: 0 });
      noise({ dur: 1.6, attack: 0.02, gain: 0.28, type: 'lowpass', freq: 160, freqEnd: 45, q: 0.6, send: 0.3 });
    },
    hornSwell() {
      // detuned saws, slow attack — D3 + A3
      const t = ac.currentTime;
      tone({ t, freq: 146.83, type: 'sawtooth', attack: 0.55, dur: 1.2, gain: 0.22, detune: 9, lpf: 1100, send: 0.45 });
      tone({ t: t + 0.08, freq: 220, type: 'sawtooth', attack: 0.6, dur: 1.1, gain: 0.13, detune: 9, lpf: 1300, send: 0.45 });
      sfx.drumHit(110, 40, 0.5, 0.5);
    },
    warCadence() {
      // resolving cadence: E-minorish colour falling home to open D fifth
      const t = ac.currentTime;
      for (const f of [164.81, 246.94, 329.63]) { // E3 B3 E4
        tone({ t, freq: f, type: 'triangle', attack: 0.06, dur: 0.5, gain: 0.14, detune: 6, lpf: 2200, send: 0.4 });
      }
      for (const f of [146.83, 220, 293.66]) {    // D3 A3 D4
        tone({ t: t + 0.55, freq: f, type: 'triangle', attack: 0.06, dur: 1.1, gain: 0.16, detune: 6, lpf: 2200, send: 0.5 });
      }
    },
    bellGood() {
      tone({ freq: 1046.5, type: 'sine', attack: 0.005, dur: 0.8, gain: 0.16, detune: 3, send: 0.5 });
      tone({ freq: 1046.5 * 2.61, type: 'sine', attack: 0.005, dur: 0.35, gain: 0.05, detune: 0, send: 0.5 });
    },
    thudBad() {
      tone({ freq: 150, glideTo: 70, glideDur: 0.12, type: 'triangle', attack: 0.004, dur: 0.28, gain: 0.5, detune: 0, lpf: 700 });
      noise({ dur: 0.05, gain: 0.1, type: 'lowpass', freq: 350, q: 0.7 });
    },
    drumSmall() { sfx.drumHit(190, 70, 0.22, 0.45); },
    infoTick() {
      tone({ freq: 1400, type: 'sine', attack: 0.002, dur: 0.06, gain: 0.1, detune: 0 });
    },
    fanfareWin() {
      // D Dorian, layered fifths: D4 E4 F4 A4 C5 D5
      const seq = [293.66, 329.63, 349.23, 440, 523.25, 587.33];
      const t0 = ac.currentTime + 0.05;
      for (let i = 0; i < seq.length; i++) {
        const t = t0 + i * 0.21;
        const last = i === seq.length - 1;
        const dur = last ? 1.6 : 0.5;
        tone({ t, freq: seq[i], type: 'triangle', attack: 0.015, dur, gain: 0.26, detune: 7, lpf: 3400, send: 0.55 });
        tone({ t, freq: seq[i] * FIFTH, type: 'sine', attack: 0.02, dur: dur * 0.9, gain: 0.11, detune: 5, send: 0.55 });
        if (last) tone({ t, freq: seq[i] / 2, type: 'sawtooth', attack: 0.04, dur: 1.6, gain: 0.1, detune: 8, lpf: 900, send: 0.5 });
      }
      sfx.drumHit(120, 46, 0.4, 0.55);
    },
    lamentLoss() {
      // slow descent by minor seconds: A4 -> Ab4 -> G4
      const seq = [440, 415.3, 392];
      const t0 = ac.currentTime + 0.05;
      for (let i = 0; i < seq.length; i++) {
        const t = t0 + i * 0.85;
        const last = i === seq.length - 1;
        tone({ t, freq: seq[i], type: 'triangle', attack: 0.25, dur: last ? 2.2 : 1.0, gain: 0.22, detune: 8, lpf: 1800, send: 0.6 });
        tone({ t, freq: seq[i] / 2, type: 'sine', attack: 0.3, dur: last ? 2.2 : 1.0, gain: 0.12, detune: 0, send: 0.5 });
      }
    },
    quillScratch() {
      // a few shaped high-noise grains
      const t0 = ac.currentTime;
      const grains = [[0, 0.07], [0.09, 0.05], [0.17, 0.1], [0.3, 0.06]];
      for (const [off, dur] of grains) {
        noise({ t: t0 + off, dur, attack: 0.01, gain: 0.12, type: 'bandpass', freq: 3400 + off * 2000, q: 2.2 });
      }
    },
    airRaid() {
      // engines droning in, a falling whistle, three bombs walking the target
      const t = ac.currentTime;
      tone({ t, freq: 88, type: 'sawtooth', attack: 0.18, dur: 1.25, gain: 0.10, detune: 9, lpf: 420 });
      tone({ t, freq: 66, type: 'sawtooth', attack: 0.18, dur: 1.25, gain: 0.08, detune: 7, lpf: 360 });
      tone({ t: t + 0.5, freq: 1400, glideTo: 260, glideDur: 0.55, type: 'sine', attack: 0.03, dur: 0.6, gain: 0.06 });
      for (let i = 0; i < 3; i++) {
        const bt = t + 0.95 + i * 0.24;
        noise({ t: bt, dur: 0.4, attack: 0.004, gain: 0.3, type: 'lowpass', freq: 900, freqEnd: 130, q: 0.7, send: 0.5 });
        tone({ t: bt, freq: 72, glideTo: 34, glideDur: 0.3, type: 'sine', attack: 0.004, dur: 0.42, gain: 0.26 });
      }
    },
  };

  // ------------------------------------------------------------- music (SPEC §27, §51)
  // A sweeping generative score: slow chord progressions on a warm string
  // pad (no static drone), a recurring heroic refrain, harp arpeggios in the
  // quiet stretches, drums that swell with the mood. The Jewish identity
  // lives in the modes — peace speaks Adonai Malakh (the majestic synagogue
  // mode, major with a flat seventh), war Freygish (Ahava Rabbah) — and in
  // each age's lead voice:
  //   'lyre'    (167 BCE – 66 CE): kinnor plucks doubled by a soft horn.
  //   'klezmer' (132 – 614):       a warm, gently breathing reed.
  //   'hora'    (1948):            a horn ensemble — and Hava Nagila (the
  //             traditional nigun) returns as an occasional refrain rather
  //             than a loop; a military snare underlines the war.
  const MODES = {
    dorian: [0, 2, 3, 5, 7, 9, 10],
    freygish: [0, 1, 4, 5, 7, 8, 10],       // Ahava Rabbah
    adonai: [0, 2, 4, 5, 7, 9, 10],         // Adonai Malakh — major, flat 7
  };
  // The Hava Nagila refrain (freygish degrees, eighth grid, null = rest).
  const HORA_TUNE = [
    0, null, 1, 2, 3, null, 3, null, 4, 3, 2, 3, 2, 1, null, null,
    0, null, 1, 2, 3, null, 3, null, 4, 3, 2, 1, 0, null, null, null,
  ];
  // The heroic refrain (scale degrees, one per beat; 7 = the octave): a
  // rising arpeggio sweep, a settling answer, the sweep again, a high close.
  const THEME = [0, 2, 4, 7, 5, 4, 2, 4, 0, 2, 4, 7, 8, 7, null, null];
  // Chord progressions (semitone offset from D, minor?) — one chord per two
  // bars. Peace strides I–bVII–IV–I; war marches i–bVI–bVII–i; battle surges
  // on the phrygian second.
  const PROGS = {
    peace: [[0, false], [-2, false], [5, false], [0, false]],
    war: [[0, true], [8, false], [10, false], [0, true]],
    battle: [[0, true], [1, false], [10, false], [0, true]],
  };
  const CHORD_BEATS = 8;
  const MUSIC_LVL = 0.55;   // into master (which already sits at ~0.22)
  const mus = {
    started: false,
    gain: null, droneGain: null, droneFilter: null, droneOscs: [],
    padVoices: [],          // [{osc, gain}] — root, fifth, third of the chord
    timer: null,
    nextBeat: 0, beat: 0,
    mood: 'peace', era: 'antique', style: 'lyre',
    chordIdx: -1,           // which chord of the progression is sounding
    themePos: -1,           // -1 = between refrains; else index into the tune
    refrainIn: 18,          // beats until the next refrain begins
    horaTurn: 0,            // 1948 alternates the heroic theme and the hora
    arpStep: 0,             // harp arpeggio position on the chord tones
    notes: 0,               // debug counter (tests read this)
  };

  function noteHz(rootHz, mode, degree) {
    const scale = MODES[mode] || MODES.dorian;
    const oct = Math.floor(degree / scale.length);
    const semi = scale[((degree % scale.length) + scale.length) % scale.length];
    return rootHz * Math.pow(2, oct + semi / 12);
  }

  // Which age sings (SPEC §48): by bookmark, falling back to the year.
  const STYLE_BY_BOOKMARK = {
    '167bce': 'lyre', '67bce': 'lyre', '40bce': 'lyre', '66ce': 'lyre',
    '132ce': 'klezmer', '614ce': 'klezmer',
    '1948ce': 'hora',
  };

  function pollMood() {
    let mood = 'peace';
    let era = 'antique';
    let style = 'lyre';
    try {
      const g = getGame ? getGame() : null;
      if (g) {
        era = g.date.y >= 1900 ? 'modern' : g.date.y >= 500 ? 'medieval' : 'antique';
        style = STYLE_BY_BOOKMARK[g.bookmarkId]
          || (era === 'modern' ? 'hora' : era === 'medieval' ? 'klezmer' : 'lyre');
        const me = g.playerTag;
        const t = g.tags && g.tags[me];
        const inBattle = (g.battles || []).some((b) =>
          [].concat(b.atk || [], b.def || []).some((id) => {
            const a = g.armies && g.armies[id];
            return a && a.tag === me;
          }));
        if (inBattle) mood = 'battle';
        else if (t && (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive)) mood = 'war';
      }
    } catch (e) { warnOnce('mood', e); }
    mus.mood = mood;
    mus.era = era;
    mus.style = style;
  }

  function musTone(opts) {
    // like tone(), but into the music bus
    const t0 = opts.t !== undefined ? opts.t : ac.currentTime;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(opts.gain || 0.1, t0 + (opts.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.attack || 0.005) + (opts.dur || 0.8));
    let out = g;
    if (opts.lpf) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.lpf;
      g.connect(f);
      out = f;
    }
    out.connect(mus.gain);
    if (opts.send) {
      const s = ac.createGain();
      s.gain.value = opts.send;
      out.connect(s);
      s.connect(verbIn);
    }
    const o = ac.createOscillator();
    o.type = opts.type || 'triangle';
    o.frequency.setValueAtTime(opts.freq, t0);
    if (opts.glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.glideTo), t0 + (opts.glideDur || opts.dur || 0.4));
    if (opts.detune) o.detune.value = opts.detune;
    if (opts.vibrato) { // {hz, cents} — the clarinet breathes (SPEC §48)
      const lfo = ac.createOscillator();
      lfo.frequency.value = opts.vibrato.hz || 5.5;
      const vg = ac.createGain();
      vg.gain.value = opts.vibrato.cents || 12;
      lfo.connect(vg);
      vg.connect(o.detune);
      lfo.start(t0);
      lfo.stop(t0 + (opts.attack || 0.005) + (opts.dur || 0.8) + 0.1);
    }
    o.connect(g);
    o.start(t0);
    o.stop(t0 + (opts.attack || 0.005) + (opts.dur || 0.8) + 0.1);
    mus.notes++;
  }

  function musNoise(opts) {
    const t0 = opts.t !== undefined ? opts.t : ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = opts.type || 'bandpass';
    f.frequency.value = opts.freq || 2000;
    f.Q.value = opts.q !== undefined ? opts.q : 1;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(opts.gain || 0.05, t0 + (opts.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.attack || 0.004) + (opts.dur || 0.08));
    src.connect(f);
    f.connect(g);
    g.connect(mus.gain);
    src.start(t0);
    src.stop(t0 + (opts.attack || 0.004) + (opts.dur || 0.08) + 0.1);
  }

  function startMusic() {
    if (mus.started || !ac) return;
    mus.started = true;
    mus.gain = ac.createGain();
    mus.gain.gain.value = musicOn ? MUSIC_LVL : 0;
    mus.gain.connect(master);

    // The string pad: three persistent voices (root, fifth, third) that
    // glide between chords through a slow-breathing lowpass — a section,
    // not a drone. The progression sequencer retunes them every two bars.
    mus.droneGain = ac.createGain();
    mus.droneGain.gain.value = 0.05;
    mus.droneFilter = ac.createBiquadFilter();
    mus.droneFilter.type = 'lowpass';
    mus.droneFilter.frequency.value = 640;
    mus.droneFilter.Q.value = 0.6;
    mus.droneFilter.connect(mus.droneGain);
    mus.droneGain.connect(mus.gain);
    for (const [hz, level] of [[73.42, 1], [110, 0.7], [92.5, 0.55]]) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz;
      o.detune.value = (Math.random() * 8) - 4;
      const og = ac.createGain();
      og.gain.value = level * 0.5;
      o.connect(og);
      og.connect(mus.droneFilter);
      o.start();
      mus.droneOscs.push(o);
      mus.padVoices.push({ osc: o, gain: og, level });
    }
    // A very slow LFO breathes the pad's filter.
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain);
    lfoGain.connect(mus.droneFilter.frequency);
    lfo.start();

    mus.nextBeat = ac.currentTime + 0.2;
    mus.timer = setInterval(scheduleAhead, 200);
  }

  function scheduleAhead() {
    if (!ac || !musicOn || muted) return;
    try {
      pollMood();
      // after a mute/toggle, resume from now — never burst-schedule the gap
      if (mus.nextBeat < ac.currentTime) mus.nextBeat = ac.currentTime + 0.1;
      const horizon = ac.currentTime + 0.6;
      while (mus.nextBeat < horizon) {
        const beatDur = mus.mood === 'battle' ? 0.44 : mus.mood === 'war' ? 0.52 : 0.66;
        scheduleBeat(mus.nextBeat, mus.beat++, beatDur);
        mus.nextBeat += beatDur;
      }
    } catch (e) { warnOnce('sched', e); }
  }

  // The progression sequencer: retune the pad to the mood's current chord.
  function tuneChord(t, mood, chordIdx) {
    const prog = PROGS[mood] || PROGS.peace;
    const [off, minor] = prog[chordIdx % prog.length];
    const root = 73.42 * Math.pow(2, off / 12); // around D2
    const targets = [root, root * Math.pow(2, 7 / 12), root * Math.pow(2, (minor ? 3 : 4) / 12) * 2];
    for (let v = 0; v < mus.padVoices.length; v++) {
      const pv = mus.padVoices[v];
      try { pv.osc.frequency.setTargetAtTime(targets[v] || root, t, 0.5); }
      catch (e) { pv.osc.frequency.value = targets[v] || root; }
    }
    return { off, minor, root };
  }

  // The lead: each age's voice, warm and unhurried — no squares, no sobbing.
  function leadNote(t, hz, dur, gain, style) {
    if (style === 'lyre') {
      musTone({ t, freq: hz, type: 'triangle', attack: 0.005, dur: dur * 1.15, gain, lpf: 2400, send: 0.5, detune: 3 });
      musTone({ t, freq: hz / 2, type: 'sawtooth', attack: 0.09, dur, gain: gain * 0.45, lpf: 950, send: 0.55, vibrato: { hz: 4.4, cents: 7 } });
    } else if (style === 'klezmer') {
      musTone({ t, freq: hz, type: 'triangle', attack: 0.05, dur, gain, lpf: 2100, send: 0.5, vibrato: { hz: 5, cents: 9 } });
      musTone({ t, freq: hz / 2, type: 'sine', attack: 0.05, dur, gain: gain * 0.5, send: 0.35 });
    } else {
      musTone({ t, freq: hz, type: 'sawtooth', attack: 0.07, dur, gain: gain * 0.7, lpf: 1500, send: 0.55, detune: -5, vibrato: { hz: 4.8, cents: 8 } });
      musTone({ t, freq: hz, type: 'sawtooth', attack: 0.07, dur, gain: gain * 0.7, lpf: 1500, send: 0.55, detune: 5 });
      musTone({ t, freq: hz / 2, type: 'sine', attack: 0.06, dur, gain: gain * 0.4, send: 0.3 });
    }
  }

  function scheduleBeat(t, i, beatDur) {
    const mood = mus.mood;
    const style = mus.style;
    const mode = mood === 'peace' ? 'adonai' : 'freygish';
    // the piece breathes, gently — swells, never dead air
    const breath = 0.75 + 0.25 * Math.sin(i / 24);

    // ---- harmony: one chord per two bars, pads swelling with the mood ----
    const chordIdx = (i / CHORD_BEATS) | 0;
    let chord = null;
    if (chordIdx !== mus.chordIdx) {
      mus.chordIdx = chordIdx;
      chord = tuneChord(t, mood, chordIdx);
    }
    const padTarget = (mood === 'battle' ? 0.085 : mood === 'war' ? 0.068 : 0.052) * breath;
    mus.droneGain.gain.setTargetAtTime(padTarget, t, 1.2);
    mus.droneFilter.frequency.setTargetAtTime(mood === 'peace' ? 680 : mood === 'war' ? 500 : 580, t, 1.5);

    const prog = PROGS[mood] || PROGS.peace;
    const [chordOff, chordMinor] = prog[chordIdx % prog.length];
    const chordRootHz = 146.83 * Math.pow(2, chordOff / 12); // D3 region

    // ---- the refrain: the heroic theme returns; 1948 alternates the hora ----
    if (mus.themePos >= 0) {
      const horaRefrain = style === 'hora' && (mus.horaTurn % 2 === 1);
      if (horaRefrain) {
        for (const half of [0, 1]) {
          const slot = mus.themePos * 2 + half;
          if (slot < HORA_TUNE.length) {
            const deg = HORA_TUNE[slot];
            if (deg !== null) leadNote(t + half * beatDur * 0.5, noteHz(293.66, 'freygish', deg), beatDur * 0.6, 0.075, style);
          }
        }
        mus.themePos++;
        if (mus.themePos * 2 >= HORA_TUNE.length) mus.themePos = -1;
      } else {
        const deg = THEME[mus.themePos];
        if (deg !== null) {
          leadNote(t, noteHz(293.66, mode, deg), beatDur * 1.5, mood === 'battle' ? 0.11 : 0.09, style);
        }
        mus.themePos++;
        if (mus.themePos >= THEME.length) mus.themePos = -1;
      }
      if (mus.themePos === -1) {
        mus.horaTurn++;
        mus.refrainIn = mood === 'battle' ? 16 + ((Math.random() * 8) | 0)
          : mood === 'war' ? 28 + ((Math.random() * 12) | 0)
            : 44 + ((Math.random() * 28) | 0);
      }
    } else if (--mus.refrainIn <= 0) {
      mus.themePos = 0;
    }

    // ---- the quiet texture: harp arpeggios on the chord tones ----
    const arpChance = (mus.themePos >= 0 ? 0.18 : mood === 'peace' ? 0.5 : 0.34) * breath;
    if (Math.random() < arpChance) {
      const tones = [0, chordMinor ? 3 : 4, 7, 12, chordMinor ? 15 : 16];
      mus.arpStep = (mus.arpStep + 1 + ((Math.random() * 2) | 0)) % tones.length;
      const hz = chordRootHz * 2 * Math.pow(2, tones[mus.arpStep] / 12);
      musTone({ t: t + (Math.random() < 0.35 ? beatDur * 0.5 : 0), freq: hz, type: 'triangle', attack: 0.004, dur: 1.0, gain: 0.05 * breath + 0.015, lpf: 2600, send: 0.55 });
    }

    // ---- the low pulse and the drums ----
    const bar = i % 4;
    if (mood !== 'peace') {
      if (bar === 0 || (mood === 'battle' && bar === 2)) {
        musTone({ t, freq: chordRootHz / 2, type: 'sine', attack: 0.008, dur: 0.4, gain: mood === 'battle' ? 0.13 : 0.1 });
      }
      if (style === 'hora') {
        if (bar === 0) musTone({ t, freq: 105, glideTo: 42, glideDur: 0.16, type: 'sine', attack: 0.004, dur: 0.2, gain: 0.2 });
        if (bar === 1 || bar === 3 || mood === 'battle') {
          musNoise({ t, type: 'bandpass', freq: 1800, q: 0.9, attack: 0.002, dur: 0.11, gain: bar === 3 ? 0.07 : 0.04 });
        }
      } else {
        if (bar === 0) musTone({ t, freq: 100, glideTo: 40, glideDur: 0.2, type: 'sine', attack: 0.004, dur: 0.3, gain: mood === 'battle' ? 0.24 : 0.18 });
        if (bar === 2) musTone({ t, freq: 92, glideTo: 44, glideDur: 0.16, type: 'sine', attack: 0.004, dur: 0.2, gain: mood === 'battle' ? 0.16 : 0.09 });
        if (mood === 'battle' && (bar === 1 || bar === 3)) {
          musNoise({ t, type: 'bandpass', freq: 3000, q: 2.5, attack: 0.002, dur: 0.05, gain: 0.03 });
        }
      }
    }
  }

  function setMusicOn(v) {
    musicOn = !!v;
    try { localStorage.setItem('ju_music', musicOn ? '1' : '0'); } catch (e) { /* ignore */ }
    if (mus.gain && ac) {
      try { mus.gain.gain.setTargetAtTime(musicOn ? MUSIC_LVL : 0, ac.currentTime, 0.4); }
      catch (e) { mus.gain.gain.value = musicOn ? MUSIC_LVL : 0; }
    }
    if (musicBtn) applyMusicBtn();
  }

  // named access for debugging / other modules
  const byName = {
    click: () => sfx.uiTick(),
    tick: () => sfx.woodTick(),
    event: () => sfx.eventCard(),
    battleStart: () => sfx.battleStart(),
    battleWin: () => sfx.motif(1),
    battleLoss: () => sfx.motif(-1),
    siegeStart: () => sfx.siegeStart(),
    siegeEnd: () => sfx.siegeEnd(),
    war: () => sfx.hornSwell(),
    warEnd: () => sfx.warCadence(),
    good: () => sfx.bellGood(),
    bad: () => sfx.thudBad(),
    notifyWar: () => sfx.drumSmall(),
    info: () => sfx.infoTick(),
    win: () => sfx.fanfareWin(),
    loss: () => sfx.lamentLoss(),
    save: () => sfx.quillScratch(),
  };

  function play(name) {
    if (!ready()) return;
    const fn = byName[name];
    if (!fn) return;
    try { fn(); } catch (e) { warnOnce('play:' + name, e); }
  }

  function playerTag() {
    try {
      const g = getGame ? getGame() : null;
      return g ? g.playerTag : null;
    } catch (e) { warnOnce('getGame', e); return null; }
  }

  // ------------------------------------------------------------- bus wiring
  function on(ev, cat, fn) {
    bus.on(ev, (payload) => {
      if (!ready()) return;
      if (cat && !allow(cat)) return;
      try { fn(payload); markLoud(); } catch (e) { warnOnce(ev, e); }
    });
  }

  on('event', 'event', () => { sfx.eventCard(); });

  on('battleStart', 'battle', (p) => {
    // remember participants so battleEnd can tell whether WE were in it
    try {
      const g = getGame ? getGame() : null;
      if (g && p && p.prov !== undefined) {
        const b = (g.battles || []).find((x) => x.prov === p.prov);
        if (b) {
          const tags = new Set();
          for (const id of [].concat(b.atk || [], b.def || [])) {
            const a = g.armies && g.armies[id];
            if (a && a.tag) tags.add(a.tag);
          }
          battleTags.set(p.prov, tags);
        }
      }
    } catch (e) { warnOnce('battleTags', e); }
    sfx.battleStart();
  });

  on('battleEnd', 'battle', (p) => {
    const me = playerTag();
    const tags = p && battleTags.get(p.prov);
    if (p) battleTags.delete(p.prov);
    if (!me) return;
    const winner = p ? p.winnerTag : null;
    if (winner === me) { sfx.motif(1); return; }
    const involved = tags ? tags.has(me) : false;
    if (involved) { sfx.motif(-1); return; }
    // player not involved: stay quiet
  });

  on('siegeStart', 'siege', () => { sfx.siegeStart(); });
  on('siegeEnd', 'siege', () => { sfx.siegeEnd(); });

  on('war', 'war', (p) => {
    if (p && p.ended) sfx.warCadence();
    else sfx.hornSwell();
  });

  on('notify', 'notify', (p) => {
    const type = p && p.type;
    if (type === 'good') sfx.bellGood();
    else if (type === 'bad') sfx.thudBad();
    else if (type === 'war') sfx.drumSmall();
    else sfx.infoTick();
  });

  on('gameover', 'fanfare', (p) => {
    if (p && p.result === 'win') sfx.fanfareWin();
    else sfx.lamentLoss();
  });

  on('saveRequest', 'save', () => { sfx.quillScratch(); });
  on('pause', 'tick', () => { sfx.woodTick(); });
  on('speed', 'tick', () => { sfx.woodTick(); });
  on('tagSwitched', 'fanfare', () => { sfx.fanfareWin(); }); // a new banner rises (SPEC §25)

  // Bombing raids (SPEC §30): heard when our wings fly or our ground is hit.
  on('airRaid', 'raid', (p) => {
    const me = playerTag();
    if (!me || !p) return;
    if (p.tag === me || p.victimTag === me) sfx.airRaid();
  });

  // very soft tick for any <button> click, unless a louder cue just played
  window.addEventListener('click', (e) => {
    try {
      if (!ac) return; // context not unlocked yet
      const t = e.target;
      if (!t || !t.closest || !t.closest('button')) return;
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (now - lastLoudAt < 280) return;
      if (!allow('click')) return;
      if (!ready()) return;
      sfx.uiTick();
    } catch (err) { warnOnce('clickTick', err); }
  }, true);

  // ------------------------------------------------------------- mute button
  const SVG_ON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M11 5 6.5 9H3v6h3.5L11 19V5z" fill="currentColor" stroke="none"/>' +
    '<path d="M15 9.5a3.5 3.5 0 0 1 0 5"/><path d="M17.5 7a7 7 0 0 1 0 10"/></svg>';
  const SVG_OFF =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M11 5 6.5 9H3v6h3.5L11 19V5z" fill="currentColor" stroke="none"/>' +
    '<path d="M15.5 9.5 20 14"/><path d="M20 9.5 15.5 14"/></svg>';

  const SVG_NOTE =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M9 18V6l10-2v11.5"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor" stroke="none"/>' +
    '<circle cx="16.5" cy="15.5" r="2.5" fill="currentColor" stroke="none"/></svg>';

  let btn = null;
  let musicBtn = null;
  function applyMusicBtn() {
    if (!musicBtn) return;
    musicBtn.innerHTML = SVG_NOTE;
    musicBtn.title = musicOn ? 'Music on — click to silence the lyre' : 'Music off — click for the lyre';
    musicBtn.setAttribute('aria-label', musicBtn.title);
    musicBtn.classList.toggle('ju-sound-muted', !musicOn);
  }
  function applyMute() {
    if (muteGain) {
      try { muteGain.gain.setTargetAtTime(muted ? 0 : 1, ac.currentTime, 0.01); }
      catch (e) { muteGain.gain.value = muted ? 0 : 1; }
    }
    try { localStorage.setItem('ju_muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (btn) {
      btn.innerHTML = muted ? SVG_OFF : SVG_ON;
      btn.title = muted ? 'Unmute (sound off)' : 'Mute (sound on)';
      btn.setAttribute('aria-label', btn.title);
      btn.classList.toggle('ju-sound-muted', muted);
    }
  }
  function setMuted(v) { muted = !!v; applyMute(); }

  function buildButton() {
    try {
      const style = document.createElement('style');
      style.textContent =
        '#ju-sound-btn,#ju-music-btn{position:fixed;left:12px;z-index:9999;width:34px;height:34px;' +
        'display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;' +
        'pointer-events:auto;color:#c9a227;border:1px solid #c9a227;border-radius:6px;' +
        'background:linear-gradient(180deg,#2a2118,#1d1710);' +
        'box-shadow:0 2px 6px rgba(0,0,0,.55),inset 0 1px 0 rgba(201,162,39,.18);}' +
        '#ju-sound-btn{bottom:12px;}#ju-music-btn{bottom:52px;}' +
        '#ju-sound-btn:hover,#ju-music-btn:hover{color:#e8dcc0;border-color:#e0c25a;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.6),0 0 8px rgba(201,162,39,.35),inset 0 1px 0 rgba(201,162,39,.25);}' +
        '#ju-sound-btn.ju-sound-muted,#ju-music-btn.ju-sound-muted{color:#7a6a45;border-color:#6e5c33;}' +
        '#ju-sound-btn svg,#ju-music-btn svg{display:block;}';
      document.head.appendChild(style);

      btn = document.createElement('button');
      btn.id = 'ju-sound-btn';
      btn.type = 'button';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setMuted(!muted);
        if (!muted) play('tick');
      });
      const root = document.getElementById('ui-root') || document.body;
      root.appendChild(btn);
      applyMute();

      musicBtn = document.createElement('button');
      musicBtn.id = 'ju-music-btn';
      musicBtn.type = 'button';
      musicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        try { ensureCtx(); } catch (err) { warnOnce('musicBtn', err); }
        setMusicOn(!musicOn);
      });
      root.appendChild(musicBtn);
      applyMusicBtn();
    } catch (e) { warnOnce('button', e); }
  }
  if (document.body) buildButton();
  else document.addEventListener('DOMContentLoaded', buildButton, { once: true });

  // ------------------------------------------------------------- debug handle
  window._sound = {
    play,
    mute() { setMuted(true); },
    unmute() { setMuted(false); },
    music: {
      on() { setMusicOn(true); },
      off() { setMusicOn(false); },
      toggle() { setMusicOn(!musicOn); },
      state() { return { on: musicOn, started: mus.started, mood: mus.mood, era: mus.era, style: mus.style, notes: mus.notes }; },
    },
  };

  return window._sound;
}
