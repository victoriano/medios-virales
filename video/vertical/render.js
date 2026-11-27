// Renderiza index.html a MP4 vertical (1080x1920) fotograma a fotograma.
// Uso: node render.js salida.mp4 [fps] [desde] [hasta]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const out = process.argv[2] || 'prototipo.mp4';
  const fps = +(process.argv[3] || 30);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const total = await page.evaluate(() => window.TOTAL);
  const from = +(process.argv[4] || 0), to = +(process.argv[5] || total);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((to - from) * fps);
  for (let i = 0; i < n; i++) {
    const t = from + i / fps;
    await page.evaluate(t => { window.TL.seek(t, false); }, t);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 300 === 0) process.stderr.write(`${i}/${n}\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
})();
