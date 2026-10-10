// Headless regression — SPEC §289: the settings store and the score's songs.
//
//   - every song's notation is sound: each bar holds its meter, each melody
//     is as long as the harmony it is played over, every voice and drum
//     pattern exists (validateSong);
//   - every timeline is in order, a song lasts one to three minutes, and no
//     note is pitched out of the band's range;
//   - every bookmark belongs to an age, and every age has a song for peace,
//     for war and for battle;
//   - every event of every song plays through the band on a stand-in audio
//     context without a throw, and every source that starts also stops;
//   - the settings store gives defaults with no storage, repairs a bad value,
//     keeps what it is given, and tells its listeners.
//   - SPEC §295: every song of peace has a war version: sound notation, the
//     same tune note for note in a war mode, quicker, open fifths on the same
//     roots moved into the war mode, a march under every section with a tune;
//     a war song is its own war version; the band plays every note of them.
//   - SPEC §296: a war version counts the same beats in the same meter as its
//     song, section for section (the war band takes up the tune at a beat).
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');

// A localStorage before the store loads: one good value, one bad, one junk.
const mem = new Map([['ju_settings', JSON.stringify({ music: 35, sfx: 'loud', song: 7, toastSecs: 5 })]]);
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
};

const { SONGS, SONG_AGES, songAgeOf, songCatalogue, warVersionOf, isWarSong, peaceVersionOf, MODES } = await import(R + '/js/data/songs.js');
const eng = await import(R + '/js/ui/song_engine.js');
const st = await import(R + '/js/ui/settings.js');
const { ERAS } = await import(R + '/js/data/compendium.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

console.log('== the notation ==');
ok(SONGS.length >= 10, SONGS.length + ' songs');
ok(new Set(SONGS.map((s) => s.id)).size === SONGS.length, 'every song id is its own');
for (const s of SONGS) {
  const errs = eng.validateSong(s);
  ok(errs.length === 0, s.id + ' is sound' + (errs.length ? ': ' + errs.slice(0, 3).join('; ') : ''));
}
// The checker catches what it is for.
{
  const bad = JSON.parse(JSON.stringify(SONGS[0]));
  bad.parts.A.m = bad.parts.A.m.replace('0:3 r:1', '0:3');
  bad.form.push({ c: 'A', m: [['A', 'lute', 0, 1]] });
  const errs = eng.validateSong(bad);
  ok(errs.some((e) => /bar 8 holds 3 beats/.test(e)), 'a short bar is caught');
  ok(errs.some((e) => /melody A is 31 beats, the harmony A is 32/.test(e)), 'a melody shorter than its harmony is caught');
  ok(errs.some((e) => /no voice lute/.test(e)), 'an instrument the band does not have is caught');
}

console.log('== the timelines ==');
for (const s of SONGS) {
  const tl = eng.buildTimeline(s);
  const sorted = tl.events.every((e, i) => i === 0 || tl.events[i - 1].t <= e.t);
  const notes = tl.events.filter((e) => e.kind === 'note');
  const range = notes.every((e) => e.hz >= 40 && e.hz <= 2000 && e.dur > 0 && e.gain > 0);
  const melody = notes.filter((e) => e.voice !== 'bass' && e.voice !== 'harp' && e.voice !== 'oudArp').length;
  ok(sorted && range && tl.duration >= 60 && tl.duration <= 180 && melody > 40,
    `${s.id}: ${tl.events.length} events, ${melody} melody notes, ${tl.duration.toFixed(0)} s, in order and in range`);
}
// A degree and its octave.
ok(Math.abs(eng.degreeHz(293.66, 'dorian', 7, 0) - 587.32) < 0.01, 'degree 7 is the octave');
ok(Math.abs(eng.degreeHz(220, 'minor', -1, 1) - 207.65) < 0.05, 'degree -1# below A minor is G sharp');

console.log('== the ages ==');
// Each bookmark is in the table, not left to the year fallback: asked with a
// nonsense year, only 1948 answers "the State".
for (const era of ERAS) {
  const id = era.bookmark.id;
  const age = songAgeOf(id, 5000);
  ok(!!SONG_AGES[age] && (age === 'state') === (id === '1948ce'), `${id} belongs to an age: ${age}`);
}
for (const age of Object.keys(SONG_AGES)) {
  for (const mood of ['peace', 'war', 'battle']) {
    const n = SONGS.filter((s) => s.ages.includes(age) && s.moods.includes(mood)).length;
    ok(n >= 1, `${SONG_AGES[age]} has ${n} song(s) for ${mood}`);
  }
}
const cat = songCatalogue();
ok(cat.length === SONGS.length && cat.every((c) => c.title && c.age && Object.values(SONG_AGES).includes(c.age)),
  'the catalogue names every song and its age');

console.log('== the war versions (SPEC §295) ==');
const WARS = SONGS.map((x) => warVersionOf(x));
for (const s of SONGS) {
  const w = warVersionOf(s);
  if (!s.moods.includes('peace')) {
    ok(w === s && isWarSong(s), `${s.id} is a war song, its own war version`);
    continue;
  }
  const errs = eng.validateSong(w);
  ok(w !== s && w.isWar && isWarSong(w) && !isWarSong(s) && peaceVersionOf(w) === s && w.id === s.id + '-war' && errs.length === 0,
    `${s.id} has a war version, "${w.title}"` + (errs.length ? ': ' + errs.slice(0, 2).join('; ') : ''));
  // the same tune: every melody keeps its notes, beats and degrees
  const same = Object.keys(s.parts).every((k) => !s.parts[k].m || s.parts[k].m === w.parts[k].m);
  ok(same && ['freygish', 'minor'].includes(w.mode) && w.bpm > s.bpm, `  the same tune, in ${w.mode}, at ${w.bpm} against ${s.bpm}`);
  // open fifths on the same roots, moved into the war mode
  let fifths = true;
  let rooted = true;
  for (const k of Object.keys(s.parts)) {
    if (!s.parts[k].c) continue;
    const a = eng.parseChords(s.parts[k].c).chords;
    const b = eng.parseChords(w.parts[k].c).chords;
    if (a.length !== b.length) { rooted = false; continue; }
    a.forEach((c, i) => {
      if (b[i].kind !== 'p' || b[i].len !== c.len) fifths = false;
      const pc = ((c.off % 12) + 12) % 12;
      const deg = MODES[s.mode].indexOf(pc);
      if (deg >= 0 && ((b[i].off % 12) + 12) % 12 !== MODES[w.mode][deg]) rooted = false;
    });
  }
  ok(fifths && rooted, '  open fifths on the same roots, moved by scale degree');
  const tl = eng.buildTimeline(w);
  const tuneSecs = w.form.filter((x) => (x.m || []).length);
  ok(tuneSecs.every((x) => x.drum && w.drums[x.drum]) && w.form.every((x) => x.drum),
    '  a march under every section, the edges tolling');
  ok(tl.duration >= 60 && tl.duration <= 180 && tl.sections.length === w.form.length,
    `  ${tl.duration.toFixed(0)} s, ${tl.sections.length} sections`);
  // SPEC §296: the war band takes the tune up at a beat of the song's form,
  // so the two must count the same beats in the same bars.
  const ps = eng.buildTimeline(s);
  ok(w.meter === s.meter && tl.beats === ps.beats && tl.sections.every((x, i) => Math.abs(x * w.bpm - ps.sections[i] * s.bpm) < 1e-6),
    `  the same ${tl.beats} beats in ${w.meter}, section for section`);
}
for (const age of Object.keys(SONG_AGES)) {
  const n = WARS.filter((x) => x.ages.includes(age)).length;
  const peace = SONGS.filter((x) => x.ages.includes(age) && x.moods.includes('peace')).length;
  ok(n >= peace + 1, `${SONG_AGES[age]} has ${n} pieces for war`);
}
ok(songCatalogue().filter((c) => c.warTitle).length === SONGS.filter((x) => x.war).length, 'the catalogue names each war version');

console.log('== the band plays every note ==');
{
  let started = 0;
  let stopped = 0;
  let badStop = 0;
  const param = () => ({
    value: 0,
    setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime(v) { if (!(v > 0)) throw new Error('exp ramp to ' + v); },
    setTargetAtTime() {},
  });
  const node = (extra) => ({ connect() {}, disconnect() {}, ...extra });
  const src = () => {
    let at = null;
    return node({
      frequency: param(), detune: param(), type: '', buffer: null, loop: false,
      start(t) { at = t; started++; }, stop(t) { stopped++; if (at === null || !(t > at)) badStop++; },
    });
  };
  const ac = {
    currentTime: 0, sampleRate: 8000,
    createGain: () => node({ gain: param() }),
    createBiquadFilter: () => node({ frequency: param(), Q: param(), type: '' }),
    createOscillator: src,
    createBufferSource: src,
    createDelay: () => node({ delayTime: param() }),
    createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }),
  };
  const out = node({});
  const verb = eng.makeReverb(ac, out);
  const play = eng.createSongVoices(ac, out, verb, eng.makeNoise(ac));
  let threw = null;
  for (const s of SONGS.concat(WARS.filter((w) => w.isWar))) {
    for (const ev of eng.buildTimeline(s).events) {
      try { play(ev, ev.t + 0.1); } catch (e) { threw = s.id + ': ' + e.message; break; }
    }
  }
  ok(!threw, 'no event throws' + (threw ? ': ' + threw : ''));
  ok(started > 5000 && started === stopped && badStop === 0,
    `every source that starts stops after it starts (${started} started, ${stopped} stopped)`);
}

