import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

// Runs public/sw.js in a sandbox with a fake browser, so the rules that keep private pages out of the cache are tested.
const source = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
const ORIGIN = "https://lang.example";

type Listener = (event: Record<string, unknown>) => void;

function fakeResponse(body: string, extra: Record<string, unknown> = {}) {
  const res = { body, ok: true, status: 200, clone: () => fakeResponse(body, extra), text: () => Promise.resolve(body), ...extra };
  return res;
}

function makeCaches(offlineHtml: string, failingUrls: string[]) {
  const stores = new Map<string, Map<string, unknown>>();
  const open = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return Promise.resolve({
      put: (req: { url?: string } | string, res: unknown) => {
        store.set(typeof req === "string" ? req : req.url!, res);
        return Promise.resolve();
      },
      match: (req: { url?: string } | string) => Promise.resolve(store.get(typeof req === "string" ? req : req.url!)),
      keys: () => Promise.resolve([...store.keys()].map((url) => ({ url }))),
      delete: (req: { url?: string } | string) => Promise.resolve(store.delete(typeof req === "string" ? req : req.url!)),
      addAll: (urls: string[]) => {
        for (const u of urls) store.set(u, fakeResponse(u === "/offline" ? offlineHtml : `cached ${u}`));
        return Promise.resolve();
      },
      add: (url: string) => {
        if (failingUrls.includes(url)) return Promise.reject(new Error("fetch failed"));
        store.set(url, fakeResponse(`cached ${url}`));
        return Promise.resolve();
      },
    });
  };
  return {
    stores,
    open,
    match: (req: { url?: string } | string) => {
      const key = typeof req === "string" ? req : req.url!;
      for (const store of stores.values()) {
        for (const [k, v] of store) {
          if (k === key || k === new URL(key, ORIGIN).pathname || new URL(k, ORIGIN).href === new URL(key, ORIGIN).href) return Promise.resolve(v);
        }
      }
      return Promise.resolve(undefined);
    },
    keys: () => Promise.resolve([...stores.keys()]),
    delete: (name: string) => Promise.resolve(stores.delete(name)),
  };
}

function load(
  fetchImpl: (req: unknown) => Promise<unknown> = () => Promise.resolve(fakeResponse("network")),
  options: { offlineHtml?: string; failingUrls?: string[] } = {},
) {
  const listeners: Record<string, Listener> = {};
  const caches = makeCaches(options.offlineHtml ?? "cached /offline", options.failingUrls ?? []);
  const fetchMock = vi.fn(fetchImpl);
  const claim = vi.fn(() => Promise.resolve());
  const skipWaiting = vi.fn(() => Promise.resolve());
  const self = {
    addEventListener: (type: string, fn: Listener) => {
      listeners[type] = fn;
    },
    location: { origin: ORIGIN },
    clients: { claim },
    skipWaiting,
  };
  const sandbox = {
    self,
    caches,
    fetch: fetchMock,
    URL,
    Promise,
    Response: { error: () => ({ type: "error" }) },
  };
  vm.runInNewContext(source, sandbox);
  return { listeners, caches, fetchMock, claim, skipWaiting };
}

/** Fires a fetch event. Returns what the worker answered with, or "bypassed" if it left the request alone. */
async function fire(sw: ReturnType<typeof load>, req: { url: string; method?: string; mode?: string }) {
  let answered: Promise<unknown> | undefined;
  sw.listeners.fetch({
    request: { method: "GET", mode: "cors", ...req, url: req.url.startsWith("http") ? req.url : `${ORIGIN}${req.url}` },
    respondWith: (p: Promise<unknown>) => {
      answered = p;
    },
  });
  return answered === undefined ? "bypassed" : await answered;
}

async function install(sw: ReturnType<typeof load>) {
  let pending: Promise<unknown> | undefined;
  sw.listeners.install({ waitUntil: (p: Promise<unknown>) => (pending = p) });
  await pending;
}

describe("service worker: install and update", () => {
  it("stores the offline page and the icons when installed, then takes over at once", async () => {
    const sw = load();
    await install(sw);
    const all = [...sw.caches.stores.values()].flatMap((s) => [...s.keys()]);
    expect(all).toContain("/offline");
    expect(all).toContain("/icons/icon-192.png");
    expect(sw.skipWaiting).toHaveBeenCalled();
  });

  it("deletes caches from older versions when activated, and keeps its own", async () => {
    const sw = load();
    await install(sw);
    await sw.caches.open("static-old");
    await sw.caches.open("something-else");
    let pending: Promise<unknown> | undefined;
    sw.listeners.activate({ waitUntil: (p: Promise<unknown>) => (pending = p) });
    await pending;
    const names = await sw.caches.keys();
    expect(names).not.toContain("static-old");
    expect(names).toContain("something-else");
    expect(names.filter((n) => n.startsWith("static-"))).toHaveLength(1);
    expect(sw.claim).toHaveBeenCalled();
  });
});

