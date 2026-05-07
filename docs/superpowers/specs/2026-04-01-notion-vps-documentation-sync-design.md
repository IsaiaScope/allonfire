# VPS Notion Documentation Sync — Design Spec

## Context

After deploying AllOnFire to the VPS (social.isaiariva.com, laura.isaiariva.com, minio.isaiariva.com), the Notion documentation is stale. The VPS was also upgraded from CAX11 to CAX21. Backup system expanded to 10 components. Multiple infrastructure changes need documenting across 8+ Notion pages.

## Scope

1. **Create** a new AllOnFire Deployment page in Notion
2. **Update** 7 existing pages with AllOnFire references and infrastructure changes

## Changes to Document

### Infrastructure Changes
- VPS: CAX11 → CAX21 (8GB RAM, 4 vCPU, 80GB disk, €6.49/mo)
- 3 new containers: social, laura, minio
- External Docker volume: allonfire-minio-data
- New database: allonfire (shared dokploy-postgres)
- New Traefik middleware: shared-access.yml with admin-gate

### New Page: AllOnFire Deployment
- Project overview (Turborepo, Next.js 16, social + laura apps, MinIO)
- Dokploy Compose project configuration
- Docker build pipeline (env stubs, turbo prune, HOSTNAME=0.0.0.0)
- Branch strategy (dev → test → prod with auto-deploy)
- Environment variables (full list with descriptions)
- Domain routing (Traefik labels, no explicit middleware needed)
- MinIO setup (bucket: allonfire, access: admin-gate@file)
- Photo seeding procedure
- Build issues encountered and solutions

### Pages to Update
1. **Root VPS Page** — server specs, service list, cost, page index
2. **Dokploy Hub** — AllOnFire project, allonfire DB/user, MinIO volume
3. **Cloudflare DNS** — 3 new A records (social, laura, minio)
4. **Backup System** — component #10 (MinIO S3 sync), count 9→10
5. **Traefik Security Headers** — shared-access.yml, admin-gate@file
6. **UptimeRobot** — 2 new monitors
7. **Command Cheat Sheet** — AllOnFire deployment commands

## Verification
- Each Notion page accurately reflects the current VPS state
- AllOnFire page has complete deployment documentation
- Cross-references between pages are consistent
