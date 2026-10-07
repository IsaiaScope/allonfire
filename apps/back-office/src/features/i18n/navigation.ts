import { AOFCreateNavigation } from "@allonfire/core/features/next/i18n/aof-create-navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  AOFCreateNavigation(routing);
