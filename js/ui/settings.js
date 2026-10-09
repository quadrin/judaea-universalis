// js/ui/settings.js — the player's settings (SPEC §289).
//
// One small store, kept in this browser (`ju_settings`), that the sound, the
// notices, the autosave and the chrome read when they need a value — never a
// copy taken at boot, so a slider moved mid-campaign is heard on the next
// note. The two older switches keep their own keys (`ju_muted`, `ju_music`):
// sound.js owns them, saves from before this panel still find them, and the
// panel reads and writes them through window._sound like the tools sheet does.
//
// None of this is part of the game state: a save carries no settings, and a
// multiplayer table never sees another player's volume.
import { esc, warnOnce } from './format.js';
import { icon } from './icons.js';

const KEY = 'ju_settings';

export const SETTING_DEFAULTS = Object.freeze({
  master: 80,        // 0–100, the whole mix
  music: 70,         // 0–100, the score
  sfx: 80,           // 0–100, battles, bells, the quill
  clicks: true,      // the soft tick under every button
  song: 'auto',      // 'auto' (by the age and the mood) or a song id
  autosave: true,    // the January autosave
  toastSecs: 6,      // how long a notice stays up
  reduceMotion: false,
});

const TOAST_CHOICES = [[4, 'Short'], [6, 'Normal'], [10, 'Long']];

let cache = null;
const listeners = new Set();

function clampPct(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : d;
}

// Read once and repair: a hand-edited or older value falls back to its default.
function load() {
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { raw = {}; }
  const d = SETTING_DEFAULTS;
  return {
    master: clampPct(raw.master, d.master),
    music: clampPct(raw.music, d.music),
    sfx: clampPct(raw.sfx, d.sfx),
    clicks: typeof raw.clicks === 'boolean' ? raw.clicks : d.clicks,
    song: typeof raw.song === 'string' && raw.song ? raw.song : d.song,
    autosave: typeof raw.autosave === 'boolean' ? raw.autosave : d.autosave,
    toastSecs: TOAST_CHOICES.some(([s]) => s === raw.toastSecs) ? raw.toastSecs : d.toastSecs,
    reduceMotion: typeof raw.reduceMotion === 'boolean' ? raw.reduceMotion : d.reduceMotion,
  };
}

export function getSettings() {
  if (!cache) cache = load();
  return cache;
}

export function getSetting(k) { return getSettings()[k]; }

export function setSetting(k, v) {
  const s = getSettings();
  if (!(k in SETTING_DEFAULTS) || s[k] === v) return;
  s[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private window: this session only */ }
  if (k === 'reduceMotion') applyMotion();
  for (const fn of listeners) {
    try { fn(k, v); } catch (e) { warnOnce('settings:' + k, e); }
  }
}

export function onSettingChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Back to the defaults — the two sound switches included.
export function resetSettings() {
  for (const k of Object.keys(SETTING_DEFAULTS)) setSetting(k, SETTING_DEFAULTS[k]);
}

// Reduce motion is the operating system's switch or ours: either one stills
// the chrome (the CSS reads `html.ju-reduce-motion`).
function applyMotion() {
  try {
    document.documentElement.classList.toggle('ju-reduce-motion', !!getSettings().reduceMotion);
  } catch (e) { /* no document: the harness */ }
}
if (typeof document !== 'undefined') applyMotion();

