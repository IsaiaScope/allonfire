/**
 * What an Avatar field's form says about the picture: kept as it was, a new
 * one cropped in the browser, or the current one removed with none in its
 * place. One of the three, never a new picture and a removal at once.
 */
export type AOFAvatarChange =
  | { kind: "unchanged" }
  | { file: File; kind: "picture" }
  | { kind: "removed" };

/** The value the removal posts. */
const REMOVED = "true";

/**
 * The hidden input `AOFAvatarField` posts when the current picture is
 * removed: named after the field (`avatarRemoved`), so two fields never
 * share it.
 */
export const avatarRemoval = (name: string) => ({
  name: `${name}Removed`,
  value: REMOVED,
});

/**
 * Reads back what `AOFAvatarField` named `name` posted, in a form's action.
 * A browser posts an empty file for a file input holding none: no picture.
 */
export const avatarChangeOf = (
  form: FormData,
  name: string
): AOFAvatarChange => {
  const file = form.get(name);
  if (file instanceof File && file.size > 0) {
    return { file, kind: "picture" };
  }
  return form.get(avatarRemoval(name).name) === REMOVED
    ? { kind: "removed" }
    : { kind: "unchanged" };
};
