import type { Language } from "./languages";

// Wikipedia in the learner's language as a place to find things to read: free to use and share, any topic, plain text.
// Only the first part of an article is mined, so one tap never turns into a very long, costly lesson.

export const MAX_INTRO_CHARS = 3500;
const MIN_INTRO_CHARS = 400;
const UA = "HandToBrain/1.0 (language learning app; reading suggestions)";

type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

export type WikiItem = { title: string; preview: string };

const host = (language: Language) => `https://${language}.wikipedia.org`;

async function api(language: Language, params: Record<string, string>, fetcher: FetchLike): Promise<Record<string, unknown>> {
  const url = `${host(language)}/w/api.php?${new URLSearchParams({ format: "json", formatversion: "2", ...params }).toString()}`;
  const res = await fetcher(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error("Wikipedia did not answer. Try again in a moment.");
  return (await res.json()) as Record<string, unknown>;
}

/**
 * The plain text of an article's opening, cut at a paragraph end. Section headings and other short label lines are
 * dropped, since they are not sentences.
 */
export function introFromExtract(extract: string, max = MAX_INTRO_CHARS): string {
  const paragraphs = extract
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= 60 || /[.!?…؟»"”]$/.test(p))
    .filter((p) => p.length >= 30);
  const out: string[] = [];
  let total = 0;
  for (const p of paragraphs) {
    if (total + p.length > max && out.length > 0) break;
    out.push(p.length > max ? p.slice(0, max) : p);
    total += p.length;
  }
  return out.join("\n\n");
}

export async function articleIntro(language: Language, title: string, fetcher: FetchLike = fetch): Promise<{ title: string; text: string; url: string }> {
  const data = await api(language, { action: "query", prop: "extracts", explaintext: "1", exsectionformat: "plain", titles: title, redirects: "1" }, fetcher);
  const pages = ((data.query as { pages?: { title?: string; extract?: string; missing?: boolean }[] } | undefined)?.pages ?? []).filter((p) => !p.missing);
  const page = pages[0];
  if (!page?.extract) throw new Error("That article could not be found.");
  const text = introFromExtract(page.extract);
  const finalTitle = page.title ?? title;
  return { title: finalTitle, text, url: `${host(language)}/wiki/${encodeURIComponent(finalTitle.replace(/ /g, "_"))}` };
}

export async function searchArticles(language: Language, query: string, fetcher: FetchLike = fetch): Promise<WikiItem[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await api(language, { action: "query", list: "search", srsearch: q, srlimit: "8", srnamespace: "0" }, fetcher);
  const hits = ((data.query as { search?: { title: string; snippet?: string }[] } | undefined)?.search ?? []);
  // The snippet is a short piece of HTML with highlight tags and entities.
  return hits.map((h) => ({ title: h.title, preview: (h.snippet ?? "").replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#039;/g, "'").trim() }));
}

/** A random article with enough text to be worth reading. Tries a few times, since many random pages are stubs. */
export async function randomArticle(language: Language, fetcher: FetchLike = fetch): Promise<WikiItem> {
  for (let i = 0; i < 5; i++) {
    const data = await api(language, { action: "query", list: "random", rnnamespace: "0", rnlimit: "1" }, fetcher);
    const title = ((data.query as { random?: { title: string }[] } | undefined)?.random ?? [])[0]?.title;
    if (!title) continue;
    try {
      const intro = await articleIntro(language, title, fetcher);
      if (intro.text.length >= MIN_INTRO_CHARS) return { title: intro.title, preview: intro.text.slice(0, 220) };
    } catch {
      // Try another.
    }
  }
  throw new Error("Could not find an article just now. Try again.");
}

/**
 * A first sentence for each of these article titles, in the order given. A title Wikipedia does not have is left out,
 * and a redirect is followed, so a list written by hand cannot show a dead entry.
 */
export async function previewsFor(language: Language, titles: string[], fetcher: FetchLike = fetch): Promise<WikiItem[]> {
  const found = new Map<string, string>();
  const redirects = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const data = await api(language, { action: "query", prop: "extracts", exintro: "1", explaintext: "1", exsentences: "1", exlimit: "max", redirects: "1", titles: batch.join("|") }, fetcher);
    const q = data.query as { normalized?: { from: string; to: string }[]; redirects?: { from: string; to: string }[]; pages?: { title: string; extract?: string; missing?: boolean }[] } | undefined;
    for (const n of q?.normalized ?? []) redirects.set(n.from, n.to);
    for (const r of q?.redirects ?? []) redirects.set(r.from, r.to);
    for (const p of q?.pages ?? []) if (!p.missing) found.set(p.title, (p.extract ?? "").replace(/\s+/g, " ").trim());
  }
  const final = (title: string) => {
    let t = title;
    for (let hops = 0; hops < 3 && redirects.has(t); hops++) t = redirects.get(t)!;
    return t;
  };
  const seen = new Set<string>();
  const out: WikiItem[] = [];
  for (const title of titles) {
    const t = final(title);
    if (!found.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push({ title: t, preview: found.get(t)!.slice(0, 220) });
  }
  return out;
}
