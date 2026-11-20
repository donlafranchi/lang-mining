import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

const MAX_BYTES = 2_000_000;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;
const MIN_TEXT_CHARS = 40;

/** A single http(s) token is a URL; prose that merely contains one is text. */
export function looksLikeUrl(input: string): boolean {
  return /^https?:\/\/\S+$/i.test(input.trim());
}

function ipv4IsPrivate(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function ipIsPrivate(ip: string): boolean {
  if (isIP(ip) === 4) return ipv4IsPrivate(ip);
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return ipv4IsPrivate(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

/** Reject anything that is not a public http(s) page. Guards the server from being pointed at internal addresses. */
export function validateArticleUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("That does not look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https links are supported.");
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.startsWith("[") ||
    !host.includes(".")
  ) {
    throw new Error("That address is not a public web page.");
  }
  if (isIP(host) === 4 && ipv4IsPrivate(host)) {
    throw new Error("That address is not a public web page.");
  }
  return url;
}

// Tags that start and end a paragraph. Everything else (links, emphasis, spans) stays inside the paragraph it is in.
const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DETAILS", "DIV", "DL", "DT", "FIELDSET", "FIGCAPTION", "FIGURE",
  "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE",
  "SECTION", "SUMMARY", "TABLE", "TBODY", "TD", "TH", "THEAD", "TR", "UL",
]);
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
// Stands in for a line break while a paragraph is being gathered. Each one ends the piece it is in.
const BREAK = "\u0001";

/** One run of text from the article's HTML, with what it came from. */
type Piece = {
  text: string;
  /** The innermost block tag it sat in: P, H2, DIV, LI, FIGCAPTION... */
  tag: string;
  /** Share of the characters that were inside links. */
  linkShare: number;
};

/**
 * The article's text as paragraphs. Paragraph breaks come from the page's own tags (a paragraph, a heading, a list
 * item, a double line break), not from whitespace in the HTML, because most sites send their HTML squashed together
 * with nothing between the tags. Each piece remembers its tag and how much of it was links, so page furniture can be
 * told apart from the article by structure.
 */
function piecesFromHtml(html: string): Piece[] {
  const root = new JSDOM(`<body>${html}</body>`).window.document.body;
  const pieces: Piece[] = [];
  let buffer = "";
  let linkChars = 0;
  let blockTag = "DIV";

  const flush = () => {
    // Every line break starts a new piece. Lines that are too short to stand alone (an address, a line of a poem) are
    // joined back to their neighbours when the lesson paragraphs are made, so a single <br> between paragraphs works
    // without breaking those.
    const share = buffer.length > 0 ? Math.min(1, linkChars / buffer.replace(new RegExp(BREAK, "g"), "").length || 0) : 0;
    for (const piece of buffer.split(new RegExp(`\\s*${BREAK}\\s*`))) {
      const text = piece.replaceAll(BREAK, " ").replace(/\s+/g, " ").trim();
      if (text) pieces.push({ text, tag: blockTag, linkShare: share });
    }
    buffer = "";
    linkChars = 0;
  };

  const walk = (node: Node, inLink: boolean) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        // A blank line inside a text node is a paragraph break (pages that send plain text in a styled box).
        const value = (child.nodeValue ?? "").replace(/\n[ \t]*\n\s*/g, `${BREAK}${BREAK}`);
        buffer += value;
        if (inLink) linkChars += value.replace(/\s+/g, " ").trim().length;
      } else if (child.nodeType === 1) {
        const tag = (child as Element).tagName;
        if (SKIP_TAGS.has(tag)) continue;
        if (tag === "BR") {
          buffer += BREAK;
        } else if (BLOCK_TAGS.has(tag)) {
          flush();
          const outer = blockTag;
          blockTag = tag;
          walk(child, inLink || tag === "A");
          flush();
          blockTag = outer;
        } else {
          walk(child, inLink || tag === "A");
        }
      }
    }
  };

  walk(root, false);
  flush();
  return pieces;
}

/**
 * After the article is picked out: a piece that is mostly links is a menu, a "related" list or a "discover more"
 * link, not the story.
 */
export function keepArticlePieces(pieces: Piece[]): Piece[] {
  return pieces.filter((p) => !(p.linkShare > 0.6 && p.text.split(/\s+/).length < 40));
}

// Parts of a page that are never the story: navigation, footers, forms, players, dates.
const PRUNE_TAGS = new Set(["NAV", "ASIDE", "FOOTER", "FORM", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "IFRAME", "VIDEO", "AUDIO", "SVG", "DIALOG", "TIME", "FIGCAPTION"]);
const PRUNE_ROLES = new Set(["navigation", "banner", "complementary", "contentinfo", "search", "dialog", "toolbar", "menu"]);
// Words in a class or id that say what a box is for ("share-bar", "related_posts").
const PRUNE_WORDS = new Set([
  "share", "sharing", "social", "related", "recommended", "trending", "newsletter", "promo", "promos", "advert", "advertisement",
  "ad", "ads", "banner", "breadcrumb", "breadcrumbs", "comment", "comments", "subscribe", "subscription", "widget", "sidebar",
  "byline", "author", "authors", "timestamp", "dateline", "date", "tags", "taxonomy", "toolbar", "cookie", "cookies", "consent",
  "popup", "modal", "teaser", "outbrain", "taboola",
]);