describe("service worker: the offline page's own files", () => {
  const html =
    '<link rel="stylesheet" href="/_next/static/chunks/app.css"/><script src="/_next/static/chunks/page.js"></script>' +
    '<script src="/_next/static/chunks/page.js"></script><a href="/deck">x</a><img src="https://elsewhere.example/_next/static/x.js"/>';

  it("also keeps the stylesheet and scripts the offline page needs, once each", async () => {
    const sw = load(undefined, { offlineHtml: html });
    await install(sw);
    const all = [...sw.caches.stores.values()].flatMap((s) => [...s.keys()]);
    expect(all).toContain("/_next/static/chunks/app.css");
    expect(all).toContain("/_next/static/chunks/page.js");
    expect(all.filter((k) => k === "/_next/static/chunks/page.js")).toHaveLength(1);
    expect(all).not.toContain("/deck");
  });

  it("does not fail to install if one of those files cannot be fetched", async () => {
    const sw = load(undefined, { offlineHtml: html, failingUrls: ["/_next/static/chunks/app.css"] });
    await install(sw);
    const all = [...sw.caches.stores.values()].flatMap((s) => [...s.keys()]);
    expect(all).toContain("/offline");
    expect(all).toContain("/_next/static/chunks/page.js");
    expect(sw.skipWaiting).toHaveBeenCalled();
  });
});

describe("service worker: pages", () => {
  it("passes a working page load through and does not store it", async () => {
    const sw = load(() => Promise.resolve(fakeResponse("private lesson page")));
    await install(sw);
    const before = JSON.stringify([...sw.caches.stores].map(([n, s]) => [n, [...s.keys()]]));
    const res = (await fire(sw, { url: "/sessions/abc", mode: "navigate" })) as { body: string };
    expect(res.body).toBe("private lesson page");
    const after = JSON.stringify([...sw.caches.stores].map(([n, s]) => [n, [...s.keys()]]));
    expect(after).toBe(before);
  });

  it("answers a failed page load with the cached offline page", async () => {
    const sw = load(() => Promise.reject(new Error("offline")));
    await install(sw);
    const res = (await fire(sw, { url: "/deck", mode: "navigate" })) as { body: string };
    expect(res.body).toBe("cached /offline");
  });

  it("gives a plain network error if even the offline page is missing", async () => {
    const sw = load(() => Promise.reject(new Error("offline")));
    const res = (await fire(sw, { url: "/deck", mode: "navigate" })) as { type: string };
    expect(res.type).toBe("error");
  });
});

describe("service worker: what it never touches", () => {
  it.each([
    ["a POST", { url: "/api/sessions", method: "POST" }],
    ["a GET to the API", { url: "/api/deck" }],
    ["a page data request", { url: "/sessions/abc?_rsc=xyz" }],
    ["another site", { url: "https://elsewhere.example/_next/static/a.js" }],
    ["a DELETE", { url: "/api/sessions/abc", method: "DELETE" }],
  ])("leaves %s alone", async (_label, req) => {
    const sw = load();
    await install(sw);
    expect(await fire(sw, req)).toBe("bypassed");
    expect(sw.fetchMock).not.toHaveBeenCalled();
  });

  it("never stores anything under /api/", async () => {
    const sw = load();
    await install(sw);
    await fire(sw, { url: "/api/deck" });
    const all = [...sw.caches.stores.values()].flatMap((s) => [...s.keys()]);
    expect(all.some((k) => k.includes("/api/"))).toBe(false);
  });
});

describe("service worker: static files", () => {
  it("fetches a static file once, stores it, and serves it from the cache after that", async () => {
    const sw = load(() => Promise.resolve(fakeResponse("chunk")));
    await install(sw);
    const first = (await fire(sw, { url: "/_next/static/chunks/a.js" })) as { body: string };
    expect(first.body).toBe("chunk");
    expect(sw.fetchMock).toHaveBeenCalledTimes(1);
    const second = (await fire(sw, { url: "/_next/static/chunks/a.js" })) as { body: string };
    expect(second.body).toBe("chunk");
    expect(sw.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not store a failed response", async () => {
    const sw = load(() => Promise.resolve(fakeResponse("nope", { ok: false, status: 500 })));
    await install(sw);
    await fire(sw, { url: "/_next/static/chunks/bad.js" });
    const all = [...sw.caches.stores.values()].flatMap((s) => [...s.keys()]);
    expect(all.some((k) => k.includes("bad.js"))).toBe(false);
  });

  it("keeps the cache under its size cap", async () => {
    const sw = load(() => Promise.resolve(fakeResponse("chunk")));
    await install(sw);
    for (let i = 0; i < 200; i++) await fire(sw, { url: `/_next/static/chunks/f${i}.js` });
    const sizes = [...sw.caches.stores.values()].map((s) => s.size);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(130);
  });
});
