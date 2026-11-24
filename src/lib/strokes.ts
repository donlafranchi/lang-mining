export type Point = { x: number; y: number };
export type Stroke = Point[];

/** Remove the most recent stroke, leaving the rest untouched. */
export function undoStroke(strokes: Stroke[]): Stroke[] {
  return strokes.slice(0, -1);
}

/** True once something has been drawn: a single tap with no movement does not count as writing. */
export function hasWriting(strokes: Stroke[]): boolean {
  return strokes.some((s) => s.length > 1);
}
