# Image Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Split `@allonfire/storage` into a generic object store and a new `@allonfire/image` that owns everything Image-specific, so swapping MinIO or storing other files never touches Image code.

**Status:** implemented (uncommitted, revised) @ 2026-10-07T12:50:41Z

> **Revised mid-run by the user:** "I do not want the package images, it should stay inside the storage." Task 1 shipped as written. Tasks 2 and 3 ran, then the `image` package was folded back into `storage` under `src/features/image/{constants,prepare,objects,hono,next}`; hosts import `@allonfire/storage/features/image/...`.

**Architecture:** Plan 2 of 7 (package architecture). `storage` gains provider-neutral `putObject` / `deleteObjects` and keeps only the S3 client, env and `STORAGE_PATH`. The Image files move into `packages/image` under the ADR 0016 layout (`shared/`, `features/{prepare,objects,hono,next}`), driven by a move map whose script also fixes relative imports. Hosts (`apps/api`, `apps/back-office`, `packages/ui`) only change import specifiers; `ImageDeps` keeps its shape.

**Tech Stack:** pnpm workspaces + turbo, TypeScript 6, Vitest, Hono 4, Next 16, sharp, `@aws-sdk/client-s3`, Python 3 (one-off scripts in the plan).

**Spec:** `docs/superpowers/specs/2026-10-07-image-package-design.md` (parent: `2026-10-02-package-architecture-design.md`)

## Global Constraints

- Never commit (iso-write).
- Only `packages/storage/src/features/s3/` imports `@aws-sdk/client-s3`.
- `storage` depends on no workspace package and on no sharp, Hono or Next.
- The Image module lives in `packages/image/src/features/hono/`; the Next wiring in `features/next/`.
- `IMAGE_BASE_PATH` (`/storage/images`) becomes `IMAGE_PROXY_PATH`; the API's own `IMAGE_BASE_PATH` (`/v1/images`) keeps its name.
- Export keys mirror paths; a folder's `index.ts` exports as the folder (`./features/hono/routes`).
- No `as` casts, no `biome-ignore`; end each task with `pnpm biome check --write <touched paths>`.
- exFAT: `find <dir> -name '._*' -delete` after every move.
- Laura is out of scope and not a workspace member.

## Review Focus

