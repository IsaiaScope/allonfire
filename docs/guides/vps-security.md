# VPS security

Firewall, SSH, CrowdSec, Traefik gates, Dokploy login, OS updates, Dokploy's env values. Hosts and which gate each one sits behind: `deployment.md`. Server overview: `vps.md`.

## Firewall (Hetzner `vps-firewall`)

- In TCP 80 and 443: Cloudflare's ranges only (v4 and v6).
- In TCP `<ssh-port>`: any source (key-only SSH).
- In ICMP: any. Everything else is dropped at the hypervisor, before the server.
- Read: `hcloud firewall describe vps-firewall`. Change: `hcloud firewall replace-rules vps-firewall --rules-file <file>` (replaces the whole set; keep every rule above in the file).
- Cloudflare's ranges (`cloudflare.com/ips-v4`, `ips-v6`) change rarely: update the firewall and Traefik's `trustedIPs` together (`deployment.md`).

## SSH (`sshd -T`)

- `port <ssh-port>`, `permitrootlogin no`, `passwordauthentication no`, `allowusers <ssh-user>`, `maxauthtries 3`, `x11forwarding no`.
- Keys `ssh-ed25519` only; ciphers `chacha20-poly1305`, `aes256-gcm`; MACs `hmac-sha2-512-etm`, `hmac-sha2-256-etm`; kex `sntrup761x25519`, `curve25519`.
- Before a restart: `sudo sshd -t`, and keep the current session open until a new `ssh main-vps` works.
- `/etc/ssh/sshd_config` and `authorized_keys` travel in the `server-config` backup.

## CrowdSec

- Engine plus the nftables firewall bouncer (`crowdsec-firewall-bouncer` service, registered as `firewall-bouncer`).
- Collections: `crowdsecurity/linux`, `crowdsecurity/sshd`, `crowdsecurity/whitelist-good-actors`.
- Commands: `sudo cscli decisions list`, `alerts list`, `metrics`, `bouncers list`; ban `cscli decisions add --ip <ip> --duration 24h`; unban `cscli decisions delete --ip <ip>`; update `cscli hub update && cscli hub upgrade`.

## Traefik gates and headers

- `admin-gate@file`: basic auth for `storage.` and `database-console.`.
- `panel-auth@file` (`panel-auth.yml`): basic auth for `panel.` (Dokploy); also holds the CI login `deploy.yml` uses (`deployment.md`).
- `sofia-gate@file`, `sofia-ratelimit@file` (per visitor IP, `ipStrategy.depth: 1` behind Cloudflare), `sofia-noindex@file` (`sofia.yml`): `sofia.` (`vps-agent.md`).
- `noindex@file`, `security-headers.yml` (HSTS a year with preload, nosniff, frame deny, referrer and permissions policy, strips `Server` and `X-Powered-By`; `security-headers-csp@file` adds the CSP).
- Own login, no basic auth: `observe.`, `monitor.`, `board.`, `workflow.` (n8n's login; its `/webhook/` paths stay public, the backup webhook checks a header token).
- New password for a gate: `htpasswd -nbB <user> <password>` locally, paste the hash into the `users:` list of the dynamic file; Traefik reloads the folder on its own. Never copy a hash into the repo.
- Files: `/etc/dokploy/traefik/dynamic/` (`vps.md`); they travel in the `traefik-dynamic-config` backup.

## Dokploy login

- Dokploy account with TOTP 2FA (Settings, Profile); backup codes in the password manager.
- Locked out of 2FA: `ssh main-vps`, `docker exec -it $(docker ps -qf name=dokploy-postgres) psql -U dokploy -d dokploy`, then turn the flag off for `<owner-email>`. 2026-03 schema: `UPDATE auth SET "is2FAEnabled" = false WHERE email = '<owner-email>';`. Dokploy's better-auth schema names the table and column differently: run `\dt` and `\d "user"` first and set its two-factor flag to false. Log in, turn 2FA on again.
- API keys: one per caller, each with `rateLimitMax: 200` (`deployment.md`).

## Unattended upgrades

- Origins: Ubuntu, `-security`, ESM apps and infra security.
- Removes unused kernels and dependencies; reboots on its own at 03:00 when a kernel update needs it.
- Daily: update lists, download, upgrade; autoclean every 21 days.
- Check: `sudo unattended-upgrades --dry-run --debug`; log `/var/log/unattended-upgrades/`.

## Dokploy's env values

- Dokploy keeps every service's env values unencrypted in its Postgres (`dokploy` database).
- Living with it: reach Dokploy only through the tunnel or `panel.` (basic auth, then Dokploy's login with 2FA); `database-console.` sits behind `admin-gate`.
- Both backups that hold the values (`dokploy-config`, `postgres-all`) are age-encrypted before upload (`vps-backups.md`).
- The source of truth for AllOnFire's values is the git-ignored `.env.production` files, read only through `pnpm env:prod`; a changed value changes in each file and in Dokploy (`deployment.md`).
- New secrets: `openssl rand -hex 32`.

## History and gotchas

- 2026-02-28: SSH open to every source, not an IP allowlist; the home IP is dynamic, so an allowlist would lock the owner out; key-only ed25519 on a non-standard port instead.
- 2026-03: CrowdSec bouncer would not start; the apt package ships a placeholder API key; `cscli bouncers add firewall-bouncer`, key into `/etc/crowdsec/bouncers/crowdsec-firewall-bouncer.yaml`, then start `crowdsec-firewall-bouncer` (not `-nftables`).
- 2026-03: n8n editor IP allowlist dropped; dynamic home IP; n8n's own login.
- 2026-03: Adminer IP allowlist ("triple gate") and SSH tunnel dropped; dynamic IP, and the tunnel could not reach the container; basic auth plus Adminer's own Postgres login.
- 2026-03: Beszel behind basic auth looped on the login; Traefik's 401 and PocketBase's 401 fight in the browser; no basic auth on `monitor.`, Beszel's own login only. Same on `observe.` (OpenObserve).
- 2026-03-03: Dokploy 2FA can fail on a custom domain (known bug in some versions); the SSH tunnel to `localhost:3000` avoids it.
- 2026-10-29: CI could not reach Dokploy's API; `panel.` sits behind `panel-auth`; `panel-auth` gained the `main-github-deploy` user (`deployment.md`).
- 2026-11-02: proxied records; firewall 80/443 narrowed to Cloudflare; `sofia-ratelimit` counted Cloudflare's address for everyone; `ipStrategy.depth: 1`.
- Gotcha: `"live-restore": true` in `/etc/docker/daemon.json` stops Docker from starting under Swarm ("incompatible with swarm mode"); never set it.
