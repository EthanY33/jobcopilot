/**
 * Renders brand assets (favicon, apple-icon, opengraph-image) from canonical SVG markup.
 * Reuses Playwright (existing dev dep) to render at exact pixel sizes; uses png-to-ico
 * to package multi-resolution favicon.ico.
 *
 * Run: pnpm tsx scripts/build-brand-assets.ts
 */

import { chromium } from "@playwright/test";
import pngToIco from "png-to-ico";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const APP_DIR = path.resolve(__dirname, "..", "src", "app");
const TMP_DIR = path.resolve(__dirname, "..", ".brand-build");

const tileSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#9b67ee"/>
      <stop offset="100%" stop-color="#2c81ff"/>
    </linearGradient>
    <mask id="m">
      <rect x="0" y="0" width="120" height="120" rx="26" fill="#fff"/>
      <g transform="rotate(-22 60 60)">
        <ellipse cx="60" cy="60" rx="34" ry="10" fill="none" stroke="#000" stroke-width="3.5"/>
        <circle cx="26" cy="60" r="10" fill="#000"/>
        <circle cx="94" cy="60" r="10" fill="#000"/>
      </g>
    </mask>
  </defs>
  <rect x="0" y="0" width="120" height="120" rx="26" fill="url(#g)" mask="url(#m)"/>
</svg>`.trim();

const ogTemplate = `
<!DOCTYPE html><html><head>
  <meta charset="utf-8" />
  <style>
    @font-face { font-family: 'Geist'; src: url('https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@latest/files/geist-sans-latin-700-normal.woff2') format('woff2'); font-weight: 700; }
    @font-face { font-family: 'Inter'; src: url('https://cdn.jsdelivr.net/npm/@fontsource/inter@latest/files/inter-latin-500-normal.woff2') format('woff2'); font-weight: 500; }
    body { margin:0; width:1200px; height:630px; background:#0a0a10; color:#f4f4f8;
           font-family:'Inter', sans-serif; padding:80px; box-sizing:border-box;
           display:flex; flex-direction:column; justify-content:center; }
    .lockup { display:flex; align-items:center; gap:20px; margin-bottom: 32px; }
    .mark { width:96px; height:96px; }
    .word { font-family:'Geist'; font-weight:700; font-size:96px; letter-spacing:-0.025em; line-height:1; }
    .word .copilot { background: linear-gradient(135deg,#9b67ee,#2c81ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .tag { font-family:'Inter'; font-weight:500; font-size:32px; max-width:980px; line-height:1.4; opacity:.85; }
  </style>
</head><body>
  <div class="lockup">
    <div class="mark">${tileSvg.replace(/512/g, "96")}</div>
    <div class="word">job<span class="copilot">copilot</span></div>
  </div>
  <div class="tag">AI drafts every piece of an application. You review and ship.</div>
</body></html>`;

async function ensureDir(p: string) { if (!existsSync(p)) await mkdir(p, { recursive: true }); }

async function renderTile(size: number, outPath: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0">${tileSvg.replace(/512/g, String(size))}</body></html>`);
  await page.screenshot({ path: outPath, omitBackground: true });
  await browser.close();
}

async function renderOg(outPath: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(ogTemplate, { waitUntil: "networkidle" });
  await page.screenshot({ path: outPath });
  await browser.close();
}

async function main() {
  await ensureDir(TMP_DIR);

  // 1. SVG favicon — write the canonical SVG to app/icon.svg
  await writeFile(path.join(APP_DIR, "icon.svg"), tileSvg.replace(/512/g, "32"));

  // 2. apple-icon.png at 180×180
  await renderTile(180, path.join(APP_DIR, "apple-icon.png"));

  // 3. opengraph-image.png at 1200×630
  await renderOg(path.join(APP_DIR, "opengraph-image.png"));

  // 4. favicon.ico — render at 16, 32, 48; combine
  for (const size of [16, 32, 48]) {
    await renderTile(size, path.join(TMP_DIR, `favicon-${size}.png`));
  }
  const buffers = await Promise.all(
    [16, 32, 48].map((s) => readFile(path.join(TMP_DIR, `favicon-${s}.png`))),
  );
  const ico = await pngToIco(buffers);
  await writeFile(path.join(APP_DIR, "icon.ico"), ico);

  console.log("Brand assets written to", APP_DIR);
}

main().catch((err) => { console.error(err); process.exit(1); });
