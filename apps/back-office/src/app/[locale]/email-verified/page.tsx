import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { AOFEmailVerified } from "@allonfire/ui/features/auth/components/aof-email-verified";
import { AUTH_DRESSING } from "@/features/auth/constants/dressing";
import { pageMetadata } from "@/shared/constants/page-information";

export const generateMetadata = () =>
  pageMetadata(AUTH.PAGE.EMAIL_VERIFIED, "Common.Auth.EmailVerified.title");

const EmailVerifiedPage = () => <AOFEmailVerified dressing={AUTH_DRESSING} />;

export default EmailVerifiedPage;
