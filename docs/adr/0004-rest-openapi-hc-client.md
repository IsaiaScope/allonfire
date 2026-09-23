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
