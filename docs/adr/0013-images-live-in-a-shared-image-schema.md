# Images live in a shared `image` schema, resized by each App's Next

Images are managed in the Back office and shown by one App or by all of them,
so their rows cannot sit in any one App's schema (ADR 0007). They live in a
shared `image` schema beside `auth`, one `image."Image"` table (the Apps an
Image is in are `image."ImageApp"` rows, ADR 0020), and their files in one public MinIO bucket, `image`, under keys that
carry no App, so moving an Image between Apps changes a row and never a file.
Each App resizes and converts them with Next's built-in optimizer, reading the
bucket through a `/storage/images/*` rewrite, instead of running imgproxy: no new
service, at the cost of resizing CPU inside the App and one cache per App.

## Considered Options

- **One `Image` table per App schema**: keeps `DROP SCHEMA` removing an App
  whole, but duplicates the model and the API per App and cannot express an
  Image shown by every App.
- **imgproxy in front of MinIO**: better isolation and AVIF/WebP negotiation
  without Next, but two new services, since the open-source build caches
  nothing and needs nginx or a CDN in front.
- **Sizes made once at upload**: no runtime resizing, but a fixed width set,
  WebP only, and several files per Image.

## Consequences

- Removing an App is `DROP SCHEMA` plus deleting its rows in `image."Image"`
  and their files.
- Files are public: anyone holding a URL can load it. A deleted Image leaves
  every API response at once, but optimized copies stay in each App's
  `.next/cache/images` until LRU evicts them, and browsers keep them up to the
  one-year cache lifetime.
- `uploadedBy` is `SET NULL` on User deletion: Images belong to the App. An App
  whose Images must go with their uploader deletes them in its own
  user-deletion flow, files included.
