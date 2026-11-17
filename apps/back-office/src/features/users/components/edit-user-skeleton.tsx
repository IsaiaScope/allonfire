import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import { entryRoles } from "@allonfire/database/features/auth/access/access";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconServerCog, IconUserShield } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  Bar,
  FormActionsSkeleton,
  FormAlertSkeleton,
  FormSkeleton,
} from "@/shared/components/form-skeleton";
import { APP_ENTRY } from "@/shared/constants/apps";

/**
 * A Role row with this many entry Roles (and "Not a member" besides) outgrows
 * a phone's width and wraps to a second line, below the container's `@md`.
 */
const WRAPPING_ROLES = 3;

/** A field as the form draws it: its label stands, its input and its error line are bars. */
const FieldSkeleton = ({
  children = <Bar part="field" />,
  label,
}: {
  children?: ReactNode;
  label: ReactNode;
}) => (
  <div aria-hidden className="flex flex-col gap-2">
    <span className="font-bold text-sm leading-snug">{label}</span>
    {children}
    <Bar part="error" />
  </div>
);

/**
 * The Edit a User page while its User is read, drawn as the form draws
 * itself so nothing moves when it arrives: the words that never change stand
 * as they are (each label, each fieldset's name, the Apps), and every value
 * and control is a bar at its real size. Its browser test sets its height
 * against the real form's at a wide, a middle and a phone width, so a change
 * to the form that skips this turns that test red.
 */
export const EditUserSkeleton = () => {
  const t = useTranslations();
  return (
    <FormSkeleton label={t("Users.edit.loading")}>
      <Bar part="title" />
      <div className="flex flex-1 flex-col">
        <div
          aria-hidden
          className="grid @2xl:grid-cols-2 grid-cols-1 @2xl:gap-x-6"
        >
          <div className="flex flex-col">
            <FieldSkeleton label={t("Users.edit.email")} />
            <FieldSkeleton label={t("Users.form.name")} />
            <FieldSkeleton label={t("Users.form.avatar.label")}>
              <Bar className="h-52 w-full" part="tile" />
            </FieldSkeleton>
          </div>
          <div className="flex flex-col">
            <FieldSkeleton label={t("Users.edit.password")} />
            <FieldSkeleton label={t("Users.edit.confirmPassword")} />
            <Bar className="h-51 w-full" part="tile" />
          </div>
          <fieldset className="@2xl:col-span-2 mt-8 flex flex-col gap-8">
            <legend className="mb-2 flex items-center gap-2 font-bold text-base">
              <IconUserShield aria-hidden className="size-5" />
              {t("Users.form.roles")}
            </legend>
            {objectValues(App).map((app) => (
              <div className="flex flex-col gap-2" key={app}>
                <span className="font-bold text-sm">{APP_ENTRY[app].name}</span>
                <Bar
                  className={cn(
                    entryRoles(app).length >= WRAPPING_ROLES &&
                      "@md:h-[46.8px] h-[85.6px]"
                  )}
                  part="toggle"
                />
              </div>
            ))}
          </fieldset>
          <fieldset className="@2xl:col-span-2 mt-8 flex flex-col gap-8">
            <legend className="mb-2 flex items-center gap-2 font-bold text-base">
              <IconServerCog aria-hidden className="size-5" />
              {t("Navigation.services")}
            </legend>
            <div className="flex flex-col gap-2">
              <span className="font-bold text-sm">{t("Navigation.mail")}</span>
              <Bar part="toggle" />
            </div>
          </fieldset>
          <div className="@2xl:col-span-2 mt-4">
            <FormAlertSkeleton />
          </div>
        </div>
        <FormActionsSkeleton />
      </div>
    </FormSkeleton>
  );
};
