import type { AllowedApp, Role } from "@allonfire/database/enums";

/** Every App a User can be allowed into: each Allowed apps value but `ALL`. */
export type App = Exclude<AllowedApp, typeof AllowedApp.ALL>;

/** What the guards and hosts read from a Session. Better Auth's is a superset. */
export type AuthSession = {
  session: { id: string; expiresAt: Date };
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    allowedApps: AllowedApp[];
  };
};

export type OpenApiOperation = { tags?: string[] } & Record<string, unknown>;

/**
 * Better Auth only answers GET and POST. Named keys, not a `Record`: its own
 * `Path` is an interface, and an interface has no index signature to match.
 */
export type OpenApiPathItem = {
  get?: OpenApiOperation | undefined;
  post?: OpenApiOperation | undefined;
};

/** Only the parts of an OpenAPI document the merge reads. */
export type OpenApiDocument = {
  paths: Record<string, OpenApiPathItem>;
  components?: Record<string, Record<string, unknown>>;
};

/** Better Auth's paths, ready to fold into a host's document. */
export type OpenApiFragment = {
  paths: OpenApiDocument["paths"];
  components: Record<string, Record<string, unknown>>;
  tags: { name: string }[];
};

/**
 * The port every adapter uses. Narrow on purpose: a test passes a stub, and
 * Better Auth's overloaded `api.getSession` never leaks into a signature.
 */
export type AuthLike = {
  /** The `basePath` given to `createAuth`; the adapters mount and match under it. */
  basePath: string;
  handler: (request: Request) => Promise<Response>;
  /**
   * Reading a Session can refresh it: Better Auth then sets cookies (a renewed
   * session token, a new cookie cache, or a deleted cookie for an expired
   * Session). Each one goes to `setCookie`, for the host to add to its response.
   */
  getSession: (
    headers: Headers,
    setCookie?: (cookie: string) => void
  ) => Promise<AuthSession | null>;
  openApi: () => Promise<OpenApiDocument>;
};
