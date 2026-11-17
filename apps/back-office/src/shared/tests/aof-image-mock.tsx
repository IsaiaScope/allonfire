/**
 * ui's `aof-image` module (`@allonfire/ui/shared/components/aof-image`) as a
 * test renders it:
 * `vi.mock("@allonfire/ui/shared/components/aof-image", () => import("@/shared/tests/aof-image-mock"))`.
 */
import { ImageMock } from "./image-mock";

export const AOFImage = ImageMock;

/** A stored Image as the image server draws it: a mark with its alt. */
export const AOFStorageImage = ({
  image,
}: {
  image: { alt: { en: string } };
}) => <span data-alt={image.alt.en} data-testid="picture" />;