/** Remove the furniture boxes from a page before the article is picked out of it. */
export function pruneFurniture(doc: Document): void {
  const bodyLength = (doc.body?.textContent ?? "").length || 1;
  const doomed: Element[] = [];
  for (const el of Array.from(doc.body?.querySelectorAll("*") ?? [])) {
    const tag = el.tagName;
    if (tag === "ARTICLE" || tag === "MAIN") continue;
    let remove = PRUNE_TAGS.has(tag);
    if (!remove) {
      const role = el.getAttribute("role")?.toLowerCase();
      remove = (role !== undefined && PRUNE_ROLES.has(role)) || el.getAttribute("aria-hidden") === "true" || el.hasAttribute("hidden");
    }
    if (!remove) {
      const words = `${el.getAttribute("class") ?? ""} ${el.id}`.toLowerCase().split(/[^a-z0-9]+/);
      // A huge wrapper with a word like "comments-open" in its class is the page, not a comment box.
      remove = words.some((w) => PRUNE_WORDS.has(w)) && (el.textContent ?? "").length < bodyLength * 0.6;
    }
    if (remove) doomed.push(el);
  }
  for (const el of doomed) el.remove();
  pruneLabelsAndLinkBlocks(doc);
}

const BLOCKS_INSIDE = "p, div, ul, ol, li, table, h1, h2, h3, h4, h5, h6, blockquote, section, article, figure";
const LABEL_TAGS = new Set(["DIV", "SPAN", "TD", "TH", "DT", "DD", "A", "LABEL", "SMALL"]);
const INLINE_PARENTS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "A", "EM", "STRONG", "B", "I", "SPAN", "SMALL", "BLOCKQUOTE", "FIGCAPTION", "LABEL", "U", "MARK", "SUP", "SUB"]);
const SENTENCE_END = /[.!?…»"”')\]]$/;

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * On a page written in ordinary paragraphs, a small box that holds no paragraph of its own and does not read like a
 * sentence ("Título del video", "Fecha de publicación 4 horas") is a label, not story. So is any block that is mostly
 * links and short ("Descubre más", a list of related notes). Done before the article is picked out, because that step
 * rewrites boxes into paragraphs and the difference is lost. A page with almost no paragraph tags is left alone.
 */
function pruneLabelsAndLinkBlocks(doc: Document): void {
  const real = Array.from(doc.body?.querySelectorAll("p") ?? []).filter((p) => (p.textContent ?? "").trim().length >= 40);
  if (real.length < 2) return;
  const doomed = new Set<Element>();
  for (const el of Array.from(doc.body.querySelectorAll("*"))) {
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const words = wordCount(text);
    // Mostly links and short: a menu, a related list, a "discover more" link.
    const inlineHere = (el.tagName === "A" || el.tagName === "SPAN") && INLINE_PARENTS.has(el.parentElement?.tagName ?? "");
    if (words < 30 && !inlineHere && /^(P|DIV|UL|OL|SECTION|TABLE|TD|A|SPAN)$/.test(el.tagName)) {
      const linked = Array.from(el.querySelectorAll("a")).reduce((n, a) => n + (a.textContent ?? "").replace(/\s+/g, " ").trim().length, 0);
      const own = el.tagName === "A" ? text.length : linked;
      if (own / text.length >= 0.8 && !real.includes(el as HTMLParagraphElement)) doomed.add(el);
    }
    // A small box with no block inside it that is not a sentence.
    if (LABEL_TAGS.has(el.tagName) && !el.querySelector(BLOCKS_INSIDE)) {
      const parent = el.parentElement?.tagName ?? "";
      if (INLINE_PARENTS.has(parent)) continue;
      if (words < 6 || !SENTENCE_END.test(text)) doomed.add(el);
    }
  }
  for (const el of doomed) el.remove();
}

const BOILERPLATE =
  /^(leer (también|más)|lee (también|más)|te (puede|podría) interesar|sigue leyendo|síguenos|suscríbete|suscr[ií]base|compartir|comparte|comentarios?|publicidad|anuncio|foto:|fotograf[ií]a:|imagen:|etiquetas?:|más noticias|noticias relacionadas|مطالب مرتبط|بیشتر بخوانید|اشتراک[‌ ]?گذاری|منبع:)/i;

// Whole short lines that are page furniture: reading time, bylines, dates, "listen to this", ads. Matched on the whole
// line, so a sentence that merely starts the same way ("Por eso nadie vino.") stays.
const FURNITURE: RegExp[] = [
  /^\d+\s*(?:-\s*\d+\s*)?(?:min(?:ute)?s?\.?|minutos?\.?)\s*(?:read|de lectura|para leer)\.?$/i,
  /^(?:tiempo de lectura|lectura|reading time|read time)\s*:?\s*~?\d+\s*(?:min(?:ute)?s?\.?|minutos?\.?)\.?$/i,
  /^(?:[Pp]or|[Bb]y|[Rr]edacci[oó]n|[Tt]exto)\s*:?\s+\p{Lu}[\p{L}.'’-]*(?:\s+(?:de\s+|del\s+|la\s+)?\p{Lu}[\p{L}.'’-]*){0,3}$/u,
  /^(?:publicado|actualizado|updated|published|modificado|fecha)(?:\s+el)?\s*:?\s*[\d\p{L}.,:/ -]{4,40}$/iu,
  /^(?:escucha esta nota|escuchar|listen to this(?: article)?|advertisement|advertising|publicidad|anuncio)$/i,
  /^(?:descubre|ver|leer|conoce|mira|lee|see|read|discover)\s+(?:m[aá]s|todo|more|all|la galer[ií]a|el v[ií]deo|la nota completa)\.?$/i,
  /^(?:fuente(?: de la (?:imagen|foto|fotograf[ií]a))?|pie de foto|cr[eé]ditos?(?: de la (?:imagen|foto))?|image source|photo credit)\b[^.!?]{0,50}$/i,
  /^(?:t[ií]tulo|descripci[oó]n|duraci[oó]n|cr[eé]ditos?)\s+del?\s+(?:v[ií]deo|audio|galer[ií]a|art[ií]culo|nota)\s*:?.{0,40}$/i,
];

