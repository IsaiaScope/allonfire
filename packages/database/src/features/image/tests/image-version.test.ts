// @module-tag unit
import { App, ImageAccess } from "../../../../generated/prisma/enums";
import { imageVersion, type VersionedImage } from "../utils/image-version";

const IMAGE: VersionedImage = {
  access: ImageAccess.PRIVATE,
  alt: { en: "The sea", it: "Il mare" },
  apps: [App.LAURA, App.BACK_OFFICE],
  updatedAt: new Date("2026-11-02T10:00:00.000Z"),
};

describe("imageVersion", () => {
  it("changes when updatedAt, access, either alt or the Apps change, and not when the Apps only change order", () => {
    const opened = imageVersion(IMAGE);
    const changes: VersionedImage[] = [
      { ...IMAGE, updatedAt: new Date("2026-11-02T10:00:00.001Z") },
      { ...IMAGE, access: ImageAccess.PUBLIC },
      { ...IMAGE, alt: { ...IMAGE.alt, en: "The bay" } },
      { ...IMAGE, alt: { ...IMAGE.alt, it: "La baia" } },
      { ...IMAGE, apps: [App.LAURA] },
    ];
    for (const changed of changes) {
      expect(imageVersion(changed)).not.toBe(opened);
    }
    expect(imageVersion({ ...IMAGE, apps: [App.BACK_OFFICE, App.LAURA] })).toBe(
      opened
    );
  });

  it("tells an alt moved between Languages from the same texts", () => {
    expect(
      imageVersion({ ...IMAGE, alt: { en: "Il mare", it: "The sea" } })
    ).not.toBe(imageVersion(IMAGE));
  });
});
