// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { updateTag } from "next/cache";
import { FAKE_API, resetFakeApi } from "@/features/api/tests/fake-api";
import { STORAGE } from "@/features/storage/constants/storage";
import { IMAGES } from "../../constants/images";
import { deleteImages } from "../delete-images";

const IDS = ["image-1", "image-2"];

vi.mock(
  "@/features/api/utils/server-api",
  () => import("@/features/api/tests/fake-api")
);
vi.mock("next/cache", () => import("@/shared/tests/next-cache-mock"));

beforeEach(() => {
  resetFakeApi();
  vi.mocked(updateTag).mockClear();
});

const answeredDeleted = (deleted: number) =>
  FAKE_API.answers.set(HTTP.METHOD.DELETE, {
    body: { deleted },
    status: HTTP.STATUS.OK,
  });

describe("deleteImages", () => {
  it("sends the ids, answers how many went and updates the Images and Storage tags", async () => {
    answeredDeleted(IDS.length);
    expect(await deleteImages(IDS)).toBe(IDS.length);
    expect(FAKE_API.sent[0]?.body).toEqual({ ids: IDS });
    expect(updateTag).toHaveBeenCalledWith(IMAGES.CACHE.TAG);
    expect(updateTag).toHaveBeenCalledWith(STORAGE.CACHE.TAG);
  });

  it("answers fewer, and still clears the kept copies, when another Admin deleted some already", async () => {
    answeredDeleted(0);
    expect(await deleteImages(IDS)).toBe(0);
    expect(updateTag).toHaveBeenCalledWith(IMAGES.CACHE.TAG);
    expect(updateTag).toHaveBeenCalledWith(STORAGE.CACHE.TAG);
  });

  it("updates no tag and answers null when the API refuses", async () => {
    FAKE_API.answers.set(HTTP.METHOD.DELETE, {
      status: HTTP.STATUS.FORBIDDEN,
    });
    expect(await deleteImages(IDS)).toBeNull();
    expect(updateTag).not.toHaveBeenCalled();
  });
});
