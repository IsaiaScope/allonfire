# A standalone HTTP API, not Next server actions

Laura's backend logic lives in Next server actions, which work well and will
keep working. A React Native client is planned that shares the same users and
the same data, and server actions cannot serve a non-Next caller. Rather than
bolt route handlers onto Laura, we add `apps/api`: a Hono server that any client
can call, with the domain services in `@allonfire/database` reused unchanged.

## Consequences

Laura keeps its server actions for now. Migrating them to the API is a separate,
later decision — nothing forces it, and doing it early would trade typed
in-process calls for a network hop with no consumer to justify it.
