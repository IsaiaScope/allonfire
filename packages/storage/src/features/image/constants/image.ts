import { HTTP } from "@allonfire/core/features/http/constants/http";
import { searchQuery } from "@allonfire/core/features/search/search-query";
import { sortQuery } from "@allonfire/core/features/search/sort-query";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, ImageAccess } from "@allonfire/database/enums";

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

/**
 * How an Images list's `search` reads: `app:laura access:public
 * created:2026-11-26..2026-11-28 input:sea` (ADR 0026, ADR 0031).
 */
const SEARCH = searchQuery(
  {
    access: objectValues(ImageAccess),
    app: objectValues(App),
  },
  { ranges: ["created"] }
);

const EXPORT_RATE_LIMIT = {
  /** Keeps the Export counters apart from the host's global ones in a shared store. */
  KEY_PREFIX: "export:",
  MAX: 30,
  WINDOW_MS: UNIT.MS_PER_MINUTE,
} as const;

/** How an Images list's `sort` reads: `created.desc,size.asc` (ADR 0031); plain columns only. */
const SORT = sortQuery(["created", "size", "access", "name"] as const);

/** Every limit an Image meets, from the upload to the stored file. */
/** One upload request, every file and the meta part together. */
const UPLOAD_BYTES = 90 * UNIT.BYTES_PER_MIB;
/** What a multipart body adds to its files: boundaries and the meta part. */
const FORM_FRAMING_BYTES = UNIT.BYTES_PER_MIB;

const LIMIT = {
  /** Items in one PATCH or DELETE. */
  BATCH: 100,
  /** Longest side an Image is stored at; the optimizer never needs more. */
  DIMENSION: 2560,
  /** One file; larger is a 413 naming this limit. */
  FILE_BYTES: 20 * UNIT.BYTES_PER_MIB,
  FILES_PER_UPLOAD: 20,
  /** What a picture is allowed to hold before it is decoded. */
  INPUT: {
    MEGAPIXELS: INPUT_MEGAPIXELS,
    PIXELS: INPUT_MEGAPIXELS * PIXELS_PER_MEGAPIXEL,
  },
  /** Images on one page of a listing. */
  LIST: { DEFAULT: 25, MAX: 100 },
  /** The last numbered page a listing answers for. */
  MAX_PAGE: 1000,
  /** The longest search a listing takes (its fields and text together). */
  SEARCH_MAX: 200,
  /** The longest `sort` the API reads, `name.asc,size.desc,created.desc` and room to spare. */
  SORT_MAX: 200,
  UPLOAD: {
    /**
     * The body an App's Server Action and proxy take for an upload: the whole
     * request plus 1 MiB of form framing (`withImageUploads`).
     */
    BODY_BYTES: UPLOAD_BYTES + FORM_FRAMING_BYTES,
    /**
     * One upload request, every file and the meta part together. Kept under
     * Cloudflare's 100 MB request body limit (free plan), which sits in front of
     * every App: 100 MiB would be refused there with a 413 before reaching us.
     */
    BYTES: UPLOAD_BYTES,
    /**
     * The upload's own time budget, in place of the API-wide 30 s: a 503 there
     * would not stop the handler, so the batch would still land and a retry
     * would store it twice.
     */
    TIMEOUT_MS: 5 * UNIT.MS_PER_MINUTE,
  },
} as const;

