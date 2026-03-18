import { GoogleGenAI } from "@google/genai";
import type {
  GenerateRequest,
  GenerateResponse,
  ProviderClient,
} from "./types";

export function createGeminiProvider(apiKey: string): ProviderClient {
  const ai = new GoogleGenAI({ apiKey });

  return {
    async generate(request: GenerateRequest): Promise<GenerateResponse> {
      const contents = request.messages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const response = await ai.models.generateContent({
        model: request.model,
        contents,
        config: {
          maxOutputTokens: request.maxTokens,
          systemInstruction: request.system,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Google Gemini");
      }

      return {
        text,
        usage: response.usageMetadata
          ? {
              inputTokens: response.usageMetadata.promptTokenCount ?? 0,
              outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
            }
          : undefined,
      };
    },

    async validate(): Promise<boolean> {
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: "Hi",
        config: { maxOutputTokens: 1 },
      });
      return (response.text?.length ?? 0) > 0;
    },

    async listModels() {
      const pager = await ai.models.list();
      const models: Array<{ id: string; label: string; version?: string }> = [];
      for await (const model of pager) {
        if (model.name) {
          models.push({
            id: model.name,
            label: model.displayName ?? model.name,
            version: model.version ?? undefined,
          });
        }
      }
      return models;
    },
  };
}
