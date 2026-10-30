"use client";

import { AOFButton } from "@allonfire/ui/components/aof-button";
import { cn } from "@allonfire/ui/lib/utils";
import type { ComponentProps } from "react";
import { kanjiAction } from "@/shared/components/brush-kanji";

const reload = () => location.reload();

/**
 * Reloads the address the visitor was opening: the worker serves the
 * Offline page at the address that failed, so a reload is the retry.
 */
export const ReloadButton = ({
  className,
  ...props
}: Omit<ComponentProps<typeof AOFButton>, "onClick" | "type">) => (
  <AOFButton
    size="field"
    {...props}
    className={cn(kanjiAction(), className)}
    onClick={reload}
    type="button"
  />
);
