// herocap.mjs — render the PATHWAYS hero stills from tools/hero/index.html (the dev server must be
// up on :5330) and save each canvas as a PNG with alpha, in both lighting rows.
//   node tools/hero/herocap.mjs <outdir> key=clinician,top=0.0427,bottom=1.193,x=0.42,yaw=-0.14 [more…]
// The shipped stills used those values for clinician and strategist, and
//   key=analyst,top=0.004,bottom=1.194,x=0.43,yaw=-0.14   (her head sits lower in the rig's bounds)
// Then: py -I tools/hero/heropost.py <outdir> public/img/cast clinician strategist analyst
// Canvas 1400 × 2200 (2× of the 700 × 1100 u hero box); HW / HH override it.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const S = process.env.SHOT_PROFILE_DIR || process.cwd();
const PORT = Number(process.env.SHOT_PORT || 9513);
const W = Number(process.env.HW || 1400), H = Number(process.env.HH || 2200);
const [outdir, ...specs] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function up() { try { return await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { return null; } }
if (!(await up())) {
  const child = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new', '--no-sandbox', '--hide-scrollbars', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${S}/cdpprof-gpu-${PORT}`, '--window-size=1920,1080',
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank',
  ], { detached: true, stdio: 'ignore' });
  child.unref();
  for (let i = 0; i < 40 && !(await up()); i++) await sleep(250);
}
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const logs = [];
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); return; }
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type))
    logs.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 300));
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION: ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 400));
};
await new Promise((r) => (ws.onopen = r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }))?.result?.value;
await fs.mkdir(outdir, { recursive: true });
for (const spec of specs) {
  const p = Object.fromEntries(spec.split(',').map((kv) => kv.split('=')));
  const qs = new URLSearchParams({ w: String(W), h: String(H), ...p }).toString();
  await send('Page.navigate', { url: `http://localhost:5330/tools/hero/index.html?${qs}` });
  let ok = false;
  for (let i = 0; i < 120; i++) { await sleep(250); if (await ev('window.__ready === true || !!window.__error')) { ok = true; break; } }
  const err = await ev('window.__error || null');
  if (!ok || err) { console.log('FAILED', spec, err); continue; }
  const name = p.name || p.key;
  for (const look of (p.looks || 'dark+light').split('+')) {
    const url = await ev(`window.__grab('${look}')`);
    await fs.writeFile(`${outdir}/${name}-${look}.png`, Buffer.from(url.split(',')[1], 'base64'));
    console.log('saved', `${outdir}/${name}-${look}.png`);
  }
}
await send('Emulation.clearDeviceMetricsOverride');
console.log(logs.length ? '  ! ' + [...new Set(logs)].slice(0, 8).join('\n  ! ') : '  (clean)');
ws.close();
process.exit(0);
