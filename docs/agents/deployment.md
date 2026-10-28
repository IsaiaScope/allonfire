# Deployment

VPS, Docker services, CI. Pictures: `images.md`.

- VPS: Hetzner, 4 vCPU / 8 GB RAM, no swap, at 188.245.174.30 (ssh main-vps)
- Observability: self-hosted OpenObserve + Umami (Local only so far) — see `docs/adr/0006-self-hosted-observability.md`
- Orchestrator: Dokploy runs one compose project of GHCR images; `.github/workflows/deploy.yml` builds only the affected Deploy units on a push to `prod` and redeploys it (ADR 0018).
- DB: Shared PostgreSQL 16 (database: allonfire)
- Proxy: Traefik with Let's Encrypt SSL
- A Docker service, its container (`allonfire-<name>`), its volume and its hostname are named after its purpose, never its software: `database`, `redis`, `storage`, `image-server`, `image-cache`, `workflow`, `telemetry`, `analytics`, and `<name>-init` for a one-shot (`docker-compose.dev.yml`, `docker-compose.prod.yml`; `packages/config/local/tests/service-names.test.ts` fails on an old name). Swapping the software is an `image:` line. Production's `storage-move` copies `allonfire-minio-data` into `allonfire-storage-data` once, on its first deploy; the old volume is the rollback

- Back Office build needs `BACK_OFFICE_URL`, its own public address (`metadataBase`): a Docker build arg (`deploy.yml`) and a CI secret for the `build` job, each read from its GitHub environment (`prod`, `dev`) under the same name, and the same value at runtime (`docker-compose.prod.yml`).
- Before the API starts, the one-shot `storage-setup` service (the API's image) creates the `image` bucket when missing and keeps it closed (an earlier read-only policy is removed); it uploads no Images.
- CI runs check-types, test and build with `turbo --affected`; lint and the repo-wide checks always run. Affected is Turbo's (`futureFlags.affectedUsingTaskInputs`): every task's `inputs` excludes `**/*.md`, so a Markdown-only change affects nothing, and a root `package.json`, `turbo.json` or lockfile change affects everything; a new task needs the same exclusion. `pnpm ci:affected <base>` (`@allonfire/core/features/ci/affected`) reads `turbo query affected --packages` as the affected Apps (packages under `apps/`) and Deploy units; `docker/`, `.dockerignore` and `pnpm-workspace.yaml`, which no task reads, reach every unit. A push to `prod` diffs against the `deployed/prod` tag, the last commit that deployed.

