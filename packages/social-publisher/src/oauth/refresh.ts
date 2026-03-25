import type { DecryptedTokens } from "../types";
import { refreshLinkedInToken } from "./linkedin";
import { refreshTwitterToken } from "./twitter";
import type { OAuthConfig } from "./types";

type Platform = "TWITTER" | "LINKEDIN";

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

const refreshers: Record<
  Platform,
  (
    refreshToken: string,
    config: OAuthConfig
  ) => Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }>
> = {
  TWITTER: refreshTwitterToken,
  LINKEDIN: refreshLinkedInToken,
};

export async function refreshIfNeeded(
  tokens: DecryptedTokens,
  platform: Platform,
  config: OAuthConfig
): Promise<DecryptedTokens> {
  const now = Date.now();
  const expiresAt = tokens.tokenExpiresAt?.getTime();

  if (expiresAt && expiresAt - now > EXPIRY_BUFFER_MS) {
    return tokens;
  }

  if (!tokens.refreshToken) {
    return tokens;
  }

  const refresher = refreshers[platform];
  const result = await refresher(tokens.refreshToken, config);

  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? tokens.refreshToken,
    tokenExpiresAt: result.expiresIn
      ? new Date(now + result.expiresIn * 1000)
      : tokens.tokenExpiresAt,
  };
}
