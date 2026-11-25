import type { ImageAccess } from "@allonfire/database/enums";
import { useTranslations } from "next-intl";
import {
  AOFCardContent,
  AOFCardHeader,
} from "../../../../shared/components/aof-card";
import { cn } from "../../../../shared/utils/utils";
import {
  AOFFormAlertSkeleton,
  AOFFormBar,
  AOFFormSkeleton,
} from "../../../form/components/aof-form-skeleton";
import type {
  AOFAddImagesApps,
  AOFAddImagesDressing,
} from "../types/add-images-dressing";
import { addImagesLayout, hasImageChoices } from "../utils/add-images-layout";
import { AddImagesHeading } from "./add-images-heading";

/**
 * The Add Images form while its page waits (for the Session), drawn as the
 * empty form draws itself so nothing moves when it arrives: the words that
 * never change stand as they are (the title, the limits, each fieldset's
 * name), and every control is a bar at its real size. A page of this kind
 * keeps a browser test that sets its height against the real form's, at a
 * wide and a phone width, so a change to the form that skips this turns that
 * test red.
 */
export const AOFAddImagesSkeleton = ({
  access,
  apps,
  dressing: { ActionsSkeleton, Card, PickerSkeleton },
  loading,
  title,
}: {
  /** As the form's: set when every Image has this access. */
  access?: ImageAccess | undefined;
  apps: AOFAddImagesApps;
  dressing: Pick<
    AOFAddImagesDressing,
    "ActionsSkeleton" | "Card" | "PickerSkeleton"
  >;
  /** What a screen reader hears while it waits. */
  loading: string;
  title: string;
}) => {
  const t = useTranslations("Common.ImageUpload");
  const fields = useTranslations("Common.ImageFields");
  return (
    <AOFFormSkeleton label={loading}>
      <AddImagesHeading picker={<PickerSkeleton />} title={title} />
      <div className="flex flex-1 flex-col gap-8">
        {hasImageChoices(access, apps) ? (
          <Card>
            <AOFCardHeader>
              <AOFFormBar className="h-7 w-56" part="label" />
            </AOFCardHeader>
            <AOFCardContent>
              <div aria-hidden className={addImagesLayout({ part: "grid" })}>
                {access === undefined ? (
                  <fieldset className="flex min-w-0 flex-col">
                    <legend className="mb-2 font-bold text-base">
                      {fields("access")}
                    </legend>
                    <div className="flex flex-col gap-2">
                      <span className="font-bold text-sm">
                        {fields("accessWho")}
                      </span>
                      <AOFFormBar part="toggle" />
                    </div>
                  </fieldset>
                ) : null}
                {apps.kind === "options" ? (
                  <div
                    className={cn(
                      addImagesLayout({ part: "apps" }),
                      "flex flex-col gap-2"
                    )}
                  >
                    <fieldset className="flex min-w-0 flex-col gap-4">
                      <legend className="mb-2 font-bold text-base">
                        {fields("apps")}
                      </legend>
                      {apps.options.map(({ value }) => (
                        <div className="flex flex-col gap-2" key={value}>
                          <AOFFormBar part="label" />
                          <AOFFormBar part="toggle" />
                        </div>
                      ))}
                    </fieldset>
                    <AOFFormBar part="error" />
                  </div>
                ) : null}
                <AOFFormBar
                  className={addImagesLayout({ part: "apply" })}
                  part="button"
                  tone="primary"
                />
              </div>
            </AOFCardContent>
          </Card>
        ) : null}
        <p className="text-muted-foreground">{t("pick.none")}</p>
        <AOFFormAlertSkeleton className="mt-4" />
        <ActionsSkeleton />
      </div>
    </AOFFormSkeleton>
  );
};
