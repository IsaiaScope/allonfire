import { BACK_OFFICE } from "@/shared/constants/back-office";
import { IMAGES } from "../constants/images";

/** One Image's page, under the Images page. */
export const imageHref = (id: string) =>
  `${BACK_OFFICE.PAGE.STORAGE_IMAGES}/${encodeURIComponent(id)}`;

/** The Add an Image page. */
export const newImageHref = () =>
  `${BACK_OFFICE.PAGE.STORAGE_IMAGES}${IMAGES.PATH.NEW}`;