1. A moved file whose relative import still points at its old place: `tsc` of `image` must pass (Task 2 Step 5).
2. `putObject` dropping `CacheControl` or `ContentType`: Next's optimizer and the browser cache rely on them (Task 1 test asserts the exact command input; Task 2 asserts the Image values).
3. An empty delete list sending a request MinIO rejects: `deleteObjects(bucket, [])` sends nothing (Task 1 test).
4. The Back office build losing the `/storage/images/:key` rewrite after the move: its config is loaded and printed (Task 3 Step 5).
5. A Next App that cannot transpile `@allonfire/image` (or `@allonfire/storage`, which image's paths file imports): both stay in back office's `transpile` list and dependencies (Task 3 Step 3).

---

### Task 1: `storage` gets provider-neutral object calls

**Files:**
- Create: `packages/storage/src/features/s3/objects.ts`
- Create: `packages/storage/src/features/s3/tests/objects.test.ts`
- Modify: `packages/storage/package.json` (export key)

**Interfaces:**
- Produces: `putObject(bucket: string, key: string, body: Buffer, options: PutObjectOptions): Promise<void>`; `type PutObjectOptions = { contentType: string; cacheControl?: string }`; `deleteObjects(bucket: string, keys: readonly string[]): Promise<void>` from `@allonfire/storage/features/s3/objects`.

- [x] **Step 1: Write the failing test**

`packages/storage/src/features/s3/tests/objects.test.ts`:

```ts
// @module-tag unit
import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { deleteObjects, putObject } from "../objects";

const send = vi.hoisted(() =>
  vi.fn<(command: unknown) => Promise<unknown>>(() => Promise.resolve({}))
);
// The real client validates STORAGE_* at import; these tests need no provider.
vi.mock("../client", () => ({ s3: { send } }));

const sent = (index = 0): unknown => send.mock.calls[index]?.[0];

beforeEach(() => {
  send.mockClear();
});

describe("putObject", () => {
  it("puts the body in the named bucket with its headers", async () => {
    const body = Buffer.from("x");
    await putObject("files", "a.pdf", body, {
      cacheControl: "no-cache",
      contentType: "application/pdf",
    });
    const command = sent();
    if (!(command instanceof PutObjectCommand)) {
      throw new Error("expected a PutObjectCommand");
    }
    expect(command.input).toEqual({
      Body: body,
      Bucket: "files",
      CacheControl: "no-cache",
      ContentType: "application/pdf",
      Key: "a.pdf",
    });
  });
});

describe("deleteObjects", () => {
  it("deletes every key in one request", async () => {
    await deleteObjects("files", ["a", "b"]);
    const command = sent();
    if (!(command instanceof DeleteObjectsCommand)) {
      throw new Error("expected a DeleteObjectsCommand");
    }
    expect(command.input).toEqual({
      Bucket: "files",
      Delete: { Objects: [{ Key: "a" }, { Key: "b" }] },
    });
  });

  it("sends nothing for no keys", async () => {
    await deleteObjects("files", []);
    expect(send).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/storage exec vitest run src/features/s3`
Expected: FAIL — cannot find `../objects`.

- [x] **Step 3: Implement**

`packages/storage/src/features/s3/objects.ts`:

```ts
import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "./client";

/** What a stored object is served with. */
export type PutObjectOptions = {
  contentType: string;
  cacheControl?: string;
};

/** Stores `body` at `key` in `bucket`, replacing any object already there. */
export async function putObject(
  bucket: string,
  key: string,
  body: Buffer,
  { contentType, cacheControl }: PutObjectOptions
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Body: body,
      Bucket: bucket,
      CacheControl: cacheControl,
      ContentType: contentType,
      Key: key,
    })
  );
}

/** One request for up to 1000 keys; no keys, no request. */
export async function deleteObjects(
  bucket: string,
  keys: readonly string[]
): Promise<void> {
  if (keys.length === 0) {
    return;
  }
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    })
  );
}
```

In `packages/storage/package.json` `exports`, after `./features/s3/client`:
`"./features/s3/objects": "./src/features/s3/objects.ts",`

- [x] **Step 4: Run it to verify it passes**

Run: `pnpm --filter @allonfire/storage exec vitest run src/features/s3`
Expected: PASS, 3 tests.

- [x] **Step 5: Format**

Run: `pnpm biome check --write packages/storage/src/features/s3 packages/storage/package.json`
Expected: exit 0.

---

### Task 2: `@allonfire/image` holds every Image file

**Files:**
- Create: `packages/image/` (`package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, `src/shared/constants/paths.ts`)
- Move: per the map in Step 2, from `packages/storage/src/` to `packages/image/src/`
- Rewrite: `packages/image/src/features/objects/image-objects.ts`
- Create: `packages/image/src/features/objects/tests/image-objects.test.ts`
- Modify: `packages/storage/src/shared/constants/paths.ts` (only `STORAGE_PATH`), `packages/storage/package.json`, `packages/storage/vitest.config.ts`, delete `packages/storage/vitest.setup.ts`

**Interfaces:**
- Consumes: `putObject`, `deleteObjects` (Task 1); `STORAGE_PATH` from `@allonfire/storage/shared/constants/paths`.
- Produces, from `@allonfire/image/…`:

| Old (`@allonfire/storage/…`) | New (`@allonfire/image/…`) |
|---|---|
| `features/image/constants/bucket` | `shared/constants/bucket` |
| `shared/constants/paths` (`IMAGE_PATH`, `IMAGE_BASE_PATH`) | `shared/constants/paths` (`IMAGE_PATH`, `IMAGE_PROXY_PATH`) |
| `features/image/constants/limits` | `features/prepare/constants/limits` |
| `features/image/prepare-image` | `features/prepare/prepare-image` |
| `features/image/image-objects` | `features/objects/image-objects` |
| `next/with-storage-images` | `features/next/with-storage-images` |
| `routes/image` | `features/hono/routes` |
| `routes/image/constants/errors` | `features/hono/constants/errors` |
| `routes/image/utils/deps` | `features/hono/utils/deps` |
| `routes/image/utils/upload` | `features/hono/utils/upload` |
| `shared/tests/stub-image-deps` | `features/hono/tests/stub-image-deps` |

- [x] **Step 1: Baseline**

Run: `pnpm --filter @allonfire/storage exec vitest run 2>&1 | grep -E "Test Files|Tests "`
Expected: note the counts (Task 1's 3 tests included).

- [x] **Step 2: Move the files and fix relative imports**

```bash
mkdir -p packages/image
python3 - <<'EOF'
import os, re, shutil
OLD, NEW = "packages/storage/src", "packages/image/src"
MOVES = {
  "features/image/constants/bucket.ts": "shared/constants/bucket.ts",
  "features/image/constants/limits.ts": "features/prepare/constants/limits.ts",
  "features/image/prepare-image.ts": "features/prepare/prepare-image.ts",
  "features/image/tests/prepare-image.test.ts": "features/prepare/tests/prepare-image.test.ts",
  "features/image/image-objects.ts": "features/objects/image-objects.ts",
  "next/with-storage-images.ts": "features/next/with-storage-images.ts",
  "next/tests/with-storage-images.test.ts": "features/next/tests/with-storage-images.test.ts",
  "routes/image/index.ts": "features/hono/routes/index.ts",
  "routes/image/routes.ts": "features/hono/routes/routes.ts",
  "routes/image/handlers.ts": "features/hono/routes/handlers.ts",
  "shared/tests/stub-image-deps.ts": "features/hono/tests/stub-image-deps.ts",
  # copied, not moved: storage keeps its own (reduced) paths file
  "shared/constants/paths.ts": "shared/constants/paths.ts",
}
for d, _, fs in os.walk(os.path.join(OLD, "routes/image")):
    for f in fs:
        rel = os.path.relpath(os.path.join(d, f), OLD)
        if rel not in MOVES and not f.startswith("._"):
            MOVES[rel] = "features/hono/" + os.path.relpath(rel, "routes/image")
COPY = {"shared/constants/paths.ts"}
SPEC = re.compile(r'''((?:from|import)\s*\(?\s*["'])(\.{1,2}/[^"']+)(["'])''')
def resolve(base_old, spec):
    raw = os.path.normpath(os.path.join(os.path.dirname(base_old), spec))
    for cand in (raw, raw + ".ts", raw + ".tsx", raw + "/index.ts"):
        if cand in MOVES: return cand, cand[len(raw):]
    raise SystemExit(f"unresolved {spec} in {base_old}")
for old, new in MOVES.items():
    text = open(os.path.join(OLD, old)).read()
    def fix(m):
        target, suffix = resolve(old, m.group(2))
        dest = MOVES[target]
        dest = dest[: len(dest) - len(suffix)] if suffix else dest
        rel = os.path.relpath(dest, os.path.dirname(new))
        return m.group(1) + (rel if rel.startswith(".") else "./" + rel) + m.group(3)
    text = SPEC.sub(fix, text).replace("IMAGE_BASE_PATH", "IMAGE_PROXY_PATH")
    dst = os.path.join(NEW, new); os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, "w").write(text)
    if old not in COPY: os.remove(os.path.join(OLD, old))
for d, _, _ in sorted(os.walk(OLD), reverse=True):
    if not [x for x in os.listdir(d) if not x.startswith("._")]: shutil.rmtree(d)
EOF
find packages/image packages/storage -name '._*' -not -path '*/node_modules/*' -delete
find packages/storage/src -type f | sort
```

Expected: no `unresolved` exit; `packages/storage/src` lists only `environment/environment.ts`, `features/s3/{client,objects}.ts`, `features/s3/tests/objects.test.ts`, `shared/constants/paths.ts`.

- [x] **Step 3: The package files**

`packages/image/package.json`:

```json
{
  "name": "@allonfire/image",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {},
  "scripts": {
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@allonfire/auth": "workspace:*",
    "@allonfire/core": "workspace:*",
    "@allonfire/database": "workspace:*",
    "@allonfire/storage": "workspace:*",
    "@hono/standard-validator": "^0.2.0",
    "hono-openapi": "^1.1.0",
    "sharp": "^0.34.5",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@allonfire/config": "workspace:*",
    "hono": "^4.9.0",
    "next": "^16.3.6",
    "typescript": "~6.0.3",
    "vitest": "^4.1.11"
  },
  "peerDependencies": {
    "hono": "^4.9.0",
    "next": "^16.0.0"
  },
  "peerDependenciesMeta": {
    "next": { "optional": true }
  }
}
```

Then fill `exports` from the files, one line per non-test source file, a folder's `index.ts` exporting as the folder, plus the host test helper:

```bash
node -e '
const fs=require("fs"),path=require("path");const p="packages/image/package.json";const j=JSON.parse(fs.readFileSync(p));
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.name.startsWith("._")?[]:e.isDirectory()?(e.name==="tests"?[]:walk(path.join(d,e.name))):[path.join(d,e.name)]);
const files=[...walk("packages/image/src").filter(f=>/\.tsx?$/.test(f)&&!/\.test(-d)?\.tsx?$/.test(f)),"packages/image/src/features/hono/tests/stub-image-deps.ts"];
const key=f=>"./"+path.relative("packages/image/src",f).replace(/\.tsx?$/,"").replace(/\/index$/,"");
j.exports=Object.fromEntries(files.map(f=>[key(f),"./"+path.relative("packages/image",f)]).sort(([a],[b])=>a.localeCompare(b)));
fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n");console.log(Object.keys(j.exports).join("\n"))'
```

Expected: the keys include every row of the Interfaces table (`./features/hono/routes`, not `./features/hono/routes/index`).

`packages/image/tsconfig.json`, `vitest.config.ts` and `vitest.setup.ts`: copy `packages/storage/`'s three files as they are (the `DATABASE_URL` setup and the 20 s timeout belong to the Image tests now).

`packages/storage`:
- `vitest.config.ts` becomes the plain preset:

```ts
import { vitestConfig } from "@allonfire/config/tests/vitest";

