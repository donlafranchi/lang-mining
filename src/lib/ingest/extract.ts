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

/** Plain readable text from an HTML page, with navigation, scripts, and styles removed. */
export function extractArticleText(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document, { charThreshold: 100 }).parse();
  const text = (article?.textContent ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();
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
