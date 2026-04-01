const splashScreens = [
  { w: 750, h: 1334, cssW: 375, cssH: 667, r: 2 },
  { w: 1334, h: 750, cssW: 667, cssH: 375, r: 2 },
  { w: 1242, h: 2208, cssW: 414, cssH: 736, r: 3 },
  { w: 2208, h: 1242, cssW: 736, cssH: 414, r: 3 },
  { w: 1125, h: 2436, cssW: 375, cssH: 812, r: 3 },
  { w: 2436, h: 1125, cssW: 812, cssH: 375, r: 3 },
  { w: 828, h: 1792, cssW: 414, cssH: 896, r: 2 },
  { w: 1792, h: 828, cssW: 896, cssH: 414, r: 2 },
  { w: 1242, h: 2688, cssW: 414, cssH: 896, r: 3 },
  { w: 2688, h: 1242, cssW: 896, cssH: 414, r: 3 },
  { w: 1080, h: 2340, cssW: 360, cssH: 780, r: 3 },
  { w: 2340, h: 1080, cssW: 780, cssH: 360, r: 3 },
  { w: 1170, h: 2532, cssW: 390, cssH: 844, r: 3 },
  { w: 2532, h: 1170, cssW: 844, cssH: 390, r: 3 },
  { w: 1284, h: 2778, cssW: 428, cssH: 926, r: 3 },
  { w: 2778, h: 1284, cssW: 926, cssH: 428, r: 3 },
  { w: 1179, h: 2556, cssW: 393, cssH: 852, r: 3 },
  { w: 2556, h: 1179, cssW: 852, cssH: 393, r: 3 },
  { w: 1290, h: 2796, cssW: 430, cssH: 932, r: 3 },
  { w: 2796, h: 1290, cssW: 932, cssH: 430, r: 3 },
  { w: 1206, h: 2622, cssW: 402, cssH: 874, r: 3 },
  { w: 2622, h: 1206, cssW: 874, cssH: 402, r: 3 },
  { w: 1320, h: 2868, cssW: 440, cssH: 956, r: 3 },
  { w: 2868, h: 1320, cssW: 956, cssH: 440, r: 3 },
  { w: 1620, h: 2160, cssW: 810, cssH: 1080, r: 2 },
  { w: 2160, h: 1620, cssW: 1080, cssH: 810, r: 2 },
  { w: 1640, h: 2360, cssW: 820, cssH: 1180, r: 2 },
  { w: 2360, h: 1640, cssW: 1180, cssH: 820, r: 2 },
  { w: 1668, h: 2388, cssW: 834, cssH: 1194, r: 2 },
  { w: 2388, h: 1668, cssW: 1194, cssH: 834, r: 2 },
  { w: 2048, h: 2732, cssW: 1024, cssH: 1366, r: 2 },
  { w: 2732, h: 2048, cssW: 1366, cssH: 1024, r: 2 },
] as const;

export function AppleSplashLinks() {
  return (
    <>
      {splashScreens.map(({ w, h, cssW, cssH, r }) => (
        <link
          href={`/splash/apple-splash-${w}x${h}.png`}
          key={`${w}x${h}`}
          media={`(device-width: ${cssW}px) and (device-height: ${cssH}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: ${w < h ? "portrait" : "landscape"})`}
          rel="apple-touch-startup-image"
        />
      ))}
    </>
  );
}
