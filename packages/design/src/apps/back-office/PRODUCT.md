# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner of AllOnFire and technical colleagues: developers and operators who
are comfortable with IDs, statuses, Roles and dense tables. Only Users with the
admin Role enter. They come in to change who can do what across the AllOnFire
Apps, then leave.

## Product Purpose

The Back office is the internal App of AllOnFire, a family of small products
that share one user base and one database. It is where that shared user base
and each App's content and data are managed. Success is an access change made
correctly on the first try: the right User, the right Role, the right Apps,
with nothing else touched.

## Positioning

One place governs every App's users. A User's Role (Viewer, User, Admin, ranked)
and Allowed apps (one or more Apps, or all of them) decide what they can do
everywhere at once, so the Back office edits access for the whole family of
Apps, not for a single product.

## Operating Context

- Used on desktop and phone alike; designed mobile-first.
- Ships in English and Italian (English by default, Italian at `/it`).
- Signing in goes through the API's Auth module; Sessions live in Postgres and
  reach the guards up to five minutes late through the cookie cache, so an
  access change is not instant everywhere.
- Users come from the seed; sign-up is disabled.

## Capabilities and Constraints

- First job: Users and access. List Users, set a User's Role and Allowed apps,
  revoke Sessions.
- Later, not yet decided: each App's content (Laura's photos and quiz), data
  and health views.
- Terminology is fixed by the domain glossary: App, User, Role, Viewer, Allowed
  apps, Session, Sign in / Sign out. Never "login", "permissions",
  "admin panel" or "dashboard" for this App.
- Interface is built in the App from AOF components and the Design's
  components (ADR 0014);
  Apps never import shadcn components directly.

## Brand Commitments

- The product carries the AllOnFire name.
- The Back office wears the Japan Design. This is fixed.

## Evidence on Hand

- No production data, testimonials or metrics exist. Users in any mock or
  screenshot come from the seed; never invent real people, counts or activity.
- Current copy lives in `apps/back-office/src/features/i18n/translations/`
  (`en.json`, `it.json`).

## Product Principles

1. Access is the product: every screen answers who can do what, in which App.
2. Say exactly what a change does before it happens, since it reaches every
   App at once.
3. Dense beats decorative for technical users, but never at the cost of a
   plain, correct label.
4. Every flow works one-handed on a phone first, then expands for the desk.

## Accessibility & Inclusion

WCAG 2.2 AA is a hard requirement, in both English and Italian.
