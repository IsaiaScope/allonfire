import { notFound } from "next/navigation";

// Only ever 404s, so there is nothing for instant-navigation validation to
// prerender; without this the dev server logs a validation error per request.
export const instant = false;

// Any path under a locale that matches no route renders [locale]/not-found.
const CatchAll = () => notFound();

export default CatchAll;
