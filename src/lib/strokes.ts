// The pen strokes on the handwriting pad, kept as plain data so drawing, undo and palm rejection can be tested
// without a screen.

export type Point = { x: number; y: number; pressure: number };
export type Stroke = Point[];

export function startStroke(strokes: Stroke[], p: Point): Stroke[] {
  return [...strokes, [p]];
}

export function extendStroke(strokes: Stroke[], p: Point): Stroke[] {
  if (strokes.length === 0) return strokes;
  const last = strokes[strokes.length - 1];
  const prev = last[last.length - 1];
  // Ignore jitter: a point that did not really move adds nothing.
  if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) < 0.5) return strokes;
  return [...strokes.slice(0, -1), [...last, p]];
}

export function undoStroke(strokes: Stroke[]): Stroke[] {
  return strokes.slice(0, -1);
}

export function hasInk(strokes: Stroke[]): boolean {
  return strokes.some((s) => s.length > 0);
}

/**
 * Palm rejection: once a stylus has touched the pad, finger touches are ignored so a resting hand does not draw.
 * With no stylus, fingers and the mouse draw.
 */
export function acceptPointer(pointerType: string, penSeen: boolean): boolean {
  if (pointerType === "pen") return true;
  if (pointerType === "touch" && penSeen) return false;
  return true;
}
