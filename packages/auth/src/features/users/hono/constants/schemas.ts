import {
  appSchema,
  roleSchema,
} from "@allonfire/database/features/auth/access/constants/schemas";
import type { UserRecord } from "@allonfire/database/features/auth/user.service";
import { z } from "zod";
import {
  type AvatarLink,
  linkedPicture,
} from "../../../../shared/utils/linked-picture";
import { USER } from "../../constants/users";
import { meetsPasswordRules } from "../../utils/password-rules";

/**
 * A list's query. Every field falls back instead of refusing: the address is
 * the visitor's to edit, and a bad value is no reason for a 400.
 */
export const listQuerySchema = z.object({
  [USER.PARAM.PAGE]: z.coerce
    .number()
    .int()
    .min(USER.DEFAULT_PAGE)
    .max(USER.MAX_PAGE)
    .catch(USER.DEFAULT_PAGE),
  [USER.PARAM.PER_PAGE]: z.coerce
    .number()
    .pipe(z.literal(USER.PAGE_SIZES))
    .catch(USER.DEFAULT_PAGE_SIZE),
  [USER.PARAM.SEARCH]: z.string().catch(""),
});

/** One App a User belongs to, and their Role there. */
const membershipSchema = z.object({ app: appSchema, role: roleSchema });

/**
 * A User as the list shows them. Named `ListedUser` in the docs: Better Auth
 * already calls its own Model `User`, and the API's document holds both.
 */
export const userBodySchema = z
  .object({
    createdAt: z.iso.datetime(),
    email: z.string(),
    id: z.string(),
    /** Their picture's address, when they have one. */
    image: z.string().nullable(),
    /** The blur to show while `image` loads, beside a stored picture only. */
    imageBlurDataUrl: z.string().nullable(),
    memberships: z.array(membershipSchema),
    /** What they are called, when they gave a name. */
    name: z.string().nullable(),
  })
  .meta({ ref: "ListedUser" });
export type UserBody = z.infer<typeof userBodySchema>;

export const userListBodySchema = z
  .object({
    /** How many pages `total` makes at the page size asked for. */
    pageCount: z.number().int(),
    total: z.number().int(),
    users: z.array(userBodySchema),
  })
  .meta({ ref: "UserList" });
export type UserListBody = z.infer<typeof userListBodySchema>;

/** A User's Memberships, at most one per App. */
const membershipsSchema = z
  .array(membershipSchema)
  .refine(
    (memberships) =>
      new Set(memberships.map(({ app }) => app)).size === memberships.length,
    { message: "One Membership per App" }
  );
const nameSchema = z.string().trim().min(1).max(USER.LIMIT.NAME_MAX);
const passwordSchema = z
  .string()
  .min(USER.LIMIT.PASSWORD_MIN)
  .max(USER.LIMIT.PASSWORD_MAX)
  .refine(meetsPasswordRules);

/** An added User: who, their password, and at most one Membership per App. */
export const userCreateRequestSchema = z.object({
  email: z.email().max(USER.LIMIT.EMAIL_MAX),
  memberships: membershipsSchema,
  name: nameSchema,
  password: passwordSchema,
});

/**
 * An edit: any of the name, the whole set of Memberships and a new
 * password, at least one; the email is not among them.
 */
export const userUpdateRequestSchema = z
  .object({
    memberships: membershipsSchema.optional(),
    name: nameSchema.optional(),
    password: passwordSchema.optional(),
  })
  .refine(
    ({ memberships, name, password }) =>
      memberships !== undefined || name !== undefined || password !== undefined,
    { message: "Nothing to change" }
  );

export const userCreatedBodySchema = z
  .object({ id: z.string() })
  .meta({ ref: "UserCreated" });
export type UserCreatedBody = z.infer<typeof userCreatedBodySchema>;

/** A deletion's body: the Users to delete, at most a page of them. */
export const userDeleteRequestSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(USER.MAX_DELETE),
});

export const userDeleteBodySchema = z
  .object({ deleted: z.number().int() })
  .meta({ ref: "UserDeletion" });
export type UserDeleteBody = z.infer<typeof userDeleteBodySchema>;

/** One User's id, as the path names them. */
export const userIdParamSchema = z.object({ id: z.string().min(1) });

/** An Avatar's request: one picture, as multipart/form-data `file`. */
export const avatarFormSchema = z.object({ file: z.instanceof(File) });

/** A User's new picture, as the listed User holds it: its link signed for
 *  the hour, and the blur to show while it loads. */
export const userAvatarBodySchema = userBodySchema
  .pick({ image: true, imageBlurDataUrl: true })
  .meta({ ref: "UserAvatar" });
export type UserAvatarBody = z.infer<typeof userAvatarBodySchema>;

/** A User as the API answers them: their picture as a link signed for now. */
export const toUserBody = (
  user: UserRecord,
  avatarLink: AvatarLink
): UserBody => ({
  ...user,
  createdAt: user.createdAt.toISOString(),
  ...linkedPicture(user, avatarLink),
});
