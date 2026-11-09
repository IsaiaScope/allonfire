# Mail providers over their HTTP APIs

## Intent

Mail leaves through SMTP today, behind a local quota ledger (reservations,
statuses, a usage table pruned daily). Every provider already counts its own
sends, so the ledger duplicates it, misses sends made outside AllOnFire, and
drags in `nodemailer`, an SMTP host allowlist that names two vendors in code,
and a whole usage vocabulary. The MAIL Service becomes: an ordered list of
Providers, each reached by its HTTP API, failing over on its typed refusal,
with usage read from the Provider for the Services page's rings.

## Goals

- Send through the Providers' HTTP APIs with `fetch`; drop `nodemailer`, the
  SMTP transport, the host allowlist and quota reservation.
- Code, enums, env names, tests and docs carry no vendor name. A driver is
  named for the shape of the API it speaks. The vendor's name exists only as
  the Admin-typed `name` of a row (and in operator docs that say which key
  to create where).
- The Services page keeps its two rings (today against the daily limit, the
  last 31 days against the monthly one), now filled from the Providers' APIs.
- Keep: slot-order failover, the per-address Redis limit (5 per rolling
  hour), the Service on/off switch, Provider enable switch, test send,
  editing of name, sender and limits on a Version, and keep-alive.

## Non-goals

- Enforcing the limits in the send path. They only size the rings.
- Reading `remaining()` before a send. One extra vendor call per email and a
  race between check and send; the typed refusal already routes the failover.
- A usage or send-log table. A trend chart is later work.
- A third provider, retries on the same provider, idempotency keys.
- Deleting a Provider from the Services page; rows come from the changeset
  and slots from env.

## Anti-goals

- A vendor name in an identifier, enum value, constant, env var, test title
  or log message.
- An Admin able to change where the API connects.
- A message sent twice: an uncertain outcome (timeout after the handoff)
  still stops the send, counted nowhere, retried nowhere.

## Decisions (the user's)

1. **Drivers named by API shape**, two of them (working names
   `BEARER_FLAT`: `Authorization: Bearer`, flat `from`/`html`/`text`;
   `KEY_HEADER_ENVELOPE`: `api-key` header, nested `sender`, `htmlContent`).
   A driver is a zod enum in core, resolved from a lookup table
   (`as const satisfies Record<Driver, DriverImpl>`).
2. **Env owns URL, key and driver per slot**: `MAIL_PROVIDER_<slot>_URL`,
   `_KEY`, `_DRIVER`. The row keeps only slot, name, enabled, sender, limits,
   `lastAcceptedAt`.
3. **Quota read only for the page**; sending fails over on refusals.
4. **Keep-alive stays**: `POST /v1/services/keep-alive`, a Provider with no
   acceptance for 30 days sends one check email through itself;
   `lastAcceptedAt` is the one column it needs. The usage pruning step goes.
5. **Live quota, no snapshot table.** Provider table only.
6. **Ring limits stay in the DB** (`dailyLimit`, `monthlyLimit?`), Admin-edited
   on the Services page as today, never checked when sending.
7. **Page controls kept**: Service and Provider enable switches, edit name,
   sender and limits, test send. Delete Provider goes.

## My calls (check these)

- Failover contract. A driver's `send` answers `accepted`, `quota` (daily or
  monthly exhausted, or rate limited: next Provider, logged), `rejected`
  (refused outright, bad key included: next, logged), or `uncertain`
  (timeout or unknown after the handoff: stop, never elsewhere). A 5xx before
  any byte of acceptance is `rejected`; a network failure before the request
  left (DNS, connect) is `rejected`; a read timeout after is `uncertain`.