export default vitestConfig;
```

- delete `vitest.setup.ts`; in `tsconfig.json` drop `"vitest.setup.ts"` from `include`.
- `package.json`: `dependencies` only `@aws-sdk/client-s3`, `@t3-oss/env-core`, `zod`; `devDependencies` only `@allonfire/config`, `typescript`, `vitest`; remove `peerDependencies` and `peerDependenciesMeta`; `exports` exactly:

```json
{
  "./environment/environment": "./src/environment/environment.ts",
  "./features/s3/client": "./src/features/s3/client.ts",
  "./features/s3/objects": "./src/features/s3/objects.ts",
  "./shared/constants/paths": "./src/shared/constants/paths.ts"
}
```

Run: `pnpm install`
Expected: exit 0 (hosts still name `@allonfire/storage/...` paths that no longer exist; they are Task 3's).

- [x] **Step 4: Write the paths files and the new `image-objects`, test first**

`packages/storage/src/shared/constants/paths.ts` (replace the whole file):

```ts
/** Where an App serves every storage, under its own origin; one folder per storage. */
export const STORAGE_PATH = "/storage";
```

`packages/image/src/shared/constants/paths.ts` (replace the whole file):

```ts
import { STORAGE_PATH } from "@allonfire/storage/shared/constants/paths";

