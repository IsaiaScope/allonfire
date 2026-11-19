# Laura

Laura (`apps/laura`, `@allonfire/laura`) is the couple's private photo gallery and Memory game: a Next App built on the same shared scaffold as the Back Office (ADR 0033) and wearing the Ocean Design. It reads the API only (no Prisma client, no service import) and signs in through the API's Auth module. Its description, in both languages' `Metadata`, is "Our private place, just for the two of us."

## Sections and routes

The Sections are `SECTION` in `src/shared/constants/laura.ts`, an explicit list (`SECTIONS`) that the sidebar, the proxy's sign-in gate and `sections.test.ts` all read:

- `/` Gallery (Home), `/favorites`, `/memory` (Play) and `/memory/leaderboard` (Memory's second page, in its sub-menu), `/upload` (Admin only).
- Every page but Upload is placeholder text for now; Phase 4 fills the Gallery and Favorites, Phase 5 Upload, Phase 6 Memory and its leaderboard. Each phase replaces the page body and adds that page's skeleton and height test with its data; `generateMetadata`, `signedInPage(...)` and the `minRole` option stay (plan: `docs/superpowers/plans/2026-11-17-laura-p3-laura-shell.md`, "Page data checklist").

## The frame and Ocean

- The signed-in frame is `(signed-in)/layout.tsx` over ui's `AOFAppFrame` with `variant="floating"` and `collapsible="icon"` (ADR 0033); the account menu holds language, theme and sign out, and the App switcher lists the Back Office for a Back Office Admin. Back Office specifics are in `back-office.md`; the frame, signed-in pages and special pages are in `next-apps.md`.
- Laura's Ocean dressing is bound once, in thin files, to the shared pieces through slots: `features/auth/constants/dressing.tsx` (the sign-in pages), `features/errors/components` and `features/pwa/components` (notices and PWA cards), `shared/components` and `shared/constants/action-dressing.tsx`. The Design itself is `packages/design/src/designs/ocean` and `src/apps/laura` (`design-system.md`).

## Roles and the Upload gate

- Laura admits two Roles, Admin and User, and no Viewer (ADR 0032): its floor in `ACCESS.APP_SETTINGS[App.LAURA]` is User. A User browses and plays; an Admin also adds Images.
- Upload's `minRole` is read in four places that must agree: the proxy sends a User Home (`withSignInGate({ sections })`), the page does the same (`signedInPage(Page, { minRole: Role.ADMIN })`), the sidebar hides the row (`AOFRoleGatedSection`), and the API refuses with 403 (`requireApp(App.LAURA, Role.ADMIN)`, a route from Phase 5). Pinned by `upload-gate.test.ts`, `sections.test.ts` and `e2e/upload-gate.spec.ts`.

## Auth

- No registration (`registration: null`): an Admin adds Users in the Back Office (`back-office.md`).
- One Session across the Apps: on the parent domain in Production (`AUTH_COOKIE_DOMAIN`), on `localhost` Locally. Sign-in actions and the proxy wrappers are `@allonfire/auth` (`packages/auth/README.md`).

## Environment and ports

- Names are in `apps/laura/.env.example` and `src/environment/environment.ts` (`API_*`, `AUTH_*`, `LAURA_URL`, `BACK_OFFICE_URL`, `TELEMETRY_*`); both Apps' addresses are required in both Apps, at build and at runtime (`deployment.md`).
- Ports are `LOCAL.PORT` in `packages/config/local/addresses.ts`: 3200 Local, 3210 e2e, 3220 preview (`pnpm --filter @allonfire/laura preview`).

## Where each shared piece lives

- The scaffold (providers, request config, page information, manifest, proxy matcher suite): core, `packages/core/README.md`.
- The session pieces (`requireAppSession`, `withSignInGate`, `hasSectionRole`): auth, `packages/auth/README.md`.
- The frame, account, switcher, signed-out pages (`AOFGateFrame`), `AOFLanguageSwitch`, notices (`AOFNoticeStage`), PWA cards, share card and the e2e and translation suites: ui, `package-layout.md` ("shared scaffold") and `testing.md`.
- The Vitest presets and `environmentSuite`: `packages/config/README.md`.

## Parity audit

What became of every file and library of the old Laura: `docs/superpowers/specs/2026-11-17-laura-parity-audit.md`, checked by `packages/config/local/tests/laura-parity-audit.test.ts`.

## History and gotchas

- 2026-11-19: the sidebar marked Play and Leaderboard both on `/memory/leaderboard`. Cause: `currentSubPage` took the first page whose path prefixes the address. Fix: ui's `currentSubPage` takes the longest match (`packages/ui/src/features/navigation/utils/sections.ts`).
