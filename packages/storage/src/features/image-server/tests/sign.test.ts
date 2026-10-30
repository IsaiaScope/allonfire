// @module-tag unit
import { env } from "../../../environment/environment";
import { IMAGE_SERVER } from "../constants/image-server";
import {
  pictureLink,
  pictureSrcSet,
  privateLinkExpiry,
  signPath,
} from "../sign";

// docs.imgproxy.net/usage/signing_url: key "secret", salt "hello", hex.
const DOCS = {
  key: "736563726574",
  path: "/rs:fill:300:400:0/g:sm/aHR0cDovL2V4YW1w/bGUuY29tL2ltYWdl/cy9jdXJpb3NpdHku/anBn.png",
  salt: "68656C6C6F",
  signature: "oKfUtW34Dvo2BGQehJFR4Nr0_rIjOtdtzJ3QFsUcXH8",
};
const KEY = "photo.avif";
const SIGNATURE = /^[\w-]{43}$/;
const SIGNED_640 =
  /^http:\/\/localhost:9010\/image\/[\w-]{43}\/rs:fit:640:0\/plain\/s3:\/\/image\/photo\.avif$/;
const IN_AN_HOUR = new Date("2026-10-28T12:00:00Z");

describe("signPath", () => {
  it("signs as imgproxy documents", () => {
    expect(signPath(DOCS.path, DOCS)).toBe(DOCS.signature);
  });
});

describe("pictureLink", () => {
  it("asks the image server for the key in the bucket at a width, signed", () => {
    const link = pictureLink({ bucket: "image", key: KEY, width: 640 });
    expect(link).toMatch(SIGNED_640);
  });

  it("adds the expiry only when given", () => {
    const link = pictureLink({
      bucket: "image",
      expiresAt: IN_AN_HOUR,
      key: KEY,
      width: 640,
    });
    expect(link).toContain(
      `/rs:fit:640:0/exp:${IN_AN_HOUR.getTime() / 1000}/plain/`
    );
  });

  it("signs each link for its own path", () => {
    const signature = (width: number) =>
      pictureLink({ key: KEY, width })
        .slice(env.STORAGE_IMAGE_SERVER_URL.length)
        .split("/")[1];
    const [small, large] = [signature(640), signature(1080)];
    expect(small).toMatch(SIGNATURE);
    expect(small).not.toBe(large);
  });
});

describe("privateLinkExpiry", () => {
  it("keeps a private link the same within the hour and at least an hour long", () => {
    expect(privateLinkExpiry(new Date("2026-10-28T10:05:00Z"))).toEqual(
      new Date("2026-10-28T12:00:00Z")
    );
    expect(privateLinkExpiry(new Date("2026-10-28T10:55:00Z"))).toEqual(
      new Date("2026-10-28T12:00:00Z")
    );
  });
});

describe("pictureSrcSet", () => {
  it("gives one link per width", () => {
    expect(pictureSrcSet(KEY).map(({ width }) => width)).toEqual([
      ...IMAGE_SERVER.WIDTHS,
    ]);
  });
});
