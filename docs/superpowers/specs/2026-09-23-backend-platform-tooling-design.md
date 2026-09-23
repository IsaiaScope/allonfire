# Backend platform tooling — Design Spec

**Date:** 2026-09-23
**Status:** Approved in chat

## Problem

`apps/api` exists (Hono, OpenAPI via `hono-openapi`, typed `hc<AppType>` client)
but the tooling around it was never decided as a whole. Open questions: API
contract style (OpenAPI, gRPC, tRPC), delivery (ArgoCD), infrastructure as code
(Terraform, Helm), observability (OpenTelemetry), product analytics (PostHog).

## Goal and constraints

- **Goal:** run the apps cheaply and reliably. Not a learning or showcase stack.
- **Free:** $0 licences, and everything fits the existing VPS without an upgrade.
- **Self-hosted:** telemetry and analytics data never leave the VPS. No SaaS free tiers.
- **Scope:** define both the local and the production environment; implement only local.
- **Laura is out of scope.** It will change substantially; nothing here touches it.

## Facts that drive the decisions

- The VPS has 4 vCPU / 7.7 GB RAM and ~4.3 GB available, **no swap** (measured
  2026-09-23). `CLAUDE.md` still says CAX11, which is wrong.
- Beszel already runs on the VPS, so host and container metrics are covered.
- Production today is Dokploy + Traefik + docker compose on one server. No Kubernetes.
- The "shared PG16" is Dokploy's own Postgres container (`dokploy-postgres`),
  which already holds the `dokploy`, `allonfire`, `n8n` and `monorepoonfire`
  databases. The `umami` database joins it the same way `allonfire` did.
- Production is the only deployed environment. The `dev → test → prod` branch
  cascade gates promotion; nothing runs a `test` deployment.
- The API is not deployed; its production Dockerfile, bundling and Traefik route
  are deferred to a separate deploy plan (scaffold spec, 2026-08-27).
- The API has no domain endpoints yet; only `/health`, `/ready`, `/openapi.json`,
  `/reference`.

## Tool decisions

| Area | Decision | Rejected, and why |
|---|---|---|
| API contract | REST + OpenAPI 3.1 via `hono-openapi`, Scalar at `/reference` (unchanged) | gRPC: no native browser or React Native support, needs a grpc-web proxy |
| Typed client | `hc<AppType>` from `@allonfire/api/client` (unchanged) | tRPC: a second contract doing what `hc` already does, and not OpenAPI-native |
| CI | GitHub Actions (unchanged) | — |
| CD | Dokploy git autodeploy (unchanged) | ArgoCD: requires Kubernetes and idles at ~1 GB |
| IaC | None. Compose files in the repo plus `hetzner-create` cloud-init | Helm: Kubernetes-only. Terraform/OpenTofu: one server. Revisit at a second server |
| Traces, logs, metrics | OpenTelemetry SDK in the API, exported over OTLP to self-hosted **OpenObserve** | Grafana LGTM: four services. SigNoz, HyperDX, Uptrace: ClickHouse |
| Errors | `@hono/otel` records the handler's error on a 5xx request span, and the `unhandled error` pino line with the stack carries the same `trace_id`. Both in OpenObserve | GlitchTip: one more service; revisit if grouping or alerting is missing |
| Product analytics | Self-hosted **Umami** on the shared Postgres | PostHog self-host: ClickHouse + Kafka, ~16 GB RAM |

Each row group becomes an ADR (see Documentation).

## Environments

```
LOCAL (docker/docker-compose.dev.yml)       PRODUCTION (VPS, Dokploy) - defined, not built
------------------------------------        ----------------------------------------------
host:  API  tsx watch :3300                 container: api  (future deploy plan)
         | OTLP http                                     | OTLP over internal docker network
docker:  openobserve :5080  (disk volume)   openobserve  storage: MinIO bucket, 14d retention
         umami       :3100                  umami        analytics.isaiariva.com
         postgres :5432  (db allonfire,     shared PG16  (db allonfire + db umami)
                          db umami)
         redis, minio, adminer (unchanged)  redis, minio (existing)
```

