# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner of AllOnFire and the few people they add as Users, one of them Laura.
They open the App on a phone first, often in a quiet sofa moment, to look at
their own pictures and to play a game together. Nobody here administers
anything technical; an Admin adds the Users.

## Product Purpose

Laura is a private place for the owner's own Images: a Gallery to browse and
Favorites to keep close, and one game, the Memory game, with a leaderboard.
Success is a User who opens it, finds the Image they were thinking of in a few
taps, and leaves smiling.

## Positioning

A small private App of AllOnFire. It shares the Back Office's one sign-in and
user base, and is a place to be, not a tool to operate.

## Operating Context

- Used on a phone first, then on a desk; installable, and it works offline as
  far as the Offline page.
- Ships in English and Italian.
- Nobody registers: an Admin adds Users, and the Roles are Admin and User.
- Signing in goes through the API's Auth module, as in the Back Office.

## Capabilities and Constraints

- Browse the Gallery and the Favorites; play the Memory game and rank on the
  leaderboard.
- Admins also mark Favorites and upload Images (the Upload Section).
- Terminology is fixed by the domain glossary: Gallery, Favorite, Memory game,
  Image, Admin, User. Never "album", "like", "heart", "quiz" or "Viewer".
- Interface is built in the App from AOF components and the Design's
  components (ADR 0014); Apps never import shadcn components directly.

## Brand Commitments

- The product carries the AllOnFire Brand, with Laura as its banner.
- Laura wears the Ocean Design. This is fixed.

## Evidence on Hand

- No production data, testimonials or metrics exist. Users and Images in any
  mock or screenshot come from the seed; never invent real people, counts or
  activity.

## Product Principles

1. The Image is the interface: the chrome steps back and never competes with
   a picture.
2. Warmth over density: room to breathe, soft corners, plain friendly words.
3. One thing per page.
4. Every flow works one-handed, on a phone, first.

## Accessibility & Inclusion

WCAG 2.2 AA is a hard requirement, in both English and Italian. Motion only
behind `motion-safe:`.
