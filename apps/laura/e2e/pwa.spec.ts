import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { pwaSuite } from "@allonfire/ui/features/app/tests/e2e/pwa-suite";

pwaSuite({ user: FIXTURE.USER.LAURA.USER });
