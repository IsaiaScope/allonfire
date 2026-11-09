import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { ResetPassword } from "@/features/auth/components/reset-password";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";

export const generateMetadata = () =>
  pageMetadata(AUTH.PAGE.RESET_PASSWORD, "ResetPassword.title");

const ResetPasswordPage = () => <ResetPassword />;

export default ResetPasswordPage;
