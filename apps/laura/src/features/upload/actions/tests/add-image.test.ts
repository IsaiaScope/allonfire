// @module-tag unit
// jscpd:ignore-start
// The Back Office's twin: the same suite over its own App's words and files. Imports and hoisted mocks.
import {
  FAKE_API,
  resetFakeApi,
} from "@allonfire/core/features/next/api/tests/fake-api";
import { parseJson } from "@allonfire/core/shared/utils/json";
import { App, ImageAccess } from "@allonfire/database/enums";
import { IMAGE } from "@allonfire/ui/features/image/constants/image";
import {
  created,
  imageFormOf,
  REFUSALS,
  refused,
} from "@allonfire/ui/features/image/upload/tests/add-image-answers";
import { updateTag } from "next/cache";
import { GALLERY } from "@/features/gallery/constants/gallery";
import { addImage } from "../add-image";

vi.mock(
  "@/features/api/utils/server-api",
  () => import("@/features/api/tests/fake-api")
);
vi.mock(
  "next/cache",
  () => import("@allonfire/ui/shared/tests/next-cache-mock")
);
// jscpd:ignore-end

/** Rows as Laura's form posts them: no Apps toggle and no Access, so neither unless a test adds one. */
const formOf = (
  count: number,
  apps: readonly App[] = [],
  access?: ImageAccess
) => imageFormOf(count, { ...(access && { access }), apps });
const metaOf = () => {
  const body = FAKE_API.sent[0]?.body;
  return parseJson<{ access: string; apps: string[] }[]>(
    typeof body === "object" && body !== null && "meta" in body
      ? String(body.meta)
      : ""
  );
};
beforeEach(() => {
  resetFakeApi();
  vi.mocked(updateTag).mockClear();
});

describe("addImage", () => {
  it("places every Image in Laura whatever the browser posted", async () => {
    created(1);
    await addImage({}, formOf(1, [App.BACK_OFFICE]));
    expect(metaOf()).toEqual([expect.objectContaining({ apps: [App.LAURA] })]);
  });

  it("makes every Image private whatever the browser posted, and when it posted none", async () => {
    created(2);
    await addImage({}, formOf(1, [], ImageAccess.PUBLIC));
    expect(metaOf().map(({ access }) => access)).toEqual([ImageAccess.PRIVATE]);
    FAKE_API.sent.length = 0;
    await addImage({}, formOf(1));
    expect(metaOf().map(({ access }) => access)).toEqual([ImageAccess.PRIVATE]);
  });

  it("posts and succeeds when the form names no App at all", async () => {
    created(2);
    expect(await addImage({}, formOf(2))).toEqual({
      added: 2,
      notice: IMAGE.UPLOAD.NOTICE.ADDED,
    });
    expect(metaOf().map(({ apps }) => apps)).toEqual([
      [App.LAURA],
      [App.LAURA],
    ]);
  });

  it("updates the Gallery tag once after a save, and no other", async () => {
    created(1);
    await addImage({}, formOf(1));
    expect(vi.mocked(updateTag).mock.calls).toEqual([[GALLERY.CACHE.TAG]]);
  });

  // jscpd:ignore-start
  // The Back Office's twin: the same suite over its own App's words and files.
  it("sends nothing when the form holds no file", async () => {
    expect(await addImage({}, new FormData())).toEqual({
      error: IMAGE.UPLOAD.ERROR.INVALID,
    });
    expect(FAKE_API.sent).toEqual([]);
  });

  it.each(REFUSALS)(
    "answers %s as %s and updates no tag",
    async (status, code, error) => {
      refused(status, code);
      expect(await addImage({}, formOf(1))).toEqual({ error });
      expect(updateTag).not.toHaveBeenCalled();
    }
  );
  // jscpd:ignore-end
});
