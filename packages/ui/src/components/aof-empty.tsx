import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@allonfire/shadcn/components/empty";
import type { ReactNode } from "react";
import type { ComponentPropsWithoutChildren } from "../lib/types";

export type AOFEmptyProps = ComponentPropsWithoutChildren<typeof Empty> & {
  /** What may follow the text: an action, a link. */
  children?: ReactNode;
  /** What the description says will fill the space, in one sentence. */
  description: string;
  /** A pictogram, decoration only. */
  icon: ReactNode;
  /** The heading: what is empty. */
  title: string;
};

/**
 * A Section, or a part of one, with nothing to show yet: a pictogram, a
 * heading (`h2`, under the page's `h1`) and one sentence on what will fill
 * it. Any prop passes to the frame.
 */
export const AOFEmpty = ({
  children,
  description,
  icon,
  title,
  ...props
}: AOFEmptyProps) => (
  <Empty {...props}>
    <EmptyHeader>
      <EmptyMedia aria-hidden variant="icon">
        {icon}
      </EmptyMedia>
      {/* shadcn's title is a div with no `render`; the heading sits inside. */}
      <EmptyTitle>
        <h2 className="contents">{title}</h2>
      </EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
    </EmptyHeader>
    {children}
  </Empty>
);