| | Local (implemented now) | Production (defined only) |
|---|---|---|
| Image tags | pinned, identical to Production | pinned, identical to Local |
| OpenObserve UI | `localhost:5080`, dev root credentials | `observe.isaiariva.com` behind the existing `admin-gate@file` Traefik middleware |
| OTLP ingest | `localhost:5080/api/default` | internal docker network only, never published |
| OpenObserve storage | named volume, 7-day retention | MinIO bucket, 14-day retention |
| Umami | `localhost:3100` | `analytics.isaiariva.com` |
| Umami database | `umami` database, created by a one-shot init container | same, against the shared PG16 |
| Memory caps | none | OpenObserve 768 MB, Umami 384 MB (worst case ~1.15 GB of 4.3 GB free) |
| Deploy | `pnpm docker:up` | Dokploy git autodeploy |

Notes:

- **Umami database creation** is a one-shot container running an idempotent
  `CREATE DATABASE umami` (guarded by a `pg_database` existence check). An
  `initdb.d` script would not work: it only runs against an empty data directory,
  and the local `postgres_data` volume already exists.
- **Memory caps matter in production** because the VPS has no swap. Without
  them, a runaway telemetry service triggers the kernel OOM killer, which may
  pick Postgres.
- **OTLP is never exposed publicly.** Anything that can reach it can write fake
  telemetry; the internal network is the authentication.
- **Images are pinned to exact tags** for OpenObserve and Umami, the same tag in
  both environments. Umami runs database migrations on startup, so an unpinned
  `latest` could migrate the `umami` database on any `docker pull`. Existing
  services keep their current tags; changing them is out of scope.
- **Local OpenObserve stores on disk**, Production on MinIO. The S3 configuration
  is validated in the production plan, which has to test it against the VPS's
  own credentials and network anyway.
- **Telemetry is on by default in Local.** `apps/api/.env.example` ships the
  `OTEL_*` values filled in, and the API's `predev` starts `redis` and
  `openobserve`. Umami is not in `predev`; the API does not use it, and
  `pnpm docker:up` starts it with everything else.
- **Umami stays idle locally** until a frontend embeds its script. It is defined
  now so the environment is complete.

## OpenTelemetry in the API

Revised after implementation: the first design patched modules through an ESM
loader hook; it worked but needed a plain-JS `--import` preload and an
import-order rule, and was fragile under Node 24 + tsx. The shipped design
patches nothing.

Feature folder `apps/api/src/features/telemetry/`: `telemetry.ts` (SDK start and
shutdown) and `constants/telemetry.ts`.

**Signals.**

