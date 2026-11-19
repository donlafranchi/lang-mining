"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { acceptPointer, extendStroke, hasInk, startStroke, undoStroke, type Stroke } from "@/lib/strokes";

const HEIGHT = 220;

/** A drawing area for writing a word with a finger or a stylus. Locks when `locked` so the writing stays visible. */
export function HandwritingPad(props: { locked?: boolean; onInkChange?: (hasInk: boolean) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const drawing = useRef(false);
  const penSeen = useRef(false);
  const [ink, setInk] = useState(false);
  const { onInkChange } = props;

  const redraw = useCallback(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.strokeStyle = getComputedStyle(el).color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokes.current) {
      if (stroke.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        continue;
      }
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineWidth = 1.5 + stroke[i].pressure * 3.5;
        ctx.beginPath();
        ctx.moveTo(stroke[i - 1].x, stroke[i - 1].y);
        ctx.lineTo(stroke[i].x, stroke[i].y);
        ctx.stroke();
      }
    }
  }, []);

  // Size the canvas to its box at the screen's pixel density, so lines stay sharp on a phone.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = el.clientWidth;
      el.width = Math.round(width * dpr);
      el.height = Math.round(HEIGHT * dpr);
      redraw();
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [redraw]);

  function update(next: Stroke[]) {
    strokes.current = next;
    const has = hasInk(next);
    setInk(has);
    onInkChange?.(has);
    redraw();
  }

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    // A finger or mouse reports no real pressure, so give it a steady middle value.
    const pressure = e.pointerType === "pen" ? e.pressure : 0.5;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, pressure };
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (props.locked) return;
    if (e.pointerType === "pen") penSeen.current = true;
    if (!acceptPointer(e.pointerType, penSeen.current)) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    update(startStroke(strokes.current, point(e)));
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || props.locked) return;
    e.preventDefault();
    // Coalesced events fill in the points between frames, so fast strokes stay smooth.
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const rect = e.currentTarget.getBoundingClientRect();
    const list = events.length > 0 ? events : [e.nativeEvent];
    let next = strokes.current;
    for (const ev of list) {
      const pressure = e.pointerType === "pen" ? ev.pressure : 0.5;
      next = extendStroke(next, { x: ev.clientX - rect.left, y: ev.clientY - rect.top, pressure });
    }
    update(next);
  }

  function up() {
    drawing.current = false;
  }

  return (
    <div className="stack">
      <canvas
        ref={canvas}
        className="pad"
        style={{ height: HEIGHT }}
        aria-label="Writing area. Write the word with your finger or stylus."
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        data-testid="pad"
      />
      {!props.locked && (
        <div className="pad-actions">
          <button type="button" className="btn secondary small" onClick={() => update(undoStroke(strokes.current))} disabled={!ink}>
            Undo
          </button>
          <button type="button" className="btn secondary small" onClick={() => update([])} disabled={!ink}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
