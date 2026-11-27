import { IMAGE } from "../constants/image";

/** `YYYY-MM-DD` of an ISO timestamp, as the length of a date in it. */
const ISO_DATE_LENGTH = 10;

/**
 * What an Export is called when it is saved or shared: the Image's UTC
 * creation date and the start of its id, so two Images never collide and the
 * stored key never shows (ADR 0036). The API's header and the browser's `File`
 * both take it from here.
 */
export const exportName = ({
  createdAt,
  id,
}: {
  createdAt: string;
  id: string;
}): string =>
  `${new Date(createdAt).toISOString().slice(0, ISO_DATE_LENGTH)}-${id.slice(0, IMAGE.EXPORT.ID_CHARS)}.${IMAGE.EXPORT.EXTENSION}`;
