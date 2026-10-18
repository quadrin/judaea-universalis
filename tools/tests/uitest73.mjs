// Music boost: real Settings controls, saved levels and live Web Audio gains.
// This exercises the same settings panel and sound engine without a map boot.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/usr/bin/chromium',
  args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/favicon.ico', r => r.fulfill({ status: 204, body: '' }));
  const base = process.env.JU_BASE_URL || 'http://127.0.0.1:8641/';
  await page.goto(base + 'tools/flags.html');
  await page.evaluate(() => localStorage.clear());
  async function boot() {
    await page.evaluate(async () => {
      document.body.innerHTML = '<div id="ui-root"></div>';
      // Tap the output to confirm there really is audible audio at boost.
      const NativeAudioContext = window.AudioContext;
      window.__gains = [];
      window.AudioContext = class extends NativeAudioContext {
        constructor(...args) { super(...args); window.__audio = this; }
        createGain() { const gain = super.createGain(); window.__gains.push(gain); return gain; }
      };
      const [{ initSound }, settings] = await Promise.all([import('/js/ui/sound.js'), import('/js/ui/settings.js')]);
      window.__settings = settings;
      window.__game = null;
      initSound({ on() {} }, () => window.__game);
      window.__panel = settings.createSettingsPanel({ getSongs: () => window._sound.music.songs() });
      window.__panel.open();
    });
    await page.locator('#settings-modal h2').click(); // first real gesture unlocks audio
    await page.waitForFunction(() => window._sound.music.state().started);
  }
  const range = key => page.locator(`#settings-modal input[data-set="${key}"]`);
  const setRange = (key, value) => page.evaluate(([k,v]) => {
    const input = document.querySelector(`#settings-modal input[data-set="${k}"]`);
    input.value = String(v); input.dispatchEvent(new Event('input', { bubbles: true }));
  }, [key,value]);
  const levels = () => page.evaluate(() => window._sound.levels());
  const waitMusic = value => page.waitForFunction(v => Math.abs(window._sound.levels().music - v) < .005, value);
  await boot();
  assert.equal(await range('music').getAttribute('max'), '200');
  for (const key of ['master','sfx']) assert.equal(await range(key).getAttribute('max'), '100');
  await setRange('music', 100); await waitMusic(.55);
  const normal = await levels();
  await setRange('music', 200); await waitMusic(2.2);
  const boosted = await levels();
  assert(boosted.music > normal.music * 3.9, 'the extra range amplifies the live music bus');
  assert.equal(boosted.master, normal.master); assert.equal(boosted.sfx, normal.sfx);
  assert.equal(await range('music').getAttribute('aria-valuetext'), '200%');
  assert.equal(await page.locator('[data-val="music"]').textContent(), '200%');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ju_settings')).music), 200);
  await page.evaluate(() => { window.__panel.close(); window.__panel.open(); });
  assert.equal(await range('music').inputValue(), '200');
  console.log('PASS the slider reaches 200%, boosts music immediately and independently, and retains its value on reopen');

  await page.reload(); await boot(); await waitMusic(2.2);
  assert.equal(await range('music').inputValue(), '200');
  await setRange('music', 0); await waitMusic(0);
  await setRange('music', 200); await waitMusic(2.2);
  await page.locator('[data-toggle="music"]').click(); await waitMusic(0);
  assert.equal(await range('music').inputValue(), '200', 'muting keeps the chosen loudness');
  await page.locator('[data-toggle="music"]').click(); await waitMusic(2.2);
  console.log('PASS boosted startup after reload, silence at zero, and music off/on at the saved level');

  await page.evaluate(() => {
    const meter = window.__audio.createAnalyser(); meter.fftSize = 2048;
    window.__gains[1].connect(meter); // mute output, after the master
    window.__outputMeter = meter;
    window.__game = { date: { y: 66 }, bookmarkId: '66ce', playerTag: 'JUD',
      tags: { JUD: { alive: true, atWarWith: ['ROM'] }, ROM: { alive: true } }, armies: {}, battles: [] };
    window.__settings.setSetting('song', 'hammer');
  });
  await page.waitForFunction(() => !!window._sound.music.state().song, null, { timeout: 15000 });
  assert.equal(await page.evaluate(() => window._sound.music.state().song.base), 'hammer');
  const peak = await page.evaluate(async () => {
    const samples = new Float32Array(window.__outputMeter.fftSize); let max = 0;
    for (let i=0; i<30; i++) {
      await new Promise(r => setTimeout(r, 100)); window.__outputMeter.getFloatTimeDomainData(samples);
      for (const sample of samples) max = Math.max(max, Math.abs(sample));
    }
    return max;
  });
  assert(peak > .001 && peak < 1, `boosted song produces audio without clipping in the sampled passage: peak ${peak}`);
  console.log(`PASS the composed war song plays at boost; sampled output peak ${peak.toFixed(3)}`);

  await page.setViewportSize({ width: 390, height: 844 });
  assert(await range('music').isVisible());
  assert(await page.locator('.st-card').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  if (process.env.JU_OUT) await page.screenshot({ path: process.env.JU_OUT + '/music-volume-boost-mobile.png' });
  await page.locator('[data-act="reset"]').click();
  await waitMusic(.55 * .7 * .7);
  assert.equal(await range('music').inputValue(), '70');
  assert.deepEqual(errors, []);
  console.log('PASS mobile settings, restored defaults and no browser errors');
  console.log('ALL PASS');
} finally { await browser.close(); }
