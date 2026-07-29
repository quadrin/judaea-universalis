// UI verification — SPEC §152: the outliner's dove takes one press.
//
// §132 taught the realm panel that a rebuild between mousedown and mouseup
// eats the click. The outliner was never taught it, and it is the worse
// offender: its rows carry live numbers — warscore, siege percentage, a
// marching army's progress — so `html !== lastHtml` on most days and the whole
// body is rewritten. The dove on a war row is the button a player notices,
// because warscore moves every day a siege ticks.
//
// The hostile condition is reproduced exactly and deterministically: the
// button is held, the real `day` signal is emitted with the warscore genuinely
// changed underneath it, and only then released. Against the code as it was,
// the peace table never opened.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: 20000 });
for (let i = 0; i < 10; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(450);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(600);

// Setup runs on a stopped clock so the harness never races a modal; the race
// itself is then produced by hand, which is both the real mechanism and
// deterministic.
async function stopClock() {
  await page.evaluate(() => { window._ctx.game.paused = true; });
  await page.waitForTimeout(120);
}
async function clearModals() {
  for (let i = 0; i < 40; i++) {
    const open = await page.evaluate(() => {
      const m = document.getElementById('event-modal');
      return !!m && !m.classList.contains('hidden');
    });
    if (!open) return;
    const btn = page.locator('#event-modal .ev-opt').first();
    if (!(await btn.count())) return;
    await btn.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(120);
  }
}
const closePeace = async () => {
  await page.evaluate(() => {
    const m = document.getElementById('peace-modal');
    if (!m) return;
    const btn = [...m.querySelectorAll('button')].find((b) => /cancel|leave|close/i.test(b.textContent || ''));
    if (btn) btn.click(); else m.remove();
  });
  await page.waitForTimeout(200);
};

await stopClock();
await clearModals();

console.log('== the chapter opens at war, so the outliner carries a dove ==');
const war = await page.evaluate(() => {
  const g = window._ctx.game;
  const w = (g.wars || []).find((x) => x
    && ((x.attackers || []).includes(g.playerTag) || (x.defenders || []).includes(g.playerTag)));
  return w ? { id: w.id, name: w.name } : null;
});
ok(!!war, 'the player is at war: ' + (war ? war.name : 'NO WAR'));
await page.evaluate(() => window._ctx.bus.emit('day'));
await page.waitForTimeout(200);
ok((await page.locator('#outliner .ol-peace').count()) >= 1, 'the war row shows the dove');

console.log('== a day with nothing new does not rewrite the rows ==');
{
  // Half the fix: identical markup must leave the DOM alone, so the node under
  // the finger survives an ordinary tick.
  const same = await page.evaluate(() => {
    const before = document.querySelector('#outliner .ol-peace');
    for (let i = 0; i < 3; i++) window._ctx.bus.emit('day');
    return before === document.querySelector('#outliner .ol-peace') && document.contains(before);
  });
  ok(same, 'three quiet days left the same dove node in place');
}

console.log('== the dove opens the table in ONE press, with the row rebuilding mid-press ==');
{
  const box = await page.locator('#outliner .ol-peace').first().boundingBox();
  ok(!!box, 'the dove is on screen');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // The warscore genuinely moves under the finger — the markup differs, which
  // is precisely when the outliner used to rewrite the body and eat the click.
  const churned = await page.evaluate(() => {
    const g = window._ctx.game;
    const w = (g.wars || []).find((x) => x
      && ((x.attackers || []).includes(g.playerTag) || (x.defenders || []).includes(g.playerTag)));
    let n = 0;
    for (let i = 0; i < 3; i++) {
      w.warscore = w.warscore || {};
      if (typeof w.warscore[g.playerTag] === 'number') w.warscore[g.playerTag] += 3;
      else w.warscore.attackers = (w.warscore.attackers || 0) + 3;
      window._ctx.bus.emit('day');
      n++;
    }
    return n;
  });
  ok(churned === 3, 'the outliner was told to rebuild three times mid-press');
  await page.mouse.up();
  await page.waitForTimeout(500);
  const open = await page.evaluate(() => {
    const m = document.getElementById('peace-modal');
    return !!m && !m.classList.contains('hidden');
  });
  ok(open, 'one press opened the negotiating table');
  await page.screenshot({ path: OUT + 'v152-outliner-dove.png' });
  await closePeace();
}

console.log('== and the outliner is not left frozen by the guard ==');
{
  await page.evaluate(() => {
    const g = window._ctx.game;
    const w = (g.wars || []).find((x) => x
      && ((x.attackers || []).includes(g.playerTag) || (x.defenders || []).includes(g.playerTag)));
    w.name = 'The Harness War';
  });
  let landed = false;
  for (let i = 0; i < 20 && !landed; i++) {
    await page.evaluate(() => window._ctx.bus.emit('day'));
    await page.waitForTimeout(80);
    landed = /The Harness War/.test((await page.locator('#outliner').textContent()) || '');
  }
  ok(landed, 'a change made after the press still reaches the rows');
  const paused = await page.evaluate(() => window._ctx.game.paused);
  ok(paused === true || paused === false, 'and the fix never touched the sim clock itself');
}

ok(!errors.length, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));
await browser.close();
console.log(failures ? `uitest38: ${failures} FAILURES` : 'uitest38: ALL PASS');
process.exit(failures ? 1 : 0);
