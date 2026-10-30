// @module-tag unit
import { avatarChangeOf, avatarRemoval } from "../avatar-change";

const NAME = "avatar";
const PICTURE = new File(["square"], "avatar.webp", { type: "image/webp" });

/** A form posted as the field posts it. */
const posted = (entries: {
  file?: File | undefined;
  removed?: boolean | undefined;
}) => {
  const form = new FormData();
  form.set(NAME, entries.file ?? new File([], ""));
  if (entries.removed) {
    const { name, value } = avatarRemoval(NAME);
    form.set(name, value);
  }
  return form;
};

describe("avatarChangeOf", () => {
  it("reads a new picture", () => {
    expect(avatarChangeOf(posted({ file: PICTURE }), NAME)).toEqual({
      file: PICTURE,
      kind: "picture",
    });
  });

  it("reads the current picture removed", () => {
    expect(avatarChangeOf(posted({ removed: true }), NAME)).toEqual({
      kind: "removed",
    });
  });

  it("reads an empty file input, as a browser posts it, as no change", () => {
    expect(avatarChangeOf(posted({}), NAME)).toEqual({ kind: "unchanged" });
    expect(avatarChangeOf(new FormData(), NAME)).toEqual({
      kind: "unchanged",
    });
  });

  it("lets a new picture win over a removal, as the field never posts both", () => {
    expect(
      avatarChangeOf(posted({ file: PICTURE, removed: true }), NAME).kind
    ).toBe("picture");
  });

  it("names the removal after the field, so two fields never share it", () => {
    expect(avatarRemoval(NAME).name).not.toBe(avatarRemoval("logo").name);
  });
});
