/**
 * Generates the animated brand-hero SVG at docs/assets/jobcopilot-brand.svg.
 *
 * Loads Geist Bold from the local `geist` package (falls back to the jsdelivr
 * fontsource mirror used by build-brand-assets.ts, cached under .brand-build/).
 * Uses opentype.js to convert "jobcopilot" to per-glyph SVG paths so "job" and
 * "copilot" can take separate fills — the latter receives an animated linear
 * gradient sweep. All animation is SMIL (<animate>, <animateTransform>,
 * <animateMotion>) so GitHub's SVG sanitizer preserves it; no <style>,
 * <script>, or @font-face is emitted.
 *
 * Run: pnpm tsx scripts/build-brand-hero.ts
 */

import opentype from "opentype.js";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const OUT_PATH = path.join(REPO_ROOT, "docs", "assets", "jobcopilot-brand.svg");
const TMP_DIR = path.resolve(__dirname, "..", ".brand-build");
const FONT_LOCAL = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "geist",
  "dist",
  "fonts",
  "geist-sans",
  "Geist-Bold.ttf",
);
const FONT_CDN =
  "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@latest/files/geist-sans-latin-700-normal.ttf";

async function loadGeistBold(): Promise<opentype.Font> {
  let buf: Buffer;
  if (existsSync(FONT_LOCAL)) {
    buf = await readFile(FONT_LOCAL);
  } else {
    await mkdir(TMP_DIR, { recursive: true });
    const cached = path.join(TMP_DIR, "geist-bold.ttf");
    if (!existsSync(cached)) {
      const res = await fetch(FONT_CDN);
      if (!res.ok) throw new Error(`Failed to fetch Geist Bold: ${res.status}`);
      await writeFile(cached, new Uint8Array(await res.arrayBuffer()));
    }
    buf = await readFile(cached);
  }
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return opentype.parse(ab);
}

function buildHero(font: opentype.Font): string {
  // Canvas
  const W = 1200;
  const H = 360;
  const BG = "#0a0a10";

  // Lockup geometry
  const TILE_SIZE = 96;
  const GAP = 24;
  const FONT_SIZE = 88;
  const TRACKING = -0.025 * FONT_SIZE; // ≈ -2.2 px between glyphs
  const LOCKUP_Y = 160; // vertical center of the lockup
  const TILE_Y = LOCKUP_Y - TILE_SIZE / 2;
  // Lowercase x-height ≈ 0.5em, so visually centring around the LOCKUP_Y line
  // means lifting the baseline by ~0.30em from the centre.
  const BASELINE_Y = LOCKUP_Y + 0.30 * FONT_SIZE;

  const word = "jobcopilot";
  const advances: number[] = [];
  for (const ch of word) {
    const g = font.charToGlyph(ch);
    advances.push((g.advanceWidth / font.unitsPerEm) * FONT_SIZE);
  }
  let totalWordWidth = 0;
  advances.forEach((a, i) => {
    totalWordWidth += a + (i < word.length - 1 ? TRACKING : 0);
  });

  const lockupWidth = TILE_SIZE + GAP + totalWordWidth;
  const tileX = (W - lockupWidth) / 2;
  const wordStartX = tileX + TILE_SIZE + GAP;

  let cursor = wordStartX;
  const jobPathFragments: string[] = [];
  const copilotPathFragments: string[] = [];
  let copilotStartX = 0;
  let copilotEndX = 0;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const d = font.getPath(ch, cursor, BASELINE_Y, FONT_SIZE).toPathData(2);
    if (i < 3) {
      jobPathFragments.push(d);
    } else {
      if (i === 3) copilotStartX = cursor;
      copilotPathFragments.push(d);
    }
    cursor += advances[i];
    if (i === word.length - 1) {
      copilotEndX = cursor;
    } else {
      cursor += TRACKING;
    }
  }

  const sweepSpan = copilotEndX - copilotStartX;
  const jobPathD = jobPathFragments.join(" ");
  const copilotPathD = copilotPathFragments.join(" ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="JobCopilot — AI drafts every piece of an application. You review and ship.">
  <defs>
    <filter id="orbBlurViolet" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="40"/>
    </filter>
    <filter id="orbBlurAzure" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="50"/>
    </filter>
    <linearGradient id="copilotSweep" gradientUnits="userSpaceOnUse"
                    x1="${copilotStartX.toFixed(2)}" y1="0"
                    x2="${copilotEndX.toFixed(2)}" y2="0"
                    spreadMethod="repeat">
      <stop offset="0%" stop-color="hsl(258 90% 60%)"/>
      <stop offset="50%" stop-color="hsl(215 95% 50%)"/>
      <stop offset="100%" stop-color="hsl(258 90% 60%)"/>
      <animateTransform attributeName="gradientTransform" type="translate"
                        from="0 0" to="${sweepSpan.toFixed(2)} 0"
                        dur="4s" repeatCount="indefinite"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- Ambient drift orbs -->
  <g opacity="0.5" filter="url(#orbBlurViolet)">
    <circle cx="980" cy="60" r="210" fill="hsl(258 90% 60%)">
      <animateMotion dur="30s" repeatCount="indefinite"
                     path="M 0 -50 a 50 50 0 1 0 0 100 a 50 50 0 1 0 0 -100"/>
    </circle>
  </g>
  <g opacity="0.4" filter="url(#orbBlurAzure)">
    <circle cx="220" cy="320" r="150" fill="hsl(215 95% 50%)">
      <animateMotion dur="24s" begin="-8s" repeatCount="indefinite"
                     path="M 0 -40 a 40 40 0 1 0 0 80 a 40 40 0 1 0 0 -80"/>
    </circle>
  </g>

  <!-- Logo tile (96×96): same geometry as build-brand-assets.ts tileSvg, nested
       so the mask+gradient resolve in the tile's own 0..120 viewBox. -->
  <svg x="${tileX.toFixed(2)}" y="${TILE_Y}" width="${TILE_SIZE}" height="${TILE_SIZE}" viewBox="0 0 120 120">
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
  </svg>

  <!-- Wordmark "job" -->
  <path d="${jobPathD}" fill="#f4f4f8"/>

  <!-- Wordmark "copilot" with animated violet→azure sweep -->
  <path d="${copilotPathD}" fill="url(#copilotSweep)"/>

  <!-- Tagline (system fallback; SMIL fade-in once, holds at 0.85) -->
  <text x="${W / 2}" y="260" text-anchor="middle"
        font-family="-apple-system, system-ui, 'Segoe UI', Roboto, sans-serif"
        font-weight="500" font-size="22" fill="#f4f4f8" fill-opacity="0.85" opacity="0">
    AI drafts every piece of an application. You review and ship.
    <animate attributeName="opacity" from="0" to="1"
             begin="0s" dur="1.5s" fill="freeze"/>
  </text>
</svg>
`;
}

async function main() {
  const font = await loadGeistBold();
  const svg = buildHero(font);
  const outDir = path.dirname(OUT_PATH);
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
  await writeFile(OUT_PATH, svg, "utf-8");
  console.log(`Brand hero SVG written to ${OUT_PATH} (${svg.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
