import { Button } from "@allonfire/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@allonfire/ui/components/tooltip";
import type { ComponentProps } from "react";

type ReadOnlyButtonProps = Omit<ComponentProps<typeof Button>, "disabled"> & {
  wrapperClassName?: string;
};

export function ReadOnlyButton({
  children,
  wrapperClassName,
  ...props
}: ReadOnlyButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={
              wrapperClassName
                ? `cursor-not-allowed ${wrapperClassName}`
                : "cursor-not-allowed"
            }
          />
        }
      >
        <Button disabled {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        className="whitespace-nowrap [&>div:last-child]:hidden"
        sideOffset={4}
      >
        Read-only access
      </TooltipContent>
    </Tooltip>
  );
}
