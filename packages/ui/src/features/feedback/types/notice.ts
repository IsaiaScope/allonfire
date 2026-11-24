import type { ComponentType, ReactNode } from "react";
import type { AOFPageProps } from "../../navigation/components/aof-page";

/** What a notice is about: the Design looks up its own look by it. */
type AOFNoticeKind = "error" | "notFound" | "offline";

export type AOFNoticeFrameProps = {
  /** What follows the notice, rising in after its words. */
  action?: ReactNode | undefined;
  children?: ReactNode;
  description?: string | undefined;
  /** Whether the words rise in (the default) or all of it stands at once. */
  entrance?: boolean | undefined;
  heading?: string | undefined;
  kind: AOFNoticeKind;
  /** A line a report can quote (an error's digest); the Design draws it as it likes. */
  reference?: string | undefined;
  /** The frame the notice fills: the whole screen unless it is a Section's page area. */
  page?: ComponentType<AOFPageProps> | undefined;
  scope?: "page" | "part" | undefined;
};

/**
 * How an App's Design draws a notice (its look, its backdrop, its marks). The
 * shared notices hand it their words and their `kind`; being a component, it
 * reaches them from a client binding of the App.
 */
export type AOFNoticeFrame = ComponentType<AOFNoticeFrameProps>;
