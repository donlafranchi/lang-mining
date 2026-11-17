import { describe, expect, it } from "vitest";
import { extractArticleText, looksLikeUrl, validateArticleUrl } from "./extract";

const html = `<!doctype html>
<html><head><title>La vida en la isla</title>
<script>window.secret = "tracking-code-should-not-appear";</script>
<style>.x{color:red}</style></head>
<body>
<nav><a href="/">Inicio</a><a href="/contacto">Contacto</a></nav>
<article>
<h1>La vida en la isla</h1>
<p>Los domingos la familia se reúne en la playa para comer y hablar de todo un poco.</p>
<p>Mi abuela siempre dice que hay que disfrutar el momento, porque la vida es corta y el tiempo vuela cuando uno la pasa bien.</p>
<p>Después del almuerzo, los niños juegan en la arena mientras los mayores echan un pie con la música de fondo.</p>
</article>
<footer>© 2026 Todos los derechos reservados</footer>
</body></html>`;

describe("extractArticleText", () => {
  it("returns plain article text, not markup", () => {
    const text = extractArticleText(html, "https://example.com/isla");
    expect(text).toMatch(/la familia se reúne en la playa/);
    expect(text).not.toMatch(/<\/?p>/);
    expect(text).not.toMatch(/<article/);
  });

  it("drops scripts and styles", () => {
    const text = extractArticleText(html, "https://example.com/isla");
    expect(text).not.toMatch(/tracking-code/);
    expect(text).not.toMatch(/color:red/);
  });

  it("throws a readable error when no article text can be found", () => {
    expect(() =>
      extractArticleText("<html><body></body></html>", "https://example.com/empty"),
    ).toThrow(/no readable text/i);
  });
});

describe("looksLikeUrl", () => {
  it("treats a single http(s) token as a URL", () => {
    expect(looksLikeUrl("https://example.com/a?b=1")).toBe(true);
    expect(looksLikeUrl("  http://example.com  ")).toBe(true);
  });

  it("treats prose, even prose containing a URL, as text", () => {
    expect(looksLikeUrl("Mira esto https://example.com qué bueno")).toBe(false);
    expect(looksLikeUrl("Hola, ¿cómo estás?")).toBe(false);
  });
});

describe("validateArticleUrl", () => {
  it("accepts a normal https URL", () => {
    expect(validateArticleUrl("https://elpais.com/articulo").hostname).toBe("elpais.com");
  });

  it.each([
    "ftp://example.com/file",
    "file:///etc/passwd",
    "http://localhost:3000/x",
    "http://127.0.0.1/x",
    "http://10.0.0.5/x",
    "http://192.168.1.10/x",
    "http://172.16.0.1/x",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/x",
    "http://intranet/x",
  ])("rejects %s", (url) => {
    expect(() => validateArticleUrl(url)).toThrow();
  });
});
