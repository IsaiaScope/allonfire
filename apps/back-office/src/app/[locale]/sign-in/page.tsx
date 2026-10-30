import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { SignIn } from "@/features/auth/components/sign-in";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";

export const generateMetadata = () =>
  pageMetadata(AUTH.PAGE.SIGN_IN, "SignIn.submit");

// Someone already signed in never gets here: the proxy sends them Home.
const SignInPage = () => <SignIn />;

export default SignInPage;
