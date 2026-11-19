import { describe, expect, it } from "vitest";
import { acceptPointer, extendStroke, hasInk, startStroke, undoStroke } from "./strokes";

const p = (x: number, y: number) => ({ x, y, pressure: 0.5 });

describe("strokes", () => {
  it("starts empty with no ink", () => {
    expect(hasInk([])).toBe(false);
  });

  it("adds points to the current stroke and starts a new stroke on each touch", () => {
    let s = startStroke([], p(0, 0));
    s = extendStroke(s, p(10, 10));
    s = startStroke(s, p(50, 50));
    expect(s.map((x) => x.length)).toEqual([2, 1]);
    expect(hasInk(s)).toBe(true);
  });

  it("ignores a point that did not move", () => {
    let s = startStroke([], p(5, 5));
    s = extendStroke(s, p(5.1, 5.1));
    expect(s[0].length).toBe(1);
  });

  it("undoes one stroke at a time and never goes below empty", () => {
    let s = startStroke(startStroke([], p(0, 0)), p(9, 9));
    s = undoStroke(s);
    expect(s.length).toBe(1);
    s = undoStroke(undoStroke(s));
    expect(s).toEqual([]);
  });

  it("does not change the input", () => {
    const base = startStroke([], p(0, 0));
    extendStroke(base, p(20, 20));
    expect(base[0].length).toBe(1);
  });

  it("rejects finger touches once a stylus has been seen, but not before", () => {
    expect(acceptPointer("touch", false)).toBe(true);
    expect(acceptPointer("touch", true)).toBe(false);
    expect(acceptPointer("pen", true)).toBe(true);
    expect(acceptPointer("mouse", true)).toBe(true);
  });
});