- Decided with the user: the API fills the rings; what it lacks comes from the
  DB. Ring maxima are the limit the provider's API reports, else the DB column.
  `usage()` is a driver function, `{ day, month, dayLimit, monthLimit } | null`
  (the limits null when the provider reports none; Brevo-shaped derives
  `dayLimit` from `GET /v3/account` credits only if the probe shows they are the
  day's allowance). When it answers null (key scope refused, vendor down) the
  rings draw empty and an error toast (snack) says so; nothing falls back to a
  local count. Called by the Services route
  per Provider, concurrently, with a per-call timeout, and cached in Redis
  for a few minutes (a constant). One Provider failing never fails the page.
- "Today" is the UTC calendar day; "last month" is the last 31 days. Neither
  vendor's own day boundary is guessed beyond that.
- `UsagePurpose` leaves the database. The purposes (verification,
  password-reset, test, keep-alive) become a core constant used for logs.
- Resend-shaped `usage()` calls the account metrics endpoint
  (`GET /emails/metrics`); the docs do not say a sending-only key may. A
  probe task checks with the real key; if refused, `usage()` answers null and
  the README says which key scope the page needs. Brevo-shaped `usage()` calls
  `GET /v3/smtp/statistics/aggregatedReport` (`requests`), also probed
  because the docs do not say it counts transactional sends only.
- Unused APIs worth a later plan: Brevo `/v3/smtp/statistics/reports` (per-day
  breakdown), `/v3/senders` and Resend `/domains` (warn on an unverified
  sender), `/v3/account` `plan[].credits` (remaining credits).
- `0007-service-mail` and ADR 0029 exist only on this branch (absent from
  `dev`, `test`, `prod`): both are edited in place; a Local database that
  applied the old 0007 is reset. A new ADR 0030 records "quota is read from
  the Provider, not counted".

## Constraints from the repo (cited, not invented)

- `AGENTS.md`: tests first, `@module-tag` first line, no `as`, constants one
  nested object per owner, env var starts with its owner, no `Object.keys`
  and no `JSON.parse/stringify` (core helpers), a path or error code never a
  string literal, a form is an AOF form, Liquibase only.
- `docs/guides/database.md`: "Never edit an applied changeset". Unapplied
  here, see above; the plan states it.
- `docs/guides/api.md`, `docs/guides/back-office.md`, `docs/guides/forms.md`,
  `docs/guides/testing.md`, `docs/guides/vps-workflow.md` (keep-alive
  workflow text), `CONTEXT.md` (Service, Provider updated), ADR 0028 (Version
  checks), ADR 0029.

## What changes where (for the planner)

- `packages/core/src/features/mail`: new driver contract, two drivers, a
  `fetch` transport with timeout, failure classification; delete
  `smtp-transport`, `outcome`'s nodemailer reading, `MAIL.SMTP`, host
  allowlist; `mail-environment` reads `_URL`, `_KEY`, `_DRIVER`; `sendMail`
  loses reserve and settle; `nodemailer` and `@types/nodemailer` leave
  `package.json`.
- `packages/database`: `service.prisma` and `0007-service-mail.sql` edited
  (drop `MailUsage`, `UsageStatus`, `UsagePurpose`, `host`, `username` and the
  "enabled has a login" check; an enabled Provider still needs a sender);
  `provider.service.ts` loses reservation, usage and retention functions and
  keeps list, update on a Version, find, `markAccepted` (raw SQL
  `lastAcceptedAt`).
- `apps/api`: `mail-deps`, `database-store`, services routes and schemas
  (usage in the Provider body now comes from the drivers; no delete route),
  `keep-alive` without pruning, env example and README, i18n key
  `provider` cleanup.
- `apps/back-office`: Services page: rings from the new usage, empty rings with an error toast
  state, drop host and login fields and the delete control; translations,
  e2e `services.spec.ts` (labels no longer a vendor name).
- `vps`: keep-alive workflow text loses the pruning sentence and vendor name;
  `vps/.env.example` if it lists secrets.
- Docs: `CONTEXT.md` (done), ADR 0029 amended, ADR 0030 new, guides above,
  `apps/api/README.md` "Mail and Services", `.env.example`.

## Left to the builder

File and function names beyond those above, cache constant values, the
exact request and response schemas (checked against each vendor's current
docs and a real-key probe), and the per-driver error-to-outcome tables.

## Self-review

- Placeholder scan: working driver names are marked as working names; the
  planner picks the final ones, vendor-free.
- Consistency: the usage ring needs a limit, kept in the DB (decision 6);
  the send path never reads it.
- Scope: one plan, three topics (core+api mail, database, back office), kept
  in one ticket.
- Ambiguity: "an enabled Provider needs a sender" stays a database check;
  every other completeness check (URL, key, driver) is env and is checked
  at send time, logged and skipped like a missing secret today.

## Probe results

Run 2026-11-09 against the Local `apps/api/.env` keys (never printed or stored).

**Resend-shaped (slot 1, key `re_…`), verified:**
- `GET /emails/metrics?start_date=<UTC day start>&granularity=daily` → `200`, `totals.sent` (today 1 of 1 test send; 31 days: 2). `GET /domains` also `200`, so this key is Full access: whether a sending-only key may read metrics is still unverified.
- Invalid key: `POST /emails` → `401 {"name":"validation_error","message":"API key is invalid","statusCode":401}`; `GET` → `400` with the same name. Missing field: `422 {"name":"missing_required_field"}`.
- Response headers carry `ratelimit-limit: 10`, `ratelimit-remaining`, `ratelimit-reset`; no quota header on a paid-or-test account.
- Quota refusal not reproducible; the docs' `429` `daily_quota_exceeded` / `monthly_quota_exceeded` is used.

**Brevo-shaped (slot 0), verified with a new Full-access v3 key (the old SMTP key `xsmtpsib-…` is refused by the REST API):**
- `GET /v3/account` → `200`, `plan: [{ type: "free", credits: 300, creditsType: "sendLimit" }]` with 0 sent today and 5 in 31 days, so on a free plan `credits` is today's remaining allowance (the daily limit is 300). On a paid plan `credits` would be a plan total, so `dayLimit = day + credits` is derived only from a `free` entry.
- `GET /v3/smtp/statistics/aggregatedReport` with `startDate`=`endDate`=the UTC day → `200`, `requests: 0`; with `days=31` → `requests: 5`. The window is returned as `range: "2026-10-09|2026-11-09"`.
- `GET /v3/senders` → `200`, `noreply@mail.isaiariva.com` active (a later "sender verified" badge could read it).
- Invalid key: `401 {"code":"unauthorized","message":"Key not found"}`. Missing field: `400 {"code":"missing_parameter"}`.
- The quota refusal is not reproducible; the docs' `429` and `400 not_enough_credits` are used.

**Revised after use (2026-11-09):** the day's limit is no longer derived as `day + credits`. The aggregated report is built with a delay while the credits move at once, so right after a send the sum shrank (`0 + 299`). The count is now the larger of the report and the card's daily limit less the credits left, the ring's maximum is the card's limit, and the usage cache is 30 seconds (ADR 0030). Resend's `totals.sent` also trails a send by seconds, which is why a longer cache froze a stale count.
