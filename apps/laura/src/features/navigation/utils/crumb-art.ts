import type { OceanArtKey } from "@allonfire/design/designs/ocean/mascot-art";
import { MASCOT } from "@/shared/constants/mascots";

type CrumbLabel = keyof typeof MASCOT.CRUMB;

const isCrumbLabel = (label: string): label is CrumbLabel =>
  Object.hasOwn(MASCOT.CRUMB, label);

/**
 * The picture beside a crumb: the App's own favourite when `label` is none
 * (the App's crumb) or has no picture, else the Section's or page's.
 */
export const crumbArt = (label?: string): OceanArtKey =>
  label !== undefined && isCrumbLabel(label) ? MASCOT.CRUMB[label] : MASCOT.APP;
