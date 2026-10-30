<h1 align="center">@allonfire/storage</h1>

<p align="center">
  <img src="https://img.shields.io/badge/AWS_S3-SDK-FF9900?logo=amazons3&logoColor=white" alt="AWS S3" />
  <img src="https://img.shields.io/badge/Sharp-image_processing-99CC00?logo=sharp&logoColor=white" alt="Sharp" />
  <img src="https://img.shields.io/badge/MinIO-object_storage-C72E49?logo=minio&logoColor=white" alt="MinIO" />
</p>

<p align="center">
  Object storage for any kind of file; only <code>features/s3</code> knows the provider (MinIO today). Images are its first kind: <code>features/image</code> prepares them, stores them in the closed <code>image</code> bucket (ADR 0013, ADR 0027), ships the Image module any Host mounts (ADR 0015), and signs the image-server links every stored picture reaches a browser by (through the `image-cache` nginx in front of imgproxy, which keeps each answer and, after checking with imgproxy that the link and the file still hold, serves it without resizing again). Avatars, a User's own picture, live in the same bucket.
</p>

---

## 📦 API Reference

| Export Path | What it provides |
|-------------|-----------------|
| `./environment/environment` | `env` and `storageEnvSchema`: the provider's `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, and the image server's `STORAGE_IMAGE_SERVER_URL`, `STORAGE_IMAGE_SERVER_KEY`, `STORAGE_IMAGE_SERVER_SALT` (hex) |
| `./shared/constants/paths` | `STORAGE.PATH`: `IMAGES` (`/images`, where a Host mounts the Image module) |
| `./features/image-server/sign` | `pictureLink({ bucket?, key, width, expiresAt? })`: a signed imgproxy link (HMAC-SHA256 over salt and path), changed width or key answers 403, past `expiresAt` 404; `pictureSrcSet(key, expiresAt?)`, one per width; `privateLinkExpiry(now)`, the end of the hour after the next |
| `./features/image-server/constants/image-server` | `IMAGE_SERVER`: `WIDTHS` (640, 1080, 1920, 2560), `AVATAR_WIDTH` (256), `PRIVATE_LINK_HOURS`, `CACHE_CHECK_SECONDS` (2: how stale a copy the image cache serves can be) |
| `./features/avatar/constants/avatar` | `AVATAR`: `SIZE` (256), `CROP_SIZE` (512, the browser's crop), `INPUT_BYTES`, `KEY_PREFIX`, `QUALITY` |
| `./features/avatar/prepare-avatar` | `prepareAvatar(buffer)`: the picture's centre square as a 256x256 AVIF, decoded as an Image is (`decodeUpright`), with its blur (`blurDataUrlOf`, an Image's too) |
| `./features/avatar/utils/avatar-key` | `avatarKey(userId)` (a new `avatar-<userId>-<uuid>.avif` each time), `avatarKeyOf(image)` (our file's name, else null), `avatarLink(image, now)` (ours signed for the hour, a provider's picture as it is) |
| `./features/avatar/objects/avatar-objects` | `saveAvatar(userId, file)` (prepares and stores, answers the name), `deleteAvatarsWith(log)(images)` (deletes our own files among them, logs a failure) in the `image` bucket |
| `./features/s3/client` | `s3`, the provider client (MinIO, path-style) |
| `./features/s3/objects` | `putObject(bucket, key, body, { contentType, cacheControl })`, `deleteObjects(bucket, keys)`, `copyObject(bucket, from, to)`: any file, any bucket |
| `./features/s3/exists` | `bucketExists(bucket)`: the provider's 404 reads as `false`, any other failure is thrown |
| `./shared/utils/stored-object-url` | `storedObjectUrl(origin, bucket, key)`: where the provider holds an object (path-style), which answers nobody anonymously; tests read it to prove that |
| `./features/image/constants/image` | `IMAGE`: `IMAGE.BUCKET.DEFAULT`, `IMAGE.CACHE.*` (`TTL_SECONDS`, `CONTROL`), `IMAGE.FORMAT.*` (`CONTENT_TYPE`, `EXTENSION`), `IMAGE.LIMIT.*` (file and upload bytes, files per upload, batch, list page, input pixels, stored dimension, upload timeout), `IMAGE.ERROR_CODE` (the module's own codes, `IMAGE_TOO_LARGE` and `UNSUPPORTED_IMAGE`; the standard ones it throws are core's `ERROR.CODE`), `IMAGE.DOC`, `IMAGE.OPENAPI_TAG`, `IMAGE.VAR` |
| `./features/image/prepare/prepare-image` | `prepareImage(buffer)`: upright, metadata-free AVIF (quality 64) capped at 2560px plus a 16px WebP blur data URL; HEIC (iPhone, Mac) decodes through `heic-decode`; `UnsupportedImageError` for anything but JPEG, PNG, WebP, AVIF or HEIC |
| `./features/image/objects/delete-leftovers` | `deleteLeftovers({ keys, log, reason, remove, retry? })`: deletes files no row names any more, logging a failure instead of throwing; `LeftoverLog` |
| `./features/image/objects/image-objects` | `putImageObject(key, body, bucket?)`, `deleteImageObjects(keys)`, `copyImageObject(from, to)` in the `image` bucket |
| `./features/image/hono/utils/errors` | `asImageError(error)`: a decoder's refusal as the client's 413 `IMAGE_TOO_LARGE` or 415 `UNSUPPORTED_IMAGE` (an Image's upload and an Avatar's) |
| `./features/image/hono/routes` | `imageRoutes(deps)`, the Image module |
| `./features/image/hono/routes/read-handlers` | `listHandlers`, `getHandlers` |
| `./features/image/hono/routes/write-handlers` | `uploadHandlers`, `patchHandlers`, `deleteHandlers` |
| `./features/image/hono/utils/deps` | `ImageDeps`, what the module needs from its host |
| `./features/image/hono/utils/upload` | `isImageUpload(method, path, basePath)`, so a host skips its own body limit and timeout for the upload |
| `./features/image/hono/tests/stub-image-deps` | `stubImageDeps`, `imageRecord` for host tests |
| `./features/image/setup/setup-bucket` | `setupImageBucket(bucket)`: the bucket when missing, closed (an earlier read-only policy removed), no Images (the deploy's `storage-setup`, and every test run's bucket before its Fixtures) |
| `./features/image/fixtures/constants/files` | `IMAGE_FIXTURE_FILES`, the folder of source files (one per accepted format, plus `animation.gif`) |
| `./features/test-bucket/{names,bucket,global-setup}` | A bucket per test run: `createTestBucket(label, stamp)` (sweeps crashed runs' buckets, then `setupImageBucket` with every Fixture), `dropTestBucket(label, stamp)`, `dropTestBucketsOf(label)`, `sweepTestBuckets`, `testBucketName` (the Test database's name with hyphens); `global-setup` is the Vitest `globalSetup` |

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
        objects.ts               putObject, deleteObjects, copyObject for any bucket
        exists.ts                bucketExists: a 404 is "not there"
      image/
        constants/               image (IMAGE), schemas
        prepare/                 sharp (+ heic-decode): orient, strip metadata, cap, AVIF, blur
        objects/                 put and delete Image objects (through s3/objects)
        hono/                    the Image module: routes, handlers, deps, errors, upload
        setup/                   setupImageBucket: the bucket, closed (pnpm image:setup)
        fixtures/                files/ (the Image Fixtures' sources),
                                 scripts/describe-fixtures
      image-server/              signed imgproxy links: sign, constants
      avatar/                    a User's Avatar: prepare, key and link, objects, constants
      test-bucket/               a bucket per test run, holding every Image Fixture: names, bucket, global-setup, cli
```

## 🧪 Test buckets

A Vitest run with integration tests gets its own bucket
(`allonfire-test-<package>-<epoch>-<pid>-<random>`) holding every Image Fixture as
AVIF, closed like `image`, as `STORAGE_BUCKET` (the Local image server reads it through the links tests sign); it is emptied
and removed when the run ends; a killed run's is swept by the next run, which
sees its process gone (the stamp carries it). e2e makes one per Playwright run through
`pnpm test-bucket create|drop|name`, and `create` first drops every earlier
e2e bucket (`dropTestBucketsOf`).
The Local `image` bucket starts empty, like Production's:
`pnpm --filter @allonfire/storage image:setup`, part of `pnpm dev:setup`, runs
the setup Production runs. After changing a source file, run
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

Locally, `image:setup` and `test-bucket` read `packages/storage/.env` (copy `.env.example`); Vitest sets the same values itself.

The bucket is `image` (`IMAGE.BUCKET.DEFAULT` in `features/image/constants/image`), named like the Postgres schema; `STORAGE_BUCKET` overrides it only for a test run's own bucket. It is closed to anonymous reads, since it holds private Images and Avatars: `storage-init` runs `mc anonymous set none` in dev; in production the deploy's `storage-setup` service (`features/image/setup`) creates the bucket when missing and deletes any bucket policy. A browser reaches a picture only through a link the API signs (`features/image-server/sign`), served by the image server. Never give the bucket an anonymous policy again.

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
| `hono` (peer), `hono-openapi` | The Image module: its routes, and the validators that check each request and document it |
| `@hono/standard-validator` | hono-openapi's peer: its `validator` wraps `sValidator`, which it imports even though its manifest calls it optional |
| `@t3-oss/env-core`, `zod` | Environment validation |
