<h1 align="center">@allonfire/storage</h1>

<p align="center">
  <img src="https://img.shields.io/badge/AWS_S3-SDK-FF9900?logo=amazons3&logoColor=white" alt="AWS S3" />
  <img src="https://img.shields.io/badge/Sharp-image_processing-99CC00?logo=sharp&logoColor=white" alt="Sharp" />
  <img src="https://img.shields.io/badge/MinIO-object_storage-C72E49?logo=minio&logoColor=white" alt="MinIO" />
</p>

<p align="center">
  Prepares uploaded Images and stores them in MinIO's public <code>images</code> bucket (ADR 0013). It also ships the Images HTTP module any backend mounts (ADR 0015) and the Next wiring that lets an App show Images through <code>/storage/images/*</code>.
</p>

---

## 📦 API Reference

| Export Path | What it provides |
|-------------|-----------------|
| `./features/image/prepare-image` | `prepareImage(buffer)`: upright, metadata-free WebP capped at 2560px plus a 16px blur data URL; `UnsupportedImageError` for anything but JPEG, PNG, WebP or AVIF |
| `./features/image/image-objects` | `putImageObject(key, body)`, `deleteImageObjects(keys)` in the `image` bucket |
| `./features/s3/client` | `s3`, the MinIO client (path-style) |
| `./environment/environment` | `env` and `storageEnvSchema`, the three `STORAGE_*` variables |
| `./features/image/constants/limits` | `MAX_INPUT_MEGAPIXELS`, `MAX_INPUT_PIXELS`: the pixel cap checked before decoding |
| `./next/with-storage-images` | `withStorageImages(config, { origin })`: the `/storage/images/:key` rewrite and next/image settings, wrapped around an App's Next config |
| `./routes/image` | `imageRoutes(deps)`, the Image module |
| `./routes/image/utils/deps` | `ImageDeps`, what the module needs from its host |
| `./routes/image/utils/upload` | `isImageUpload(method, path, basePath)`, so a host skips its own body limit and timeout for the upload |
| `./routes/image/constants/errors` | `IMAGE_ERROR_CODE`, every code the module throws |
| `./shared/tests/stub-image-deps` | `stubImageDeps`, `imageRecord` for host tests |

## 📁 Directory Structure

```
packages/storage/
  src/
    environment/environment.ts     Zod-validated STORAGE_* variables
    features/
      s3/client.ts                 S3 client pointed at MinIO
      image/
        prepare-image.ts           sharp: orient, strip metadata, cap, WebP, blur
        image-objects.ts           put and delete Image objects
        tests/prepare-image.test.ts
    next/with-storage-images.ts    Next config wrapper: rewrite + next/image settings
    routes/image/                  the Image module: index (imageRoutes), routes,
                                   handlers, constants/, utils/, tests/
    shared/tests/stub-image-deps.ts  stubImageDeps, imageRecord for host tests
```

## 🖼️ Image module

`imageRoutes(deps)` is the Images HTTP API (list, get, batch upload, patch, delete), typed on `AuthEnv`: it reads the Session the host's `sessionLoader` set. A host mounts it with one line:

```ts
.route(IMAGE_BASE_PATH, imageRoutes(deps.images))
```

`ImageDeps` is everything it touches: the `image.service` functions from `@allonfire/database` (`createImages`, `listImages`, `getImage`, `updateImages`, `deleteImages`), `putObject` and `deleteObjects` from `./features/image/image-objects`, `prepare` (`prepareImage`) and `log` (`{ warn }`, pino's shape).

- **Errors** are `CodedError`s (ADR 0015) with a code from `IMAGE_ERROR_CODE`; the host renders and translates them. Its type test should check `IMAGE_ERROR_CODE satisfies Record<string, ErrorCode>`.
- **Limits**: the upload brings its own 100 MiB body limit and 5-minute timeout; `isImageUpload` lets the host skip its global ones.
- **Docs**: responses reference `#/components/responses/Problem`; a host publishing OpenAPI registers that component.

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `STORAGE_ENDPOINT` | ✅ | Object storage URL as the server reaches it (MinIO today) |
| `STORAGE_ACCESS_KEY` | ✅ | Access key ID |
| `STORAGE_SECRET_KEY` | ✅ | Secret access key |

The bucket is not configurable: it is `image`, named like the Postgres schema (`IMAGE_BUCKET` in `features/image/constants/bucket`), readable by key and never listable: `minio-init` sets a `s3:GetObject`-only anonymous policy in dev, and production needs the same by hand. Do not use `mc anonymous set download`: it also allows listing every key.

## 🔧 Usage

```ts
import { putImageObject } from "@allonfire/storage/features/image/image-objects";
import { prepareImage } from "@allonfire/storage/features/image/prepare-image";

const image = await prepareImage(upload); // throws UnsupportedImageError
await putImageObject(`${crypto.randomUUID()}.webp`, image.buffer);
// image.width, image.height, image.bytes, image.blurDataUrl go on the row
```

## 📦 Dependencies

| Package | Why |
|---------|-----|
| `@aws-sdk/client-s3` | S3-compatible object storage operations |
| `sharp` | Decoding, orienting, resizing and WebP encoding |
| `@allonfire/auth`, `@allonfire/database`, `@allonfire/utils` | Guards and Session, the Image rows, shared constants and `CodedError` |
| `hono` (peer), `hono-openapi`, `@hono/standard-validator` | The Image module |
| `next` (optional peer, types only) | `withStorageImages` |
| `@t3-oss/env-core`, `zod` | Environment validation |
