"use client";

import { UNIT } from "@allonfire/core/shared/constants/units";
import { AVATAR } from "@allonfire/storage/features/avatar/constants/avatar";
import type {
  AOFAvatarFieldLabels,
  AOFAvatarFieldProps,
} from "@allonfire/ui/components/aof-avatar-field";
import { withAOFFieldGroup } from "@allonfire/ui/lib/form";
import { cn } from "@allonfire/ui/lib/utils";
import { IconKey, IconKeyFilled, IconUser } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  ActionKanji,
  BrushKanji,
  kanjiAction,
} from "@/shared/components/brush-kanji";
import { USERS } from "../constants/users";
import { passwordChecks } from "../utils/user-form-schema";
import { PasswordRules } from "./password-rules";
import { toolbarActionClass, toolbarActionKanji } from "./toolbar-action";

/*
 * The fields both User forms hold, each a field group (`withAOFFieldGroup`):
 * a form hands it `form` and the names it holds them under
 * (`USERS.FORM_FIELDS`), whatever else it holds. Labelled from Users.form.
 */

/** The User forms' shared words (`Users.form`), read in the page's language. */
type FormWords = ReturnType<typeof useTranslations>;

/**
 * Hands a field group's `render` the User forms' shared words: a `render`
 * is a plain function, which calls no hooks.
 */
const WithFormWords = ({
  children,
}: {
  children: (t: FormWords) => ReactNode;
}) => {
  const t = useTranslations("Users.form");
  return children(t);
};

/** The picture field's words. */
const avatarLabelsOf = (t: FormWords): AOFAvatarFieldLabels => ({
  busy: t("avatar.preparing"),
  cancel: t("avatar.cancel"),
  change: t("avatar.change"),
  choose: t("avatar.choose"),
  cropAgain: t("avatar.cropAgain"),
  current: t("avatar.current"),
  dialogTitle: t("avatar.dialogTitle"),
  drop: t("avatar.drop"),
  formats: t("avatar.formats", {
    size: AVATAR.INPUT_BYTES / UNIT.BYTES_PER_MIB,
  }),
  remove: t("avatar.remove"),
  tooLarge: t("avatar.tooLarge"),
  unreadable: t("avatar.unreadable"),
  use: t("avatar.use"),
  wrongType: t("avatar.wrongType"),
  zoomIn: t("avatar.zoomIn"),
  zoomOut: t("avatar.zoomOut"),
});

/** A crop dialog's zoom button: the toolbar's icon shape, `kanji` at its edge. */
const zoomDress = (kanji: string) => ({
  className: toolbarActionClass("icon", "outline"),
  decoration: (
    <ActionKanji
      className={toolbarActionKanji({ shape: "icon" })}
      kanji={kanji}
    />
  ),
});

/**
 * The picture field in the Japan Design: its choose button a green kanji
 * action (写, the line's green), the crop dialog's title signed 切 and its
 * buttons the form's own (Cancel 戻 in red, Use 決 in the primary), its
 * zoom the toolbar's kanji icon buttons (縮, 拡).
 */
const AVATAR_DRESS = {
  cropProps: {
    cancelProps: {
      className: kanjiAction(),
      decoration: <ActionKanji kanji={USERS.CANCEL_KANJI} />,
      size: "field",
      variant: "destructive",
    },
    titleProps: {
      decoration: <BrushKanji kanji={USERS.CROP_KANJI} placement="title" />,
    },
    useProps: {
      className: kanjiAction(),
      decoration: <ActionKanji kanji={USERS.CROP_USE_KANJI} />,
      size: "field",
    },
    // Icon buttons with the toolbar's kanji, at the title's right end.
    zoomInProps: zoomDress(USERS.ZOOM_IN_KANJI),
    zoomOutProps: zoomDress(USERS.ZOOM_OUT_KANJI),
  },
  triggerProps: {
    // The smaller kanji action: inside the drop area, not a form's last row.
    className: cn(
      kanjiAction(),
      "min-w-0 bg-(--line-green-deep) pr-10 text-(--line-green-deep-foreground) hover:bg-(--line-green-deep)/90"
    ),
    decoration: (
      <ActionKanji className="text-4xl" kanji={USERS.PICTURE_KANJI} />
    ),
    // Filled, so no outline's dark-theme ground shows over the green.
    variant: "default",
  },
} as const satisfies Pick<AOFAvatarFieldProps, "cropProps" | "triggerProps">;

/** The name field, a field group both User forms bind (`USERS.FORM_FIELDS.NAME`). */
export const NameField = withAOFFieldGroup({
  defaultValues: { name: "" },
  render: ({ group }) => (
    <WithFormWords>
      {(t) => (
        <group.AppField name="name">
          {(field) => (
            <field.TextField
              autoComplete="off"
              icon={<IconUser />}
              label={t("name")}
              required
            />
          )}
        </group.AppField>
      )}
    </WithFormWords>
  ),
});

/** The picture field's start, and what it can be told: the picture the User holds. */
const NO_AVATAR: { avatar: File | null } = { avatar: null };
const AVATAR_FIELD_PROPS: { current?: string | null | undefined } = {};

/**
 * The picture field in the Japan Design, a field group both User forms bind
 * (`USERS.FORM_FIELDS.AVATAR`); given the picture the User holds (`current`),
 * it shows it, to change or remove.
 */
export const AvatarField = withAOFFieldGroup({
  defaultValues: NO_AVATAR,
  props: AVATAR_FIELD_PROPS,
  render: ({ current, group }) => (
    <WithFormWords>
      {(t) => (
        <group.AppField name={USERS.AVATAR_FIELD}>
          {(field) => (
            <field.AvatarField
              {...AVATAR_DRESS}
              current={current}
              label={t("avatar.label")}
              labels={avatarLabelsOf(t)}
            />
          )}
        </group.AppField>
      )}
    </WithFormWords>
  ),
});

/** One string per password field: what each holds, or its label. */
type PasswordPair = { confirmPassword: string; password: string };
const NO_PASSWORDS: PasswordPair = { confirmPassword: "", password: "" };
/**
 * What the password fields are told: whether a password is `required`, and
 * their `labels` when not Users.form's.
 */
const PASSWORD_FIELDS_PROPS: { labels?: PasswordPair; required: boolean } = {
  required: false,
};

/** The password rules met by what the fields hold. */
const checksOf = ({ values }: { values: PasswordPair }) =>
  passwordChecks(values);

/**
 * The password and its confirmation, each revealable, with its rules ticked
 * live under them: a field group both User forms bind
 * (`USERS.FORM_FIELDS.PASSWORD`).
 */
export const PasswordFields = withAOFFieldGroup({
  defaultValues: NO_PASSWORDS,
  props: PASSWORD_FIELDS_PROPS,
  render: ({ group, labels, required }) => (
    <WithFormWords>
      {(t) => (
        <>
          <group.AppField name="password">
            {(field) => (
              <field.TextField
                autoComplete="new-password"
                icon={<IconKey />}
                label={labels?.password ?? t("password")}
                required={required}
                reveal={t("showPassword")}
                type="password"
              />
            )}
          </group.AppField>
          <group.AppField name="confirmPassword">
            {(field) => (
              <field.TextField
                autoComplete="new-password"
                icon={<IconKeyFilled />}
                label={labels?.confirmPassword ?? t("confirmPassword")}
                required={required}
                reveal={t("showPassword")}
                type="password"
              />
            )}
          </group.AppField>
          <group.Subscribe selector={checksOf}>
            {(checks) => <PasswordRules checks={checks} />}
          </group.Subscribe>
        </>
      )}
    </WithFormWords>
  ),
});
