// @module-tag integration

import { ImageAccess } from "@allonfire/database/enums";
import { page } from "vitest/browser";
import { FORM_WIDTHS, heightAtIn } from "../../../../shared/tests/height-at";
import { renderInUi } from "../../../../shared/tests/render-in-ui";
import { AOFAddImages } from "../components/aof-add-images";
import { AOFAddImagesSkeleton } from "../components/aof-add-images-skeleton";
import type { AOFAddImagesApps } from "../types/add-images-dressing";
import {
  STUB_DRESSING_FULL,
  STUB_FIXED,
  STUB_OPTIONS,
} from "./add-images-stub";
import { uploadCopy } from "./image-upload-copy";

vi.mock("@allonfire/core/features/next/i18n/utils/aof-base-navigation", () => ({
  aofBaseNavigation: { useRouter: () => ({ replace: vi.fn() }) },
}));

const TITLE = "Add pictures";
const LOADING = "Loading the form";
const LABELS = {
  added: (count: number) => `${count} added`,
  submit: "Save them",
  submitting: "Saving",
  title: TITLE,
} as const;
const KINDS = [
  ["two Apps to choose among", STUB_OPTIONS, undefined],
  ["Apps fixed", STUB_FIXED, undefined],
  ["Apps and access fixed", STUB_FIXED, ImageAccess.PRIVATE],
] as const satisfies readonly (readonly [
  string,
  AOFAddImagesApps,
  ImageAccess | undefined,
])[];

const refreshNothing = () => Promise.resolve();
const noAction = () => Promise.resolve({});

const real = (apps: AOFAddImagesApps, access?: ImageAccess) => (
  <AOFAddImages
    access={access}
    action={noAction}
    apps={apps}
    dressing={STUB_DRESSING_FULL}
    labels={LABELS}
    list="/gallery"
    refresh={refreshNothing}
  />
);
const skeleton = (apps: AOFAddImagesApps, access?: ImageAccess) => (
  <AOFAddImagesSkeleton
    access={access}
    apps={apps}
    dressing={STUB_DRESSING_FULL}
    loading={LOADING}
    title={TITLE}
  />
);

describe("AOFAddImagesSkeleton", () => {
  describe.each(KINDS)("with %s", (_, apps, access) => {
    it.each(FORM_WIDTHS)(
      "is as tall as the empty form on %s, so nothing moves when it arrives",
      async (__, width) => {
        const form = await heightAtIn({
          messages: {},
          view: real(apps, access),
          width,
        });
        await expect
          .element(page.getByText(uploadCopy("pick.none")))
          .toBeVisible();
        const waiting = await heightAtIn({
          messages: {},
          view: skeleton(apps, access),
          width,
        });
        expect(waiting).toBeCloseTo(form ?? 0, 0);
      }
    );
  });

  it("says it is loading, without its parts being read", async () => {
    await renderInUi({ children: skeleton(STUB_OPTIONS), messages: {} });
    await expect.element(page.getByRole("status")).toHaveTextContent(LOADING);
    expect(document.querySelector('[data-skeleton="form"]')).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });
});
