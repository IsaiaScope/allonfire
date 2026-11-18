import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { AOFForgotPassword } from "@allonfire/ui/features/auth/components/aof-forgot-password";
import { env } from "@/environment/environment";
import { AUTH_DRESSING } from "@/features/auth/constants/dressing";
import { pageMetadata } from "@/shared/constants/page-information";

export const generateMetadata = () =>
  pageMetadata(AUTH.PAGE.FORGOT_PASSWORD, "Common.Auth.ForgotPassword.title");

// Someone already signed in never gets here: the proxy sends them Home.
const ForgotPasswordPage = () => (
  <AOFForgotPassword appUrl={env.BACK_OFFICE_URL} dressing={AUTH_DRESSING} />
);

export default ForgotPasswordPage;