/** Images, under `STORAGE_PATH` in an App and under a host's version prefix in an API. */
export const IMAGE_PATH = "/images";

/** `/storage/images`: what `AOFStorageImage` requests and each App proxies to the bucket. */
export const IMAGE_PROXY_PATH = `${STORAGE_PATH}${IMAGE_PATH}` as const;
```

`packages/image/src/features/objects/tests/image-objects.test.ts`:

```ts
// @module-tag unit
import { deleteImageObjects, putImageObject } from "../image-objects";

const objects = vi.hoisted(() => ({
  deleteObjects: vi.fn(() => Promise.resolve()),
  putObject: vi.fn(() => Promise.resolve()),
}));
vi.mock("@allonfire/storage/features/s3/objects", () => objects);

describe("image objects", () => {
  it("stores an Image as immutable WebP in the image bucket", async () => {
    const body = Buffer.from("webp");
    await putImageObject("k.webp", body);
    expect(objects.putObject).toHaveBeenCalledWith("image", "k.webp", body, {
      cacheControl: "public, max-age=31536000, immutable",
      contentType: "image/webp",
    });
  });

  it("deletes Images from the image bucket", async () => {
    await deleteImageObjects(["a.webp"]);
    expect(objects.deleteObjects).toHaveBeenCalledWith("image", ["a.webp"]);
  });
});
```

Run: `pnpm --filter @allonfire/image exec vitest run src/features/objects`
Expected: FAIL — the moved `image-objects.ts` still imports `../s3/client` (gone from this package) instead of `putObject`/`deleteObjects`.

`packages/image/src/features/objects/image-objects.ts` (replace the whole file):

```ts
import {
  deleteObjects,
  putObject,
} from "@allonfire/storage/features/s3/objects";
import {
  IMAGE_BUCKET,
  IMAGE_CACHE_TTL_SECONDS,
} from "../../shared/constants/bucket";

