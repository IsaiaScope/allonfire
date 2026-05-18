import { readdirSync, statSync } from "node:fs";
import { Box, Text, useApp } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import { env } from "../../env";
import {
  isStageDone,
  type ProjectMetadata,
  readMetadata,
  type StageName,
} from "../../lib/metadata";
import { projectFolderFromName } from "../../lib/paths";
import { Header } from "../components/header";
import { nextRenderTick } from "./stage-view";

const STAGES: StageName[] = [
  "downloaded",
  "transcribed",
  "translated",
  "overlayed",
];

function discover(): ProjectMetadata[] {
  const out: ProjectMetadata[] = [];
  let entries: string[] = [];
  try {
    entries = readdirSync(env.VIDEO_WORK_DIR);
  } catch {
    return out;
  }
  for (const name of entries) {
    const folder = projectFolderFromName(env.VIDEO_WORK_DIR, name);
    try {
      if (!statSync(folder).isDirectory()) {
        continue;
      }
      const meta = readMetadata(folder);
      if (meta) {
        out.push({ ...meta, folder });
      }
    } catch {
      // skip unreadable folder
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

function filteredProjects(
  statusFilter?: "pending" | "failed" | "done"
): ProjectMetadata[] {
  let projects = discover();
  if (statusFilter === "done") {
    projects = projects.filter((m) => statusLabel(m) === "done");
  } else if (statusFilter === "failed") {
    projects = projects.filter((m) => statusLabel(m).endsWith("!"));
  } else if (statusFilter === "pending") {
    projects = projects.filter(
      (m) => statusLabel(m) !== "done" && !statusLabel(m).endsWith("!")
    );
  }
  return projects;
}

function stageMark(m: ProjectMetadata, s: StageName): string {
  const record = m.stages[s];
  if (record === null) {
    return "·";
  }
  if ("failedAt" in record) {
    return "✗";
  }
  if (isStageDone(record)) {
    return "✓";
  }
  return "·";
}

function statusLabel(m: ProjectMetadata): string {
  for (const s of STAGES) {
    const r = m.stages[s];
    if (r === null) {
      return s;
    }
    if ("failedAt" in r) {
      return `${s}!`;
    }
  }
  return "done";
}

type Props = {
  statusFilter?: "pending" | "failed" | "done";
};

export const ListView: React.FC<Props> = ({ statusFilter }) => {
  const { exit } = useApp();
  const [rows] = useState<ProjectMetadata[]>(() =>
    filteredProjects(statusFilter)
  );

  useEffect(() => {
    (async () => {
      await nextRenderTick();
      exit();
    })();
  }, [exit]);

  return (
    <Box flexDirection="column">
      <Header subtitle={`projects in ${env.VIDEO_WORK_DIR}`} title="list" />
      <Box>
        <Box width={12}>
          <Text bold>DATE</Text>
        </Box>
        <Box width={10}>
          <Text bold>STAGES</Text>
        </Box>
        <Box width={14}>
          <Text bold>STATUS</Text>
        </Box>
        <Text bold>SLUG / TITLE</Text>
      </Box>
      {rows.length === 0 ? (
        <Text dimColor>No projects found.</Text>
      ) : (
        rows.map((m) => (
          <Box key={m.slug}>
            <Box width={12}>
              <Text>{m.date}</Text>
            </Box>
            <Box width={10}>
              <Text>{STAGES.map((s) => stageMark(m, s)).join("")}</Text>
            </Box>
            <Box width={14}>
              <Text>{statusLabel(m)}</Text>
            </Box>
            <Text>
              {m.slug}
              <Text dimColor> — {m.title}</Text>
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
};
