import { App, Role } from "../../../../../generated/prisma/enums";
import { createImages } from "../../../image/image.service";
import { prisma } from "../../../prisma/client";

/** What an integration test of Laura's services keeps in the shared database: its Users and Images share a prefix. */
type Scope = { domain: string; prefix: string };

/** An Image named `<prefix><name>.avif`, placed in `apps`, answered by its id. */
export const createPhoto = async (
  { prefix }: Scope,
  { apps, name, uploadedBy }: { apps: App[]; name: string; uploadedBy: string }
) => {
  const [created] = await createImages([
    {
      alt: { en: name, it: name },
      apps,
      blurDataUrl: "data:image/webp;base64,AAAA",
      bytes: 1000,
      height: 600,
      key: `${prefix}${name}.avif`,
      uploadedBy,
      width: 800,
    },
  ]);
  return created?.id ?? "";
};

/**
 * Starts the scope clean: removes what a past run left, then adds the Users
 * `ids` (an email on the scope's domain each), the ones in `members` with a
 * Laura Membership.
 */
export const resetScope = async (
  { domain, prefix }: Scope,
  { ids, members }: { ids: string[]; members: string[] }
) => {
  await prisma.image.deleteMany({ where: { key: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.user.createMany({
    data: ids.map((id) => ({ email: `${id}@${domain}`, id })),
  });
  await prisma.membership.createMany({
    data: members.map((userId) => ({
      app: App.LAURA,
      role: Role.USER,
      userId,
    })),
  });
};