console.log('== the settings store ==');
{
  const s = st.getSettings();
  ok(s.music === 35, 'a stored value is kept: music ' + s.music);
  ok(s.sfx === st.SETTING_DEFAULTS.sfx && s.song === 'auto' && s.toastSecs === 6,
    'bad values fall back to the defaults: sfx ' + s.sfx + ', song ' + s.song + ', notices ' + s.toastSecs);
  ok(s.master === 80 && s.clicks === true && s.autosave === true && s.reduceMotion === false, 'the rest are the defaults');
  const heard = [];
  const off = st.onSettingChange((k, v) => heard.push(k + '=' + v));
  st.setSetting('master', 25);
  st.setSetting('master', 25); // no change, no word
  st.setSetting('nonsense', 1); // not a setting
  st.setSetting('song', 'hammer');
  ok(heard.join(',') === 'master=25,song=hammer', 'listeners hear each real change once: ' + heard.join(','));
  const saved = JSON.parse(mem.get('ju_settings'));
  ok(saved.master === 25 && saved.song === 'hammer' && !('nonsense' in saved), 'the change is written down');
  st.resetSettings();
  ok(st.getSetting('master') === 80 && st.getSetting('song') === 'auto' && st.getSetting('music') === 70,
    'Defaults puts every value back');
  off();
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
