"use client";

import { UNIT } from "@allonfire/core/shared/constants/units";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { entryRoles } from "@allonfire/database/features/auth/access/access";
import { AVATAR } from "@allonfire/storage/features/avatar/constants/avatar";
import type {
  AOFAvatarFieldLabels,
  AOFAvatarFieldProps,
} from "@allonfire/ui/components/aof-avatar-field";
import { aofButtonVariants } from "@allonfire/ui/components/aof-button";
import { AOFChoiceField } from "@allonfire/ui/components/aof-choice-field";
import { AOFSubmitButton } from "@allonfire/ui/components/aof-submit-button";
import { cn } from "@allonfire/ui/lib/utils";
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
import type { ReactNode } from "react";
import { Link } from "@/features/i18n/navigation";
import {
  ActionKanji,
  BrushKanji,
  kanjiAction,
} from "@/shared/components/brush-kanji";
import { APP_ENTRY } from "@/shared/constants/apps";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { USERS } from "../constants/users";
import type { RoleChoice } from "../utils/user-form-schema";
import { toolbarActionClass, toolbarActionKanji } from "./toolbar-action";

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
      label={t("Users.add.role", { app: APP_ENTRY[app].name })}
      options={[
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
      ]}
      pill={BACK_OFFICE.CHOSEN.PILL}
    />
  );
};

/**
 * The Role rows, one per App, each drawn as Gooey Nav. `field` binds a row
 * to its form (`form.AppField name={`roles.${app}`}`) around the choice it
 * is handed. The `locked` App's row cannot change, with a note saying why.
 */
export const RoleRows = ({
  field,
  locked,
}: {
  field: (app: App, choice: ReactNode) => ReactNode;
  locked?: App | undefined;
}) => {
  const t = useTranslations();
  return (
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
          {field(app, <RoleChoiceRow app={app} locked={app === locked} />)}
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

/** The picture field's words, in the page's language. */
export const useAvatarLabels = (): AOFAvatarFieldLabels => {
  const t = useTranslations("Users.add.avatar");
  return {
    busy: t("preparing"),
    cancel: t("cancel"),
    change: t("change"),
    choose: t("choose"),
    cropAgain: t("cropAgain"),
    current: t("current"),
    dialogTitle: t("dialogTitle"),
    drop: t("drop"),
    formats: t("formats", {
      size: AVATAR.INPUT_BYTES / UNIT.BYTES_PER_MIB,
    }),
    remove: t("remove"),
    tooLarge: t("tooLarge"),
    unreadable: t("unreadable"),
    use: t("use"),
    wrongType: t("wrongType"),
    zoomIn: t("zoomIn"),
    zoomOut: t("zoomOut"),
  };
};

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
export const AVATAR_DRESS = {
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
