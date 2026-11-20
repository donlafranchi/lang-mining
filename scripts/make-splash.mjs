// Draws the launch pictures in public/splash. Run once, and again if the look changes: node scripts/make-splash.mjs
// Needs Playwright with Chromium (and an emoji font). The result is committed; nothing runs at build time.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const { chromium } = createRequire(import.meta.url)("playwright");

const SIZES = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3],
  [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2], [320, 568, 2],
];

const page = (w, h) => `<html><body style="margin:0;width:${w}px;height:${h}px;background:#f3f0f1;display:flex;flex-direction:column;
align-items:center;justify-content:center;text-align:center;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;color:#2b292c">
<div style="font-size:${Math.round(w * 0.1)}px;font-weight:700;letter-spacing:-0.02em">Hand to Brain</div>
<div style="font-size:${Math.round(w * 0.042)}px;color:#6c7d85;margin-top:6px">a language learning app</div>
<div style="font-size:${Math.round(w * 0.42)}px;line-height:1;margin-top:${Math.round(w * 0.08)}px">🤦</div>
</body></html>`;

mkdirSync("public/splash", { recursive: true });
const browser = await chromium.launch();
for (const [w, h, r] of SIZES) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: r });
  await p.setContent(page(w, h));
  await p.screenshot({ path: `public/splash/${w * r}x${h * r}.png` });
  await p.close();
}
await browser.close();
console.log(`Wrote ${SIZES.length} pictures to public/splash`);
