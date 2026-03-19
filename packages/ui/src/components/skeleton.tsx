import { cn } from "@allonfire/ui/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-accent/70", className)}
      data-slot="skeleton"
      {...props}
    />
  );
}

export { Skeleton };