/** Every Image is stored as WebP (see `prepareImage`). */
const IMAGE_CONTENT_TYPE = "image/webp";

/** A key never changes content (a new upload gets a new key), so it is immutable. */
const IMAGE_CACHE_CONTROL = `public, max-age=${IMAGE_CACHE_TTL_SECONDS}, immutable`;

export const putImageObject = (key: string, body: Buffer): Promise<void> =>
  putObject(IMAGE_BUCKET, key, body, {
    cacheControl: IMAGE_CACHE_CONTROL,
    contentType: IMAGE_CONTENT_TYPE,
  });

/** The API sends at most 100 keys; one request takes 1000. */
export const deleteImageObjects = (keys: readonly string[]): Promise<void> =>
  deleteObjects(IMAGE_BUCKET, keys);
```

- [x] **Step 5: Run both packages**

Run: `cd packages/image && pnpm exec tsc --noEmit && pnpm exec vitest run 2>&1 | grep -E "Test Files|Tests |×"; cd ../storage && pnpm exec tsc --noEmit && pnpm exec vitest run 2>&1 | grep -E "Test Files|Tests "`
Expected: image tsc exit 0, every moved test plus the 2 new ones pass; storage tsc exit 0, 3 tests pass. The two counts add up to Step 1's plus 2.

- [x] **Step 6: Format**

Run: `pnpm biome check --write packages/image packages/storage`
Expected: exit 0.

---

### Task 3: Hosts import `@allonfire/image`, docs follow

**Files:**
- Modify: every file in `apps/api`, `apps/back-office`, `packages/ui` that names a moved `@allonfire/storage/...` path; `apps/api/package.json`, `apps/back-office/package.json`, `packages/ui/package.json`; `apps/back-office/next.config.ts` (`transpile`); `packages/ui/src/components/aof-image.tsx` (`IMAGE_PROXY_PATH`)
- Modify (docs): `CLAUDE.md`, `apps/api/README.md`, `packages/storage/README.md`, `README.md`, `docs/adr/0015-http-modules-ship-as-packages-and-throw-coded-errors.md`
- Create: `packages/image/README.md`

**Interfaces:**
- Consumes: the Task 2 table.

- [x] **Step 1: Watch the hosts fail**

Run: `pnpm turbo run check-types --continue 2>&1 | grep -c "Cannot find module '@allonfire/storage"`
Expected: a count above 0.

- [x] **Step 2: Rewrite the specifiers**

```bash
python3 - <<'EOF'
import os, re
MAP = {
  "features/image/constants/bucket": "shared/constants/bucket",
  "shared/constants/paths": "shared/constants/paths",
  "features/image/constants/limits": "features/prepare/constants/limits",
  "features/image/prepare-image": "features/prepare/prepare-image",
  "features/image/image-objects": "features/objects/image-objects",
  "next/with-storage-images": "features/next/with-storage-images",
  "routes/image": "features/hono/routes",
  "routes/image/constants/errors": "features/hono/constants/errors",
  "routes/image/utils/deps": "features/hono/utils/deps",
  "routes/image/utils/upload": "features/hono/utils/upload",
  "shared/tests/stub-image-deps": "features/hono/tests/stub-image-deps",
}
KEEP = {"environment/environment"}
SPEC = re.compile(r'@allonfire/storage/([A-Za-z0-9/._-]+)')
def new(m):
    rest = m.group(1)
    if rest in KEEP: return m.group(0)
    if rest not in MAP: raise SystemExit(f"unmapped @allonfire/storage/{rest}")
    return "@allonfire/image/" + MAP[rest]
