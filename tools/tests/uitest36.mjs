// UI verification — the phone campaign (SPEC §103). Boots a real phone
// viewport (390×844, touch, mobile UA) and proves the things a handheld could
// not do before: reach the chronicle, the ledger, the primer, the quill and
// the shelf of saved campaigns; keep the sound toggles somewhere that is not
// on top of the map controls; and press the buttons a campaign is played with
// without hitting the one next door.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/opt/node22/lib') + '/');
const { chromium } = require('playwright');
// SPEC §160: the start screen is gated on the province raster — main.js awaits
// initRenderer() and computeGeometry() before showStartScreen() — and that pass
// is one fullscreen draw over every texel against every seed. At the frame that
// reaches Britain it is 25.0M x 307, about five times the pre-§160 work, and
// these suites run on SwiftShader. Measured: 74s to the carousel against 17s
// before. Every wait after it is unaffected (the nation cards land ~1s later),
// so this one constant is the whole of the change.
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);

const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
await page.waitForTimeout(700);

console.log('== the title screen fits the phone ==');
{
  const start = await page.evaluate(() => {
    const card = document.querySelector('.bm-card.current');
    const view = document.querySelector('.ss-viewport');
    const cr = card.getBoundingClientRect(), vr = view.getBoundingClientRect();
    const shown = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).display !== 'none' : false;
    };
    return {
      clipped: cr.right > vr.right + 1 || cr.left < vr.left - 1,
      cardW: Math.round(cr.width), viewW: Math.round(vr.width), vw: window.innerWidth,
      mapChrome: shown('#mapmode-bar') || shown('#group-toggle') || shown('#outliner-pill'),
    };
  });
  ok(!start.clipped,
    'the bookmark card fits its carousel instead of being cut off mid-sentence ('
    + start.cardW + ' in ' + start.viewW + ')');
  ok(!start.mapChrome,
    'and the map\'s own controls stay out of the title screen');
}

for (let i = 0; i < 10; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('War of Independence')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx, { timeout: 30000 });
await page.waitForTimeout(1400);

console.log('== the tools a phone used to have no way to reach ==');
{
  const chrome = await page.evaluate(() => {
    const vis = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 1 && r.height > 1;
    };
    const more = document.querySelector('.tb-more');
    const r = more ? more.getBoundingClientRect() : null;
    return {
      more: !!more && vis('.tb-more'),
      moreBox: r ? [Math.round(r.width), Math.round(r.height)] : null,
      hiddenTools: ['[data-ref="chron"]', '[data-ref="ledger"]', '[data-ref="save"]', '[data-ref="loadsave"]']
        .map((sel) => vis(sel)),
      floatingSound: vis('#ju-sound-btn'),
      floatingMusic: vis('#ju-music-btn'),
    };
  });
  ok(chrome.hiddenTools.every((v) => v === false),
    'the topbar still sheds its four tool buttons at 390px');
  ok(chrome.more, 'and offers the tools button in their place');
  ok(chrome.moreBox && chrome.moreBox[0] >= 30 && chrome.moreBox[1] >= 24,
    'which is big enough to hit: ' + (chrome.moreBox || []).join('×'));
  ok(chrome.floatingSound === false && chrome.floatingMusic === false,
    'the floating sound buttons stand down (they sat on the mapmode grid and every sheet)');
}

console.log('== the sheet opens the campaign\'s own tools ==');
{
  await page.locator('.tb-more').click();
  await page.waitForTimeout(400);
  const tiles = await page.evaluate(() => [...document.querySelectorAll('.tools-tile')].map((b) => {
    const r = b.getBoundingClientRect();
    return { tool: b.dataset.tool, w: Math.round(r.width), h: Math.round(r.height), text: b.textContent.trim() };
  }));
  const want = ['chron', 'ledger', 'help', 'save', 'loadsave', 'music', 'sound'];
  ok(want.every((t) => tiles.some((x) => x.tool === t)),
    'every shed tool is on the sheet: ' + tiles.map((t) => t.tool).join(', '));
  ok(tiles.every((t) => t.h >= 44 && t.w >= 44),
    'each tile is a real tap target (' + (tiles[0] ? tiles[0].w + '×' + tiles[0].h : '—') + ')');
  await page.screenshot({ path: OUT + 'phone-tools.png' });
  await page.locator('.tools-tile[data-tool="ledger"]').click();
  await page.waitForTimeout(600);
  const ledgerOpen = await page.evaluate(() => {
    const el = document.getElementById('ledger-modal');
    return !!el && !el.classList.contains('hidden');
  });
  ok(ledgerOpen, 'the ledger opens from the sheet — the L key is not an option here');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

console.log('== a phone can save its own campaign ==');
{
  await page.locator('.tb-more').click();
  await page.waitForTimeout(350);
  await page.locator('.tools-tile[data-tool="save"]').click();
  await page.waitForTimeout(1500);
  // The shelf is IndexedDB: count what is actually on it.
  const shelf = await page.evaluate(() => new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    setTimeout(() => finish(-1), 4000);
    const dbs = indexedDB.databases ? indexedDB.databases() : Promise.resolve([{ name: 'ju-saves' }]);
    dbs.then((list) => {
      const name = (list.find((d) => /ju|jud/i.test(d.name || '')) || {}).name;
      if (!name) return finish(-1);
      const req = indexedDB.open(name);
      req.onerror = () => finish(-1);
      req.onsuccess = () => {
        const db = req.result;
        const store = [...db.objectStoreNames][0];
        if (!store) return finish(-1);
        const tx = db.transaction(store, 'readonly').objectStore(store).count();
        tx.onsuccess = () => finish(tx.result);
        tx.onerror = () => finish(-1);
      };
    }).catch(() => finish(-1));
  }));
  ok(shelf > 0, 'the quill wrote a campaign to the shelf (' + shelf + ' on it)');
  // …and the shelf tile opens it again.
  await page.locator('.tb-more').click();
  await page.waitForTimeout(350);
  await page.locator('.tools-tile[data-tool="loadsave"]').click();
  await page.waitForTimeout(700);
  const shelfOpen = await page.evaluate(() => {
    const el = document.getElementById('saves-panel');
    return !!el && !el.classList.contains('hidden');
  });
  ok(shelfOpen, 'and the shelf of saved campaigns opens from the same sheet');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

