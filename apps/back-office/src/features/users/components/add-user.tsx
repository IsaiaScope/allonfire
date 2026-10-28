"use client";

import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { entryRoles } from "@allonfire/database/features/auth/access/access";
import { aofButtonVariants } from "@allonfire/ui/components/aof-button";
import { AOFSubmitButton } from "@allonfire/ui/components/aof-submit-button";
import { useAOFForm } from "@allonfire/ui/lib/form";
import { formDataTo, submitAOFForm } from "@allonfire/ui/lib/form-submit";
import { cn } from "@allonfire/ui/lib/utils";
import {
  IconArrowBackUp,
  IconEye,
  IconKey,
  IconKeyFilled,
  IconLoader2,
  IconMail,
  IconShieldCheck,
  IconUser,
  IconUserOff,
  IconUserPlus,
  IconUserShield,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import {
  type ReactNode,
  type SubmitEvent,
  useActionState,
  useCallback,
} from "react";
import { Link } from "@/features/i18n/navigation";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import { FormAlert } from "@/shared/components/form-alert";
import { APP_ENTRY } from "@/shared/constants/apps";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { addUser } from "../actions/add-user";
import { USERS } from "../constants/users";
import {
  type AddUserValues,
  addUserSchema,
  NO_ROLES,
  passwordChecks,
  type RoleChoice,
} from "../utils/add-user-schema";
import { PasswordRules } from "./password-rules";

/** Each Role's pictogram in a Role row. */
const ROLE_ICON = {
  [Role.ADMIN]: <IconShieldCheck />,
  [Role.USER]: <IconUser />,
  [Role.VIEWER]: <IconEye />,
  [USERS.NO_ROLE]: <IconUserOff />,
} satisfies Record<RoleChoice, ReactNode>;

/** The form's last row: Cancel back to the list, and Add, both kanji buttons. */
const AddUserActions = ({ pending }: { pending: boolean }) => {
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
      >
        <ActionKanji kanji={USERS.CANCEL_KANJI} />
        <IconArrowBackUp aria-hidden />
        {t("Users.add.cancel")}
      </Link>
      <AOFSubmitButton
        className={kanjiAction()}
        pending={pending}
        pendingChildren={
          <>
            <IconLoader2 aria-hidden className="animate-spin" />
            {t("Users.add.submitting")}
          </>
        }
        size="field"
      >
        <ActionKanji kanji={USERS.ADD_KANJI} />
        <IconUserPlus aria-hidden />
        {t("Users.add.submit")}
      </AOFSubmitButton>
    </div>
  );
};

/** The password rules met by what the form holds. */
const checksOf = ({ values }: { values: AddUserValues }) =>
  passwordChecks(values);

/**
 * The Add a User form, an AOF form (ADR 0017): email, name, the password the
 * Admin passes on, typed twice, its rules ticked live, and a Role per App
 * drawn as Gooey Nav. Checked here, then by the `addUser` action, whose
 * answer counts; a success never comes back, the action goes to the list.
 */
export const AddUser = () => {
  const t = useTranslations();
  const locale = useLocale();
  const [{ error, values }, action, pending] = useActionState(
    addUser.bind(null, locale),
    {}
  );
  const form = useAOFForm({
    defaultValues: values ?? {
      confirmPassword: "",
      email: "",
      name: "",
      password: "",
      roles: NO_ROLES,
    },
    // A submit runs the onChange validators too.
    validators: {
      onChange: addUserSchema({
        emailInvalid: t("Users.add.field.emailInvalid"),
        emailRequired: t("Users.add.field.emailRequired"),
        nameRequired: t("Users.add.field.nameRequired"),
        passwordMismatch: t("Users.add.field.passwordMismatch"),
        passwordWeak: t("Users.add.field.passwordWeak"),
      }),
    },
  });
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) =>
      submitAOFForm(form, event, formDataTo(action)),
    [form, action]
  );
  const optionsFor = (app: App) => [
    {
      icon: ROLE_ICON[USERS.NO_ROLE],
      label: t("Users.add.noRole"),
      value: USERS.NO_ROLE,
    },
    ...entryRoles(app).map((role) => ({
      icon: ROLE_ICON[role],
      label: t(`Navigation.role.${role}`),
      value: role,
    })),
  ];

  return (
    // Fills the Section, so a short form puts its buttons at the bottom.
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="flex items-center gap-2 font-bold text-2xl">
        <IconUserPlus aria-hidden className="size-7" />
        {t("Users.add.title")}
      </h1>
      <form
        action={action}
        aria-label={t("Users.add.title")}
        className="flex flex-1 flex-col"
        noValidate
        onSubmit={submit}
      >
        {/* One rhythm: 8px from a label to its control, 32px between blocks.
            A field leaves its 32px itself (its error line), so only the
            blocks after something else add it (`mt-8`). */}
        <div className="grid @2xl:grid-cols-2 @2xl:gap-x-6">
          {/* Who on the left, their password on the right: one column on a phone. */}
          <div className="flex flex-col">
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  autoComplete="off"
                  icon={<IconMail />}
                  inputMode="email"
                  invalid={error === USERS.ADD_ERROR.TAKEN}
                  label={t("Users.add.email")}
                  required
                  spellCheck={false}
                  type="email"
                />
              )}
            </form.AppField>
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  autoComplete="off"
                  icon={<IconUser />}
                  label={t("Users.add.name")}
                  required
                />
              )}
            </form.AppField>
          </div>
          <div className="flex flex-col">
            <form.AppField name="password">
              {(field) => (
                <field.TextField
                  autoComplete="new-password"
                  icon={<IconKey />}
                  label={t("Users.add.password")}
                  required
                  reveal={t("Users.add.showPassword")}
                  type="password"
                />
              )}
            </form.AppField>
            <form.AppField name="confirmPassword">
              {(field) => (
                <field.TextField
                  autoComplete="new-password"
                  icon={<IconKeyFilled />}
                  label={t("Users.add.confirmPassword")}
                  required
                  reveal={t("Users.add.showPassword")}
                  type="password"
                />
              )}
            </form.AppField>
            <form.Subscribe selector={checksOf}>
              {(checks) => <PasswordRules checks={checks} />}
            </form.Subscribe>
          </div>
          <fieldset className="@2xl:col-span-2 mt-8 flex flex-col gap-8">
            <legend className="mb-2 flex items-center gap-2 font-bold text-base">
              <IconUserShield aria-hidden className="size-5" />
              {t("Users.add.roles")}
            </legend>
            {objectValues(App).map((app) => (
              <div className="flex flex-col gap-2" key={app}>
                <span aria-hidden className="font-bold text-sm">
                  {APP_ENTRY[app].name}
                </span>
                <form.AppField name={`roles.${app}`}>
                  {(field) => (
                    <field.ChoiceField
                      ink={BACK_OFFICE.CHOSEN.INK}
                      label={t("Users.add.role", { app: APP_ENTRY[app].name })}
                      options={optionsFor(app)}
                      pill={BACK_OFFICE.CHOSEN.PILL}
                    />
                  )}
                </form.AppField>
              </div>
            ))}
          </fieldset>
          {/* The end of the form: why the last submit failed, in its kept place. */}
          <FormAlert className="@2xl:col-span-2 mt-4">
            {error ? t(`Users.add.error.${error}`) : null}
          </FormAlert>
        </div>
        <AddUserActions pending={pending} />
      </form>
    </div>
  );
};
