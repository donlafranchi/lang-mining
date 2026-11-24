import { describe, expect, it } from "vitest";
import { articleIntro, introFromExtract, randomArticle, searchArticles } from "./wikipedia";

const LONG = "La casa es un edificio que sirve de vivienda para las personas y las familias que viven en ella desde hace muchos años. ".repeat(4).trim();

const reply = (body: unknown) => async () => ({ ok: true, json: async () => body });

describe("introFromExtract", () => {
  it("drops heading lines, keeps real paragraphs, and stops at the size limit", () => {
    const extract = `${LONG}\n\nHistoria\n\n${LONG}\n\n${LONG}`;
    const out = introFromExtract(extract, 700);
    expect(out).not.toContain("Historia");
    expect(out.split("\n\n").length).toBeGreaterThanOrEqual(1);
    expect(out.length).toBeLessThanOrEqual(LONG.length * 2 + 4);
  });
  it("always keeps the first paragraph even when it is over the limit", () => {
    expect(introFromExtract(LONG, 50).length).toBe(50);
  });
});

describe("articleIntro", () => {
  it("returns the title, the opening text and the article link", async () => {
    const body = { query: { pages: [{ title: "Casa (edificio)", extract: LONG }] } };
    const a = await articleIntro("es", "casa", reply(body));
    expect(a.title).toBe("Casa (edificio)");
    expect(a.text).toContain("La casa es un edificio");
    expect(a.url).toBe("https://es.wikipedia.org/wiki/Casa_(edificio)");
  });
  it("says so when the article does not exist", async () => {
    await expect(articleIntro("es", "zzz", reply({ query: { pages: [{ title: "zzz", missing: true }] } }))).rejects.toThrow(/not be found/);
  });
});

describe("searchArticles", () => {
  it("lists titles with their snippet text, without HTML", async () => {
    const body = { query: { search: [{ title: "Gato", snippet: 'El <span class="searchmatch">gato</span> es un &quot;felino&quot;' }] } };
    expect(await searchArticles("es", "gato", reply(body))).toEqual([{ title: "Gato", preview: 'El gato es un "felino"' }]);
  });
  it("asks nothing for an empty search", async () => {
    expect(await searchArticles("es", "  ", async () => { throw new Error("no call"); })).toEqual([]);
  });
});

describe("randomArticle", () => {
  it("skips stubs and returns one with enough text", async () => {
    let n = 0;
    const fetcher = async (url: string) => {
      if (url.includes("list=random")) return { ok: true, json: async () => ({ query: { random: [{ title: n++ === 0 ? "Stub" : "Gran artículo" }] } }) };
      const title = decodeURIComponent(/titles=([^&]+)/.exec(url)![1].replace(/\+/g, " "));
      return { ok: true, json: async () => ({ query: { pages: [{ title, extract: title === "Stub" ? "Corto." : LONG }] } }) };
    };
    const item = await randomArticle("es", fetcher);
    expect(item.title).toBe("Gran artículo");
    expect(item.preview.length).toBeLessThanOrEqual(220);
  });
});
