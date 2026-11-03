"use client";

import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { entryRoles } from "@allonfire/database/features/auth/access/access";
import { AOFChoiceField } from "@allonfire/ui/features/form/components/aof-choice-field";
import { AOFSubmitButton } from "@allonfire/ui/features/form/components/aof-submit-button";
import { withAOFFieldGroup } from "@allonfire/ui/features/form/utils/form";
import { aofButtonVariants } from "@allonfire/ui/shared/components/aof-button";
import {
  type AOFToastKind,
  aofToast,
} from "@allonfire/ui/shared/hooks/use-aof-toast";
import { cn } from "@allonfire/ui/shared/utils/utils";
import {
  IconArrowBackUp,
  IconEye,
  IconLoader2,
  IconLock,
  IconShieldCheck,
  IconUser,
  IconUserOff,
  IconUserShield,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect } from "react";
import { Link, useRouter } from "@/features/i18n/navigation";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import { ACTION_KANJI } from "@/shared/constants/action-kanji";
import { APP_ENTRY } from "@/shared/constants/apps";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { USERS } from "../constants/users";
import {
  NO_ROLES,
  type RoleChoice,
  type UserFieldMessages,
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

/** A form's submit button: its words, pictogram and kanji. */
export type UserFormSubmit = {
  icon: ReactNode;
  kanji: string;
  label: string;
  pendingLabel: string;
};

/** A User form's last row: Cancel back to the list, and its submit, both kanji buttons. */
export const UserFormActions = ({
  pending,
  submit,
}: {
  pending: boolean;
  submit: UserFormSubmit;
}) => {
  const t = useTranslations();
  return (
    // At the bottom of the Section when the form is shorter; 8px under the
    // form alert's kept place at least, as in Sign in.
    <div className="mt-auto flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
      <Link
        className={cn(
          aofButtonVariants({ size: "field", variant: "destructive" }),
          kanjiAction()
        )}
        href={BACK_OFFICE.PAGE.USERS}
        // Back to the list with its rows already there (ADR 0028).
        prefetch
      >
        <ActionKanji kanji={ACTION_KANJI.CANCEL} />
        <IconArrowBackUp aria-hidden />
        {t("Users.form.cancel")}
      </Link>
      <AOFSubmitButton
        className={kanjiAction()}
        pending={pending}
        pendingChildren={
          <>
            <IconLoader2 aria-hidden className="animate-spin" />
            {submit.pendingLabel}
          </>
        }
        size="field"
      >
        <ActionKanji kanji={submit.kanji} />
        {submit.icon}
        {submit.label}
      </AOFSubmitButton>
    </div>
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

/** A notice's toast before the list opens: its words and kind. */
type ListToast = { kind: AOFToastKind; message: string };

/**
 * A User form's answer that sends it back to the list: the notice's toast,
 * when `toasts` lists it, then the list, where the change shows. A notice
 * it does not list, or none, leaves the form where it is.
 */
export const useToastThenList = <TNotice extends string>(
  notice: TNotice | undefined,
  toasts: Partial<Record<TNotice, ListToast>>
) => {
  const router = useRouter();
  const toast = notice === undefined ? undefined : toasts[notice];
  const kind = toast?.kind;
  const message = toast?.message;
  useEffect(() => {
    if (!(kind && message)) {
      return;
    }
    aofToast(message, kind);
    router.replace(BACK_OFFICE.PAGE.USERS);
  }, [kind, message, router]);
};
