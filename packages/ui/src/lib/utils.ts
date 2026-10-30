import { cn as shadcnCn } from "@allonfire/shadcn/lib/utils";

/**
 * shadcn's class merger (clsx plus tailwind-merge in one), so Apps reach it
 * through @allonfire/ui like every other shadcn piece (ADR 0010): a later
 * class of the same group wins over an earlier one.
 */
export const cn = shadcnCn;
