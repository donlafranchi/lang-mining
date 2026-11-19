import Anthropic from "@anthropic-ai/sdk";
import { OutputTruncatedError, type CompleteFn } from "./enrichment/enrich";
import type { ModelId } from "./models";

export function createAnthropicComplete(model: ModelId): CompleteFn {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY must be set.");
  const anthropic = new Anthropic({ apiKey });

  return async ({ system, messages }) => {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 16000,
      system,
      messages,
    });
    // A cut-off answer is incomplete JSON. Say so instead of letting it fail as "not valid JSON".
    if (response.stop_reason === "max_tokens") throw new OutputTruncatedError();
    return response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");
  };
}
