import OpenAI from "openai";
import type {
  GenerateRequest,
  GenerateResponse,
  ProviderClient,
} from "./types";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export function createOpenRouterProvider(apiKey: string): ProviderClient {
  const client = new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
  });

  return {
    async generate(request: GenerateRequest): Promise<GenerateResponse> {
      const completion = await client.chat.completions.create({
        model: request.model,
        max_tokens: request.maxTokens,
        messages: request.messages,
      });

      const choice = completion.choices.at(0);
      if (!choice?.message.content) {
        throw new Error("Empty response from OpenRouter");
      }

      return {
        text: choice.message.content,
        usage: completion.usage
          ? {
              inputTokens: completion.usage.prompt_tokens,
              outputTokens: completion.usage.completion_tokens,
            }
          : undefined,
      };
    },

    async validate(): Promise<boolean> {
      const completion = await client.chat.completions.create({
        model: "openai/gpt-4o-mini",
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      });
      return (completion.choices.at(0)?.message.content?.length ?? 0) > 0;
    },
  };
}
