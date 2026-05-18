import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { metadataPath } from "./paths";

export type StageRecord =
  | null
  | { at: string }
  | { failedAt: string; error: string };

export type StageName =
  | "downloaded"
  | "transcribed"
  | "translated"
  | "overlayed";

export type ProjectMetadata = {
  title: string;
  slug: string;
  date: string;
  folder?: string;
  source: {
    url: string;
    youtubeId: string;
    title: string;
    duration: number;
    thumbnail?: string;
    language: string | null;
  };
  stages: Record<StageName, StageRecord>;
  createdAt: string;
  updatedAt: string;
};

export type InitInput = Omit<
  ProjectMetadata,
  "stages" | "createdAt" | "updatedAt" | "folder"
>;

export function initMetadata(
  folder: string,
  input: InitInput
): ProjectMetadata {
  const now = new Date().toISOString();
  const m: ProjectMetadata = {
    ...input,
    folder,
    stages: {
      downloaded: null,
      transcribed: null,
      translated: null,
      overlayed: null,
    },
    createdAt: now,
    updatedAt: now,
  };
  writeMetadata(folder, m);
  return m;
}

export function readMetadata(folder: string): ProjectMetadata | null {
  const path = metadataPath(folder);
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf-8")) as ProjectMetadata;
}

export function writeMetadata(folder: string, m: ProjectMetadata): void {
  const updated = { ...m, updatedAt: new Date().toISOString() };
  writeFileSync(metadataPath(folder), JSON.stringify(updated, null, 2));
}

function mutate(
  folder: string,
  mutator: (m: ProjectMetadata) => void
): ProjectMetadata {
  const m = readMetadata(folder);
  if (!m) {
    throw new Error(`No metadata.json in ${folder}`);
  }
  mutator(m);
  writeMetadata(folder, m);
  return m;
}

export function markStageDone(folder: string, stage: StageName): void {
  mutate(folder, (m) => {
    m.stages[stage] = { at: new Date().toISOString() };
  });
}

export function markStageFailed(
  folder: string,
  stage: StageName,
  error: string
): void {
  mutate(folder, (m) => {
    m.stages[stage] = { failedAt: new Date().toISOString(), error };
  });
}

export function resetStages(folder: string, stages: StageName[]): void {
  mutate(folder, (m) => {
    for (const stage of stages) {
      m.stages[stage] = null;
    }
  });
}

export function updateSourceLanguage(folder: string, lang: string): void {
  mutate(folder, (m) => {
    m.source.language = lang;
  });
}

export function isStageDone(stage: StageRecord): boolean {
  return stage !== null && "at" in stage;
}
