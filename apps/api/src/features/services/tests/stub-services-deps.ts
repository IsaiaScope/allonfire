import { MAIL } from "@allonfire/core/features/mail/constants/mail";
import type { ServicesDeps } from "../utils/deps";

const unexpected = (name: string) => () =>
  Promise.reject(new Error(`${name} must not be called`));

/**
 * The Services routes' deps for a test: nobody manages, no keep-alive token,
 * every write throws if called. Override what the test is about.
 */
export const stubServicesDeps = (
  overrides: Partial<ServicesDeps> = {}
): ServicesDeps => ({
  canManage: () => Promise.resolve(false),
  configured: () => false,
  emailOf: () => Promise.resolve(null),
  forgetUsage: () => Promise.resolve(),
  keepAlive: unexpected("keepAlive"),
  keepAliveToken: undefined,
  listServices: () => Promise.resolve([]),
  sendTest: () => Promise.resolve({ outcome: MAIL.OUTCOME.UNAVAILABLE }),
  takeAddress: () => Promise.resolve(true),
  updateProvider: unexpected("updateProvider"),
  updateService: unexpected("updateService"),
  usageOf: () => Promise.resolve(null),
  ...overrides,
});
