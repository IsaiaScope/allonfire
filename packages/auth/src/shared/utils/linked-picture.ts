/** What a browser gets for `User.image`, from the Host: our file signed, anything else as it is. */
export type AvatarLink = (image: string | null) => string | null;

/** A User's picture as the database holds it. */
type StoredPicture = { image: string | null; imageBlurDataUrl: string | null };

/**
 * A User's picture as a browser gets it, wherever the module answers one (the
 * Users list, the Avatar's `PUT`, the Session): `image` through the Host's
 * `avatarLink`, and its blur only beside a link, so a picture with none (no
 * picture, or a value it cannot sign) never comes with a blur.
 */
export const linkedPicture = (
  { image, imageBlurDataUrl }: StoredPicture,
  avatarLink: AvatarLink
): StoredPicture => {
  const link = avatarLink(image);
  return { image: link, imageBlurDataUrl: link ? imageBlurDataUrl : null };
};
