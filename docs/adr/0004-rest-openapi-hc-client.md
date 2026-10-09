# The API contract is REST with OpenAPI, consumed through `hc`

The API speaks REST, documented as OpenAPI 3.1 by `hono-openapi` and rendered
by Scalar at `/reference`. TypeScript clients call it through Hono's
`hc<ApiType>` from `@allonfire/api/client`, which derives request and response
types from the chained routes with no code generation.

## Considered Options

- **tRPC.** Gives end-to-end types, but `hc` already does, from the same route
  definitions the OpenAPI document comes from. tRPC would be a second contract
  beside the first, and it does not produce OpenAPI, which non-TypeScript
  callers and the docs page need.
- **gRPC.** Browsers and React Native cannot speak it natively; every client
  would need a grpc-web proxy. There is no service-to-service traffic for it to
  make faster.

## Consequences

Routes must stay chained or `hc` loses its types (`src/client.test-d.ts` guards
this). Revisit if a non-TypeScript service ever needs a streaming RPC contract.

## How a Next App calls it (2026-10)

- **Domain routes** go through `hc<ApiType>`. The browser calls the API
  directly at its public address with `credentials: "include"`: the Session
  cookies are set for the parent domain (`AUTH_COOKIE_DOMAIN`, Better Auth's
  cross-subdomain cookies) and the API allows each App's origin with
  credentials (`API_CORS_ORIGINS`). An App stays a frontend, with no API
  routes of its own. On the App's server, the same client points at the API's
  internal address with the visitor's cookies and `x-forwarded-for`. Both
  share one type, so a TanStack Query options factory takes the client and
  runs on either side; its `queryFn` reads the body with `parseResponse` from
  `hono/client`, which throws a `DetailedError` on an error status, as
  TanStack Query expects. One sign-in now holds for every App on the domain;
  Allowed apps still decide who enters which.
- **Auth routes** are Better Auth's, mounted behind one catch-all, so `hc` has
  no types for them. Apps call them with Better Auth's own client
  (`createApiAuthClient` in `@allonfire/auth/features/next/utils/auth-client`),
  typed from the server's `Auth`.
- **Not axios.** It would replace these types with hand-written ones and add a
  dependency for what `fetch` already does.
