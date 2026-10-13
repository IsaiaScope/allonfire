/**
 * Docs render freely in development. In production they are opt-in, because a
 * public reference page advertises the entire API surface to anything scanning.
 */
import { ENV, type NodeEnv } from "@allonfire/core/shared/constants/env";

export const isDocsEnabled = (nodeEnv: NodeEnv, enableDocs: boolean): boolean =>
  nodeEnv !== ENV.NODE.PRODUCTION || enableDocs;
