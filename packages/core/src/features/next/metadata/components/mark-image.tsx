import { ImageResponse } from "next/og";
import type { ReactElement } from "react";

type Fonts = NonNullable<
  ConstructorParameters<typeof ImageResponse>[1]
>["fonts"];

/** How an App's mark looks in a generated PNG. */
export type MarkImage = {
  /** The opaque ground: iOS fills transparency with black. */
  ground: string;
  /** The App's logo at an edge in pixels, drawn for `ImageResponse`. */
  mark: (edge: number) => ReactElement;
  fonts?: Fonts;
};

/** A PNG `size` in pixels: the mark `markEdge` wide, centred on its ground. */
export const markImage = (
  size: { width: number; height: number },
  markEdge: number,
  { fonts, ground, mark }: MarkImage
) =>
  new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: ground,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      {mark(markEdge)}
    </div>,
    { ...(fonts ? { fonts } : {}), ...size }
  );
