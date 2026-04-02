import { randomBytes } from "node:crypto";
import { upsertSocialAccount } from "@allonfire/database";
import type {
  OAuthConfig,
  TokenResponse,
} from "@allonfire/social-publisher/oauth";
import {
  exchangeLinkedInCode,
  exchangeTwitterCode,
  getLinkedInAuthUrl,
  getTwitterAuthUrl,
} from "@allonfire/social-publisher/oauth";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { requireAuth } from "@/lib/server-auth";

function errorHtml(message: string, platform?: string): NextResponse {
  const html = `<html><body><script>
window.opener.postMessage({ type: "oauth-error", platform: ${JSON.stringify(platform ?? "")}, error: ${JSON.stringify(message)} }, window.location.origin);
window.close();
</script><p>${message}</p></body></html>`;
  return new NextResponse(html, {
    status: 400,
    headers: { "Content-Type": "text/html" },
  });
}

const VALID_PLATFORMS = ["twitter", "linkedin"] as const;
type ValidPlatform = (typeof VALID_PLATFORMS)[number];

const PLATFORM_DB_MAP: Record<ValidPlatform, "TWITTER" | "LINKEDIN"> = {
  twitter: "TWITTER",
  linkedin: "LINKEDIN",
};

function isValidPlatform(value: string): value is ValidPlatform {
  return VALID_PLATFORMS.includes(value as ValidPlatform);
}

function encodeState(userId: string): string {
  const nonce = randomBytes(16).toString("hex");
  const payload = JSON.stringify({ userId, nonce });
  return Buffer.from(payload).toString("base64url");
}

function decodeState(state: string): { userId: string; nonce: string } | null {
  try {
    const payload = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    );
    if (
      typeof payload.userId === "string" &&
      typeof payload.nonce === "string"
    ) {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

function getOAuthConfig(
  platform: ValidPlatform,
  request: Request
): OAuthConfig | null {
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/publish/oauth/${platform}`;

  const configMap: Record<
    ValidPlatform,
    { id: string | undefined; secret: string | undefined }
  > = {
    twitter: {
      id: env.TWITTER_CLIENT_ID,
      secret: env.TWITTER_CLIENT_SECRET,
    },
    linkedin: {
      id: env.LINKEDIN_CLIENT_ID,
      secret: env.LINKEDIN_CLIENT_SECRET,
    },
  };

  const creds = configMap[platform];
  if (!(creds.id && creds.secret)) {
    return null;
  }

  return {
    clientId: creds.id,
    clientSecret: creds.secret,
    redirectUri,
  };
}

function buildAuthUrl(
  platform: ValidPlatform,
  state: string,
  config: OAuthConfig
): { url: string; codeVerifier?: string } {
  if (platform === "twitter") {
    return getTwitterAuthUrl(state, config);
  }
  return { url: getLinkedInAuthUrl(state, config) };
}

function exchangeCode(
  platform: ValidPlatform,
  code: string,
  config: OAuthConfig,
  codeVerifier: string | undefined
): Promise<TokenResponse> {
  if (platform === "twitter") {
    return exchangeTwitterCode(code, codeVerifier ?? "", config);
  }
  return exchangeLinkedInCode(code, config);
}

async function handleAuthorize(
  platformParam: ValidPlatform,
  request: Request
): Promise<NextResponse> {
  const session = await requireAuth();
  const config = getOAuthConfig(platformParam, request);
  if (!config) {
    return errorHtml(
      `${platformParam} OAuth is not configured. Add API credentials in your environment variables.`
    );
  }

  const state = encodeState(session.user.id);
  const { url: authUrl, codeVerifier } = buildAuthUrl(
    platformParam,
    state,
    config
  );
  const response = NextResponse.redirect(authUrl);

  if (codeVerifier) {
    const cookieStore = await cookies();
    cookieStore.set("twitter_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/api/publish/oauth/twitter",
    });
  }

  return response;
}

async function fetchPlatformProfile(
  platform: ValidPlatform,
  accessToken: string
): Promise<{ id: string | null; name: string | null }> {
  try {
    if (platform === "linkedin") {
      const res = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { sub?: string; name?: string };
        return { id: data.sub ?? null, name: data.name ?? null };
      }
    }
    if (platform === "twitter") {
      const res = await fetch("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          data?: { id?: string; username?: string };
        };
        return {
          id: data.data?.id ?? null,
          name: data.data?.username ? `@${data.data.username}` : null,
        };
      }
    }
  } catch {
    // Profile fetch is best-effort — don't fail the OAuth flow
  }
  return { id: null, name: null };
}

async function handleCallback(
  platformParam: ValidPlatform,
  request: Request,
  code: string,
  stateParam: string
): Promise<NextResponse> {
  const decoded = decodeState(stateParam);
  if (!decoded) {
    return errorHtml("Invalid state parameter");
  }

  const session = await requireAuth();
  if (session.user.id !== decoded.userId) {
    return errorHtml("State mismatch — please try connecting again.");
  }

  const config = getOAuthConfig(platformParam, request);
  if (!config) {
    return errorHtml(
      `${platformParam} OAuth is not configured. Add API credentials in your environment variables.`
    );
  }

  const codeVerifier = await getPkceVerifier(platformParam);

  const tokens = await exchangeCode(platformParam, code, config, codeVerifier);
  const dbPlatform = PLATFORM_DB_MAP[platformParam];

  const profile = await fetchPlatformProfile(platformParam, tokens.accessToken);

  await upsertSocialAccount({
    userId: session.user.id,
    platform: dbPlatform,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? null,
    tokenExpiresAt: tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000)
      : null,
    platformUserId: profile.id,
    platformUsername: profile.name,
  });

  revalidatePath("/publish");
  revalidatePath("/settings/general");

  const html = `<html><body><script>
window.opener.postMessage({ type: "oauth-complete", platform: "${dbPlatform}" }, window.location.origin);
window.close();
</script></body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

async function getPkceVerifier(
  platform: ValidPlatform
): Promise<string | undefined> {
  if (platform !== "twitter") {
    return undefined;
  }

  const cookieStore = await cookies();
  const verifier = cookieStore.get("twitter_code_verifier")?.value;
  if (!verifier) {
    throw new Error("Missing PKCE code verifier");
  }
  cookieStore.delete("twitter_code_verifier");
  return verifier;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform: platformParam } = await params;

  if (!isValidPlatform(platformParam)) {
    return NextResponse.json(
      { error: `Invalid platform: ${platformParam}` },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    const description =
      url.searchParams.get("error_description") ?? "Authorization was denied";
    return errorHtml(
      `Connection denied: ${description}`,
      PLATFORM_DB_MAP[platformParam]
    );
  }

  try {
    if (action === "authorize") {
      return await handleAuthorize(platformParam, request);
    }

    if (code && stateParam) {
      return await handleCallback(platformParam, request, code, stateParam);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorHtml(
        "You must be logged in to connect a social account.",
        PLATFORM_DB_MAP[platformParam]
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorHtml(
      `OAuth failed: ${message}`,
      PLATFORM_DB_MAP[platformParam]
    );
  }

  return NextResponse.json(
    {
      error:
        "Invalid request. Use ?action=authorize or provide ?code=...&state=...",
    },
    { status: 400 }
  );
}
