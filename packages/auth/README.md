<h1 align="center">@allonfire/auth</h1>

<p align="center">
  <img src="https://img.shields.io/badge/BetterAuth-1.2-8B5CF6?logoColor=white" alt="BetterAuth" />
  <img src="https://img.shields.io/badge/Prisma-adapter-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Zod-4-3068B7?logo=zod&logoColor=white" alt="Zod" />
</p>

<p align="center">
  Shared authentication for the AllOnFire monorepo. Factory-configured BetterAuth instance, role-based session guards (admin/user/viewer), reusable login form, and app-level access control.
</p>

---

## 📦 API Reference

| Export Path | What it provides |
|-------------|-----------------|
| `./server` | `createAuth`, `requireAuth`, `requireUser`, `requireAdmin`, `Auth`, `Session` types |
| `./client` | `authClient` — BetterAuth React client |
| `./route` | `createAuthHandler` — Next.js route handler factory |
| `./guard` | `checkAppAccess` — cached app-level access guard (redirects on failure), `checkMutationAccess(auth: Auth): Promise<MutationAccessResult>` — blocks VIEWER role from mutations, `checkAdminAccess(auth: Auth): Promise<MutationAccessResult>` — restricts to ADMIN only, `MutationAccessResult` type |
| `./actions/check-access` | Server action for client-side access checks |
| `./env` | `authEnvSchema` — Zod schema for `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |
| `./components/login-form` | `LoginForm` — email/password login form |
| `./components/theme-provider` | `ThemeProvider` — next-themes wrapper |
| `./components/sonner` | `Sonner` — toast notification provider |
| `./components/providers` | `Providers` — combined provider wrapper |

## 📁 Directory Structure

```
packages/auth/
  src/
    server.ts              createAuth factory + session guards
    client.ts              BetterAuth React client
    route.ts               Next.js route handler export
    guard.ts               App-level access control (checkAppAccess, checkMutationAccess, checkAdminAccess)
    env.ts                 Zod environment schema
    actions/
      check-access.ts      Server action for access checks
    components/
      login-form.tsx       Email/password login form
      theme-provider.tsx   Theme provider wrapper
      sonner.tsx           Toast notifications
      providers.tsx        Combined providers
  package.json
  tsconfig.json
```

## 🔧 Usage

### Creating an auth instance in an app

```ts
import { createAuth } from "@allonfire/auth/server";
import { env } from "@/env";

export const auth = createAuth(env);
```

### Role-based guards in server actions

```ts
import { requireUser, requireAdmin } from "@allonfire/auth/server";
import { auth } from "@/lib/auth";

// Blocks VIEWER role — only USER and ADMIN can mutate
export async function uploadPhoto(data: FormData) {
  "use server";
  const session = await requireUser(auth);
  // ...
}

// Only ADMIN can access
export async function deleteUser(userId: string) {
  "use server";
  await requireAdmin(auth);
  // ...
}
```

### App-level access control in layouts

```ts
import { checkAppAccess } from "@allonfire/auth/guard";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({ children }) {
  await checkAppAccess(auth, "social");
  return <>{children}</>;
}
```

## 📦 Dependencies

| Package | Why |
|---------|-----|
| `better-auth` | Core authentication library |
| `@better-auth/prisma-adapter` | Database adapter for Prisma |
| `@allonfire/database` | Prisma client for user queries |
| `@allonfire/ui` | Shared UI components for login form |
| `next-themes` | Theme management |
| `react-hook-form` | Form state for login form |
| `zod` | Environment variable validation |
