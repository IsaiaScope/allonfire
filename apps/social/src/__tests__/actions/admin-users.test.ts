import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canConnect,
  cleanupTestUsers,
  disconnectTestDb,
  TEST_EMAIL_SUFFIX,
  testPrisma,
} from "../helpers/db-test-utils";

vi.mock("@/lib/server-auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: { id: "mock-session-user-id" },
  }),
  requireAdmin: vi.fn().mockResolvedValue({
    user: { id: "mock-session-user-id" },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const dbAvailable = await canConnect();

describe.skipIf(!dbAvailable)("admin user actions", () => {
  beforeEach(async () => {
    await cleanupTestUsers();
    const sessionUser = await testPrisma.user.create({
      data: {
        id: "mock-session-user-id",
        email: `session${TEST_EMAIL_SUFFIX}`,
        name: "Session Admin",
        emailVerified: true,
        role: "ADMIN",
      },
    });
    await testPrisma.account.create({
      data: {
        accountId: sessionUser.id,
        providerId: "credential",
        userId: sessionUser.id,
        password: "hashed-password",
      },
    });
  });

  afterAll(async () => {
    await cleanupTestUsers();
    await disconnectTestDb();
  });

  it("createUserAction creates user + credential account", async () => {
    const { createUserAction } = await import("@/features/admin/actions/users");
    const result = await createUserAction({
      email: `new${TEST_EMAIL_SUFFIX}`,
      password: "securepass123",
      name: "New User",
      role: "USER",
    });

    expect(result.success).toBe(true);

    const user = await testPrisma.user.findUnique({
      where: { email: `new${TEST_EMAIL_SUFFIX}` },
    });
    expect(user).not.toBeNull();
    expect(user?.name).toBe("New User");
    expect(user?.role).toBe("USER");

    const account = await testPrisma.account.findFirst({
      where: { userId: user?.id ?? "", providerId: "credential" },
    });
    expect(account).not.toBeNull();
    expect(account?.password).not.toBe("securepass123");
  });

  it("createUserAction rejects duplicate email", async () => {
    const { createUserAction } = await import("@/features/admin/actions/users");

    await createUserAction({
      email: `dupe${TEST_EMAIL_SUFFIX}`,
      password: "securepass123",
      name: "First User",
      role: "USER",
    });

    const result = await createUserAction({
      email: `dupe${TEST_EMAIL_SUFFIX}`,
      password: "securepass456",
      name: "Second User",
      role: "USER",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("already exists");
    }
  });

  it("createUserAction validates schema", async () => {
    const { createUserAction } = await import("@/features/admin/actions/users");
    await expect(
      createUserAction({
        email: "invalid",
        password: "short",
        name: "",
        role: "USER",
      })
    ).rejects.toThrow();
  });

  it("deleteUserAction deletes user from DB", async () => {
    const { deleteUserAction } = await import("@/features/admin/actions/users");

    const target = await testPrisma.user.create({
      data: {
        email: `delete-me${TEST_EMAIL_SUFFIX}`,
        name: "Delete Me",
        emailVerified: true,
        role: "USER",
      },
    });

    const result = await deleteUserAction(target.id);
    expect(result.success).toBe(true);

    const deleted = await testPrisma.user.findUnique({
      where: { id: target.id },
    });
    expect(deleted).toBeNull();
  });

  it("deleteUserAction prevents self-deletion", async () => {
    const { deleteUserAction } = await import("@/features/admin/actions/users");
    const result = await deleteUserAction("mock-session-user-id");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("yourself");
    }
  });

  it("updateUserRoleAction changes role in DB", async () => {
    const { updateUserRoleAction } = await import(
      "@/features/admin/actions/users"
    );

    const target = await testPrisma.user.create({
      data: {
        email: `role-change${TEST_EMAIL_SUFFIX}`,
        name: "Role Change",
        emailVerified: true,
        role: "USER",
      },
    });

    const result = await updateUserRoleAction(target.id, "ADMIN");
    expect(result.success).toBe(true);

    const updated = await testPrisma.user.findUnique({
      where: { id: target.id },
    });
    expect(updated?.role).toBe("ADMIN");
  });
});
