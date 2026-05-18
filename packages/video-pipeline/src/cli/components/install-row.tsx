import type React from "react";
import type { BadgeState } from "./status-badge";
import { ToolStatusRow } from "./tool-status-row";

export type InstallRowProps = {
  tool: string;
  state: BadgeState;
  detail?: string | string[];
};

export const InstallRow: React.FC<InstallRowProps> = ({
  tool,
  state,
  detail,
}) => <ToolStatusRow details={detail} label={tool} state={state} />;
