export type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
};

export type TokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};
