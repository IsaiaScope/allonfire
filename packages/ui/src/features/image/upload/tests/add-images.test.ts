// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { parseJson } from "@allonfire/core/shared/utils/json";
import { App, ImageAccess } from "@allonfire/database/enums";
import { z } from "zod";
import { IMAGE } from "../../constants/image";
import { addImages } from "../utils/add-images";
import { imageNames, rowPrefix } from "../utils/image-form-data";

const formOf = (count: number, app: App = App.BACK_OFFICE) => {
  const form = new FormData();
  for (const index of Array.from({ length: count }, (_, at) => at)) {
    const names = imageNames(rowPrefix(index));
    const parts = [
      [names.apps, app],
      [names.access, ImageAccess.PRIVATE],
      [names.alt("en"), `en ${index}`],
      [names.alt("it"), `it ${index}`],
      [names.file, new File(["x"], `p${index}.jpg`, { type: "image/jpeg" })],
    ] as const;
    for (const [name, value] of parts) {
      form.append(name, value);
    }
  }
  return form;
};

const created = (count: number) =>
  new Response(
    JSON.stringify(Array.from({ length: count }, (_, id) => ({ id }))),
    { status: HTTP.STATUS.CREATED }
  );

const metaSchema = z.array(z.object({ apps: z.array(z.string()) }));

type Upload = { file: File[]; meta: string };
/** A `post` that answers `response` and remembers what it was sent. */
const posting = (response: Response) =>
  vi.fn((_upload: Upload) => Promise.resolve(response));

describe("addImages", () => {
  it("posts one meta entry per file in order and answers how many were added", async () => {
    const post = posting(created(2));
    const state = await addImages({
      form: formOf(2),
      post,
      refusalOf: vi.fn(),
    });
    expect(state).toEqual({ added: 2, notice: IMAGE.UPLOAD.NOTICE.ADDED });
    const upload = post.mock.calls[0]?.[0];
    expect(upload?.file.map(({ name }) => name)).toEqual(["p0.jpg", "p1.jpg"]);
    expect(metaSchema.parse(parseJson(upload?.meta ?? "[]"))).toHaveLength(2);
  });

  it("places every Image where it is told, whatever the form posted", async () => {
    const post = posting(created(1));
    await addImages({
      apps: [App.LAURA],
      form: formOf(1, App.BACK_OFFICE),
      post,
      refusalOf: vi.fn(),
    });
    const upload = post.mock.calls[0]?.[0];
    expect(metaSchema.parse(parseJson(upload?.meta ?? "[]"))[0]?.apps).toEqual([
      App.LAURA,
    ]);
  });

  it("gives every Image the access it is told, whatever the form posted", async () => {
    const post = posting(created(1));
    const form = formOf(1);
    form.set(imageNames(rowPrefix(0)).access, ImageAccess.PUBLIC);
    await addImages({
      access: ImageAccess.PRIVATE,
      form,
      post,
      refusalOf: vi.fn(),
    });
    const upload = post.mock.calls[0]?.[0];
    expect(
      z
        .array(z.object({ access: z.string() }))
        .parse(parseJson(upload?.meta ?? "[]"))[0]?.access
    ).toBe(ImageAccess.PRIVATE);
  });

  it("answers invalid, and posts nothing, when no file was picked", async () => {
    const post = vi.fn();
    const state = await addImages({
      form: new FormData(),
      post,
      refusalOf: vi.fn(),
    });
    expect(state).toEqual({ error: IMAGE.UPLOAD.ERROR.INVALID });
    expect(post).not.toHaveBeenCalled();
  });

  it("answers what the refusal says when the API does not create", async () => {
    const refusal = new Response(null, {
      status: HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE,
    });
    const refusalOf = vi.fn(() =>
      Promise.resolve(IMAGE.UPLOAD.ERROR.UNSUPPORTED)
    );
    const state = await addImages({
      form: formOf(1),
      post: () => Promise.resolve(refusal),
      refusalOf,
    });
    expect(state).toEqual({ error: IMAGE.UPLOAD.ERROR.UNSUPPORTED });
    expect(refusalOf).toHaveBeenCalledWith(refusal, IMAGE.UPLOAD.REFUSAL);
  });

  it("does not catch a post that throws: the action's caller decides", async () => {
    await expect(
      addImages({
        form: formOf(1),
        post: () => Promise.reject(new Error("offline")),
        refusalOf: vi.fn(),
      })
    ).rejects.toThrow("offline");
  });
});
