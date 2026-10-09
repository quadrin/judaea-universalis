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
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');

// A localStorage before the store loads: one good value, one bad, one junk.
const mem = new Map([['ju_settings', JSON.stringify({ music: 35, sfx: 'loud', song: 7, toastSecs: 5 })]]);
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
};

const { SONGS, SONG_AGES, songAgeOf, songCatalogue } = await import(R + '/js/data/songs.js');
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
  for (const s of SONGS) {
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
