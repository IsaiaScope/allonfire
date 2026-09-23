# Telemetry and Analytics are self-hosted: OpenObserve and Umami

The API emits Telemetry through the OpenTelemetry SDK over OTLP to a
self-hosted OpenObserve. Errors need no separate tool: a 5xx marks its request
span as failed, and the `unhandled error` pino line carrying the stack shares
that span's `trace_id`. Analytics goes to a self-hosted Umami. No data leaves
the VPS and nothing costs money.

## Considered Options

- **PostHog.** Self-hosting needs ClickHouse and Kafka, around 16 GB of RAM.
- **SaaS free tiers** (PostHog Cloud, Grafana Cloud). Free and zero-RAM, but
  data about family members' usage leaves the VPS, and free-tier limits change.
- **Grafana LGTM, SigNoz, HyperDX, Uptrace.** Four services, or ClickHouse.
  OpenObserve is one binary that stores on local disk or S3.
- **GlitchTip for errors.** One more service; revisit if OpenObserve's
  grouping or alerting proves insufficient.

## Production topology (defined, not yet built)

| | Production |
|---|---|
| OpenObserve UI | `observe.isaiariva.com`, behind the `admin-gate@file` Traefik middleware |
| OTLP ingest | internal docker network only, never published |
| OpenObserve storage | MinIO bucket, 14-day retention |
| Umami | `analytics.isaiariva.com`, `umami` database on the Dokploy Postgres |
| Memory caps | OpenObserve 768 MB, Umami 384 MB |
| Images | pinned, same tags as Local |

Settings the deploy must carry, from the OpenObserve v1.0.3 and Umami 3.4.0
docs:

- **OpenObserve storage.** Single-node mode writes to local disk unless
  `ZO_LOCAL_MODE_STORAGE=s3`; `ZO_S3_*` alone does nothing. Metadata (SQLite)
  and the WAL stay on local disk even then, so `/data` still needs a persistent
  volume.
  ```yaml
  ZO_LOCAL_MODE_STORAGE: s3
  ZO_S3_PROVIDER: minio
  ZO_S3_SERVER_URL: http://minio:9000
  ZO_S3_REGION_NAME: us-east-1
  ZO_S3_BUCKET_NAME: openobserve
  ZO_S3_ACCESS_KEY: ${OO_S3_ACCESS_KEY}
  ZO_S3_SECRET_KEY: ${OO_S3_SECRET_KEY}
  ZO_COMPACT_DATA_RETENTION_DAYS: "14"
  ```
- **OpenObserve behind Traefik.** `ZO_WEB_URL: https://observe.isaiariva.com`
  (it drives CORS and links) and `ZO_COOKIE_SECURE_ONLY: "true"`.
  `ZO_TELEMETRY: "false"`, as in Local.
- **OpenObserve under 768 MB.** It sizes its memtable and query pool from the
  cgroup limit and its memory circuit breaker is off by default:
  `ZO_MEMORY_CIRCUIT_BREAKER_ENABLED: "true"`, `ZO_MEM_TABLE_MAX_SIZE: "128"`,
  `ZO_MEMORY_CACHE_DATAFUSION_MAX_SIZE: "192"` (MB). No documented minimum RAM;
  watch it in Beszel after the first week.
- **OpenObserve credentials.** Root credentials are read on first start only;
  later changes to `ZO_ROOT_USER_*` do nothing. The API ingests with a dedicated
  service account, not root. Open-source OpenObserve has no RBAC, so that
  account still has full access: it keeps the root password out of the API's
  environment, nothing more.
- **Umami behind Traefik.** Only the tracker is public: `Path(`/script.js`) ||
  Path(`/api/send`)` bypasses `admin-gate@file`, everything else stays behind
  it. `CLIENT_IP_HEADER: x-real-ip`, because Umami trusts `true-client-ip` and
  `cf-connecting-ip` first and a client can send those.
- **Umami secrets and role.** A random `APP_SECRET` (unset, Umami derives it from
  `DATABASE_URL`), a 64-hex-character `TWO_FACTOR_ENCRYPTION_KEY`, and a
  dedicated `umami` Postgres role instead of the superuser. `DISABLE_TELEMETRY`,
  `DISABLE_UPDATES` and `PRIVATE_MODE`, as in Local.
- **Umami admin.** No official env var or CLI sets the first login. Local renames
  it by SQL (`umami-user-init`); Production changes the password in Settings →
  Profile instead of committing a bcrypt hash.
- **Upgrades.** Umami runs `prisma migrate deploy` on every start, so bumping its
  tag migrates the database: `pg_dump umami` first.

## Consequences

Because the SDK speaks OTLP, the backend can be swapped without touching API
code. The memory caps are not optional: the VPS has no swap, so an uncapped
telemetry service can push the OOM killer onto Postgres.

Nothing is patched at load time, so the API needs no ESM loader hook and no
`--import` preload: request spans and the duration metric come from
`@hono/otel` inside the app, Prisma traces through its own engine hooks, and
logs ship through `pino-opentelemetry-transport`. The price is that Redis calls
are not traced; adding them means `instrumentation-ioredis` plus
`@opentelemetry/instrumentation/hook.mjs` preloaded as plain JS, which the
Node 24 + tsx combination makes fragile. Revisit if Redis latency ever needs
explaining.
