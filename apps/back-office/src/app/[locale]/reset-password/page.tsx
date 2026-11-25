import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { AOFResetPassword } from "@allonfire/ui/features/auth/components/aof-reset-password";
import { AUTH_DRESSING } from "@/features/auth/components/dressing";
import { pageMetadata } from "@/features/metadata/utils/page-information";

export const generateMetadata = () =>
  pageMetadata(AUTH.PAGE.RESET_PASSWORD, "Common.Auth.ResetPassword.title");

const ResetPasswordPage = () => <AOFResetPassword dressing={AUTH_DRESSING} />;

export default ResetPasswordPage;
