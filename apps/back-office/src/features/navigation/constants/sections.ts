import { AUTH } from "@allonfire/auth/shared/constants/auth";
import {
  IconHome,
  IconMail,
  IconPhoto,
  IconServer2,
  IconServerCog,
  IconUsers,
} from "@tabler/icons-react";
import { BACK_OFFICE_BASE } from "@/shared/constants/back-office-base";
import type { Section } from "../types/section";

const HOME = {
  icon: IconHome,
  label: "home",
  path: AUTH.PAGE.HOME,
} as const satisfies Section;
const SERVICES = {
  icon: IconServerCog,
  label: "services",
  pages: [
    {
      icon: IconMail,
      label: "mail",
      path: BACK_OFFICE_BASE.PAGE.SERVICES_MAIL,
    },
  ],
  path: BACK_OFFICE_BASE.PAGE.SERVICES,
} as const satisfies Section;
const STORAGE = {
  icon: IconServer2,
  label: "storage",
  pages: [
    {
      icon: IconPhoto,
      label: "images",
      path: BACK_OFFICE_BASE.PAGE.STORAGE_IMAGES,
    },
  ],
  path: BACK_OFFICE_BASE.PAGE.STORAGE,
} as const satisfies Section;
const USERS = {
  icon: IconUsers,
  label: "users",
  path: BACK_OFFICE_BASE.PAGE.USERS,
} as const satisfies Section;

/**
 * The Back Office's Sections: the sidebar and the proxy's sign-in gate both
 * read `LIST`, and a test checks that every page under `(signed-in)` is in
 * it and gates itself. A path follows the locale; Home's is empty
 * (`AUTH.PAGE.HOME`).
 */
export const SECTION = {
  HOME,
  /** The menu's order: an explicit list, since Biome sorts the object's keys. */
  LIST: [HOME, USERS, STORAGE, SERVICES],
  SERVICES,
  STORAGE,
  USERS,
} as const;
