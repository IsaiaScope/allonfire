import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { AOFResetPassword } from "@allonfire/ui/features/auth/components/aof-reset-password";
import { AUTH_DRESSING } from "@/features/auth/constants/dressing";
import { pageMetadata } from "@/shared/constants/page-information";

// jscpd:ignore-start
// Next reads `generateMetadata` and the default export from the page file, so the Back Office's page holds the same lines over its own dressing.
export const generateMetadata = () =>
  pageMetadata(AUTH.PAGE.RESET_PASSWORD, "Common.Auth.ResetPassword.title");

const ResetPasswordPage = () => <AOFResetPassword dressing={AUTH_DRESSING} />;

export default ResetPasswordPage;
// jscpd:ignore-end
