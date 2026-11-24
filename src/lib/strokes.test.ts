import { describe, expect, it } from "vitest";
import { hasWriting, undoStroke, type Stroke } from "./strokes";

const line: Stroke = [{ x: 0, y: 0 }, { x: 5, y: 5 }];

describe("strokes", () => {
  it("undo removes only the last stroke", () => {
    expect(undoStroke([line, [{ x: 1, y: 1 }, { x: 2, y: 2 }]])).toEqual([line]);
    expect(undoStroke([])).toEqual([]);
  });
  it("a lone tap is not writing", () => {
    expect(hasWriting([[{ x: 1, y: 1 }]])).toBe(false);
    expect(hasWriting([line])).toBe(true);
    expect(hasWriting([])).toBe(false);
  });
});
