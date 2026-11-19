import { describe, expect, it, vi } from "vitest";
import { analyzerFromEnv, httpAnalyzer } from "./http-analyzer";

const token = { text: "dado", start: 8, end: 12, lemma: "dar", pos: "verb", morph: "Tense=Past", is_word: true };
const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("httpAnalyzer", () => {
  it("posts the language and paragraphs with the key and returns the tokens", async () => {
    const f = vi.fn(async () => ok({ language: "es", paragraphs: [{ tokens: [token] }] }));
    const out = await httpAnalyzer("https://svc.example/", "secret", f as unknown as typeof fetch).analyze("es", ["Ella ha dado."]);
    expect(out[0].tokens[0].lemma).toBe("dar");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://svc.example/analyze");
    expect((init.headers as Record<string, string>)["x-analysis-key"]).toBe("secret");
    expect(JSON.parse(init.body as string)).toEqual({ language: "es", paragraphs: ["Ella ha dado."] });
  });

  it("fails clearly on an error status, a bad shape, or skipped paragraphs", async () => {
    const run = (res: Response) => httpAnalyzer("https://x", "k", (async () => res) as unknown as typeof fetch).analyze("es", ["a"]);
    await expect(run(ok({}, 401))).rejects.toThrow(/401/);
    await expect(run(ok({ nonsense: true }))).rejects.toThrow(/unexpected/);
    await expect(run(ok({ paragraphs: [] }))).rejects.toThrow(/skipped/);
  });
});

describe("httpAnalyzer conjugate", () => {
  const conj = { lemma: "dar", irregular: true, mood: "indicativo", tense: "presente", table: { yo: "doy" } };
  it("posts the verbs to /conjugate and returns the tables", async () => {
    const f = vi.fn(async () => ok({ language: "es", verbs: [conj, null] }));
    const a = httpAnalyzer("https://svc.example", "k", f as unknown as typeof fetch);
    const out = await a.conjugate!("es", [{ lemma: "dar", morph: "" }, { lemma: "xyz", morph: "" }]);
    expect(out).toEqual([conj, null]);
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe("https://svc.example/conjugate");
  });
  it("does no request for no verbs and fails on a wrong count", async () => {
    const f = vi.fn(async () => ok({ verbs: [] }));
    const a = httpAnalyzer("https://x", "k", f as unknown as typeof fetch);
    expect(await a.conjugate!("es", [])).toEqual([]);
    expect(f).not.toHaveBeenCalled();
    await expect(a.conjugate!("es", [{ lemma: "dar", morph: "" }])).rejects.toThrow(/unexpected/);
  });
});

describe("analyzerFromEnv", () => {
  it("is off unless both settings are present", () => {
    expect(analyzerFromEnv({})).toBeNull();
    expect(analyzerFromEnv({ ANALYSIS_URL: "https://x" })).toBeNull();
    expect(analyzerFromEnv({ ANALYSIS_URL: "https://x", ANALYSIS_KEY: "k" })).not.toBeNull();
  });
});
