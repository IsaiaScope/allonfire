import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { AOFEmailVerified } from "@allonfire/ui/features/auth/components/aof-email-verified";
import { AUTH_DRESSING } from "@/features/auth/components/dressing";
import { pageMetadata } from "@/features/metadata/utils/page-information";

// jscpd:ignore-start
// Next reads `generateMetadata` and the default export from the page file, so the Back Office's page holds the same lines over its own dressing.
export const generateMetadata = () =>
  pageMetadata(AUTH.PAGE.EMAIL_VERIFIED, "Common.Auth.EmailVerified.title");

const EmailVerifiedPage = () => <AOFEmailVerified dressing={AUTH_DRESSING} />;

export default EmailVerifiedPage;
// jscpd:ignore-end
