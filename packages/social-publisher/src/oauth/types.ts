export type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type TokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};

/** Raw token response from OAuth providers */
export type RawTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};