/** Remove repeats and the share/related-link lines news pages put between paragraphs. Short headings stay. */
export function cleanParagraphs(paragraphs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paragraphs) {
    const text = p.trim();
    if (!text) continue;
    if (BOILERPLATE.test(text) && text.length < 120) continue;
    if (text.length < 60 && FURNITURE.some((re) => re.test(text))) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

/** Decode page bytes using the charset from the header, then the page's own declaration, then UTF-8. */
export function decodeHtml(bytes: Uint8Array, contentType: string): string {
  const fromHeader = /charset\s*=\s*["']?([\w.:-]+)/i.exec(contentType)?.[1];
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 2048));
  const fromMeta = /<meta[^>]+charset\s*=\s*["']?([\w.:-]+)/i.exec(head)?.[1];
  for (const label of [fromHeader, fromMeta, "utf-8"]) {
    if (!label) continue;
    try {
      return new TextDecoder(label).decode(bytes);
    } catch {
      // An unknown charset name: try the next source.
    }
  }
  return new TextDecoder("utf-8").decode(bytes);
}

/** The readable text of an HTML page, with navigation, scripts and styles removed and the paragraphs kept apart, plus its title. */
export function extractArticle(html: string, url: string): { text: string; title: string } {
  const dom = new JSDOM(html, { url });
  pruneFurniture(dom.window.document);
  const article = new Readability(dom.window.document, { charThreshold: 100 }).parse();
  const title = (article?.title ?? "").replace(/\s+/g, " ").trim();

  let text = article?.content ? cleanParagraphs(keepArticlePieces(piecesFromHtml(article.content)).map((p) => p.text)).join("\n\n") : "";
  if (text.length < MIN_TEXT_CHARS) {
    // The page had text but no usable tags. Fall back to its plain text rather than giving up.
    text = (article?.textContent ?? "")
      .replace(/\r/g, "")
      .replace(/[ \t\u00a0]+/g, " ")
      .replace(/\n\s*\n\s*/g, "\n\n")
      .trim();
  }
  if (text.length < MIN_TEXT_CHARS) {
    throw new Error("No readable text found on that page. It may need a login or be built with scripts.");
  }
  return { text, title };
}

export function extractArticleText(html: string, url: string): string {
  return extractArticle(html, url).text;
}

async function assertPublicHost(url: URL): Promise<void> {
  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some((a) => ipIsPrivate(a.address))) {
    throw new Error("That address is not a public web page.");
  }
}

/** Fetch a public article and return its readable text. Redirects are followed manually so every hop is re-checked. */
export async function fetchArticleText(rawUrl: string): Promise<{ text: string; title: string; finalUrl: string; html: string }> {
  let url = validateArticleUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        // Some news sites refuse unknown clients, so look like a normal phone browser.
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "es,fa;q=0.9,en;q=0.5",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("The page redirected without saying where.");
      url = validateArticleUrl(new URL(location, url).toString());
      continue;
    }
    if (!res.ok) throw new Error(`The page returned an error (${res.status}).`);

    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(type)) {
      throw new Error("That link is not a web page. Paste the text instead.");
    }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) throw new Error("That page is too large to process.");

    const html = decodeHtml(new Uint8Array(buffer), type);
    const { text, title } = extractArticle(html, url.toString());
    return { text, title, finalUrl: url.toString(), html };
  }
  throw new Error("Too many redirects.");
}
