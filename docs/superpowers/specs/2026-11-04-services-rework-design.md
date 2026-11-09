# Services rework: per-type tables, usage cleanup, cached page, concurrency

Agreed in chat with the owner on 2026-11-04. It builds on
`2026-11-02-service-quotas-and-mail` (the Services Section, the quota, the
keep-alive) and changes what that work left on this branch, none of which
has shipped: changesets 0007 to 0010 exist only here and in the local
database.

## Intent

The `service` schema was named as if it held every future Service, but its
provider and usage tables are mail's: SMTP host, login and sender, a quota
counted one unit per send. A second Service (SMS, AI, storage) would not fit
them. Each type gets its own provider table, and its own usage table only
when it counts something, all under one shared `Service` row. Old usage rows
are never removed today; they get a retention. The Services page waits on
the API on every visit; it is cached like Users, so a link can prefetch it.
A review of every concurrent case between two Admins found three refusals
shown as a generic error and a Service switch that ignores a failure.

## Goals

- Tables named for what they hold: `Service` (shared), `MailProvider`,
  `MailUsage`. A later type adds `XxxProvider` and, when it counts, its own
  `XxxUsage`; mail is never touched.
- `Service.name` becomes `Service.type`, enum `ServiceName` becomes
  `ServiceType` (`MAIL`).
- One changeset replaces 0007, 0008, 0009 and 0010.
- `MailUsage` rows older than 90 days are deleted daily.
- The Services page is read through a private cache and prefetched by its
  links, as Users is (ADR 0028).
- Every concurrent case below is covered, each with a test.

## Non-goals

- No shared `ServiceProvider` table. Nothing works on providers of every
  type at once; each type repeats five plain columns instead.
- No generic quota table shared by types. Mail is the only type that counts.
- No SMS, AI or storage tables now. They are examples of the shape only.
- No new schedule, endpoint or token for the cleanup.
- No change to how a send reserves, fails over or settles.

## Anti-goals

- A version that moves with sends: an Admin editing while sign-up mail goes
  out must never get a 409.
- A retention under 31 days: the monthly window would undercount.
- A cache that shows an Admin a stale result of their own action.

## Tables

```
Service ─1:n─ MailProvider ─1:n─ MailUsage
  id            id                  id
  type (unique) serviceId           providerId
  enabled       slot                purpose
  createdAt     name                status
  updatedAt     enabled             reservedAt
                host                settledAt
                username
                fromAddress
                dailyLimit
                monthlyLimit
                lastAcceptedAt
                createdAt
                updatedAt (Version)
```

Columns, types, enums (`UsageStatus`, `UsagePurpose`), the cascade and the
check constraints are today's, renamed. What the four old changesets did
lands in its final form: no `dailyResetTimeZone`, no `lastAuthFailureAt`, no
`port`. The seed rows (MAIL, Brevo in slot 0, Resend in slot 1) stay.

The Version stays `versionOf(updatedAt)`: every setting is in the one
`MailProvider` row, and Prisma's `@updatedAt` moves on every settings write.
`settleUsage` writes `lastAcceptedAt` in raw SQL on purpose, so a send never
moves it. `providerVersion` gets a comment: settings are written through
`prisma.mailProvider.update` only.

The stale schema comment "The provider's confirmed day boundary…" above
`lastAcceptedAt` (left by the time zone removal) is replaced.

## Cleanup

The keep-alive (`POST /v1/services/keep-alive`, daily from the n8n
workflow) deletes `MailUsage` rows whose `reservedAt` is older than 90 days
and reports how many in its answer. The retention is a constant in the
database package (`SERVICE.QUOTA` today), at least the rolling month.

## Cache

As Users (`docs/guides/back-office.md`, ADR 0028):

- `SERVICES.CACHE` with `TAG` (`services`) and `LIFE`
  `{ stale: 300, revalidate: 1800, expire: 3600 }`.
- `readServices()` under `"use cache: private"`, `readSessionCookie` inside,
  replacing the direct `fetchServices` call in the Mail page.
- `updateTag(SERVICES.CACHE.TAG)` replaces every `refresh()` in the
  Services actions: save, delete, the Service switch, the test send. It runs
  on success and also on a 404 or 409, when the copy is known to be wrong.
- The Services links prefetch their data.

Cost, accepted: mail sent elsewhere (sign-up, reset, keep-alive) shows in
the rings up to 5 minutes late. `docs/guides/back-office.md` says today the
Services page is "never kept: usage moves with every send"; that line
changes, and ADR 0028 gains a line for Services.

## Concurrency

A is on a stale copy; B is the other Admin.

| # | B | then A | Must happen |
|---|---|---|---|
| 1 | turned a provider off | saves the form showing it on | 409, nothing written (today) |
| 2 | turned the Service off | saves a provider | saves; the Service stays off (today) |
| 3 | turned the Service off | picks Spento | no change |
| 4 | turned the Service off | picks Attivo, already selected on A's copy | no request sent |
| 5 | saved a provider | sends a test | uses the stored settings (today) |
| 6 | turned a provider off | sends a test | the test goes out (new) |
| 7 | deleted a provider | saves | "provider removed", cache cleared |
| 8 | deleted a provider | deletes | counts as done, cache cleared |
| 9 | deleted a provider | sends a test | "provider removed", cache cleared |
| 10 | mail was sent | saves | no 409 (today) |
| 11 | — | saves twice | the second carries the first's Version (today) |
| 12 | — | two tabs | the older gets 409 (today) |
| 13 | switches the Service at the same moment | switches it | last write wins |
| 14 | removed the login | enables | refused, incomplete (today) |

The Service gets no Version (my call, after the builder check: a Version
would turn cases 3 and 13 into 409s). Case 4 is closed on the client
instead: the switch sends nothing when the option already selected is picked
again, whatever the Gooey choice reports, and a test pins it. So a stale
screen can only ever send the value already stored, and two deliberate
switches race as last write wins.

Case 8 is settled in the Back Office (my call): the delete action reads a
404 as done. The API keeps answering 404 for a provider it does not have.

The Service switch already shows a toast and returns to the stored value
when the API refuses (`ServiceSwitch` reads `setServiceEnabled`'s answer);
it keeps doing so under the cache.

Case 6: the test send reserves against a disabled provider. It still needs
an enabled Service, a secret, an allowed host and quota left, and it counts.
Only a test skips the provider's own `enabled`; every other purpose keeps it.

## Constraints

- Liquibase only (`pnpm db:changeset`, `pnpm db:update`), never
  `prisma db push` or `migrate`. Folding the changesets means resetting the
  local database; nothing on Production has them.
- Tests first; `@module-tag` first line; no `as` casts; constants in their
  owner's nested object; error codes and paths never literals.
- `CONTEXT.md` **Service**: the quota lives in each type's tables, not "the
  `service` schema" generally.
- `docs/guides/database.md`, `api.md`, `back-office.md` and
  `apps/api/README.md` follow the renames, the cleanup and the cache.

## Left to the builder

- The changeset's file name and number after the fold.
- The 404 wording, in en and it, beside the existing Services messages.
- Where the 90-day constant sits and its name.
- Whether the API route param becomes `:type` (it should, with the enum).

## Decided after the builder check

- The API's answer keeps today's shape (a Service with its `providers`);
  only `name` becomes `type`. A later type adds its own block then (owner).
- No Version on the Service; the switch skips a repeat of the stored value
  (my call).
- A 404 on delete is done in the Back Office; the API is unchanged (my call).
- The keep-alive report's field name for the deleted count.
