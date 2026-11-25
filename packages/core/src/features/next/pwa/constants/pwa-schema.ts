import { z } from "zod";
import { PWA } from "./pwa";

const installPlatformSchema = z.enum(PWA.PLATFORM);
export type InstallPlatform = z.infer<typeof installPlatformSchema>;
const installStepSchema = z.enum(PWA.INSTALL_HINT.STEP);
export type InstallStep = z.infer<typeof installStepSchema>;
const installStatusSchema = z.enum(PWA.INSTALL_HINT.INSTALL_STATUS);
export type InstallStatus = z.infer<typeof installStatusSchema>;
