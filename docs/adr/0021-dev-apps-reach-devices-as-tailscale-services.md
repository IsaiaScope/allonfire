# Dev Apps reach other devices as Tailscale Services

`pnpm dev` runs every App on the Mac (`localhost:3400`, `localhost:3200`, ...).
To open them from a phone, `pnpm dev:tailscale` advertises each App as its
own Tailscale Service, so each one has its own HTTPS address on the tailnet:
`https://back-office.<tailnet>.ts.net`, `https://laura.<tailnet>.ts.net`.
Today the tailnet is `pintail-adelie.ts.net` and the Mac is the machine
`allonfire`. `pnpm dev:tailscale:off` stops them.

## Why

- A phone has to load the App over HTTPS: Secure cookies, `crypto.randomUUID`
  and the launch screens all need a secure context. `tailscale serve` gives
  one, with a certificate Tailscale issues, and nothing leaves the tailnet.
- Serving everything on the Mac's own name (`https://allonfire.<tailnet>.ts.net`)
  was tried first: one App per HTTPS port, and `tailscale serve` offers only
  443, 8443 and 10000. That means three Apps at most, behind port numbers.
  Services give each App a name and port 443.
- A second Tailscale node per App (a userspace `tailscaled` with its own
  hostname) was rejected: one extra daemon per App, started by hand, for
  what one daemon already does.
- Tailscale cannot issue its certificates for a custom domain, so the
  `ts.net` names are the nicest HTTPS names available.

## How

- `AOFCreateNextConfig` lets `next dev` accept `*.<tailnet>.ts.net` in
  `allowedDevOrigins`. Core's `tailnetHosts` reads the tailnet from
  `tailscale status` when `next dev` starts, so a new Service needs no code
  change. Sign in to Tailscale before `pnpm dev`, or restart it after.
- The Mac is tagged `tag:dev`: a Service host must be tagged.
- The policy file holds three entries:
  - `tag:dev` in `tagOwners`;
  - one `autoApprovers.services` entry per App's Service;
  - a grant to `autogroup:member` on 443 for the Services, beside the default
    allow-all grant.
- The steps are in the root README, under "Local".

## Consequences

- The Mac belongs to `tag:dev`, not to a user. Its key does not expire, and
  user-bound features (Taildrop to or from it) stop working.
- A new App needs four things:
  1. a Service defined in the admin console (Services, Define a Service, its
     name, `tcp:443`);
  2. an `autoApprovers` line and a grant entry in the policy;
  3. a line in `dev:tailscale`;
  4. an `allowedDevOrigins` that covers it. That is automatic once the App is
     built on `AOFCreateNextConfig` (Laura is not yet).
- A host that advertised a Service before it was defined stays pending.
  Clear it (`tailscale serve clear svc:<name>`) and run `pnpm dev:tailscale`
  again, and the auto-approval applies.
- Every App shares the API's `localhost` address only on the Mac. Once a page
  calls the API from the browser, the API needs its own Service (`svc:api`),
  its address in `API_CORS_ORIGINS` and in `NEXT_PUBLIC_API_URL`.
- Renaming the tailnet or the machine changes every address. Restart
  `pnpm dev` and run `pnpm dev:tailscale` again.
