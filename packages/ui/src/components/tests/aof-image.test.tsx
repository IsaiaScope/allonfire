// @module-tag unit
import type { StaticImageData } from "next/image";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AOFImage,
  type AOFImageProps,
  AOFStorageImage,
  type AOFStorageImageProps,
  type AOFStorageImageSource,
} from "../aof-image";

const LOCAL: StaticImageData = {
  blurDataURL: "data:image/webp;base64,BBBB",
  height: 600,
  src: "/_next/static/media/local.webp",
  width: 800,
};

const STORED: AOFStorageImageSource = {
  alt: { en: "The sea", it: "Il mare" },
  blurDataUrl: "data:image/webp;base64,AAAA",
  height: 900,
  key: "abc.webp",
  width: 1600,
};

const local = (props: Partial<AOFImageProps> = {}) =>
  renderToStaticMarkup(
    <AOFImage alt="A logo" sizes="10rem" src={LOCAL} {...props} />
  ).toLowerCase();

const stored = (props: Partial<AOFStorageImageProps> = {}) =>
  renderToStaticMarkup(
    <AOFStorageImage image={STORED} language="it" sizes="100vw" {...props} />
  ).toLowerCase();

describe("AOFImage", () => {
  it("shows a static import's blur until it loads", () => {
    expect(local()).toContain("background-image");
  });

  it("loads lazily unless it is the LCP image", () => {
    expect(local()).toContain('loading="lazy"');
    const lcp = local({ lcp: true });
    expect(lcp).toContain('loading="eager"');
    expect(lcp).toContain('fetchpriority="high"');
  });

  it("marks itself with data-slot like every AOF component", () => {
    expect(local()).toContain('data-slot="image"');
  });
});

describe("AOFStorageImage", () => {
  it("serves the Image through the optimizer at its real size", () => {
    const html = stored();
    expect(html).toContain("url=%2fstorage%2fimages%2fabc.webp");
    expect(html).toContain('width="1600"');
    expect(html).toContain('height="900"');
    expect(html).toContain('sizes="100vw"');
  });

  it("reads the alt in the page's language", () => {
    expect(stored()).toContain('alt="il mare"');
    expect(stored({ language: "en" })).toContain('alt="the sea"');
  });

  it("shows the blur until the Image loads", () => {
    expect(stored()).toContain("background-image");
  });

  it("loads lazily unless it is the LCP Image", () => {
    expect(stored()).toContain('loading="lazy"');
    const lcp = stored({ lcp: true });
    expect(lcp).toContain('loading="eager"');
    expect(lcp).toContain('fetchpriority="high"');
  });
});
