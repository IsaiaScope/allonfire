// @module-tag unit

import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { AUTH } from "../../../shared/constants/auth";
import { setsWeakPassword } from "../utils/weak-password";

const WEAK = "aaaaaaaaaaaa";

it.each([
  [AUTH.PATH.SIGN_UP_EMAIL, { password: WEAK }],
  [AUTH.PATH.RESET_PASSWORD, { newPassword: WEAK }],
  [AUTH.PATH.CHANGE_PASSWORD, { newPassword: WEAK }],
])("refuses %s setting a password that misses a rule", (path, body) => {
  expect(setsWeakPassword(path, body)).toBe(true);
});

it.each([
  [AUTH.PATH.SIGN_UP_EMAIL, { password: FIXTURE.PASSWORD }],
  [AUTH.PATH.RESET_PASSWORD, { newPassword: FIXTURE.NEW_PASSWORD }],
  // The current password is never judged, only the new one.
  [
    AUTH.PATH.CHANGE_PASSWORD,
    { currentPassword: WEAK, newPassword: FIXTURE.NEW_PASSWORD },
  ],
  // Sign-in takes the password a User already has.
  [AUTH.PATH.SIGN_IN_EMAIL, { password: WEAK }],
  // No password sent: Better Auth answers that itself.
  [AUTH.PATH.RESET_PASSWORD, undefined],
])("lets %s through", (path, body) => {
  expect(setsWeakPassword(path, body)).toBe(false);
});
