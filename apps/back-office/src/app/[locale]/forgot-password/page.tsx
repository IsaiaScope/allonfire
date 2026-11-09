import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { env } from "@/environment/environment";
import { ForgotPassword } from "@/features/auth/components/forgot-password";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";

export const generateMetadata = () =>
  pageMetadata(AUTH.PAGE.FORGOT_PASSWORD, "ForgotPassword.title");

// Someone already signed in never gets here: the proxy sends them Home.
const ForgotPasswordPage = () => (
  <ForgotPassword appUrl={env.BACK_OFFICE_URL} />
);

export default ForgotPasswordPage;
