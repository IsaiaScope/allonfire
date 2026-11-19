import type { ComponentType, ReactNode } from "react";
import { cn } from "../../../shared/utils/utils";
import {
  AOFPage,
  type AOFPageProps,
} from "../../navigation/components/aof-page";

/**
 * Where a notice stands: the whole page, centred (its `h1` names the tab), or
 * a part of one where something else stands (a table's rows), boxed as that
 * part and headed by an `h2` under the page's own heading. The Design's
 * notice draws what is inside; `className` gives the part its corners and
 * ground.
 */
export const AOFNoticeStage = ({
  children,
  className,
  page: Page = AOFPage,
  scope = "page",
}: {
  children: ReactNode;
  /** The part's own look (its corners, its ground), beside the shared box. */
  className?: string | undefined;
  /** The frame the notice fills: the whole screen unless it is a Section's page area. */
  page?: ComponentType<AOFPageProps> | undefined;
  scope?: "page" | "part" | undefined;
}) =>
  scope === "part" ? (
    <div
      className={cn(
        "relative isolate flex min-h-96 flex-1 flex-col items-center justify-center overflow-hidden border px-4 py-10",
        className
      )}
    >
      {children}
    </div>
  ) : (
    <Page className="overflow-hidden" layout="centered">
      {children}
    </Page>
  );
