<h1 align="center">@allonfire/core</h1>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">The framework-free constants and helpers every app and package shares, plus the wiring a Next App composes.</p>

---

## 🔧 Use it

Import by path under `src/`: `@allonfire/core/shared/utils/json`. Doc comments have the details.

| I want to | Use |
|-----------|-----|
| read or write JSON, or walk an object, with types | `shared/utils/json`, `shared/utils/object` |
| keep a value in the browser | `storageItem` (`shared/utils/storage`) |
| name a status, header, unit or env value | `HTTP`, `UNIT`, `ENV` |
| throw an error the Host turns into a response | `CodedError` (`features/errors/coded-error`) |
| refuse a save made on stale data | `versionOf`, `checkVersion` (`features/version/utils/`) |
| send an email | `sendMail` (`features/mail/utils/send-mail`) |
| start a Next App's config | `AOFCreateNextConfig` (`features/next/config/utils/`) |
| turn on the query devtools while debugging | `<AOFReactQueryDevtools enabled={env.NODE_ENV === ENV.NODE.DEVELOPMENT} />` inside the query provider |
| see what a change would redeploy | `pnpm -s ci:affected <base>` from the repo root |
| change how a Release numbers packages | `features/ci/`: the release hook runs `ci:release-versions`, its flags are in `apply-release-versions.ts` |

A value kept in the browser, typed by its schema:

```ts
/** When the visitor last dismissed the hint, in ms. */
const dismissed = storageItem(
  PWA.INSTALL_HINT.STORAGE_KEY.DISMISSED,
  z.number().positive()
);

const at = dismissed.read(); // the number, or null
dismissed.write(Date.now());
```

## 🗂️ Where things are

```
src/
  environment/    env schemas: NODE_ENV, telemetry, mail providers, a Next App's API address
  shared/         constants and helpers more than one feature reads
  features/
    ci/           what a change redeploys, and each package's Release number
    errors/       CodedError and the shared error codes
    http/         statuses, methods, headers, security headers
    i18n/         locales and languages
    logger/       the pino logger
    mail/         sending through a Service's providers
    metadata/     page metadata constants and titles
    next/         API client, config, i18n, metadata, providers, PWA, query, logs
    search/       a list's search, sort, column and cursor params
    tailwind/     rewrites classes to their canonical spelling
    telemetry/    where traces and logs ship
    typescript/   writes .d.ts files for lenient vendor code
    vendor/       reapplies fixes to files the shadcn CLI writes
    version/      a resource's Version
```

## ⚠️ Watch out

| Trap | What to do |
|------|------------|
| There is no barrel file | A file read outside core needs its own `exports` key in `package.json` |
| The API imports core too | Keep Next and React code in `features/next/`; the API imports nothing from there |
| A file the browser imports must not reach `next/headers` | Browser code uses `aofCreateApi`, server code `aofCreateServerApi` |
| The Release hook runs the main checkout's rules | It stops when that checkout's `features/ci` or `shared` differ from the code being released |
| `turbo.json` inputs decide what deploys | Read the comment on `affectedSince` (`features/ci/turbo-affected.ts`) before changing them |

## 🧪 Run and test

```bash
pnpm --filter @allonfire/core test
pnpm --filter @allonfire/core check-types
pnpm --filter @allonfire/core i18n:check   # the shared Next translations
```

Flags for the other scripts (Tailwind, vendor and PWA tools) are in each source file's comment.

## 📚 More

- [Code conventions](../../docs/guides/conventions.md): helpers and constants
- [Next Apps](../../docs/guides/next-apps.md)
- ADRs: [Next scaffolding](../../docs/adr/0012-next-scaffolding-lives-in-utils.md), [coded errors](../../docs/adr/0015-http-modules-ship-as-packages-and-throw-coded-errors.md), [packages are concepts](../../docs/adr/0016-packages-are-concepts-with-adapter-folders.md)

---

<p align="center">
  ⬅️ <a href="../../README.md">Back to monorepo root</a>
</p>
