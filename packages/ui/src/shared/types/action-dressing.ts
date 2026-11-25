import type { ReactNode } from "react";
import type { AOFAction } from "../constants/action";

/**
 * How a Design dresses an action button: its class (a `cva` result), a
 * mark for each action (an icon, a glyph, nothing) and, where it wants one,
 * an icon of its own for an action, in place of the one the shared piece draws.
 */
export type AOFActionDressing = {
  className: string;
  icons?: Partial<Record<AOFAction, ReactNode>>;
  marks: Record<AOFAction, ReactNode>;
};
