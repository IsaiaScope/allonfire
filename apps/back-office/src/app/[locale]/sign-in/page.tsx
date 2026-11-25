import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { AOFSignIn } from "@allonfire/ui/features/auth/components/aof-sign-in";
import { env } from "@/environment/environment";
import { AUTH_DRESSING } from "@/features/auth/components/dressing";
import { pageMetadata } from "@/features/metadata/utils/page-information";
import { BACK_OFFICE } from "@/shared/constants/back-office";

export const generateMetadata = () =>
  pageMetadata(AUTH.PAGE.SIGN_IN, "Common.Auth.SignIn.submit");

// Someone already signed in never gets here: the proxy sends them Home.
const SignInPage = () => (
  <AOFSignIn
    appName={BACK_OFFICE.name}
    appUrl={env.BACK_OFFICE_URL}
    dressing={AUTH_DRESSING}
  />
);

export default SignInPage;