console.log('== the buttons a campaign is played with ==');
{
  await page.evaluate(() => {
    const ctx = window._ctx;
    const p = ctx.game.provinces.find((q) => q && q.owner === 'EGY' && !q.impassable);
    ctx.bus.emit('mapclick', { provId: p.id, armyId: null });
  });
  await page.waitForSelector('#province-panel:not(.hidden)');
  await page.waitForTimeout(400);
  const btns = await page.evaluate(() => [...document.querySelectorAll('#province-panel .pp-dip')]
    .filter((b) => getComputedStyle(b).display !== 'none')
    .map((b) => ({ t: b.textContent.trim().slice(0, 16), h: Math.round(b.getBoundingClientRect().height) })));
  ok(btns.length > 0 && btns.every((b) => b.h >= 38),
    'diplomacy buttons are thumb-sized (' + (btns[0] ? btns[0].h : 0) + 'px)');
  const rows = await page.evaluate(() => {
    // the three-community population line used to wrap back under its label
    const el = [...document.querySelectorAll('#province-panel .pp-row')]
      .find((r) => /Population/i.test(r.textContent));
    if (!el) return null;
    const k = el.querySelector('.pp-k'), v = el.querySelector('.pp-v');
    if (!k || !v) return null;
    const kr = k.getBoundingClientRect(), vr = v.getBoundingClientRect();
    return { overlap: kr.right > vr.left + 2 && Math.abs(kr.top - vr.top) < 4 };
  });
  ok(!rows || !rows.overlap, 'a long value stacks under its label instead of running through it');
}

console.log('== nothing runs off the side of the screen ==');
{
  const spill = await page.evaluate(() => {
    const vw = window.innerWidth;
    const bad = [];
    document.querySelectorAll('#ui-root *').forEach((el) => {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      if (r.right > vw + 8 || r.left < -8) {
        bad.push((el.className || el.tagName) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
      }
    });
    return { bad: bad.slice(0, 5), n: bad.length, scrollW: document.documentElement.scrollWidth, vw };
  });
  ok(spill.n === 0, 'no chrome spills past the viewport' + (spill.n ? ': ' + spill.bad.join(' | ') : ''));
  ok(spill.scrollW <= spill.vw + 1, 'and the page itself never scrolls sideways');
}

console.log('== landscape: the sheet becomes a side panel ==');
{
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(700);
  const land = await page.evaluate(() => {
    const p = document.querySelector('#province-panel');
    const r = p.getBoundingClientRect();
    const mm = document.querySelector('#mapmode-bar').getBoundingClientRect();
    const gt = document.querySelector('#group-toggle');
    const gr = gt ? gt.getBoundingClientRect() : null;
    return {
      panel: [Math.round(r.left), Math.round(r.width), Math.round(r.height)],
      vw: window.innerWidth, vh: window.innerHeight,
      mmLeft: Math.round(mm.left),
      overlapsGrid: gr ? !(gr.right < mm.left || gr.left > mm.right || gr.bottom < mm.top || gr.top > mm.bottom) : false,
      more: getComputedStyle(document.querySelector('.tb-more')).display !== 'none',
    };
  });
  ok(land.panel[2] > land.vh * 0.7,
    'the panel runs the height of the screen instead of eating the bottom half');
  ok(land.panel[1] <= land.vw * 0.6, 'and leaves the map its own half');
  ok(land.mmLeft > land.panel[1], 'the mapmode grid moves clear of the panel');
  ok(!land.overlapsGrid, 'and the group toggle does not sit on top of it');
  ok(land.more, 'the tools button is there in landscape too — the sound toggles live in it');
  await page.screenshot({ path: OUT + 'phone-landscape.png' });
}

ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
await browser.close();
process.exit(failures ? 1 : 0);
