import { AOFSectionPage } from "@allonfire/ui/features/navigation/components/aof-section-page";
import { useTranslations } from "next-intl";
import { OceanArt } from "@/shared/components/ocean-art";
import { MASCOT } from "@/shared/constants/mascots";

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
      <OceanArt
        art={MASCOT.LOADING}
        className="size-24 motion-safe:animate-pulse"
      />
      <p className="font-heading text-muted-foreground text-xl" role="status">
        {t("label")}
      </p>
    </AOFSectionPage>
  );
};
