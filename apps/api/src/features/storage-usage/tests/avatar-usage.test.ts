// @module-tag unit
import { App } from "@allonfire/database/enums";
import { avatarsByApp, createAvatarReader } from "../utils/avatar-usage";

const FILE_A = "avatar-userA-11111111-1111-4111-8111-111111111111.avif";
const FILE_B = "avatar-userB-22222222-2222-4222-8222-222222222222.avif";
const SIZES = [
  { bytes: 100, key: FILE_A },
  { bytes: 40, key: FILE_B },
];

describe("avatarsByApp", () => {
  it("counts an Avatar's bytes in every App its owner is in", () => {
    expect(
      avatarsByApp(
        [
          { apps: [App.LAURA, App.BACK_OFFICE], image: FILE_A },
          { apps: [App.LAURA], image: FILE_B },
        ],
        SIZES
      )
    ).toEqual([
      { app: App.LAURA, bytes: 140, count: 2 },
      { app: App.BACK_OFFICE, bytes: 100, count: 1 },
    ]);
  });

  it("leaves out a provider's picture, a file not in the bucket and an owner in no App", () => {
    expect(
      avatarsByApp(
        [
          { apps: [App.LAURA], image: "https://cdn.test/picture.png" },
          {
            apps: [App.LAURA],
            image: "avatar-userC-11111111-1111-4111-8111-111111111111.avif",
          },
          { apps: [], image: FILE_A },
        ],
        SIZES
      )
    ).toEqual([]);
  });
});

describe("createAvatarReader", () => {
  const OWNERS = [{ apps: [App.LAURA], image: FILE_A }];

  it("joins the owners with the listed files", async () => {
    const read = createAvatarReader({
      logger: { warn: vi.fn() },
      owners: () => Promise.resolve(OWNERS),
      sizes: () => Promise.resolve(SIZES),
    });
    expect(await read()).toEqual([{ app: App.LAURA, bytes: 100, count: 1 }]);
  });

  it.each([
    [
      "the owners cannot be read",
      {
        owners: () => Promise.reject(new Error("db down")),
        sizes: () => Promise.resolve(SIZES),
      },
    ],
    [
      "the bucket cannot be listed",
      {
        owners: () => Promise.resolve(OWNERS),
        sizes: () => Promise.reject(new Error("s3 down")),
      },
    ],
  ])("answers none and logs when %s, never throws", async (_, deps) => {
    const warn = vi.fn();
    const read = createAvatarReader({ ...deps, logger: { warn } });
    expect(await read()).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
  });
});
