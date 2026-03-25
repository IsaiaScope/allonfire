import { TwitterApi } from "twitter-api-v2";
import type { OAuthConfig, TokenResponse } from "./types";

const SCOPES = ["tweet.write", "tweet.read", "users.read", "offline.access"];

export function getTwitterAuthUrl(
  state: string,
  config: OAuthConfig
): { url: string; codeVerifier: string } {
  const client = new TwitterApi({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });

  const { url, codeVerifier } = client.generateOAuth2AuthLink(
    config.redirectUri,
    { scope: SCOPES, state }
  );

  return { url, codeVerifier };
}

export async function exchangeTwitterCode(
  code: string,
  codeVerifier: string,
  config: OAuthConfig
): Promise<TokenResponse> {
  const client = new TwitterApi({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });

  const result = await client.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: config.redirectUri,
  });

  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: result.expiresIn,
  };
}

export async function refreshTwitterToken(
  refreshToken: string,
  config: OAuthConfig
): Promise<TokenResponse> {
  const client = new TwitterApi({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });

  const result = await client.refreshOAuth2Token(refreshToken);

  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: result.expiresIn,
  };
}
