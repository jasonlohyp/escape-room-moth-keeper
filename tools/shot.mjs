#!/usr/bin/env node
// Headless screenshot / scripted-play harness for The Moth Keeper.
//
// Usage:
//   node tools/shot.mjs [--view south] [--flags lampLit,windowOpen] [--items matches,key] [--solve N]
//                       [--title]            (show title screen instead of skipping it)
//                       [--size 1600x900]    (viewport)
//                       [--out shot.png]     (final screenshot; default ./shot.png)
//                       [--actions '<json array>'  or  --actions-file actions.json]
//
// Actions (all coordinates are STAGE coordinates in the 1600x900 viewBox, converted automatically):
//   {"click":[x,y]}            click on the stage
//   {"clickSel":"css selector"} click an HTML/SVG element by selector (first match)
//   {"drag":[x1,y1,x2,y2], "steps":20}
//   {"hover":[x,y]}
//   {"wait":ms}
//   {"eval":"js expression"}   evaluated in page, result printed
//   {"shot":"path.png"}        intermediate screenshot
//   {"key":"Escape"}
// Console errors / page errors are printed as [console.error] lines — treat any as bugs.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--help' || a === '-h') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 25).join('\n')); process.exit(0); }
  if (a === '--title') { opt.title = true; continue; }
  if (a.startsWith('--')) { opt[a.slice(2)] = args[++i]; }
}
const [W, H] = (opt.size || '1600x900').split('x').map(Number);
const out = path.resolve(opt.out || 'shot.png');
let actions = [];
if (opt['actions-file']) actions = JSON.parse(fs.readFileSync(opt['actions-file'], 'utf8'));
else if (opt.actions) actions = JSON.parse(opt.actions);

const exe = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));

const params = new URLSearchParams();
params.set('debug', '1');
if (!opt.title) params.set('skip', '1');
for (const k of ['view', 'flags', 'items', 'solve']) if (opt[k]) params.set(k, opt[k]);
const url = pathToFileURL(path.join(root, 'index.html')).href + '?' + params.toString();

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moth-'));
const browser = await puppeteer.launch({
  executablePath: exe, headless: 'new', userDataDir,
  args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`],
  defaultViewport: { width: W, height: H },
});
try {
  const page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warn' || m.type() === 'warning') console.log(`[console.${m.type()}]`, m.text()); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.ready === '1', { timeout: 15000 }).catch(() => console.log('[warn] ready flag not set'));
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await new Promise(r => setTimeout(r, 600));
  const toPage = async (x, y) => page.evaluate((x, y) => {
    const s = document.getElementById('stage');
    const pt = s.createSVGPoint(); pt.x = x; pt.y = y;
    const p = pt.matrixTransform(s.getScreenCTM());
    return [p.x, p.y];
  }, x, y);
  for (const act of actions) {
    if (act.click) { const [px, py] = await toPage(...act.click); await page.mouse.click(px, py); await sleep(act.after ?? 450); }
    else if (act.clickSel) { await page.click(act.clickSel); await sleep(act.after ?? 450); }
    else if (act.hover) { const [px, py] = await toPage(...act.hover); await page.mouse.move(px, py); await sleep(act.after ?? 200); }
    else if (act.drag) {
      const [x1, y1] = await toPage(act.drag[0], act.drag[1]); const [x2, y2] = await toPage(act.drag[2], act.drag[3]);
      await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move(x2, y2, { steps: act.steps || 20 }); await page.mouse.up(); await sleep(act.after ?? 450);
    }
    else if (act.wait) await sleep(act.wait);
    else if (act.eval) { const r = await page.evaluate(act.eval); console.log('[eval]', JSON.stringify(r)); }
    else if (act.shot) { await page.screenshot({ path: path.resolve(act.shot) }); console.log('[shot]', path.resolve(act.shot)); }
    else if (act.key) { await page.keyboard.press(act.key); await sleep(act.after ?? 300); }
  }
  await page.screenshot({ path: out });
  console.log('[shot]', out);
} finally {
  await browser.close();
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch { }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
