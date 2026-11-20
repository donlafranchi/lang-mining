"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeMenuItem } from "./ThemeToggle";

type Me = { name: string; isAdmin: boolean };

/**
 * The bar at the top of every page: the person's avatar on the left, which opens everything that used to sit in the top
 * line (settings, admin, light or dark, sign out), and the app's name beside it. It asks who is signed in when a page
 * opens, so the page itself stays free of private data.
 */
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Signed in or not can change on any page change (signing in, signing out), so check when the page changes.
  useEffect(() => {
    if (pathname.startsWith("/login")) return;
    let live = true;
    fetch("/api/me")
      .then((res) => (res.ok ? (res.json() as Promise<Me>) : null))
      .then((data) => {
        if (live) setMe(data);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Nobody is signed in on the login page, whatever was known before.
  const person = pathname.startsWith("/login") ? null : me;

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    setMe(null);
    setOpen(false);
    setSigningOut(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="app-header">
      <div className="app-header-inner" ref={box}>
        {person && (
          <div className="avatar-wrap">
            <button type="button" className="avatar" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {person.name.trim().charAt(0).toUpperCase() || "?"}
            </button>
            {open && (
              <div className="menu" role="menu">
                <div className="menu-who muted">Signed in as {person.name}</div>
                <Link className="menu-item" href="/settings" role="menuitem" onClick={() => setOpen(false)}>
                  Settings
                </Link>
                {person.isAdmin && (
                  <Link className="menu-item" href="/admin" role="menuitem" onClick={() => setOpen(false)}>
                    Admin
                  </Link>
                )}
                <ThemeMenuItem />
                <button type="button" className="menu-item" onClick={() => void signOut()} disabled={signingOut}>
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            )}
          </div>
        )}
        <Link href="/" className="app-title">
          <strong>Hand to Brain:</strong> A Language Learning App
        </Link>
      </div>
    </header>
  );
}