- **Request spans and `http.server.request.duration`**: `@hono/otel`, wrapped by
  `middleware/request-spans.ts`. Spans are named `<METHOD> <route pattern>` (a
  404 is `GET /*`, never the raw path) and the metric carries `http.route`,
  `service.name` and `service.version`. The wrapper suppresses all tracing for
  `/health` and `/ready` (including `/ready`'s database check), drops the query
  string from `url.full` and adds `url.path`/`url.scheme`, and leaves 4xx spans
  unset so only a 5xx is an error, per the HTTP semantic conventions.
- **Prisma query spans**: `@prisma/instrumentation` (`^6.19.3`, the same
  range as `@prisma/client` and `prisma`, so all three move together), which
  reports through Prisma's own engine hooks; its one-off startup spans are
  ignored. Prisma 6.19 tracing is GA.
- **Logs**: a pino `mixin` stamps `trace_id`, `span_id` and `trace_flags` on
  lines logged inside a span; `pino-opentelemetry-transport` ships every line to
  the collector as a second pino target beside `pino-pretty` (Local) or stdout.
  `pino` moved 9 to 10 for the transport.
- **Redis**: not traced. ioredis can only be traced by patching it at load.
- **Resource**: traces, metrics and logs share `service.name`, `service.version`
  and `deployment.environment.name`.
- **Request log headers**: only `LOGGED_REQUEST_HEADERS`, since request lines
  now ship to OpenObserve.

**Start.** `index.ts` calls `startTelemetry()` before `createApp`: `@hono/otel`
binds its meter when the app is built, and the global MeterProvider, unlike the
tracer, has no proxy that attaches later. `app.ts` never imports the SDK, so
tests never start it.

**Configuration** lives in the zod env schema with everything else, and code
reads it from `env`, never `process.env`:

| Variable | Schema | Meaning |
|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | optional http(s) URL, trailing slash stripped | unset switches telemetry off |
| `OTEL_EXPORTER_OTLP_HEADERS` | `k=v,k=v`, values percent-decoded, default `{}` | e.g. OpenObserve Basic auth |
| `OTEL_SERVICE_NAME` | string, default `allonfire-api` | resource name on every signal |

URL, headers and service name are passed to each exporter explicitly (traces,
metrics, and the log transport's worker thread). A malformed value fails the
boot like any other setting.

**Shutdown.** `createShutdown` flushes telemetry last, inside a 2-second budget
(`TELEMETRY_FLUSH_TIMEOUT_MS`); the log transport's exporter uses the same
timeout. The OTLP exporter otherwise retries an unreachable collector for about
8 seconds, longer than tsx watch's 5-second force-kill.

**Sampling.** 100%, marked with a `ponytail:` comment naming the upgrade path
(`parentbased_traceidratio`) if span volume ever matters.

**Failure behaviour.** OpenObserve down or wrong credentials: exports fail and
are dropped, OpenTelemetry's diagnostics reach the API log through a pino-backed
`diag` logger, requests are unaffected, and shutdown still completes within the
flush budget. The SDK builds no log pipeline of its own (`logRecordProcessors:
[]`); logs go through the pino transport only.

## Documentation

ADRs, each stating the decision, the rejected alternatives and the trigger to
revisit:

- `docs/adr/0004-rest-openapi-hc-client.md`
- `docs/adr/0005-dokploy-delivery-no-iac.md`
- `docs/adr/0006-self-hosted-observability.md` — also records the production
  topology above, so the production plan starts from it.

Also:

- `apps/api/README.md`: a "Telemetry" section (start the stack, set the env,
  where to look).
- `CONTEXT.md`: **Local**, **Production**, **Telemetry**, **Analytics** (added
  during grilling).
- `CLAUDE.md`: `telemetry/` in the API tree; the VPS line corrected to
  4 vCPU / 8 GB.
- `docs/superpowers/specs/2026-08-27-hono-api-scaffold-design.md`: the deferred
  "Sentry / OpenTelemetry / Prometheus" row marked as resolved by this spec.

## Testing

- **Request spans** (`features/telemetry/tests/http-spans.test.ts`): through the
  real `createApp` with an in-memory exporter, spans are named after the route
  pattern, a 404 collapses to `GET /*`, and probes (with or without a query
  string) produce none.
- **Request-span corrections** (`features/telemetry/tests/request-spans.test.ts`):
  no query string in `url.full`, 4xx unset, 5xx error, nothing traced under a
  probe, service name and version on the duration metric.
- **Diagnostics** (`features/telemetry/tests/diag.test.ts`): OpenTelemetry's own
  failures land in the API log.
- **Request log headers** (`src/app.test.ts`): only allowlisted headers logged.
- **Log trace context** (`features/logger/tests/trace-context.test.ts`): a line
  logged inside a span carries its ids; one logged outside carries none.
- **Env schema**: telemetry off by default, header list parsed and decoded,
  non-http endpoint and a header without a value rejected.
- **`shutdown.test.ts`**: telemetry flushes last, a failing flush does not stop
  the other steps, and a hung flush is abandoned after the budget.

**Manual verification:** `pnpm docker:up`, `pnpm --filter @allonfire/api dev`,
then request `/openapi.json` and an unknown path. OpenObserve at
`localhost:5080` shows both spans under `allonfire-api`, the request log lines
carry their `trace_id`, and `http_server_request_duration` is split by
`http_route`. With OpenObserve stopped, requests still return 200 and Ctrl+C
exits promptly. Umami at `localhost:3100` accepts `allonfire` / `allonfire` and
the `umami` database exists.

## Non-goals

- Deploying OpenObserve, Umami or the API to the VPS.
- Instrumenting Laura or embedding the Umami script anywhere.
- Alerting, dashboards beyond OpenObserve defaults.
- Kubernetes, ArgoCD, Helm, Terraform.

## Deferred

| Deferred | Trigger to add |
|---|---|
| Production OpenObserve + Umami services | API production deploy plan |
| Umami script in a frontend | the Laura rewrite or the React Native client |
| GlitchTip | error grouping or alerting OpenObserve cannot provide |
| Terraform / OpenTofu | a second server |
| Kubernetes, Helm, ArgoCD | a workload one VPS cannot hold |
| Trace sampling below 100% | span volume noticeable in OpenObserve storage |
