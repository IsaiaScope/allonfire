import { Check } from "lucide-react";
import type { NavLink } from "./nav-links";

type NavLinkContentProps = {
  link: NavLink;
  active: boolean;
  label: string;
  description: string;
};

export function NavLinkContent({
  link,
  active,
  label,
  description,
}: NavLinkContentProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <link.icon className="size-4 shrink-0 text-primary" />
        <span className="font-medium text-sm leading-none">{label}</span>
        {active && <Check className="ml-auto size-3.5 text-primary" />}
      </div>
      <p className="mt-1 text-muted-foreground text-xs leading-snug">
        {description}
      </p>
    </>
  );
}
