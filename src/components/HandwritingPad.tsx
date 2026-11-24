"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hasWriting, undoStroke, type Stroke } from "@/lib/strokes";

/**
 * A plain drawing area for writing a word with a finger or a stylus. Nothing is stored or checked: the point is the
 * movement. Undo takes back the last stroke, Clear starts again. `onChange` says whether anything has been written.
 */
export function HandwritingPad({
  onChange,
}: {
  onChange?: (written: boolean) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const drawing = useRef(false);
  const [written, setWritten] = useState(false);
  const [count, setCount] = useState(0);

  const redraw = useCallback(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = getComputedStyle(el).color;
    for (const s of strokes.current) {
      if (s.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(s[0].x, s[0].y);
      if (s.length === 1) ctx.lineTo(s[0].x + 0.1, s[0].y);
      for (const p of s.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }, []);

  const sync = useCallback(() => {
    const now = hasWriting(strokes.current);
    setWritten(now);
    setCount(strokes.current.length);
    onChange?.(now);
  }, [onChange]);

  // Match the drawing surface to its size on screen, sharp on a phone's dense display.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const fit = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = el.getBoundingClientRect();
      el.width = Math.round(width * ratio);
      el.height = Math.round(height * ratio);
      redraw();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [redraw]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <div className="stack">
      <canvas
        ref={canvas}
        className="write-pad"
        aria-label="Write here with your finger or a stylus"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          strokes.current.push([point(e)]);
          redraw();
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          strokes.current[strokes.current.length - 1].push(point(e));
          redraw();
        }}
        onPointerUp={() => {
          drawing.current = false;
          sync();
        }}
        onPointerCancel={() => {
          drawing.current = false;
          sync();
        }}
      />
      <div className="deck-links">
        <button
          type="button"
          className="btn secondary small"
          disabled={count === 0}
          onClick={() => {
            strokes.current = undoStroke(strokes.current);
            redraw();
            sync();
          }}
        >
          Undo
        </button>
        <button
          type="button"
          className="btn secondary small"
          disabled={!written && count === 0}
          onClick={() => {
            strokes.current = [];
            redraw();
            sync();
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
