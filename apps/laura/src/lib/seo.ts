const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3200";

export const indexableRoutes = [
  "/",
  "/games",
  "/games/memory",
  "/games/memory/leaderboard",
  "/games/quiz",
  "/games/quiz/leaderboard",
];

const disallowedRoutes = [
  "/upload",
  "/settings",
  "/favorites",
  "/api",
  "/games/quiz/upload",
  "/games/quiz/edit",
];

export function getRobotsRules() {
  const toEn = (route: string) => `/en${route === "/" ? "" : route}`;
  return {
    allow: [...indexableRoutes, ...indexableRoutes.map(toEn)],
    disallow: [...disallowedRoutes, ...disallowedRoutes.map(toEn)],
  };
}

export function getAlternates(locale: string, path: string) {
  const itPath = path === "/" ? "" : path;
  const enPath = `/en${itPath || ""}`;

  return {
    canonical:
      locale === "it" ? `${baseUrl}${itPath || "/"}` : `${baseUrl}${enPath}`,
    languages: {
      it: `${baseUrl}${itPath || "/"}`,
      en: `${baseUrl}${enPath}`,
    },
  };
}

export { baseUrl };
