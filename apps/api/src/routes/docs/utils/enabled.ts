/**
 * Docs render freely in development. In production they are opt-in, because a
 * public reference page advertises the entire API surface to anything scanning.
 */
import { NODE_ENV, type NodeEnv } from "@allonfire/utils/constants/node-env";

export const isDocsEnabled = (nodeEnv: NodeEnv, enableDocs: boolean): boolean =>
  nodeEnv !== NODE_ENV.PRODUCTION || enableDocs;
