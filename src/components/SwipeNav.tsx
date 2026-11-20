"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

/** Swipe right for the next set, left to go back (Don's call). Ignores mostly-vertical drags so scrolling still works. */
export function SwipeNav({ nextHref, prevHref, children }: { nextHref: string | null; prevHref: string | null; children: ReactNode }) {
  const router = useRouter();
  const from = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      onTouchStart={(e) => {
        const t = e.touches[0];
        from.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const a = from.current;
        from.current = null;
        if (!a) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - a.x;
        const dy = t.clientY - a.y;
        if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        const to = dx > 0 ? nextHref : prevHref;
        if (to) router.push(to);
      }}
    >
      {children}
    </div>
  );
}
