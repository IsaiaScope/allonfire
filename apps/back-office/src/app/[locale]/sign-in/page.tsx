import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { env } from "@/environment/environment";
import { SignIn } from "@/features/auth/components/sign-in";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";

export const generateMetadata = () =>
  pageMetadata(AUTH.PAGE.SIGN_IN, "SignIn.submit");

// Someone already signed in never gets here: the proxy sends them Home.
const SignInPage = () => <SignIn appUrl={env.BACK_OFFICE_URL} />;

export default SignInPage;
