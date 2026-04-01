import { cn } from "@allonfire/ui/lib/utils";

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-4xl", className)}>{children}</div>
  );
}
