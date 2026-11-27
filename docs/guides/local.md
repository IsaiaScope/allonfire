# Local and the tailnet

Running AllOnFire on the Mac, and opening the dev Apps on a phone. The first run is in the root `README.md` (Run it locally). The commands: `tooling.md`. Why Tailscale Services, and what a new App needs: ADR 0021.

## What `pnpm dev:setup` fills

It starts the Local stack, applies the changelog, seeds the real Admin (`DATABASE_SEED_ADMIN_*` in `packages/database/.env`, Admin in every App) and creates the `image` bucket, closed to anonymous reads (it has no bucket policy). Local holds what Production holds; the Fixtures live only in Test databases. `packages/storage/.env` holds the Local MinIO login that the setup and the e2e run's bucket use. The scripts are bash: macOS and Linux run them as they are; on Windows use WSL.

## Open the Apps on a phone

`pnpm dev` also serves each dev App over HTTPS as its own Tailscale Service, and stops serving them when it stops (Ctrl+C). With Tailscale off it skips this, and the Apps answer on localhost only.

| App | Address |
|-----|---------|
| Back Office | `https://back-office.<tailnet>.ts.net` |
| Laura | `https://laura.<tailnet>.ts.net` |

- `pnpm dev:tailscale` serves them on its own, and Tailscale keeps serving across restarts until `pnpm dev:tailscale:off`.
- Tailscale runs on the Mac and on each device, with MagicDNS and HTTPS Certificates on in the tailnet's DNS settings.
- `next dev` accepts only names on this tailnet, which it reads from `tailscale status` at start: sign in to Tailscale before `pnpm dev`, or restart `pnpm dev` after.

## One-time setup: the tailnet

1. Admin console, Access controls: add the tag, let it host the Services, and let members reach them. Merge this into the existing `tagOwners` and `grants`, and keep the default allow-all grant.

   ```json
   "tagOwners": { "tag:dev": ["autogroup:admin"] },
   "autoApprovers": {
     "services": {
       "svc:back-office": ["tag:dev"],
       "svc:laura": ["tag:dev"],
       "svc:cdn": ["tag:dev"],
       "svc:api": ["tag:dev"]
     }
   },
   "grants": [
     { "src": ["autogroup:member"], "dst": ["svc:back-office", "svc:laura", "svc:cdn", "svc:api"], "ip": ["443"] }
   ]
   ```

2. Tag the Mac: `tailscale up --advertise-tags=tag:dev` with your other `up` flags, or Machines, Edit ACL tags. A Service host must be tagged, so the Mac then belongs to the tag, not to a user.
3. Define the Services `back-office`, `laura`, `cdn` and `api`, each on `tcp:443`.
4. Run `pnpm dev:tailscale`. A Service the Mac advertised before it was defined stays pending: `tailscale serve clear svc:<name>`, then run it again, and the auto-approval applies.

## One-time setup: the env files

Restart the API and the Apps afterwards: `NEXT_PUBLIC_*` values are baked in at build.

| File | Key | Value |
|------|-----|-------|
| `apps/api/.env` | `API_CORS_ORIGINS` | add `https://back-office.<tailnet>.ts.net,https://laura.<tailnet>.ts.net` |
| `apps/api/.env` | `STORAGE_IMAGE_SERVER_URL` | `https://cdn.<tailnet>.ts.net/image` |
| `apps/api/.env` | `AUTH_COOKIE_DOMAIN` | `".<tailnet>.ts.net"` |
| `apps/back-office/.env.development.local` | `BACK_OFFICE_URL` | `https://back-office.<tailnet>.ts.net` |
| `apps/back-office/.env.development.local` | `LAURA_URL` | `https://laura.<tailnet>.ts.net` |
| `apps/laura/.env.development.local` | `LAURA_URL` | `https://laura.<tailnet>.ts.net` |
| each App's `.env.development.local` | `NEXT_PUBLIC_API_REMOTE_URL` | `https://api.<tailnet>.ts.net` |
| each App's `.env.development.local` | `AUTH_COOKIE_DOMAIN` | `".<tailnet>.ts.net"` |

Delete an App's `.env.development.local` to take that App back to localhost.

What each one is for:

- `API_CORS_ORIGINS`: an App's server forwards the page's Origin to the API, whose Better Auth refuses one it does not trust, and Sign in then reports itself unavailable.
- `STORAGE_IMAGE_SERVER_URL`: the API signs every picture link with it and the browser loads the link directly, so `localhost:9010` reaches no phone. The Mac reaches the tailnet address too while Tailscale is on; with Tailscale off, put `http://localhost:9010/image` back.
- `BACK_OFFICE_URL`, `LAURA_URL`: link previews on the phone load their images.
- `NEXT_PUBLIC_API_REMOTE_URL`: a page opened on the tailnet address calls the API there, since `localhost:3300` reaches nothing on a phone. A page on `localhost` keeps `NEXT_PUBLIC_API_URL`.
- `AUTH_COOKIE_DOMAIN`: once the API and both Apps share the domain, one Session cookie serves all three; sign in again at each address you use. Without it the browser's call from the tailnet address carries no Session and gets the signed-out answer (only public Images, one page), so the pager's arrows step back and a delete jumps to the last page. A sign-in from `localhost` gets a cookie with no Domain (the API drops it for an Origin outside the domain), so `localhost` and the tailnet address each keep their own Session.
