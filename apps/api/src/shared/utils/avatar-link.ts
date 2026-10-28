import { avatarLink } from "@allonfire/storage/features/avatar/utils/avatar-key";

/** `User.image` as a browser gets it now: our file signed for the hour. */
export const avatarLinkNow = (image: string | null): string | null =>
  avatarLink(image, new Date());
