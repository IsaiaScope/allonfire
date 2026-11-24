// @module-tag integration

import { render } from "vitest-browser-react";
import { PreviewPicture } from "../preview-picture";

// The picture as a box that wears the classes and style it is given.
vi.mock("@allonfire/ui/shared/components/aof-image", () => ({
  AOFStorageImage: ({
    className,
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => <span className={className} data-testid="picture" style={style} />,
}));

const image = (width: number, height: number) => ({
  alt: { en: "A photo", it: "Una foto" },
  blurDataUrl: "data:image/jpeg;base64,AAAA",
  height,
  srcSet: [],
  width,
});

const drawIn = async (
  slide: { height: number; width: number },
  photo: { height: number; width: number }
) => {
  const screen = await render(
    <div style={{ height: slide.height, width: slide.width }}>
      <PreviewPicture image={image(photo.width, photo.height)} language="en" />
    </div>
  );
  return screen.getByTestId("picture").element().getBoundingClientRect();
};

describe("PreviewPicture", () => {
  it("is as wide and tall as the photo's ratio asks in a slide that is taller than the photo, so its blur covers the photo and nothing more", async () => {
    const box = await drawIn(
      { height: 1000, width: 600 },
      { height: 600, width: 800 }
    );
    expect(Math.round(box.width)).toBe(600);
    expect(Math.round(box.height)).toBe(450);
  });

  it("is as wide and tall as the photo's ratio asks in a slide that is wider than the photo", async () => {
    const box = await drawIn(
      { height: 500, width: 400 },
      { height: 800, width: 600 }
    );
    expect(Math.round(box.width)).toBe(375);
    expect(Math.round(box.height)).toBe(500);
  });
});
