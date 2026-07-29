# Laura Photo Seeding to Production

## Context

The Laura app needs its photo gallery populated with curated photos on the production VPS. A `seed-photos` script exists that processes images (HEIC→JPEG, thumbnails, blurhash) and uploads to MinIO + creates DB records. Photos are processed locally on the Mac (faster HEIC processing) then synced to the VPS.

## Steps

### 1. Prepare seed photos
- Create `apps/laura/seed-photos/` directory
- User copies curated photos from `/Volumes/Crucial-4T/repo/Laura Memory/`
- Only selected photos go in — not all 178

### 2. Clean local dev environment
- Delete all Photo + Favorite records from local PostgreSQL
- Clear the `laura` bucket in local MinIO
- This allows the seed script to run (it skips if photos exist)

### 3. Seed locally
- Start local Docker dev stack: `pnpm docker:up`
- Run: `pnpm seed-photos`
- Script processes each image: resize 1600x1600, thumbnail 400px, blurhash 4x3
- Uploads full + thumbnail JPEGs to local MinIO
- Creates Photo records in local PostgreSQL

### 4. Export from local MinIO
- Use `mc mirror` or `docker cp` to export processed photos from local MinIO
- Result: directory of optimized JPEGs (full + thumbnails)

### 5. Upload to VPS MinIO
- Upload processed photos to VPS MinIO bucket `laura`
- Use `mc mirror` from local MinIO to VPS MinIO, or `aws s3 sync` via SSH tunnel

### 6. Export Photo records from local PG
- `pg_dump` the Photo table from local PostgreSQL
- Transfer to VPS and import into production `allonfire` database

### 7. Verify
- Check `laura.isaiariva.com` shows the photo gallery
- Verify thumbnails load with blurhash placeholders
- Test memory game uses the seeded photos

## Files
- `apps/laura/seed-photos/` — curated source photos
- `apps/laura/scripts/seed-photos.ts` — seed script (no changes needed)
- `packages/storage/src/image-processing.ts` — photo processing
- `packages/database/src/services/photo.service.ts` — DB layer

## Verification
- Photo gallery loads at `laura.isaiariva.com`
- All photos show with thumbnails + blurhash
- Memory game works with seeded photos
- MinIO console shows `laura/photos/full/` and `laura/photos/thumb/`
