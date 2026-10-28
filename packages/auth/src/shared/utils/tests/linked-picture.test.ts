// @module-tag unit
import { linkedPicture } from "../linked-picture";

const BLUR = "data:image/webp;base64,AAAA";
const sign = (image: string | null) => image && `signed:${image}`;

describe("linkedPicture", () => {
  it("answers a stored picture as its link, with its blur", () => {
    expect(
      linkedPicture({ image: "avatar-u.avif", imageBlurDataUrl: BLUR }, sign)
    ).toEqual({ image: "signed:avatar-u.avif", imageBlurDataUrl: BLUR });
  });

  it("answers no blur beside a picture it cannot link", () => {
    expect(
      linkedPicture(
        { image: "/old/path.avif", imageBlurDataUrl: BLUR },
        () => null
      )
    ).toEqual({ image: null, imageBlurDataUrl: null });
  });

  it("answers a provider's picture as it is, with no blur", () => {
    const google = "https://lh3.googleusercontent.com/a/x";
    expect(
      linkedPicture({ image: google, imageBlurDataUrl: null }, (image) => image)
    ).toEqual({ image: google, imageBlurDataUrl: null });
  });
});
