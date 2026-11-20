// Draws the app icons: the facepalm on navy. Run once, and again if the look changes: node scripts/make-icons.mjs
// Needs Playwright with Chromium and an emoji font. The results are committed; nothing runs at build time.
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");

const NAVY = "#0b1f3a";
// Full-bleed square with the emoji well inside the middle 80%, so one file serves both the normal and maskable icon.
const page = (size) => `<html><body style="margin:0;width:${size}px;height:${size}px;background:${NAVY};display:flex;align-items:center;justify-content:center">
<div style="font-size:${Math.round(size * 0.56)}px;line-height:1;font-family:'Noto Color Emoji',sans-serif">🤦</div></body></html>`;

const TARGETS = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["src/app/apple-icon.png", 180],
];

const browser = await chromium.launch();
for (const [path, size] of TARGETS) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(page(size));
  await p.screenshot({ path });
  await p.close();
}
await browser.close();
console.log(`Wrote ${TARGETS.length} icons`);
