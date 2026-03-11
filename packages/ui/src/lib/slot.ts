import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import { cn } from "./utils";

function SlotRoot({
  children,
  ...props
}: {
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
}) {
  const child = Children.only(children);

  if (!isValidElement<Record<string, unknown>>(child)) {
    return null;
  }

  return cloneElement(child, {
    ...props,
    ...child.props,
    className: cn(props.className, child.props.className as string),
  });
}

export const Slot = { Root: SlotRoot };
