import pino, { type DestinationStream, type Logger } from "pino";
import {
  NODE_ENV,
  REDACT_CENSOR,
  REDACT_PATHS,
} from "../../shared/constants/runtime";
import { env } from "../environment/environment";

const PRETTY_TRANSPORT = {
  target: "pino-pretty",
  options: { colorize: true },
} as const;

export function createLogger(opts?: {
  destination?: DestinationStream;
}): Logger {
  const options = {
    level: env.LOG_LEVEL,
    redact: { paths: [...REDACT_PATHS], censor: REDACT_CENSOR },
  };

  if (opts?.destination) {
    return pino(options, opts.destination);
  }

  if (env.NODE_ENV === NODE_ENV.DEVELOPMENT) {
    return pino({ ...options, transport: PRETTY_TRANSPORT });
  }

  return pino(options);
}

export const logger = createLogger();
