/** An iPhone or iPad. iPadOS 13 and later report themselves as a Mac, but a Mac has no touch screen. */
export function isIos(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

/**
 * Which install help to show, if any. "prompt" is a browser that gives us an install button (Chrome, Edge, Android),
 * "ios" is Safari on iPhone and iPad, which has no button and needs Add to Home Screen steps.
 */
export function installHint(args: {
  standalone: boolean;
  dismissed: boolean;
  ios: boolean;
  canPrompt: boolean;
}): "prompt" | "ios" | null {
  if (args.standalone || args.dismissed) return null;
  if (args.canPrompt) return "prompt";
  if (args.ios) return "ios";
  return null;
}
