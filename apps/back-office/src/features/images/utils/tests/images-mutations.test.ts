// @module-tag unit
import { QueryClient } from "@tanstack/react-query";
import { QUERY } from "@/shared/constants/query";
import { deleteImagesMutation, invalidateImages } from "../images-mutations";

vi.mock("../../actions/delete-images", () => ({
  deleteImages: vi.fn(() => Promise.resolve(1)),
}));

describe("deleteImagesMutation", () => {
  it("refreshes the Images and the Storage overview this browser holds", async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const settled = deleteImagesMutation.onSettled;
    await settled?.({ deleted: 1 }, null, ["image-1"], undefined, {
      client,
      meta: undefined,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: QUERY.IMAGES.ALL });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: QUERY.STORAGE.ALL });
  });
});

describe("invalidateImages", () => {
  it("invalidates the Images and the Storage keys", async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await invalidateImages(client);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: QUERY.IMAGES.ALL });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: QUERY.STORAGE.ALL });
  });
});
