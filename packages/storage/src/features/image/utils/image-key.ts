import { randomUUID } from "node:crypto";
import { IMAGE } from "../constants/image";

/** A new file name for an Image: a new one for every file stored. */
export const imageKey = (): string =>
  `${randomUUID()}${IMAGE.FORMAT.EXTENSION}`;
