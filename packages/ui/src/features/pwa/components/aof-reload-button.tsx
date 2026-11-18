"use client";

import type { ComponentProps } from "react";
import { AOFButton } from "../../../shared/components/aof-button";

const reload = () => location.reload();

/**
 * Reloads the address the visitor was opening: the worker serves the
 * Offline page at the address that failed, so a reload is the retry.
 * `className` carries the App's action dressing.
 */
export const AOFReloadButton = (
  props: Omit<ComponentProps<typeof AOFButton>, "onClick" | "type">
) => <AOFButton size="field" {...props} onClick={reload} type="button" />;
