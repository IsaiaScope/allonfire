import { objectValues } from "../../../shared/utils/object";
import { HTTP } from "../../http/constants/http";
import {
  type LogoLayout,
  type LogoScheme,
  METADATA,
} from "../../metadata/constants/metadata";
import { fileRoute } from "./file-route";

/** A logo's file name in `METADATA.PATH.LOGO`: `horizontal-auto.svg`. */
export const logoFile = (layout: LogoLayout, scheme: LogoScheme) =>
  `${layout}-${scheme}.svg`;

/**
 * The App's `app/logo/[file]/route.ts` (the folder `METADATA.PATH.LOGO`
 * names) re-exports `GET` and `generateStaticParams` from this; `svgFor`
 * draws one layout in one scheme, usually the Brand's `aofLogoSvg`. Every
 * file is built at build time. A page shows it with an `<img>`, `auto` to
 * follow the viewer's theme.
 */
export const AOFLogoRoute = (
  svgFor: (layout: LogoLayout, scheme: LogoScheme) => string
) =>
  fileRoute(
    "file",
    new Map(
      objectValues(METADATA.LOGO.LAYOUT).flatMap((layout) =>
        objectValues(METADATA.LOGO.SCHEME).map(
          (scheme) => [logoFile(layout, scheme), { layout, scheme }] as const
        )
      )
    ),
    ({ layout, scheme }) =>
      new Response(svgFor(layout, scheme), {
        headers: { [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.SVG },
      })
  );
