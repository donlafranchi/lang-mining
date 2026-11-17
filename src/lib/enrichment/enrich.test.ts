import { describe, expect, it, vi } from "vitest";
import { enrichText, EnrichmentError } from "./enrich";
import { buildSystemPrompt } from "./prompt";

const validJson = JSON.stringify({
  summary: "Weekend plans.",
  detected_dialect: "puerto_rican",
  segments: [],
  vocab: [
    {
      lemma: "chévere",
      surface_form: "chévere",
      part_of_speech: "adjective",
      english: "cool, great",
      example_fragment: "eso está chévere",
      level: "A2",
      dialect_tags: ["caribbean"],
    },
  ],
  idioms: [],
  verbs: [],
});

describe("buildSystemPrompt", () => {
  it("names the target dialect", () => {
    expect(buildSystemPrompt("puerto_rican")).toMatch(/Puerto Rican/);
    expect(buildSystemPrompt("rioplatense")).toMatch(/voseo/i);
    expect(buildSystemPrompt("castilian")).toMatch(/vosotros/i);
  });

  it("tells the model to keep fragments short and return JSON only", () => {
    const prompt = buildSystemPrompt("mexican");
    expect(prompt).toMatch(/never copy full lines/i);
    expect(prompt).toMatch(/only (a )?json/i);
  });
});

describe("enrichText", () => {
  it("returns parsed data on a valid first response", async () => {
    const complete = vi.fn().mockResolvedValue(validJson);
    const result = await enrichText({ text: "Eso está chévere.", dialect: "puerto_rican", complete });
    expect(result.vocab[0].lemma).toBe("chévere");
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("retries exactly once when the first response is invalid, feeding the error back", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce("not json at all")
      .mockResolvedValueOnce(validJson);
    const result = await enrichText({ text: "Hola.", dialect: "mexican", complete });
    expect(result.summary).toBe("Weekend plans.");
    expect(complete).toHaveBeenCalledTimes(2);
    const secondCall = complete.mock.calls[1][0];
    const lastMessage = secondCall.messages[secondCall.messages.length - 1];
    expect(lastMessage.role).toBe("user");
    expect(lastMessage.content).toMatch(/not valid JSON/i);
  });

  it("throws EnrichmentError after the retry also fails, and never calls a third time", async () => {
    const complete = vi.fn().mockResolvedValue("still garbage");
    await expect(
      enrichText({ text: "Hola.", dialect: "mexican", complete }),
    ).rejects.toBeInstanceOf(EnrichmentError);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("rejects empty input before spending an API call", async () => {
    const complete = vi.fn();
    await expect(
      enrichText({ text: "   ", dialect: "mexican", complete }),
    ).rejects.toThrow(/empty/i);
    expect(complete).not.toHaveBeenCalled();
  });
});
