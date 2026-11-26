<h1 align="center">@allonfire/storage</h1>

<p align="center">
  <img src="https://img.shields.io/badge/AWS_S3-SDK-FF9900?style=flat&logo=amazons3&logoColor=white" alt="AWS S3" />
  <img src="https://img.shields.io/badge/Sharp-image_processing-99CC00?style=flat&logo=sharp&logoColor=white" alt="Sharp" />
  <img src="https://img.shields.io/badge/MinIO-object_storage-C72E49?style=flat&logo=minio&logoColor=white" alt="MinIO" />
</p>

<p align="center">The apps' file storage. Today that means pictures: preparing and storing Images and Avatars, signing the links a browser loads them by, and the Images HTTP routes.</p>

---

## 🔧 Use it

`package.json` lists every import path.

| I want to | Use |
|---|---|
| add the Images routes to a Hono host | `imageRoutes(deps)` from `./features/image/hono/routes` |
| turn an upload into a stored Image file | `prepareImage`, then `putImageObject` |
| give a browser a link to a stored picture | `./features/image-server/sign` |
| save or show an Avatar | `saveAvatar`, `avatarLink` (under `./features/avatar/`) |
| let a Next App take uploads | `withImageUploads` around its Next config |
| use real picture files in a test | `IMAGE_FIXTURE` with `readFixtureImage` |
| stub the Images routes in a host's test | `stubImageDeps` |

How the API mounts the routes:

```ts
.route(
  API.PATH.IMAGES,
  imageRoutes({ ...deps.images, limitExport: exportRateLimit(store) })
)
```

`ImageDeps` in `./features/image/hono/utils/deps` is everything the host passes in.

## 🗂️ Where things are

```
packages/storage/
  src/
    environment/     the STORAGE_* variables, checked with Zod
    shared/          the routes' paths
    features/
      s3/            the only code that knows the provider (MinIO today)
      image/
        constants/   IMAGE: limits, formats, error codes
        prepare/     orient, strip metadata, resize, AVIF and blur
        objects/     store, read, copy and delete Image files
        hono/        the Images routes; access rules in utils/access.ts
        export/      the JPEG made when someone downloads an Image
        setup/       creates the closed bucket
        fixtures/    sample files for tests
        utils/       file names and error mapping
      image-server/  signed picture links
      avatar/        a User's own picture
      next/          Next config for uploads
      test-bucket/   a throwaway bucket per test run
```

## ⚠️ Watch out

| Trap | Do this |
|---|---|
| The `image` bucket holds private pictures | keep it closed, with no anonymous policy; a browser gets signed links only |
| Private picture and Avatar links expire | a page that stays open has to read them again ([how](../../docs/guides/images.md)) |
| A host's body limit or timeout refuses uploads | skip both when `isImageUpload` says so |
| Next cuts large uploads off | wrap the config in `withImageUploads`, and let the [ingress](../../docs/guides/deployment.md) pass that size |
| The Local `image` bucket starts empty | the test samples go only into test buckets |
| A changed Fixture file leaves stale sizes | run `describe-fixtures` and copy its output into `FIXTURE.IMAGE` |

## 🧪 Commands

Variables are described in `.env.example`; copy it to `.env` for `image:setup` and `test-bucket`. Tests set their own.

```bash
# create the closed Local bucket (pnpm dev:setup runs it too)
pnpm --filter @allonfire/storage image:setup

# tests; start the services first for integration
pnpm test:services
pnpm --filter @allonfire/storage test

# a test bucket by hand
pnpm --filter @allonfire/storage test-bucket <create|drop|name> <label> <stamp>

# sizes and blur of each Fixture file
pnpm --filter @allonfire/storage exec tsx src/features/image/fixtures/scripts/describe-fixtures.ts
```

## 📚 More

- [Stored pictures](../../docs/guides/images.md): the image server, signed links, how pages show pictures
- [API guide](../../docs/guides/api.md): upload, Export and list rules
- [Testing](../../docs/guides/testing.md): test buckets and Fixtures
- ADRs: [shared Images](../../docs/adr/0013-images-live-in-a-shared-image-schema.md), [modules and coded errors](../../docs/adr/0015-http-modules-ship-as-packages-and-throw-coded-errors.md), [an Image in several Apps](../../docs/adr/0020-an-image-is-in-one-or-more-apps.md), [public or private](../../docs/adr/0027-an-image-is-public-or-private-and-served-through-signed-links.md), [Export](../../docs/adr/0036-a-picture-leaves-the-apps-only-as-an-export.md)
