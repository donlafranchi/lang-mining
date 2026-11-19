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

/**
 * The article's text with one blank line between paragraphs. Paragraph breaks come from the page's own tags (a
 * paragraph, a heading, a list item, a double line break), not from whitespace in the HTML, because most sites send
 * their HTML squashed together with nothing between the tags.
 */
function paragraphsFromHtml(html: string): string[] {
  const root = new JSDOM(`<body>${html}</body>`).window.document.body;
  const paragraphs: string[] = [];
  let buffer = "";

  const flush = () => {
    // Every line break starts a new piece. Lines that are too short to stand alone (an address, a line of a poem) are
    // joined back to their neighbours when the lesson paragraphs are made, so a single <br> between paragraphs works
    // without breaking those.
    for (const piece of buffer.split(new RegExp(`\\s*${BREAK}\\s*`))) {
      const text = piece.replaceAll(BREAK, " ").replace(/\s+/g, " ").trim();
      if (text) paragraphs.push(text);
    }
    buffer = "";
  };

  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        // A blank line inside a text node is a paragraph break (pages that send plain text in a styled box).
        buffer += (child.nodeValue ?? "").replace(/\n[ \t]*\n\s*/g, `${BREAK}${BREAK}`);
      } else if (child.nodeType === 1) {
        const tag = (child as Element).tagName;
        if (SKIP_TAGS.has(tag)) continue;
        if (tag === "BR") {
          buffer += BREAK;
        } else if (BLOCK_TAGS.has(tag)) {
          flush();
          walk(child);
          flush();
        } else {
          walk(child);
        }
      }
    }
  };

  walk(root);
  flush();
  return paragraphs;
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
  const article = new Readability(dom.window.document, { charThreshold: 100 }).parse();
  const title = (article?.title ?? "").replace(/\s+/g, " ").trim();

  let text = article?.content ? cleanParagraphs(paragraphsFromHtml(article.content)).join("\n\n") : "";
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
