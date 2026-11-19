import { OCEAN_FACE } from "@allonfire/design/designs/ocean/ocean-mark";
import { AOFSectionPage } from "@allonfire/ui/features/navigation/components/aof-section-page";
import { useTranslations } from "next-intl";
import { OceanMark } from "@/shared/components/ocean-mark";

/**
 * What a signed-in page shows while it waits: the fallback `signedInPage`
 * hands `withAppSession`, filling the frame's page area. The octopus pulses
 * as long as the wait lasts (a loading indicator, which WCAG 2.2.2 counts as
 * essential), standing still for reduced motion. No entrance: a wait is
 * often shorter than one.
 */
export const SectionLoading = () => {
  const t = useTranslations("Common.Loading");
  return (
    <AOFSectionPage layout="centered">
      <OceanMark
        className="size-24 motion-safe:animate-pulse"
        face={OCEAN_FACE.HAPPY}
        tone="teal"
      />
      <p className="font-heading text-muted-foreground text-xl" role="status">
        {t("label")}
      </p>
    </AOFSectionPage>
  );
};
