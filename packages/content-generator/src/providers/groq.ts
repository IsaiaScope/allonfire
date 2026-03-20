import OpenAI from "openai";
import type {
  GenerateRequest,
  GenerateResponse,
  ProviderClient,
} from "./types";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export function createGroqProvider(apiKey: string): ProviderClient {
  const client = new OpenAI({
    apiKey,
    baseURL: GROQ_BASE_URL,
  });

  return {
    async generate(request: GenerateRequest): Promise<GenerateResponse> {
      const messages = [
        ...(request.system
          ? [{ role: "system" as const, content: request.system }]
          : []),
        ...request.messages,
      ];
      const completion = await client.chat.completions.create({
        model: request.model,
        max_tokens: request.maxTokens,
        messages,
      });

      const choice = completion.choices.at(0);
      if (!choice?.message.content) {
        throw new Error("Empty response from Groq");
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
        model: "llama-3.1-8b-instant",
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      });
      return (completion.choices.at(0)?.message.content?.length ?? 0) > 0;
    },

    async listModels() {
      const response = await client.models.list();
      const models: Array<{ id: string; label: string }> = [];
      for await (const model of response) {
        models.push({ id: model.id, label: model.id });
      }
      return models;
    },
  };
}
