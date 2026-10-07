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
| `./shared/constants/paths` | `STORAGE_PATH` (`/storage`), where an App serves every storage |
| `./features/s3/client` | `s3`, the provider client (MinIO, path-style) |
| `./features/s3/objects` | `putObject(bucket, key, body, { contentType, cacheControl })`, `deleteObjects(bucket, keys)`: any file, any bucket |
| `./features/image/constants/paths` | `IMAGE_PATH` (`/images`), `IMAGE_PROXY_PATH` (`/storage/images`, what an App proxies to the bucket) |
| `./features/image/constants/bucket` | `IMAGE_BUCKET`, `IMAGE_CACHE_TTL_SECONDS` |
| `./features/image/prepare/prepare-image` | `prepareImage(buffer)`: upright, metadata-free AVIF (quality 64) capped at 2560px plus a 16px WebP blur data URL; HEIC (iPhone, Mac) decodes through `heic-decode`; `UnsupportedImageError` for anything but JPEG, PNG, WebP, AVIF or HEIC |
| `./features/image/prepare/constants/limits` | `MAX_INPUT_MEGAPIXELS`, `MAX_INPUT_PIXELS`: the pixel cap checked before decoding |
| `./features/image/objects/image-objects` | `putImageObject(key, body)`, `deleteImageObjects(keys)` in the `image` bucket |
| `./features/image/next/with-storage-images` | `withStorageImages(config, { origin })`: the `/storage/images/:key` rewrite and next/image settings, wrapped around an App's Next config |
| `./features/image/hono/routes` | `imageRoutes(deps)`, the Image module |
| `./features/image/hono/utils/deps` | `ImageDeps`, what the module needs from its host |
| `./features/image/hono/utils/upload` | `isImageUpload(method, path, basePath)`, so a host skips its own body limit and timeout for the upload |
| `./features/image/hono/constants/errors` | `IMAGE_ERROR_CODE`, every code the module throws |
| `./features/image/hono/tests/stub-image-deps` | `stubImageDeps`, `imageRecord` for host tests |

## 📁 Directory Structure

```
packages/storage/
  src/
    environment/environment.ts   Zod-validated STORAGE_* variables
    shared/constants/paths.ts    STORAGE_PATH
    features/
      s3/                        the only code that knows the provider
        client.ts                S3 client pointed at MinIO
        objects.ts               putObject, deleteObjects for any bucket
      image/
        constants/               paths, bucket
        prepare/                 sharp (+ heic-decode): orient, strip metadata, cap, AVIF, blur
        objects/                 put and delete Image objects (through s3/objects)
        hono/                    the Image module: routes/ (index, routes, handlers),
                                 constants/, utils/, tests/ (stubImageDeps for hosts)
        next/                    withStorageImages, the App's proxy and next/image settings
```

## 🖼️ Image module

`imageRoutes(deps)` is the Images HTTP API (list, get, batch upload, patch, delete), typed on `AuthEnv`: it reads the Session the host's `sessionLoader` set. A host mounts it with one line:

```ts
.route(IMAGE_BASE_PATH, imageRoutes(deps.images))
```

`ImageDeps` is everything it touches: the `image.service` functions from `@allonfire/database` (`createImages`, `listImages`, `getImage`, `updateImages`, `deleteImages`), `putObject` and `deleteObjects` from `./features/image/objects/image-objects`, `prepare` (`prepareImage`) and `log` (`{ warn }`, pino's shape).

- **Errors** are `CodedError`s (ADR 0015) with a code from `IMAGE_ERROR_CODE`; the host renders and translates them. Its type test should check `IMAGE_ERROR_CODE satisfies Record<string, ErrorCode>`.
- **Limits**: the upload brings its own 100 MiB body limit and 5-minute timeout; `isImageUpload` lets the host skip its global ones.
- **Docs**: each error response is `problemResponseRef(status)` from `@allonfire/core/features/errors/constants/openapi`; a host publishing OpenAPI registers one `Problem<status>` per status, listing only the codes it sends with it.

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `STORAGE_ENDPOINT` | ✅ | Object storage URL as the server reaches it (MinIO today) |
| `STORAGE_ACCESS_KEY` | ✅ | Access key ID |
| `STORAGE_SECRET_KEY` | ✅ | Secret access key |

The bucket is not configurable: it is `image`, named like the Postgres schema (`IMAGE_BUCKET` in `features/image/constants/bucket`), readable by key and never listable: `minio-init` sets a `s3:GetObject`-only anonymous policy in dev, and production needs the same by hand. Do not use `mc anonymous set download`: it also allows listing every key.

## 🔧 Usage

```ts
import { IMAGE_FORMAT } from "@allonfire/storage/features/image/constants/format";
import { putImageObject } from "@allonfire/storage/features/image/objects/image-objects";
import { prepareImage } from "@allonfire/storage/features/image/prepare/prepare-image";

const image = await prepareImage(upload); // throws UnsupportedImageError
await putImageObject(`${crypto.randomUUID()}${IMAGE_FORMAT.EXTENSION}`, image.buffer);
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
