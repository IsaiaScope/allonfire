# Redis is project-scoped; Postgres is shared

The VPS runs one shared PostgreSQL for every project, so the obvious move was
one shared Redis too. We run a Redis per project instead.

Postgres isolates: per-database roles, per-database backups, and no setting by
which one database's activity destroys another's rows. Redis does not.
`maxmemory-policy`, persistence, `FLUSHALL` and `BGSAVE` are all server-wide,
not per-database — so a shared instance forces every project to agree on how
Redis behaves under memory pressure. A project caching pages wants
`allkeys-lru`; a project holding sessions needs those keys never evicted. Under
`allkeys-lru` the session keys are deleted silently, with no error and nothing
in the logs, and the affected app cannot prevent it from its own side.

Share the engines that isolate. The cost is roughly 8 MB of RAM per extra
instance.

## Consequences

Within a project's own Redis, numbered database indexes separate concerns of the
same app (rate limits, cache, sessions). Eviction policy remains global even
across those indexes, so the API runs `volatile-lru` and only sets TTLs on keys
that are safe to lose — making durable keys structurally un-evictable.

Sessions did not end up in Redis: ADR 0009 keeps them in Postgres, and the
sessions index stays reserved.
