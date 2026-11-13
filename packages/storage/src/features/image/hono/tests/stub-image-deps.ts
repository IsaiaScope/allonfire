import { moduleTestHost } from "@allonfire/auth/shared/tests/test-host";
import type { AuthSession } from "@allonfire/auth/shared/types/auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { App, ImageAccess } from "@allonfire/database/enums";
import type { ImageRecord } from "@allonfire/database/features/image/image.service";
import { STORAGE } from "../../../../shared/constants/paths";
import { IMAGE } from "../../constants/image";
import { imageRoutes } from "../routes/index";
import type { ImageDeps } from "../utils/deps";

/** An alt in both languages. */
export const ALT = { en: "The sea", it: "Il mare" };

/** The Version every stored Image answers, and so every change carries. */
export const VERSION = "version-1";

/** What `prepare` hands back for any file. */
export const PREPARED = {
  blurDataUrl: `${IMAGE.BLUR.DATA_URL_PREFIX}AAAA`,
  buffer: Buffer.from("webp"),
  bytes: 4,
  height: 600,
  width: 800,
};

const unexpected = (name: string) => () =>
  Promise.reject(new Error(`${name} must not be called`));

/** An Image as the service returns it; override what the test is about. */
export const imageRecord = ({
  access = ImageAccess.PRIVATE,
  ...overrides
}: Partial<Omit<ImageRecord, "access">> & {
  /** Left out, or as a new Image leaves it: private. */
  access?: ImageAccess | undefined;
} = {}): ImageRecord => ({
  access,
  alt: ALT,
  apps: [App.LAURA],
  blurDataUrl: PREPARED.blurDataUrl,
  bytes: 1000,
  createdAt: new Date("2026-10-01T10:00:00.000Z"),
  height: 600,
  id: "image-1",
  key: "0b9a0c3e-0000-4000-8000-000000000001.webp",
  updatedAt: new Date("2026-10-01T10:00:00.000Z"),
  uploadedBy: "user-1",
  version: VERSION,
  width: 800,
  ...overrides,
});

/** What `listImagesPage` is asked for a request that enters no App: the first default page of `app`. */
export const publicListQuery = (app: App) => ({
  app,
  enterable: [],
  page: 1,
  perPage: IMAGE.LIMIT.LIST.DEFAULT,
});

/** Every dependency fails loudly unless the test supplies it. */
export const stubImageDeps = (
  overrides: Partial<ImageDeps> = {}
): ImageDeps => ({
  changed: () => Promise.resolve(),
  copyObject: unexpected("copyObject"),
  createImages: unexpected("createImages"),
  deleteImages: unexpected("deleteImages"),
  deleteObjects: unexpected("deleteObjects"),
  getImage: unexpected("getImage"),
  listImagesPage: unexpected("listImagesPage"),
  log: { warn: () => undefined },
  prepare: unexpected("prepare"),
  putObject: unexpected("putObject"),
  removeImagesFromApp: unexpected("removeImagesFromApp"),
  updateImages: unexpected("updateImages"),
  ...overrides,
});

/** The Image module on auth's `moduleTestHost`, at `STORAGE.PATH.IMAGES`, its deps stubbed but `images`. */
export const imageHost = (
  session: AuthSession | null,
  images: Partial<ImageDeps> = {}
) =>
  moduleTestHost({
    path: STORAGE.PATH.IMAGES,
    routes: imageRoutes(stubImageDeps(images)),
    session,
  });

/** What an upload sends beside its files; one meta entry per file unless `metaCount` says. */
type UploadOptions = {
  access?: ImageAccess;
  apps?: App[];
  metaCount?: number;
  size?: number;
};

/** A multipart upload of `count` files, each with `ALT`, in Laura unless `apps` says. */
export const upload = (
  count: number,
  {
    access,
    apps = [App.LAURA],
    metaCount = count,
    size = 10,
  }: UploadOptions = {}
) => {
  const form = new FormData();
  for (let index = 0; index < count; index += 1) {
    form.append("file", new File([new Uint8Array(size)], `${index}.jpg`));
  }
  form.append(
    "meta",
    stringifyJson(
      Array.from({ length: metaCount }, () => ({
        alt: ALT,
        apps,
        ...(access && { access }),
      }))
    )
  );
  return { body: form, method: HTTP.METHOD.POST };
};
