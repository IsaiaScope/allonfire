import { vi } from "vitest";

process.env.DATABASE_URL ??=
  "postgresql://allonfire:allonfire@localhost:5432/allonfire";
process.env.BETTER_AUTH_SECRET ??= "test-secret";
process.env.BETTER_AUTH_URL ??= "http://localhost:3100";
process.env.N8N_API_KEY ??= "test-api-key";
process.env.ENCRYPTION_KEY ??= "a".repeat(64);

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
