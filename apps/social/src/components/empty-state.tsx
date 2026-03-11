import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 font-semibold text-sm">{title}</h3>
      <p className="mt-1 max-w-sm text-muted-foreground text-sm">
        {description}
      </p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
