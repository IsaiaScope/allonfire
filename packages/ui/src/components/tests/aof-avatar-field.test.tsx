// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { useAOFForm } from "../../lib/form";

/** A file input named as the field, its attributes in either order. */
const FILE_INPUT =
  /<input[^>]*type="file"[^>]*name="avatar"|<input[^>]*name="avatar"[^>]*type="file"/;

const LABELS = {
  cancel: "Cancel",
  change: "Change",
  choose: "Choose a picture",
  cropAgain: "Crop again",
  dialogTitle: "Crop the picture",
  drop: "Drop your picture here",
  formats: "JPEG, PNG, WebP, AVIF or HEIC, up to 20 MB",
  preparing: "Preparing the picture",
  remove: "Remove the picture",
  tooLarge: "Too large",
  unreadable: "Unreadable",
  use: "Use",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
};

const NO_AVATAR: { avatar: File | null } = { avatar: null };

const AvatarForm = () => {
  const form = useAOFForm({ defaultValues: NO_AVATAR });
  return (
    <form.AppField name="avatar">
      {(field) => <field.AvatarField label="Picture" labels={LABELS} />}
    </form.AppField>
  );
};

describe("AOFAvatarField", () => {
  const html = renderToStaticMarkup(<AvatarForm />);

  it("names itself and offers to choose a picture", () => {
    expect(html).toContain("Picture");
    expect(html).toContain(LABELS.choose);
  });

  it("shows where to drop a picture and the formats it takes", () => {
    expect(html).toContain(LABELS.drop);
    expect(html).toContain(LABELS.formats);
  });

  it("draws its tile in the Design's corners, never round", () => {
    expect(html).toContain("rounded-lg");
    expect(html).not.toContain("rounded-full");
  });

  it("holds a file input named as the field, so a post sends the picture", () => {
    expect(html).toMatch(FILE_INPUT);
  });
});
