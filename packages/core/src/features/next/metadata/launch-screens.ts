import { objectValues } from "../../../shared/utils/object";
import {
  type ColorScheme,
  type LaunchDevice,
  type LaunchOrientation,
  METADATA,
} from "../../metadata/constants/metadata";

export type LaunchScreenVariant = LaunchDevice & {
  orientation: LaunchOrientation;
  scheme: ColorScheme;
  pixelWidth: number;
  pixelHeight: number;
};

const SCHEMES = objectValues(METADATA.COLOR_SCHEME);
const ORIENTATIONS = objectValues(METADATA.LAUNCH.ORIENTATION);

/** Each device in both orientations and both schemes, in pixels. */
export const launchScreenVariants = (
  devices: readonly LaunchDevice[] = METADATA.LAUNCH.DEVICES
): LaunchScreenVariant[] =>
  devices.flatMap((device) =>
    ORIENTATIONS.flatMap((orientation) =>
      SCHEMES.map((scheme) => {
        const portrait = orientation === METADATA.LAUNCH.ORIENTATION.PORTRAIT;
        return {
          ...device,
          orientation,
          pixelHeight: (portrait ? device.height : device.width) * device.ratio,
          pixelWidth: (portrait ? device.width : device.height) * device.ratio,
          scheme,
        };
      })
    )
  );

/** The PNG's file name: its pixel size (orientation follows) and scheme. */
export const launchScreenFile = ({
  pixelHeight,
  pixelWidth,
  scheme,
}: LaunchScreenVariant) => `${pixelWidth}x${pixelHeight}-${scheme}.png`;

/**
 * `appleWebApp.startupImage` entries. iOS reports `device-width` as the
 * portrait width in both orientations, so it is never swapped. iOS keeps the
 * screen it picked at install: a later theme change shows the old one.
 */
export const AOFLaunchScreenLinks = () =>
  launchScreenVariants().map((variant) => ({
    media: `(device-width: ${variant.width}px) and (device-height: ${variant.height}px) and (-webkit-device-pixel-ratio: ${variant.ratio}) and (orientation: ${variant.orientation}) and (prefers-color-scheme: ${variant.scheme})`,
    url: `${METADATA.PATH.LAUNCH_SCREEN}/${launchScreenFile(variant)}`,
  }));