// ------------------------------------------------------------------ panel --
// The settings window: a parchment card like the primer's, four sections.
// `songs` is the score's catalogue ([{id, title, age, mood, blurb}]) and is
// read each time the window opens, so the list is never out of date.
export function createSettingsPanel({ getSongs } = {}) {
  let el = null;

  function isOpen() { return !!el && !el.classList.contains('hidden'); }
  function close() { if (el) el.classList.add('hidden'); }

  function snd() { return window._sound || null; }
  function soundOn() {
    try { return localStorage.getItem('ju_muted') !== '1'; } catch (e) { return true; }
  }
  function musicOn() {
    const s = snd();
    try { return s && s.music ? !!s.music.state().on : true; } catch (e) { return true; }
  }

  function slider(key, label, hint) {
    const v = getSetting(key);
    return `<label class="st-row" data-tt="${esc(hint)}">
        <span class="st-label">${esc(label)}</span>
        <input class="st-range" type="range" min="0" max="100" step="1" value="${v}" data-set="${key}" aria-label="${esc(label)}">
        <span class="st-val" data-val="${key}">${v}</span>
      </label>`;
  }
  function toggle(id, label, on, hint) {
    return `<div class="st-row" data-tt="${esc(hint)}">
        <span class="st-label">${esc(label)}</span>
        <button class="st-switch${on ? ' on' : ''}" data-toggle="${id}" role="switch" aria-checked="${on}" aria-label="${esc(label)}"><span class="st-knob"></span></button>
      </div>`;
  }

  function songOptions() {
    let list = [];
    try { list = (getSongs && getSongs()) || []; } catch (e) { warnOnce('settings:songs', e); }
    const cur = getSetting('song');
    const opt = (id, title) => `<option value="${esc(id)}"${id === cur ? ' selected' : ''}>${esc(title)}</option>`;
    const ages = [];
    for (const s of list) if (!ages.includes(s.age)) ages.push(s.age);
    return opt('auto', 'By the age and the hour (automatic)')
      + opt('shuffle', 'Every song, shuffled')
      + ages.map((a) => `<optgroup label="${esc(a)}">`
        + list.filter((s) => s.age === a).map((s) => opt(s.id, s.title)).join('')
        + '</optgroup>').join('');
  }

  function nowPlaying() {
    const s = snd();
    let st = null;
    try { st = s && s.music && s.music.state(); } catch (e) { st = null; }
    if (!st || !st.started) return 'The score begins with your first click.';
    if (!st.on) return 'The music is off.';
    if (st.song) return 'Now playing: ' + st.song.title + (st.song.blurb ? ' — ' + st.song.blurb : '');
    return 'Now playing: the open score, between songs.';
  }

  function render() {
    const body = el.querySelector('[data-ref="stBody"]');
    const toast = getSetting('toastSecs');
    body.innerHTML = `
      <div class="st-sec">
        <div class="peace-sec">Sound</div>
        ${toggle('sound', 'Sound', soundOn(), 'Every sound in the game. Off is silence.')}
        ${slider('master', 'Main volume', 'The whole mix: the music and the effects together.')}
        ${slider('sfx', 'Effects volume', 'Battles, sieges, bells, the war horn, the quill.')}
        ${toggle('clicks', 'Button clicks', !!getSetting('clicks'), 'A soft tick under every button you press.')}
      </div>
      <div class="st-sec">
        <div class="peace-sec">Music</div>
        ${toggle('music', 'Music', musicOn(), 'The score. The effects stay on when it is off.')}
        ${slider('music', 'Music volume', 'The score only.')}
        <label class="st-row st-row-wide" data-tt="Automatic plays the songs of the current age, chosen by peace, war and battle, with the open score between them. Pick a song to hear only that song.">
          <span class="st-label">Song</span>
          <select class="st-select" data-set="song" aria-label="Song">${songOptions()}</select>
        </label>
        <div class="st-now"><span data-ref="stNow">${esc(nowPlaying())}</span>
          <button class="btn st-next" data-act="next" data-tt="Go to the next song now">${icon('play')}<span>Next song</span></button></div>
      </div>
      <div class="st-sec">
        <div class="peace-sec">Game</div>
        ${toggle('autosave', 'Yearly autosave', !!getSetting('autosave'), 'Each January the campaign saves itself to the autosave row. Your own saves are not touched.')}
        <div class="st-row" data-tt="How long a notice stays on the screen.">
          <span class="st-label">Notices stay</span>
          <span class="st-seg">${TOAST_CHOICES.map(([s, l]) =>
            `<button class="st-seg-btn${s === toast ? ' on' : ''}" data-toast="${s}">${l}</button>`).join('')}</span>
        </div>
      </div>
      <div class="st-sec">
        <div class="peace-sec">Display</div>
        ${toggle('reduceMotion', 'Reduce motion', !!getSetting('reduceMotion'), 'Stops the bells, pulses and slides of the interface. Your system setting does this too.')}
      </div>`;
  }

  function refreshNow() {
    const n = el && el.querySelector('[data-ref="stNow"]');
    if (n) n.textContent = nowPlaying();
  }

  function build() {
    el = document.createElement('div');
    el.id = 'settings-modal';
    el.className = 'hidden';
    el.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card peace-card st-card" role="dialog" aria-label="Settings">
        <h2 class="peace-title">Settings</h2>
        <div class="st-body" data-ref="stBody"></div>
        <div class="st-foot">
          <button class="btn st-reset" data-act="reset" data-tt="Put every setting back to how it was at first">Defaults</button>
          <button class="btn peace-cancel" data-act="close">Close</button>
        </div>
      </div>`;
    (document.getElementById('ui-root') || document.body).appendChild(el);
    el.querySelector('.modal-scrim').addEventListener('click', close);

    // Sliders speak as they move; the number beside them follows.
    el.addEventListener('input', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement) || !t.dataset.set) return;
      const v = clampPct(t.value, SETTING_DEFAULTS[t.dataset.set]);
      setSetting(t.dataset.set, v);
      const out = el.querySelector(`[data-val="${t.dataset.set}"]`);
      if (out) out.textContent = String(v);
    });
    el.addEventListener('change', (e) => {
      const t = e.target;
      if (t instanceof HTMLSelectElement && t.dataset.set === 'song') {
        setSetting('song', t.value);
        setTimeout(refreshNow, 60);
      } else if (t instanceof HTMLInputElement && t.dataset.set === 'sfx') {
        // let go of the effects slider: hear the level you chose
        try { const s = snd(); if (s) s.play('good'); } catch (err) { /* silent */ }
      }
    });
    el.addEventListener('click', (e) => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      const sw = t.closest('[data-toggle]');
      const seg = t.closest('[data-toast]');
      const act = t.closest('[data-act]');
      const s = snd();
      try {
        if (sw) {
          const k = sw.dataset.toggle;
          if (k === 'sound') { if (s) { if (soundOn()) s.mute(); else s.unmute(); } }
          else if (k === 'music') { if (s && s.music) s.music.toggle(); }
          else setSetting(k, !getSetting(k));
          render();
        } else if (seg) {
          setSetting('toastSecs', Number(seg.dataset.toast));
          render();
        } else if (act) {
          if (act.dataset.act === 'close') close();
          else if (act.dataset.act === 'reset') {
            resetSettings();
            if (s) { s.unmute(); if (s.music) s.music.on(); }
            render();
          } else if (act.dataset.act === 'next') {
            if (s && s.music && s.music.next) s.music.next();
            setTimeout(refreshNow, 60);
          }
        }
      } catch (err) { warnOnce('settings:click', err); }
    });
  }

  let nowTimer = 0;
  function open() {
    if (!el) build();
    render();
    el.classList.remove('hidden');
    if (!nowTimer) {
      nowTimer = setInterval(() => {
        if (!isOpen()) { clearInterval(nowTimer); nowTimer = 0; return; }
        refreshNow();
      }, 1000);
    }
  }
  function toggleOpen() { if (isOpen()) close(); else open(); }

  return { open, close, isOpen, toggle: toggleOpen };
}
