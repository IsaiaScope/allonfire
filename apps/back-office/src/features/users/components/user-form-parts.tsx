"use client";

import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { entryRoles } from "@allonfire/database/features/auth/access/access";
import { AOFChoiceField } from "@allonfire/ui/features/form/components/aof-choice-field";
import { withAOFFieldGroup } from "@allonfire/ui/features/form/utils/form";
import { cn } from "@allonfire/ui/shared/utils/utils";
import {
  IconEye,
  IconLock,
  IconMailCheck,
  IconMailExclamation,
  IconServerCog,
  IconShieldCheck,
  IconUser,
  IconUserOff,
  IconUserShield,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { FormActions, type FormSubmit } from "@/shared/components/form-actions";
import { APP_ENTRY } from "@/shared/constants/apps";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { USERS } from "../constants/users";
import {
  NO_ROLES,
  type RoleChoice,
  type UserFieldMessages,
  type VerificationChoice,
} from "../utils/user-form-schema";

/** Each Role's pictogram in a Role row. */
const ROLE_ICON = {
  [Role.ADMIN]: <IconShieldCheck />,
  [Role.USER]: <IconUser />,
  [Role.VIEWER]: <IconEye />,
  [USERS.NO_ROLE]: <IconUserOff />,
} satisfies Record<RoleChoice, ReactNode>;

/** One App's Role choice: "Not a member", then the Roles that enter it. */
const RoleChoiceRow = ({ app, locked }: { app: App; locked: boolean }) => {
  const t = useTranslations();
  return (
    <AOFChoiceField
      // Locked, never disabled: a disabled control posts nothing, and the
      // choice's own hidden input must keep posting the Role as it is.
      aria-disabled={locked || undefined}
      className={cn(locked && "opacity-60")}
      inert={locked || undefined}
      ink={BACK_OFFICE.CHOSEN.INK}
      label={t("Users.form.role", { app: APP_ENTRY[app].name })}
      options={[
        {
          icon: ROLE_ICON[USERS.NO_ROLE],
          label: t("Users.form.noRole"),
          value: USERS.NO_ROLE,
        },
        ...entryRoles(app).map((role) => ({
          icon: ROLE_ICON[role],
          label: t(`Navigation.role.${role}`),
          value: role,
        })),
      ]}
      pill={BACK_OFFICE.CHOSEN.PILL}
    />
  );
};

/**
 * The Role rows, one per App, each drawn as Gooey Nav. `children` binds a
 * row to its form around the choice it is handed. The `locked` App's row
 * cannot change, with a note saying why.
 */
const RoleRowList = ({
  children,
  locked,
}: {
  children: (app: App, choice: ReactNode) => ReactNode;
  locked?: App | undefined;
}) => {
  const t = useTranslations();
  return (
    <fieldset className="@2xl:col-span-2 mt-8 flex flex-col gap-8">
      <legend className="mb-2 flex items-center gap-2 font-bold text-base">
        <IconUserShield aria-hidden className="size-5" />
        {t("Users.form.roles")}
      </legend>
      {objectValues(App).map((app) => (
        <div className="flex flex-col gap-2" key={app}>
          <span aria-hidden className="font-bold text-sm">
            {APP_ENTRY[app].name}
          </span>
          {children(app, <RoleChoiceRow app={app} locked={app === locked} />)}
          {app === locked ? (
            <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <IconLock aria-hidden className="size-4" />
              {t("Users.edit.ownRoleLocked", { app: APP_ENTRY[app].name })}
            </p>
          ) : null}
        </div>
      ))}
    </fieldset>
  );
};

/** What the Role rows can be told: the App whose row cannot change. */
const ROLE_ROWS_PROPS: { locked?: App | undefined } = {};

/**
 * The Role rows (`RoleRowList`), a field group both User forms bind
 * (`USERS.FORM_FIELDS.ROLES`): each row is the form's `roles.<app>`.
 */
export const RoleRows = withAOFFieldGroup({
  defaultValues: { roles: NO_ROLES },
  props: ROLE_ROWS_PROPS,
  render: ({ group, locked }) => (
    <RoleRowList locked={locked}>
      {(app, choice) => (
        <group.AppField name={`roles.${app}`}>{() => choice}</group.AppField>
      )}
    </RoleRowList>
  ),
});

/** The verification row's start: verified, as an Admin's new User is. */
const VERIFIED_START: { verification: VerificationChoice } = {
  verification: USERS.VERIFICATION.VERIFIED,
};

/**
 * The Services group under the Roles, laid out like them: one sub-section
 * per Service, Mail the first, its choice a Gooey Nav and a field group both
 * User forms bind (`USERS.FORM_FIELDS.VERIFICATION`): the email counts as
 * verified, or the User verifies it at their next sign-in. Saving it ends
 * no Session and sends nothing.
 */
export const VerificationRow = withAOFFieldGroup({
  defaultValues: VERIFIED_START,
  render: ({ group }) => (
    <VerificationRowWords>
      {(t) => (
        <fieldset className="@2xl:col-span-2 mt-8 flex flex-col gap-8">
          <legend className="mb-2 flex items-center gap-2 font-bold text-base">
            <IconServerCog aria-hidden className="size-5" />
            {t("Navigation.services")}
          </legend>
          <div className="flex flex-col gap-2">
            <span aria-hidden className="font-bold text-sm">
              {t("Navigation.mail")}
            </span>
            <group.AppField name="verification">
              {() => (
                <AOFChoiceField
                  ink={BACK_OFFICE.CHOSEN.INK}
                  label={t("Users.form.verification")}
                  options={[
                    {
                      icon: <IconMailCheck />,
                      label: t("Users.form.verified"),
                      value: USERS.VERIFICATION.VERIFIED,
                    },
                    {
                      icon: <IconMailExclamation />,
                      label: t("Users.form.mustVerify"),
                      value: USERS.VERIFICATION.REQUIRED,
                    },
                  ]}
                  pill={BACK_OFFICE.CHOSEN.PILL}
                />
              )}
            </group.AppField>
          </div>
        </fieldset>
      )}
    </VerificationRowWords>
  ),
});

/** Hands the verification row's `render` its words: a `render` calls no hooks. */
const VerificationRowWords = ({
  children,
}: {
  children: (t: ReturnType<typeof useTranslations>) => ReactNode;
}) => children(useTranslations());

/** A User form's last row: Cancel back to the list, and its submit, both kanji buttons. */
export const UserFormActions = ({
  pending,
  submit,
}: {
  pending: boolean;
  submit: FormSubmit;
}) => {
  const t = useTranslations();
  return (
    <FormActions
      cancelHref={BACK_OFFICE.PAGE.USERS}
      cancelLabel={t("Users.form.cancel")}
      pending={pending}
      submit={submit}
    />
  );
};

/** The field messages both User forms' schemas take, in the page's language. */
export const useUserFieldMessages = (): UserFieldMessages => {
  const t = useTranslations("Users.form.field");
  return {
    nameRequired: t("nameRequired"),
    passwordMismatch: t("passwordMismatch"),
    passwordWeak: t("passwordWeak"),
  };
};
