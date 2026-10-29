"use client";

import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import type { App } from "@allonfire/database/enums";
import { roleIn } from "@allonfire/database/features/auth/access/access";
import { AOFReadOnlyField } from "@allonfire/ui/components/aof-read-only-field";
import { useAOFForm } from "@allonfire/ui/lib/form";
import { formDataTo, submitAOFForm } from "@allonfire/ui/lib/form-submit";
import { aofToast } from "@allonfire/ui/lib/use-aof-toast";
import {
  IconDeviceFloppy,
  IconKey,
  IconKeyFilled,
  IconMail,
  IconUser,
  IconUserEdit,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
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
import { editUser } from "../actions/edit-user";
import { USERS } from "../constants/users";
import {
  type EditUserFields,
  type EditUserNotice,
  type EditUserValues,
  editUserSchema,
} from "../utils/edit-user-schema";
import {
  passwordChecks,
  perApp,
  type RoleChoice,
} from "../utils/user-form-schema";
import { PasswordRules } from "./password-rules";
import {
  AVATAR_DRESS,
  RoleRows,
  UserFormActions,
  useAvatarLabels,
} from "./user-form-parts";

/** The read-only email's input, named by its label. */
const EMAIL_ID = "edit-user-email";

/**
 * The User was saved: says so in a toast (a warning when their picture was
 * not) and opens the list.
 */
const useSaved = (notice: EditUserNotice | undefined) => {
  const t = useTranslations("Users.edit");
  const router = useRouter();
  useEffect(() => {
    if (!notice) {
      return;
    }
    if (notice === USERS.EDIT_NOTICE.SAVED) {
      aofToast(t("saved"), "success");
    } else {
      aofToast(t("avatarFailed"), "warning");
    }
    router.replace(BACK_OFFICE.PAGE.USERS);
  }, [notice, router, t]);
};

/** The form's start: the User as stored, no password typed. */
const fieldsOf = (user: UserBody): EditUserFields => ({
  confirmPassword: "",
  name: user.name ?? "",
  password: "",
  roles: perApp((app): RoleChoice => roleIn(user, app) ?? USERS.NO_ROLE),
});

/** The password rules met by what the form holds. */
const checksOf = ({ values }: { values: EditUserValues }) =>
  passwordChecks(values);

/**
 * The Edit a User form, an AOF form (ADR 0017) built from Add a User's
 * pieces: the email shown, never edited; the name; the picture they hold,
 * changed or removed; a new password, typed twice, or both fields left
 * empty to keep theirs; and a Role per App. Editing yourself, your Role in
 * `manageApp` stays locked. Checked here, then by the `editUser` action,
 * whose answer counts.
 */
export const EditUser = ({
  manageApp,
  selfId,
  user,
}: {
  manageApp: App;
  selfId: string;
  user: UserBody;
}) => {
  const t = useTranslations();
  const [{ error, notice, values }, action, pending] = useActionState(
    editUser.bind(null, user.id),
    {}
  );
  useSaved(notice);
  const avatarLabels = useAvatarLabels();
  // The picture is the form's own: the action never hands it back.
  const startValues: EditUserValues = {
    avatar: null,
    ...(values ?? fieldsOf(user)),
  };
  const form = useAOFForm({
    defaultValues: startValues,
    // A submit runs the onChange validators too.
    validators: {
      onChange: editUserSchema({
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
  // The email, which never changes: the name is a field below.
  const title = user.email;

  return (
    // Fills the Section, so a short form puts its buttons at the bottom.
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="flex min-w-0 items-center gap-2 font-bold text-2xl">
        <IconUserEdit aria-hidden className="size-7 shrink-0" />
        <span className="truncate">{title}</span>
      </h1>
      <form
        action={action}
        aria-label={title}
        className="flex flex-1 flex-col"
        noValidate
        onSubmit={submit}
      >
        {/* Add a User's rhythm: 8px from a label to its control, 32px
            between blocks. */}
        {/* `grid-cols-1` is minmax(0, 1fr): a long email truncates instead
            of widening the column past a phone's screen. */}
        <div className="grid @2xl:grid-cols-2 grid-cols-1 @2xl:gap-x-6">
          <div className="flex flex-col">
            {/* The email never changes: shown in a field's box, never posted. */}
            <AOFReadOnlyField
              icon={<IconMail />}
              id={EMAIL_ID}
              label={t("Users.edit.email")}
              value={user.email}
            />
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
                  current={user.image}
                  label={t("Users.add.avatar.label")}
                  labels={avatarLabels}
                  removedName={USERS.AVATAR_REMOVED}
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
                  label={t("Users.edit.password")}
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
                  label={t("Users.edit.confirmPassword")}
                  reveal={t("Users.add.showPassword")}
                  type="password"
                />
              )}
            </form.AppField>
            <form.Subscribe selector={checksOf}>
              {(checks) => <PasswordRules checks={checks} />}
            </form.Subscribe>
          </div>
          <RoleRows
            field={roleField}
            locked={user.id === selfId ? manageApp : undefined}
          />
          {/* The end of the form: why the last submit failed, in its kept place. */}
          <FormAlert className="@2xl:col-span-2 mt-4">
            {error ? t(`Users.edit.error.${error}`) : null}
          </FormAlert>
        </div>
        <UserFormActions
          pending={pending}
          submit={{
            icon: <IconDeviceFloppy aria-hidden />,
            kanji: USERS.SAVE_KANJI,
            label: t("Users.edit.submit"),
            pendingLabel: t("Users.edit.submitting"),
          }}
        />
      </form>
    </div>
  );
};
