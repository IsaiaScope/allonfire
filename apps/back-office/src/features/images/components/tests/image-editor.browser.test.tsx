// @module-tag integration

import { worker } from "@allonfire/config/tests/browser/msw";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { App } from "@allonfire/database/enums";
import { HttpResponse, http } from "msw";
import { notFound } from "next/navigation";
import { page } from "vitest/browser";
import { IMAGES_PAGE, IMAGES_URL } from "@/shared/tests/msw/handlers";
import { renderInApp } from "@/shared/tests/render-in-app";
import { appToggle } from "../../tests/app-toggle";
import { ImageEditor } from "../image-editor";

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("../../actions/edit-image", () => ({ editImage: vi.fn() }));
vi.mock("../../actions/delete-images", () => ({ deleteImages: vi.fn() }));
vi.mock(
  "@/features/i18n/navigation",
  () => import("../../tests/image-form-mocks")
);
// jscpd:ignore-start
// A stored Image is drawn through the image server: here, a tile the picture's size.
vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@/shared/tests/image-mock")).ImageMock,
  AOFStorageImage: ({ className }: { className?: string }) => (
    <span className={className} data-testid="picture" />
  ),
}));
// jscpd:ignore-end

const ENGLISH_ALT = /English/;
const [SEA] = IMAGES_PAGE.images;
const ID = SEA?.id ?? "";

beforeEach(() => {
  vi.mocked(notFound).mockClear();
});

describe("ImageEditor", () => {
  it("reads the Image from the API and opens the form on it", async () => {
    worker.use(http.get(`${IMAGES_URL}/${ID}`, () => HttpResponse.json(SEA)));
    renderInApp({
      children: <ImageEditor administered={[]} id={ID} />,
    });
    await expect
      .element(page.getByRole("textbox", { name: ENGLISH_ALT }))
      .toHaveValue("The sea");
  });

  it("offers the Apps the visitor administers beside the ones the Image is in", async () => {
    worker.use(http.get(`${IMAGES_URL}/${ID}`, () => HttpResponse.json(SEA)));
    renderInApp({
      children: <ImageEditor administered={[App.LAURA]} id={ID} />,
    });
    await expect.element(appToggle(page, App.BACK_OFFICE)).toBeVisible();
    await expect.element(appToggle(page, App.LAURA)).toBeVisible();
  });

  it("is the 404 for an Image the API does not know", async () => {
    worker.use(
      http.get(`${IMAGES_URL}/${ID}`, () =>
        HttpResponse.json({}, { status: HTTP.STATUS.NOT_FOUND })
      )
    );
    renderInApp({
      children: <ImageEditor administered={[]} id={ID} />,
    });
    await vi.waitFor(() => expect(notFound).toHaveBeenCalled());
  });
});
