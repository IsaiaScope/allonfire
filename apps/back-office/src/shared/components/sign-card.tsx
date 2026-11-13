"use client";

import { AOFCard } from "@allonfire/ui/shared/components/aof-card";
import type { ComponentPropsWithoutChildren } from "@allonfire/ui/shared/types/types";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconCalendar } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { BrushKanji } from "@/shared/components/brush-kanji";
import { useCreated } from "@/shared/utils/use-created";

/**
 * A list row on a phone, as a platform sign: the line's colour along its foot
 * and a kanji brushed large and faint behind, cut by its corner. What the row
 * shows goes in as `children`, ending with a `SignCardFoot`.
 */
export const SignCard = ({
  children,
  className,
  kanji,
  ...props
}: ComponentPropsWithoutChildren<typeof AOFCard> & {
  children: ReactNode;
  kanji: string;
}) => (
  <AOFCard
    className={cn(
      "relative isolate gap-3 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-line/50",
      className
    )}
    size="sm"
    {...props}
  >
    <BrushKanji
      className="-right-10 -bottom-24 -z-10 text-[16rem]"
      kanji={kanji}
      placement="header"
    />
    {children}
  </AOFCard>
);

/** A sign's last line: its selection checkbox (`select`) at the left, when it was created (`label` then the day) at the right. */
export const SignCardFoot = ({
  createdAt,
  label,
  select,
}: {
  createdAt: string;
  label: string;
  select?: ReactNode;
}) => {
  const created = useCreated();
  return (
    <div className="flex min-h-6 items-center gap-3">
      {select}
      <p className="ml-auto flex items-center gap-1.5 text-muted-foreground text-sm">
        <IconCalendar aria-hidden className="size-4" />
        {label} {created(createdAt)}
      </p>
    </div>
  );
};
