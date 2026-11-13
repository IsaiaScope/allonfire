"use client";

import type { UserBody } from "@allonfire/auth/features/users/hono/constants/schemas";
import type { App } from "@allonfire/database/enums";
import { roleIn } from "@allonfire/database/features/auth/access/access";
import { AOFReadOnlyField } from "@allonfire/ui/features/form/components/aof-read-only-field";
import { useAOFForm } from "@allonfire/ui/features/form/utils/form";
import { useAOFFormAction } from "@allonfire/ui/features/form/utils/form-submit";
import { IconDeviceFloppy, IconMail, IconUserEdit } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/shared/components/form-alert";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { useToastThenList } from "@/shared/hooks/use-toast-then-list";
import { editUser } from "../actions/edit-user";
import { USERS } from "../constants/users";
import {
  type EditUserFields,
  type EditUserValues,
  editUserSchema,
} from "../utils/edit-user-schema";
import { perApp, type RoleChoice } from "../utils/user-form-schema";
import { AvatarField, NameField, PasswordFields } from "./user-form-fields";
import {
  RoleRows,
  UserFormActions,
  useUserFieldMessages,
  VerificationRow,
} from "./user-form-parts";

/** The read-only email's input, named by its label. */
const EMAIL_ID = "edit-user-email";

/** The form's start: the User as stored, no password typed. */
const fieldsOf = (user: UserBody): EditUserFields => ({
  confirmPassword: "",
  name: user.name ?? "",
  password: "",
  roles: perApp((app): RoleChoice => roleIn(user, app) ?? USERS.NO_ROLE),
  verification: user.emailVerified
    ? USERS.VERIFICATION.VERIFIED
    : USERS.VERIFICATION.REQUIRED,
});

/**
 * The Edit a User form, an AOF form (ADR 0017) built from the User forms'
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
    editUser.bind(null, {
      id: user.id,
      version: user.version,
      wasVerified: user.emailVerified,
    }),
    {}
  );
  // The User was saved: a toast (a warning when their picture was not),
  // then the list.
  useToastThenList(BACK_OFFICE.PAGE.USERS, notice, {
    [USERS.EDIT_NOTICE.AVATAR_FAILED]: {
      kind: "warning",
      message: t("Users.edit.avatarFailed"),
    },
    [USERS.EDIT_NOTICE.SAVED]: {
      kind: "success",
      message: t("Users.edit.saved"),
    },
  });
  // A User changed elsewhere says so in every App's words (`Common`).
  const errorText =
    error === USERS.EDIT_ERROR.CHANGED
      ? t("Common.Request.changed")
      : error && t(`Users.edit.error.${error}`);
  const fieldMessages = useUserFieldMessages();
  // The picture is the form's own: the action never hands it back.
  const startValues: EditUserValues = {
    avatar: null,
    ...(values ?? fieldsOf(user)),
  };
  const form = useAOFForm({
    defaultValues: startValues,
    // A submit runs the onChange validators too.
    validators: {
      onChange: editUserSchema(fieldMessages),
    },
  });
  const formProps = useAOFFormAction(form, action);
  // The email, which never changes: the name is a field below.
  const title = user.email;

  return (
    // Fills the Section, so a short form puts its buttons at the bottom.
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="flex min-w-0 items-center gap-2 font-bold text-2xl">
        <IconUserEdit aria-hidden className="size-7 shrink-0" />
        <span className="truncate">{title}</span>
      </h1>
      <form aria-label={title} className="flex flex-1 flex-col" {...formProps}>
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
            <NameField fields={USERS.FORM_FIELDS.NAME} form={form} />
            <AvatarField
              current={user.image}
              currentBlur={user.imageBlurDataUrl}
              fields={USERS.FORM_FIELDS.AVATAR}
              form={form}
            />
          </div>
          <div className="flex flex-col">
            {/* Both left empty keep the password the User has. */}
            <PasswordFields
              fields={USERS.FORM_FIELDS.PASSWORD}
              form={form}
              labels={{
                confirmPassword: t("Users.edit.confirmPassword"),
                password: t("Users.edit.password"),
              }}
              required={false}
            />
          </div>
          <RoleRows
            fields={USERS.FORM_FIELDS.ROLES}
            form={form}
            locked={user.id === selfId ? manageApp : undefined}
          />
          <VerificationRow
            fields={USERS.FORM_FIELDS.VERIFICATION}
            form={form}
          />
          {/* The end of the form: why the last submit failed, in its kept place. */}
          <FormAlert className="@2xl:col-span-2 mt-4">{errorText}</FormAlert>
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
