export const ALL_APPS = [
  { id: "all", label: "All Apps" },
  { id: "social", label: "Social" },
  { id: "laura", label: "Laura" },
] as const;

export const VALID_APP_IDS: Set<string> = new Set(ALL_APPS.map((a) => a.id));
