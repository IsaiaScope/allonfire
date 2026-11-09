# VPS agent (Hermes)

The Hermes agent named Sofia: container, host, mounts, backup, trust boundary. Backup details: `vps-backups.md`. Gates: `vps-security.md`.

## Current state

- Nous Research Hermes (`nousresearch/hermes-agent`), a personal always-on automation agent with tools; the brain is a remote model provider (no local inference on this server).
- Container `sofia`, compose project `ai-agent-sofia` on the VPS's Docker.
- Host `sofia.isaiariva.com`, proxied, routed by the Traefik file `sofia.yml`: `sofia-gate@file` (basic auth; 401 without it), `sofia-ratelimit@file` (per visitor IP, `ipStrategy.depth: 1` behind Cloudflare), `sofia-noindex@file`.
- Volume `ai-agent-sofia-state`: Hermes' state (config, SQLite state, sessions, memories, skills, cron), about 2.6 GB of which about 2.5 GB is caches it rebuilds (models, Python and uv packages, sandboxes, downloads).
- Bind mounts: `/home/<ssh-user>/ai-agent/agents/sofia/interview/SOUL.md` (the persona) and `/home/<ssh-user>/ai-agent/agents/sofia/managed`.
- Logs: `docker logs sofia --tail 100`. Disk: `docker system df -v | grep ai-agent-sofia-state`.

## Backup

- Component `agent-state`: the volume minus its caches plus the whole `/home/<ssh-user>/ai-agent`, age-encrypted, about 120 MB (`BACKUP_AGENT_VOLUME`, `BACKUP_AGENT_DIR`; cache list `AGENT_CACHES` in `vps/backup.sh`).
- Restore: untar, put its `ai-agent-sofia-state/_data` folder back into the volume and its `ai-agent` folder into `/home/<ssh-user>/`, start `sofia`; caches refill on first use.
- tar's exit 1 is accepted: the SQLite files change while the agent runs.

## Trust boundary (built)

- Own compose project, own volume, own SQLite store in it; not part of the AllOnFire compose, and nothing in Production calls it.
- Mounts: only its volume and the two paths above; no Docker socket.
- Reached from the web only through Traefik behind `sofia-gate`, `sofia-ratelimit` and `sofia-noindex`.

## History and gotchas

- 2026-07-04: PRD written: an isolated Hermes on the main server, own store, no access to Production data, command approval on, browser tool off at first, Telegram gateway later.
- 2026-07: built as the compose project `ai-agent-sofia`, container `sofia`, state in a named volume plus a folder in the SSH user's home instead of one `~/.hermes/` directory.
- 2026-11-02: `sofia-ratelimit` keyed every visitor as Cloudflare's address once proxied; `ipStrategy.depth: 1`.
- 2026-11-02: the agent had no backup; `agent-state` added; the first dry run failed on 2.6 GB of caches and tar's exit 1 on live SQLite; caches excluded, exit 1 accepted.
