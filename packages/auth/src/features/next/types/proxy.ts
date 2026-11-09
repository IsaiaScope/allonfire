import type { NextRequest } from "next/server";

/** An App's proxy, as the wrappers here take and return it. */
export type AppProxy = (request: NextRequest) => Promise<Response> | Response;
