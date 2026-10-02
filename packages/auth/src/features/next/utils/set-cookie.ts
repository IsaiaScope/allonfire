import { parseSetCookieHeader } from "better-auth/cookies";

/** One `Set-Cookie` header, in the shape `cookies().set` takes. */
export type ParsedCookie = {
  name: string;
  value: string;
  options: {
    domain?: string | undefined;
    expires?: Date | undefined;
    httpOnly?: boolean | undefined;
    maxAge?: number | undefined;
    path?: string | undefined;
    sameSite?: "lax" | "none" | "strict" | undefined;
    secure?: boolean | undefined;
  };
};

/**
 * The `Set-Cookie` headers the API sent, read by Better Auth's own parser, so
 * an App's server can set the same cookies on its own response.
 */
export const parseSetCookies = (headers: readonly string[]): ParsedCookie[] =>
  headers.flatMap((header) =>
    [...parseSetCookieHeader(header)].map(
      ([
        name,
        {
          value,
          domain,
          expires,
          httponly,
          "max-age": maxAge,
          path,
          samesite,
          secure,
        },
      ]) => ({
        name,
        options: {
          domain,
          expires,
          httpOnly: httponly,
          maxAge,
          path,
          sameSite: samesite,
          secure,
        },
        value,
      })
    )
  );
