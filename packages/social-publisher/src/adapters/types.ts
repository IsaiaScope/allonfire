import type { DecryptedTokens, PublishRequest, PublishResult } from "../types";

export type PlatformAdapter = {
  publish(
    request: PublishRequest,
    tokens: DecryptedTokens
  ): Promise<PublishResult>;
  validateTokens(tokens: DecryptedTokens): Promise<boolean>;
};
