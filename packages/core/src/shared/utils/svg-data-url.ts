/** An SVG as a data URL, which any image renderer loads (Satori included). */
export const svgDataUrl = (svg: string) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
