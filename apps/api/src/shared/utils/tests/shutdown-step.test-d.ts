import type { ShutdownStep } from "../shutdown-step";

expectTypeOf<ShutdownStep>().toEqualTypeOf<
  "database" | "redis" | "server" | "telemetry"
>();
