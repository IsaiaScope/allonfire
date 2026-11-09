import { useTranslations } from "next-intl";
import { type ReactNode, useId } from "react";
import type { Section } from "@/features/navigation/constants/sections";

/**
 * One Section's part of Home: its name with the icon the sidebar gives it,
 * and under it that Section's cards (`children`). A new Section on Home is
 * one more `HomeSection` in the page.
 */
export const HomeSection = ({
  children,
  section,
}: {
  children: ReactNode;
  section: Pick<Section, "icon" | "label">;
}) => {
  const t = useTranslations("Navigation");
  const id = useId();
  const Icon = section.icon;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 font-bold text-xl" id={id}>
        <Icon aria-hidden className="size-6" />
        {t(section.label)}
      </h2>
      {children}
    </section>
  );
};
