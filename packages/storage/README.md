<h1 align="center">@allonfire/storage</h1>

<p align="center">
  <img src="https://img.shields.io/badge/AWS_S3-SDK-FF9900?logo=amazons3&logoColor=white" alt="AWS S3" />
  <img src="https://img.shields.io/badge/Sharp-image_processing-99CC00?logo=sharp&logoColor=white" alt="Sharp" />
  <img src="https://img.shields.io/badge/MinIO-object_storage-C72E49?logo=minio&logoColor=white" alt="MinIO" />
</p>

<p align="center">
  Object storage for any kind of file; only <code>features/s3</code> knows the provider (MinIO today). Images are its first kind: <code>features/image</code> prepares them, stores them in the public <code>image</code> bucket (ADR 0013), ships the Image module any Host mounts (ADR 0015) and the Next wiring that shows them through <code>/storage/images/*</code>.
</p>

---

## 📦 API Reference

| Export Path | What it provides |
|-------------|-----------------|
| `./environment/environment` | `env` and `storageEnvSchema`, the three `STORAGE_*` variables |
| `./shared/constants/paths` | `STORAGE.PATH`: `BASE` (`/storage`, where an App serves every storage), `IMAGES` (`/images`), `IMAGE_PROXY` (`/storage/images`, what an App proxies to the bucket) |
| `./features/s3/client` | `s3`, the provider client (MinIO, path-style) |
| `./features/s3/objects` | `putObject(bucket, key, body, { contentType, cacheControl })`, `deleteObjects(bucket, keys)`: any file, any bucket |
| `./features/s3/exists` | `bucketExists(bucket)`, `objectExists(bucket, key)`: the provider's 404 reads as `false`, any other failure is thrown |
| `./shared/utils/stored-object-url` | `storedObjectUrl(origin, bucket, key)`: where the provider serves an object (path-style); reads no environment, so a Next config can import it |
| `./features/image/constants/image` | `IMAGE`: `IMAGE.BUCKET.DEFAULT`, `IMAGE.CACHE.*` (`TTL_SECONDS`, `CONTROL`), `IMAGE.FORMAT.*` (`CONTENT_TYPE`, `EXTENSION`), `IMAGE.LIMIT.*` (file and upload bytes, files per upload, batch, list page, input pixels, stored dimension, upload timeout), `IMAGE.ERROR_CODE` (the module's own codes, `IMAGE_TOO_LARGE` and `UNSUPPORTED_IMAGE`; the standard ones it throws are core's `ERROR.CODE`), `IMAGE.DOC`, `IMAGE.OPENAPI_TAG`, `IMAGE.VAR` |
| `./features/image/prepare/prepare-image` | `prepareImage(buffer)`: upright, metadata-free AVIF (quality 64) capped at 2560px plus a 16px WebP blur data URL; HEIC (iPhone, Mac) decodes through `heic-decode`; `UnsupportedImageError` for anything but JPEG, PNG, WebP, AVIF or HEIC |
| `./features/image/objects/image-objects` | `putImageObject(key, body, bucket?)`, `deleteImageObjects(keys)` in the `image` bucket |
| `./features/image/next/with-storage-images` | `withStorageImages(config, { origin, bucket? })`: the `/storage/images/:key` rewrite and next/image settings, wrapped around an App's Next config |
| `./features/image/hono/routes` | `imageRoutes(deps)`, the Image module |
| `./features/image/hono/routes/read-handlers` | `listHandlers`, `getHandlers` |
| `./features/image/hono/routes/write-handlers` | `uploadHandlers`, `patchHandlers`, `deleteHandlers` |
| `./features/image/hono/utils/deps` | `ImageDeps`, what the module needs from its host |
| `./features/image/hono/utils/upload` | `isImageUpload(method, path, basePath)`, so a host skips its own body limit and timeout for the upload |
| `./features/image/hono/tests/stub-image-deps` | `stubImageDeps`, `imageRecord` for host tests |
| `./features/image/setup/setup-bucket` | `setupImageBucket(bucket, images?)`: the bucket, its read-only policy and `images` (the shipped ones unless told otherwise), each only when missing (the deploy's `storage-setup`, and every test run's bucket) |
| `./features/image/fixtures/upload-fixtures` | `putFixtureImage(bucket, fixture)`: one Image Fixture's file through `prepareImage`, under its key; `uploadImageFixtures(bucket)`: all of them, replacing what is there |
| `./features/image/fixtures/constants/files` | `IMAGE_FIXTURE_FILES`, the folder of source files (one per accepted format, plus `animation.gif`) |
| `./features/test-bucket/{names,bucket,global-setup}` | A bucket per test run: `createTestBucket(label, stamp)` (sweeps crashed runs' buckets, then `setupImageBucket` with every Fixture), `dropTestBucket(label, stamp)`, `sweepTestBuckets`, `testBucketName` (the Test database's name with hyphens); `global-setup` is the Vitest `globalSetup` |

## 📁 Directory Structure

```
packages/storage/
  src/
    environment/environment.ts   Zod-validated STORAGE_* variables
    shared/constants/paths.ts    STORAGE (STORAGE.PATH.*)
    shared/utils/stored-object-url.ts   storedObjectUrl, where the provider serves an object
    features/
      s3/                        the only code that knows the provider
        client.ts                S3 client pointed at MinIO
        objects.ts               putObject, deleteObjects for any bucket
        exists.ts                bucketExists, objectExists: a 404 is "not there"
      image/
        constants/               image (IMAGE), schemas
        prepare/                 sharp (+ heic-decode): orient, strip metadata, cap, AVIF, blur
        objects/                 put and delete Image objects (through s3/objects)
        hono/                    the Image module: routes, handlers, deps, errors, upload
        setup/                   setupImageBucket: bucket, policy, shipped Images
        next/                    withStorageImages, the App's proxy and next/image settings
        fixtures/                files/ (the Image Fixtures' sources), upload-fixtures,
                                 seed-local (pnpm db:seed:images), scripts/describe-fixtures
      test-bucket/               a bucket per test run: names, bucket, global-setup, cli
```

## 🧪 Test buckets

A Vitest run with integration tests gets its own bucket
(`allonfire-test-<package>-<epoch>-<random>`) holding every Image Fixture as
AVIF, with the read-only policy `image` has, as `STORAGE_BUCKET`; it is emptied
and removed when the run ends, and one over a day old is swept. e2e makes one
per Playwright run through `pnpm test-bucket create|drop|name`.
`pnpm --filter @allonfire/storage db:seed:images` uploads the same files into
the Local `image` bucket. After changing a source file, run
`scripts/describe-fixtures.ts` and copy its sizes into `FIXTURE.IMAGE`.

## 🖼️ Image module

`imageRoutes(deps)` is the Images HTTP API (list, get, batch upload, patch, delete), typed on `AuthEnv`: it reads the Session the host's `sessionLoader` set. A host mounts it with one line:

```ts
.route(API.PATH.IMAGES, imageRoutes(deps.images))
```

`ImageDeps` is everything it touches: the `image.service` functions from `@allonfire/database` (`createImages`, `listImages`, `getImage`, `updateImages`, `deleteImages`, `removeImagesFromApp`; a PATCH and a DELETE hand their check to the write itself, which runs it on the placements it locks), `putObject` and `deleteObjects` from `./features/image/objects/image-objects`, `prepare` (`prepareImage`) and `log` (`{ warn }`, pino's shape).

- **Access** (ADR 0020): an Image is in one or more Apps, public or private in each. Reads need no Session: a visitor sees public placements, a User also the Apps they enter, and an Image they cannot see answers 404. Writes need one: placing an Image in an App, taking it out or switching it public needs the Admin Role there; its alt or deleting it everywhere needs it in every App it is in. A batch answers 404 for any Image the User cannot see before any 403. An upload from a User who is Admin in no App answers 403 before its body, up to 100 MiB, is read. `hono/utils/access.ts` holds these checks; `hono/tests/recap.test.ts` is the agreed table, one test per row.

- **Errors** are `CodedError`s (ADR 0015) with a standard code from core's `ERROR.CODE` or one of the module's own from `IMAGE.ERROR_CODE`; the host renders and translates them. A host spreads `IMAGE.ERROR_CODE` into its own codes beside `ERROR.CODE`, so a code without a message fails its build.
- **Limits**: the upload brings its own 100 MiB body limit and 5-minute timeout; `isImageUpload` lets the host skip its global ones.
- **Docs**: each error response is `problemResponseRef(status)` from `@allonfire/core/features/errors/constants/openapi`; a host publishing OpenAPI registers one `Problem<status>` per status, listing only the codes it sends with it.

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `STORAGE_ENDPOINT` | ✅ | Object storage URL as the server reaches it (MinIO today) |
| `STORAGE_ACCESS_KEY` | ✅ | Access key ID |
| `STORAGE_SECRET_KEY` | ✅ | Secret access key |
| `STORAGE_BUCKET` | | The Images' bucket, `image` by default; a test run sets its own |

Locally, `db:seed:images` and `test-bucket` read `packages/storage/.env` (copy `.env.example`); Vitest sets the same values itself.

The bucket is `image` (`IMAGE.BUCKET.DEFAULT` in `features/image/constants/image`), named like the Postgres schema; `STORAGE_BUCKET` overrides it only for a test run's own bucket (the Back office reads it at build, for the rewrite). It is readable by key and never listable: `minio-init` sets a `s3:GetObject`-only anonymous policy in dev; in production the deploy's `storage-setup` service (`features/image/setup`) creates the bucket with that policy and puts in the Images the Apps show by key (the sign-in photo), each only when missing. Do not use `mc anonymous set download`: it also allows listing every key.

## 🔧 Usage

```ts
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { putImageObject } from "@allonfire/storage/features/image/objects/image-objects";
import { prepareImage } from "@allonfire/storage/features/image/prepare/prepare-image";

const image = await prepareImage(upload); // throws UnsupportedImageError
await putImageObject(`${crypto.randomUUID()}${IMAGE.FORMAT.EXTENSION}`, image.buffer);
// image.width, image.height, image.bytes, image.blurDataUrl go on the row
```

## 📦 Dependencies

| Package | Why |
|---------|-----|
| `@aws-sdk/client-s3` | S3-compatible object storage operations |
| `sharp` | Decoding, orienting, resizing, AVIF and WebP encoding |
| `heic-decode` | HEIC decoding (libheif in WebAssembly): the prebuilt sharp leaves HEVC out |
| `@allonfire/auth`, `@allonfire/database`, `@allonfire/core` | Guards and Session, the Image rows, shared constants and `CodedError` |
| `hono` (peer), `hono-openapi`, `@hono/standard-validator` | The Image module |
| `next` (optional peer, types only) | `withStorageImages` |
| `@t3-oss/env-core`, `zod` | Environment validation |
