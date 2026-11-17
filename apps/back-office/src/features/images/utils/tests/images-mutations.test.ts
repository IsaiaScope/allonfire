// @module-tag unit
import { QueryClient } from "@tanstack/react-query";
import { QUERY } from "@/shared/constants/query";
import { IMAGES_PAGE } from "@/shared/tests/msw/handlers";
import { deleteImages } from "../../actions/delete-images";
import { IMAGES } from "../../constants/images";
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

describe("deleteImagesMutation, before the API answers", () => {
  const PARAMS = { [IMAGES.PARAM.PER_PAGE]: 10 };
  const MORE = { ...IMAGES_PAGE, pageCount: 2, total: 12 };
  const NAMED = IMAGES_PAGE.images[0]?.id ?? "";
  const run = (queryClient: QueryClient) =>
    queryClient
      .getMutationCache()
      .build(queryClient, deleteImagesMutation)
      .execute([NAMED]);

  it("takes the named rows out of the cached pages", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(QUERY.IMAGES.PAGE(PARAMS), MORE);
    await run(queryClient);
    expect(
      queryClient.getQueryData<typeof MORE>(QUERY.IMAGES.PAGE(PARAMS))?.total
    ).toBe(11);
  });

  it("puts them back when the API refuses", async () => {
    vi.mocked(deleteImages).mockResolvedValueOnce(null);
    const queryClient = new QueryClient();
    queryClient.setQueryData(QUERY.IMAGES.PAGE(PARAMS), MORE);
    await run(queryClient).catch(() => undefined);
    expect(queryClient.getQueryData(QUERY.IMAGES.PAGE(PARAMS))).toEqual(MORE);
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
