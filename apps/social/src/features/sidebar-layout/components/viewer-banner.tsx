import { Eye } from "lucide-react";

export function ViewerBanner() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-muted bg-muted/50 px-3 py-2 text-muted-foreground text-sm">
      <Eye className="size-3.5 shrink-0" />
      You're in view-only mode. Actions are disabled.
    </div>
  );
}
