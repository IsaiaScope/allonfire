import { signOut } from "@allonfire/auth/features/next/actions/sign-out";
import { useLocale } from "next-intl";
import { NAVIGATION } from "../constants/navigation";

/**
 * The form the account menu's Sign out button submits (`form` attribute,
 * outside its popup), so it works like any Server Action form. Server
 * Actions cannot read the route's locale yet: the form binds it.
 */
export const AOFSignOutForm = () => {
  const signOutHere = signOut.bind(null, useLocale());
  return <form action={signOutHere} id={NAVIGATION.FORM.SIGN_OUT} />;
};
