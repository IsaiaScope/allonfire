# Each Service type has its own provider table, and a usage table only when it counts

The `service` schema started with one `ServiceProvider` and one
`ServiceUsage` table, named for every Service but shaped for mail: an SMTP
host, login and sender, and a quota counted one unit per send. A second
type would not fit them. Each Service type now gets its own provider table
(`MailProvider`) under the one shared `Service` row (its `type` and its
on/off), and its own usage table only when it must count something itself.
MAIL does not: each provider reports what it sent (ADR 0030). A later type
adds its own provider table, and a usage table if its providers cannot
report, and never touches mail's.

## Considered Options

- One provider table with a column for every type's settings: mostly empty
  rows, and checks such as "an enabled mail provider has a sender" grow
  conditions per type.
- One provider table with a JSON `settings` column checked by zod: the
  database enforces nothing inside it, and every read parses JSON.
- A shared `ServiceProvider` (slot, name, on/off, Version) with one
  settings table per type beside it: nothing works on the providers of
  every type at once, so it bought a join and a two-table save on every
  write for five columns each type can simply repeat.
- One usage table for every type: usage differs by type (an AI key would
  count tokens, storage nothing).

## Consequences

- Every provider table repeats `serviceId`, `slot`, `name`, `enabled` and
  `updatedAt`, and a provider's Version stays `versionOf(updatedAt)`: all
  its settings sit in its one row.
- A usage table, when a type needs one, holds history, not settings: a count
  never moves the provider's Version.
