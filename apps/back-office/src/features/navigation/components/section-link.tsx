"use client";

import { AOFSidebarMenuButton } from "@allonfire/ui/components/aof-sidebar";
import type { ReactNode } from "react";
import { Link, usePathname } from "@/features/i18n/navigation";
import { isCurrentSection, sectionHref } from "../constants/sections";

/**
 * The sidebar's line, after React Bits' Branched Menu: the Back Office's line
 * runs down as a trunk, each Section branches off it with a curve, and the
 * way to the Section you are on is drawn in the line's colour. In pixels of
 * one row's drawing.
 */
const BRANCH = {
  /** How long the way to a Section takes to draw. */
  DRAW_MS: 410,
  /** Where the label starts: the branch stops just short of it. */
  INDENT: 42,
  /** The branch's curve off the trunk. */
  RADIUS: 11,
  /** One row's height (`h-10`). */
  ROW: 40,
  /** Where the trunk runs, from the row's left edge. */
  TRUNK: 17,
} as const;

const MIDDLE = BRANCH.ROW / 2;
const TURN = MIDDLE - BRANCH.RADIUS;
const END = BRANCH.INDENT - 8;
const CURVE = `A ${BRANCH.RADIUS} ${BRANCH.RADIUS} 0 0 0 ${BRANCH.TRUNK + BRANCH.RADIUS} ${MIDDLE} H ${END}`;
/** The way from the row's top, down the trunk and out to the label. */
const WAY = `M ${BRANCH.TRUNK} 0 V ${TURN} ${CURVE}`;
const WAY_LENGTH =
  TURN + (Math.PI * BRANCH.RADIUS) / 2 + (END - BRANCH.TRUNK - BRANCH.RADIUS);

type BranchProps = { current: boolean; last: boolean };

/** One row of the line: the trunk, the branch, and the way when current. */
const Branch = ({ current, last }: BranchProps) => (
  <svg
    aria-hidden
    className="h-10! w-10.5! shrink-0 overflow-visible fill-none [stroke-linecap:round] [stroke-width:1.5] group-data-[collapsible=icon]:hidden"
    height={BRANCH.ROW}
    width={BRANCH.INDENT}
  >
    <path
      className="stroke-border"
      d={`M ${BRANCH.TRUNK} 0 V ${last ? TURN : BRANCH.ROW}`}
    />
    <path className="stroke-border" d={`M ${BRANCH.TRUNK} ${TURN} ${CURVE}`} />
    <path
      className="stroke-line motion-safe:transition-[stroke-dashoffset] motion-safe:ease-out"
      d={WAY}
      style={{
        strokeDasharray: WAY_LENGTH,
        strokeDashoffset: current ? 0 : WAY_LENGTH,
        transitionDuration: `${BRANCH.DRAW_MS}ms`,
      }}
    />
  </svg>
);

export type SectionLinkProps = {
  /** The pictogram, rendered on the server: an element, not a component. */
  children: ReactNode;
  label: string;
  /** The last Section: the trunk stops at its branch. */
  last?: boolean;
  path: string;
};

/**
 * A Section in the desktop sidebar, branching off the line; collapsed to
 * icons, the line hides and the label becomes the tooltip.
 */
export const SidebarSectionLink = ({
  children,
  label,
  last = false,
  path,
}: SectionLinkProps) => {
  const current = isCurrentSection(usePathname(), path);
  return (
    <AOFSidebarMenuButton
      className="h-10 gap-0 py-0 pl-0 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground data-active:bg-transparent data-active:font-medium data-active:text-foreground group-data-[collapsible=icon]:pl-2"
      isActive={current}
      render={
        <Link
          aria-current={current ? "page" : undefined}
          href={sectionHref(path)}
        />
      }
      tooltip={label}
    >
      <Branch current={current} last={last} />
      {children}
      <span className="ml-2">{label}</span>
    </AOFSidebarMenuButton>
  );
};

/**
 * A Section in the phone's tab bar: pictogram over label, the current one
 * marked by the line's colour along its top edge.
 */
export const TabSectionLink = ({ children, label, path }: SectionLinkProps) => {
  const current = isCurrentSection(usePathname(), path);
  return (
    <Link
      aria-current={current ? "page" : undefined}
      className="relative flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground text-xs outline-none before:absolute before:inset-x-8 before:top-0 before:h-0.5 before:rounded-sm before:bg-line before:opacity-0 focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:before:opacity-100 motion-safe:before:transition-opacity [&_svg]:size-5"
      href={sectionHref(path)}
    >
      {children}
      {label}
    </Link>
  );
};
