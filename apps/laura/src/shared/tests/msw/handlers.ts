import type { HttpHandler } from "msw";

/** The API's answers when a test does not set its own: none until the Gallery reads it. */
export const handlers: HttpHandler[] = [];
