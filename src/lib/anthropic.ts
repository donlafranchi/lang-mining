import Anthropic from "@anthropic-ai/sdk";
import type { CompleteFn } from "./enrichment/enrich";

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";

export function createAnthropicComplete(): CompleteFn {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY must be set.");
  const anthropic = new Anthropic({ apiKey });

  return async ({ system, messages }) => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system,
      messages,
    });
    return response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");
  };
}
