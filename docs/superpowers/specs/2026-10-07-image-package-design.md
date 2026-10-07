# Image package — design (plan 2 of the package architecture)

> **Revised during implementation (2026-10-07, user):** no `@allonfire/image`
> package. The Image logic stays in `storage`, under
> `storage/src/features/image/{constants,prepare,objects,hono,next}`, on top of
> the generic `features/s3/objects`. Decision 2 and the `image` tree below are
> superseded; decisions 1, 3 (inside storage) and 4 stand.

Parent spec: `2026-10-02-package-architecture-design.md`, roadmap row 2.

## Decisions (approved in chat, 2026-10-07)

1. `storage` stays a generic package: object storage for anything, not only
   Images, so swapping MinIO for another provider touches only `storage`.
   Only `storage/src/features/s3/` knows the AWS SDK.
2. Everything Image-specific moves to a new `@allonfire/image`.
3. The Image module (Hono routes) lives in `image/src/features/hono/`, the Hono
   adapter, as `features/next/` is the Next one (ADR 0016). Default taken on
   the user's silence; the recommended option.
4. `IMAGE_BASE_PATH` (`/storage/images`) becomes `IMAGE_PROXY_PATH`.

## `storage` after

```
packages/storage/src/
  environment/environment.ts   STORAGE_* (unchanged)
  shared/constants/paths.ts    STORAGE_PATH = "/storage"
  features/s3/
    client.ts                  the S3 client (unchanged)
    objects.ts                 putObject(bucket, key, body, { contentType, cacheControl })
                               deleteObjects(bucket, keys)
    tests/objects.test.ts
```

Dependencies: `@aws-sdk/client-s3`, `@t3-oss/env-core`, `zod`. No sharp, Hono,
auth, database, core or Next.

## `image`

```
packages/image/src/
  shared/constants/
    paths.ts      IMAGE_PATH = "/images", IMAGE_PROXY_PATH = STORAGE_PATH + IMAGE_PATH
    bucket.ts     IMAGE_BUCKET, IMAGE_CACHE_TTL_SECONDS
  features/
    prepare/      prepare-image.ts, constants/limits.ts, tests/
    objects/      image-objects.ts: putImageObject, deleteImageObjects (storage's generic ones)
    hono/         the Image module
      routes/     index.ts (imageRoutes), routes.ts (describeRoute specs), handlers.ts
      constants/  errors, limits, openapi, schemas
      utils/      access, cursor, deps, json, upload, validation
      tests/      read, write, upload, test-host, stub-image-deps (exported for hosts)
    next/         with-storage-images.ts (+ tests/)
```

- `ImageDeps` keeps its shape; hosts change import paths only.
- `ui` depends on `image` and imports only `shared/constants/paths`, whose one
  import is `storage`'s paths file.
- The API's `IMAGE_BASE_PATH` (`/v1/images`) keeps its name.
- Hono stays a peer; Next stays an optional peer.

## Out of scope

The Image wire types (plan 6), languages (plan 7), the API's own layout (plan 3).
