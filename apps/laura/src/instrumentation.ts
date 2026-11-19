import {
  onRequestError as onServerRequestError,
  register as registerServer,
} from "@allonfire/core/features/next/instrumentation/instrumentation";

// Next looks for this file in the App itself; the server's telemetry and
// request-error logging live in core, shared by every Next App.
export const register = registerServer;
export const onRequestError = onServerRequestError;
