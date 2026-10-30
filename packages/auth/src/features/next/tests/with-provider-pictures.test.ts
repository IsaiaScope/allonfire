// @module-tag unit
import { UNIT } from "@allonfire/core/shared/constants/units";
import { AUTH } from "../../../shared/constants/auth";
import { withProviderPictures } from "../utils/with-provider-pictures";

const OWN_LOCAL = { pathname: "/brand/**" };
const OWN_REMOTE = { hostname: "example.com", protocol: "https" } as const;

describe("withProviderPictures", () => {
  it("lets next/image optimize each sign-in provider's picture, over https only", () => {
    expect(withProviderPictures({}).images?.remotePatterns).toEqual(
      AUTH.PICTURE_HOSTS.map((hostname) => ({ hostname, protocol: "https" }))
    );
  });

  it("adds to the App's own image options, never replacing them", () => {
    const { images } = withProviderPictures({
      images: { localPatterns: [OWN_LOCAL], remotePatterns: [OWN_REMOTE] },
    });
    expect(images?.localPatterns).toEqual([OWN_LOCAL]);
    expect(images?.remotePatterns).toContainEqual(OWN_REMOTE);
    expect(images?.remotePatterns).toHaveLength(AUTH.PICTURE_HOSTS.length + 1);
  });

  it("serves them as AVIF or WebP, kept a year, unless the App says otherwise", () => {
    const { images } = withProviderPictures({});
    expect(images?.formats).toEqual(["image/avif", "image/webp"]);
    expect(images?.minimumCacheTTL).toBe(
      UNIT.DAYS_PER_YEAR * UNIT.SECONDS_PER_DAY
    );
    expect(
      withProviderPictures({ images: { minimumCacheTTL: 60 } }).images
        ?.minimumCacheTTL
    ).toBe(60);
  });
});
