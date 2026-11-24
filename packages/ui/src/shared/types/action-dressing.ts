import type { ReactNode } from "react";
import type { AOFAction } from "../constants/action";

/**
 * How a Design dresses an action button: its class (a `cva` result) and a
 * mark for each action (an icon, a glyph, nothing).
 */
export type AOFActionDressing = {
  className: string;
  marks: Record<AOFAction, ReactNode>;
};
