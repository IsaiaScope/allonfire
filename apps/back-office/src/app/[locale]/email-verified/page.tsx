import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { EmailVerified } from "@/features/auth/components/email-verified";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";

export const generateMetadata = () =>
  pageMetadata(AUTH.PAGE.EMAIL_VERIFIED, "EmailVerified.title");

const EmailVerifiedPage = () => <EmailVerified />;

export default EmailVerifiedPage;
