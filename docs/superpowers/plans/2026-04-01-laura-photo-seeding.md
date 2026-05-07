# Laura Photo Seeding to Production — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the production Laura photo gallery with curated photos from `/Volumes/Crucial-4T/repo/Laura Memory/`

**Architecture:** Process photos locally (Mac, fast HEIC→JPEG), then sync processed files + DB records to the VPS. Uses existing `seed-photos` script — no new code.

**Tech Stack:** Sharp (image processing), MinIO (S3 storage), PostgreSQL, Docker, SSH

---

### Task 1: Prepare seed-photos directory

**Files:**
- Create: `apps/laura/seed-photos/` (gitignored — photo data, not code)

- [ ] **Step 1: Create the directory**

```bash
mkdir -p /Volumes/Crucial-4T/repo/allonfire/apps/laura/seed-photos
```

- [ ] **Step 2: User curates photos**

User copies selected photos from `/Volumes/Crucial-4T/repo/Laura Memory/` into `apps/laura/seed-photos/`. Not all 178 — only the ones they want in production.

```bash
# Example: copy all (user will remove unwanted ones)
cp "/Volumes/Crucial-4T/repo/Laura Memory/"*.heic /Volumes/Crucial-4T/repo/allonfire/apps/laura/seed-photos/
```

- [ ] **Step 3: Verify the directory is gitignored**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
echo "apps/laura/seed-photos/" >> .gitignore  # if not already present
```

Check: `git status` should NOT show seed-photos/ as untracked.

---

### Task 2: Clean local dev environment

**Prerequisites:** Local Docker dev stack running (`pnpm docker:up`)

- [ ] **Step 1: Start local Docker dev stack**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
pnpm docker:up
```

Wait for PostgreSQL and MinIO to be healthy.

- [ ] **Step 2: Delete existing photos from local database**

```bash
docker exec allonfire-postgres psql -U allonfire -d allonfire -c "DELETE FROM \"Favorite\"; DELETE FROM \"Photo\";"
```

Expected: `DELETE N` for each table.

- [ ] **Step 3: Clear local MinIO photos bucket**

```bash
docker exec allonfire-minio mc alias set local http://localhost:9000 allonfire allonfire 2>/dev/null
docker exec allonfire-minio mc rm --recursive --force local/laura/photos/ 2>/dev/null || echo "No photos to delete"
```

Or via MinIO console at http://localhost:9001 — delete the `photos/` folder in the `laura` bucket.

- [ ] **Step 4: Verify clean state**

```bash
docker exec allonfire-postgres psql -U allonfire -d allonfire -c "SELECT COUNT(*) FROM \"Photo\";"
```

Expected: `0`

---

### Task 3: Seed photos locally

- [ ] **Step 1: Generate Prisma client**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
pnpm db:generate
```

- [ ] **Step 2: Run the seed-photos script**

```bash
pnpm --filter @allonfire/laura seed-photos
```

Expected output:
```
Found N images to seed
Using user ID: xxxxx

[1/N] 18.heic (1600x1200)
[2/N] 19.heic (1200x1600)
...
Done! Processed: N, Failed: 0
```

This processes each HEIC → JPEG (1600×1600 max), creates thumbnails (400px), generates blurhash, uploads to local MinIO, and creates DB records.

- [ ] **Step 3: Verify locally**

```bash
# Check DB
docker exec allonfire-postgres psql -U allonfire -d allonfire -c "SELECT COUNT(*) FROM \"Photo\";"

# Check MinIO
docker exec allonfire-minio mc ls local/laura/photos/full/ | wc -l
docker exec allonfire-minio mc ls local/laura/photos/thumb/ | wc -l
```

Both counts should match the number of seeded photos.

---

### Task 4: Export Photo records from local PostgreSQL

- [ ] **Step 1: Dump Photo table**

```bash
docker exec allonfire-postgres pg_dump -U allonfire -d allonfire \
  --table='"Photo"' --data-only --inserts \
  > /tmp/photos-seed.sql
```

- [ ] **Step 2: Verify dump**

```bash
head -20 /tmp/photos-seed.sql
grep -c "INSERT" /tmp/photos-seed.sql
```

Should show INSERT statements matching the photo count.

---

### Task 5: Sync photos to VPS MinIO

- [ ] **Step 1: Export photos from local MinIO**

```bash
mkdir -p /tmp/minio-export
docker cp allonfire-minio:/data/laura/photos /tmp/minio-export/
```

- [ ] **Step 2: Upload to VPS MinIO**

```bash
# Copy photos to VPS temp directory
scp -r /tmp/minio-export/photos main-vps:/tmp/minio-photos

# Copy into MinIO container volume
ssh main-vps "docker cp /tmp/minio-photos/. \$(docker ps -q -f name=allonfire.*minio):/data/laura/photos/ && rm -rf /tmp/minio-photos && echo 'Photos copied to MinIO'"
```

- [ ] **Step 3: Verify on VPS MinIO**

```bash
ssh main-vps "docker exec \$(docker ps -q -f name=allonfire.*minio) ls /data/laura/photos/full/ | wc -l"
ssh main-vps "docker exec \$(docker ps -q -f name=allonfire.*minio) ls /data/laura/photos/thumb/ | wc -l"
```

Both counts should match local.

---

### Task 6: Import Photo records to VPS PostgreSQL

- [ ] **Step 1: Copy SQL dump to VPS**

```bash
scp /tmp/photos-seed.sql main-vps:/tmp/photos-seed.sql
```

- [ ] **Step 2: Update user ID in dump**

The local dump references a local user ID. Production has a different user ID for the admin. Get the production admin user ID and replace:

```bash
# Get production admin user ID
PROD_USER_ID=$(ssh main-vps "docker exec \$(docker ps -q -f name=dokploy-postgres) psql -U allonfire -d allonfire -t -c \"SELECT id FROM \\\"User\\\" WHERE role='ADMIN' LIMIT 1;\"" | tr -d ' ')

# Get local user ID from dump
LOCAL_USER_ID=$(grep -oP "'[a-z0-9]{20,}'" /tmp/photos-seed.sql | head -1 | tr -d "'")

echo "Local: $LOCAL_USER_ID → Production: $PROD_USER_ID"

# Replace in dump (create new file)
sed "s/$LOCAL_USER_ID/$PROD_USER_ID/g" /tmp/photos-seed.sql > /tmp/photos-seed-prod.sql
scp /tmp/photos-seed-prod.sql main-vps:/tmp/photos-seed.sql
```

- [ ] **Step 3: Import into production database**

```bash
ssh main-vps "docker exec -i \$(docker ps -q -f name=dokploy-postgres) psql -U allonfire -d allonfire < /tmp/photos-seed.sql && rm /tmp/photos-seed.sql && echo 'Photos imported'"
```

- [ ] **Step 4: Verify**

```bash
ssh main-vps "docker exec \$(docker ps -q -f name=dokploy-postgres) psql -U allonfire -d allonfire -c \"SELECT COUNT(*) FROM \\\"Photo\\\";\""
```

Should match local count.

---

### Task 7: Verify production

- [ ] **Step 1: Check laura.isaiariva.com**

Open `https://laura.isaiariva.com` in browser. Log in with admin credentials. The photo gallery should show all seeded photos with thumbnails and blurhash placeholders.

- [ ] **Step 2: Test memory game**

Navigate to Games → Memory. It should use the seeded photos as card faces.

- [ ] **Step 3: Clean up local temp files**

```bash
rm -rf /tmp/minio-export /tmp/photos-seed.sql /tmp/photos-seed-prod.sql
```
