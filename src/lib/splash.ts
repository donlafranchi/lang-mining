// The picture iOS shows while a Home Screen app is starting, before any of our code has loaded. It is the only thing
// that can appear in that gap, and iOS wants one image per screen size. Made by scripts/make-splash.mjs.

export type SplashSize = { width: number; height: number; ratio: number };

/** iPhone screens, in CSS pixels. The picture itself is width x ratio by height x ratio. */
export const SPLASH_SIZES: SplashSize[] = [
  { width: 440, height: 956, ratio: 3 }, // 16 Pro Max
  { width: 402, height: 874, ratio: 3 }, // 16 Pro
  { width: 430, height: 932, ratio: 3 }, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { width: 393, height: 852, ratio: 3 }, // 14 Pro, 15, 15 Pro, 16
  { width: 428, height: 926, ratio: 3 }, // 12 Pro Max, 13 Pro Max, 14 Plus
  { width: 390, height: 844, ratio: 3 }, // 12, 13, 14
  { width: 375, height: 812, ratio: 3 }, // X, XS, 11 Pro, 12 mini, 13 mini
  { width: 414, height: 896, ratio: 3 }, // XS Max, 11 Pro Max
  { width: 414, height: 896, ratio: 2 }, // XR, 11
  { width: 414, height: 736, ratio: 3 }, // 6 Plus, 7 Plus, 8 Plus
  { width: 375, height: 667, ratio: 2 }, // 6, 7, 8, SE 2 and 3
  { width: 320, height: 568, ratio: 2 }, // SE 1
];

export const splashFile = (s: SplashSize) => `/splash/${s.width * s.ratio}x${s.height * s.ratio}.png`;

export const splashMedia = (s: SplashSize) =>
  `(device-width: ${s.width}px) and (device-height: ${s.height}px) and (-webkit-device-pixel-ratio: ${s.ratio}) and (orientation: portrait)`;

export const startupImages = () => SPLASH_SIZES.map((s) => ({ url: splashFile(s), media: splashMedia(s) }));
