// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { avatarRemoval } from "../utils/avatar-change";
import { AVATAR_FIELD, AvatarForm } from "./avatar-form";

/** A file input named as the field, its attributes in either order. */
const FILE_INPUT =
  /<input[^>]*type="file"[^>]*name="avatar"|<input[^>]*name="avatar"[^>]*type="file"/;

describe("AOFAvatarField", () => {
  const html = renderToStaticMarkup(<AvatarForm />);

  it("names itself and offers to choose a picture", () => {
    expect(html).toContain("Picture");
    expect(html).toContain(AVATAR_FIELD.LABELS.choose);
  });

  it("shows where to drop a picture and the formats it takes", () => {
    expect(html).toContain(AVATAR_FIELD.LABELS.drop);
    expect(html).toContain(AVATAR_FIELD.LABELS.formats);
  });

  it("holds a file input named as the field, so a post sends the picture", () => {
    expect(html).toMatch(FILE_INPUT);
  });

  it("posts through that input alone: the drop area's own posts nothing", () => {
    const fileInputs = html.match(/<input[^>]*type="file"[^>]*>/g) ?? [];
    expect(fileInputs).toHaveLength(2);
    expect(fileInputs.filter((input) => input.includes("name="))).toHaveLength(
      1
    );
  });
});

const CURRENT = "https://images.test/avatar-u-1.avif";
const REMOVED_INPUT = new RegExp(`name="${avatarRemoval("avatar").name}"`);

describe("AOFAvatarField with a current picture", () => {
  it("draws the current picture while no file is picked", () => {
    const html = renderToStaticMarkup(<AvatarForm current={CURRENT} />);
    expect(html).toContain(CURRENT);
    expect(html).toContain(AVATAR_FIELD.LABELS.current);
    expect(html).toContain(AVATAR_FIELD.LABELS.change);
  });

  it("posts no removal while the current picture stays, nor without one", () => {
    expect(renderToStaticMarkup(<AvatarForm current={CURRENT} />)).not.toMatch(
      REMOVED_INPUT
    );
    expect(renderToStaticMarkup(<AvatarForm current={null} />)).not.toMatch(
      REMOVED_INPUT
    );
    expect(renderToStaticMarkup(<AvatarForm current={null} />)).not.toContain(
      AVATAR_FIELD.LABELS.current
    );
  });
});
