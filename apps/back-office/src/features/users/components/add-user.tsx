"use client";
import { useAOFForm } from "@allonfire/ui/features/form/utils/form";
import { useAOFFormAction } from "@allonfire/ui/features/form/utils/form-submit";
import { IconMail, IconUserPlus } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/shared/components/form-alert";
import { addUser } from "../actions/add-user";
import { USERS } from "../constants/users";
import {
  type AddUserFields,
  type AddUserValues,
  addUserSchema,
} from "../utils/add-user-schema";
import { NO_ROLES } from "../utils/user-form-schema";
import { AvatarField, NameField, PasswordFields } from "./user-form-fields";
import {
  RoleRows,
  UserFormActions,
  useToastThenList,
  useUserFieldMessages,
  VerificationRow,
} from "./user-form-parts";

/** Where the form starts: nothing typed, every App at "Not a member". */
const EMPTY: AddUserFields = {
  confirmPassword: "",
  email: "",
  name: "",
  password: "",
  roles: NO_ROLES,
  verification: USERS.VERIFICATION.VERIFIED,
};

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
  // The User was added but their picture was not saved: the list, where
  // they show with their initial.
  useToastThenList(notice, {
    [USERS.ADD_NOTICE.AVATAR_FAILED]: {
      kind: "warning",
      message: t("Users.add.avatarFailed"),
    },
  });
  const fieldMessages = useUserFieldMessages();
  // The picture is the form's own: the action never hands it back.
  const startValues: AddUserValues = { avatar: null, ...(values ?? EMPTY) };
  const form = useAOFForm({
    defaultValues: startValues,
    // A submit runs the onChange validators too.
    validators: {
      onChange: addUserSchema({
        ...fieldMessages,
        emailInvalid: t("Users.add.field.emailInvalid"),
        emailRequired: t("Users.add.field.emailRequired"),
      }),
    },
  });
  const formProps = useAOFFormAction(form, action);
  return (
    // Fills the Section, so a short form puts its buttons at the bottom.
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="flex items-center gap-2 font-bold text-2xl">
        <IconUserPlus aria-hidden className="size-7" />
        {t("Users.add.title")}
      </h1>
      <form
        aria-label={t("Users.add.title")}
        className="flex flex-1 flex-col"
        {...formProps}
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
            <NameField fields={USERS.FORM_FIELDS.NAME} form={form} />
            <AvatarField fields={USERS.FORM_FIELDS.AVATAR} form={form} />
          </div>
          <div className="flex flex-col">
            <PasswordFields
              fields={USERS.FORM_FIELDS.PASSWORD}
              form={form}
              required
            />
          </div>
          <RoleRows fields={USERS.FORM_FIELDS.ROLES} form={form} />
          <VerificationRow
            fields={USERS.FORM_FIELDS.VERIFICATION}
            form={form}
          />
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
