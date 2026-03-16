import Anthropic from "@anthropic-ai/sdk";
import type {
  GenerateRequest,
  GenerateResponse,
  ProviderClient,
} from "./types";

export function createAnthropicProvider(apiKey: string): ProviderClient {
  const client = new Anthropic({ apiKey });

  return {
    async generate(request: GenerateRequest): Promise<GenerateResponse> {
      const message = await client.messages.create({
        model: request.model,
        max_tokens: request.maxTokens,
        messages: request.messages,
      });

      const block = message.content.at(0);
      if (!block || block.type !== "text") {
        throw new Error(`Unexpected response type: ${block?.type ?? "empty"}`);
      }

      return {
        text: block.text,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        },
      };
    },

    async validate(): Promise<boolean> {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      });
      return message.content.length > 0;
    },
  };
}
