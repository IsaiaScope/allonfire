// @module-tag unit
import {
  deleteImageObjects,
  putImageObject,
} from "../../image/objects/image-objects";
import { deleteAvatarsWith, saveAvatar } from "../objects/avatar-objects";
import { prepareAvatar } from "../prepare-avatar";
import { avatarKey } from "../utils/avatar-key";

vi.mock("../../image/objects/image-objects", () => ({
  deleteImageObjects: vi.fn(() => Promise.resolve()),
  putImageObject: vi.fn(() => Promise.resolve()),
}));

vi.mock("../prepare-avatar", () => ({
  prepareAvatar: vi.fn(() =>
    Promise.resolve({ blurDataUrl: BLUR, buffer: Buffer.from("avif") })
  ),
}));

const PROVIDER_PICTURE = "https://lh3.googleusercontent.com/a/x";
const BLUR = "data:image/webp;base64,AAAA";
const AVATAR_OF_U1 = /^avatar-u1-[0-9a-f-]{36}\.avif$/;

describe("saveAvatar", () => {
  it("stores the prepared file under a new name and answers the name with its blur", async () => {
    const picture = await saveAvatar("u1", Buffer.from("photo"));
    expect(picture).toEqual({
      image: expect.stringMatching(AVATAR_OF_U1),
      imageBlurDataUrl: BLUR,
    });
    expect(putImageObject).toHaveBeenCalledWith(
      picture.image,
      Buffer.from("avif")
    );
    expect(prepareAvatar).toHaveBeenCalledOnce();
  });
});

describe("deleteAvatarsWith", () => {
  beforeEach(() => {
    vi.mocked(deleteImageObjects).mockClear();
  });

  it("deletes only our own Avatars' files", async () => {
    const ours = avatarKey("u1");
    await deleteAvatarsWith({ warn: vi.fn() })([ours, null, PROVIDER_PICTURE]);
    expect(deleteImageObjects).toHaveBeenCalledWith([ours]);
  });

  it("asks nothing when none of them is ours", async () => {
    await deleteAvatarsWith({ warn: vi.fn() })([null, PROVIDER_PICTURE]);
    expect(deleteImageObjects).not.toHaveBeenCalled();
  });

  it("never fails the change it follows: a file left behind is logged", async () => {
    vi.mocked(deleteImageObjects).mockRejectedValueOnce(
      new Error("storage down")
    );
    const warn = vi.fn();
    const ours = avatarKey("u1");
    await expect(deleteAvatarsWith({ warn })([ours])).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ keys: [ours] }),
      expect.any(String)
    );
  });
});
