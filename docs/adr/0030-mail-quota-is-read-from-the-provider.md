# Mail quota is read from the provider, not counted

Mail left through SMTP behind a local ledger: a reservation row written
before each handoff, settled after it, counted per rolling day and month
against limits an Admin typed, and pruned daily. Each mail provider already
counts what it sent, so the ledger was a second, partial copy of the same
number: it ignored sends made outside AllOnFire and drifted from the
provider's own day. The MAIL Service now calls each provider's HTTP API; a
provider that answers for want of room (its quota or a rate limit) or
refuses is skipped for the next, and what it sent is read from its own API
for the Services page's two rings. The limits stay in the database only to
size the rings when the provider reports none, and never stop a send.

## Considered Options

- Keep the reservation ledger and change only the transport to HTTP: the
  duplicate count, its tables, statuses, retention and the keep-alive's
  pruning stay, for a number the provider owns.
- Read the remaining credits before every send and skip an empty provider:
  one extra vendor call per email, a race between the check and the send, and
  only one of the two providers reports credits.
- A snapshot table of the last quota read, refreshed after each send and by
  the keep-alive: survives a vendor outage, but another table to keep true
  and a number that can be stale when read.
- A send log table for history and a trend: more rows to prune; the vendors'
  per-day statistics can feed a chart later without one.

## Consequences

- No `MailUsage`, no `UsageStatus`, no `UsagePurpose` in the database; a send
  only stamps `MailProvider.lastAcceptedAt` (outside the provider's Version),
  which the keep-alive reads.
- When a provider cannot report (its key lacks the scope, or it is down) the
  rings draw empty and an error toast says so; sending is unaffected.
- The rings reflect every send the provider counted, including ones made
  outside AllOnFire.
- Where a provider is reached (URL, key, driver) lives in the API's
  environment under its slot, so an Admin can never redirect the API, and no
  host allowlist names a vendor in code. A driver is named for the API's shape.
- The API keeps each provider's report 30 seconds in Redis, so a page and its
  prefetch ask the vendor once. A longer copy freezes a wrong number: a vendor's
  count trails a send by seconds, and a copy taken in that gap (the read right
  after a test send) would show the old count until it expired. Nothing drops
  the copy early; 30 seconds is short enough not to need it.
- Where a vendor's report trails its own counter, the counter wins. A
  Brevo-shaped provider on a `free` plan reports credits left, which move the
  moment a send is accepted, while its aggregated report is built with a delay:
  the day's count is the larger of the report and the card's daily limit less
  the credits left (only when the credits fit the limit; a lower limit is a cap
  the Admin chose). The ring's maximum is the card's limit; no vendor reports
  one now.