/** Everything fixed about Images: where they live, how they are stored and served, and their limits. */
export const IMAGE = {
  /**
   * A stored picture's blur, what next/image shows while it loads: a tiny
   * WebP as a data URL, ready for `blurDataURL`.
   */
  BLUR: {
    /** What every blur's data URL starts with. */
    DATA_URL_PREFIX: "data:image/webp;base64,",
    QUALITY: 50,
    /** Next recommends a placeholder of 10px or less; 16px keeps a little shape. */
    WIDTH: 16,
  },
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
    DELETE: {
      DESCRIPTION: `Signed in. Up to ${LIMIT.BATCH} ids. With \`app\`: takes the Images out of that App (Admin there; each must be in it) and deletes the ones left in no App. Without: deletes them everywhere (Admin in every App each is in). An id that is not there, or that the User cannot see, is skipped as already gone (the answer's \`deleted\` counts the rest, so a retry is safe). An Image the User can see but may not delete answers 403 for the whole batch. All or nothing; the stored files go after the rows.`,
      RESPONSE: {
        [HTTP.STATUS.OK]:
          "How many were taken out of `app`, or deleted: fewer than named when some were already gone",
      },
      SUMMARY: "Take Images out of an App, or delete them",
    },
    GET: {
      DESCRIPTION:
        "No sign-in needed. A public Image, or a private one in an App the User enters; any other answers 404, not 403, so its id stays hidden. Its picture comes as signed links, one per width (`srcSet`): a public Image's never expire, a private one's within the hour.",
      RESPONSE: { [HTTP.STATUS.OK]: "The Image" },
      SUMMARY: "Get an Image",
    },
    LIST: {
      DESCRIPTION: `No sign-in needed. The Images visible in \`app\` (in any App when it is left out): placed there, and public or in an App the User enters (ADR 0027). Never 403: someone who cannot enter \`app\` gets its public Images. Newest upload first unless \`sort\` says otherwise (\`created.desc,size.asc\`: a column and a direction in order, at most three, from \`created\`, \`size\`, \`access\` and \`name\`; an unknown one is dropped), a numbered page of \`perPage\` Images (default ${LIMIT.LIST.DEFAULT}, up to ${LIMIT.LIST.MAX}), \`page\` from 1 to ${LIMIT.MAX_PAGE}. \`search\` is the filters and the text in one string (ADR 0026), as in \`access:public app:laura sea\`: \`access\` keeps only the public, or only the private, Images, and the text keeps the Images whose alt text or file name holds it, in any language, ignoring case. \`created\` keeps the Images uploaded in a range of whole UTC days, both ends included (\`created:2026-11-26..2026-11-28\`, or one day as \`created:2026-11-26\`).`,
      RESPONSE: {
        [HTTP.STATUS.OK]:
          "One page of Images, with the `page`, `pageCount`, `total` and `totalBytes` (of every visible Image, not just the page)",
      },
      SUMMARY: "List Images",
    },
    PATCH: {
      DESCRIPTION: `Signed in. Up to ${LIMIT.BATCH} changes, each Image once, each an \`id\` with \`apps\` (the full new list, each App once), \`alt\`, \`access\` or any of them. An App added or removed needs the Admin Role in it; \`alt\` and \`access\`, which every App shows, need it in every App the Image is in. Making a public Image private moves it to a new file, so its public links stop at once; \`alt\` needs every language. An Image the User cannot see answers 404, checked across the whole batch before any 403. Each change carries the \`version\` it was made on (\`Image.version\`): an Image changed since, or one the batch would leave in no App, answers 409 \`RESOURCE_CHANGED\`. All or nothing.`,
      RESPONSE: { [HTTP.STATUS.OK]: "The updated Images" },
      SUMMARY: "Place Images in Apps or change their alt",
    },
    UPLOAD: {
      DESCRIPTION: `Signed in, Admin in every App named. multipart/form-data: up to ${LIMIT.FILES_PER_UPLOAD} \`file\` parts and one \`meta\` JSON part, \`[{ apps: [App], alt, access? }]\` in file order, at least one App each, each App once, private when \`access\` is left out. JPEG, PNG, WebP, AVIF or HEIC in; each file is stored as AVIF with a blur placeholder. Limits: ${LIMIT.FILE_BYTES / UNIT.BYTES_PER_MIB} MiB a file, ${LIMIT.UPLOAD.BYTES / UNIT.BYTES_PER_MIB} MiB a request, ${LIMIT.INPUT.MEGAPIXELS} megapixels, ${LIMIT.UPLOAD.TIMEOUT_MS / UNIT.MS_PER_MINUTE} minutes. All or nothing: one bad file rejects the batch.`,
      RESPONSE: { [HTTP.STATUS.CREATED]: "The new Images, in file order" },
      SUMMARY: "Upload Images",
    },
  },
  /**
   * The codes only this module throws, beside the standard ones it throws
   * from core's `ERROR.CODE` (ADR 0015). A host spreads them into its own
   * codes, so a new one fails the host's build until it has a message.
   */
  ERROR_CODE: {
    /** Made public by another request while this one was turning it private. */
    IMAGE_CHANGED: "IMAGE_CHANGED",
    IMAGE_TOO_LARGE: "IMAGE_TOO_LARGE",
    UNSUPPORTED_IMAGE: "UNSUPPORTED_IMAGE",
  },
  /**
   * An Export (ADR 0036): the metadata-free JPEG made from an Image on
   * request, never stored and never a link.
   */
  EXPORT: {
    /** What a see-through picture is laid on: JPEG has no transparency. */
    BACKGROUND: "#ffffff",
    CONTENT_TYPE: "image/jpeg",
    /** What the docs say about the Export route; the limit in the text is the default (env sets the enforced one). */
    DOC: {
      DESCRIPTION: `Signed in, even for a public Image: a visitor cannot make the server decode a picture. The Image must be visible to the User; any other answers 404, not 403, so its id stays hidden. The answer is a JPEG made on request, with no location or camera data, sent as an \`attachment\` named by the Image's UTC creation date and the start of its id; it is never stored and never a link. By default at most ${EXPORT_RATE_LIMIT.MAX} requests a minute per signed-in User.`,
      RESPONSE: { [HTTP.STATUS.OK]: "The picture as a JPEG file" },
      SUMMARY: "Export an Image as a JPEG",
    },
    EXTENSION: "jpg",
    /** How many characters of an Image's id its Export's name keeps. */
    ID_CHARS: 8,
    /** Named so the look is a decision: JPEG 90 is near-lossless for photos. */
    QUALITY: 90,
    /**
     * A decode costs the server, so an Export has a bucket of its own, on top
     * of the host's global one. The size and window are env
     * (`STORAGE_EXPORT_RATE_LIMIT_*`); these are the defaults.
     */
    RATE_LIMIT: {
      DEFAULT: EXPORT_RATE_LIMIT,
    },
  },
  /**
   * How every Image is stored: AVIF, about half the size of WebP at the same
   * look. Each object keeps the type it was written with, so Images stored
   * earlier as WebP still serve as WebP.
   */
  FORMAT: {
    CONTENT_TYPE: "image/avif",
    EXTENSION: ".avif",
    /**
     * The stored file is the optimizer's source, so it keeps near-full
     * quality: AVIF 64 looks like JPEG 80, at roughly a third of WebP 90's size.
     */
    QUALITY: 64,
  },
  /**
   * What a picture may come in as, for a file input's `accept`: every format
   * the upload decodes (JPEG, PNG, WebP, AVIF, HEIC). HEIC also by its
   * extensions, since a browser often gives an iPhone's file no type.
   */
  INPUT_ACCEPT:
    "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif",
  LIMIT,
  /**
   * The stable `event` field of an Image's failure log lines, what a log
   * viewer filters on.
   */
  LOG_EVENT: {
    CLEANUP_FAILED: "image.cleanup_failed",
    OBJECT_DELETE_FAILED: "image.object_delete_failed",
    PUBLIC_FILE_LEFT: "image.public_file_left",
  },
  LOG_MESSAGE: {
    CLEANUP_FAILED: "image cleanup failed",
    OBJECT_DELETE_FAILED: "image object delete failed",
    /** The old file of an Image made private: its public links still answer
     *  until it is deleted, so this one is deleted by hand. */
    PUBLIC_FILE_LEFT: "public image file left behind after making it private",
  },
  /** The tag the Image module's routes appear under. */
  OPENAPI_TAG: "Image",
  /** How an Images list's `search` reads (ADR 0026). */
  SEARCH,
  /** How an Images list's `sort` reads (ADR 0031). */
  SORT,
  /** Context keys the Image module sets. */
  VAR: {
    /** The upload's time budget, as an `AbortSignal`. */
    UPLOAD_BUDGET: "uploadBudget",
  },
} as const;
