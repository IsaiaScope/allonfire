# CI builds each Deploy unit's image; Dokploy only runs them

Production stays one Dokploy compose project (ADR 0005), but it no longer
builds from git. On a push to `prod`, GitHub Actions asks Turbo which Deploy
units the change affects, builds only those images, pushes them to GHCR
(private) as `:<sha>` and `:prod`, then calls Dokploy's API once to redeploy
the project. Every service in `docker-compose.prod.yml` names an image with
`pull_policy: always`, so `docker compose up` recreates only the services
whose image changed. Dokploy's auto-deploy on git push is off.

This amends ADR 0005's "Dokploy deploys by git push"; its "no Kubernetes, no
IaC" stands.

## Why

- Building on the VPS (8 GB, no swap) rebuilt every App on every deploy, and
  a Next build there competes with the running services for memory.
- Turbo's package graph is the only thing that knows which Apps read a shared
  package; Dokploy's watch paths would have to list that by hand.
- One compose project keeps `depends_on` ordering (backup, migrate, then the
  Apps) with nothing new to write. One Dokploy Application per App was
  rejected: the one-shot migration does not fit a long-running Application,
  and CI would have to own the ordering.

## Consequences

- Dokploy holds a read-only GHCR token; CI holds `DOKPLOY_API_KEY`.
- A rollback retags an older `<sha>` as `:prod` and redeploys.
- GHCR is free for now; CI keeps the last 10 `<sha>` tags per image so a
  future quota is not hit.
- The backup runs on every deploy, not only when the database changes.
