export type GenerateRequest = {
  model: string;
  maxTokens: number;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

export type GenerateResponse = {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
};

export type ProviderClient = {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  validate(): Promise<boolean>;
};
