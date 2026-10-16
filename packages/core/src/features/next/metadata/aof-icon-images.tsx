import { objectValues, type ValueOf } from "../../../shared/utils/object";
import { HTTP } from "../../http/constants/http";
import { METADATA } from "../../metadata/constants/metadata";
import { fileRoute } from "./file-route";
import { type MarkImage, markImage } from "./mark-image";

type ManifestIcon = ValueOf<typeof METADATA.ICON.MANIFEST>;

const MANIFEST_ICONS = objectValues(METADATA.ICON.MANIFEST);

/**
 * A square icon PNG (`METADATA.ICON`): the App's mark centred at its inset on
 * an opaque ground. The App's `apple-icon.tsx` returns it; so does every
 * manifest icon.
 */
export const AOFIconImage = (
  { edge, inset }: { edge: number; inset: number },
  image: MarkImage
) => markImage({ height: edge, width: edge }, edge * inset, image);

/** The manifest's `icons`, where `AOFManifestIconRoute` serves them. */
export const AOFManifestIcons = () =>
  MANIFEST_ICONS.map(({ edge, file, purpose }) => ({
    purpose,
    sizes: `${edge}x${edge}`,
    src: `${METADATA.PATH.MANIFEST_ICON}/${file}`,
    type: HTTP.CONTENT_TYPE.PNG,
  }));

/**
 * The App's `app/manifest-icon/[icon]/route.ts` (the folder
 * `METADATA.PATH.MANIFEST_ICON` names) re-exports `GET` and
 * `generateStaticParams` from this; `render` is usually `AOFIconImage`. Every
 * icon is built at build time.
 */
export const AOFManifestIconRoute = (
  render: (icon: ManifestIcon) => Promise<Response>
) =>
  fileRoute(
    "icon",
    new Map(MANIFEST_ICONS.map((icon) => [icon.file, icon])),
    render
  );
