import { describe, expect, it } from "vitest";
import { splitParagraphs } from "../enrichment/paragraphs";
import { cleanParagraphs, decodeHtml, extractArticle, extractArticleText, looksLikeUrl, validateArticleUrl } from "./extract";

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

// Most real sites ship their HTML minified, with nothing between the tags. The paragraph breaks have to come from the
// tags themselves, not from whitespace in the source.
const P1 = "Los domingos la familia se reúne en la playa para comer y hablar de todo un poco, como siempre.";
const P2 = "Mi abuela siempre dice que hay que disfrutar el momento, porque la vida es corta y el tiempo vuela.";
const P3 = "Después del almuerzo, los niños juegan en la arena mientras los mayores escuchan música de fondo.";
const page = (body: string) =>
  `<!doctype html><html><head><title>Una página</title></head><body><nav><a href="/">Inicio</a></nav><article>${body}</article><footer>© 2026</footer></body></html>`;
const paragraphsOf = (text: string) => text.split("\n\n");

describe("extractArticleText keeps the paragraphs", () => {
  it("separates paragraphs even when the HTML has nothing between the tags", () => {
    const text = extractArticleText(page(`<h2>Un título distinto</h2><p>${P1}</p><p>${P2}</p><p>${P3}</p>`), "https://example.com/a");
    expect(paragraphsOf(text)).toEqual(["Un título distinto", P1, P2, P3]);
  });

  it("so the paragraph splitter finds the same paragraphs the page has", () => {
    const text = extractArticleText(page(`<p>${P1}</p><p>${P2}</p><p>${P3}</p>`), "https://example.com/a");
    expect(splitParagraphs(text)).toEqual([P1, P2, P3]);
  });

  it("does not turn a whole minified article into one paragraph", () => {
    const many = Array.from({ length: 12 }, (_, i) => `<p>${P1} (${i + 1})</p>`).join("");
    const text = extractArticleText(page(many), "https://example.com/a");
    expect(splitParagraphs(text)).toHaveLength(12);
  });

  it("makes each list item its own paragraph", () => {
    const text = extractArticleText(
      page(`<p>${P1}</p><ul><li>${P2}</li><li>${P3}</li></ul>`),
      "https://example.com/a",
    );
    expect(paragraphsOf(text)).toEqual([P1, P2, P3]);
  });

  it("keeps a paragraph whole when it has links and emphasis inside", () => {
    const inline = 'Los domingos la <a href="/x">familia</a> se reúne en la <strong>playa</strong> para comer y <em>hablar</em> de <span>todo</span> un poco.';
    const text = extractArticleText(page(`<p>${inline}</p><p>${P2}</p>`), "https://example.com/a");
    expect(paragraphsOf(text)).toEqual(["Los domingos la familia se reúne en la playa para comer y hablar de todo un poco.", P2]);
  });

  it("starts a new paragraph at every line break, so a single <br> between paragraphs works", () => {
    const text = extractArticleText(page(`<div>${P1}<br><br>${P2}<br>${P3}</div>`), "https://example.com/a");
    expect(paragraphsOf(text)).toEqual([P1, P2, P3]);
  });

  it("splits paragraphs separated by one <br> only", () => {
    const text = extractArticleText(page(`<div>${P1}<br>${P2}<br>${P3}</div>`), "https://example.com/a");
    expect(paragraphsOf(text)).toEqual([P1, P2, P3]);
  });

  it("treats a blank line inside a text block as a paragraph break", () => {
    const text = extractArticleText(page(`<div>${P1}\n\n${P2}\n\n${P3}</div>`), "https://example.com/a");
    expect(paragraphsOf(text)).toEqual([P1, P2, P3]);
  });

  it("splits on repeated breaks written with spaces and slashes", () => {
    const text = extractArticleText(page(`<div>${P1}<br/> <br />${P2}</div>`), "https://example.com/a");
    expect(paragraphsOf(text)).toEqual([P1, P2]);
  });

  it("does not repeat a quote that wraps its own paragraphs", () => {
    const text = extractArticleText(page(`<p>${P1}</p><blockquote><p>${P2}</p></blockquote><p>${P3}</p>`), "https://example.com/a");
    expect(paragraphsOf(text)).toEqual([P1, P2, P3]);
    expect(text.split(P2)).toHaveLength(2);
  });

  it("keeps loose text that sits beside a nested block", () => {
    const text = extractArticleText(page(`<div>${P1}<div>${P2}</div>${P3}</div>`), "https://example.com/a");
    expect(paragraphsOf(text)).toEqual([P1, P2, P3]);
  });

  it("keeps a figure caption as its own paragraph", () => {
    const text = extractArticleText(page(`<p>${P1}</p><figure><img src="a.jpg"/><figcaption>${P2}</figcaption></figure><p>${P3}</p>`), "https://example.com/a");
    expect(paragraphsOf(text)).toContain(P2);
  });

  it("collapses source whitespace and line breaks inside a paragraph, and decodes entities", () => {
    const text = extractArticleText(
      page(`<p>Los domingos   la familia\n se reúne en la playa &amp; hablan&nbsp;de todo un poco, como siempre sucede.</p><p>${P2}</p>`),
      "https://example.com/a",
    );
    const [first] = paragraphsOf(text);
    expect(first).toBe("Los domingos la familia se reúne en la playa & hablan de todo un poco, como siempre sucede.");
    expect(first).not.toMatch(/\n/);
  });

  it("has no blank paragraphs, no stray line breaks at the ends, and never more than one blank line", () => {
    const text = extractArticleText(page(`<p>${P1}</p><p>  </p><p></p><p>&nbsp;</p><p>${P2}</p>`), "https://example.com/a");
    expect(text).toBe(`${P1}\n\n${P2}`);
    expect(text).not.toMatch(/\n\n\n/);
  });

  it("leaves script and style text out", () => {
    const text = extractArticleText(page(`<p>${P1}</p><script>var secret = "tracking";</script><style>.a{color:red}</style><p>${P2}</p>`), "https://example.com/a");
    expect(text).not.toMatch(/tracking|color:red/);
  });

  it("keeps Persian paragraphs, and the zero-width joiners inside their words", () => {
    const fa1 = "فردا با دوستانم به پارک می‌روم و بعد از ظهر کتاب می‌خوانم، چون هوا خیلی خوب است.";
    const fa2 = "مادربزرگم همیشه می‌گوید که باید از هر لحظه لذت برد، زیرا زندگی کوتاه است و زمان زود می‌گذرد.";
    const text = extractArticleText(page(`<p>${fa1}</p><p>${fa2}</p>`), "https://example.com/fa");
    expect(paragraphsOf(text)).toEqual([fa1, fa2]);
    expect(text).toContain("می‌روم");
  });

  it("still throws a readable error when there is nothing to read", () => {
    expect(() => extractArticleText(page("<p> </p>"), "https://example.com/a")).toThrow(/no readable text/i);
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

describe("decodeHtml", () => {
  it("reads the charset from the header, so old Spanish sites keep their accents", () => {
    const bytes = new Uint8Array([0x61, 0x64, 0x69, 0xf3, 0x73]); // "adiós" in ISO-8859-1
    expect(decodeHtml(bytes, "text/html; charset=ISO-8859-1")).toBe("adiós");
  });

  it("falls back to a charset declared in the page", () => {
    const head = new TextEncoder().encode('<meta charset="windows-1252"><p>');
    const bytes = new Uint8Array([...head, 0xf1]); // ñ
    expect(decodeHtml(bytes, "text/html")).toMatch(/ñ$/);
  });

  it("defaults to UTF-8 and survives an unknown charset name", () => {
    const bytes = new TextEncoder().encode("سلام");
    expect(decodeHtml(bytes, "text/html")).toBe("سلام");
    expect(decodeHtml(bytes, "text/html; charset=bogus-9")).toBe("سلام");
  });
});

describe("cleanParagraphs", () => {
  it("drops repeated paragraphs and share/related-link boilerplate", () => {
    const out = cleanParagraphs([
      "Los domingos la familia se reúne en la playa para comer.",
      "Leer también: otras historias de la isla",
      "Compartir",
      "Síguenos en redes sociales",
      "Los domingos la familia se reúne en la playa para comer.",
      "Mi abuela dice que hay que disfrutar el momento.",
    ]);
    expect(out).toEqual([
      "Los domingos la familia se reúne en la playa para comer.",
      "Mi abuela dice que hay que disfrutar el momento.",
    ]);
  });

  it("drops reading times, bylines and publish dates that are not part of the article", () => {
    const junk = [
      "3 minute read",
      "3 min read",
      "5 min. de lectura",
      "5 minutos de lectura",
      "Tiempo de lectura: 4 min",
      "Lectura: 2 minutos",
      "Por Juan Pérez",
      "By Maria Lopez",
      "Publicado el 3 de marzo de 2026",
      "Actualizado: 3 mar 2026 10:15",
      "Updated Nov 19, 2026",
      "Escucha esta nota",
      "Advertisement",
      "Descubre más",
      "Título del video",
      "Fecha de publicación 4 horas",
      "Duración del video: 2:31",
    ];
    const story = "Mi abuela dice que hay que disfrutar el momento.";
    expect(cleanParagraphs([...junk, story])).toEqual([story]);
  });

  it("keeps real sentences that only look similar", () => {
    const keep = [
      "Por eso nadie vino a la fiesta de ayer.",
      "Por Dios, no me digas eso.",
      "Leyó durante tres minutos antes de dormir cada noche.",
      "Publicado hace años, el libro sigue vendiéndose en todas las librerías del país.",
      "Fue un minuto de silencio por las víctimas del accidente.",
    ];
    expect(cleanParagraphs(keep)).toEqual(keep);
  });

  it("keeps short headings that are part of the story", () => {
    expect(cleanParagraphs(["El mercado", "Cada mañana abren los puestos de fruta."])).toEqual([
      "El mercado",
      "Cada mañana abren los puestos de fruta.",
    ]);
  });
});

describe("articleTitle", () => {
  it("returns the page's own title", () => {
    expect(extractArticle(html, "https://example.com/isla").title).toBe("La vida en la isla");
  });
});

describe("page furniture is removed by structure, not by guessing at wording", () => {
  const story1 = "Los vecinos del barrio se reunieron ayer por la tarde para hablar de la nueva plaza.";
  const story2 = "La alcaldesa dijo que las obras empezarán en marzo y terminarán antes del verano.";
  const page = (body: string) => `<html><head><title>La plaza nueva</title></head><body>${body}</body></html>`;

  it("drops video titles, dates, share rows, captions and 'discover more' links that sit between real paragraphs", () => {
    const html = page(`
      <header><nav><a href="/">Inicio</a><a href="/mundo">Mundo</a></nav></header>
      <article>
        <h1>La plaza nueva</h1>
        <div class="byline">Redacción Central</div>
        <time datetime="2026-11-19">19 de noviembre</time>
        <p>${story1}</p>
        <div class="video-title">Título del video</div>
        <div>Fecha de publicación 4 horas</div>
        <p>${story2}</p>
        <div class="share"><button>Compartir</button><a href="#">Twitter</a></div>
        <p><a href="/mas">Descubre más</a></p>
        <div><a href="/a">Otra nota que te puede gustar</a></div>
      </article>
      <footer>Todos los derechos reservados</footer>`);
    const text = extractArticle(html, "https://example.com/plaza").text;
    expect(text.split("\n\n")).toEqual([story1, story2]);
  });

  it("drops short labels and links that sit in plain boxes even without telltale class names", () => {
    const html = page(`<article>
        <p>${story1}</p>
        <div>Título del video</div>
        <span>Fecha de publicación hace 4 horas</span>
        <p>${story2}</p>
        <div><a href="/x">Descubre más</a></div>
        <ul><li><a href="/1">Primera nota relacionada</a></li><li><a href="/2">Segunda nota relacionada</a></li></ul>
      </article>`);
    expect(extractArticle(html, "https://example.com/plaza").text.split("\n\n")).toEqual([story1, story2]);
  });

  it("keeps links and spans that sit inside a real sentence", () => {
    const html = page(`<article><p>Los vecinos hablaron con <a href="/alcaldesa">la alcaldesa</a> sobre <span>la plaza</span> y otras cosas del barrio.</p><p>${story2}</p></article>`);
    expect(extractArticle(html, "https://example.com/i").text.split("\n\n")[0]).toBe("Los vecinos hablaron con la alcaldesa sobre la plaza y otras cosas del barrio.");
  });

  it("keeps headings, short real paragraphs and a lesson written as plain text in a box", () => {
    const withHeading = page(`<article><h2>El mercado</h2><p>${story1}</p><p>No lo sé.</p><p>${story2}</p></article>`);
    expect(extractArticle(withHeading, "https://example.com/m").text.split("\n\n")).toEqual(["El mercado", story1, "No lo sé.", story2]);

    const plain = page(`<div id="story">Primera línea de la historia, que es larga.\n\nNo lo sé.\n\nOtra línea larga para que la página tenga texto suficiente que leer.</div>`);
    const out = extractArticle(plain, "https://example.com/p").text;
    expect(out).toContain("No lo sé.");
  });
});
