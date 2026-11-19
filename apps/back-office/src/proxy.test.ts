// @module-tag unit
// @vitest-environment node
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { proxyConfig } from "@allonfire/auth/shared/tests/proxy-config";
import { proxyMatcherSuite } from "@allonfire/core/features/next/i18n/tests/proxy-matcher-suite";

const config = await proxyConfig(() => import("./proxy"));

proxyMatcherSuite({ config, pages: [AUTH.PAGE.SIGN_IN] });
