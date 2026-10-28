import { UNIT } from "@allonfire/core/shared/constants/units";

/**
 * An Image's key never changes content (a new upload gets a new key), so its
 * optimized copies can never go stale.
 */
const CACHE_TTL_SECONDS = UNIT.DAYS_PER_YEAR * UNIT.SECONDS_PER_DAY;
/**
 * Width times height past which an upload is refused before it is decoded:
 * 100 MP is about 300 MB of RGB, and the VPS has no swap.
 */
const INPUT_MEGAPIXELS = 100;
const PIXELS_PER_MEGAPIXEL = 1_000_000;

/** Every limit an Image meets, from the upload to the stored file. */
const LIMIT = {
  /** Items in one PATCH or DELETE. */
  BATCH: 100,
  /** Longest side an Image is stored at; the optimizer never needs more. */
  DIMENSION: 2560,
  /** One file; larger is a 413 naming this limit. */
  FILE_BYTES: 20 * UNIT.BYTES_PER_MIB,
  FILES_PER_UPLOAD: 20,
  INPUT_MEGAPIXELS,
  INPUT_PIXELS: INPUT_MEGAPIXELS * PIXELS_PER_MEGAPIXEL,
  /** Images on one page of a listing. */
  LIST: { DEFAULT: 30, MAX: 100 },
  /** One upload request, every file and the meta part together. */
  UPLOAD_BYTES: 100 * UNIT.BYTES_PER_MIB,
  /**
   * The upload's own time budget, in place of the API-wide 30 s: a 503 there
   * would not stop the handler, so the batch would still land and a retry
   * would store it twice.
   */
  UPLOAD_TIMEOUT_MS: 5 * UNIT.MS_PER_MINUTE,
} as const;

/** Everything fixed about Images: where they live, how they are stored and served, and their limits. */
export const IMAGE = {
  BUCKET: {
    /**
     * The MinIO bucket every Image lives in (ADR 0013): Production's and the
     * Local stack's. A test run sets `STORAGE_BUCKET` to its own.
     */
    DEFAULT: "image",
  },
  CACHE: {
    /** What every stored Image is served with: a key never changes content. */
    CONTROL: `public, max-age=${CACHE_TTL_SECONDS}, immutable`,
    TTL_SECONDS: CACHE_TTL_SECONDS,
  },
  /**
   * What the docs say about each route. Every number comes from the limit that
   * enforces it, so the text cannot promise a limit the route does not keep.
   */
  DOC: {
    DELETE_204: "Taken out of `app`, or deleted",
    DELETE_DESCRIPTION: `Signed in. Up to ${LIMIT.BATCH} ids. With \`app\`: takes the Images out of that App (Admin there; each must be in it) and deletes the ones left in no App. Without: deletes them everywhere (Admin in every App each is in). An Image the User cannot see answers 404, checked across the whole batch before any 403. All or nothing; the stored files go after the rows.`,
    DELETE_SUMMARY: "Take Images out of an App, or delete them",
    GET_200: "The Image",
    GET_DESCRIPTION:
      "No sign-in needed. A public Image, or a private one in an App the User enters; any other answers 404, not 403, so its id stays hidden. Its picture comes as signed links, one per width (`srcSet`): a public Image's never expire, a private one's within the hour.",
    GET_SUMMARY: "Get an Image",
    LIST_200: "One page of Images; `nextCursor` is null on the last page",
    LIST_DESCRIPTION: `No sign-in needed. The Images visible in \`app\` (in any App when it is left out): placed there, and public or in an App the User enters (ADR 0027). Never 403: someone who cannot enter \`app\` gets its public Images. Newest upload first, ${LIMIT.LIST.DEFAULT} per page (\`limit\` up to ${LIMIT.LIST.MAX}). Send \`nextCursor\` back as \`cursor\` for the next page.`,
    LIST_SUMMARY: "List Images",
    PATCH_200: "The updated Images",
    PATCH_DESCRIPTION: `Signed in. Up to ${LIMIT.BATCH} changes, each Image once, each an \`id\` with \`apps\` (the full new list, each App once), \`alt\`, \`access\` or any of them. An App added or removed needs the Admin Role in it; \`alt\` and \`access\`, which every App shows, need it in every App the Image is in. Making a public Image private moves it to a new file, so its public links stop at once; \`alt\` needs every language. An Image the User cannot see answers 404, checked across the whole batch before any 403. All or nothing.`,
    PATCH_SUMMARY: "Place Images in Apps or change their alt",
    UPLOAD_201: "The new Images, in file order",
    UPLOAD_DESCRIPTION: `Signed in, Admin in every App named. multipart/form-data: up to ${LIMIT.FILES_PER_UPLOAD} \`file\` parts and one \`meta\` JSON part, \`[{ apps: [App], alt, access? }]\` in file order, at least one App each, each App once, private when \`access\` is left out. JPEG, PNG, WebP, AVIF or HEIC in; each file is stored as AVIF with a blur placeholder. Limits: ${LIMIT.FILE_BYTES / UNIT.BYTES_PER_MIB} MiB a file, ${LIMIT.UPLOAD_BYTES / UNIT.BYTES_PER_MIB} MiB a request, ${LIMIT.INPUT_MEGAPIXELS} megapixels, ${LIMIT.UPLOAD_TIMEOUT_MS / UNIT.MS_PER_MINUTE} minutes. All or nothing: one bad file rejects the batch.`,
    UPLOAD_SUMMARY: "Upload Images",
  },
  /**
   * The codes only this module throws, beside the standard ones it throws
   * from core's `ERROR.CODE` (ADR 0015). A host spreads them into its own
   * codes, so a new one fails the host's build until it has a message.
   */
  ERROR_CODE: {
    IMAGE_TOO_LARGE: "IMAGE_TOO_LARGE",
    UNSUPPORTED_IMAGE: "UNSUPPORTED_IMAGE",
  },
  /**
   * How every Image is stored: AVIF, about half the size of WebP at the same
   * look. Each object keeps the type it was written with, so Images stored
   * earlier as WebP still serve as WebP.
   */
  FORMAT: {
    CONTENT_TYPE: "image/avif",
    EXTENSION: ".avif",
  },
  /**
   * What a picture may come in as, for a file input's `accept`: every format
   * the upload decodes (JPEG, PNG, WebP, AVIF, HEIC). HEIC also by its
   * extensions, since a browser often gives an iPhone's file no type.
   */
  INPUT_ACCEPT:
    "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif",
  LIMIT,
  /** The tag the Image module's routes appear under. */
  OPENAPI_TAG: "Image",
  /** Context keys the Image module sets. */
  VAR: {
    /** The upload's time budget, as an `AbortSignal`. */
    UPLOAD_BUDGET: "uploadBudget",
  },
} as const;
