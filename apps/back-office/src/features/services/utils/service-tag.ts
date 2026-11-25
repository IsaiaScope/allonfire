import type { ServiceType } from "@allonfire/database/enums";
import { SERVICES } from "../constants/services";

/** One Service type's own cache tag, under the one every type's copy also has. */
export const serviceTag = (type: ServiceType) =>
  `${SERVICES.CACHE.TAG}:${type}`;
