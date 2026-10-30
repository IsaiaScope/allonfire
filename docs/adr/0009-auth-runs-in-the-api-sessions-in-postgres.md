# Auth runs in the API; Sessions stay in Postgres

Better Auth ran inside Laura's Next process, which a React Native client cannot
sign in against. It moves to the API, built as the Auth module
(`packages/auth`) that any Hono backend can mount, and Laura loses its own
instance. This goes further than ADR 0001, which left Laura's server-side logic
where it was: auth has a second consumer coming, the rest does not yet.

Sessions stay in Postgres, read through Better Auth's five-minute cookie cache,
although ADR 0002 reserved Redis db 2 for them. Better Auth writes each session
key with a TTL equal to its expiry, and the instance runs `volatile-lru`, so
under memory pressure those keys are exactly the ones Redis evicts — a silent
sign-out with nothing in the logs. With a handful of Users the Postgres read is
not worth that risk.

## Consequences

A change to a User's Role or Allowed apps, or a revoked Session, reaches the
guards up to five minutes late. Redis db 2 stays reserved and unused; revisit if
Session reads show up slow in Telemetry.
