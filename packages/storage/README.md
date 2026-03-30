<h1 align="center">@allonfire/storage</h1>

<p align="center">
  <img src="https://img.shields.io/badge/AWS_S3-SDK-FF9900?logo=amazons3&logoColor=white" alt="AWS S3" />
  <img src="https://img.shields.io/badge/Sharp-image_processing-99CC00?logo=sharp&logoColor=white" alt="Sharp" />
  <img src="https://img.shields.io/badge/MinIO-object_storage-C72E49?logo=minio&logoColor=white" alt="MinIO" />
  <img src="https://img.shields.io/badge/Blurhash-placeholders-6366F1?logoColor=white" alt="Blurhash" />
</p>

<p align="center">
  S3-compatible object storage and image processing for the AllOnFire monorepo. File upload/delete, auto-provisioned buckets, photo processing with thumbnails, and blurhash placeholder generation.
</p>

---

## 📦 API Reference

| Export Path | What it provides |
|-------------|-----------------|
| `.` | `uploadFile`, `deleteFile`, `getPublicUrl`, `s3` client, `processPhoto`, `ProcessedPhoto` type, `blurHashToDataURL` |
| `./image-processing` | `processPhoto`, `ProcessedPhoto` — direct import |
| `./env` | `env` — validated `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` |

## 📁 Directory Structure

```
packages/storage/
  src/
    index.ts               Package entry point (re-exports)
    client.ts              S3 client configuration
    upload.ts              uploadFile, deleteFile, getPublicUrl
    image-processing.ts    processPhoto with Sharp (resize, thumbnail, blurhash)
    blurhash-to-data-url.ts  Convert blurhash to data URL for placeholders
    env.ts                 Zod-validated environment variables
  package.json
  tsconfig.json
```

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `MINIO_ENDPOINT` | ✅ | S3/MinIO server URL |
| `MINIO_ACCESS_KEY` | ✅ | Access key ID |
| `MINIO_SECRET_KEY` | ✅ | Secret access key |
| `MINIO_BUCKET` | ✅ | Default bucket name |

## 🔧 Usage

### Uploading a file

```ts
import { uploadFile, deleteFile } from "@allonfire/storage";

const url = await uploadFile("photos/full/image.jpg", buffer, "image/jpeg");
await deleteFile("photos/full/image.jpg");
```

### Processing a photo with blurhash

```ts
import { processPhoto } from "@allonfire/storage";

const result = await processPhoto(inputBuffer);
// result.full       — resized JPEG (max 1600px)
// result.thumbnail  — 400px wide thumbnail
// result.width      — original width
// result.height     — original height
// result.blurHash   — blurhash string for placeholders
```

## 📦 Dependencies

| Package | Why |
|---------|-----|
| `@aws-sdk/client-s3` | S3-compatible object storage operations |
| `sharp` | High-performance image resizing and format conversion |
| `blurhash` | Generate compact placeholder hashes for images |
| `@t3-oss/env-core` | Type-safe environment variable validation |
| `zod` | Schema validation for env vars |
