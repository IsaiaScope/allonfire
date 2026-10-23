"use client";

import { USER } from "@allonfire/auth/features/users/constants/users";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { AOFCheckbox } from "@allonfire/ui/components/aof-checkbox";
import { cn } from "@allonfire/ui/lib/utils";
import { useTranslations } from "next-intl";
import { useId } from "react";
import type { passwordChecks } from "../utils/add-user-schema";

/** Where each rule sits in the list; every rule needs one, so a rule the
 *  User module adds fails to compile until it is placed. */
const PLACE = {
  length: 0,
  lowercase: 1,
  match: 5,
  number: 3,
  symbol: 4,
  uppercase: 2,
} as const satisfies Record<keyof ReturnType<typeof passwordChecks>, number>;

/** Each rule in the order the list shows it. */
const RULES = objectKeys(PLACE).sort((a, b) => PLACE[a] - PLACE[b]);

/**
 * The password rules as a to-do list (Shadcn Studio's `checkbox-04`), ticked
 * while typing: each a read-only checkbox, struck through once met, so a
 * screen reader hears "checked" or "not checked". Checked in the App's line
 * green with near-black ink (the Design's Line Rule). Out of the tab order:
 * they report, nobody ticks them.
 */
export const PasswordRules = ({
  checks,
}: {
  checks: ReturnType<typeof passwordChecks>;
}) => {
  const t = useTranslations("Users.add");
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium text-sm">{t("rules")}</p>
      <ul className="flex flex-col gap-1.5">
        {RULES.map((rule) => (
          <li className="flex items-center gap-2" key={rule}>
            <AOFCheckbox
              checked={checks[rule]}
              className={cn(
                "border-muted-foreground data-checked:border-line data-checked:bg-line data-checked:text-foreground dark:data-checked:bg-line dark:data-checked:text-background"
              )}
              id={`${id}-${rule}`}
              readOnly
              tabIndex={-1}
            />
            <label
              className={cn(
                "text-sm peer-data-checked:line-through peer-data-checked:decoration-line"
              )}
              htmlFor={`${id}-${rule}`}
            >
              {t(`rule.${rule}`, { min: USER.LIMIT.PASSWORD_MIN })}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
};