for root in ("apps/api", "apps/back-office", "packages/ui"):
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x not in {"node_modules", ".next", ".turbo", "coverage"}]
        for f in files:
            if f.startswith("._") or not f.endswith((".ts", ".tsx")): continue
            p = os.path.join(d, f); s = open(p).read()
            if "@allonfire/storage/" not in s: continue
            open(p, "w").write(SPEC.sub(new, s)); print(p)
EOF
sed -i '' 's#IMAGE_BASE_PATH#IMAGE_PROXY_PATH#g' packages/ui/src/components/aof-image.tsx
grep -n "IMAGE_" packages/ui/src/components/aof-image.tsx apps/api/src/shared/constants/routes.ts
```

Expected: no `unmapped` exit. `aof-image.tsx` imports and uses `IMAGE_PROXY_PATH`; `apps/api/src/shared/constants/routes.ts` still exports its own `IMAGE_BASE_PATH` built from `IMAGE_PATH`, now imported from `@allonfire/image/shared/constants/paths`.

- [x] **Step 3: Dependencies and transpile**

- `apps/api/package.json`: add `"@allonfire/image": "workspace:*"`; keep `@allonfire/storage` (the API merges `storageEnvSchema`).
- `packages/ui/package.json`: replace `@allonfire/storage` with `@allonfire/image`.
- `apps/back-office/package.json`: add `"@allonfire/image": "workspace:*"`; keep `@allonfire/storage` (image's paths file imports it, and Next resolves every `transpile` entry from the App).
- `apps/back-office/next.config.ts`: in `transpile`, add `"@allonfire/image"` beside `"@allonfire/storage"` (alphabetical).
- Re-sort every touched dependency block, then install:

```bash
for p in apps/api/package.json apps/back-office/package.json packages/ui/package.json; do node -e '
const fs=require("fs");const p=process.argv[1];const j=JSON.parse(fs.readFileSync(p));
for(const k of ["dependencies","devDependencies","peerDependencies"]) if(j[k]) j[k]=Object.fromEntries(Object.entries(j[k]).sort(([a],[b])=>a.localeCompare(b)));
fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n")' "$p"; done
pnpm install
```

Expected: exit 0.

- [x] **Step 4: Workspace green**

Run: `pnpm turbo run check-types --continue; pnpm turbo run test --continue`
Expected: every check-types task passes; every unit suite passes. Integration tests need Docker (`pnpm docker:up`); if it is down, say so in the ledger.

- [x] **Step 5: The Back office still proxies Images**

Run:
```bash
RW="$(mktemp -d)/rw.mts"
cat > "$RW" <<'EOF'
const { default: config } = await import(process.cwd() + "/next.config.ts");
const r = await config.rewrites();
const all = Array.isArray(r) ? r : [...r.beforeFiles, ...r.afterFiles, ...r.fallback];
console.log(all.map((x) => `${x.source} -> ${x.destination}`), config.transpilePackages);
EOF
cd apps/back-office && STORAGE_ENDPOINT=http://minio:9000 npx jiti "$RW"
```
Expected: `[ '/storage/images/:key -> http://minio:9000/image/:key' ]` and a transpile list containing `@allonfire/image` and `@allonfire/storage`.

- [x] **Step 6: Nothing names a moved path**

Run: `git grep -n --untracked "@allonfire/storage/\(features/image\|routes\|next\|shared/tests\)\|IMAGE_BASE_PATH" -- apps/api apps/back-office packages ':!packages/auth-old' ':!packages/ui-old' ':!*.md'`
Expected: only `apps/api` lines for the API's own `IMAGE_BASE_PATH` (`/v1/images`).

- [x] **Step 7: Docs**

- `packages/image/README.md` (new, the style of the other package READMEs): what it holds (preparation, Image objects, the Image module, the Next proxy), its exports table (the Task 2 table's right column), and the "🖼️ Image module" section moved verbatim from `packages/storage/README.md`, with paths updated to `@allonfire/image/features/hono/...`.
- `packages/storage/README.md`: intro becomes "Object storage for any kind of file (Images today); only `features/s3` knows the provider (MinIO today)."; exports table lists the four storage keys; directory tree updated; the Image module section and the `prepareImage` usage move out; dependencies table: `@aws-sdk/client-s3`, `@t3-oss/env-core`, `zod`.
- `README.md` (root): add the row `| 🖼️ | **[@allonfire/image](packages/image/)** | Image preparation, the Image module and the Next proxy |` after storage's.
- `apps/api/README.md`: "The Image module from `@allonfire/storage`" becomes "from `@allonfire/image`".
- `CLAUDE.md`: in the API tree comment, "the Image module mounts from @allonfire/storage (ADR 0015)" becomes "from @allonfire/image (ADR 0015)".
- `docs/adr/0015-…md`: "`imageRoutes(deps)` from `@allonfire/storage/routes/image`" becomes "from `@allonfire/image/features/hono/routes`"; the Consequences line about `@allonfire/storage` depending on auth and database becomes "`@allonfire/image` depends on `@allonfire/auth`, `@allonfire/database` and `@allonfire/storage`".

Run: `pnpm biome check --write apps/api/src apps/back-office packages/ui packages/image packages/storage`
Expected: exit 0.

## Implementation Log
- Implemented: 2026-10-07T12:50:41Z
- Workspace: current-branch — feat/design-package
- Committed: no — awaiting user review
- Rulings:
  - Task 2: the move script let `image-objects.ts` through with its old `../s3/client` import (it stays in storage); Step 4 rewrote the file anyway.
  - Revision (user): no `@allonfire/image`. Its files moved to `packages/storage/src/features/image/` (`shared/constants/{paths,bucket}` became `features/image/constants/`), self-imports became relative, the package and its dependencies were deleted, hosts were rewritten to `@allonfire/storage/features/image/...`, and `ui` depends on `storage` again.
  - Kept from the plan: generic `putObject`/`deleteObjects` in `features/s3/objects`, `IMAGE_PROXY_PATH`, Image module under `hono/`, Next proxy under `next/`.
  - Docs: ADR 0016's package list and both specs revised; `packages/storage/README.md` rewritten for the new layout; ADR 0015's module path updated. No `packages/image/README.md` and no root README row.
- Verified: check-types 10/10, tests 10/10 (Docker up, integration included), Back office rewrite `/storage/images/:key -> http://minio:9000/image/:key`.
