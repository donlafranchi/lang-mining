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
// Stands in for a line break while a paragraph is being gathered. Two or more in a row end the paragraph.
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
    // Two line breaks in a row start a new paragraph. A single one is just a space.
    for (const piece of buffer.split(new RegExp(`(?:\\s*${BREAK}\\s*){2,}`))) {
      const text = piece.replaceAll(BREAK, " ").replace(/\s+/g, " ").trim();
      if (text) paragraphs.push(text);
    }
    buffer = "";
  };

  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        buffer += child.nodeValue ?? "";
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

/** Plain readable text from an HTML page, with navigation, scripts, and styles removed and the paragraphs kept apart. */
export function extractArticleText(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document, { charThreshold: 100 }).parse();

  let text = article?.content ? paragraphsFromHtml(article.content).join("\n\n") : "";
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
  return text;
}

async function assertPublicHost(url: URL): Promise<void> {
  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some((a) => ipIsPrivate(a.address))) {
    throw new Error("That address is not a public web page.");
  }
}

/** Fetch a public article and return its readable text. Redirects are followed manually so every hop is re-checked. */
export async function fetchArticleText(rawUrl: string): Promise<{ text: string; finalUrl: string }> {
  let url = validateArticleUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": "lang-mining/0.1 (personal study tool)", accept: "text/html,application/xhtml+xml" },
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

    const html = new TextDecoder("utf-8").decode(buffer);
    return { text: extractArticleText(html, url.toString()), finalUrl: url.toString() };
  }
  throw new Error("Too many redirects.");
}
