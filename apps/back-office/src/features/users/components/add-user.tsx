"use client";
import type { App } from "@allonfire/database/enums";
import { useAOFForm } from "@allonfire/ui/lib/form";
import { formDataTo, submitAOFForm } from "@allonfire/ui/lib/form-submit";
import { aofToast } from "@allonfire/ui/lib/use-aof-toast";
import {
  IconKey,
  IconKeyFilled,
  IconMail,
  IconUser,
  IconUserPlus,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import {
  type ReactNode,
  type SubmitEvent,
  useActionState,
  useCallback,
  useEffect,
} from "react";
import { useRouter } from "@/features/i18n/navigation";
import { FormAlert } from "@/shared/components/form-alert";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { addUser } from "../actions/add-user";
import { USERS } from "../constants/users";
import {
  type AddUserFields,
  type AddUserNotice,
  type AddUserValues,
  addUserSchema,
} from "../utils/add-user-schema";
import { NO_ROLES, passwordChecks } from "../utils/user-form-schema";
import { PasswordRules } from "./password-rules";
import {
  AVATAR_DRESS,
  RoleRows,
  UserFormActions,
  useAvatarLabels,
} from "./user-form-parts";

/**
 * The User was added but their picture was not saved: says so in a toast and
 * opens the list, where the User shows with their initial.
 */
const useAddedWithoutPicture = (notice: AddUserNotice | undefined) => {
  const t = useTranslations("Users.add.avatar");
  const router = useRouter();
  useEffect(() => {
    if (notice !== USERS.ADD_NOTICE.AVATAR_FAILED) {
      return;
    }
    aofToast(t("failed"), "warning");
    router.replace(BACK_OFFICE.PAGE.USERS);
  }, [notice, router, t]);
};

/** Where the form starts: nothing typed, every App at "Not a member". */
const EMPTY: AddUserFields = {
  confirmPassword: "",
  email: "",
  name: "",
  password: "",
  roles: NO_ROLES,
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
  const [{ error, notice, values }, action, pending] = useActionState(
    addUser.bind(null, locale),
    {}
  );
  useAddedWithoutPicture(notice);
  const avatarLabels = useAvatarLabels();
  // The picture is the form's own: the action never hands it back.
  const startValues: AddUserValues = { avatar: null, ...(values ?? EMPTY) };
  const form = useAOFForm({
    defaultValues: startValues,
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
  const roleField = useCallback(
    (app: App, choice: ReactNode) => (
      <form.AppField name={`roles.${app}`}>{() => choice}</form.AppField>
    ),
    [form]
  );
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) =>
      submitAOFForm(form, event, formDataTo(action)),
    [form, action]
  );
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
            <form.AppField name="avatar">
              {(field) => (
                <field.AvatarField
                  {...AVATAR_DRESS}
                  label={t("Users.add.avatar.label")}
                  labels={avatarLabels}
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
          <RoleRows field={roleField} />
          {/* The end of the form: why the last submit failed, in its kept place. */}
          <FormAlert className="@2xl:col-span-2 mt-4">
            {error ? t(`Users.add.error.${error}`) : null}
          </FormAlert>
        </div>
        <UserFormActions
          pending={pending}
          submit={{
            icon: <IconUserPlus aria-hidden />,
            kanji: USERS.ADD_KANJI,
            label: t("Users.add.submit"),
            pendingLabel: t("Users.add.submitting"),
          }}
        />
      </form>
    </div>
  );
};
